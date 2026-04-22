import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Fetch with an enforced timeout so external APIs can never hang the route */
async function fetchWithTimeout(url: string, init: RequestInit & { timeoutMs?: number } = {}): Promise<Response> {
  const { timeoutMs = 10000, ...rest } = init;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...rest, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/** Pseudo-random but deterministic from seed */
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
  BTC: 'bitcoin', BTCUSDT: 'bitcoin',
  ETH: 'ethereum', ETHUSDT: 'ethereum',
  BNB: 'binancecoin', BNBUSDT: 'binancecoin',
  XRP: 'ripple', XRPUSDT: 'ripple',
  SOL: 'solana', SOLUSDT: 'solana',
  ADA: 'cardano', ADAUSDT: 'cardano',
  DOGE: 'dogecoin', DOGEUSDT: 'dogecoin',
  AVAX: 'avalanche-2', AVAXUSDT: 'avalanche-2',
  DOT: 'polkadot', DOTUSDT: 'polkadot',
  LINK: 'chainlink', LINKUSDT: 'chainlink',
  MATIC: 'matic-network', MATICUSDT: 'matic-network',
  UNI: 'uniswap', UNIUSDT: 'uniswap',
  ATOM: 'cosmos', ATOMUSDT: 'cosmos',
  NEAR: 'near', NEARUSDT: 'near',
  ARB: 'arbitrum', ARBUSDT: 'arbitrum',
  OP: 'optimism', OPUSDT: 'optimism',
  INJ: 'injective-protocol', INJUSDT: 'injective-protocol',
  APT: 'aptos', APTUSDT: 'aptos',
  SUI: 'sui', SUIUSDT: 'sui',
  PEPE: 'pepe', PEPEUSDT: 'pepe',
  TON: 'the-open-network', TONUSDT: 'the-open-network',
  LTC: 'litecoin', LTCUSDT: 'litecoin',
  TRX: 'tron', TRXUSDT: 'tron',
  XLM: 'stellar', XLMUSDT: 'stellar',
  ALGO: 'algorand', ALGOUSDT: 'algorand',
  FIL: 'filecoin', FILUSDT: 'filecoin',
  AAVE: 'aave', MKR: 'maker', SNX: 'havven',
  CRV: 'curve-dao-token', LDO: 'lido-dao',
  FET: 'fetch-ai', FETUSDT: 'fetch-ai',
  RNDR: 'render-token', RNDRUSDT: 'render-token',
  SHIB: 'shiba-inu', SHIBUSDT: 'shiba-inu',
  HBAR: 'hedera-hashgraph', HBARUSDT: 'hedera-hashgraph',
  VET: 'vechain', VETUSDT: 'vechain',
  ICP: 'internet-computer', ICPUSDT: 'internet-computer',
  FTM: 'fantom', FTMUSDT: 'fantom',
  XMR: 'monero', XMRUSDT: 'monero',
  GALA: 'gala', GALAUSDT: 'gala',
  MANA: 'decentraland', MANAUSDT: 'decentraland',
  SAND: 'the-sandbox', SANDUSDT: 'the-sandbox',
  TRUMP: 'official-trump', TRUMPUSDT: 'official-trump',
  KAS: 'kaspa', KASUSDT: 'kaspa',
  RUNE: 'thorchain', RUNEUSDT: 'thorchain',
  SEI: 'sei-network', SEIUSDT: 'sei-network',
  TIA: 'celestia', TIAUSDT: 'celestia',
  WLD: 'worldcoin-wld', WLDUSDT: 'worldcoin-wld',
  JUP: 'jupiter-exchange-solana', JUPUSDT: 'jupiter-exchange-solana',
  BONK: 'bonk', BONKUSDT: 'bonk',
  WIF: 'dogwifcoin', WIFUSDT: 'dogwifcoin',
  FLOKI: 'floki', FLOKIUSDT: 'floki',
  RAY: 'raydium', RAYUSDT: 'raydium',
  ORCA: 'orca', ORCAUSDT: 'orca',
  JTO: 'jito', JTOUSDT: 'jito',
  PYTH: 'pyth-network', PYTHUSDT: 'pyth-network',
  EIGEN: 'eigenlayer', EIGENUSDT: 'eigenlayer',
  NOT: 'notcoin', NOTUSDT: 'notcoin',
  TAO: 'bittensor', TAOUSDT: 'bittensor',
  GRT: 'the-graph', GRTUSDT: 'the-graph',
  IMX: 'immutable-x', IMXUSDT: 'immutable-x',
  PENDLE: 'pendle', PENDLEUSDT: 'pendle',
  ONDO: 'ondo-finance', ONDOUSDT: 'ondo-finance',
  ENA: 'ethena', ENAUSDT: 'ethena',
  W: 'wormhole', WUSDT: 'wormhole',
  STRK: 'starknet', STRKUSDT: 'starknet',
  ZK: 'zksync', ZKUSDT: 'zksync',
  DRIFT: 'drift-protocol', DRIFTUSDT: 'drift-protocol',
  REZ: 'renzo-protocol', REZUSDT: 'renzo-protocol',
  BB: 'bounce-bit', BBUSDT: 'bounce-bit',
  ACE: 'fusionist', ACEUSDT: 'fusionist',
  VERT: 'vertex-protocol', VERTUSDT: 'vertex-protocol',
  USDT: 'tether', USDC: 'usd-coin',
  BUSD: 'binance-usd',
  PIXELS: 'pixels', PU: 'pudgy-penguins',
  TWT: 'trust-wallet-token',
};

/** Yahoo Finance symbol mappings */
const INDEX_YAHOO: Record<string, string> = {
  SPX: '%5EGSPC', SPX500: '%5EGSPC', SP500: '%5EGSPC',
  US100: '%5EIXIC', NASDAQ: '%5EIXIC', QQQ: 'QQQ',
  US30: '%5EDJI', DJI: '%5EDJI',
  US2000: '%5ERUT',
  VIX: '%5EVIX', DXY: 'DX-Y.NYB',
  FTSE100: '%5EFTSE', DAX40: '%5EGDAXI', STOXX600: '%5ESTOXX',
  NIKKEI225: '%5EN225', HSI50: '%5EHSI', SHCOMP: '000001.SS',
  KOSPI200: '%5EKS11', ASX200: '%5EAXJO',
  IDXCOMPOSITE: '%5EJKSE', LQ45: '%5ELQ45',
};

const KOMODITAS_YAHOO: Record<string, string> = {
  WTIUSD: 'CL=F', BRENTUSD: 'BZ=F', NGUSD: 'NG=F', COPPER: 'HG=F',
};

