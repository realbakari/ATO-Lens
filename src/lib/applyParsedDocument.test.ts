import { describe, expect, it, vi } from 'vitest';
import { buildSampleDocumentText } from '../components/upload/sampleDocumentText';
import { LocalRuleBasedParser } from '../parser/ruleBasedParser';
import type { ParsedDocumentResult } from '../parser/providerAdapter';
import type { SourceDocument } from '../types/tax';
import { applyParsedDocument } from './applyParsedDocument';

vi.mock('../parser/pdfExtract', () => ({
  extractDocumentText: vi.fn(async (buffer: ArrayBuffer) => ({
    text: new TextDecoder().decode(buffer),
    source: 'plain_text',
    pageCount: 1,
    pages: [{ pageNumber: 1, text: new TextDecoder().decode(buffer), source: 'plain_text' }]
  })),
  confidenceForSnippet: vi.fn(),
  pageForSnippet: vi.fn(() => 1),
  type: {}
}));

const sourceDocument: SourceDocument = {
  id: 'doc-test-noa',
  fileName: 'sample-noa.txt',
  fileSize: 100,
  fileType: 'notice_of_assessment',
  uploadDate: '2026-07-28T00:00:00.000Z',
  financialYear: '2025–26',
  pageCount: 1,
  parsedBy: 'rule_based',
  confidenceAverage: 0.94
};

describe('applyParsedDocument', () => {
  it('preserves the stated assessment outcome when gross income is absent', async () => {
    const text = buildSampleDocumentText('notice_of_assessment');
    const result = await new LocalRuleBasedParser().parseDocument(
      new TextEncoder().encode(text).buffer as ArrayBuffer,
      sourceDocument.fileName,
      'notice_of_assessment'
    );
    const [year] = applyParsedDocument([], sourceDocument, result);

    expect(year.grossIncome).toBe(0);
    expect(year.taxableIncome).toBe(89670);
    expect(year.taxWithheld).toBe(24167);
    expect(year.medicareLevy).toBe(1793);
    expect(year.helpRepayment).toBe(3401);
    expect(year.assessmentResult).toBe(1284);
    expect(year.assessmentResult).not.toBe(24167);
    expect(year.figureOrigins?.assessmentResult).toBe('document');
  });

  it('does not manufacture a refund when an assessment has no outcome or gross income', () => {
    const result: ParsedDocumentResult = {
      documentType: 'notice_of_assessment',
      financialYear: '2025–26',
      confidenceAverage: 0.94,
      rawText: '',
      extractedFields: {
        taxableIncome: {
          value: 89670,
          confidence: 0.94,
          sourceText: 'Taxable income $89,670'
        },
        taxWithheldCredit: {
          value: 24167,
          confidence: 0.94,
          sourceText: 'Tax withheld $24,167'
        }
      }
    };
    const [year] = applyParsedDocument([], sourceDocument, result);

    expect(year.assessmentResult).toBe(0);
    expect(year.figureOrigins?.assessmentResult).toBeUndefined();
  });

  it('preserves an explicit zero from a document', () => {
    const result: ParsedDocumentResult = {
      documentType: 'notice_of_assessment',
      financialYear: '2025–26',
      confidenceAverage: 0.94,
      rawText: '',
      extractedFields: {
        medicareLevy: { value: 0, confidence: 0.94, sourceText: 'Medicare levy $0' },
        assessmentResult: { value: 0, confidence: 0.94, sourceText: 'Refund $0' }
      }
    };
    const [year] = applyParsedDocument([], sourceDocument, result);

    expect(year.medicareLevy).toBe(0);
    expect(year.figureOrigins?.medicareLevy).toBe('document');
    expect(year.figureOrigins?.assessmentResult).toBe('document');
  });

  it.each([
    [
      'deduction_receipt',
      (year: ReturnType<typeof applyParsedDocument>[number]) => {
        expect(year.totalDeductions).toBe(649);
        expect(year.deductions[0].description).toBe('Ergonomic office chair');
        expect(year.deductions[0].receiptDocumentId).toBe(sourceDocument.id);
      }
    ],
    [
      'dividend_statement',
      (year: ReturnType<typeof applyParsedDocument>[number]) => {
        expect(year.grossIncome).toBe(5500);
        expect(year.income[0].category).toBe('dividends_franking');
        expect(year.income[0].frankingCredits?.value).toBe(1500);
      }
    ],
    [
      'sole_trader_export',
      (year: ReturnType<typeof applyParsedDocument>[number]) => {
        expect(year.grossIncome).toBe(28500);
        expect(year.income[0].category).toBe('sole_trader');
      }
    ],
    [
      'help_statement',
      (year: ReturnType<typeof applyParsedDocument>[number]) => {
        expect(year.helpRepayment).toBe(3401);
        expect(year.studyLoans?.closingBalance.value).toBe(25677);
        expect(year.studyLoans?.amountWithheldPayroll.value).toBe(3600);
      }
    ]
  ] as const)('maps a reviewed %s into its dedicated workspace record', async (documentType, verify) => {
    const result = await new LocalRuleBasedParser().parseDocument(
      new TextEncoder().encode(buildSampleDocumentText(documentType)).buffer as ArrayBuffer,
      `sample-${documentType}.txt`,
      documentType
    );
    result.extractedFields = Object.fromEntries(
      Object.entries(result.extractedFields).map(([key, field]) => [
        key,
        { ...field, userReviewed: true }
      ])
    );
    const [year] = applyParsedDocument(
      [],
      { ...sourceDocument, fileType: documentType, fileName: `sample-${documentType}.txt` },
      result
    );

    verify(year);
  });
});
