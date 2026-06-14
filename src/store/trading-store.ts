import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  DerivAccount,
  ActiveSymbol,
  TickData,
  Transaction,
  PortfolioContract,
  BuyResponse,
} from '@/lib/deriv-api';
import type { TradingSignal, RiskSettings } from '@/lib/trading-engine';
import { DEFAULT_RISK_SETTINGS } from '@/lib/trading-engine';

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'authorized' | 'error';

export interface TradeRecord {
  id: string;
  symbol: string;
  direction: 'CALL' | 'PUT';
  stake: number;
  confidence: number;
  timestamp: number;
  status: 'pending' | 'open' | 'won' | 'lost' | 'sold';
  profit?: number;
  contractId?: number;
  buyPrice?: number;
  payout?: number;
  source: 'auto' | 'manual';
}

interface TradingStore {
  // Connection
  connectionStatus: ConnectionStatus;
  connectionError: string | null;
  setConnectionStatus: (s: ConnectionStatus, err?: string) => void;

  // Accounts
  accounts: DerivAccount[];
  activeAccount: DerivAccount | null;
  tokens: { loginid: string; token: string; isDemo: boolean }[];
  setAccounts: (accounts: DerivAccount[]) => void;
  setActiveAccount: (account: DerivAccount) => void;
  addToken: (loginid: string, token: string, isDemo: boolean) => void;
  removeToken: (loginid: string) => void;

  // Balance
  balance: number;
  currency: string;
  setBalance: (balance: number, currency?: string) => void;

  // Market
  symbols: ActiveSymbol[];
  selectedSymbols: string[];
  ticks: Record<string, TickData[]>;
  signals: Record<string, TradingSignal>;
  setSymbols: (symbols: ActiveSymbol[]) => void;
  toggleSymbol: (symbol: string) => void;
  addTick: (tick: TickData) => void;
  setSignal: (symbol: string, signal: TradingSignal) => void;

  // Portfolio
  openContracts: PortfolioContract[];
  setOpenContracts: (contracts: PortfolioContract[]) => void;

  // Trade history
  tradeHistory: TradeRecord[];
  addTrade: (trade: TradeRecord) => void;
  updateTrade: (id: string, updates: Partial<TradeRecord>) => void;

  // Transactions
  transactions: Transaction[];
  setTransactions: (txs: Transaction[]) => void;

  // Auto-trading
  autonomousMode: boolean;
  setAutonomousMode: (on: boolean) => void;
  riskSettings: RiskSettings;
  setRiskSettings: (settings: Partial<RiskSettings>) => void;

  // Stats
  dailyPnl: number;
  totalTrades: number;
  winRate: number;
  updateStats: () => void;

  // UI
  activeTab: string;
  setActiveTab: (tab: string) => void;
  notifications: Notification[];
  addNotification: (n: Omit<Notification, 'id' | 'timestamp'>) => void;
  dismissNotification: (id: string) => void;
}

export interface Notification {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message: string;
  timestamp: number;
}

export const useTradingStore = create<TradingStore>()(
  persist(
    (set, get) => ({
      // Connection
      connectionStatus: 'disconnected',
      connectionError: null,
      setConnectionStatus: (s, err) => set({ connectionStatus: s, connectionError: err || null }),

      // Accounts
      accounts: [],
      activeAccount: null,
      tokens: [],
      setAccounts: (accounts) => set({ accounts }),
      setActiveAccount: (account) => set({ activeAccount: account }),
      addToken: (loginid, token, isDemo) => set(state => ({
        tokens: [
          ...state.tokens.filter(t => t.loginid !== loginid),
          { loginid, token, isDemo },
        ],
      })),
      removeToken: (loginid) => set(state => ({
        tokens: state.tokens.filter(t => t.loginid !== loginid),
      })),

      // Balance
      balance: 0,
      currency: 'USD',
      setBalance: (balance, currency) => set(s => ({ balance, currency: currency || s.currency })),

      // Market
      symbols: [],
      selectedSymbols: ['R_100', 'R_50', '1HZ100V'],
      ticks: {},
      signals: {},
      setSymbols: (symbols) => set({ symbols }),
      toggleSymbol: (symbol) => set(state => ({
        selectedSymbols: state.selectedSymbols.includes(symbol)
          ? state.selectedSymbols.filter(s => s !== symbol)
          : [...state.selectedSymbols, symbol].slice(0, 6),
      })),
      addTick: (tick) => set(state => {
        const existing = state.ticks[tick.symbol] || [];
        const updated = [...existing, tick].slice(-500); // Keep last 500 ticks
        return { ticks: { ...state.ticks, [tick.symbol]: updated } };
      }),
      setSignal: (symbol, signal) => set(state => ({
        signals: { ...state.signals, [symbol]: signal },
      })),

      // Portfolio
      openContracts: [],
      setOpenContracts: (contracts) => set({ openContracts: contracts }),

      // Trade history
      tradeHistory: [],
      addTrade: (trade) => set(state => ({
        tradeHistory: [trade, ...state.tradeHistory].slice(0, 200),
      })),
      updateTrade: (id, updates) => set(state => ({
        tradeHistory: state.tradeHistory.map(t => t.id === id ? { ...t, ...updates } : t),
      })),

      // Transactions
      transactions: [],
      setTransactions: (txs) => set({ transactions: txs }),

      // Auto-trading
      autonomousMode: false,
      setAutonomousMode: (on) => set({ autonomousMode: on }),
      riskSettings: DEFAULT_RISK_SETTINGS,
      setRiskSettings: (settings) => set(state => ({
        riskSettings: { ...state.riskSettings, ...settings },
      })),

      // Stats
      dailyPnl: 0,
      totalTrades: 0,
      winRate: 0,
      updateStats: () => {
        const { tradeHistory } = get();
        const now = Date.now();
        const todayStart = new Date().setHours(0, 0, 0, 0);
        const todayTrades = tradeHistory.filter(t => t.timestamp >= todayStart && (t.status === 'won' || t.status === 'lost'));
        const dailyPnl = todayTrades.reduce((acc, t) => acc + (t.profit || 0), 0);
        const allClosed = tradeHistory.filter(t => t.status === 'won' || t.status === 'lost');
        const wins = allClosed.filter(t => t.status === 'won').length;
        set({
          dailyPnl: Math.round(dailyPnl * 100) / 100,
          totalTrades: allClosed.length,
          winRate: allClosed.length > 0 ? Math.round((wins / allClosed.length) * 100) : 0,
        });
      },

      // UI
      activeTab: 'dashboard',
      setActiveTab: (tab) => set({ activeTab: tab }),
      notifications: [],
      addNotification: (n) => set(state => ({
        notifications: [
          { ...n, id: Math.random().toString(36).slice(2), timestamp: Date.now() },
          ...state.notifications,
        ].slice(0, 20),
      })),
      dismissNotification: (id) => set(state => ({
        notifications: state.notifications.filter(n => n.id !== id),
      })),
    }),
    {
      name: 'deriv-ai-agent',
      partialize: (state) => ({
        tokens: state.tokens,
        selectedSymbols: state.selectedSymbols,
        riskSettings: state.riskSettings,
        tradeHistory: state.tradeHistory,
        autonomousMode: false, // Never persist auto mode — safety
      }),
    }
  )
);
