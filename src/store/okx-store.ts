import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { OKXTicker, OKXOrder, OKXPosition, OKXBalance } from '@/lib/okx-api';
import type { TradingSignal } from '@/lib/trading-engine';

export type OKXConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export interface OKXTradeRecord {
  id: string;
  instId: string;
  side: 'buy' | 'sell';
  size: string;
  price?: string;
  ordType: 'market' | 'limit';
  confidence: number;
  timestamp: number;
  status: 'pending' | 'filled' | 'canceled' | 'failed';
  fillPrice?: string;
  pnl?: number;
  source: 'auto' | 'manual';
  ordId?: string;
}

export interface OKXRiskSettings {
  minConfidence: number;
  orderSizeUSD: number;
  maxDailyLossUSD: number;
  maxConcurrentOrders: number;
  cooldownSeconds: number;
  tradingPairs: string[];
  instType: 'SPOT' | 'SWAP';
}

const DEFAULT_OKX_RISK: OKXRiskSettings = {
  minConfidence: 68,
  orderSizeUSD: 10,
  maxDailyLossUSD: 50,
  maxConcurrentOrders: 3,
  cooldownSeconds: 60,
  tradingPairs: ['BTC-USDT', 'ETH-USDT', 'SOL-USDT', 'BNB-USDT'],
  instType: 'SPOT',
};

interface OKXStore {
  // Connection
  status: OKXConnectionStatus;
  error: string | null;
  setStatus: (s: OKXConnectionStatus, err?: string) => void;

  // Credentials (encrypted in persist — never logged)
  credentials: { apiKey: string; apiSecret: string; passphrase: string } | null;
  setCredentials: (c: { apiKey: string; apiSecret: string; passphrase: string } | null) => void;

  // Account
  balances: OKXBalance[];
  totalEquityUSD: number;
  positions: OKXPosition[];
  setBalances: (b: OKXBalance[], total: number) => void;
  setPositions: (p: OKXPosition[]) => void;

  // Market
  tickers: Record<string, OKXTicker>;
  signals: Record<string, TradingSignal>;
  setTicker: (t: OKXTicker) => void;
  setSignal: (instId: string, signal: TradingSignal) => void;

  // Orders
  openOrders: OKXOrder[];
  tradeHistory: OKXTradeRecord[];
  setOpenOrders: (orders: OKXOrder[]) => void;
  addTrade: (t: OKXTradeRecord) => void;
  updateTrade: (id: string, updates: Partial<OKXTradeRecord>) => void;

  // Auto trading
  autonomousMode: boolean;
  setAutonomousMode: (on: boolean) => void;
  riskSettings: OKXRiskSettings;
  setRiskSettings: (s: Partial<OKXRiskSettings>) => void;

  // Stats
  dailyPnlUSD: number;
  winRate: number;
  totalTrades: number;
  updateStats: () => void;

  // Notifications
  notifications: Array<{ id: string; type: string; title: string; message: string; ts: number }>;
  addNotification: (n: { type: string; title: string; message: string }) => void;
  dismissNotification: (id: string) => void;
}

export const useOKXStore = create<OKXStore>()(
  persist(
    (set, get) => ({
      status: 'disconnected',
      error: null,
      setStatus: (s, err) => set({ status: s, error: err || null }),

      credentials: null,
      setCredentials: (c) => set({ credentials: c }),

      balances: [],
      totalEquityUSD: 0,
      positions: [],
      setBalances: (balances, totalEquityUSD) => set({ balances, totalEquityUSD }),
      setPositions: (positions) => set({ positions }),

      tickers: {},
      signals: {},
      setTicker: (t) => set(state => ({ tickers: { ...state.tickers, [t.instId]: t } })),
      setSignal: (instId, signal) => set(state => ({ signals: { ...state.signals, [instId]: signal } })),

      openOrders: [],
      tradeHistory: [],
      setOpenOrders: (openOrders) => set({ openOrders }),
      addTrade: (t) => set(state => ({ tradeHistory: [t, ...state.tradeHistory].slice(0, 200) })),
      updateTrade: (id, updates) => set(state => ({
        tradeHistory: state.tradeHistory.map(t => t.id === id ? { ...t, ...updates } : t),
      })),

      autonomousMode: false,
      setAutonomousMode: (on) => set({ autonomousMode: on }),
      riskSettings: DEFAULT_OKX_RISK,
      setRiskSettings: (s) => set(state => ({ riskSettings: { ...state.riskSettings, ...s } })),

      dailyPnlUSD: 0,
      winRate: 0,
      totalTrades: 0,
      updateStats: () => {
        const { tradeHistory } = get();
        const todayStart = new Date().setHours(0, 0, 0, 0);
        const todayTrades = tradeHistory.filter(t => t.timestamp >= todayStart && t.status === 'filled');
        const dailyPnlUSD = todayTrades.reduce((a, t) => a + (t.pnl || 0), 0);
        const filled = tradeHistory.filter(t => t.status === 'filled');
        const wins = filled.filter(t => (t.pnl || 0) > 0).length;
        set({
          dailyPnlUSD: Math.round(dailyPnlUSD * 100) / 100,
          totalTrades: filled.length,
          winRate: filled.length > 0 ? Math.round((wins / filled.length) * 100) : 0,
        });
      },

      notifications: [],
      addNotification: (n) => set(state => ({
        notifications: [{ ...n, id: Math.random().toString(36).slice(2), ts: Date.now() }, ...state.notifications].slice(0, 20),
      })),
      dismissNotification: (id) => set(state => ({
        notifications: state.notifications.filter(n => n.id !== id),
      })),
    }),
    {
      name: 'okx-agent-v1',
      partialize: (state) => ({
        credentials: state.credentials,
        riskSettings: state.riskSettings,
        tradeHistory: state.tradeHistory,
        // Never persist autonomousMode
      }),
    }
  )
);
