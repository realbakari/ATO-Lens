import React from 'react';
import { GraduationCap, Calendar } from 'lucide-react';
import type { AustralianFinancialYear, ExtractedValue } from '../../types/tax';
import { IndexationCard } from '../common/InsightCards';

interface HELPSectionProps {
  currentFy: AustralianFinancialYear;
  onOpenProvenance: (fieldName: string, value?: ExtractedValue<any>) => void;
}

export const HELPSection: React.FC<HELPSectionProps> = ({ currentFy, onOpenProvenance }) => {
  const loan = currentFy.studyLoans;

  if (!loan) {
    return (
      <div className="glass-panel p-8 text-center space-y-3">
        <GraduationCap className="w-10 h-10 text-zinc-500 mx-auto" />
        <h3 className="text-base font-semibold text-zinc-200">No HELP/HECS Debt History Found</h3>
        <p className="text-xs text-zinc-400 max-w-md mx-auto">
          Upload an ATO Study Loan account statement PDF or manually enter your opening study loan balance to enable indexation and repayment tracking.
        </p>
      </div>
    );
  }

  const withholdingDiff = loan.amountWithheldPayroll.value - loan.compulsoryRepayment.value;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-4">
        <div>
          <h2 className="text-xl font-bold text-zinc-100 flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-emerald-400" />
            <span>HELP & Study Loan Account History</span>
          </h2>
          <p className="text-xs text-zinc-400">
            ATO loan account balances, CPI indexation, and payroll repayments ({currentFy.label})
          </p>
        </div>
        <div className="px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-xs font-mono">
          Closing Balance: <strong className="text-zinc-100 font-bold">${loan.closingBalance.value.toLocaleString()}</strong>
        </div>
      </div>

      <IndexationCard currentFy={currentFy} />

      {/* Main Loan Metrics Grid */}
      <div className="glass-panel p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 font-mono">
          <button
            type="button"
            onClick={() => onOpenProvenance('Opening HELP Balance', loan.openingBalance)}
            className="glass-card w-full space-y-1 p-4 text-left hover:border-emerald-500/40"
          >
            <div className="text-xs text-zinc-400">Opening Balance</div>
            <div className="text-2xl font-bold text-zinc-100">${loan.openingBalance.value.toLocaleString()}</div>
            <div className="text-[11px] text-zinc-400">As at 1 July {currentFy.startDate.split('-')[0]}</div>
          </button>

          <button
            type="button"
            onClick={() => onOpenProvenance('HELP Indexation Amount', loan.indexationAmount)}
            className="glass-card w-full space-y-1 p-4 text-left hover:border-emerald-500/40"
          >
            <div className="text-xs text-zinc-400">Indexation Applied</div>
            <div className="text-2xl font-bold text-amber-400">+${loan.indexationAmount.value.toLocaleString()}</div>
            <div className="text-[11px] text-zinc-400">{(loan.indexationRate * 100).toFixed(1)}% annual rate</div>
          </button>

          <button
            type="button"
            onClick={() => onOpenProvenance('Compulsory HELP Repayment', loan.compulsoryRepayment)}
            className="glass-card w-full space-y-1 p-4 text-left hover:border-emerald-500/40"
          >
            <div className="text-xs text-zinc-400">Compulsory Repayment</div>
            <div className="text-2xl font-bold text-emerald-400">-${loan.compulsoryRepayment.value.toLocaleString()}</div>
            <div className="text-[11px] text-zinc-400">ATO Assessment {currentFy.label}</div>
          </button>

          <button
            type="button"
            onClick={() => onOpenProvenance('Closing HELP Balance', loan.closingBalance)}
            className="glass-card w-full space-y-1 p-4 text-left hover:border-emerald-500/40"
          >
            <div className="text-xs text-zinc-400">Closing Debt Balance</div>
            <div className="text-2xl font-bold text-zinc-100">${loan.closingBalance.value.toLocaleString()}</div>
            <div className="text-[11px] text-zinc-400">Est. payoff: {loan.estimatedPayoffYears} yrs</div>
          </button>
        </div>
      </div>

      {/* Payroll Withholding Audit vs Compulsory Liability */}
      <div className="glass-panel p-6 space-y-3">
        <h3 className="text-sm font-semibold text-zinc-200 font-mono flex items-center gap-2">
          <Calendar className="w-4 h-4 text-emerald-400" />
          <span>PAYROLL WITHHOLDING VS ATO ASSESSMENT RECONCILIATION</span>
        </h3>
        <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 flex flex-col md:flex-row md:items-center justify-between gap-4 font-mono text-xs">
          <div>
            <div className="text-zinc-400">Withheld by Employers on Payslips (STSL):</div>
            <div className="text-base font-bold text-zinc-100">${loan.amountWithheldPayroll.value.toLocaleString()}</div>
          </div>
          <div>
            <div className="text-zinc-400">ATO Compulsory Assessment Liability:</div>
            <div className="text-base font-bold text-zinc-100">${loan.compulsoryRepayment.value.toLocaleString()}</div>
          </div>
          <div>
            <div className="text-zinc-400">Reconciliation Variance:</div>
            <div className={`text-base font-bold ${withholdingDiff >= 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
              {withholdingDiff >= 0 ? `+$${withholdingDiff.toLocaleString()} surplus credit` : `-$${Math.abs(withholdingDiff).toLocaleString()} shortfall`}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
