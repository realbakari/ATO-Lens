import React, { useState } from 'react';
import { ShieldCheck, MessageSquare, Menu, FilePlus, Key, HelpCircle, Trash2, Eye, EyeOff } from 'lucide-react';
import type { AustralianFinancialYear } from '../../types/tax';
import { isMacElectron } from '../../lib/electron';

interface NavbarProps {
  financialYears: AustralianFinancialYear[];
  selectedFyId: string;
  onSelectFy: (id: string) => void;
  onOpenUpload: () => void;
  onToggleChat: () => void;
  onOpenPrivacy: () => void;
  onOpenApiKeyModal?: () => void;
  onOpenFaqModal?: () => void;
  isChatOpen: boolean;
  showSampleData?: boolean;
  onToggleSampleData?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  financialYears,
  selectedFyId,
  onSelectFy,
  onOpenUpload,
  onToggleChat,
  onOpenPrivacy,
  onOpenApiKeyModal,
  onOpenFaqModal,
  isChatOpen,
  showSampleData,
  onToggleSampleData
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const isMac = isMacElectron();

  return (
    <header
      className={`h-14 bg-zinc-950 border-b border-zinc-800/80 pr-4 sm:pr-6 flex items-center justify-between sticky top-0 z-40 backdrop-blur-md bg-zinc-950/90 app-window-drag select-none ${
        isMac ? 'pl-[90px]' : 'pl-4 sm:pl-6'
      }`}
    >
      {/* Brand & Financial Year Selector */}
      <div className="flex items-center gap-3 app-window-no-drag shrink-0">
        <span className="font-bold text-sm tracking-tight text-zinc-100 font-mono">
          ATO Lens
        </span>

        <div className="relative">
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="p-1.5 rounded-lg hover:bg-zinc-900 text-zinc-400 hover:text-zinc-200 transition-colors"
            title="Menu"
          >
            <Menu className="w-4 h-4" />
          </button>

          {isMenuOpen && (
            <div className="menu-popup absolute left-0 mt-2 w-56 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl z-50 p-1 font-mono text-xs app-window-no-drag">
              <button
                onClick={() => {
                  setIsMenuOpen(false);
                  onOpenUpload();
                }}
                className="w-full text-left px-3 py-2 rounded-lg hover:bg-zinc-800 text-zinc-200 flex items-center gap-2"
              >
                <FilePlus className="w-4 h-4 text-emerald-400" />
                <span>Upload Document</span>
              </button>
              {onOpenApiKeyModal && (
                <button
                  onClick={() => {
                    setIsMenuOpen(false);
                    onOpenApiKeyModal();
                  }}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-zinc-800 text-zinc-200 flex items-center gap-2"
                >
                  <Key className="w-4 h-4 text-emerald-400" />
                  <span>API Key Setup</span>
                </button>
              )}
              {onOpenFaqModal && (
                <button
                  onClick={() => {
                    setIsMenuOpen(false);
                    onOpenFaqModal();
                  }}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-zinc-800 text-zinc-200 flex items-center gap-2"
                >
                  <HelpCircle className="w-4 h-4 text-zinc-400" />
                  <span>Privacy Audit FAQ</span>
                </button>
              )}
              {onToggleSampleData && (
                <button
                  onClick={() => {
                    setIsMenuOpen(false);
                    onToggleSampleData();
                  }}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-zinc-800 text-zinc-200 flex items-center gap-2"
                >
                  {showSampleData ? (
                    <EyeOff className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <Eye className="w-4 h-4 text-emerald-400" />
                  )}
                  <span>{showSampleData ? 'Hide Sample Data' : 'Show Sample Data'}</span>
                </button>
              )}
              <a
                href="https://github.com/realbakari/ATO-Lens"
                target="_blank"
                rel="noreferrer"
                className="w-full text-left px-3 py-2 rounded-lg hover:bg-zinc-800 text-zinc-200 flex items-center gap-2"
              >
                <svg className="w-4 h-4 text-zinc-400 fill-current" viewBox="0 0 24 24">
                  <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
                </svg>
                <span>GitHub Repository</span>
              </a>
              <div className="my-1 border-t border-zinc-800" />
              <button
                onClick={() => {
                  setIsMenuOpen(false);
                  onOpenPrivacy();
                }}
                className="w-full text-left px-3 py-2 rounded-lg hover:bg-rose-500/10 text-rose-300 flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4 text-rose-400" />
                <span>Clear Local Data</span>
              </button>
            </div>
          )}
        </div>

        <div className="h-4 w-px bg-zinc-800 hidden sm:block" />

        {/* Financial year tabs */}
        <div className="hidden lg:flex items-center bg-zinc-900 p-1 rounded-lg border border-zinc-800 app-window-no-drag overflow-x-auto no-scrollbar">
          {financialYears.map((fy) => (
            <button
              key={fy.id}
              onClick={() => onSelectFy(fy.id)}
              className={`px-3 py-1 rounded text-xs font-mono font-medium transition-all ${
                selectedFyId === fy.id
                  ? 'bg-zinc-800 text-zinc-100 font-semibold shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {fy.label}
            </button>
          ))}
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2 app-window-no-drag shrink-0">
        <button
          onClick={onOpenPrivacy}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-800 text-xs font-mono text-zinc-300 transition-colors"
        >
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span className="hidden sm:inline">Privacy</span>
        </button>

        <button
          onClick={onOpenUpload}
          className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-mono font-semibold transition-colors shadow-sm"
        >
          + Upload
        </button>

        <button
          onClick={onToggleChat}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-colors border ${
            isChatOpen
              ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
              : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:text-zinc-100'
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span>Chat</span>
        </button>
      </div>
    </header>
  );
};
