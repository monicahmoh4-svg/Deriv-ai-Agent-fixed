'use client';
import { useState } from 'react';
import { Bot, AlertTriangle, Settings2, Shield, Zap, TrendingUp, Clock, Layers } from 'lucide-react';
import { useTradingStore } from '@/store/trading-store';

export default function AutoTradePanel() {
  const {
    autonomousMode, setAutonomousMode,
    riskSettings, setRiskSettings,
    connectionStatus, dailyPnl, totalTrades, winRate,
  } = useTradingStore();
  const [showSettings, setShowSettings] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const isConnected = connectionStatus === 'authorized';

  const handleToggle = () => {
    if (!isConnected) return;
    if (!autonomousMode) {
      setShowConfirm(true);
    } else {
      setAutonomousMode(false);
    }
  };

  const confirmEnable = () => {
    setAutonomousMode(true);
    setShowConfirm(false);
  };

  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      {/* Auto mode header */}
      <div style={{ padding: '16px 18px', borderBottom: '1px solid #1e2d45' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 38, height: 38, borderRadius: 10,
              background: autonomousMode ? 'linear-gradient(135deg, #00c2ff22, #00c2ff11)' : 'linear-gradient(135deg, #131a27, #1e2d45)',
              border: `1px solid ${autonomousMode ? '#00c2ff55' : '#2a3f5e'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.3s',
            }}>
              <Bot size={18} color={autonomousMode ? '#00c2ff' : '#3d5270'} />
            </div>
            <div>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#e8f0fe' }}>
                Autonomous Mode
              </p>
              <p style={{ margin: 0, fontSize: 11, color: '#8098b8' }}>
                {autonomousMode ? '🟢 AI is actively trading' : isConnected ? 'AI standby — toggle to activate' : 'Connect account to enable'}
              </p>
            </div>
          </div>

          {/* Toggle */}
          <div
            onClick={handleToggle}
            style={{
              width: 52, height: 28, borderRadius: 100,
              background: autonomousMode ? '#00c2ff' : isConnected ? '#1e2d45' : '#131a27',
              position: 'relative', cursor: isConnected ? 'pointer' : 'not-allowed',
              transition: 'background 0.3s',
              border: `1px solid ${autonomousMode ? '#00c2ff' : '#2a3f5e'}`,
            }}
          >
            <div style={{
              position: 'absolute', top: 3, left: autonomousMode ? 27 : 3,
              width: 20, height: 20, borderRadius: '50%',
              background: 'white', transition: 'left 0.3s',
              boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
            }} />
          </div>
        </div>

        {/* Warning when active */}
        {autonomousMode && (
          <div style={{
            marginTop: 12, padding: '8px 12px', borderRadius: 8,
            background: '#ffd60011', border: '1px solid #ffd60033',
            display: 'flex', alignItems: 'flex-start', gap: 8,
          }}>
            <AlertTriangle size={14} color="#ffd600" style={{ flexShrink: 0, marginTop: 1 }} />
            <p style={{ margin: 0, fontSize: 11, color: '#ffd600', lineHeight: 1.5 }}>
              AI is executing real trades automatically. Monitor closely and disable if needed.
            </p>
          </div>
        )}
      </div>

      {/* Stats row */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
        borderBottom: '1px solid #1e2d45',
      }}>
        {[
          { label: 'Daily P&L', value: `${dailyPnl >= 0 ? '+' : ''}$${dailyPnl.toFixed(2)}`, color: dailyPnl >= 0 ? '#00e676' : '#ff3d6b' },
          { label: 'Total Trades', value: totalTrades.toString(), color: '#e8f0fe' },
          { label: 'Win Rate', value: `${winRate}%`, color: winRate >= 55 ? '#00e676' : winRate >= 45 ? '#ffd600' : '#ff3d6b' },
        ].map((s, i) => (
          <div key={i} style={{
            padding: '12px 16px', textAlign: 'center',
            borderRight: i < 2 ? '1px solid #1e2d45' : 'none',
          }}>
            <p style={{ margin: 0, fontSize: 16, fontWeight: 800, color: s.color, fontFamily: 'JetBrains Mono, monospace' }}>{s.value}</p>
            <p style={{ margin: 0, fontSize: 10, color: '#3d5270', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 2 }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Risk settings toggle */}
      <button
        onClick={() => setShowSettings(!showSettings)}
        style={{
          width: '100%', padding: '12px 18px', background: 'none', border: 'none',
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          color: '#8098b8',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Settings2 size={14} />
          <span style={{ fontSize: 12, fontWeight: 600 }}>Risk & Trade Settings</span>
        </div>
        <span style={{ fontSize: 11, color: '#3d5270' }}>{showSettings ? '▲' : '▼'}</span>
      </button>

      {/* Settings panel */}
      {showSettings && (
        <div style={{ padding: '0 18px 18px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Min confidence */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Zap size={12} color="#00c2ff" />
                <label style={{ fontSize: 12, fontWeight: 600, color: '#8098b8' }}>Min Confidence</label>
              </div>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#00c2ff', fontFamily: 'JetBrains Mono, monospace' }}>
                {riskSettings.minConfidence}%
              </span>
            </div>
            <input
              type="range" min="50" max="95" step="5"
              value={riskSettings.minConfidence}
              onChange={e => setRiskSettings({ minConfidence: parseInt(e.target.value) })}
              style={{ width: '100%', accentColor: '#00c2ff' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 2 }}>
              <span style={{ fontSize: 10, color: '#3d5270' }}>50% (aggressive)</span>
              <span style={{ fontSize: 10, color: '#3d5270' }}>95% (conservative)</span>
            </div>
          </div>

          {/* Stake */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <TrendingUp size={12} color="#00e676" />
                <label style={{ fontSize: 12, fontWeight: 600, color: '#8098b8' }}>Stake Amount</label>
              </div>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#00e676', fontFamily: 'JetBrains Mono, monospace' }}>
                ${riskSettings.stakeAmount.toFixed(2)}
              </span>
            </div>
            <input
              type="number" min="0.35" max="100" step="0.5"
              value={riskSettings.stakeAmount}
              onChange={e => setRiskSettings({ stakeAmount: parseFloat(e.target.value) || 1 })}
              style={{
                width: '100%', padding: '8px 12px',
                background: '#131a27', border: '1px solid #2a3f5e',
                borderRadius: 7, color: '#e8f0fe', fontSize: 13,
                fontFamily: 'JetBrains Mono, monospace', outline: 'none',
              }}
            />
          </div>

          {/* Max daily loss */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Shield size={12} color="#ff3d6b" />
                <label style={{ fontSize: 12, fontWeight: 600, color: '#8098b8' }}>Max Daily Loss</label>
              </div>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#ff3d6b', fontFamily: 'JetBrains Mono, monospace' }}>
                ${riskSettings.maxDailyLoss}
              </span>
            </div>
            <input
              type="number" min="5" max="500" step="5"
              value={riskSettings.maxDailyLoss}
              onChange={e => setRiskSettings({ maxDailyLoss: parseInt(e.target.value) || 20 })}
              style={{
                width: '100%', padding: '8px 12px',
                background: '#131a27', border: '1px solid #2a3f5e',
                borderRadius: 7, color: '#e8f0fe', fontSize: 13,
                fontFamily: 'JetBrains Mono, monospace', outline: 'none',
              }}
            />
          </div>

          {/* Cooldown */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Clock size={12} color="#ffd600" />
                <label style={{ fontSize: 12, fontWeight: 600, color: '#8098b8' }}>Trade Cooldown</label>
              </div>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#ffd600', fontFamily: 'JetBrains Mono, monospace' }}>
                {riskSettings.cooldownSeconds}s
              </span>
            </div>
            <input
              type="range" min="10" max="300" step="10"
              value={riskSettings.cooldownSeconds}
              onChange={e => setRiskSettings({ cooldownSeconds: parseInt(e.target.value) })}
              style={{ width: '100%', accentColor: '#ffd600' }}
            />
          </div>

          {/* Max concurrent */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Layers size={12} color="#8098b8" />
                <label style={{ fontSize: 12, fontWeight: 600, color: '#8098b8' }}>Max Concurrent Trades</label>
              </div>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#8098b8', fontFamily: 'JetBrains Mono, monospace' }}>
                {riskSettings.maxConcurrentTrades}
              </span>
            </div>
            <input
              type="range" min="1" max="10" step="1"
              value={riskSettings.maxConcurrentTrades}
              onChange={e => setRiskSettings({ maxConcurrentTrades: parseInt(e.target.value) })}
              style={{ width: '100%', accentColor: '#8098b8' }}
            />
          </div>
        </div>
      )}

      {/* Confirm modal */}
      {showConfirm && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000, backdropFilter: 'blur(4px)',
        }}>
          <div style={{
            background: '#131a27', border: '1px solid #ff3d6b44',
            borderRadius: 14, padding: 24, maxWidth: 380, width: '90%',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <AlertTriangle size={20} color="#ff3d6b" />
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#e8f0fe' }}>Enable Autonomous Trading?</h3>
            </div>
            <p style={{ margin: '0 0 20px', fontSize: 13, color: '#8098b8', lineHeight: 1.6 }}>
              The AI will execute <strong style={{ color: '#e8f0fe' }}>real trades</strong> on your Deriv account automatically when market conditions meet your confidence threshold of <strong style={{ color: '#00c2ff' }}>{riskSettings.minConfidence}%</strong> with stakes of <strong style={{ color: '#00e676' }}>${riskSettings.stakeAmount}</strong> per trade.
            </p>
            <p style={{ margin: '0 0 20px', fontSize: 12, color: '#ff3d6b', lineHeight: 1.5 }}>
              ⚠️ Trading involves risk. You may lose money. Only trade with funds you can afford to lose.
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setShowConfirm(false)} style={{
                flex: 1, padding: 10, borderRadius: 8, border: '1px solid #2a3f5e',
                background: 'none', color: '#8098b8', fontSize: 13, fontWeight: 600, cursor: 'pointer',
              }}>
                Cancel
              </button>
              <button onClick={confirmEnable} style={{
                flex: 1, padding: 10, borderRadius: 8, border: 'none',
                background: 'linear-gradient(135deg, #00c2ff, #0070a0)',
                color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer',
              }}>
                Enable AI Trading
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
