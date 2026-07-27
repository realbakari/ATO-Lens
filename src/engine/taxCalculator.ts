/**
 * Australian Income Tax & Offsets Engine
 * Supports Stage 3 tax brackets, Medicare Levy, LITO, and HELP repayments.
 */

export interface TaxCalculationResult {
  taxableIncome: number;
  grossTax: number;
  litoOffset: number;
  netTaxAfterOffsets: number;
  medicareLevy: number;
  helpRepayment: number;
  totalTaxAndObligations: number;
  effectiveTaxRate: number;
  assessmentResult: number; // taxWithheld - totalTaxAndObligations
}

// Resident bracket thresholds. These are unchanged across the years modelled
// here; only the rate on the first taxable bracket moves.
const BRACKET_1 = 18200;
const BRACKET_2 = 45000;
const BRACKET_3 = 135000;
const BRACKET_4 = 190000;

/**
 * Rate applying to the $18,201-$45,000 bracket, by income year.
 *
 * 2024-25 and 2025-26 at 16% per ATO "Tax rates - Australian resident":
 * ato.gov.au/tax-rates-and-codes/tax-rates-australian-residents
 *
 * The reductions to 15% from 1 July 2026 and 14% from 1 July 2027 are law, per
 * ATO "Personal income tax - new tax cuts for every Australian taxpayer":
 * ato.gov.au/about-ato/new-legislation/in-detail/individuals/personal-income-tax-new-tax-cuts-for-every-australian-taxpayer
 * (both verified 28 July 2026). The ATO had not published the 2026-27 rate
 * table itself at that date, so the cumulative base amounts below are derived
 * from the bracket widths rather than transcribed - the same derivation
 * reproduces the published 2025-26 amounts ($4,288 / $31,288 / $51,638) exactly.
 */
const FIRST_BRACKET_RATE: Record<string, number> = {
  '2024-25': 0.16,
  '2025-26': 0.16,
  '2026-27': 0.15,
  '2027-28': 0.14
};

const EARLIEST_MODELLED_YEAR = '2024-25';

function getFirstBracketRate(financialYearId?: string): number {
  if (financialYearId && FIRST_BRACKET_RATE[financialYearId]) return FIRST_BRACKET_RATE[financialYearId];
  const known = Object.keys(FIRST_BRACKET_RATE).sort();
  const applicable = known.filter((year) => !financialYearId || year <= financialYearId).pop();
  return FIRST_BRACKET_RATE[applicable ?? EARLIEST_MODELLED_YEAR];
}

export function calculateResidentIncomeTax(taxableIncome: number, financialYearId?: string): number {
  const firstRate = getFirstBracketRate(financialYearId);
  const base2 = (BRACKET_2 - BRACKET_1) * firstRate;
  const base3 = base2 + (BRACKET_3 - BRACKET_2) * 0.3;
  const base4 = base3 + (BRACKET_4 - BRACKET_3) * 0.37;

  if (taxableIncome <= BRACKET_1) return 0;
  if (taxableIncome <= BRACKET_2) return (taxableIncome - BRACKET_1) * firstRate;
  if (taxableIncome <= BRACKET_3) return base2 + (taxableIncome - BRACKET_2) * 0.3;
  if (taxableIncome <= BRACKET_4) return base3 + (taxableIncome - BRACKET_3) * 0.37;
  return base4 + (taxableIncome - BRACKET_4) * 0.45;
}

/**
 * Low Income Tax Offset. Per ATO "Low income tax offset" (verified 28 July 2026):
 * ato.gov.au/individuals-and-families/income-deductions-offsets-and-records/tax-offsets/low-income-tax-offset
 * $700 up to $37,500; less 5c per $1 to $45,000; then $325 less 1.5c per $1 to $66,667.
 */
export function calculateLITO(taxableIncome: number): number {
  if (taxableIncome <= 37500) return 700;
  if (taxableIncome <= 45000) return Math.max(0, 700 - (taxableIncome - 37500) * 0.05);
  if (taxableIncome <= 66667) return Math.max(0, 325 - (taxableIncome - 45000) * 0.015);
  return 0;
}

