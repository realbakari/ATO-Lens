import React, { useState } from 'react';
import { Key, Check, Trash2, Eye, EyeOff, AlertTriangle } from 'lucide-react';
import { AI_PROVIDER_LABELS, getApiKey, setApiKey, type AiProviderId } from '../../lib/apiKeys';
import { Modal, SectionLabel } from '../common/Modal';

interface ApiKeySetupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PROVIDERS: {
  id: AiProviderId;
  tabLabel: string;
  placeholder: string;
  helpText: string;
  destination: string;
}[] = [
  {
    id: 'claude',
    tabLabel: 'Anthropic',
    placeholder: 'sk-ant-api03-…',
    helpText: 'Claude Sonnet - document extraction and chat.',
    destination: 'api.anthropic.com'
  },
  {
    id: 'openai',
    tabLabel: 'OpenAI',
    placeholder: 'sk-proj-…',
    helpText: 'GPT-4o - document extraction and chat.',
    destination: 'api.openai.com'
  },
  {
    id: 'gemini',
    tabLabel: 'Gemini',
    placeholder: 'AIza…',
    helpText: 'Gemini 1.5 Pro - document extraction and chat.',
    destination: 'generativelanguage.googleapis.com'
  }
];

export const ApiKeySetupModal: React.FC<ApiKeySetupModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<AiProviderId>('claude');
  const [draftKeys, setDraftKeys] = useState<Record<AiProviderId, string>>({
    claude: getApiKey('claude'),
    openai: getApiKey('openai'),
    gemini: getApiKey('gemini')
  });
  const [isRevealed, setIsRevealed] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const activeProvider = PROVIDERS.find((p) => p.id === activeTab)!;
  const isConfigured = (id: AiProviderId) => draftKeys[id].trim().length > 0;
  const isDirty = draftKeys[activeTab].trim() !== getApiKey(activeTab);

  const handleSave = () => {
    setApiKey(activeTab, draftKeys[activeTab]);
    setStatusMessage(
      draftKeys[activeTab].trim()
        ? `${AI_PROVIDER_LABELS[activeTab]} key saved to this browser.`
        : `${AI_PROVIDER_LABELS[activeTab]} key removed - that provider falls back to the offline parser.`
    );
  };

  const handleRemove = () => {
    setApiKey(activeTab, '');
    setDraftKeys((prev) => ({ ...prev, [activeTab]: '' }));
    setStatusMessage(`${AI_PROVIDER_LABELS[activeTab]} key removed.`);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="AI provider keys"
      subtitle="Optional - document parsing works offline without them"
      icon={<Key className="h-4 w-4" />}
      size="md"
      footer={
        <div className="flex items-center justify-between gap-2">
          {isConfigured(activeTab) ? (
            <button
              type="button"
              onClick={handleRemove}
              className="flex items-center gap-1.5 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 font-mono text-xs text-rose-300 transition-colors hover:bg-rose-500/20"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Remove
            </button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 font-mono text-xs text-zinc-200 transition-colors hover:bg-zinc-700"
            >
              Done
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={!isDirty}
              className="rounded-lg bg-emerald-600 px-4 py-2 font-mono text-xs font-semibold text-white transition-colors hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-zinc-500"
            >
              Save key
            </button>
          </div>
        </div>
      }
    >
      <div className="space-y-5">
        <div className="flex gap-1 rounded-lg border border-zinc-800 bg-zinc-950 p-1">
          {PROVIDERS.map((provider) => (
            <button
              key={provider.id}
              onClick={() => {
                setActiveTab(provider.id);
                setStatusMessage(null);
                setIsRevealed(false);
              }}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1.5 font-mono text-xs transition-colors ${
                activeTab === provider.id
                  ? 'bg-zinc-800 text-zinc-100'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {isConfigured(provider.id) && <Check className="h-3 w-3 text-emerald-400" />}
              <span>{provider.tabLabel}</span>
            </button>
          ))}
        </div>

        <section>
          <SectionLabel>{AI_PROVIDER_LABELS[activeTab]} key</SectionLabel>
          <div className="relative">
            <input
              type={isRevealed ? 'text' : 'password'}
              value={draftKeys[activeTab]}
              onChange={(e) => {
                setDraftKeys((prev) => ({ ...prev, [activeTab]: e.target.value }));
                setStatusMessage(null);
              }}
              placeholder={activeProvider.placeholder}
              spellCheck={false}
              autoComplete="off"
              className="w-full rounded-lg border border-zinc-800 bg-zinc-950 py-2.5 pl-3 pr-10 font-mono text-xs text-zinc-100 transition-colors focus:border-emerald-500/60 focus:outline-none"
            />
            <button
              type="button"
              onClick={() => setIsRevealed(!isRevealed)}
              aria-label={isRevealed ? 'Hide key' : 'Show key'}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-zinc-500 transition-colors hover:text-zinc-300"
            >
              {isRevealed ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            </button>
          </div>
          <p className="mt-1.5 text-[11px] text-zinc-500">
            {activeProvider.helpText} Requests go straight to {activeProvider.destination}.
          </p>
        </section>

        {statusMessage && (
          <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2.5 font-mono text-xs text-emerald-300">
            <Check className="h-4 w-4 shrink-0 text-emerald-400" />
            <span>{statusMessage}</span>
          </div>
        )}

        <div className="flex gap-2.5 rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-[11px] leading-relaxed text-zinc-400">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-400" />
          <span>
            Keys are stored in this browser's local storage as plain text - anyone with access to this machine's
            profile can read them. Sending a document to a provider uploads the original file, which cannot be
            redacted beforehand.
          </span>
        </div>
      </div>
    </Modal>
  );
};
