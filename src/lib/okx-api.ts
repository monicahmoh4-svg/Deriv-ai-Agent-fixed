/**
 * OKX API Client (browser-side)
 * All requests go through /api/okx proxy (server-side signing)
 * Supports: spot + perpetual futures markets
 */

export interface OKXCredentials {
  apiKey: string;
  apiSecret: string;
  passphrase: string;
}

export interface OKXBalance {
  ccy: string;        // currency e.g. "USDT"
  availBal: string;   // available balance
  frozenBal: string;  // frozen/in-use balance
  eqUsd: string;      // USD equivalent
}

export interface OKXTicker {
  instId: string;     // e.g. "BTC-USDT"
  last: string;       // last price
  lastSz: string;
  askPx: string;
  bidPx: string;
  open24h: string;
  high24h: string;
  low24h: string;
  vol24h: string;
  volCcy24h: string;
  ts: string;
}

export interface OKXCandle {
  ts: string;
  open: string;
  high: string;
  low: string;
  close: string;
  vol: string;
}

export interface OKXOrder {
  ordId: string;
  instId: string;
  side: 'buy' | 'sell';
  ordType: string;
  sz: string;
  px: string;
  state: 'live' | 'filled' | 'canceled' | 'partially_filled';
  fillSz: string;
  fillPx: string;
  pnl: string;
  cTime: string;
  uTime: string;
}

export interface OKXPosition {
  instId: string;
  instType: string;
  pos: string;         // position size
  avgPx: string;       // average entry price
  upl: string;         // unrealized PnL
  uplRatio: string;
  lever: string;       // leverage
  cTime: string;
}

export interface PlaceOrderParams {
  instId: string;       // e.g. "BTC-USDT" or "BTC-USDT-SWAP"
  side: 'buy' | 'sell';
  ordType: 'market' | 'limit';
  sz: string;           // size in base currency
  px?: string;          // price (required for limit)
  tdMode?: 'cash' | 'cross' | 'isolated';  // cash=spot, cross/isolated=margin/futures
  posSide?: 'long' | 'short' | 'net';
}

// ── Proxy call helper ─────────────────────────────────────────────────────────

async function proxyCall<T>(
  creds: OKXCredentials,
  method: 'GET' | 'POST' | 'DELETE',
  path: string,
  body?: Record<string, unknown>
): Promise<T> {
  const res = await fetch('/api/okx', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      method,
      path,
      body,
      apiKey: creds.apiKey,
      apiSecret: creds.apiSecret,
      passphrase: creds.passphrase,
    }),
  });

  const data = await res.json() as { error?: string; data?: T; code?: string };

  if (!res.ok || data.error) {
    throw new Error(data.error || 'OKX API call failed');
  }

  return (data.data !== undefined ? data.data : data) as T;
}

// ── OKX Client class ──────────────────────────────────────────────────────────

export class OKXClient {
  private creds: OKXCredentials;
  private ws: WebSocket | null = null;
  private tickerCbs = new Map<string, ((t: OKXTicker) => void)[]>();
  private reconnTimer: ReturnType<typeof setTimeout> | null = null;
  private _connected = false;

  constructor(creds: OKXCredentials) {
    this.creds = creds;
  }

  // ── Validate credentials ────────────────────────────────────────────────────

  async validateCredentials(): Promise<{ valid: boolean; uid?: string }> {
    try {
      const data = await proxyCall<Array<{ uid: string }>>(
        this.creds, 'GET', '/api/v5/account/config'
      );
      const arr = Array.isArray(data) ? data : [];
      return { valid: true, uid: arr[0]?.uid };
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      // OKX error codes: 50111=invalid key, 50113=invalid sign, 50114=invalid passphrase
      if (msg.includes('50111') || msg.includes('50113') || msg.includes('50114') ||
          msg.includes('Invalid') || msg.includes('invalid')) {
        throw new Error('Invalid API credentials. Check your API Key, Secret, and Passphrase.');
      }
      throw err;
    }
  }

  // ── Account ─────────────────────────────────────────────────────────────────

  async getBalances(): Promise<OKXBalance[]> {
    const data = await proxyCall<Array<{ details: OKXBalance[] }>>(
      this.creds, 'GET', '/api/v5/account/balance'
    );
    const arr = Array.isArray(data) ? data : [];
    return arr[0]?.details || [];
  }

  async getTotalEquityUSD(): Promise<number> {
    const data = await proxyCall<Array<{ totalEq: string }>>(
      this.creds, 'GET', '/api/v5/account/balance'
    );
    const arr = Array.isArray(data) ? data : [];
    return parseFloat(arr[0]?.totalEq || '0');
  }

  async getPositions(): Promise<OKXPosition[]> {
    return proxyCall<OKXPosition[]>(this.creds, 'GET', '/api/v5/account/positions');
  }

  // ── Market data ─────────────────────────────────────────────────────────────

  async getTickers(instType: 'SPOT' | 'SWAP' = 'SPOT'): Promise<OKXTicker[]> {
    const path = `/api/v5/market/tickers?instType=${instType}`;
    return proxyCall<OKXTicker[]>(this.creds, 'GET', path);
  }

  async getTicker(instId: string): Promise<OKXTicker> {
    const path = `/api/v5/market/ticker?instId=${encodeURIComponent(instId)}`;
    const data = await proxyCall<OKXTicker[]>(this.creds, 'GET', path);
    const arr = Array.isArray(data) ? data : [];
    if (!arr[0]) throw new Error(`No ticker for ${instId}`);
    return arr[0];
  }

