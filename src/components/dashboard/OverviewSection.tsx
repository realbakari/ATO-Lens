import React, { useState } from 'react';
import { ShieldAlert, AlertTriangle, Receipt, LayoutGrid, Table, Key, Sparkles, Download } from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend
} from 'recharts';
import type { AustralianFinancialYear, ExtractedValue } from '../../types/tax';
import { StatsHeaderBar } from './StatsHeaderBar';
import { ReceiptView } from '../export/ReceiptView';
import { SummaryTable } from './SummaryTable';
import { ThresholdCard } from '../common/InsightCards';
import { TaxOptimizationModal } from '../optimization/TaxOptimizationModal';
import { ExportSummaryModal } from '../export/ExportSummaryModal';
import { AnimatedNumber } from '../common/AnimatedNumber';
import { Sparkline } from '../common/Sparkline';

interface OverviewSectionProps {
  currentFy: AustralianFinancialYear;
  allFys: AustralianFinancialYear[];
  onOpenProvenance: (fieldName: string, value?: ExtractedValue<any>) => void;
  onOpenApiKeyModal: () => void;
}

export const OverviewSection: React.FC<OverviewSectionProps> = ({
  currentFy,
  allFys,
  onOpenProvenance,
  onOpenApiKeyModal
}) => {
  const [viewMode, setViewMode] = useState<'grid' | 'table' | 'receipt'>('grid');
  const [isOptimizerOpen, setIsOptimizerOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);

  const chartData = allFys
    .map((fy) => ({
      name: fy.label,
      'Gross Income': fy.grossIncome,
      'Taxable Income': fy.taxableIncome,
      'Tax Withheld': fy.taxWithheld,
      'Deductions': fy.totalDeductions,
      'Employer Super': fy.employerSuper
    }))
    .reverse();

  const getHistory = (key: keyof AustralianFinancialYear) => allFys.map(f => Number(f[key] || 0)).reverse();

  return (
    // Layout responds to the width of this column, not the window - the chat
    // drawer narrows it without the viewport ever changing.
    <div className="@container space-y-6">
      {/* Signature Tax UI Top Stats Header with Sparklines and Time Unit Converter */}
      <StatsHeaderBar financialYears={allFys} selectedFy={currentFy} />

      {/* Header Controls & View Mode Selector */}
      <div className="flex flex-col gap-4 border-b border-zinc-800 pb-4 @4xl:flex-row @4xl:items-center @4xl:justify-between">
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 text-xl font-bold text-zinc-100">
            <span className="whitespace-nowrap">Financial Year Summary</span>
            <span className="shrink-0 rounded border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 font-mono text-sm font-semibold text-emerald-400">
              {currentFy.label}
            </span>
          </h2>
          <p className="text-xs text-zinc-400">
            Tax period: 1 July {currentFy.startDate.split('-')[0]} – 30 June {currentFy.endDate.split('-')[0]}
          </p>
        </div>

        <div className="no-scrollbar -mx-1 flex items-center gap-2 overflow-x-auto px-1 pb-0.5 [&>*]:shrink-0">
          {/* Quick Tax Optimization Button */}
          <button
            onClick={() => setIsOptimizerOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 text-xs font-mono border border-emerald-500/30 transition-colors font-semibold"
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            <span>Tax Optimizer</span>
          </button>

          {/* Export Button */}
          <button
            onClick={() => setIsExportOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-mono border border-zinc-800 transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-zinc-400" />
            <span>Export Report</span>
          </button>

          {/* View Mode Toggle */}
          <div className="flex items-center bg-zinc-900 border border-zinc-800 p-1 rounded-lg">
            <button
              onClick={() => setViewMode('grid')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-mono transition-colors ${
                viewMode === 'grid'
                  ? 'bg-zinc-800 text-zinc-100 font-semibold'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Grid</span>
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-mono transition-colors ${
                viewMode === 'table'
                  ? 'bg-zinc-800 text-emerald-400 font-semibold'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Table className="w-3.5 h-3.5" />
              <span>Multi-Year Table</span>
            </button>
            <button
              onClick={() => setViewMode('receipt')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-mono transition-colors ${
                viewMode === 'receipt'
                  ? 'bg-zinc-800 text-emerald-400 font-semibold'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Receipt className="w-3.5 h-3.5" />
              <span>Tax Receipt</span>
            </button>
          </div>

          <button
            onClick={onOpenApiKeyModal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-mono border border-zinc-800 transition-colors"
          >
            <Key className="w-3.5 h-3.5 text-emerald-400" />
            <span>API Key</span>
          </button>
        </div>
      </div>

      {/* Main Content View Switcher */}
      {viewMode === 'receipt' ? (
        <ReceiptView data={currentFy} />
      ) : viewMode === 'table' ? (
        <SummaryTable financialYears={allFys} />
      ) : (
        <div className="glass-panel p-6">
          <div className="mb-4 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-zinc-800 pb-4">
            <span className="font-mono text-sm font-semibold text-zinc-300">
              TAX BREAKDOWN ({currentFy.label})
            </span>
            <span className="whitespace-nowrap font-mono text-xs text-zinc-400">
              Effective rate <strong className="font-bold text-emerald-400">{currentFy.effectiveTaxRate}%</strong>
            </span>
          </div>

          <div className="grid grid-cols-1 gap-4 @xl:grid-cols-2 @4xl:grid-cols-4">
            {/* Gross Income */}
            <div
              onClick={() => onOpenProvenance('Gross Income', currentFy.income[0]?.grossAmount)}
              className="glass-card p-4 cursor-pointer hover:border-emerald-500/50 transition-all space-y-1 relative overflow-hidden"
            >
              <div className="text-xs text-zinc-400 font-medium z-10 relative">Gross income</div>
              <div className="text-2xl font-bold font-mono text-zinc-100 z-10 relative">
                $<AnimatedNumber value={currentFy.grossIncome} format={(n) => n.toLocaleString()} />
              </div>
              <div className="text-[11px] text-zinc-400 flex items-center gap-1 z-10 relative">
                <span>{currentFy.employerCount} employer(s)</span>
              </div>
              <div className="absolute -bottom-1 -right-1 text-emerald-500 opacity-20 pointer-events-none">
                <Sparkline values={getHistory('grossIncome')} width={100} height={40} />
              </div>
            </div>

            {/* Taxable Income */}
            <div
              onClick={() => onOpenProvenance('Taxable Income', currentFy.assessment?.taxableIncome)}
              className="glass-card p-4 cursor-pointer hover:border-emerald-500/50 transition-all space-y-1 relative overflow-hidden"
            >
              <div className="text-xs text-zinc-400 font-medium z-10 relative">Taxable income</div>
              <div className="text-2xl font-bold font-mono text-zinc-100 z-10 relative">
                $<AnimatedNumber value={currentFy.taxableIncome} format={(n) => n.toLocaleString()} />
              </div>
              <div className="text-[11px] text-zinc-400 z-10 relative">After work deductions</div>
              <div className="absolute -bottom-1 -right-1 text-emerald-500 opacity-20 pointer-events-none">
                <Sparkline values={getHistory('taxableIncome')} width={100} height={40} />
              </div>
            </div>

            {/* Tax Withheld */}
            <div
              onClick={() => onOpenProvenance('Tax Withheld', currentFy.income[0]?.taxWithheld)}
              className="glass-card p-4 cursor-pointer hover:border-emerald-500/50 transition-all space-y-1 relative overflow-hidden"
            >
              <div className="text-xs text-zinc-400 font-medium z-10 relative">Tax withheld</div>
              <div className="text-2xl font-bold font-mono text-zinc-100 z-10 relative">
                $<AnimatedNumber value={currentFy.taxWithheld} format={(n) => n.toLocaleString()} />
              </div>
              <div className="text-[11px] text-zinc-400 z-10 relative">PAYG tax collected</div>
              <div className="absolute -bottom-1 -right-1 text-emerald-500 opacity-20 pointer-events-none">
                <Sparkline values={getHistory('taxWithheld')} width={100} height={40} />
              </div>
            </div>

            {/* Deductions */}
            <div
              onClick={() => onOpenProvenance('Deductions', currentFy.deductions[0]?.amount)}
              className="glass-card p-4 cursor-pointer hover:border-emerald-500/50 transition-all space-y-1 relative overflow-hidden"
            >
              <div className="text-xs text-zinc-400 font-medium z-10 relative">Deductions</div>
              <div className="text-2xl font-bold font-mono text-zinc-100 z-10 relative">
                $<AnimatedNumber value={currentFy.totalDeductions} format={(n) => n.toLocaleString()} />
              </div>
              <div className="text-[11px] text-zinc-400 z-10 relative">{currentFy.deductions.length} claimed items</div>
              <div className="absolute -bottom-1 -right-1 text-emerald-500 opacity-20 pointer-events-none">
                <Sparkline values={getHistory('totalDeductions')} width={100} height={40} />
              </div>
            </div>

            {/* Medicare Levy */}
            <div
              onClick={() => onOpenProvenance('Medicare Levy', currentFy.assessment?.medicareLevy)}
              className="glass-card p-4 cursor-pointer hover:border-emerald-500/50 transition-all space-y-1 relative overflow-hidden"
            >
              <div className="text-xs text-zinc-400 font-medium z-10 relative">Medicare levy</div>
              <div className="text-2xl font-bold font-mono text-zinc-200 z-10 relative">
                $<AnimatedNumber value={currentFy.medicareLevy} format={(n) => n.toLocaleString()} />
              </div>
              <div className="text-[11px] text-zinc-400 z-10 relative">Standard 2.0% levy</div>
              <div className="absolute -bottom-1 -right-1 text-zinc-500 opacity-20 pointer-events-none">
                <Sparkline values={getHistory('medicareLevy')} width={100} height={40} />
              </div>
            </div>

            {/* HELP Repayment */}
            <div
              onClick={() => onOpenProvenance('HELP Repayment', currentFy.studyLoans?.compulsoryRepayment)}
              className="glass-card p-4 cursor-pointer hover:border-emerald-500/50 transition-all space-y-1 relative overflow-hidden"
            >
              <div className="text-xs text-zinc-400 font-medium z-10 relative">HELP repayment</div>
              <div className="text-2xl font-bold font-mono text-zinc-100 z-10 relative">
                $<AnimatedNumber value={currentFy.helpRepayment} format={(n) => n.toLocaleString()} />
              </div>
              <div className="text-[11px] text-zinc-400 z-10 relative">Study loan compulsory</div>
              <div className="absolute -bottom-1 -right-1 text-emerald-500 opacity-20 pointer-events-none">
                <Sparkline values={getHistory('helpRepayment')} width={100} height={40} />
              </div>
            </div>

            {/* Assessment Result */}
            <div
              onClick={() => onOpenProvenance('Assessment Result', currentFy.assessment?.assessmentResult)}
              className={`glass-card p-4 cursor-pointer border transition-all space-y-1 relative overflow-hidden ${
                currentFy.assessmentResult >= 0
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
              }`}
            >
              <div className="text-xs font-medium text-zinc-300 z-10 relative">Assessment result</div>
              <div className="text-2xl font-bold font-mono z-10 relative flex items-center">
                {currentFy.assessmentResult >= 0 ? '+' : '-'}
                $
                <AnimatedNumber value={Math.abs(currentFy.assessmentResult)} format={(n) => n.toLocaleString()} />
                <span className="text-sm ml-2 font-sans opacity-80">{currentFy.assessmentResult >= 0 ? 'refund' : 'payable'}</span>
              </div>
              <div className="text-[11px] opacity-80 z-10 relative">Notice of Assessment</div>
              <div className="absolute -bottom-1 -right-1 opacity-20 pointer-events-none">
                <Sparkline values={getHistory('assessmentResult')} width={100} height={40} />
              </div>
            </div>

            {/* Employer Super */}
            <div
              onClick={() => onOpenProvenance('Employer Super', currentFy.superContributions[0]?.recordedAmount)}
              className="glass-card p-4 cursor-pointer hover:border-emerald-500/50 transition-all space-y-1 relative overflow-hidden"
            >
              <div className="text-xs text-zinc-400 font-medium z-10 relative">Employer super</div>
              <div className="text-2xl font-bold font-mono text-zinc-100 z-10 relative">
                $<AnimatedNumber value={currentFy.employerSuper} format={(n) => n.toLocaleString()} />
              </div>
              <div className="text-[11px] text-zinc-400 z-10 relative">12.0% SG Guarantee</div>
              <div className="absolute -bottom-1 -right-1 text-emerald-500 opacity-20 pointer-events-none">
                <Sparkline values={getHistory('employerSuper')} width={100} height={40} />
              </div>
            </div>
          </div>
        </div>
      )}

      <ThresholdCard currentFy={currentFy} />

      {/* Compliance & Anomaly Alerts */}
      {currentFy.alerts.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider flex items-center gap-2 font-mono">
            <ShieldAlert className="w-4 h-4 text-amber-400" />
            <span>Australian Compliance & Anomaly Alerts ({currentFy.alerts.length})</span>
          </h3>
          <div className="space-y-2">
            {currentFy.alerts.map((alert) => (
              <div
                key={alert.id}
                className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3 justify-between"
              >
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-semibold text-amber-200">{alert.title}</h4>
                    <p className="text-xs text-amber-300/80 mt-0.5">{alert.description}</p>
                  </div>
                </div>
                {alert.sourceDocumentId && (
                  <button
                    onClick={() =>
                      onOpenProvenance(alert.title, {
                        value: alert.description,
                        confidence: 0.95,
                        sourceDocumentId: alert.sourceDocumentId!,
                        sourceDocumentName: alert.sourceDocumentName || 'Source PDF',
                        sourcePage: alert.sourcePage || 1,
                        sourceText: alert.description,
                        manuallyConfirmed: false
                      })
                    }
                    className="text-xs font-mono font-medium px-2.5 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 transition-colors shrink-0"
                  >
                    View Proof
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Multi-Year Recharts Chart */}
      <div className="glass-panel p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-zinc-200 font-mono">
            MULTI-YEAR FINANCIAL COMPARISON TREND
          </h3>
          <span className="text-xs text-zinc-400">Amounts in AUD ($)</span>
        </div>
        <div className="h-72 w-full pt-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis dataKey="name" stroke="#71717a" fontSize={12} tickLine={false} />
              <YAxis stroke="#71717a" fontSize={12} tickFormatter={(v) => `$${v / 1000}k`} tickLine={false} />
              <Tooltip
                contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '8px', fontSize: '12px' }}
                formatter={(val: any) => `$${Number(val || 0).toLocaleString()}`}
              />
              <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
              {/* Emerald accent, amber for tax, zinc for the neutral series -
                  the blue and purple here were outside the app's palette. */}
              <Bar dataKey="Gross Income" fill="#059669" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Taxable Income" fill="#6ee7b7" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Tax Withheld" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Employer Super" fill="#a1a1aa" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Modals */}
      <TaxOptimizationModal
        isOpen={isOptimizerOpen}
        onClose={() => setIsOptimizerOpen(false)}
        currentFy={currentFy}
        onOpenApiKeyModal={onOpenApiKeyModal}
      />

      <ExportSummaryModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        financialYears={allFys}
        selectedFy={currentFy}
      />
    </div>
  );
};
