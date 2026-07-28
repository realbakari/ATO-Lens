import type {
  AustralianFinancialYear,
  DeductionCategory,
  IncomeCategory,
  RuleStatus
} from '../types/tax';

export interface AtoFieldDefinition {
  id: string;
  atoCode: string;
  label: string;
  description: string;
  evidenceHint?: string;
  sensitive?: boolean;
  agentReviewRecommended?: boolean;
  incomeCategories?: IncomeCategory[];
  deductionCategories?: DeductionCategory[];
}

export interface AtoFieldGroup {
  id: 'situation' | 'income' | 'deductions' | 'adjustments';
  label: string;
  description: string;
  sourceUrl: string;
  fields: AtoFieldDefinition[];
}

export interface AtoFieldManifest {
  id: string;
  financialYear: string;
  returnName: string;
  publishedAt: string;
  groups: AtoFieldGroup[];
}

export interface ResolvedAtoFieldManifest {
  manifest: AtoFieldManifest;
  requestedFinancialYear: string;
  status: RuleStatus;
  notice: string;
}

// ATO, Individual tax return instructions 2025, last updated 27 May 2025.
const RETURN_INSTRUCTIONS_2025 =
  'https://www.ato.gov.au/api/public/content/0-5705ddc1-f517-4ce9-9c5f-666c224ed36e';
// ATO, Tax return for individuals (supplementary section) 2025.
const SUPPLEMENTARY_RETURN_2025 =
  'https://www.ato.gov.au/api/public/content/e8bc7da0e7b440cb8dd53d43cf4b5510?v=5380d148';
// ATO, myTax deductions 2025.
const DEDUCTION_INSTRUCTIONS_2025 = 'https://www.ato.gov.au/myTax25Deductions';

const situationFields: AtoFieldDefinition[] = [
  {
    id: 'PROFILE_RESIDENCY',
    atoCode: 'Profile',
    label: 'Tax residency',
    description: 'Confirm full-year, part-year or foreign residency and any relevant dates.'
  },
  {
    id: 'PROFILE_OCCUPATION',
    atoCode: 'Profile',
    label: 'Main occupation',
    description: 'Confirm the occupation shown in myTax.'
  },
  {
    id: 'PROFILE_SPOUSE',
    atoCode: 'Spouse',
    label: 'Spouse details',
    description: 'Review spouse circumstances and income-test amounts when applicable.'
  },
  {
    id: 'PROFILE_DEPENDANTS',
    atoCode: 'IT8',
    label: 'Dependent children',
    description: 'Confirm the number of dependent children for income-test purposes.'
  },
  {
    id: 'PROFILE_PRIVATE_HEALTH',
    atoCode: 'PHI',
    label: 'Private health insurance',
    description: 'Review policy information pre-filled by the health insurer.'
  },
  {
    id: 'PROFILE_STUDY_LOAN',
    atoCode: 'Study loan',
    label: 'Study and training support loans',
    description: 'Confirm any HELP or other study-loan account that may affect the assessment.'
  },
  {
    id: 'PROFILE_FINAL_RETURN',
    atoCode: 'Profile',
    label: 'Future return requirement',
    description: 'Tell the ATO in myTax if this is expected to be the final return.'
  },
  {
    id: 'PROFILE_REFUND_ACCOUNT',
    atoCode: 'EFT',
    label: 'Refund account',
    description: 'Confirm BSB, account number and account name directly in myTax.',
    sensitive: true
  }
];

