import React from 'react';

interface SparklineProps {
  values: number[];
  width?: number;
  height?: number;
  className?: string;
}

export const Sparkline: React.FC<SparklineProps> = ({
  values,
  width = 60,
  height = 20,
  className = 'text-emerald-400'
}) => {
  if (!values || values.length < 2) {
    return <svg width={width} height={height} className={className} />;
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const padding = 2;
  const innerWidth = width - padding * 2;
  const innerHeight = height - padding * 2;

  const points = values.map((val, i) => {
    const x = padding + (i / (values.length - 1)) * innerWidth;
    const y = padding + innerHeight - ((val - min) / range) * innerHeight;
    return { x, y };
  });

  const lineD = points.reduce((acc, point, i) => {
    return i === 0 ? `M ${point.x},${point.y}` : `${acc} L ${point.x},${point.y}`;
  }, '');

  const areaD = `${lineD} L ${points[points.length - 1].x},${height - padding} L ${points[0].x},${height - padding} Z`;

  return (
    <svg width={width} height={height} className={`${className} overflow-visible`}>
      <defs>
        <linearGradient id="sparkline-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="currentColor" stopOpacity={0.3} />
          <stop offset="100%" stopColor="currentColor" stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={areaD} fill="url(#sparkline-grad)" />
      <path
        d={lineD}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle
        cx={points[points.length - 1].x}
        cy={points[points.length - 1].y}
        r={2.5}
        fill="currentColor"
      />
    </svg>
  );
};
