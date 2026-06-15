'use client';
import { useState } from 'react';
import { Eye, EyeOff, Loader2, X, Link2, Shield, ExternalLink, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useOKXStore } from '@/store/okx-store';
import { useOKXEngine } from '@/hooks/useOKXEngine';
import { resetOKXClient } from '@/lib/okx-api';

interface Props { onClose?: () => void; }

export default function OKXConnect({ onClose }: Props) {
  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');
  const [passphrase, setPassphrase] = useState('');
  const [showSecret, setShowSecret] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { status, credentials, setCredentials, setStatus } = useOKXStore();
  const { connect } = useOKXEngine();

  const isConnected = status === 'connected';

  const handleConnect = async () => {
    if (!apiKey.trim() || !apiSecret.trim() || !passphrase.trim()) {
      setError('All three fields are required.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await connect({ apiKey: apiKey.trim(), apiSecret: apiSecret.trim(), passphrase: passphrase.trim() });
      const { status: s } = useOKXStore.getState();
      if (s === 'connected') {
        setApiKey(''); setApiSecret(''); setPassphrase('');
        onClose?.();
      } else {
        const { error: e } = useOKXStore.getState();
        setError(e || 'Connection failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connection failed');
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = () => {
    resetOKXClient();
    setCredentials(null);
    setStatus('disconnected');
  };

  return (
    <div style={{ fontFamily: 'Inter, sans-serif' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: 'linear-gradient(135deg,#00c2ff22,#003a5a)', border: '1px solid #00c2ff44', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 900, color: '#00c2ff' }}>O</div>
          <div>
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#e8f0fe' }}>Connect OKX Account</h2>
            <p style={{ margin: 0, fontSize: 12, color: '#8098b8' }}>Live crypto trading via OKX API</p>
          </div>
        </div>
        {onClose && <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8098b8' }}><X size={18} /></button>}
      </div>

      {/* Already connected */}
      {isConnected && credentials && (
        <div style={{ background: '#00e67611', border: '1px solid #00e67633', borderRadius: 10, padding: '14px 16px', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <CheckCircle2 size={16} color="#00e676" />
              <div>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#e8f0fe' }}>OKX Connected</p>
                <p style={{ margin: 0, fontSize: 11, color: '#8098b8' }}>API Key: {credentials.apiKey.slice(0, 8)}…</p>
              </div>
            </div>
            <button onClick={handleDisconnect} style={{ padding: '5px 12px', borderRadius: 7, background: '#ff3d6b22', border: '1px solid #ff3d6b44', color: '#ff3d6b', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
              Disconnect
            </button>
          </div>
        </div>
      )}

      {/* How to get API keys */}
      <div style={{ background: '#00c2ff08', border: '1px solid #00c2ff1a', borderRadius: 8, padding: '10px 12px', marginBottom: 16 }}>
        <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 700, color: '#00c2ff' }}>How to get OKX API keys:</p>
        <ol style={{ margin: 0, padding: '0 0 0 16px', fontSize: 12, color: '#8098b8', lineHeight: 1.8 }}>
          <li>Go to <strong style={{ color: '#e8f0fe' }}>okx.com</strong> → Profile → <strong style={{ color: '#e8f0fe' }}>API</strong></li>
          <li>Click <strong style={{ color: '#e8f0fe' }}>Create V5 API Key</strong></li>
          <li>Set permissions: <strong style={{ color: '#e8f0fe' }}>Read + Trade</strong></li>
          <li>Set IP allowlist or leave blank for any IP</li>
          <li>Copy <strong style={{ color: '#e8f0fe' }}>API Key</strong>, <strong style={{ color: '#e8f0fe' }}>Secret Key</strong>, and <strong style={{ color: '#e8f0fe' }}>Passphrase</strong></li>
        </ol>
        <a href="https://www.okx.com/account/my-api" target="_blank" rel="noopener noreferrer"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 6, fontSize: 11, color: '#00c2ff', textDecoration: 'none', fontWeight: 600 }}>
          Open OKX API page <ExternalLink size={10} />
        </a>
      </div>

      {/* API Key */}
      <div style={{ marginBottom: 10 }}>
        <label style={{ fontSize: 11, fontWeight: 600, color: '#8098b8', display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>API Key</label>
        <input
          type="text"
          value={apiKey}
          onChange={e => { setApiKey(e.target.value); setError(''); }}
          placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
          autoComplete="off" spellCheck={false}
          style={{ width: '100%', padding: '10px 12px', background: '#131a27', border: '1px solid #2a3f5e', borderRadius: 8, color: '#e8f0fe', fontSize: 12, outline: 'none', fontFamily: 'JetBrains Mono, monospace' }}
        />
      </div>

      {/* Secret Key */}
      <div style={{ marginBottom: 10 }}>
        <label style={{ fontSize: 11, fontWeight: 600, color: '#8098b8', display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Secret Key</label>
        <div style={{ position: 'relative' }}>
          <input
            type={showSecret ? 'text' : 'password'}
            value={apiSecret}
            onChange={e => { setApiSecret(e.target.value); setError(''); }}
            placeholder="Your OKX secret key"
            autoComplete="off" spellCheck={false}
            style={{ width: '100%', padding: '10px 40px 10px 12px', background: '#131a27', border: '1px solid #2a3f5e', borderRadius: 8, color: '#e8f0fe', fontSize: 12, outline: 'none', fontFamily: 'JetBrains Mono, monospace' }}
          />
          <button onClick={() => setShowSecret(!showSecret)} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#8098b8' }}>
            {showSecret ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        </div>
      </div>

      {/* Passphrase */}
      <div style={{ marginBottom: 14 }}>
        <label style={{ fontSize: 11, fontWeight: 600, color: '#8098b8', display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Passphrase</label>
        <div style={{ position: 'relative' }}>
          <input
            type={showPass ? 'text' : 'password'}
            value={passphrase}
            onChange={e => { setPassphrase(e.target.value); setError(''); }}
            placeholder="Your API passphrase"
            autoComplete="off" spellCheck={false}
            style={{ width: '100%', padding: '10px 40px 10px 12px', background: '#131a27', border: `1px solid ${error ? '#ff3d6b55' : '#2a3f5e'}`, borderRadius: 8, color: '#e8f0fe', fontSize: 12, outline: 'none', fontFamily: 'JetBrains Mono, monospace' }}
          />
          <button onClick={() => setShowPass(!showPass)} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#8098b8' }}>
            {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div style={{ background: '#ff3d6b0d', border: '1px solid #ff3d6b33', borderRadius: 8, padding: '8px 12px', marginBottom: 12, display: 'flex', gap: 7 }}>
          <AlertCircle size={14} color="#ff3d6b" style={{ flexShrink: 0, marginTop: 1 }} />
          <p style={{ margin: 0, fontSize: 12, color: '#ff3d6b', lineHeight: 1.5 }}>{error}</p>
        </div>
      )}

      {/* Connect button */}
      <button
        onClick={handleConnect}
        disabled={loading || !apiKey.trim() || !apiSecret.trim() || !passphrase.trim()}
        style={{
          width: '100%', padding: '12px', borderRadius: 8, border: 'none',
          background: loading || !apiKey.trim() || !apiSecret.trim() || !passphrase.trim()
            ? '#1e2d45' : 'linear-gradient(135deg,#00c2ff,#0070a0)',
          color: loading || !apiKey.trim() || !apiSecret.trim() || !passphrase.trim() ? '#3d5270' : '#fff',
          fontSize: 14, fontWeight: 700,
          cursor: loading || !apiKey.trim() || !apiSecret.trim() || !passphrase.trim() ? 'not-allowed' : 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        }}
      >
        {loading
          ? <><Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} />Connecting to OKX…</>
          : <><Link2 size={15} />Connect OKX Account</>}
      </button>

      {/* Security */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, marginTop: 12 }}>
        <Shield size={11} color="#3d5270" style={{ marginTop: 2, flexShrink: 0 }} />
        <p style={{ margin: 0, fontSize: 11, color: '#3d5270', lineHeight: 1.5 }}>
          Keys are stored in your browser and sent only to OKX via our secure server proxy. Never shared with third parties.
        </p>
      </div>
      <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
