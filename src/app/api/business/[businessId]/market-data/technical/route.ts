import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Fetch with an enforced timeout so external APIs can never hang the route */
async function fetchWithTimeout(url: string, init: RequestInit & { timeoutMs?: number } = {}): Promise<Response> {
  const { timeoutMs = 8000, ...rest } = init;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...rest, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/** Generate pseudo-random but deterministic values from a seed string */
function seededRandom(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return (Math.abs(hash) % 10000) / 10000;
}

/** Symbol → CoinGecko ID mapping */
const COINGECKO_IDS: Record<string, string> = {
  BTC: 'bitcoin', ETH: 'ethereum', BNB: 'binancecoin', XRP: 'ripple',
  SOL: 'solana', DOT: 'polkadot', DOGE: 'dogecoin', ADA: 'cardano',
  LINK: 'chainlink', AVAX: 'avalanche-2', LTC: 'litecoin',
  MATIC: 'matic-network', UNI: 'uniswap', ATOM: 'cosmos', NEAR: 'near',
  APT: 'aptos', ARB: 'arbitrum', OP: 'optimism', SUI: 'sui',
  TON: 'the-open-network', PEPE: 'pepe', SHIB: 'shiba-inu', FET: 'fetch-ai',
  TRX: 'tron', XLM: 'stellar', ALGO: 'algorand', FIL: 'filecoin',
  INJ: 'injective-protocol', AAVE: 'aave', MKR: 'maker', SNX: 'havven',
  CRV: 'curve-dao-token', DYDX: 'dydx', COMP: 'compound-governance-token',
  BTCUSDT: 'bitcoin', ETHUSDT: 'ethereum', BNBUSDT: 'binancecoin',
  XRPUSDT: 'ripple', SOLUSDT: 'solana', DOTUSDT: 'polkadot',
  DOGEUSDT: 'dogecoin', ADAUSDT: 'cardano', LINKUSDT: 'chainlink',
  AVAXUSDT: 'avalanche-2', LTCUSDT: 'litecoin',
};

/** Symbol → Yahoo Finance suffix for Indonesian stocks */
function toYahooSymbol(symbol: string): string {
  const upper = symbol.toUpperCase();
  if (upper.endsWith('.JK')) return upper;
  return upper + '.JK';
}

/** Symbol → CoinGecko ID */
function toCoinGeckoId(symbol: string): string {
  const upper = symbol.toUpperCase();
  return COINGECKO_IDS[upper] || symbol.toLowerCase();
}

// ── Technical Indicator Computations ─────────────────────────────────────────

/** Simple Moving Average */
function sma(data: number[], period: number): number {
  if (data.length < period) return data[data.length - 1] ?? 0;
  const slice = data.slice(data.length - period);
  return slice.reduce((sum, val) => sum + val, 0) / period;
}

/** Exponential Moving Average */
function ema(data: number[], period: number): number {
  if (data.length === 0) return 0;
  const multiplier = 2 / (period + 1);
  let result = data[0];
  for (let i = 1; i < data.length; i++) {
    result = (data[i] - result) * multiplier + result;
  }
  return result;
}

/** Relative Strength Index (14-period) */
function computeRSI(closes: number[], period: number = 14): number {
  if (closes.length < period + 1) return 50;

  let gains = 0;
  let losses = 0;

  for (let i = closes.length - period; i < closes.length; i++) {
    const change = closes[i] - closes[i - 1];
    if (change > 0) {
      gains += change;
    } else {
      losses += Math.abs(change);
    }
  }

  const avgGain = gains / period;
  const avgLoss = losses / period;

  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - (100 / (1 + rs));
}

/** MACD (12/26/9) */
function computeMACD(closes: number[]): { macd: number; signal: number; histogram: number } {
  if (closes.length < 26) {
    return { macd: 0, signal: 0, histogram: 0 };
  }

  const ema12 = ema(closes, 12);
  const ema26 = ema(closes, 26);
  const macdLine = ema12 - ema26;

  const macdValues: number[] = [];
  for (let i = 9; i <= closes.length; i++) {
    const slice = closes.slice(0, i);
    if (slice.length < 26) continue;
    const e12 = ema(slice, 12);
    const e26 = ema(slice, 26);
    macdValues.push(e12 - e26);
  }

  const signalLine = macdValues.length >= 9 ? ema(macdValues, 9) : macdLine;
  const histogram = macdLine - signalLine;

  return { macd: macdLine, signal: signalLine, histogram };
}

/** Bollinger Bands (20-period, 2 standard deviations) */
function computeBollingerBands(closes: number[], period: number = 20, stdDev: number = 2): {
  upper: number;
  middle: number;
  lower: number;
} {
  if (closes.length < period) {
    const last = closes[closes.length - 1] ?? 0;
    return { upper: last, middle: last, lower: last };
  }

  const slice = closes.slice(closes.length - period);
  const mean = slice.reduce((sum, val) => sum + val, 0) / period;

  const squaredDiffs = slice.map(val => Math.pow(val - mean, 2));
  const variance = squaredDiffs.reduce((sum, val) => sum + val, 0) / period;
  const sd = Math.sqrt(variance);

  return {
    upper: mean + stdDev * sd,
    middle: mean,
    lower: mean - stdDev * sd,
  };
}

// ── Advanced Technical Indicators ─────────────────────────────────────────────

interface Candle {
  open: number;
  high: number;
  low: number;
  close: number;
}

/** Stochastic RSI */
function computeStochasticRSI(closes: number[], period: number = 14, smoothK: number = 3, smoothD: number = 3): { k: number; d: number } {
  if (closes.length < period + 1) return { k: 50, d: 50 };

  const rsiValues: number[] = [];
  for (let i = period; i <= closes.length; i++) {
    rsiValues.push(computeRSI(closes.slice(0, i), period));
  }
  if (rsiValues.length < period) return { k: 50, d: 50 };

  const rawKValues: number[] = [];
  for (let i = period - 1; i < rsiValues.length; i++) {
    const slice = rsiValues.slice(i - period + 1, i + 1);
    const minRSI = Math.min(...slice);
    const maxRSI = Math.max(...slice);
    const range = maxRSI - minRSI;
    rawKValues.push(range === 0 ? 50 : ((rsiValues[i] - minRSI) / range) * 100);
  }

  const smoothKValues: number[] = [];
  for (let i = smoothK - 1; i < rawKValues.length; i++) {
    const slice = rawKValues.slice(i - smoothK + 1, i + 1);
    smoothKValues.push(slice.reduce((s, v) => s + v, 0) / smoothK);
  }
  const k = smoothKValues.length > 0 ? smoothKValues[smoothKValues.length - 1] : 50;

  const dValues: number[] = [];
  for (let i = smoothD - 1; i < smoothKValues.length; i++) {
    const slice = smoothKValues.slice(i - smoothD + 1, i + 1);
    dValues.push(slice.reduce((s, v) => s + v, 0) / smoothD);
  }
  const d = dValues.length > 0 ? dValues[dValues.length - 1] : 50;

  return { k, d };
}

/** Average Directional Index (ADX) — trend strength */
function computeADX(candles: Candle[], period: number = 14): { adx: number; plusDI: number; minusDI: number; trendStrength: 'strong' | 'moderate' | 'weak' | 'none' } {
  if (candles.length < period + 1) return { adx: 0, plusDI: 0, minusDI: 0, trendStrength: 'none' };

  const trueRanges: number[] = [];
  const plusDMs: number[] = [];
  const minusDMs: number[] = [];

  for (let i = 1; i < candles.length; i++) {
    const high = candles[i].high;
    const low = candles[i].low;
    const prevHigh = candles[i - 1].high;
    const prevLow = candles[i - 1].low;
    const prevClose = candles[i - 1].close;

    const tr = Math.max(high - low, Math.abs(high - prevClose), Math.abs(low - prevClose));
    trueRanges.push(tr);

    const upMove = high - prevHigh;
    const downMove = prevLow - low;
    plusDMs.push(upMove > downMove && upMove > 0 ? upMove : 0);
    minusDMs.push(downMove > upMove && downMove > 0 ? downMove : 0);
  }

  if (trueRanges.length < period) return { adx: 0, plusDI: 0, minusDI: 0, trendStrength: 'none' };

  const smoothedTR = trueRanges.slice(-period).reduce((s, v) => s + v, 0);
  const smoothedPlusDM = plusDMs.slice(-period).reduce((s, v) => s + v, 0);
  const smoothedMinusDM = minusDMs.slice(-period).reduce((s, v) => s + v, 0);

  const plusDI = smoothedTR > 0 ? (smoothedPlusDM / smoothedTR) * 100 : 0;
  const minusDI = smoothedTR > 0 ? (smoothedMinusDM / smoothedTR) * 100 : 0;

  const diSum = plusDI + minusDI;
  const dx = diSum > 0 ? (Math.abs(plusDI - minusDI) / diSum) * 100 : 0;

  let adx = dx;
  for (let i = 1; i < period && i < trueRanges.length - period; i++) {
    adx = (adx * (period - 1) + dx) / period;
  }

  let trendStrength: 'strong' | 'moderate' | 'weak' | 'none';
  if (adx >= 25) trendStrength = 'strong';
  else if (adx >= 20) trendStrength = 'moderate';
  else if (adx >= 10) trendStrength = 'weak';
  else trendStrength = 'none';

  return { adx: parseFloat(adx.toFixed(1)), plusDI: parseFloat(plusDI.toFixed(1)), minusDI: parseFloat(minusDI.toFixed(1)), trendStrength };
}

/** Average True Range (ATR) — volatility */
function computeATR(candles: Candle[], period: number = 14): number {
  if (candles.length < 2) return 0;

  const trueRanges: number[] = [];
  for (let i = 1; i < candles.length; i++) {
    const high = candles[i].high;
    const low = candles[i].low;
    const prevClose = candles[i - 1].close;
    trueRanges.push(Math.max(high - low, Math.abs(high - prevClose), Math.abs(low - prevClose)));
  }

  const recentTR = trueRanges.slice(-period);
  return recentTR.length > 0 ? recentTR.reduce((s, v) => s + v, 0) / recentTR.length : 0;
}

/** On Balance Volume (OBV) — volume flow direction */
function computeOBV(candles: Candle[], volumes: number[]): { obv: number; trend: 'accumulating' | 'distributing' | 'neutral'; divergence: boolean } {
  if (candles.length < 2 || !volumes || volumes.length < 2) {
    return { obv: 0, trend: 'neutral', divergence: false };
  }

  let obvValue = 0;
  const obvHistory: number[] = [];
  for (let i = 0; i < candles.length && i < volumes.length; i++) {
    if (i === 0) {
      obvValue = volumes[0] || 0;
    } else {
      if (candles[i].close > candles[i - 1].close) {
        obvValue += (volumes[i] || 0);
      } else if (candles[i].close < candles[i - 1].close) {
        obvValue -= (volumes[i] || 0);
      }
    }
    obvHistory.push(obvValue);
  }

  // Determine trend from OBV slope
  const recentOBV = obvHistory.slice(-10);
  let trend: 'accumulating' | 'distributing' | 'neutral' = 'neutral';
  if (recentOBV.length >= 5) {
    const firstHalf = recentOBV.slice(0, Math.floor(recentOBV.length / 2));
    const secondHalf = recentOBV.slice(Math.floor(recentOBV.length / 2));
    const avgFirst = firstHalf.reduce((s, v) => s + v, 0) / firstHalf.length;
    const avgSecond = secondHalf.reduce((s, v) => s + v, 0) / secondHalf.length;
    const diff = Math.abs(avgSecond - avgFirst);
    const threshold = Math.max(Math.abs(avgFirst) * 0.005, 1);
    if (diff > threshold) {
      trend = avgSecond > avgFirst ? 'accumulating' : 'distributing';
    }
  }

  // Detect divergence: OBV trend vs price trend
  const recentPrices = candles.slice(-10).map(c => c.close);
  let priceUp = false;
  let obvUp = false;
  if (recentPrices.length >= 5) {
    const firstHalfPrice = recentPrices.slice(0, Math.floor(recentPrices.length / 2));
    const secondHalfPrice = recentPrices.slice(Math.floor(recentPrices.length / 2));
    priceUp = secondHalfPrice[secondHalfPrice.length - 1] > firstHalfPrice[0];
    obvUp = recentOBV[recentOBV.length - 1] > recentOBV[0];
  }
  const divergence = priceUp !== obvUp;

  return { obv: obvValue, trend, divergence };
}

/** Commodity Channel Index (CCI) */
function computeCCI(candles: Candle[], period: number = 20): number {
  if (candles.length < period) return 0;

  const typicalPrices: number[] = candles.slice(-period).map(c => (c.high + c.low + c.close) / 3);
  const mean = typicalPrices.reduce((s, v) => s + v, 0) / period;
  const meanDeviation = typicalPrices.reduce((s, v) => s + Math.abs(v - mean), 0) / period;

  if (meanDeviation === 0) return 0;
  return (typicalPrices[typicalPrices.length - 1] - mean) / (0.015 * meanDeviation);
}

/** Money Flow Index (MFI) */
function computeMFI(candles: Candle[], volumes: number[], period: number = 14): number {
  if (candles.length < period + 1 || !volumes || volumes.length < period + 1) return 50;

  let positiveFlow = 0;
  let negativeFlow = 0;

  for (let i = candles.length - period; i < candles.length; i++) {
    const tp = (candles[i].high + candles[i].low + candles[i].close) / 3;
    const prevTP = (candles[i - 1].high + candles[i - 1].low + candles[i - 1].close) / 3;
    const rawMoneyFlow = tp * (volumes[i] || 0);

    if (tp > prevTP) {
      positiveFlow += rawMoneyFlow;
    } else {
      negativeFlow += rawMoneyFlow;
    }
  }

  if (negativeFlow === 0) return 100;
  const moneyRatio = positiveFlow / negativeFlow;
  return 100 - (100 / (1 + moneyRatio));
}

/** Williams %R */
function computeWilliamsR(candles: Candle[], period: number = 14): number {
  if (candles.length < period) return -50;

  const recent = candles.slice(-period);
  const highestHigh = Math.max(...recent.map(c => c.high));
  const lowestLow = Math.min(...recent.map(c => c.low));
  const currentClose = candles[candles.length - 1].close;
  const range = highestHigh - lowestLow;

  if (range === 0) return -50;
  return ((highestHigh - currentClose) / range) * -100;
}

/** Rate of Change (ROC) */
function computeROC(closes: number[], period: number = 14): number {
  if (closes.length < period + 1) return 0;
  const currentPrice = closes[closes.length - 1];
  const pastPrice = closes[closes.length - 1 - period];
  if (pastPrice === 0) return 0;
  return ((currentPrice - pastPrice) / pastPrice) * 100;
}

/** Bollinger Band Width & Squeeze detection */
function computeBBWidth(bb: { upper: number; middle: number; lower: number }): { width: number; percentRank: number; squeeze: boolean } {
  const width = bb.middle > 0 ? ((bb.upper - bb.lower) / bb.middle) * 100 : 0;
  // Squeeze = width below 10% of middle (very tight bands)
  const squeeze = width < 10;
  // Percent rank approximation — low width = low percentile
  const percentRank = Math.min(100, Math.max(0, width * 2));
  return { width: parseFloat(width.toFixed(2)), percentRank: parseFloat(percentRank.toFixed(0)), squeeze };
}

/** Volume Profile Analysis */
function computeVolumeProfile(candles: Candle[], volumes: number[]): { volumeTrend: 'increasing' | 'decreasing' | 'stable'; volumeRatio: number; unusualVolume: boolean } {
  if (!volumes || volumes.length < 10) {
    return { volumeTrend: 'stable', volumeRatio: 1, unusualVolume: false };
  }

  // Check if all volumes are 0 (e.g., CoinGecko data without volume)
  const nonZeroVolumes = volumes.filter(v => v > 0);
  if (nonZeroVolumes.length < 5) {
    return { volumeTrend: 'stable', volumeRatio: 1, unusualVolume: false };
  }

  const recentVol = volumes.slice(-5);
  const olderVol = volumes.slice(-15, -5);
  const avgRecent = recentVol.reduce((s, v) => s + v, 0) / recentVol.length;
  const avgOlder = olderVol.length > 0 ? olderVol.reduce((s, v) => s + v, 0) / olderVol.length : avgRecent;
  const volumeRatio = avgOlder > 0 ? avgRecent / avgOlder : 1;

  let volumeTrend: 'increasing' | 'decreasing' | 'stable';
  if (volumeRatio > 1.2) volumeTrend = 'increasing';
  else if (volumeRatio < 0.8) volumeTrend = 'decreasing';
  else volumeTrend = 'stable';

  const unusualVolume = volumeRatio > 2.0 || volumeRatio < 0.3;

  return { volumeTrend, volumeRatio: parseFloat(volumeRatio.toFixed(2)), unusualVolume };
}

// ── Smart Money Concepts (SMC) ───────────────────────────────────────────────

/** Detect Fair Value Gap (FVG) from recent candles */
function detectFVG(candles: Candle[]): { high: number; low: number; filled: boolean; description: string } | null {
  if (candles.length < 3) return null;

  for (let i = candles.length - 3; i >= Math.max(0, candles.length - 20); i--) {
    // Bullish FVG: candle[i+2].low > candle[i].high
    if (candles[i + 2].low > candles[i].high) {
      const gapHigh = candles[i + 2].low;
      const gapLow = candles[i].high;
      const currentPrice = candles[candles.length - 1].close;
      const filled = currentPrice <= gapLow;
      return {
        high: gapHigh,
        low: gapLow,
        filled,
        description: `Bullish FVG di ${fmtNum(gapLow)} - ${fmtNum(gapHigh)} (${filled ? 'sudah terisi' : 'belum terisi, potensi naik'})`,
      };
    }
    // Bearish FVG: candle[i].low > candle[i+2].high
    if (candles[i].low > candles[i + 2].high) {
      const gapHigh = candles[i].low;
      const gapLow = candles[i + 2].high;
      const currentPrice = candles[candles.length - 1].close;
      const filled = currentPrice >= gapHigh;
      return {
        high: gapHigh,
        low: gapLow,
        filled,
        description: `Bearish FVG di ${fmtNum(gapLow)} - ${fmtNum(gapHigh)} (${filled ? 'sudah terisi' : 'belum terisi, potensi turun'})`,
      };
    }
  }
  return null;
}

/** Detect Order Block zone from recent candles */
function detectOrderBlock(candles: Candle[]): { zone: { high: number; low: number }; type: 'bullish' | 'bearish'; description: string } | null {
  if (candles.length < 5) return null;

  for (let i = candles.length - 4; i >= Math.max(0, candles.length - 20); i--) {
    const lookbackStart = Math.max(0, i - 3);
    const prevHigh = Math.max(...candles.slice(lookbackStart, i).map(c => c.high));
    const prevLow = Math.min(...candles.slice(lookbackStart, i).map(c => c.low));

    // Bullish breakout: next candles break above resistance
    if (candles[i + 1].high > prevHigh && candles[i + 2].high > prevHigh) {
      const zoneHigh = Math.max(candles[i].high, candles[i].open);
      const zoneLow = Math.min(candles[i].low, candles[i].close);
      return {
        zone: { high: zoneHigh, low: zoneLow },
        type: 'bullish',
        description: `Bullish Order Block di ${fmtNum(zoneLow)} - ${fmtNum(zoneHigh)}`,
      };
    }
    // Bearish breakout: next candles break below support
    if (candles[i + 1].low < prevLow && candles[i + 2].low < prevLow) {
      const zoneHigh = Math.max(candles[i].high, candles[i].close);
      const zoneLow = Math.min(candles[i].low, candles[i].open);
      return {
        zone: { high: zoneHigh, low: zoneLow },
        type: 'bearish',
        description: `Bearish Order Block di ${fmtNum(zoneLow)} - ${fmtNum(zoneHigh)}`,
      };
    }
  }
  return null;
}

/** Detect Liquidity Sweep: wick beyond recent high/low then reverses */
function detectLiquiditySweep(candles: Candle[]): { level: number; swept: boolean; description: string; type: 'high' | 'low' } | null {
  if (candles.length < 10) return null;

  const lookback = 10;
  const recentCandles = candles.slice(Math.max(0, candles.length - lookback - 1), candles.length - 1);
  const recentHigh = Math.max(...recentCandles.map(c => c.high));
  const recentLow = Math.min(...recentCandles.map(c => c.low));
  const lastCandle = candles[candles.length - 1];

  // Sweep above high then close below (bearish sweep)
  if (lastCandle.high > recentHigh && lastCandle.close < lastCandle.open) {
    return {
      level: recentHigh,
      swept: true,
      type: 'high',
      description: `Liquidity sweep di atas ${fmtNum(recentHigh)} — harga menembus lalu ditolak, potensi reversal bearish`,
    };
  }

  // Sweep below low then close above (bullish sweep)
  if (lastCandle.low < recentLow && lastCandle.close > lastCandle.open) {
    return {
      level: recentLow,
      swept: true,
      type: 'low',
      description: `Liquidity sweep di bawah ${fmtNum(recentLow)} — harga menembus lalu memantul, potensi reversal bullish`,
    };
  }

  return null;
}

/** Detect Trend Structure: bullish/bearish/ranging from swing points */
function detectTrendStructure(candles: Candle[]): 'bullish' | 'bearish' | 'ranging' {
  if (candles.length < 10) return 'ranging';

  // Simple swing detection
  let higherHighs = 0;
  let lowerHighs = 0;
  let higherLows = 0;
  let lowerLows = 0;

  const step = Math.max(1, Math.floor(candles.length / 5));
  for (let i = step; i < candles.length - step; i += step) {
    const prevHigh = Math.max(...candles.slice(Math.max(0, i - step), i).map(c => c.high));
    const prevLow = Math.min(...candles.slice(Math.max(0, i - step), i).map(c => c.low));
    const nextHigh = Math.max(...candles.slice(i, Math.min(candles.length, i + step)).map(c => c.high));
    const nextLow = Math.min(...candles.slice(i, Math.min(candles.length, i + step)).map(c => c.low));

    if (nextHigh > prevHigh) higherHighs++;
    else if (nextHigh < prevHigh) lowerHighs++;
    if (nextLow > prevLow) higherLows++;
    else if (nextLow < prevLow) lowerLows++;
  }

  const bullishScore = higherHighs + higherLows;
  const bearishScore = lowerHighs + lowerLows;

  if (bullishScore > bearishScore * 1.5) return 'bullish';
  if (bearishScore > bullishScore * 1.5) return 'bearish';
  return 'ranging';
}

/** Premium/Discount zone relative to equilibrium (50-period EMA) */
function detectPremiumDiscount(candles: Candle[]): 'premium' | 'discount' | 'equilibrium' {
  if (candles.length < 10) return 'equilibrium';

  const closes = candles.map(c => c.close);
  const eq = sma(closes, Math.min(50, closes.length));
  const currentPrice = closes[closes.length - 1];
  const range = Math.max(eq * 0.01, 1); // 1% threshold

  if (currentPrice > eq + range) return 'premium';
  if (currentPrice < eq - range) return 'discount';
  return 'equilibrium';
}

/** Format number for display */
function fmtNum(n: number): string {
  if (n >= 1000) return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (n >= 1) return n.toFixed(2);
  return n.toFixed(6);
}

// ── Data Fetchers ────────────────────────────────────────────────────────────

interface OHLCVData {
  candles: Candle[];
  closes: number[];
  volumes: number[];
  lastPrice: number;
}

/** Fetch OHLCV from CoinGecko — REAL candle data, free, no API key */
async function fetchCoinGeckoOHLCV(symbol: string): Promise<OHLCVData | null> {
  try {
    const cgId = toCoinGeckoId(symbol);
    const url = `https://api.coingecko.com/api/v3/coins/${cgId}/ohlc?vs_currency=usd&days=90`;
    const res = await fetchWithTimeout(url, { timeoutMs: 10000 });
    if (!res.ok) {
      console.warn(`CoinGecko OHLC returned ${res.status} for ${symbol} (id: ${cgId})`);
      return null;
    }
    const data = await res.json();
    if (!Array.isArray(data) || data.length < 5) return null;
    const candles: Candle[] = [];
    const closes: number[] = [];
    const volumes: number[] = [];
    for (const candle of data) {
      if (!Array.isArray(candle) || candle.length < 5) continue;
      const [, open, high, low, close] = candle;
      if (isNaN(close) || isNaN(open)) continue;
      candles.push({ open, high, low, close });
      closes.push(close);
      volumes.push(0);
    }
    if (closes.length < 5) return null;
    return { candles, closes, volumes, lastPrice: closes[closes.length - 1] };
  } catch (error) {
    console.warn(`CoinGecko OHLCV failed for ${symbol}: ${error instanceof Error ? error.message : error}`);
    return null;
  }
}

/** Fetch price from CoinMarketCap API (requires CMC_API_KEY) */
async function fetchCMCPrice(symbol: string): Promise<{ price: number; change24h: number } | null> {
  const apiKey = process.env.CMC_API_KEY;
  if (!apiKey) return null;
  try {
    const cmcSymbol = symbol.toUpperCase().replace('USDT', '');
    const url = `https://pro-api.coinmarketcap.com/v2/cryptocurrency/quotes/latest?symbol=${cmcSymbol}&convert=USD`;
    const res = await fetchWithTimeout(url, {
      timeoutMs: 8000,
      headers: { 'X-CMC_PRO_API_KEY': apiKey },
    });
    if (!res.ok) return null;
    const data = await res.json();
    const entry = data?.data?.[cmcSymbol];
    if (!entry?.quote?.USD) return null;
    const price = entry.quote.USD.price;
    const change24h = entry.quote.USD.percent_change_24h ?? 0;
    if (typeof price !== 'number' || isNaN(price)) return null;
    return { price, change24h: parseFloat(change24h.toFixed(2)) };
  } catch {
    return null;
  }
}

/** Fetch OHLCV from CoinMarketCap (not available in free tier — always returns null) */
async function fetchCMCOHLCV(_symbol: string): Promise<OHLCVData | null> {
  return null;
}

/** Fetch OHLCV from Yahoo Finance for saham, komoditas, and indeks */
async function fetchYahooOHLCV(symbol: string, type: string): Promise<OHLCVData | null> {
  try {
    let yahooSymbol = symbol.toUpperCase();
    if (type === 'saham' && !yahooSymbol.endsWith('.JK')) yahooSymbol += '.JK';
    if (type === 'komoditas') {
      const commodityMap: Record<string, string> = {
        XAU: 'GC=F', XAG: 'SI=F', XPT: 'PL=F', XPD: 'PA=F',
        OIL: 'CL=F', GAS: 'NG=F',
      };
      yahooSymbol = commodityMap[yahooSymbol] || yahooSymbol;
    }
    if (type === 'indeks') {
      const indexMap: Record<string, string> = {
        IHSG: '^JKSE', LQ45: '^JKLQ45', SPX: '^GSPC', DJI: '^DJI',
        NDX: '^NDX', FTSE: '^FTSE', DAX: '^GDAXI', NIKKEI: '^N225',
        KOSPI: '^KS11', HSI: '^HSI', SHANGHAI: '^SSEC',
      };
      yahooSymbol = indexMap[yahooSymbol] || yahooSymbol;
    }

    const range = '3mo';
    const interval = '1d';
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol)}?range=${range}&interval=${interval}`;
    const res = await fetchWithTimeout(url, { timeoutMs: 10000 });
    if (!res.ok) return null;
    const data = await res.json();
    const result = data.chart?.result?.[0];
    if (!result) return null;

    const timestamps = result.timestamp || [];
    const quotes = result.indicators?.quote?.[0];
    if (!quotes) return null;

    const { open, high, low, close, volume } = quotes;
    const candles: Candle[] = [];
    const closes: number[] = [];
    const volumes: number[] = [];

    for (let i = 0; i < timestamps.length; i++) {
      if (close[i] == null || open[i] == null) continue;
      candles.push({
        open: parseFloat(open[i].toFixed(4)),
        high: parseFloat((high[i] || close[i]).toFixed(4)),
        low: parseFloat((low[i] || close[i]).toFixed(4)),
        close: parseFloat(close[i].toFixed(4)),
      });
      closes.push(parseFloat(close[i].toFixed(4)));
      volumes.push(Math.floor(volume?.[i] || 0));
    }

    if (closes.length < 20) return null;
    return { candles, closes, volumes, lastPrice: closes[closes.length - 1] };
  } catch {
    return null;
  }
}

// Binance API removed — using CoinGecko as primary source for all crypto data

/** Generate mock OHLCV — ONLY as absolute last resort, produces meaningless indicators */
function generateMockOHLCV(basePrice: number, symbol: string): OHLCVData {
  const candles: Candle[] = [];
  const closes: number[] = [];
  const volumes: number[] = [];
  let price = basePrice * 0.85;
  const now = Math.floor(Date.now() / 86400000);

  for (let i = 100; i >= 0; i--) {
    const seed = symbol + String(now - i);
    const volatility = basePrice * 0.025;
    const change = (seededRandom(seed) - 0.45) * volatility;
    const open = price;
    price = price + change;
    const high = Math.max(open, price) * (1 + seededRandom(seed + 'h') * 0.015);
    const low = Math.min(open, price) * (1 - seededRandom(seed + 'l') * 0.015);
    const close = parseFloat(price.toFixed(price < 1 ? 6 : 2));
    candles.push({
      open: parseFloat(open.toFixed(open < 1 ? 6 : 2)),
      high: parseFloat(high.toFixed(high < 1 ? 6 : 2)),
      low: parseFloat(low.toFixed(low < 1 ? 6 : 2)),
      close,
    });
    closes.push(close);
    volumes.push(Math.floor(seededRandom(seed + 'v') * 10000000));
  }

  return { candles, closes, volumes, lastPrice: closes[closes.length - 1] };
}

// Binance API removed — using CoinGecko as primary source for all crypto data

/** Fetch CoinGecko price + 24h change */
async function fetchCoinGeckoPrice(symbol: string): Promise<{ price: number; change24h: number } | null> {
  try {
    const cgId = toCoinGeckoId(symbol);
    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${cgId}&vs_currencies=usd&include_24hr_change=true`;
    const res = await fetchWithTimeout(url, { timeoutMs: 8000 });
    if (!res.ok) return null;
    const data = await res.json();
    const info = data[cgId];
    if (!info || typeof info.usd !== 'number') return null;
    return { price: info.usd, change24h: info.usd_24hr_change ?? 0 };
  } catch {
    return null;
  }
}