const US_STOCKS = new Set(['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'TSLA', 'META', 'NFLX', 'JPM', 'V']);

// ── Types ────────────────────────────────────────────────────────────────────

interface DailyCandle {
  date: string; // YYYY-MM-DD
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface WeeklyBucket {
  weekStart: string;
  weekEnd: string;
  open: number;
  close: number;
  high: number;
  low: number;
  change: number;
  volume: number;
}

// ── Daily candle fetchers ────────────────────────────────────────────────────

/** Fetch crypto daily candles from CoinGecko OHLC */
async function fetchCryptoDaily(symbol: string, days: number): Promise<DailyCandle[]> {
  const cgId = COINGECKO_IDS[symbol.toUpperCase()] || symbol.toLowerCase();
  try {
    const url = `https://api.coingecko.com/api/v3/coins/${cgId}/ohlc?vs_currency=usd&days=${days}`;
    const res = await fetchWithTimeout(url, { timeoutMs: 12000 });
    if (!res.ok) return [];
    const data = await res.json();
    if (!Array.isArray(data)) return [];
    const candles: DailyCandle[] = [];
    for (const c of data) {
      if (!Array.isArray(c) || c.length < 5) continue;
      const [timestamp, open, high, low, close] = c;
      if (!open || !close || isNaN(open) || isNaN(close)) continue;
      const date = new Date(timestamp).toISOString().slice(0, 10);
      candles.push({ date, open, high, low, close, volume: 0 });
    }
    return candles;
  } catch {
    return [];
  }
}

/** Get Yahoo Finance symbol for a given asset */
function toYahooSymbol(symbol: string, type: string): string | null {
  const upper = symbol.toUpperCase();
  if (type === 'saham') {
    if (US_STOCKS.has(upper)) return upper;
    return `${upper}.JK`;
  }
  if (type === 'indeks') {
    return INDEX_YAHOO[upper] || null;
  }
  if (type === 'komoditas') {
    return KOMODITAS_YAHOO[upper] || null;
  }
  if (type === 'forex') {
    // Convert e.g. EURUSD → EURUSD=X for Yahoo
    return `${upper}=X`;
  }
  return null;
}

/** Fetch daily candles from Yahoo Finance */
async function fetchYahooDaily(symbol: string, type: string, days: number): Promise<DailyCandle[]> {
  const yahooSym = toYahooSymbol(symbol, type);
  if (!yahooSym) return [];
  try {
    // Yahoo range parameter: 6mo for >90 days
    const range = days > 90 ? '6mo' : days > 30 ? '3mo' : '1mo';
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSym)}?range=${range}&interval=1d`;
    const res = await fetchWithTimeout(url, {
      timeoutMs: 10000,
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
    });
    if (!res.ok) return [];
    const data = await res.json();
    const result = data.chart?.result?.[0];
    if (!result) return [];

    const timestamps = result.timestamp || [];
    const quote = result.indicators?.quote?.[0];
    if (!quote) return [];
    const opens = quote.open || [];
    const highs = quote.high || [];
    const lows = quote.low || [];
    const closes = quote.close || [];
    const volumes = quote.volume || [];

    const candles: DailyCandle[] = [];
    for (let i = 0; i < timestamps.length; i++) {
      const o = opens[i];
      const h = highs[i];
      const l = lows[i];
      const c = closes[i];
      const v = volumes[i] || 0;
      if (o == null || h == null || l == null || c == null) continue;
      const date = new Date(timestamps[i] * 1000).toISOString().slice(0, 10);
      candles.push({ date, open: o, high: h, low: l, close: c, volume: v });
    }
    return candles;
  } catch {
    return [];
  }
}

/** Generate mock daily candles */
function generateMockDaily(basePrice: number, symbol: string, days: number): DailyCandle[] {
  const candles: DailyCandle[] = [];
  let price = basePrice * 0.9;
  const now = Math.floor(Date.now() / 86400000);
  for (let i = days; i >= 0; i--) {
    const seed = symbol + String(now - i);
    const volatility = basePrice * 0.045;
    const change = (seededRandom(seed) - 0.48) * volatility;
    const open = price;
    price = price + change;
    const high = Math.max(open, price) * (1 + seededRandom(seed + 'h') * 0.035);
    const low = Math.min(open, price) * (1 - seededRandom(seed + 'l') * 0.035);
    const close = parseFloat(price.toFixed(price < 1 ? 6 : 2));
    const date = new Date((now - i) * 86400000).toISOString().slice(0, 10);
    candles.push({
      date,
      open: parseFloat(open.toFixed(open < 1 ? 6 : 2)),
      high: parseFloat(high.toFixed(high < 1 ? 6 : 2)),
      low: parseFloat(low.toFixed(low < 1 ? 6 : 2)),
      close,
      volume: Math.floor(seededRandom(seed + 'v') * 10000000),
    });
  }
  return candles;
}

// ── Weekly bucketing ─────────────────────────────────────────────────────────

/** Get Monday of a given date string (YYYY-MM-DD) */
function getMonday(dateStr: string): Date {
  const d = new Date(dateStr + 'T00:00:00Z');
  const day = d.getUTCDay();
  const diff = d.getUTCDate() - day + (day === 0 ? -6 : 1); // Monday
  d.setUTCDate(diff);
  return d;
}

/** Group daily candles into weekly buckets (Monday–Sunday) */
function groupIntoWeeks(dailyCandles: DailyCandle[]): WeeklyBucket[] {
  if (dailyCandles.length === 0) return [];

  const weeksMap = new Map<string, DailyCandle[]>();

  for (const candle of dailyCandles) {
    const monday = getMonday(candle.date);
    const weekKey = monday.toISOString().slice(0, 10);
    if (!weeksMap.has(weekKey)) weeksMap.set(weekKey, []);
    weeksMap.get(weekKey)!.push(candle);
  }

  const weeks: WeeklyBucket[] = [];
  for (const [weekStart, candles] of weeksMap) {
    if (candles.length === 0) continue;
    candles.sort((a, b) => a.date.localeCompare(b.date));
    const open = candles[0].open;
    const close = candles[candles.length - 1].close;
    const high = Math.max(...candles.map(c => c.high));
    const low = Math.min(...candles.map(c => c.low));
    const volume = candles.reduce((s, c) => s + c.volume, 0);
    const change = open > 0 ? ((close - open) / open) * 100 : 0;
    const weekEnd = candles[candles.length - 1].date;
    weeks.push({
      weekStart,
      weekEnd,
      open,
      close,
      high,
      low,
      change: parseFloat(change.toFixed(4)),
      volume,
    });
  }

  // Sort by weekStart ascending
  weeks.sort((a, b) => a.weekStart.localeCompare(b.weekStart));
  return weeks;
}

// ── Summary calculations ────────────────────────────────────────────────────

function computeSummary(weeks: WeeklyBucket[]) {
  if (weeks.length === 0) {
    return {
      avgWeeklyChange: 0,
      bestWeek: { week: '', change: 0 },
      worstWeek: { week: '', change: 0 },
      winRate: 0,
      totalChange: 0,
      volatility: 0,
    };
  }

  const changes = weeks.map(w => w.change);
  const avgWeeklyChange = changes.reduce((s, c) => s + c, 0) / changes.length;

  // Best and worst week
  let bestIdx = 0;
  let worstIdx = 0;
  for (let i = 1; i < changes.length; i++) {
    if (changes[i] > changes[bestIdx]) bestIdx = i;
    if (changes[i] < changes[worstIdx]) worstIdx = i;
  }

  // Win rate
  const wins = changes.filter(c => c > 0).length;
  const winRate = (wins / changes.length) * 100;

  // Total change (cumulative)
  let totalChange = 1;
  for (const w of weeks) {
    totalChange *= (1 + w.change / 100);
  }
  totalChange = (totalChange - 1) * 100;

  // Volatility (standard deviation of weekly returns)
  const mean = avgWeeklyChange;
  const variance = changes.reduce((s, c) => s + Math.pow(c - mean, 2), 0) / changes.length;
  const volatility = Math.sqrt(variance);

  return {
    avgWeeklyChange: parseFloat(avgWeeklyChange.toFixed(4)),
    bestWeek: { week: weeks[bestIdx].weekStart, change: parseFloat(changes[bestIdx].toFixed(4)) },
    worstWeek: { week: weeks[worstIdx].weekStart, change: parseFloat(changes[worstIdx].toFixed(4)) },
    winRate: parseFloat(winRate.toFixed(1)),
    totalChange: parseFloat(totalChange.toFixed(4)),
    volatility: parseFloat(volatility.toFixed(4)),
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// ── Strategy Backtesting Engine ─────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

// ── Inline Technical Indicator Functions ──────────────────────────────────────

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

/** Average True Range (ATR) */
function computeATR(candles: { high: number; low: number; close: number }[], period: number = 14): number {
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

/** Average Directional Index (ADX) — simplified */
function computeADX(candles: { high: number; low: number; close: number }[], period: number = 14): {
  adx: number; plusDI: number; minusDI: number;
} {
  if (candles.length < period + 1) return { adx: 0, plusDI: 0, minusDI: 0 };

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

  if (trueRanges.length < period) return { adx: 0, plusDI: 0, minusDI: 0 };

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

  return { adx, plusDI, minusDI };
}

// ── Strategy Types ───────────────────────────────────────────────────────────

type StrategyName = 'trend' | 'rsi' | 'breakout' | 'smartmoney' | 'conservative';
type SignalDirection = 'LONG' | 'SHORT' | 'NEUTRAL';
type ExitReason = 'TAKE_PROFIT' | 'STOP_LOSS' | 'SIGNAL_REVERSAL' | 'TIME_EXIT';

interface StrategySignal {
  date: string;
  direction: SignalDirection;
  entryPrice: number;
  stopLoss: number;
  takeProfit: number;
}

interface SimulatedTrade {
  id: number;
  direction: 'LONG' | 'SHORT';
  entryDate: string;
  exitDate: string;
  entryPrice: number;
  exitPrice: number;
  stopLoss: number;
  takeProfit: number;
  pnlPct: number;
  pnlUsd: number;
  balanceAfter: number;
  isWin: boolean;
  exitReason: ExitReason;
}

interface StrategyMetrics {
  finalBalance: number;
  totalReturnPct: number;
  totalReturnUsd: number;
  winRate: number;
  totalTrades: number;
  winTrades: number;
  lossTrades: number;
  longTrades: number;
  shortTrades: number;
  avgWinPct: number;
  avgLossPct: number;
  profitFactor: number;
  maxDrawdownPct: number;
  maxDrawdownUsd: number;
  sharpeRatio: number;
  avgTradeDuration: number;
  consecutiveWins: number;
  consecutiveLosses: number;
  bestTradePct: number;
  worstTradePct: number;
}

interface EquityPoint {
  date: string;
  balance: number;
  drawdownPct: number;
}

interface MarketRegime {
  trending: { pct: number; avgReturnPct: number; trades: number; winRate: number };
  ranging: { pct: number; avgReturnPct: number; trades: number; winRate: number };
  volatile: { pct: number; avgReturnPct: number; trades: number; winRate: number };
  recommendedStrategy: string;
  currentRegime: 'trending' | 'ranging' | 'volatile';
  regimeDescription: string;
}

// ── Market Regime Detection ──────────────────────────────────────────────────

type Regime = 'trending' | 'ranging' | 'volatile';

interface DayRegimeData {
  regime: Regime;
  adx: number;
  atr: number;
  atr50Avg: number;
}

/** Classify each day's market regime */
function classifyRegimes(candles: DailyCandle[]): DayRegimeData[] {
  const result: DayRegimeData[] = [];

  for (let i = 0; i < candles.length; i++) {
    // Need at least 15 candles for meaningful indicators
    if (i < 14) {
      result.push({ regime: 'ranging', adx: 0, atr: 0, atr50Avg: 0 });
      continue;
    }

    const slice = candles.slice(0, i + 1);
    const { adx } = computeADX(slice, 14);
    const atr = computeATR(slice, 14);

    // Compute 50-day ATR average if possible
    let atr50Avg = atr;
    if (slice.length >= 50) {
      const tr50: number[] = [];
      for (let j = 1; j < slice.length; j++) {
        tr50.push(Math.max(
          slice[j].high - slice[j].low,
          Math.abs(slice[j].high - slice[j - 1].close),
          Math.abs(slice[j].low - slice[j - 1].close)
        ));
      }
      const last50 = tr50.slice(-50);
      atr50Avg = last50.reduce((s, v) => s + v, 0) / last50.length;
    }

    let regime: Regime;
    if (atr > 0 && atr50Avg > 0 && atr > 1.5 * atr50Avg) {
      regime = 'volatile';
    } else if (adx >= 25) {
      regime = 'trending';
    } else if (adx < 20) {
      regime = 'ranging';
    } else {
      // ADX between 20-25 without volatility spike → trending
      regime = 'trending';
    }

    result.push({ regime, adx, atr, atr50Avg });
  }

  return result;
}

// ── Strategy Signal Generators ───────────────────────────────────────────────

/** Generate signals for the Trend Following strategy */
function generateTrendSignals(candles: DailyCandle[]): StrategySignal[] {
  const signals: StrategySignal[] = [];

  if (candles.length < 51) return signals;

  for (let i = 50; i < candles.length; i++) {
    const slice = candles.slice(0, i + 1);
    const closes = slice.map(c => c.close);

    const sma20 = sma(closes, 20);
    const sma50 = sma(closes, 50);
    const { adx } = computeADX(slice, 14);
    const atr = computeATR(slice, 14);

    if (atr <= 0) continue;

    // Check for SMA crossover
    const prevCloses = closes.slice(0, -1);
    const prevSma20 = sma(prevCloses, 20);
    const prevSma50 = sma(prevCloses, 50);

    const price = candles[i].close;

    // SMA20 crosses above SMA50 AND ADX > 20
    if (prevSma20 <= prevSma50 && sma20 > sma50 && adx > 20) {
      signals.push({
        date: candles[i].date,
        direction: 'LONG',
        entryPrice: price,
        stopLoss: parseFloat((price - 2 * atr).toFixed(6)),
        takeProfit: parseFloat((price + 3 * atr).toFixed(6)),
      });
    }
    // SMA20 crosses below SMA50 AND ADX > 20
    else if (prevSma20 >= prevSma50 && sma20 < sma50 && adx > 20) {
      signals.push({
        date: candles[i].date,
        direction: 'SHORT',
        entryPrice: price,
        stopLoss: parseFloat((price + 2 * atr).toFixed(6)),
        takeProfit: parseFloat((price - 3 * atr).toFixed(6)),
      });
    }
  }

  return signals;
}

/** Generate signals for the RSI Mean Reversion strategy */
function generateRSISignals(candles: DailyCandle[]): StrategySignal[] {
  const signals: StrategySignal[] = [];

  if (candles.length < 30) return signals;

  for (let i = 15; i < candles.length; i++) {
    const slice = candles.slice(0, i + 1);
    const closes = slice.map(c => c.close);
    const atr = computeATR(slice, 14);

    if (atr <= 0) continue;

    const rsi = computeRSI(closes, 14);
    const prevCloses = closes.slice(0, -1);
    const prevRsi = computeRSI(prevCloses, 14);

    const price = candles[i].close;

    // RSI drops below 30 (oversold)
    if (prevRsi >= 30 && rsi < 30) {
      signals.push({
        date: candles[i].date,
        direction: 'LONG',
        entryPrice: price,
        stopLoss: parseFloat((price - 2 * atr).toFixed(6)),
        takeProfit: parseFloat((price + 2.5 * atr).toFixed(6)),
      });
    }
    // RSI rises above 70 (overbought)
    else if (prevRsi <= 70 && rsi > 70) {
      signals.push({
        date: candles[i].date,
        direction: 'SHORT',
        entryPrice: price,
        stopLoss: parseFloat((price + 2 * atr).toFixed(6)),
        takeProfit: parseFloat((price - 2.5 * atr).toFixed(6)),
      });
    }
  }

  return signals;
}

/** Generate signals for the Breakout strategy */
function generateBreakoutSignals(candles: DailyCandle[]): StrategySignal[] {
  const signals: StrategySignal[] = [];

  if (candles.length < 30) return signals;

  for (let i = 20; i < candles.length; i++) {
    const slice = candles.slice(0, i + 1);
    const closes = slice.map(c => c.close);

    const atr = computeATR(slice, 14);
    const bb = computeBollingerBands(closes, 20, 2);

    if (atr <= 0) continue;

    const price = candles[i].close;

    // 20-day high (exclude current day so breakout is possible)
    const prevSlice = slice.slice(0, -1);
    const highs20 = prevSlice.slice(-20).map(c => c.high);
    const high20 = highs20.length > 0 ? Math.max(...highs20) : price;
    const lows20 = prevSlice.slice(-20).map(c => c.low);
    const low20 = lows20.length > 0 ? Math.min(...lows20) : price;

    // Price closes above 20-day high OR above Bollinger upper
    if (price > high20 || price > bb.upper) {
      signals.push({
        date: candles[i].date,
        direction: 'LONG',
        entryPrice: price,
        stopLoss: parseFloat(bb.middle.toFixed(6)),
        takeProfit: parseFloat((price + 3 * atr).toFixed(6)),
      });
    }
    // Price closes below 20-day low OR below Bollinger lower
    else if (price < low20 || price < bb.lower) {
      signals.push({
        date: candles[i].date,
        direction: 'SHORT',
        entryPrice: price,
        stopLoss: parseFloat(bb.middle.toFixed(6)),
        takeProfit: parseFloat((price - 3 * atr).toFixed(6)),
      });
    }
  }

  return signals;
}

/** Generate signals for the Smart Money Composite strategy */
function generateSmartMoneySignals(candles: DailyCandle[]): StrategySignal[] {
  return generateCompositeSignals(candles, 'smartmoney');
}

/** Generate signals for the Conservative strategy */
function generateConservativeSignals(candles: DailyCandle[]): StrategySignal[] {
  return generateCompositeSignals(candles, 'conservative');
}

/** Composite scoring engine for smartmoney and conservative strategies */
function generateCompositeSignals(candles: DailyCandle[], variant: 'smartmoney' | 'conservative'): StrategySignal[] {
  const signals: StrategySignal[] = [];

  if (candles.length < 51) return signals;

  // Thresholds: smartmoney is more aggressive, conservative requires more confirmation
  const entryThreshold = variant === 'smartmoney' ? 30 : 45;
  const stopMultiplier = variant === 'smartmoney' ? 1.5 : 1.2;
  const tpMultiplier = variant === 'smartmoney' ? 3.0 : 2.0;

  // Cooldown: minimum days between signals to avoid overtrading
  const cooldownDays = variant === 'smartmoney' ? 5 : 7;
  let lastSignalDate = '';

  for (let i = 50; i < candles.length; i++) {
    const slice = candles.slice(0, i + 1);
    const closes = slice.map(c => c.close);

    const atr = computeATR(slice, 14);
    const { adx, plusDI, minusDI } = computeADX(slice, 14);
    const rsi = computeRSI(closes, 14);
    const macdData = computeMACD(closes);
    const bb = computeBollingerBands(closes, 20, 2);
    const sma50 = sma(closes, 50);
    const sma20 = sma(closes, 20);

    if (atr <= 0) continue;

    const price = candles[i].close;
    const today = candles[i].date;

    // Conservative: only trade in trending markets (relaxed threshold)
    if (variant === 'conservative' && adx < 15) continue;

    // Cooldown check
    if (lastSignalDate) {
      const lastDate = new Date(lastSignalDate + 'T00:00:00Z');
      const curDate = new Date(today + 'T00:00:00Z');
      const diffMs = curDate.getTime() - lastDate.getTime();
      if (diffMs < cooldownDays * 24 * 60 * 60 * 1000) continue;
    }

    // ── Scoring: each layer returns 0–100, direction encoded by sign ──

    // ── Trend Layer (0-100) ──
    let trendScore = 0;
    if (adx > 15) {
      // Stronger ADX = stronger trend conviction
      const adxStrength = Math.min((adx - 15) / 35, 1); // 0–1 normalized
      if (plusDI > minusDI && sma20 > sma50) {
        trendScore = 50 + adxStrength * 50; // 50-100 bullish
      } else if (minusDI > plusDI && sma20 < sma50) {
        trendScore = -(50 + adxStrength * 50); // -50 to -100 bearish
      } else if (plusDI > minusDI) {
        trendScore = 30 + adxStrength * 30; // 30-60 mild bullish
      } else if (minusDI > plusDI) {
        trendScore = -(30 + adxStrength * 30); // -30 to -60 mild bearish
      }
    } else if (sma20 > sma50) {
      trendScore = 25; // Mild bullish without ADX confirmation
    } else if (sma20 < sma50) {
      trendScore = -25; // Mild bearish without ADX confirmation
    }

    // ── Momentum Layer (0-100) ──
    let momentumScore = 0;
    if (rsi < 25) {
      momentumScore = 80 + (25 - rsi); // Extremely oversold: 80-105 (bullish reversal)
    } else if (rsi < 35) {
      momentumScore = 50 + (35 - rsi); // Oversold zone: 50-70 (bullish)
    } else if (rsi < 45 && macdData.histogram > 0) {
      momentumScore = 40; // Weak zone + MACD turning bullish
    } else if (rsi > 75) {
      momentumScore = -(80 + (rsi - 75)); // Extremely overbought: -80 to -105 (bearish)
    } else if (rsi > 65) {
      momentumScore = -(50 + (rsi - 65)); // Overbought zone: -50 to -70 (bearish)
    } else if (rsi > 55 && macdData.histogram < 0) {
      momentumScore = -40; // Weak zone + MACD turning bearish
    } else if (macdData.macd > macdData.signal && macdData.histogram > 0) {
      momentumScore = 35; // MACD bullish crossover
    } else if (macdData.macd < macdData.signal && macdData.histogram < 0) {
      momentumScore = -35; // MACD bearish crossover
    }

    // ── Volatility Layer (0-100) ──
    let volatilityScore = 0;
    if (price > bb.upper) {
      const bbDist = bb.middle > 0 ? ((price - bb.upper) / bb.middle) * 100 : 0;
      volatilityScore = 50 + Math.min(bbDist * 5, 50); // 50-100: breakout above
    } else if (price < bb.lower) {
      const bbDist = bb.middle > 0 ? ((bb.lower - price) / bb.middle) * 100 : 0;
      volatilityScore = -(50 + Math.min(bbDist * 5, 50)); // -50 to -100: breakout below
    }
    // Near BB bands also gets partial score
    else {
      const bbRange = bb.upper - bb.lower;
      if (bbRange > 0) {
        const upperPct = (bb.upper - price) / bbRange; // 0=at upper, 1=at lower
        if (upperPct < 0.15) volatilityScore = 20; // Near upper band: slight bullish
        else if (upperPct > 0.85) volatilityScore = -20; // Near lower band: slight bearish
      }
    }

    // ── SMC Layer (0-100) ──
    let smcScore = 0;
    // Price vs SMA50 (premium/discount zone)
    if (sma50 > 0) {
      const distFromSMA50 = ((price - sma50) / sma50) * 100; // percentage
      if (distFromSMA50 < -3) smcScore = 60 + Math.min(Math.abs(distFromSMA50) * 3, 40); // Deep discount: 60-100
      else if (distFromSMA50 < -1) smcScore = 40; // Mild discount
      else if (distFromSMA50 > 3) smcScore = -(60 + Math.min(distFromSMA50 * 3, 40)); // Deep premium: -60 to -100
      else if (distFromSMA50 > 1) smcScore = -40; // Mild premium
    }
    // 20-day high/low breakout boost
    const highs20 = slice.slice(-20).map(c => c.high);
    const low20 = Math.min(...slice.slice(-20).map(c => c.low));
    if (price > Math.max(...highs20)) smcScore = Math.max(smcScore, 55);
    else if (price < low20) smcScore = Math.min(smcScore, -55);

    // ── Volume Confirmation Layer ──
    let volumeScore = 0;
    if (slice.length >= 20) {
      const recentVol = slice.slice(-5).reduce((s, c) => s + c.volume, 0) / 5;
      const avgVol = slice.slice(-20).reduce((s, c) => s + c.volume, 0) / 20;
      if (avgVol > 0 && recentVol > avgVol * 1.3) {
        volumeScore = 25; // High volume confirms move
      } else if (avgVol > 0 && recentVol > avgVol * 1.1) {
        volumeScore = 12; // Slightly above average volume
      }
    }

    // ── Weighted Composite (-100 to +100) ──
    const composite = trendScore * 0.25 + momentumScore * 0.25 + volatilityScore * 0.15 + smcScore * 0.20 + volumeScore * 0.15;

    if (composite >= entryThreshold) {
      signals.push({
        date: today,
        direction: 'LONG',
        entryPrice: price,
        stopLoss: parseFloat((price - stopMultiplier * atr).toFixed(6)),
        takeProfit: parseFloat((price + tpMultiplier * atr).toFixed(6)),
      });
      lastSignalDate = today;
    } else if (composite <= -entryThreshold) {
      signals.push({
        date: today,
        direction: 'SHORT',
        entryPrice: price,
        stopLoss: parseFloat((price + stopMultiplier * atr).toFixed(6)),
        takeProfit: parseFloat((price - tpMultiplier * atr).toFixed(6)),
      });
      lastSignalDate = today;
    }
  }

  return signals;
}

// ── Signal to Candle Map ─────────────────────────────────────────────────────

/** Build a lookup map from date string to candle index */
function buildCandleMap(candles: DailyCandle[]): Map<string, number> {
  const map = new Map<string, number>();
  for (let i = 0; i < candles.length; i++) {
    map.set(candles[i].date, i);
  }
  return map;
}

// ── Trade Simulation Engine ──────────────────────────────────────────────────

interface SimulatedTradeInternal extends SimulatedTrade {
  _signalIndex: number; // track which signal this came from
}

/**
 * Run the simulation loop for a given strategy's signals against daily candles.
 */
function simulateTrades(
  candles: DailyCandle[],
  signals: StrategySignal[],
  initialBalance: number,
  riskPerTrade: number,
  strategyName: StrategyName,
): { trades: SimulatedTrade[]; equityCurve: EquityPoint[] } {
  if (candles.length < 30 || signals.length === 0) {
    return { trades: [], equityCurve: [] };
  }

  const candleMap = buildCandleMap(candles);
  const trades: SimulatedTradeInternal[] = [];
  const equityCurve: EquityPoint[] = [];

  let balance = initialBalance;
  let peakBalance = initialBalance;
  let tradeId = 1;

  // Track equity at every day
  let currentOpenTrade: SimulatedTradeInternal | null = null;
  let signalIdx = 0;

  // Process signals in order; only take next signal if no trade is open
  while (signalIdx < signals.length) {
    const signal = signals[signalIdx];
    const candleIdx = candleMap.get(signal.date);

    if (candleIdx === undefined) {
      signalIdx++;
      continue;
    }

    // Skip if there's already an open trade
    if (currentOpenTrade) {
      signalIdx++;
      continue;
    }

    // Calculate position size
    const stopDistance = Math.abs(signal.entryPrice - signal.stopLoss);
    if (stopDistance <= 0) {
      signalIdx++;
      continue;
    }

    const riskAmount = balance * (riskPerTrade / 100);
    const positionSize = riskAmount / stopDistance;

    // Preserve the strategy's intended R:R ratio
    const intendedTP = signal.takeProfit;
    const rrRatio = Math.abs(intendedTP - signal.entryPrice) / stopDistance;

    // Simulate from entry day forward
    let exited = false;
    const trade: SimulatedTradeInternal = {
      id: tradeId,
      direction: signal.direction as 'LONG' | 'SHORT',
      entryDate: signal.date,
      exitDate: '',
      entryPrice: signal.entryPrice,
      exitPrice: signal.entryPrice,
      stopLoss: signal.stopLoss,
      takeProfit: signal.takeProfit,
      pnlPct: 0,
      pnlUsd: 0,
      balanceAfter: balance,
      isWin: false,
      exitReason: 'TIME_EXIT',
      _signalIndex: signalIdx,
    };

    for (let dayIdx = candleIdx; dayIdx < candles.length; dayIdx++) {
      const day = candles[dayIdx];

      if (dayIdx === candleIdx) {
        // Entry day — use close as entry, recalculate SL/TP proportionally
        trade.entryPrice = day.close;
        if (trade.direction === 'LONG') {
          trade.stopLoss = parseFloat((day.close - stopDistance).toFixed(6));
          trade.takeProfit = parseFloat((day.close + stopDistance * rrRatio).toFixed(6));
        } else {
          trade.stopLoss = parseFloat((day.close + stopDistance).toFixed(6));
          trade.takeProfit = parseFloat((day.close - stopDistance * rrRatio).toFixed(6));
        }
        continue;
      }

      // Check exit conditions using high/low of the day
      const high = day.high;
      const low = day.low;

      if (trade.direction === 'LONG') {
        // Check stop loss
        if (low <= trade.stopLoss) {
          trade.exitPrice = trade.stopLoss;
          trade.exitDate = day.date;
          trade.exitReason = 'STOP_LOSS';
          exited = true;
          break;
        }
        // Check take profit
        if (high >= trade.takeProfit) {
          trade.exitPrice = trade.takeProfit;
          trade.exitDate = day.date;
          trade.exitReason = 'TAKE_PROFIT';
          exited = true;
          break;
        }
      } else {
        // SHORT
        // Check stop loss
        if (high >= trade.stopLoss) {
          trade.exitPrice = trade.stopLoss;
          trade.exitDate = day.date;
          trade.exitReason = 'STOP_LOSS';
          exited = true;
          break;
        }
        // Check take profit
        if (low <= trade.takeProfit) {
          trade.exitPrice = trade.takeProfit;
          trade.exitDate = day.date;
          trade.exitReason = 'TAKE_PROFIT';
          exited = true;
          break;
        }
      }

      // Max hold time: 15 trading days
      const daysHeld = dayIdx - candleIdx;
      if (daysHeld >= 15 && !exited) {
        trade.exitPrice = day.close;
        trade.exitDate = day.date;
        trade.exitReason = 'TIME_EXIT';
        exited = true;
        break;
      }
    }

    // If not exited, close at last day's close
    if (!exited) {
      const lastCandle = candles[candles.length - 1];
      trade.exitPrice = lastCandle.close;
      trade.exitDate = lastCandle.date;
      trade.exitReason = 'TIME_EXIT';
    }

    // Calculate PnL
    let pnlUsd: number;
    if (trade.direction === 'LONG') {
      pnlUsd = (trade.exitPrice - trade.entryPrice) * positionSize;
    } else {
      pnlUsd = (trade.entryPrice - trade.exitPrice) * positionSize;
    }

    const pnlPct = trade.entryPrice > 0 ? (pnlUsd / (trade.entryPrice * positionSize)) * 100 : 0;
    balance += pnlUsd;

    trade.pnlPct = parseFloat(pnlPct.toFixed(4));
    trade.pnlUsd = parseFloat(pnlUsd.toFixed(2));
    trade.balanceAfter = parseFloat(balance.toFixed(2));
    trade.isWin = pnlUsd > 0;
    trade.exitPrice = parseFloat(trade.exitPrice.toFixed(6));

    trades.push(trade);
    tradeId++;
    signalIdx++;

    currentOpenTrade = null;
  }

  // Build equity curve
  // Include an initial point
  equityCurve.push({
    date: candles[0].date,
    balance: parseFloat(initialBalance.toFixed(2)),
    drawdownPct: 0,
  });

  // Map trades to equity curve points
  let tradeCursor = 0;
  let runningBalance = initialBalance;
  peakBalance = initialBalance;

  for (let i = 1; i < candles.length; i++) {
    const day = candles[i].date;

    // Check if any trade closed on this day
    while (tradeCursor < trades.length && trades[tradeCursor].exitDate === day) {
      runningBalance = trades[tradeCursor].balanceAfter;
      tradeCursor++;
    }

    // Also check entry day P&L effect (already reflected in balanceAfter of previous trades)

    if (runningBalance > peakBalance) {
      peakBalance = runningBalance;
    }

    const drawdownPct = peakBalance > 0
      ? ((peakBalance - runningBalance) / peakBalance) * 100
      : 0;

    equityCurve.push({
      date: day,
      balance: parseFloat(runningBalance.toFixed(2)),
      drawdownPct: parseFloat(drawdownPct.toFixed(4)),
    });
  }

  // Return without internal fields
  return {
    trades: trades.map(t => {
      const { _signalIndex, ...rest } = t;
      return rest;
    }),
    equityCurve,
  };
}

// ── Metrics Calculator ───────────────────────────────────────────────────────

function calculateMetrics(
  trades: SimulatedTrade[],
  equityCurve: EquityPoint[],
  initialBalance: number,
): StrategyMetrics {
  const emptyMetrics: StrategyMetrics = {
    finalBalance: initialBalance,
    totalReturnPct: 0,
    totalReturnUsd: 0,
    winRate: 0,
    totalTrades: 0,
    winTrades: 0,
    lossTrades: 0,
    longTrades: 0,
    shortTrades: 0,
    avgWinPct: 0,
    avgLossPct: 0,
    profitFactor: 0,
    maxDrawdownPct: 0,
    maxDrawdownUsd: 0,
    sharpeRatio: 0,
    avgTradeDuration: 0,
    consecutiveWins: 0,
    consecutiveLosses: 0,
    bestTradePct: 0,
    worstTradePct: 0,
  };

  if (trades.length === 0) return emptyMetrics;

  const finalBalance = trades[trades.length - 1].balanceAfter;
  const totalReturnUsd = finalBalance - initialBalance;
  const totalReturnPct = initialBalance > 0 ? (totalReturnUsd / initialBalance) * 100 : 0;

  const winTrades = trades.filter(t => t.isWin);
  const lossTrades = trades.filter(t => !t.isWin);
  const longTrades = trades.filter(t => t.direction === 'LONG');
  const shortTrades = trades.filter(t => t.direction === 'SHORT');

  const winRate = (winTrades.length / trades.length) * 100;

  const avgWinPct = winTrades.length > 0
    ? winTrades.reduce((s, t) => s + t.pnlPct, 0) / winTrades.length
    : 0;

  const avgLossPct = lossTrades.length > 0
    ? lossTrades.reduce((s, t) => s + t.pnlPct, 0) / lossTrades.length
    : 0;

  const totalWins = winTrades.reduce((s, t) => s + t.pnlUsd, 0);
  const totalLosses = Math.abs(lossTrades.reduce((s, t) => s + t.pnlUsd, 0));
  const profitFactor = totalLosses > 0 ? totalWins / totalLosses : totalWins > 0 ? Infinity : 0;

  // Max drawdown
  let maxDrawdownPct = 0;
  let maxDrawdownUsd = 0;
  let peak = initialBalance;
  for (const point of equityCurve) {
    if (point.balance > peak) peak = point.balance;
    const dd = peak > 0 ? ((peak - point.balance) / peak) * 100 : 0;
    const ddUsd = peak - point.balance;
    if (dd > maxDrawdownPct) maxDrawdownPct = dd;
    if (ddUsd > maxDrawdownUsd) maxDrawdownUsd = ddUsd;
  }

  // Sharpe ratio (simplified)
  const dailyReturns: number[] = [];
  for (let i = 1; i < equityCurve.length; i++) {
    const prev = equityCurve[i - 1].balance;
    const curr = equityCurve[i].balance;
    if (prev > 0) {
      dailyReturns.push((curr - prev) / prev);
    }
  }

  let sharpeRatio = 0;
  if (dailyReturns.length > 1) {
    const avgReturn = dailyReturns.reduce((s, r) => s + r, 0) / dailyReturns.length;
    const variance = dailyReturns.reduce((s, r) => s + Math.pow(r - avgReturn, 2), 0) / dailyReturns.length;
    const stdDev = Math.sqrt(variance);
    sharpeRatio = stdDev > 0 ? (avgReturn / stdDev) * Math.sqrt(252) : 0;
  }

  // Average trade duration
  const durations = trades.map(t => {
    const entry = new Date(t.entryDate).getTime();
    const exit = new Date(t.exitDate).getTime();
    return (exit - entry) / (1000 * 60 * 60 * 24);
  });
  const avgTradeDuration = durations.reduce((s, d) => s + d, 0) / durations.length;

  // Consecutive wins / losses
  let consecutiveWins = 0;
  let consecutiveLosses = 0;
  let currentWins = 0;
  let currentLosses = 0;
  for (const t of trades) {
    if (t.isWin) {
      currentWins++;
      currentLosses = 0;
      if (currentWins > consecutiveWins) consecutiveWins = currentWins;
    } else {
      currentLosses++;
      currentWins = 0;
      if (currentLosses > consecutiveLosses) consecutiveLosses = currentLosses;
    }
  }

  const bestTradePct = trades.length > 0 ? Math.max(...trades.map(t => t.pnlPct)) : 0;
  const worstTradePct = trades.length > 0 ? Math.min(...trades.map(t => t.pnlPct)) : 0;

  return {
    finalBalance: parseFloat(finalBalance.toFixed(2)),
    totalReturnPct: parseFloat(totalReturnPct.toFixed(4)),
    totalReturnUsd: parseFloat(totalReturnUsd.toFixed(2)),
    winRate: parseFloat(winRate.toFixed(4)),
    totalTrades: trades.length,
    winTrades: winTrades.length,
    lossTrades: lossTrades.length,
    longTrades: longTrades.length,
    shortTrades: shortTrades.length,
    avgWinPct: parseFloat(avgWinPct.toFixed(4)),
    avgLossPct: parseFloat(avgLossPct.toFixed(4)),
    profitFactor: profitFactor === Infinity ? 999.99 : parseFloat(profitFactor.toFixed(4)),
    maxDrawdownPct: parseFloat(maxDrawdownPct.toFixed(4)),
    maxDrawdownUsd: parseFloat(maxDrawdownUsd.toFixed(2)),
    sharpeRatio: parseFloat(sharpeRatio.toFixed(4)),
    avgTradeDuration: parseFloat(avgTradeDuration.toFixed(2)),
    consecutiveWins,
    consecutiveLosses,
    bestTradePct: parseFloat(bestTradePct.toFixed(4)),
    worstTradePct: parseFloat(worstTradePct.toFixed(4)),
  };
}

// ── Regime Analysis Calculator ───────────────────────────────────────────────

function calculateRegimeAnalysis(
  trades: SimulatedTrade[],
  regimeData: DayRegimeData[],
  candles: DailyCandle[],
): MarketRegime {
  const candleMap = buildCandleMap(candles);

  const regimeTrades: Record<Regime, SimulatedTrade[]> = {
    trending: [],
    ranging: [],
    volatile: [],
  };

  for (const trade of trades) {
    const idx = candleMap.get(trade.entryDate);
    if (idx !== undefined && idx < regimeData.length) {
      regimeTrades[regimeData[idx].regime].push(trade);
    }
  }

  // Count regime days
  let trendingDays = 0;
  let rangingDays = 0;
  let volatileDays = 0;
  for (const rd of regimeData) {
    if (rd.regime === 'trending') trendingDays++;
    else if (rd.regime === 'ranging') rangingDays++;
    else volatileDays++;
  }
  const totalDays = trendingDays + rangingDays + volatileDays || 1;

  const calcRegimeStats = (regimeTradesList: SimulatedTrade[]) => {
    if (regimeTradesList.length === 0) {
      return { pct: 0, avgReturnPct: 0, trades: 0, winRate: 0 };
    }
    const wins = regimeTradesList.filter(t => t.isWin).length;
    const avgReturn = regimeTradesList.reduce((s, t) => s + t.pnlPct, 0) / regimeTradesList.length;
    return {
      pct: 0, // will be set below
      avgReturnPct: parseFloat(avgReturn.toFixed(4)),
      trades: regimeTradesList.length,
      winRate: parseFloat(((wins / regimeTradesList.length) * 100).toFixed(4)),
    };
  };

  const trendingStats = calcRegimeStats(regimeTrades.trending);
  const rangingStats = calcRegimeStats(regimeTrades.ranging);
  const volatileStats = calcRegimeStats(regimeTrades.volatile);

  trendingStats.pct = parseFloat(((trendingDays / totalDays) * 100).toFixed(4));
  rangingStats.pct = parseFloat(((rangingDays / totalDays) * 100).toFixed(4));
  volatileStats.pct = parseFloat(((volatileDays / totalDays) * 100).toFixed(4));

  // Current regime (last day)
  const currentRegime = regimeData.length > 0 ? regimeData[regimeData.length - 1].regime : 'ranging';

  // Recommended strategy
  let recommendedStrategy: string;
  let regimeDescription: string;
  switch (currentRegime) {
    case 'trending':
      recommendedStrategy = 'trend';
      regimeDescription = 'Market is trending with clear directional momentum. Trend-following strategies tend to perform well.';
      break;
    case 'ranging':
      recommendedStrategy = 'conservative';
      regimeDescription = 'Market is in a range-bound state with low directional movement. Conservative strategies with fewer trades work best.';
      break;
    case 'volatile':
      recommendedStrategy = 'breakout';
      regimeDescription = 'Market volatility is elevated above normal levels. Breakout strategies can capture large directional moves.';
      break;
  }

  return {
    trending: trendingStats,
    ranging: rangingStats,
    volatile: volatileStats,
    recommendedStrategy,
    currentRegime,
    regimeDescription,
  };
}

// ── Strategy Runner ──────────────────────────────────────────────────────────

const STRATEGY_LABELS: Record<StrategyName, string> = {
  trend: 'Trend Following',
  rsi: 'RSI Mean Reversion',
  breakout: 'Breakout',
  smartmoney: 'Smart Money Composite',
  conservative: 'Conservative',
};

function runStrategy(
  strategy: StrategyName,
  candles: DailyCandle[],
  initialBalance: number,
  riskPerTrade: number,
): { signals: StrategySignal[]; trades: SimulatedTrade[]; equityCurve: EquityPoint[]; metrics: StrategyMetrics } {
  let signals: StrategySignal[] = [];

  switch (strategy) {
    case 'trend':
      signals = generateTrendSignals(candles);
      break;
    case 'rsi':
      signals = generateRSISignals(candles);
      break;
    case 'breakout':
      signals = generateBreakoutSignals(candles);
      break;
    case 'smartmoney':
      signals = generateSmartMoneySignals(candles);
      break;
    case 'conservative':
      signals = generateConservativeSignals(candles);
      break;
  }

  const { trades, equityCurve } = simulateTrades(candles, signals, initialBalance, riskPerTrade, strategy);
  const metrics = calculateMetrics(trades, equityCurve, initialBalance);

  return { signals, trades, equityCurve, metrics };
}

// ── Main GET handler ────────────────────────────────────────────────────────

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ businessId: string }> }
) {
  try {
    const authResult = await requireAuth();
    if (!authResult) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get('symbol') || '';
    const type = searchParams.get('type') || 'crypto';
    const weeksParam = parseInt(searchParams.get('weeks') || '8', 10);
    const numWeeks = Math.max(1, Math.min(26, isNaN(weeksParam) ? 8 : weeksParam));

    // Date range params
    const startDateParam = searchParams.get('startDate') || '';
    const endDateParam = searchParams.get('endDate') || '';

    // New strategy params
    const strategyParam = searchParams.get('strategy') || 'smartmoney';
    const initialBalanceParam = parseFloat(searchParams.get('initialBalance') || '10000');
    const riskPerTradeParam = parseFloat(searchParams.get('riskPerTrade') || '2');

    const validStrategies = ['trend', 'rsi', 'breakout', 'smartmoney', 'conservative', 'all'];
    const strategy = validStrategies.includes(strategyParam) ? strategyParam : 'smartmoney';

    const initialBalance = Math.max(100, isNaN(initialBalanceParam) ? 10000 : initialBalanceParam);
    const riskPerTrade = Math.max(1, Math.min(5, isNaN(riskPerTradeParam) ? 2 : riskPerTradeParam));

    // Calculate days needed: if date range given, use that; otherwise use weeks
    let daysNeeded: number;
    if (startDateParam && endDateParam) {
      const start = new Date(startDateParam + 'T00:00:00Z');
      const end = new Date(endDateParam + 'T00:00:00Z');
      const diffDays = Math.ceil(Math.abs(end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      // Need extra days for indicators (lookback buffer)
      daysNeeded = Math.max(diffDays + 30, 90);
    } else {
      daysNeeded = Math.max(numWeeks * 15, 120);
    }

    if (!symbol) {
      return NextResponse.json({ error: 'Missing symbol parameter' }, { status: 400 });
    }

    const validTypes = ['crypto', 'saham', 'forex', 'komoditas', 'indeks'];
    if (!validTypes.includes(type)) {
      return NextResponse.json({ error: `Invalid type: ${type}. Must be one of: ${validTypes.join(', ')}` }, { status: 400 });
    }

    let dailyCandles: DailyCandle[] = [];

    if (type === 'crypto') {
      // Try CoinGecko first
      dailyCandles = await fetchCryptoDaily(symbol, daysNeeded);
      // Fallback to Yahoo Finance
      if (dailyCandles.length < 5) {
        const yahooCandles = await fetchYahooDaily(symbol, type, daysNeeded);
        if (yahooCandles.length > dailyCandles.length) dailyCandles = yahooCandles;
      }
    } else {
      // Use Yahoo Finance for saham, forex, komoditas, indeks
      dailyCandles = await fetchYahooDaily(symbol, type, daysNeeded);
    }

    // Mock fallback
    if (dailyCandles.length < 5) {
      const mockBasePrice = getMockBasePrice(symbol, type);
      dailyCandles = generateMockDaily(mockBasePrice, symbol, daysNeeded);
    }

    // Filter to last N days of data
    if (dailyCandles.length > daysNeeded) {
      dailyCandles = dailyCandles.slice(-daysNeeded);
    }

    // IMPORTANT: Do NOT filter candles by date range before running strategies.
    // Strategies need the full dataset for indicator warmup (SMA50, etc.).
    // Store date range for display filtering only.
    const displayStart = startDateParam || '';
    const displayEnd = endDateParam || '';

    // Group into weeks
    const weeklyData = groupIntoWeeks(dailyCandles);

    // Apply date range filter ONLY for weekly display data
    let trimmedWeekly = weeklyData;
    if (displayStart || displayEnd) {
      trimmedWeekly = weeklyData.filter(w => {
        if (displayStart && w.weekEnd < displayStart) return false;
        if (displayEnd && w.weekStart > displayEnd) return false;
        return true;
      });
    } else {
      trimmedWeekly = weeklyData.slice(-numWeeks);
    }

    // Compute summary
    const summary = computeSummary(trimmedWeekly);

    // ── Strategy Backtesting ──
    const enoughData = dailyCandles.length >= 30;

    let metrics: StrategyMetrics;
    let trades: SimulatedTrade[] = [];
    let equityCurve: EquityPoint[] = [];
    let regimeAnalysis: MarketRegime;
    let strategyComparison: Array<{ name: string; label: string; metrics: StrategyMetrics }> | undefined;
    const activeStrategy = strategy as 'all' | StrategyName;

    const emptyMetrics: StrategyMetrics = {
      finalBalance: initialBalance,
      totalReturnPct: 0,
      totalReturnUsd: 0,
      winRate: 0,
      totalTrades: 0,
      winTrades: 0,
      lossTrades: 0,
      longTrades: 0,
      shortTrades: 0,
      avgWinPct: 0,
      avgLossPct: 0,
      profitFactor: 0,
      maxDrawdownPct: 0,
      maxDrawdownUsd: 0,
      sharpeRatio: 0,
      avgTradeDuration: 0,
      consecutiveWins: 0,
      consecutiveLosses: 0,
      bestTradePct: 0,
      worstTradePct: 0,
    };

    const emptyRegime: MarketRegime = {
      trending: { pct: 0, avgReturnPct: 0, trades: 0, winRate: 0 },
      ranging: { pct: 0, avgReturnPct: 0, trades: 0, winRate: 0 },
      volatile: { pct: 0, avgReturnPct: 0, trades: 0, winRate: 0 },
      recommendedStrategy: 'conservative',
      currentRegime: 'ranging',
      regimeDescription: 'Insufficient data for regime analysis.',
    };

    if (!enoughData) {
      metrics = emptyMetrics;
      regimeAnalysis = emptyRegime;
    } else if (activeStrategy === 'all') {
      // Run all strategies for comparison
      const strategies: StrategyName[] = ['trend', 'rsi', 'breakout', 'smartmoney', 'conservative'];
      const results = strategies.map(s => runStrategy(s, dailyCandles, initialBalance, riskPerTrade));

      strategyComparison = results.map((r, i) => ({
        name: strategies[i],
        label: STRATEGY_LABELS[strategies[i]],
        metrics: r.metrics,
      }));

      // Use smartmoney as the primary display
      const primary = results.find(r => {
        // Match by index (smartmoney is index 3)
        return strategies[3] === 'smartmoney';
      }) || results[3];
      metrics = primary.metrics;
      trades = primary.trades;
      equityCurve = primary.equityCurve;

      // Regime analysis uses smartmoney trades
      const regimeData = classifyRegimes(dailyCandles);
      regimeAnalysis = calculateRegimeAnalysis(primary.trades, regimeData, dailyCandles);
    } else {
      const result = runStrategy(activeStrategy, dailyCandles, initialBalance, riskPerTrade);
      metrics = result.metrics;
      trades = result.trades;
      equityCurve = result.equityCurve;

      const regimeData = classifyRegimes(dailyCandles);
      regimeAnalysis = calculateRegimeAnalysis(trades, regimeData, dailyCandles);
    }

    return NextResponse.json({
      symbol: symbol.toUpperCase(),
      type,
      weeklyData: trimmedWeekly,
      summary,
      strategy: activeStrategy === 'all' ? 'smartmoney' : activeStrategy,
      initialBalance,
      metrics,
      equityCurve,
      trades,
      regimeAnalysis,
      ...(strategyComparison ? { strategyComparison } : {}),
    });
  } catch (error) {
    console.error('Backtest API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

/** Get approximate base price for mock data generation */
function getMockBasePrice(symbol: string, type: string): number {
  const upper = symbol.toUpperCase();

  // Crypto mock prices
  const cryptoPrices: Record<string, number> = {
    BTC: 104800, BTCUSDT: 104800,
    ETH: 2520, ETHUSDT: 2520,
    BNB: 695, SOL: 172, XRP: 2.48, ADA: 0.78, DOGE: 0.228,
    AVAX: 24.5, DOT: 4.85, LINK: 16.8, MATIC: 0.26,
    SHIB: 0.000016, LTC: 103, TRX: 0.27, ATOM: 8.9,
    UNI: 7.8, NEAR: 3.15, ARB: 0.53, OP: 1.35, SUI: 3.58,
    PEPE: 0.0000125, TON: 3.72, APT: 9.25, FET: 1.42, RNDR: 5.2,
  };
  if (type === 'crypto') return cryptoPrices[upper] ?? 100 + seededRandom(symbol) * 5000;

  // Forex mock prices
  const forexPrices: Record<string, number> = {
    EURUSD: 1.1342, GBPUSD: 1.2718, USDJPY: 143.25, USDIDR: 15850,
    XAUUSD: 3315, AUDUSD: 0.6532, USDCAD: 1.3985, USDCHF: 0.8812,
  };
  if (type === 'forex') return forexPrices[upper] ?? 1.0;

  // Komoditas mock prices
  const komoditasPrices: Record<string, number> = {
    XAUUSD: 3315, XAGUSD: 33.5, XPTUSD: 985,
    WTIUSD: 61.5, BRENTUSD: 64.8, NGUSD: 3.85, COPPER: 4.15,
  };
  if (type === 'komoditas') return komoditasPrices[upper] ?? 100;

  // Indeks mock prices
  const indeksPrices: Record<string, number> = {
    SPX500: 5942, US100: 21250, US30: 42850,
    IDXCOMPOSITE: 6800, LQ45: 1050,
  };
  if (type === 'indeks') return indeksPrices[upper] ?? 5000;

  // Saham default
  return 5000 + seededRandom(symbol) * 5000;
}
