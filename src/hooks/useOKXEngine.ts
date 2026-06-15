'use client';
import { useEffect, useRef, useCallback } from 'react';
import { getOKXClient, resetOKXClient, OKXClient } from '@/lib/okx-api';
import { analyzeMarket } from '@/lib/trading-engine';
import { useOKXStore } from '@/store/okx-store';
import type { OKXTradeRecord } from '@/store/okx-store';

const ANALYSIS_INTERVAL_MS = 20000;
const cooldowns = new Map<string, number>();

export function useOKXEngine() {
  const {
    status, setStatus, credentials,
    setBalances, setPositions, setTicker,
    setSignal, setOpenOrders, addTrade, updateTrade,
    addNotification, updateStats,
    autonomousMode, riskSettings, dailyPnlUSD,
    signals,
  } = useOKXStore();

  const analysisTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const wsUnsubRef = useRef<(() => void) | null>(null);
  const balanceTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const connecting = useRef(false);

  // ── Connect ─────────────────────────────────────────────────────────────────

  const connect = useCallback(async (creds: { apiKey: string; apiSecret: string; passphrase: string }) => {
    if (connecting.current) return;
    connecting.current = true;
    setStatus('connecting');

    try {
      resetOKXClient();
      const client = new OKXClient(creds);

      // Validate credentials via API call
      await client.validateCredentials();

      // Store validated credentials
      useOKXStore.getState().setCredentials(creds);

      // Load initial data
      const [balances, equity] = await Promise.all([
        client.getBalances().catch(() => []),
        client.getTotalEquityUSD().catch(() => 0),
      ]);
      setBalances(balances, equity);

      const positions = await client.getPositions().catch(() => []);
      setPositions(positions);

      const openOrders = await client.getOpenOrders().catch(() => []);
      setOpenOrders(openOrders);

      setStatus('connected');

      // Start public WebSocket for live tickers
      startTickerWS(client);

      // Poll balance every 30s
      balanceTimer.current = setInterval(async () => {
        try {
          const [b, eq] = await Promise.all([client.getBalances(), client.getTotalEquityUSD()]);
          setBalances(b, eq);
          const pos = await client.getPositions();
          setPositions(pos);
        } catch { /* silent */ }
      }, 30000);

      addNotification({
        type: 'success',
        title: '✅ OKX Connected',
        message: `Account connected • Equity: $${equity.toFixed(2)} USD`,
      });

      // Keep client accessible
      getOKXClient(creds);

    } catch (err) {
      const msg = err instanceof Error ? err.message : 'OKX connection failed';
      setStatus('error', msg);
      addNotification({ type: 'error', title: 'OKX Connection Failed', message: msg });
      resetOKXClient();
    } finally {
      connecting.current = false;
    }
  }, [setStatus, setBalances, setPositions, setOpenOrders, setSignal, addNotification]);

  // ── Ticker WebSocket ────────────────────────────────────────────────────────

  const startTickerWS = useCallback((client: OKXClient) => {
    wsUnsubRef.current?.();
    const { riskSettings } = useOKXStore.getState();
    const symbols = riskSettings.tradingPairs;

    wsUnsubRef.current = client.connectPublicWS(symbols, (ticker) => {
      setTicker(ticker);
    });
  }, [setTicker]);

  // ── Analysis loop ───────────────────────────────────────────────────────────

  const runAnalysis = useCallback(async () => {
    if (status !== 'connected') return;
    let client: OKXClient;
    try { client = getOKXClient(); } catch { return; }

    const { riskSettings } = useOKXStore.getState();
    const symbols = riskSettings.tradingPairs;

    for (const instId of symbols) {
      try {
        const candles = await client.getCandles(instId, '1m', 200);
        if (candles.length < 30) continue;

        const prices = candles.map(c => parseFloat(c.close));
        const times = candles.map(c => parseInt(c.ts));

        const signal = analyzeMarket(instId, prices, times);
        setSignal(instId, signal);

        // Auto-trade check
        if (!autonomousMode) continue;
        if (signal.direction === 'NEUTRAL') continue;
        if (signal.confidence < riskSettings.minConfidence) continue;

        const { dailyPnlUSD: pnl } = useOKXStore.getState();
        if (pnl <= -riskSettings.maxDailyLossUSD) {
          addNotification({ type: 'warning', title: 'OKX Daily Loss Limit', message: 'Auto-trading paused — daily loss limit reached.' });
          continue;
        }

        const lastTrade = cooldowns.get(instId) || 0;
        if (Date.now() - lastTrade < riskSettings.cooldownSeconds * 1000) continue;

        const { openOrders } = useOKXStore.getState();
        if (openOrders.length >= riskSettings.maxConcurrentOrders) continue;

        // Get current price for sizing
        const ticker = useOKXStore.getState().tickers[instId];
        if (!ticker) continue;
        const price = parseFloat(ticker.last);
        if (!price) continue;

        // Calculate order size: orderSizeUSD / price
        const sz = (riskSettings.orderSizeUSD / price).toFixed(6);

        cooldowns.set(instId, Date.now());
        await executeTrade(
          instId,
          signal.direction === 'CALL' ? 'buy' : 'sell',
          sz,
          signal.confidence,
          'auto'
        );
      } catch { /* skip symbol */ }
    }
  }, [status, autonomousMode, riskSettings, setSignal, addNotification]);

  // ── Execute trade ───────────────────────────────────────────────────────────

  const executeTrade = useCallback(async (
    instId: string,
    side: 'buy' | 'sell',
    sz: string,
    confidence: number,
    source: 'auto' | 'manual',
    ordType: 'market' | 'limit' = 'market',
    px?: string,
  ): Promise<OKXTradeRecord | null> => {
    if (status !== 'connected') {
      addNotification({ type: 'error', title: 'OKX Not Connected', message: 'Connect your OKX account first.' });
      return null;
    }

    let client: OKXClient;
    try { client = getOKXClient(); } catch {
      addNotification({ type: 'error', title: 'OKX Error', message: 'Client not initialized.' });
      return null;
    }

    const { riskSettings } = useOKXStore.getState();
    const tradeId = `okx_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`;

    const pending: OKXTradeRecord = {
      id: tradeId, instId, side, size: sz,
      ordType, confidence, timestamp: Date.now(),
      status: 'pending', source, price: px,
    };
    addTrade(pending);

    try {
      const result = await client.placeOrder({
        instId,
        side,
        ordType,
        sz,
        px,
        tdMode: riskSettings.instType === 'SPOT' ? 'cash' : 'cross',
      });

      updateTrade(tradeId, { status: 'filled', ordId: result.ordId });

      // Refresh balance after trade
      setTimeout(async () => {
        try {
          const [b, eq] = await Promise.all([client.getBalances(), client.getTotalEquityUSD()]);
          setBalances(b, eq);
          const orders = await client.getOpenOrders();
          setOpenOrders(orders);
          updateStats();
        } catch { /* silent */ }
      }, 2000);

      addNotification({
        type: 'info',
        title: `${source === 'auto' ? '🤖 Auto' : '👤 Manual'} OKX Trade`,
        message: `${side.toUpperCase()} ${sz} ${instId} • ${confidence}% conf`,
      });

      return { ...pending, status: 'filled', ordId: result.ordId };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Trade failed';
      updateTrade(tradeId, { status: 'failed' });
      addNotification({ type: 'error', title: 'OKX Trade Error', message: msg });
      updateStats();
      return null;
    }
  }, [status, addTrade, updateTrade, setBalances, setOpenOrders, addNotification, updateStats]);

  // ── Auto-connect on mount ───────────────────────────────────────────────────

  useEffect(() => {
    const { credentials, status: s } = useOKXStore.getState();
    if (credentials && s === 'disconnected') {
      connect(credentials);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Analysis loop ───────────────────────────────────────────────────────────

  useEffect(() => {
    if (status !== 'connected') return;
    runAnalysis();
    analysisTimer.current = setInterval(runAnalysis, ANALYSIS_INTERVAL_MS);
    return () => { if (analysisTimer.current) clearInterval(analysisTimer.current); };
  }, [status, runAnalysis]);

  // ── Cleanup ────────────────────────────────────────────────────────────────

  useEffect(() => {
    return () => {
      wsUnsubRef.current?.();
      if (balanceTimer.current) clearInterval(balanceTimer.current);
      if (analysisTimer.current) clearInterval(analysisTimer.current);
    };
  }, []);

  return { connect, executeTrade };
}
