import React, { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ChevronDown, ShieldCheck, Copy, Check, Lock, Globe } from 'lucide-react';

export const FAQSection: React.FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const [copiedPrompt, setCopiedPrompt] = useState(false);

  const securityAuditPrompt = `I want you to perform a security and privacy audit of ATO Lens, an open source Australian tax return parser created by Bakari Mustafa (https://www.bakarimustafa.com/).

Please analyze the source code and report what it actually does:

1. DATA HANDLING
   - Trace the offline parser and optional Claude, OpenAI, and Gemini PDF paths
   - Identify exactly what is stored in local browser storage
   - Distinguish redacted chat text from original PDF uploads

2. NETWORK ACTIVITY
   - Identify all network requests in the codebase
   - Check that offline parsing makes no external request
   - Check update requests, AI calls, telemetry, and analytics

3. API KEY SECURITY
   - Inspect how every provider key is stored and transmitted
   - Check that keys are not logged or exposed

4. REDACTION
   - Test redaction of system context, prior turns, current messages, and activity descriptions
   - Confirm original PDF uploads are disclosed as raw

5. CODE INTEGRITY
   - Look for obfuscated or suspicious code
   - Review runtime and release-tool dependencies for vulnerabilities

Report findings and uncertainty; do not assume the privacy claims are correct.`;

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(securityAuditPrompt);
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 2000);
  };

  const faqs = [
    {
      q: 'How does ATO Lens process my Australian Tax Return and Notice of Assessment PDFs?',
      a: 'The default rule-based parser and OCR run on your device. If you choose Claude, OpenAI, or Gemini, the original selected PDF is uploaded directly to that provider using your API key. Ollama uses the local or self-hosted endpoint you configured.'
    },
    {
      q: 'Is my data sent to any remote servers?',
      a: 'ATO Lens has no application server, telemetry, or analytics. The desktop updater can ask GitHub for a version when enabled. User-triggered AI parsing uploads the selected PDF, and AI chat sends redacted conversation context directly to the selected provider.'
    },
    {
      q: 'How are Tax File Numbers (TFN), Medicare numbers, and BSBs handled?',
      a: 'ATO Lens redacts labelled TFNs, Medicare numbers, BSBs, and labelled bank accounts at the outbound AI chat boundary and in activity descriptions. The original PDF is not redacted when you deliberately choose an AI document parser.'
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
              type="button"
              onClick={() => setOpenIndex(openIndex === idx ? null : idx)}
              aria-expanded={openIndex === idx}
              className="w-full text-left p-4 flex items-center justify-between font-mono text-xs font-semibold text-zinc-200 hover:text-white transition-colors"
            >
              <span>{faq.q}</span>
              <ChevronDown
                className={`w-4 h-4 text-zinc-400 transition-transform ${openIndex === idx ? 'rotate-180 text-emerald-400' : ''}`}
              />
            </button>
            <AnimatePresence initial={false}>
              {openIndex === idx && (
                <motion.div
                  key="content"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2, ease: 'easeInOut' }}
                  className="overflow-hidden"
                >
                  <div className="border-t border-zinc-900 p-4 pt-3 text-xs leading-relaxed text-zinc-400 font-sans">
                    {faq.a}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>

      {/* Author Footer Badge */}
      <div className="pt-2 border-t border-zinc-800 flex items-center justify-between text-xs font-mono text-zinc-500">
        <div className="flex items-center gap-1.5">
          <Lock className="w-3.5 h-3.5 text-emerald-400" />
          <span>Local-first — no ATO Lens server or telemetry</span>
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
