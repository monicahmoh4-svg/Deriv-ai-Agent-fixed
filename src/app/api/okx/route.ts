/**
 * OKX API Proxy — /api/okx
 * 
 * Proxies all OKX REST API v5 calls server-side because:
 * 1. OKX blocks direct browser CORS requests
 * 2. API secret must never be exposed to the browser
 * 3. HMAC-SHA256 signing requires Node.js crypto
 *
 * POST /api/okx
 * Body: { method, path, body?, apiKey, apiSecret, passphrase }
 * Returns: OKX API response
 */
import { NextRequest, NextResponse } from 'next/server';
import { createHmac } from 'crypto';

const OKX_BASE = 'https://www.okx.com';

interface OKXProxyRequest {
  method: 'GET' | 'POST' | 'DELETE';
  path: string;         // e.g. /api/v5/account/balance
  body?: Record<string, unknown>;
  apiKey: string;
  apiSecret: string;
  passphrase: string;
}

function sign(timestamp: string, method: string, path: string, body: string, secret: string): string {
  const message = timestamp + method.toUpperCase() + path + body;
  return createHmac('sha256', secret).update(message).digest('base64');
}

export async function POST(req: NextRequest) {
  let payload: OKXProxyRequest;
  try {
    payload = await req.json() as OKXProxyRequest;
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { method, path, body, apiKey, apiSecret, passphrase } = payload;

  if (!apiKey || !apiSecret || !passphrase) {
    return NextResponse.json({ error: 'API credentials required' }, { status: 400 });
  }

  if (!path.startsWith('/api/v5/')) {
    return NextResponse.json({ error: 'Invalid OKX API path' }, { status: 400 });
  }

  const timestamp = new Date().toISOString();
  const bodyStr = body && method !== 'GET' ? JSON.stringify(body) : '';
  const signature = sign(timestamp, method, path, bodyStr, apiSecret);

  const headers: Record<string, string> = {
    'OK-ACCESS-KEY': apiKey,
    'OK-ACCESS-SIGN': signature,
    'OK-ACCESS-TIMESTAMP': timestamp,
    'OK-ACCESS-PASSPHRASE': passphrase,
    'Content-Type': 'application/json',
    'x-simulated-trading': '0', // 0 = live trading, 1 = paper trading
  };

  try {
    const url = `${OKX_BASE}${path}`;
    const fetchOpts: RequestInit = {
      method,
      headers,
      ...(bodyStr ? { body: bodyStr } : {}),
    };

    const res = await fetch(url, fetchOpts);
    const data = await res.json();

    // OKX returns code "0" for success
    if (data.code && data.code !== '0') {
      return NextResponse.json(
        { error: data.msg || 'OKX API error', code: data.code, raw: data },
        { status: 400 }
      );
    }

    return NextResponse.json(data);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Request failed';
    return NextResponse.json({ error: `OKX proxy error: ${msg}` }, { status: 502 });
  }
}
