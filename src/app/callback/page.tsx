'use client';
/**
 * OAuth Callback — /callback
 *
 * Deriv redirects here (per registered Website URL) after login with:
 * ?acct1=CR799393&token1=a1-xxx&cur1=USD&acct2=VRTC1859315&token2=a1-yyy&cur2=USD&state=
 *
 * Official format confirmed via developers.deriv.com/docs/oauth
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
    const loginidRaw = params.get(`acct${i}`) || '';
    const token = params.get(`token${i}`) || '';
    const currency = (params.get(`cur${i}`) || 'USD').toUpperCase();
    if (loginidRaw && token) {
      const loginid = loginidRaw.toUpperCase();
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

    if (!search || !search.includes('token1')) {
      setStatus('error');
      setMessage(
        'No account tokens received from Deriv.\n\n' +
        'This usually means login was cancelled, or the redirect URL ' +
        'registered at developers.deriv.com does not exactly match this page.'
      );
      return;
    }

    const parsed = parseCallbackParams(search);

    if (parsed.length === 0) {
      setStatus('error');
      setMessage('Could not parse account tokens from the callback URL. Please try again.');
      return;
    }

    parsed.forEach(acct => {
      addToken(acct.loginid, acct.token, acct.isDemo, acct.currency);
    });

    setAccounts(parsed);
    setStatus('success');
    setMessage(`${parsed.length} account${parsed.length > 1 ? 's' : ''} connected successfully`);

    setTimeout(() => router.push('/'), 1800);
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
        <div style={{
          width: 60, height: 60, borderRadius: 16,
          background: 'linear-gradient(135deg, #00c2ff, #0050a0)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 24px', fontSize: 24, fontWeight: 900, color: '#fff',
        }}>AI</div>

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
                    {acct.isDemo ? <Shield size={15} color="#ffd600" /> : <TrendingUp size={15} color="#00e676" />}
                  </div>
                  <div>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#e8f0fe' }}>{acct.loginid}</p>
                    <p style={{ margin: 0, fontSize: 11, color: '#8098b8' }}>{acct.isDemo ? 'Demo' : 'Real'} • {acct.currency}</p>
                  </div>
                </div>
                <CheckCircle2 size={16} color={acct.isDemo ? '#ffd600' : '#00e676'} />
              </div>
            ))}
          </div>
        )}

        {status === 'success' && (
          <p style={{ margin: 0, fontSize: 12, color: '#3d5270' }}>Redirecting to trading app…</p>
        )}

        {status === 'error' && (
          <button onClick={() => router.push('/')} style={{
            padding: '11px 24px', borderRadius: 8, border: 'none',
            background: 'linear-gradient(135deg,#00c2ff,#0070a0)',
            color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer',
          }}>Back to App</button>
        )}
      </div>
      <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
