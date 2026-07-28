import React, { useState } from 'react';
import { GitCompare, Sparkles } from 'lucide-react';
import type { AustralianFinancialYear } from '../../types/tax';
import { YearChangeCard } from '../common/InsightCards';
import { describeObservedChange } from '../../lib/compareYears';

interface CompareYearsSectionProps {
  financialYears: AustralianFinancialYear[];
}

export const CompareYearsSection: React.FC<CompareYearsSectionProps> = ({ financialYears }) => {
  const [fyIdA, setFyIdA] = useState<string>(financialYears[1]?.id || '2024-25');
  const [fyIdB, setFyIdB] = useState<string>(financialYears[0]?.id || '2025-26');

  const fyA = financialYears.find((f) => f.id === fyIdA) || financialYears[1];
  const fyB = financialYears.find((f) => f.id === fyIdB) || financialYears[0];

  if (!fyA || !fyB) {
    return (
      <div className="glass-panel p-8 text-center space-y-2">
        <h3 className="text-sm font-semibold text-zinc-200">Need at least two financial years to compare</h3>
        <p className="text-xs text-zinc-400">Upload documents for another financial year to unlock year-over-year comparison.</p>
      </div>
    );
  }

  const calcChange = (valA: number, valB: number) => {
    if (valA === 0) return { pct: 'N/A', diff: valB, isPositive: true };
    const diff = valB - valA;
    const pctVal = (diff / valA) * 100;
    return {
      pct: `${pctVal >= 0 ? '+' : ''}${pctVal.toFixed(1)}%`,
      diff,
      isPositive: diff >= 0
    };
  };

  const rows: Array<{
    label: string;
    valA: number;
    valB: number;
    direction: 'positive' | 'negative' | 'neutral';
  }> = [
    { label: 'Gross income', valA: fyA.grossIncome, valB: fyB.grossIncome, direction: 'positive' },
    { label: 'Taxable income', valA: fyA.taxableIncome, valB: fyB.taxableIncome, direction: 'neutral' },
    { label: 'Deductions', valA: fyA.totalDeductions, valB: fyB.totalDeductions, direction: 'neutral' },
    { label: 'Tax withheld', valA: fyA.taxWithheld, valB: fyB.taxWithheld, direction: 'neutral' },
    { label: 'HELP repayment', valA: fyA.helpRepayment, valB: fyB.helpRepayment, direction: 'negative' },
    { label: 'Assessment result', valA: fyA.assessmentResult, valB: fyB.assessmentResult, direction: 'positive' },
    { label: 'Employer super', valA: fyA.employerSuper, valB: fyB.employerSuper, direction: 'positive' }
  ];

  // fyA is the earlier year in the selectors; the card reads newest-first.
  const orderedForChange = fyA.id <= fyB.id ? [fyB, fyA] : [fyA, fyB];

  return (
    <div className="space-y-6">
      <YearChangeCard years={orderedForChange} />

      {/* Header & Year Selectors */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800 pb-4">
        <div>
          <h2 className="text-xl font-bold text-zinc-100 flex items-center gap-2">
            <GitCompare className="w-5 h-5 text-emerald-400" />
            <span>Financial Year Side-by-Side Comparison</span>
          </h2>
          <p className="text-xs text-zinc-400">
            Compare Australian tax returns, income variance, and refund movements
          </p>
        </div>

        <div className="flex items-center gap-3 bg-zinc-900/90 border border-zinc-800 p-2 rounded-xl">
          <select
            aria-label="Earlier financial year"
            value={fyIdA}
            onChange={(e) => setFyIdA(e.target.value)}
            className="bg-zinc-950 text-zinc-100 text-xs font-mono font-bold py-1.5 px-3 rounded border border-zinc-800 focus:outline-none"
          >
            {financialYears.map((f) => (
              <option key={f.id} value={f.id}>
                {f.label}
              </option>
            ))}
          </select>
          <span className="text-xs font-bold text-zinc-500 font-mono">VS</span>
          <select
            aria-label="Later financial year"
            value={fyIdB}
            onChange={(e) => setFyIdB(e.target.value)}
            className="bg-zinc-950 text-zinc-100 text-xs font-mono font-bold py-1.5 px-3 rounded border border-zinc-800 focus:outline-none"
          >
            {financialYears.map((f) => (
              <option key={f.id} value={f.id}>
                {f.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Structured Comparison Table */}
      <div className="glass-panel overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm font-mono">
            <thead className="bg-zinc-950 text-zinc-400 border-b border-zinc-800">
              <tr>
                <th className="p-4">Metric</th>
                <th className="p-4 text-right">{fyA.label}</th>
                <th className="p-4 text-right">{fyB.label}</th>
                <th className="p-4 text-right">Variance / Change</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {rows.map((r, idx) => {
                const change = calcChange(r.valA, r.valB);
                const positiveDirection =
                  r.direction === 'neutral'
                    ? null
                    : r.direction === 'positive'
                      ? change.diff >= 0
                      : change.diff <= 0;
                return (
                  <tr key={idx} className="hover:bg-zinc-900/50">
                    <td className="p-4 font-semibold text-zinc-200">{r.label}</td>
                    <td className="p-4 text-right text-zinc-400">${r.valA.toLocaleString()}</td>
                    <td className="p-4 text-right font-bold text-zinc-100">${r.valB.toLocaleString()}</td>
                    <td className="p-4 text-right">
                      <span
                        className={`inline-flex items-center gap-1 font-bold px-2 py-0.5 rounded text-xs ${
                          positiveDirection === true
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : positiveDirection === false
                              ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                              : 'bg-zinc-800 text-zinc-300 border border-zinc-700'
                        }`}
                      >
                        {change.pct}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Plain English Variance Explanation Box */}
      <div className="glass-panel p-6 space-y-3 bg-emerald-950/10 border-emerald-500/30">
        <div className="flex items-center gap-2 text-emerald-400">
          <Sparkles className="w-5 h-5" />
          <h3 className="font-semibold text-sm font-mono uppercase tracking-wider">
            Plain English Variance Explanation
          </h3>
        </div>
        <div className="text-xs text-zinc-300 space-y-2 leading-relaxed font-sans">
          <p>
            Comparing <strong>{fyA.label}</strong> to <strong>{fyB.label}</strong>:
          </p>
          <ul className="list-disc list-inside space-y-1 pl-2 text-zinc-300">
            <li>{describeObservedChange('Gross income', fyA.grossIncome, fyB.grossIncome)}</li>
            <li>{describeObservedChange('Recorded deductions', fyA.totalDeductions, fyB.totalDeductions)}</li>
            <li>{describeObservedChange('Assessment result', fyA.assessmentResult, fyB.assessmentResult)}</li>
            <li>{describeObservedChange('HELP repayment', fyA.helpRepayment, fyB.helpRepayment)}</li>
          </ul>
        </div>
      </div>
    </div>
  );
};