/**
 * Medicare levy at 2%, with the low-income shade-in for singles.
 * Per ATO "Medicare levy reduction for low-income earners" (verified 28 July 2026):
 * ato.gov.au/individuals-and-families/medicare-and-private-health-insurance/medicare-levy/medicare-levy-reduction/medicare-levy-reduction-for-low-income-earners
 *
 * These are the single-taxpayer thresholds. Family and SAPTO thresholds are
 * higher and are not modelled, so anyone in those categories may see too much
 * levy here. The 2025-26 figures are applied to later years until the ATO
 * publishes new ones.
 */
export function calculateMedicareLevy(taxableIncome: number): number {
  const LOWER_THRESHOLD = 28011; // 2025-26 single lower threshold (no levy payable at/below this)
  const UPPER_THRESHOLD = 35013; // 2025-26 single upper threshold (full 2% levy applies above this)
  if (taxableIncome <= LOWER_THRESHOLD) return 0;
  if (taxableIncome <= UPPER_THRESHOLD) return (taxableIncome - LOWER_THRESHOLD) * 0.10; // Shade-in rate
  return taxableIncome * 0.02;
}

/**
 * HELP / study and training loan compulsory repayments. From 2025-26 the middle
 * tiers are marginal - charged only on income above each threshold - while the
 * top tier remains a flat 10% of total repayment income.
 *
 * Repayment income is taxable income plus reportable fringe benefits, net
 * investment losses, reportable super contributions and exempt foreign income.
 * ATO Lens only knows taxable income, so repayments computed here are a floor.
 */
type HELPSchedule =
  | {
      // 2025-26 onwards: marginal tiers, then a flat rate on total income.
      kind: 'marginal';
      nilUpTo: number; // no compulsory repayment at or below this
      fifteenCentUpTo: number; // 15c per $1 over nilUpTo, up to here
      marginalUpTo: number; // base + 17c per $1 over fifteenCentUpTo, up to here
      base: number; // fixed component of the 17c tier
    }
  | {
      // Up to 2024-25: a single rate applied to the whole repayment income.
      kind: 'flat_scale';
      bands: { from: number; rate: number }[];
    };

/**
 * Compulsory repayment schedules, per ATO "Study and training loan repayment
 * thresholds and rates" (verified 28 July 2026):
 * ato.gov.au/tax-rates-and-codes/study-and-training-support-loans-rates-and-repayment-thresholds
 *
 * Above the top threshold the repayment is a flat 10% of *total* repayment
 * income - not a marginal rate on the excess.
 */
const HELP_SCHEDULES: Record<string, HELPSchedule> = {
  '2024-25': {
    kind: 'flat_scale',
    bands: [
      { from: 54435, rate: 0.01 },
      { from: 62851, rate: 0.02 },
      { from: 66621, rate: 0.025 },
      { from: 70619, rate: 0.03 },
      { from: 74856, rate: 0.035 },
      { from: 79347, rate: 0.04 },
      { from: 84108, rate: 0.045 },
      { from: 89155, rate: 0.05 },
      { from: 94504, rate: 0.055 },
      { from: 100175, rate: 0.06 },
      { from: 106186, rate: 0.065 },
      { from: 112557, rate: 0.07 },
      { from: 119310, rate: 0.075 },
      { from: 126468, rate: 0.08 },
      { from: 134057, rate: 0.085 },
      { from: 142101, rate: 0.09 },
      { from: 150627, rate: 0.095 },
      { from: 159664, rate: 0.1 }
    ]
  },
  '2025-26': { kind: 'marginal', nilUpTo: 67000, fifteenCentUpTo: 125000, marginalUpTo: 179285, base: 8700 },
  '2026-27': { kind: 'marginal', nilUpTo: 69528, fifteenCentUpTo: 129717, marginalUpTo: 186050, base: 9028 }
};

const EARLIEST_HELP_YEAR = '2024-25';

