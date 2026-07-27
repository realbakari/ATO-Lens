import type {
  AustralianFinancialYear,
  DeductionItem,
  ExtractedValue,
  IncomeItem,
  Payslip,
  SourceDocument
} from '../types/tax';
import type { ParsedDocumentResult, ParsedField } from '../parser/providerAdapter';
import { calculateFullAustralianTax } from '../engine/taxCalculator';
import { createBlankFinancialYear, getCurrentAustralianFinancialYear } from '../data/blankFinancialYear';

/** Resolves a parser's financial year label ("2025–26") to a workspace year. */
export function resolveFinancialYear(label: string): {
  id: string;
  label: string;
  startDate: string;
  endDate: string;
} {
  const match = label.match(/(20\d{2})\s*[–\-/]\s*(\d{2})/);
  if (!match) return getCurrentAustralianFinancialYear();

  const startYear = Number(match[1]);
  return {
    id: `${startYear}-${match[2]}`,
    label: `${startYear}–${match[2]}`,
    startDate: `${startYear}-07-01`,
    endDate: `${startYear + 1}-06-30`
  };
}

/**
 * Folds a parsed document into the user's real financial year data: figures the
 * document actually states are written through, and everything downstream of
 * them is recalculated by the tax engine. Fields the parser could not read are
 * left untouched rather than zeroed.
 */
export function applyParsedDocument(
  years: AustralianFinancialYear[],
  doc: SourceDocument,
  result: ParsedDocumentResult
): AustralianFinancialYear[] {
  const target = resolveFinancialYear(result.financialYear);
  const existing = years.find((fy) => fy.id === target.id);
  const base = existing ?? createBlankFinancialYear(target.id, target.label, target.startDate, target.endDate);

  const withDocument: AustralianFinancialYear = {
    ...base,
    documents: [{ ...doc, financialYear: target.label }, ...base.documents]
  };

  const updated = recalculate(applyFields(withDocument, doc, result));

  return existing
    ? years.map((fy) => (fy.id === updated.id ? updated : fy))
    : [updated, ...years].sort((a, b) => b.id.localeCompare(a.id));
}

function applyFields(
  fy: AustralianFinancialYear,
  doc: SourceDocument,
  result: ParsedDocumentResult
): AustralianFinancialYear {
  const fields = result.extractedFields;
  const num = (key: string): number | undefined => {
    const value = fields[key]?.value;
    return typeof value === 'number' && !isNaN(value) ? value : undefined;
  };
  const extracted = <T>(key: string, value: T): ExtractedValue<T> => ({
    value,
    confidence: fields[key]?.confidence ?? 0,
    sourceDocumentId: doc.id,
    sourceDocumentName: doc.fileName,
    sourcePage: fields[key]?.sourcePage ?? 1,
    sourceText: fields[key]?.sourceText,
    manuallyConfirmed: false
  });

  if (result.documentType === 'payslip') {
    return { ...fy, payslips: [buildPayslip(fy, doc, fields, extracted), ...fy.payslips] };
  }

  if (result.documentType === 'notice_of_assessment') {
    return {
      ...fy,
      taxableIncome: num('taxableIncome') ?? fy.taxableIncome,
      taxWithheld: num('taxWithheldCredit') ?? fy.taxWithheld,
      medicareLevy: num('medicareLevy') ?? fy.medicareLevy,
      helpRepayment: num('helpRepayment') ?? fy.helpRepayment,
      assessmentResult: num('assessmentResult') ?? fy.assessmentResult
    };
  }

  // Income statements, tax returns and everything else that reports year totals.
  const grossIncome = num('grossIncome');
  const deductions = num('deductions');
  const employerName = typeof fields['employerName']?.value === 'string' ? fields['employerName'].value : undefined;

  // One entry per document type, so re-uploading a corrected statement replaces
  // the earlier one instead of stacking a duplicate alongside it.
  const incomeId = `inc-${result.documentType}`;
  const deductionId = `ded-${result.documentType}`;

  const income: IncomeItem[] =
    grossIncome === undefined
      ? fy.income
      : [
          ...fy.income.filter((item) => item.id !== incomeId),
          {
            id: incomeId,
            category: 'salary_wages',
            description: `Reported on ${doc.fileName}`,
            employerOrPayer: extracted('employerName', employerName ?? 'Not stated on document'),
            grossAmount: extracted('grossIncome', grossIncome),
            taxWithheld: extracted('taxWithheld', num('taxWithheld') ?? 0)
          }
        ];

  const deductionItems: DeductionItem[] =
    deductions === undefined
      ? fy.deductions
      : [
          ...fy.deductions.filter((item) => item.id !== deductionId),
          {
            id: deductionId,
            category: 'other_work',
            description: `Total work-related deductions from ${doc.fileName}`,
            amount: extracted('deductions', deductions),
            hasReceipt: true,
            receiptDocumentId: doc.id,
            receiptFileName: doc.fileName
          }
        ];

  return {
    ...fy,
    income,
    deductions: deductionItems,
    grossIncome: grossIncome ?? fy.grossIncome,
    taxWithheld: num('taxWithheld') ?? fy.taxWithheld,
    totalDeductions: deductions ?? fy.totalDeductions,
    employerSuper: num('employerSuper') ?? fy.employerSuper
  };
}

