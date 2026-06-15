'use client';
import { useState } from 'react';
import { Link2, Shield, Eye, EyeOff, Loader2, X, CheckCircle2, ExternalLink, AlertCircle } from 'lucide-react';
import { useTradingStore } from '@/store/trading-store';
import { useTradingEngine } from '@/hooks/useTradingEngine';
import { resetDerivClient } from '@/lib/deriv-api';

interface Props { onClose?: () => void; }

export default function ConnectAccount({ onClose }: Props) {
  const [token, setToken] = useState('');
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const store = useTradingStore();
  const { connect } = useTradingEngine();

  const handleConnect = async () => {
    const t = token.trim();
    if (!t) return;
    setError('');
    setLoading(true);

    try {
      await connect(t);
      // Wait briefly for store to update
      await new Promise(r => setTimeout(r, 400));
      const { connectionStatus, activeAccount, connectionError } = useTradingStore.getState();

      if (connectionStatus === 'authorized' && activeAccount) {
        store.addToken(activeAccount.loginid, t, activeAccount.is_virtual === 1);
        setToken('');
        onClose?.();
      } else {
        // Show the REAL error from Deriv, not a generic message
        setError(connectionError || 'Connection failed — please try again.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connection failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSwitch = async (savedToken: string) => {
    setError('');
    setLoading(true);
    try {
      await connect(savedToken);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Switch failed');
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
            <p style={{ margin: 0, fontSize: 12, color: '#8098b8' }}>Supports pat_def… and legacy tokens</p>
          </div>
        </div>
        {onClose && <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8098b8' }}><X size={18} /></button>}
      </div>

      {/* Saved accounts */}
      {store.tokens.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <p style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 600, color: '#8098b8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Saved Accounts</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {store.tokens.map(t => (
              <div key={t.loginid} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', borderRadius: 8, background: store.activeAccount?.loginid === t.loginid ? '#00c2ff0d' : '#131a27', border: `1px solid ${store.activeAccount?.loginid === t.loginid ? '#00c2ff44' : '#1e2d45'}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ padding: '2px 8px', borderRadius: 100, fontSize: 10, fontWeight: 700, background: t.isDemo ? '#ffd60022' : '#00e67622', color: t.isDemo ? '#ffd600' : '#00e676', border: `1px solid ${t.isDemo ? '#ffd60044' : '#00e67644'}` }}>{t.isDemo ? 'DEMO' : 'REAL'}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#e8f0fe' }}>{t.loginid}</span>
                  {store.activeAccount?.loginid === t.loginid && <CheckCircle2 size={14} color="#00c2ff" />}
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  {store.activeAccount?.loginid !== t.loginid && (
                    <button onClick={() => handleSwitch(t.token)} disabled={loading} style={{ padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600, background: '#00c2ff22', border: '1px solid #00c2ff44', color: '#00c2ff', cursor: 'pointer' }}>Switch</button>
                  )}
                  <button onClick={() => handleRemove(t.loginid)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}><X size={14} color="#ff3d6b" /></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Token input */}
      <div style={{ background: '#0f1520', border: '1px solid #1e2d45', borderRadius: 10, padding: 16 }}>
        <p style={{ margin: '0 0 12px', fontSize: 13, fontWeight: 600, color: '#e8f0fe' }}>
          {store.tokens.length > 0 ? 'Add Another Account' : 'Enter API Token'}
        </p>

        {/* Instructions */}
        <div style={{ background: '#00c2ff08', border: '1px solid #00c2ff1a', borderRadius: 8, padding: '10px 12px', marginBottom: 14 }}>
          <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 700, color: '#00c2ff' }}>How to get your API token:</p>
          <ol style={{ margin: 0, padding: '0 0 0 16px', fontSize: 12, color: '#8098b8', lineHeight: 1.8 }}>
            <li>Go to <strong style={{ color: '#e8f0fe' }}>app.deriv.com</strong></li>
            <li>Click your profile → <strong style={{ color: '#e8f0fe' }}>Account Settings</strong></li>
            <li>Left menu → <strong style={{ color: '#e8f0fe' }}>API Token</strong></li>
            <li>Click <strong style={{ color: '#e8f0fe' }}>Create new token</strong></li>
            <li>Enable <strong style={{ color: '#e8f0fe' }}>Read</strong> + <strong style={{ color: '#e8f0fe' }}>Trade</strong> permissions</li>
            <li>Copy the <strong style={{ color: '#e8f0fe' }}>full token</strong> — starts with <code style={{ color: '#ffd600', background: '#ffd60011', padding: '1px 5px', borderRadius: 3, fontSize: 11 }}>pat_def…</code></li>
          </ol>
          <a href="https://app.deriv.com/account/api-token" target="_blank" rel="noopener noreferrer"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 8, fontSize: 11, color: '#00c2ff', textDecoration: 'none', fontWeight: 600 }}>
            Open API Token page <ExternalLink size={11} />
          </a>
        </div>

        {/* Input */}
        <div style={{ position: 'relative', marginBottom: error ? 10 : 12 }}>
          <input
            type={show ? 'text' : 'password'}
            value={token}
            onChange={e => { setToken(e.target.value); setError(''); }}
            onKeyDown={e => e.key === 'Enter' && !loading && handleConnect()}
            placeholder="pat_def1dcdcc1d… (paste full token)"
            autoComplete="off"
            spellCheck={false}
            style={{
              width: '100%', padding: '11px 44px 11px 14px',
              background: '#131a27', border: `1px solid ${error ? '#ff3d6b55' : '#2a3f5e'}`,
              borderRadius: 8, color: '#e8f0fe', fontSize: 13, outline: 'none',
              fontFamily: 'JetBrains Mono, monospace',
            }}
          />
          <button onClick={() => setShow(!show)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#8098b8' }}>
            {show ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>

        {/* Error — shows ACTUAL Deriv error, not generic message */}
        {error && (
          <div style={{ background: '#ff3d6b0d', border: '1px solid #ff3d6b33', borderRadius: 8, padding: '10px 12px', marginBottom: 12, display: 'flex', gap: 8, alignItems: 'flex-start' }}>
            <AlertCircle size={15} color="#ff3d6b" style={{ flexShrink: 0, marginTop: 1 }} />
            <p style={{ margin: 0, fontSize: 12, color: '#ff3d6b', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{error}</p>
          </div>
        )}

        {/* Button */}
        <button
          onClick={handleConnect}
          disabled={loading || !token.trim()}
          style={{
            width: '100%', padding: '12px', borderRadius: 8, border: 'none',
            background: loading || !token.trim() ? '#1e2d45' : 'linear-gradient(135deg,#00c2ff,#0070a0)',
            color: loading || !token.trim() ? '#3d5270' : '#fff',
            fontSize: 14, fontWeight: 700,
            cursor: loading || !token.trim() ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            transition: 'all 0.2s',
          }}
        >
          {loading
            ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />Connecting to Deriv…</>
            : <><Link2 size={16} />Connect Account</>}
        </button>
      </div>

      {/* Security */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, marginTop: 12 }}>
        <Shield size={12} color="#3d5270" style={{ marginTop: 2, flexShrink: 0 }} />
        <p style={{ margin: 0, fontSize: 11, color: '#3d5270', lineHeight: 1.5 }}>
          Token sent directly to Deriv's servers. Stored only in your browser — never on any third-party server.
        </p>
      </div>

      <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
