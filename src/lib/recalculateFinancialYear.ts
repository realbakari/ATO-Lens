import { calculateFullAustralianTax } from '../engine/taxCalculator';
import type { AustralianFinancialYear, EditableFigure, FigureOrigin } from '../types/tax';

export function getFigureOrigin(
  fy: AustralianFinancialYear,
  figure: EditableFigure
): FigureOrigin | undefined {
  if (fy.figureOrigins?.[figure]) return fy.figureOrigins[figure];
  if (fy.manualOverrides?.[figure]) return 'manual';
  return undefined;
}

export function isAuthoritativeFigure(
  fy: AustralianFinancialYear,
  figure: EditableFigure
): boolean {
  const origin = getFigureOrigin(fy, figure);
  return origin === 'document' || origin === 'manual';
}

export function setFigureOrigins(
  fy: AustralianFinancialYear,
  origin: FigureOrigin,
  figures: EditableFigure[]
): AustralianFinancialYear {
  if (figures.length === 0) return fy;
  const figureOrigins = { ...(fy.figureOrigins ?? {}) };
  for (const figure of figures) figureOrigins[figure] = origin;
  return { ...fy, figureOrigins };
}

/**
 * Recomputes only origin-less or derived descendants. Document and manual
 * values, including exact zeroes, remain authoritative.
 */
export function recalculateFinancialYear(fy: AustralianFinancialYear): AustralianFinancialYear {
  const origins = { ...(fy.figureOrigins ?? {}) };
  const authoritative = (figure: EditableFigure) => isAuthoritativeFigure(fy, figure);
  const hasGrossInput = getFigureOrigin(fy, 'grossIncome') !== undefined || fy.grossIncome !== 0;
  const hasTaxableInput = authoritative('taxableIncome') || hasGrossInput;
  const hasWithholdingInput =
    getFigureOrigin(fy, 'taxWithheld') !== undefined || fy.taxWithheld !== 0;

  const taxableIncome = authoritative('taxableIncome')
    ? fy.taxableIncome
    : Math.max(0, fy.grossIncome - fy.totalDeductions);
  const engineDeductions = Math.max(0, fy.grossIncome - taxableIncome);
  const hasHELP = authoritative('helpRepayment')
    ? fy.helpRepayment > 0
    : Boolean(fy.studyLoans) || fy.helpRepayment > 0;
  const engine = calculateFullAustralianTax(
    fy.grossIncome,
    engineDeductions,
    fy.taxWithheld,
    hasHELP,
    fy.id
  );

  const next: AustralianFinancialYear = { ...fy, figureOrigins: origins };

  if (!authoritative('taxableIncome') && hasGrossInput) {
    next.taxableIncome = engine.taxableIncome;
    origins.taxableIncome = 'derived';
  }
  if (!authoritative('medicareLevy') && hasTaxableInput) {
    next.medicareLevy = Math.round(engine.medicareLevy);
    next.medicareRule = engine.medicareRule;
    origins.medicareLevy = 'derived';
  } else if (authoritative('medicareLevy')) {
    next.medicareRule = undefined;
  }
  if (!authoritative('helpRepayment') && hasTaxableInput) {
    next.helpRepayment = Math.round(engine.helpRepayment);
    origins.helpRepayment = 'derived';
  }
  if (!authoritative('assessmentResult') && hasGrossInput && hasWithholdingInput) {
    next.assessmentResult = engine.assessmentResult;
    origins.assessmentResult = 'derived';
  }

  next.effectiveTaxRate = hasGrossInput && fy.grossIncome > 0 ? engine.effectiveTaxRate : 0;
  return next;
}
