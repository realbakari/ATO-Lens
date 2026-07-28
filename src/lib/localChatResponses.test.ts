import { describe, expect, it } from 'vitest';
import { createBlankFinancialYear } from '../data/blankFinancialYear';
import { generateLocalResponse } from './localChatResponses';

const year = () =>
  createBlankFinancialYear('2025-26', '2025–26', '2025-07-01', '2026-06-30');

describe('generateLocalResponse', () => {
  it('does not substitute sample data into an empty workspace', () => {
    const response = generateLocalResponse('What is my refund?', []);

    expect(response.text).toContain('No financial-year data');
    expect(response.text).not.toContain('96,420');
    expect(response.citations).toEqual([]);
  });

  it('does not claim super compliance without auditable records', () => {
    const response = generateLocalResponse('Did my employer pay super?', [
      { ...year(), employerSuper: 12_000 }
    ]);

    expect(response.text).toContain('cannot determine');
    expect(response.text).not.toContain('meets');
  });

  it('uses the stored effective tax rate', () => {
    const response = generateLocalResponse('What is my effective tax rate?', [
      { ...year(), grossIncome: 100_000, taxWithheld: 99_000, effectiveTaxRate: 21.4 }
    ]);

    expect(response.text).toContain('21.4%');
    expect(response.text).not.toContain('99.0%');
    expect(response.citations).toEqual([]);
  });

  it('describes assessment signs without inferring a bank transfer', () => {
    const response = generateLocalResponse('Explain the amount payable', [
      { ...year(), assessmentResult: -750 }
    ]);

    expect(response.text).toContain('amount payable');
    expect(response.text).toContain('$750');
    expect(response.text).not.toContain('bank');
  });

  it('only returns citations backed by an extracted source value', () => {
    const fy = {
      ...year(),
      documents: [
        {
          id: 'unrelated',
          fileName: 'unrelated.pdf',
          fileSize: 1,
          fileType: 'payslip' as const,
          uploadDate: '2026-01-01',
          financialYear: '2025–26',
          pageCount: 1,
          parsedBy: 'rule_based' as const,
          rawText: '',
          confidenceAverage: 1
        }
      ]
    };

    expect(generateLocalResponse('Explain my assessment', [fy]).citations).toEqual([]);
  });
});
