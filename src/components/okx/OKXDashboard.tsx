'use client';
import { useState } from 'react';
import {
  TrendingUp, TrendingDown, Zap, Bot, AlertTriangle,
  BarChart2, DollarSign, Activity, Settings2, Clock,
  Layers, Shield, ChevronDown, ChevronUp
} from 'lucide-react';
import { useOKXStore } from '@/store/okx-store';
import { useOKXEngine } from '@/hooks/useOKXEngine';
import Sparkline from '@/components/charts/Sparkline';

export default function OKXDashboard() {
  const {
    status, balances, totalEquityUSD, positions,
    tickers, signals, openOrders, tradeHistory,
    autonomousMode, setAutonomousMode, riskSettings, setRiskSettings,
    dailyPnlUSD, winRate, totalTrades,
  } = useOKXStore();
  const { executeTrade } = useOKXEngine();

  const [showSettings, setShowSettings] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [manualSizes, setManualSizes] = useState<Record<string, string>>({});

  const isConnected = status === 'connected';
  const usdtBalance = balances.find(b => b.ccy === 'USDT');

  const handleAutoToggle = () => {
    if (!isConnected) return;
    if (!autonomousMode) setShowConfirm(true);
    else setAutonomousMode(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* ── Account Overview ─────────────────────────────────────────────── */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '14px 18px', borderBottom: '1px solid #1e2d45', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 28, height: 28, borderRadius: 7, background: 'linear-gradient(135deg,#00c2ff33,#00c2ff11)', border: '1px solid #00c2ff44', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 900, color: '#00c2ff' }}>O</div>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#e8f0fe' }}>OKX Account</span>
            <span style={{ padding: '2px 8px', borderRadius: 100, fontSize: 10, fontWeight: 700, background: isConnected ? '#00e67622' : '#ff3d6b22', color: isConnected ? '#00e676' : '#ff3d6b', border: `1px solid ${isConnected ? '#00e67644' : '#ff3d6b44'}` }}>
              {isConnected ? '● LIVE' : '○ OFFLINE'}
            </span>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#e8f0fe', fontFamily: 'JetBrains Mono, monospace' }}>
              ${totalEquityUSD.toFixed(2)}
            </p>
            <p style={{ margin: 0, fontSize: 11, color: '#8098b8' }}>Total Equity USD</p>
          </div>
        </div>

        {/* Stats row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', borderBottom: '1px solid #1e2d45' }}>
          {[
            { label: 'USDT Avail', value: usdtBalance ? `$${parseFloat(usdtBalance.availBal).toFixed(2)}` : '—', color: '#e8f0fe' },
            { label: 'Daily P&L', value: `${dailyPnlUSD >= 0 ? '+' : ''}$${dailyPnlUSD.toFixed(2)}`, color: dailyPnlUSD >= 0 ? '#00e676' : '#ff3d6b' },
            { label: 'Win Rate', value: `${winRate}%`, color: winRate >= 55 ? '#00e676' : winRate >= 45 ? '#ffd600' : '#ff3d6b' },
            { label: 'Trades', value: totalTrades.toString(), color: '#8098b8' },
          ].map((s, i) => (
            <div key={i} style={{ padding: '10px 14px', textAlign: 'center', borderRight: i < 3 ? '1px solid #1e2d45' : 'none' }}>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: s.color, fontFamily: 'JetBrains Mono, monospace' }}>{s.value}</p>
              <p style={{ margin: 0, fontSize: 9, color: '#3d5270', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 2 }}>{s.label}</p>
            </div>
          ))}
        </div>

        {/* Balances */}
        {balances.filter(b => parseFloat(b.availBal) > 0).slice(0, 4).map(b => (
          <div key={b.ccy} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 18px', borderBottom: '1px solid #1e2d4522' }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#e8f0fe' }}>{b.ccy}</span>
            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: 12, color: '#e8f0fe', fontFamily: 'JetBrains Mono, monospace' }}>{parseFloat(b.availBal).toFixed(4)}</span>
              <span style={{ fontSize: 11, color: '#8098b8', marginLeft: 8 }}>${parseFloat(b.eqUsd).toFixed(2)}</span>
            </div>
          </div>
        ))}
      </div>

      {/* ── Auto Trading Panel ───────────────────────────────────────────── */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '14px 18px', borderBottom: '1px solid #1e2d45', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 9, background: autonomousMode ? '#00c2ff22' : '#1e2d45', border: `1px solid ${autonomousMode ? '#00c2ff55' : '#2a3f5e'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.3s' }}>
              <Bot size={17} color={autonomousMode ? '#00c2ff' : '#3d5270'} />
            </div>
            <div>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#e8f0fe' }}>OKX Autonomous Mode</p>
              <p style={{ margin: 0, fontSize: 11, color: '#8098b8' }}>{autonomousMode ? '🟢 AI executing live OKX trades' : 'Toggle to enable AI trading'}</p>
            </div>
          </div>
          <div onClick={handleAutoToggle} style={{ width: 50, height: 27, borderRadius: 100, background: autonomousMode ? '#00c2ff' : '#1e2d45', border: `1px solid ${autonomousMode ? '#00c2ff' : '#2a3f5e'}`, position: 'relative', cursor: isConnected ? 'pointer' : 'not-allowed', transition: 'all 0.3s' }}>
            <div style={{ position: 'absolute', top: 3, left: autonomousMode ? 25 : 3, width: 21, height: 21, borderRadius: '50%', background: 'white', transition: 'left 0.3s', boxShadow: '0 1px 4px rgba(0,0,0,0.3)' }} />
          </div>
        </div>

        {autonomousMode && (
          <div style={{ padding: '10px 18px', background: '#ffd60008', borderBottom: '1px solid #ffd60022', display: 'flex', gap: 8 }}>
            <AlertTriangle size={14} color="#ffd600" style={{ flexShrink: 0, marginTop: 1 }} />
            <p style={{ margin: 0, fontSize: 11, color: '#ffd600', lineHeight: 1.5 }}>AI is placing real OKX orders automatically. Monitor closely.</p>
          </div>
        )}

        {/* Settings toggle */}
        <button onClick={() => setShowSettings(!showSettings)} style={{ width: '100%', padding: '11px 18px', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#8098b8' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}><Settings2 size={13} /><span style={{ fontSize: 12, fontWeight: 600 }}>Risk & Trade Settings</span></div>
          {showSettings ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>

        {showSettings && (
          <div style={{ padding: '0 18px 18px', display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Min confidence */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#8098b8', display: 'flex', alignItems: 'center', gap: 5 }}><Zap size={11} color="#00c2ff" /> Min Confidence</label>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#00c2ff', fontFamily: 'JetBrains Mono, monospace' }}>{riskSettings.minConfidence}%</span>
              </div>
              <input type="range" min="50" max="95" step="5" value={riskSettings.minConfidence} onChange={e => setRiskSettings({ minConfidence: parseInt(e.target.value) })} style={{ width: '100%', accentColor: '#00c2ff' }} />
            </div>

            {/* Order size */}
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#8098b8', display: 'flex', alignItems: 'center', gap: 5, marginBottom: 5 }}><DollarSign size={11} color="#00e676" /> Order Size (USD)</label>
              <input type="number" min="1" max="10000" step="1" value={riskSettings.orderSizeUSD} onChange={e => setRiskSettings({ orderSizeUSD: parseFloat(e.target.value) || 10 })} style={{ width: '100%', padding: '8px 12px', background: '#131a27', border: '1px solid #2a3f5e', borderRadius: 7, color: '#e8f0fe', fontSize: 13, fontFamily: 'JetBrains Mono, monospace', outline: 'none' }} />
            </div>

            {/* Max daily loss */}
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#8098b8', display: 'flex', alignItems: 'center', gap: 5, marginBottom: 5 }}><Shield size={11} color="#ff3d6b" /> Max Daily Loss (USD)</label>
              <input type="number" min="5" max="10000" step="5" value={riskSettings.maxDailyLossUSD} onChange={e => setRiskSettings({ maxDailyLossUSD: parseFloat(e.target.value) || 50 })} style={{ width: '100%', padding: '8px 12px', background: '#131a27', border: '1px solid #2a3f5e', borderRadius: 7, color: '#e8f0fe', fontSize: 13, fontFamily: 'JetBrains Mono, monospace', outline: 'none' }} />
            </div>

            {/* Cooldown */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#8098b8', display: 'flex', alignItems: 'center', gap: 5 }}><Clock size={11} color="#ffd600" /> Cooldown per pair</label>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#ffd600', fontFamily: 'JetBrains Mono, monospace' }}>{riskSettings.cooldownSeconds}s</span>
              </div>
              <input type="range" min="10" max="600" step="10" value={riskSettings.cooldownSeconds} onChange={e => setRiskSettings({ cooldownSeconds: parseInt(e.target.value) })} style={{ width: '100%', accentColor: '#ffd600' }} />
            </div>

            {/* Market type */}
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#8098b8', display: 'block', marginBottom: 5 }}>Market Type</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {(['SPOT', 'SWAP'] as const).map(t => (
                  <button key={t} onClick={() => setRiskSettings({ instType: t })} style={{ flex: 1, padding: '7px', borderRadius: 7, border: `1px solid ${riskSettings.instType === t ? '#00c2ff' : '#2a3f5e'}`, background: riskSettings.instType === t ? '#00c2ff22' : 'transparent', color: riskSettings.instType === t ? '#00c2ff' : '#8098b8', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                    {t === 'SPOT' ? '💰 Spot' : '📈 Perpetual'}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Market Signals ───────────────────────────────────────────────── */}
      <div className="card" style={{ overflow: 'hidden' }}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid #1e2d45', display: 'flex', alignItems: 'center', gap: 7 }}>
          <Activity size={14} color="#00c2ff" />
          <span style={{ fontSize: 14, fontWeight: 700, color: '#e8f0fe' }}>OKX Market Signals</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {riskSettings.tradingPairs.map((instId, i) => {
            const ticker = tickers[instId];
            const signal = signals[instId];
            const price = ticker ? parseFloat(ticker.last) : 0;
            const change24h = ticker ? ((parseFloat(ticker.last) - parseFloat(ticker.open24h)) / parseFloat(ticker.open24h)) * 100 : 0;
            const dir = signal?.direction ?? 'NEUTRAL';
            const conf = signal?.confidence ?? 0;
            const manualSz = manualSizes[instId] || '';

            return (
              <div key={instId} style={{ padding: '12px 16px', borderBottom: i < riskSettings.tradingPairs.length - 1 ? '1px solid #1e2d4522' : 'none' }}>
                {/* Row 1: symbol + price + signal */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: '#1e2d45', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <BarChart2 size={14} color="#00c2ff" />
                    </div>
                    <div>
                      <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#e8f0fe' }}>{instId}</p>
                      <p style={{ margin: 0, fontSize: 10, color: change24h >= 0 ? '#00e676' : '#ff3d6b' }}>
                        {change24h >= 0 ? '+' : ''}{change24h.toFixed(2)}% 24h
                      </p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {signal && dir !== 'NEUTRAL' && (
                      <span style={{ padding: '3px 10px', borderRadius: 100, fontSize: 10, fontWeight: 800, background: dir === 'CALL' ? '#00e67611' : '#ff3d6b11', color: dir === 'CALL' ? '#00e676' : '#ff3d6b', border: `1px solid ${dir === 'CALL' ? '#00e67644' : '#ff3d6b44'}` }}>
                        {dir === 'CALL' ? '▲ BUY' : '▼ SELL'}
                      </span>
                    )}
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#e8f0fe', fontFamily: 'JetBrains Mono, monospace' }}>
                        ${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: price > 100 ? 2 : 6 })}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Confidence bar */}
                {signal && (
                  <div style={{ marginBottom: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                      <span style={{ fontSize: 10, color: '#3d5270' }}>AI Confidence</span>
                      <span style={{ fontSize: 10, fontWeight: 700, color: conf >= 70 ? '#00e676' : conf >= 55 ? '#ffd600' : '#ff3d6b' }}>{conf}%</span>
                    </div>
                    <div style={{ height: 4, background: '#1e2d45', borderRadius: 100 }}>
                      <div style={{ height: '100%', borderRadius: 100, width: `${conf}%`, background: conf >= 70 ? '#00e676' : conf >= 55 ? '#ffd600' : '#ff3d6b', transition: 'width 0.5s ease' }} />
                    </div>
                  </div>
                )}

                {/* Manual trade controls */}
                <div style={{ display: 'flex', gap: 7, alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <span style={{ fontSize: 10, color: '#8098b8' }}>Qty</span>
                    <input
                      type="number" step="any" placeholder="0.001"
                      value={manualSz}
                      onChange={e => setManualSizes(s => ({ ...s, [instId]: e.target.value }))}
                      style={{ width: 80, padding: '5px 7px', background: '#131a27', border: '1px solid #2a3f5e', borderRadius: 6, color: '#e8f0fe', fontSize: 11, fontFamily: 'JetBrains Mono, monospace', outline: 'none' }}
                    />
                  </div>
                  <button
                    disabled={!isConnected || !manualSz}
                    onClick={() => executeTrade(instId, 'buy', manualSz, signal?.confidence || 50, 'manual')}
                    style={{ flex: 1, padding: '6px 0', borderRadius: 6, background: !isConnected || !manualSz ? '#1e2d45' : '#00e67622', border: `1px solid ${!isConnected || !manualSz ? '#2a3f5e' : '#00e67644'}`, color: !isConnected || !manualSz ? '#3d5270' : '#00e676', fontSize: 11, fontWeight: 700, cursor: !isConnected || !manualSz ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3 }}
                  >
                    <TrendingUp size={11} /> BUY
                  </button>
                  <button
                    disabled={!isConnected || !manualSz}
                    onClick={() => executeTrade(instId, 'sell', manualSz, signal?.confidence || 50, 'manual')}
                    style={{ flex: 1, padding: '6px 0', borderRadius: 6, background: !isConnected || !manualSz ? '#1e2d45' : '#ff3d6b22', border: `1px solid ${!isConnected || !manualSz ? '#2a3f5e' : '#ff3d6b44'}`, color: !isConnected || !manualSz ? '#3d5270' : '#ff3d6b', fontSize: 11, fontWeight: 700, cursor: !isConnected || !manualSz ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3 }}
                  >
                    <TrendingDown size={11} /> SELL
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Open Orders ──────────────────────────────────────────────────── */}
      {openOrders.length > 0 && (
        <div className="card" style={{ overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid #1e2d45', display: 'flex', alignItems: 'center', gap: 7 }}>
            <Layers size={14} color="#00c2ff" />
            <span style={{ fontSize: 13, fontWeight: 700, color: '#e8f0fe' }}>Open Orders</span>
            <span style={{ marginLeft: 'auto', padding: '2px 8px', borderRadius: 100, background: '#00c2ff22', border: '1px solid #00c2ff44', fontSize: 10, fontWeight: 700, color: '#00c2ff' }}>{openOrders.length}</span>
          </div>
          {openOrders.slice(0, 5).map((o, i) => (
            <div key={o.ordId} style={{ padding: '10px 16px', borderBottom: i < openOrders.length - 1 ? '1px solid #1e2d4522' : 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: '#e8f0fe' }}>{o.instId}</p>
                <p style={{ margin: 0, fontSize: 10, color: o.side === 'buy' ? '#00e676' : '#ff3d6b' }}>{o.side.toUpperCase()} {o.sz}</p>
              </div>
              <span style={{ fontSize: 11, color: '#ffd600' }}>LIVE</span>
            </div>
          ))}
        </div>
      )}

      {/* ── Trade History ─────────────────────────────────────────────────── */}
      {tradeHistory.length > 0 && (
        <div className="card" style={{ overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid #1e2d45' }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#e8f0fe' }}>OKX Trade History</span>
          </div>
          {tradeHistory.slice(0, 8).map((t, i) => (
            <div key={t.id} style={{ padding: '8px 16px', borderBottom: i < Math.min(tradeHistory.length, 8) - 1 ? '1px solid #1e2d4522' : 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ color: t.side === 'buy' ? '#00e676' : '#ff3d6b', fontWeight: 700 }}>{t.side === 'buy' ? '▲' : '▼'} {t.instId}</span>
                <span style={{ color: '#8098b8', fontSize: 10 }}>{t.size}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {t.pnl !== undefined && (
                  <span style={{ color: t.pnl >= 0 ? '#00e676' : '#ff3d6b', fontFamily: 'JetBrains Mono, monospace', fontWeight: 700 }}>
                    {t.pnl >= 0 ? '+' : ''}${t.pnl.toFixed(2)}
                  </span>
                )}
                <span style={{ padding: '2px 7px', borderRadius: 100, fontSize: 9, fontWeight: 700, background: t.status === 'filled' ? '#00e67611' : t.status === 'failed' ? '#ff3d6b11' : '#ffd60011', color: t.status === 'filled' ? '#00e676' : t.status === 'failed' ? '#ff3d6b' : '#ffd600' }}>
                  {t.status.toUpperCase()}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Confirm Modal ─────────────────────────────────────────────────── */}
      {showConfirm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' }}>
          <div style={{ background: '#131a27', border: '1px solid #ff3d6b44', borderRadius: 14, padding: 24, maxWidth: 380, width: '90%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <AlertTriangle size={20} color="#ff3d6b" />
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#e8f0fe' }}>Enable OKX Auto-Trading?</h3>
            </div>
            <p style={{ margin: '0 0 8px', fontSize: 13, color: '#8098b8', lineHeight: 1.6 }}>
              AI will place <strong style={{ color: '#e8f0fe' }}>real OKX orders</strong> automatically with <strong style={{ color: '#00c2ff' }}>${riskSettings.orderSizeUSD}</strong> per trade when confidence ≥ <strong style={{ color: '#00c2ff' }}>{riskSettings.minConfidence}%</strong>.
            </p>
            <p style={{ margin: '0 0 20px', fontSize: 12, color: '#ff3d6b' }}>⚠️ Real crypto will be bought/sold. Only use funds you can afford to lose.</p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setShowConfirm(false)} style={{ flex: 1, padding: 10, borderRadius: 8, border: '1px solid #2a3f5e', background: 'none', color: '#8098b8', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
              <button onClick={() => { setAutonomousMode(true); setShowConfirm(false); }} style={{ flex: 1, padding: 10, borderRadius: 8, border: 'none', background: 'linear-gradient(135deg,#00c2ff,#0070a0)', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Enable AI Trading</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
