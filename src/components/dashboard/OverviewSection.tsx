import React, { useId, useState } from 'react';
import { motion } from 'motion/react';
import { ShieldAlert, AlertTriangle, Receipt, LayoutGrid, Table, Key, Sparkles, Download, FileSearch } from 'lucide-react';
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
import { EditableFigure } from '../common/EditableFigure';
import { isManuallySet, type EditableFigure as FigureKey } from '../../lib/manualFigures';
import { Sparkline } from '../common/Sparkline';
import { getSuperGuaranteeRule } from '../../engine/superGuaranteeAudit';

interface OverviewSectionProps {
  currentFy: AustralianFinancialYear;
  allFys: AustralianFinancialYear[];
  onOpenProvenance: (fieldName: string, value?: ExtractedValue<any>) => void;
  onOpenApiKeyModal: () => void;
  /** Absent while previewing sample data, which is read-only. */
  onEditFigure?: (figure: FigureKey, value: number) => void;
}

const SourceButton: React.FC<{
  label: string;
  available: boolean;
  onClick: () => void;
}> = ({ label, available, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={!available}
    aria-label={`Inspect source for ${label}`}
    title={available ? `Inspect source for ${label}` : `No source linked to ${label}`}
    className="absolute right-2 top-2 z-20 rounded-md p-1 text-zinc-600 transition-colors hover:bg-white/5 hover:text-blue-400 disabled:cursor-not-allowed disabled:opacity-30"
  >
    <FileSearch className="h-3.5 w-3.5" />
  </button>
);

export const OverviewSection: React.FC<OverviewSectionProps> = ({
  currentFy,
  allFys,
  onOpenProvenance,
  onOpenApiKeyModal,
  onEditFigure
}) => {
  const figureProps = (figure: FigureKey) => ({
    value: currentFy[figure] as number,
    label: figure,
    isManual: isManuallySet(currentFy, figure),
    onCommit: onEditFigure ? (next: number) => onEditFigure(figure, next) : undefined
  });

  const [viewMode, setViewMode] = useState<'grid' | 'table' | 'receipt'>('grid');
  const viewHighlightId = useId();
  const [isOptimizerOpen, setIsOptimizerOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const sgRate = getSuperGuaranteeRule(currentFy.id).rate;

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
            <span className="shrink-0 rounded border border-white/10 bg-white/5 px-2 py-0.5 font-mono text-sm font-semibold text-zinc-300">
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
            className="flex items-center gap-1.5 rounded-lg border border-blue-500/30 bg-blue-500/10 px-3 py-1.5 text-xs font-semibold text-blue-300 transition-colors hover:bg-blue-500/20"
          >
            <Sparkles className="w-3.5 h-3.5 text-blue-400" />
            <span>Tax Optimizer</span>
          </button>

          {/* Export Button */}
          <button
            onClick={() => setIsExportOpen(true)}
            className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-zinc-300 transition-colors hover:bg-white/10"
          >
            <Download className="w-3.5 h-3.5 text-zinc-400" />
            <span>Export Report</span>
          </button>

          {/* View Mode Toggle */}
          <div className="flex items-center bg-zinc-900 border border-zinc-800 p-1 rounded-lg">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              aria-pressed={viewMode === 'grid'}
              className={`relative flex items-center gap-1.5 px-3 py-1 rounded text-xs transition-colors ${
                viewMode === 'grid'
                  ? 'text-zinc-100 font-semibold'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {viewMode === 'grid' && (
                <motion.span
                  layoutId={viewHighlightId}
                  className="absolute inset-0 rounded bg-zinc-800 shadow-sm"
                  initial={false}
                  transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                />
              )}
              <LayoutGrid className="relative z-10 w-3.5 h-3.5" />
              <span className="relative z-10">Grid</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              aria-pressed={viewMode === 'table'}
              className={`relative flex items-center gap-1.5 px-3 py-1 rounded text-xs transition-colors ${
                viewMode === 'table'
                  ? 'text-zinc-100 font-semibold'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {viewMode === 'table' && (
                <motion.span
                  layoutId={viewHighlightId}
                  className="absolute inset-0 rounded bg-zinc-800 shadow-sm"
                  initial={false}
                  transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                />
              )}
              <Table className="relative z-10 w-3.5 h-3.5" />
              <span className="relative z-10">Multi-Year Table</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('receipt')}
              aria-pressed={viewMode === 'receipt'}
              className={`relative flex items-center gap-1.5 px-3 py-1 rounded text-xs transition-colors ${
                viewMode === 'receipt'
                  ? 'text-zinc-100 font-semibold'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {viewMode === 'receipt' && (
                <motion.span
                  layoutId={viewHighlightId}
                  className="absolute inset-0 rounded bg-zinc-800 shadow-sm"
                  initial={false}
                  transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                />
              )}
              <Receipt className="relative z-10 w-3.5 h-3.5" />
              <span className="relative z-10">Tax Receipt</span>
            </button>
          </div>

          <button
            onClick={onOpenApiKeyModal}
            className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-zinc-300 transition-colors hover:bg-white/10"
          >
            <Key className="w-3.5 h-3.5 text-blue-400" />
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
            <span className="text-sm font-semibold text-zinc-300">
              TAX BREAKDOWN ({currentFy.label})
            </span>
            <span className="whitespace-nowrap font-mono text-xs text-zinc-400">
              Effective rate <strong className="font-bold text-zinc-100">{currentFy.effectiveTaxRate}%</strong>
            </span>
          </div>

          <div className="grid grid-cols-1 gap-4 @xl:grid-cols-2 @4xl:grid-cols-4">
            {/* Gross Income */}
            <div
              className="glass-card p-4 hover:border-white/20 transition-all space-y-1 relative overflow-hidden"
            >
              <SourceButton
                label="Gross income"
                available={Boolean(currentFy.income[0]?.grossAmount)}
                onClick={() => onOpenProvenance('Gross Income', currentFy.income[0]?.grossAmount)}
              />
              <div className="text-xs text-zinc-400 font-medium z-10 relative">Gross income</div>
              <div className="text-2xl font-bold font-mono text-zinc-100 z-10 relative">
                <EditableFigure {...figureProps('grossIncome')} />
              </div>
              <div className="text-[11px] text-zinc-400 flex items-center gap-1 z-10 relative">
                <span>{currentFy.employerCount} employer(s)</span>
              </div>
              <div className="absolute -bottom-1 -right-1 text-blue-500 opacity-20 pointer-events-none">
                <Sparkline values={getHistory('grossIncome')} width={100} height={40} />
              </div>
            </div>

            {/* Taxable Income */}
            <div
              className="glass-card p-4 hover:border-white/20 transition-all space-y-1 relative overflow-hidden"
            >
              <SourceButton
                label="Taxable income"
                available={Boolean(currentFy.assessment?.taxableIncome)}
                onClick={() => onOpenProvenance('Taxable Income', currentFy.assessment?.taxableIncome)}
              />
              <div className="text-xs text-zinc-400 font-medium z-10 relative">Taxable income</div>
              <div className="text-2xl font-bold font-mono text-zinc-100 z-10 relative">
                <EditableFigure {...figureProps('taxableIncome')} />
              </div>
              <div className="text-[11px] text-zinc-400 z-10 relative">After work deductions</div>
              <div className="absolute -bottom-1 -right-1 text-blue-500 opacity-20 pointer-events-none">
                <Sparkline values={getHistory('taxableIncome')} width={100} height={40} />
              </div>
            </div>

            {/* Tax Withheld */}
            <div
              className="glass-card p-4 hover:border-white/20 transition-all space-y-1 relative overflow-hidden"
            >
              <SourceButton
                label="Tax withheld"
                available={Boolean(currentFy.income[0]?.taxWithheld)}
                onClick={() => onOpenProvenance('Tax Withheld', currentFy.income[0]?.taxWithheld)}
              />
              <div className="text-xs text-zinc-400 font-medium z-10 relative">Tax withheld</div>
              <div className="text-2xl font-bold font-mono text-zinc-100 z-10 relative">
                <EditableFigure {...figureProps('taxWithheld')} />
              </div>
              <div className="text-[11px] text-zinc-400 z-10 relative">PAYG tax collected</div>
              <div className="absolute -bottom-1 -right-1 text-blue-500 opacity-20 pointer-events-none">
                <Sparkline values={getHistory('taxWithheld')} width={100} height={40} />
              </div>
            </div>

            {/* Deductions */}
            <div
              className="glass-card p-4 hover:border-white/20 transition-all space-y-1 relative overflow-hidden"
            >
              <SourceButton
                label="Deductions"
                available={Boolean(currentFy.deductions[0]?.amount)}
                onClick={() => onOpenProvenance('Deductions', currentFy.deductions[0]?.amount)}
              />
              <div className="text-xs text-zinc-400 font-medium z-10 relative">Deductions</div>
              <div className="text-2xl font-bold font-mono text-zinc-100 z-10 relative">
                <EditableFigure {...figureProps('totalDeductions')} />
              </div>
              <div className="text-[11px] text-zinc-400 z-10 relative">{currentFy.deductions.length} claimed items</div>
              <div className="absolute -bottom-1 -right-1 text-blue-500 opacity-20 pointer-events-none">
                <Sparkline values={getHistory('totalDeductions')} width={100} height={40} />
              </div>
            </div>

            {/* Medicare Levy */}
            <div
              className="glass-card p-4 hover:border-white/20 transition-all space-y-1 relative overflow-hidden"
            >
              <SourceButton
                label="Medicare levy"
                available={Boolean(currentFy.assessment?.medicareLevy)}
                onClick={() => onOpenProvenance('Medicare Levy', currentFy.assessment?.medicareLevy)}
              />
              <div className="text-xs text-zinc-400 font-medium z-10 relative">Medicare levy</div>
              <div className="text-2xl font-bold font-mono text-zinc-200 z-10 relative">
                <EditableFigure {...figureProps('medicareLevy')} />
              </div>
              <div
                className={`text-[11px] z-10 relative ${
                  currentFy.medicareRule?.status === 'estimated' ? 'text-amber-300' : 'text-zinc-400'
                }`}
              >
                {currentFy.medicareRule?.status === 'estimated'
                  ? `Estimate using ${currentFy.medicareRule.sourceYear} thresholds`
                  : 'Standard 2.0% levy'}
              </div>
              <div className="absolute -bottom-1 -right-1 text-zinc-500 opacity-20 pointer-events-none">
                <Sparkline values={getHistory('medicareLevy')} width={100} height={40} />
              </div>
            </div>

            {/* HELP Repayment */}
            <div
              className="glass-card p-4 hover:border-white/20 transition-all space-y-1 relative overflow-hidden"
            >
              <SourceButton
                label="HELP repayment"
                available={Boolean(currentFy.studyLoans?.compulsoryRepayment)}
                onClick={() => onOpenProvenance('HELP Repayment', currentFy.studyLoans?.compulsoryRepayment)}
              />
              <div className="text-xs text-zinc-400 font-medium z-10 relative">HELP repayment</div>
              <div className="text-2xl font-bold font-mono text-zinc-100 z-10 relative">
                <EditableFigure {...figureProps('helpRepayment')} />
              </div>
              <div className="text-[11px] text-zinc-400 z-10 relative">Study loan compulsory</div>
              <div className="absolute -bottom-1 -right-1 text-blue-500 opacity-20 pointer-events-none">
                <Sparkline values={getHistory('helpRepayment')} width={100} height={40} />
              </div>
            </div>

            {/* Assessment Result */}
            <div
              className={`glass-card p-4 border transition-all space-y-1 relative overflow-hidden ${
                currentFy.assessmentResult > 0
                  ? 'bg-emerald-500/[0.06] border-emerald-500/20 text-emerald-400'
                  : currentFy.assessmentResult < 0
                    ? 'bg-rose-500/[0.06] border-rose-500/20 text-rose-400'
                    : 'bg-zinc-900 border-zinc-700 text-zinc-300'
              }`}
            >
              <SourceButton
                label="Assessment result"
                available={Boolean(currentFy.assessment?.assessmentResult)}
                onClick={() => onOpenProvenance('Assessment Result', currentFy.assessment?.assessmentResult)}
              />
              <div className="text-xs font-medium text-zinc-300 z-10 relative">Assessment result</div>
              <div className="text-2xl font-bold font-mono z-10 relative flex items-center gap-2">
                <EditableFigure {...figureProps('assessmentResult')} signed />
                <span className="font-sans text-sm opacity-80">
                  {currentFy.assessmentResult > 0
                    ? 'refund'
                    : currentFy.assessmentResult < 0
                      ? 'payable'
                      : 'no balance'}
                </span>
              </div>
              <div className="text-[11px] opacity-80 z-10 relative">Notice of Assessment</div>
              <div className="absolute -bottom-1 -right-1 opacity-20 pointer-events-none">
                <Sparkline values={getHistory('assessmentResult')} width={100} height={40} />
              </div>
            </div>

            {/* Employer Super */}
            <div
              className="glass-card p-4 hover:border-white/20 transition-all space-y-1 relative overflow-hidden"
            >
              <SourceButton
                label="Employer super"
                available={Boolean(currentFy.superContributions[0]?.recordedAmount)}
                onClick={() => onOpenProvenance('Employer Super', currentFy.superContributions[0]?.recordedAmount)}
              />
              <div className="text-xs text-zinc-400 font-medium z-10 relative">Employer super</div>
              <div className="text-2xl font-bold font-mono text-zinc-100 z-10 relative">
                <EditableFigure {...figureProps('employerSuper')} />
              </div>
              <div className="text-[11px] text-zinc-400 z-10 relative">
                {sgRate === null ? 'SG rate unavailable' : `${sgRate.toFixed(1)}% SG Guarantee`}
              </div>
              <div className="absolute -bottom-1 -right-1 text-blue-500 opacity-20 pointer-events-none">
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
          <h3 className="flex items-center gap-2 text-sm font-semibold text-zinc-300">
            <ShieldAlert className="w-4 h-4 text-amber-400" />
            <span>Australian Compliance & Anomaly Alerts ({currentFy.alerts.length})</span>
          </h3>
          <div className="space-y-2">
            {currentFy.alerts.map((alert) => (
              <div
                key={alert.id}
                className="flex items-start justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.025] p-4"
              >
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-semibold text-zinc-200">{alert.title}</h4>
                    <p className="mt-0.5 text-xs text-zinc-400">{alert.description}</p>
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
                    className="shrink-0 rounded border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-medium text-zinc-300 transition-colors hover:bg-white/10"
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
          <h3 className="text-sm font-semibold text-zinc-200">
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
              <Bar dataKey="Gross Income" fill="#007ae7" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Taxable Income" fill="#60a5fa" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Tax Withheld" fill="#f87171" radius={[4, 4, 0, 0]} />
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
