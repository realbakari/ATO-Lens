import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Send, Bot, RefreshCw, FileText } from 'lucide-react';
import type { AustralianFinancialYear, ExtractedValue } from '../../types/tax';
import { redactSensitiveData } from '../../storage/privacyLog';
import { getActiveAiProvider, getProviderDisplayName, sendChatMessage, type ChatTurn } from '../../lib/aiChatClient';
import type { AiProviderId } from '../../lib/apiKeys';
import {
  buildTaxContextSystemPrompt,
  generateLocalResponse,
  type LocalChatCitation
} from '../../lib/localChatResponses';

interface LocalChatDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  financialYears: AustralianFinancialYear[];
  onOpenProvenance: (fieldName: string, value?: ExtractedValue<any>) => void;
}

interface Message {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  citations?: LocalChatCitation[];
}

const WIDTH_STORAGE_KEY = 'tax-chat-width';
const MIN_WIDTH = 320;
const MAX_WIDTH_PERCENT = 0.5;

function loadWidth(): number {
  try {
    const stored = localStorage.getItem(WIDTH_STORAGE_KEY);
    if (stored) {
      return Math.max(MIN_WIDTH, parseInt(stored, 10));
    }
  } catch {}
  return 360;
}

export const LocalChatDrawer: React.FC<LocalChatDrawerProps> = ({
  isOpen,
  onClose,
  financialYears,
  onOpenProvenance
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [width, setWidth] = useState(() => loadWidth());
  const [isResizing, setIsResizing] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [hasTopShadow, setHasTopShadow] = useState(false);
  const [hasBottomShadow, setHasBottomShadow] = useState(false);
  const [activeProvider, setActiveProvider] = useState<AiProviderId | null>(null);

  // Re-check which AI provider (if any) is configured whenever the drawer opens,
  // so saving/removing a key in the API Key modal is picked up immediately.
  useEffect(() => {
    if (isOpen) setActiveProvider(getActiveAiProvider());
  }, [isOpen]);

  const assistantName = getProviderDisplayName(activeProvider);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (!isOpen || !isMobile) return;
    const previousFocus =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const drawer = drawerRef.current;
    const parent = drawer?.parentElement;
    const siblingStates = parent
      ? Array.from(parent.children)
          .filter((element) => element !== drawer)
          .map((element) => ({
            element: element as HTMLElement,
            inert: (element as HTMLElement).inert,
            ariaHidden: element.getAttribute('aria-hidden')
          }))
      : [];
    const previousBodyOverflow = document.body.style.overflow;

    for (const state of siblingStates) {
      state.element.inert = true;
      state.element.setAttribute('aria-hidden', 'true');
    }
    document.body.style.overflow = 'hidden';

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
      if (event.key !== 'Tab' || !drawer) return;

      const focusable = Array.from(
        drawer.querySelectorAll<HTMLElement>(
          'button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'
        )
      ).filter((element) => !element.hasAttribute('hidden'));
      if (focusable.length === 0) {
        event.preventDefault();
        drawer.focus();
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
    document.addEventListener('keydown', handleEscape);
    requestAnimationFrame(() => textareaRef.current?.focus());
    return () => {
      document.removeEventListener('keydown', handleEscape);
      for (const state of siblingStates) {
        state.element.inert = state.inert;
        if (state.ariaHidden === null) state.element.removeAttribute('aria-hidden');
        else state.element.setAttribute('aria-hidden', state.ariaHidden);
      }
      document.body.style.overflow = previousBodyOverflow;
      if (previousFocus?.isConnected) previousFocus.focus();
    };
  }, [isMobile, isOpen, onClose]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const maxWidth = window.innerWidth * MAX_WIDTH_PERCENT;
      const newWidth = Math.min(maxWidth, Math.max(MIN_WIDTH, window.innerWidth - e.clientX));
      setWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      localStorage.setItem(WIDTH_STORAGE_KEY, String(width));
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, width]);

  // Initial welcome message
  useEffect(() => {
    if (messages.length === 0 && isOpen) {
      const providerNote = activeProvider
        ? `I'm connected to **${assistantName}** for richer reasoning about your history.`
        : `I'm running fully offline (no AI key configured) - add one in API Key Setup for richer reasoning.`;
      const hasData = financialYears.length > 0;
      setMessages([
        {
          id: 'welcome-1',
          sender: 'assistant',
          text: hasData
            ? `G'day! I'm your Australian tax assistant. I have loaded **${financialYears.length} financial years** (${financialYears.map((f) => f.label).join(', ')}). ${providerNote}\n\nAsk me about your assessment, Super Guarantee records, work deductions, or HELP repayment.`
            : `G'day! No financial-year data is loaded yet. Upload a document or add figures to start. ${providerNote}`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          citations: []
        }
      ]);
    }
  }, [financialYears, activeProvider, assistantName, isOpen, messages.length]);

  // Scroll to bottom & Auto-grow Textarea
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
    }
  }, [input]);

  const handleScroll = () => {
    if (scrollContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
      setHasTopShadow(scrollTop > 10);
      setHasBottomShadow(scrollHeight > clientHeight && scrollTop < scrollHeight - clientHeight - 10);
    }
  };

  const handleSend = (textToSend?: string) => {
    const query = textToSend || input.trim();
    if (!query || isTyping) return;

    const userMsg: Message = {
      id: `msg-${Date.now()}`,
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    const history: ChatTurn[] = messages.map((m) => ({
      role: m.sender,
      text: m.text
    }));

    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInput('');
    setIsTyping(true);

    void (async () => {
      if (activeProvider) {
        try {
          const responseText = await sendChatMessage(
            activeProvider,
            buildTaxContextSystemPrompt(financialYears),
            history,
            query
          );
          setMessages((prev) => [
            ...prev,
            {
              id: `reply-${Date.now()}`,
              sender: 'assistant',
              text: redactSensitiveData(responseText),
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            }
          ]);
          setIsTyping(false);
          return;
        } catch (err) {
          console.warn('[ATO Lens] AI chat request failed, falling back to offline assistant:', err);
        }
      }

      // Offline fallback (also used when no provider is configured, or the API call failed)
      await new Promise((resolve) => setTimeout(resolve, 500));
      const reply = generateLocalResponse(query, financialYears);
      setMessages((prev) => [
        ...prev,
        {
          id: `reply-${Date.now()}`,
          sender: 'assistant',
          text: reply.text,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          citations: reply.citations
        }
      ]);
      setIsTyping(false);
    })();
  };

  const handleNewChat = () => {
    setMessages([]);
    setInput('');
  };

  if (!isOpen) return null;

  return (
    <div
      ref={drawerRef}
      role={isMobile ? 'dialog' : 'complementary'}
      aria-modal={isMobile ? true : undefined}
      aria-label="Tax assistant chat"
      className={`drawer-slide-in relative flex h-full flex-col border-l border-zinc-800 bg-[#0a0a0a] shrink-0 ${
        isMobile ? 'fixed inset-0 z-40' : ''
      }`}
      style={isMobile ? undefined : { width: `${width}px` }}
    >
      {/* Tax UI Draggable Resize Handle on Left Edge */}
      <div
        onMouseDown={handleMouseDown}
        aria-hidden="true"
        className="absolute top-0 bottom-0 left-0 hidden w-1 cursor-col-resize hover:bg-zinc-700 md:block z-10"
        title="Drag to resize chat width"
      />

      {/* Header */}
      <header className="flex h-12 shrink-0 items-center justify-between border-b border-zinc-800 px-4">
        <span className="text-sm font-semibold text-zinc-100">Chat</span>
        <div className="flex items-center gap-1">
          {messages.length > 0 && (
            <button
              type="button"
              onClick={handleNewChat}
              className="px-2.5 py-1 text-xs font-medium rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors flex items-center gap-1"
            >
              <RefreshCw className="w-3 h-3" />
              <span>New</span>
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close chat"
            className="p-1 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Messages Container with Dynamic Scroll Shadows */}
      <div className="relative min-h-0 flex-1">
        {hasTopShadow && (
          <div className="pointer-events-none absolute top-0 right-0 left-0 z-10 h-4 shadow-[0_8px_16px_-8px_rgba(0,0,0,0.4)]" />
        )}
        <div
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className="h-full overflow-y-auto p-4 space-y-4 text-xs font-sans"
        >
          {messages.map((msg) => (
            <div key={msg.id} className="space-y-1">
              <div
                className="mb-1 text-xs font-mono font-medium"
                style={{
                  color: msg.sender === 'assistant' ? 'rgb(217, 119, 87)' : '#999999'
                }}
              >
                {msg.sender === 'user' ? 'You' : assistantName}
              </div>

              {/* Message Content */}
              <div className="text-sm text-zinc-200 leading-relaxed font-sans">
                {redactSensitiveData(msg.text)}

                {/* Inline Citation Badges */}
                {msg.citations && msg.citations.length > 0 && (
                  <div className="mt-3 pt-2 border-t border-zinc-800/80 flex flex-wrap gap-1.5">
                    {msg.citations.map((cit, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => onOpenProvenance(cit.fieldName, cit.value)}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 font-mono text-[10px] border border-emerald-500/30 transition-colors"
                      >
                        <FileText className="w-3 h-3 text-emerald-400" />
                        <span>
                          [{cit.documentName}{cit.page ? `, p.${cit.page}` : ''}]
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}

          {isTyping && (
            <div>
              <div className="mb-1 text-xs font-mono" style={{ color: 'rgb(217, 119, 87)' }}>
                {assistantName}
              </div>
              <div className="flex items-center gap-2 text-xs text-zinc-400 font-mono">
                <Bot className="w-4 h-4 text-amber-400 animate-pulse" />
                <span>Thinking...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Suggested Follow-ups (Fades out when user types) */}
      {!isTyping && (
        <div
          className={`flex flex-wrap gap-1.5 border-t border-zinc-800 p-4 pt-3 pb-2 transition-opacity duration-150 shrink-0 ${
            hasBottomShadow ? 'shadow-[0_-8px_16px_-8px_rgba(0,0,0,0.4)]' : ''
          }`}
          style={{ opacity: input ? 0 : 1, pointerEvents: input ? 'none' : 'auto' }}
        >
          <div className="w-full text-xs text-zinc-500 font-mono mb-1">Suggested follow-ups</div>
          {[
            'Do my records show Super Guarantee compliance?',
            'What is my effective tax rate for 2025-26?',
            'Explain my Notice of Assessment refund'
          ].map((prompt, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(prompt)}
              className="px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-[13px] border border-zinc-800 transition-colors text-left font-sans"
            >
              {prompt}
            </button>
          ))}
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        className={`p-4 pt-2 pb-3 shrink-0 ${
          hasBottomShadow && isTyping ? 'shadow-[0_-8px_16px_-8px_rgba(0,0,0,0.4)]' : ''
        }`}
      >
        <div className="relative flex items-center">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Ask anything..."
            aria-label="Ask the tax assistant"
            rows={3}
            className="w-full resize-none overflow-y-auto rounded-lg bg-zinc-900 px-3 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none disabled:opacity-50 border border-zinc-800/80 focus:border-zinc-700"
          />
          <button
            type="submit"
            aria-label="Send message"
            disabled={!input.trim() || isTyping}
            className="absolute right-2.5 bottom-2.5 p-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-30 text-white transition-all"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      </form>
    </div>
  );
};
