import React from 'react';
import { PiggyBank, ShieldCheck, AlertTriangle, CheckCircle2 } from 'lucide-react';
import type { AustralianFinancialYear, ExtractedValue } from '../../types/tax';
import { auditSuperGuarantee } from '../../engine/superGuaranteeAudit';

interface SuperSectionProps {
  currentFy: AustralianFinancialYear;
  onOpenProvenance: (fieldName: string, value?: ExtractedValue<any>) => void;
}

export const SuperSection: React.FC<SuperSectionProps> = ({
  currentFy,
  onOpenProvenance
}) => {
  const auditReport = auditSuperGuarantee(currentFy.superContributions, currentFy.label);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-4">
        <div>
          <h2 className="text-xl font-bold text-zinc-100 flex items-center gap-2">
            <PiggyBank className="w-5 h-5 text-emerald-400" />
            <span>Superannuation Guarantee Tracker & Audit</span>
          </h2>
          <p className="text-xs text-zinc-400">
            Automated compliance check against Australia's 12.0% Super Guarantee standard ({currentFy.label})
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-xs font-mono">
            Total Employer Super: <strong className="text-zinc-100 font-bold">${currentFy.employerSuper.toLocaleString()}</strong>
          </div>
        </div>
      </div>

      {/* Super Guarantee Compliance Card */}
      <div className="glass-panel p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <h3 className="font-semibold text-zinc-200 text-sm">12.0% SG Compliance Audit Status</h3>
          </div>
          <span className="font-mono text-xs text-emerald-400 font-bold bg-emerald-500/10 px-2.5 py-1 rounded border border-emerald-500/20">
            {auditReport.complianceRate}% Compliant
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono text-xs">
          <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800 space-y-1">
            <span className="text-zinc-400">Expected SG (12.0%)</span>
            <div className="text-lg font-bold text-zinc-100">${auditReport.totalExpectedSuper.toLocaleString()}</div>
          </div>
          <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800 space-y-1">
            <span className="text-zinc-400">Recorded Payments</span>
            <div className="text-lg font-bold text-zinc-100">${auditReport.totalRecordedSuper.toLocaleString()}</div>
          </div>
          <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800 space-y-1">
            <span className="text-zinc-400">Underpaid Shortfall</span>
            <div className={`text-lg font-bold ${auditReport.varianceAmount < 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
              ${Math.abs(auditReport.varianceAmount).toLocaleString()}
            </div>
          </div>
        </div>
      </div>

      {/* Contributions Table */}
      <div className="glass-panel overflow-hidden">
        <div className="px-6 py-4 border-b border-zinc-800 bg-zinc-950/60 flex items-center justify-between">
          <span className="text-xs font-semibold uppercase text-zinc-400 tracking-wider font-mono">
            Quarterly Super Contributions ({currentFy.superContributions.length})
          </span>
          <span className="text-xs text-zinc-500">Click to verify fund statement source</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-zinc-950 text-zinc-400 border-b border-zinc-800">
              <tr>
                <th className="p-3">Period</th>
                <th className="p-3">Employer</th>
                <th className="p-3">Fund Name</th>
                <th className="p-3">Received Date</th>
                <th className="p-3">Expected (12%)</th>
                <th className="p-3">Recorded</th>
                <th className="p-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {currentFy.superContributions.map((contrib) => {
                const diff = contrib.expectedAmount - contrib.recordedAmount.value;
                return (
                  <tr
                    key={contrib.id}
                    onClick={() => onOpenProvenance(`${contrib.employerName.value} Super`, contrib.recordedAmount)}
                    className="hover:bg-zinc-900/60 cursor-pointer"
                  >
                    <td className="p-3 text-zinc-300">
                      {contrib.periodStart} to {contrib.periodEnd}
                    </td>
                    <td className="p-3 font-semibold text-zinc-200">{contrib.employerName.value}</td>
                    <td className="p-3 text-zinc-400">{contrib.fundName.value}</td>
                    <td className="p-3 text-zinc-300">{contrib.payDate.value}</td>
                    <td className="p-3 text-zinc-400">${contrib.expectedAmount.toFixed(2)}</td>
                    <td className="p-3 font-bold text-zinc-200">${contrib.recordedAmount.value.toFixed(2)}</td>
                    <td className="p-3">
                      {diff > 5 ? (
                        <span className="inline-flex items-center gap-1 text-amber-400 font-semibold">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          Shortfall (-${diff.toFixed(0)})
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-emerald-400 font-medium">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          OK
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
