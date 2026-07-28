import type {
  AustralianFinancialYear,
  DeductionItem,
  EditableFigure,
  ExtractedValue,
  HELPAccount,
  IncomeItem,
  Payslip,
  SourceDocument
} from '../types/tax';
import type { ParsedDocumentResult, ParsedField } from '../parser/providerAdapter';
import { createBlankFinancialYear, getCurrentAustralianFinancialYear } from '../data/blankFinancialYear';
import { recalculateFinancialYear, setFigureOrigins } from './recalculateFinancialYear';

/** Resolves a parser's financial year label ("2025–26") to a workspace year. */
export function resolveFinancialYear(label: string): {
  id: string;
  label: string;
  startDate: string;
  endDate: string;
} {
  const match = label.match(/(20\d{2})\s*[–\-/]\s*(\d{2})/);
  if (!match) return getCurrentAustralianFinancialYear();

  const startYear = Number(match[1]);
  return {
    id: `${startYear}-${match[2]}`,
    label: `${startYear}–${match[2]}`,
    startDate: `${startYear}-07-01`,
    endDate: `${startYear + 1}-06-30`
  };
}

/**
 * Folds a parsed document into the user's real financial year data: figures the
 * document actually states are written through, and everything downstream of
 * them is recalculated by the tax engine. Fields the parser could not read are
 * left untouched rather than zeroed.
 */
export function applyParsedDocument(
  years: AustralianFinancialYear[],
  doc: SourceDocument,
  result: ParsedDocumentResult
): AustralianFinancialYear[] {
  const target = resolveFinancialYear(result.financialYear);
  const existing = years.find((fy) => fy.id === target.id);
  const base = existing ?? createBlankFinancialYear(target.id, target.label, target.startDate, target.endDate);

  const withDocument: AustralianFinancialYear = {
    ...base,
    documents: [{ ...doc, financialYear: target.label }, ...base.documents]
  };

  const withFields = applyFields(withDocument, doc, result);
  const updated = recalculateFinancialYear({
    ...withFields,
    employerCount: countEmployers(withFields)
  });

  return existing
    ? years.map((fy) => (fy.id === updated.id ? updated : fy))
    : [updated, ...years].sort((a, b) => b.id.localeCompare(a.id));
}

