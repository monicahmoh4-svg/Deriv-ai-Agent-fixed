/**
 * Deriv API Client — Official v2 Architecture
 * ============================================
 * REST base:  https://api.derivws.com
 * Auth:       Deriv-App-ID + Authorization: Bearer <token>
 *
 * WebSocket endpoints (official):
 *   Public: wss://api.derivws.com/trading/v1/options/ws/public
 *   Demo:   wss://api.derivws.com/trading/v1/options/ws/demo?otp=OTP
 *   Real:   wss://api.derivws.com/trading/v1/options/ws/real?otp=OTP
 *
 * Flow:
 *   1. OAuth callback gives us token + accountId
 *   2. POST /api/deriv-otp (server) → calls Deriv REST → returns wsUrl
 *   3. Open WebSocket to wsUrl
 *   4. Trade, subscribe, get balance — all via WS
 *
 * Fallback: old wss://ws.binaryws.com endpoint for legacy/compatibility
 */

const APP_ID = process.env.NEXT_PUBLIC_DERIV_APP_ID || '36544';

// Official v2 WebSocket base
const WS_PUBLIC = 'wss://api.derivws.com/trading/v1/options/ws/public';

// Legacy WS (fallback - still works for many operations)
const WS_LEGACY_BASE = 'wss://ws.binaryws.com/websockets/v3';
const LEGACY_APP_IDS = ['36544', '16929', '1089'];

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
  token?: string;
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

// ─── Step 1: Get authenticated WS URL via server OTP endpoint ────────────────

async function getAuthenticatedWSUrl(
  token: string,
  accountId: string,
  accountType: 'real' | 'demo'
): Promise<string> {
  const res = await fetch('/api/deriv-otp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, accountId, accountType }),
  });

  const data = await res.json() as {
    success?: boolean;
    wsUrl?: string;
    error?: string;
  };

  if (!res.ok || !data.success || !data.wsUrl) {
    throw new Error(data.error || 'Failed to get WebSocket URL from Deriv');
  }

  return data.wsUrl;
}

// ─── Step 2a: Connect via official v2 WS URL (with OTP) ─────────────────────

function connectViaOfficialWS(wsUrl: string): Promise<WebSocket> {
  return new Promise((resolve, reject) => {
    let ws: WebSocket;
    try { ws = new WebSocket(wsUrl); }
    catch { reject(new Error('Cannot open WebSocket')); return; }

    const timer = setTimeout(() => {
      try { ws.close(); } catch { /* */ }
      reject(new Error('WebSocket connection timeout'));
    }, 15000);

    ws.onopen = () => {
      clearTimeout(timer);
      ws.onopen = null;
      ws.onerror = null;
      ws.onclose = null;
      resolve(ws);
    };

    ws.onerror = () => {
      clearTimeout(timer);
      reject(new Error('WebSocket connection failed'));
    };

    ws.onclose = (e) => {
      clearTimeout(timer);
      reject(new Error(`WebSocket closed early (${e.code})`));
    };
  });
}

// ─── Step 2b: Fallback — legacy WS with authorize message ────────────────────

function tryLegacyAppId(appId: string, token: string): Promise<{ ws: WebSocket; account: DerivAccount }> {
  return new Promise((resolve, reject) => {
    const url = `${WS_LEGACY_BASE}?app_id=${appId}&l=EN&brand=deriv`;
    let ws: WebSocket;
    let settled = false;

    try { ws = new WebSocket(url); }
    catch { reject(new Error(`Cannot open socket app_id=${appId}`)); return; }

    const settle = (fn: () => void) => { if (!settled) { settled = true; fn(); } };

    const timer = setTimeout(() => {
      settle(() => { try { ws.close(); } catch { /* */ } reject(new Error(`Timeout app_id=${appId}`)); });
    }, 12000);

    ws.onopen = () => { ws.send(JSON.stringify({ authorize: token, req_id: 1 })); };

    ws.onmessage = (evt) => {
      let msg: DerivMsg;
      try { msg = JSON.parse(evt.data as string) as DerivMsg; } catch { return; }
      if (msg.msg_type !== 'authorize') return;
      clearTimeout(timer);
      if (msg.error) {
        settle(() => { try { ws.close(); } catch { /* */ } reject(new Error(`[${msg.error!.code}] ${msg.error!.message}`)); });
      } else {
        const account = (msg as unknown as { authorize: DerivAccount }).authorize;
        settle(() => {
          ws.onopen = null; ws.onmessage = null; ws.onerror = null; ws.onclose = null;
          resolve({ ws, account });
        });
      }
    };

    ws.onerror = () => { clearTimeout(timer); settle(() => reject(new Error(`WS error app_id=${appId}`))); };
    ws.onclose = (e) => { clearTimeout(timer); settle(() => reject(new Error(`WS closed app_id=${appId} code=${e.code}`))); };
  });
}

// ─── Main client ──────────────────────────────────────────────────────────────

class DerivAPIClient {
  private ws: WebSocket | null = null;
  private reqId = 2;
  private pending = new Map<number, (msg: DerivMsg) => void>();
  private subs = new Map<string, MsgCb[]>();
  private token: string | null = null;
  private accountId: string | null = null;
  private accountType: 'real' | 'demo' = 'demo';
  private _appId = APP_ID;
  private _authorized = false;
  private reconnTimer: ReturnType<typeof setTimeout> | null = null;
  private onDisconnectCbs: Array<() => void> = [];
  private useOfficialWS = false;
  private officialWsUrl: string | null = null;

  // ── Primary connect: official v2 flow ─────────────────────────────────────

