import type { AustralianFinancialYear, EditableFigure } from '../types/tax';
import { getFigureOrigin, recalculateFinancialYear, setFigureOrigins } from './recalculateFinancialYear';

export type { EditableFigure } from '../types/tax';

export const FIGURE_LABELS: Record<EditableFigure, string> = {
  grossIncome: 'Gross income',
  taxableIncome: 'Taxable income',
  taxWithheld: 'Tax withheld',
  totalDeductions: 'Deductions',
  medicareLevy: 'Medicare levy',
  helpRepayment: 'HELP repayment',
  assessmentResult: 'Assessment result',
  employerSuper: 'Employer super'
};

/**
 * Applies a correction and recalculates what follows from it.
 *
 * A figure the user typed is authoritative: it is recorded in figureOrigins
 * and never recomputed afterwards. Everything else is re-derived, so correcting
 * a misread gross income updates the tax that depends on it instead of leaving
 * the year internally inconsistent.
 */
export function applyManualFigure(
  fy: AustralianFinancialYear,
  figure: EditableFigure,
  value: number
): AustralianFinancialYear {
  const overrides = { ...(fy.manualOverrides ?? {}), [figure]: true };
  const updated = setFigureOrigins(
    { ...fy, [figure]: value, manualOverrides: overrides },
    'manual',
    [figure]
  );
  return recalculateFinancialYear(updated);
}

/** True when this figure was typed by the user rather than read from a document. */
export function isManuallySet(fy: AustralianFinancialYear, figure: EditableFigure): boolean {
  return getFigureOrigin(fy, figure) === 'manual';
}
