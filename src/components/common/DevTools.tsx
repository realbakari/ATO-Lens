import React, { useState } from 'react';
import { Terminal, Bug, RefreshCw, X } from 'lucide-react';

interface DevToolsProps {
  onTriggerError?: () => void;
  onResetData?: () => void;
}

export const DevTools: React.FC<DevToolsProps> = ({ onTriggerError, onResetData }) => {
  const [isOpen, setIsOpen] = useState(false);

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-3 left-3 z-50 p-2 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-emerald-400 shadow-xl transition-all font-mono text-[10px] flex items-center gap-1 opacity-60 hover:opacity-100"
        title="Developer Tools (Cmd+Shift+.)"
      >
        <Terminal className="w-3.5 h-3.5" />
        <span>Dev</span>
      </button>
    );
  }

  return (
    <div className="dialog-popup fixed bottom-4 left-4 z-50 bg-zinc-900 border border-zinc-800 rounded-xl p-4 shadow-2xl space-y-3 font-mono text-xs w-64">
      <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
        <div className="flex items-center gap-1.5 font-bold text-emerald-400">
          <Terminal className="w-4 h-4" />
          <span>ATO Lens DevTools</span>
        </div>
        <button onClick={() => setIsOpen(false)} className="text-zinc-500 hover:text-zinc-300">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="space-y-2">
        <button
          onClick={() => {
            if (onResetData) onResetData();
          }}
          className="w-full text-left p-2 rounded bg-zinc-950 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 flex items-center justify-between"
        >
          <span>Purge Local Storage</span>
          <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
        </button>

        <button
          onClick={() => {
            if (onTriggerError) {
              onTriggerError();
            } else {
              alert('Test error boundary triggered');
            }
          }}
          className="w-full text-left p-2 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center justify-between"
        >
          <span>Test Error Boundary</span>
          <Bug className="w-3.5 h-3.5 text-rose-400" />
        </button>
      </div>
    </div>
  );
};
