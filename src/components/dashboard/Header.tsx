'use client';
import { useState } from 'react';
import { Wifi, WifiOff, AlertCircle, ChevronDown, LogOut, RefreshCw } from 'lucide-react';
import { useTradingStore } from '@/store/trading-store';
import { getDerivClient } from '@/lib/deriv-api';
import ConnectAccount from '../trading/ConnectAccount';

export default function Header() {
  const {
    connectionStatus, activeAccount, balance, currency,
    tokens, setConnectionStatus, autonomousMode,
  } = useTradingStore();
  const [showConnect, setShowConnect] = useState(false);
  const [showAccountMenu, setShowAccountMenu] = useState(false);

  const isConnected = connectionStatus === 'authorized';
  const isConnecting = connectionStatus === 'connecting';

  const statusConfig = {
    disconnected: { color: '#ff3d6b', icon: <WifiOff size={13} />, label: 'Disconnected' },
    connecting:   { color: '#ffd600', icon: <RefreshCw size={13} style={{ animation: 'spin 1s linear infinite' }} />, label: 'Connecting…' },
    connected:    { color: '#ffd600', icon: <Wifi size={13} />, label: 'Connected' },
    authorized:   { color: '#00e676', icon: <Wifi size={13} />, label: 'Live' },
    error:        { color: '#ff3d6b', icon: <AlertCircle size={13} />, label: 'Error' },
  }[connectionStatus];

  const handleDisconnect = () => {
    getDerivClient().disconnect();
    setConnectionStatus('disconnected');
    setShowAccountMenu(false);
  };

  return (
    <>
      <header style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: '#0a0d14ee', backdropFilter: 'blur(12px)',
        borderBottom: '1px solid #1e2d45',
        padding: '0 20px', height: 56,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: 'linear-gradient(135deg, #00c2ff, #0050a0)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 900, fontSize: 14, color: '#fff', letterSpacing: '-1px',
          }}>AI</div>
          <div>
            <span style={{ fontSize: 15, fontWeight: 800, color: '#e8f0fe', letterSpacing: '-0.02em' }}>
              Deriv<span style={{ color: '#00c2ff' }}>AI</span>
            </span>
            <span style={{ fontSize: 10, color: '#3d5270', marginLeft: 6, fontWeight: 500 }}>AGENT</span>
          </div>

          {/* Auto mode badge */}
          {autonomousMode && (
            <div style={{
              padding: '3px 10px', borderRadius: 100,
              background: '#00c2ff22', border: '1px solid #00c2ff55',
              fontSize: 10, fontWeight: 800, color: '#00c2ff',
              letterSpacing: '0.05em', animation: 'pulse 2s ease-in-out infinite',
            }}>
              🤖 AUTO TRADING
            </div>
          )}
        </div>

        {/* Right side */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Status */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 5,
            padding: '4px 10px', borderRadius: 100,
            background: `${statusConfig.color}11`,
            border: `1px solid ${statusConfig.color}33`,
          }}>
            <span style={{ color: statusConfig.color }}>{statusConfig.icon}</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: statusConfig.color }}>{statusConfig.label}</span>
          </div>

          {/* Balance */}
          {isConnected && (
            <div style={{
              padding: '4px 12px', borderRadius: 8,
              background: '#00e67611', border: '1px solid #00e67633',
            }}>
              <span style={{ fontSize: 12, color: '#8098b8' }}>{currency} </span>
              <span style={{ fontSize: 14, fontWeight: 800, color: '#00e676', fontFamily: 'JetBrains Mono, monospace' }}>
                {balance.toFixed(2)}
              </span>
            </div>
          )}

          {/* Account button */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => isConnected ? setShowAccountMenu(!showAccountMenu) : setShowConnect(true)}
              style={{
                display: 'flex', alignItems: 'center', gap: 7,
                padding: '7px 14px', borderRadius: 8,
                background: isConnected ? '#131a27' : 'linear-gradient(135deg, #00c2ff, #0070a0)',
                border: isConnected ? '1px solid #2a3f5e' : 'none',
                color: isConnected ? '#e8f0fe' : '#fff',
                fontSize: 13, fontWeight: 700, cursor: 'pointer',
              }}
            >
              {isConnected ? (
                <>
                  <span style={{
                    width: 6, height: 6, borderRadius: '50%', background: '#00e676',
                  }} />
                  {activeAccount?.loginid}
                  {activeAccount?.is_virtual === 1 && (
                    <span style={{ fontSize: 9, color: '#ffd600', fontWeight: 800 }}>DEMO</span>
                  )}
                  <ChevronDown size={14} />
                </>
              ) : (
                <>Connect Account</>
              )}
            </button>

            {/* Account dropdown */}
            {showAccountMenu && isConnected && (
              <div style={{
                position: 'absolute', top: '100%', right: 0, marginTop: 6,
                background: '#131a27', border: '1px solid #2a3f5e',
                borderRadius: 10, overflow: 'hidden', minWidth: 180,
                boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                zIndex: 200,
              }}>
                <div style={{ padding: '10px 14px', borderBottom: '1px solid #1e2d45' }}>
                  <p style={{ margin: 0, fontSize: 11, color: '#8098b8' }}>Logged in as</p>
                  <p style={{ margin: '2px 0 0', fontSize: 13, fontWeight: 700, color: '#e8f0fe' }}>{activeAccount?.loginid}</p>
                  <p style={{ margin: '2px 0 0', fontSize: 11, color: '#8098b8' }}>{activeAccount?.email}</p>
                </div>
                <button
                  onClick={() => { setShowConnect(true); setShowAccountMenu(false); }}
                  style={{
                    width: '100%', padding: '10px 14px', background: 'none', border: 'none',
                    color: '#00c2ff', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                    textAlign: 'left', display: 'flex', alignItems: 'center', gap: 8,
                  }}
                >
                  + Add / Switch Account
                </button>
                <button
                  onClick={handleDisconnect}
                  style={{
                    width: '100%', padding: '10px 14px', background: 'none', border: 'none',
                    borderTop: '1px solid #1e2d45',
                    color: '#ff3d6b', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                    textAlign: 'left', display: 'flex', alignItems: 'center', gap: 8,
                  }}
                >
                  <LogOut size={14} /> Disconnect
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Connect modal */}
      {showConnect && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1000, backdropFilter: 'blur(4px)',
          }}
          onClick={e => e.target === e.currentTarget && setShowConnect(false)}
        >
          <div style={{
            background: '#131a27', border: '1px solid #2a3f5e',
            borderRadius: 16, padding: 24, maxWidth: 440, width: '92%',
            boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
          }}>
            <ConnectAccount onClose={() => setShowConnect(false)} />
          </div>
        </div>
      )}

      {/* Click-away for menus */}
      {showAccountMenu && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 99 }}
          onClick={() => setShowAccountMenu(false)}
        />
      )}

      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}} @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.6}}`}</style>
    </>
  );
}
