import React from 'react';
import { CheckCircle, AlertTriangle, FileText, ShieldCheck } from 'lucide-react';
import type { ExtractedValue } from '../../types/tax';
import { Modal } from '../common/Modal';

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
  if (!extractedValue) return null;
  const confidencePercent = Math.round(extractedValue.confidence * 100);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Data provenance inspector"
      subtitle={fieldName}
      icon={<ShieldCheck className="h-4 w-4" />}
      size="md"
      footer={
        <div className="flex items-center justify-between gap-3">
          <span className="font-mono text-[11px] text-zinc-500">
            Local source verification
          </span>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-zinc-800 px-3 py-1.5 font-mono text-xs text-zinc-200 hover:bg-zinc-700"
          >
            Close
          </button>
        </div>
      }
    >
      <div className="space-y-6 text-sm">
        <div className="space-y-2 rounded-xl border border-zinc-800/80 bg-zinc-950 p-4">
          <span className="font-mono text-xs uppercase tracking-wider text-zinc-500">
            Target field
          </span>
          <div className="text-base font-medium text-zinc-200">{fieldName}</div>
          <div className="font-mono text-2xl font-bold text-emerald-400">
            {typeof extractedValue.value === 'number'
              ? `$${extractedValue.value.toLocaleString()}`
              : String(extractedValue.value)}
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-zinc-400">Extraction confidence</span>
            <span className="font-mono font-semibold text-emerald-400">
              {confidencePercent}%
            </span>
          </div>
          <div
            className="h-2 w-full overflow-hidden rounded-full bg-zinc-800"
            role="progressbar"
            aria-label="Extraction confidence"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={confidencePercent}
          >
            <div
              className="h-full rounded-full bg-emerald-500"
              style={{ width: `${confidencePercent}%` }}
            />
          </div>
        </div>

        <div className="space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
            Source document
          </h3>
          <div className="flex items-start gap-3 rounded-lg border border-zinc-800 bg-zinc-950/60 p-3">
            <FileText className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" />
            <div className="min-w-0 space-y-1">
              <p className="truncate font-medium text-zinc-200">
                {extractedValue.sourceDocumentName}
              </p>
              <div className="flex flex-wrap items-center gap-3 font-mono text-xs text-zinc-400">
                <span>Doc ID: {extractedValue.sourceDocumentId}</span>
                {extractedValue.sourcePage && <span>Page: {extractedValue.sourcePage}</span>}
              </div>
            </div>
          </div>
        </div>

        {extractedValue.sourceText && (
          <div className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Extracted citation
            </h3>
            <blockquote className="whitespace-pre-wrap rounded-lg border border-zinc-800/80 bg-zinc-950 p-3 font-mono text-xs leading-relaxed text-zinc-300">
              “{extractedValue.sourceText}”
            </blockquote>
          </div>
        )}

        <div className="flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-950/40 p-3 text-xs">
          {extractedValue.manuallyConfirmed ? (
            <CheckCircle className="h-4 w-4 text-emerald-400" />
          ) : (
            <AlertTriangle className="h-4 w-4 text-amber-400" />
          )}
          <span className="text-zinc-300">
            {extractedValue.manuallyConfirmed
              ? 'Confirmed by the user'
              : 'Not manually confirmed'}
          </span>
        </div>
      </div>
    </Modal>
  );
};