function applyFields(
  fy: AustralianFinancialYear,
  doc: SourceDocument,
  result: ParsedDocumentResult
): AustralianFinancialYear {
  const fields = result.extractedFields;
  const num = (key: string): number | undefined => {
    const value = fields[key]?.value;
    return typeof value === 'number' && !isNaN(value) ? value : undefined;
  };
  const extracted = <T>(key: string, value: T): ExtractedValue<T> => ({
    value,
    confidence: fields[key]?.confidence ?? 0,
    sourceDocumentId: doc.id,
    sourceDocumentName: doc.fileName,
    sourcePage: fields[key]?.sourcePage ?? 1,
    sourceText: fields[key]?.sourceText,
    manuallyConfirmed: fields[key]?.userReviewed ?? false
  });

  if (result.documentType === 'payslip') {
    return { ...fy, payslips: [buildPayslip(fy, doc, fields, extracted), ...fy.payslips] };
  }

  if (result.documentType === 'notice_of_assessment') {
    const mapped: Array<[string, EditableFigure]> = [
      ['taxableIncome', 'taxableIncome'],
      ['taxWithheldCredit', 'taxWithheld'],
      ['medicareLevy', 'medicareLevy'],
      ['helpRepayment', 'helpRepayment'],
      ['assessmentResult', 'assessmentResult']
    ];
    const next = {
      ...fy,
      taxableIncome: num('taxableIncome') ?? fy.taxableIncome,
      taxWithheld: num('taxWithheldCredit') ?? fy.taxWithheld,
      medicareLevy: num('medicareLevy') ?? fy.medicareLevy,
      helpRepayment: num('helpRepayment') ?? fy.helpRepayment,
      assessmentResult: num('assessmentResult') ?? fy.assessmentResult
    };
    return setFigureOrigins(
      next,
      'document',
      mapped.filter(([field]) => num(field) !== undefined).map(([, figure]) => figure)
    );
  }

  if (result.documentType === 'deduction_receipt' && num('deductionAmount') !== undefined) {
    const amount = num('deductionAmount')!;
    const deductionId = `ded-${doc.id}`;
    const previous = fy.deductions.find((item) => item.id === deductionId)?.amount.value ?? 0;
    const supplier =
      typeof fields['supplierName']?.value === 'string' ? fields['supplierName'].value : '';
    const description =
      typeof fields['expenseDescription']?.value === 'string'
        ? fields['expenseDescription'].value
        : supplier || `Expense from ${doc.fileName}`;
    const item: DeductionItem = {
      id: deductionId,
      category: 'other_work',
      description,
      amount: extracted('deductionAmount', amount),
      hasReceipt: true,
      receiptDocumentId: doc.id,
      receiptFileName: doc.fileName,
      dateIncurred:
        typeof fields['transactionDate']?.value === 'string'
          ? fields['transactionDate'].value
          : undefined,
      notes: supplier ? `Supplier: ${supplier}` : undefined
    };
    const next = {
      ...fy,
      deductions: [...fy.deductions.filter((entry) => entry.id !== deductionId), item],
      totalDeductions: Math.max(0, fy.totalDeductions - previous + amount)
    };
    return setFigureOrigins(next, 'document', ['totalDeductions']);
  }

  if (result.documentType === 'dividend_statement') {
    const franked = num('frankedAmount');
    const unfranked = num('unfrankedAmount');
    if (franked !== undefined || unfranked !== undefined) {
      const dividendAmount = (franked ?? 0) + (unfranked ?? 0) + (num('frankingCredits') ?? 0);
      const incomeId = `inc-${doc.id}`;
      const previousItem = fy.income.find((item) => item.id === incomeId);
      const previous = previousItem?.grossAmount.value ?? 0;
      const previousTaxWithheld = previousItem?.taxWithheld.value ?? 0;
      const companyName =
        typeof fields['companyName']?.value === 'string'
          ? fields['companyName'].value
          : 'Not stated on document';
      const item: IncomeItem = {
        id: incomeId,
        category: 'dividends_franking',
        description: `Dividend reported on ${doc.fileName}`,
        employerOrPayer: extracted('companyName', companyName),
        grossAmount: extracted(franked !== undefined ? 'frankedAmount' : 'unfrankedAmount', dividendAmount),
        taxWithheld: extracted('taxWithheld', num('taxWithheld') ?? 0),
        frankingCredits:
          num('frankingCredits') !== undefined
            ? extracted('frankingCredits', num('frankingCredits')!)
            : undefined
      };
      const next = {
        ...fy,
        income: [...fy.income.filter((entry) => entry.id !== incomeId), item],
        grossIncome: fy.grossIncome - previous + dividendAmount,
        taxWithheld: fy.taxWithheld - previousTaxWithheld + (num('taxWithheld') ?? 0)
      };
      const supplied: EditableFigure[] = ['grossIncome'];
      if (num('taxWithheld') !== undefined) supplied.push('taxWithheld');
      return setFigureOrigins(next, 'document', supplied);
    }
  }

  if (result.documentType === 'sole_trader_export' && num('netBusinessIncome') !== undefined) {
    const netBusinessIncome = num('netBusinessIncome')!;
    const incomeId = `inc-${doc.id}`;
    const previous = fy.income.find((item) => item.id === incomeId)?.grossAmount.value ?? 0;
    const businessName =
      typeof fields['businessName']?.value === 'string'
        ? fields['businessName'].value
        : 'Not stated on document';
    const item: IncomeItem = {
      id: incomeId,
      category: 'sole_trader',
      description: `Net business income reported on ${doc.fileName}`,
      employerOrPayer: extracted('businessName', businessName),
      grossAmount: extracted('netBusinessIncome', netBusinessIncome),
      taxWithheld: extracted('taxWithheld', num('taxWithheld') ?? 0)
    };
    const next = {
      ...fy,
      income: [...fy.income.filter((entry) => entry.id !== incomeId), item],
      grossIncome: fy.grossIncome - previous + netBusinessIncome
    };
    return setFigureOrigins(next, 'document', ['grossIncome']);
  }

  if (result.documentType === 'help_statement') {
    const statementHasBalance =
      num('openingBalance') !== undefined || num('closingBalance') !== undefined;
    const studyLoans = statementHasBalance
      ? buildHelpAccount(fy.studyLoans, fields, extracted)
      : fy.studyLoans;
    const compulsoryRepayment = num('compulsoryRepayment');
    const next = {
      ...fy,
      studyLoans,
      helpRepayment: compulsoryRepayment ?? fy.helpRepayment
    };
    return compulsoryRepayment === undefined
      ? next
      : setFigureOrigins(next, 'document', ['helpRepayment']);
  }

  // Income statements, tax returns and everything else that reports year totals.
  const grossIncome = num('grossIncome');
  const deductions = num('deductions');
  const employerName = typeof fields['employerName']?.value === 'string' ? fields['employerName'].value : undefined;

  // One entry per document type, so re-uploading a corrected statement replaces
  // the earlier one instead of stacking a duplicate alongside it.
  const incomeId = `inc-${result.documentType}`;
  const deductionId = `ded-${result.documentType}`;

  const income: IncomeItem[] =
    grossIncome === undefined
      ? fy.income
      : [
          ...fy.income.filter((item) => item.id !== incomeId),
          {
            id: incomeId,
            category: 'salary_wages',
            description: `Reported on ${doc.fileName}`,
            employerOrPayer: extracted('employerName', employerName ?? 'Not stated on document'),
            grossAmount: extracted('grossIncome', grossIncome),
            taxWithheld: extracted('taxWithheld', num('taxWithheld') ?? 0)
          }
        ];

  const deductionItems: DeductionItem[] =
    deductions === undefined
      ? fy.deductions
      : [
          ...fy.deductions.filter((item) => item.id !== deductionId),
          {
            id: deductionId,
            category: 'other_work',
            description: `Total work-related deductions from ${doc.fileName}`,
            amount: extracted('deductions', deductions),
            hasReceipt: true,
            receiptDocumentId: doc.id,
            receiptFileName: doc.fileName
          }
        ];

  const next = {
    ...fy,
    income,
    deductions: deductionItems,
    grossIncome: grossIncome ?? fy.grossIncome,
    taxableIncome: num('taxableIncome') ?? fy.taxableIncome,
    taxWithheld: num('taxWithheld') ?? fy.taxWithheld,
    totalDeductions: deductions ?? fy.totalDeductions,
    medicareLevy: num('medicareLevy') ?? fy.medicareLevy,
    helpRepayment: num('helpRepayment') ?? fy.helpRepayment,
    employerSuper: num('employerSuper') ?? fy.employerSuper
  };
  const statementStatus =
    typeof fields['incomeStatementStatus']?.value === 'string'
      ? fields['incomeStatementStatus'].value
      : '';
  const statusAlertId = `income-statement-status-${doc.id}`;
  const withStatusAlert = {
    ...next,
    alerts: [
      ...next.alerts.filter((alert) => alert.id !== statusAlertId),
      ...(/not tax ready/i.test(statementStatus)
        ? [
            {
              id: statusAlertId,
              type: 'income_statement_not_ready' as const,
              title: 'Income statement is not tax ready',
              description:
                'Wait for the employer to finalise this income statement before using it to prepare the return.',
              severity: 'warning' as const,
              financialYear: fy.label,
              sourceDocumentId: doc.id,
              sourceDocumentName: doc.fileName,
              sourcePage: fields['incomeStatementStatus']?.sourcePage,
              extractedField: 'incomeStatementStatus'
            }
          ]
        : [])
    ]
  };
  const supplied: EditableFigure[] = [];
  if (grossIncome !== undefined) supplied.push('grossIncome');
  if (num('taxableIncome') !== undefined) supplied.push('taxableIncome');
  if (num('taxWithheld') !== undefined) supplied.push('taxWithheld');
  if (deductions !== undefined) supplied.push('totalDeductions');
  if (num('medicareLevy') !== undefined) supplied.push('medicareLevy');
  if (num('helpRepayment') !== undefined) supplied.push('helpRepayment');
  if (num('employerSuper') !== undefined) supplied.push('employerSuper');
  return setFigureOrigins(withStatusAlert, 'document', supplied);
}

