'use client';
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
  const [confirmReal, setConfirmReal] = useState<string | null>(null);

  const realAccounts = tokens.filter(t => !t.isDemo);
  const demoAccounts = tokens.filter(t => t.isDemo);

  const doConnect = async (loginid: string, token: string, accountType: 'real' | 'demo') => {
    setLoading(loginid);
    setError('');
    setConfirmReal(null);
    try {
      // Pass accountId + accountType for official v2 OTP flow
      await connect(token, loginid, accountType);
      await new Promise(r => setTimeout(r, 400));
      const { connectionStatus, connectionError } = useTradingStore.getState();
      if (connectionStatus === 'authorized') {
        onClose?.();
      } else {
        setError(connectionError || 'Connection failed — please try again.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connection failed');
    } finally {
      setLoading(null);
    }
  };

  const handleSelect = (loginid: string, token: string, isDemo: boolean) => {
    if (!isDemo) { setConfirmReal(loginid); return; }
    doConnect(loginid, token, 'demo');
  };

  if (tokens.length === 0) return null;

  const AccountRow = ({ t }: { t: typeof tokens[0] }) => {
    const isActive = activeAccount?.loginid === t.loginid;
    const isLoading = loading === t.loginid;
    const color = t.isDemo ? '#ffd600' : '#00e676';
    const bg = t.isDemo ? '#ffd60011' : '#00e67611';
    const border = t.isDemo ? '#ffd60033' : '#00e67633';

    return (
      <button
        onClick={() => handleSelect(t.loginid, t.token, t.isDemo)}
        disabled={!!loading || isActive}
        style={{
          width: '100%', padding: '14px 16px', borderRadius: 10, textAlign: 'left',
          background: isActive ? bg : '#131a27',
          border: `1px solid ${isActive ? border : '#2a3f5e'}`,
          cursor: loading || isActive ? 'default' : 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          transition: 'all 0.2s',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: bg, border: `1px solid ${border}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {t.isDemo ? <Shield size={18} color={color} /> : <TrendingUp size={18} color={color} />}
          </div>
          <div>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#e8f0fe' }}>{t.loginid}</p>
            <p style={{ margin: 0, fontSize: 11, color: '#8098b8' }}>
              {t.isDemo ? 'Demo Account' : 'Real Money Account'} • {t.currency || 'USD'}
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {isActive && <CheckCircle2 size={18} color={color} />}
          {isLoading && <Loader2 size={18} color="#00c2ff" style={{ animation: 'spin 1s linear infinite' }} />}
          {!isActive && !isLoading && <ChevronRight size={18} color="#3d5270" />}
        </div>
      </button>
    );
  };

  return (
    <div style={{ fontFamily: 'Inter, sans-serif' }}>
      <h3 style={{ margin: '0 0 6px', fontSize: 16, fontWeight: 700, color: '#e8f0fe' }}>Select Account</h3>
      <p style={{ margin: '0 0 20px', fontSize: 13, color: '#8098b8' }}>
        Choose your account. Balance syncs live with your real Deriv account.
      </p>

      {realAccounts.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <p style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 700, color: '#00e676', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            🟢 Real Accounts
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {realAccounts.map(t => <AccountRow key={t.loginid} t={t} />)}
          </div>
        </div>
      )}

      {demoAccounts.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <p style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 700, color: '#ffd600', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            🟡 Demo Accounts
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {demoAccounts.map(t => <AccountRow key={t.loginid} t={t} />)}
          </div>
        </div>
      )}

      {error && (
        <div style={{ padding: '10px 12px', borderRadius: 8, background: '#ff3d6b0d', border: '1px solid #ff3d6b33', marginBottom: 12 }}>
          <p style={{ margin: 0, fontSize: 12, color: '#ff3d6b', whiteSpace: 'pre-wrap' }}>{error}</p>
        </div>
      )}

      {/* Real account confirmation */}
      {confirmReal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, backdropFilter: 'blur(4px)' }}>
          <div style={{ background: '#131a27', border: '1px solid #ff3d6b44', borderRadius: 14, padding: 24, maxWidth: 380, width: '90%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <AlertTriangle size={22} color="#ff3d6b" />
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#e8f0fe' }}>Connect Real Account?</h3>
            </div>
            <p style={{ margin: '0 0 8px', fontSize: 13, color: '#8098b8', lineHeight: 1.6 }}>
              You are connecting <strong style={{ color: '#e8f0fe' }}>{confirmReal}</strong> — a <strong style={{ color: '#00e676' }}>real money account</strong>. All trades will use real funds.
            </p>
            <p style={{ margin: '0 0 20px', fontSize: 12, color: '#ff3d6b' }}>
              ⚠️ Only enable autonomous trading if you fully understand the risks.
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setConfirmReal(null)} style={{ flex: 1, padding: 10, borderRadius: 8, border: '1px solid #2a3f5e', background: 'none', color: '#8098b8', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                Cancel
              </button>
              <button
                onClick={() => {
                  const t = tokens.find(t => t.loginid === confirmReal);
                  if (t) doConnect(t.loginid, t.token, 'real');
                }}
                style={{ flex: 1, padding: 10, borderRadius: 8, border: 'none', background: 'linear-gradient(135deg,#00e676,#00a854)', color: '#000', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
              >
                Connect Real
              </button>
            </div>
          </div>
        </div>
      )}
      <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
