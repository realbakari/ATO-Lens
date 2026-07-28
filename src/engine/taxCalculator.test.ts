import { describe, expect, it } from 'vitest';
import {
  calculateMedicareLevyResult,
  calculateFullAustralianTax,
  calculateResidentIncomeTax
} from './taxCalculator';

describe('taxCalculator', () => {
  it('returns finite zero-income results', () => {
    const result = calculateFullAustralianTax(0, 0, 0, false, '2025-26');

    expect(result.taxableIncome).toBe(0);
    expect(result.medicareLevy).toBe(0);
    expect(result.helpRepayment).toBe(0);
    expect(result.effectiveTaxRate).toBe(0);
    expect(
      Object.values(result)
        .filter((value): value is number => typeof value === 'number')
        .every(Number.isFinite)
    ).toBe(true);
  });

  it('applies the published 2025-26 resident bracket at $45,000', () => {
    expect(calculateResidentIncomeTax(45_000, '2025-26')).toBe(4_288);
  });

  it('uses the exact 2024-25 Medicare single thresholds', () => {
    expect(calculateMedicareLevyResult(27_222, '2024-25').amount).toBe(0);
    expect(calculateMedicareLevyResult(27_223, '2024-25').amount).toBe(0.1);
    expect(calculateMedicareLevyResult(34_027, '2024-25').amount).toBeCloseTo(680.5);
    expect(calculateMedicareLevyResult(34_028, '2024-25').amount).toBeCloseTo(680.56);
    expect(calculateMedicareLevyResult(34_028, '2024-25').rule.status).toBe('exact');
  });

  it('marks an unpublished Medicare year as an estimate from the latest exact schedule', () => {
    const result = calculateMedicareLevyResult(30_000, '2026-27');

    expect(result.rule.status).toBe('estimated');
    expect(result.rule.sourceYear).toBe('2024-25');
    expect(result.rule.requestedYear).toBe('2026-27');
  });
});
