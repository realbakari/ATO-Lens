import type {
  SuperContribution,
  ReconciliationAlert,
  RuleMetadata
} from '../types/tax';

export interface SGAuditReport {
  status: 'no_data' | 'compliant' | 'shortfall';
  totalExpectedSuper: number;
  totalRecordedSuper: number;
  varianceAmount: number;
  complianceRate: number | null;
  underpaidContributionsCount: number;
  alerts: ReconciliationAlert[];
  rule: RuleMetadata & { rate: number | null };
}

const SG_SOURCE_URL =
  'https://www.ato.gov.au/tax-rates-and-codes/key-superannuation-rates-and-thresholds/super-guarantee';

// General SG rates from the ATO Super guarantee table:
// https://www.ato.gov.au/tax-rates-and-codes/key-superannuation-rates-and-thresholds/super-guarantee
const SG_RATES: Record<string, number> = {
  '2013-14': 9.25,
  '2014-15': 9.5,
  '2015-16': 9.5,
  '2016-17': 9.5,
  '2017-18': 9.5,
  '2018-19': 9.5,
  '2019-20': 9.5,
  '2020-21': 9.5,
  '2021-22': 10,
  '2022-23': 10.5,
  '2023-24': 11,
  '2024-25': 11.5
};

function normaliseYear(financialYear: string): string {
  return financialYear.replace('–', '-');
}

export function getSuperGuaranteeRule(
  financialYear: string
): RuleMetadata & { rate: number | null } {
  const requestedYear = normaliseYear(financialYear);
  const startYear = Number(requestedYear.slice(0, 4));
  const rate = startYear >= 2025 ? 12 : SG_RATES[requestedYear];
  return {
    status: rate === undefined ? 'unsupported' : 'exact',
    requestedYear,
    sourceYear: rate === undefined ? undefined : requestedYear,
    sourceUrl: SG_SOURCE_URL,
    rate: rate ?? null
  };
}

export function expectedSuperAmount(
  contribution: SuperContribution,
  financialYear: string
): number {
  const rule = getSuperGuaranteeRule(financialYear);
  if (rule.rate !== null && contribution.qualifyingEarnings.value > 0) {
    return contribution.qualifyingEarnings.value * (rule.rate / 100);
  }
  return contribution.expectedAmount;
}

export function auditSuperGuarantee(
  contributions: SuperContribution[],
  financialYear: string
): SGAuditReport {
  const rule = getSuperGuaranteeRule(financialYear);
  let totalExpected = 0;
  let totalRecorded = 0;
  let underpaidCount = 0;
  const alerts: ReconciliationAlert[] = [];

  const auditable = contributions.filter(
    (contrib) =>
      contrib.type === 'employer_sg' &&
      (contrib.qualifyingEarnings.value > 0 || contrib.expectedAmount > 0)
  );

  auditable.forEach((contrib) => {
    const expectedAmount = expectedSuperAmount(contrib, financialYear);
    totalExpected += expectedAmount;
    totalRecorded += contrib.recordedAmount.value;

    const diff = expectedAmount - contrib.recordedAmount.value;
    if (diff > 5) {
      underpaidCount++;
      alerts.push({
        id: `super-alert-${contrib.id}`,
        type: 'super_below_expected',
        title: `Super Contribution Below ${rule.rate ?? 'Known'}% Guarantee`,
        description: `${contrib.employerName.value} contributed $${contrib.recordedAmount.value.toLocaleString()}, which is $${Math.round(diff).toLocaleString()} below the expected ${rule.rate ?? 'recorded'}% SG ($${Math.round(expectedAmount).toLocaleString()}) for pay period ${contrib.periodStart} to ${contrib.periodEnd}.`,
        severity: 'warning',
        financialYear,
        sourceDocumentId: contrib.recordedAmount.sourceDocumentId,
        sourceDocumentName: contrib.recordedAmount.sourceDocumentName,
        extractedField: 'recordedAmount'
      });
    }
  });

  const complianceRate =
    totalExpected > 0
      ? Math.min(100, Math.round((totalRecorded / totalExpected) * 1000) / 10)
      : null;
  const status =
    auditable.length === 0 || totalExpected <= 0
      ? 'no_data'
      : underpaidCount > 0 || totalRecorded < totalExpected - 5
        ? 'shortfall'
        : 'compliant';

  return {
    status,
    totalExpectedSuper: Math.round(totalExpected),
    totalRecordedSuper: Math.round(totalRecorded),
    varianceAmount: Math.round(totalRecorded - totalExpected),
    complianceRate,
    underpaidContributionsCount: underpaidCount,
    alerts,
    rule
  };
}
