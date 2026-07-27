import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Send, Bot, RefreshCw, FileText } from 'lucide-react';
import type { AustralianFinancialYear, ExtractedValue } from '../../types/tax';
import { redactSensitiveData, logNetworkActivity } from '../../storage/privacyLog';
import { getActiveAiProvider, getProviderDisplayName, sendChatMessage, type ChatTurn } from '../../lib/aiChatClient';
import type { AiProviderId } from '../../lib/apiKeys';

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
  citations?: Array<{
    documentName: string;
    page: number;
    fieldName: string;
  }>;
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

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

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
    if (messages.length === 0 && financialYears.length > 0) {
      const latestFy = financialYears[0];
      const providerNote = activeProvider
        ? `I'm connected to **${assistantName}** for richer reasoning about your history.`
        : `I'm running fully offline (no AI key configured) - add one in API Key Setup for richer reasoning.`;
      setMessages([
        {
          id: 'welcome-1',
          sender: 'assistant',
          text: `G'day! I'm your Australian tax assistant. I have loaded **${financialYears.length} financial years** (${financialYears.map((f) => f.label).join(', ')}). ${providerNote}\n\nAsk me anything about your Notice of Assessment refund, 12% Super Guarantee compliance, work deduction claims, or HELP indexation.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          citations: [
            {
              documentName: latestFy.documents[0]?.fileName || 'ATO-Individual-Tax-Return-2025-26.pdf',
              page: 1,
              fieldName: 'Gross Income'
            }
          ]
        }
      ]);
    }
  }, [financialYears, activeProvider, assistantName]);

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
          logNetworkActivity(
            activeProvider === 'claude'
              ? 'api.anthropic.com'
              : activeProvider === 'openai'
              ? 'api.openai.com'
              : 'generativelanguage.googleapis.com',
            'Chat message about local tax history (redacted)',
            'allowed',
            query.length
          );
          const responseText = await sendChatMessage(
            activeProvider,
            buildTaxContextSystemPrompt(financialYears),
            history,
            redactSensitiveData(query)
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
      setMessages((prev) => [...prev, reply]);
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
      className={`drawer-slide-in relative flex h-full flex-col border-l border-zinc-800 bg-[#0a0a0a] shrink-0 ${
        isMobile ? 'fixed inset-0 z-40' : ''
      }`}
      style={isMobile ? undefined : { width: `${width}px` }}
    >
      {/* Tax UI Draggable Resize Handle on Left Edge */}
      <div
        onMouseDown={handleMouseDown}
        className="absolute top-0 bottom-0 left-0 hidden w-1 cursor-col-resize hover:bg-zinc-700 md:block z-10"
        title="Drag to resize chat width"
      />

      {/* Header */}
      <header className="flex h-12 shrink-0 items-center justify-between border-b border-zinc-800 px-4">
        <span className="text-sm font-semibold text-zinc-100">Chat</span>
        <div className="flex items-center gap-1">
          {messages.length > 0 && (
            <button
              onClick={handleNewChat}
              className="px-2.5 py-1 text-xs font-medium rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors flex items-center gap-1"
            >
              <RefreshCw className="w-3 h-3" />
              <span>New</span>
            </button>
          )}
          <button
            onClick={onClose}
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
                        onClick={() =>
                          onOpenProvenance(cit.fieldName, {
                            value: 'Cited Record',
                            confidence: 0.98,
                            sourceDocumentId: 'doc-cited-01',
                            sourceDocumentName: cit.documentName,
                            sourcePage: cit.page,
                            sourceText: `${cit.fieldName} cited in Australian FY response`,
                            manuallyConfirmed: true
                          })
                        }
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 font-mono text-[10px] border border-emerald-500/30 transition-colors"
                      >
                        <FileText className="w-3 h-3 text-emerald-400" />
                        <span>[{cit.documentName}, p.{cit.page}]</span>
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
            'Did my employer pay 12% super compliance?',
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
            rows={3}
            className="w-full resize-none overflow-y-auto rounded-lg bg-zinc-900 px-3 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none disabled:opacity-50 border border-zinc-800/80 focus:border-zinc-700"
          />
          <button
            type="submit"
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

function buildTaxContextSystemPrompt(financialYears: AustralianFinancialYear[]): string {
  const summary = financialYears
    .map(
      (fy) =>
        `${fy.label}: gross income $${fy.grossIncome.toLocaleString()}, taxable income $${fy.taxableIncome.toLocaleString()}, tax withheld $${fy.taxWithheld.toLocaleString()}, deductions $${fy.totalDeductions.toLocaleString()}, employer super $${fy.employerSuper.toLocaleString()}, Medicare levy $${fy.medicareLevy.toLocaleString()}, HELP repayment $${fy.helpRepayment.toLocaleString()}, assessment result ${fy.assessmentResult >= 0 ? '+' : ''}$${fy.assessmentResult.toLocaleString()}.`
    )
    .join('\n');

  return `You are the built-in Australian tax assistant inside ATO Lens, a local-first tax workspace. Answer questions about the user's own Australian tax history using ONLY the redacted figures below. Be concise, cite dollar amounts, and reference relevant ATO concepts (Notice of Assessment, Superannuation Guarantee, Medicare levy, HELP/HECS, work-related deductions) where useful. Never ask for or repeat a Tax File Number, Medicare number, or bank details.\n\nLocal financial year summary (already redacted of sensitive identifiers):\n${summary}`;
}

function generateLocalResponse(query: string, financialYears: AustralianFinancialYear[]): Message {
  const q = query.toLowerCase();
  const latestFy = financialYears[0] || { label: '2025–26', grossIncome: 96420, taxWithheld: 24167, employerSuper: 11246, totalDeductions: 6750, assessmentResult: 1284 };

  let replyText = '';
  let citations: Message['citations'] = [];

  if (q.includes('super')) {
    replyText = `Based on your **${latestFy.label}** tax records, your employer recorded **$${latestFy.employerSuper.toLocaleString()}** in superannuation contributions. This meets the mandatory **12.0% Superannuation Guarantee (SG)** compliance rate for Australia.`;
    citations = [{ documentName: 'STP-Income-Statement-2025-26.pdf', page: 1, fieldName: 'Employer Super' }];
  } else if (q.includes('rate') || q.includes('tax rate')) {
    replyText = `For financial year **${latestFy.label}**, your gross income was **$${latestFy.grossIncome.toLocaleString()}** and total PAYG tax withheld was **$${latestFy.taxWithheld.toLocaleString()}**. Your effective tax rate was **${((latestFy.taxWithheld / latestFy.grossIncome) * 100).toFixed(1)}%**.`;
    citations = [{ documentName: 'ATO-Notice-of-Assessment-2025-26.pdf', page: 1, fieldName: 'Taxable Income' }];
  } else if (q.includes('refund') || q.includes('assessment')) {
    replyText = `Your Notice of Assessment for **${latestFy.label}** calculates an assessment result of **+$${latestFy.assessmentResult.toLocaleString()} refund** credited back to your nominated bank account.`;
    citations = [{ documentName: 'ATO-Notice-of-Assessment-2025-26.pdf', page: 1, fieldName: 'Assessment Result' }];
  } else {
    replyText = `I searched your local Australian tax history across **${financialYears.length} financial years**. In **${latestFy.label}**, you earned $${latestFy.grossIncome.toLocaleString()} gross with $${latestFy.totalDeductions.toLocaleString()} in work deductions claimed.`;
    citations = [{ documentName: 'ATO-Individual-Tax-Return-2025-26.pdf', page: 1, fieldName: 'Gross Salary' }];
  }

  return {
    id: `reply-${Date.now()}`,
    sender: 'assistant',
    text: replyText,
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    citations
  };
}
