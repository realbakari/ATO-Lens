import { detectAtoFields, resolveAtoFieldManifest } from '../data/atoFieldManifest';
import type {
  AustralianFinancialYear,
  TaxCopilotCheckStatus,
  TaxCopilotState
} from '../types/tax';

export type TaxCopilotReadinessStatus =
  | 'not_started'
  | 'waiting_for_tax_ready'
  | 'needs_information'
  | 'needs_evidence'
  | 'ready_to_review_in_mytax'
  | 'agent_recommended';

export interface TaxCopilotReadinessStep {
  id: 'situation' | 'income' | 'deductions' | 'adjustments' | 'handoff';
  label: string;
  detail: string;
  complete: boolean;
}

export interface TaxCopilotReadiness {
  status: TaxCopilotReadinessStatus;
  label: string;
  description: string;
  completedSteps: number;
  totalSteps: number;
  steps: TaxCopilotReadinessStep[];
  blockers: string[];
  warnings: string[];
  agentReasons: string[];
}

const STATUS_LABELS: Record<TaxCopilotReadinessStatus, { label: string; description: string }> = {
  not_started: {
    label: 'Not started',
    description: 'Answer the situation questions to begin preparing for myTax.'
  },
  waiting_for_tax_ready: {
    label: 'Waiting for tax-ready information',
    description: 'Wait for relevant income statements to become tax ready before relying on them.'
  },
  needs_information: {
    label: 'Needs information',
    description: 'Complete the outstanding checks before reviewing the return in myTax.'
  },
  needs_evidence: {
    label: 'Needs evidence',
    description: 'Review how each deduction was calculated and which records support it.'
  },
  ready_to_review_in_mytax: {
    label: 'Ready to review in myTax',
    description: 'Use this checklist while reviewing the official return. This is not approval to lodge.'
  },
  agent_recommended: {
    label: 'Tax agent recommended',
    description: 'One or more circumstances may benefit from review by a registered tax agent.'
  }
};

function isDone(status: TaxCopilotCheckStatus | undefined, allowNotApplicable = false): boolean {
  return status === 'done' || (allowNotApplicable && status === 'not_applicable');
}

function hasAnswered(value: string | undefined): boolean {
  return value !== undefined && value !== 'unsure';
}

export function createEmptyTaxCopilotState(): TaxCopilotState {
  return {
    situation: {},
    checks: {},
    fieldStatuses: {},
    handoffChoice: 'undecided'
  };
}

