import { useState, useEffect, useId, useMemo } from 'react';
import { MotionConfig, motion } from 'motion/react';
import type { AustralianFinancialYear, ExtractedValue, SourceDocument } from './types/tax';
import {
  loadRealFinancialYears,
  saveFinancialYears,
  resetAllData,
  isSampleDataVisible,
  setSampleDataVisible
} from './storage/db';
import { INITIAL_FINANCIAL_YEARS } from './data/sampleData';
import { applyParsedDocument, resolveFinancialYear } from './lib/applyParsedDocument';
import { applyManualFigure, type EditableFigure } from './lib/manualFigures';
import { runAustralianTaxReconciliation } from './engine/reconciliationEngine';
import { applyElectronDocumentAttributes } from './lib/electron';
import { Navbar } from './components/layout/Navbar';
import { OverviewSection } from './components/dashboard/OverviewSection';
import { IncomeSection } from './components/income/IncomeSection';
import { DeductionsSection } from './components/deductions/DeductionsSection';
import { SuperSection } from './components/super/SuperSection';
import { HELPSection } from './components/help/HELPSection';
import { CompareYearsSection } from './components/compare/CompareYearsSection';
import { ProvenanceDrawer } from './components/provenance/ProvenanceDrawer';
import { UploadModal } from './components/upload/UploadModal';
import { ApiKeySetupModal } from './components/upload/ApiKeySetupModal';
import type { ParserProviderId } from './parser/providerFactory';
import type { ParsedDocumentResult } from './parser/providerAdapter';
import { LocalChatDrawer } from './components/chat/LocalChatDrawer';
import { PrivacyModal } from './components/privacy/PrivacyModal';
import { FAQSection } from './components/faq/FAQSection';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { DevTools } from './components/common/DevTools';
import { EmptyWorkspaceState } from './components/common/EmptyWorkspaceState';
import { FileText, ShieldCheck, EyeOff } from 'lucide-react';

export type NavTab = 'overview' | 'income' | 'deductions' | 'super' | 'help' | 'compare' | 'documents' | 'privacy';

const PARSER_ENGINE_LABELS: Record<string, string> = {
  rule_based: 'Rule-Based Local',
  claude: 'Claude (Anthropic)',
  openai: 'OpenAI (GPT-4o)',
  gemini: 'Gemini (Google)',
  ollama: 'Local Ollama'
};

