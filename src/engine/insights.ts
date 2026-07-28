import type { AustralianFinancialYear } from '../types/tax';
import { calculateFullAustralianTax, getMarginalRate } from './taxCalculator';

/**
 * Insights the ATO has the data for but never volunteers: what indexation is
 * about to cost, which thresholds you are sitting near, and why this year's
 * assessment differs from last year's.
 */

/* -------------------------------------------------------------------------- */
/* HELP indexation timing                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Indexation rates applied on 1 June, per ATO "Study and training loan
 * indexation rates" (verified 28 July 2026):
 * ato.gov.au/tax-rates-and-codes/study-and-training-loan-indexation-rates
 */
const INDEXATION_RATES: Record<number, number> = {
  2026: 0.028,
  2025: 0.032,
  2024: 0.04, // revised down from 4.7%
  2023: 0.032 // revised down from 7.1%
};

const LATEST_INDEXATION_YEAR = 2026;

export interface IndexationOutlook {
  balance: number;
  /** Most recently published rate, used as the estimate for the coming 1 June. */
  rate: number;
  rateYear: number;
  indexationDate: Date;
  daysUntil: number;
  estimatedIndexation: number;
  /** Indexation avoided per $1,000 repaid before the date. */
  savingPerThousand: number;
}

export function getIndexationOutlook(
  fy: AustralianFinancialYear,
  today: Date = new Date()
): IndexationOutlook | null {
  const balance = fy.studyLoans?.closingBalance.value ?? 0;
  if (balance <= 0) return null;

  // Indexation is applied on 1 June each year.
  const thisYearsDate = new Date(today.getFullYear(), 5, 1);
  const indexationDate = today <= thisYearsDate ? thisYearsDate : new Date(today.getFullYear() + 1, 5, 1);
  const daysUntil = Math.ceil((indexationDate.getTime() - today.getTime()) / 86400000);

  const rate = INDEXATION_RATES[LATEST_INDEXATION_YEAR];

  return {
    balance,
    rate,
    rateYear: LATEST_INDEXATION_YEAR,
    indexationDate,
    daysUntil,
    estimatedIndexation: Math.round(balance * rate),
    savingPerThousand: Math.round(1000 * rate)
  };
}

/* -------------------------------------------------------------------------- */
/* Threshold proximity                                                         */
/* -------------------------------------------------------------------------- */

export interface ThresholdProximity {
  label: string;
  amount: number;
  /** Distance from the threshold; positive means income sits below it. */
  distance: number;
  isBelow: boolean;
  consequence: string;
}

interface ThresholdDefinition {
  label: string;
  amounts: Record<string, number>;
  fallback: number;
  consequence: string;
}

/**
 * Thresholds where a small change in taxable income has an outsized effect.
 * Sources, all verified 28 July 2026:
 * - brackets: ato.gov.au/tax-rates-and-codes/tax-rates-australian-residents
 * - HELP: ato.gov.au/tax-rates-and-codes/study-and-training-support-loans-rates-and-repayment-thresholds
 * - MLS: ato.gov.au/individuals-and-families/medicare-and-private-health-insurance/medicare-levy-surcharge/medicare-levy-surcharge-income-thresholds-and-rates
 * - Division 293: ato.gov.au/tax-rates-and-codes/key-superannuation-rates-and-thresholds/division-293-tax
 */
const THRESHOLDS: ThresholdDefinition[] = [
  {
    label: 'Medicare levy low-income upper threshold',
    amounts: { '2025-26': 35013 },
    fallback: 35013,
    consequence: 'Above this the full 2% Medicare levy applies rather than a reduced rate.'
  },
  {
    label: '30% tax bracket',
    amounts: {},
    fallback: 45000,
    consequence: 'Income above this is taxed at 30c in the dollar instead of the lowest rate.'
  },
  {
    label: 'HELP repayment threshold',
    amounts: { '2025-26': 67000, '2026-27': 69528 },
    fallback: 69528,
    consequence: 'Above this a compulsory study loan repayment starts, at 15c per dollar over.'
  },
  {
    label: 'Low income tax offset cut-out',
    amounts: {},
    fallback: 66667,
    consequence: 'The $700 offset has fully phased out by this point.'
  },
  {
    label: 'Medicare levy surcharge (single, tier 1)',
    amounts: { '2025-26': 101000, '2026-27': 105000 },
    fallback: 105000,
    consequence: 'Without private hospital cover, a 1% surcharge applies to your whole income.'
  },
  {
    label: '37% tax bracket',
    amounts: {},
    fallback: 135000,
    consequence: 'Income above this is taxed at 37c in the dollar.'
  },
  {
    label: '45% tax bracket',
    amounts: {},
    fallback: 190000,
    consequence: 'Income above this is taxed at 45c in the dollar.'
  },
  {
    label: 'Division 293 threshold',
    amounts: {},
    fallback: 250000,
    consequence: 'Above this, super contributions are taxed an extra 15%.'
  }
];

