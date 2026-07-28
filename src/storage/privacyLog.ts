import type { PrivacyNetworkLog } from '../types/tax';

let activeLogs: PrivacyNetworkLog[] = [
  {
    id: 'log-001',
    timestamp: new Date().toISOString(),
    destination: 'Local Rule-Based Parser (Offline)',
    purpose: 'Document OCR & structured extraction',
    payloadRedacted: true,
    status: 'offline_local',
    bytesSent: 0
  }
];

/**
 * Security & Privacy Audit Finding Implementation:
 * Automatically redacts sensitive Australian Tax File Numbers (TFN), Medicare Card numbers,
 * and Bank Account Details before logging or sending to optional AI LLM adapters.
 */
export function redactSensitiveData(text: string): string {
  if (!text) return text;
  let result = text;

  // A labelled TFN may be eight or nine digits. Eight unlabelled digits are
  // deliberately left alone because they are commonly amounts or references.
  result = result.replace(
    /\b((?:Tax File Number|TFN)\s*[:#-]?\s*)\d(?:[\s-]?\d){7,8}\b/gi,
    '$1*** *** ***'
  );

  // Retain protection for the common formatted nine-digit TFN shape.
  result = result.replace(/\b\d{3}[\s-]?\d{3}[\s-]?\d{3}\b/g, '*** *** ***');

  // Medicare card numbers have ten digits; the optional IRN may be labelled
  // separately and is not needed for tax analysis.
  result = result.replace(
    /\b(Medicare(?: card)?(?: number| no)?\s*[:#-]?\s*)\d(?:[\s-]?\d){9}\b/gi,
    '$1**** ***** *'
  );
  result = result.replace(/\b\d{4}[\s-]?\d{5}[\s-]?\d{1}\b/g, '**** ***** *');

  // Redact BSB numbers. Only separated (123-456 / 123 456) or explicitly
  // labelled BSBs are matched - an unseparated 6-digit run is far more likely
  // to be a dollar amount or a reference number, and blanking those corrupts
  // the figures the parser is about to read.
  result = result.replace(/\bBSB[:\s]*\d{3}[\s-]?\d{3}\b/gi, 'BSB ***-***');
  result = result.replace(/\b\d{3}[\s-]\d{3}\b/g, '***-***');

  // Account numbers vary in length, so only redact them when explicitly
  // labelled. This avoids blanking ordinary dollar amounts and references.
  result = result.replace(
    /\b((?:Bank )?(?:Account|Acct)(?: number| no)?\s*[:#-]?\s*)\d(?:[\s-]?\d){5,11}\b/gi,
    '$1********'
  );

  return result;
}

export function maskTFN(text: string): string {
  return redactSensitiveData(text);
}

export function logNetworkActivity(
  destination: string,
  purpose: string,
  status: 'allowed' | 'blocked' | 'offline_local' = 'offline_local',
  bytesSent: number = 0,
  // Whether the payload actually went through redactSensitiveData(). Callers
  // that ship an original file (e.g. a PDF sent to an AI provider) must pass
  // false - the monitor is worthless if every row claims to be redacted.
  payloadRedacted: boolean = true
): PrivacyNetworkLog {
  const newLog: PrivacyNetworkLog = {
    id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: new Date().toISOString(),
    destination: redactSensitiveData(destination),
    purpose: redactSensitiveData(purpose),
    payloadRedacted,
    status,
    bytesSent
  };
  activeLogs = [newLog, ...activeLogs];
  return newLog;
}

export function getNetworkLogs(): PrivacyNetworkLog[] {
  return activeLogs;
}

export function clearAllNetworkLogs(): void {
  activeLogs = [];
}
