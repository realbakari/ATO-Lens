import type { DocumentParserProvider, ParsedDocumentResult, ParsedField } from './providerAdapter';
import type { DocumentType } from '../types/tax';
import { redactSensitiveData, logNetworkActivity } from '../storage/privacyLog';

export class LocalRuleBasedParser implements DocumentParserProvider {
  providerId = 'rule_based' as const;
  providerName = 'Local Rule-Based Parser (Offline)';

  async parseDocument(
    fileBuffer: ArrayBuffer,
    fileName: string,
    documentType?: DocumentType
  ): Promise<ParsedDocumentResult> {
    // Log local offline request to Privacy Network Activity Monitor
    logNetworkActivity('Local Client Machine (Offline)', `Parsed ${fileName} locally`, 'offline_local', fileBuffer.byteLength);

    const decoder = new TextDecoder('utf-8');
    let rawText = '';
    try {
      rawText = decoder.decode(fileBuffer);
    } catch {
      rawText = '';
    }

    // Figures are read from the original text: redaction blanks digit runs, so
    // extracting from redacted text loses real amounts. Nothing leaves the
    // machine here - the text that gets stored or logged is redacted below.
    const text = rawText;
    const redactedText = redactSensitiveData(rawText);

    const detectedType = documentType || this.detectDocumentType(fileName, text);
    const extractedFields: Record<string, ParsedField<any>> = {};

    const fyMatch = text.match(/20(2[0-9])[–\-/](2[0-9])/);
    const financialYear = fyMatch ? `20${fyMatch[1]}–${fyMatch[2]}` : currentFinancialYearLabel();

    if (detectedType === 'notice_of_assessment') {
      this.put(extractedFields, 'taxableIncome', text, /Taxable income\s*:?\s*\$?([\d,]+(?:\.\d{2})?)/i);
      this.put(extractedFields, 'taxWithheldCredit', text, /(?:PAYG )?[Tt]ax withheld\s*:?\s*\$?([\d,]+(?:\.\d{2})?)/);
      this.put(extractedFields, 'medicareLevy', text, /Medicare levy\s*:?\s*\$?([\d,]+(?:\.\d{2})?)/i);
      this.put(extractedFields, 'helpRepayment', text, /HELP (?:compulsory )?repayment\s*:?\s*\$?([\d,]+(?:\.\d{2})?)/i);
      this.put(extractedFields, 'assessmentResult', text, /(?:Refund|Credit|Outcome)\s*:?\s*\$?([\d,]+(?:\.\d{2})?)/i);
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
    const confidenceAverage = confidences.length
      ? confidences.reduce((sum, c) => sum + c, 0) / confidences.length
      : 0;

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
    regex: RegExp
  ): void {
    const match = text.match(regex);
    if (!match?.[1]) return;
    const value = parseFloat(match[1].replace(/,/g, ''));
    if (isNaN(value)) return;
    fields[key] = { value, confidence: 0.94, sourceText: match[0].trim(), sourcePage: 1 };
  }
}

/** Label of the Australian financial year (1 July - 30 June) that "today" falls in. */
function currentFinancialYearLabel(): string {
  const now = new Date();
  const startYear = now.getMonth() >= 6 ? now.getFullYear() : now.getFullYear() - 1;
  return `${startYear}–${String(startYear + 1).slice(-2)}`;
}
