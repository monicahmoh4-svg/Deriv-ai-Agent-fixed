'use client';
/**
 * Setup Guide — /setup
 * Walks the site owner through registering their app at developers.deriv.com
 * so OAuth login works exactly like production third-party Deriv apps.
 */
import { useState } from 'react';
import { ExternalLink, Copy, CheckCircle2, ArrowRight } from 'lucide-react';
import Link from 'next/link';

function CopyField({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div style={{ marginBottom: 14 }}>
      <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 600, color: '#8098b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</p>
      <div style={{ display: 'flex', gap: 8 }}>
        <div style={{
          flex: 1, padding: '10px 14px', background: '#0a0d14',
          border: '1px solid #2a3f5e', borderRadius: 8,
          color: '#00c2ff', fontSize: 13, fontFamily: 'JetBrains Mono, monospace',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>{value}</div>
        <button onClick={handleCopy} style={{
          padding: '0 16px', borderRadius: 8, border: '1px solid #2a3f5e',
          background: copied ? '#00e67622' : '#131a27',
          color: copied ? '#00e676' : '#8098b8',
          cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600,
        }}>
          {copied ? <CheckCircle2 size={14} /> : <Copy size={14} />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
    </div>
  );
}

function Step({ num, title, children }: { num: number; title: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', gap: 16, marginBottom: 28 }}>
      <div style={{
        width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
        background: 'linear-gradient(135deg,#00c2ff,#0070a0)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 14, fontWeight: 800, color: '#fff',
      }}>{num}</div>
      <div style={{ flex: 1 }}>
        <h3 style={{ margin: '0 0 10px', fontSize: 16, fontWeight: 700, color: '#e8f0fe' }}>{title}</h3>
        {children}
      </div>
    </div>
  );
}

export default function SetupPage() {
  const [siteUrl, setSiteUrl] = useState('');

  const redirectUrl = siteUrl ? `${siteUrl.replace(/\/$/, '')}/callback` : 'https://your-app.vercel.app/callback';

  return (
    <div style={{ minHeight: '100vh', background: '#0a0d14', fontFamily: 'Inter, sans-serif', padding: '40px 20px' }}>
      <div style={{ maxWidth: 680, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ marginBottom: 36 }}>
          <Link href="/" style={{ color: '#00c2ff', fontSize: 13, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            ← Back to App
          </Link>
          <h1 style={{ margin: '16px 0 8px', fontSize: 28, fontWeight: 800, color: '#e8f0fe' }}>
            Deriv OAuth Setup Guide
          </h1>
          <p style={{ margin: 0, fontSize: 14, color: '#8098b8', lineHeight: 1.6 }}>
            Register your app at developers.deriv.com so "Login with Deriv" redirects back to this site correctly. Takes about 3 minutes.
          </p>
        </div>

        {/* Site URL input */}
        <div className="card" style={{ background: '#131a27', border: '1px solid #1e2d45', borderRadius: 12, padding: 20, marginBottom: 28 }}>
          <p style={{ margin: '0 0 8px', fontSize: 13, fontWeight: 600, color: '#e8f0fe' }}>Your deployed site URL</p>
          <input
            type="text"
            value={siteUrl}
            onChange={e => setSiteUrl(e.target.value)}
            placeholder="https://your-app.vercel.app"
            style={{
              width: '100%', padding: '10px 14px', background: '#0a0d14',
              border: '1px solid #2a3f5e', borderRadius: 8, color: '#e8f0fe',
              fontSize: 13, outline: 'none', fontFamily: 'JetBrains Mono, monospace',
            }}
          />
        </div>

        {/* Steps */}
        <div style={{ background: '#131a27', border: '1px solid #1e2d45', borderRadius: 12, padding: 28 }}>

          <Step num={1} title="Create a Deriv API developer account">
            <p style={{ margin: '0 0 12px', fontSize: 13, color: '#8098b8', lineHeight: 1.6 }}>
              Go to the Deriv API developer dashboard and log in with your existing Deriv account.
            </p>
            <a href="https://developers.deriv.com" target="_blank" rel="noopener noreferrer" style={{
              display: 'inline-flex', alignItems: 'center', gap: 7, padding: '9px 16px',
              background: '#00c2ff15', border: '1px solid #00c2ff44', borderRadius: 8,
              color: '#00c2ff', fontSize: 13, fontWeight: 600, textDecoration: 'none',
            }}>
              Open developers.deriv.com <ExternalLink size={13} />
            </a>
          </Step>

          <Step num={2} title="Register a new application">
            <p style={{ margin: '0 0 8px', fontSize: 13, color: '#8098b8', lineHeight: 1.6 }}>
              In the Dashboard, click <strong style={{ color: '#e8f0fe' }}>Register Application</strong> → choose type <strong style={{ color: '#e8f0fe' }}>OAuth</strong> (not PAT).
            </p>
            <p style={{ margin: 0, fontSize: 13, color: '#8098b8', lineHeight: 1.6 }}>
              Fill in:
            </p>
            <ul style={{ margin: '6px 0 0', paddingLeft: 18, fontSize: 13, color: '#8098b8', lineHeight: 1.8 }}>
              <li>App Name: <code style={{ color: '#e8f0fe', background: '#0a0d14', padding: '1px 5px', borderRadius: 3 }}>DerivAI Agent</code></li>
              <li>App Type: <code style={{ color: '#e8f0fe', background: '#0a0d14', padding: '1px 5px', borderRadius: 3 }}>OAuth</code></li>
            </ul>
          </Step>

          <Step num={3} title='Set the "Website URL" (OAuth redirect)'>
            <p style={{ margin: '0 0 12px', fontSize: 13, color: '#8098b8', lineHeight: 1.6 }}>
              This is the critical step — Deriv only redirects back to this exact URL after login.
            </p>
            <CopyField label="Website URL / OAuth Redirect URL" value={redirectUrl} />
          </Step>

          <Step num={4} title="Copy your App ID">
            <p style={{ margin: '0 0 12px', fontSize: 13, color: '#8098b8', lineHeight: 1.6 }}>
              After saving, Deriv shows your new <strong style={{ color: '#e8f0fe' }}>App ID</strong> — a short number like <code style={{ color: '#ffd600', background: '#0a0d14', padding: '1px 5px', borderRadius: 3 }}>98765</code>.
            </p>
          </Step>

          <Step num={5} title="Add it to Vercel">
            <p style={{ margin: '0 0 12px', fontSize: 13, color: '#8098b8', lineHeight: 1.6 }}>
              Go to your Vercel project → <strong style={{ color: '#e8f0fe' }}>Settings → Environment Variables</strong> and add:
            </p>
            <CopyField label="Environment Variable Name" value="NEXT_PUBLIC_DERIV_APP_ID" />
            <p style={{ margin: '0 0 12px', fontSize: 12, color: '#8098b8' }}>Set its value to the App ID from step 4, then redeploy.</p>
          </Step>

          <div style={{
            marginTop: 8, padding: '16px 18px', borderRadius: 10,
            background: '#00e67611', border: '1px solid #00e67633',
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <CheckCircle2 size={20} color="#00e676" style={{ flexShrink: 0 }} />
            <p style={{ margin: 0, fontSize: 13, color: '#e8f0fe', lineHeight: 1.5 }}>
              Once redeployed, "Login with Deriv" will redirect users to log in, then bring them straight back to your app with their accounts connected — exactly like production trading platforms.
            </p>
          </div>
        </div>

        <Link href="/" style={{
          display: 'inline-flex', alignItems: 'center', gap: 7, marginTop: 24,
          padding: '11px 22px', borderRadius: 9,
          background: 'linear-gradient(135deg,#00c2ff,#0070a0)',
          color: '#fff', fontSize: 14, fontWeight: 700, textDecoration: 'none',
        }}>
          Return to App <ArrowRight size={15} />
        </Link>
      </div>
    </div>
  );
}