/** Fetch detailed market data from CoinGecko — market cap, volume, 24h H/L, ATH/ATL, sparkline */
async function fetchCoinGeckoMarketDetail(symbol: string): Promise<{
  marketCap: number | null;
  totalVolume: number | null;
  high24h: number | null;
  low24h: number | null;
  ath: number | null;
  athChangePercentage: number | null;
  atl: number | null;
  atlChangePercentage: number | null;
  priceChangePercentage7d: number | null;
  priceChangePercentage30d: number | null;
  circulatingSupply: number | null;
  marketCapRank: number | null;
  sparkline7d: number[] | null;
} | null> {
  try {
    const cgId = toCoinGeckoId(symbol);
    const url = `https://api.coingecko.com/api/v3/coins/${cgId}?localization=false&tickers=false&community_data=false&developer_data=false&sparkline=true`;
    const res = await fetchWithTimeout(url, { timeoutMs: 12000 });
    if (!res.ok) return null;
    const data = await res.json();
    const md = data?.market_data;
    if (!md) return null;
    return {
      marketCap: md.market_cap?.usd ?? null,
      totalVolume: md.total_volume?.usd ?? null,
      high24h: md.high_24h?.usd ?? null,
      low24h: md.low_24h?.usd ?? null,
      ath: md.ath?.usd ?? null,
      athChangePercentage: md.ath_change_percentage?.usd ?? null,
      atl: md.atl?.usd ?? null,
      atlChangePercentage: md.atl_change_percentage?.usd ?? null,
      priceChangePercentage7d: md.price_change_percentage_7d ?? null,
      priceChangePercentage30d: md.price_change_percentage_30d ?? null,
      circulatingSupply: md.circulating_supply ?? null,
      marketCapRank: data.market_cap_rank ?? null,
      sparkline7d: md.sparkline_7d?.price ?? null,
    };
  } catch (error) {
    console.warn(`CoinGecko market detail failed for ${symbol}: ${error instanceof Error ? error.message : error}`);
    return null;
  }
}

