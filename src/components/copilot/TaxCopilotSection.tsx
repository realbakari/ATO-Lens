import React from 'react';
import {
  AlertTriangle,
  ArrowUpRight,
  Check,
  CheckCircle2,
  Circle,
  ClipboardCheck,
  Download,
  FileSearch,
  LockKeyhole,
  ShieldCheck,
  UserRoundCheck
} from 'lucide-react';
import { detectAtoFields, resolveAtoFieldManifest } from '../../data/atoFieldManifest';
import {
  createEmptyTaxCopilotState,
  evaluateTaxCopilotReadiness
} from '../../engine/taxCopilotReadiness';
import { buildTaxPrepPdf } from '../../lib/taxPrepPdf';
import type {
  AustralianFinancialYear,
  TaxCopilotAnswer,
  TaxCopilotCheckStatus,
  TaxCopilotFieldStatus,
  TaxCopilotSituation,
  TaxCopilotState,
  TaxResidencyStatus
} from '../../types/tax';

interface TaxCopilotSectionProps {
  currentFy: AustralianFinancialYear;
  readOnly?: boolean;
  onChange?: (state: TaxCopilotState) => void;
  onOpenUpload: () => void;
}

interface AnswerQuestionProps {
  label: string;
  description: string;
  value?: TaxCopilotAnswer;
  disabled: boolean;
  onChange: (value: TaxCopilotAnswer | undefined) => void;
}

const SITUATION_QUESTIONS: Array<{
  key: keyof Pick<
    TaxCopilotSituation,
    'under18' | 'hasSpouse' | 'hasDependants' | 'hasPrivateHealthInsurance' | 'hasStudyLoan'
  >;
  label: string;
  description: string;
}> = [
  {
    key: 'under18',
    label: 'Under 18 at 30 June',
    description: 'Different tax rules can apply to some income earned by minors.'
  },
  {
    key: 'hasSpouse',
    label: 'Spouse during the income year',
    description: 'Spouse income can affect Medicare and several offsets.'
  },
  {
    key: 'hasDependants',
    label: 'Dependent children',
    description: 'Dependants can affect Medicare levy and surcharge calculations.'
  },
  {
    key: 'hasPrivateHealthInsurance',
    label: 'Private health insurance',
    description: 'Policy details and private hospital cover need to be checked in myTax.'
  },
  {
    key: 'hasStudyLoan',
    label: 'HELP or another study loan',
    description: 'Repayment income can include amounts outside taxable income.'
  }
];

const COMPLEXITY_QUESTIONS: Array<{
  key: keyof Pick<
    TaxCopilotSituation,
    | 'hasCapitalGains'
    | 'hasRentalProperty'
    | 'hasForeignIncomeOrAssets'
    | 'hasBusinessOrPsi'
    | 'hasTrustOrPartnershipIncome'
    | 'isDeceasedEstate'
  >;
  label: string;
  description: string;
}> = [
  {
    key: 'hasCapitalGains',
    label: 'Capital gains or losses',
    description: 'Shares, crypto, property and other CGT events.'
  },
  {
    key: 'hasRentalProperty',
    label: 'Rental property',
    description: 'Rental income, ownership shares, interest and other expenses.'
  },
  {
    key: 'hasForeignIncomeOrAssets',
    label: 'Foreign income or assets',
    description: 'Foreign employment, pensions, investments, entities or residency issues.'
  },
  {
    key: 'hasBusinessOrPsi',
    label: 'Business or personal services income',
    description: 'Sole-trader income, PSI tests and non-commercial losses.'
  },
  {
    key: 'hasTrustOrPartnershipIncome',
    label: 'Trust or partnership income',
    description: 'Distributions, credits and shares of income or loss.'
  },
  {
    key: 'isDeceasedEstate',
    label: 'Deceased estate',
    description: 'Estate returns have separate authority and administration requirements.'
  }
];

const CHECKS: Array<{
  key: keyof TaxCopilotState['checks'];
  label: string;
  description: string;
  allowNotApplicable?: boolean;
}> = [
  {
    key: 'incomeStatementsTaxReady',
    label: 'Income statements are tax ready',
    description: 'Check each relevant income statement in myGov or myTax before relying on it.',
    allowNotApplicable: true
  },
  {
    key: 'prefillReviewed',
    label: 'ATO pre-fill has been reviewed',
    description: 'Confirm pre-filled amounts and add anything missing.'
  },
  {
    key: 'deductionsReviewed',
    label: 'All possible deductions have been reviewed',
    description: 'Check both recorded claims and expenses that may still be missing.'
  },
  {
    key: 'evidenceReviewed',
    label: 'Deduction evidence and calculations are ready',
    description: 'Claims below $300 still need a calculation basis; special record rules can apply.',
    allowNotApplicable: true
  },
  {
    key: 'medicareAndIncomeTestsReviewed',
    label: 'Medicare and income-test fields have been reviewed',
    description: 'Include spouse, private health, fringe benefits, reportable super and investment losses.'
  }
];

