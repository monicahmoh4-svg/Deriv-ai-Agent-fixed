/**
 * POST /api/verify-token
 *
 * Server-side Deriv token verification using Node 18+ built-in WebSocket.
 * No external packages required — zero dependencies.
 *
 * Runs on Vercel (Node 18+) so we can set Origin headers that Deriv accepts,
 * bypassing the browser Origin restriction for pat_def... tokens.
 */
import { NextRequest, NextResponse } from 'next/server';

const WS_ENDPOINT = 'wss://ws.binaryws.com/websockets/v3';

// Each Deriv app_id is whitelisted for a specific Origin domain
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

function tryAuthorize(appId: string, origin: string, token: string): Promise<DerivAccount> {
  return new Promise((resolve, reject) => {
    const url = `${WS_ENDPOINT}?app_id=${appId}&l=EN&brand=deriv`;

    // Use Node 18+ global WebSocket with Origin header
    // @ts-expect-error – Node 18 global WebSocket accepts a headers option not in browser spec
    const ws = new WebSocket(url, { headers: { Origin: origin } });

    const timer = setTimeout(() => {
      try { ws.close(); } catch { /* */ }
      reject(new Error(`Timeout (app_id=${appId})`));
    }, 12000);

    ws.onopen = () => {
      ws.send(JSON.stringify({ authorize: token, req_id: 1 }));
    };

    ws.onmessage = (evt: MessageEvent<string>) => {
      let msg: DerivMsg;
      try {
        msg = JSON.parse(evt.data) as DerivMsg;
      } catch {
        clearTimeout(timer);
        try { ws.close(); } catch { /* */ }
        reject(new Error('Invalid JSON from Deriv'));
        return;
      }

      // Ignore non-authorize messages
      if (msg.msg_type !== 'authorize') return;

      clearTimeout(timer);
      try { ws.close(); } catch { /* */ }

      if (msg.error) {
        reject(new Error(msg.error.message || msg.error.code || 'Authorization failed'));
      } else if (msg.authorize) {
        resolve(msg.authorize);
      } else {
        reject(new Error('Empty authorize response'));
      }
    };

    ws.onerror = () => {
      clearTimeout(timer);
      reject(new Error(`Connection failed (app_id=${appId})`));
    };

    ws.onclose = () => {
      clearTimeout(timer);
    };
  });
}

export async function POST(req: NextRequest) {
  // Parse + validate token
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
      { error: 'Token appears incomplete — please copy the full token from Deriv' },
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

      // Definitive auth failure — token itself is wrong, stop trying
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
      // Network / timeout — try next app_id
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
        : `Could not reach Deriv: ${lastError}`,
    },
    { status: 401 }
  );
}
