import type { DocumentType } from '../../types/tax';

/**
 * Document bodies behind "Use Sample ATO Document". These are parsed by the
 * same extraction path as a real upload, so the demo shows what the parser can
 * genuinely read rather than figures baked into the parser itself.
 */
export function buildSampleDocumentText(docType: DocumentType): string {
  const header = 'Australian Taxation Office\nFinancial year 2025–26\nTFN 123 456 789\n';

  switch (docType) {
    case 'notice_of_assessment':
      return `${header}Notice of assessment
Taxable income $89,670
Tax withheld $24,167
Medicare levy $1,793
HELP compulsory repayment $3,401
Refund $1,284
`;
    case 'payslip':
      return `Pay Slip
Employer: Atlassian Pty Ltd
Pay period 01/06/2026 - 14/06/2026
Payment Date: 16/06/2026
Gross Earnings $3,708.46
PAYG Tax Withheld $840.00
Net Pay $2,710.46
Superannuation (12%) $445.02
Hourly Rate $57.50
Ordinary Hours 64.50
Overtime Hours 4.00
Allowances $120.00
`;
    case 'income_statement':
      return `${header}Income statement
Employer name: Atlassian Pty Ltd
Gross payments $96,420
Tax withheld $24,167
Allowances $1,200
Reportable employer super contributions $2,000
Status: Tax ready
`;
    case 'payg_summary':
      return `${header}PAYG payment summary
Payer name: Atlassian Pty Ltd
Total payments $96,420
PAYG tax withheld $24,167
Allowances $1,200
`;
    case 'tax_return':
      return `${header}Individual tax return
Gross income $96,420
Taxable income $89,670
Total deductions $6,750
Tax withheld $24,167
Medicare levy $1,793
HELP repayment $3,401
Employer superannuation $11,246
`;
    case 'super_statement':
      return `${header}Superannuation member statement
Fund name: AustralianSuper
Employer name: Atlassian Pty Ltd
Opening balance $72,400
Employer contributions $11,246
Personal contributions $1,000
Closing balance $84,646
`;
    case 'help_statement':
      return `${header}Study loan account statement
Opening balance $28,400
Indexation amount $1,278
HELP compulsory repayment $3,401
Voluntary repayments $500
Credits and adjustments $100
PAYG amount withheld $3,600
Closing balance $25,677
`;
    case 'deduction_receipt':
      return `${header}Tax invoice
Supplier: Officeworks
Date: 14/08/2025
Description: Ergonomic office chair
Amount paid $649.00
`;
    case 'health_insurance':
      return `${header}Private health insurance statement
Health insurer: Medibank Private
Premiums eligible for rebate $2,400
Australian Government rebate received $600
Benefit code 30
`;
    case 'dividend_statement':
      return `${header}Dividend statement
Company name: BHP Group Limited
Franked dividend $3,500
Unfranked dividend $500
Franking credits $1,500
TFN amount withheld $200
`;
    case 'sole_trader_export':
      return `${header}Sole trader profit and loss
Business name: Lens Consulting
Gross business income $42,000
Total business expenses $13,500
Net business income $28,500
`;
  }
}
