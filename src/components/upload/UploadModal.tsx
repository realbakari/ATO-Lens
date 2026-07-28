import React, { useRef, useState } from 'react';
import { UploadCloud, FileText, KeyRound, AlertTriangle, Check } from 'lucide-react';
import type { DocumentType } from '../../types/tax';
import type { ParsedDocumentResult } from '../../parser/providerAdapter';
import { getDocumentParser, isMissingApiKey, type ParserProviderId } from '../../parser/providerFactory';
import { BrailleSpinner } from '../common/BrailleSpinner';
import { Modal, SectionLabel } from '../common/Modal';
import { buildSampleDocumentText } from './sampleDocumentText';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDocumentParsed: (
    documentName: string,
    fileSize: number,
    parsedBy: ParserProviderId,
    result: ParsedDocumentResult
  ) => void;
  onOpenApiKeyModal?: () => void;
}

const DOC_TYPES: { id: DocumentType; label: string }[] = [
  { id: 'notice_of_assessment', label: 'Notice of assessment' },
  { id: 'tax_return', label: 'Individual tax return' },
  { id: 'income_statement', label: 'Income statement / STP' },
  { id: 'payslip', label: 'Employer payslip' },
  { id: 'super_statement', label: 'Super fund statement' },
  { id: 'help_statement', label: 'HELP / study loan statement' },
  { id: 'deduction_receipt', label: 'Deduction receipt' }
];

const PROVIDERS: { id: ParserProviderId; label: string; sub: string }[] = [
  { id: 'rule_based', label: 'Offline', sub: 'No network' },
  { id: 'claude', label: 'Claude', sub: 'Anthropic' },
  { id: 'openai', label: 'GPT-4o', sub: 'OpenAI' },
  { id: 'gemini', label: 'Gemini', sub: 'Google' },
  { id: 'ollama', label: 'Ollama', sub: 'Self-hosted' }
];