export function evaluateTaxCopilotReadiness(
  financialYear: AustralianFinancialYear,
  state: TaxCopilotState = createEmptyTaxCopilotState()
): TaxCopilotReadiness {
  const { situation, checks } = state;
  const manifest = resolveAtoFieldManifest(financialYear.id);
  const detectedFields = detectAtoFields(financialYear);

  const situationComplete =
    hasAnswered(situation.residency) &&
    hasAnswered(situation.under18) &&
    hasAnswered(situation.hasSpouse) &&
    hasAnswered(situation.hasDependants) &&
    hasAnswered(situation.hasPrivateHealthInsurance) &&
    hasAnswered(situation.hasStudyLoan);
  const incomeComplete =
    isDone(checks.incomeStatementsTaxReady, true) &&
    isDone(checks.prefillReviewed);
  const deductionsComplete =
    isDone(checks.deductionsReviewed) &&
    isDone(checks.evidenceReviewed, true);
  const adjustmentsComplete = isDone(checks.medicareAndIncomeTestsReviewed);
  const handoffComplete =
    state.handoffChoice === 'mytax' || state.handoffChoice === 'tax_agent';

  const steps: TaxCopilotReadinessStep[] = [
    {
      id: 'situation',
      label: 'Your situation',
      detail: 'Residency, age, spouse, dependants, health cover and study loans',
      complete: situationComplete
    },
    {
      id: 'income',
      label: 'Income completeness',
      detail: 'Tax-ready statements and ATO pre-fill checked',
      complete: incomeComplete
    },
    {
      id: 'deductions',
      label: 'Deductions and evidence',
      detail: 'Claims, calculation methods and supporting records reviewed',
      complete: deductionsComplete
    },
    {
      id: 'adjustments',
      label: 'Medicare and income tests',
      detail: 'Private health, spouse and income-test amounts reviewed',
      complete: adjustmentsComplete
    },
    {
      id: 'handoff',
      label: 'Choose the official next step',
      detail: 'Continue in myTax or engage a registered tax agent',
      complete: handoffComplete
    }
  ];

  const agentReasons: string[] = [];
  if (situation.hasCapitalGains === 'yes') agentReasons.push('Capital gains or losses');
  if (situation.hasRentalProperty === 'yes') agentReasons.push('Rental property income or deductions');
  if (situation.hasForeignIncomeOrAssets === 'yes') agentReasons.push('Foreign income, assets or residency questions');
  if (situation.hasBusinessOrPsi === 'yes') agentReasons.push('Business or personal services income');
  if (situation.hasTrustOrPartnershipIncome === 'yes') agentReasons.push('Trust or partnership distributions');
  if (situation.isDeceasedEstate === 'yes') agentReasons.push('A deceased estate return');
  if (situation.residency === 'unsure') agentReasons.push('Uncertain tax residency');

  for (const group of manifest.manifest.groups) {
    for (const field of group.fields) {
      if (
        field.agentReviewRecommended &&
        (state.fieldStatuses[field.id] === 'confirmed' || detectedFields.has(field.id)) &&
        !agentReasons.includes(field.label)
      ) {
        agentReasons.push(field.label);
      }
    }
  }

  const blockers: string[] = [];
  if (!situationComplete) blockers.push('Complete the taxpayer situation questions.');
  if (!isDone(checks.incomeStatementsTaxReady, true)) {
    blockers.push('Confirm relevant income statements are tax ready, or mark this not applicable.');
  }
  if (!isDone(checks.prefillReviewed)) blockers.push('Review ATO pre-fill information in myTax.');
  if (!isDone(checks.deductionsReviewed)) blockers.push('Review all deductions, including any missing claims.');
  if (!isDone(checks.evidenceReviewed, true)) blockers.push('Review deduction records and calculation methods.');
  if (!isDone(checks.medicareAndIncomeTestsReviewed)) {
    blockers.push('Review Medicare, private health and income-test information.');
  }
  if (!handoffComplete) blockers.push('Choose myTax or a registered tax agent as the next step.');

  const warnings: string[] = [];
  if (manifest.status !== 'exact') warnings.push(manifest.notice);
  if (
    financialYear.deductions.some(
      (deduction) => !deduction.evidence && !deduction.hasReceipt
    )
  ) {
    warnings.push('Some deductions have neither a receipt nor calculation-method metadata recorded.');
  }
  warnings.push('ATO Lens estimates and checklists are not an ATO assessment and do not lodge a return.');

  const hasStarted =
    Object.keys(situation).length > 0 ||
    Object.keys(checks).length > 0 ||
    Object.keys(state.fieldStatuses).length > 0 ||
    state.handoffChoice === 'mytax' ||
    state.handoffChoice === 'tax_agent';

  let status: TaxCopilotReadinessStatus;
  if (!hasStarted) {
    status = 'not_started';
  } else if (agentReasons.length > 0) {
    status = 'agent_recommended';
  } else if (checks.incomeStatementsTaxReady === 'not_yet') {
    status = 'waiting_for_tax_ready';
  } else if (!situationComplete || !incomeComplete || !adjustmentsComplete || !handoffComplete) {
    status = 'needs_information';
  } else if (!deductionsComplete) {
    status = 'needs_evidence';
  } else {
    status = 'ready_to_review_in_mytax';
  }

  return {
    status,
    ...STATUS_LABELS[status],
    completedSteps: steps.filter((step) => step.complete).length,
    totalSteps: steps.length,
    steps,
    blockers,
    warnings,
    agentReasons
  };
}

export function buildTaxPrepSummary(
  financialYear: AustralianFinancialYear,
  state: TaxCopilotState
): string {
  const readiness = evaluateTaxCopilotReadiness(financialYear, state);
  const resolvedManifest = resolveAtoFieldManifest(financialYear.id);
  const confirmedFields = resolvedManifest.manifest.groups.flatMap((group) =>
    group.fields
      .filter((field) => state.fieldStatuses[field.id] === 'confirmed')
      .map((field) => `${field.atoCode} — ${field.label}`)
  );

  const lines = [
    `ATO Lens — Prepare for myTax summary`,
    `Financial year: ${financialYear.label}`,
    `Status: ${readiness.label}`,
    `Checklist progress: ${readiness.completedSteps}/${readiness.totalSteps}`,
    '',
    'Financial overview',
    `Gross income recorded: $${financialYear.grossIncome.toLocaleString('en-AU')}`,
    `Tax withheld recorded: $${financialYear.taxWithheld.toLocaleString('en-AU')}`,
    `Deductions recorded: $${financialYear.totalDeductions.toLocaleString('en-AU')}`,
    '',
    'Preparation checklist',
    ...readiness.steps.map((step) => `${step.complete ? '[x]' : '[ ]'} ${step.label} — ${step.detail}`),
    '',
    'Confirmed return fields',
    ...(confirmedFields.length > 0 ? confirmedFields : ['None confirmed in ATO Lens.']),
    '',
    'Outstanding items',
    ...(readiness.blockers.length > 0 ? readiness.blockers.map((blocker) => `- ${blocker}`) : ['None recorded.']),
    '',
    'Warnings',
    ...readiness.warnings.map((warning) => `- ${warning}`),
    '',
    'This local summary intentionally excludes TFNs, myGov credentials and refund bank details.',
    'Review and lodge only through myTax, or provide this preparation summary to a registered tax agent.'
  ];

  return lines.join('\n');
}
