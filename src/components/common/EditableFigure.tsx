import React, { useEffect, useRef, useState } from 'react';
import { Pencil, Check, X } from 'lucide-react';
import { AnimatedNumber } from './AnimatedNumber';

interface EditableFigureProps {
  value: number;
  label: string;
  /** Absent when the figure cannot be edited, e.g. while previewing sample data. */
  onCommit?: (value: number) => void;
  isManual?: boolean;
  /** Renders negative values in rose, for figures like an amount payable. */
  signed?: boolean;
}

/**
 * A headline figure that can be corrected in place. Recognition is never
 * perfect, so every figure the app shows has to be answerable by the person who
 * can see the document.
 */
export const EditableFigure: React.FC<EditableFigureProps> = ({
  value,
  label,
  onCommit,
  isManual = false,
  signed = false
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(String(value));
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isEditing]);

  const commit = () => {
    const parsed = Number(draft.replace(/[$,\s]/g, ''));
    if (!isNaN(parsed) && parsed !== value) onCommit?.(parsed);
    setIsEditing(false);
  };

  const cancel = () => {
    setDraft(String(value));
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div className="relative z-20 flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
        <span className="font-mono text-2xl font-bold text-zinc-500">$</span>
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commit();
            if (e.key === 'Escape') cancel();
          }}
          onBlur={commit}
          aria-label={`${label} value`}
          inputMode="decimal"
          className="w-full min-w-0 rounded border border-emerald-500/60 bg-zinc-950 px-2 py-0.5 font-mono text-xl font-bold text-zinc-100 focus:outline-none"
        />
        <button
          onMouseDown={(e) => e.preventDefault()}
          onClick={commit}
          aria-label="Save"
          className="shrink-0 rounded p-1 text-emerald-400 hover:bg-zinc-800"
        >
          <Check className="h-3.5 w-3.5" />
        </button>
        <button
          onMouseDown={(e) => e.preventDefault()}
          onClick={cancel}
          aria-label="Cancel"
          className="shrink-0 rounded p-1 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    );
  }

  const colour = signed && value < 0 ? 'text-rose-400' : signed ? 'text-emerald-400' : 'text-zinc-100';

  return (
    <div className="group/figure relative z-10 flex items-center gap-1.5">
      <span className={`font-mono text-2xl font-bold ${colour}`}>
        {signed && value > 0 ? '+' : signed && value < 0 ? '−' : ''}$
        <AnimatedNumber value={Math.abs(value)} format={(n) => n.toLocaleString()} />
      </span>

      {isManual && (
        <span
          title="You corrected this figure"
          className="shrink-0 rounded bg-zinc-800 px-1.5 py-0.5 font-mono text-[10px] text-zinc-400"
        >
          edited
        </span>
      )}

      {onCommit && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setDraft(String(value));
            setIsEditing(true);
          }}
          aria-label={`Edit ${label}`}
          className="shrink-0 rounded p-1 text-zinc-600 opacity-0 transition-opacity hover:bg-zinc-800 hover:text-emerald-400 focus:opacity-100 group-hover/figure:opacity-100"
        >
          <Pencil className="h-3 w-3" />
        </button>
      )}
    </div>
  );
};