const SELECT_CLASS =
  'w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs text-zinc-100 transition-colors focus:border-emerald-500/70 disabled:cursor-not-allowed disabled:opacity-50';

const READINESS_TONE: Record<string, string> = {
  not_started: 'border-zinc-700 bg-zinc-900/60 text-zinc-300',
  waiting_for_tax_ready: 'border-amber-500/30 bg-amber-500/10 text-amber-200',
  needs_information: 'border-amber-500/30 bg-amber-500/10 text-amber-200',
  needs_evidence: 'border-amber-500/30 bg-amber-500/10 text-amber-200',
  ready_to_review_in_mytax: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200',
  agent_recommended: 'border-amber-500/30 bg-amber-500/10 text-amber-200'
};

function AnswerQuestion({
  label,
  description,
  value,
  disabled,
  onChange
}: AnswerQuestionProps) {
  return (
    <label className="grid gap-3 border-b border-white/[0.06] py-3 last:border-b-0 sm:grid-cols-[minmax(0,1fr)_10rem] sm:items-center">
      <span>
        <span className="block text-sm font-medium text-zinc-200">{label}</span>
        <span className="mt-0.5 block text-xs leading-5 text-zinc-500">{description}</span>
      </span>
      <select
        value={value ?? ''}
        disabled={disabled}
        onChange={(event) =>
          onChange((event.target.value || undefined) as TaxCopilotAnswer | undefined)
        }
        className={SELECT_CLASS}
      >
        <option value="">Not answered</option>
        <option value="yes">Yes</option>
        <option value="no">No</option>
        <option value="unsure">Not sure</option>
      </select>
    </label>
  );
}