export const UploadModal: React.FC<UploadModalProps> = ({
  isOpen,
  onClose,
  onDocumentParsed,
  onOpenApiKeyModal
}) => {
  const [selectedProvider, setSelectedProvider] = useState<ParserProviderId>('rule_based');
  const [docType, setDocType] = useState<DocumentType>('notice_of_assessment');
  const [isProcessing, setIsProcessing] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [progress, setProgress] = useState<{ stage: string; percent?: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const needsApiKey = isMissingApiKey(selectedProvider);

  const runUpload = async (file: File | { name: string; buffer: ArrayBuffer }) => {
    setErrorMessage(null);
    setProgress(null);
    setIsProcessing(true);
    try {
      const fileName = file.name;
      const buffer = file instanceof File ? await file.arrayBuffer() : file.buffer;
      // Captured before parsing: a parser may transfer the buffer away.
      const fileSize = buffer.byteLength;
      const parser = getDocumentParser(selectedProvider);
      const result = await parser.parseDocument(buffer, fileName, docType, (stage, percent) =>
        setProgress({ stage, percent })
      );

      if (Object.keys(result.extractedFields).length === 0) {
        setErrorMessage(
          'No tax figures could be read from this file, so nothing was added. Check the document type selected above, or try an AI adapter if the scan is unusually faint.'
        );
        return;
      }

      onDocumentParsed(fileName, fileSize, selectedProvider, result);
      onClose();
    } catch (err) {
      console.error('[ATO Lens] Document parsing failed:', err);
      setErrorMessage('Could not parse this document. The offline parser may handle it - try switching adapters.');
    } finally {
      setIsProcessing(false);
      setProgress(null);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Upload a tax document"
      subtitle="Parsed on this machine unless you pick an AI adapter"
      icon={<UploadCloud className="h-4 w-4" />}
      size="md"
      footer={
        <div className="flex items-center justify-between gap-3">
          <span className="font-mono text-[11px] text-zinc-500">
            {selectedProvider === 'rule_based' || selectedProvider === 'ollama'
              ? 'No data leaves this machine'
              : 'The original PDF is uploaded to the provider'}
          </span>
          <button
            type="button"
            onClick={() =>
              runUpload({
                name: `sample-${docType}.txt`,
                buffer: new TextEncoder().encode(buildSampleDocumentText(docType)).buffer as ArrayBuffer
              })
            }
            disabled={isProcessing}
            className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 font-mono text-xs text-zinc-200 transition-colors hover:bg-zinc-700 disabled:opacity-40"
          >
            Try a sample document
          </button>
        </div>
      }
    >
      <div className="space-y-5">
        <section>
          <label
            htmlFor="upload-document-type"
            className="mb-2 block font-mono text-[10px] font-semibold uppercase tracking-wider text-zinc-500"
          >
            Document type
          </label>
          <select
            id="upload-document-type"
            value={docType}
            onChange={(e) => setDocType(e.target.value as DocumentType)}
            className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2.5 font-mono text-xs text-zinc-100 transition-colors focus:border-emerald-500/60 focus:outline-none"
          >
            {DOC_TYPES.map((type) => (
              <option key={type.id} value={type.id}>
                {type.label}
              </option>
            ))}
          </select>
        </section>

        <section>
          <SectionLabel>Parser</SectionLabel>
          <div
            className="grid grid-cols-2 gap-1.5 sm:grid-cols-5"
            role="radiogroup"
            aria-label="Document parser"
          >
            {PROVIDERS.map((provider) => {
              const isActive = selectedProvider === provider.id;
              const missingKey = isMissingApiKey(provider.id);
              return (
                <button
                  key={provider.id}
                  type="button"
                  role="radio"
                  aria-checked={isActive}
                  onClick={() => {
                    setSelectedProvider(provider.id);
                    setErrorMessage(null);
                  }}
                  className={`rounded-lg border px-2 py-2 text-center transition-colors ${
                    isActive
                      ? 'border-blue-500/50 bg-blue-500/10'
                      : 'border-zinc-800 bg-zinc-950 hover:border-zinc-700'
                  }`}
                >
                  <div
                    className={`truncate font-mono text-[11px] font-semibold ${
                      isActive ? 'text-blue-300' : 'text-zinc-300'
                    }`}
                  >
                    {provider.label}
                  </div>
                  <div className="mt-0.5 flex items-center justify-center gap-1 text-[10px] text-zinc-500">
                    {!missingKey && provider.id !== 'rule_based' && provider.id !== 'ollama' && (
                      <Check className="h-2.5 w-2.5 text-emerald-400" />
                    )}
                    <span className="truncate">{provider.sub}</span>
                  </div>
                </button>
              );
            })}
          </div>

          {needsApiKey && (
            <div className="mt-2 flex items-center justify-between gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-200">
              <span className="flex items-center gap-2">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                No key set - this upload will use the offline parser instead.
              </span>
              {onOpenApiKeyModal && (
                <button
                  type="button"
                  onClick={onOpenApiKeyModal}
                  className="flex shrink-0 items-center gap-1 rounded-lg bg-amber-500/20 px-2.5 py-1 font-semibold text-amber-100 transition-colors hover:bg-amber-500/30"
                >
                  <KeyRound className="h-3 w-3" />
                  Add key
                </button>
              )}
            </div>
          )}
        </section>

        <input
          id="tax-document-file"
          ref={fileInputRef}
          type="file"
          accept="application/pdf,.pdf,.txt"
          className="sr-only"
          aria-label="Choose a tax document"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void runUpload(file);
            e.target.value = '';
          }}
        />
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            const file = e.dataTransfer.files?.[0];
            if (file) void runUpload(file);
          }}
          className={`rounded-xl border-2 border-dashed transition-colors ${
            dragOver ? 'border-blue-500 bg-blue-500/10' : 'border-white/10 bg-white/[0.02]'
          }`}
        >
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isProcessing}
            className="w-full cursor-pointer rounded-[10px] px-6 py-8 text-center transition-colors hover:bg-zinc-900/50 disabled:cursor-wait"
          >
            {isProcessing ? (
              <div className="space-y-2.5" role="status" aria-live="polite">
                <BrailleSpinner className="block h-7 text-center font-mono text-2xl leading-none text-blue-400" />
                <p className="font-mono text-xs font-medium text-blue-400">
                  {progress?.stage ?? 'Reading tax fields'}…
                </p>
                {progress?.percent !== undefined && (
                  <div className="mx-auto h-1 w-40 overflow-hidden rounded-full bg-zinc-800">
                    <div
                      className="h-full bg-blue-500 transition-[width] duration-200"
                      style={{ width: `${Math.min(100, Math.round(progress.percent))}%` }}
                    />
                  </div>
                )}
                <p className="text-[11px] text-zinc-500">Runs on this machine</p>
              </div>
            ) : (
              <div className="space-y-2">
                <FileText className="mx-auto h-7 w-7 text-zinc-600" />
                <p className="text-xs font-medium text-zinc-200">Drop a file here, or choose a file</p>
                <p className="text-[11px] text-zinc-500">
                  Text PDFs are read directly; scans go through on-device text recognition.
                </p>
              </div>
            )}
          </button>
        </div>

        {errorMessage && (
          <div
            role="alert"
            className="flex gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2.5 text-[11px] leading-relaxed text-rose-300"
          >
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}
      </div>
    </Modal>
  );
};
