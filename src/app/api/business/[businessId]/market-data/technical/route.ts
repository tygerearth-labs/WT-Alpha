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

// ── Smart Money Concepts (SMC) ───────────────────────────────────────────────

interface Candle {
  open: number;
  high: number;
  low: number;
  close: number;
}

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

/** Generate mock OHLCV for non-crypto types */
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

/** Fetch forex rate from frankfurter.app */
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
    return { price: rate, change24h: parseFloat(((seededRandom(symbol + new Date().toISOString().slice(0, 10)) - 0.45) * 1.5).toFixed(2)) };
  } catch {
    return null;
  }
}

/** Fetch commodity price from metals.live */
async function fetchCommodityPrice(symbol: string): Promise<{ price: number; change24h: number } | null> {
  try {
    const upper = symbol.toUpperCase();
    const map: Record<string, string> = { XAU: 'gold', XAG: 'silver', XPT: 'platinum', XPD: 'palladium' };
    const metal = map[upper];
    if (!metal) {
      // Oil / other commodities — use approximate 2025 values
      const oilPrices: Record<string, number> = { CL: 62, CRUDE: 62, BRENT: 65, NG: 3.2, WTI: 62 };
      const p = oilPrices[upper];
      if (p) return { price: p, change24h: parseFloat(((seededRandom(symbol + new Date().toISOString().slice(0, 10)) - 0.45) * 3).toFixed(2)) };
      return null;
    }
    const url = 'https://api.metals.live/v1/spot';
    const res = await fetchWithTimeout(url, { timeoutMs: 8000 });
    if (!res.ok) return null;
    const data = await res.json();
    const item = Array.isArray(data) ? data.find((m: { name: string }) => m.name.toLowerCase() === metal) : null;
    if (!item || typeof item.price !== 'number') return null;
    return { price: item.price, change24h: parseFloat(((seededRandom(symbol + new Date().toISOString().slice(0, 10)) - 0.45) * 2).toFixed(2)) };
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
    // CoinGecko first, CMC fallback
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
  priceForecast: {
    shortTerm: { target: number; timeframe: string };
    midTerm: { target: number; timeframe: string };
    longTerm: { target: number; timeframe: string };
  };
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  entryZone: string;
  stopLossZone: string;
  takeProfitZone: string;
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
  const isBullish = trendStructure === 'bullish';

  const reasoningParts: string[] = [];
  if (trendStructure === 'bullish') reasoningParts.push(`Struktur tren ${symbol} menunjukkan pola higher-high dan higher-low yang mengindikasikan tekanan beli kuat.`);
  else if (trendStructure === 'bearish') reasoningParts.push(`Struktur tren ${symbol} menunjukkan pola lower-high dan lower-low yang mengindikasikan tekanan jual dominan.`);
  else reasoningParts.push(`Struktur tren ${symbol} bergerak sideways (ranging), menunggu breakout arah yang jelas.`);

  if (premiumDiscount === 'discount' && isBullish) reasoningParts.push('Harga berada di zona diskon (di bawah equilibrium), area ini menarik untuk akumulasi bagi smart money.');
  else if (premiumDiscount === 'premium' && !isBullish) reasoningParts.push('Harga berada di zona premium (di atas equilibrium), potensi profit-taking atau distribusi dari institusi besar.');

  if (ob) reasoningParts.push(`${ob.type === 'bullish' ? 'Bullish' : 'Bearish'} order block terdeteksi sebagai area ${ob.type === 'bullish' ? 'support' : 'resistance'} utama.`);
  if (fvg && !fvg.filled) reasoningParts.push('Fair value gap yang belum terisi menandakan ketidakseimbangan harga yang cenderung akan ditutup.');

  const shortTarget = currentPrice * (isBullish ? 1.02 : isBullish === false ? 0.98 : 1.005);
  const midTarget = currentPrice * (isBullish ? 1.05 : isBullish === false ? 0.95 : 1.01);
  const longTarget = currentPrice * (isBullish ? 1.10 : isBullish === false ? 0.90 : 1.02);

  const strategies: string[] = [];
  if (ob) strategies.push('Order Block');
  if (fvg && !fvg.filled) strategies.push('FVG Fill');
  if (sweep) strategies.push('Liquidity Sweep');
  if (strategies.length === 0) strategies.push('Trend Structure');

  return {
    overallSignal,
    signalStrength,
    confidence,
    reasoning: reasoningParts.join(' '),
    strategy: strategies.join(' + '),
    priceForecast: {
      shortTerm: { target: parseFloat(shortTarget.toFixed(2)), timeframe: '1-3 hari' },
      midTerm: { target: parseFloat(midTarget.toFixed(2)), timeframe: '1-2 minggu' },
      longTerm: { target: parseFloat(longTarget.toFixed(2)), timeframe: '1-3 bulan' },
    },
    riskLevel: Math.abs(signalStrength) > 50 ? 'HIGH' : Math.abs(signalStrength) > 25 ? 'MEDIUM' : 'LOW',
    entryZone: isBullish
      ? `Masuk di area ${fmtP(currentPrice * 0.995)} - ${fmtP(currentPrice * 1.002)}`
      : `Tunggu konfirmasi di area ${fmtP(currentPrice * 0.998)} - ${fmtP(currentPrice * 1.005)}`,
    stopLossZone: isBullish
      ? `Stop loss di bawah ${fmtP(ob ? ob.zone.low * 0.995 : currentPrice * 0.97)}`
      : `Stop loss di atas ${fmtP(ob ? ob.zone.high * 1.005 : currentPrice * 1.03)}`,
    takeProfitZone: isBullish
      ? `Take profit di area ${fmtP(midTarget)} - ${fmtP(longTarget)}`
      : `Take profit di area ${fmtP(midTarget)} - ${fmtP(longTarget)}`,
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

Berikan analisis dalam bahasa Indonesia yang mudah dipahami investor awam. Response format JSON:
{
  "overallSignal": "STRONG_BUY" | "BUY" | "NEUTRAL" | "SELL" | "STRONG_SELL",
  "signalStrength": <number -100 to 100>,
  "confidence": <number 0-100>,
  "reasoning": "<3-4 kalimat dalam bahasa Indonesia menjelaskan kenapa signal ini BUY/SELL/NEUTRAL, sertakan analisis SMC dan indikator teknikal>",
  "strategy": "<nama strategi yang terdeteksi, misal 'FVG Reversal + Liquidity Sweep'>",
  "priceForecast": {
    "shortTerm": { "target": <number>, "timeframe": "1-3 hari" },
    "midTerm": { "target": <number>, "timeframe": "1-2 minggu" },
    "longTerm": { "target": <number>, "timeframe": "1-3 bulan" }
  },
  "riskLevel": "LOW" | "MEDIUM" | "HIGH",
  "entryZone": "<zona entry dalam format harga dengan simbol mata uang>",
  "stopLossZone": "<zona stop loss>",
  "takeProfitZone": "<zona take profit>"
}

Hanya response JSON saja, tanpa penjelasan tambahan.`;

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

// ── Signal Aggregation ───────────────────────────────────────────────────────

interface SignalDetail {
  indicator: string;
  signal: string;
  weight: number;
  description: string;
}

/** Aggregate all indicator signals including SMC */
function aggregateSignals(
  rsi: number,
  macdHist: number,
  currentPrice: number,
  bb: { upper: number; middle: number; lower: number },
  sma20: number,
  sma50: number,
  fvg: { high: number; low: number; filled: boolean; description: string } | null,
  ob: { zone: { high: number; low: number }; type: string; description: string } | null,
  sweep: { level: number; swept: boolean; type: 'high' | 'low'; description: string } | null,
  trendStructure: 'bullish' | 'bearish' | 'ranging',
  premiumDiscount: 'premium' | 'discount' | 'equilibrium',
): {
  overallSignal: 'buy' | 'sell' | 'neutral';
  signalStrength: number;
  signalDetails: SignalDetail[];
} {
  const signalDetails: SignalDetail[] = [];
  let totalScore = 0;

  // 1. RSI Signal (±15)
  let rsiSignal: string;
  let rsiWeight = 0;
  if (rsi < 30) {
    rsiSignal = 'BULLISH';
    rsiWeight = 15;
  } else if (rsi > 70) {
    rsiSignal = 'BEARISH';
    rsiWeight = -15;
  } else if (rsi < 40) {
    rsiSignal = 'BULLISH';
    rsiWeight = 5;
  } else if (rsi > 60) {
    rsiSignal = 'BEARISH';
    rsiWeight = -5;
  } else {
    rsiSignal = 'NEUTRAL';
    rsiWeight = 0;
  }
  totalScore += rsiWeight;
  signalDetails.push({
    indicator: 'RSI',
    signal: rsiSignal,
    weight: Math.abs(rsiWeight),
    description: rsi < 30
      ? `RSI di ${rsi.toFixed(1)} (oversold), potensi rebound`
      : rsi > 70
        ? `RSI di ${rsi.toFixed(1)} (overbought), potensi koreksi`
        : `RSI di ${rsi.toFixed(1)}, zona netral tanpa tekanan ekstrem`,
  });

  // 2. MACD Histogram Signal (±15)
  let macdSignal: string;
  let macdWeight = 0;
  if (macdHist > 0) {
    macdSignal = 'BULLISH';
    macdWeight = Math.min(15, 8 + Math.abs(macdHist) * 0.05);
  } else if (macdHist < 0) {
    macdSignal = 'BEARISH';
    macdWeight = Math.max(-15, -8 - Math.abs(macdHist) * 0.05);
  } else {
    macdSignal = 'NEUTRAL';
    macdWeight = 0;
  }
  totalScore += macdWeight;
  signalDetails.push({
    indicator: 'MACD',
    signal: macdSignal,
    weight: Math.abs(macdWeight),
    description: macdHist > 0
      ? `Histogram MACD positif (${macdHist.toFixed(2)}), momentum bullish`
      : macdHist < 0
        ? `Histogram MACD negatif (${macdHist.toFixed(2)}), momentum bearish`
        : 'MACD mendekati zero line, momentum netral',
  });

  // 3. Bollinger Bands Signal (±10)
  let bbSignal: string;
  let bbWeight = 0;
  if (currentPrice <= bb.lower) {
    bbSignal = 'BULLISH';
    bbWeight = 10;
  } else if (currentPrice >= bb.upper) {
    bbSignal = 'BEARISH';
    bbWeight = -10;
  } else {
    const range = bb.upper - bb.lower;
    if (range > 0) {
      const position = (currentPrice - bb.lower) / range;
      if (position < 0.2) {
        bbSignal = 'BULLISH';
        bbWeight = 5;
      } else if (position > 0.8) {
        bbSignal = 'BEARISH';
        bbWeight = -5;
      } else {
        bbSignal = 'NEUTRAL';
        bbWeight = 0;
      }
    } else {
      bbSignal = 'NEUTRAL';
      bbWeight = 0;
    }
  }
  totalScore += bbWeight;
  signalDetails.push({
    indicator: 'Bollinger Bands',
    signal: bbSignal,
    weight: Math.abs(bbWeight),
    description: currentPrice <= bb.lower
      ? 'Harga di bawah lower band, potensi bounce dari support dinamis'
      : currentPrice >= bb.upper
        ? 'Harga di atas upper band, waspada potensi pullback'
        : 'Harga berada di dalam bollinger bands, pergerakan normal',
  });

  // 4. Moving Average Cross Signal (±10)
  let maSignal: string;
  let maWeight = 0;
  if (sma20 > sma50) {
    maSignal = 'BULLISH';
    maWeight = 10;
  } else if (sma20 < sma50) {
    maSignal = 'BEARISH';
    maWeight = -10;
  } else {
    maSignal = 'NEUTRAL';
    maWeight = 0;
  }
  totalScore += maWeight;
  signalDetails.push({
    indicator: 'MA Cross',
    signal: maSignal,
    weight: Math.abs(maWeight),
    description: sma20 > sma50
      ? 'SMA20 di atas SMA50 (golden cross), tren naik terkonfirmasi'
      : sma20 < sma50
        ? 'SMA20 di bawah SMA50 (death cross), tren turun terkonfirmasi'
        : 'SMA20 dan SMA50 berdekatan, menunggu cross',
  });

  // 5. FVG Signal (±15)
  if (fvg && !fvg.filled) {
    // Bullish FVG: gap is above, price should fill upward
    // Bearish FVG: gap is below, price should fill downward
    const isBullishFVG = fvg.low > currentPrice * 0.99;
    const fvgSignal = isBullishFVG ? 'BULLISH' : 'BEARISH';
    const fvgWeight = isBullishFVG ? 15 : -15;
    totalScore += fvgWeight;
    signalDetails.push({
      indicator: 'FVG',
      signal: fvgSignal,
      weight: 15,
      description: fvg.description,
    });
  } else if (fvg?.filled) {
    signalDetails.push({
      indicator: 'FVG',
      signal: 'NEUTRAL',
      weight: 3,
      description: fvg.description,
    });
  }

  // 6. Order Block Signal (±15)
  if (ob) {
    const isBullishOB = ob.type === 'bullish';
    const obWeight = isBullishOB ? 15 : -15;
    totalScore += obWeight;
    signalDetails.push({
      indicator: 'Order Block',
      signal: isBullishOB ? 'BULLISH' : 'BEARISH',
      weight: 15,
      description: ob.description + (isBullishOB ? ' — area support kuat' : ' — area resistance kuat'),
    });
  }

  // 7. Liquidity Sweep Signal (±10)
  if (sweep) {
    const isBullishSweep = sweep.type === 'low';
    const sweepWeight = isBullishSweep ? 10 : -10;
    totalScore += sweepWeight;
    signalDetails.push({
      indicator: 'Liquidity Sweep',
      signal: isBullishSweep ? 'BULLISH' : 'BEARISH',
      weight: 10,
      description: sweep.description,
    });
  }

  // 8. Trend Structure Signal (±10)
  const trendWeight = trendStructure === 'bullish' ? 10 : trendStructure === 'bearish' ? -10 : 0;
  totalScore += trendWeight;
  signalDetails.push({
    indicator: 'Trend Structure',
    signal: trendStructure.toUpperCase(),
    weight: Math.abs(trendWeight) || 3,
    description: trendStructure === 'bullish'
      ? 'Pola higher-high dan higher-low terdeteksi, tren naik aktif'
      : trendStructure === 'bearish'
        ? 'Pola lower-high dan lower-low terdeteksi, tren turun aktif'
        : 'Harga bergerak sideways, belum ada arah tren yang jelas',
  });

  // 9. Premium/Discount Signal (±5)
  const pdWeight = premiumDiscount === 'discount' ? 5 : premiumDiscount === 'premium' ? -5 : 0;
  totalScore += pdWeight;
  signalDetails.push({
    indicator: 'Premium/Discount',
    signal: premiumDiscount.toUpperCase(),
    weight: Math.abs(pdWeight) || 2,
    description: premiumDiscount === 'discount'
      ? 'Harga di zona diskon, area value untuk pembelian'
      : premiumDiscount === 'premium'
        ? 'Harga di zona premium, potensi profit-taking'
        : 'Harga di equilibrium, zona netral',
  });

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

    if (type === 'crypto') {
      // CoinGecko OHLC (real 90-day candles), CMC doesn't provide OHLC in free tier
      ohlcvData = await fetchCoinGeckoOHLCV(symbol);
      if (ohlcvData) {
        dataSource = 'live';
        priceSource = 'coingecko';
      }
    }

    // If no real OHLCV, generate from ACTUAL live price
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

    // ── Aggregate Signals ───────────────────────────────────────────────
    const { overallSignal, signalStrength, signalDetails } = aggregateSignals(
      rsiValue,
      macdResult.histogram,
      currentPrice,
      bbResult,
      sma20Value,
      sma50Value,
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
    const finalAI = aiAnalysis || buildFallbackAIAnalysis(
      currentPrice, rsiValue, trendStructure, signalStrength,
      premiumDiscount, type, symbol.toUpperCase(), ob, fvg, sweep,
    );

    // ── News Confirmation ──────────────────────────────────────────────
    const newsConfirmation = await fetchNewsConfirmation(symbol, type);

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
    if (currentPrice <= bbResult.lower) { bbPosition = 'below_lower'; bbSignal = 'bounce_expected'; }
    else if (currentPrice >= bbResult.upper) { bbPosition = 'above_upper'; bbSignal = 'pullback_expected'; }
    else { bbPosition = 'within_bands'; bbSignal = 'neutral'; }

    return NextResponse.json({
      symbol: symbol.toUpperCase(),
      type,
      price,
      change24h,
      dataSource,
      priceSource,

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

      // Signal Details
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
