import { describe, expect, it } from 'vitest';
import { createBlankFinancialYear } from '../data/blankFinancialYear';
import { applyManualFigure } from './manualFigures';

describe('applyManualFigure', () => {
  it('preserves a manually-entered zero when upstream values change', () => {
    let year = createBlankFinancialYear(
      '2025-26',
      '2025–26',
      '2025-07-01',
      '2026-06-30'
    );
    year = applyManualFigure(year, 'grossIncome', 100_000);
    year = applyManualFigure(year, 'taxWithheld', 25_000);
    year = applyManualFigure(year, 'medicareLevy', 0);
    year = applyManualFigure(year, 'grossIncome', 110_000);

    expect(year.medicareLevy).toBe(0);
    expect(year.figureOrigins?.medicareLevy).toBe('manual');
    expect(year.figureOrigins?.taxableIncome).toBe('derived');
    expect(year.taxableIncome).toBe(110_000);
  });
});
