'use client';
/**
 * OAuth Login Button — "Login with Deriv"
 * Redirects to Deriv's OAuth page, which returns all user accounts.
 * No credentials ever touch our server.
 */
import { useState } from 'react';
import { ExternalLink, Loader2, ShieldCheck } from 'lucide-react';

// Deriv OAuth endpoint
const OAUTH_BASE = 'https://oauth.deriv.com/oauth2/authorize';

// app_id=36544 (SmartTrader) supports OAuth redirect to any domain.
// Users can override with their own registered app_id via env var.
const getAppId = () =>
  process.env.NEXT_PUBLIC_DERIV_APP_ID || '36544';

function buildOAuthURL(): string {
  const appId = getAppId();
  // Redirect back to /callback on the current domain
  const redirectUri = typeof window !== 'undefined'
    ? `${window.location.origin}/callback`
    : '';
  const params = new URLSearchParams({
    app_id: appId,
    l: 'EN',
    brand: 'deriv',
  });
  if (redirectUri) params.set('redirect_uri', redirectUri);
  return `${OAUTH_BASE}?${params.toString()}`;
}

export default function OAuthLogin() {
  const [loading, setLoading] = useState(false);

  const handleLogin = () => {
    setLoading(true);
    const url = buildOAuthURL();
    window.location.href = url;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Main OAuth button */}
      <button
        onClick={handleLogin}
        disabled={loading}
        style={{
          width: '100%',
          padding: '13px 20px',
          borderRadius: 10,
          background: loading
            ? '#1e2d45'
            : 'linear-gradient(135deg, #ff444f, #c90000)',
          border: 'none',
          color: loading ? '#3d5270' : '#fff',
          fontSize: 15,
          fontWeight: 700,
          cursor: loading ? 'not-allowed' : 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 10,
          transition: 'all 0.2s',
          boxShadow: loading ? 'none' : '0 4px 20px rgba(255,68,79,0.3)',
        }}
      >
        {loading ? (
          <><Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> Redirecting to Deriv…</>
        ) : (
          <>
            {/* Deriv D logo */}
            <span style={{
              width: 24, height: 24, borderRadius: 6,
              background: 'rgba(255,255,255,0.25)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 13, fontWeight: 900, letterSpacing: '-1px',
              flexShrink: 0,
            }}>D</span>
            Login with Deriv
            <ExternalLink size={15} style={{ marginLeft: 2, opacity: 0.8 }} />
          </>
        )}
      </button>

      {/* Trust note */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '8px 12px', borderRadius: 8,
        background: '#00e67608', border: '1px solid #00e67622',
      }}>
        <ShieldCheck size={13} color="#00e676" style={{ flexShrink: 0 }} />
        <p style={{ margin: 0, fontSize: 11, color: '#8098b8', lineHeight: 1.5 }}>
          You will log in directly on <strong style={{ color: '#e8f0fe' }}>Deriv's secure website</strong>. Your credentials are never seen by this app.
        </p>
      </div>

      <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
