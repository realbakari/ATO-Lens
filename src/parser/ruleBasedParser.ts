import type { DocumentParserProvider, ParsedDocumentResult, ParsedField } from './providerAdapter';
import type { DocumentType } from '../types/tax';
import { redactSensitiveData, logNetworkActivity } from '../storage/privacyLog';
import { extractDocumentText, type ExtractProgress, type PdfExtraction } from './pdfExtract';

export class LocalRuleBasedParser implements DocumentParserProvider {
  providerId = 'rule_based' as const;
  providerName = 'Local Rule-Based Parser (Offline)';

  async parseDocument(
    fileBuffer: ArrayBuffer,
    fileName: string,
    documentType?: DocumentType,
    onProgress?: ExtractProgress
  ): Promise<ParsedDocumentResult> {
    // Log local offline request to Privacy Network Activity Monitor
    logNetworkActivity('Local Client Machine (Offline)', `Parsed ${fileName} locally`, 'offline_local', fileBuffer.byteLength);

    // Reads the PDF's text layer, or falls back to on-device OCR for scans.
    // Both run locally - no part of the document leaves the machine here.
    let rawText = '';
    let extraction: PdfExtraction | null = null;
    try {
      extraction = await extractDocumentText(fileBuffer, onProgress);
      rawText = extraction.text;
    } catch (err) {
      console.error('[ATO Lens] Could not read document text:', err);
    }

    // Figures are read from the original text: redaction blanks digit runs, so
    // extracting from redacted text loses real amounts. Nothing leaves the
    // machine here - the text that gets stored or logged is redacted below.
    const text = rawText;
    const redactedText = redactSensitiveData(rawText);

    const detectedType = documentType || this.detectDocumentType(fileName, text);
    const extractedFields: Record<string, ParsedField<any>> = {};

    const financialYear = detectFinancialYear(text);

    if (detectedType === 'notice_of_assessment') {
      // Wording taken from real notices: "Your taxable income is $58,542",
      // "PAYG withholding (eg tax deducted by your employer or bank)".
      this.put(extractedFields, 'taxableIncome', text, [
        /(?:your )?taxable income\s*(?:is)?\s*:?\s*\$?([\d,]+(?:\.\d{2})?)/i
      ]);
      this.put(extractedFields, 'taxWithheldCredit', text, [
        /PAYG withholding[^\d\n]*([\d,]+(?:\.\d{2})?)/i,
        /(?:PAYG )?tax withheld\s*:?\s*\$?([\d,]+(?:\.\d{2})?)/i
      ]);
      this.put(extractedFields, 'medicareLevy', text, [
        /Medicare levy(?! surcharge)[^\d\n]*([\d,]+(?:\.\d{2})?)/i
      ]);
      this.put(extractedFields, 'helpRepayment', text, [
        /(?:HELP|HECS)[^\n]*?repayment[^\d\n]*([\d,]+(?:\.\d{2})?)/i
      ]);
      this.put(extractedFields, 'lowIncomeOffset', text, [
        /Low income (?:tax )?offset[^\d\n]*([\d,]+(?:\.\d{2})?)/i
      ]);

      // The outcome carries CR (refunded to you) or DR (payable). Without the
      // suffix a bill and a refund are the same number.
      const outcome = text.match(
        /(?:Outcome|Result) of this notice\s*:?\s*\$?([\d,]+(?:\.\d{2})?)\s*(CR|DR)?/i
      );
      if (outcome?.[1]) {
        const amount = parseFloat(outcome[1].replace(/,/g, ''));
        if (!isNaN(amount)) {
          extractedFields['assessmentResult'] = {
            value: /dr/i.test(outcome[2] || '') ? -amount : amount,
            confidence: 0.94,
            sourceText: outcome[0].trim(),
            sourcePage: 1
          };
        }
      }
    } else if (detectedType === 'payslip') {
      const employer = text.match(/Employer\s*:?\s*([^\n\r]+)/i);
      if (employer?.[1]) {
        extractedFields['employerName'] = {
          value: employer[1].trim(),
          confidence: 0.95,
          sourceText: employer[0].trim(),
          sourcePage: 1
        };
      }
      this.put(extractedFields, 'grossPay', text, /Gross(?: Earnings| Pay)?\s*:?\s*\$?([\d,]+(?:\.\d{2})?)/i);
      this.put(extractedFields, 'taxWithheld', text, /(?:PAYG )?Tax(?: Withheld)?\s*:?\s*\$?([\d,]+(?:\.\d{2})?)/i);
      this.put(extractedFields, 'netPay', text, /Net Pay\s*:?\s*\$?([\d,]+(?:\.\d{2})?)/i);
      this.put(extractedFields, 'employerSuper', text, /Super(?:annuation)?[^$\n\r]*\$?([\d,]+(?:\.\d{2})?)/i);
      this.put(extractedFields, 'hourlyRate', text, /Hourly Rate\s*:?\s*\$?([\d,]+(?:\.\d{2})?)/i);
    } else {
      this.put(extractedFields, 'grossIncome', text, /Gross (?:income|salary(?: & wages)?)\s*:?\s*\$?([\d,]+(?:\.\d{2})?)/i);
      this.put(extractedFields, 'taxWithheld', text, /(?:Total )?[Tt]ax withheld\s*:?\s*\$?([\d,]+(?:\.\d{2})?)/);
      this.put(extractedFields, 'deductions', text, /(?:Total (?:work )?)?[Dd]eductions\s*:?\s*\$?([\d,]+(?:\.\d{2})?)/);
      this.put(extractedFields, 'employerSuper', text, /(?:Employer )?Super(?:annuation)?[^$\n\r]*\$?([\d,]+(?:\.\d{2})?)/i);
    }

    const confidences = Object.values(extractedFields).map((f) => f.confidence);
    let confidenceAverage = confidences.length
      ? confidences.reduce((sum, c) => sum + c, 0) / confidences.length
      : 0;

    // A figure recognised from a scan is only as trustworthy as the recognition
    // that produced it, so the page confidence caps the field confidence.
    if (extraction?.source === 'ocr' && extraction.ocrConfidence !== undefined) {
      confidenceAverage *= extraction.ocrConfidence;
      for (const field of Object.values(extractedFields)) {
        field.confidence *= extraction.ocrConfidence;
      }
    }

    return {
      documentType: detectedType,
      financialYear,
      confidenceAverage,
      extractedFields,
      rawText: redactedText
    };
  }

