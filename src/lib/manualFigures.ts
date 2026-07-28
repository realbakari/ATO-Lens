import type { AustralianFinancialYear } from '../types/tax';
import { calculateFullAustralianTax } from '../engine/taxCalculator';

/** Headline figures a user is allowed to correct by hand. */
export type EditableFigure =
  | 'grossIncome'
  | 'taxableIncome'
  | 'taxWithheld'
  | 'totalDeductions'
  | 'medicareLevy'
  | 'helpRepayment'
  | 'assessmentResult'
  | 'employerSuper';

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
 * A figure the user typed is authoritative: it is recorded in manualOverrides
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
  const updated: AustralianFinancialYear = { ...fy, [figure]: value, manualOverrides: overrides };

  const isManual = (key: EditableFigure) => Boolean(overrides[key]);

  const taxableIncome = isManual('taxableIncome')
    ? updated.taxableIncome
    : Math.max(0, updated.grossIncome - updated.totalDeductions);

  const engine = calculateFullAustralianTax(
    updated.grossIncome,
    updated.grossIncome - taxableIncome,
    updated.taxWithheld,
    isManual('helpRepayment') ? updated.helpRepayment > 0 : Boolean(fy.studyLoans) || fy.helpRepayment > 0,
    updated.id
  );

  return {
    ...updated,
    taxableIncome,
    medicareLevy: isManual('medicareLevy') ? updated.medicareLevy : Math.round(engine.medicareLevy),
    helpRepayment: isManual('helpRepayment') ? updated.helpRepayment : Math.round(engine.helpRepayment),
    assessmentResult: isManual('assessmentResult') ? updated.assessmentResult : engine.assessmentResult,
    effectiveTaxRate: updated.grossIncome > 0 ? engine.effectiveTaxRate : 0
  };
}

/** True when this figure was typed by the user rather than read from a document. */
export function isManuallySet(fy: AustralianFinancialYear, figure: EditableFigure): boolean {
  return Boolean(fy.manualOverrides?.[figure]);
}