function buildHelpAccount(
  existing: HELPAccount | undefined,
  fields: Record<string, ParsedField<any>>,
  extracted: <T>(key: string, value: T) => ExtractedValue<T>
): HELPAccount {
  const numberField = (key: string): number | undefined =>
    typeof fields[key]?.value === 'number' ? fields[key].value : undefined;
  const valueOrExisting = (
    key: keyof Pick<
      HELPAccount,
      | 'openingBalance'
      | 'indexationAmount'
      | 'compulsoryRepayment'
      | 'voluntaryRepayments'
      | 'creditsAdjustments'
      | 'closingBalance'
      | 'amountWithheldPayroll'
    >,
    field: string
  ): ExtractedValue<number> => {
    const value = numberField(field);
    if (value !== undefined) return extracted(field, value);
    if (existing?.[key]) return existing[key];
    return {
      value: 0,
      confidence: 0,
      sourceDocumentId: '',
      sourceDocumentName: 'Not stated on uploaded statement',
      manuallyConfirmed: false
    };
  };

  const openingBalance = valueOrExisting('openingBalance', 'openingBalance');
  const indexationAmount = valueOrExisting('indexationAmount', 'indexationAmount');
  const compulsoryRepayment = valueOrExisting('compulsoryRepayment', 'compulsoryRepayment');
  const voluntaryRepayments = valueOrExisting('voluntaryRepayments', 'voluntaryRepayments');
  const creditsAdjustments = valueOrExisting('creditsAdjustments', 'creditsAdjustments');
  const closingBalance = valueOrExisting('closingBalance', 'closingBalance');
  const amountWithheldPayroll = valueOrExisting('amountWithheldPayroll', 'amountWithheldPayroll');
  const indexationRate =
    openingBalance.value > 0 ? indexationAmount.value / openingBalance.value : (existing?.indexationRate ?? 0);

  return {
    openingBalance,
    indexationRate,
    indexationAmount,
    compulsoryRepayment,
    voluntaryRepayments,
    creditsAdjustments,
    closingBalance,
    amountWithheldPayroll,
    estimatedPayoffYears: existing?.estimatedPayoffYears ?? 0
  };
}

