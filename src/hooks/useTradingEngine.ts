'use client';
import { useEffect, useRef, useCallback } from 'react';
import { getDerivClient } from '@/lib/deriv-api';
import { analyzeMarket, historyToPrices } from '@/lib/trading-engine';
import { useTradingStore } from '@/store/trading-store';
import type { TradeRecord } from '@/store/trading-store';

const ANALYSIS_INTERVAL_MS = 15000; // Analyze every 15s
const cooldowns = new Map<string, number>(); // symbol → last trade timestamp

export function useTradingEngine() {
  const {
    connectionStatus,
    setConnectionStatus,
    setActiveAccount,
    setBalance,
    tokens,
    selectedSymbols,
    addTick,
    setSignal,
    setOpenContracts,
    setTransactions,
    autonomousMode,
    riskSettings,
    addTrade,
    updateTrade,
    addNotification,
    updateStats,
    signals,
    ticks,
    dailyPnl,
    setSymbols,
  } = useTradingStore();

  const client = getDerivClient();
  const analysisTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const tickUnsubRefs = useRef<Map<string, () => void>>(new Map());
  const balanceUnsubRef = useRef<(() => void) | null>(null);

  // ─── Connect ────────────────────────────────────────────────────────────────

  const connect = useCallback(async (token: string) => {
    setConnectionStatus('connecting');
    try {
      await client.connect(token);
      const account = await client.authorize(token);
      setActiveAccount(account);
      setConnectionStatus('authorized');

      // Fetch balance
      const bal = await client.getBalance();
      setBalance(bal.balance, bal.currency);

      // Subscribe to live balance
      balanceUnsubRef.current?.();
      balanceUnsubRef.current = client.subscribeToBalance((b) => {
        setBalance(b.balance, b.currency);
      });

      // Load symbols
      const symbols = await client.getActiveSymbols();
      setSymbols(symbols);

      // Load portfolio & transactions
      const [portfolio, txs] = await Promise.all([
        client.getPortfolio(),
        client.getTransactionHistory(50),
      ]);
      setOpenContracts(portfolio);
      setTransactions(txs);

      addNotification({
        type: 'success',
        title: 'Connected',
        message: `Authorized as ${account.loginid} • Balance: ${bal.currency} ${bal.balance.toFixed(2)}`,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Connection failed';
      setConnectionStatus('error', msg);
      addNotification({ type: 'error', title: 'Connection Error', message: msg });
    }
  }, [client, setConnectionStatus, setActiveAccount, setBalance, setSymbols, setOpenContracts, setTransactions, addNotification]);

  // ─── Subscribe to ticks ───────────────────────────────────────────────────

  const subscribeSymbols = useCallback((symbols: string[]) => {
    // Unsubscribe old
    tickUnsubRefs.current.forEach(unsub => unsub());
    tickUnsubRefs.current.clear();

    symbols.forEach(symbol => {
      const unsub = client.subscribeToTicks(symbol, (tick) => {
        addTick(tick);
      });
      tickUnsubRefs.current.set(symbol, unsub);
    });
  }, [client, addTick]);

  // ─── Analysis Loop ────────────────────────────────────────────────────────

  const runAnalysis = useCallback(async () => {
    if (connectionStatus !== 'authorized') return;

    for (const symbol of selectedSymbols) {
      try {
        const history = await client.getTickHistory(symbol, 200);
        const { prices, times } = historyToPrices(history);
        if (prices.length < 30) continue;

        const signal = analyzeMarket(symbol, prices, times);
        setSignal(symbol, signal);

        // Auto-trade logic
        if (!autonomousMode) continue;
        if (signal.direction === 'NEUTRAL') continue;
        if (signal.confidence < riskSettings.minConfidence) continue;

        // Daily loss guard
        if (dailyPnl <= -riskSettings.maxDailyLoss) {
          addNotification({
            type: 'warning',
            title: 'Daily Loss Limit Reached',
            message: 'Auto-trading paused. Daily loss limit exceeded.',
          });
          continue;
        }

        // Cooldown guard
        const lastTrade = cooldowns.get(symbol) || 0;
        if (Date.now() - lastTrade < riskSettings.cooldownSeconds * 1000) continue;

        // Open contracts guard
        const { openContracts } = useTradingStore.getState();
        if (openContracts.length >= riskSettings.maxConcurrentTrades) continue;

        // Execute trade
        cooldowns.set(symbol, Date.now());
        await executeTrade(symbol, signal.direction as 'CALL' | 'PUT', riskSettings.stakeAmount, signal.confidence, 'auto');
      } catch (err) {
        console.error(`Analysis error for ${symbol}:`, err);
      }
    }
  }, [connectionStatus, selectedSymbols, autonomousMode, riskSettings, dailyPnl, client, setSignal, addNotification]);

  // ─── Execute Trade ────────────────────────────────────────────────────────

  const executeTrade = useCallback(async (
    symbol: string,
    direction: 'CALL' | 'PUT',
    stake: number,
    confidence: number,
    source: 'auto' | 'manual',
    duration?: number,
    durationUnit?: 't' | 'm'
  ): Promise<TradeRecord | null> => {
    if (connectionStatus !== 'authorized') {
      addNotification({ type: 'error', title: 'Not Connected', message: 'Connect your Deriv account first.' });
      return null;
    }

    const tradeId = `trade_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const sig = useTradingStore.getState().signals[symbol];
    const dur = duration ?? sig?.suggestedDuration ?? 5;
    const durUnit = durationUnit ?? sig?.durationType ?? 'm';

    const pendingRecord: TradeRecord = {
      id: tradeId,
      symbol,
      direction,
      stake,
      confidence,
      timestamp: Date.now(),
      status: 'pending',
      source,
    };
    addTrade(pendingRecord);

    try {
      // 1. Get proposal
      const proposal = await client.getProposal({
        symbol,
        amount: stake,
        contract_type: direction,
        duration: dur,
        duration_unit: durUnit,
      });

      // 2. Buy contract
      const buyResult = await client.buyContract(proposal.id, proposal.ask_price);
      setBalance(buyResult.balance_after);

      const record: Partial<TradeRecord> = {
        status: 'open',
        contractId: buyResult.contract_id,
        buyPrice: buyResult.buy_price,
        payout: buyResult.payout,
      };
      updateTrade(tradeId, record);

      addNotification({
        type: 'info',
        title: `${source === 'auto' ? '🤖 Auto' : '👤 Manual'} Trade Placed`,
        message: `${direction} on ${symbol} • Stake: $${stake} • Conf: ${confidence}%`,
      });

      // 3. Monitor contract result (poll every 2s)
      monitorContract(tradeId, buyResult.contract_id, stake);

      return { ...pendingRecord, ...record } as TradeRecord;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Trade failed';
      updateTrade(tradeId, { status: 'lost', profit: -stake });
      addNotification({ type: 'error', title: 'Trade Error', message: msg });
      updateStats();
      return null;
    }
  }, [connectionStatus, client, addTrade, updateTrade, setBalance, addNotification, updateStats]);

  // ─── Monitor Contract ─────────────────────────────────────────────────────

  const monitorContract = useCallback((tradeId: string, contractId: number, stake: number) => {
    let attempts = 0;
    const maxAttempts = 120; // 4 minutes max

    const poll = async () => {
      if (attempts++ > maxAttempts) return;
      try {
        const portfolio = await client.getPortfolio();
        const contract = portfolio.find(c => c.contract_id === contractId);
        setOpenContracts(portfolio);

        if (!contract) {
          // Contract closed — fetch profit table
          const profits = await client.getProfitTable();
          const entry = profits.find(p => p.contract_id === contractId);
          if (entry) {
            const profit = entry.sell_price - entry.buy_price;
            const won = profit > 0;
            updateTrade(tradeId, {
              status: won ? 'won' : 'lost',
              profit: Math.round(profit * 100) / 100,
            });
            addNotification({
              type: won ? 'success' : 'error',
              title: won ? '✅ Trade Won' : '❌ Trade Lost',
              message: `P&L: ${profit >= 0 ? '+' : ''}$${profit.toFixed(2)}`,
            });
            updateStats();
            // Refresh balance
            const bal = await client.getBalance();
            setBalance(bal.balance, bal.currency);
          }
          return;
        }
        // Still open — check again
        setTimeout(poll, 2000);
      } catch {
        setTimeout(poll, 3000);
      }
    };

    setTimeout(poll, 2000);
  }, [client, setOpenContracts, updateTrade, addNotification, updateStats, setBalance]);

  // ─── Effects ──────────────────────────────────────────────────────────────

  // Auto-connect on mount if tokens are saved
  useEffect(() => {
    const { tokens } = useTradingStore.getState();
    if (tokens.length > 0 && connectionStatus === 'disconnected') {
      connect(tokens[0].token);
    }
  }, []);

  // Subscribe to ticks when symbols change or connection established
  useEffect(() => {
    if (connectionStatus === 'authorized') {
      subscribeSymbols(selectedSymbols);
    }
    return () => {
      tickUnsubRefs.current.forEach(unsub => unsub());
      tickUnsubRefs.current.clear();
    };
  }, [connectionStatus, selectedSymbols, subscribeSymbols]);

  // Analysis loop
  useEffect(() => {
    if (connectionStatus !== 'authorized') return;
    runAnalysis(); // Immediate first run
    analysisTimerRef.current = setInterval(runAnalysis, ANALYSIS_INTERVAL_MS);
    return () => {
      if (analysisTimerRef.current) clearInterval(analysisTimerRef.current);
    };
  }, [connectionStatus, runAnalysis]);

  return { connect, executeTrade };
}
