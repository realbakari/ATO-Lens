import type {
  AustralianFinancialYear,
  EditableFigure,
  FigureOrigin
} from '../types/tax';
import { clearAllApiKeys } from '../lib/apiKeys';
import { clearAllNetworkLogs } from './privacyLog';

const REAL_DATA_KEY = 'ato_lens_financial_years_v1';
const SHOW_SAMPLE_KEY = 'ato_lens_show_sample_data';
const FIGURE_KEYS: EditableFigure[] = [
  'grossIncome',
  'taxableIncome',
  'taxWithheld',
  'totalDeductions',
  'medicareLevy',
  'helpRepayment',
  'assessmentResult',
  'employerSuper'
];

export function normaliseFinancialYear(fy: AustralianFinancialYear): AustralianFinancialYear {
  const origins: Partial<Record<EditableFigure, FigureOrigin>> = {
    ...(fy.figureOrigins ?? {})
  };

  for (const figure of FIGURE_KEYS) {
    if (fy.manualOverrides?.[figure]) {
      origins[figure] = 'manual';
    } else if (!origins[figure] && Number.isFinite(fy[figure]) && fy[figure] !== 0) {
      // Legacy non-zero values are preserved as authoritative. Older records
      // did not retain enough metadata to distinguish document values safely.
      origins[figure] = 'document';
    }
  }

  return {
    ...fy,
    figureOrigins: origins,
    income: fy.income ?? [],
    deductions: fy.deductions ?? [],
    superContributions: fy.superContributions ?? [],
    payslips: fy.payslips ?? [],
    documents: fy.documents ?? [],
    taxCopilot: fy.taxCopilot
      ? {
          ...fy.taxCopilot,
          situation: fy.taxCopilot.situation ?? {},
          checks: fy.taxCopilot.checks ?? {},
          fieldStatuses: fy.taxCopilot.fieldStatuses ?? {}
        }
      : undefined,
    alerts: fy.alerts ?? []
  };
}

/**
 * Real, user-uploaded financial year data. This is kept entirely separate
 * from the bundled sample/demo dataset - uploading a document never mutates
 * or merges with sample data.
 */
export function loadRealFinancialYears(): AustralianFinancialYear[] {
  try {
    const raw = localStorage.getItem(REAL_DATA_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const normalised = parsed.map((fy) => normaliseFinancialYear(fy as AustralianFinancialYear));
    const migrated = JSON.stringify(normalised);
    if (migrated !== raw) localStorage.setItem(REAL_DATA_KEY, migrated);
    return normalised;
  } catch (err) {
    console.error('Failed to load local tax data from localStorage:', err);
    return [];
  }
}

export function saveFinancialYears(data: AustralianFinancialYear[]): void {
  try {
    localStorage.setItem(REAL_DATA_KEY, JSON.stringify(data));
  } catch (err) {
    console.error('Failed to save local tax data:', err);
  }
}

export function hasRealFinancialData(): boolean {
  return loadRealFinancialYears().length > 0;
}

export function resetAllData(): void {
  localStorage.removeItem(REAL_DATA_KEY);
  localStorage.removeItem(SHOW_SAMPLE_KEY);
  // "Delete all local data" has to include the provider keys, or the wipe
  // leaves credentials behind in the same browser profile.
  clearAllApiKeys();
  clearAllNetworkLogs();
}

/** Whether the sample/demo dataset should currently be displayed. */
export function isSampleDataVisible(): boolean {
  try {
    const stored = localStorage.getItem(SHOW_SAMPLE_KEY);
    if (stored !== null) return stored === 'true';
  } catch {
    // Ignore storage errors
  }
  // Default to showing sample data until the user has uploaded something real.
  return !hasRealFinancialData();
}

export function setSampleDataVisible(visible: boolean): void {
  try {
    localStorage.setItem(SHOW_SAMPLE_KEY, String(visible));
  } catch {
    // Ignore storage errors
  }
}

export function exportDataAsJSON(data: AustralianFinancialYear[]): string {
  return JSON.stringify(data, null, 2);
}

export function exportDataAsCSV(fy: AustralianFinancialYear): string {
  const headers = ['Category', 'Description', 'Amount ($)', 'Tax Withheld ($)', 'Document Reference'];
  const rows: string[] = [headers.join(',')];

  fy.income.forEach((inc) => {
    rows.push(
      [
        `"Income: ${inc.category}"`,
        `"${inc.description.replace(/"/g, '""')}"`,
        inc.grossAmount.value,
        inc.taxWithheld.value,
        `"${inc.grossAmount.sourceDocumentName}"`
      ].join(',')
    );
  });

  fy.deductions.forEach((ded) => {
    rows.push(
      [
        `"Deduction: ${ded.category}"`,
        `"${ded.description.replace(/"/g, '""')}"`,
        ded.amount.value,
        0,
        `"${ded.amount.sourceDocumentName}"`
      ].join(',')
    );
  });

  return rows.join('\n');
}

export function exportFinancialYearJSON(data: AustralianFinancialYear[]): void {
  const blob = new Blob([exportDataAsJSON(data)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `ATO-Lens-Tax-History-Backup-${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportFinancialYearCSV(data: AustralianFinancialYear[]): void {
  const csvContent = data.map((fy) => `--- Financial Year ${fy.label} ---\n` + exportDataAsCSV(fy)).join('\n\n');
  const blob = new Blob([csvContent], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `ATO-Lens-Accountant-Tax-Summary-${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
