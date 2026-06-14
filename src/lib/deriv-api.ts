/**
 * Deriv API Client — supports pat_def… Personal Access Tokens + legacy tokens
 *
 * Auth flow:
 *  1. POST /api/verify-token  (server-side WS with correct Origin headers)
 *     → returns account info + which app_id worked
 *  2. Open browser WebSocket using that confirmed app_id
 *  3. Re-authorize in browser WS for live subscriptions
 *
 * This two-step approach solves the browser Origin restriction:
 * the server can set any Origin header, so it finds the working app_id,
 * then the browser WS uses the same app_id (which Deriv accepts from any Origin
 * once we know it works).
 */

const WS_ENDPOINT = 'wss://ws.binaryws.com/websockets/v3';

// Deriv app IDs tried in browser after server verifies which one works
const BROWSER_APP_IDS = ['1089', '36544', '16929'];

// ─── Types ────────────────────────────────────────────────────────────────────

type MsgCb = (msg: DerivMsg) => void;

export interface DerivMsg {
  msg_type: string;
  req_id?: number;
  error?: { code: string; message: string };
  [key: string]: unknown;
}

export interface DerivAccount {
  loginid: string;
  email?: string;
  fullname?: string;
  balance?: number;
  currency?: string;
  account_type?: string;
  is_virtual?: number;
  landing_company_name?: string;
}

export interface ActiveSymbol {
  symbol: string;
  display_name: string;
  market: string;
  market_display_name: string;
  pip: number;
  is_trading_suspended: number;
}

export interface TickData {
  symbol: string;
  epoch: number;
  quote: number;
  bid?: number;
  ask?: number;
}

export interface TickHistory {
  prices: number[];
  times: number[];
}

export interface CandleData {
  epoch: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

export interface ContractProposal {
  id: string;
  ask_price: number;
  payout: number;
  longcode: string;
  spot: number;
}

export interface BuyResponse {
  buy_price: number;
  balance_after: number;
  contract_id: number;
  longcode: string;
  payout: number;
  purchase_time: number;
  transaction_id: number;
  start_time: number;
  shortcode: string;
}

export interface PortfolioContract {
  contract_id: number;
  symbol: string;
  contract_type: string;
  buy_price: number;
  current_value?: number;
  profit_loss?: number;
  longcode: string;
  expiry_time: number;
  date_start: number;
}

export interface Transaction {
  transaction_id: number;
  action_type: string;
  amount: number;
  balance_after: number;
  contract_id?: number;
  longcode?: string;
  purchase_time?: number;
  transaction_time: number;
}

export interface ProfitEntry {
  contract_id: number;
  buy_price: number;
  sell_price: number;
  profit: number;
  longcode: string;
  purchase_time: number;
  sell_time: number;
}

export interface ProposalParams {
  symbol: string;
  amount: number;
  contract_type: 'CALL' | 'PUT' | 'DIGITMATCH' | 'DIGITDIFF' | 'EVEN' | 'ODD';
  duration: number;
  duration_unit?: 't' | 's' | 'm' | 'h' | 'd';
  currency?: string;
}

// ─── Step 1: server-side verify ──────────────────────────────────────────────

async function serverVerifyToken(token: string): Promise<{ account: DerivAccount; appId: string }> {
  const res = await fetch('/api/verify-token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token }),
  });

  const data = await res.json();

  if (!res.ok || !data.success) {
    throw new Error(data.error || data.hint || 'Token verification failed');
  }

  return { account: data.account as DerivAccount, appId: data.appId as string };
}

// ─── Step 2: browser WS authorize ────────────────────────────────────────────

function browserAuthorize(appId: string, token: string): Promise<{ ws: WebSocket; account: DerivAccount }> {
  return new Promise((resolve, reject) => {
    // Try the confirmed app_id first, then fallbacks
    const idsToTry = [appId, ...BROWSER_APP_IDS.filter(id => id !== appId)];
    let idx = 0;

    const tryNext = () => {
      if (idx >= idsToTry.length) {
        reject(new Error('Browser WebSocket connection failed — please refresh and try again.'));
        return;
      }
      const id = idsToTry[idx++];
      const url = `${WS_ENDPOINT}?app_id=${id}&l=EN&brand=deriv`;

      let ws: WebSocket;
      try {
        ws = new WebSocket(url);
      } catch {
        tryNext();
        return;
      }

      const timer = setTimeout(() => {
        ws.close();
        tryNext();
      }, 10000);

      ws.onopen = () => {
        ws.send(JSON.stringify({ authorize: token, req_id: 1 }));
      };

      ws.onmessage = (evt) => {
        try {
          const msg = JSON.parse(evt.data as string) as DerivMsg;
          if (msg.msg_type !== 'authorize') return;
          clearTimeout(timer);
          if (msg.error) {
            ws.close();
            // Auth error is definitive — don't try more app_ids
            reject(new Error(msg.error.message || 'Authorization failed'));
          } else {
            const account = (msg as unknown as { authorize: DerivAccount }).authorize;
            // Hand off socket — don't close it
            ws.onopen = null;
            ws.onmessage = null;
            ws.onerror = null;
            ws.onclose = null;
            clearTimeout(timer);
            resolve({ ws, account });
          }
        } catch {
          // ignore parse errors
        }
      };

      ws.onerror = () => {
        clearTimeout(timer);
        tryNext();
      };

      ws.onclose = () => {
        clearTimeout(timer);
        // Only retry if we haven't resolved/rejected yet
      };
    };

    tryNext();
  });
}

