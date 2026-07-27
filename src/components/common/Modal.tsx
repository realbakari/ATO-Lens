import React, { useEffect, useId, useRef } from 'react';
import { X } from 'lucide-react';

type ModalSize = 'sm' | 'md' | 'lg';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  size?: ModalSize;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

const SIZE_CLASS: Record<ModalSize, string> = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl'
};

/**
 * Shared dialog shell: one header/body/footer rhythm, Escape and click-outside
 * to dismiss, and scroll locked behind the panel.
 */
export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  icon,
  size = 'md',
  children,
  footer
}) => {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    panelRef.current?.focus();

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="dialog-backdrop fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={`dialog-popup flex max-h-[86vh] w-full flex-col overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900 shadow-2xl outline-none ${SIZE_CLASS[size]}`}
      >
        <header className="flex shrink-0 items-start justify-between gap-4 border-b border-zinc-800 bg-zinc-950/60 px-5 py-3.5">
          <div className="flex min-w-0 items-center gap-2.5">
            {icon && <span className="shrink-0 text-emerald-400">{icon}</span>}
            <div className="min-w-0">
              <h2 id={titleId} className="truncate text-sm font-semibold text-zinc-100">
                {title}
              </h2>
              {subtitle && <p className="mt-0.5 text-[11px] text-zinc-500">{subtitle}</p>}
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="-mr-1 shrink-0 rounded-lg p-1 text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-200"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">{children}</div>

        {footer && (
          <footer className="shrink-0 border-t border-zinc-800 bg-zinc-950/60 px-5 py-3.5">{footer}</footer>
        )}
      </div>
    </div>
  );
};

/** Small uppercase label that opens each section inside a dialog. */
export const SectionLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <h3 className="mb-2 font-mono text-[10px] font-semibold uppercase tracking-wider text-zinc-500">{children}</h3>
);
