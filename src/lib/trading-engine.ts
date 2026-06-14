/**
 * AI Trading Engine
 * Multi-indicator technical analysis + ML-style signal scoring
 * Generates BUY/SELL signals with confidence scores
 */

import { CandleData, TickHistory } from './deriv-api';

export type SignalDirection = 'CALL' | 'PUT' | 'NEUTRAL';

export interface TradingSignal {
  symbol: string;
  direction: SignalDirection;
  confidence: number; // 0–100
  indicators: IndicatorResults;
  timestamp: number;
  reasoning: string[];
  suggestedStake: number;
  suggestedDuration: number;
  durationType: 't' | 'm';
}

export interface IndicatorResults {
  rsi: number;
  macd: MACDResult;
  bollinger: BollingerResult;
  ema: EMAResult;
  momentum: number;
  volatility: number;
  trend: 'UP' | 'DOWN' | 'SIDEWAYS';
  volume_proxy: number; // tick rate as volume proxy
}

interface MACDResult {
  macd: number;
  signal: number;
  histogram: number;
  cross: 'BULLISH' | 'BEARISH' | 'NONE';
}

interface BollingerResult {
  upper: number;
  middle: number;
  lower: number;
  position: 'ABOVE' | 'NEAR_UPPER' | 'MIDDLE' | 'NEAR_LOWER' | 'BELOW';
  bandwidth: number;
}

interface EMAResult {
  ema8: number;
  ema21: number;
  ema50: number;
  alignment: 'BULLISH' | 'BEARISH' | 'MIXED';
}

// ─── Technical Indicators ─────────────────────────────────────────────────────

function calcRSI(prices: number[], period = 14): number {
  if (prices.length < period + 1) return 50;
  let gains = 0, losses = 0;
  for (let i = prices.length - period; i < prices.length; i++) {
    const diff = prices[i] - prices[i - 1];
    if (diff > 0) gains += diff;
    else losses += Math.abs(diff);
  }
  if (losses === 0) return 100;
  const rs = gains / losses;
  return 100 - 100 / (1 + rs);
}

function calcEMA(prices: number[], period: number): number[] {
  if (prices.length < period) return prices;
  const k = 2 / (period + 1);
  const emas: number[] = [prices.slice(0, period).reduce((a, b) => a + b) / period];
  for (let i = period; i < prices.length; i++) {
    emas.push(prices[i] * k + emas[emas.length - 1] * (1 - k));
  }
  return emas;
}

function calcMACD(prices: number[]): MACDResult {
  const ema12 = calcEMA(prices, 12);
  const ema26 = calcEMA(prices, 26);
  const minLen = Math.min(ema12.length, ema26.length);
  if (minLen < 2) return { macd: 0, signal: 0, histogram: 0, cross: 'NONE' };

  const macdLine = ema12.slice(-minLen).map((v, i) => v - ema26.slice(-minLen)[i]);
  const signalLine = calcEMA(macdLine, 9);
  const macd = macdLine[macdLine.length - 1];
  const signal = signalLine[signalLine.length - 1];
  const prevMacd = macdLine[macdLine.length - 2];
  const prevSignal = signalLine[signalLine.length - 2];

  let cross: MACDResult['cross'] = 'NONE';
  if (prevMacd <= prevSignal && macd > signal) cross = 'BULLISH';
  if (prevMacd >= prevSignal && macd < signal) cross = 'BEARISH';

  return { macd, signal, histogram: macd - signal, cross };
}

function calcBollinger(prices: number[], period = 20, stdDev = 2): BollingerResult {
  if (prices.length < period) {
    const mid = prices[prices.length - 1] || 0;
    return { upper: mid, middle: mid, lower: mid, position: 'MIDDLE', bandwidth: 0 };
  }
  const slice = prices.slice(-period);
  const middle = slice.reduce((a, b) => a + b) / period;
  const variance = slice.reduce((a, b) => a + Math.pow(b - middle, 2), 0) / period;
  const std = Math.sqrt(variance);
  const upper = middle + stdDev * std;
  const lower = middle - stdDev * std;
  const current = prices[prices.length - 1];
  const bandwidth = std / middle;

  let position: BollingerResult['position'] = 'MIDDLE';
  if (current > upper) position = 'ABOVE';
  else if (current > middle + std) position = 'NEAR_UPPER';
  else if (current < lower) position = 'BELOW';
  else if (current < middle - std) position = 'NEAR_LOWER';

  return { upper, middle, lower, position, bandwidth };
}

