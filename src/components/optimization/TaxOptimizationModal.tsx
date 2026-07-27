import React, { useEffect, useState } from 'react';
import { Sparkles, CheckCircle2, Circle, RefreshCw, KeyRound, Info } from 'lucide-react';
import type { AustralianFinancialYear, DeductionCategory } from '../../types/tax';
import { generateAiTaxOptimization, type AiOptimizationResult } from '../../lib/aiTaxOptimizer';
import { getActiveAiProvider, getProviderDisplayName } from '../../lib/aiChatClient';
import { calculateDeductionSaving, calculateHELPRepayment, getMarginalRate } from '../../engine/taxCalculator';
import { BrailleSpinner } from '../common/BrailleSpinner';
import { Modal, SectionLabel } from '../common/Modal';

interface TaxOptimizationModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentFy: AustralianFinancialYear;
  onOpenApiKeyModal?: () => void;
}

interface ChecklistEntry {
  category: DeductionCategory;
  title: string;
  desc: string;
}

/**
 * Deduction categories worth reviewing per occupation. These are the ATO's
 * work-related expense categories, not dollar benchmarks - the app has no
 * source for "typical" claim amounts and does not invent one.
 */
const OCCUPATIONS: { id: string; label: string; items: ChecklistEntry[] }[] = [
  {
    id: 'office',
    label: 'Office / IT professional',
    items: [
      {
        category: 'working_from_home',
        title: 'Working from home',
        desc: 'Fixed rate method: 70c per hour for 2024–25 and 2025–26, covering energy, internet, phone and stationery. Devices and furniture are claimed separately.'
      },
      {
        category: 'tools_equipment',
        title: 'Tools and equipment',
        desc: 'Items up to $300 are claimed in full; above that, the decline in value is claimed over the asset’s effective life.'
      },
      {
        category: 'self_education',
        title: 'Self-education',
        desc: 'Course fees, textbooks and certifications that relate directly to your current work.'
      },
      {
        category: 'professional_memberships',
        title: 'Memberships and subscriptions',
        desc: 'Union fees, professional association memberships and work-related subscriptions.'
      }
    ]
  },
  {
    id: 'healthcare',
    label: 'Healthcare worker',
    items: [
      {
        category: 'clothing_laundry',
        title: 'Uniforms and laundry',
        desc: 'Compulsory uniforms and protective clothing, plus the cost of laundering them.'
      },
      {
        category: 'professional_memberships',
        title: 'Registration and memberships',
        desc: 'AHPRA registration, union fees and professional association memberships.'
      },
      {
        category: 'self_education',
        title: 'Continuing professional development',
        desc: 'CPD courses, conferences and journals required to maintain registration.'
      },
      {
        category: 'vehicle_travel',
        title: 'Vehicle and travel',
        desc: 'Travel between workplaces on the same day, or to a temporary work location.'
      }
    ]
  },
  {
    id: 'education',
    label: 'Teacher / educator',
    items: [
      {
        category: 'tools_equipment',
        title: 'Classroom supplies and equipment',
        desc: 'Teaching aids and equipment you paid for and were not reimbursed.'
      },
      {
        category: 'self_education',
        title: 'Self-education',
        desc: 'Study that maintains or improves the skills your current role requires.'
      },
      {
        category: 'vehicle_travel',
        title: 'Excursions and travel',
        desc: 'Travel for excursions, camps and between campuses on the same day.'
      },
      {
        category: 'professional_memberships',
        title: 'Union and memberships',
        desc: 'Teaching union fees and professional association memberships.'
      }
    ]
  },
  {
    id: 'trades',
    label: 'Trades / construction',
    items: [
      {
        category: 'tools_equipment',
        title: 'Tools and equipment',
        desc: 'Hand tools, power tools and safety equipment bought for work.'
      },
      {
        category: 'clothing_laundry',
        title: 'Protective clothing',
        desc: 'Hi-vis, steel-cap boots and protective gear, plus laundering costs.'
      },
      {
        category: 'vehicle_travel',
        title: 'Vehicle and travel',
        desc: 'Travel between sites, or carrying bulky tools where no secure storage exists on site.'
      },
      {
        category: 'phone_internet',
        title: 'Phone and internet',
        desc: 'The work-related portion of phone and data use, based on a representative period.'
      }
    ]
  }
];

