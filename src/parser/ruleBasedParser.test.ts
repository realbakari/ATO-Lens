import { beforeEach, describe, expect, it, vi } from 'vitest';
import { clearAllNetworkLogs } from '../storage/privacyLog';
import { buildSampleDocumentText } from '../components/upload/sampleDocumentText';
import { LocalRuleBasedParser } from './ruleBasedParser';

vi.mock('./pdfExtract', () => ({
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

const encode = (text: string) => new TextEncoder().encode(text).buffer as ArrayBuffer;

describe('LocalRuleBasedParser Notice of Assessment outcomes', () => {
  beforeEach(() => clearAllNetworkLogs());

  it.each([
    ['Refund $1,284', 1284],
    ['Amount payable $1,284', -1284],
    ['Outcome of this notice: $1,284 CR', 1284],
    ['Result of this notice $1,284 DR', -1284]
  ])('parses %s with the correct sign', async (outcome, expected) => {
    const text = `Australian Taxation Office
Financial year 2025-26
Notice of assessment
Taxable income $89,670
${outcome}`;
    const result = await new LocalRuleBasedParser().parseDocument(
      encode(text),
      'sample-noa.txt',
      'notice_of_assessment'
    );

    expect(result.extractedFields.assessmentResult.value).toBe(expected);
    expect(result.extractedFields.assessmentResult.confidence).toBeGreaterThan(0.9);
    expect(result.extractedFields.assessmentResult.sourceText).toContain(outcome.split(' $')[0]);
  });

  it('does not guess a sign for an ambiguous outcome', async () => {
    const result = await new LocalRuleBasedParser().parseDocument(
      encode('Financial year 2025-26\nNotice of assessment\nOutcome of this notice $1,284'),
      'ambiguous-noa.txt',
      'notice_of_assessment'
    );

    expect(result.extractedFields.assessmentResult).toBeUndefined();
  });

  it('parses the exact built-in sample and stores redacted text', async () => {
    const result = await new LocalRuleBasedParser().parseDocument(
      encode(buildSampleDocumentText('notice_of_assessment')),
      'sample-noa.txt',
      'notice_of_assessment'
    );

    expect(result.extractedFields.assessmentResult.value).toBe(1284);
    expect(result.extractedFields.taxableIncome.value).toBe(89670);
    expect(result.rawText).not.toContain('123 456 789');
  });

  it.each([
    ['notice_of_assessment', 'assessmentResult', 1284],
    ['tax_return', 'taxableIncome', 89670],
    ['income_statement', 'grossIncome', 96420],
    ['payg_summary', 'taxWithheld', 24167],
    ['payslip', 'grossPay', 3708.46],
    ['super_statement', 'closingBalance', 84646],
    ['help_statement', 'closingBalance', 25677],
    ['deduction_receipt', 'deductionAmount', 649],
    ['health_insurance', 'premiumsEligible', 2400],
    ['dividend_statement', 'frankingCredits', 1500],
    ['sole_trader_export', 'netBusinessIncome', 28500]
  ] as const)('auto-detects and extracts the %s sample', async (documentType, field, value) => {
    const result = await new LocalRuleBasedParser().parseDocument(
      encode(buildSampleDocumentText(documentType)),
      `sample-${documentType}.txt`
    );

    expect(result.documentType).toBe(documentType);
    expect(result.extractedFields[field]?.value).toBe(value);
    expect(result.extractedFields[field]?.sourcePage).toBe(1);
  });
});
