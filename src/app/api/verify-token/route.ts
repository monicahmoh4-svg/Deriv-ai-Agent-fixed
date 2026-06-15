/**
 * POST /api/verify-token
 * Server-side Deriv token verification — supports pat_def… tokens.
 *
 * pat_def tokens are created at app.deriv.com which uses app_id=16929.
 * We must try that app_id FIRST and with the matching Origin.
 * We try ALL app_ids and NEVER short-circuit — InvalidToken from one
 * app_id may just mean mismatch, not a bad token.
 * Uses Node 18+ globalThis.WebSocket — zero external packages.
 */
import { NextRequest, NextResponse } from 'next/server';

const WS_ENDPOINT = 'wss://ws.binaryws.com/websockets/v3';

// Order matters: app_id=16929 is where pat_def tokens are issued (app.deriv.com)
// Try it first, then all others exhaustively
const ATTEMPTS = [
  { appId: '16929', origin: 'https://app.deriv.com' },
  { appId: '1089',  origin: 'https://deriv.com' },
  { appId: '36544', origin: 'https://smarttrader.deriv.com' },
  { appId: '11780', origin: 'https://deriv.com' },
  { appId: '24902', origin: 'https://deriv.com' },
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
}

function tryAuthorize(appId: string, origin: string, token: string): Promise<DerivAccount> {
  return new Promise((resolve, reject) => {
    const url = `${WS_ENDPOINT}?app_id=${appId}&l=EN&brand=deriv`;

    // Node 18+ built-in WebSocket via globalThis — no package needed
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const GWS = (globalThis as any).WebSocket as new (
      url: string,
      options?: { headers?: Record<string, string> }
    ) => WebSocket;

    let ws: WebSocket;
    try {
      ws = new GWS(url, { headers: { Origin: origin } });
    } catch {
      reject(new Error(`Cannot open socket for app_id=${appId}`));
      return;
    }

    const timer = setTimeout(() => {
      try { ws.close(); } catch { /* */ }
      reject(new Error(`Timeout app_id=${appId}`));
    }, 10000);

    ws.onopen = () => {
      ws.send(JSON.stringify({ authorize: token, req_id: 1 }));
    };

    ws.onmessage = (evt: MessageEvent) => {
      let msg: DerivMsg;
      try { msg = JSON.parse(evt.data as string) as DerivMsg; }
      catch {
        clearTimeout(timer);
        try { ws.close(); } catch { /* */ }
        reject(new Error('Bad JSON from Deriv'));
        return;
      }

      if (msg.msg_type !== 'authorize') return; // ignore ping/other

      clearTimeout(timer);
      try { ws.close(); } catch { /* */ }

      if (msg.error) {
        reject(new Error(`[${msg.error.code}] ${msg.error.message}`));
      } else if (msg.authorize) {
        resolve(msg.authorize);
      } else {
        reject(new Error('Empty authorize response'));
      }
    };

    ws.onerror = () => {
      clearTimeout(timer);
      reject(new Error(`WS connection failed app_id=${appId}`));
    };
  });
}

export async function POST(req: NextRequest) {
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
      { error: 'Token too short — copy the complete token from Deriv' },
      { status: 400 }
    );
  }

  // Try ALL app_ids — collect all errors for diagnosis
  const errors: string[] = [];
  let successOnce = false;

  for (const { appId, origin } of ATTEMPTS) {
    try {
      const account = await tryAuthorize(appId, origin, token);
      successOnce = true;
      return NextResponse.json({ success: true, account, appId });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`app_id=${appId}: ${msg}`);

      // Only stop early on DEFINITIVE credential errors
      // (same error code across different app_ids = truly bad token)
      const lower = msg.toLowerCase();
      const isDefinitelyBadToken =
        lower.includes('[authorizationfailed]') ||
        lower.includes('token expired') ||
        lower.includes('permission denied') ||
        lower.includes('account disabled') ||
        lower.includes('account locked');

      if (isDefinitelyBadToken && errors.length >= 2) break;
      // Note: do NOT break on 'InvalidToken' alone — it can mean app_id mismatch
    }
  }

  void successOnce; // unused but kept for clarity

  // Analyze collected errors to give best message
  const allErrors = errors.join(' | ');
  const lower = allErrors.toLowerCase();

  const isTokenBad =
    lower.includes('[invalidtoken]') ||
    lower.includes('invalid token') ||
    lower.includes('[authorizationfailed]');

  const isNetwork =
    !isTokenBad && (
      lower.includes('timeout') ||
      lower.includes('connection failed') ||
      lower.includes('cannot open')
    );

  console.error('[verify-token] All attempts failed:', errors);

  return NextResponse.json(
    {
      error: isNetwork
        ? 'Cannot reach Deriv servers — check Vercel network settings or try again.'
        : isTokenBad
          ? 'Token invalid. Go to app.deriv.com → Account Settings → API Token and create a new token with Read + Trade permissions.'
          : `Authorization failed across all endpoints. Details: ${allErrors}`,
      debug: errors,
    },
    { status: 401 }
  );
}
