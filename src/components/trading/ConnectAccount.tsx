'use client';
import { useState } from 'react';
import { Link2, Shield, Eye, EyeOff, Loader2, X, CheckCircle2, ExternalLink, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { useTradingStore } from '@/store/trading-store';
import { useTradingEngine } from '@/hooks/useTradingEngine';
import { resetDerivClient } from '@/lib/deriv-api';
import OAuthLogin from './OAuthLogin';
import AccountSelector from './AccountSelector';

interface Props { onClose?: () => void; }

export default function ConnectAccount({ onClose }: Props) {
  const [token, setToken] = useState('');
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showManual, setShowManual] = useState(false);

  const store = useTradingStore();
  const { connect } = useTradingEngine();

  const hasAccounts = store.tokens.length > 0;

  const handleConnect = async () => {
    const t = token.trim();
    if (!t) return;
    setError('');
    setLoading(true);
    try {
      await connect(t);
      await new Promise(r => setTimeout(r, 400));
      const { connectionStatus, activeAccount, connectionError } = useTradingStore.getState();
      if (connectionStatus === 'authorized' && activeAccount) {
        store.addToken(activeAccount.loginid, t, activeAccount.is_virtual === 1);
        setToken('');
        onClose?.();
      } else {
        setError(connectionError || 'Connection failed — please try again.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connection failed');
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = (loginid: string) => {
    store.removeToken(loginid);
    if (store.activeAccount?.loginid === loginid) {
      resetDerivClient();
      store.setConnectionStatus('disconnected');
    }
  };

  return (
    <div style={{ fontFamily: 'Inter, sans-serif' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: 'linear-gradient(135deg,#00c2ff22,#005a7a)', border: '1px solid #00c2ff44', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Link2 size={18} color="#00c2ff" />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#e8f0fe' }}>Connect Deriv Account</h2>
            <p style={{ margin: 0, fontSize: 12, color: '#8098b8' }}>Login with Deriv or paste API token</p>
          </div>
        </div>
        {onClose && <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8098b8' }}><X size={18} /></button>}
      </div>

      {/* If accounts already connected — show account selector */}
      {hasAccounts && (
        <div style={{ marginBottom: 20 }}>
          <AccountSelector onClose={onClose} />
          <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid #1e2d45' }}>
            <p style={{ margin: '0 0 10px', fontSize: 12, color: '#8098b8' }}>Add another account:</p>
          </div>
        </div>
      )}

      {/* OAuth Login — PRIMARY option */}
      <div style={{ marginBottom: 16 }}>
        <OAuthLogin />
      </div>

      {/* Divider */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <div style={{ flex: 1, height: 1, background: '#1e2d45' }} />
        <span style={{ fontSize: 11, color: '#3d5270', fontWeight: 600 }}>OR</span>
        <div style={{ flex: 1, height: 1, background: '#1e2d45' }} />
      </div>

      {/* Manual token — SECONDARY option (collapsible) */}
      <div style={{ background: '#0f1520', border: '1px solid #1e2d45', borderRadius: 10, overflow: 'hidden' }}>
        <button
          onClick={() => setShowManual(!showManual)}
          style={{
            width: '100%', padding: '12px 16px', background: 'none', border: 'none',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            color: '#8098b8',
          }}
        >
          <span style={{ fontSize: 13, fontWeight: 600 }}>Use API Token manually</span>
          {showManual ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
        </button>

        {showManual && (
          <div style={{ padding: '0 16px 16px' }}>
            {/* How to get token */}
            <div style={{ background: '#00c2ff08', border: '1px solid #00c2ff1a', borderRadius: 8, padding: '10px 12px', marginBottom: 12 }}>
              <p style={{ margin: '0 0 4px', fontSize: 11, fontWeight: 700, color: '#00c2ff' }}>Get token from Deriv:</p>
              <p style={{ margin: 0, fontSize: 11, color: '#8098b8', lineHeight: 1.7 }}>
                app.deriv.com → Account Settings → <strong style={{ color: '#e8f0fe' }}>API Token</strong> → Create with <strong style={{ color: '#e8f0fe' }}>Read + Trade</strong>
              </p>
              <a href="https://app.deriv.com/account/api-token" target="_blank" rel="noopener noreferrer"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 6, fontSize: 11, color: '#00c2ff', textDecoration: 'none', fontWeight: 600 }}>
                Open API Token page <ExternalLink size={10} />
              </a>
            </div>

            {/* Input */}
            <div style={{ position: 'relative', marginBottom: 10 }}>
              <input
                type={show ? 'text' : 'password'}
                value={token}
                onChange={e => { setToken(e.target.value); setError(''); }}
                onKeyDown={e => e.key === 'Enter' && !loading && handleConnect()}
                placeholder="pat_def1dcdcc1d… (paste full token)"
                autoComplete="off"
                spellCheck={false}
                style={{
                  width: '100%', padding: '10px 42px 10px 12px',
                  background: '#131a27', border: `1px solid ${error ? '#ff3d6b55' : '#2a3f5e'}`,
                  borderRadius: 8, color: '#e8f0fe', fontSize: 12, outline: 'none',
                  fontFamily: 'JetBrains Mono, monospace',
                }}
              />
              <button onClick={() => setShow(!show)} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#8098b8' }}>
                {show ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>

            {error && (
              <div style={{ background: '#ff3d6b0d', border: '1px solid #ff3d6b33', borderRadius: 7, padding: '8px 10px', marginBottom: 10, display: 'flex', gap: 6 }}>
                <AlertCircle size={13} color="#ff3d6b" style={{ flexShrink: 0, marginTop: 1 }} />
                <p style={{ margin: 0, fontSize: 11, color: '#ff3d6b', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{error}</p>
              </div>
            )}

            <button
              onClick={handleConnect}
              disabled={loading || !token.trim()}
              style={{
                width: '100%', padding: '10px', borderRadius: 8, border: 'none',
                background: loading || !token.trim() ? '#1e2d45' : 'linear-gradient(135deg,#00c2ff,#0070a0)',
                color: loading || !token.trim() ? '#3d5270' : '#fff',
                fontSize: 13, fontWeight: 700,
                cursor: loading || !token.trim() ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
              }}
            >
              {loading
                ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />Connecting…</>
                : <><Link2 size={14} />Connect with Token</>}
            </button>
          </div>
        )}
      </div>

      {/* Remove saved accounts */}
      {hasAccounts && (
        <div style={{ marginTop: 16 }}>
          <p style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 600, color: '#3d5270', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Saved Tokens</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {store.tokens.map(t => (
              <div key={t.loginid} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 10px', borderRadius: 7, background: '#0f1520', border: '1px solid #1e2d45' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ padding: '1px 7px', borderRadius: 100, fontSize: 9, fontWeight: 700, background: t.isDemo ? '#ffd60022' : '#00e67622', color: t.isDemo ? '#ffd600' : '#00e676' }}>{t.isDemo ? 'DEMO' : 'REAL'}</span>
                  <span style={{ fontSize: 12, color: '#e8f0fe' }}>{t.loginid}</span>
                  {store.activeAccount?.loginid === t.loginid && <CheckCircle2 size={12} color="#00c2ff" />}
                </div>
                <button onClick={() => handleRemove(t.loginid)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 3 }}><X size={13} color="#ff3d6b" /></button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Security note */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, marginTop: 14 }}>
        <Shield size={11} color="#3d5270" style={{ marginTop: 2, flexShrink: 0 }} />
        <p style={{ margin: 0, fontSize: 11, color: '#3d5270', lineHeight: 1.5 }}>
          Tokens stored in your browser only. Your Deriv credentials never touch this server.
        </p>
      </div>

      <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
