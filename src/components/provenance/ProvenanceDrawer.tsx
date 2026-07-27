import React from 'react';
import { X, CheckCircle, AlertTriangle, FileText, ShieldCheck } from 'lucide-react';
import type { ExtractedValue } from '../../types/tax';

interface ProvenanceDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  fieldName: string;
  extractedValue?: ExtractedValue<any>;
}

export const ProvenanceDrawer: React.FC<ProvenanceDrawerProps> = ({
  isOpen,
  onClose,
  fieldName,
  extractedValue
}) => {
  if (!isOpen || !extractedValue) return null;

  const confidencePercent = Math.round(extractedValue.confidence * 100);

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-sm flex justify-end transition-opacity">
      <div className="drawer-slide-in w-full max-w-md bg-zinc-900 border-l border-zinc-800 h-full flex flex-col shadow-2xl">
        {/* Drawer Header */}
        <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/60">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <h3 className="font-semibold text-zinc-100 text-sm">Data Provenance Inspector</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Drawer Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-sm">
          {/* Field Overview */}
          <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800/80 space-y-2">
            <span className="text-xs uppercase tracking-wider text-zinc-500 font-mono">
              Target Field
            </span>
            <div className="text-base font-medium text-zinc-200">{fieldName}</div>
            <div className="text-2xl font-bold font-mono text-emerald-400">
              {typeof extractedValue.value === 'number'
                ? `$${extractedValue.value.toLocaleString()}`
                : String(extractedValue.value)}
            </div>
          </div>

          {/* AI Confidence Meter */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="text-zinc-400">Extraction Confidence</span>
              <span className="font-mono text-emerald-400 font-semibold">
                {confidencePercent}%
              </span>
            </div>
            <div className="w-full bg-zinc-800 rounded-full h-2 overflow-hidden">
              <div
                className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${confidencePercent}%` }}
              />
            </div>
          </div>

          {/* Source Document Reference */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase text-zinc-400 tracking-wider">
              Source Document
            </h4>
            <div className="flex items-start gap-3 p-3 rounded-lg bg-zinc-950/60 border border-zinc-800">
              <FileText className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <div className="space-y-1 overflow-hidden">
                <p className="font-medium text-zinc-200 truncate">
                  {extractedValue.sourceDocumentName}
                </p>
                <div className="flex items-center gap-3 text-xs text-zinc-400 font-mono">
                  <span>Doc ID: {extractedValue.sourceDocumentId}</span>
                  {extractedValue.sourcePage && <span>Page: {extractedValue.sourcePage}</span>}
                </div>
              </div>
            </div>
          </div>

          {/* Raw Text Snippet Citation */}
          {extractedValue.sourceText && (
            <div className="space-y-2">
              <h4 className="text-xs font-semibold uppercase text-zinc-400 tracking-wider">
                Raw Extracted Citation
              </h4>
              <div className="p-3 rounded-lg bg-zinc-950 font-mono text-xs text-zinc-300 border border-zinc-800/80 leading-relaxed whitespace-pre-wrap">
                "{extractedValue.sourceText}"
              </div>
            </div>
          )}

          {/* Manual Confirmation Status */}
          <div className="p-3 rounded-lg bg-zinc-950/40 border border-zinc-800 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs">
              {extractedValue.manuallyConfirmed ? (
                <CheckCircle className="w-4 h-4 text-emerald-400" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-amber-400" />
              )}
              <span className="text-zinc-300">
                {extractedValue.manuallyConfirmed
                  ? 'Confirmed by User'
                  : 'Extracted by AI Parser'}
              </span>
            </div>
            <button
              onClick={() => {
                extractedValue.manuallyConfirmed = !extractedValue.manuallyConfirmed;
                onClose();
              }}
              className="text-xs font-medium text-emerald-400 hover:text-emerald-300 underline"
            >
              {extractedValue.manuallyConfirmed ? 'Unconfirm' : 'Verify & Confirm'}
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-zinc-800 bg-zinc-950/80 text-xs text-zinc-500 text-center">
          ATO Lens Local Provenance Verification Engine
        </div>
      </div>
    </div>
  );
};
