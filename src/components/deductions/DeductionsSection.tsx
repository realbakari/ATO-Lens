import React from 'react';
import { Receipt, CheckCircle, AlertTriangle } from 'lucide-react';
import type { AustralianFinancialYear, DeductionCategory, ExtractedValue } from '../../types/tax';

interface DeductionsSectionProps {
  currentFy: AustralianFinancialYear;
  onOpenProvenance: (fieldName: string, value?: ExtractedValue<any>) => void;
}

const DEDUCTION_LABELS: Record<DeductionCategory, string> = {
  vehicle_travel: 'D1/D2. Car & Travel — Confirm Split',
  working_from_home: 'D5. Working From Home (WFH)',
  clothing_laundry: 'D3. Work Clothing & Laundry',
  self_education: 'D4. Self-Education & Training',
  tools_equipment: 'D5. Tools, Laptop & Equipment',
  phone_internet: 'D5. Phone & Internet Usage',
  professional_memberships: 'D5. Union & Professional Subscriptions',
  donations: 'D9. Gifts & Tax-Deductible Donations',
  tax_agent_fees: 'D10. Cost of Managing Tax Affairs',
  investment_expenses: 'D7/D8. Investment Expenses — Confirm Split',
  other_work: 'D5. Other Work-Related Expenses'
};

export const DeductionsSection: React.FC<DeductionsSectionProps> = ({
  currentFy,
  onOpenProvenance
}) => {
  const totalDeductions = currentFy.deductions.reduce((sum, item) => sum + item.amount.value, 0);
  const missingReceipts = currentFy.deductions.filter((item) => !item.hasReceipt);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-4">
        <div>
          <h2 className="text-xl font-bold text-zinc-100 flex items-center gap-2">
            <Receipt className="w-5 h-5 text-emerald-400" />
            <span>Work-Related Tax Deductions</span>
          </h2>
          <p className="text-xs text-zinc-400">
            Claims structured according to ATO individual tax return items ({currentFy.label})
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs font-mono">
            Total Claimed: <strong className="text-emerald-400 font-bold">${totalDeductions.toLocaleString()}</strong>
          </div>
        </div>
      </div>

      {/* Missing Receipt Warning Banner */}
      {missingReceipts.length > 0 && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
            <div>
              <span className="font-semibold text-amber-200">
                {missingReceipts.length} deduction(s) missing supporting receipt proof
              </span>
              <p className="text-amber-300/80 mt-0.5">
                Claims under $300 still need a calculation basis. Receipts, logbooks, diaries or
                other records may be required depending on the claim and method.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Deduction List */}
      <div className="glass-panel overflow-hidden">
        <div className="px-6 py-4 border-b border-zinc-800 bg-zinc-950/60 flex items-center justify-between">
          <span className="text-xs font-semibold uppercase text-zinc-400 tracking-wider font-mono">
            Claimed Tax Deductions ({currentFy.deductions.length})
          </span>
          <span className="text-xs text-zinc-500">Click to view source tax return provenance</span>
        </div>

        <div className="divide-y divide-zinc-800/60 text-sm">
          {currentFy.deductions.map((ded) => (
            <button
              key={ded.id}
              type="button"
              onClick={() => onOpenProvenance(ded.description, ded.amount)}
              className="flex w-full flex-col justify-between gap-4 p-4 text-left transition-colors hover:bg-zinc-900/60 md:flex-row md:items-center"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
                    {DEDUCTION_LABELS[ded.category]}
                  </span>
                  <h4 className="font-semibold text-zinc-200">{ded.description}</h4>
                </div>
                {ded.notes && <p className="text-xs text-amber-300/80 italic">{ded.notes}</p>}
                <div className="flex items-center gap-2 text-xs text-zinc-400">
                  {ded.hasReceipt ? (
                    <span className="flex items-center gap-1 text-emerald-400 font-medium">
                      <CheckCircle className="w-3.5 h-3.5" />
                      Receipt Verified ({ded.receiptFileName})
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-amber-400 font-medium">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      Missing Supporting Receipt
                    </span>
                  )}
                </div>
              </div>

              <div className="text-right font-mono">
                <div className="text-lg font-bold text-emerald-400">
                  ${ded.amount.value.toLocaleString()}
                </div>
                <div className="text-xs text-zinc-500">Tax Return Item</div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
