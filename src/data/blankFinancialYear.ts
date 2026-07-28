import type { AustralianFinancialYear } from '../types/tax';

/** A freshly-started financial year with no data - used for the user's first real upload. */
export function createBlankFinancialYear(
  id: string,
  label: string,
  startDate: string,
  endDate: string
): AustralianFinancialYear {
  return {
    id,
    label,
    startDate,
    endDate,
    grossIncome: 0,
    taxableIncome: 0,
    taxWithheld: 0,
    totalDeductions: 0,
    medicareLevy: 0,
    helpRepayment: 0,
    assessmentResult: 0,
    employerSuper: 0,
    employerCount: 0,
    effectiveTaxRate: 0,
    figureOrigins: {},
    income: [],
    deductions: [],
    superContributions: [],
    payslips: [],
    documents: [],
    alerts: []
  };
}

/** The Australian financial year (1 July - 30 June) that "today" falls in. */
export function getCurrentAustralianFinancialYear(): {
  id: string;
  label: string;
  startDate: string;
  endDate: string;
} {
  const now = new Date();
  const startYear = now.getMonth() >= 6 ? now.getFullYear() : now.getFullYear() - 1;
  const endYear = startYear + 1;
  const endYearShort = String(endYear).slice(-2);

  return {
    id: `${startYear}-${endYearShort}`,
    label: `${startYear}\u2013${endYearShort}`,
    startDate: `${startYear}-07-01`,
    endDate: `${endYear}-06-30`
  };
}