const COMMON_ITEM: ChecklistEntry = {
  category: 'tax_agent_fees',
  title: 'Managing tax affairs',
  desc: 'Fees paid to a registered tax agent to prepare and lodge last year’s return.'
};

export const TaxOptimizationModal: React.FC<TaxOptimizationModalProps> = ({
  isOpen,
  onClose,
  currentFy,
  onOpenApiKeyModal
}) => {
  const [occupationId, setOccupationId] = useState(OCCUPATIONS[0].id);
  const [extraDeduction, setExtraDeduction] = useState(1000);
  const [aiResult, setAiResult] = useState<AiOptimizationResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [hasAttemptedAi, setHasAttemptedAi] = useState(false);

  const activeProvider = getActiveAiProvider();
  const providerName = getProviderDisplayName(activeProvider);
  const occupation = OCCUPATIONS.find((o) => o.id === occupationId)!;

  const runAiAnalysis = async () => {
    if (!activeProvider) return;
    setIsAnalyzing(true);
    setHasAttemptedAi(true);
    const result = await generateAiTaxOptimization(currentFy, occupation.label);
    setAiResult(result);
    setIsAnalyzing(false);
  };

  useEffect(() => {
    if (isOpen && activeProvider && !hasAttemptedAi) {
      void runAiAnalysis();
    }
    if (!isOpen) {
      setAiResult(null);
      setHasAttemptedAi(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const hasHELP = currentFy.helpRepayment > 0;
  const marginalRate = getMarginalRate(currentFy.taxableIncome, currentFy.id);
  // Tax and Medicare levy only. A lower income also lowers the compulsory HELP
  // repayment, but that debt is still owed - it is shown separately rather than
  // counted as money saved.
  const saving = calculateDeductionSaving(currentFy.taxableIncome, extraDeduction, false, currentFy.id);
  const helpDeferred = hasHELP
    ? Math.max(
        0,
        Math.round(
          calculateHELPRepayment(currentFy.taxableIncome, currentFy.id) -
            calculateHELPRepayment(Math.max(0, currentFy.taxableIncome - extraDeduction), currentFy.id)
        )
      )
    : 0;

  const checklist = [...occupation.items, COMMON_ITEM].map((item) => ({
    ...item,
    claimed: currentFy.deductions.some((d) => d.category === item.category)
  }));
  const aiItems = aiResult?.suggestions.map((s) => ({
    title: s.title,
    desc: s.description,
    claimed: s.alreadyClaimed,
    category: undefined as DeductionCategory | undefined
  }));
  const displayItems = aiItems ?? checklist;
  const claimedCount = displayItems.filter((i) => i.claimed).length;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Deduction review"
      subtitle={`${currentFy.label} · estimates only, not tax advice`}
      icon={<Sparkles className="h-4 w-4" />}
      size="lg"
      footer={
        <div className="flex items-center justify-between gap-3">
          <span className="text-[11px] text-zinc-500">
            Figures are estimates from your own stored data. Check with a registered tax agent before lodging.
          </span>
          <button
            onClick={onClose}
            className="shrink-0 rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 font-mono text-xs text-zinc-200 transition-colors hover:bg-zinc-700"
          >
            Done
          </button>
        </div>
      }
    >
      <div className="space-y-6">
        <section>
          <SectionLabel>What another deduction would save you</SectionLabel>
          <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <label htmlFor="extra-deduction" className="text-[11px] text-zinc-500">
                  Additional deductions claimed
                </label>
                <div className="mt-1 flex items-center gap-1.5">
                  <span className="font-mono text-lg text-zinc-500">$</span>
                  <input
                    id="extra-deduction"
                    type="number"
                    min={0}
                    step={100}
                    value={extraDeduction}
                    onChange={(e) => setExtraDeduction(Math.max(0, Number(e.target.value) || 0))}
                    className="w-28 rounded-lg border border-zinc-800 bg-zinc-900 px-2.5 py-1.5 font-mono text-lg font-bold text-zinc-100 transition-colors focus:border-emerald-500/60 focus:outline-none"
                  />
                </div>
              </div>

              <div className="text-right">
                <div className="text-[11px] text-zinc-500">Tax you would save</div>
                <div className="mt-1 font-mono text-2xl font-bold text-emerald-400">
                  ${saving.toLocaleString()}
                </div>
              </div>
            </div>

            <input
              type="range"
              min={0}
              max={10000}
              step={100}
              value={Math.min(extraDeduction, 10000)}
              onChange={(e) => setExtraDeduction(Number(e.target.value))}
              className="mt-4 w-full accent-emerald-500"
              aria-label="Additional deductions"
            />

            <p className="mt-3 flex items-start gap-2 text-[11px] leading-relaxed text-zinc-500">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>
                Income tax and Medicare levy against your taxable income of $
                {currentFy.taxableIncome.toLocaleString()} - a {Math.round(marginalRate * 100)}% marginal rate.
              </span>
            </p>

            {helpDeferred > 0 && (
              <p className="mt-2 border-t border-zinc-800 pt-2 text-[11px] leading-relaxed text-zinc-500">
                Your compulsory HELP repayment would also drop by{' '}
                <strong className="text-zinc-300">${helpDeferred.toLocaleString()}</strong> — that amount stays on
                the loan rather than being saved.
              </p>
            )}
          </div>
        </section>

        <section>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <SectionLabel>Categories to review</SectionLabel>
            <span className="font-mono text-[11px] text-zinc-500">
              {claimedCount} of {displayItems.length} claimed this year
            </span>
          </div>

          {!aiItems && (
            <select
              value={occupationId}
              onChange={(e) => setOccupationId(e.target.value)}
              className="mb-3 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2.5 font-mono text-xs text-zinc-100 transition-colors focus:border-emerald-500/60 focus:outline-none"
            >
              {OCCUPATIONS.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
          )}

          <div className="space-y-1.5">
            {displayItems.map((item) => (
              <div
                key={item.title}
                className="flex items-start gap-2.5 rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2.5"
              >
                {item.claimed ? (
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                ) : (
                  <Circle className="mt-0.5 h-4 w-4 shrink-0 text-zinc-600" />
                )}
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-zinc-200">{item.title}</span>
                    {!item.claimed && (
                      <span className="shrink-0 rounded bg-amber-500/15 px-1.5 py-0.5 font-mono text-[10px] text-amber-300">
                        nothing claimed
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-[11px] leading-relaxed text-zinc-500">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2.5">
          <span className="flex min-w-0 items-center gap-2 text-[11px] text-zinc-400">
            <Sparkles className={`h-3.5 w-3.5 shrink-0 ${activeProvider ? 'text-emerald-400' : 'text-zinc-600'}`} />
            {isAnalyzing ? (
              <span className="flex items-center gap-1.5">
                <BrailleSpinner className="text-emerald-400" />
                <span>Reviewing with {providerName}…</span>
              </span>
            ) : aiResult ? (
              <span>
                Categories suggested by <strong className="text-zinc-200">{providerName}</strong> from your stored
                deductions.
              </span>
            ) : activeProvider ? (
              <span>{providerName} was unavailable - showing the standard category list.</span>
            ) : (
              <span>Add a provider key for a review based on your own deduction history.</span>
            )}
          </span>

          {activeProvider ? (
            <button
              onClick={() => void runAiAnalysis()}
              disabled={isAnalyzing}
              className="flex shrink-0 items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-800 px-2.5 py-1.5 font-mono text-[11px] text-zinc-200 transition-colors hover:bg-zinc-700 disabled:opacity-40"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isAnalyzing ? 'animate-spin' : ''}`} />
              Re-run
            </button>
          ) : (
            onOpenApiKeyModal && (
              <button
                onClick={onOpenApiKeyModal}
                className="flex shrink-0 items-center gap-1.5 rounded-lg bg-emerald-500/15 px-2.5 py-1.5 font-mono text-[11px] font-semibold text-emerald-300 transition-colors hover:bg-emerald-500/25"
              >
                <KeyRound className="h-3 w-3" />
                Add key
              </button>
            )
          )}
        </section>
      </div>
    </Modal>
  );
};
