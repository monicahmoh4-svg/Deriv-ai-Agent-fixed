'use client';

interface SparklineProps {
  prices: number[];
  width?: number;
  height?: number;
  color?: string;
}

export default function Sparkline({ prices, width = 120, height = 36, color }: SparklineProps) {
  if (prices.length < 2) return null;

  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min || 1;

  const points = prices.slice(-60).map((p, i, arr) => {
    const x = (i / (arr.length - 1)) * width;
    const y = height - ((p - min) / range) * height;
    return `${x},${y}`;
  });

  const last = prices[prices.length - 1];
  const first = prices[prices.length - Math.min(prices.length, 20)];
  const up = last >= first;
  const lineColor = color || (up ? '#00e676' : '#ff3d6b');

  const pathD = `M ${points.join(' L ')}`;
  const fillD = `${pathD} L ${width},${height} L 0,${height} Z`;

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ overflow: 'visible' }}>
      <defs>
        <linearGradient id={`grad-${lineColor.replace('#','')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={lineColor} stopOpacity="0.3" />
          <stop offset="100%" stopColor={lineColor} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <path d={fillD} fill={`url(#grad-${lineColor.replace('#','')})`} />
      <path d={pathD} fill="none" stroke={lineColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      {/* Last dot */}
      <circle
        cx={width}
        cy={height - ((last - min) / range) * height}
        r="2.5"
        fill={lineColor}
      />
    </svg>
  );
}
