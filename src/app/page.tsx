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
const OKXConnect = dynamic(() => import('@/components/okx/OKXConnect'), { ssr: false });
const OKXDashboard = dynamic(() => import('@/components/okx/OKXDashboard'), { ssr: false });

import { useTradingStore } from '@/store/trading-store';
import { useTradingEngine } from '@/hooks/useTradingEngine';
import { useOKXStore } from '@/store/okx-store';

type Tab = 'dashboard' | 'signals' | 'okx' | 'history' | 'settings';

export default function TradingApp() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [showSymbolSelector, setShowSymbolSelector] = useState(false);
  const [showConnect, setShowConnect] = useState(false);
  const [showOKXConnect, setShowOKXConnect] = useState(false);

  const { selectedSymbols, symbols, ticks, signals, connectionStatus, openContracts } = useTradingStore();
  const { executeTrade } = useTradingEngine();
  const { status: okxStatus, totalEquityUSD } = useOKXStore();

  const isConnected = connectionStatus === 'authorized';
  const okxConnected = okxStatus === 'connected';

  const tabs: { id: Tab; label: string; icon: React.ReactNode; badge?: string }[] = [
    { id: 'dashboard', label: 'Deriv', icon: <LayoutDashboard size={15} /> },
    { id: 'signals',   label: 'Signals', icon: <TrendingUp size={15} /> },
    { id: 'okx',       label: 'OKX', icon: <span style={{ fontSize: 13, fontWeight: 900 }}>O</span>, badge: okxConnected ? 'LIVE' : undefined },
    { id: 'history',   label: 'History', icon: <History size={15} /> },
    { id: 'settings',  label: 'Settings', icon: <Settings size={15} /> },
  ];

  return (
    <div style={{ minHeight: '100vh', background: '#0a0d14' }}>
      <Header />
      <Notifications />

      {/* Tabs */}
      <div style={{ borderBottom: '1px solid #1e2d45', padding: '0 20px', display: 'flex', alignItems: 'center', gap: 2, background: '#0a0d14', position: 'sticky', top: 56, zIndex: 90 }}>
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '11px 14px', background: 'none', border: 'none',
            borderBottom: `2px solid ${activeTab === tab.id ? '#00c2ff' : 'transparent'}`,
            color: activeTab === tab.id ? '#00c2ff' : '#8098b8',
            fontSize: 13, fontWeight: activeTab === tab.id ? 700 : 500,
            cursor: 'pointer', transition: 'all 0.2s', marginBottom: -1, position: 'relative',
          }}>
            {tab.icon} {tab.label}
            {tab.badge && <span style={{ fontSize: 9, fontWeight: 800, padding: '1px 5px', borderRadius: 100, background: '#00e67622', color: '#00e676', border: '1px solid #00e67644' }}>{tab.badge}</span>}
          </button>
        ))}
        {openContracts.length > 0 && (
          <div style={{ marginLeft: 'auto', padding: '4px 10px', borderRadius: 100, background: '#00c2ff22', border: '1px solid #00c2ff44', fontSize: 11, fontWeight: 700, color: '#00c2ff' }}>
            {openContracts.length} open
          </div>
        )}
      </div>

      <main style={{ padding: '20px', maxWidth: 1400, margin: '0 auto' }}>

        {/* ── DERIV DASHBOARD ─────────────────────────────────────────────── */}
        {activeTab === 'dashboard' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {!isConnected && (
              <div style={{ padding: '20px 24px', background: 'linear-gradient(135deg,#00c2ff0a,#00507a11)', border: '1px solid #00c2ff33', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
                <div>
                  <p style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#e8f0fe' }}>🤖 Connect Your Deriv Account</p>
                  <p style={{ margin: '4px 0 0', fontSize: 13, color: '#8098b8' }}>Login with Deriv or paste your API token to start live trading.</p>
                </div>
                <button onClick={() => setShowConnect(true)} style={{ padding: '11px 24px', borderRadius: 10, background: 'linear-gradient(135deg,#ff444f,#c90000)', border: 'none', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', boxShadow: '0 2px 12px rgba(255,68,79,0.3)' }}>
                  <span style={{ marginRight: 6 }}>D</span> Login with Deriv →
                </button>
              </div>
            )}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <h2 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#e8f0fe', display: 'flex', alignItems: 'center', gap: 7 }}><Cpu size={14} color="#00c2ff" /> Live Markets</h2>
                <button onClick={() => setShowSymbolSelector(true)} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 7, background: '#131a27', border: '1px solid #2a3f5e', color: '#8098b8', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                  <ListFilter size={13} /> Select Markets
                </button>
              </div>
              <MarketOverview />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 320px', gap: 20 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <h2 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#e8f0fe', display: 'flex', alignItems: 'center', gap: 7 }}><TrendingUp size={14} color="#00c2ff" /> Active Signals</h2>
                {selectedSymbols.slice(0, 4).map(sym => {
                  const symInfo = symbols.find(s => s.symbol === sym);
                  return <SignalCard key={sym} symbol={sym} displayName={symInfo?.display_name || sym} signal={signals[sym] || null} ticks={ticks[sym] || []} disabled={!isConnected} onTrade={(dir, stake) => executeTrade(sym, dir, stake, signals[sym]?.confidence || 50, 'manual')} />;
                })}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <AutoTradePanel />
                <PortfolioPanel />
              </div>
            </div>
          </div>
        )}

        {/* ── SIGNALS ──────────────────────────────────────────────────────── */}
        {activeTab === 'signals' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#e8f0fe' }}>All Signal Analysis</h2>
              <button onClick={() => setShowSymbolSelector(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8, background: '#131a27', border: '1px solid #2a3f5e', color: '#8098b8', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}><Plus size={13} /> Add Symbol</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(320px,1fr))', gap: 16 }}>
              {selectedSymbols.map(sym => {
                const symInfo = symbols.find(s => s.symbol === sym);
                return <SignalCard key={sym} symbol={sym} displayName={symInfo?.display_name || sym} signal={signals[sym] || null} ticks={ticks[sym] || []} disabled={!isConnected} onTrade={(dir, stake) => executeTrade(sym, dir, stake, signals[sym]?.confidence || 50, 'manual')} />;
              })}
            </div>
          </div>
        )}

        {/* ── OKX ──────────────────────────────────────────────────────────── */}
        {activeTab === 'okx' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* OKX connect prompt */}
            {!okxConnected && (
              <div style={{ padding: '20px 24px', background: 'linear-gradient(135deg,#00c2ff0a,#00507a11)', border: '1px solid #00c2ff33', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
                <div>
                  <p style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#e8f0fe' }}>📈 Connect OKX Crypto Account</p>
                  <p style={{ margin: '4px 0 0', fontSize: 13, color: '#8098b8' }}>Enter your OKX API keys to trade crypto with AI analysis. Real balances sync live.</p>
                </div>
                <button onClick={() => setShowOKXConnect(true)} style={{ padding: '11px 24px', borderRadius: 10, background: 'linear-gradient(135deg,#00c2ff,#0070a0)', border: 'none', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                  Connect OKX →
                </button>
              </div>
            )}
            {okxConnected && (
              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 320px', gap: 20 }}>
                <OKXDashboard />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div className="card" style={{ padding: 16 }}>
                    <p style={{ margin: '0 0 12px', fontSize: 13, fontWeight: 700, color: '#e8f0fe' }}>OKX Account</p>
                    <button onClick={() => setShowOKXConnect(true)} style={{ width: '100%', padding: '8px', borderRadius: 7, background: '#1e2d45', border: '1px solid #2a3f5e', color: '#8098b8', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                      Manage Connection
                    </button>
                  </div>
                </div>
              </div>
            )}
            {!okxConnected && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '60px 0', color: '#3d5270', flexDirection: 'column', gap: 12 }}>
                <span style={{ fontSize: 48 }}>📊</span>
                <p style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>Connect OKX to see markets and trade</p>
              </div>
            )}
          </div>
        )}

        {/* ── HISTORY ──────────────────────────────────────────────────────── */}
        {activeTab === 'history' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#e8f0fe' }}>Trade History</h2>
            <TradeHistory />
          </div>
        )}

        {/* ── SETTINGS ─────────────────────────────────────────────────────── */}
        {activeTab === 'settings' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 640 }}>
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#e8f0fe' }}>Settings</h2>
            <div className="card" style={{ padding: 20 }}>
              <h3 style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 700, color: '#e8f0fe' }}>Deriv Account</h3>
              <ConnectAccount />
            </div>
            <div className="card" style={{ padding: 20 }}>
              <h3 style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 700, color: '#e8f0fe' }}>OKX Account</h3>
              <OKXConnect />
            </div>
            <AutoTradePanel />
            <div className="card" style={{ padding: 20 }}>
              <h3 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 700, color: '#e8f0fe' }}>About</h3>
              {[['Version','2.0.0'],['Deriv API','WebSocket v3'],['OKX API','REST v5 + WebSocket'],['Analysis','RSI + MACD + Bollinger + EMA + Momentum']].map(([k,v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #1e2d4533' }}>
                  <span style={{ fontSize: 12, color: '#8098b8' }}>{k}</span>
                  <span style={{ fontSize: 12, color: '#e8f0fe', fontWeight: 500 }}>{v}</span>
                </div>
              ))}
              <p style={{ margin: '14px 0 0', fontSize: 11, color: '#3d5270', lineHeight: 1.6 }}>⚠️ Trading involves significant risk. Only use funds you can afford to lose.</p>
            </div>
          </div>
        )}
      </main>

      {/* Symbol Selector Modal */}
      {showSymbolSelector && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' }} onClick={e => e.target === e.currentTarget && setShowSymbolSelector(false)}>
          <div style={{ background: '#131a27', border: '1px solid #2a3f5e', borderRadius: 16, padding: 24, maxWidth: 500, width: '92%', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
            <SymbolSelector onClose={() => setShowSymbolSelector(false)} />
          </div>
        </div>
      )}

      {/* Deriv Connect Modal */}
      {showConnect && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' }} onClick={e => e.target === e.currentTarget && setShowConnect(false)}>
          <div style={{ background: '#131a27', border: '1px solid #2a3f5e', borderRadius: 16, padding: 24, maxWidth: 460, width: '92%', maxHeight: '90vh', overflowY: 'auto' }}>
            <ConnectAccount onClose={() => setShowConnect(false)} />
          </div>
        </div>
      )}

      {/* OKX Connect Modal */}
      {showOKXConnect && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' }} onClick={e => e.target === e.currentTarget && setShowOKXConnect(false)}>
          <div style={{ background: '#131a27', border: '1px solid #2a3f5e', borderRadius: 16, padding: 24, maxWidth: 460, width: '92%', maxHeight: '90vh', overflowY: 'auto' }}>
            <OKXConnect onClose={() => setShowOKXConnect(false)} />
          </div>
        </div>
      )}

      <style>{`
        @media(max-width:900px){
          main div[style*="320px"]{grid-template-columns:1fr!important}
        }
        @media(max-width:768px){
          main{padding:12px!important}
          h2{font-size:14px!important}
        }
        @media(max-width:600px){
          main div[style*="repeat(auto-fill"]{grid-template-columns:1fr!important}
        }
      `}</style>
    </div>
  );
}
