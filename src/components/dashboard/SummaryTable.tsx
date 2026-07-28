import React from 'react';
import type { AustralianFinancialYear } from '../../types/tax';
import { ChangeCell } from './ChangeCell';

interface SummaryTableProps {
  financialYears: AustralianFinancialYear[];
}

interface SummaryTableItem {
  label: string;
  calc: (fy: AustralianFinancialYear) => number;
  showChange?: boolean;
  isBold?: boolean;
  invert?: boolean;
}

interface SummaryCategory {
  title: string;
  items: SummaryTableItem[];
}

export const SummaryTable: React.FC<SummaryTableProps> = ({ financialYears }) => {
  const sortedYears = [...financialYears].reverse(); // Oldest first

  const categories: SummaryCategory[] = [
    {
      title: 'Monthly Take-Home Breakdown',
      items: [
        { label: 'Gross monthly income', calc: (fy: AustralianFinancialYear) => Math.round(fy.grossIncome / 12), showChange: true },
        { label: 'Net monthly (after tax)', calc: (fy: AustralianFinancialYear) => Math.round((fy.grossIncome - fy.taxWithheld) / 12), showChange: true },
        { label: 'Daily take-home pay', calc: (fy: AustralianFinancialYear) => Math.round((fy.grossIncome - fy.taxWithheld) / 360), showChange: true }
      ]
    },
    {
      title: 'Income Breakdown',
      items: [
        { label: 'Salary & wages', calc: (fy: AustralianFinancialYear) => fy.income.find((i) => i.category === 'salary_wages')?.grossAmount.value || 0, showChange: true },
        { label: 'Allowances & bonuses', calc: (fy: AustralianFinancialYear) => fy.income.filter((i) => i.category === 'allowances' || i.category === 'bonuses_commissions').reduce((s, i) => s + i.grossAmount.value, 0), showChange: true },
        { label: 'Dividends & franking', calc: (fy: AustralianFinancialYear) => fy.income.filter((i) => i.category === 'dividends_franking').reduce((s, i) => s + i.grossAmount.value, 0), showChange: true },
        { label: 'Total Gross Income', calc: (fy: AustralianFinancialYear) => fy.grossIncome, isBold: true, showChange: true }
      ]
    },
    {
      title: 'Work Deductions & Taxable Income',
      items: [
        { label: 'Total work deductions claimed', calc: (fy: AustralianFinancialYear) => fy.totalDeductions, showChange: true },
        { label: 'Net Taxable Income', calc: (fy: AustralianFinancialYear) => fy.taxableIncome, isBold: true, showChange: true }
      ]
    },
    {
      title: 'Australian Tax & Levies',
      items: [
        { label: 'PAYG tax withheld', calc: (fy: AustralianFinancialYear) => fy.taxWithheld, invert: true, showChange: true },
        { label: 'Medicare levy (2.0%)', calc: (fy: AustralianFinancialYear) => fy.medicareLevy, invert: true, showChange: true },
        { label: 'HELP compulsory repayment', calc: (fy: AustralianFinancialYear) => fy.helpRepayment, invert: true, showChange: true }
      ]
    },
    {
      title: 'Superannuation & Final Assessment',
      items: [
        { label: 'Employer super (SG)', calc: (fy: AustralianFinancialYear) => fy.employerSuper, showChange: true },
        { label: 'Notice of Assessment result', calc: (fy: AustralianFinancialYear) => fy.assessmentResult, isBold: true, showChange: true }
      ]
    }
  ];

  return (
    <div className="glass-panel overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs font-mono">
          <thead className="bg-zinc-950 text-zinc-400 border-b border-zinc-800">
            <tr>
              <th className="p-3 w-72">Australian Tax Line Item</th>
              {sortedYears.map((fy) => (
                <th key={fy.id} className="p-3 text-right font-bold text-zinc-200">
                  {fy.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/60">
            {categories.map((cat, catIdx) => (
              <React.Fragment key={catIdx}>
                {/* Category Header */}
                <tr className="bg-zinc-950/80 font-bold text-emerald-400 border-t border-zinc-800">
                  <td colSpan={sortedYears.length + 1} className="p-2.5 uppercase tracking-wider text-[11px]">
                    {cat.title}
                  </td>
                </tr>

                {/* Category Items */}
                {cat.items.map((item, itemIdx) => (
                  <tr key={itemIdx} className="hover:bg-zinc-900/60 transition-colors group">
                    <td className={`p-3 ${item.isBold ? 'font-bold text-zinc-100' : 'text-zinc-300'}`}>
                      {item.label}
                    </td>
                    {sortedYears.map((fy, yearIdx) => {
                      const val = item.calc(fy);
                      const prevFy = yearIdx > 0 ? sortedYears[yearIdx - 1] : undefined;
                      const prevVal = prevFy ? item.calc(prevFy) : undefined;

                      return (
                        <td key={fy.id} className="p-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {item.showChange && prevVal !== undefined && (
                              <ChangeCell current={val} previous={prevVal} invertPolarity={item.invert} />
                            )}
                            <span className={`font-bold ${item.isBold ? 'text-zinc-100' : 'text-zinc-300'}`}>
                              ${val.toLocaleString()}
                            </span>
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
