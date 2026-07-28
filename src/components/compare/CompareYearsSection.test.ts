import { describe, expect, it } from 'vitest';
import { describeObservedChange } from '../../lib/compareYears';

describe('describeObservedChange', () => {
  it('describes increases, decreases, unchanged values, and zero baselines', () => {
    expect(describeObservedChange('Gross income', 100, 125)).toContain(
      'increased by $25 (25.0%)'
    );
    expect(describeObservedChange('HELP repayment', 100, 75)).toContain(
      'decreased by $25 (25.0%)'
    );
    expect(describeObservedChange('Deductions', 100, 100)).toContain('unchanged');
    expect(describeObservedChange('Employer super', 0, 500)).toBe(
      'Employer super increased by $500, from $0 to $500.'
    );
  });

  it('does not invent a cause', () => {
    const description = describeObservedChange('Deductions', 100, 200);
    expect(description).not.toMatch(/laptop|allowance|salary|education|cause/i);
  });
});
