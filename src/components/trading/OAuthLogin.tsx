'use client';
/**
 * OAuth Login — "Login with Deriv"
 *
 * Uses app_id=16929 (app.deriv.com) which is Deriv's own app and
 * supports passing redirect_uri directly in the URL — no app registration needed.
 * After login Deriv redirects to /callback with all account tokens.
 */
import { useState } from 'react';
import { Loader2, ShieldCheck, ExternalLink } from 'lucide-react';

const OAUTH_BASE = 'https://oauth.deriv.com/oauth2/authorize';

// Use env var if set (user's own registered app), otherwise use Deriv's own app_id
// app_id=16929 = app.deriv.com — works with redirect_uri param for any domain
const APP_ID = process.env.NEXT_PUBLIC_DERIV_APP_ID || '16929';

function buildOAuthURL(): string {
  const redirectUri = typeof window !== 'undefined'
    ? `${window.location.origin}/callback`
    : '';

  const params = new URLSearchParams({
    app_id: APP_ID,
    l: 'EN',
    brand: 'deriv',
  });

  // Pass redirect_uri so Deriv knows where to send the user back
  if (redirectUri) {
    params.set('redirect_uri', redirectUri);
  }

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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

      {/* Login button — always enabled, no setup required */}
      <button
        onClick={handleLogin}
        disabled={loading}
        style={{
          width: '100%',
          padding: '14px 20px',
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
          boxShadow: loading ? 'none' : '0 4px 24px rgba(255,68,79,0.35)',
          letterSpacing: '-0.01em',
        }}
      >
        {loading ? (
          <>
            <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
            Redirecting to Deriv…
          </>
        ) : (
          <>
            {/* Deriv D logo */}
            <span style={{
              width: 26, height: 26, borderRadius: 6,
              background: 'rgba(255,255,255,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 14, fontWeight: 900, flexShrink: 0,
            }}>D</span>
            Login with Deriv
            <ExternalLink size={14} style={{ opacity: 0.7, marginLeft: 2 }} />
          </>
        )}
      </button>

      {/* Trust note */}
      <div style={{
        display: 'flex', alignItems: 'flex-start', gap: 7,
        padding: '9px 12px', borderRadius: 8,
        background: '#00e67608', border: '1px solid #00e67622',
      }}>
        <ShieldCheck size={13} color="#00e676" style={{ flexShrink: 0, marginTop: 1 }} />
        <p style={{ margin: 0, fontSize: 11, color: '#8098b8', lineHeight: 1.6 }}>
          You will be taken to <strong style={{ color: '#e8f0fe' }}>Deriv's official website</strong> to log in.
          Your credentials are never entered in or seen by this app.
          After login you will be sent back here automatically.
        </p>
      </div>

      <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
