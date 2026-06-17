/**
 * POST /api/deriv-otp
 * 
 * Server-side route that:
 * 1. Calls Deriv REST API: POST /trading/v1/options/accounts/{accountId}/otp
 * 2. Returns the ready-to-use authenticated WebSocket URL
 *
 * Official Deriv API v2:
 *   REST base: https://api.derivws.com
 *   Auth: Deriv-App-ID header + Authorization: Bearer <token>
 *   Returns: { url: "wss://api.derivws.com/trading/v1/options/ws/real?otp=XXX" }
 */
import { NextRequest, NextResponse } from 'next/server';

const DERIV_REST_BASE = 'https://api.derivws.com';
const APP_ID = process.env.NEXT_PUBLIC_DERIV_APP_ID || '36544';

interface OTPRequest {
  token: string;       // Bearer token (PAT or OAuth)
  accountId: string;   // e.g. "CR123456" or "VRTC123456"
  accountType: 'real' | 'demo';
}

interface DerivOTPResponse {
  url?: string;
  error?: string;
  message?: string;
}

export async function POST(req: NextRequest) {
  let body: OTPRequest;
  try {
    body = await req.json() as OTPRequest;
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { token, accountId, accountType } = body;

  if (!token || !accountId) {
    return NextResponse.json({ error: 'token and accountId are required' }, { status: 400 });
  }

  const otpUrl = `${DERIV_REST_BASE}/trading/v1/options/accounts/${accountId}/otp`;

  try {
    const res = await fetch(otpUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Deriv-App-ID': APP_ID,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      signal: AbortSignal.timeout(15000),
    });

    const text = await res.text();
    let data: DerivOTPResponse;
    try {
      data = JSON.parse(text) as DerivOTPResponse;
    } catch {
      return NextResponse.json(
        { error: `Deriv API returned non-JSON: ${text.slice(0, 200)}` },
        { status: 502 }
      );
    }

    if (!res.ok) {
      return NextResponse.json(
        { error: data.error || data.message || `Deriv OTP error (HTTP ${res.status})` },
        { status: res.status }
      );
    }

    if (!data.url) {
      return NextResponse.json(
        { error: 'Deriv did not return a WebSocket URL' },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      wsUrl: data.url,
      accountType,
      accountId,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: `Failed to reach Deriv API: ${msg}` },
      { status: 502 }
    );
  }
}
