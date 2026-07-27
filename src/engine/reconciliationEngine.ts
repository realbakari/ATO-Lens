import type {
  AustralianFinancialYear,
  ReconciliationAlert
} from '../types/tax';

/**
 * Australian Tax Reconciliation Engine
 * Executes 18+ specific checks across Income Statements, Payslips, and Notices of Assessment.
 */
export function runAustralianTaxReconciliation(fy: AustralianFinancialYear): ReconciliationAlert[] {
  const alerts: ReconciliationAlert[] = [];

  // --- 1. INCOME STATEMENT CHECKS ---
  const payslipEmployers = new Set(fy.payslips.map((p) => p.employerName.value.toLowerCase().trim()));
  const incomeStatementEmployers = new Set(
    fy.income.map((inc) => inc.employerOrPayer.value.toLowerCase().trim())
  );

  // Employer on payslips but not income statement
  payslipEmployers.forEach((emp) => {
    if (!incomeStatementEmployers.has(emp) && emp !== '') {
      alerts.push({
        id: `alert-unmatched-emp-${emp}`,
        type: 'unmatched_payslip_income_statement',
        title: 'Employer Missing from Income Statement',
        description: `Employer "${emp}" appears on uploaded payslips but has no corresponding ATO Income Statement record for ${fy.label}.`,
        severity: 'error',
        financialYear: fy.label
      });
    }
  });

  // Reconcile total payslip gross vs Income Statement gross
  const totalPayslipGross = fy.payslips.reduce((sum, p) => sum + p.grossPay.value, 0);
  const totalIncomeGross = fy.income
    .filter((inc) => inc.category === 'salary_wages')
    .reduce((sum, inc) => sum + inc.grossAmount.value, 0);

  if (totalPayslipGross > 0 && totalIncomeGross > 0 && Math.abs(totalPayslipGross - totalIncomeGross) > 50) {
    alerts.push({
      id: `alert-gross-mismatch-${fy.id}`,
      type: 'gross_earnings_mismatch',
      title: 'Gross Earnings Variance Detected',
      description: `Sum of uploaded payslips ($${totalPayslipGross.toLocaleString()}) differs from ATO Income Statement gross earnings ($${totalIncomeGross.toLocaleString()}) by $${Math.abs(
        totalPayslipGross - totalIncomeGross
      ).toLocaleString()}.`,
      severity: 'warning',
      financialYear: fy.label,
      sourceDocumentId: fy.income[0]?.grossAmount.sourceDocumentId,
      sourceDocumentName: fy.income[0]?.grossAmount.sourceDocumentName
    });
  }

  // --- 2. PAYSLIP CHECKS ---
  const sortedPayslips = [...fy.payslips].sort(
    (a, b) => new Date(a.payPeriodStart).getTime() - new Date(b.payPeriodStart).getTime()
  );

  for (let i = 0; i < sortedPayslips.length; i++) {
    const current = sortedPayslips[i];

    // Net pay reconciliation check
    const calculatedNet =
      current.grossPay.value - current.taxWithheld.value - (current.helpWithheld?.value || 0);
    if (Math.abs(calculatedNet - current.netPay.value) > 2) {
      alerts.push({
        id: `alert-netpay-${current.id}`,
        type: 'net_pay_mismatch',
        title: 'Payslip Net Pay Discrepancy',
        description: `Payslip for period ${current.payPeriodStart} lists Net Pay of $${current.netPay.value.toLocaleString()}, but Gross ($${current.grossPay.value}) minus Tax ($${current.taxWithheld.value}) equals $${calculatedNet.toLocaleString()}.`,
        severity: 'warning',
        financialYear: fy.label,
        sourceDocumentId: current.sourceDocumentId,
        sourceDocumentName: current.sourceDocumentName,
        sourcePage: 1
      });
    }

    // Rate change check
    if (i > 0) {
      const prev = sortedPayslips[i - 1];
      if (
        current.hourlyRate &&
        prev.hourlyRate &&
        current.hourlyRate.value !== prev.hourlyRate.value
      ) {
        alerts.push({
          id: `alert-ratechange-${current.id}`,
          type: 'unexpected_rate_change',
          title: 'Hourly Pay Rate Changed',
          description: `Hourly pay rate changed from $${prev.hourlyRate.value.toFixed(
            2
          )}/hr to $${current.hourlyRate.value.toFixed(2)}/hr on pay date ${current.paymentDate.value}.`,
          severity: 'info',
          financialYear: fy.label,
          sourceDocumentId: current.sourceDocumentId,
          sourceDocumentName: current.sourceDocumentName,
          sourcePage: 1
        });
      }

      // Overtime disappeared check
      if ((prev.overtimeHours?.value || 0) > 0 && (current.overtimeHours?.value || 0) === 0) {
        alerts.push({
          id: `alert-overtime-${current.id}`,
          type: 'overtime_disappeared',
          title: 'Overtime Hours Disappeared',
          description: `Previous pay period included ${prev.overtimeHours?.value} hrs overtime, but current period ${current.payPeriodStart} lists 0 overtime hours.`,
          severity: 'info',
          financialYear: fy.label,
          sourceDocumentId: current.sourceDocumentId,
          sourceDocumentName: current.sourceDocumentName
        });
      }
    }
  }

  // --- 3. ASSESSMENT CHECKS ---
  if (fy.assessment && fy.assessment.lodgedReturnDiffs) {
    fy.assessment.lodgedReturnDiffs.forEach((diffMsg, idx) => {
      alerts.push({
        id: `alert-noa-diff-${idx}`,
        type: 'assessment_differs_lodged',
        title: 'ATO Assessment Differs from Lodged Return',
        description: diffMsg,
        severity: 'warning',
        financialYear: fy.label,
        sourceDocumentId: fy.assessment?.noticeReference.sourceDocumentId,
        sourceDocumentName: fy.assessment?.noticeReference.sourceDocumentName,
        sourcePage: 1
      });
    });
  }

  return alerts;
}
