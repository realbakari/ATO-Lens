import React from 'react';
import { UploadCloud, Eye } from 'lucide-react';

interface EmptyWorkspaceStateProps {
  onUpload: () => void;
  onShowSampleData: () => void;
}

export const EmptyWorkspaceState: React.FC<EmptyWorkspaceStateProps> = ({ onUpload, onShowSampleData }) => {
  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <div className="max-w-sm text-center space-y-4">
        <div className="w-12 h-12 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mx-auto">
          <UploadCloud className="w-6 h-6 text-zinc-500" />
        </div>
        <div className="space-y-1">
          <h3 className="text-sm font-semibold text-zinc-200">No tax data yet</h3>
          <p className="text-xs text-zinc-400">
            Upload a tax return, Notice of Assessment, income statement, or payslip to get started.
          </p>
        </div>
        <div className="flex items-center justify-center gap-2 pt-1">
          <button
            onClick={onUpload}
            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-mono font-semibold transition-colors"
          >
            Upload a Document
          </button>
          <button
            onClick={onShowSampleData}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 text-xs font-mono transition-colors"
          >
            <Eye className="w-3.5 h-3.5" />
            Preview with Sample Data
          </button>
        </div>
      </div>
    </div>
  );
};
