import { auditSuperGuarantee } from '../engine/superGuaranteeAudit';
import type {
  AustralianFinancialYear,
  ExtractedValue
} from '../types/tax';

export interface LocalChatCitation {
  documentName: string;
  page?: number;
  fieldName: string;
  value: ExtractedValue<unknown>;
}

export interface LocalChatResponse {
  text: string;
  citations: LocalChatCitation[];
}

function citationForValue(
  value: ExtractedValue<unknown> | undefined,
  fieldName: string
): LocalChatCitation[] {
  return value?.sourceDocumentName && value.sourceDocumentId
    ? [{
        documentName: value.sourceDocumentName,
        page: value.sourcePage,
        fieldName,
        value
      }]
    : [];
}

export function buildTaxContextSystemPrompt(
  financialYears: AustralianFinancialYear[]
): string {
  const summary = financialYears
    .map(
      (fy) =>
        `${fy.label}: gross income $${fy.grossIncome.toLocaleString()}, taxable income $${fy.taxableIncome.toLocaleString()}, tax withheld $${fy.taxWithheld.toLocaleString()}, deductions $${fy.totalDeductions.toLocaleString()}, employer super $${fy.employerSuper.toLocaleString()}, Medicare levy $${fy.medicareLevy.toLocaleString()}, HELP repayment $${fy.helpRepayment.toLocaleString()}, assessment result ${fy.assessmentResult >= 0 ? '+' : ''}$${fy.assessmentResult.toLocaleString()}.`
    )
    .join('\n');

  return `You are the built-in Australian tax assistant inside ATO Lens, a local-first tax workspace. Answer questions about the user's own Australian tax history using ONLY the redacted figures below. Be concise, cite dollar amounts, and reference relevant ATO concepts where useful. Never ask for or repeat a Tax File Number, Medicare number, or bank details.\n\nLocal financial year summary:\n${summary || 'No financial-year data is loaded.'}`;
}

export function generateLocalResponse(
  query: string,
  financialYears: AustralianFinancialYear[]
): LocalChatResponse {
  const latestFy = financialYears[0];
  if (!latestFy) {
    return {
      text: 'No financial-year data is loaded yet. Upload a tax document or add figures before asking about your tax history.',
      citations: []
    };
  }

  const q = query.toLowerCase();

  if (q.includes('super')) {
    const audit = auditSuperGuarantee(latestFy.superContributions, latestFy.id);
    const rate = audit.rule.rate === null ? 'the available' : `${audit.rule.rate.toFixed(1)}%`;
    if (audit.status === 'no_data') {
      return {
        text: `Your **${latestFy.label}** workspace records **$${latestFy.employerSuper.toLocaleString()}** in employer super, but it does not contain auditable contribution periods and ordinary-time earnings. I cannot determine ${rate} SG compliance from that total alone.`,
        citations: citationForValue(
          latestFy.superContributions[0]?.recordedAmount,
          'Employer Super'
        )
      };
    }
    if (audit.status === 'shortfall') {
      return {
        text: `For **${latestFy.label}**, the recorded auditable contributions are **$${audit.totalRecordedSuper.toLocaleString()}** against **$${audit.totalExpectedSuper.toLocaleString()}** expected at the ${rate} SG rate, a recorded shortfall of **$${Math.abs(audit.varianceAmount).toLocaleString()}**.`,
        citations: citationForValue(
          latestFy.superContributions[0]?.recordedAmount,
          'Employer Super'
        )
      };
    }
    return {
      text: `For **${latestFy.label}**, the recorded auditable contributions are **$${audit.totalRecordedSuper.toLocaleString()}** against **$${audit.totalExpectedSuper.toLocaleString()}** expected at the ${rate} SG rate. The available records meet that amount.`,
      citations: citationForValue(
        latestFy.superContributions[0]?.recordedAmount,
        'Employer Super'
      )
    };
  }

  if (q.includes('rate') || q.includes('tax rate')) {
    return {
      text: `For **${latestFy.label}**, your recorded effective tax rate is **${latestFy.effectiveTaxRate.toFixed(1)}%**, based on the obligations and gross income in this workspace.`,
      citations: []
    };
  }

  if (q.includes('refund') || q.includes('assessment') || q.includes('payable')) {
    const amount = Math.abs(latestFy.assessmentResult).toLocaleString();
    const outcome =
      latestFy.assessmentResult > 0
        ? `a recorded refund of **$${amount}**`
        : latestFy.assessmentResult < 0
          ? `a recorded amount payable of **$${amount}**`
          : 'no recorded refund or amount payable';
    return {
      text: `Your **${latestFy.label}** assessment result shows ${outcome}.`,
      citations: citationForValue(
        latestFy.assessment?.assessmentResult,
        'Assessment Result'
      )
    };
  }

  return {
    text: `Across **${financialYears.length} financial year${financialYears.length === 1 ? '' : 's'}**, the latest record is **${latestFy.label}** with **$${latestFy.grossIncome.toLocaleString()}** gross income and **$${latestFy.totalDeductions.toLocaleString()}** in recorded deductions.`,
    citations: citationForValue(latestFy.income[0]?.grossAmount, 'Gross Income')
  };
}
