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
Gross Earnings $3,708.46
PAYG Tax Withheld $840.00
Net Pay $2,710.46
Superannuation (12%) $445.02
Hourly Rate $57.50
`;
    case 'super_statement':
      return `${header}Superannuation member statement
Employer Superannuation $11,246
`;
    case 'help_statement':
      return `${header}Study loan account statement
HELP compulsory repayment $3,401
`;
    case 'deduction_receipt':
      return `${header}Work-related expense receipt
Deductions $6,750
`;
    default:
      return `${header}Income statement
Gross income $96,420
Tax withheld $24,167
Deductions $6,750
Employer Superannuation $11,246
`;
  }
}
