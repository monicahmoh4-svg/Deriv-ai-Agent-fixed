'use client';
import { useState } from 'react';
import { TrendingUp, TrendingDown, Minus, ChevronDown, ChevronUp, Zap, BarChart2 } from 'lucide-react';
import type { TradingSignal } from '@/lib/trading-engine';
import type { TickData } from '@/lib/deriv-api';
import { useTradingStore } from '@/store/trading-store';

interface SignalCardProps {
  symbol: string;
  displayName: string;
  signal: TradingSignal | null;
  ticks: TickData[];
  onTrade: (direction: 'CALL' | 'PUT', stake: number) => void;
  disabled?: boolean;
}

export default function SignalCard({ symbol, displayName, signal, ticks, onTrade, disabled }: SignalCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [manualStake, setManualStake] = useState('1');
  const { riskSettings } = useTradingStore();

  const currentPrice = ticks[ticks.length - 1]?.quote;
  const prevPrice = ticks[ticks.length - 2]?.quote;
  const priceChange = currentPrice && prevPrice ? ((currentPrice - prevPrice) / prevPrice) * 100 : 0;
  const priceUp = priceChange >= 0;

  const conf = signal?.confidence ?? 0;
  const dir = signal?.direction ?? 'NEUTRAL';

  const confColor =
    conf >= 75 ? '#00e676' :
    conf >= 55 ? '#ffd600' :
    '#ff3d6b';

  const dirColor =
    dir === 'CALL' ? '#00e676' :
    dir === 'PUT' ? '#ff3d6b' :
    '#8098b8';

  const dirBg =
    dir === 'CALL' ? '#00e67611' :
    dir === 'PUT' ? '#ff3d6b11' :
    '#8098b811';

  const ind = signal?.indicators;

  return (
    <div className="card fade-up" style={{ padding: 0, overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '14px 16px', borderBottom: '1px solid #1e2d45' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 8,
              background: 'linear-gradient(135deg, #131a27, #1e2d45)',
              border: '1px solid #2a3f5e',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <BarChart2 size={16} color="#00c2ff" />
            </div>
            <div>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#e8f0fe' }}>{displayName}</p>
              <p style={{ margin: 0, fontSize: 10, fontFamily: 'JetBrains Mono, monospace', color: '#8098b8' }}>{symbol}</p>
            </div>
          </div>

          {/* Live price */}
          {currentPrice && (
            <div style={{ textAlign: 'right' }}>
              <p style={{
                margin: 0, fontSize: 15, fontWeight: 700, fontFamily: 'JetBrains Mono, monospace',
                color: priceUp ? '#00e676' : '#ff3d6b',
              }}>
                {currentPrice.toFixed(symbol.includes('JP') ? 2 : 5)}
              </p>
              <p style={{ margin: 0, fontSize: 10, color: priceUp ? '#00e676' : '#ff3d6b' }}>
                {priceUp ? '+' : ''}{priceChange.toFixed(4)}%
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Signal */}
      <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        {/* Direction pill */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '6px 14px', borderRadius: 100,
          background: dirBg, border: `1px solid ${dirColor}44`,
        }}>
          {dir === 'CALL' ? <TrendingUp size={14} color={dirColor} /> :
           dir === 'PUT' ? <TrendingDown size={14} color={dirColor} /> :
           <Minus size={14} color={dirColor} />}
          <span style={{ fontSize: 12, fontWeight: 800, color: dirColor, letterSpacing: '0.05em' }}>
            {dir === 'CALL' ? 'RISE' : dir === 'PUT' ? 'FALL' : 'NEUTRAL'}
          </span>
        </div>

        {/* Confidence bar */}
        <div style={{ flex: 1, minWidth: 80 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: 10, color: '#8098b8' }}>Confidence</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: confColor }}>{conf}%</span>
          </div>
          <div style={{ height: 5, background: '#1e2d45', borderRadius: 100 }}>
            <div style={{
              height: '100%', borderRadius: 100,
              width: `${conf}%`,
              background: `linear-gradient(90deg, ${confColor}88, ${confColor})`,
              transition: 'width 0.5s ease',
            }} />
          </div>
        </div>

        {/* Expand */}
        <button
          onClick={() => setExpanded(!expanded)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8098b8', padding: 4 }}
        >
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
      </div>

      {/* Expanded indicators */}
      {expanded && ind && (
        <div style={{ padding: '0 16px 14px', borderTop: '1px solid #1e2d45' }}>
          <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
            {[
              { label: 'RSI', value: ind.rsi.toFixed(1), color: ind.rsi < 30 ? '#00e676' : ind.rsi > 70 ? '#ff3d6b' : '#8098b8' },
              { label: 'MACD', value: ind.macd.histogram > 0 ? '▲' : '▼', color: ind.macd.histogram > 0 ? '#00e676' : '#ff3d6b' },
              { label: 'Trend', value: ind.trend, color: ind.trend === 'UP' ? '#00e676' : ind.trend === 'DOWN' ? '#ff3d6b' : '#8098b8' },
              { label: 'EMA', value: ind.ema.alignment, color: ind.ema.alignment === 'BULLISH' ? '#00e676' : ind.ema.alignment === 'BEARISH' ? '#ff3d6b' : '#ffd600' },
              { label: 'Momentum', value: `${ind.momentum > 0 ? '+' : ''}${ind.momentum.toFixed(2)}%`, color: ind.momentum > 0 ? '#00e676' : '#ff3d6b' },
              { label: 'Volatility', value: `${ind.volatility.toFixed(3)}`, color: '#8098b8' },
            ].map(item => (
              <div key={item.label} style={{
                background: '#0f1520', border: '1px solid #1e2d45', borderRadius: 6,
                padding: '6px 8px', textAlign: 'center'
              }}>
                <p style={{ margin: 0, fontSize: 9, color: '#3d5270', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{item.label}</p>
                <p style={{ margin: '2px 0 0', fontSize: 11, fontWeight: 700, color: item.color }}>{item.value}</p>
              </div>
            ))}
          </div>

          {/* Reasoning */}
          {signal?.reasoning && signal.reasoning.length > 0 && (
            <div style={{ marginTop: 10 }}>
              <p style={{ margin: '0 0 6px', fontSize: 10, fontWeight: 600, color: '#3d5270', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                AI Reasoning
              </p>
              {signal.reasoning.slice(0, 4).map((r, i) => (
                <p key={i} style={{
                  margin: '0 0 3px', fontSize: 11, color: '#8098b8',
                  paddingLeft: 10, borderLeft: '2px solid #1e2d45',
                }}>
                  {r}
                </p>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Manual trade controls */}
      <div style={{
        padding: '10px 16px', background: '#0a0d14',
        borderTop: '1px solid #1e2d45',
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1 }}>
          <span style={{ fontSize: 11, color: '#8098b8', whiteSpace: 'nowrap' }}>Stake $</span>
          <input
            type="number"
            value={manualStake}
            onChange={e => setManualStake(e.target.value)}
            min="0.35"
            step="0.5"
            style={{
              width: 70, padding: '5px 8px', background: '#131a27',
              border: '1px solid #2a3f5e', borderRadius: 6,
              color: '#e8f0fe', fontSize: 12, fontFamily: 'JetBrains Mono, monospace',
              outline: 'none',
            }}
          />
        </div>

        <button
          onClick={() => onTrade('CALL', parseFloat(manualStake) || 1)}
          disabled={disabled}
          style={{
            flex: 1, padding: '7px 0', borderRadius: 7,
            background: disabled ? '#1e2d45' : '#00e67622',
            border: `1px solid ${disabled ? '#2a3f5e' : '#00e67644'}`,
            color: disabled ? '#3d5270' : '#00e676',
            fontSize: 12, fontWeight: 700, cursor: disabled ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
          }}
        >
          <TrendingUp size={13} /> RISE
        </button>

        <button
          onClick={() => onTrade('PUT', parseFloat(manualStake) || 1)}
          disabled={disabled}
          style={{
            flex: 1, padding: '7px 0', borderRadius: 7,
            background: disabled ? '#1e2d45' : '#ff3d6b22',
            border: `1px solid ${disabled ? '#2a3f5e' : '#ff3d6b44'}`,
            color: disabled ? '#3d5270' : '#ff3d6b',
            fontSize: 12, fontWeight: 700, cursor: disabled ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
          }}
        >
          <TrendingDown size={13} /> FALL
        </button>
      </div>
    </div>
  );
}
