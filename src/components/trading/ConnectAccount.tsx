'use client';
import { useState } from 'react';
import { Link2, Shield, Eye, EyeOff, Loader2, X, CheckCircle2, AlertCircle } from 'lucide-react';
import { useTradingStore } from '@/store/trading-store';
import { useTradingEngine } from '@/hooks/useTradingEngine';
import { getDerivClient } from '@/lib/deriv-api';

interface ConnectAccountProps {
  onClose?: () => void;
}

export default function ConnectAccount({ onClose }: ConnectAccountProps) {
  const [token, setToken] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'input' | 'success'>('input');

  const { connectionStatus, tokens, activeAccount, removeToken, addToken } = useTradingStore();
  const { connect } = useTradingEngine();

  const handleConnect = async () => {
    if (!token.trim()) return;
    setLoading(true);
    try {
      // First validate token format
      if (token.length < 10) throw new Error('Invalid API token format');
      await connect(token.trim());
      
      // Store token
      const client = getDerivClient();
      const { activeAccount } = useTradingStore.getState();
      if (activeAccount) {
        addToken(
          activeAccount.loginid,
          token.trim(),
          activeAccount.is_virtual === 1
        );
      }
      setStep('success');
      setToken('');
    } catch (err) {
      // Error handled by store notification
    } finally {
      setLoading(false);
    }
  };

  const handleSwitchAccount = async (t: string) => {
    setLoading(true);
    try {
      await connect(t);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ fontFamily: 'Inter, sans-serif' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div style={{
            width: 40, height: 40, borderRadius: 10,
            background: 'linear-gradient(135deg, #00c2ff22, #005a7a)',
            border: '1px solid #00c2ff44',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <Link2 size={18} color="#00c2ff" />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#e8f0fe' }}>Connect Deriv Account</h2>
            <p style={{ margin: 0, fontSize: 12, color: '#8098b8' }}>API token from app.deriv.com</p>
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8098b8', padding: 4 }}>
            <X size={18} />
          </button>
        )}
      </div>

      {/* Existing tokens */}
      {tokens.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <p style={{ fontSize: 11, fontWeight: 600, color: '#8098b8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
            Saved Accounts
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {tokens.map(t => (
              <div key={t.loginid} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '10px 12px', borderRadius: 8,
                background: activeAccount?.loginid === t.loginid ? '#00c2ff11' : '#131a27',
                border: `1px solid ${activeAccount?.loginid === t.loginid ? '#00c2ff44' : '#1e2d45'}`,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{
                    padding: '2px 8px', borderRadius: 100, fontSize: 10, fontWeight: 700,
                    background: t.isDemo ? '#ffd60022' : '#00e67622',
                    color: t.isDemo ? '#ffd600' : '#00e676',
                    border: `1px solid ${t.isDemo ? '#ffd60044' : '#00e67644'}`,
                  }}>
                    {t.isDemo ? 'DEMO' : 'REAL'}
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 500, color: '#e8f0fe' }}>{t.loginid}</span>
                  {activeAccount?.loginid === t.loginid && (
                    <CheckCircle2 size={14} color="#00c2ff" />
                  )}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {activeAccount?.loginid !== t.loginid && (
                    <button
                      onClick={() => handleSwitchAccount(t.token)}
                      disabled={loading}
                      style={{
                        padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                        background: '#00c2ff22', border: '1px solid #00c2ff44',
                        color: '#00c2ff', cursor: 'pointer',
                      }}
                    >
                      Switch
                    </button>
                  )}
                  <button
                    onClick={() => removeToken(t.loginid)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ff3d6b', padding: 2 }}
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add new token */}
      <div style={{
        background: '#0f1520', border: '1px solid #1e2d45', borderRadius: 10, padding: 16,
      }}>
        <p style={{ margin: '0 0 12px', fontSize: 13, fontWeight: 600, color: '#e8f0fe' }}>
          Add API Token
        </p>

        {/* Instructions */}
        <div style={{
          background: '#00c2ff0a', border: '1px solid #00c2ff22', borderRadius: 8,
          padding: 12, marginBottom: 14,
        }}>
          <p style={{ margin: 0, fontSize: 12, color: '#8098b8', lineHeight: 1.6 }}>
            1. Go to <strong style={{ color: '#00c2ff' }}>app.deriv.com → Account Settings → API Token</strong><br />
            2. Create a token with <strong style={{ color: '#e8f0fe' }}>Read + Trade</strong> permissions<br />
            3. Paste the token below
          </p>
        </div>

        <div style={{ position: 'relative', marginBottom: 14 }}>
          <input
            type={showToken ? 'text' : 'password'}
            value={token}
            onChange={e => setToken(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleConnect()}
            placeholder="Paste your API token here..."
            style={{
              width: '100%', padding: '11px 44px 11px 14px',
              background: '#131a27', border: '1px solid #2a3f5e',
              borderRadius: 8, color: '#e8f0fe', fontSize: 13,
              outline: 'none', fontFamily: 'JetBrains Mono, monospace',
            }}
          />
          <button
            onClick={() => setShowToken(!showToken)}
            style={{
              position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
              background: 'none', border: 'none', cursor: 'pointer', color: '#8098b8',
            }}
          >
            {showToken ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>

        <button
          onClick={handleConnect}
          disabled={loading || !token.trim()}
          style={{
            width: '100%', padding: '11px', borderRadius: 8,
            background: loading || !token.trim() ? '#1e2d45' : 'linear-gradient(135deg, #00c2ff, #0070a0)',
            border: 'none', color: loading || !token.trim() ? '#3d5270' : '#fff',
            fontSize: 14, fontWeight: 700, cursor: loading || !token.trim() ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            transition: 'all 0.2s',
          }}
        >
          {loading ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Connecting...</> : <><Link2 size={16} /> Connect Account</>}
        </button>
      </div>

      {/* Security note */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 14 }}>
        <Shield size={12} color="#3d5270" />
        <p style={{ margin: 0, fontSize: 11, color: '#3d5270', lineHeight: 1.4 }}>
          Tokens stored locally in your browser only. Never shared with external servers.
        </p>
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
