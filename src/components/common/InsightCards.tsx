import React from 'react';
import { CalendarClock, Gauge, ArrowRight, TrendingUp, TrendingDown } from 'lucide-react';
import type { AustralianFinancialYear } from '../../types/tax';
import {
  compareFinancialYears,
  getIndexationOutlook,
  getNearbyThresholds
} from '../../engine/insights';

const money = (value: number) => `$${Math.abs(Math.round(value)).toLocaleString()}`;
const signed = (value: number) => `${value >= 0 ? '+' : '−'}${money(value)}`;

/** Cost of the next indexation date, and what repaying early avoids. */
export const IndexationCard: React.FC<{ currentFy: AustralianFinancialYear }> = ({ currentFy }) => {
  const outlook = getIndexationOutlook(currentFy);
  if (!outlook) return null;

  const dateLabel = outlook.indexationDate.toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  return (
    <div className="glass-panel p-5">
      <div className="mb-3 flex items-center gap-2">
        <CalendarClock className="h-4 w-4 text-amber-400" />
        <h3 className="font-mono text-sm font-semibold text-zinc-200">Indexation on {dateLabel}</h3>
      </div>

      <div className="flex flex-wrap items-end gap-x-8 gap-y-3">
        <div>
          <div className="text-[11px] text-zinc-500">Estimated indexation</div>
          <div className="mt-0.5 font-mono text-2xl font-bold text-amber-400">
            {money(outlook.estimatedIndexation)}
          </div>
        </div>
        <div>
          <div className="text-[11px] text-zinc-500">On a balance of</div>
          <div className="mt-0.5 font-mono text-lg text-zinc-300">{money(outlook.balance)}</div>
        </div>
        <div>
          <div className="text-[11px] text-zinc-500">Days remaining</div>
          <div className="mt-0.5 font-mono text-lg text-zinc-300">{outlook.daysUntil}</div>
        </div>
      </div>

      <p className="mt-3 border-t border-zinc-800 pt-3 text-[11px] leading-relaxed text-zinc-400">
        Every <strong className="text-zinc-200">$1,000</strong> repaid before {dateLabel} avoids about{' '}
        <strong className="text-emerald-400">{money(outlook.savingPerThousand)}</strong> of indexation, at the{' '}
        {(outlook.rate * 100).toFixed(1)}% rate applied in {outlook.rateYear}. The rate for the coming year is set
        after the December CPI and WPI figures, and indexation applies only to amounts unpaid for more than
        11 months.
      </p>
    </div>
  );
};

/** Thresholds close enough that a modest change in income crosses them. */
export const ThresholdCard: React.FC<{ currentFy: AustralianFinancialYear }> = ({ currentFy }) => {
  const nearby = getNearbyThresholds(currentFy.taxableIncome, currentFy.id);
  if (nearby.length === 0) return null;

  return (
    <div className="glass-panel p-5">
      <div className="mb-3 flex items-center gap-2">
        <Gauge className="h-4 w-4 text-blue-400" />
        <h3 className="text-sm font-semibold text-zinc-200">Thresholds within reach</h3>
      </div>

      <div className="space-y-2.5">
        {nearby.map((threshold) => (
          <div key={threshold.label} className="rounded-lg border border-white/[0.07] bg-white/[0.025] px-3 py-2.5">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
              <span className="text-xs font-semibold text-zinc-200">{threshold.label}</span>
              <span className="font-mono text-[11px] text-zinc-400">
                <strong className={threshold.isBelow ? 'text-emerald-400' : 'text-amber-400'}>
                  {money(threshold.distance)}
                </strong>{' '}
                {threshold.isBelow ? 'below' : 'above'} {money(threshold.amount)}
              </span>
            </div>
            <p className="mt-1 text-[11px] leading-relaxed text-zinc-500">{threshold.consequence}</p>
          </div>
        ))}
      </div>

      <p className="mt-3 text-[11px] text-zinc-500">
        Based on taxable income of {money(currentFy.taxableIncome)} for {currentFy.label}.
      </p>
    </div>
  );
};

/** Why this year's tax differs from last year's, split by cause. */
export const YearChangeCard: React.FC<{ years: AustralianFinancialYear[] }> = ({ years }) => {
  if (years.length < 2) return null;

  const [current, previous] = years;
  const diff = compareFinancialYears(current, previous);
  const Trend = diff.totalTaxChange >= 0 ? TrendingUp : TrendingDown;
  const trendColour = diff.totalTaxChange >= 0 ? 'text-rose-400' : 'text-emerald-400';

  const rows = [
    { label: 'Gross income', value: diff.grossIncomeChange },
    { label: 'Deductions claimed', value: diff.deductionsChange },
    { label: 'Taxable income', value: diff.taxableIncomeChange },
    { label: 'Employer super', value: diff.superChange }
  ];

  return (
    <div className="glass-panel p-5">
      <div className="mb-3 flex items-center gap-2">
        <Trend className={`h-4 w-4 ${trendColour}`} />
        <h3 className="font-mono text-sm font-semibold text-zinc-200">
          {diff.previousLabel} to {diff.currentLabel}
        </h3>
      </div>

      <div className="mb-4 rounded-lg border border-zinc-800 bg-zinc-950 px-3.5 py-3">
        <div className="text-[11px] text-zinc-500">Total tax and levies</div>
        <div className={`mt-0.5 font-mono text-2xl font-bold ${trendColour}`}>
          {signed(diff.totalTaxChange)}
        </div>

        {/* The split an assessment never shows: your circumstances versus the rules. */}
        <div className="mt-3 space-y-1.5 border-t border-zinc-800 pt-3 text-[11px]">
          <div className="flex items-center justify-between gap-3">
            <span className="text-zinc-400">Because your income and deductions changed</span>
            <span className="font-mono text-zinc-200">{signed(diff.fromIncomeChange)}</span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-zinc-400">Because the tax rates changed</span>
            <span className="font-mono text-zinc-200">{signed(diff.fromRateChange)}</span>
          </div>
        </div>
      </div>

      <div className="space-y-1.5">
        {rows.map((row) => (
          <div
            key={row.label}
            className="flex items-center justify-between gap-3 border-b border-zinc-800/60 pb-1.5 text-xs last:border-0"
          >
            <span className="text-zinc-400">{row.label}</span>
            <span className={`font-mono ${row.value >= 0 ? 'text-zinc-200' : 'text-zinc-400'}`}>
              {signed(row.value)}
            </span>
          </div>
        ))}
      </div>

      {diff.marginalRateBefore !== diff.marginalRateAfter && (
        <p className="mt-3 flex items-center gap-1.5 text-[11px] text-zinc-400">
          Marginal rate
          <span className="font-mono text-zinc-300">{Math.round(diff.marginalRateBefore * 100)}%</span>
          <ArrowRight className="h-3 w-3 text-zinc-600" />
          <span className="font-mono text-emerald-400">{Math.round(diff.marginalRateAfter * 100)}%</span>
        </p>
      )}
    </div>
  );
};