function buildPayslip(
  fy: AustralianFinancialYear,
  doc: SourceDocument,
  fields: Record<string, ParsedField<any>>,
  extracted: <T>(key: string, value: T) => ExtractedValue<T>
): Payslip {
  const employerName = typeof fields['employerName']?.value === 'string' ? fields['employerName'].value : 'Not stated on document';
  const gross = typeof fields['grossPay']?.value === 'number' ? fields['grossPay'].value : 0;
  const tax = typeof fields['taxWithheld']?.value === 'number' ? fields['taxWithheld'].value : 0;
  const net = typeof fields['netPay']?.value === 'number' ? fields['netPay'].value : gross - tax;

  return {
    id: `payslip-${doc.id}`,
    employerName: extracted('employerName', employerName),
    payPeriodStart: fy.startDate,
    payPeriodEnd: fy.endDate,
    paymentDate: extracted('paymentDate', doc.uploadDate),
    grossPay: extracted('grossPay', gross),
    taxWithheld: extracted('taxWithheld', tax),
    netPay: extracted('netPay', net),
    hourlyRate: fields['hourlyRate'] ? extracted('hourlyRate', fields['hourlyRate'].value as number) : undefined,
    ordinaryHours: fields['ordinaryHours']
      ? extracted('ordinaryHours', fields['ordinaryHours'].value as number)
      : undefined,
    overtimeHours: fields['overtimeHours']
      ? extracted('overtimeHours', fields['overtimeHours'].value as number)
      : undefined,
    allowances: fields['allowances']
      ? extracted('allowances', fields['allowances'].value as number)
      : undefined,
    employerSuper: extracted('employerSuper', typeof fields['employerSuper']?.value === 'number' ? fields['employerSuper'].value : 0),
    sourceDocumentId: doc.id,
    sourceDocumentName: doc.fileName
  };
}

function countEmployers(fy: AustralianFinancialYear): number {
  const employers = new Set(
    [
      ...fy.income.map((item) => item.employerOrPayer.value),
      ...fy.payslips.map((slip) => slip.employerName.value)
    ]
      .map((name) => name.toLowerCase().trim())
      .filter((name) => name && name !== 'not stated on document')
  );
  return employers.size;
}
