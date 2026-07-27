import React, { useEffect, useState } from 'react';
import { ShieldCheck, Download, Trash2, FileSpreadsheet, Circle } from 'lucide-react';
import type { AustralianFinancialYear, PrivacyNetworkLog } from '../../types/tax';
import { getNetworkLogs } from '../../storage/privacyLog';
import { exportFinancialYearJSON, exportFinancialYearCSV, resetAllData } from '../../storage/db';
import { getConfiguredProviders } from '../../lib/apiKeys';
import { isElectron } from '../../lib/electron';
import { Modal, SectionLabel } from '../common/Modal';

interface PrivacyModalProps {
  isOpen: boolean;
  onClose: () => void;
  financialYears: AustralianFinancialYear[];
  onDataWiped: () => void;
}

const STATUS_STYLE: Record<PrivacyNetworkLog['status'], { dot: string; label: string }> = {
  offline_local: { dot: 'text-emerald-400', label: 'Local' },
  allowed: { dot: 'text-amber-400', label: 'External' },
  blocked: { dot: 'text-rose-400', label: 'Blocked' }
};

export const PrivacyModal: React.FC<PrivacyModalProps> = ({
  isOpen,
  onClose,
  financialYears,
  onDataWiped
}) => {
  const [logs, setLogs] = useState<PrivacyNetworkLog[]>([]);

  // The log is module state that parsers append to, so poll it while the
  // monitor is open rather than showing whatever existed at mount.
  useEffect(() => {
    if (!isOpen) return;
    setLogs(getNetworkLogs());
    const timer = setInterval(() => setLogs(getNetworkLogs()), 1000);
    return () => clearInterval(timer);
  }, [isOpen]);

  const localCount = logs.filter((log) => log.status === 'offline_local').length;
  const externalCount = logs.filter((log) => log.status === 'allowed').length;
  const configuredProviders = getConfiguredProviders();
  const yearCount = financialYears.length;

  const facts = [
    'No account, no server, no cloud database - documents and extracted values stay in this browser profile.',
    'Tax file numbers, Medicare numbers and BSBs are redacted before anything is logged or sent to an AI provider.',
    configuredProviders.length === 0
      ? 'No AI provider keys configured, so parsing runs entirely offline.'
      : `API keys are held in this browser's local storage as plain text (${configuredProviders.length} configured) and are sent only to that provider's own API.`,
    'Choosing an AI parser uploads the original PDF to that provider - the file itself cannot be redacted first.',
    ...(isElectron()
      ? [
          'The desktop app asks GitHub for the latest release version on startup. That is its only unprompted network request, it sends no tax data, and it can be turned off under Help → Check for Updates Automatically.'
        ]
      : [])
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Privacy & network activity"
      subtitle={`${yearCount} financial ${yearCount === 1 ? 'year' : 'years'} stored locally`}
      icon={<ShieldCheck className="h-4 w-4" />}
      size="lg"
      footer={
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => exportFinancialYearJSON(financialYears)}
              disabled={yearCount === 0}
              className="flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 font-mono text-xs font-medium text-zinc-200 transition-colors hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Export JSON</span>
            </button>
            <button
              onClick={() => exportFinancialYearCSV(financialYears)}
              disabled={yearCount === 0}
              className="flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 font-mono text-xs font-medium text-zinc-200 transition-colors hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-400" />
              <span>Export CSV</span>
            </button>
          </div>

          <button
            onClick={() => {
              if (
                confirm(
                  'Delete all local tax data, stored API keys and the activity log? This cannot be undone.'
                )
              ) {
                resetAllData();
                onDataWiped();
                onClose();
              }
            }}
            className="flex items-center gap-1.5 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 font-mono text-xs font-medium text-rose-300 transition-colors hover:bg-rose-500/20"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>Delete all local data</span>
          </button>
        </div>
      }
    >
      <div className="space-y-6">
        <section>
          <SectionLabel>How your data is handled</SectionLabel>
          <ul className="space-y-2">
            {facts.map((fact) => (
              <li key={fact} className="flex gap-2.5 text-xs leading-relaxed text-zinc-400">
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-zinc-600" />
                <span>{fact}</span>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <div className="mb-2 flex items-baseline justify-between gap-3">
            <SectionLabel>Network request log</SectionLabel>
            <span className="font-mono text-[11px] text-zinc-500">
              <span className="text-emerald-400">{localCount} local</span>
              {' · '}
              <span className={externalCount > 0 ? 'text-amber-400' : ''}>{externalCount} external</span>
            </span>
          </div>

          <div className="divide-y divide-zinc-800/70 overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950">
            {logs.length === 0 && (
              <p className="px-3.5 py-6 text-center text-xs text-zinc-600">No requests recorded yet.</p>
            )}
            {logs.map((log) => {
              const style = STATUS_STYLE[log.status];
              return (
                <div key={log.id} className="flex items-start justify-between gap-3 px-3.5 py-2.5">
                  <div className="flex min-w-0 gap-2.5">
                    <Circle className={`mt-1 h-2 w-2 shrink-0 fill-current ${style.dot}`} />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="truncate font-mono text-xs text-zinc-200">{log.destination}</span>
                        <span className="shrink-0 rounded border border-zinc-800 bg-zinc-900 px-1.5 py-0.5 font-mono text-[10px] text-zinc-400">
                          {style.label}
                        </span>
                      </div>
                      <p className="mt-0.5 truncate text-[11px] text-zinc-500">{log.purpose}</p>
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="font-mono text-[11px] text-zinc-500">
                      {log.timestamp.split('T')[1]?.slice(0, 8)}
                    </div>
                    <div className={`text-[10px] ${log.payloadRedacted ? 'text-zinc-600' : 'text-amber-400'}`}>
                      {log.payloadRedacted ? 'redacted' : 'raw file'}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </Modal>
  );
};
