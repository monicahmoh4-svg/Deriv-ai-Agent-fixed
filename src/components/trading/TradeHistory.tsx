'use client';
import { TrendingUp, TrendingDown, Clock, CheckCircle2, XCircle, Loader2, Bot, User } from 'lucide-react';
import { useTradingStore } from '@/store/trading-store';
import type { TradeRecord } from '@/store/trading-store';

function StatusBadge({ status }: { status: TradeRecord['status'] }) {
  const config = {
    won:     { icon: <CheckCircle2 size={11} />, label: 'WON',     color: '#00e676', bg: '#00e67611' },
    lost:    { icon: <XCircle size={11} />,      label: 'LOST',    color: '#ff3d6b', bg: '#ff3d6b11' },
    open:    { icon: <Loader2 size={11} style={{ animation: 'spin 1s linear infinite' }} />, label: 'OPEN', color: '#00c2ff', bg: '#00c2ff11' },
    pending: { icon: <Clock size={11} />,        label: 'PENDING', color: '#ffd600', bg: '#ffd60011' },
    sold:    { icon: <CheckCircle2 size={11} />, label: 'SOLD',    color: '#8098b8', bg: '#8098b811' },
  }[status];

  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '2px 8px', borderRadius: 100, fontSize: 10, fontWeight: 700,
      color: config.color, background: config.bg,
      border: `1px solid ${config.color}33`,
    }}>
      {config.icon} {config.label}
    </span>
  );
}

export default function TradeHistory() {
  const { tradeHistory } = useTradingStore();

  if (tradeHistory.length === 0) {
    return (
      <div className="card" style={{ padding: 32, textAlign: 'center' }}>
        <div style={{ marginBottom: 12 }}>
          <Clock size={32} color="#3d5270" />
        </div>
        <p style={{ margin: 0, fontSize: 14, color: '#3d5270' }}>No trades yet</p>
        <p style={{ margin: '6px 0 0', fontSize: 12, color: '#3d5270' }}>
          Connect your account and start trading
        </p>
      </div>
    );
  }

  const wins = tradeHistory.filter(t => t.status === 'won').length;
  const losses = tradeHistory.filter(t => t.status === 'lost').length;
  const totalPnl = tradeHistory.reduce((a, t) => a + (t.profit || 0), 0);

  return (
    <div className="card" style={{ overflow: 'hidden' }}>
      {/* Summary bar */}
      <div style={{
        padding: '12px 16px', borderBottom: '1px solid #1e2d45',
        display: 'flex', gap: 20, alignItems: 'center', flexWrap: 'wrap',
      }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: '#e8f0fe' }}>Trade History</span>
        <div style={{ display: 'flex', gap: 14, marginLeft: 'auto', flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12, color: '#00e676' }}>✓ {wins} won</span>
          <span style={{ fontSize: 12, color: '#ff3d6b' }}>✗ {losses} lost</span>
          <span style={{ fontSize: 12, fontWeight: 700, color: totalPnl >= 0 ? '#00e676' : '#ff3d6b', fontFamily: 'JetBrains Mono, monospace' }}>
            {totalPnl >= 0 ? '+' : ''}${totalPnl.toFixed(2)}
          </span>
        </div>
      </div>

      {/* Table */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #1e2d45' }}>
              {['Time', 'Symbol', 'Direction', 'Stake', 'P&L', 'Conf', 'Status', 'Source'].map(h => (
                <th key={h} style={{
                  padding: '8px 12px', textAlign: 'left',
                  color: '#3d5270', fontWeight: 600, fontSize: 10,
                  textTransform: 'uppercase', letterSpacing: '0.06em',
                  whiteSpace: 'nowrap',
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tradeHistory.map((trade, i) => {
              const pnl = trade.profit;
              const time = new Date(trade.timestamp);
              return (
                <tr key={trade.id} style={{
                  borderBottom: i < tradeHistory.length - 1 ? '1px solid #1e2d4522' : 'none',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = '#131a27')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <td style={{ padding: '9px 12px', color: '#8098b8', fontFamily: 'JetBrains Mono, monospace', whiteSpace: 'nowrap' }}>
                    {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </td>
                  <td style={{ padding: '9px 12px', color: '#e8f0fe', fontWeight: 500 }}>{trade.symbol}</td>
                  <td style={{ padding: '9px 12px' }}>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: 3,
                      color: trade.direction === 'CALL' ? '#00e676' : '#ff3d6b',
                      fontWeight: 700, fontSize: 11,
                    }}>
                      {trade.direction === 'CALL' ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                      {trade.direction === 'CALL' ? 'RISE' : 'FALL'}
                    </span>
                  </td>
                  <td style={{ padding: '9px 12px', color: '#8098b8', fontFamily: 'JetBrains Mono, monospace' }}>
                    ${trade.stake.toFixed(2)}
                  </td>
                  <td style={{ padding: '9px 12px', fontFamily: 'JetBrains Mono, monospace', fontWeight: 700 }}>
                    {pnl !== undefined ? (
                      <span style={{ color: pnl >= 0 ? '#00e676' : '#ff3d6b' }}>
                        {pnl >= 0 ? '+' : ''}${pnl.toFixed(2)}
                      </span>
                    ) : <span style={{ color: '#3d5270' }}>—</span>}
                  </td>
                  <td style={{ padding: '9px 12px', color: '#8098b8', fontFamily: 'JetBrains Mono, monospace' }}>
                    {trade.confidence}%
                  </td>
                  <td style={{ padding: '9px 12px' }}><StatusBadge status={trade.status} /></td>
                  <td style={{ padding: '9px 12px' }}>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: 3,
                      fontSize: 10, color: trade.source === 'auto' ? '#00c2ff' : '#8098b8',
                    }}>
                      {trade.source === 'auto' ? <><Bot size={10} /> AUTO</> : <><User size={10} /> MANUAL</>}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <style>{`@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>
    </div>
  );
}