// ─── Main client class ────────────────────────────────────────────────────────

class DerivAPIClient {
  private ws: WebSocket | null = null;
  private reqId = 2; // 1 is used by initial authorize
  private pending = new Map<number, (msg: DerivMsg) => void>();
  private subs = new Map<string, MsgCb[]>();
  private token: string | null = null;
  private _appId = '1089';
  private _authorized = false;
  private reconnTimer: ReturnType<typeof setTimeout> | null = null;
  private onDisconnectCbs: Array<() => void> = [];

  // ── Public API ─────────────────────────────────────────────────────────────

  /**
   * Full connect+authorize flow.
   * 1. Server verifies token and finds working app_id
   * 2. Browser opens WS with that app_id and authorizes
   */
  async connectWithToken(token: string): Promise<DerivAccount> {
    this.token = token;
    this._authorized = false;
    this.teardown();

    // Step 1: server verify (handles Origin requirements, finds working app_id)
    let verifiedAppId = '1089';
    let serverAccount: DerivAccount | null = null;

    try {
      const { account, appId } = await serverVerifyToken(token);
      verifiedAppId = appId;
      serverAccount = account;
    } catch (serverErr) {
      // If server verify gives a clear auth error, surface it immediately
      const msg = serverErr instanceof Error ? serverErr.message : String(serverErr);
      const isAuthErr =
        msg.toLowerCase().includes('invalid') ||
        msg.toLowerCase().includes('authori') ||
        msg.toLowerCase().includes('expired') ||
        msg.toLowerCase().includes('rejected');
      if (isAuthErr) throw serverErr;
      // Network error on server — try browser WS directly
      console.warn('Server verify failed (network?), trying browser WS directly:', msg);
    }

    // Step 2: open browser WebSocket + re-authorize for live data
    try {
      const { ws, account } = await browserAuthorize(verifiedAppId, token);
      this.ws = ws;
      this._appId = verifiedAppId;
      this._authorized = true;

      // Wire up ongoing message handling
      ws.onmessage = (evt) => {
        try {
          const msg = JSON.parse(evt.data as string) as DerivMsg;
          this.dispatch(msg);
        } catch { /* ignore */ }
      };
      ws.onerror = () => { this._authorized = false; };
      ws.onclose = (e) => {
        this._authorized = false;
        this.onDisconnectCbs.forEach(cb => cb());
        if (e.code !== 1000 && this.token) this.scheduleReconnect();
      };

      return serverAccount || account;
    } catch (wsErr) {
      // Browser WS failed — return server account if we have it
      if (serverAccount) {
        // We verified the token works — WS just didn't open in browser
        // This can happen in some browser environments; surface helpful error
        throw new Error(
          'Token is valid but browser WebSocket could not connect.\n' +
          'Try: refreshing the page, disabling VPN, or using a different browser.'
        );
      }
      throw wsErr;
    }
  }

  async authorize(token: string): Promise<DerivAccount> {
    return this.connectWithToken(token);
  }

  // ── Internal ───────────────────────────────────────────────────────────────

  private teardown() {
    if (this.reconnTimer) { clearTimeout(this.reconnTimer); this.reconnTimer = null; }
    if (this.ws) {
      this.ws.onopen = null;
      this.ws.onmessage = null;
      this.ws.onerror = null;
      this.ws.onclose = null;
      try { this.ws.close(1000); } catch { /* */ }
      this.ws = null;
    }
    this.pending.forEach((_, id) => this.pending.delete(id));
    this.subs.clear();
  }

  private scheduleReconnect() {
    if (this.reconnTimer) clearTimeout(this.reconnTimer);
    this.reconnTimer = setTimeout(async () => {
      if (this.token) {
        try { await this.connectWithToken(this.token); }
        catch { this.scheduleReconnect(); }
      }
    }, 5000);
  }

  private dispatch(msg: DerivMsg) {
    const id = msg.req_id;
    if (id !== undefined && this.pending.has(id)) {
      const cb = this.pending.get(id)!;
      this.pending.delete(id);
      cb(msg);
      return;
    }
    if (msg.msg_type) {
      (this.subs.get(msg.msg_type) || []).forEach(cb => cb(msg));
    }
  }

