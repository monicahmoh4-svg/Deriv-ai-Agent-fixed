'use client';
import { TrendingUp, TrendingDown, Activity, Zap } from 'lucide-react';
import { useTradingStore } from '@/store/trading-store';
import Sparkline from '../charts/Sparkline';

export default function MarketOverview() {
  const { selectedSymbols, symbols, ticks, signals } = useTradingStore();

  const displaySymbols = selectedSymbols.slice(0, 6);

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: `repeat(auto-fill, minmax(180px, 1fr))`,
      gap: 10,
    }}>
      {displaySymbols.map(sym => {
        const symInfo = symbols.find(s => s.symbol === sym);
        const symTicks = ticks[sym] || [];
        const prices = symTicks.map(t => t.quote);
        const current = prices[prices.length - 1];
        const prev = prices[prices.length - 20] || prices[0];
        const change = current && prev ? ((current - prev) / prev) * 100 : 0;
        const signal = signals[sym];
        const up = change >= 0;

        return (
          <div key={sym} className="card card-hover" style={{ padding: '12px 14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
              <div>
                <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: '#e8f0fe' }}>
                  {symInfo?.display_name || sym}
                </p>
                <p style={{ margin: '1px 0 0', fontSize: 9, color: '#3d5270', fontFamily: 'JetBrains Mono, monospace' }}>
                  {sym}
                </p>
              </div>
              {signal && signal.direction !== 'NEUTRAL' && (
                <span style={{
                  fontSize: 9, fontWeight: 800, padding: '2px 6px', borderRadius: 100,
                  background: signal.direction === 'CALL' ? '#00e67622' : '#ff3d6b22',
                  color: signal.direction === 'CALL' ? '#00e676' : '#ff3d6b',
                  border: `1px solid ${signal.direction === 'CALL' ? '#00e67644' : '#ff3d6b44'}`,
                }}>
                  {signal.direction === 'CALL' ? '▲ RISE' : '▼ FALL'}
                </span>
              )}
            </div>

            {prices.length > 2 && (
              <div style={{ margin: '6px 0' }}>
                <Sparkline prices={prices} width={152} height={32} />
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
              <span style={{
                fontSize: 12, fontWeight: 700, fontFamily: 'JetBrains Mono, monospace',
                color: up ? '#00e676' : '#ff3d6b',
              }}>
                {current ? current.toFixed(sym.includes('JPY') ? 3 : 5) : '—'}
              </span>
              <span style={{
                fontSize: 10, fontWeight: 600,
                color: up ? '#00e676' : '#ff3d6b',
                display: 'flex', alignItems: 'center', gap: 2,
              }}>
                {up ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                {change >= 0 ? '+' : ''}{change.toFixed(3)}%
              </span>
            </div>

            {signal && (
              <div style={{ marginTop: 6, height: 3, background: '#1e2d45', borderRadius: 100 }}>
                <div style={{
                  height: '100%', borderRadius: 100,
                  width: `${signal.confidence}%`,
                  background: signal.confidence >= 70 ? '#00e676' : signal.confidence >= 55 ? '#ffd600' : '#ff3d6b',
                  transition: 'width 0.5s ease',
                }} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