export function App() {
  const subnavHighlightId = useId();

  useEffect(() => {
    applyElectronDocumentAttributes();
  }, []);

  // Real, user-uploaded data and the bundled sample/demo data are kept
  // entirely separate - they're never merged, and uploading a document only
  // ever touches real data.
  const [realFinancialYears, setRealFinancialYears] = useState<AustralianFinancialYear[]>(() =>
    loadRealFinancialYears()
  );
  const [showSampleData, setShowSampleData] = useState<boolean>(() => isSampleDataVisible());

  const sampleFinancialYears = useMemo(
    () => INITIAL_FINANCIAL_YEARS.map((fy) => ({ ...fy, alerts: runAustralianTaxReconciliation(fy) })),
    []
  );
  const realFinancialYearsWithAlerts = useMemo(
    () => realFinancialYears.map((fy) => ({ ...fy, alerts: runAustralianTaxReconciliation(fy) })),
    [realFinancialYears]
  );

  const financialYears = showSampleData ? sampleFinancialYears : realFinancialYearsWithAlerts;

  const [selectedFyId, setSelectedFyId] = useState<string>('');

  // Keep the selected financial year valid as the active dataset (sample vs
  // real) or its contents change.
  useEffect(() => {
    if (financialYears.length === 0) return;
    if (!financialYears.some((f) => f.id === selectedFyId)) {
      setSelectedFyId(financialYears[0].id);
    }
  }, [financialYears, selectedFyId]);

  const [activeTab, setActiveTab] = useState<NavTab>('overview');

  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isApiKeyOpen, setIsApiKeyOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isPrivacyOpen, setIsPrivacyOpen] = useState(false);
  const [isProvenanceOpen, setIsProvenanceOpen] = useState(false);
  const [provenanceField, setProvenanceField] = useState('');
  const [provenanceValue, setProvenanceValue] = useState<ExtractedValue<any> | undefined>(undefined);

  const currentFy: AustralianFinancialYear | undefined =
    financialYears.find((f) => f.id === selectedFyId) || financialYears[0];

  const handleOpenProvenance = (fieldName: string, value?: ExtractedValue<any>) => {
    if (!currentFy) return;
    if (!value) return;
    setProvenanceField(fieldName);
    setProvenanceValue(value);
    setIsProvenanceOpen(true);
  };

  // Uploads always target real data, never the sample dataset, even if the
  // user is currently previewing sample data. The parsed figures are folded
  // into the financial year the document itself reports.
  const handleDocumentParsed = (
    documentName: string,
    fileSize: number,
    parsedBy: ParserProviderId,
    result: ParsedDocumentResult
  ) => {
    const newDoc: SourceDocument = {
      id: `doc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      fileName: documentName,
      fileSize,
      fileType: result.documentType,
      uploadDate: new Date().toISOString().split('T')[0],
      financialYear: result.financialYear,
      pageCount: 1,
      parsedBy,
      rawText: result.rawText,
      confidenceAverage: result.confidenceAverage
    };

    setRealFinancialYears((prev) => {
      const updated = applyParsedDocument(prev, newDoc, result);
      saveFinancialYears(updated);
      return updated;
    });

    // Switch off sample data so the new upload is immediately visible.
    setShowSampleData(false);
    setSampleDataVisible(false);
    setSelectedFyId(resolveFinancialYear(result.financialYear).id);
  };

  // Corrections apply to the user's own data. The bundled sample set is a
  // preview and stays read-only.
  const handleEditFigure = (figure: EditableFigure, value: number) => {
    if (showSampleData || !currentFy) return;
    setRealFinancialYears((prev) => {
      const updated = prev.map((fy) => (fy.id === currentFy.id ? applyManualFigure(fy, figure, value) : fy));
      saveFinancialYears(updated);
      return updated;
    });
  };

  const handleToggleSampleData = () => {
    const next = !showSampleData;
    setShowSampleData(next);
    setSampleDataVisible(next);
  };

  const handleDataWiped = () => {
    resetAllData();
    setRealFinancialYears([]);
    setShowSampleData(true);
    setSampleDataVisible(true);
  };

  return (
    <MotionConfig reducedMotion="user">
      <ErrorBoundary name="ATO Lens Main Workspace">
        <div className="flex h-screen w-screen overflow-hidden bg-black text-zinc-100 font-sans">
        <div className="flex flex-1 flex-col h-full min-w-0 overflow-hidden bg-[#0a0a0a]">
          <Navbar
            financialYears={financialYears}
            selectedFyId={selectedFyId}
            onSelectFy={setSelectedFyId}
            onOpenUpload={() => setIsUploadOpen(true)}
            onToggleChat={() => setIsChatOpen(!isChatOpen)}
            onOpenPrivacy={() => setIsPrivacyOpen(true)}
            onOpenApiKeyModal={() => setIsApiKeyOpen(true)}
            onOpenFaqModal={() => setActiveTab('privacy')}
            isChatOpen={isChatOpen}
            showSampleData={showSampleData}
            onToggleSampleData={handleToggleSampleData}
          />

          {/* Secondary Category Sub-Nav Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto border-b border-white/10 bg-[#0a0a0a] px-4 py-2 text-[13px] shrink-0">
            {[
              { id: 'overview', label: 'Summary Overview' },
              { id: 'income', label: 'Income & Employers' },
              { id: 'deductions', label: 'Work Deductions' },
              { id: 'super', label: 'Super Guarantee' },
              { id: 'help', label: 'HELP Study Loan' },
              { id: 'compare', label: 'Year Comparison' },
              { id: 'documents', label: 'Source PDFs' },
              { id: 'privacy', label: 'Privacy & FAQ' }
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as NavTab)}
                aria-pressed={activeTab === tab.id}
                className={`relative px-3 py-1 rounded-lg transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'text-zinc-100 font-semibold'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60'
                }`}
              >
                {activeTab === tab.id && (
                  <motion.span
                    layoutId={subnavHighlightId}
                    className="absolute inset-0 rounded-lg border border-zinc-700 bg-zinc-800 shadow-sm"
                    initial={false}
                    transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                  />
                )}
                <span className="relative z-10">{tab.label}</span>
              </button>
            ))}
          </div>

          {showSampleData && (
            <div className="flex items-center justify-between gap-3 border-b border-white/10 bg-white/[0.025] px-4 py-2 text-xs text-zinc-400 shrink-0">
              <span>
                <strong className="mr-2 font-semibold text-zinc-200">Sample workspace</strong>
                Upload a document to switch to your own data.
              </span>
              <button
                type="button"
                onClick={handleToggleSampleData}
                className="flex shrink-0 items-center gap-1.5 rounded-lg bg-white/5 px-2.5 py-1 font-medium text-zinc-300 transition-colors hover:bg-white/10"
              >
                <EyeOff className="w-3.5 h-3.5" />
                Hide Sample Data
              </button>
            </div>
          )}

          {/* Scrollable Main Body Content Area */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 flex flex-col">
            {!currentFy && activeTab !== 'privacy' && (
              <EmptyWorkspaceState
                onUpload={() => setIsUploadOpen(true)}
                onShowSampleData={() => {
                  setShowSampleData(true);
                  setSampleDataVisible(true);
                }}
              />
            )}

            {currentFy && activeTab === 'overview' && (
              <OverviewSection
                currentFy={currentFy}
                allFys={financialYears}
                onOpenProvenance={handleOpenProvenance}
                onOpenApiKeyModal={() => setIsApiKeyOpen(true)}
                onEditFigure={showSampleData ? undefined : handleEditFigure}
              />
            )}

            {currentFy && activeTab === 'income' && (
              <IncomeSection
                currentFy={currentFy}
                onOpenProvenance={handleOpenProvenance}
              />
            )}

            {currentFy && activeTab === 'deductions' && (
              <DeductionsSection
                currentFy={currentFy}
                onOpenProvenance={handleOpenProvenance}
              />
            )}

            {currentFy && activeTab === 'super' && (
              <SuperSection
                currentFy={currentFy}
                onOpenProvenance={handleOpenProvenance}
              />
            )}

            {currentFy && activeTab === 'help' && (
              <HELPSection
                currentFy={currentFy}
                onOpenProvenance={handleOpenProvenance}
              />
            )}

            {currentFy && activeTab === 'compare' && (
              <CompareYearsSection financialYears={financialYears} />
            )}

            {currentFy && activeTab === 'documents' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
                  <div>
                    <h2 className="flex items-center gap-2 text-xl font-bold text-zinc-100">
                      <FileText className="w-5 h-5 text-blue-400" />
                      <span>Uploaded Source Documents</span>
                    </h2>
                    <p className="text-xs text-zinc-400">
                      Local PDF files for financial year {currentFy.label}
                    </p>
                  </div>
                  <button
                    onClick={() => setIsUploadOpen(true)}
                    className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-blue-500"
                  >
                    + Upload Document
                  </button>
                </div>

                <div className="glass-panel overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs font-mono">
                      <thead className="bg-zinc-950 text-zinc-400 border-b border-zinc-800">
                        <tr>
                          <th className="p-3">File Name</th>
                          <th className="p-3">Type</th>
                          <th className="p-3">Upload Date</th>
                          <th className="p-3">Size</th>
                          <th className="p-3">Parser Engine</th>
                          <th className="p-3">Confidence</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-800/60">
                        {currentFy.documents.map((doc) => (
                          <tr key={doc.id} className="hover:bg-zinc-900/60">
                            <td className="p-3 font-semibold text-zinc-200">{doc.fileName}</td>
                            <td className="p-3 uppercase text-emerald-400">{doc.fileType.replace(/_/g, ' ')}</td>
                            <td className="p-3 text-zinc-400">{doc.uploadDate}</td>
                            <td className="p-3 text-zinc-400">{(doc.fileSize / 1024).toFixed(0)} KB</td>
                            <td className="p-3 text-zinc-300">{PARSER_ENGINE_LABELS[doc.parsedBy] || doc.parsedBy}</td>
                            <td className="p-3 text-emerald-400 font-bold">
                              {(doc.confidenceAverage * 100).toFixed(0)}%
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'privacy' && (
              <div className="space-y-6">
                <div className="glass-panel p-6 space-y-4">
                  <h2 className="flex items-center gap-2 text-xl font-bold text-zinc-100">
                    <ShieldCheck className="w-5 h-5 text-emerald-400" />
                    <span>Privacy & Local Storage Dashboard</span>
                  </h2>
                  <p className="text-xs text-zinc-400">
                    All parsed Australian tax returns, notices of assessment, payslips, and study loan data are saved in your local browser IndexedDB / localStorage.
                  </p>
                  <div className="pt-2 flex gap-3">
                    <button
                      onClick={() => setIsPrivacyOpen(true)}
                      className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-blue-500"
                    >
                      Open Live Network Monitor
                    </button>
                  </div>
                </div>

                <FAQSection />
              </div>
            )}
          </div>
        </div>

        <LocalChatDrawer
          isOpen={isChatOpen}
          onClose={() => setIsChatOpen(false)}
          financialYears={financialYears}
          onOpenProvenance={handleOpenProvenance}
        />

        {/* Modals & Drawers */}
        <ProvenanceDrawer
          isOpen={isProvenanceOpen}
          onClose={() => setIsProvenanceOpen(false)}
          fieldName={provenanceField}
          extractedValue={provenanceValue}
        />

        <UploadModal
          isOpen={isUploadOpen}
          onClose={() => setIsUploadOpen(false)}
          onDocumentParsed={handleDocumentParsed}
          onOpenApiKeyModal={() => {
            setIsUploadOpen(false);
            setIsApiKeyOpen(true);
          }}
        />

        <ApiKeySetupModal
          isOpen={isApiKeyOpen}
          onClose={() => setIsApiKeyOpen(false)}
        />

        <PrivacyModal
          isOpen={isPrivacyOpen}
          onClose={() => setIsPrivacyOpen(false)}
          financialYears={realFinancialYearsWithAlerts}
          onDataWiped={handleDataWiped}
        />

        <DevTools onResetData={() => setIsPrivacyOpen(true)} />
        </div>
      </ErrorBoundary>
    </MotionConfig>
  );
}

export default App;
