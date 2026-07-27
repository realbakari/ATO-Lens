import React from 'react';
import { DollarSign, Briefcase, Clock } from 'lucide-react';
import type { AustralianFinancialYear, IncomeCategory, ExtractedValue } from '../../types/tax';

interface IncomeSectionProps {
  currentFy: AustralianFinancialYear;
  onOpenProvenance: (fieldName: string, value?: ExtractedValue<any>) => void;
}

const CATEGORY_LABELS: Record<IncomeCategory, string> = {
  salary_wages: 'Salary & Wages',
  allowances: 'Allowances',
  bonuses_commissions: 'Bonuses & Commissions',
  interest: 'Interest Income',
  dividends_franking: 'Dividends & Franking Credits',
  capital_gains: 'Capital Gains (CGT)',
  rental_income: 'Rental Property Income',
  sole_trader: 'Sole-Trader Business Income',
  government_payments: 'Government Payments (Centrelink)',
  foreign_income: 'Foreign Income',
  other: 'Other Taxable Income'
};

export const IncomeSection: React.FC<IncomeSectionProps> = ({
  currentFy,
  onOpenProvenance
}) => {
  const totalGross = currentFy.income.reduce((sum, item) => sum + item.grossAmount.value, 0);
  const totalTaxWithheld = currentFy.income.reduce((sum, item) => sum + item.taxWithheld.value, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-4">
        <div>
          <h2 className="text-xl font-bold text-zinc-100 flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-emerald-400" />
            <span>Australian Tax Income Categories</span>
          </h2>
          <p className="text-xs text-zinc-400">
            Categorised according to ATO tax return specifications ({currentFy.label})
          </p>
        </div>
        <div className="flex items-center gap-4 text-xs font-mono">
          <div className="px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800">
            Total Gross: <strong className="text-emerald-400 font-bold">${totalGross.toLocaleString()}</strong>
          </div>
          <div className="px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800">
            Tax Withheld: <strong className="text-amber-300 font-bold">${totalTaxWithheld.toLocaleString()}</strong>
          </div>
        </div>
      </div>

      {/* Income Category List */}
      <div className="glass-panel overflow-hidden">
        <div className="px-6 py-4 border-b border-zinc-800 bg-zinc-950/60 flex items-center justify-between">
          <span className="text-xs font-semibold uppercase text-zinc-400 tracking-wider font-mono">
            Extracted Income Records ({currentFy.income.length})
          </span>
          <span className="text-xs text-zinc-500">Click any row to inspect source proof</span>
        </div>

        <div className="divide-y divide-zinc-800/60 text-sm">
          {currentFy.income.map((item) => (
            <div
              key={item.id}
              onClick={() => onOpenProvenance(`${CATEGORY_LABELS[item.category]} - ${item.description}`, item.grossAmount)}
              className="p-4 hover:bg-zinc-900/60 transition-colors cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    {CATEGORY_LABELS[item.category]}
                  </span>
                  <h4 className="font-semibold text-zinc-200">{item.description}</h4>
                </div>
                <p className="text-xs text-zinc-400 flex items-center gap-1.5">
                  <Briefcase className="w-3.5 h-3.5 text-zinc-500" />
                  <span>Payer: {item.employerOrPayer.value}</span>
                  <span className="text-zinc-600">•</span>
                  <span className="font-mono text-zinc-500">Source: {item.grossAmount.sourceDocumentName}</span>
                </p>
              </div>

              <div className="flex items-center gap-6 font-mono text-right justify-between md:justify-end">
                <div>
                  <div className="text-xs text-zinc-400">Gross Amount</div>
                  <div className="font-bold text-zinc-100">${item.grossAmount.value.toLocaleString()}</div>
                </div>
                <div>
                  <div className="text-xs text-zinc-400">Tax Withheld</div>
                  <div className="font-semibold text-amber-400">${item.taxWithheld.value.toLocaleString()}</div>
                </div>
                {item.frankingCredits && (
                  <div>
                    <div className="text-xs text-zinc-400">Franking Credits</div>
                    <div className="font-semibold text-zinc-100">${item.frankingCredits.value.toLocaleString()}</div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Employer Rate & Pay Comparisons */}
      {currentFy.payslips.length > 0 && (
        <div className="glass-panel p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-emerald-400" />
            <h3 className="font-semibold text-zinc-200 text-sm">Employer Pay Rate & Working Hours History</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-zinc-950 text-zinc-400 border-b border-zinc-800">
                <tr>
                  <th className="p-3">Pay Date</th>
                  <th className="p-3">Employer</th>
                  <th className="p-3">Hourly Rate</th>
                  <th className="p-3">Ordinary Hrs</th>
                  <th className="p-3">Gross Pay</th>
                  <th className="p-3">Net Pay</th>
                  <th className="p-3">12% Super</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {currentFy.payslips.map((ps) => (
                  <tr key={ps.id} className="hover:bg-zinc-900/40">
                    <td className="p-3 text-zinc-300">{ps.paymentDate.value}</td>
                    <td className="p-3 font-semibold text-zinc-200">{ps.employerName.value}</td>
                    <td className="p-3 text-emerald-400 font-bold">${ps.hourlyRate?.value.toFixed(2)}/hr</td>
                    <td className="p-3 text-zinc-300">{ps.ordinaryHours?.value || 38} hrs</td>
                    <td className="p-3 text-zinc-100 font-semibold">${ps.grossPay.value.toLocaleString()}</td>
                    <td className="p-3 text-zinc-200">${ps.netPay.value.toLocaleString()}</td>
                    <td className="p-3 text-zinc-200">${ps.employerSuper.value.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
