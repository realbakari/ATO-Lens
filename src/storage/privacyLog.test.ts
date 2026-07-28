import { describe, expect, it } from 'vitest';
import {
  clearAllNetworkLogs,
  getNetworkLogs,
  logNetworkActivity,
  redactSensitiveData
} from './privacyLog';

describe('redactSensitiveData', () => {
  it('redacts labelled Australian identifiers', () => {
    const text =
      'TFN: 123 456 789; Tax File Number 12 345 678; Medicare number 1234 56789 1; BSB 123-456; Account number 12345678';
    const redacted = redactSensitiveData(text);

    expect(redacted).not.toMatch(/123 456 789|12 345 678|1234 56789 1|123-456|12345678/);
    expect(redacted).toContain('TFN: *** *** ***');
    expect(redacted).toContain('BSB ***-***');
  });

  it('preserves ordinary tax figures and unlabelled eight-digit references', () => {
    const text = 'Financial year 2025-26, income $96,420.50, rate 12.0%, reference 12345678';
    expect(redactSensitiveData(text)).toBe(text);
  });

  it('redacts sensitive filenames before they enter the activity log', () => {
    clearAllNetworkLogs();
    logNetworkActivity(
      'Local',
      'Parsed TFN 123 456 789 assessment.pdf locally',
      'offline_local'
    );
    expect(getNetworkLogs()[0].purpose).not.toContain('123 456 789');
  });
});
