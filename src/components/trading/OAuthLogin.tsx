'use client';
/**
 * Login with Deriv — OAuth 2.0 button
 * Redirects to Deriv's official OAuth page.
 * After login, Deriv sends all accounts + tokens to /callback.
 *
 * IMPORTANT: For the OAuth redirect to work after login,
 * your app_id must be registered at developers.deriv.com
 * with this site's URL as the OAuth redirect URI.
 */
import { useState } from 'react';
import { ExternalLink, Loader2, ShieldCheck, Info } from 'lucide-react';

const OAUTH_BASE = 'https://oauth.deriv.com/oauth2/authorize';
const APP_ID = process.env.NEXT_PUBLIC_DERIV_APP_ID || '36544';

function buildOAuthURL(): string {
  if (typeof window === 'undefined') return OAUTH_BASE;
  const redirectUri = `${window.location.origin}/callback`;
  const params = new URLSearchParams({
    app_id: APP_ID,
    l: 'EN',
    brand: 'deriv',
    redirect_uri: redirectUri,
  });
  return `${OAUTH_BASE}?${params.toString()}`;
}

export default function OAuthLogin() {
  const [loading, setLoading] = useState(false);

  const handleLogin = () => {
    setLoading(true);
    window.location.href = buildOAuthURL();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {/* Primary login button */}
      <button
        onClick={handleLogin}
        disabled={loading}
        style={{
          width: '100%', padding: '14px 20px', borderRadius: 10,
          background: loading ? '#1e2d45' : 'linear-gradient(135deg,#ff444f,#c90000)',
          border: 'none',
          color: loading ? '#3d5270' : '#fff',
          fontSize: 15, fontWeight: 700,
          cursor: loading ? 'not-allowed' : 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
          boxShadow: loading ? 'none' : '0 4px 24px rgba(255,68,79,0.3)',
          transition: 'all 0.2s',
        }}
      >
        {loading ? (
          <><Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> Redirecting to Deriv…</>
        ) : (
          <>
            <span style={{ width: 26, height: 26, borderRadius: 6, background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 900, flexShrink: 0 }}>D</span>
            Login with Deriv
            <ExternalLink size={14} style={{ opacity: 0.7 }} />
          </>
        )}
      </button>

      {/* Security note */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 7, padding: '9px 12px', borderRadius: 8, background: '#00e67608', border: '1px solid #00e67622' }}>
        <ShieldCheck size={13} color="#00e676" style={{ flexShrink: 0, marginTop: 1 }} />
        <p style={{ margin: 0, fontSize: 11, color: '#8098b8', lineHeight: 1.6 }}>
          You log in on <strong style={{ color: '#e8f0fe' }}>Deriv's official site</strong>. Your password never touches this app. After login you are automatically redirected back here with all your accounts connected.
        </p>
      </div>

      {/* Setup note for custom app_id */}
      {APP_ID === '36544' && (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 7, padding: '8px 12px', borderRadius: 8, background: '#ffd60008', border: '1px solid #ffd60022' }}>
          <Info size={12} color="#ffd600" style={{ flexShrink: 0, marginTop: 1 }} />
          <p style={{ margin: 0, fontSize: 10, color: '#8098b8', lineHeight: 1.5 }}>
            For production: register your own app_id at{' '}
            <a href="https://developers.deriv.com" target="_blank" rel="noopener noreferrer" style={{ color: '#ffd600' }}>developers.deriv.com</a>
            {' '}and set <code style={{ color: '#e8f0fe', background: '#1e2d45', padding: '1px 4px', borderRadius: 3 }}>NEXT_PUBLIC_DERIV_APP_ID</code> in Vercel.
          </p>
        </div>
      )}

      <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
