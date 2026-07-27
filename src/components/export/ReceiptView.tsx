import React from "react";
import type { AustralianFinancialYear } from "../../types/tax";

interface Props {
  data: AustralianFinancialYear;
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatPercent(value: number) {
  return `${value.toFixed(1)}%`;
}

function CategoryHeader({ children }: { children: React.ReactNode }) {
  return (
    <tr>
      <td colSpan={2} className="pt-6 pb-2">
        <span className="text-xs text-zinc-500 uppercase font-mono tracking-wider">{children}</span>
      </td>
    </tr>
  );
}

function DataRow({
  label,
  amount,
  isMuted,
  showSign,
  isNegative = false,
}: {
  label: string;
  amount: number;
  isMuted?: boolean;
  showSign?: boolean;
  isNegative?: boolean;
}) {
  const displayAmount = isNegative ? -Math.abs(amount) : amount;
  return (
    <tr className={isMuted ? "text-zinc-500" : "text-zinc-200"}>
      <td className="py-1.5 text-sm font-mono">{label}</td>
      <td className="py-1.5 text-right text-sm font-mono slashed-zero tabular-nums">
        {showSign && displayAmount > 0 ? "+" : ""}
        {formatCurrency(displayAmount)}
      </td>
    </tr>
  );
}

function TotalRow({
  label,
  amount,
  showSign,
  highlight = false,
}: {
  label: string;
  amount: number;
  showSign?: boolean;
  highlight?: boolean;
}) {
  return (
    <>
      <tr>
        <td colSpan={2} className="h-2" />
      </tr>
      <tr className={`border-t border-zinc-800 ${highlight ? 'text-emerald-400 font-bold' : 'font-semibold text-zinc-100'}`}>
        <td className="py-2 pt-4 text-sm font-mono">{label}</td>
        <td className="py-2 pt-4 text-right text-sm font-mono slashed-zero tabular-nums">
          {showSign && amount > 0 ? "+" : ""}
          {formatCurrency(amount)}
        </td>
      </tr>
    </>
  );
}

export function ReceiptView({ data }: Props) {
  const isRefund = data.assessmentResult > 0;
  
  return (
    <div className="px-4 py-4 md:px-0 md:py-8 md:pb-12">
      <div className="dark:shadow-contrast mx-auto max-w-lg rounded-lg bg-zinc-950 shadow-md ring-[0.5px] ring-zinc-800 font-mono">
        
        {/* Receipt Header */}
        <div className="pt-8 pb-4 text-center border-b border-zinc-800 border-dashed">
          <h2 className="text-xl font-bold tracking-widest text-zinc-100">ATO TAX RECEIPT</h2>
          <p className="text-xs text-zinc-500 mt-1">FINANCIAL YEAR {data.label}</p>
        </div>

        {/* Content Table */}
        <div className="px-6 pb-6">
          <table className="w-full">
            <tbody className="no-zebra">
              <CategoryHeader>Income</CategoryHeader>
              <DataRow label="Gross Salary & Wages" amount={data.grossIncome} />
              <TotalRow label="Total Income" amount={data.grossIncome} />

              <CategoryHeader>Deductions</CategoryHeader>
              <DataRow label="Work-Related Deductions" amount={data.totalDeductions} isNegative isMuted />
              <TotalRow label="Taxable Income" amount={data.taxableIncome} />

              <CategoryHeader>Tax & Levies</CategoryHeader>
              <DataRow label="PAYG Withheld (Credits)" amount={data.taxWithheld} isMuted />
              <DataRow label="Assessed Income Tax" amount={-(data.taxWithheld - data.assessmentResult - data.medicareLevy - data.helpRepayment)} isNegative isMuted />
              <DataRow label="Medicare Levy" amount={data.medicareLevy} isNegative isMuted />
              {data.helpRepayment > 0 && (
                <DataRow label="HELP / HECS Compulsory" amount={data.helpRepayment} isNegative isMuted />
              )}
              
              <TotalRow
                label={isRefund ? "Assessment Refund" : "Amount Payable"}
                amount={data.assessmentResult}
                showSign
                highlight
              />

              <CategoryHeader>Superannuation</CategoryHeader>
              <DataRow label="Employer SG Contributions" amount={data.employerSuper} isMuted />
              
              <CategoryHeader>Metrics</CategoryHeader>
              <tr>
                <td className="py-1.5 text-sm text-zinc-500 font-mono">Effective Tax Rate</td>
                <td className="py-1.5 text-right text-sm text-zinc-500 font-mono slashed-zero tabular-nums">
                  {formatPercent(data.effectiveTaxRate)}
                </td>
              </tr>
              <tr>
                <td className="py-1.5 text-sm text-zinc-500 font-mono">Average Monthly Net</td>
                <td className="py-1.5 text-right text-sm text-zinc-500 font-mono slashed-zero tabular-nums">
                  {formatCurrency((data.grossIncome - data.taxWithheld) / 12)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        
        <div className="pt-4 pb-8 text-center border-t border-zinc-800 border-dashed text-zinc-600 text-xs">
          <p>*** END OF RECORD ***</p>
          <p className="mt-1">{new Date().toLocaleDateString()}</p>
        </div>
      </div>
    </div>
  );
}
