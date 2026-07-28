import type { DocumentType } from '../types/tax';
import type { ParsedDocumentResult, ParsedField } from './providerAdapter';

export const EXTRACTION_SYSTEM_PROMPT = `You are an Australian Taxation Office (ATO) document analyst embedded in a local-first tax workspace called ATO Lens.
Extract structured data from the attached Australian tax document. Supported types include tax returns, notices of assessment, STP income statements, PAYG summaries, payslips, super statements, HELP/HECS statements, deduction receipts, private health insurance statements, dividend statements, and sole-trader accounting exports.

Respond with ONLY minified JSON (no markdown fences, no commentary) matching exactly this shape:
{"documentType":"tax_return|notice_of_assessment|income_statement|payg_summary|payslip|super_statement|help_statement|deduction_receipt|health_insurance|dividend_statement|sole_trader_export","financialYear":"2025–26","fields":{"<fieldName>":{"value":<number-or-string>,"confidence":<0-1>,"sourceText":"<verbatim excerpt>","sourcePage":<page-number>}}}

Use the applicable fieldName keys from this list: grossIncome, taxableIncome, taxWithheld, taxWithheldCredit, medicareLevy, helpRepayment, assessmentResult, employerName, grossPay, netPay, employerSuper, hourlyRate, ordinaryHours, overtimeHours, allowances, reportableEmployerSuper, incomeStatementStatus, fundName, personalContributions, openingBalance, indexationAmount, compulsoryRepayment, voluntaryRepayments, creditsAdjustments, closingBalance, amountWithheldPayroll, supplierName, deductionAmount, transactionDate, expenseDescription, healthInsurer, premiumsEligible, rebateReceived, benefitCode, companyName, frankedAmount, unfrankedAmount, frankingCredits, businessName, grossBusinessIncome, businessExpenses, netBusinessIncome, deductions.

Critical privacy rule: NEVER include a full Tax File Number, Medicare card number, or bank BSB/account number in your response. Redact any such numbers you observe as "*** *** ***" before returning them.`;

export function buildUserInstruction(fileName: string, documentType?: DocumentType): string {
  return `Extract structured Australian tax fields from the attached document "${fileName}"${
    documentType ? ` (expected type: ${documentType})` : ''
  }. Extract every supported field that is visibly present, preserve its page number and do not infer missing values.`;
}

/**
 * Parses a model's JSON reply into a ParsedDocumentResult, falling back to
 * `fallback` (usually the local rule-based result) if it can't be parsed.
 */
export function parseModelJson(raw: string, fallback: ParsedDocumentResult): ParsedDocumentResult {
  try {
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return fallback;
    const parsed = JSON.parse(jsonMatch[0]);

    const extractedFields: Record<string, ParsedField<any>> = {};
    for (const [key, val] of Object.entries(parsed.fields || {})) {
      const v = val as any;
      if (v == null || v.value === undefined) continue;
      extractedFields[key] = {
        value: v.value,
        confidence: typeof v.confidence === 'number' ? Math.min(1, Math.max(0, v.confidence)) : 0.85,
        sourceText: typeof v.sourceText === 'string' ? v.sourceText : '',
        sourcePage: typeof v.sourcePage === 'number' ? v.sourcePage : 1
      };
    }

    const fieldValues = Object.values(extractedFields);
    const hasFields = fieldValues.length > 0;

    return {
      documentType: isDocumentType(parsed.documentType)
        ? parsed.documentType
        : fallback.documentType,
      financialYear: parsed.financialYear || fallback.financialYear,
      confidenceAverage: hasFields
        ? Math.round((fieldValues.reduce((s, f) => s + f.confidence, 0) / fieldValues.length) * 100) / 100
        : fallback.confidenceAverage,
      extractedFields: hasFields ? extractedFields : fallback.extractedFields,
      rawText: fallback.rawText,
      extractionSource: fallback.extractionSource,
      pageCount: fallback.pageCount
    };
  } catch {
    return fallback;
  }
}

const DOCUMENT_TYPES: DocumentType[] = [
  'tax_return',
  'notice_of_assessment',
  'income_statement',
  'payg_summary',
  'payslip',
  'super_statement',
  'help_statement',
  'deduction_receipt',
  'health_insurance',
  'dividend_statement',
  'sole_trader_export'
];

function isDocumentType(value: unknown): value is DocumentType {
  return typeof value === 'string' && DOCUMENT_TYPES.includes(value as DocumentType);
}

export function documentMimeType(fileName: string): string {
  const extension = fileName.toLowerCase().split('.').pop();
  if (extension === 'jpg' || extension === 'jpeg') return 'image/jpeg';
  if (extension === 'png') return 'image/png';
  if (extension === 'webp') return 'image/webp';
  if (extension === 'txt') return 'text/plain';
  return 'application/pdf';
}

/** Converts a document ArrayBuffer into a base64 string for API upload. */
export function arrayBufferToBase64(fileBuffer: ArrayBuffer): string {
  let binary = '';
  const bytes = new Uint8Array(fileBuffer);
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}
