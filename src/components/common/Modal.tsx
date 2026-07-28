import React, { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
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

const dialogStack: symbol[] = [];

function getFocusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(
    container.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )
  ).filter((element) => !element.hasAttribute('hidden') && element.getAttribute('aria-hidden') !== 'true');
}

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
  const subtitleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const dialogToken = useRef(Symbol('dialog'));

  useEffect(() => {
    if (!isOpen) return;
    const token = dialogToken.current;
    dialogStack.push(token);
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const appRoot = document.getElementById('root');
    const previousAriaHidden = appRoot?.getAttribute('aria-hidden');
    const previousInert = appRoot?.inert;
    if (appRoot) {
      appRoot.inert = true;
      appRoot.setAttribute('aria-hidden', 'true');
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (dialogStack.at(-1) !== token) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== 'Tab' || !panelRef.current) return;
      const focusable = getFocusableElements(panelRef.current);
      if (focusable.length === 0) {
        event.preventDefault();
        panelRef.current.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    requestAnimationFrame(() => {
      const firstFocusable = panelRef.current
        ? getFocusableElements(panelRef.current)[0]
        : undefined;
      (firstFocusable ?? panelRef.current)?.focus();
    });

    return () => {
      const index = dialogStack.lastIndexOf(token);
      if (index >= 0) dialogStack.splice(index, 1);
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
      if (appRoot) {
        appRoot.inert = previousInert ?? false;
        if (previousAriaHidden === null || previousAriaHidden === undefined) {
          appRoot.removeAttribute('aria-hidden');
        } else {
          appRoot.setAttribute('aria-hidden', previousAriaHidden);
        }
      }
      if (previousFocus?.isConnected) previousFocus.focus();
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return createPortal(
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
        aria-describedby={subtitle ? subtitleId : undefined}
        tabIndex={-1}
        className={`dialog-popup flex max-h-[86vh] w-full flex-col overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900 shadow-2xl outline-none ${SIZE_CLASS[size]}`}
      >
        <header className="flex shrink-0 items-start justify-between gap-4 border-b border-zinc-800 bg-zinc-950/60 px-5 py-3.5">
          <div className="flex min-w-0 items-center gap-2.5">
            {icon && <span className="shrink-0 text-blue-400">{icon}</span>}
            <div className="min-w-0">
              <h2 id={titleId} className="truncate text-sm font-semibold text-zinc-100">
                {title}
              </h2>
              {subtitle && (
                <p id={subtitleId} className="mt-0.5 text-[11px] text-zinc-500">
                  {subtitle}
                </p>
              )}
            </div>
          </div>
          <button
            type="button"
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
    </div>,
    document.body
  );
};

/** Small uppercase label that opens each section inside a dialog. */
export const SectionLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <h3 className="mb-2 font-mono text-[10px] font-semibold uppercase tracking-wider text-zinc-500">{children}</h3>
);
