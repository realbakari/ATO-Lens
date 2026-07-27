import React, { useState } from 'react';
import { ChevronDown, ShieldCheck, Copy, Check, Lock, Globe } from 'lucide-react';

export const FAQSection: React.FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const [copiedPrompt, setCopiedPrompt] = useState(false);

  const securityAuditPrompt = `I want you to perform a security and privacy audit of ATO Lens, an open source Australian tax return parser created by Bakari Mustafa (https://www.bakarimustafa.com/).

Please analyze the source code and verify:

1. DATA HANDLING
   - Tax return PDFs are parsed locally inside the browser using client-side rule-based logic
   - No data is sent to any third-party servers
   - Parsed financial data is stored in local browser storage only

2. NETWORK ACTIVITY
   - Identify all network requests in the codebase
   - Verify zero external network calls are made during offline document parsing
   - Check for any hidden telemetry or analytics tracking

3. API KEY SECURITY
   - Verify Anthropic API keys are stored in localStorage and not transmitted elsewhere
   - Check that keys are not logged or exposed

4. CODE INTEGRITY
   - Look for obfuscated or suspicious code
   - Review dependencies for anything concerning`;

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(securityAuditPrompt);
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 2000);
  };

  const faqs = [
    {
      q: 'How does ATO Lens process my Australian Tax Return and Notice of Assessment PDFs?',
      a: 'Tax return PDFs are parsed 100% locally inside your browser using client-side rule-based logic. No files or text extracted from your Australian tax documents leave your computer unless you explicitly enable Claude API queries.'
    },
    {
      q: 'Is my data sent to any remote servers?',
      a: 'No. ATO Lens operates on a 100% local-first model. Zero telemetry, tracking, or background analytics scripts exist in the codebase.'
    },    {
      q: 'How are Tax File Numbers (TFN), Medicare numbers, and BSBs handled?',
      a: 'ATO Lens features a real-time sensitive data redaction engine that automatically masks 8/9-digit Tax File Numbers (TFNs: *** *** ***), 10-digit Medicare numbers, and 6-digit BSBs before any display or local storage.'
    },
    {
      q: 'Who created ATO Lens?',
      a: 'ATO Lens was created by Bakari Mustafa (https://www.bakarimustafa.com/) as a local-first open source application built with shadcn/ui design aesthetics.'
    }
  ];

  return (
    <div className="glass-panel p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-4">
        <div>
          <h2 className="text-xl font-bold text-zinc-100 flex items-center gap-2 font-mono">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <span>Privacy & Security Audit FAQ</span>
          </h2>
          <p className="text-xs text-zinc-400">
            Open-source privacy guarantee by <a href="https://www.bakarimustafa.com/" target="_blank" rel="noreferrer" className="text-emerald-400 hover:underline">Bakari Mustafa</a>
          </p>
        </div>

        <button
          onClick={handleCopyPrompt}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 text-xs font-mono border border-emerald-500/30 transition-colors"
        >
          {copiedPrompt ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          <span>{copiedPrompt ? 'Copied Audit Prompt!' : 'Copy Security Audit Prompt'}</span>
        </button>
      </div>

      {/* Accordion List */}
      <div className="space-y-3 font-sans">
        {faqs.map((faq, idx) => (
          <div key={idx} className="border border-zinc-800 rounded-xl overflow-hidden bg-zinc-950/60">
            <button
              onClick={() => setOpenIndex(openIndex === idx ? null : idx)}
              className="w-full text-left p-4 flex items-center justify-between font-mono text-xs font-semibold text-zinc-200 hover:text-white transition-colors"
            >
              <span>{faq.q}</span>
              <ChevronDown
                className={`w-4 h-4 text-zinc-400 transition-transform ${openIndex === idx ? 'rotate-180 text-emerald-400' : ''}`}
              />
            </button>
            {openIndex === idx && (
              <div className="p-4 pt-0 text-xs text-zinc-400 leading-relaxed border-t border-zinc-900 font-sans">
                {faq.a}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Author Footer Badge */}
      <div className="pt-2 border-t border-zinc-800 flex items-center justify-between text-xs font-mono text-zinc-500">
        <div className="flex items-center gap-1.5">
          <Lock className="w-3.5 h-3.5 text-emerald-400" />
          <span>Local Storage Only — No Server Dependencies</span>
        </div>
        <a
          href="https://www.bakarimustafa.com/"
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1 text-zinc-400 hover:text-emerald-400 transition-colors"
        >
          <Globe className="w-3.5 h-3.5" />
          <span>bakarimustafa.com</span>
        </a>
      </div>
    </div>
  );
};
