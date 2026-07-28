import { describe, expect, it } from 'vitest';
import { createBlankFinancialYear } from '../data/blankFinancialYear';
import type { TaxCopilotState } from '../types/tax';
import { buildTaxPrepPdf } from './taxPrepPdf';

const state: TaxCopilotState = {
  situation: {
    residency: 'full_year',
    under18: 'no',
    hasSpouse: 'no',
    hasDependants: 'no',
    hasPrivateHealthInsurance: 'no',
    hasStudyLoan: 'no'
  },
  checks: {
    incomeStatementsTaxReady: 'done',
    prefillReviewed: 'done',
    deductionsReviewed: 'done',
    evidenceReviewed: 'not_applicable',
    medicareAndIncomeTestsReviewed: 'done'
  },
  fieldStatuses: {
    I1: 'confirmed',
    D5: 'not_applicable'
  },
  handoffChoice: 'mytax'
};

describe('tax preparation PDF', () => {
  it('creates a multi-object PDF with the preparation boundary', () => {
    const financialYear = {
      ...createBlankFinancialYear('2024-25', '2024–25', '2024-07-01', '2025-06-30'),
      grossIncome: 96420,
      taxWithheld: 24167,
      totalDeductions: 6750
    };

    const bytes = buildTaxPrepPdf(financialYear, state);
    const pdf = new TextDecoder().decode(bytes);

    expect(pdf.startsWith('%PDF-1.4')).toBe(true);
    expect(pdf).toContain('/Type /Catalog');
    expect(pdf).toContain('/Type /Page');
    expect(pdf).toContain('Preparation only - not lodged.');
    expect(pdf).toContain('%%EOF');
    expect(bytes.byteLength).toBeGreaterThan(2500);
  });
});
