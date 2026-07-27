import React from 'react';
import { BrailleSpinner } from '../common/BrailleSpinner';

interface LoadingViewProps {
  filename: string;
  year?: string | null;
  status?: 'extracting-year' | 'parsing';
}

export const LoadingView: React.FC<LoadingViewProps> = ({
  filename,
  year,
  status = 'parsing'
}) => {
  const statusText = status === 'extracting-year' ? 'Extracting financial year...' : 'Parsing Australian tax document...';

  return (
    <div className="flex flex-1 flex-col items-center justify-center p-12 text-center my-12">
      <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-900 border border-zinc-800">
        <BrailleSpinner className="text-2xl text-emerald-400 font-mono" />
      </div>
      <h2 className="mb-2 text-xl font-bold text-zinc-100 font-mono">
        {year ? `Australian FY ${year}` : 'Processing Document'}
      </h2>
      <p className="mb-2 max-w-xs truncate px-4 text-xs font-mono text-zinc-400">
        {filename}
      </p>
      <p className="animate-pulse text-xs text-emerald-400 font-mono">{statusText}</p>
    </div>
  );
};