  private detectDocumentType(fileName: string, text: string): DocumentType {
    const fn = fileName.toLowerCase();
    if (fn.includes('noa') || fn.includes('assessment') || text.includes('Notice of assessment')) {
      return 'notice_of_assessment';
    }
    if (fn.includes('payslip') || text.includes('Pay Slip') || text.includes('Net Pay')) {
      return 'payslip';
    }
    if (fn.includes('income') || fn.includes('stp') || text.includes('Income statement')) {
      return 'income_statement';
    }
    if (fn.includes('super') || text.includes('Superannuation')) {
      return 'super_statement';
    }
    if (fn.includes('help') || fn.includes('hecs') || text.includes('Study loan')) {
      return 'help_statement';
    }
    return 'tax_return';
  }

  /**
   * Records a currency field only when it is actually present in the document.
   * A field that cannot be read is left out rather than defaulted - inventing a
   * figure would put a number the user never supplied into their tax workspace.
   */
  private put(
    fields: Record<string, ParsedField<any>>,
    key: string,
    text: string,
    patterns: RegExp | RegExp[]
  ): void {
    for (const regex of Array.isArray(patterns) ? patterns : [patterns]) {
      const match = text.match(regex);
      if (!match?.[1]) continue;
      const value = parseFloat(match[1].replace(/,/g, ''));
      if (isNaN(value)) continue;
      fields[key] = { value, confidence: 0.94, sourceText: match[0].trim(), sourcePage: 1 };
      return;
    }
  }
}

/**
 * Works out which financial year a document covers. Notices of assessment state
 * "year ended 30 June 2016" rather than a 2015-16 style label, and filing an old
 * notice under the current year would silently corrupt the workspace.
 */
function detectFinancialYear(text: string): string {
  const yearEnded = text.match(/(?:year|period) end(?:ed|ing)\s+30 June\s+(20\d{2})/i);
  if (yearEnded) {
    const endYear = Number(yearEnded[1]);
    return `${endYear - 1}–${String(endYear).slice(-2)}`;
  }

  const labelled = text.match(/(20\d{2})\s*[–\-/]\s*(\d{2})\b/);
  if (labelled) return `${labelled[1]}–${labelled[2]}`;

  return currentFinancialYearLabel();
}

/** Label of the Australian financial year (1 July - 30 June) that "today" falls in. */
function currentFinancialYearLabel(): string {
  const now = new Date();
  const startYear = now.getMonth() >= 6 ? now.getFullYear() : now.getFullYear() - 1;
  return `${startYear}–${String(startYear + 1).slice(-2)}`;
}
