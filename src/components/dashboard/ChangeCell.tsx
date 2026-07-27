import React from 'react';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface ChangeCellProps {
  current: number | undefined;
  previous: number | undefined;
  invertPolarity?: boolean;
}

export const ChangeCell: React.FC<ChangeCellProps> = ({
  current,
  previous,
  invertPolarity = false
}) => {
  if (current === undefined || previous === undefined || previous === 0) {
    return null;
  }

  const pct = ((current - previous) / Math.abs(previous)) * 100;
  if (Math.abs(pct) < 0.1) return null;

  const isPositive = pct > 0;
  const isGood = invertPolarity ? !isPositive : isPositive;

  const colorClass = isGood
    ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30'
    : 'text-rose-400 bg-rose-500/10 border-rose-500/30';

  return (
    <span
      className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full font-mono text-[10px] font-bold border transition-all duration-150 subpixel-antialiased ${colorClass}`}
    >
      {isPositive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
      <span>{isPositive ? '+' : ''}{pct.toFixed(1)}%</span>
    </span>
  );
};