const incomeFields: AtoFieldDefinition[] = [
  {
    id: 'I1',
    atoCode: '1',
    label: 'Salary or wages',
    description: 'Income statements and PAYG payment summaries.',
    incomeCategories: ['salary_wages']
  },
  {
    id: 'I2',
    atoCode: '2',
    label: 'Allowances, earnings, tips and directors’ fees',
    description: 'Amounts paid in addition to ordinary salary.',
    incomeCategories: ['allowances', 'bonuses_commissions']
  },
  { id: 'I3', atoCode: '3', label: 'Employer lump sum payments', description: 'Eligible and other employer lump sums.' },
  { id: 'I4', atoCode: '4', label: 'Employment termination payments', description: 'ETP components and withholding.' },
  {
    id: 'I5',
    atoCode: '5',
    label: 'Australian Government allowances and payments',
    description: 'Taxable government allowances and payments.',
    incomeCategories: ['government_payments']
  },
  { id: 'I6', atoCode: '6', label: 'Australian Government pensions and allowances', description: 'Taxable pensions and allowances.' },
  { id: 'I7', atoCode: '7', label: 'Australian annuities and super income streams', description: 'Super income-stream components and offsets.' },
  { id: 'I8', atoCode: '8', label: 'Australian super lump sums', description: 'Taxed and untaxed lump-sum components.' },
  {
    id: 'I9',
    atoCode: '9',
    label: 'Attributed personal services income',
    description: 'PSI attributed from a personal services entity.',
    agentReviewRecommended: true
  },
  {
    id: 'I10',
    atoCode: '10',
    label: 'Gross interest',
    description: 'Bank and other interest before withholding.',
    incomeCategories: ['interest']
  },
  {
    id: 'I11',
    atoCode: '11',
    label: 'Dividends',
    description: 'Franked, unfranked and franking-credit amounts.',
    incomeCategories: ['dividends_franking']
  },
  { id: 'I12', atoCode: '12', label: 'Employee share schemes', description: 'ESS discounts and foreign-service amounts.' },
  {
    id: 'I13',
    atoCode: '13',
    label: 'Partnerships and trusts',
    description: 'Distributions, shares of income and related credits.',
    agentReviewRecommended: true
  },
  {
    id: 'I14',
    atoCode: '14',
    label: 'Personal services income',
    description: 'PSI earned as a sole trader.',
    agentReviewRecommended: true,
    incomeCategories: ['sole_trader']
  },
  {
    id: 'I15',
    atoCode: '15',
    label: 'Net business income or loss',
    description: 'Primary and non-primary production business results.',
    agentReviewRecommended: true,
    incomeCategories: ['sole_trader']
  },
  {
    id: 'I16',
    atoCode: '16',
    label: 'Deferred non-commercial business losses',
    description: 'Prior and current-year deferred business losses.',
    agentReviewRecommended: true
  },
  { id: 'I17', atoCode: '17', label: 'Farm management deposits', description: 'Deposits and repayments for primary producers.', agentReviewRecommended: true },
  {
    id: 'I18',
    atoCode: '18',
    label: 'Capital gains',
    description: 'Capital gains, losses, discounts and concessions.',
    agentReviewRecommended: true,
    incomeCategories: ['capital_gains']
  },
  { id: 'I19', atoCode: '19', label: 'Foreign entities', description: 'Interests in controlled foreign companies or trusts.', agentReviewRecommended: true },
  {
    id: 'I20',
    atoCode: '20',
    label: 'Foreign income and assets',
    description: 'Foreign income, pensions, employment and asset disclosures.',
    agentReviewRecommended: true,
    incomeCategories: ['foreign_income']
  },
  {
    id: 'I21',
    atoCode: '21',
    label: 'Rent',
    description: 'Rental income, expenses and ownership share.',
    agentReviewRecommended: true,
    incomeCategories: ['rental_income']
  },
  { id: 'I22', atoCode: '22', label: 'Bonuses from life insurance companies and friendly societies', description: 'Assessable policy and friendly-society bonuses.' },
  { id: 'I23', atoCode: '23', label: 'Forestry managed investment scheme income', description: 'Forestry scheme income.', agentReviewRecommended: true },
  {
    id: 'I24',
    atoCode: '24',
    label: 'Other income',
    description: 'Assessable income not reported elsewhere.',
    incomeCategories: ['other']
  }
];

