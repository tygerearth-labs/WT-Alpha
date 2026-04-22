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
    const volatility = basePrice * 0.025;
    const change = (seededRandom(seed) - 0.45) * volatility;
    const open = price;
    price = price + change;
    const high = Math.max(open, price) * (1 + seededRandom(seed + 'h') * 0.015);
    const low = Math.min(open, price) * (1 - seededRandom(seed + 'l') * 0.015);
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
    const daysNeeded = numWeeks * 8; // ~2 extra days per week for buffer

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

    // Filter to last N weeks of data
    if (dailyCandles.length > daysNeeded) {
      dailyCandles = dailyCandles.slice(-daysNeeded);
    }

    // Group into weeks
    const weeklyData = groupIntoWeeks(dailyCandles);

    // Only return requested number of weeks
    const trimmedWeekly = weeklyData.slice(-numWeeks);

    // Compute summary
    const summary = computeSummary(trimmedWeekly);

    return NextResponse.json({
      symbol: symbol.toUpperCase(),
      type,
      weeklyData: trimmedWeekly,
      summary,
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
