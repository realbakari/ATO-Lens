export type DocumentType =
  | 'tax_return'
  | 'notice_of_assessment'
  | 'income_statement'
  | 'payg_summary'
  | 'payslip'
  | 'super_statement'
  | 'help_statement'
  | 'deduction_receipt'
  | 'health_insurance'
  | 'dividend_statement'
  | 'sole_trader_export';

export interface ExtractedValue<T> {
  value: T;
  confidence: number; // 0 to 1
  sourceDocumentId: string;
  sourceDocumentName: string;
  sourcePage?: number;
  sourceText?: string;
  manuallyConfirmed: boolean;
}

export type IncomeCategory =
  | 'salary_wages'
  | 'allowances'
  | 'bonuses_commissions'
  | 'interest'
  | 'dividends_franking'
  | 'capital_gains'
  | 'rental_income'
  | 'sole_trader'
  | 'government_payments'
  | 'foreign_income'
  | 'other';

export interface IncomeItem {
  id: string;
  category: IncomeCategory;
  /** ATO return item suggested by the parser or confirmed by the user, such as I1 or I10. */
  atoFieldCode?: string;
  description: string;
  employerOrPayer: ExtractedValue<string>;
  grossAmount: ExtractedValue<number>;
  taxWithheld: ExtractedValue<number>;
  frankingCredits?: ExtractedValue<number>;
  exemptAmount?: ExtractedValue<number>;
  dateReceived?: string;
}

export type DeductionCategory =
  | 'vehicle_travel'
  | 'working_from_home'
  | 'clothing_laundry'
  | 'self_education'
  | 'tools_equipment'
  | 'phone_internet'
  | 'professional_memberships'
  | 'donations'
  | 'tax_agent_fees'
  | 'investment_expenses'
  | 'other_work';

export interface DeductionItem {
  id: string;
  category: DeductionCategory;
  /** ATO return item suggested by the parser or confirmed by the user, such as D1 or D5. */
  atoFieldCode?: string;
  description: string;
  amount: ExtractedValue<number>;
  hasReceipt: boolean;
  receiptDocumentId?: string;
  receiptFileName?: string;
  notes?: string;
  dateIncurred?: string;
  evidence?: DeductionEvidence;
}

export type DeductionCalculationMethod =
  | 'actual_cost'
  | 'cents_per_kilometre'
  | 'logbook'
  | 'fixed_rate'
  | 'decline_in_value'
  | 'other';

export type DeductionRecordType =
  | 'receipt'
  | 'invoice'
  | 'bank_statement'
  | 'logbook'
  | 'travel_diary'
  | 'hours_record'
  | 'calculation'
  | 'fund_acknowledgement'
  | 'other';

export interface DeductionEvidence {
  calculationMethod?: DeductionCalculationMethod;
  recordTypes: DeductionRecordType[];
  workUsePercentage?: number;
  wasReimbursed?: boolean;
  periodStart?: string;
  periodEnd?: string;
  calculationNotes?: string;
}

export interface SuperContribution {
  id: string;
  employerName: ExtractedValue<string>;
  fundName: ExtractedValue<string>;
  memberNumber?: ExtractedValue<string>;
  periodStart: string;
  periodEnd: string;
  payDate: ExtractedValue<string>;
  qualifyingEarnings: ExtractedValue<number>;
  sgPercentage: number; // e.g. 12.0
  expectedAmount: number;
  recordedAmount: ExtractedValue<number>;
  type: 'employer_sg' | 'salary_sacrifice' | 'personal' | 'voluntary';
  isPaid: boolean;
}

export interface Payslip {
  id: string;
  employerName: ExtractedValue<string>;
  abn?: ExtractedValue<string>;
  payPeriodStart: string;
  payPeriodEnd: string;
  paymentDate: ExtractedValue<string>;
  grossPay: ExtractedValue<number>;
  taxWithheld: ExtractedValue<number>;
  netPay: ExtractedValue<number>;
  hourlyRate?: ExtractedValue<number>;
  ordinaryHours?: ExtractedValue<number>;
  overtimeHours?: ExtractedValue<number>;
  overtimePay?: ExtractedValue<number>;
  allowances?: ExtractedValue<number>;
  employerSuper: ExtractedValue<number>;
  leaveBalanceAccruedHours?: ExtractedValue<number>;
  helpWithheld?: ExtractedValue<number>;
  sourceDocumentId: string;
  sourceDocumentName: string;
}

export interface HELPAccount {
  openingBalance: ExtractedValue<number>;
  indexationRate: number; // e.g. 0.047 (4.7%)
  indexationAmount: ExtractedValue<number>;
  compulsoryRepayment: ExtractedValue<number>;
  voluntaryRepayments: ExtractedValue<number>;
  creditsAdjustments: ExtractedValue<number>;
  closingBalance: ExtractedValue<number>;
  amountWithheldPayroll: ExtractedValue<number>;
  estimatedPayoffYears: number;
}

export interface TaxAssessment {
  taxableIncome: ExtractedValue<number>;
  grossTaxOnTaxableIncome: ExtractedValue<number>;
  nonRefundableTaxOffsets: ExtractedValue<number>;
  medicareLevy: ExtractedValue<number>;
  medicareSurcharge?: ExtractedValue<number>;
  helpCompulsoryRepayment: ExtractedValue<number>;
  totalTaxAndLevies: ExtractedValue<number>;
  taxWithheldCredit: ExtractedValue<number>;
  assessmentResult: ExtractedValue<number>; // Positive = Refund, Negative = Tax Payable
  isRefund: boolean;
  issueDate: ExtractedValue<string>;
  noticeReference: ExtractedValue<string>;
  lodgedReturnDiffs?: string[];
}