const deductionFields: AtoFieldDefinition[] = [
  {
    id: 'D1',
    atoCode: 'D1',
    label: 'Work-related car expenses',
    description: 'Cents-per-kilometre or logbook-method car claims.',
    evidenceHint: 'Keep calculation records; the logbook method needs a representative logbook and expense records.',
    deductionCategories: ['vehicle_travel']
  },
  {
    id: 'D2',
    atoCode: 'D2',
    label: 'Work-related travel expenses',
    description: 'Work travel other than ordinary commuting and D1 car claims.',
    evidenceHint: 'Receipts and, for some travel, a travel diary may be required.',
    deductionCategories: ['vehicle_travel']
  },
  {
    id: 'D3',
    atoCode: 'D3',
    label: 'Work-related clothing, laundry and dry-cleaning',
    description: 'Eligible occupation-specific, protective or compulsory-uniform costs.',
    deductionCategories: ['clothing_laundry']
  },
  {
    id: 'D4',
    atoCode: 'D4',
    label: 'Work-related self-education expenses',
    description: 'Eligible education with a sufficient connection to current employment.',
    deductionCategories: ['self_education']
  },
  {
    id: 'D5',
    atoCode: 'D5',
    label: 'Other work-related expenses',
    description: 'Working from home, tools, phone, subscriptions and other work costs.',
    evidenceHint: 'Record the calculation method, actual hours or work-use percentage where relevant.',
    deductionCategories: [
      'working_from_home',
      'tools_equipment',
      'phone_internet',
      'professional_memberships',
      'other_work'
    ]
  },
  { id: 'D6', atoCode: 'D6', label: 'Low-value pool deduction', description: 'Decline in value for assets allocated to a low-value pool.' },
  {
    id: 'D7',
    atoCode: 'D7',
    label: 'Interest income deductions',
    description: 'Expenses incurred in earning assessable interest.',
    deductionCategories: ['investment_expenses']
  },
  {
    id: 'D8',
    atoCode: 'D8',
    label: 'Dividend deductions',
    description: 'Expenses incurred in earning assessable dividends.',
    deductionCategories: ['investment_expenses']
  },
  {
    id: 'D9',
    atoCode: 'D9',
    label: 'Gifts or donations',
    description: 'Eligible gifts to deductible gift recipients.',
    deductionCategories: ['donations']
  },
  {
    id: 'D10',
    atoCode: 'D10',
    label: 'Cost of managing tax affairs',
    description: 'Eligible tax-agent, advice and tax-management costs.',
    deductionCategories: ['tax_agent_fees']
  },
  { id: 'D11', atoCode: 'D11', label: 'Deductible amount of undeducted purchase price', description: 'Eligible foreign pension or annuity amount.', agentReviewRecommended: true },
  { id: 'D12', atoCode: 'D12', label: 'Personal super contributions', description: 'Contributions covered by a valid notice of intent and fund acknowledgement.', evidenceHint: 'Keep the fund acknowledgement before claiming.' },
  { id: 'D13', atoCode: 'D13', label: 'Project pool', description: 'Deduction for eligible project-pool expenditure.', agentReviewRecommended: true },
  { id: 'D14', atoCode: 'D14', label: 'Forestry managed investment scheme deduction', description: 'Eligible forestry scheme payments.', agentReviewRecommended: true },
  { id: 'D15', atoCode: 'D15', label: 'Other deductions', description: 'Other deductions and election expenses not shown above.' }
];

const adjustmentFields: AtoFieldDefinition[] = [
  { id: 'L1', atoCode: 'L1', label: 'Tax losses from earlier income years', description: 'Prior-year losses claimed in the current year.', agentReviewRecommended: true },
  { id: 'T1', atoCode: 'T1', label: 'Seniors and pensioners tax offset', description: 'Eligibility and spouse details for SAPTO.' },
  { id: 'T2', atoCode: 'T2', label: 'Australian super income stream tax offset', description: 'Tax offset from eligible super income streams.' },
  { id: 'T3', atoCode: 'T3', label: 'Super contributions on behalf of a spouse', description: 'Eligible spouse contribution tax offset.' },
  { id: 'T4', atoCode: 'T4', label: 'Zone or overseas forces tax offset', description: 'Eligibility for zone or overseas-service offsets.' },
  { id: 'T5', atoCode: 'T5', label: 'Invalid and invalid carer tax offsets', description: 'Eligibility and adjusted taxable income tests.' },
  { id: 'T6', atoCode: 'T6', label: 'Landcare and water facility tax offset', description: 'Eligible partnership or trust amounts.' },
  { id: 'T7', atoCode: 'T7', label: 'Early-stage venture capital limited partnership offset', description: 'Eligible ESVCLP tax offset.', agentReviewRecommended: true },
  { id: 'T8', atoCode: 'T8', label: 'Early-stage investor tax offset', description: 'Eligible early-stage innovation company investment.', agentReviewRecommended: true },
  { id: 'T9', atoCode: 'T9', label: 'Other refundable tax offsets', description: 'Other refundable offsets reported at T9.' },
  { id: 'M1', atoCode: 'M1', label: 'Medicare levy reduction or exemption', description: 'Family-income reduction and exemption circumstances.' },
  { id: 'M2', atoCode: 'M2', label: 'Medicare levy surcharge', description: 'Required review of income, dependants and private hospital cover.' },
  { id: 'PHI', atoCode: 'PHI', label: 'Private health insurance policy details', description: 'Confirm every relevant policy statement and benefit code.' },
  { id: 'A1', atoCode: 'A1', label: 'Under 18', description: 'Special tax rules for taxpayers under 18.' },
  { id: 'A2', atoCode: 'A2', label: 'Part-year tax-free threshold', description: 'Months as an Australian resident and threshold calculation.' },
  { id: 'A3', atoCode: 'A3', label: 'Government super contributions', description: 'Eligibility information for super co-contribution and LISTO.' },
  { id: 'A4', atoCode: 'A4', label: 'Working holiday maker net income', description: 'Working-holiday-maker income and residency treatment.', agentReviewRecommended: true },
  { id: 'A5', atoCode: 'A5', label: 'Family trust distribution tax', description: 'Family trust distribution tax paid.', agentReviewRecommended: true },
  { id: 'IT1', atoCode: 'IT1', label: 'Total reportable fringe benefits', description: 'Reportable fringe benefits from all employers.' },
  { id: 'IT2', atoCode: 'IT2', label: 'Reportable employer super contributions', description: 'Salary-sacrifice and other reportable employer contributions.' },
  { id: 'IT3', atoCode: 'IT3', label: 'Tax-free government pensions or benefits', description: 'Tax-free payments used for income tests.' },
  { id: 'IT4', atoCode: 'IT4', label: 'Target foreign income', description: 'Foreign income not already included in taxable income.', agentReviewRecommended: true },
  { id: 'IT5', atoCode: 'IT5', label: 'Net financial investment loss', description: 'Net loss from financial investments.' },
  { id: 'IT6', atoCode: 'IT6', label: 'Net rental property loss', description: 'Net rental losses used for income tests.', agentReviewRecommended: true },
  { id: 'IT7', atoCode: 'IT7', label: 'Child support paid', description: 'Child support paid during the income year.' },
  { id: 'IT8', atoCode: 'IT8', label: 'Number of dependent children', description: 'Dependent children for income-test purposes.' }
];

