/**
 * Deriv API Client
 * Pure browser WebSocket — no server-side proxy needed.
 * Supports pat_def… (new PAT format) and legacy tokens.
 *
 * Key insight: browser WebSocket sends Origin automatically.
 * Vercel deploys on *.vercel.app — Deriv accepts this for app_id=16929.
 * We try all known app_ids until one authorizes successfully.
 */

const WS_ENDPOINT = 'wss://ws.binaryws.com/websockets/v3';

// app_id=16929 = app.deriv.com (where pat_ tokens are issued) — try FIRST
// app_id=1089  = legacy public app
// app_id=36544 = SmartTrader
const ALL_APP_IDS = ['16929', '1089', '36544', '11780', '24902'];

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

// ── Try a single app_id: open WS + send authorize + wait for response ─────────

function tryAppId(appId: string, token: string): Promise<{ ws: WebSocket; account: DerivAccount }> {
  return new Promise((resolve, reject) => {
    const url = `${WS_ENDPOINT}?app_id=${appId}&l=EN&brand=deriv`;
    let ws: WebSocket;
    let settled = false;

    try {
      ws = new WebSocket(url);
    } catch {
      reject(new Error(`Cannot open WebSocket for app_id=${appId}`));
      return;
    }

    const done = (fn: () => void) => {
      if (settled) return;
      settled = true;
      fn();
    };

    const timer = setTimeout(() => {
      done(() => {
        try { ws.close(); } catch { /* */ }
        reject(new Error(`Timeout app_id=${appId}`));
      });
    }, 12000);

    ws.onopen = () => {
      ws.send(JSON.stringify({ authorize: token, req_id: 1 }));
    };

    ws.onmessage = (evt) => {
      let msg: DerivMsg;
      try { msg = JSON.parse(evt.data as string) as DerivMsg; }
      catch { return; }

      if (msg.msg_type !== 'authorize') return;

      clearTimeout(timer);

      if (msg.error) {
        done(() => {
          try { ws.close(); } catch { /* */ }
          reject(new Error(`[${msg.error!.code}] ${msg.error!.message}`));
        });
      } else {
        const account = (msg as unknown as { authorize: DerivAccount }).authorize;
        done(() => {
          // Keep ws open — hand it to the client
          ws.onopen = null;
          ws.onmessage = null;
          ws.onerror = null;
          ws.onclose = null;
          resolve({ ws, account });
        });
      }
    };

    ws.onerror = () => {
      clearTimeout(timer);
      done(() => reject(new Error(`WS error app_id=${appId}`)));
    };

    ws.onclose = (e) => {
      clearTimeout(timer);
      done(() => reject(new Error(`WS closed app_id=${appId} code=${e.code}`)));
    };
  });
}

// ── Connect: try every app_id until one works ─────────────────────────────────

async function connectWithAllAppIds(token: string): Promise<{ ws: WebSocket; account: DerivAccount; appId: string }> {
  const errors: string[] = [];

  for (const appId of ALL_APP_IDS) {
    try {
      const { ws, account } = await tryAppId(appId, token);
      return { ws, account, appId };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`app_id=${appId}: ${msg}`);

      // Only abort early on errors that mean the token itself is certainly bad
      // (NOT InvalidToken — that can mean wrong app_id too)
      const lower = msg.toLowerCase();
      if (
        lower.includes('[accountdisabled]') ||
        lower.includes('[accountlocked]') ||
        lower.includes('[tokenexpired]') ||
        lower.includes('token expired') ||
        lower.includes('account disabled')
      ) {
        break;
      }
      // For InvalidToken, WS error, timeout — try next app_id
    }
  }

  // All failed — build a clear error message
  const allLower = errors.join(' ').toLowerCase();
  const allInvalidToken = errors.filter(e => e.toLowerCase().includes('invalidtoken') || e.toLowerCase().includes('invalid token')).length;

  if (allInvalidToken >= 3) {
    // Most app_ids returned InvalidToken — token is genuinely bad
    throw new Error(
      'Deriv rejected this token (InvalidToken).\n\n' +
      'Please check:\n' +
      '1. Token is copied in full — pat_ tokens are 40+ characters\n' +
      '2. Token has "Read" AND "Trade" permissions\n' +
      '3. Token was not deleted or expired\n\n' +
      'Create a new token at: app.deriv.com → Account Settings → API Token'
    );
  }

  if (allLower.includes('timeout') || allLower.includes('ws error') || allLower.includes('closed')) {
    throw new Error(
      'Cannot reach Deriv servers.\n' +
      'Check your internet connection and try again.'
    );
  }

  throw new Error(`Connection failed:\n${errors.join('\n')}`);
}

// ── Main client class ─────────────────────────────────────────────────────────

class DerivAPIClient {
  private ws: WebSocket | null = null;
  private reqId = 2;
  private pending = new Map<number, (msg: DerivMsg) => void>();
  private subs = new Map<string, MsgCb[]>();
  private token: string | null = null;
  private _appId = '16929';
  private _authorized = false;
  private reconnTimer: ReturnType<typeof setTimeout> | null = null;
  private onDisconnectCbs: Array<() => void> = [];

  async connectWithToken(token: string): Promise<DerivAccount> {
    this.token = token;
    this._authorized = false;
    this.teardown();

    const { ws, account, appId } = await connectWithAllAppIds(token);

    this.ws = ws;
    this._appId = appId;
    this._authorized = true;

    ws.onmessage = (evt) => {
      try { this.dispatch(JSON.parse(evt.data as string) as DerivMsg); }
      catch { /* */ }
    };
    ws.onerror = () => { this._authorized = false; };
    ws.onclose = (e) => {
      this._authorized = false;
      this.onDisconnectCbs.forEach(cb => cb());
      if (e.code !== 1000 && this.token) this.scheduleReconnect();
    };

    return account;
  }

  // Alias kept for backward compat with any code that calls authorize()
  async authorize(token: string): Promise<DerivAccount> {
    return this.connectWithToken(token);
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

  // ── Market ─────────────────────────────────────────────────────────────────

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

// ── Singleton ─────────────────────────────────────────────────────────────────

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
