import React, { useState } from 'react';
import { Download, FileSpreadsheet, FileText, Check } from 'lucide-react';
import type { AustralianFinancialYear } from '../../types/tax';
import { exportFinancialYearJSON, exportFinancialYearCSV } from '../../storage/db';
import { getSuperGuaranteeRule } from '../../engine/superGuaranteeAudit';
import { Modal } from '../common/Modal';

interface ExportSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  financialYears: AustralianFinancialYear[];
  selectedFy: AustralianFinancialYear;
}

export const ExportSummaryModal: React.FC<ExportSummaryModalProps> = ({
  isOpen,
  onClose,
  financialYears,
  selectedFy
}) => {
  const [downloadedFormat, setDownloadedFormat] = useState<string | null>(null);
  const sgRate = getSuperGuaranteeRule(selectedFy.id).rate;

  const markDownloaded = (format: string) => {
    setDownloadedFormat(format);
    setTimeout(() => setDownloadedFormat(null), 2500);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Export tax summary for accountant"
      subtitle={`${selectedFy.label} · ${financialYears.length} financial ${
        financialYears.length === 1 ? 'year' : 'years'
      } included`}
      icon={<Download className="h-4 w-4" />}
      size="sm"
      footer={
        <div className="flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-zinc-800 px-4 py-2 font-mono text-xs font-semibold text-zinc-200 hover:bg-zinc-700"
          >
            Close
          </button>
        </div>
      }
    >
      <div className="space-y-4 font-mono text-xs">
        <p className="font-sans leading-relaxed text-zinc-300">
          Download the financial history currently loaded in ATO Lens for review by a registered tax agent or accountant.
        </p>

        <div className="space-y-1 rounded-lg border border-zinc-800 bg-zinc-950 p-3">
          <div className="font-bold text-zinc-200">Selected financial year</div>
          <div className="font-semibold text-emerald-400">{selectedFy.label}</div>
          <div className="font-sans text-[11px] text-zinc-400">
            Includes gross salary, PAYG tax withheld,{' '}
            {sgRate === null ? 'SG' : `${sgRate.toFixed(1)}% SG`} super contributions,
            work deductions, and HELP repayment figures.
          </div>
        </div>

        {downloadedFormat && (
          <div
            role="status"
            aria-live="polite"
            className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-emerald-300"
          >
            <Check className="h-4 w-4 text-emerald-400" />
            <span>Downloaded {downloadedFormat}</span>
          </div>
        )}

        <div className="grid grid-cols-1 gap-3 pt-2 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => {
              exportFinancialYearCSV(financialYears);
              markDownloaded('CSV spreadsheet');
            }}
            className="group space-y-1 rounded-xl border border-white/10 bg-white/[0.025] p-3 text-left transition-colors hover:border-blue-500/40 hover:bg-white/5"
          >
            <FileSpreadsheet className="h-5 w-5 text-blue-400 transition-transform group-hover:scale-110" />
            <div className="font-bold text-zinc-200">Export CSV</div>
            <div className="font-sans text-[10px] text-zinc-500">Excel and Sheets format</div>
          </button>

          <button
            type="button"
            onClick={() => {
              exportFinancialYearJSON(financialYears);
              markDownloaded('JSON backup');
            }}
            className="group space-y-1 rounded-xl border border-white/10 bg-white/[0.025] p-3 text-left transition-colors hover:border-blue-500/40 hover:bg-white/5"
          >
            <FileText className="h-5 w-5 text-blue-400 transition-transform group-hover:scale-110" />
            <div className="font-bold text-zinc-200">Export JSON</div>
            <div className="font-sans text-[10px] text-zinc-500">Structured local backup</div>
          </button>
        </div>
      </div>
    </Modal>
  );
};