export const ATO_2024_25_FIELD_MANIFEST: AtoFieldManifest = {
  id: 'individual-return-2024-25-v1',
  financialYear: '2024-25',
  returnName: 'Tax return for individuals 2025',
  publishedAt: '2025-05-27',
  groups: [
    {
      id: 'situation',
      label: 'Your situation',
      description: 'Profile questions that determine which myTax sections apply.',
      sourceUrl: RETURN_INSTRUCTIONS_2025,
      fields: situationFields
    },
    {
      id: 'income',
      label: 'Income questions 1–24',
      description: 'Main and supplementary income items.',
      sourceUrl: SUPPLEMENTARY_RETURN_2025,
      fields: incomeFields
    },
    {
      id: 'deductions',
      label: 'Deduction questions D1–D15',
      description: 'Deduction categories and their evidence requirements.',
      sourceUrl: DEDUCTION_INSTRUCTIONS_2025,
      fields: deductionFields
    },
    {
      id: 'adjustments',
      label: 'Offsets, Medicare and income tests',
      description: 'Losses, offsets, Medicare, adjustments and income-test fields.',
      sourceUrl: RETURN_INSTRUCTIONS_2025,
      fields: adjustmentFields
    }
  ]
};

export function resolveAtoFieldManifest(financialYear: string): ResolvedAtoFieldManifest {
  if (financialYear === ATO_2024_25_FIELD_MANIFEST.financialYear) {
    return {
      manifest: ATO_2024_25_FIELD_MANIFEST,
      requestedFinancialYear: financialYear,
      status: 'exact',
      notice: 'Mapped to the published Tax return for individuals 2025 instructions.'
    };
  }

  const isLaterYear = financialYear.localeCompare(ATO_2024_25_FIELD_MANIFEST.financialYear) > 0;
  return {
    manifest: ATO_2024_25_FIELD_MANIFEST,
    requestedFinancialYear: financialYear,
    status: isLaterYear ? 'estimated' : 'unsupported',
    notice: isLaterYear
      ? `This release uses the published 2024–25 return as a reference checklist for ${financialYear}. Confirm every field in myTax because labels and rules can change by year.`
      : `The ${financialYear} return is not mapped in this release. These fields are a later-year reference only; use the instructions for that income year.`
  };
}

export function detectAtoFields(financialYear: AustralianFinancialYear): Set<string> {
  const detected = new Set<string>();
  const incomeCategories = new Set(financialYear.income.map((item) => item.category));
  const deductionCategories = new Set(financialYear.deductions.map((item) => item.category));

  for (const group of ATO_2024_25_FIELD_MANIFEST.groups) {
    for (const field of group.fields) {
      if (field.incomeCategories?.some((category) => incomeCategories.has(category))) detected.add(field.id);
      if (field.deductionCategories?.some((category) => deductionCategories.has(category))) detected.add(field.id);
    }
  }

  if (financialYear.studyLoans) detected.add('PROFILE_STUDY_LOAN');
  if (financialYear.documents.some((document) => document.fileType === 'health_insurance')) {
    detected.add('PROFILE_PRIVATE_HEALTH');
    detected.add('PHI');
  }

  return detected;
}