function buildPayslip(
  fy: AustralianFinancialYear,
  doc: SourceDocument,
  fields: Record<string, ParsedField<any>>,
  extracted: <T>(key: string, value: T) => ExtractedValue<T>
): Payslip {
  const employerName = typeof fields['employerName']?.value === 'string' ? fields['employerName'].value : 'Not stated on document';
  const gross = typeof fields['grossPay']?.value === 'number' ? fields['grossPay'].value : 0;
  const tax = typeof fields['taxWithheld']?.value === 'number' ? fields['taxWithheld'].value : 0;
  const net = typeof fields['netPay']?.value === 'number' ? fields['netPay'].value : gross - tax;

  return {
    id: `payslip-${doc.id}`,
    employerName: extracted('employerName', employerName),
    payPeriodStart: fy.startDate,
    payPeriodEnd: fy.endDate,
    paymentDate: extracted('paymentDate', doc.uploadDate),
    grossPay: extracted('grossPay', gross),
    taxWithheld: extracted('taxWithheld', tax),
    netPay: extracted('netPay', net),
    hourlyRate: fields['hourlyRate'] ? extracted('hourlyRate', fields['hourlyRate'].value as number) : undefined,
    employerSuper: extracted('employerSuper', typeof fields['employerSuper']?.value === 'number' ? fields['employerSuper'].value : 0),
    sourceDocumentId: doc.id,
    sourceDocumentName: doc.fileName
  };
}

/**
 * Recomputes the figures that follow from the stated ones. Values a document
 * actually reported are kept; only untouched (zero) fields are filled in.
 */
function recalculate(fy: AustralianFinancialYear): AustralianFinancialYear {
  const hasHELP = fy.helpRepayment > 0 || Boolean(fy.studyLoans);
  const engine = calculateFullAustralianTax(
    fy.grossIncome,
    fy.totalDeductions,
    fy.taxWithheld,
    hasHELP,
    fy.id
  );

  const employers = new Set(
    [
      ...fy.income.map((item) => item.employerOrPayer.value),
      ...fy.payslips.map((slip) => slip.employerName.value)
    ]
      .map((name) => name.toLowerCase().trim())
      .filter((name) => name && name !== 'not stated on document')
  );

  return {
    ...fy,
    taxableIncome: fy.taxableIncome || engine.taxableIncome,
    medicareLevy: fy.medicareLevy || engine.medicareLevy,
    helpRepayment: fy.helpRepayment || engine.helpRepayment,
    assessmentResult: fy.assessmentResult || engine.assessmentResult,
    effectiveTaxRate: fy.grossIncome > 0 ? engine.effectiveTaxRate : 0,
    employerCount: employers.size
  };
}
