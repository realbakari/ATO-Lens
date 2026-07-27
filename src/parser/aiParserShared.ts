import type { DocumentType } from '../types/tax';
import type { ParsedDocumentResult, ParsedField } from './providerAdapter';

export const EXTRACTION_SYSTEM_PROMPT = `You are an Australian Taxation Office (ATO) document analyst embedded in a local-first tax workspace called ATO Lens.
Extract structured data from the attached Australian tax document (tax return, Notice of Assessment, STP income statement, payslip, superannuation statement, or HELP/HECS study loan statement).

Respond with ONLY minified JSON (no markdown fences, no commentary) matching exactly this shape:
{"documentType":"tax_return|notice_of_assessment|income_statement|payslip|super_statement|help_statement|deduction_receipt","financialYear":"2025–26","fields":{"<fieldName>":{"value":<number-or-string>,"confidence":<0-1>,"sourceText":"<verbatim excerpt>"}}}

Use fieldName keys such as: grossIncome, taxableIncome, taxWithheld, taxWithheldCredit, medicareLevy, helpRepayment, assessmentResult, employerName, grossPay, netPay, employerSuper, hourlyRate, deductions.

Critical privacy rule: NEVER include a full Tax File Number, Medicare card number, or bank BSB/account number in your response. Redact any such numbers you observe as "*** *** ***" before returning them.`;

export function buildUserInstruction(fileName: string, documentType?: DocumentType): string {
  return `Extract structured Australian tax fields from the attached document "${fileName}"${
    documentType ? ` (expected type: ${documentType})` : ''
  }. Focus on gross income, tax withheld, taxable income, Medicare levy, HELP/HECS compulsory repayment, superannuation guarantee contributions, and work-related deductions where present.`;
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
      documentType: parsed.documentType || fallback.documentType,
      financialYear: parsed.financialYear || fallback.financialYear,
      confidenceAverage: hasFields
        ? Math.round((fieldValues.reduce((s, f) => s + f.confidence, 0) / fieldValues.length) * 100) / 100
        : fallback.confidenceAverage,
      extractedFields: hasFields ? extractedFields : fallback.extractedFields,
      rawText: fallback.rawText
    };
  } catch {
    return fallback;
  }
}

/** Converts an ArrayBuffer (e.g. a PDF file) into a base64 string for API upload. */
export function arrayBufferToBase64(fileBuffer: ArrayBuffer): string {
  let binary = '';
  const bytes = new Uint8Array(fileBuffer);
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}
