/**
 * Server-side Deriv token verification endpoint
 * POST /api/verify-token  { token: string }
 *
 * This runs on the server (Node.js) where we can set Origin headers
 * and bypass browser CORS restrictions. Returns account info if valid.
 */
import { NextRequest, NextResponse } from 'next/server';

const WS_ENDPOINT = 'wss://ws.binaryws.com/websockets/v3';

// App IDs to try in order — server-side can set any Origin header
const APP_IDS = ['1089', '36544', '16929'];

// Deriv-accepted origins that pass their origin whitelist for these app_ids
const ORIGIN_FOR_APP: Record<string, string> = {
  '1089':  'https://deriv.com',
  '36544': 'https://smarttrader.deriv.com',
  '16929': 'https://app.deriv.com',
};

interface DerivAuthResult {
  loginid: string;
  email: string;
  fullname: string;
  balance: number;
  currency: string;
  is_virtual: number;
  account_type: string;
  landing_company_name: string;
}

function tryAuthorize(appId: string, token: string): Promise<DerivAuthResult> {
  return new Promise((resolve, reject) => {
    const url = `${WS_ENDPOINT}?app_id=${appId}&l=EN&brand=deriv`;
    const origin = ORIGIN_FOR_APP[appId] || 'https://deriv.com';

    // Dynamic import of 'ws' — only runs server-side
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const wsModule = require('ws');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const WS = (wsModule.default || wsModule) as any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ws: any = new WS(url, { headers: { Origin: origin } });

    const timer = setTimeout(() => {
      ws.terminate();
      reject(new Error(`Timeout with app_id=${appId}`));
    }, 10000);

    ws.on('open', () => {
      ws.send(JSON.stringify({ authorize: token, req_id: 1 }));
    });

    ws.on('message', (raw: Buffer) => {
      clearTimeout(timer);
      try {
        const msg = JSON.parse(raw.toString());
        if (msg.error) {
          ws.close();
          reject(new Error(msg.error.message || msg.error.code || 'Authorization failed'));
        } else if (msg.msg_type === 'authorize' && msg.authorize) {
          ws.close();
          resolve(msg.authorize as DerivAuthResult);
        }
      } catch {
        ws.close();
        reject(new Error('Invalid response from Deriv'));
      }
    });

    ws.on('error', (err: Error) => {
      clearTimeout(timer);
      reject(new Error(`WS error (app_id=${appId}): ${err.message}`));
    });
  });
}

export async function POST(req: NextRequest) {
  let body: { token?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const token = body?.token?.trim();
  if (!token) {
    return NextResponse.json({ error: 'Token is required' }, { status: 400 });
  }

  // Basic format check — pat_ tokens are long strings
  if (token.length < 10) {
    return NextResponse.json({ error: 'Token appears too short — please copy the full token' }, { status: 400 });
  }

  let lastError = 'Authorization failed';

  for (const appId of APP_IDS) {
    try {
      const account = await tryAuthorize(appId, token);
      return NextResponse.json({
        success: true,
        account,
        appId,
      });
    } catch (err) {
      lastError = err instanceof Error ? err.message : 'Failed';
      // If it's a definitive auth error (not network), stop trying
      const msg = lastError.toLowerCase();
      if (
        msg.includes('invalid token') ||
        msg.includes('invalidtoken') ||
        msg.includes('authorizationfailed') ||
        msg.includes('authorization failed') ||
        msg.includes('token expired')
      ) {
        break; // Token itself is invalid — no point trying other app_ids
      }
      // Network/timeout error — try next app_id
    }
  }

  return NextResponse.json(
    {
      error: lastError,
      hint: lastError.toLowerCase().includes('invalid')
        ? 'Token rejected by Deriv. Ensure it has Read + Trade permissions and is copied in full.'
        : 'Could not connect to Deriv. Check your internet connection.',
    },
    { status: 401 }
  );
}