  async getCandles(instId: string, bar = '1m', limit = 200): Promise<OKXCandle[]> {
    const path = `/api/v5/market/candles?instId=${encodeURIComponent(instId)}&bar=${bar}&limit=${limit}`;
    const data = await proxyCall<string[][]>(this.creds, 'GET', path);
    const arr = Array.isArray(data) ? data : [];
    // OKX returns arrays: [ts, open, high, low, close, vol, volCcy, volCcyQuote, confirm]
    return arr.map(c => ({
      ts: c[0], open: c[1], high: c[2], low: c[3], close: c[4], vol: c[5],
    })).reverse(); // oldest first
  }

  async getTopSymbols(instType: 'SPOT' | 'SWAP' = 'SPOT', limit = 20): Promise<string[]> {
    const tickers = await this.getTickers(instType);
    // Sort by 24h USD volume descending
    return tickers
      .filter(t => t.instId.endsWith('-USDT'))
      .sort((a, b) => parseFloat(b.volCcy24h) - parseFloat(a.volCcy24h))
      .slice(0, limit)
      .map(t => t.instId);
  }

  // ── Trading ─────────────────────────────────────────────────────────────────

  async placeOrder(params: PlaceOrderParams): Promise<{ ordId: string; clOrdId: string }> {
    const body: Record<string, string> = {
      instId: params.instId,
      tdMode: params.tdMode || 'cash',
      side: params.side,
      ordType: params.ordType,
      sz: params.sz,
    };
    if (params.px) body.px = params.px;
    if (params.posSide) body.posSide = params.posSide;

    const data = await proxyCall<Array<{ ordId: string; clOrdId: string; sCode: string; sMsg: string }>>(
      this.creds, 'POST', '/api/v5/trade/order', body as Record<string, unknown>
    );
    const arr = Array.isArray(data) ? data : [];
    if (!arr[0] || arr[0].sCode !== '0') {
      throw new Error(arr[0]?.sMsg || 'Order placement failed');
    }
    return { ordId: arr[0].ordId, clOrdId: arr[0].clOrdId };
  }

  async cancelOrder(instId: string, ordId: string): Promise<void> {
    await proxyCall(this.creds, 'POST', '/api/v5/trade/cancel-order', { instId, ordId });
  }

  async getOrderHistory(instType = 'SPOT', limit = 50): Promise<OKXOrder[]> {
    const path = `/api/v5/trade/orders-history?instType=${instType}&limit=${limit}`;
    const data = await proxyCall<OKXOrder[]>(this.creds, 'GET', path);
    return Array.isArray(data) ? data : [];
  }

  async getOpenOrders(instId?: string): Promise<OKXOrder[]> {
    const path = `/api/v5/trade/orders-pending${instId ? `?instId=${encodeURIComponent(instId)}` : ''}`;
    const data = await proxyCall<OKXOrder[]>(this.creds, 'GET', path);
    return Array.isArray(data) ? data : [];
  }

  // ── Public WebSocket for tickers (no auth needed) ─────────────────────────

  connectPublicWS(symbols: string[], onTicker: (t: OKXTicker) => void): () => void {
    const connect = () => {
      if (this.ws) { try { this.ws.close(); } catch { /* */ } }
      this.ws = new WebSocket('wss://ws.okx.com:8443/ws/v5/public');

      this.ws.onopen = () => {
        this._connected = true;
        // Subscribe to tickers for all symbols
        const args = symbols.map(instId => ({ channel: 'tickers', instId }));
        this.ws!.send(JSON.stringify({ op: 'subscribe', args }));
      };

      this.ws.onmessage = (evt) => {
        try {
          const msg = JSON.parse(evt.data as string) as {
            event?: string;
            arg?: { channel: string; instId: string };
            data?: OKXTicker[];
          };
          if (msg.event) return; // subscribe confirmation
          if (msg.arg?.channel === 'tickers' && msg.data?.[0]) {
            onTicker(msg.data[0]);
          }
        } catch { /* */ }
      };

      this.ws.onerror = () => { this._connected = false; };
      this.ws.onclose = () => {
        this._connected = false;
        // Reconnect after 5s
        if (this.reconnTimer) clearTimeout(this.reconnTimer);
        this.reconnTimer = setTimeout(connect, 5000);
      };
    };

    connect();

    return () => {
      if (this.reconnTimer) clearTimeout(this.reconnTimer);
      if (this.ws) { try { this.ws.close(1000); } catch { /* */ } this.ws = null; }
    };
  }

  disconnect() {
    if (this.reconnTimer) clearTimeout(this.reconnTimer);
    if (this.ws) { try { this.ws.close(1000); } catch { /* */ } this.ws = null; }
    this._connected = false;
  }

  get connected() { return this._connected; }
}

// ── Singleton ─────────────────────────────────────────────────────────────────

let _okxClient: OKXClient | null = null;

export function getOKXClient(creds?: OKXCredentials): OKXClient {
  if (creds) {
    _okxClient?.disconnect();
    _okxClient = new OKXClient(creds);
  }
  if (!_okxClient) throw new Error('OKX client not initialized');
  return _okxClient;
}

export function resetOKXClient(): void {
  _okxClient?.disconnect();
  _okxClient = null;
}

export function hasOKXClient(): boolean {
  return _okxClient !== null;
}
