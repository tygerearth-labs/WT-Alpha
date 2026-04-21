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

/** Convert a crypto symbol to Binance format (always XXXUSDT) */
function toBinanceSymbol(symbol: string): string {
  const upper = symbol.toUpperCase();
  if (upper.endsWith('USDT')) return upper;
  return upper + 'USDT';
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
  if (closes.length < period + 1) return 50; // neutral if not enough data

  let gains = 0;
  let losses = 0;

  // Initial average gain/loss
  for (let i = closes.length - period; i < closes.length; i++) {
    const change = closes[i] - closes[i - 1];
    if (change > 0) {
      gains += change;
    } else {
      losses += Math.abs(change);
    }
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;

  // Use Wilder's smoothing
  const smoothingFactor = (period - 1) / period;
  // For simplicity with limited data points we just use the initial calculation
  // In a real implementation you'd iterate through all historical data

  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - (100 / (1 + rs));
}

/** MACD (12/26/9) - returns { macd, signal, histogram } */
function computeMACD(closes: number[]): { macd: number; signal: number; histogram: number } {
  if (closes.length < 26) {
    return { macd: 0, signal: 0, histogram: 0 };
  }

  const ema12 = ema(closes, 12);
  const ema26 = ema(closes, 26);
  const macdLine = ema12 - ema26;

  // Compute MACD signal line (9-period EMA of MACD values)
  // We approximate by computing MACD at multiple points
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

  // Standard deviation
  const squaredDiffs = slice.map(val => Math.pow(val - mean, 2));
  const variance = squaredDiffs.reduce((sum, val) => sum + val, 0) / period;
  const sd = Math.sqrt(variance);

  return {
    upper: mean + stdDev * sd,
    middle: mean,
    lower: mean - stdDev * sd,
  };
}

// ── Data Fetchers ────────────────────────────────────────────────────────────

interface OHLCVData {
  closes: number[];
  volumes: number[];
  lastPrice: number;
}

/** Fetch OHLCV data from Binance for crypto */
async function fetchBinanceOHLCV(symbol: string): Promise<OHLCVData | null> {
  try {
    const binanceSymbol = toBinanceSymbol(symbol);
    // Fetch daily klines with 100 data points (enough for 50-period SMA and all indicators)
    const url = `https://api.binance.com/api/v3/klines?symbol=${binanceSymbol}&interval=1d&limit=100`;

    const res = await fetchWithTimeout(url, { next: { revalidate: 120 }, timeoutMs: 8000 });
    if (!res.ok) {
      console.warn(`Binance klines returned ${res.status} for ${symbol}`);
      return null;
    }

    const klines = await res.json();
    if (!Array.isArray(klines) || klines.length < 2) return null;

    const closes: number[] = [];
    const volumes: number[] = [];

    for (const kline of klines) {
      if (!Array.isArray(kline) || kline.length < 12) continue;
      const close = parseFloat(kline[4]);
      const vol = parseFloat(kline[5]);
      if (isNaN(close)) continue;
      closes.push(close);
      volumes.push(isNaN(vol) ? 0 : vol);
    }

    if (closes.length < 2) return null;

    return { closes, volumes, lastPrice: closes[closes.length - 1] };
  } catch (error) {
    console.warn(`Binance OHLCV fetch failed for ${symbol}: ${error instanceof Error ? error.message : error}`);
    return null;
  }
}

/** Generate mock OHLCV for non-crypto types */
function generateMockOHLCV(basePrice: number, symbol: string): OHLCVData {
  const closes: number[] = [];
  const volumes: number[] = [];
  let price = basePrice * 0.85;
  const now = Math.floor(Date.now() / 86400000); // days since epoch

  for (let i = 100; i >= 0; i--) {
    const seed = symbol + String(now - i);
    const volatility = basePrice * 0.025;
    const change = (seededRandom(seed) - 0.45) * volatility;
    price = price + change;
    closes.push(parseFloat(price.toFixed(price < 1 ? 6 : 2)));
    volumes.push(Math.floor(seededRandom(seed + 'v') * 10000000));
  }

  return { closes, volumes, lastPrice: closes[closes.length - 1] };
}

/** Fetch Binance 24hr ticker for price & change24h */
async function fetchBinanceTicker(symbol: string): Promise<{ price: number; change24h: number } | null> {
  try {
    const binanceSymbol = toBinanceSymbol(symbol);
    const url = `https://api.binance.com/api/v3/ticker/24hr?symbol=${binanceSymbol}`;

    const res = await fetchWithTimeout(url, { next: { revalidate: 120 }, timeoutMs: 8000 });
    if (!res.ok) return null;

    const data = await res.json();
    if (!data || !data.symbol) return null;

    const price = parseFloat(data.lastPrice);
    const change = parseFloat(data.priceChangePercent);
    if (isNaN(price)) return null;

    return { price, change24h: isNaN(change) ? 0 : change };
  } catch {
    return null;
  }
}

// ── Signal Aggregation ───────────────────────────────────────────────────────

interface SignalDetail {
  indicator: string;
  signal: 'bullish' | 'bearish' | 'neutral';
  weight: number;
}

/** Aggregate all indicator signals into a single recommendation */
function aggregateSignals(
  rsi: number,
  macdHist: number,
  currentPrice: number,
  bb: { upper: number; middle: number; lower: number },
  sma20: number,
  sma50: number
): {
  overallSignal: 'buy' | 'sell' | 'neutral';
  signalStrength: number;
  signalDetails: SignalDetail[];
} {
  const signalDetails: SignalDetail[] = [];
  let totalScore = 0;

  // 1. RSI Signal (±25)
  let rsiSignal: 'bullish' | 'bearish' | 'neutral';
  let rsiWeight = 0;
  if (rsi < 30) {
    rsiSignal = 'bullish';
    // Stronger signal the lower the RSI
    rsiWeight = Math.min(25, 15 + (30 - rsi) * 0.5);
  } else if (rsi > 70) {
    rsiSignal = 'bearish';
    rsiWeight = Math.max(-25, -15 - (rsi - 70) * 0.5);
  } else if (rsi < 40) {
    rsiSignal = 'bullish';
    rsiWeight = 5;
  } else if (rsi > 60) {
    rsiSignal = 'bearish';
    rsiWeight = -5;
  } else {
    rsiSignal = 'neutral';
    rsiWeight = 0;
  }
  totalScore += rsiWeight;
  signalDetails.push({ indicator: 'RSI', signal: rsiSignal, weight: Math.abs(rsiWeight) });

  // 2. MACD Histogram Signal (±25)
  let macdSignal: 'bullish' | 'bearish' | 'neutral';
  let macdWeight = 0;
  if (macdHist > 0) {
    macdSignal = 'bullish';
    macdWeight = Math.min(25, 10 + Math.abs(macdHist) * 0.1);
  } else if (macdHist < 0) {
    macdSignal = 'bearish';
    macdWeight = Math.max(-25, -10 - Math.abs(macdHist) * 0.1);
  } else {
    macdSignal = 'neutral';
    macdWeight = 0;
  }
  totalScore += macdWeight;
  signalDetails.push({ indicator: 'MACD', signal: macdSignal, weight: Math.abs(macdWeight) });

  // 3. Bollinger Bands Signal (±25)
  let bbSignal: 'bullish' | 'bearish' | 'neutral';
  let bbWeight = 0;
  if (currentPrice <= bb.lower) {
    bbSignal = 'bullish';
    bbWeight = 25;
  } else if (currentPrice >= bb.upper) {
    bbSignal = 'bearish';
    bbWeight = -25;
  } else {
    // Position within the bands
    const range = bb.upper - bb.lower;
    if (range > 0) {
      const position = (currentPrice - bb.lower) / range; // 0 to 1
      if (position < 0.2) {
        bbSignal = 'bullish';
        bbWeight = 10;
      } else if (position > 0.8) {
        bbSignal = 'bearish';
        bbWeight = -10;
      } else {
        bbSignal = 'neutral';
        bbWeight = 0;
      }
    } else {
      bbSignal = 'neutral';
      bbWeight = 0;
    }
  }
  totalScore += bbWeight;
  signalDetails.push({ indicator: 'Bollinger Bands', signal: bbSignal, weight: Math.abs(bbWeight) });

  // 4. Moving Average Cross Signal (±25)
  let maSignal: 'bullish' | 'bearish' | 'neutral';
  let maWeight = 0;
  if (sma20 > sma50) {
    maSignal = 'bullish'; // Golden cross
    const spread = ((sma20 - sma50) / sma50) * 100;
    maWeight = Math.min(25, 10 + spread * 5);
  } else if (sma20 < sma50) {
    maSignal = 'bearish'; // Death cross
    const spread = ((sma50 - sma20) / sma50) * 100;
    maWeight = Math.max(-25, -10 - spread * 5);
  } else {
    maSignal = 'neutral';
    maWeight = 0;
  }
  totalScore += maWeight;
  signalDetails.push({ indicator: 'MA Cross', signal: maSignal, weight: Math.abs(maWeight) });

  // Clamp total score to -100 to 100
  const signalStrength = Math.max(-100, Math.min(100, Math.round(totalScore)));

  let overallSignal: 'buy' | 'sell' | 'neutral';
  if (signalStrength >= 20) {
    overallSignal = 'buy';
  } else if (signalStrength <= -20) {
    overallSignal = 'sell';
  } else {
    overallSignal = 'neutral';
  }

  return { overallSignal, signalStrength, signalDetails };
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

    if (!['saham', 'crypto', 'forex'].includes(type)) {
      return NextResponse.json(
        { error: 'Type must be saham, crypto, or forex' },
        { status: 400 }
      );
    }

    let ohlcvData: OHLCVData | null = null;
    let price = 0;
    let change24h = 0;

    if (type === 'crypto') {
      // Fetch real data from Binance
      ohlcvData = await fetchBinanceOHLCV(symbol);
      const ticker = await fetchBinanceTicker(symbol);
      if (ticker) {
        price = ticker.price;
        change24h = ticker.change24h;
      } else if (ohlcvData) {
        price = ohlcvData.lastPrice;
        change24h = 0;
      }
    }

    // Fallback to mock data for non-crypto or if Binance failed
    if (!ohlcvData) {
      const mockBasePrices: Record<string, number> = {
        BTCUSDT: 75937, BTC: 75937,
        ETHUSDT: 2312, ETH: 2312,
        BNBUSDT: 633, BNB: 633,
        XRPUSDT: 1.43, XRP: 1.43,
        SOLUSDT: 85.89, SOL: 85.89,
        DOTUSDT: 1.27, DOT: 1.27,
        DOGEUSDT: 0.095, DOGE: 0.095,
        ADAUSDT: 0.248, ADA: 0.248,
        LINKUSDT: 9.39, LINK: 9.39,
        AVAXUSDT: 9.35, AVAX: 9.35,
        LTCUSDT: 108, LTC: 108,
        EURUSD: 1.1776, GBPUSD: 1.3528, USDJPY: 158.80,
        BBCA: 9750, BBRI: 4650, TLKM: 3350,
      };

      const upper = symbol.toUpperCase();
      const basePrice = mockBasePrices[upper] ?? (100 + seededRandom(symbol) * 9000);
      ohlcvData = generateMockOHLCV(basePrice, symbol);
      price = ohlcvData.lastPrice;
      change24h = parseFloat(((seededRandom(symbol + 'ch') - 0.45) * 4).toFixed(2));
    }

    const { closes } = ohlcvData;
    const currentPrice = closes[closes.length - 1] ?? 0;

    // Compute all technical indicators
    const rsiValue = computeRSI(closes, 14);
    const macdResult = computeMACD(closes);
    const bbResult = computeBollingerBands(closes, 20, 2);
    const sma20Value = sma(closes, 20);
    const sma50Value = sma(closes, 50);
    const ema12Value = ema(closes, 12);
    const ema26Value = ema(closes, 26);

    // Determine individual signal labels
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

    let bbLabel: string;
    if (currentPrice <= bbResult.lower) bbLabel = 'below_lower';
    else if (currentPrice >= bbResult.upper) bbLabel = 'above_upper';
    else bbLabel = 'neutral';

    // Aggregate signals
    const { overallSignal, signalStrength, signalDetails } = aggregateSignals(
      rsiValue,
      macdResult.histogram,
      currentPrice,
      bbResult,
      sma20Value,
      sma50Value
    );

    return NextResponse.json({
      symbol: symbol.toUpperCase(),
      type,
      price: currentPrice,
      change24h,
      indicators: {
        rsi: {
          value: parseFloat(rsiValue.toFixed(1)),
          signal: rsiLabel,
        },
        macd: {
          value: parseFloat(macdResult.macd.toFixed(2)),
          signal: parseFloat(macdResult.signal.toFixed(2)),
          histogram: parseFloat(macdResult.histogram.toFixed(2)),
          signal_label: macdLabel,
        },
        bollingerBands: {
          upper: parseFloat(bbResult.upper.toFixed(bbResult.upper < 1 ? 6 : 2)),
          middle: parseFloat(bbResult.middle.toFixed(bbResult.middle < 1 ? 6 : 2)),
          lower: parseFloat(bbResult.lower.toFixed(bbResult.lower < 1 ? 6 : 2)),
          signal: bbLabel,
        },
        sma20: parseFloat(sma20Value.toFixed(sma20Value < 1 ? 6 : 2)),
        sma50: parseFloat(sma50Value.toFixed(sma50Value < 1 ? 6 : 2)),
        ema12: parseFloat(ema12Value.toFixed(ema12Value < 1 ? 6 : 2)),
        ema26: parseFloat(ema26Value.toFixed(ema26Value < 1 ? 6 : 2)),
      },
      overallSignal,
      signalStrength,
      signalDetails,
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
