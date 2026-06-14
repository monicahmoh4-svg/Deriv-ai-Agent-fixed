'use client';
import { useState } from 'react';
import dynamic from 'next/dynamic';
import { LayoutDashboard, TrendingUp, History, Settings, Plus, ListFilter, Cpu } from 'lucide-react';

const Header = dynamic(() => import('@/components/dashboard/Header'), { ssr: false });
const MarketOverview = dynamic(() => import('@/components/dashboard/MarketOverview'), { ssr: false });
const SignalCard = dynamic(() => import('@/components/trading/SignalCard'), { ssr: false });
const AutoTradePanel = dynamic(() => import('@/components/trading/AutoTradePanel'), { ssr: false });
const TradeHistory = dynamic(() => import('@/components/trading/TradeHistory'), { ssr: false });
const PortfolioPanel = dynamic(() => import('@/components/trading/PortfolioPanel'), { ssr: false });
const Notifications = dynamic(() => import('@/components/ui/Notifications'), { ssr: false });
const SymbolSelector = dynamic(() => import('@/components/trading/SymbolSelector'), { ssr: false });
const ConnectAccount = dynamic(() => import('@/components/trading/ConnectAccount'), { ssr: false });

import { useTradingStore } from '@/store/trading-store';
import { useTradingEngine } from '@/hooks/useTradingEngine';

type Tab = 'dashboard' | 'signals' | 'history' | 'settings';

