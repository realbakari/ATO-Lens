import type { DocumentParserProvider, ParsedDocumentResult, ParsedField } from './providerAdapter';
import type { DocumentType } from '../types/tax';
import { redactSensitiveData, logNetworkActivity } from '../storage/privacyLog';
import {
  confidenceForSnippet,
  extractDocumentText,
  pageForSnippet,
  type ExtractProgress,
  type PdfExtraction
} from './pdfExtract';

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
    logNetworkActivity(
      'Local Client Machine (Offline)',
      `Parsed ${fileName} locally`,
      'offline_local',
      fileBuffer.byteLength
    );

    // Reads the PDF's text layer, or falls back to on-device OCR for scans.
    // Both run locally - no part of the document leaves the machine here.
    let rawText = '';
    let extraction: PdfExtraction | null = null;
    try {
      extraction = await extractDocumentText(fileBuffer, onProgress, fileName);
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
    const put = (key: string, patterns: RegExp | RegExp[]) =>
      this.put(extractedFields, key, text, patterns, extraction);
    const putText = (key: string, patterns: RegExp | RegExp[]) =>
      this.putText(extractedFields, key, text, patterns, extraction);

    if (detectedType === 'notice_of_assessment') {
      // Wording taken from real notices: "Your taxable income is $58,542",
      // "PAYG withholding (eg tax deducted by your employer or bank)".
      put('taxableIncome', [
        /(?:your )?taxable income\s*(?:is)?\s*:?\s*\$?([\d,]+(?:\.\d{2})?)/i
      ]);
      put('taxWithheldCredit', [
        /PAYG withholding[^\d\n]*([\d,]+(?:\.\d{2})?)/i,
        /(?:PAYG )?tax withheld\s*:?\s*\$?([\d,]+(?:\.\d{2})?)/i
      ]);
      put('medicareLevy', [
        /Medicare levy(?! surcharge)[^\d\n]*([\d,]+(?:\.\d{2})?)/i
      ]);
      put('helpRepayment', [
        /(?:HELP|HECS)[^\n]*?repayment[^\d\n]*([\d,]+(?:\.\d{2})?)/i
      ]);
      put('lowIncomeOffset', [
        /Low income (?:tax )?offset[^\d\n]*([\d,]+(?:\.\d{2})?)/i
      ]);

      const outcomePatterns: Array<{ regex: RegExp; sign: 1 | -1 | 'suffix' }> = [
        { regex: /\bRefund(?: amount)?\s*:?\s*\$?([\d,]+(?:\.\d{2})?)/i, sign: 1 },
        {
          regex: /\b(?:Amount|Balance)\s+(?:payable|due)\s*:?\s*\$?([\d,]+(?:\.\d{2})?)/i,
          sign: -1
        },
        {
          regex: /(?:Outcome|Result) of this notice\s*:?\s*\$?([\d,]+(?:\.\d{2})?)\s*(CR|DR)\b/i,
          sign: 'suffix'
        }
      ];
      for (const { regex, sign } of outcomePatterns) {
        const outcome = text.match(regex);
        if (!outcome?.[1]) continue;
        const amount = parseFloat(outcome[1].replace(/,/g, ''));
        if (isNaN(amount)) continue;
        extractedFields['assessmentResult'] = {
          value: sign === -1 || (sign === 'suffix' && /dr/i.test(outcome[2] || '')) ? -amount : amount,
          confidence: 0.94,
          sourceText: outcome[0].trim(),
          sourcePage: pageForSnippet(extraction?.pages, outcome[0])
        };
        break;
      }
    } else if (detectedType === 'payslip') {
      putText('employerName', /Employer\s*:?\s*([^\n\r]+)/i);
      put('grossPay', /Gross(?: Earnings| Pay)?\s*:?\s*\$?([\d,]+(?:\.\d{2})?)/i);
      put('taxWithheld', /(?:PAYG )?Tax(?: Withheld)?\s*:?\s*\$?([\d,]+(?:\.\d{2})?)/i);
      put('netPay', /Net Pay\s*:?\s*\$?([\d,]+(?:\.\d{2})?)/i);
      put('employerSuper', /Super(?:annuation)?[^$\n\r]*\$?([\d,]+(?:\.\d{2})?)/i);
      put('hourlyRate', /Hourly Rate\s*:?\s*\$?([\d,]+(?:\.\d{2})?)/i);
      put('ordinaryHours', /Ordinary Hours\s*:?\s*([\d,.]+)/i);
      put('overtimeHours', /Overtime Hours\s*:?\s*([\d,.]+)/i);
      put('allowances', /Allowances?\s*:?\s*\$?([\d,]+(?:\.\d{2})?)/i);
      putText('paymentDate', /(?:Payment|Pay) Date\s*:?\s*([^\n\r]+)/i);
    } else if (detectedType === 'income_statement' || detectedType === 'payg_summary') {
      putText('employerName', [
        /Employer(?: name)?\s*:?\s*([^\n\r]+)/i,
        /Payer(?: name)?\s*:?\s*([^\n\r]+)/i
      ]);
      put('grossIncome', [
        /Gross (?:income|payments?|salary(?: and| &)? wages|earnings)\s*:?\s*\$?([\d,]+(?:\.\d{2})?)/i,
        /Total payments\s*:?\s*\$?([\d,]+(?:\.\d{2})?)/i
      ]);
      put('taxWithheld', /(?:Total )?(?:PAYG )?[Tt]ax withheld\s*:?\s*\$?([\d,]+(?:\.\d{2})?)/);
      put('allowances', /Allowances?\s*:?\s*\$?([\d,]+(?:\.\d{2})?)/i);
      put(
        'reportableEmployerSuper',
        /Reportable employer super(?:annuation)? contributions?\s*:?\s*\$?([\d,]+(?:\.\d{2})?)/i
      );
      putText('incomeStatementStatus', /Status\s*:?\s*(Tax ready|Not tax ready)/i);
    } else if (detectedType === 'tax_return') {
      put('grossIncome', /Gross (?:income|salary(?: and| &)? wages)\s*:?\s*\$?([\d,]+(?:\.\d{2})?)/i);
      put('taxableIncome', /Taxable income\s*:?\s*\$?([\d,]+(?:\.\d{2})?)/i);
      put('taxWithheld', /(?:Total )?(?:PAYG )?[Tt]ax withheld\s*:?\s*\$?([\d,]+(?:\.\d{2})?)/);
      put('deductions', /(?:Total (?:work )?)?[Dd]eductions\s*:?\s*\$?([\d,]+(?:\.\d{2})?)/);
      put('medicareLevy', /Medicare levy(?! surcharge)[^\d\n]*([\d,]+(?:\.\d{2})?)/i);
      put('helpRepayment', /(?:HELP|HECS)[^\n]*?repayment[^\d\n]*([\d,]+(?:\.\d{2})?)/i);
      put('employerSuper', /(?:Employer )?Super(?:annuation)?[^$\n\r]*\$?([\d,]+(?:\.\d{2})?)/i);
    } else if (detectedType === 'super_statement') {
      putText('fundName', [
        /(?:Super(?:annuation)? )?Fund(?: name)?\s*:?\s*([^\n\r]+)/i,
        /Fund\s*:?\s*([^\n\r]+)/i
      ]);
      putText('employerName', /Employer(?: name)?\s*:?\s*([^\n\r]+)/i);
      put('employerSuper', [
        /Employer (?:superannuation|contributions?)\s*:?\s*\$?([\d,]+(?:\.\d{2})?)/i,
        /Contributions? from (?:your )?employer\s*:?\s*\$?([\d,]+(?:\.\d{2})?)/i
      ]);
      put('personalContributions', /Personal contributions?\s*:?\s*\$?([\d,]+(?:\.\d{2})?)/i);
      put('openingBalance', /Opening balance\s*:?\s*\$?([\d,]+(?:\.\d{2})?)/i);
      put('closingBalance', /Closing balance\s*:?\s*\$?([\d,]+(?:\.\d{2})?)/i);
    } else if (detectedType === 'help_statement') {
      put('openingBalance', /Opening balance\s*:?\s*\$?([\d,]+(?:\.\d{2})?)/i);
      put('indexationAmount', /Indexation(?: amount)?\s*:?\s*\$?([\d,]+(?:\.\d{2})?)/i);
      put('compulsoryRepayment', /(?:HELP|HECS)?\s*Compulsory repayment\s*:?\s*\$?([\d,]+(?:\.\d{2})?)/i);
      put('voluntaryRepayments', /Voluntary repayments?\s*:?\s*\$?([\d,]+(?:\.\d{2})?)/i);
      put('creditsAdjustments', /Credits?(?: and)? adjustments?\s*:?\s*\$?([\d,]+(?:\.\d{2})?)/i);
      put('closingBalance', /Closing balance\s*:?\s*\$?([\d,]+(?:\.\d{2})?)/i);
      put('amountWithheldPayroll', /(?:Payroll|PAYG)[^\n]*withheld\s*:?\s*\$?([\d,]+(?:\.\d{2})?)/i);
    } else if (detectedType === 'deduction_receipt') {
      putText('supplierName', [
        /(?:Supplier|Merchant|Business)\s*:?\s*([^\n\r]+)/i,
        /Receipt from\s*:?\s*([^\n\r]+)/i
      ]);
      put('deductionAmount', [
        /(?:Total|Amount paid|Amount|Deductions?)\s*:?\s*\$?([\d,]+(?:\.\d{2})?)/i
      ]);
      putText('transactionDate', /(?:Transaction )?Date\s*:?\s*([^\n\r]+)/i);
      putText('expenseDescription', /(?:Description|Item)\s*:?\s*([^\n\r]+)/i);
    } else if (detectedType === 'health_insurance') {
      putText('healthInsurer', /(?:Health )?Insurer(?: name)?\s*:?\s*([^\n\r]+)/i);
      put('premiumsEligible', /Premiums? eligible for rebate\s*:?\s*\$?([\d,]+(?:\.\d{2})?)/i);
      put('rebateReceived', /(?:Australian Government )?Rebate received\s*:?\s*\$?([\d,]+(?:\.\d{2})?)/i);
      putText('benefitCode', /Benefit code\s*:?\s*([A-Za-z0-9]+)/i);
    } else if (detectedType === 'dividend_statement') {
      putText('companyName', [
        /Company(?: name)?\s*:?\s*([^\n\r]+)/i,
        /Payer(?: name)?\s*:?\s*([^\n\r]+)/i
      ]);
      put('frankedAmount', /Franked (?:dividend|amount)\s*:?\s*\$?([\d,]+(?:\.\d{2})?)/i);
      put('unfrankedAmount', /Unfranked (?:dividend|amount)\s*:?\s*\$?([\d,]+(?:\.\d{2})?)/i);
      put('frankingCredits', /Franking credits?\s*:?\s*\$?([\d,]+(?:\.\d{2})?)/i);
      put('taxWithheld', /(?:TFN amounts? |Tax )?withheld\s*:?\s*\$?([\d,]+(?:\.\d{2})?)/i);
    } else if (detectedType === 'sole_trader_export') {
      putText('businessName', /Business(?: name)?\s*:?\s*([^\n\r]+)/i);
      put('grossBusinessIncome', /Gross business income\s*:?\s*\$?([\d,]+(?:\.\d{2})?)/i);
      put('businessExpenses', /(?:Total )?Business expenses\s*:?\s*\$?([\d,]+(?:\.\d{2})?)/i);
      put('netBusinessIncome', /Net business (?:income|profit|loss)\s*:?\s*\$?(-?[\d,]+(?:\.\d{2})?)/i);
    } else {
      put('grossIncome', /Gross income\s*:?\s*\$?([\d,]+(?:\.\d{2})?)/i);
      put('taxWithheld', /(?:Total )?[Tt]ax withheld\s*:?\s*\$?([\d,]+(?:\.\d{2})?)/);
    }

    const confidences = Object.values(extractedFields).map((f) => f.confidence);
    let confidenceAverage = confidences.length
      ? confidences.reduce((sum, c) => sum + c, 0) / confidences.length
      : 0;

    // A figure recognised from a scan is only as trustworthy as its own reading.
    // Scoring each field on the words behind it, rather than the page average,
    // avoids scanner noise in a logo dragging down a cleanly-read dollar amount.
    if (extraction?.source === 'ocr') {
      for (const field of Object.values(extractedFields)) {
        const extractedPage = extraction.pages.find(
          (page) => page.pageNumber === field.sourcePage
        );
        if (extractedPage?.source !== 'ocr') continue;

        // Once the digits are read correctly the pattern match is certain, so
        // the recognition of the figure itself is the whole uncertainty.
        field.confidence =
          confidenceForSnippet(
            extractedPage.words ?? extraction.words,
            field.sourceText ?? '',
            field.sourcePage
          ) ??
          extractedPage.ocrConfidence ??
          field.confidence;
      }

      const scored = Object.values(extractedFields).map((f) => f.confidence);
      confidenceAverage = scored.length
        ? scored.reduce((sum, c) => sum + c, 0) / scored.length
        : (extraction.ocrConfidence ?? 0);
    }

    return {
      documentType: detectedType,
      financialYear,
      confidenceAverage,
      extractedFields,
      rawText: redactedText,
      extractionSource: extraction?.source ?? 'none',
      pageCount: extraction?.pageCount ?? 1
    };
  }

  private detectDocumentType(fileName: string, text: string): DocumentType {
    const fn = fileName.toLowerCase();
    if (fn.includes('noa') || fn.includes('assessment') || /notice of assessment/i.test(text)) {
      return 'notice_of_assessment';
    }
    if (
      fn.includes('tax_return') ||
      fn.includes('tax-return') ||
      /individual tax return/i.test(text)
    ) {
      return 'tax_return';
    }
    if (fn.includes('payslip') || /\bpay\s*slip\b|\bnet pay\b/i.test(text)) {
      return 'payslip';
    }
    if (fn.includes('income') || fn.includes('stp') || /income statement/i.test(text)) {
      return 'income_statement';
    }
    if (fn.includes('payg') || /PAYG payment summary/i.test(text)) {
      return 'payg_summary';
    }
    if (fn.includes('dividend') || /franking credits?|unfranked dividend/i.test(text)) {
      return 'dividend_statement';
    }
    if (fn.includes('health') || /private health insurance|benefit code/i.test(text)) {
      return 'health_insurance';
    }
    if (fn.includes('receipt') || /\b(?:receipt|tax invoice)\b/i.test(text)) {
      return 'deduction_receipt';
    }
    if (fn.includes('sole') || /gross business income|net business (?:income|profit)/i.test(text)) {
      return 'sole_trader_export';
    }
    if (fn.includes('super') || /superannuation/i.test(text)) {
      return 'super_statement';
    }
    if (fn.includes('help') || fn.includes('hecs') || /study loan/i.test(text)) {
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
    patterns: RegExp | RegExp[],
    extraction?: PdfExtraction | null
  ): void {
    for (const regex of Array.isArray(patterns) ? patterns : [patterns]) {
      const match = text.match(regex);
      if (!match?.[1]) continue;
      const value = parseFloat(match[1].replace(/,/g, ''));
      if (isNaN(value)) continue;
      fields[key] = {
        value,
        confidence: 0.94,
        sourceText: match[0].trim(),
        sourcePage: pageForSnippet(extraction?.pages, match[0])
      };
      return;
    }
  }

  private putText(
    fields: Record<string, ParsedField<any>>,
    key: string,
    text: string,
    patterns: RegExp | RegExp[],
    extraction?: PdfExtraction | null
  ): void {
    for (const regex of Array.isArray(patterns) ? patterns : [patterns]) {
      const match = text.match(regex);
      if (!match?.[1]?.trim()) continue;
      fields[key] = {
        value: match[1].trim(),
        confidence: 0.92,
        sourceText: match[0].trim(),
        sourcePage: pageForSnippet(extraction?.pages, match[0])
      };
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
