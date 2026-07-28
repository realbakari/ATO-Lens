import { describe, expect, it } from 'vitest';
import { resolveAtoFieldManifest } from '../data/atoFieldManifest';
import { createBlankFinancialYear } from '../data/blankFinancialYear';
import type { TaxCopilotState } from '../types/tax';
import {
  buildTaxPrepSummary,
  createEmptyTaxCopilotState,
  evaluateTaxCopilotReadiness
} from './taxCopilotReadiness';

function completedState(): TaxCopilotState {
  return {
    situation: {
      residency: 'full_year',
      under18: 'no',
      hasSpouse: 'no',
      hasDependants: 'no',
      hasPrivateHealthInsurance: 'no',
      hasStudyLoan: 'no',
      hasCapitalGains: 'no',
      hasRentalProperty: 'no',
      hasForeignIncomeOrAssets: 'no',
      hasBusinessOrPsi: 'no',
      hasTrustOrPartnershipIncome: 'no',
      isDeceasedEstate: 'no'
    },
    checks: {
      incomeStatementsTaxReady: 'done',
      prefillReviewed: 'done',
      deductionsReviewed: 'done',
      evidenceReviewed: 'not_applicable',
      medicareAndIncomeTestsReviewed: 'done'
    },
    fieldStatuses: {},
    handoffChoice: 'mytax'
  };
}

describe('tax copilot readiness', () => {
  const financialYear = createBlankFinancialYear(
    '2024-25',
    '2024–25',
    '2024-07-01',
    '2025-06-30'
  );

  it('starts without claiming the return is ready', () => {
    const result = evaluateTaxCopilotReadiness(financialYear, createEmptyTaxCopilotState());
    expect(result.status).toBe('not_started');
    expect(result.label).toBe('Not started');
    expect(result.completedSteps).toBe(0);
  });

  it('reports readiness only for review in myTax', () => {
    const result = evaluateTaxCopilotReadiness(financialYear, completedState());
    expect(result.status).toBe('ready_to_review_in_mytax');
    expect(result.label).toBe('Ready to review in myTax');
    expect(result.completedSteps).toBe(result.totalSteps);
    expect(result.description).toContain('not approval to lodge');
  });

  it('recommends agent review for complex circumstances', () => {
    const state = completedState();
    state.situation.hasForeignIncomeOrAssets = 'yes';
    const result = evaluateTaxCopilotReadiness(financialYear, state);
    expect(result.status).toBe('agent_recommended');
    expect(result.agentReasons).toContain('Foreign income, assets or residency questions');
  });

  it('waits when an income statement is not tax ready', () => {
    const state = completedState();
    state.checks.incomeStatementsTaxReady = 'not_yet';
    const result = evaluateTaxCopilotReadiness(financialYear, state);
    expect(result.status).toBe('waiting_for_tax_ready');
  });

  it('exports a preparation summary without sensitive identity fields', () => {
    const summary = buildTaxPrepSummary(financialYear, completedState());
    expect(summary).toContain('Review and lodge only through myTax');
    expect(summary).toContain('intentionally excludes TFNs');
    expect(summary).not.toContain('account number:');
    expect(summary).not.toContain('myGov password:');
  });
});

describe('ATO field manifest versioning', () => {
  it('uses exact metadata only for the mapped financial year', () => {
    expect(resolveAtoFieldManifest('2024-25').status).toBe('exact');
    expect(resolveAtoFieldManifest('2025-26').status).toBe('estimated');
    expect(resolveAtoFieldManifest('2023-24').status).toBe('unsupported');
  });

  it('contains every numbered income and deduction question', () => {
    const manifest = resolveAtoFieldManifest('2024-25').manifest;
    const income = manifest.groups.find((group) => group.id === 'income');
    const deductions = manifest.groups.find((group) => group.id === 'deductions');
    expect(income?.fields).toHaveLength(24);
    expect(deductions?.fields).toHaveLength(15);
  });
});
