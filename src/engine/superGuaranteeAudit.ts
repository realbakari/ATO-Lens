import type { SuperContribution, ReconciliationAlert } from '../types/tax';

export interface SGAuditReport {
  totalExpectedSuper: number;
  totalRecordedSuper: number;
  varianceAmount: number;
  complianceRate: number; // percentage (e.g. 98.5%)
  underpaidContributionsCount: number;
  alerts: ReconciliationAlert[];
}

/**
 * Audits superannuation contributions against the Australian Super Guarantee (SG) rate (12.0%).
 */
export function auditSuperGuarantee(
  contributions: SuperContribution[],
  financialYear: string
): SGAuditReport {
  let totalExpected = 0;
  let totalRecorded = 0;
  let underpaidCount = 0;
  const alerts: ReconciliationAlert[] = [];

  contributions.forEach((contrib) => {
    totalExpected += contrib.expectedAmount;
    totalRecorded += contrib.recordedAmount.value;

    const diff = contrib.expectedAmount - contrib.recordedAmount.value;
    if (diff > 5) {
      underpaidCount++;
      alerts.push({
        id: `super-alert-${contrib.id}`,
        type: 'super_below_expected',
        title: `Super Contribution Below 12% Guarantee`,
        description: `${contrib.employerName.value} contributed $${contrib.recordedAmount.value.toLocaleString()}, which is $${Math.round(diff).toLocaleString()} below the expected 12% SG ($${Math.round(contrib.expectedAmount).toLocaleString()}) for pay period ${contrib.periodStart} to ${contrib.periodEnd}.`,
        severity: 'warning',
        financialYear,
        sourceDocumentId: contrib.recordedAmount.sourceDocumentId,
        sourceDocumentName: contrib.recordedAmount.sourceDocumentName,
        extractedField: 'recordedAmount'
      });
    }
  });

  const complianceRate = totalExpected > 0 ? Math.min(100, Math.round((totalRecorded / totalExpected) * 1000) / 10) : 100;

  return {
    totalExpectedSuper: Math.round(totalExpected),
    totalRecordedSuper: Math.round(totalRecorded),
    varianceAmount: Math.round(totalRecorded - totalExpected),
    complianceRate,
    underpaidContributionsCount: underpaidCount,
    alerts
  };
}