/** Thresholds within reach of the given income, nearest first. */
export function getNearbyThresholds(
  taxableIncome: number,
  financialYearId: string,
  window = 15000,
  limit = 3
): ThresholdProximity[] {
  if (taxableIncome <= 0) return [];

  return THRESHOLDS.map((definition) => {
    const amount = definition.amounts[financialYearId] ?? definition.fallback;
    const distance = amount - taxableIncome;
    return {
      label: definition.label,
      amount,
      distance: Math.abs(distance),
      isBelow: distance > 0,
      consequence: definition.consequence
    };
  })
    .filter((t) => t.distance <= window)
    .sort((a, b) => a.distance - b.distance)
    .slice(0, limit);
}

/* -------------------------------------------------------------------------- */
/* Year-on-year comparison                                                     */
/* -------------------------------------------------------------------------- */

export interface YearComparison {
  previousLabel: string;
  currentLabel: string;
  grossIncomeChange: number;
  deductionsChange: number;
  taxableIncomeChange: number;
  totalTaxChange: number;
  effectiveRateChange: number;
  superChange: number;
  /** Portion of the tax change caused by earning/claiming differently. */
  fromIncomeChange: number;
  /** Portion caused by the rates themselves changing between the two years. */
  fromRateChange: number;
  marginalRateBefore: number;
  marginalRateAfter: number;
}

/**
 * Splits the change in tax between "you earned differently" and "the rules
 * changed", by re-assessing this year's income under last year's rates. An
 * assessment shows the total; it never shows which half caused it.
 */
export function compareFinancialYears(
  current: AustralianFinancialYear,
  previous: AustralianFinancialYear
): YearComparison {
  const hasHELP = current.helpRepayment > 0 || previous.helpRepayment > 0;

  const currentAssessment = calculateFullAustralianTax(
    current.grossIncome,
    current.totalDeductions,
    current.taxWithheld,
    hasHELP,
    current.id
  );
  const previousAssessment = calculateFullAustralianTax(
    previous.grossIncome,
    previous.totalDeductions,
    previous.taxWithheld,
    hasHELP,
    previous.id
  );
  const currentIncomeAtPreviousRates = calculateFullAustralianTax(
    current.grossIncome,
    current.totalDeductions,
    current.taxWithheld,
    hasHELP,
    previous.id
  );

  const fromIncomeChange = Math.round(
    currentIncomeAtPreviousRates.totalTaxAndObligations - previousAssessment.totalTaxAndObligations
  );
  const fromRateChange = Math.round(
    currentAssessment.totalTaxAndObligations - currentIncomeAtPreviousRates.totalTaxAndObligations
  );

  return {
    previousLabel: previous.label,
    currentLabel: current.label,
    grossIncomeChange: current.grossIncome - previous.grossIncome,
    deductionsChange: current.totalDeductions - previous.totalDeductions,
    taxableIncomeChange: current.taxableIncome - previous.taxableIncome,
    totalTaxChange: fromIncomeChange + fromRateChange,
    effectiveRateChange:
      Math.round((currentAssessment.effectiveTaxRate - previousAssessment.effectiveTaxRate) * 10) / 10,
    superChange: current.employerSuper - previous.employerSuper,
    fromIncomeChange,
    fromRateChange,
    marginalRateBefore: getMarginalRate(previous.taxableIncome, previous.id),
    marginalRateAfter: getMarginalRate(current.taxableIncome, current.id)
  };
}
