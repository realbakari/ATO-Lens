import React, { useState } from 'react';
import { Clock } from 'lucide-react';
import type { AustralianFinancialYear } from '../../types/tax';
import { Sparkline } from './Sparkline';

interface StatsHeaderBarProps {
  financialYears: AustralianFinancialYear[];
  selectedFy: AustralianFinancialYear;
}

type TimeUnit = 'daily' | 'hourly' | 'minute' | 'second';

export const StatsHeaderBar: React.FC<StatsHeaderBarProps> = ({
  financialYears,
  selectedFy
}) => {
  const [timeUnit, setTimeUnit] = useState<TimeUnit>('hourly');

  // Compute sparklines across all FYs
  const grossValues = financialYears.map((f) => f.grossIncome).reverse();
  const taxValues = financialYears.map((f) => f.taxWithheld).reverse();
  const netValues = financialYears.map((f) => f.grossIncome - f.taxWithheld).reverse();

  // Net rate conversions based on standard 2,080 work hours per year.
  // A document like a Notice of Assessment reports tax without ever stating
  // gross income - deriving take-home from that would show a negative wage,
  // so the derived figures stay blank until gross income is known.
  const hasGrossIncome = selectedFy.grossIncome > 0;
  const netIncome = selectedFy.grossIncome - selectedFy.taxWithheld;
  const hourlyRate = netIncome / 2080;
  const dailyRate = hourlyRate * 7.6; // standard 7.6 hr workday in AU
  const minuteRate = hourlyRate / 60;
  const secondRate = minuteRate / 60;

  const getTimeUnitDisplay = () => {
    if (!hasGrossIncome) return '—';
    switch (timeUnit) {
      case 'daily':
        return `$${dailyRate.toFixed(2)}/day`;
      case 'hourly':
        return `$${hourlyRate.toFixed(2)}/hr`;
      case 'minute':
        return `$${minuteRate.toFixed(2)}/min`;
      case 'second':
        return `$${secondRate.toFixed(4)}/sec`;
    }
  };

  return (
    <div className="@container border-b border-white/10 px-1 pb-5 subpixel-antialiased">
      <div className="grid grid-cols-2 items-center gap-4 @2xl:grid-cols-3 @4xl:grid-cols-5">
        {/* Selected Year Identifier */}
        <div className="col-span-2 @2xl:col-span-1">
          <div className="text-2xl font-semibold text-zinc-100 tracking-tight">
            {selectedFy.label}
          </div>
          <span className="mt-0.5 inline-block text-[10px] font-medium uppercase tracking-wide text-zinc-500">
            Selected AU FY
          </span>
        </div>

        {/* Gross Income Metric */}
        <div className="space-y-1">
          <div className="text-xs text-zinc-400 font-medium">Gross Income</div>
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold font-mono text-zinc-100">
              ${(selectedFy.grossIncome / 1000).toFixed(1)}k
            </span>
            <Sparkline values={grossValues} width={45} height={18} className="text-blue-500" />
          </div>
        </div>

        {/* PAYG Tax Withheld Metric */}
        <div className="space-y-1">
          <div className="text-xs text-zinc-400 font-medium">PAYG Tax</div>
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold font-mono text-zinc-100">
              ${(selectedFy.taxWithheld / 1000).toFixed(1)}k
            </span>
            <Sparkline values={taxValues} width={45} height={18} className="text-blue-500" />
          </div>
        </div>

        {/* Net Income Metric */}
        <div className="space-y-1">
          <div className="text-xs text-zinc-400 font-medium">Net Take Home</div>
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold font-mono text-emerald-400">
              {hasGrossIncome ? `$${(netIncome / 1000).toFixed(1)}k` : '—'}
            </span>
            <Sparkline values={netValues} width={45} height={18} className="text-blue-500" />
          </div>
        </div>

        {/* Time Unit Earnings Selector */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <select
              value={timeUnit}
              onChange={(e) => setTimeUnit(e.target.value as TimeUnit)}
              aria-label="Net income time unit"
              className="cursor-pointer rounded-lg border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] font-medium text-zinc-300 hover:text-zinc-100 focus:outline-none"
            >
              <option value="hourly">Hourly Rate</option>
              <option value="daily">Daily Net</option>
              <option value="minute">Per Minute</option>
              <option value="second">Per Second</option>
            </select>
            <Clock className="w-3.5 h-3.5 text-zinc-500" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold font-mono text-zinc-100">
              {getTimeUnitDisplay()}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
