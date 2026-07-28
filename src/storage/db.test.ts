import { describe, expect, it } from 'vitest';
import { createBlankFinancialYear } from '../data/blankFinancialYear';
import { loadRealFinancialYears, normaliseFinancialYear } from './db';

describe('financial-year storage migration', () => {
  it('migrates legacy manual overrides and preserves ambiguous values', () => {
    const legacy = {
      ...createBlankFinancialYear('2025-26', '2025–26', '2025-07-01', '2026-06-30'),
      figureOrigins: undefined,
      grossIncome: 90000,
      medicareLevy: 0,
      manualOverrides: { medicareLevy: true }
    };

    const migrated = normaliseFinancialYear(legacy);
    expect(migrated.figureOrigins?.grossIncome).toBe('document');
    expect(migrated.figureOrigins?.medicareLevy).toBe('manual');
    expect(normaliseFinancialYear(migrated)).toEqual(migrated);
  });

  it('normalises and persists legacy local storage on load', () => {
    const legacy = {
      ...createBlankFinancialYear('2024-25', '2024–25', '2024-07-01', '2025-06-30'),
      figureOrigins: undefined,
      taxWithheld: 1234
    };
    localStorage.setItem('ato_lens_financial_years_v1', JSON.stringify([legacy]));

    const [loaded] = loadRealFinancialYears();
    expect(loaded.figureOrigins?.taxWithheld).toBe('document');
    expect(JSON.parse(localStorage.getItem('ato_lens_financial_years_v1') ?? '[]')[0].figureOrigins).toEqual(
      loaded.figureOrigins
    );
  });
});
