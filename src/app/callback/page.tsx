'use client';
/**
 * OAuth Callback Page — /callback
 * Deriv redirects here after login with:
 * ?acct1=CR123&token1=pat_xxx&cur1=USD&acct2=VRTC123&token2=pat_yyy&cur2=USD
 * 
 * This page parses all accounts, stores them, then redirects to app root
 * where user picks which account to trade with.
 */
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTradingStore } from '@/store/trading-store';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

interface ParsedAccount {
  loginid: string;
  token: string;
  currency: string;
  isDemo: boolean;
}

function parseOAuthParams(search: string): ParsedAccount[] {
  const params = new URLSearchParams(search);
  const accounts: ParsedAccount[] = [];
  let i = 1;
  while (params.has(`acct${i}`)) {
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
}

export default function CallbackPage() {
  const router = useRouter();
  const { addToken } = useTradingStore();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [message, setMessage] = useState('Processing login…');
  const [accounts, setAccounts] = useState<ParsedAccount[]>([]);

  useEffect(() => {
    const search = window.location.search;
    if (!search) {
      setStatus('error');
      setMessage('No account data received from Deriv. Please try logging in again.');
      return;
    }

    const parsed = parseOAuthParams(search);

    if (parsed.length === 0) {
      setStatus('error');
      setMessage('Could not read account data from Deriv callback. Please try again.');
      return;
    }

    // Store all accounts
    parsed.forEach(acct => {
      addToken(acct.loginid, acct.token, acct.isDemo);
    });

    setAccounts(parsed);
    setStatus('success');
    setMessage(`${parsed.length} account${parsed.length > 1 ? 's' : ''} connected!`);

    // Redirect to main app after short delay
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
        borderRadius: 16, padding: '40px 32px', maxWidth: 420, width: '100%',
        textAlign: 'center',
      }}>
        {/* Logo */}
        <div style={{
          width: 56, height: 56, borderRadius: 14,
          background: 'linear-gradient(135deg, #00c2ff, #0070a0)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 20px', fontSize: 22, fontWeight: 900, color: '#fff',
        }}>AI</div>

        {/* Status icon */}
        <div style={{ marginBottom: 16 }}>
          {status === 'processing' && (
            <Loader2 size={40} color="#00c2ff" style={{ animation: 'spin 1s linear infinite' }} />
          )}
          {status === 'success' && <CheckCircle2 size={40} color="#00e676" />}
          {status === 'error' && <AlertCircle size={40} color="#ff3d6b" />}
        </div>

        <h2 style={{ margin: '0 0 8px', fontSize: 20, fontWeight: 800, color: '#e8f0fe' }}>
          {status === 'processing' && 'Connecting Your Account…'}
          {status === 'success' && 'Login Successful!'}
          {status === 'error' && 'Login Failed'}
        </h2>

        <p style={{ margin: '0 0 24px', fontSize: 14, color: '#8098b8', lineHeight: 1.6 }}>
          {message}
        </p>

        {/* Show connected accounts */}
        {status === 'success' && accounts.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
            {accounts.map(acct => (
              <div key={acct.loginid} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '10px 14px', borderRadius: 8,
                background: '#0f1520', border: '1px solid #1e2d45',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{
                    padding: '2px 8px', borderRadius: 100, fontSize: 10, fontWeight: 700,
                    background: acct.isDemo ? '#ffd60022' : '#00e67622',
                    color: acct.isDemo ? '#ffd600' : '#00e676',
                    border: `1px solid ${acct.isDemo ? '#ffd60044' : '#00e67644'}`,
                  }}>{acct.isDemo ? 'DEMO' : 'REAL'}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#e8f0fe' }}>{acct.loginid}</span>
                </div>
                <span style={{ fontSize: 12, color: '#8098b8' }}>USD</span>
              </div>
            ))}
          </div>
        )}

        {status === 'success' && (
          <p style={{ margin: 0, fontSize: 12, color: '#3d5270' }}>
            Redirecting to the trading app…
          </p>
        )}

        {status === 'error' && (
          <button
            onClick={() => router.push('/')}
            style={{
              padding: '10px 24px', borderRadius: 8,
              background: 'linear-gradient(135deg, #00c2ff, #0070a0)',
              border: 'none', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer',
            }}
          >
            Back to App
          </button>
        )}
      </div>
      <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
