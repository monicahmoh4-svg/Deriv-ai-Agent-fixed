'use client';
import { Layers, Clock, TrendingUp, TrendingDown } from 'lucide-react';
import { useTradingStore } from '@/store/trading-store';

export default function PortfolioPanel() {
  const { openContracts } = useTradingStore();

  if (openContracts.length === 0) {
    return (
      <div className="card" style={{ padding: '20px 16px', textAlign: 'center' }}>
        <Layers size={24} color="#3d5270" style={{ marginBottom: 8 }} />
        <p style={{ margin: 0, fontSize: 13, color: '#3d5270' }}>No open contracts</p>
      </div>
    );
  }

  return (
    <div className="card" style={{ overflow: 'hidden' }}>
      <div style={{ padding: '12px 16px', borderBottom: '1px solid #1e2d45', display: 'flex', alignItems: 'center', gap: 8 }}>
        <Layers size={14} color="#00c2ff" />
        <span style={{ fontSize: 13, fontWeight: 700, color: '#e8f0fe' }}>Open Contracts</span>
        <span style={{
          marginLeft: 'auto', padding: '2px 8px', borderRadius: 100,
          background: '#00c2ff22', border: '1px solid #00c2ff44',
          fontSize: 11, fontWeight: 700, color: '#00c2ff',
        }}>{openContracts.length}</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
        {openContracts.map((c, i) => {
          const expiry = new Date(c.expiry_time * 1000);
          const now = Date.now();
          const secsLeft = Math.max(0, Math.round((c.expiry_time * 1000 - now) / 1000));
          const isCall = c.contract_type.includes('CALL');

          return (
            <div key={c.contract_id} style={{
              padding: '12px 16px',
              borderBottom: i < openContracts.length - 1 ? '1px solid #1e2d4522' : 'none',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{
                  width: 28, height: 28, borderRadius: 6,
                  background: isCall ? '#00e67611' : '#ff3d6b11',
                  border: `1px solid ${isCall ? '#00e67644' : '#ff3d6b44'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {isCall ? <TrendingUp size={14} color="#00e676" /> : <TrendingDown size={14} color="#ff3d6b" />}
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: '#e8f0fe' }}>{c.symbol}</p>
                  <p style={{ margin: 0, fontSize: 10, color: '#8098b8' }}>{c.contract_type}</p>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: '#e8f0fe', fontFamily: 'JetBrains Mono, monospace' }}>
                  ${c.buy_price?.toFixed(2)}
                </p>
                <p style={{ margin: 0, fontSize: 10, color: '#8098b8', display: 'flex', alignItems: 'center', gap: 3, justifyContent: 'flex-end' }}>
                  <Clock size={9} /> {secsLeft}s
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
