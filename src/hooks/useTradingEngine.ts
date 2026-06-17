'use client';
/**
 * Deriv Trading Engine
 * Uses official Deriv API v2:
 *   - REST /api/deriv-otp to get authenticated WS URL
 *   - WebSocket for all real-time trading operations
 *   - Balance subscription keeps app in sync with real Deriv account
 */
import { useEffect, useRef, useCallback } from 'react';
import { getDerivClient, resetDerivClient } from '@/lib/deriv-api';
import { analyzeMarket, historyToPrices } from '@/lib/trading-engine';
import { useTradingStore } from '@/store/trading-store';
import type { TradeRecord } from '@/store/trading-store';

const ANALYSIS_INTERVAL_MS = 15000;
const cooldowns = new Map<string, number>();

export function useTradingEngine() {
  const {
    connectionStatus, setConnectionStatus,
    setActiveAccount, setBalance,
    selectedSymbols, addTick, setSignal,
    setOpenContracts, setTransactions,
    autonomousMode, riskSettings,
    addTrade, updateTrade, addNotification, updateStats,
    dailyPnl, setSymbols,
  } = useTradingStore();

  const analysisTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const tickUnsubs = useRef<Map<string, () => void>>(new Map());
  const balUnsub = useRef<(() => void) | null>(null);
  const connecting = useRef(false);

  // ── connect ───────────────────────────────────────────────────────────────

  const connect = useCallback(async (
    token: string,
    accountId?: string,
    accountType: 'real' | 'demo' = 'demo'
  ) => {
    if (connecting.current) return;
    connecting.current = true;
    setConnectionStatus('connecting');

    try {
      resetDerivClient();
      const client = getDerivClient();

      // Official v2 flow: server gets OTP → authenticated WS URL
      // Fallback: legacy WS with authorize message
      const account = await client.connectWithToken(token, accountId, accountType);

      setActiveAccount(account);
      setConnectionStatus('authorized');

      // Real-time balance subscription — keeps app balance = real Deriv balance
      try {
        const bal = await client.getBalance();
        setBalance(bal.balance, bal.currency);
        balUnsub.current?.();
        balUnsub.current = client.subscribeToBalance((b) => setBalance(b.balance, b.currency));
      } catch { /* non-fatal */ }

      // Active symbols
      try {
        const syms = await client.getActiveSymbols();
        setSymbols(syms);
      } catch { /* non-fatal */ }

      // Portfolio + history
      try {
        const [portfolio, txs] = await Promise.allSettled([
          client.getPortfolio(),
          client.getTransactionHistory(50),
        ]);
        if (portfolio.status === 'fulfilled') setOpenContracts(portfolio.value);
        if (txs.status === 'fulfilled') setTransactions(txs.value);
      } catch { /* non-fatal */ }

      const isReal = accountType === 'real';
      addNotification({
        type: 'success',
        title: `Connected to Deriv ${isReal ? '🟢 REAL' : '🟡 DEMO'}`,
        message: `${account.loginid} • ${account.currency || 'USD'} account active`,
      });

    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setConnectionStatus('error', msg);
      addNotification({ type: 'error', title: 'Connection Failed', message: msg });
      resetDerivClient();
    } finally {
      connecting.current = false;
    }
  }, [setConnectionStatus, setActiveAccount, setBalance, setSymbols, setOpenContracts, setTransactions, addNotification]);

  // ── subscribeSymbols ──────────────────────────────────────────────────────

  const subscribeSymbols = useCallback((symbols: string[]) => {
    const client = getDerivClient();
    if (!client.connected) return;
    tickUnsubs.current.forEach(fn => fn());
    tickUnsubs.current.clear();
    symbols.forEach(sym => {
      try {
        const unsub = client.subscribeToTicks(sym, (tick) => addTick(tick));
        tickUnsubs.current.set(sym, unsub);
      } catch { /* skip */ }
    });
  }, [addTick]);

  // ── runAnalysis ───────────────────────────────────────────────────────────

  const runAnalysis = useCallback(async () => {
    if (connectionStatus !== 'authorized') return;
    const client = getDerivClient();
    if (!client.connected) return;

    for (const symbol of selectedSymbols) {
      try {
        const history = await client.getTickHistory(symbol, 200);
        if (!history?.prices?.length) continue;
        const { prices, times } = historyToPrices(history);
        if (prices.length < 30) continue;

        const signal = analyzeMarket(symbol, prices, times);
        setSignal(symbol, signal);

        if (!autonomousMode || signal.direction === 'NEUTRAL') continue;
        if (signal.confidence < riskSettings.minConfidence) continue;
        if (dailyPnl <= -riskSettings.maxDailyLoss) {
          addNotification({ type: 'warning', title: 'Daily Loss Limit', message: 'Auto-trading paused.' });
          continue;
        }
        if (Date.now() - (cooldowns.get(symbol) || 0) < riskSettings.cooldownSeconds * 1000) continue;
        const { openContracts } = useTradingStore.getState();
        if (openContracts.length >= riskSettings.maxConcurrentTrades) continue;

        cooldowns.set(symbol, Date.now());
        await executeTrade(
          symbol,
          signal.direction as 'CALL' | 'PUT',
          riskSettings.stakeAmount,
          signal.confidence,
          'auto',
        );
      } catch { /* skip symbol */ }
    }
  }, [connectionStatus, selectedSymbols, autonomousMode, riskSettings, dailyPnl, setSignal, addNotification]);

  // ── executeTrade ──────────────────────────────────────────────────────────

  const executeTrade = useCallback(async (
    symbol: string,
    direction: 'CALL' | 'PUT',
    stake: number,
    confidence: number,
    source: 'auto' | 'manual',
    duration?: number,
    durationUnit?: 't' | 'm',
  ): Promise<TradeRecord | null> => {
    if (connectionStatus !== 'authorized') {
      addNotification({ type: 'error', title: 'Not Connected', message: 'Connect your Deriv account first.' });
      return null;
    }
    const client = getDerivClient();
    const tradeId = `t_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`;
    const sig = useTradingStore.getState().signals[symbol];
    const dur = duration ?? sig?.suggestedDuration ?? 5;
    const durUnit = durationUnit ?? sig?.durationType ?? 't';

    const pending: TradeRecord = {
      id: tradeId, symbol, direction, stake, confidence,
      timestamp: Date.now(), status: 'pending', source,
    };
    addTrade(pending);

    try {
      const proposal = await client.getProposal({
        symbol, amount: stake, contract_type: direction,
        duration: dur, duration_unit: durUnit,
      });
      const buy = await client.buyContract(proposal.id, proposal.ask_price);

      // Balance after trade comes directly from Deriv — real account sync
      setBalance(buy.balance_after);

      updateTrade(tradeId, {
        status: 'open',
        contractId: buy.contract_id,
        buyPrice: buy.buy_price,
        payout: buy.payout,
      });

      addNotification({
        type: 'info',
        title: `${source === 'auto' ? '🤖 Auto' : '👤 Manual'} Trade Placed`,
        message: `${direction} ${symbol} • $${stake} stake • ${confidence}% conf`,
      });

      monitorContract(tradeId, buy.contract_id);
      return { ...pending, status: 'open' };
    } catch (err) {
      updateTrade(tradeId, { status: 'lost', profit: -stake });
      addNotification({
        type: 'error',
        title: 'Trade Error',
        message: err instanceof Error ? err.message : 'Trade failed',
      });
      updateStats();
      return null;
    }
  }, [connectionStatus, addTrade, updateTrade, setBalance, addNotification, updateStats]);

  // ── monitorContract ───────────────────────────────────────────────────────

  const monitorContract = useCallback((tradeId: string, contractId: number) => {
    let attempts = 0;
    const poll = async () => {
      if (attempts++ > 120) return;
      try {
        const client = getDerivClient();
        const portfolio = await client.getPortfolio();
        setOpenContracts(portfolio);
        if (!portfolio.find(c => c.contract_id === contractId)) {
          const profits = await client.getProfitTable();
          const entry = profits.find(p => p.contract_id === contractId);
          if (entry) {
            const profit = entry.sell_price - entry.buy_price;
            updateTrade(tradeId, {
              status: profit > 0 ? 'won' : 'lost',
              profit: Math.round(profit * 100) / 100,
            });
            addNotification({
              type: profit > 0 ? 'success' : 'error',
              title: profit > 0 ? '✅ Trade Won' : '❌ Trade Lost',
              message: `P&L: ${profit >= 0 ? '+' : ''}$${profit.toFixed(2)}`,
            });
            updateStats();
            // Re-fetch real balance from Deriv after settlement
            try {
              const bal = await client.getBalance();
              setBalance(bal.balance, bal.currency);
            } catch { /* non-fatal */ }
          }
          return;
        }
      } catch { /* retry */ }
      setTimeout(poll, 2000);
    };
    setTimeout(poll, 2000);
  }, [setOpenContracts, updateTrade, addNotification, updateStats, setBalance]);

  // ── Auto-connect saved tokens ─────────────────────────────────────────────

  useEffect(() => {
    const { tokens, connectionStatus: cs } = useTradingStore.getState();
    if (tokens.length > 0 && cs === 'disconnected') {
      const first = tokens[0];
      connect(first.token, first.loginid, first.isDemo ? 'demo' : 'real');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Tick subscriptions ────────────────────────────────────────────────────

  useEffect(() => {
    if (connectionStatus === 'authorized') subscribeSymbols(selectedSymbols);
    return () => {
      tickUnsubs.current.forEach(fn => fn());
      tickUnsubs.current.clear();
    };
  }, [connectionStatus, selectedSymbols, subscribeSymbols]);

  // ── Analysis loop ─────────────────────────────────────────────────────────

  useEffect(() => {
    if (connectionStatus !== 'authorized') return;
    runAnalysis();
    analysisTimer.current = setInterval(runAnalysis, ANALYSIS_INTERVAL_MS);
    return () => { if (analysisTimer.current) clearInterval(analysisTimer.current); };
  }, [connectionStatus, runAnalysis]);

  return { connect, executeTrade };
}
