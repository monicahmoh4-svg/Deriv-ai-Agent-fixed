'use client';
/**
 * Login with Deriv — Popup OAuth
 *
 * Opens Deriv OAuth in a popup window.
 * Polls the popup URL every 200ms.
 * When Deriv redirects with tokens in URL (?acct1=...&token1=...),
 * we extract them, close the popup, and connect the accounts.
 *
 * This works with ANY app_id — no custom redirect URI registration needed.
 * The tokens appear in the popup's URL regardless of where Deriv redirects.
 */
import { useState, useCallback } from 'react';
import { ExternalLink, Loader2, ShieldCheck, CheckCircle2, AlertCircle } from 'lucide-react';
import { useTradingStore } from '@/store/trading-store';

// Use registered app_id from env, fallback to 36544 (SmartTrader)
const APP_ID = process.env.NEXT_PUBLIC_DERIV_APP_ID || '36544';

// All possible Deriv OAuth redirect domains we might land on
const DERIV_DOMAINS = [
  'oauth.deriv.com',
  'smarttrader.deriv.com',
  'app.deriv.com',
  'deriv.com',
  'binary.com',
];

interface ParsedAccount {
  loginid: string;
  token: string;
  currency: string;
  isDemo: boolean;
}

function parseTokensFromURL(url: string): ParsedAccount[] {
  try {
    const urlObj = new URL(url);
    const params = urlObj.searchParams;
    const accounts: ParsedAccount[] = [];
    let i = 1;
    while (params.has(`acct${i}`) || params.has(`token${i}`)) {
      const loginid = params.get(`acct${i}`) || '';
      const token = params.get(`token${i}`) || '';
      const currency = params.get(`cur${i}`) || 'USD';
      if (loginid && token) {
        accounts.push({
          loginid,
          token,
          currency,
          isDemo: loginid.startsWith('VRTC') || loginid.startsWith('VR'),
        });
      }
      i++;
    }
    return accounts;
  } catch {
    return [];
  }
}

function urlHasTokens(url: string): boolean {
  try {
    return new URL(url).searchParams.has('token1');
  } catch {
    return false;
  }
}

