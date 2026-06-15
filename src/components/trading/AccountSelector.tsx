'use client';
/**
 * Account Selector — shown after OAuth login or multiple tokens saved.
 * User picks REAL or DEMO account to trade with.
 * Connects WebSocket with the chosen token, reflects real balance.
 */
import { useState } from 'react';
import { TrendingUp, Shield, Loader2, CheckCircle2, ChevronRight, AlertTriangle } from 'lucide-react';
import { useTradingStore } from '@/store/trading-store';
import { useTradingEngine } from '@/hooks/useTradingEngine';

interface Props { onClose?: () => void; }

export default function AccountSelector({ onClose }: Props) {
  const { tokens, activeAccount } = useTradingStore();
  const { connect } = useTradingEngine();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [showRealWarning, setShowRealWarning] = useState<string | null>(null);

  const realAccounts = tokens.filter(t => !t.isDemo);
  const demoAccounts = tokens.filter(t => t.isDemo);

  const handleSelect = async (loginid: string, token: string, isDemo: boolean) => {
    if (!isDemo) {
      // Show warning before connecting real account
      setShowRealWarning(loginid);
      return;
    }
    await doConnect(loginid, token);
  };

  const doConnect = async (loginid: string, token: string) => {
    setLoading(loginid);
    setError('');
    setShowRealWarning(null);
    try {
      await connect(token);
      const { connectionStatus } = useTradingStore.getState();
      if (connectionStatus === 'authorized') {
        onClose?.();
      } else {
        const { connectionError } = useTradingStore.getState();
        setError(connectionError || 'Connection failed — please try again.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connection failed');
    } finally {
      setLoading(null);
    }
  };

  const confirmRealAccount = () => {
    if (!showRealWarning) return;
    const t = tokens.find(t => t.loginid === showRealWarning);
    if (t) doConnect(t.loginid, t.token);
  };

  if (tokens.length === 0) return null;

  return (
    <div style={{ fontFamily: 'Inter, sans-serif' }}>
      <h3 style={{ margin: '0 0 6px', fontSize: 16, fontWeight: 700, color: '#e8f0fe' }}>
        Select Trading Account
      </h3>
      <p style={{ margin: '0 0 20px', fontSize: 13, color: '#8098b8' }}>
        Choose which account to connect for trading. Balance will sync from Deriv in real-time.
      </p>

      {/* Real accounts */}
      {realAccounts.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <p style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 700, color: '#00e676', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'flex', alignItems: 'center', gap: 5 }}>
            <TrendingUp size={11} /> Real Accounts
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {realAccounts.map(t => {
              const isActive = activeAccount?.loginid === t.loginid;
              const isLoading = loading === t.loginid;
              return (
                <button
                  key={t.loginid}
                  onClick={() => handleSelect(t.loginid, t.token, false)}
                  disabled={!!loading || isActive}
                  style={{
                    width: '100%', padding: '14px 16px', borderRadius: 10,
                    background: isActive ? '#00e67611' : '#131a27',
                    border: `1px solid ${isActive ? '#00e67655' : '#2a3f5e'}`,
                    cursor: loading || isActive ? 'default' : 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    transition: 'all 0.2s', textAlign: 'left',
                  }}
                  onMouseEnter={e => { if (!loading && !isActive) (e.currentTarget as HTMLElement).style.borderColor = '#00e676aa'; }}
                  onMouseLeave={e => { if (!loading && !isActive) (e.currentTarget as HTMLElement).style.borderColor = '#2a3f5e'; }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{
                      width: 40, height: 40, borderRadius: 10,
                      background: 'linear-gradient(135deg, #00e67622, #00e67611)',
                      border: '1px solid #00e67644',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <TrendingUp size={18} color="#00e676" />
                    </div>
                    <div>
                      <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#e8f0fe' }}>{t.loginid}</p>
                      <p style={{ margin: 0, fontSize: 11, color: '#8098b8' }}>Real Money Account</p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {isActive && <CheckCircle2 size={18} color="#00e676" />}
                    {isLoading && <Loader2 size={18} color="#00c2ff" style={{ animation: 'spin 1s linear infinite' }} />}
                    {!isActive && !isLoading && <ChevronRight size={18} color="#3d5270" />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Demo accounts */}
      {demoAccounts.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <p style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 700, color: '#ffd600', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'flex', alignItems: 'center', gap: 5 }}>
            <Shield size={11} /> Demo Accounts
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {demoAccounts.map(t => {
              const isActive = activeAccount?.loginid === t.loginid;
              const isLoading = loading === t.loginid;
              return (
                <button
                  key={t.loginid}
                  onClick={() => handleSelect(t.loginid, t.token, true)}
                  disabled={!!loading || isActive}
                  style={{
                    width: '100%', padding: '14px 16px', borderRadius: 10,
                    background: isActive ? '#ffd60011' : '#131a27',
                    border: `1px solid ${isActive ? '#ffd60055' : '#2a3f5e'}`,
                    cursor: loading || isActive ? 'default' : 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    transition: 'all 0.2s', textAlign: 'left',
                  }}
                  onMouseEnter={e => { if (!loading && !isActive) (e.currentTarget as HTMLElement).style.borderColor = '#ffd600aa'; }}
                  onMouseLeave={e => { if (!loading && !isActive) (e.currentTarget as HTMLElement).style.borderColor = '#2a3f5e'; }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{
                      width: 40, height: 40, borderRadius: 10,
                      background: 'linear-gradient(135deg, #ffd60022, #ffd60011)',
                      border: '1px solid #ffd60044',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Shield size={18} color="#ffd600" />
                    </div>
                    <div>
                      <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#e8f0fe' }}>{t.loginid}</p>
                      <p style={{ margin: 0, fontSize: 11, color: '#8098b8' }}>Virtual Demo Account</p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {isActive && <CheckCircle2 size={18} color="#ffd600" />}
                    {isLoading && <Loader2 size={18} color="#00c2ff" style={{ animation: 'spin 1s linear infinite' }} />}
                    {!isActive && !isLoading && <ChevronRight size={18} color="#3d5270" />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div style={{
          padding: '10px 12px', borderRadius: 8, marginBottom: 12,
          background: '#ff3d6b0d', border: '1px solid #ff3d6b33',
        }}>
          <p style={{ margin: 0, fontSize: 12, color: '#ff3d6b', whiteSpace: 'pre-wrap' }}>{error}</p>
        </div>
      )}

      {/* Real account warning modal */}
      {showRealWarning && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 2000, backdropFilter: 'blur(4px)',
        }}>
          <div style={{
            background: '#131a27', border: '1px solid #ff3d6b44',
            borderRadius: 14, padding: 24, maxWidth: 380, width: '90%',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <AlertTriangle size={22} color="#ff3d6b" />
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#e8f0fe' }}>Connect Real Account?</h3>
            </div>
            <p style={{ margin: '0 0 8px', fontSize: 13, color: '#8098b8', lineHeight: 1.6 }}>
              You are about to connect <strong style={{ color: '#e8f0fe' }}>{showRealWarning}</strong> — a <strong style={{ color: '#00e676' }}>real money account</strong>.
            </p>
            <p style={{ margin: '0 0 20px', fontSize: 13, color: '#ff3d6b', lineHeight: 1.5 }}>
              ⚠️ All trades placed will use real funds. Only enable autonomous trading if you understand the risks.
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => setShowRealWarning(null)}
                style={{
                  flex: 1, padding: '10px', borderRadius: 8,
                  border: '1px solid #2a3f5e', background: 'none',
                  color: '#8098b8', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                }}
              >Cancel</button>
              <button
                onClick={confirmRealAccount}
                style={{
                  flex: 1, padding: '10px', borderRadius: 8, border: 'none',
                  background: 'linear-gradient(135deg, #00e676, #00a854)',
                  color: '#000', fontSize: 13, fontWeight: 700, cursor: 'pointer',
                }}
              >Connect Real Account</button>
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
