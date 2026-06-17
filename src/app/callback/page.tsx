'use client';
/**
 * OAuth Callback — /callback
 * 
 * Deriv redirects here after login with:
 * ?acct1=CR123&token1=pat_xxx&cur1=USD&acct2=VRTC123&token2=pat_yyy&cur2=USD
 *
 * We store all accounts then redirect to app where user picks which to trade.
 * Official flow: token is used as Bearer to get OTP → authenticated WS URL.
 */
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTradingStore } from '@/store/trading-store';
import { Loader2, CheckCircle2, AlertCircle, TrendingUp, Shield } from 'lucide-react';

interface ParsedAccount {
  loginid: string;
  token: string;
  currency: string;
  isDemo: boolean;
}

function parseCallbackParams(search: string): ParsedAccount[] {
  const params = new URLSearchParams(search);
  const accounts: ParsedAccount[] = [];

  let i = 1;
  while (params.has(`acct${i}`)) {
    const loginid = params.get(`acct${i}`) || '';
    const token = params.get(`token${i}`) || '';
    const currency = params.get(`cur${i}`) || 'USD';
    if (loginid && token) {
      const isDemo = loginid.startsWith('VRTC') || loginid.startsWith('VR');
      accounts.push({ loginid, token, currency, isDemo });
    }
    i++;
  }
  return accounts;
}

export default function CallbackPage() {
  const router = useRouter();
  const { addToken } = useTradingStore();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [message, setMessage] = useState('Processing Deriv login…');
  const [accounts, setAccounts] = useState<ParsedAccount[]>([]);

  useEffect(() => {
    const search = window.location.search;

    if (!search) {
      setStatus('error');
      setMessage('No account data received. The OAuth login may have been cancelled. Please try again.');
      return;
    }

    const parsed = parseCallbackParams(search);

    if (parsed.length === 0) {
      setStatus('error');
      setMessage(
        'Could not read account tokens from Deriv callback.\n' +
        'This may be due to an app_id mismatch. Ensure NEXT_PUBLIC_DERIV_APP_ID ' +
        'is registered at developers.deriv.com with this site as an OAuth redirect URI.'
      );
      return;
    }

    // Save all accounts to store
    parsed.forEach(acct => {
      addToken(acct.loginid, acct.token, acct.isDemo, acct.currency);
    });

    setAccounts(parsed);
    setStatus('success');
    setMessage(`${parsed.length} account${parsed.length > 1 ? 's' : ''} ready`);

    // Redirect to main app after 2s
    setTimeout(() => router.push('/'), 2000);
  }, [addToken, router]);

  return (
    <div style={{
      minHeight: '100vh', background: '#0a0d14',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'Inter, sans-serif', padding: 20,
    }}>
      <div style={{
        background: '#131a27', border: '1px solid #1e2d45',
        borderRadius: 20, padding: '40px 32px', maxWidth: 440, width: '100%',
        textAlign: 'center',
      }}>
        {/* Logo */}
        <div style={{
          width: 60, height: 60, borderRadius: 16,
          background: 'linear-gradient(135deg, #00c2ff, #0050a0)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 24px', fontSize: 24, fontWeight: 900, color: '#fff',
        }}>AI</div>

        {/* Icon */}
        <div style={{ marginBottom: 16 }}>
          {status === 'processing' && <Loader2 size={44} color="#00c2ff" style={{ animation: 'spin 1s linear infinite' }} />}
          {status === 'success' && <CheckCircle2 size={44} color="#00e676" />}
          {status === 'error' && <AlertCircle size={44} color="#ff3d6b" />}
        </div>

        <h2 style={{ margin: '0 0 8px', fontSize: 22, fontWeight: 800, color: '#e8f0fe' }}>
          {status === 'processing' && 'Connecting…'}
          {status === 'success' && 'Login Successful!'}
          {status === 'error' && 'Login Error'}
        </h2>

        <p style={{ margin: '0 0 24px', fontSize: 14, color: '#8098b8', lineHeight: 1.6, whiteSpace: 'pre-line' }}>
          {message}
        </p>

        {/* Connected accounts */}
        {status === 'success' && accounts.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20, textAlign: 'left' }}>
            {accounts.map(acct => (
              <div key={acct.loginid} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '12px 14px', borderRadius: 10,
                background: '#0f1520', border: '1px solid #1e2d45',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: 8,
                    background: acct.isDemo ? '#ffd60022' : '#00e67622',
                    border: `1px solid ${acct.isDemo ? '#ffd60044' : '#00e67644'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {acct.isDemo
                      ? <Shield size={15} color="#ffd600" />
                      : <TrendingUp size={15} color="#00e676" />}
                  </div>
                  <div>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#e8f0fe' }}>{acct.loginid}</p>
                    <p style={{ margin: 0, fontSize: 11, color: '#8098b8' }}>{acct.isDemo ? 'Demo Account' : 'Real Account'} • {acct.currency}</p>
                  </div>
                </div>
                <CheckCircle2 size={16} color={acct.isDemo ? '#ffd600' : '#00e676'} />
              </div>
            ))}
          </div>
        )}

        {status === 'success' && (
          <p style={{ margin: 0, fontSize: 12, color: '#3d5270' }}>
            Redirecting to trading app…
          </p>
        )}

        {status === 'error' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button onClick={() => router.push('/')} style={{
              padding: '11px 24px', borderRadius: 8, border: 'none',
              background: 'linear-gradient(135deg,#00c2ff,#0070a0)',
              color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer',
            }}>Back to App</button>
            <p style={{ margin: 0, fontSize: 11, color: '#3d5270' }}>
              Make sure your app_id is registered at developers.deriv.com
            </p>
          </div>
        )}
      </div>
      <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
