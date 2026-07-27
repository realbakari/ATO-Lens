import React from 'react';
import type { AustralianFinancialYear } from '../../types/tax';

interface TaxReceiptViewProps {
  financialYear: AustralianFinancialYear;
}

export const TaxReceiptView: React.FC<TaxReceiptViewProps> = ({ financialYear }) => {
  return (
    <div className="max-w-md mx-auto my-6 bg-zinc-100 text-zinc-900 rounded-lg p-6 shadow-2xl font-mono text-xs border border-zinc-300 relative overflow-hidden">
      {/* Decorative serrated receipt top border */}
      <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-zinc-200 via-zinc-400 to-zinc-200 opacity-30" />

      {/* ATO Header */}
      <div className="text-center border-b-2 border-dashed border-zinc-400 pb-4 mb-4 space-y-1">
        <div className="text-base font-bold tracking-tight">AUSTRALIAN TAXATION OFFICE</div>
        <div className="text-[10px] text-zinc-600">OFFICIAL FINANCIAL YEAR SUMMARY RECEIPT</div>
        <div className="text-[11px] font-semibold text-emerald-800">
          PERIOD: 1 JUL {financialYear.startDate.split('-')[0]} – 30 JUN {financialYear.endDate.split('-')[0]} ({financialYear.label})
        </div>
      </div>

      {/* Financial Line Items */}
      <div className="space-y-2 mb-4 border-b border-zinc-300 pb-4">
        <div className="flex justify-between">
          <span>GROSS SALARY & WAGES</span>
          <span className="font-bold">${financialYear.grossIncome.toLocaleString()}</span>
        </div>
        <div className="flex justify-between text-zinc-700">
          <span>TOTAL WORK DEDUCTIONS</span>
          <span>-${financialYear.totalDeductions.toLocaleString()}</span>
        </div>
        <div className="flex justify-between font-bold border-t border-zinc-300 pt-1 text-zinc-900">
          <span>TAXABLE INCOME</span>
          <span>${financialYear.taxableIncome.toLocaleString()}</span>
        </div>
      </div>

      {/* Tax & Obligations */}
      <div className="space-y-2 mb-4 border-b border-dashed border-zinc-400 pb-4">
        <div className="flex justify-between">
          <span>PAYG TAX WITHHELD</span>
          <span className="font-bold text-zinc-900">${financialYear.taxWithheld.toLocaleString()}</span>
        </div>
        <div className="flex justify-between text-zinc-700">
          <span>MEDICARE LEVY (2.0%)</span>
          <span>-${financialYear.medicareLevy.toLocaleString()}</span>
        </div>
        <div className="flex justify-between text-zinc-700">
          <span>HELP COMPULSORY REPAYMENT</span>
          <span>-${financialYear.helpRepayment.toLocaleString()}</span>
        </div>
        <div className="flex justify-between text-zinc-700 font-medium">
          <span>EMPLOYER SUPER (12% SG)</span>
          <span>${financialYear.employerSuper.toLocaleString()}</span>
        </div>
      </div>

      {/* Assessment Outcome */}
      <div className="p-3 rounded bg-zinc-200 border border-zinc-400 mb-4 flex justify-between items-center text-sm font-bold">
        <span>ASSESSMENT RESULT:</span>
        <span className={financialYear.assessmentResult >= 0 ? 'text-emerald-700' : 'text-rose-700'}>
          {financialYear.assessmentResult >= 0
            ? `+$${financialYear.assessmentResult.toLocaleString()} REFUND`
            : `-$${Math.abs(financialYear.assessmentResult).toLocaleString()} PAYABLE`}
        </span>
      </div>

      {/* Simulated Barcode */}
      <div className="text-center space-y-1">
        <div className="h-8 bg-zinc-900 mx-auto w-4/5 rounded flex items-center justify-center text-zinc-100 font-mono text-[9px] tracking-widest opacity-90">
          ||||| | |||| ||| |||||| | ||||| || ||||
        </div>
        <div className="text-[9px] text-zinc-500 font-mono">
          NOA REF: {financialYear.assessment?.noticeReference.value || 'ATO-REF-884920'} • LOCAL VERIFIED
        </div>
      </div>
    </div>
  );
};