export default function TradingApp() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [showSymbolSelector, setShowSymbolSelector] = useState(false);
  const [showConnect, setShowConnect] = useState(false);

  const { selectedSymbols, symbols, ticks, signals, connectionStatus, openContracts } = useTradingStore();
  const { executeTrade } = useTradingEngine();
  const isConnected = connectionStatus === 'authorized';

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={16} /> },
    { id: 'signals',   label: 'Signals',   icon: <TrendingUp size={16} /> },
    { id: 'history',   label: 'History',   icon: <History size={16} /> },
    { id: 'settings',  label: 'Settings',  icon: <Settings size={16} /> },
  ];

  return (
    <div style={{ minHeight: '100vh', background: '#0a0d14' }}>
      <Header />
      <Notifications />

      {/* Tabs */}
      <div style={{
        borderBottom: '1px solid #1e2d45', padding: '0 20px',
        display: 'flex', alignItems: 'center', gap: 2,
        background: '#0a0d14', position: 'sticky', top: 56, zIndex: 90,
      }}>
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
            display: 'flex', alignItems: 'center', gap: 7,
            padding: '12px 16px', background: 'none', border: 'none',
            borderBottom: `2px solid ${activeTab === tab.id ? '#00c2ff' : 'transparent'}`,
            color: activeTab === tab.id ? '#00c2ff' : '#8098b8',
            fontSize: 13, fontWeight: activeTab === tab.id ? 700 : 500,
            cursor: 'pointer', transition: 'all 0.2s', marginBottom: -1,
          }}>{tab.icon} {tab.label}</button>
        ))}
        {openContracts.length > 0 && (
          <div style={{
            marginLeft: 'auto', padding: '4px 10px', borderRadius: 100,
            background: '#00c2ff22', border: '1px solid #00c2ff44',
            fontSize: 11, fontWeight: 700, color: '#00c2ff',
          }}>{openContracts.length} open</div>
        )}
      </div>

      <main style={{ padding: '20px', maxWidth: 1400, margin: '0 auto' }}>

        {activeTab === 'dashboard' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {!isConnected && (
              <div style={{
                padding: '20px 24px',
                background: 'linear-gradient(135deg, #00c2ff0a, #00507a11)',
                border: '1px solid #00c2ff33', borderRadius: 14,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap',
              }}>
                <div>
                  <p style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#e8f0fe' }}>🤖 Connect Your Deriv Account</p>
                  <p style={{ margin: '4px 0 0', fontSize: 13, color: '#8098b8' }}>
                    Get your API token from app.deriv.com → Settings → API Token, then connect to start live trading.
                  </p>
                </div>
                <button onClick={() => setShowConnect(true)} style={{
                  padding: '11px 24px', borderRadius: 10,
                  background: 'linear-gradient(135deg, #00c2ff, #0070a0)',
                  border: 'none', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap',
                }}>Connect Account →</button>
              </div>
            )}

            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <h2 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#e8f0fe', display: 'flex', alignItems: 'center', gap: 7 }}>
                  <Cpu size={14} color="#00c2ff" /> Live Markets
                </h2>
                <button onClick={() => setShowSymbolSelector(true)} style={{
                  display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 7,
                  background: '#131a27', border: '1px solid #2a3f5e', color: '#8098b8', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                }}><ListFilter size={13} /> Select Markets</button>
              </div>
              <MarketOverview />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 320px', gap: 20 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <h2 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#e8f0fe', display: 'flex', alignItems: 'center', gap: 7 }}>
                  <TrendingUp size={14} color="#00c2ff" /> Active Signals
                </h2>
                {selectedSymbols.slice(0, 4).map(sym => {
                  const symInfo = symbols.find(s => s.symbol === sym);
                  return (
                    <SignalCard key={sym} symbol={sym} displayName={symInfo?.display_name || sym}
                      signal={signals[sym] || null} ticks={ticks[sym] || []} disabled={!isConnected}
                      onTrade={(dir, stake) => executeTrade(sym, dir, stake, signals[sym]?.confidence || 50, 'manual')} />
                  );
                })}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <AutoTradePanel />
                <PortfolioPanel />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'signals' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#e8f0fe' }}>All Signal Analysis</h2>
              <button onClick={() => setShowSymbolSelector(true)} style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8,
                background: '#131a27', border: '1px solid #2a3f5e', color: '#8098b8', fontSize: 12, fontWeight: 600, cursor: 'pointer',
              }}><Plus size={13} /> Add Symbol</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
              {selectedSymbols.map(sym => {
                const symInfo = symbols.find(s => s.symbol === sym);
                return (
                  <SignalCard key={sym} symbol={sym} displayName={symInfo?.display_name || sym}
                    signal={signals[sym] || null} ticks={ticks[sym] || []} disabled={!isConnected}
                    onTrade={(dir, stake) => executeTrade(sym, dir, stake, signals[sym]?.confidence || 50, 'manual')} />
                );
              })}
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#e8f0fe' }}>Trade History</h2>
            <TradeHistory />
          </div>
        )}

        {activeTab === 'settings' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 600 }}>
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#e8f0fe' }}>Settings</h2>
            <div className="card" style={{ padding: 20 }}>
              <h3 style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 700, color: '#e8f0fe' }}>Account Management</h3>
              <ConnectAccount />
            </div>
            <AutoTradePanel />
            <div className="card" style={{ padding: 20 }}>
              <h3 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 700, color: '#e8f0fe' }}>About</h3>
              {[['Version','1.0.0'],['API','Deriv WebSocket v3'],['Analysis','RSI + MACD + Bollinger + EMA + Momentum'],['Execution','Real-time Deriv API']].map(([k,v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #1e2d4533' }}>
                  <span style={{ fontSize: 12, color: '#8098b8' }}>{k}</span>
                  <span style={{ fontSize: 12, color: '#e8f0fe', fontWeight: 500 }}>{v}</span>
                </div>
              ))}
              <p style={{ margin: '14px 0 0', fontSize: 11, color: '#3d5270', lineHeight: 1.6 }}>
                ⚠️ Trading involves significant risk. Only trade with funds you can afford to lose.
              </p>
            </div>
          </div>
        )}
      </main>

      {showSymbolSelector && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' }}
          onClick={e => e.target === e.currentTarget && setShowSymbolSelector(false)}>
          <div style={{ background: '#131a27', border: '1px solid #2a3f5e', borderRadius: 16, padding: 24, maxWidth: 500, width: '92%', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
            <SymbolSelector onClose={() => setShowSymbolSelector(false)} />
          </div>
        </div>
      )}

      {showConnect && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' }}
          onClick={e => e.target === e.currentTarget && setShowConnect(false)}>
          <div style={{ background: '#131a27', border: '1px solid #2a3f5e', borderRadius: 16, padding: 24, maxWidth: 440, width: '92%' }}>
            <ConnectAccount onClose={() => setShowConnect(false)} />
          </div>
        </div>
      )}

      <style>{`@media(max-width:900px){main div[style*="320px"]{grid-template-columns:1fr!important}}`}</style>
    </div>
  );
}