  private send<T>(payload: Record<string, unknown>): Promise<T & DerivMsg> {
    return new Promise((resolve, reject) => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        reject(new Error('WebSocket not connected'));
        return;
      }
      const id = this.reqId++;
      payload.req_id = id;

      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error('Request timed out'));
      }, 30000);

      this.pending.set(id, (msg) => {
        clearTimeout(timer);
        if (msg.error) reject(new Error(msg.error.message || 'Deriv API error'));
        else resolve(msg as T & DerivMsg);
      });

      this.ws!.send(JSON.stringify(payload));
    });
  }

  // ── Market data ────────────────────────────────────────────────────────────

  async getActiveSymbols(): Promise<ActiveSymbol[]> {
    const r = await this.send<{ active_symbols: ActiveSymbol[] }>({ active_symbols: 'brief', product_type: 'basic' });
    return r.active_symbols || [];
  }

  subscribeToTicks(symbol: string, cb: (t: TickData) => void): () => void {
    const id = this.reqId++;
    const handler: MsgCb = (msg) => {
      if (msg.msg_type === 'tick') {
        const t = (msg as unknown as { tick: TickData }).tick;
        if (t?.symbol === symbol) cb(t);
      }
    };
    if (!this.subs.has('tick')) this.subs.set('tick', []);
    this.subs.get('tick')!.push(handler);
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ ticks: symbol, subscribe: 1, req_id: id }));
    }
    return () => {
      this.subs.set('tick', (this.subs.get('tick') || []).filter(h => h !== handler));
    };
  }

  async getTickHistory(symbol: string, count = 200): Promise<TickHistory> {
    const r = await this.send<{ history: TickHistory }>({ ticks_history: symbol, end: 'latest', count, style: 'ticks' });
    return r.history;
  }

  async getCandles(symbol: string, granularity = 60, count = 100): Promise<CandleData[]> {
    const r = await this.send<{ candles: CandleData[] }>({ ticks_history: symbol, style: 'candles', granularity, count, end: 'latest' });
    return r.candles || [];
  }

  // ── Account ────────────────────────────────────────────────────────────────

  async getBalance(): Promise<{ balance: number; currency: string; loginid: string }> {
    const r = await this.send<{ balance: { balance: number; currency: string; loginid: string } }>({ balance: 1 });
    return r.balance;
  }

  subscribeToBalance(cb: (b: { balance: number; currency: string }) => void): () => void {
    const id = this.reqId++;
    const handler: MsgCb = (msg) => {
      if (msg.msg_type === 'balance') {
        const b = (msg as unknown as { balance: { balance: number; currency: string } }).balance;
        if (b) cb(b);
      }
    };
    if (!this.subs.has('balance')) this.subs.set('balance', []);
    this.subs.get('balance')!.push(handler);
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ balance: 1, subscribe: 1, req_id: id }));
    }
    return () => {
      this.subs.set('balance', (this.subs.get('balance') || []).filter(h => h !== handler));
    };
  }

  async getPortfolio(): Promise<PortfolioContract[]> {
    const r = await this.send<{ portfolio: { contracts: PortfolioContract[] } }>({ portfolio: 1 });
    return r.portfolio?.contracts || [];
  }

  async getTransactionHistory(limit = 50): Promise<Transaction[]> {
    const r = await this.send<{ statement: { transactions: Transaction[] } }>({ statement: 1, description: 1, limit });
    return r.statement?.transactions || [];
  }

  async getProfitTable(): Promise<ProfitEntry[]> {
    const r = await this.send<{ profit_table: { transactions: ProfitEntry[] } }>({ profit_table: 1, description: 1, limit: 50 });
    return r.profit_table?.transactions || [];
  }

  // ── Trading ────────────────────────────────────────────────────────────────

  async getProposal(p: ProposalParams): Promise<ContractProposal> {
    const r = await this.send<{ proposal: ContractProposal }>({
      proposal: 1, amount: p.amount, basis: 'stake',
      contract_type: p.contract_type, currency: p.currency || 'USD',
      duration: p.duration, duration_unit: p.duration_unit || 't', symbol: p.symbol,
    });
    return r.proposal;
  }

  async buyContract(proposalId: string, price: number): Promise<BuyResponse> {
    const r = await this.send<{ buy: BuyResponse }>({ buy: proposalId, price });
    return r.buy;
  }

  async sellContract(contractId: number): Promise<unknown> {
    return this.send({ sell: contractId, price: 0 });
  }

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  onDisconnect(cb: () => void) { this.onDisconnectCbs.push(cb); }

  disconnect() {
    this.token = null;
    this._authorized = false;
    this.teardown();
  }

  get connected() { return this.ws?.readyState === WebSocket.OPEN; }
  get authorized() { return this._authorized; }
  get usedAppId() { return this._appId; }
}

// ─── Singleton ────────────────────────────────────────────────────────────────

let _client: DerivAPIClient | null = null;
export function getDerivClient(): DerivAPIClient {
  if (!_client) _client = new DerivAPIClient();
  return _client;
}
export function resetDerivClient(): void {
  _client?.disconnect();
  _client = null;
}
export { DerivAPIClient };