export type EditableFigure =
  | 'grossIncome'
  | 'taxableIncome'
  | 'taxWithheld'
  | 'totalDeductions'
  | 'medicareLevy'
  | 'helpRepayment'
  | 'assessmentResult'
  | 'employerSuper';

export type FigureOrigin = 'document' | 'manual' | 'derived';

export type RuleStatus = 'exact' | 'estimated' | 'unsupported';

export interface RuleMetadata {
  status: RuleStatus;
  requestedYear: string;
  sourceYear?: string;
  sourceUrl: string;
}

export type TaxCopilotAnswer = 'yes' | 'no' | 'unsure';
export type TaxCopilotCheckStatus = 'done' | 'not_yet' | 'not_applicable';
export type TaxResidencyStatus = 'full_year' | 'part_year' | 'foreign' | 'unsure';
export type TaxCopilotFieldStatus = 'needs_review' | 'confirmed' | 'not_applicable';
export type TaxCopilotHandoffChoice = 'mytax' | 'tax_agent' | 'undecided';

export interface TaxCopilotSituation {
  residency?: TaxResidencyStatus;
  under18?: TaxCopilotAnswer;
  hasSpouse?: TaxCopilotAnswer;
  hasDependants?: TaxCopilotAnswer;
  hasPrivateHealthInsurance?: TaxCopilotAnswer;
  hasStudyLoan?: TaxCopilotAnswer;
  hasCapitalGains?: TaxCopilotAnswer;
  hasRentalProperty?: TaxCopilotAnswer;
  hasForeignIncomeOrAssets?: TaxCopilotAnswer;
  hasBusinessOrPsi?: TaxCopilotAnswer;
  hasTrustOrPartnershipIncome?: TaxCopilotAnswer;
  isDeceasedEstate?: TaxCopilotAnswer;
}

export interface TaxCopilotChecks {
  incomeStatementsTaxReady?: TaxCopilotCheckStatus;
  prefillReviewed?: TaxCopilotCheckStatus;
  deductionsReviewed?: TaxCopilotCheckStatus;
  evidenceReviewed?: TaxCopilotCheckStatus;
  medicareAndIncomeTestsReviewed?: TaxCopilotCheckStatus;
}

/**
 * Preparation state only. Identity numbers, credentials and refund account
 * details are intentionally excluded and must be confirmed in myTax.
 */
export interface TaxCopilotState {
  situation: TaxCopilotSituation;
  checks: TaxCopilotChecks;
  fieldStatuses: Record<string, TaxCopilotFieldStatus>;
  handoffChoice?: TaxCopilotHandoffChoice;
  lastUpdated?: string;
}

export interface SourceDocument {
  id: string;
  fileName: string;
  fileSize: number;
  fileType: DocumentType;
  uploadDate: string;
  financialYear: string; // e.g. "2025–26"
  pageCount: number;
  parsedBy: 'rule_based' | 'claude' | 'openai' | 'gemini' | 'ollama';
  rawText?: string;
  confidenceAverage: number;
}

export type AlertSeverity = 'warning' | 'error' | 'info';

export interface ReconciliationAlert {
  id: string;
  type:
    | 'unmatched_payslip_income_statement'
    | 'income_statement_not_ready'
    | 'gross_earnings_mismatch'
    | 'tax_withheld_mismatch'
    | 'missing_allowances'
    | 'duplicate_employer'
    | 'unexpected_rate_change'
    | 'overtime_disappeared'
    | 'holiday_rate_changed'
    | 'new_deduction_introduced'
    | 'net_pay_mismatch'
    | 'super_below_expected'
    | 'leave_balance_dropped'
    | 'missing_pay_period'
    | 'assessment_differs_lodged'
    | 'deduction_adjusted'
    | 'refund_lower_than_expected'
    | 'help_repayment_added'
    | 'medicare_changed';
  title: string;
  description: string;
  severity: AlertSeverity;
  financialYear: string;
  sourceDocumentId?: string;
  sourceDocumentName?: string;
  sourcePage?: number;
  extractedField?: string;
}

export interface AustralianFinancialYear {
  id: string; // e.g. "2025-26"
  label: string; // "2025–26"
  startDate: string; // "2025-07-01"
  endDate: string; // "2026-06-30"

  grossIncome: number;
  taxableIncome: number;
  taxWithheld: number;
  totalDeductions: number;
  medicareLevy: number;
  helpRepayment: number;
  assessmentResult: number; // positive = refund, negative = payable
  employerSuper: number;
  employerCount: number;
  effectiveTaxRate: number; // percentage
  medicareRule?: RuleMetadata;

  /** Origin of each headline value. Missing means the value has not been supplied yet. */
  figureOrigins?: Partial<Record<EditableFigure, FigureOrigin>>;

  /**
   * Legacy flag retained while v1 workspaces migrate to figureOrigins.
   * New writes use figureOrigins instead.
   */
  /** @deprecated */
  manualOverrides?: Partial<Record<string, boolean>>;

  income: IncomeItem[];
  deductions: DeductionItem[];
  superContributions: SuperContribution[];
  payslips: Payslip[];
  documents: SourceDocument[];
  studyLoans?: HELPAccount;
  assessment?: TaxAssessment;
  taxCopilot?: TaxCopilotState;
  alerts: ReconciliationAlert[];
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  timestamp: string;
  text: string;
  citations?: {
    documentId: string;
    documentName: string;
    page?: number;
    snippet?: string;
  }[];
}

export interface PrivacyNetworkLog {
  id: string;
  timestamp: string;
  destination: string;
  purpose: string;
  payloadRedacted: boolean;
  status: 'allowed' | 'blocked' | 'offline_local';
  bytesSent: number;
}
