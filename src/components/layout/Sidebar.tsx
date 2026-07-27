import React from 'react';
import {
  LayoutDashboard,
  DollarSign,
  Receipt,
  PiggyBank,
  GraduationCap,
  GitCompare,
  FileText,
  Shield,
  AlertTriangle
} from 'lucide-react';

export type NavTab =
  | 'overview'
  | 'income'
  | 'deductions'
  | 'super'
  | 'help'
  | 'compare'
  | 'documents'
  | 'privacy';

interface SidebarProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  alertCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, onTabChange, alertCount }) => {
  const navItems: { id: NavTab; label: string; icon: React.ComponentType<any>; badge?: number }[] = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'income', label: 'Income & Wages', icon: DollarSign },
    { id: 'deductions', label: 'Deductions', icon: Receipt },
    { id: 'super', label: 'Superannuation', icon: PiggyBank },
    { id: 'help', label: 'HELP & Study Loans', icon: GraduationCap },
    { id: 'compare', label: 'Compare Years', icon: GitCompare },
    { id: 'documents', label: 'Source Documents', icon: FileText },
    { id: 'privacy', label: 'Privacy & Security', icon: Shield }
  ];

  return (
    <aside className="w-64 border-r border-zinc-800/80 bg-zinc-950/60 flex flex-col shrink-0 min-h-[calc(100vh-4rem)] p-3">
      <div className="space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-all ${
                isActive
                  ? 'bg-zinc-800/90 text-zinc-100 font-semibold shadow-inner border border-zinc-700/50'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-400' : 'text-zinc-400'}`} />
                <span>{item.label}</span>
              </div>
              {item.id === 'overview' && alertCount > 0 && (
                <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-mono text-[10px] border border-amber-500/30">
                  <AlertTriangle className="w-3 h-3" />
                  {alertCount}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Australian FY Notice Footer */}
      <div className="mt-auto pt-4 border-t border-zinc-800/60 px-3">
        <div className="p-3 rounded-lg bg-zinc-900/50 border border-zinc-800 text-[11px] text-zinc-400 space-y-1">
          <div className="font-semibold text-zinc-300">Australian FY Standard</div>
          <p>Organised 1 July to 30 June. Local-first parser without ATO server upload.</p>
        </div>
      </div>
    </aside>
  );
};
