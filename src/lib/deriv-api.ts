/**
 * Deriv WebSocket API Client
 * Official API: wss://ws.binaryws.com/websockets/v3
 * Docs: https://api.deriv.com/
 */

export const DERIV_WS_URL = 'wss://ws.binaryws.com/websockets/v3?app_id=';
export const DERIV_APP_ID = process.env.NEXT_PUBLIC_DERIV_APP_ID || '1089'; // Default public app_id

type MessageCallback = (data: DerivResponse) => void;

export interface DerivResponse {
  msg_type: string;
  error?: { code: string; message: string };
  [key: string]: unknown;
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

class DerivAPIClient {
  private ws: WebSocket | null = null;
  private reqId = 1;
  private callbacks = new Map<number, (data: DerivResponse) => void>();
  private subscriptions = new Map<string, MessageCallback[]>();
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private token: string | null = null;
  private isAuthorized = false;
  private messageQueue: string[] = [];
  private onConnectCallbacks: (() => void)[] = [];
  private onDisconnectCallbacks: (() => void)[] = [];
  private onAuthCallbacks: ((account: DerivAccount) => void)[] = [];
  private appId: string;

  constructor(appId?: string) {
    this.appId = appId || DERIV_APP_ID;
  }

  connect(token?: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (token) this.token = token;

      const url = `${DERIV_WS_URL}${this.appId}`;
      this.ws = new WebSocket(url);

      this.ws.onopen = () => {
        // Flush queued messages
        while (this.messageQueue.length > 0) {
          this.ws?.send(this.messageQueue.shift()!);
        }
        this.onConnectCallbacks.forEach(cb => cb());
        if (this.token) {
          this.authorize(this.token).then(() => resolve()).catch(reject);
        } else {
          resolve();
        }
      };

      this.ws.onmessage = (event) => {
        try {
          const data: DerivResponse = JSON.parse(event.data);
          this.handleMessage(data);
        } catch (e) {
          console.error('Failed to parse WS message', e);
        }
      };

      this.ws.onerror = (err) => {
        console.error('WebSocket error', err);
        reject(err);
      };

      this.ws.onclose = () => {
        this.isAuthorized = false;
        this.onDisconnectCallbacks.forEach(cb => cb());
        this.scheduleReconnect();
      };
    });
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = setTimeout(() => {
      if (this.token) this.connect(this.token);
    }, 5000);
  }

  private handleMessage(data: DerivResponse) {
    // Route to one-time callbacks
    const reqId = data.req_id as number;
    if (reqId && this.callbacks.has(reqId)) {
      const cb = this.callbacks.get(reqId)!;
      this.callbacks.delete(reqId);
      cb(data);
    }

    // Route to subscriptions
    const msgType = data.msg_type;
    if (msgType && this.subscriptions.has(msgType)) {
      this.subscriptions.get(msgType)!.forEach(cb => cb(data));
    }

    // Handle authorize
    if (msgType === 'authorize' && !data.error) {
      this.isAuthorized = true;
      const account = (data as unknown as { authorize: DerivAccount }).authorize;
      this.onAuthCallbacks.forEach(cb => cb(account));
    }
  }

  private send<T>(payload: Record<string, unknown>): Promise<T & DerivResponse> {
    return new Promise((resolve, reject) => {
      const id = this.reqId++;
      payload.req_id = id;

      this.callbacks.set(id, (data) => {
        if (data.error) reject(new Error(data.error.message));
        else resolve(data as T & DerivResponse);
      });

      const msg = JSON.stringify(payload);
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(msg);
      } else {
        this.messageQueue.push(msg);
      }
    });
  }

  // ─── Auth ───────────────────────────────────────────────────────────────────

  async authorize(token: string): Promise<DerivAccount> {
    this.token = token;
    const res = await this.send<{ authorize: DerivAccount }>({ authorize: token });
    return res.authorize;
  }

  async getAccountList(): Promise<DerivAccount[]> {
    const res = await this.send<{ account_list: DerivAccount[] }>({
      account_list: 1,
    });
    return res.account_list || [];
  }

  async switchAccount(token: string): Promise<DerivAccount> {
    return this.authorize(token);
  }

  // ─── Market Data ─────────────────────────────────────────────────────────────

  async getActiveSymbols(): Promise<ActiveSymbol[]> {
    const res = await this.send<{ active_symbols: ActiveSymbol[] }>({
      active_symbols: 'brief',
      product_type: 'basic',
    });
    return res.active_symbols || [];
  }

  subscribeToTicks(symbol: string, callback: (tick: TickData) => void): () => void {
    const id = this.reqId++;
    const payload = { ticks: symbol, subscribe: 1, req_id: id };

    const handler: MessageCallback = (data) => {
      if (data.msg_type === 'tick') {
        const tick = (data as unknown as { tick: TickData }).tick;
        if (tick?.symbol === symbol) callback(tick);
      }
    };

    if (!this.subscriptions.has('tick')) this.subscriptions.set('tick', []);
    this.subscriptions.get('tick')!.push(handler);

    const msg = JSON.stringify(payload);
    if (this.ws?.readyState === WebSocket.OPEN) this.ws.send(msg);
    else this.messageQueue.push(msg);

    return () => {
      const handlers = this.subscriptions.get('tick') || [];
      this.subscriptions.set('tick', handlers.filter(h => h !== handler));
      this.send({ forget_all: 'ticks' }).catch(() => {});
    };
  }

  async getCandles(symbol: string, granularity = 60, count = 100): Promise<CandleData[]> {
    const res = await this.send<{ candles: CandleData[] }>({
      ticks_history: symbol,
      style: 'candles',
      granularity,
      count,
      end: 'latest',
    });
    return res.candles || [];
  }

  async getTickHistory(symbol: string, count = 500): Promise<TickHistory> {
    const res = await this.send<{ history: TickHistory }>({
      ticks_history: symbol,
      end: 'latest',
      count,
      style: 'ticks',
    });
    return res.history;
  }

  // ─── Trading ─────────────────────────────────────────────────────────────────

  async getProposal(params: ProposalParams): Promise<ContractProposal> {
    const res = await this.send<{ proposal: ContractProposal }>({
      proposal: 1,
      amount: params.amount,
      basis: 'stake',
      contract_type: params.contract_type,
      currency: params.currency || 'USD',
      duration: params.duration,
      duration_unit: params.duration_unit || 't',
      symbol: params.symbol,
    });
    return res.proposal;
  }

  async buyContract(proposalId: string, price: number): Promise<BuyResponse> {
    const res = await this.send<{ buy: BuyResponse }>({
      buy: proposalId,
      price,
    });
    return res.buy;
  }

  async sellContract(contractId: number): Promise<unknown> {
    return this.send({ sell: contractId, price: 0 });
  }

  async getPortfolio(): Promise<PortfolioContract[]> {
    const res = await this.send<{ portfolio: { contracts: PortfolioContract[] } }>({
      portfolio: 1,
    });
    return res.portfolio?.contracts || [];
  }

  async getBalance(): Promise<{ balance: number; currency: string; loginid: string }> {
    const res = await this.send<{ balance: { balance: number; currency: string; loginid: string } }>({
      balance: 1,
    });
    return res.balance;
  }

  subscribeToBalance(callback: (balance: { balance: number; currency: string }) => void): () => void {
    const id = this.reqId++;
    const payload = { balance: 1, subscribe: 1, req_id: id };

    const handler: MessageCallback = (data) => {
      if (data.msg_type === 'balance') {
        const b = (data as unknown as { balance: { balance: number; currency: string } }).balance;
        if (b) callback(b);
      }
    };

    if (!this.subscriptions.has('balance')) this.subscriptions.set('balance', []);
    this.subscriptions.get('balance')!.push(handler);

    const msg = JSON.stringify(payload);
    if (this.ws?.readyState === WebSocket.OPEN) this.ws.send(msg);
    else this.messageQueue.push(msg);

    return () => {
      const handlers = this.subscriptions.get('balance') || [];
      this.subscriptions.set('balance', handlers.filter(h => h !== handler));
    };
  }

  async getTransactionHistory(limit = 50): Promise<Transaction[]> {
    const res = await this.send<{ statement: { transactions: Transaction[] } }>({
      statement: 1,
      description: 1,
      limit,
    });
    return res.statement?.transactions || [];
  }

  async getProfitTable(): Promise<ProfitEntry[]> {
    const res = await this.send<{ profit_table: { transactions: ProfitEntry[] } }>({
      profit_table: 1,
      description: 1,
      limit: 50,
    });
    return res.profit_table?.transactions || [];
  }

  // ─── Event Listeners ─────────────────────────────────────────────────────────

  onConnect(cb: () => void) { this.onConnectCallbacks.push(cb); }
  onDisconnect(cb: () => void) { this.onDisconnectCallbacks.push(cb); }
  onAuth(cb: (account: DerivAccount) => void) { this.onAuthCallbacks.push(cb); }

  disconnect() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.token = null;
    this.ws?.close();
  }

  get connected() { return this.ws?.readyState === WebSocket.OPEN; }
  get authorized() { return this.isAuthorized; }
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DerivAccount {
  account_id?: string;
  loginid: string;
  token?: string;
  email?: string;
  fullname?: string;
  balance?: number;
  currency?: string;
  account_type?: string;
  is_virtual?: number;
  landing_company_name?: string;
}

export interface CandleData {
  epoch: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

export interface TickHistory {
  prices: number[];
  times: number[];
}

export interface ProposalParams {
  symbol: string;
  amount: number;
  contract_type: 'CALL' | 'PUT' | 'DIGITMATCH' | 'DIGITDIFF' | 'EVEN' | 'ODD';
  duration: number;
  duration_unit?: 't' | 's' | 'm' | 'h' | 'd';
  currency?: string;
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

// Singleton
let clientInstance: DerivAPIClient | null = null;
export function getDerivClient(): DerivAPIClient {
  if (!clientInstance) clientInstance = new DerivAPIClient();
  return clientInstance;
}

export { DerivAPIClient };
