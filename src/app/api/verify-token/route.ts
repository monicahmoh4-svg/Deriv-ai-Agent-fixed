/**
 * POST /api/verify-token
 * Server-side Deriv token verification.
 *
 * Runs in Node.js on Vercel so we can set Origin headers that Deriv's
 * WebSocket server accepts — bypassing the browser Origin restriction.
 * Tries multiple app_id / Origin combinations until one authorizes.
 */
import { NextRequest, NextResponse } from 'next/server';
import WebSocket from 'ws';

const WS_ENDPOINT = 'wss://ws.binaryws.com/websockets/v3';

// Each app_id is registered by Deriv for a specific origin domain
const ATTEMPTS = [
  { appId: '1089',  origin: 'https://deriv.com' },
  { appId: '36544', origin: 'https://smarttrader.deriv.com' },
  { appId: '16929', origin: 'https://app.deriv.com' },
];

interface DerivAccount {
  loginid: string;
  email?: string;
  fullname?: string;
  balance?: number;
  currency?: string;
  is_virtual?: number;
  account_type?: string;
  landing_company_name?: string;
}

interface DerivMsg {
  msg_type: string;
  req_id?: number;
  error?: { code: string; message: string };
  authorize?: DerivAccount;
  [key: string]: unknown;
}

function tryAuthorize(
  appId: string,
  origin: string,
  token: string
): Promise<DerivAccount> {
  return new Promise((resolve, reject) => {
    const url = `${WS_ENDPOINT}?app_id=${appId}&l=EN&brand=deriv`;
    const ws = new WebSocket(url, { headers: { Origin: origin } });

    const timer = setTimeout(() => {
      ws.terminate();
      reject(new Error(`Timeout (app_id=${appId})`));
    }, 12000);

    ws.on('open', () => {
      ws.send(JSON.stringify({ authorize: token, req_id: 1 }));
    });

    ws.on('message', (raw) => {
      clearTimeout(timer);
      let msg: DerivMsg;
      try {
        msg = JSON.parse(raw.toString()) as DerivMsg;
      } catch {
        ws.terminate();
        reject(new Error('Invalid JSON from Deriv'));
        return;
      }

      if (msg.msg_type !== 'authorize') return;

      ws.close();
      if (msg.error) {
        reject(new Error(msg.error.message || msg.error.code || 'Authorization failed'));
      } else if (msg.authorize) {
        resolve(msg.authorize);
      } else {
        reject(new Error('Empty authorize response'));
      }
    });

    ws.on('error', (err) => {
      clearTimeout(timer);
      reject(new Error(`WS error (app_id=${appId}): ${err.message}`));
    });
  });
}

export async function POST(req: NextRequest) {
  // Parse body
  let token: string;
  try {
    const body = await req.json() as { token?: string };
    token = (body?.token ?? '').trim();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  if (!token) {
    return NextResponse.json({ error: 'token is required' }, { status: 400 });
  }

  if (token.length < 15) {
    return NextResponse.json(
      { error: 'Token too short — please copy the full token from Deriv' },
      { status: 400 }
    );
  }

  let lastError = 'Authorization failed';

  for (const { appId, origin } of ATTEMPTS) {
    try {
      const account = await tryAuthorize(appId, origin, token);
      return NextResponse.json({ success: true, account, appId });
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);

      // Definitive auth failure — no point trying more app_ids
      const lower = lastError.toLowerCase();
      if (
        lower.includes('invalid token') ||
        lower.includes('invalidtoken') ||
        lower.includes('authorizationfailed') ||
        lower.includes('authorization failed') ||
        lower.includes('token expired') ||
        lower.includes('permission denied')
      ) {
        break;
      }
      // Network / timeout — try next
    }
  }

  const isAuthErr =
    lastError.toLowerCase().includes('invalid') ||
    lastError.toLowerCase().includes('authori') ||
    lastError.toLowerCase().includes('expired');

  return NextResponse.json(
    {
      error: isAuthErr
        ? 'Token rejected by Deriv. Ensure it has Read + Trade permissions and is copied in full.'
        : `Could not reach Deriv servers: ${lastError}`,
    },
    { status: 401 }
  );
}