/** Schedule for a financial year, falling back to the closest earlier one. */
function getHELPSchedule(financialYearId?: string): HELPSchedule {
  if (financialYearId && HELP_SCHEDULES[financialYearId]) return HELP_SCHEDULES[financialYearId];
  const known = Object.keys(HELP_SCHEDULES).sort();
  const earlier = known.filter((year) => !financialYearId || year <= financialYearId).pop();
  return HELP_SCHEDULES[earlier ?? EARLIEST_HELP_YEAR];
}

export function calculateHELPRepayment(repaymentIncome: number, financialYearId?: string): number {
  const schedule = getHELPSchedule(financialYearId);

  if (schedule.kind === 'flat_scale') {
    const band = [...schedule.bands].reverse().find((b) => repaymentIncome >= b.from);
    return band ? repaymentIncome * band.rate : 0;
  }

  const { nilUpTo, fifteenCentUpTo, marginalUpTo, base } = schedule;
  if (repaymentIncome <= nilUpTo) return 0;
  if (repaymentIncome <= fifteenCentUpTo) return (repaymentIncome - nilUpTo) * 0.15;
  if (repaymentIncome <= marginalUpTo) return base + (repaymentIncome - fifteenCentUpTo) * 0.17;
  return repaymentIncome * 0.1;
}

/** Marginal income tax rate that applies to the next dollar earned. */
export function getMarginalRate(taxableIncome: number, financialYearId?: string): number {
  if (taxableIncome <= BRACKET_1) return 0;
  if (taxableIncome <= BRACKET_2) return getFirstBracketRate(financialYearId);
  if (taxableIncome <= BRACKET_3) return 0.3;
  if (taxableIncome <= BRACKET_4) return 0.37;
  return 0.45;
}

/**
 * Tax actually saved by claiming an extra deduction, computed as the difference
 * between two full assessments rather than a flat assumed rate - so it accounts
 * for bracket boundaries, LITO withdrawal, the Medicare levy and HELP.
 */
export function calculateDeductionSaving(
  taxableIncome: number,
  extraDeduction: number,
  hasHELP: boolean = false,
  financialYearId?: string
): number {
  const totalAt = (income: number) => {
    const capped = Math.max(0, income);
    const netTax = Math.max(0, calculateResidentIncomeTax(capped, financialYearId) - calculateLITO(capped));
    return (
      netTax + calculateMedicareLevy(capped) + (hasHELP ? calculateHELPRepayment(capped, financialYearId) : 0)
    );
  };

  return Math.max(0, Math.round(totalAt(taxableIncome) - totalAt(taxableIncome - extraDeduction)));
}

/**
 * Full Tax Calculation & Tax Withheld Offset Reconciliation
 */
export function calculateFullAustralianTax(
  grossIncome: number,
  deductions: number,
  taxWithheld: number,
  hasHELP: boolean = false,
  financialYearId?: string
): TaxCalculationResult {
  const taxableIncome = Math.max(0, grossIncome - deductions);
  const grossTax = calculateResidentIncomeTax(taxableIncome, financialYearId);
  const litoOffset = calculateLITO(taxableIncome);
  const netTaxAfterOffsets = Math.max(0, grossTax - litoOffset);
  const medicareLevy = calculateMedicareLevy(taxableIncome);
  const helpRepayment = hasHELP ? calculateHELPRepayment(taxableIncome, financialYearId) : 0;

  const totalTaxAndObligations = netTaxAfterOffsets + medicareLevy + helpRepayment;
  const effectiveTaxRate = grossIncome > 0 ? (totalTaxAndObligations / grossIncome) * 100 : 0;
  const assessmentResult = taxWithheld - totalTaxAndObligations;

  return {
    taxableIncome,
    grossTax,
    litoOffset,
    netTaxAfterOffsets,
    medicareLevy,
    helpRepayment,
    totalTaxAndObligations,
    effectiveTaxRate: Math.round(effectiveTaxRate * 10) / 10,
    assessmentResult: Math.round(assessmentResult)
  };
}