// Binance API removed — using CoinGecko as primary source for all crypto data

/** Fetch real 24h change from Yahoo Finance for a given symbol */
async function fetchYahooChange24h(yahooSymbol: string): Promise<number | null> {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol)}?interval=1d&range=5d`;
    const res = await fetchWithTimeout(url, { timeoutMs: 8000, headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (!res.ok) return null;
    const data = await res.json();
    const meta = data.chart?.result?.[0]?.meta;
    if (!meta || typeof meta.regularMarketPrice !== 'number') return null;
    const prev = meta.chartPreviousClose ?? meta.previousClose;
    if (!prev || prev <= 0) return null;
    return parseFloat((((meta.regularMarketPrice - prev) / prev) * 100).toFixed(2));
  } catch {
    return null;
  }
}

/** Forex symbol → Yahoo Finance symbol mapping */
const FOREX_YAHOO_MAP: Record<string, string> = {
  EURUSD: 'EURUSD=X', GBPUSD: 'GBPUSD=X', USDJPY: 'JPY=X',
  AUDUSD: 'AUDUSD=X', NZDUSD: 'NZDUSD=X', USDCAD: 'USDCAD=X',
  USDCHF: 'USDCHF=X', EURJPY: 'EURJPY=X', GBPJPY: 'GBPJPY=X',
  EURGBP: 'EURGBP=X', EURAUD: 'EURAUD=X',
};

/** Fetch forex rate from frankfurter.app with real change24h from Yahoo */
async function fetchForexPrice(symbol: string): Promise<{ price: number; change24h: number } | null> {
  try {
    const upper = symbol.toUpperCase();
    const pairs: Record<string, [string, string]> = {
      EURUSD: ['EUR', 'USD'], GBPUSD: ['GBP', 'USD'], USDJPY: ['USD', 'JPY'],
      AUDUSD: ['AUD', 'USD'], NZDUSD: ['NZD', 'USD'], USDCAD: ['USD', 'CAD'],
      USDCHF: ['USD', 'CHF'], EURJPY: ['EUR', 'JPY'], GBPJPY: ['GBP', 'JPY'],
      EURGBP: ['EUR', 'GBP'], EURAUD: ['EUR', 'AUD'],
    };
    const pair = pairs[upper];
    if (!pair) return null;
    const url = `https://api.frankfurter.app/latest?from=${pair[0]}&to=${pair[1]}`;
    const res = await fetchWithTimeout(url, { timeoutMs: 8000 });
    if (!res.ok) return null;
    const data = await res.json();
    const rate = data.rates?.[pair[1]];
    if (typeof rate !== 'number') return null;

    // Get real change24h from Yahoo Finance
    const yahooSym = FOREX_YAHOO_MAP[upper];
    let change24h: number | null = null;
    if (yahooSym) {
      change24h = await fetchYahooChange24h(yahooSym);
    }

    return { price: rate, change24h: change24h ?? 0 };
  } catch {
    return null;
  }
}

/** Commodity symbol → Yahoo Finance symbol mapping */
const COMMODITY_YAHOO_MAP: Record<string, string> = {
  XAU: 'GC=F', XAG: 'SI=F', XPT: 'PL=F', XPD: 'PA=F',
  OIL: 'CL=F', CL: 'CL=F', CRUDE: 'CL=F', WTI: 'CL=F', BRENT: 'BZ=F', NG: 'NG=F',
};

