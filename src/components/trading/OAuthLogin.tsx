'use client';
/**
 * Login with Deriv — Official OAuth 2.0 (simple flow)
 *
 * Per Deriv docs (developers.deriv.com/docs/oauth):
 *   1. Redirect user to: https://oauth.deriv.com/oauth2/authorize?app_id=YOUR_APP_ID
 *   2. User logs in / signs up on Deriv's own page
 *   3. Deriv redirects to YOUR registered "Website URL" with:
 *      ?acct1=CR123&token1=xxx&cur1=USD&acct2=VRTC456&token2=yyy&cur2=USD
 *   4. Your app reads these tokens from the URL
 *
 * REQUIREMENT: app_id must be registered at developers.deriv.com with
 * "Website URL" (OAuth Redirect URL) set to this exact site's /callback URL.
 * This is mandatory — Deriv only redirects to pre-registered URLs.
 */
import { useState } from 'react';
import { ExternalLink, Loader2, ShieldCheck, AlertTriangle } from 'lucide-react';

const APP_ID = process.env.NEXT_PUBLIC_DERIV_APP_ID;

function buildOAuthURL(): string {
  if (!APP_ID) return '';
  // Per official docs: simple flow only needs app_id — Deriv uses the
  // pre-registered Website URL automatically as the redirect target.
  const params = new URLSearchParams({ app_id: APP_ID, l: 'EN' });
  return `https://oauth.deriv.com/oauth2/authorize?${params.toString()}`;
}

export default function OAuthLogin() {
  const [loading, setLoading] = useState(false);
  const oauthUrl = buildOAuthURL();
  const notConfigured = !APP_ID;

  const handleLogin = () => {
    if (notConfigured) return;
    setLoading(true);
    window.location.href = oauthUrl;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <button
        onClick={handleLogin}
        disabled={loading || notConfigured}
        style={{
          width: '100%', padding: '14px 20px', borderRadius: 10,
          background: notConfigured
            ? '#1e2d4580'
            : loading
              ? '#1e2d45'
              : 'linear-gradient(135deg,#ff444f,#c90000)',
          border: 'none',
          color: notConfigured || loading ? '#3d5270' : '#fff',
          fontSize: 15, fontWeight: 700,
          cursor: notConfigured || loading ? 'not-allowed' : 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
          boxShadow: notConfigured || loading ? 'none' : '0 4px 24px rgba(255,68,79,0.3)',
          transition: 'all 0.2s',
        }}
      >
        {loading ? (
          <><Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> Redirecting to Deriv…</>
        ) : (
          <>
            <span style={{ width: 26, height: 26, borderRadius: 6, background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 900, flexShrink: 0 }}>D</span>
            Login or Sign Up with Deriv
            <ExternalLink size={14} style={{ opacity: 0.7 }} />
          </>
        )}
      </button>

      {notConfigured ? (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 7, padding: '10px 12px', borderRadius: 8, background: '#ff3d6b0d', border: '1px solid #ff3d6b33' }}>
          <AlertTriangle size={13} color="#ff3d6b" style={{ flexShrink: 0, marginTop: 1 }} />
          <p style={{ margin: 0, fontSize: 11, color: '#ff3d6b', lineHeight: 1.6 }}>
            App ID not configured. Add <code style={{ background: '#1e2d45', padding: '1px 4px', borderRadius: 3, color: '#e8f0fe' }}>NEXT_PUBLIC_DERIV_APP_ID</code> in Vercel environment variables. See the setup guide below.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 7, padding: '9px 12px', borderRadius: 8, background: '#00e67608', border: '1px solid #00e67622' }}>
          <ShieldCheck size={13} color="#00e676" style={{ flexShrink: 0, marginTop: 1 }} />
          <p style={{ margin: 0, fontSize: 11, color: '#8098b8', lineHeight: 1.6 }}>
            You'll log in or create an account on <strong style={{ color: '#e8f0fe' }}>Deriv's official site</strong>. Your password never touches this app. You'll be redirected back here automatically once logged in.
          </p>
        </div>
      )}

      <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