function calcMomentum(prices: number[], period = 10): number {
  if (prices.length < period) return 0;
  return ((prices[prices.length - 1] - prices[prices.length - period]) / prices[prices.length - period]) * 100;
}

function calcVolatility(prices: number[], period = 20): number {
  if (prices.length < period) return 0;
  const slice = prices.slice(-period);
  const returns = slice.slice(1).map((p, i) => Math.log(p / slice[i]));
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / returns.length;
  return Math.sqrt(variance) * 100;
}

// ─── Signal Engine ────────────────────────────────────────────────────────────

export function analyzeMarket(
  symbol: string,
  prices: number[],
  tickTimes?: number[]
): TradingSignal {
  if (prices.length < 30) {
    return neutralSignal(symbol, 'Insufficient data for analysis');
  }

  const rsi = calcRSI(prices);
  const macd = calcMACD(prices);
  const bollinger = calcBollinger(prices);
  const momentum = calcMomentum(prices);
  const volatility = calcVolatility(prices);

  // EMAs
  const ema8arr = calcEMA(prices, 8);
  const ema21arr = calcEMA(prices, 21);
  const ema50arr = calcEMA(prices, 50);
  const ema8 = ema8arr[ema8arr.length - 1];
  const ema21 = ema21arr[ema21arr.length - 1];
  const ema50 = ema50arr[ema50arr.length - 1] || ema21;

  const emaAlignment: EMAResult['alignment'] =
    ema8 > ema21 && ema21 > ema50 ? 'BULLISH' :
    ema8 < ema21 && ema21 < ema50 ? 'BEARISH' : 'MIXED';

  // Trend detection
  const recentPrices = prices.slice(-10);
  const priceSlope = (recentPrices[recentPrices.length - 1] - recentPrices[0]) / recentPrices[0] * 100;
  const trend: IndicatorResults['trend'] =
    Math.abs(priceSlope) < 0.05 ? 'SIDEWAYS' :
    priceSlope > 0 ? 'UP' : 'DOWN';

  // Volume proxy: tick rate
  let volumeProxy = 1;
  if (tickTimes && tickTimes.length > 1) {
    const avgGap = (tickTimes[tickTimes.length - 1] - tickTimes[0]) / (tickTimes.length - 1);
    volumeProxy = Math.max(0.1, Math.min(5, 2 / (avgGap / 1000 + 0.1)));
  }

  const indicators: IndicatorResults = {
    rsi,
    macd,
    bollinger,
    ema: { ema8, ema21, ema50, alignment: emaAlignment },
    momentum,
    volatility,
    trend,
    volume_proxy: volumeProxy,
  };

  // ─── Scoring System ───────────────────────────────────────────────────────

  let bullScore = 0;
  let bearScore = 0;
  const reasoning: string[] = [];

  // RSI signals (weight: 25pts)
  if (rsi < 30) { bullScore += 25; reasoning.push(`RSI oversold (${rsi.toFixed(1)}) → bullish reversal signal`); }
  else if (rsi < 40) { bullScore += 12; reasoning.push(`RSI approaching oversold (${rsi.toFixed(1)})`); }
  else if (rsi > 70) { bearScore += 25; reasoning.push(`RSI overbought (${rsi.toFixed(1)}) → bearish reversal signal`); }
  else if (rsi > 60) { bearScore += 12; reasoning.push(`RSI approaching overbought (${rsi.toFixed(1)})`); }
  else reasoning.push(`RSI neutral (${rsi.toFixed(1)})`);

  // MACD signals (weight: 25pts)
  if (macd.cross === 'BULLISH') { bullScore += 25; reasoning.push('MACD bullish crossover detected'); }
  else if (macd.cross === 'BEARISH') { bearScore += 25; reasoning.push('MACD bearish crossover detected'); }
  else if (macd.histogram > 0 && macd.macd > 0) { bullScore += 10; reasoning.push('MACD positive momentum'); }
  else if (macd.histogram < 0 && macd.macd < 0) { bearScore += 10; reasoning.push('MACD negative momentum'); }

  // Bollinger Band signals (weight: 20pts)
  if (bollinger.position === 'BELOW' || bollinger.position === 'NEAR_LOWER') {
    bullScore += bollinger.position === 'BELOW' ? 20 : 10;
    reasoning.push(`Price at/below lower Bollinger Band → mean reversion expected`);
  } else if (bollinger.position === 'ABOVE' || bollinger.position === 'NEAR_UPPER') {
    bearScore += bollinger.position === 'ABOVE' ? 20 : 10;
    reasoning.push(`Price at/above upper Bollinger Band → mean reversion expected`);
  }

  // EMA alignment (weight: 15pts)
  if (emaAlignment === 'BULLISH') { bullScore += 15; reasoning.push('EMA stack bullish (8 > 21 > 50)'); }
  else if (emaAlignment === 'BEARISH') { bearScore += 15; reasoning.push('EMA stack bearish (8 < 21 < 50)'); }

  // Momentum (weight: 10pts)
  if (momentum > 0.1) { bullScore += 10; reasoning.push(`Positive price momentum (+${momentum.toFixed(3)}%)`); }
  else if (momentum < -0.1) { bearScore += 10; reasoning.push(`Negative price momentum (${momentum.toFixed(3)}%)`); }

  // Trend confirmation (weight: 5pts)
  if (trend === 'UP') { bullScore += 5; reasoning.push('Short-term trend upward'); }
  else if (trend === 'DOWN') { bearScore += 5; reasoning.push('Short-term trend downward'); }

  // Volatility adjustment — low volatility reduces confidence in direction
  const volPenalty = volatility > 1.5 ? 0.8 : volatility < 0.1 ? 0.7 : 1.0;

  const totalBull = bullScore * volPenalty;
  const totalBear = bearScore * volPenalty;
  const maxScore = 100;

  let direction: SignalDirection = 'NEUTRAL';
  let confidence = 0;

  const scoreDiff = totalBull - totalBear;
  if (Math.abs(scoreDiff) < 10) {
    direction = 'NEUTRAL';
    confidence = Math.max(totalBull, totalBear) * 0.5;
    reasoning.push('Mixed signals — no clear directional bias');
  } else if (totalBull > totalBear) {
    direction = 'CALL';
    confidence = Math.min(95, (totalBull / maxScore) * 100);
    reasoning.push(`Bullish consensus: ${bullScore} bull pts vs ${bearScore} bear pts`);
  } else {
    direction = 'PUT';
    confidence = Math.min(95, (totalBear / maxScore) * 100);
    reasoning.push(`Bearish consensus: ${bearScore} bear pts vs ${bullScore} bull pts`);
  }

  // Duration logic: higher volatility → shorter duration
  const suggestedDuration = volatility > 1 ? 1 : 5;
  const durationType: 't' | 'm' = volatility > 1 ? 't' : 'm';

  return {
    symbol,
    direction,
    confidence: Math.round(confidence),
    indicators,
    timestamp: Date.now(),
    reasoning,
    suggestedStake: 1, // Base stake — overridden by user settings
    suggestedDuration,
    durationType,
  };
}