export default function OAuthLogin() {
  const [status, setStatus] = useState<'idle' | 'waiting' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const { addToken } = useTradingStore();

  const handleLogin = useCallback(() => {
    setStatus('waiting');
    setMessage('Waiting for Deriv login…');

    // Build OAuth URL — use /callback as redirect if we have a registered app_id
    // Otherwise Deriv will redirect to its own domain (smarttrader.deriv.com etc)
    // Either way, tokens appear in the popup URL and we intercept them
    const redirectUri = typeof window !== 'undefined'
      ? `${window.location.origin}/callback`
      : '';

    const params = new URLSearchParams({
      app_id: APP_ID,
      l: 'EN',
      brand: 'deriv',
    });
    if (redirectUri) params.set('redirect_uri', redirectUri);

    const oauthUrl = `https://oauth.deriv.com/oauth2/authorize?${params.toString()}`;

    // Open popup
    const width = 500;
    const height = 650;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;

    const popup = window.open(
      oauthUrl,
      'deriv_oauth',
      `width=${width},height=${height},left=${left},top=${top},scrollbars=yes,resizable=yes`
    );

    if (!popup) {
      setStatus('error');
      setMessage('Popup blocked! Please allow popups for this site, then try again.');
      return;
    }

    // Poll popup URL every 200ms to detect when tokens appear
    let attempts = 0;
    const maxAttempts = 600; // 2 minutes timeout

    const poll = setInterval(() => {
      attempts++;

      // Check if popup was closed by user
      if (popup.closed) {
        clearInterval(poll);
        if (status !== 'success') {
          setStatus('error');
          setMessage('Login window was closed. Please try again.');
        }
        return;
      }

      // Timeout
      if (attempts > maxAttempts) {
        clearInterval(poll);
        popup.close();
        setStatus('error');
        setMessage('Login timed out. Please try again.');
        return;
      }

      // Try to read popup URL — will throw if cross-origin
      try {
        const popupUrl = popup.location.href;

        // Check if tokens are in the URL
        if (urlHasTokens(popupUrl)) {
          clearInterval(poll);

          const accounts = parseTokensFromURL(popupUrl);

          if (accounts.length > 0) {
            // Save all accounts
            accounts.forEach(acct => {
              addToken(acct.loginid, acct.token, acct.isDemo, acct.currency);
            });

            popup.close();
            setStatus('success');
            setMessage(
              `${accounts.length} account${accounts.length > 1 ? 's' : ''} connected! ` +
              `Select your account below to start trading.`
            );
          } else {
            popup.close();
            setStatus('error');
            setMessage('No account tokens received. Please try again.');
          }
          return;
        }

        // Also check if we're on /callback (custom redirect worked)
        if (popupUrl.includes('/callback') && popupUrl.includes('token')) {
          clearInterval(poll);
          const accounts = parseTokensFromURL(popupUrl);
          if (accounts.length > 0) {
            accounts.forEach(acct => addToken(acct.loginid, acct.token, acct.isDemo, acct.currency));
            popup.close();
            setStatus('success');
            setMessage(`${accounts.length} account${accounts.length > 1 ? 's' : ''} connected!`);
          } else {
            popup.close();
            setStatus('error');
            setMessage('Could not read tokens from callback. Please use the manual token method.');
          }
        }
      } catch {
        // Cross-origin error — popup is on a different domain (oauth.deriv.com)
        // This is normal during login — keep polling
      }
    }, 200);
  }, [addToken, status]);

  const reset = () => { setStatus('idle'); setMessage(''); };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

      {/* Success state */}
      {status === 'success' && (
        <div style={{
          padding: '14px 16px', borderRadius: 10,
          background: '#00e67611', border: '1px solid #00e67633',
          display: 'flex', alignItems: 'flex-start', gap: 10,
        }}>
          <CheckCircle2 size={18} color="#00e676" style={{ flexShrink: 0, marginTop: 1 }} />
          <div>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#00e676' }}>Login Successful!</p>
            <p style={{ margin: '3px 0 0', fontSize: 12, color: '#8098b8', lineHeight: 1.5 }}>{message}</p>
          </div>
        </div>
      )}

      {/* Error state */}
      {status === 'error' && (
        <div style={{
          padding: '12px 14px', borderRadius: 10,
          background: '#ff3d6b0d', border: '1px solid #ff3d6b33',
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
            <AlertCircle size={15} color="#ff3d6b" style={{ flexShrink: 0, marginTop: 1 }} />
            <p style={{ margin: 0, fontSize: 12, color: '#ff3d6b', lineHeight: 1.5 }}>{message}</p>
          </div>
          <button onClick={reset} style={{
            marginTop: 10, padding: '5px 12px', borderRadius: 6, border: '1px solid #ff3d6b44',
            background: 'none', color: '#ff3d6b', fontSize: 11, fontWeight: 600, cursor: 'pointer',
          }}>Try Again</button>
        </div>
      )}

      {/* Login button */}
      {status !== 'success' && (
        <button
          onClick={handleLogin}
          disabled={status === 'waiting'}
          style={{
            width: '100%', padding: '14px 20px', borderRadius: 10,
            background: status === 'waiting'
              ? '#1e2d45'
              : 'linear-gradient(135deg,#ff444f,#c90000)',
            border: 'none',
            color: status === 'waiting' ? '#3d5270' : '#fff',
            fontSize: 15, fontWeight: 700,
            cursor: status === 'waiting' ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            boxShadow: status === 'waiting' ? 'none' : '0 4px 24px rgba(255,68,79,0.3)',
            transition: 'all 0.2s',
          }}
        >
          {status === 'waiting' ? (
            <>
              <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
              Waiting for Deriv login…
            </>
          ) : (
            <>
              <span style={{
                width: 26, height: 26, borderRadius: 6,
                background: 'rgba(255,255,255,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 14, fontWeight: 900, flexShrink: 0,
              }}>D</span>
              Login with Deriv
              <ExternalLink size={14} style={{ opacity: 0.7 }} />
            </>
          )}
        </button>
      )}

      {/* Waiting hint */}
      {status === 'waiting' && (
        <p style={{ margin: 0, fontSize: 11, color: '#3d5270', textAlign: 'center', lineHeight: 1.5 }}>
          A Deriv login window has opened. Complete login there — this page will update automatically.
          <br />If the popup was blocked, <button onClick={reset} style={{ background: 'none', border: 'none', color: '#00c2ff', fontSize: 11, cursor: 'pointer', padding: 0, textDecoration: 'underline' }}>click here</button> and allow popups.
        </p>
      )}

      {/* Security note */}
      {status === 'idle' && (
        <div style={{
          display: 'flex', alignItems: 'flex-start', gap: 7,
          padding: '9px 12px', borderRadius: 8,
          background: '#00e67608', border: '1px solid #00e67622',
        }}>
          <ShieldCheck size={13} color="#00e676" style={{ flexShrink: 0, marginTop: 1 }} />
          <p style={{ margin: 0, fontSize: 11, color: '#8098b8', lineHeight: 1.6 }}>
            A secure popup opens on <strong style={{ color: '#e8f0fe' }}>Deriv's official site</strong>.
            Your password never touches this app. The popup closes automatically after login.
          </p>
        </div>
      )}

      <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
