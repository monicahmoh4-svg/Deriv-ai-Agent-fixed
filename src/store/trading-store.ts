import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { DerivAccount, ActiveSymbol, TickData, Transaction, PortfolioContract } from '@/lib/deriv-api';
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

export interface Notification {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message: string;
  timestamp: number;
}

// Extended token type includes accountId and type for official v2 flow
export interface SavedToken {
  loginid: string;
  token: string;
  isDemo: boolean;
  accountType: 'real' | 'demo';
  currency?: string;
}

interface TradingStore {
  connectionStatus: ConnectionStatus;
  connectionError: string | null;
  setConnectionStatus: (s: ConnectionStatus, err?: string) => void;

  accounts: DerivAccount[];
  activeAccount: DerivAccount | null;
  tokens: SavedToken[];
  setAccounts: (a: DerivAccount[]) => void;
  setActiveAccount: (a: DerivAccount) => void;
  addToken: (loginid: string, token: string, isDemo: boolean, currency?: string) => void;
  removeToken: (loginid: string) => void;

  balance: number;
  currency: string;
  setBalance: (balance: number, currency?: string) => void;

  symbols: ActiveSymbol[];
  selectedSymbols: string[];
  ticks: Record<string, TickData[]>;
  signals: Record<string, TradingSignal>;
  setSymbols: (s: ActiveSymbol[]) => void;
  toggleSymbol: (s: string) => void;
  addTick: (t: TickData) => void;
  setSignal: (symbol: string, signal: TradingSignal) => void;

  openContracts: PortfolioContract[];
  setOpenContracts: (c: PortfolioContract[]) => void;

  tradeHistory: TradeRecord[];
  addTrade: (t: TradeRecord) => void;
  updateTrade: (id: string, u: Partial<TradeRecord>) => void;

  transactions: Transaction[];
  setTransactions: (t: Transaction[]) => void;

  autonomousMode: boolean;
  setAutonomousMode: (on: boolean) => void;
  riskSettings: RiskSettings;
  setRiskSettings: (s: Partial<RiskSettings>) => void;

  dailyPnl: number;
  totalTrades: number;
  winRate: number;
  updateStats: () => void;

  activeTab: string;
  setActiveTab: (t: string) => void;
  notifications: Notification[];
  addNotification: (n: Omit<Notification, 'id' | 'timestamp'>) => void;
  dismissNotification: (id: string) => void;
}

export const useTradingStore = create<TradingStore>()(
  persist(
    (set, get) => ({
      connectionStatus: 'disconnected',
      connectionError: null,
      setConnectionStatus: (s, err) => set({ connectionStatus: s, connectionError: err || null }),

      accounts: [],
      activeAccount: null,
      tokens: [],
      setAccounts: (accounts) => set({ accounts }),
      setActiveAccount: (account) => set({ activeAccount: account }),
      addToken: (loginid, token, isDemo, currency) => set(state => ({
        tokens: [
          ...state.tokens.filter(t => t.loginid !== loginid),
          { loginid, token, isDemo, accountType: isDemo ? 'demo' : 'real', currency },
        ],
      })),
      removeToken: (loginid) => set(state => ({ tokens: state.tokens.filter(t => t.loginid !== loginid) })),

      balance: 0,
      currency: 'USD',
      setBalance: (balance, currency) => set(s => ({ balance, currency: currency || s.currency })),

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
        return { ticks: { ...state.ticks, [tick.symbol]: [...existing, tick].slice(-500) } };
      }),
      setSignal: (symbol, signal) => set(state => ({ signals: { ...state.signals, [symbol]: signal } })),

      openContracts: [],
      setOpenContracts: (openContracts) => set({ openContracts }),

      tradeHistory: [],
      addTrade: (trade) => set(state => ({ tradeHistory: [trade, ...state.tradeHistory].slice(0, 200) })),
      updateTrade: (id, updates) => set(state => ({
        tradeHistory: state.tradeHistory.map(t => t.id === id ? { ...t, ...updates } : t),
      })),

      transactions: [],
      setTransactions: (transactions) => set({ transactions }),

      autonomousMode: false,
      setAutonomousMode: (on) => set({ autonomousMode: on }),
      riskSettings: DEFAULT_RISK_SETTINGS,
      setRiskSettings: (settings) => set(state => ({ riskSettings: { ...state.riskSettings, ...settings } })),

      dailyPnl: 0,
      totalTrades: 0,
      winRate: 0,
      updateStats: () => {
        const { tradeHistory } = get();
        const todayStart = new Date().setHours(0, 0, 0, 0);
        const todayTrades = tradeHistory.filter(t => t.timestamp >= todayStart && (t.status === 'won' || t.status === 'lost'));
        const dailyPnl = todayTrades.reduce((a, t) => a + (t.profit || 0), 0);
        const allClosed = tradeHistory.filter(t => t.status === 'won' || t.status === 'lost');
        const wins = allClosed.filter(t => t.status === 'won').length;
        set({
          dailyPnl: Math.round(dailyPnl * 100) / 100,
          totalTrades: allClosed.length,
          winRate: allClosed.length > 0 ? Math.round((wins / allClosed.length) * 100) : 0,
        });
      },

      activeTab: 'dashboard',
      setActiveTab: (tab) => set({ activeTab: tab }),
      notifications: [],
      addNotification: (n) => set(state => ({
        notifications: [{ ...n, id: Math.random().toString(36).slice(2), timestamp: Date.now() }, ...state.notifications].slice(0, 20),
      })),
      dismissNotification: (id) => set(state => ({ notifications: state.notifications.filter(n => n.id !== id) })),
    }),
    {
      name: 'deriv-ai-v3',
      partialize: (state) => ({
        tokens: state.tokens,
        selectedSymbols: state.selectedSymbols,
        riskSettings: state.riskSettings,
        tradeHistory: state.tradeHistory,
        // Never persist autonomousMode — safety
      }),
    }
  )
);
