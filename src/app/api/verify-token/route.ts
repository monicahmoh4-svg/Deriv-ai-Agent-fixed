/**
 * POST /api/verify-token
 * Lightweight endpoint — just validates token format server-side.
 * Actual WS auth happens in the browser (pure client-side).
 * No WebSocket needed here — avoids all ws/package issues on Vercel.
 */
import { NextRequest, NextResponse } from 'next/server';

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
      { error: 'Token too short — copy the full token from Deriv' },
      { status: 400 }
    );
  }

  // Token format looks OK — actual Deriv auth happens browser-side via WebSocket
  return NextResponse.json({ success: true, message: 'Token format valid — connecting via browser WebSocket' });
}
