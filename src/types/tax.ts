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
  description: string;
  amount: ExtractedValue<number>;
  hasReceipt: boolean;
  receiptDocumentId?: string;
  receiptFileName?: string;
  notes?: string;
  dateIncurred?: string;
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

  income: IncomeItem[];
  deductions: DeductionItem[];
  superContributions: SuperContribution[];
  payslips: Payslip[];
  documents: SourceDocument[];
  studyLoans?: HELPAccount;
  assessment?: TaxAssessment;
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