function neutralSignal(symbol: string, reason: string): TradingSignal {
  return {
    symbol,
    direction: 'NEUTRAL',
    confidence: 0,
    indicators: {
      rsi: 50,
      macd: { macd: 0, signal: 0, histogram: 0, cross: 'NONE' },
      bollinger: { upper: 0, middle: 0, lower: 0, position: 'MIDDLE', bandwidth: 0 },
      ema: { ema8: 0, ema21: 0, ema50: 0, alignment: 'MIXED' },
      momentum: 0,
      volatility: 0,
      trend: 'SIDEWAYS',
      volume_proxy: 1,
    },
    timestamp: Date.now(),
    reasoning: [reason],
    suggestedStake: 0,
    suggestedDuration: 5,
    durationType: 'm',
  };
}

export function candlesToPrices(candles: CandleData[]): number[] {
  return candles.map(c => c.close);
}

export function historyToPrices(history: TickHistory): { prices: number[]; times: number[] } {
  return {
    prices: history.prices || [],
    times: (history.times || []).map(t => t * 1000),
  };
}

// ─── Risk Management ──────────────────────────────────────────────────────────

export interface RiskSettings {
  minConfidence: number;   // Minimum confidence to trade (e.g. 65)
  stakeAmount: number;     // Fixed stake per trade
  maxDailyLoss: number;    // Stop trading if daily loss exceeds this
  maxConcurrentTrades: number;
  cooldownSeconds: number; // Seconds between auto trades per symbol
}

export const DEFAULT_RISK_SETTINGS: RiskSettings = {
  minConfidence: 65,
  stakeAmount: 1,
  maxDailyLoss: 20,
  maxConcurrentTrades: 3,
  cooldownSeconds: 30,
};
