import { describe, expect, it } from 'vitest';
import type { ExtractedValue, SuperContribution } from '../types/tax';
import {
  auditSuperGuarantee,
  expectedSuperAmount,
  getSuperGuaranteeRule
} from './superGuaranteeAudit';

const extracted = <T>(value: T): ExtractedValue<T> => ({
  value,
  confidence: 1,
  sourceDocumentId: 'doc-test',
  sourceDocumentName: 'synthetic-super.txt',
  manuallyConfirmed: false
});

const contribution = (recordedAmount: number): SuperContribution => ({
  id: 'sg-test',
  employerName: extracted('Example Employer'),
  fundName: extracted('Example Fund'),
  periodStart: '2024-07-01',
  periodEnd: '2024-09-30',
  payDate: extracted('2024-10-01'),
  qualifyingEarnings: extracted(10_000),
  sgPercentage: 12,
  expectedAmount: 1_200,
  recordedAmount: extracted(recordedAmount),
  type: 'employer_sg',
  isPaid: true
});

describe('Super Guarantee rules and audit', () => {
  it('resolves the ATO rate by financial year', () => {
    expect(getSuperGuaranteeRule('2024–25').rate).toBe(11.5);
    expect(getSuperGuaranteeRule('2025-26').rate).toBe(12);
    expect(expectedSuperAmount(contribution(1_150), '2024-25')).toBe(1_150);
    expect(expectedSuperAmount(contribution(1_200), '2025-26')).toBe(1_200);
  });

  it('reports no data rather than 100% compliance', () => {
    const report = auditSuperGuarantee([], '2025-26');

    expect(report.status).toBe('no_data');
    expect(report.complianceRate).toBeNull();
  });

  it('distinguishes compliant records and shortfalls', () => {
    expect(auditSuperGuarantee([contribution(1_150)], '2024-25').status).toBe(
      'compliant'
    );
    const shortfall = auditSuperGuarantee([contribution(1_000)], '2024-25');
    expect(shortfall.status).toBe('shortfall');
    expect(shortfall.varianceAmount).toBe(-150);
    expect(shortfall.alerts).toHaveLength(1);
  });
});
