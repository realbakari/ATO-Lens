import React, { useState } from 'react';
import { X, Download, FileSpreadsheet, FileText, Check } from 'lucide-react';
import type { AustralianFinancialYear } from '../../types/tax';
import { exportFinancialYearJSON, exportFinancialYearCSV } from '../../storage/db';

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

  if (!isOpen) return null;

  const handleExportCSV = () => {
    exportFinancialYearCSV(financialYears);
    setDownloadedFormat('CSV Spreadsheet (.csv)');
    setTimeout(() => setDownloadedFormat(null), 2500);
  };

  const handleExportJSON = () => {
    exportFinancialYearJSON(financialYears);
    setDownloadedFormat('Structured Backup (.json)');
    setTimeout(() => setDownloadedFormat(null), 2500);
  };

  return (
    <div className="dialog-backdrop fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="dialog-popup w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden font-mono text-xs">
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/80">
          <div className="flex items-center gap-2">
            <Download className="w-5 h-5 text-emerald-400" />
            <h3 className="font-bold text-zinc-100 text-sm">Export Tax Summary for Accountant</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-zinc-800 text-zinc-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          <p className="text-zinc-300 font-sans leading-relaxed">
            Download your parsed Australian financial history formatted specifically for registered Tax Agents and Accountants.
          </p>

          <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800 space-y-1">
            <div className="font-bold text-zinc-200">Selected Financial Year:</div>
            <div className="text-emerald-400 font-semibold">{selectedFy.label} ({financialYears.length} total years included)</div>
            <div className="text-[11px] text-zinc-400 font-sans">
              Includes gross salary, PAYG tax withheld, 12% SG super contributions, work deductions, and HELP loan indexation.
            </div>
          </div>

          {downloadedFormat && (
            <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-400" />
              <span>Downloaded {downloadedFormat}!</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <button
              onClick={handleExportCSV}
              className="p-3 rounded-xl bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 hover:border-emerald-500/40 text-left transition-colors space-y-1 group"
            >
              <FileSpreadsheet className="w-5 h-5 text-emerald-400 group-hover:scale-110 transition-transform" />
              <div className="font-bold text-zinc-200">Export CSV</div>
              <div className="text-[10px] text-zinc-500 font-sans">Excel & Sheets format</div>
            </button>

            <button
              onClick={handleExportJSON}
              className="p-3 rounded-xl bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 hover:border-emerald-500/40 text-left transition-colors space-y-1 group"
            >
              <FileText className="w-5 h-5 text-emerald-400 group-hover:scale-110 transition-transform" />
              <div className="font-bold text-zinc-200">Export JSON</div>
              <div className="text-[10px] text-zinc-500 font-sans">Full raw data backup</div>
            </button>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-semibold"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