export const TaxCopilotSection: React.FC<TaxCopilotSectionProps> = ({
  currentFy,
  readOnly = false,
  onChange,
  onOpenUpload
}) => {
  const state = currentFy.taxCopilot ?? createEmptyTaxCopilotState();
  const resolvedManifest = resolveAtoFieldManifest(currentFy.id);
  const detectedFields = detectAtoFields(currentFy);
  const readiness = evaluateTaxCopilotReadiness(currentFy, state);

  const emit = (next: TaxCopilotState) => {
    if (readOnly || !onChange) return;
    onChange({ ...next, lastUpdated: new Date().toISOString() });
  };

  const setSituation = <K extends keyof TaxCopilotSituation>(
    key: K,
    value: TaxCopilotSituation[K]
  ) => {
    emit({ ...state, situation: { ...state.situation, [key]: value } });
  };

  const setCheck = (
    key: keyof TaxCopilotState['checks'],
    value: TaxCopilotCheckStatus | undefined
  ) => {
    emit({ ...state, checks: { ...state.checks, [key]: value } });
  };

  const setFieldStatus = (fieldId: string, value: TaxCopilotFieldStatus | undefined) => {
    const fieldStatuses = { ...state.fieldStatuses };
    if (value) fieldStatuses[fieldId] = value;
    else delete fieldStatuses[fieldId];
    emit({ ...state, fieldStatuses });
  };

  const downloadSummary = () => {
    const content = buildTaxPrepPdf(currentFy, state);
    const buffer = new ArrayBuffer(content.byteLength);
    new Uint8Array(buffer).set(content);
    const blob = new Blob([buffer], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `ATO-Lens-myTax-Prep-${currentFy.id}.pdf`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col justify-between gap-4 border-b border-zinc-800 pb-4 lg:flex-row lg:items-end">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-emerald-400">
            <ClipboardCheck className="h-4 w-4" />
            Tax return copilot
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-zinc-100">Prepare for myTax</h2>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-zinc-400">
            Check completeness, records and return sections before continuing through an official
            lodgment channel.
          </p>
        </div>
        <div
          className={`rounded-xl border px-4 py-3 text-sm ${READINESS_TONE[readiness.status]}`}
          role="status"
          aria-live="polite"
        >
          <div className="font-semibold">{readiness.label}</div>
          <div className="mt-0.5 text-xs opacity-80">
            {readiness.completedSteps} of {readiness.totalSteps} preparation steps complete
          </div>
        </div>
      </header>

      {readOnly && (
        <div className="flex flex-col justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.025] p-4 sm:flex-row sm:items-center">
          <div>
            <div className="text-sm font-semibold text-zinc-200">Sample checklist preview</div>
            <p className="mt-1 text-xs text-zinc-500">
              Sample data is read-only. Upload a document to create a private, editable workspace.
            </p>
          </div>
          <button
            type="button"
            onClick={onOpenUpload}
            className="shrink-0 rounded-lg bg-emerald-500 px-3 py-2 text-xs font-semibold text-zinc-950 transition-colors hover:bg-emerald-400"
          >
            Upload your document
          </button>
        </div>
      )}

      <section className="grid gap-3 lg:grid-cols-[minmax(0,1.4fr)_minmax(18rem,0.6fr)]">
        <div className="glass-panel p-5">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" />
            <div>
              <h3 className="text-sm font-semibold text-zinc-100">Advice and preparation only</h3>
              <p className="mt-1 text-xs leading-5 text-zinc-400">
                ATO Lens does not lodge returns, connect to myGov or decide whether a claim is
                allowable. You remain responsible for reviewing the official return in myTax, or
                you can use a registered tax agent.
              </p>
            </div>
          </div>
        </div>
        <div className="glass-panel p-5">
          <div className="flex items-start gap-3">
            <LockKeyhole className="mt-0.5 h-5 w-5 shrink-0 text-zinc-400" />
            <div>
              <h3 className="text-sm font-semibold text-zinc-100">Sensitive fields stay out</h3>
              <p className="mt-1 text-xs leading-5 text-zinc-400">
                Do not enter a TFN, myGov password, bank account or spouse government identifier
                here. Confirm them only in myTax.
              </p>
            </div>
          </div>
        </div>
      </section>

      {resolvedManifest.status !== 'exact' && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs leading-5 text-amber-100">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
          <div>
            <div className="font-semibold">Financial-year mapping needs confirmation</div>
            <p className="mt-0.5 text-amber-200/80">{resolvedManifest.notice}</p>
          </div>
        </div>
      )}

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="glass-panel overflow-hidden">
          <div className="border-b border-white/[0.07] px-5 py-4">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-zinc-100">
              <UserRoundCheck className="h-4 w-4 text-emerald-400" />
              Your situation
            </h3>
            <p className="mt-1 text-xs text-zinc-500">
              These answers identify return sections; they do not calculate an entitlement.
            </p>
          </div>
          <div className="px-5">
            <label className="grid gap-3 border-b border-white/[0.06] py-3 sm:grid-cols-[minmax(0,1fr)_13rem] sm:items-center">
              <span>
                <span className="block text-sm font-medium text-zinc-200">Tax residency</span>
                <span className="mt-0.5 block text-xs leading-5 text-zinc-500">
                  Residency is a tax-law question and is not the same as citizenship.
                </span>
              </span>
              <select
                value={state.situation.residency ?? ''}
                disabled={readOnly}
                onChange={(event) =>
                  setSituation(
                    'residency',
                    (event.target.value || undefined) as TaxResidencyStatus | undefined
                  )
                }
                className={SELECT_CLASS}
              >
                <option value="">Not answered</option>
                <option value="full_year">Australian resident — full year</option>
                <option value="part_year">Australian resident — part year</option>
                <option value="foreign">Foreign resident</option>
                <option value="unsure">Not sure</option>
              </select>
            </label>
            {SITUATION_QUESTIONS.map((question) => (
              <AnswerQuestion
                key={question.key}
                label={question.label}
                description={question.description}
                value={state.situation[question.key]}
                disabled={readOnly}
                onChange={(value) => setSituation(question.key, value)}
              />
            ))}
          </div>
        </div>

        <div className="glass-panel p-5">
          <h3 className="text-sm font-semibold text-zinc-100">Preparation progress</h3>
          <div className="mt-4 space-y-4">
            {readiness.steps.map((step) => (
              <div key={step.id} className="flex gap-3">
                {step.complete ? (
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                ) : (
                  <Circle className="mt-0.5 h-4 w-4 shrink-0 text-zinc-600" />
                )}
                <div>
                  <div className={step.complete ? 'text-xs font-semibold text-zinc-200' : 'text-xs font-medium text-zinc-400'}>
                    {step.label}
                  </div>
                  <p className="mt-0.5 text-[11px] leading-4 text-zinc-600">{step.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="glass-panel overflow-hidden">
        <div className="border-b border-white/[0.07] px-5 py-4">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-zinc-100">
            <FileSearch className="h-4 w-4 text-emerald-400" />
            Readiness checks
          </h3>
          <p className="mt-1 text-xs text-zinc-500">
            Mark a check complete only after reviewing the source in myTax or your own records.
          </p>
        </div>
        <div className="divide-y divide-white/[0.06] px-5">
          {CHECKS.map((check) => (
            <label
              key={check.key}
              className="grid gap-3 py-3 sm:grid-cols-[minmax(0,1fr)_11rem] sm:items-center"
            >
              <span>
                <span className="block text-sm font-medium text-zinc-200">{check.label}</span>
                <span className="mt-0.5 block text-xs leading-5 text-zinc-500">
                  {check.description}
                </span>
              </span>
              <select
                value={state.checks[check.key] ?? ''}
                disabled={readOnly}
                onChange={(event) =>
                  setCheck(
                    check.key,
                    (event.target.value || undefined) as TaxCopilotCheckStatus | undefined
                  )
                }
                className={SELECT_CLASS}
              >
                <option value="">Not checked</option>
                <option value="done">Reviewed</option>
                <option value="not_yet">Not yet</option>
                {check.allowNotApplicable && <option value="not_applicable">Not applicable</option>}
              </select>
            </label>
          ))}
        </div>
      </section>

      <section className="glass-panel overflow-hidden">
        <div className="border-b border-white/[0.07] px-5 py-4">
          <h3 className="text-sm font-semibold text-zinc-100">ATO return field map</h3>
          <p className="mt-1 text-xs leading-5 text-zinc-500">
            “Detected” means ATO Lens found a related record. It is not confirmation that the
            amount belongs at that label.
          </p>
        </div>
        <div className="divide-y divide-white/[0.07]">
          {resolvedManifest.manifest.groups.map((group) => {
            const reviewedCount = group.fields.filter((field) => {
              const status = state.fieldStatuses[field.id];
              return status === 'confirmed' || status === 'not_applicable';
            }).length;

            return (
              <details key={group.id} className="group" open={group.id === 'situation' ? true : undefined}>
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 transition-colors hover:bg-white/[0.025]">
                  <span>
                    <span className="block text-sm font-semibold text-zinc-200">{group.label}</span>
                    <span className="mt-0.5 block text-xs text-zinc-500">{group.description}</span>
                  </span>
                  <span className="shrink-0 font-mono text-[11px] text-zinc-500">
                    {reviewedCount}/{group.fields.length} reviewed
                  </span>
                </summary>
                <div className="border-t border-white/[0.05]">
                  {group.fields.map((field) => {
                    const detected = detectedFields.has(field.id);
                    const fieldStatus = state.fieldStatuses[field.id];
                    return (
                      <div
                        key={field.id}
                        className="grid gap-3 border-b border-white/[0.05] px-5 py-3 last:border-b-0 md:grid-cols-[4rem_minmax(0,1fr)_11rem] md:items-start"
                      >
                        <span className="w-fit rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1 font-mono text-[10px] font-semibold text-zinc-300">
                          {field.atoCode}
                        </span>
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs font-semibold text-zinc-200">{field.label}</span>
                            {detected && (
                              <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
                                Detected — confirm
                              </span>
                            )}
                            {field.sensitive && (
                              <span className="rounded-full border border-zinc-700 px-2 py-0.5 text-[10px] text-zinc-400">
                                Confirm only in myTax
                              </span>
                            )}
                            {field.agentReviewRecommended && (
                              <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-[10px] text-amber-300">
                                Agent review may help
                              </span>
                            )}
                          </div>
                          <p className="mt-1 text-[11px] leading-4 text-zinc-500">{field.description}</p>
                          {field.evidenceHint && (
                            <p className="mt-1 text-[11px] leading-4 text-amber-300/70">
                              Records: {field.evidenceHint}
                            </p>
                          )}
                        </div>
                        <select
                          aria-label={`${field.label} review status`}
                          value={fieldStatus ?? ''}
                          disabled={readOnly}
                          onChange={(event) =>
                            setFieldStatus(
                              field.id,
                              (event.target.value || undefined) as TaxCopilotFieldStatus | undefined
                            )
                          }
                          className={SELECT_CLASS}
                        >
                          <option value="">{detected ? 'Detected — review' : 'Not reviewed'}</option>
                          <option value="needs_review">Needs review</option>
                          <option value="confirmed">Confirmed in myTax</option>
                          <option value="not_applicable">Not applicable</option>
                        </select>
                      </div>
                    );
                  })}
                  <div className="bg-white/[0.015] px-5 py-3 text-right">
                    <a
                      href={group.sourceUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] font-medium text-zinc-400 hover:text-zinc-200"
                    >
                      Open the ATO source
                      <ArrowUpRight className="h-3 w-3" />
                    </a>
                  </div>
                </div>
              </details>
            );
          })}
        </div>
      </section>

      <section className="glass-panel p-5">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <div>
            <h3 className="text-sm font-semibold text-zinc-100">When an agent may help</h3>
            <p className="mt-1 text-xs leading-5 text-zinc-500">
              These answers do not force a choice. They make complex areas visible before handoff.
            </p>
            <div className="mt-3">
              {COMPLEXITY_QUESTIONS.map((question) => (
                <AnswerQuestion
                  key={question.key}
                  label={question.label}
                  description={question.description}
                  value={state.situation[question.key]}
                  disabled={readOnly}
                  onChange={(value) => setSituation(question.key, value)}
                />
              ))}
            </div>
          </div>
          <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4">
            <div className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
              Current signal
            </div>
            {readiness.agentReasons.length > 0 ? (
              <div className="mt-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-amber-200">
                  <AlertTriangle className="h-4 w-4 text-amber-400" />
                  Agent review recommended
                </div>
                <ul className="mt-3 space-y-2 text-xs leading-5 text-zinc-400">
                  {readiness.agentReasons.map((reason) => (
                    <li key={reason} className="flex gap-2">
                      <span className="text-amber-400">•</span>
                      <span>{reason}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="mt-3 text-xs leading-5 text-zinc-400">
                No complex circumstances have been flagged yet. That is not a guarantee that an
                agent is unnecessary.
              </p>
            )}
          </div>
        </div>
      </section>

      <section className="glass-panel p-5">
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-start">
          <div className="max-w-2xl">
            <h3 className="text-sm font-semibold text-zinc-100">Choose the official next step</h3>
            <p className="mt-1 text-xs leading-5 text-zinc-500">
              ATO Lens stops at preparation. Lodgment happens in myTax or through a registered tax
              agent.
            </p>
            <div className="mt-4 grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Lodgment handoff">
              {[
                {
                  id: 'mytax' as const,
                  label: 'I will use myTax',
                  description: 'Review and lodge the return yourself in the official service.'
                },
                {
                  id: 'tax_agent' as const,
                  label: 'I will use a tax agent',
                  description: 'Provide the preparation summary to a registered tax agent.'
                }
              ].map((choice) => {
                const active = state.handoffChoice === choice.id;
                return (
                  <button
                    key={choice.id}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    disabled={readOnly}
                    onClick={() => emit({ ...state, handoffChoice: choice.id })}
                    className={`rounded-xl border p-3 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                      active
                        ? 'border-emerald-500/40 bg-emerald-500/10'
                        : 'border-zinc-800 bg-zinc-950 hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex items-center gap-2 text-xs font-semibold text-zinc-200">
                      {active && <Check className="h-3.5 w-3.5 text-emerald-400" />}
                      {choice.label}
                    </div>
                    <p className="mt-1 text-[11px] leading-4 text-zinc-500">{choice.description}</p>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex w-full flex-col gap-2 lg:w-72">
            <a
              href="https://www.ato.gov.au/individuals-and-families/your-tax-return/how-to-lodge-your-tax-return"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-between rounded-lg bg-emerald-500 px-3 py-2.5 text-xs font-semibold text-zinc-950 transition-colors hover:bg-emerald-400"
            >
              Open official myTax guidance
              <ArrowUpRight className="h-3.5 w-3.5" />
            </a>
            <a
              href="https://www.tpb.gov.au/public-register"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-between rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2.5 text-xs font-semibold text-zinc-200 transition-colors hover:bg-zinc-800"
            >
              Find a registered tax agent
              <ArrowUpRight className="h-3.5 w-3.5" />
            </a>
            <button
              type="button"
              onClick={downloadSummary}
              className="inline-flex items-center justify-between rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2.5 text-xs font-semibold text-zinc-200 transition-colors hover:bg-zinc-800"
            >
              Download preparation PDF
              <Download className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};