  async connectWithToken(
    token: string,
    accountId?: string,
    accountType: 'real' | 'demo' = 'demo'
  ): Promise<DerivAccount> {
    this.token = token;
    this.accountId = accountId || null;
    this.accountType = accountType;
    this._authorized = false;
    this.teardown();

    // Try official v2 flow first (if we have accountId)
    if (accountId) {
      try {
        const wsUrl = await getAuthenticatedWSUrl(token, accountId, accountType);
        this.officialWsUrl = wsUrl;

        const ws = await connectViaOfficialWS(wsUrl);
        this.ws = ws;
        this.useOfficialWS = true;
        this._authorized = true;
        this.wireUpWS(ws);

        // With official v2 WS, get account info via WS
        const account = await this.fetchAccountInfoViaWS(token);
        account.loginid = accountId;
        account.is_virtual = accountType === 'demo' ? 1 : 0;
        account.token = token;
        return account;
      } catch (officialErr) {
        console.warn('Official v2 WS failed, trying legacy:', officialErr);
        this.teardown();
      }
    }

    // Fallback: legacy WS with authorize message (still works for all operations)
    const errors: string[] = [];
    for (const appId of LEGACY_APP_IDS) {
      try {
        const { ws, account } = await tryLegacyAppId(appId, token);
        this.ws = ws;
        this._appId = appId;
        this._authorized = true;
        this.useOfficialWS = false;
        this.wireUpWS(ws);
        account.token = token;
        return account;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        errors.push(msg);
        const lower = msg.toLowerCase();
        // Only stop trying if token is definitively invalid
        if (lower.includes('[invalidtoken]') || lower.includes('token expired') || lower.includes('accountdisabled')) break;
      }
    }

    throw new Error(
      'Could not connect to Deriv.\n' +
      'Please ensure your token has Read + Trade permissions.\n' +
      `Details: ${errors[0] || 'Unknown error'}`
    );
  }

  // Alias for backward compat
  async authorize(token: string): Promise<DerivAccount> {
    return this.connectWithToken(token);
  }

  private async fetchAccountInfoViaWS(token: string): Promise<DerivAccount> {
    // On official v2 WS, send authorize to get account info
    try {
      const res = await this.send<{ authorize: DerivAccount }>({ authorize: token });
      return res.authorize || { loginid: '', currency: 'USD' };
    } catch {
      return { loginid: this.accountId || '', currency: 'USD' };
    }
  }

  private wireUpWS(ws: WebSocket) {
    ws.onmessage = (evt) => {
      try { this.dispatch(JSON.parse(evt.data as string) as DerivMsg); }
      catch { /* ignore parse errors */ }
    };
    ws.onerror = () => { this._authorized = false; };
    ws.onclose = (e) => {
      this._authorized = false;
      this.onDisconnectCbs.forEach(cb => cb());
      if (e.code !== 1000 && this.token) this.scheduleReconnect();
    };
  }

  private teardown() {
    if (this.reconnTimer) { clearTimeout(this.reconnTimer); this.reconnTimer = null; }
    if (this.ws) {
      this.ws.onopen = null; this.ws.onmessage = null;
      this.ws.onerror = null; this.ws.onclose = null;
      try { this.ws.close(1000); } catch { /* */ }
      this.ws = null;
    }
    this.pending.clear();
    this.subs.clear();
  }

  private scheduleReconnect() {
    if (this.reconnTimer) clearTimeout(this.reconnTimer);
    this.reconnTimer = setTimeout(async () => {
      if (!this.token) return;
      try {
        await this.connectWithToken(this.token, this.accountId || undefined, this.accountType);
      } catch { this.scheduleReconnect(); }
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
        reject(new Error('Not connected to Deriv'));
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
    const r = await this.send<{ active_symbols: ActiveSymbol[] }>({
      active_symbols: 'brief', product_type: 'basic',
    });
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
    const r = await this.send<{ history: TickHistory }>({
      ticks_history: symbol, end: 'latest', count, style: 'ticks',
    });
    return r.history;
  }

  async getCandles(symbol: string, granularity = 60, count = 200): Promise<CandleData[]> {
    const r = await this.send<{ candles: CandleData[] }>({
      ticks_history: symbol, style: 'candles', granularity, count, end: 'latest',
    });
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
    const r = await this.send<{ statement: { transactions: Transaction[] } }>({
      statement: 1, description: 1, limit,
    });
    return r.statement?.transactions || [];
  }

  async getProfitTable(): Promise<ProfitEntry[]> {
    const r = await this.send<{ profit_table: { transactions: ProfitEntry[] } }>({
      profit_table: 1, description: 1, limit: 50,
    });
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

  // ── Public WS helpers (no auth) ────────────────────────────────────────────

  static async getPublicSymbols(): Promise<ActiveSymbol[]> {
    return new Promise((resolve) => {
      const ws = new WebSocket(WS_PUBLIC);
      ws.onopen = () => {
        ws.send(JSON.stringify({ active_symbols: 'brief', product_type: 'basic', req_id: 1 }));
      };
      ws.onmessage = (evt) => {
        try {
          const msg = JSON.parse(evt.data as string) as { active_symbols?: ActiveSymbol[] };
          if (msg.active_symbols) { ws.close(); resolve(msg.active_symbols); }
        } catch { /* */ }
      };
      ws.onerror = () => resolve([]);
      setTimeout(() => { try { ws.close(); } catch { /* */ } resolve([]); }, 10000);
    });
  }

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  onDisconnect(cb: () => void) { this.onDisconnectCbs.push(cb); }

  disconnect() {
    this.token = null;
    this.accountId = null;
    this._authorized = false;
    this.teardown();
  }

  get connected() { return this.ws?.readyState === WebSocket.OPEN; }
  get authorized() { return this._authorized; }
  get usedAppId() { return this._appId; }
  get isOfficialWS() { return this.useOfficialWS; }
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