/** Fetch commodity price from metals.live with real change24h from Yahoo */
async function fetchCommodityPrice(symbol: string): Promise<{ price: number; change24h: number } | null> {
  try {
    const upper = symbol.toUpperCase();
    const map: Record<string, string> = { XAU: 'gold', XAG: 'silver', XPT: 'platinum', XPD: 'palladium' };
    const metal = map[upper];
    let price: number | null = null;

    if (metal) {
      const url = 'https://api.metals.live/v1/spot';
      const res = await fetchWithTimeout(url, { timeoutMs: 8000 });
      if (!res.ok) return null;
      const data = await res.json();
      const item = Array.isArray(data) ? data.find((m: { name: string }) => m.name.toLowerCase() === metal) : null;
      if (!item || typeof item.price !== 'number') return null;
      price = item.price;
    } else {
      // Oil / other commodities — use Yahoo Finance directly for both price and change
      const yahooSym = COMMODITY_YAHOO_MAP[upper];
      if (!yahooSym) return null;
      const change24h = await fetchYahooChange24h(yahooSym);
      // Also get the current price from Yahoo
      try {
        const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSym)}?interval=1d&range=5d`;
        const res = await fetchWithTimeout(url, { timeoutMs: 8000, headers: { 'User-Agent': 'Mozilla/5.0' } });
        if (res.ok) {
          const data = await res.json();
          const meta = data.chart?.result?.[0]?.meta;
          if (meta && typeof meta.regularMarketPrice === 'number') {
            return { price: meta.regularMarketPrice, change24h: change24h ?? 0 };
          }
        }
      } catch { /* fallthrough */ }
      return null;
    }

    // Get real change24h from Yahoo Finance
    const yahooSym = COMMODITY_YAHOO_MAP[upper];
    let change24h: number | null = null;
    if (yahooSym) {
      change24h = await fetchYahooChange24h(yahooSym);
    }

    return { price: price!, change24h: change24h ?? 0 };
  } catch {
    return null;
  }
}

/** Fetch stock price from Yahoo Finance */
async function fetchStockPrice(symbol: string): Promise<{ price: number; change24h: number } | null> {
  try {
    const yahooSymbol = toYahooSymbol(symbol);
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}?interval=1d&range=5d`;
    const res = await fetchWithTimeout(url, { timeoutMs: 8000, headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (!res.ok) return null;
    const data = await res.json();
    const meta = data.chart?.result?.[0]?.meta;
    if (!meta || typeof meta.regularMarketPrice !== 'number') return null;
    const prev = meta.chartPreviousClose ?? meta.previousClose;
    const change = prev > 0 ? ((meta.regularMarketPrice - prev) / prev) * 100 : 0;
    return { price: meta.regularMarketPrice, change24h: parseFloat(change.toFixed(2)) };
  } catch {
    return null;
  }
}

/** Fetch index price */
async function fetchIndexPrice(symbol: string): Promise<{ price: number; change24h: number } | null> {
  try {
    const map: Record<string, string> = {
      SPX: '%5EGSPC', SPY: 'SPY', SP500: '%5EGSPC', SPX500: '%5EGSPC',
      NDX: '%5EIXIC', NASDAQ: '%5EIXIC', QQQ: 'QQQ', US100: '%5EIXIC',
      DJI: '%5EDJI', DIA: 'DIA', US30: '%5EDJI',
      IDX: '%5EJKSE', JKI: 'JKI', IHSG: '%5EJKSE', IDXCOMPOSITE: '%5EJKSE', LQ45: '%5ELQ45',
      VIX: '%5EVIX', DXY: 'DX-Y.NYB',
      US2000: '%5ERUT',
      FTSE100: '%5EFTSE', DAX40: '%5EGDAXI', STOXX600: '%5ESTOXX',
      NIKKEI225: '%5EN225', HSI50: '%5EHSI', SHCOMP: '000001.SS',
      KOSPI200: '%5EKS11', ASX200: '%5EAXJO',
    };
    const yahooSym = map[symbol.toUpperCase()];
    if (!yahooSym) return null;
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSym}?interval=1d&range=5d`;
    const res = await fetchWithTimeout(url, { timeoutMs: 8000, headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (!res.ok) return null;
    const data = await res.json();
    const meta = data.chart?.result?.[0]?.meta;
    if (!meta || typeof meta.regularMarketPrice !== 'number') return null;
    const prev = meta.chartPreviousClose ?? meta.previousClose;
    const change = prev > 0 ? ((meta.regularMarketPrice - prev) / prev) * 100 : 0;
    return { price: meta.regularMarketPrice, change24h: parseFloat(change.toFixed(2)) };
  } catch {
    return null;
  }
}

/** Universal price fetcher — tries multiple sources by asset type */
async function fetchLivePrice(symbol: string, type: string): Promise<{ price: number; change24h: number; source: string } | null> {
  if (type === 'crypto') {
    // CoinGecko primary, then CMC (no Binance — API access restricted)
    const cg = await fetchCoinGeckoPrice(symbol);
    if (cg) return { ...cg, source: 'coingecko' };
    const cmc = await fetchCMCPrice(symbol);
    if (cmc) return { ...cmc, source: 'coinmarketcap' };
    return null;
  }
  if (type === 'forex') {
    const fx = await fetchForexPrice(symbol);
    if (fx) return { ...fx, source: 'frankfurter' };
    return null;
  }
  if (type === 'komoditas') {
    const cm = await fetchCommodityPrice(symbol);
    if (cm) return { ...cm, source: 'metals.live' };
    return null;
  }
  if (type === 'indeks') {
    const idx = await fetchIndexPrice(symbol);
    if (idx) return { ...idx, source: 'yahoo' };
    return null;
  }
  if (type === 'saham') {
    const st = await fetchStockPrice(symbol);
    if (st) return { ...st, source: 'yahoo' };
    return null;
  }
  return null;
}

// ── AI Analysis via LLM ──────────────────────────────────────────────────────

interface AIAnalysisResult {
  overallSignal: 'STRONG_BUY' | 'BUY' | 'NEUTRAL' | 'SELL' | 'STRONG_SELL';
  signalStrength: number;
  confidence: number;
  reasoning: string;
  strategy: string;
  tradeDirection: 'LONG' | 'SHORT' | 'NONE';
  priceForecast: {
    shortTerm: { target: number; timeframe: string };
    midTerm: { target: number; timeframe: string };
    longTerm: { target: number; timeframe: string };
  };
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  entryZone: string;
  stopLossZone: string;
  takeProfitZone: string;
  entryPrice: number;
  stopLossPrice: number;
  takeProfitPrice: number;
  riskRewardRatio: number;
}

function buildFallbackAIAnalysis(
  currentPrice: number,
  rsiValue: number,
  trendStructure: 'bullish' | 'bearish' | 'ranging',
  signalStrength: number,
  premiumDiscount: 'premium' | 'discount' | 'equilibrium',
  type: string,
  symbol: string,
  ob: { zone: { high: number; low: number }; type: string } | null,
  fvg: { high: number; low: number; filled: boolean } | null,
  sweep: { level: number; description: string } | null,
): AIAnalysisResult {
  const prefix = type === 'saham' ? 'Rp' : type === 'forex' ? '' : '$';
  const fmtP = (v: number) => `${prefix}${fmtNum(v)}`;

  let overallSignal: AIAnalysisResult['overallSignal'] = 'NEUTRAL';
  if (signalStrength >= 60) overallSignal = 'STRONG_BUY';
  else if (signalStrength >= 20) overallSignal = 'BUY';
  else if (signalStrength <= -60) overallSignal = 'STRONG_SELL';
  else if (signalStrength <= -20) overallSignal = 'SELL';

  const confidence = Math.min(95, Math.max(30, Math.abs(signalStrength) + 25));

  // ── CRITICAL FIX: Determine direction from overallSignal, NOT trendStructure ──
  const isLong = overallSignal === 'STRONG_BUY' || overallSignal === 'BUY';
  const isShort = overallSignal === 'STRONG_SELL' || overallSignal === 'SELL';
  const tradeDirection: AIAnalysisResult['tradeDirection'] = isLong ? 'LONG' : isShort ? 'SHORT' : 'NONE';

  // Dynamic multiplier based on signal strength
  const strengthFactor = Math.abs(signalStrength) / 100; // 0 to 1
  const baseMovePct = 0.02 + strengthFactor * 0.06; // 2% to 8%

  const reasoningParts: string[] = [];
  if (isLong) {
    reasoningParts.push(`Struktur tren ${symbol} menunjukkan sinyal BELI dengan tekanan beli kuat (strength: ${signalStrength}).`);
    if (premiumDiscount === 'discount') reasoningParts.push('Harga berada di zona diskon, area akumulasi smart money.');
    if (ob && ob.type === 'bullish') reasoningParts.push('Bullish order block terdeteksi sebagai area support utama.');
  } else if (isShort) {
    reasoningParts.push(`Struktur tren ${symbol} menunjukkan sinyal JUAL dengan tekanan jual dominan (strength: ${signalStrength}).`);
    if (premiumDiscount === 'premium') reasoningParts.push('Harga berada di zona premium, potensi distribusi dari institusi.');
    if (ob && ob.type === 'bearish') reasoningParts.push('Bearish order block terdeteksi sebagai area resistance utama.');
  } else {
    if (trendStructure === 'bullish') reasoningParts.push(`Struktur tren ${symbol} bullish namun sinyal belum cukup kuat untuk entry.`);
    else if (trendStructure === 'bearish') reasoningParts.push(`Struktur tren ${symbol} bearish namun sinyal belum cukup kuat untuk entry.`);
    else reasoningParts.push(`Struktur tren ${symbol} sideways (ranging), menunggu breakout arah yang jelas.`);
  }
  if (fvg && !fvg.filled) reasoningParts.push('Fair value gap yang belum terisi menandakan ketidakseimbangan harga.');
  if (sweep) reasoningParts.push('Liquidity sweep terdeteksi, potensi reversal.');

  // ── Price Forecast (direction-aware) ──
  const shortTarget = isLong
    ? currentPrice * (1 + baseMovePct * 0.4)
    : isShort
      ? currentPrice * (1 - baseMovePct * 0.4)
      : currentPrice;
  const midTarget = isLong
    ? currentPrice * (1 + baseMovePct * 0.8)
    : isShort
      ? currentPrice * (1 - baseMovePct * 0.8)
      : currentPrice;
  const longTarget = isLong
    ? currentPrice * (1 + baseMovePct * 1.5)
    : isShort
      ? currentPrice * (1 - baseMovePct * 1.5)
      : currentPrice;

  const strategies: string[] = [];
  if (isLong) strategies.push('BUY');
  if (isShort) strategies.push('SELL');
  if (ob) strategies.push('Order Block');
  if (fvg && !fvg.filled) strategies.push('FVG Fill');
  if (sweep) strategies.push('Liquidity Sweep');
  if (!isLong && !isShort) strategies.push('Wait');

  // ── Trade Zones (LOGICALLY CONSISTENT with direction) ──
  let entryPrice: number;
  let stopLossPrice: number;
  let takeProfitPrice: number;
  let entryZone: string;
  let stopLossZone: string;
  let takeProfitZone: string;

  if (isLong) {
    // LONG: Entry ≈ current, SL below current, TP above current
    const slDistance = currentPrice * (0.015 + strengthFactor * 0.025); // 1.5% - 4%
    const tpDistance = slDistance * (2 + strengthFactor); // R:R ratio 2:1 to 3:1
    entryPrice = currentPrice;
    stopLossPrice = currentPrice - slDistance;
    takeProfitPrice = currentPrice + tpDistance;
    entryZone = `BUY di ${fmtP(currentPrice * 0.998)} - ${fmtP(currentPrice * 1.002)}`;
    stopLossZone = `SL di ${fmtP(stopLossPrice)} (di bawah entry)`;
    takeProfitZone = `TP di ${fmtP(takeProfitPrice)} (di atas entry)`;
  } else if (isShort) {
    // SHORT: Entry ≈ current, SL above current, TP below current
    const slDistance = currentPrice * (0.015 + strengthFactor * 0.025); // 1.5% - 4%
    const tpDistance = slDistance * (2 + strengthFactor); // R:R ratio 2:1 to 3:1
    entryPrice = currentPrice;
    stopLossPrice = currentPrice + slDistance;
    takeProfitPrice = currentPrice - tpDistance;
    entryZone = `SELL di ${fmtP(currentPrice * 0.998)} - ${fmtP(currentPrice * 1.002)}`;
    stopLossZone = `SL di ${fmtP(stopLossPrice)} (di atas entry)`;
    takeProfitZone = `TP di ${fmtP(takeProfitPrice)} (di bawah entry)`;
  } else {
    // NEUTRAL: no trade
    entryPrice = currentPrice;
    stopLossPrice = 0;
    takeProfitPrice = 0;
    entryZone = `Tunggu konfirmasi di area ${fmtP(currentPrice * 0.99)} - ${fmtP(currentPrice * 1.01)}`;
    stopLossZone = 'Belum ada rekomendasi';
    takeProfitZone = 'Belum ada rekomendasi';
  }

  const riskRewardRatio = stopLossPrice > 0 && takeProfitPrice > 0 && entryPrice > 0
    ? parseFloat((Math.abs(takeProfitPrice - entryPrice) / Math.abs(stopLossPrice - entryPrice)).toFixed(1))
    : 0;

  return {
    overallSignal,
    signalStrength,
    confidence,
    tradeDirection,
    reasoning: reasoningParts.join(' '),
    strategy: strategies.join(' + '),
    priceForecast: {
      shortTerm: { target: parseFloat(shortTarget.toFixed(2)), timeframe: '1-3 hari' },
      midTerm: { target: parseFloat(midTarget.toFixed(2)), timeframe: '1-2 minggu' },
      longTerm: { target: parseFloat(longTarget.toFixed(2)), timeframe: '1-3 bulan' },
    },
    riskLevel: Math.abs(signalStrength) > 50 ? 'HIGH' : Math.abs(signalStrength) > 25 ? 'MEDIUM' : 'LOW',
    entryZone,
    stopLossZone,
    takeProfitZone,
    entryPrice: parseFloat(entryPrice.toFixed(2)),
    stopLossPrice: parseFloat(stopLossPrice.toFixed(2)),
    takeProfitPrice: parseFloat(takeProfitPrice.toFixed(2)),
    riskRewardRatio,
  };
}

async function generateAIAnalysis(
  symbol: string,
  type: string,
  price: number,
  change24h: number,
  rsiValue: number,
  macdResult: { macd: number; signal: number; histogram: number },
  bbResult: { upper: number; middle: number; lower: number },
  sma20: number,
  sma50: number,
  fvg: { high: number; low: number; filled: boolean; description: string } | null,
  ob: { zone: { high: number; low: number }; type: string; description: string } | null,
  sweep: { level: number; swept: boolean; description: string } | null,
  trendStructure: 'bullish' | 'bearish' | 'ranging',
  premiumDiscount: 'premium' | 'discount' | 'equilibrium',
  signalStrength: number,
): Promise<AIAnalysisResult | null> {
  try {
    const zai = await import('z-ai-web-dev-sdk');
    const ZAI = zai.default;
    const zaiClient = await ZAI.create();

    const prompt = `Kamu adalah analis Smart Money Concepts (SMC) profesional. Analisis ${symbol} (${type}) berdasarkan data berikut:

Harga saat ini: ${price} (${change24h >= 0 ? '+' : ''}${change24h.toFixed(2)}% 24h)

Smart Money Concepts:
- FVG: ${fvg ? JSON.stringify(fvg) : 'Tidak terdeteksi'}
- Order Block: ${ob ? JSON.stringify(ob) : 'Tidak terdeteksi'}
- Liquidity Sweep: ${sweep ? JSON.stringify(sweep) : 'Tidak terdeteksi'}
- Trend Structure: ${trendStructure}
- Premium/Discount: ${premiumDiscount}

Technical Indicators:
- RSI: ${rsiValue.toFixed(1)}
- MACD: histogram ${macdResult.histogram.toFixed(2)}, signal ${macdResult.signal.toFixed(2)}
- Bollinger Bands: upper ${bbResult.upper.toFixed(2)}, middle ${bbResult.middle.toFixed(2)}, lower ${bbResult.lower.toFixed(2)}
- SMA20: ${sma20.toFixed(2)}, SMA50: ${sma50.toFixed(2)}

Skor sinyal agregat: ${signalStrength} (-100 to 100)

⚠️ ATURAN KRITIS UNTUK TRADE ZONES — HARUS LOGIS DAN KONSISTEN:

Jika signal BUY/STRONG_BUY (LONG):
- entryPrice ≈ harga sekarang (${price})
- stopLossPrice HARUS DI BAWAH entryPrice (misal ${price} → SL ${((price * 0.97).toFixed(2))})
- takeProfitPrice HARUS DI ATAS entryPrice (misal ${price} → TP ${((price * 1.05).toFixed(2))})
- Risk:Reward minimal 1:2

Jika signal SELL/STRONG_SELL (SHORT):
- entryPrice ≈ harga sekarang (${price})
- stopLossPrice HARUS DI ATAS entryPrice (misal ${price} → SL ${((price * 1.03).toFixed(2))})
- takeProfitPrice HARUS DI BAWAH entryPrice (misal ${price} → TP ${((price * 0.95).toFixed(2))})
- Risk:Reward minimal 1:2

Jika signal NEUTRAL: entry/SL/TP semua = 0

Berikan analisis dalam bahasa Indonesia. Response format JSON:
{
  "overallSignal": "STRONG_BUY" | "BUY" | "NEUTRAL" | "SELL" | "STRONG_SELL",
  "signalStrength": <number -100 to 100>,
  "confidence": <number 0-100>,
  "reasoning": "<3-4 kalimat dalam bahasa Indonesia menjelaskan kenapa signal ini BUY/SELL/NEUTRAL>",
  "strategy": "<nama strategi, misal 'BUY + FVG Reversal'>",
  "tradeDirection": "LONG" | "SHORT" | "NONE",
  "priceForecast": {
    "shortTerm": { "target": <number>, "timeframe": "1-3 hari" },
    "midTerm": { "target": <number>, "timeframe": "1-2 minggu" },
    "longTerm": { "target": <number>, "timeframe": "1-3 bulan" }
  },
  "riskLevel": "LOW" | "MEDIUM" | "HIGH",
  "entryZone": "<text: BUY/SELL di $X - $Y>",
  "stopLossZone": "<text: SL di $X (di bawah/atas entry)>",
  "takeProfitZone": "<text: TP di $X (di atas/bawah entry)>",
  "entryPrice": <number harga entry>,
  "stopLossPrice": <number harga stop loss, 0 jika NEUTRAL>,
  "takeProfitPrice": <number harga take profit, 0 jika NEUTRAL>,
  "riskRewardRatio": <number R:R ratio, 0 jika NEUTRAL>
}

Hanya response JSON saja.`;

    const result = await zaiClient.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
    });

    const content = result.choices?.[0]?.message?.content;
    if (!content) throw new Error('Empty LLM response');

    // Extract JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON in LLM response');

    const parsed = JSON.parse(jsonMatch[0]) as AIAnalysisResult;

    // Validate and sanitize
    const validSignals = ['STRONG_BUY', 'BUY', 'NEUTRAL', 'SELL', 'STRONG_SELL'];
    if (!validSignals.includes(parsed.overallSignal)) parsed.overallSignal = 'NEUTRAL';
    parsed.signalStrength = Math.max(-100, Math.min(100, Number(parsed.signalStrength) || 0));
    parsed.confidence = Math.max(10, Math.min(99, Number(parsed.confidence) || 50));
    if (!['LOW', 'MEDIUM', 'HIGH'].includes(parsed.riskLevel)) parsed.riskLevel = 'MEDIUM';
    if (!parsed.reasoning) parsed.reasoning = `Analisis teknikal ${symbol} menunjukkan sinyal ${parsed.overallSignal} berdasarkan indikator SMC dan teknikal.`;
    if (!parsed.strategy) parsed.strategy = 'Technical + SMC Analysis';

    // ── CRITICAL: Enforce logical consistency of trade zones ──
    const isBuy = parsed.overallSignal === 'STRONG_BUY' || parsed.overallSignal === 'BUY';
    const isSell = parsed.overallSignal === 'STRONG_SELL' || parsed.overallSignal === 'SELL';

    if (isBuy) {
      parsed.tradeDirection = 'LONG';
      // Force SL below entry, TP above entry
      if (parsed.entryPrice == null || parsed.entryPrice <= 0) parsed.entryPrice = price;
      if (parsed.stopLossPrice == null || parsed.stopLossPrice <= 0 || parsed.stopLossPrice >= parsed.entryPrice) {
        parsed.stopLossPrice = parseFloat((parsed.entryPrice * 0.97).toFixed(2)); // 3% below
      }
      if (parsed.takeProfitPrice == null || parsed.takeProfitPrice <= 0 || parsed.takeProfitPrice <= parsed.entryPrice) {
        parsed.takeProfitPrice = parseFloat((parsed.entryPrice * 1.05).toFixed(2)); // 5% above
      }
    } else if (isSell) {
      parsed.tradeDirection = 'SHORT';
      // Force SL above entry, TP below entry
      if (parsed.entryPrice == null || parsed.entryPrice <= 0) parsed.entryPrice = price;
      if (parsed.stopLossPrice == null || parsed.stopLossPrice <= 0 || parsed.stopLossPrice <= parsed.entryPrice) {
        parsed.stopLossPrice = parseFloat((parsed.entryPrice * 1.03).toFixed(2)); // 3% above
      }
      if (parsed.takeProfitPrice == null || parsed.takeProfitPrice <= 0 || parsed.takeProfitPrice >= parsed.entryPrice) {
        parsed.takeProfitPrice = parseFloat((parsed.entryPrice * 0.95).toFixed(2)); // 5% below
      }
    } else {
      parsed.tradeDirection = 'NONE';
      parsed.entryPrice = price;
      parsed.stopLossPrice = 0;
      parsed.takeProfitPrice = 0;
    }

    // Compute R:R ratio
    if (parsed.entryPrice > 0 && parsed.stopLossPrice > 0 && parsed.takeProfitPrice > 0) {
      const risk = Math.abs(parsed.entryPrice - parsed.stopLossPrice);
      const reward = Math.abs(parsed.takeProfitPrice - parsed.entryPrice);
      parsed.riskRewardRatio = risk > 0 ? parseFloat((reward / risk).toFixed(1)) : 0;
    } else {
      parsed.riskRewardRatio = 0;
    }

    // Update zone text to be clear
    const prefix = type === 'saham' ? 'Rp' : '$';
    const fp = (v: number) => `${prefix}${v.toLocaleString(undefined, { maximumFractionDigits: v < 1 ? 6 : 2 })}`;
    if (isBuy) {
      parsed.entryZone = `BUY di ${fp(parsed.entryPrice)}`;
      parsed.stopLossZone = `SL di ${fp(parsed.stopLossPrice)} (di bawah entry)`;
      parsed.takeProfitZone = `TP di ${fp(parsed.takeProfitPrice)} (di atas entry)`;
    } else if (isSell) {
      parsed.entryZone = `SELL di ${fp(parsed.entryPrice)}`;
      parsed.stopLossZone = `SL di ${fp(parsed.stopLossPrice)} (di atas entry)`;
      parsed.takeProfitZone = `TP di ${fp(parsed.takeProfitPrice)} (di bawah entry)`;
    } else {
      parsed.entryZone = `Tunggu konfirmasi di ${fp(price)}`;
      parsed.stopLossZone = 'Belum ada rekomendasi';
      parsed.takeProfitZone = 'Belum ada rekomendasi';
    }

    return parsed;
  } catch (error) {
    console.warn(`AI analysis failed for ${symbol}: ${error instanceof Error ? error.message : error}`);
    return null;
  }
}

// ── News Confirmation ────────────────────────────────────────────────────────

async function fetchNewsConfirmation(
  symbol: string,
  type: string,
): Promise<{ confirmed: boolean; recentEvents: string[]; sentiment: 'bullish' | 'bearish' | 'neutral'; source: string }> {
  try {
    const zai = await import('z-ai-web-dev-sdk');
    const ZAI = zai.default;
    const zaiClient = await ZAI.create();

    const assetType = type === 'crypto' ? 'crypto' : type === 'forex' ? 'forex' : 'stock';
    const searchQuery = `${symbol} ${assetType} news today latest`;

    const newsResults = await zaiClient.functions.invoke('web_search', {
      query: searchQuery,
      num: 3,
      recency_days: 1,
    });

    const events: string[] = [];
    let bullishCount = 0;
    let bearishCount = 0;

    if (Array.isArray(newsResults)) {
      for (const item of newsResults.slice(0, 3)) {
        const title = item.name || '';
        const snippet = item.snippet || '';
        events.push(title);

        const text = (title + ' ' + snippet).toLowerCase();
        const bullishWords = ['surge', 'rally', 'bullish', 'gain', 'profit', 'soar', 'up', 'positive', 'growth', 'naik', 'untung'];
        const bearishWords = ['drop', 'fall', 'crash', 'bearish', 'loss', 'decline', 'down', 'negative', 'turun', 'rugi'];

        for (const w of bullishWords) { if (text.includes(w)) bullishCount++; }
        for (const w of bearishWords) { if (text.includes(w)) bearishCount++; }
      }
    }

    const sentiment = bullishCount > bearishCount ? 'bullish' : bearishCount > bullishCount ? 'bearish' : 'neutral';

    return {
      confirmed: events.length > 0,
      recentEvents: events,
      sentiment,
      source: events.length > 0 ? `Berdasarkan ${events.length} berita terbaru` : 'Tidak ada berita terkini',
    };
  } catch (error) {
    console.warn(`News confirmation failed for ${symbol}: ${error instanceof Error ? error.message : error}`);
    return {
      confirmed: false,
      recentEvents: [],
      sentiment: 'neutral',
      source: 'Gagal mengambil berita',
    };
  }
}

// ── Multi-Layer Signal Aggregation ───────────────────────────────────────────

interface SignalDetail {
  indicator: string;
  signal: string;
  weight: number;
  description: string;
}

interface LayerResult {
  score: number;       // -100 to +100
  signal: string;      // 'bullish' | 'bearish' | 'neutral'
  description: string;
}

// ── Layer 1: TREND (25% weight) ──
function computeTrendLayer(
  candles: Candle[],
  closes: number[],
  currentPrice: number,
  _sma20: number,
  _sma50: number,
  _ema12: number,
  _ema26: number,
): LayerResult {
  const details: SignalDetail[] = [];
  let score = 0;

  // ADX trend strength (directional)
  const adxResult = computeADX(candles);
  const adxBullish = adxResult.plusDI > adxResult.minusDI;
  if (adxResult.trendStrength === 'strong') {
    score += adxBullish ? 30 : -30;
    details.push({ indicator: 'ADX', signal: adxBullish ? 'BULLISH' : 'BEARISH', weight: 30, description: `ADX ${adxResult.adx} (strong), +DI ${adxResult.plusDI} vs -DI ${adxResult.minusDI}` });
  } else if (adxResult.trendStrength === 'moderate') {
    score += adxBullish ? 15 : -15;
    details.push({ indicator: 'ADX', signal: adxBullish ? 'BULLISH' : 'BEARISH', weight: 15, description: `ADX ${adxResult.adx} (moderate), tren ${adxBullish ? 'bullish' : 'bearish'}` });
  } else {
    details.push({ indicator: 'ADX', signal: 'NEUTRAL', weight: 5, description: `ADX ${adxResult.adx} (weak), tidak ada tren jelas` });
  }

  // MA alignment
  if (closes.length >= 50) {
    const s20 = sma(closes, 20);
    const s50 = sma(closes, 50);
    const s200 = closes.length >= 200 ? sma(closes, 200) : s50;
    if (s20 > s50 && s50 > s200) {
      score += 25;
      details.push({ indicator: 'MA Alignment', signal: 'BULLISH', weight: 25, description: 'SMA20 > SMA50 > SMA200, bullish alignment kuat' });
    } else if (s20 < s50 && s50 < s200) {
      score -= 25;
      details.push({ indicator: 'MA Alignment', signal: 'BEARISH', weight: 25, description: 'SMA20 < SMA50 < SMA200, bearish alignment kuat' });
    } else if (s20 > s50) {
      score += 10;
      details.push({ indicator: 'MA Alignment', signal: 'BULLISH', weight: 10, description: 'SMA20 > SMA50, partial bullish' });
    } else if (s20 < s50) {
      score -= 10;
      details.push({ indicator: 'MA Alignment', signal: 'BEARISH', weight: 10, description: 'SMA20 < SMA50, partial bearish' });
    } else {
      details.push({ indicator: 'MA Alignment', signal: 'NEUTRAL', weight: 0, description: 'MA berdekatan, menunggu arah' });
    }
  } else {
    // Short data: use SMA20 vs SMA50
    const s20 = sma(closes, Math.min(20, closes.length));
    const s50 = sma(closes, Math.min(50, closes.length));
    if (s20 > s50) { score += 10; details.push({ indicator: 'MA Cross', signal: 'BULLISH', weight: 10, description: 'SMA20 > SMA50' }); }
    else if (s20 < s50) { score -= 10; details.push({ indicator: 'MA Cross', signal: 'BEARISH', weight: 10, description: 'SMA20 < SMA50' }); }
    else { details.push({ indicator: 'MA Cross', signal: 'NEUTRAL', weight: 0, description: 'MA netral' }); }
  }

  // Price position relative to key MAs
  const mainMA = sma(closes, Math.min(50, closes.length));
  const priceVsMA = ((currentPrice - mainMA) / mainMA) * 100;
  if (priceVsMA > 2) { score += 15; details.push({ indicator: 'Price vs MA', signal: 'BULLISH', weight: 15, description: `Harga ${(priceVsMA).toFixed(1)}% di atas MA50` }); }
  else if (priceVsMA < -2) { score -= 15; details.push({ indicator: 'Price vs MA', signal: 'BEARISH', weight: 15, description: `Harga ${Math.abs(priceVsMA).toFixed(1)}% di bawah MA50` }); }
  else { details.push({ indicator: 'Price vs MA', signal: 'NEUTRAL', weight: 5, description: 'Harga dekat MA50' }); }

  // Higher Highs / Lower Lows pattern
  if (closes.length >= 10) {
    const recent5 = closes.slice(-5);
    const prev5 = closes.slice(-10, -5);
    const recentMax = Math.max(...recent5);
    const prevMax = Math.max(...prev5);
    const recentMin = Math.min(...recent5);
    const prevMin = Math.min(...prev5);
    if (recentMax > prevMax && recentMin > prevMin) {
      score += 15;
      details.push({ indicator: 'HH/HL Pattern', signal: 'BULLISH', weight: 15, description: 'Higher highs & higher lows terdeteksi' });
    } else if (recentMax < prevMax && recentMin < prevMin) {
      score -= 15;
      details.push({ indicator: 'HH/HL Pattern', signal: 'BEARISH', weight: 15, description: 'Lower highs & lower lows terdeteksi' });
    } else {
      details.push({ indicator: 'HH/HL Pattern', signal: 'NEUTRAL', weight: 0, description: 'Pola mixed, tidak ada struktur jelas' });
    }
  }

  // Normalize to -100 to 100
  score = Math.max(-100, Math.min(100, Math.round(score)));
  const signal = score > 10 ? 'bullish' : score < -10 ? 'bearish' : 'neutral';
  return { score, signal, description: details.map(d => d.description).join('; ') };
}

// ── Layer 2: MOMENTUM (20% weight) ──
function computeMomentumLayer(
  closes: number[],
  currentPrice: number,
  rsiValue: number,
  macdResult: { macd: number; signal: number; histogram: number },
  bbResult: { upper: number; middle: number; lower: number },
): LayerResult {
  let score = 0;
  const details: SignalDetail[] = [];

  // RSI
  if (rsiValue < 30) { score += 20; details.push({ indicator: 'RSI', signal: 'BULLISH', weight: 20, description: `RSI ${rsiValue.toFixed(1)} oversold, potensi rebound` }); }
  else if (rsiValue < 40) { score += 10; details.push({ indicator: 'RSI', signal: 'BULLISH', weight: 10, description: `RSI ${rsiValue.toFixed(1)} mendekati oversold` }); }
  else if (rsiValue > 70) { score -= 20; details.push({ indicator: 'RSI', signal: 'BEARISH', weight: 20, description: `RSI ${rsiValue.toFixed(1)} overbought, potensi koreksi` }); }
  else if (rsiValue > 60) { score -= 10; details.push({ indicator: 'RSI', signal: 'BEARISH', weight: 10, description: `RSI ${rsiValue.toFixed(1)} mendekati overbought` }); }
  else { details.push({ indicator: 'RSI', signal: 'NEUTRAL', weight: 5, description: `RSI ${rsiValue.toFixed(1)}, zona netral` }); }

  // RSI divergence check
  if (closes.length >= 30) {
    const rsiNow = rsiValue;
    const rsiPrev = computeRSI(closes.slice(0, -14), 14);
    const priceNow = closes[closes.length - 1];
    const pricePrev = closes[closes.length - 15];
    const rsiDiverging = (priceNow > pricePrev && rsiNow < rsiPrev) || (priceNow < pricePrev && rsiNow > rsiPrev);
    if (rsiDiverging) {
      if (priceNow < pricePrev && rsiNow > rsiPrev) { score += 15; details.push({ indicator: 'RSI Divergence', signal: 'BULLISH', weight: 15, description: 'Bullish divergence — harga turun tapi RSI naik' }); }
      else { score -= 15; details.push({ indicator: 'RSI Divergence', signal: 'BEARISH', weight: 15, description: 'Bearish divergence — harga naik tapi RSI turun' }); }
    }
  }

  // MACD
  const { histogram, macd, signal: macdSignal } = macdResult;
  if (histogram > 0 && macd > macdSignal) { score += 15; details.push({ indicator: 'MACD', signal: 'BULLISH', weight: 15, description: `MACD bullish crossover, histogram ${histogram.toFixed(2)}` }); }
  else if (histogram < 0 && macd < macdSignal) { score -= 15; details.push({ indicator: 'MACD', signal: 'BEARISH', weight: 15, description: `MACD bearish crossover, histogram ${histogram.toFixed(2)}` }); }
  else if (histogram > 0) { score += 5; details.push({ indicator: 'MACD', signal: 'BULLISH', weight: 5, description: `Histogram positif ${histogram.toFixed(2)}` }); }
  else if (histogram < 0) { score -= 5; details.push({ indicator: 'MACD', signal: 'BEARISH', weight: 5, description: `Histogram negatif ${histogram.toFixed(2)}` }); }
  else { details.push({ indicator: 'MACD', signal: 'NEUTRAL', weight: 0, description: 'MACD netral' }); }

  // Stochastic RSI
  const stochRSI = computeStochasticRSI(closes);
  if (stochRSI.k < 20 && stochRSI.d < 20) { score += 10; details.push({ indicator: 'StochRSI', signal: 'BULLISH', weight: 10, description: `StochRSI K(${stochRSI.k.toFixed(0)}) & D(${stochRSI.d.toFixed(0)}) oversold` }); }
  else if (stochRSI.k > 80 && stochRSI.d > 80) { score -= 10; details.push({ indicator: 'StochRSI', signal: 'BEARISH', weight: 10, description: `StochRSI K(${stochRSI.k.toFixed(0)}) & D(${stochRSI.d.toFixed(0)}) overbought` }); }
  else if (stochRSI.k > stochRSI.d) { score += 5; details.push({ indicator: 'StochRSI', signal: 'BULLISH', weight: 5, description: `K(${stochRSI.k.toFixed(0)}) > D(${stochRSI.d.toFixed(0)})` }); }
  else if (stochRSI.k < stochRSI.d) { score -= 5; details.push({ indicator: 'StochRSI', signal: 'BEARISH', weight: 5, description: `K(${stochRSI.k.toFixed(0)}) < D(${stochRSI.d.toFixed(0)})` }); }

  // ROC
  const roc = computeROC(closes);
  if (roc > 3) { score += 10; details.push({ indicator: 'ROC', signal: 'BULLISH', weight: 10, description: `ROC ${roc.toFixed(1)}%, momentum naik kuat` }); }
  else if (roc > 0) { score += 5; details.push({ indicator: 'ROC', signal: 'BULLISH', weight: 5, description: `ROC ${roc.toFixed(1)}%, momentum positif` }); }
  else if (roc < -3) { score -= 10; details.push({ indicator: 'ROC', signal: 'BEARISH', weight: 10, description: `ROC ${roc.toFixed(1)}%, momentum turun kuat` }); }
  else if (roc < 0) { score -= 5; details.push({ indicator: 'ROC', signal: 'BEARISH', weight: 5, description: `ROC ${roc.toFixed(1)}%, momentum negatif` }); }
  else { details.push({ indicator: 'ROC', signal: 'NEUTRAL', weight: 0, description: 'ROC netral' }); }

  score = Math.max(-100, Math.min(100, Math.round(score)));
  const signal = score > 10 ? 'bullish' : score < -10 ? 'bearish' : 'neutral';
  return { score, signal, description: details.map(d => d.description).join('; ') };
}

// ── Layer 3: VOLUME (15% weight) ──
function computeVolumeLayer(
  candles: Candle[],
  volumes: number[],
): LayerResult {
  let score = 0;
  const details: SignalDetail[] = [];

  // OBV
  const obvResult = computeOBV(candles, volumes);
  if (obvResult.trend === 'accumulating') {
    score += obvResult.divergence ? 25 : 15;
    details.push({ indicator: 'OBV', signal: 'BULLISH', weight: 15, description: `OBV akumulasi${obvResult.divergence ? ' (divergence bullish)' : ''}` });
  } else if (obvResult.trend === 'distributing') {
    score -= obvResult.divergence ? 25 : 15;
    details.push({ indicator: 'OBV', signal: 'BEARISH', weight: 15, description: `OBV distribusi${obvResult.divergence ? ' (divergence bearish)' : ''}` });
  } else {
    details.push({ indicator: 'OBV', signal: 'NEUTRAL', weight: 0, description: 'OBV netral' });
  }

  // Volume Profile
  const volProfile = computeVolumeProfile(candles, volumes);
  if (volProfile.volumeTrend === 'increasing') {
    score += 10;
    details.push({ indicator: 'Volume', signal: 'BULLISH', weight: 10, description: `Volume meningkat (ratio ${volProfile.volumeRatio}x)${volProfile.unusualVolume ? ', UNUSUAL' : ''}` });
  } else if (volProfile.volumeTrend === 'decreasing') {
    score -= 10;
    details.push({ indicator: 'Volume', signal: 'BEARISH', weight: 10, description: `Volume menurun (ratio ${volProfile.volumeRatio}x)${volProfile.unusualVolume ? ', UNUSUAL' : ''}` });
  } else {
    details.push({ indicator: 'Volume', signal: 'NEUTRAL', weight: 5, description: 'Volume stabil' });
  }

  // MFI
  const mfi = computeMFI(candles, volumes);
  if (mfi < 20) { score += 20; details.push({ indicator: 'MFI', signal: 'BULLISH', weight: 20, description: `MFI ${mfi.toFixed(0)} oversold, akumulasi kuat` }); }
  else if (mfi < 30) { score += 10; details.push({ indicator: 'MFI', signal: 'BULLISH', weight: 10, description: `MFI ${mfi.toFixed(0)} mendekati oversold` }); }
  else if (mfi > 80) { score -= 20; details.push({ indicator: 'MFI', signal: 'BEARISH', weight: 20, description: `MFI ${mfi.toFixed(0)} overbought, distribusi kuat` }); }
  else if (mfi > 70) { score -= 10; details.push({ indicator: 'MFI', signal: 'BEARISH', weight: 10, description: `MFI ${mfi.toFixed(0)} mendekati overbought` }); }
  else { details.push({ indicator: 'MFI', signal: 'NEUTRAL', weight: 5, description: `MFI ${mfi.toFixed(0)}, zona netral` }); }

  score = Math.max(-100, Math.min(100, Math.round(score)));
  const signal = score > 10 ? 'bullish' : score < -10 ? 'bearish' : 'neutral';
  return { score, signal, description: details.map(d => d.description).join('; ') };
}

// ── Layer 4: VOLATILITY (10% weight) ──
function computeVolatilityLayer(
  candles: Candle[],
  closes: number[],
  currentPrice: number,
  bbResult: { upper: number; middle: number; lower: number },
): LayerResult {
  let score = 0;
  const details: SignalDetail[] = [];

  // BB Width & Squeeze
  const bbWidth = computeBBWidth(bbResult);
  if (bbWidth.squeeze) {
    score += 20;
    details.push({ indicator: 'BB Squeeze', signal: 'BULLISH', weight: 20, description: `BB squeeze terdeteksi (width ${bbWidth.width.toFixed(1)}%), potensi breakout besar` });
  } else if (bbWidth.width > 20) {
    details.push({ indicator: 'BB Width', signal: 'NEUTRAL', weight: 0, description: `BB lebar (width ${bbWidth.width.toFixed(1)}%), volatilitas tinggi` });
  } else {
    details.push({ indicator: 'BB Width', signal: 'NEUTRAL', weight: 5, description: `BB width ${bbWidth.width.toFixed(1)}%, volatilitas normal` });
  }

  // ATR
  const atr = computeATR(candles);
  const atrPct = currentPrice > 0 ? (atr / currentPrice) * 100 : 0;
  if (atrPct > 5) { details.push({ indicator: 'ATR', signal: 'NEUTRAL', weight: 0, description: `ATR ${atr.toFixed(2)} (${atrPct.toFixed(1)}%), volatilitas sangat tinggi` }); }
  else if (atrPct > 2) { details.push({ indicator: 'ATR', signal: 'NEUTRAL', weight: 0, description: `ATR ${atr.toFixed(2)} (${atrPct.toFixed(1)}%), volatilitas moderat` }); }
  else { details.push({ indicator: 'ATR', signal: 'NEUTRAL', weight: 0, description: `ATR ${atr.toFixed(2)} (${atrPct.toFixed(1)}%), volatilitas rendah` }); }

  // CCI
  const cci = computeCCI(candles);
  if (cci > 200) { score -= 15; details.push({ indicator: 'CCI', signal: 'BEARISH', weight: 15, description: `CCI ${cci.toFixed(0)} extreme overbought` }); }
  else if (cci > 100) { score -= 8; details.push({ indicator: 'CCI', signal: 'BEARISH', weight: 8, description: `CCI ${cci.toFixed(0)} overbought` }); }
  else if (cci < -200) { score += 15; details.push({ indicator: 'CCI', signal: 'BULLISH', weight: 15, description: `CCI ${cci.toFixed(0)} extreme oversold` }); }
  else if (cci < -100) { score += 8; details.push({ indicator: 'CCI', signal: 'BULLISH', weight: 8, description: `CCI ${cci.toFixed(0)} oversold` }); }
  else { details.push({ indicator: 'CCI', signal: 'NEUTRAL', weight: 5, description: `CCI ${cci.toFixed(0)}, zona netral` }); }

  // BB price position
  if (currentPrice <= bbResult.lower) { score += 10; details.push({ indicator: 'BB Position', signal: 'BULLISH', weight: 10, description: 'Harga di bawah lower band' }); }
  else if (currentPrice >= bbResult.upper) { score -= 10; details.push({ indicator: 'BB Position', signal: 'BEARISH', weight: 10, description: 'Harga di atas upper band' }); }

  score = Math.max(-100, Math.min(100, Math.round(score)));
  const sig = score > 10 ? 'bullish' : score < -10 ? 'bearish' : 'neutral';
  return { score, signal: sig, description: details.map(d => d.description).join('; ') };
}

// ── Layer 5: SMART MONEY (15% weight) ──
function computeSmartMoneyLayer(
  fvg: { high: number; low: number; filled: boolean; description: string } | null,
  ob: { zone: { high: number; low: number }; type: string; description: string } | null,
  sweep: { level: number; swept: boolean; description: string } | null,
  trendStructure: 'bullish' | 'bearish' | 'ranging',
  premiumDiscount: 'premium' | 'discount' | 'equilibrium',
  currentPrice: number,
): LayerResult {
  let score = 0;
  const details: SignalDetail[] = [];

  // FVG
  if (fvg && !fvg.filled) {
    const isBullish = fvg.low > currentPrice * 0.99;
    if (isBullish) { score += 20; details.push({ indicator: 'FVG', signal: 'BULLISH', weight: 20, description: fvg.description }); }
    else { score -= 20; details.push({ indicator: 'FVG', signal: 'BEARISH', weight: 20, description: fvg.description }); }
  } else if (fvg?.filled) {
    details.push({ indicator: 'FVG', signal: 'NEUTRAL', weight: 3, description: fvg.description });
  }

  // Order Block
  if (ob) {
    const isBullish = ob.type === 'bullish';
    if (isBullish) { score += 20; details.push({ indicator: 'Order Block', signal: 'BULLISH', weight: 20, description: ob.description }); }
    else { score -= 20; details.push({ indicator: 'Order Block', signal: 'BEARISH', weight: 20, description: ob.description }); }
  }

  // Liquidity Sweep
  if (sweep && sweep.swept) {
    const isBullish = sweep.description.toLowerCase().includes('bullish') || sweep.level < currentPrice;
    if (isBullish) { score += 15; details.push({ indicator: 'Liq. Sweep', signal: 'BULLISH', weight: 15, description: sweep.description }); }
    else { score -= 15; details.push({ indicator: 'Liq. Sweep', signal: 'BEARISH', weight: 15, description: sweep.description }); }
  }

  // Trend Structure
  if (trendStructure === 'bullish') { score += 15; details.push({ indicator: 'Structure', signal: 'BULLISH', weight: 15, description: 'Struktur tren bullish (HH/HL)' }); }
  else if (trendStructure === 'bearish') { score -= 15; details.push({ indicator: 'Structure', signal: 'BEARISH', weight: 15, description: 'Struktur tren bearish (LH/LL)' }); }
  else { details.push({ indicator: 'Structure', signal: 'NEUTRAL', weight: 0, description: 'Struktur ranging' }); }

  // Premium/Discount
  if (premiumDiscount === 'discount') { score += 10; details.push({ indicator: 'P/D Zone', signal: 'BULLISH', weight: 10, description: 'Harga di zona diskon — area value' }); }
  else if (premiumDiscount === 'premium') { score -= 10; details.push({ indicator: 'P/D Zone', signal: 'BEARISH', weight: 10, description: 'Harga di zona premium — waspada distribusi' }); }
  else { details.push({ indicator: 'P/D Zone', signal: 'NEUTRAL', weight: 0, description: 'Harga di equilibrium' }); }

  score = Math.max(-100, Math.min(100, Math.round(score)));
  const signal = score > 10 ? 'bullish' : score < -10 ? 'bearish' : 'neutral';
  return { score, signal, description: details.map(d => d.description).join('; ') };
}

// ── Layer 6: MARKET CONTEXT (10% weight) ──
function computeMarketContextLayer(
  candles: Candle[],
  closes: number[],
): LayerResult {
  let score = 0;
  const details: SignalDetail[] = [];

  // Multi-period RSI agreement
  const rsi7 = computeRSI(closes, 7);
  const rsi14 = computeRSI(closes, 14);
  const rsi21 = computeRSI(closes, 21);
  const allBullish = rsi7 < 50 && rsi14 < 50 && rsi21 < 50;
  const allBearish = rsi7 > 50 && rsi14 > 50 && rsi21 > 50;
  if (allBullish) { score += 20; details.push({ indicator: 'Multi-RSI', signal: 'BULLISH', weight: 20, description: `RSI 7/14/21 semua bearish (reversal potensi): ${rsi7.toFixed(0)}/${rsi14.toFixed(0)}/${rsi21.toFixed(0)}` }); }
  else if (allBearish) { score -= 20; details.push({ indicator: 'Multi-RSI', signal: 'BEARISH', weight: 20, description: `RSI 7/14/21 semua bullish (reversal potensi): ${rsi7.toFixed(0)}/${rsi14.toFixed(0)}/${rsi21.toFixed(0)}` }); }
  else {
    const avgRSI = (rsi7 + rsi14 + rsi21) / 3;
    details.push({ indicator: 'Multi-RSI', signal: 'NEUTRAL', weight: 5, description: `RSI 7/14/21 mixed: ${rsi7.toFixed(0)}/${rsi14.toFixed(0)}/${rsi21.toFixed(0)} (avg ${avgRSI.toFixed(0)})` });
  }

  // Williams %R
  const williamsR = computeWilliamsR(candles);
  if (williamsR < -80) { score += 15; details.push({ indicator: 'Williams %R', signal: 'BULLISH', weight: 15, description: `Williams %R ${williamsR.toFixed(0)}, oversold` }); }
  else if (williamsR > -20) { score -= 15; details.push({ indicator: 'Williams %R', signal: 'BEARISH', weight: 15, description: `Williams %R ${williamsR.toFixed(0)}, overbought` }); }
  else { details.push({ indicator: 'Williams %R', signal: 'NEUTRAL', weight: 5, description: `Williams %R ${williamsR.toFixed(0)}` }); }

  // Stochastic RSI agreement with RSI
  const stochRSI = computeStochasticRSI(closes);
  const rsiBullish = rsi14 < 45;
  const stochBullish = stochRSI.k < 40;
  if (rsiBullish && stochBullish) { score += 15; details.push({ indicator: 'RSI+Stoch', signal: 'BULLISH', weight: 15, description: 'RSI dan StochRSI setuju: oversold' }); }
  else if (!rsiBullish && !stochBullish && rsi14 > 55 && stochRSI.k > 60) { score -= 15; details.push({ indicator: 'RSI+Stoch', signal: 'BEARISH', weight: 15, description: 'RSI dan StochRSI setuju: overbought' }); }
  else { details.push({ indicator: 'RSI+Stoch', signal: 'NEUTRAL', weight: 0, description: 'RSI dan StochRSI tidak setuju' }); }

  score = Math.max(-100, Math.min(100, Math.round(score)));
  const signal = score > 10 ? 'bullish' : score < -10 ? 'bearish' : 'neutral';
  return { score, signal, description: details.map(d => d.description).join('; ') };
}

// ── Layer 7: CONFLUENCE (5% weight) ──
function computeConfluenceLayer(layerResults: LayerResult[]): LayerResult {
  const totalLayers = layerResults.length;
  let bullishCount = 0;
  let bearishCount = 0;
  const descriptions: string[] = [];

  for (const lr of layerResults) {
    if (lr.signal === 'bullish') bullishCount++;
    else if (lr.signal === 'bearish') bearishCount++;
  }

  const confluenceCount = Math.max(bullishCount, bearishCount);
  descriptions.push(`${confluenceCount}/${totalLayers} layer setuju pada arah`);

  // Require 4/6 layers to agree for strong signal
  const threshold = Math.ceil(totalLayers * 0.67); // ~4/6
  let score = 0;
  if (bullishCount >= threshold) {
    score = Math.min(100, 30 + bullishCount * 12);
  } else if (bearishCount >= threshold) {
    score = Math.max(-100, -30 - bearishCount * 12);
  } else if (bullishCount > bearishCount) {
    score = Math.min(30, bullishCount * 8);
  } else if (bearishCount > bullishCount) {
    score = Math.max(-30, -bearishCount * 8);
  }

  const signal = score > 10 ? 'bullish' : score < -10 ? 'bearish' : 'neutral';
  return { score: Math.round(score), signal, description: descriptions.join('; ') };
}

// ── Main Aggregation Function ──
/** Multi-layer signal aggregation with confluence scoring */
function aggregateSignals(
  candles: Candle[],
  closes: number[],
  volumes: number[],
  currentPrice: number,
  rsiValue: number,
  macdResult: { macd: number; signal: number; histogram: number },
  bbResult: { upper: number; middle: number; lower: number },
  sma20Value: number,
  sma50Value: number,
  ema12Value: number,
  ema26Value: number,
  fvg: { high: number; low: number; filled: boolean; description: string } | null,
  ob: { zone: { high: number; low: number }; type: string; description: string } | null,
  sweep: { level: number; swept: boolean; description: string } | null,
  trendStructure: 'bullish' | 'bearish' | 'ranging',
  premiumDiscount: 'premium' | 'discount' | 'equilibrium',
): {
  overallSignal: 'buy' | 'sell' | 'neutral';
  signalStrength: number;
  signalDetails: SignalDetail[];
  layerScores: Record<string, { score: number; signal: string; description: string }>;
  confluenceCount: number;
  totalLayers: number;
} {
  const signalDetails: SignalDetail[] = [];

  // Compute all 6 base layers
  const trendLayer = computeTrendLayer(candles, closes, currentPrice, sma20Value, sma50Value, ema12Value, ema26Value);
  const momentumLayer = computeMomentumLayer(closes, currentPrice, rsiValue, macdResult, bbResult);
  const volumeLayer = computeVolumeLayer(candles, volumes);
  const volatilityLayer = computeVolatilityLayer(candles, closes, currentPrice, bbResult);
  const smartMoneyLayer = computeSmartMoneyLayer(fvg, ob, sweep, trendStructure, premiumDiscount, currentPrice);
  const contextLayer = computeMarketContextLayer(candles, closes);

  const baseLayers = [trendLayer, momentumLayer, volumeLayer, volatilityLayer, smartMoneyLayer, contextLayer];

  // Layer 7: Confluence (computed from the other 6)
  const confluenceLayer = computeConfluenceLayer(baseLayers);

  // Build layerScores for frontend
  const layerScores: Record<string, { score: number; signal: string; description: string }> = {
    trend: { score: trendLayer.score, signal: trendLayer.signal, description: trendLayer.description },
    momentum: { score: momentumLayer.score, signal: momentumLayer.signal, description: momentumLayer.description },
    volume: { score: volumeLayer.score, signal: volumeLayer.signal, description: volumeLayer.description },
    volatility: { score: volatilityLayer.score, signal: volatilityLayer.signal, description: volatilityLayer.description },
    smartMoney: { score: smartMoneyLayer.score, signal: smartMoneyLayer.signal, description: smartMoneyLayer.description },
    context: { score: contextLayer.score, signal: contextLayer.signal, description: contextLayer.description },
    confluence: { score: confluenceLayer.score, signal: confluenceLayer.signal, description: confluenceLayer.description },
  };

  // Weights: TREND 25%, MOMENTUM 20%, VOLUME 15%, VOLATILITY 10%, SMART MONEY 15%, CONTEXT 10%, CONFLUENCE 5%
  const weights = [0.25, 0.20, 0.15, 0.10, 0.15, 0.10, 0.05];
  const allLayers = [...baseLayers, confluenceLayer];

  let weightedScore = 0;
  for (let i = 0; i < allLayers.length; i++) {
    weightedScore += allLayers[i].score * weights[i];
  }

  // Build signal details from all layers
  // Trend layer details
  signalDetails.push(
    { indicator: 'Trend Score', signal: trendLayer.signal.toUpperCase(), weight: Math.abs(trendLayer.score), description: trendLayer.description },
  );
  signalDetails.push(
    { indicator: 'Momentum Score', signal: momentumLayer.signal.toUpperCase(), weight: Math.abs(momentumLayer.score), description: momentumLayer.description },
  );
  signalDetails.push(
    { indicator: 'Volume Score', signal: volumeLayer.signal.toUpperCase(), weight: Math.abs(volumeLayer.score), description: volumeLayer.description },
  );
  signalDetails.push(
    { indicator: 'Volatility Score', signal: volatilityLayer.signal.toUpperCase(), weight: Math.abs(volatilityLayer.score), description: volatilityLayer.description },
  );
  signalDetails.push(
    { indicator: 'Smart Money Score', signal: smartMoneyLayer.signal.toUpperCase(), weight: Math.abs(smartMoneyLayer.score), description: smartMoneyLayer.description },
  );
  signalDetails.push(
    { indicator: 'Market Context Score', signal: contextLayer.signal.toUpperCase(), weight: Math.abs(contextLayer.score), description: contextLayer.description },
  );
  signalDetails.push(
    { indicator: 'Confluence Score', signal: confluenceLayer.signal.toUpperCase(), weight: Math.abs(confluenceLayer.score), description: confluenceLayer.description },
  );

  // Confluence count
  let bullishAgree = 0;
  let bearishAgree = 0;
  for (const lr of baseLayers) {
    if (lr.score > 10) bullishAgree++;
    else if (lr.score < -10) bearishAgree++;
  }
  const confluenceCount = Math.max(bullishAgree, bearishAgree);
  const totalLayers = baseLayers.length;

  // If confluence < 4 out of 6, cap signal strength at 40
  let finalScore = Math.max(-100, Math.min(100, Math.round(weightedScore)));
  if (confluenceCount < 4) {
    if (finalScore > 0) finalScore = Math.min(finalScore, 40);
    else if (finalScore < 0) finalScore = Math.max(finalScore, -40);
  }

  let overallSignal: 'buy' | 'sell' | 'neutral';
  if (finalScore >= 20) overallSignal = 'buy';
  else if (finalScore <= -20) overallSignal = 'sell';
  else overallSignal = 'neutral';

  return {
    overallSignal,
    signalStrength: finalScore,
    signalDetails,
    layerScores,
    confluenceCount,
    totalLayers,
  };
}

// ── GET Handler ──────────────────────────────────────────────────────────────

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ businessId: string }> }
) {
  try {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;

    const { businessId } = await params;
    const searchParams = request.nextUrl.searchParams;

    const type = searchParams.get('type') || 'crypto';
    const symbol = searchParams.get('symbol');

    if (!symbol) {
      return NextResponse.json(
        { error: 'Missing required query parameter: symbol' },
        { status: 400 }
      );
    }

    if (!['saham', 'crypto', 'forex', 'komoditas', 'indeks'].includes(type)) {
      return NextResponse.json(
        { error: 'Type must be saham, crypto, forex, komoditas, or indeks' },
        { status: 400 }
      );
    }

    // ── Step 1: Fetch live price for ALL asset types ────────────────────────────
    const livePriceData = await fetchLivePrice(symbol, type);
    let price = livePriceData?.price ?? 0;
    let change24h = livePriceData?.change24h ?? 0;
    let priceSource = livePriceData?.source ?? 'unknown';

    // ── Step 2: Fetch OHLCV candle data ───────────────────────────────────────
    let ohlcvData: OHLCVData | null = null;
    let dataSource: 'live' | 'estimated' = 'estimated';

    // Crypto: CoinGecko OHLC primary (no Binance — API access restricted)
    if (type === 'crypto') {
      ohlcvData = await fetchCoinGeckoOHLCV(symbol);
      if (ohlcvData) {
        dataSource = 'live';
        priceSource = 'coingecko';
      }
    }

    // Non-crypto: try Yahoo Finance OHLC
    if (!ohlcvData && type !== 'crypto') {
      ohlcvData = await fetchYahooOHLCV(symbol, type);
      if (ohlcvData) {
        dataSource = 'live';
        priceSource = 'yahoo';
      }
    }

    // If still no real OHLCV, generate minimal data from live price
    // This is better than fully mock candles — at least the last candle is real
    if (!ohlcvData && price > 0) {
      ohlcvData = generateMockOHLCV(price, symbol);
      dataSource = 'estimated';
    }

    // Absolute last fallback
    if (!ohlcvData) {
      ohlcvData = generateMockOHLCV(100 + seededRandom(symbol) * 9000, symbol);
      dataSource = 'estimated';
      priceSource = 'fallback';
    }

    const { candles, closes } = ohlcvData;
    const currentPrice = closes[closes.length - 1] ?? 0;

    // ── Price Reconciliation ──────────────────────────────────────────
    // Use live price when available and reliable; otherwise fall back to OHLC close.
    // This ensures AI signals, entry/SL/TP zones, and displayed price all match.
    let effectivePrice = currentPrice;
    if (price > 0 && currentPrice > 0) {
      // If live price exists, use it for signal generation
      // But check for reasonable divergence (< 5% to avoid API errors)
      const divergence = Math.abs(price - currentPrice) / currentPrice;
      if (divergence < 0.05) {
        effectivePrice = price; // Live price is close enough, use it
      }
      // If divergence > 5%, likely a data error — keep OHLC price
    } else if (price > 0) {
      effectivePrice = price; // No OHLC data but have live price
    }

    // ── Compute Basic Technical Indicators ──────────────────────────────
    const rsiValue = computeRSI(closes, 14);
    const macdResult = computeMACD(closes);
    const bbResult = computeBollingerBands(closes, 20, 2);
    const sma20Value = sma(closes, 20);
    const sma50Value = sma(closes, 50);
    const ema12Value = ema(closes, 12);
    const ema26Value = ema(closes, 26);

    // ── Compute Smart Money Concepts ────────────────────────────────────
    const fvg = detectFVG(candles);
    const ob = detectOrderBlock(candles);
    const sweep = detectLiquiditySweep(candles);
    const trendStructure = detectTrendStructure(candles);
    const premiumDiscount = detectPremiumDiscount(candles);

    // ── Aggregate Signals (Multi-Layer) ─────────────────────────────────
    const { overallSignal, signalStrength, signalDetails, layerScores, confluenceCount, totalLayers } = aggregateSignals(
      candles,
      closes,
      ohlcvData.volumes,
      effectivePrice,
      rsiValue,
      macdResult,
      bbResult,
      sma20Value,
      sma50Value,
      ema12Value,
      ema26Value,
      fvg,
      ob,
      sweep,
      trendStructure,
      premiumDiscount,
    );

    // ── AI Analysis ────────────────────────────────────────────────────
    const aiAnalysis = await generateAIAnalysis(
      symbol.toUpperCase(), type, price, change24h,
      rsiValue, macdResult, bbResult, sma20Value, sma50Value,
      fvg, ob, sweep, trendStructure, premiumDiscount, signalStrength,
    );

    // Fallback if AI failed
    let finalAI = aiAnalysis || buildFallbackAIAnalysis(
      effectivePrice, rsiValue, trendStructure, signalStrength,
      premiumDiscount, type, symbol.toUpperCase(), ob, fvg, sweep,
    );

    // ── Sanitize AI direction consistency ────────────────────────────────
    // Ensure SL/TP are logically consistent with tradeDirection
    // If SL above entry AND TP below entry → must be SHORT/SELL
    // If SL below entry AND TP above entry → must be LONG/BUY
    if (finalAI.entryPrice > 0 && finalAI.stopLossPrice > 0 && finalAI.takeProfitPrice > 0) {
      const { entryPrice, stopLossPrice, takeProfitPrice } = finalAI;
      const slAboveEntry = stopLossPrice > entryPrice;
      const tpBelowEntry = takeProfitPrice < entryPrice;
      const slBelowEntry = stopLossPrice < entryPrice;
      const tpAboveEntry = takeProfitPrice > entryPrice;

      if (slAboveEntry && tpBelowEntry) {
        // This is clearly a SELL/SHORT signal — fix direction if wrong
        if (finalAI.tradeDirection !== 'SHORT') {
          finalAI = {
            ...finalAI,
            tradeDirection: 'SHORT',
            entryZone: `SELL di $${fmtNum(entryPrice * 0.998)} - $${fmtNum(entryPrice * 1.002)}`,
            stopLossZone: `SL di $${fmtNum(stopLossPrice)} (di atas entry)`,
            takeProfitZone: `TP di $${fmtNum(takeProfitPrice)} (di bawah entry)`,
          };
        }
        // Also fix overallSignal to be consistent
        if (finalAI.overallSignal === 'BUY' || finalAI.overallSignal === 'STRONG_BUY') {
          finalAI = {
            ...finalAI,
            overallSignal: finalAI.signalStrength <= -60 ? 'STRONG_SELL' : 'SELL',
          };
        }
      } else if (slBelowEntry && tpAboveEntry) {
        // This is clearly a BUY/LONG signal — fix direction if wrong
        if (finalAI.tradeDirection !== 'LONG') {
          finalAI = {
            ...finalAI,
            tradeDirection: 'LONG',
            entryZone: `BUY di $${fmtNum(entryPrice * 0.998)} - $${fmtNum(entryPrice * 1.002)}`,
            stopLossZone: `SL di $${fmtNum(stopLossPrice)} (di bawah entry)`,
            takeProfitZone: `TP di $${fmtNum(takeProfitPrice)} (di atas entry)`,
          };
        }
        if (finalAI.overallSignal === 'SELL' || finalAI.overallSignal === 'STRONG_SELL') {
          finalAI = {
            ...finalAI,
            overallSignal: finalAI.signalStrength >= 60 ? 'STRONG_BUY' : 'BUY',
          };
        }
      }
    }

    // ── News Confirmation ──────────────────────────────────────────────
    const newsConfirmation = await fetchNewsConfirmation(symbol, type);

    // ── Market Detail (CoinGecko) ──────────────────────────────────────
    let marketDetail: {
      marketCap: number | null;
      totalVolume: number | null;
      high24h: number | null;
      low24h: number | null;
      ath: number | null;
      athChangePercentage: number | null;
      atl: number | null;
      atlChangePercentage: number | null;
      priceChangePercentage7d: number | null;
      priceChangePercentage30d: number | null;
      circulatingSupply: number | null;
      marketCapRank: number | null;
      sparkline7d: number[] | null;
      source: string;
    } | null = null;

    if (type === 'crypto') {
      const cgDetail = await fetchCoinGeckoMarketDetail(symbol);
      if (cgDetail) {
        marketDetail = { ...cgDetail, source: 'coingecko' };
      }
      // No Binance fallback — API access restricted
    }

    // ── Determine indicator labels ─────────────────────────────────────
    let rsiLabel: string;
    if (rsiValue < 30) rsiLabel = 'oversold';
    else if (rsiValue > 70) rsiLabel = 'overbought';
    else if (rsiValue < 40) rsiLabel = 'approaching_oversold';
    else if (rsiValue > 60) rsiLabel = 'approaching_overbought';
    else rsiLabel = 'neutral';

    let macdLabel: string;
    if (macdResult.histogram > 0 && macdResult.macd > macdResult.signal) macdLabel = 'bullish';
    else if (macdResult.histogram < 0 && macdResult.macd < macdResult.signal) macdLabel = 'bearish';
    else macdLabel = 'neutral';

    let bbPosition: string;
    let bbSignal: string;
    if (effectivePrice <= bbResult.lower) { bbPosition = 'below_lower'; bbSignal = 'bounce_expected'; }
    else if (effectivePrice >= bbResult.upper) { bbPosition = 'above_upper'; bbSignal = 'pullback_expected'; }
    else { bbPosition = 'within_bands'; bbSignal = 'neutral'; }

    return NextResponse.json({
      symbol: symbol.toUpperCase(),
      type,
      price,
      change24h,
      dataSource,
      priceSource,
      livePriceUsed: price > 0 && effectivePrice === price,
      effectivePrice,
      marketDetail,

      // Smart Money Concepts
      smc: {
        fairValueGaps: fvg || { high: 0, low: 0, filled: true, description: 'Tidak ada FVG terdeteksi' },
        orderBlock: ob || { zone: { high: 0, low: 0 }, type: 'bullish' as const, description: 'Tidak ada order block terdeteksi' },
        liquiditySweep: sweep || { level: 0, swept: false, description: 'Tidak ada liquidity sweep terdeteksi' },
        trendStructure,
        premiumDiscount,
      },

      // Basic indicators
      indicators: {
        rsi: {
          value: parseFloat(rsiValue.toFixed(1)),
          signal: rsiLabel,
        },
        macd: {
          value: parseFloat(macdResult.macd.toFixed(2)),
          signal: parseFloat(macdResult.signal.toFixed(2)),
          histogram: parseFloat(macdResult.histogram.toFixed(2)),
          signalLabel: macdLabel,
        },
        bollingerBands: {
          upper: parseFloat(bbResult.upper.toFixed(bbResult.upper < 1 ? 6 : 2)),
          middle: parseFloat(bbResult.middle.toFixed(bbResult.middle < 1 ? 6 : 2)),
          lower: parseFloat(bbResult.lower.toFixed(bbResult.lower < 1 ? 6 : 2)),
          position: bbPosition,
          signal: bbSignal,
        },
        sma20: parseFloat(sma20Value.toFixed(sma20Value < 1 ? 6 : 2)),
        sma50: parseFloat(sma50Value.toFixed(sma50Value < 1 ? 6 : 2)),
        ema12: parseFloat(ema12Value.toFixed(ema12Value < 1 ? 6 : 2)),
        ema26: parseFloat(ema26Value.toFixed(ema26Value < 1 ? 6 : 2)),
      },

      // AI Analysis
      aiAnalysis: finalAI,

      // News Confirmation
      newsConfirmation,

      // Signal Details (Multi-Layer)
      signalDetails,
      layerScores,
      confluenceCount,
      totalLayers,
      // Data quality metadata
      dataQuality: {
        isMock: dataSource === 'estimated',
        ohlcvSource: priceSource,
        indicatorsComputed: ohlcvData !== null,
      },

      lastUpdated: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Technical analysis GET error:', error);

    return NextResponse.json(
      { error: 'Failed to fetch technical analysis' },
      { status: 500 }
    );
  }
}
