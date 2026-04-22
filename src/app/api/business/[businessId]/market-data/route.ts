import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';

// ── Crypto symbol → CoinGecko ID mapping ────────────────────────────────────
const CRYPTO_SYMBOL_TO_ID: Record<string, string> = {
  BTCUSDT: 'bitcoin',
  BTC: 'bitcoin',
  ETHUSDT: 'ethereum',
  ETH: 'ethereum',
  BNBUSDT: 'binancecoin',
  BNB: 'binancecoin',
  XRPUSDT: 'ripple',
  XRP: 'ripple',
  ADAUSDT: 'cardano',
  ADA: 'cardano',
  SOLUSDT: 'solana',
  SOL: 'solana',
  DOTUSDT: 'polkadot',
  DOT: 'polkadot',
  DOGEUSDT: 'dogecoin',
  DOGE: 'dogecoin',
  AVAXUSDT: 'avalanche-2',
  AVAX: 'avalanche-2',
  MATICUSDT: 'matic-network',
  MATIC: 'matic-network',
  LINKUSDT: 'chainlink',
  LINK: 'chainlink',
  USDTUSDT: 'tether',
  USDT: 'tether',
  USDCUSDT: 'usd-coin',
  USDC: 'usd-coin',
  SHIBUSDT: 'shiba-inu',
  SHIB: 'shiba-inu',
  LTCUSDT: 'litecoin',
  LTC: 'litecoin',
  TRXUSDT: 'tron',
  TRX: 'tron',
  ATOMUSDT: 'cosmos',
  ATOM: 'cosmos',
  UNIUSDT: 'uniswap',
  UNI: 'uniswap',
  NEARUSDT: 'near',
  NEAR: 'near',
  ARBUSDT: 'arbitrum',
  ARB: 'arbitrum',
  OPUSDT: 'optimism',
  OP: 'optimism',
  INJUSDT: 'injective-protocol',
  INJ: 'injective-protocol',
};

// ── Mock saham (Indonesian stocks) data ──────────────────────────────────────
const SAHAM_MOCK_DATA: Record<string, { name: string; basePrice: number; sector: string }> = {
  BBCA: { name: 'Bank Central Asia', basePrice: 9750, sector: 'Banking' },
  BBRI: { name: 'Bank Rakyat Indonesia', basePrice: 4650, sector: 'Banking' },
  BMRI: { name: 'Bank Mandiri', basePrice: 6200, sector: 'Banking' },
  BBNI: { name: 'Bank Negara Indonesia', basePrice: 4800, sector: 'Banking' },
  TLKM: { name: 'Telkom Indonesia', basePrice: 3350, sector: 'Telecom' },
  ASII: { name: 'Astra International', basePrice: 5200, sector: 'Conglomerate' },
  UNVR: { name: 'Unilever Indonesia', basePrice: 2350, sector: 'Consumer' },
  GOTO: { name: 'GoTo Gojek Tokopedia', basePrice: 74, sector: 'Technology' },
  BUKA: { name: 'Bukalapak', basePrice: 126, sector: 'Technology' },
  ARTO: { name: 'Bank Jago', basePrice: 2650, sector: 'Banking' },
  ACST: { name: 'Ace Hardware Indonesia', basePrice: 710, sector: 'Retail' },
  ANTM: { name: 'Aneka Tambang', basePrice: 1350, sector: 'Mining' },
  BRIS: { name: 'Bank Syariah Indonesia', basePrice: 2400, sector: 'Banking' },
  CPIN: { name: 'Charoen Pokphand Indonesia', basePrice: 7800, sector: 'Consumer' },
  EMTK: { name: 'Elang Mahkota Teknologi', basePrice: 630, sector: 'Media' },
  ERAA: { name: 'Erajaya Swasembada', basePrice: 478, sector: 'Technology' },
  EXCL: { name: 'XL Axiata', basePrice: 2250, sector: 'Telecom' },
  ICBP: { name: 'Indofood CBP', basePrice: 11200, sector: 'Consumer' },
  INCO: { name: 'Vale Indonesia', basePrice: 3950, sector: 'Mining' },
  INDY: { name: 'Indorama Ventures', basePrice: 1980, sector: 'Petrochemical' },
  ISAT: { name: 'Indosat Ooredoo', basePrice: 6800, sector: 'Telecom' },
  ITMG: { name: 'Indo Tambangraya Megah', basePrice: 28500, sector: 'Mining' },
  JPFA: { name: 'Japfa Comfeed Indonesia', basePrice: 1650, sector: 'Consumer' },
  JSMR: { name: 'Jasa Marga', basePrice: 5400, sector: 'Infrastructure' },
  KLBF: { name: 'Kalbe Farma', basePrice: 1650, sector: 'Healthcare' },
  MAPI: { name: 'Mitra Adiperkasa', basePrice: 1680, sector: 'Retail' },
  MEDC: { name: 'Medco Energi Internasional', basePrice: 1350, sector: 'Energy' },
  MIKA: { name: 'Mitra Keluarga Karyasehat', basePrice: 9200, sector: 'Healthcare' },
  MNCN: { name: 'Media Nusantara Citra', basePrice: 1250, sector: 'Media' },
  PGAS: { name: 'Perusahaan Gas Negara', basePrice: 1650, sector: 'Energy' },
  PTBA: { name: 'Bukit Asam', basePrice: 2640, sector: 'Mining' },
  SMGR: { name: 'Semen Indonesia', basePrice: 5500, sector: 'Industrial' },
  TBIG: { name: 'Tower Bersama Infrastructure', basePrice: 1580, sector: 'Infrastructure' },
  TINS: { name: 'Timah', basePrice: 1150, sector: 'Mining' },
  TPIA: { name: 'Chandra Asri Pacific', basePrice: 3150, sector: 'Petrochemical' },
  WIKA: { name: 'Wijaya Karya', basePrice: 720, sector: 'Construction' },
  HMSP: { name: 'HM Sampoerna', basePrice: 975, sector: 'Consumer' },
};

// ── Forex pair mappings ──────────────────────────────────────────────────────
const FOREX_BASE_CURRENCIES: Record<string, string> = {
  EURUSD: 'EUR',
  GBPUSD: 'GBP',
  USDJPY: 'JPY',
  USDIDR: 'IDR',
  AUDUSD: 'AUD',
  USDCAD: 'CAD',
  USDCHF: 'CHF',
  NZDUSD: 'NZD',
  USDSGD: 'SGD',
  EURGBP: 'EUR',
  EURJPY: 'EUR',
  GBPJPY: 'GBP',
  XAUUSD: 'XAU',
};

const FOREX_QUOTE_CURRENCIES: Record<string, string> = {
  EURUSD: 'USD',
  GBPUSD: 'USD',
  USDJPY: 'JPY',
  USDIDR: 'IDR',
  AUDUSD: 'USD',
  USDCAD: 'CAD',
  USDCHF: 'CHF',
  NZDUSD: 'USD',
  USDSGD: 'SGD',
  EURGBP: 'GBP',
  EURJPY: 'JPY',
  GBPJPY: 'JPY',
  XAUUSD: 'USD',
};

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
    hash |= 0; // Convert to 32-bit int
  }
  // Return value between 0 and 1
  return (Math.abs(hash) % 10000) / 10000;
}

/** Generate mock crypto price data (used as fallback when CoinGecko is unavailable) */
function generateMockCryptoPrice(symbol: string): Record<string, unknown> {
  const upper = symbol.toUpperCase();
  const basePrices: Record<string, number> = {
    BTCUSDT: 75937, BTC: 75937,
    ETHUSDT: 2312, ETH: 2312,
    BNBUSDT: 633, BNB: 633,
    XRPUSDT: 1.43, XRP: 1.43,
    ADAUSDT: 0.248, ADA: 0.248,
    SOLUSDT: 85.89, SOL: 85.89,
    DOTUSDT: 1.27, DOT: 1.27,
    DOGEUSDT: 0.095, DOGE: 0.095,
    AVAXUSDT: 9.35, AVAX: 9.35,
    MATICUSDT: 0.45, MATIC: 0.45,
    LINKUSDT: 9.39, LINK: 9.39,
    USDTUSDT: 1.0, USDT: 1.0,
    USDCUSDT: 1.0, USDC: 1.0,
    SHIBUSDT: 0.000012, SHIB: 0.000012,
    LTCUSDT: 108, LTC: 108,
    TRXUSDT: 0.25, TRX: 0.25,
    ATOMUSDT: 8.5, ATOM: 8.5,
    UNIUSDT: 7.2, UNI: 7.2,
    NEARUSDT: 2.7, NEAR: 2.7,
    ARBUSDT: 0.35, ARB: 0.35,
    OPUSDT: 1.1, OP: 1.1,
    INJUSDT: 11, INJ: 11,
  };

  const price = basePrices[upper] ?? (100 + seededRandom(upper) * 9000);
  const timeSeed = Math.floor(Date.now() / 60000).toString();
  const priceVariance = (seededRandom(upper + timeSeed) - 0.5) * price * 0.02;
  const finalPrice = price + priceVariance;
  const change24h = parseFloat(((seededRandom(upper + '24h') - 0.45) * 5).toFixed(2));
  const changeAbs = Math.abs(finalPrice * (change24h / 100));

  return {
    symbol: upper,
    type: 'crypto',
    price: parseFloat(finalPrice.toFixed(finalPrice < 1 ? 6 : 2)),
    change24h,
    volume: Math.floor(seededRandom(upper + 'vol') * 500000000),
    marketCap: Math.floor(finalPrice * (seededRandom(upper + 'mcap') * 50000000000)),
    high24h: parseFloat((finalPrice + changeAbs * 1.3).toFixed(finalPrice < 1 ? 6 : 2)),
    low24h: parseFloat((finalPrice - changeAbs * 1.3).toFixed(finalPrice < 1 ? 6 : 2)),
    mock: true,
  };
}

/** Generate mock OHLC data for a given price */
function generateMockOHLC(basePrice: number, days: number = 30, seed: string = 'default'): number[][] {
  const ohlc: number[][] = [];
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;
  let price = basePrice * (0.92 + seededRandom(seed + 'start') * 0.08);

  for (let i = days; i >= 0; i--) {
    const timestamp = now - i * dayMs;
    const volatility = basePrice * 0.02; // 2% volatility
    const change = (seededRandom(seed + i.toString()) - 0.45) * volatility;
    const open = price;
    const close = price + change;
    const high = Math.max(open, close) + seededRandom(seed + 'h' + i.toString()) * volatility * 0.5;
    const low = Math.min(open, close) - seededRandom(seed + 'l' + i.toString()) * volatility * 0.5;

    ohlc.push([
      timestamp,
      parseFloat(open.toFixed(2)),
      parseFloat(high.toFixed(2)),
      parseFloat(low.toFixed(2)),
      parseFloat(close.toFixed(2)),
    ]);

    price = close;
  }

  return ohlc;
}

// ── CoinMarketCap API helper ──────────────────────────────────────────────────

/** Fetch crypto price from CoinMarketCap API (requires CMC_API_KEY) */
async function fetchCMCPrice(symbol: string): Promise<Record<string, unknown> | null> {
  const apiKey = process.env.CMC_API_KEY;
  if (!apiKey) return null;
  try {
    const cmcSymbol = symbol.toUpperCase().replace('USDT', '');
    const url = `https://pro-api.coinmarketcap.com/v2/cryptocurrency/quotes/latest?symbol=${cmcSymbol}&convert=USD`;
    const res = await fetchWithTimeout(url, {
      next: { revalidate: 30 },
      timeoutMs: 8000,
      headers: { 'X-CMC_PRO_API_KEY': apiKey },
    });
    if (!res.ok) return null;
    const data = await res.json();
    const entry = data?.data?.[cmcSymbol];
    if (!entry?.quote?.USD) return null;
    const price = entry.quote.USD.price;
    if (typeof price !== 'number' || isNaN(price)) return null;
    const change24h = entry.quote.USD.percent_change_24h ?? 0;
    const marketCap = entry.quote.USD.market_cap ?? 0;
    const volume = entry.quote.USD.volume_24h ?? 0;
    const changeAbs = Math.abs(price * (change24h / 100));
    return {
      symbol: symbol.toUpperCase(),
      type: 'crypto',
      price,
      change24h: parseFloat(change24h.toFixed(2)),
      volume,
      marketCap,
      high24h: parseFloat((price + changeAbs * (0.3 + seededRandom(symbol + 'cmc-hi') * 0.7)).toFixed(2)),
      low24h: parseFloat((price - changeAbs * (0.3 + seededRandom(symbol + 'cmc-lo') * 0.7)).toFixed(2)),
      source: 'coinmarketcap',
    };
  } catch (error) {
    console.warn(`CMC price fetch failed for ${symbol}: ${error instanceof Error ? error.message : error}`);
    return null;
  }
}

/** Fetch crypto OHLC from CoinMarketCap (not available in free tier — always returns null) */
async function fetchCMCOHLC(_symbol: string, _days: number): Promise<{ ohlc: number[][]; volumes: number[] } | null> {
  return null;
}

// ── CoinGecko API helpers (fallback) ────────────────────────────────────────

/** Fetch crypto price data from CoinGecko */
async function fetchCryptoPrice(symbol: string): Promise<Record<string, unknown>> {
  const coinId = CRYPTO_SYMBOL_TO_ID[symbol.toUpperCase()];
  if (!coinId) {
    throw new Error(`Unknown crypto symbol: ${symbol}. Supported: ${Object.keys(CRYPTO_SYMBOL_TO_ID).join(', ')}`);
  }

  try {
    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd,idr&include_24hr_change=true&include_market_cap=true&include_24hr_vol=true`;

    const res = await fetchWithTimeout(url, {
      next: { revalidate: 30 },
      timeoutMs: 8000,
    });

    if (!res.ok) {
      console.warn(`CoinGecko price API returned ${res.status} for ${symbol}, using mock`);
      return generateMockCryptoPrice(symbol);
    }

    const data = await res.json();
    const coinData = data[coinId];

    if (!coinData || !coinData.usd) {
      console.warn(`CoinGecko returned no data for ${symbol}, using mock`);
      return generateMockCryptoPrice(symbol);
    }

    const price = coinData.usd;
    const change24h = coinData.usd_24h_change || 0;
    const marketCap = coinData.usd_market_cap || 0;
    const volume = coinData.usd_24h_vol || 0;
    const priceIdr = coinData.idr || 0;

    const changeAbs = Math.abs(price * (change24h / 100));
    const high24h = parseFloat((price + changeAbs * (0.3 + seededRandom(symbol + 'hi') * 0.7)).toFixed(2));
    const low24h = parseFloat((price - changeAbs * (0.3 + seededRandom(symbol + 'lo') * 0.7)).toFixed(2));

    return {
      symbol,
      type: 'crypto',
      coinId,
      price,
      priceIdr,
      change24h: parseFloat(change24h.toFixed(2)),
      volume,
      marketCap,
      high24h,
      low24h,
      source: 'coingecko',
    };
  } catch (error) {
    console.warn(`CoinGecko price fetch failed for ${symbol}: ${error instanceof Error ? error.message : error}, using mock`);
    return generateMockCryptoPrice(symbol);
  }
}

/** Fetch crypto OHLC data from CoinGecko (fallback) */
async function fetchCoinGeckoOHLC(symbol: string, days: number): Promise<{ ohlc: number[][]; volumes: number[] }> {
  const coinId = CRYPTO_SYMBOL_TO_ID[symbol.toUpperCase()];
  if (!coinId) {
    throw new Error(`Unknown crypto symbol: ${symbol}`);
  }

  const url = `https://api.coingecko.com/api/v3/coins/${coinId}/ohlc?vs_currency=usd&days=${days}`;

  const res = await fetchWithTimeout(url, {
    next: { revalidate: 300 },
    timeoutMs: 8000,
  });

  if (!res.ok) {
    console.warn(`CoinGecko OHLC API returned ${res.status} for ${symbol}, using mock`);
    return generateMockCryptoOHLC(symbol, days);
  }

  const ohlc = await res.json();

  if (!Array.isArray(ohlc) || ohlc.length === 0) {
    console.warn(`CoinGecko returned empty/invalid OHLC for ${symbol}, using mock`);
    return generateMockCryptoOHLC(symbol, days);
  }

  const valid = ohlc.every((entry: unknown) =>
    Array.isArray(entry) && entry.length === 5 && entry.every((v: unknown) => typeof v === 'number')
  );

  if (!valid) {
    console.warn(`CoinGecko OHLC data format invalid for ${symbol}, using mock`);
    return generateMockCryptoOHLC(symbol, days);
  }

  // CoinGecko doesn't provide volume in OHLC, return empty volumes
  return { ohlc, volumes: [] };
}

/** Generate mock crypto OHLC data using approximate base prices */
function generateMockCryptoOHLC(symbol: string, days: number): { ohlc: number[][]; volumes: number[] } {
  const mockPrice = generateMockCryptoPrice(symbol);
  const price = mockPrice.price as number;
  const ohlc = generateMockOHLC(price, days, symbol + 'mock');
  const volumes = ohlc.map(() => Math.floor(seededRandom(symbol + 'mockvol' + Math.random().toString()) * 1000000));
  return { ohlc, volumes };
}

// ── Unified crypto fetchers: CoinGecko primary, CMC fallback, mock last resort ──

/** Fetch crypto price: CoinGecko primary, CMC fallback, mock last resort */
async function fetchCryptoPriceUnified(symbol: string): Promise<Record<string, unknown>> {
  // Primary: CoinGecko (has market cap, IDR price, etc.)
  const coinGeckoResult = await fetchCryptoPrice(symbol);
  if (!coinGeckoResult.mock) return coinGeckoResult;

  // Fallback: CoinMarketCap (requires API key)
  const cmcResult = await fetchCMCPrice(symbol);
  if (cmcResult) return cmcResult;

  // Last resort: mock
  return coinGeckoResult;
}

/** Fetch crypto OHLC: CoinGecko primary, mock last resort */
async function fetchCryptoOHLCUnified(symbol: string, days: number): Promise<{ ohlc: number[][]; volumes: number[] }> {
  // Primary: CoinGecko (real OHLC data)
  try {
    const coinGeckoResult = await fetchCoinGeckoOHLC(symbol, days);
    return coinGeckoResult;
  } catch {
    return generateMockCryptoOHLC(symbol, days);
  }
}

// ── Forex & Saham helpers (unchanged) ───────────────────────────────────────

/** Fetch forex price data from exchange rate API (with mock fallback) */
async function fetchForexPrice(symbol: string): Promise<Record<string, unknown>> {
  const base = FOREX_BASE_CURRENCIES[symbol.toUpperCase()];
  const quote = FOREX_QUOTE_CURRENCIES[symbol.toUpperCase()];

  if (!base || !quote) {
    throw new Error(`Unknown forex pair: ${symbol}. Supported: ${Object.keys(FOREX_BASE_CURRENCIES).join(', ')}`);
  }

  const upper = symbol.toUpperCase();
  const isDirect = upper.startsWith('USD') || upper === 'XAUUSD';
  const queryBase = isDirect ? 'USD' : base;
  const decimals = upper.includes('IDR') || upper.includes('JPY') ? 2 : 4;

  try {
    const url = `https://open.er-api.com/v6/latest/${queryBase}`;

    const res = await fetchWithTimeout(url, {
      next: { revalidate: 3600 },
      timeoutMs: 8000,
    });

    if (!res.ok) {
      console.warn(`Exchange rate API returned ${res.status} for ${symbol}, using mock`);
      return generateMockForexPrice(symbol, upper, decimals);
    }

    const data = await res.json();
    const rates = data.rates;

    if (!rates || typeof rates !== 'object') {
      console.warn(`Exchange rate API returned invalid data for ${symbol}, using mock`);
      return generateMockForexPrice(symbol, upper, decimals);
    }

    let price: number;

    if (upper === 'XAUUSD') {
      price = 3325 + seededRandom(upper + Date.now().toString().slice(0, -4)) * 50;
    } else if (isDirect) {
      price = rates[quote] || 0;
    } else {
      price = rates['USD'] ? 1 / rates['USD'] : 0;
    }

    if (!price || price === 0) {
      console.warn(`Exchange rate API returned zero price for ${symbol}, using mock`);
      return generateMockForexPrice(symbol, upper, decimals);
    }

    const change24h = parseFloat(((seededRandom(symbol + '24h') - 0.45) * 1.2).toFixed(decimals));
    const changeAbs = Math.abs(price * (change24h / 100));
    const high24h = parseFloat((price + changeAbs * 1.5).toFixed(decimals));
    const low24h = parseFloat((price - changeAbs * 1.5).toFixed(decimals));

    return {
      symbol,
      type: 'forex',
      price: parseFloat(price.toFixed(decimals)),
      change24h,
      volume: 0,
      marketCap: 0,
      high24h,
      low24h,
    };
  } catch (error) {
    console.warn(`Forex fetch failed for ${symbol}: ${error instanceof Error ? error.message : error}, using mock`);
    return generateMockForexPrice(symbol, upper, decimals);
  }
}

/** Generate mock forex price data */
function generateMockForexPrice(symbol: string, upper: string, decimals: number): Record<string, unknown> {
  const mockRates: Record<string, number> = {
    EURUSD: 1.1776, GBPUSD: 1.3528, USDJPY: 158.80, USDIDR: 17136,
    AUDUSD: 0.7170, USDCAD: 1.3653, USDCHF: 0.8830, NZDUSD: 0.5897,
    USDSGD: 1.3410, EURGBP: 0.8705, EURJPY: 187.00, GBPJPY: 214.80,
    XAUUSD: 3325,
  };
  const price = mockRates[upper] ?? 1.0;
  const timeSeed = Math.floor(Date.now() / 60000).toString();
  const variance = (seededRandom(upper + timeSeed) - 0.5) * price * 0.004;
  const finalPrice = price + variance;
  const change24h = parseFloat(((seededRandom(upper + '24h') - 0.45) * 1.2).toFixed(decimals));
  const changeAbs = Math.abs(finalPrice * (change24h / 100));

  return {
    symbol,
    type: 'forex',
    price: parseFloat(finalPrice.toFixed(decimals)),
    change24h,
    volume: 0,
    marketCap: 0,
    high24h: parseFloat((finalPrice + changeAbs * 1.5).toFixed(decimals)),
    low24h: parseFloat((finalPrice - changeAbs * 1.5).toFixed(decimals)),
    mock: true,
  };
}

/** Fetch saham price from Yahoo Finance with mock fallback */
async function fetchSahamPrice(symbol: string): Promise<Record<string, unknown>> {
  const upper = symbol.toUpperCase();
  const mockInfo = SAHAM_MOCK_DATA[upper];

  // Try Yahoo Finance first
  try {
    const yahooSymbol = `${upper}.JK`;
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}?interval=1d&range=5d`;
    const res = await fetchWithTimeout(url, {
      timeoutMs: 5000,
      headers: { 'User-Agent': 'Mozilla/5.0' },
    });
    if (res.ok) {
      const data = await res.json();
      const meta = data?.chart?.result?.[0]?.meta;
      if (meta && typeof meta.regularMarketPrice === 'number') {
        const price = meta.regularMarketPrice;
        const prevClose = meta.chartPreviousClose;
        const change24h = prevClose ? parseFloat((((price - prevClose) / prevClose) * 100).toFixed(2)) : 0;
        const changeAbs = Math.abs(price * (change24h / 100));
        return {
          symbol: upper,
          type: 'saham',
          name: mockInfo?.name || upper,
          sector: mockInfo?.sector,
          price: parseFloat(price.toFixed(0)),
          change24h,
          volume: Math.floor(seededRandom(upper + 'vol') * 80000000),
          marketCap: Math.floor(price * (seededRandom(upper + 'mcap') * 50000000000)),
          high24h: parseFloat((price + changeAbs * 1.2).toFixed(0)),
          low24h: parseFloat((price - changeAbs * 1.2).toFixed(0)),
          source: 'yahoo',
        };
      }
    }
  } catch {
    // Fall through to mock
  }

  // Mock fallback
  if (!mockInfo) {
    const basePrice = 1000 + seededRandom(symbol) * 9000;
    const change24h = parseFloat(((seededRandom(symbol + 'ch') - 0.45) * 4).toFixed(2));
    return {
      symbol: upper,
      type: 'saham',
      name: symbol,
      price: parseFloat(basePrice.toFixed(0)),
      change24h,
      volume: Math.floor(seededRandom(symbol + 'vol') * 50000000),
      marketCap: Math.floor(basePrice * (seededRandom(symbol + 'mcap') * 10000000000)),
      high24h: parseFloat((basePrice * (1 + Math.abs(change24h) / 100 * 0.8)).toFixed(0)),
      low24h: parseFloat((basePrice * (1 - Math.abs(change24h) / 100 * 0.8)).toFixed(0)),
      mock: true,
    };
  }

  const timeSeed = Math.floor(Date.now() / 60000).toString();
  const priceVariance = (seededRandom(upper + timeSeed) - 0.5) * mockInfo.basePrice * 0.02;
  const price = mockInfo.basePrice + priceVariance;
  const change24h = parseFloat(((seededRandom(upper + '24h') - 0.45) * 3.5).toFixed(2));
  const changeAbs = Math.abs(price * (change24h / 100));

  return {
    symbol: upper,
    type: 'saham',
    name: mockInfo.name,
    sector: mockInfo.sector,
    price: parseFloat(price.toFixed(0)),
    change24h,
    volume: Math.floor(seededRandom(upper + 'vol') * 80000000),
    marketCap: Math.floor(price * (seededRandom(upper + 'mcap') * 50000000000)),
    high24h: parseFloat((price + changeAbs * 1.2).toFixed(0)),
    low24h: parseFloat((price - changeAbs * 1.2).toFixed(0)),
    mock: true,
  };
}

/** Generate mock saham OHLC data */
function fetchSahamOHLC(symbol: string, days: number = 30): { ohlc: number[][] } {
  const upper = symbol.toUpperCase();
  const mockInfo = SAHAM_MOCK_DATA[upper];
  const basePrice = mockInfo ? mockInfo.basePrice : (1000 + seededRandom(symbol) * 9000);

  return { ohlc: generateMockOHLC(basePrice, days, upper) };
}

/** Generate mock forex OHLC data */
async function fetchForexOHLC(symbol: string, days: number = 30): Promise<{ ohlc: number[][] }> {
  try {
    const priceData = await fetchForexPrice(symbol);
    const price = priceData.price as number;
    return { ohlc: generateMockOHLC(price, days, symbol + 'forex') };
  } catch {
    const mockRates: Record<string, number> = {
      EURUSD: 1.1776, GBPUSD: 1.3528, USDJPY: 158.80, USDIDR: 17136,
      AUDUSD: 0.7170, USDCAD: 1.3653, USDCHF: 0.8830, NZDUSD: 0.5897,
      USDSGD: 1.3410, EURGBP: 0.8705, EURJPY: 187.00, GBPJPY: 214.80,
      XAUUSD: 3325,
    };
    const price = mockRates[symbol.toUpperCase()] ?? 1.0;
    return { ohlc: generateMockOHLC(price, days, symbol + 'forex') };
  }
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

    const type = searchParams.get('type');
    const symbol = searchParams.get('symbol');
    const chart = searchParams.get('chart') === 'true';
    const days = parseInt(searchParams.get('days') || '30', 10);

    if (!type || !symbol) {
      return NextResponse.json(
        { error: 'Missing required query parameters: type and symbol' },
        { status: 400 }
      );
    }

    if (!['saham', 'crypto', 'forex'].includes(type)) {
      return NextResponse.json(
        { error: 'Type must be saham, crypto, or forex' },
        { status: 400 }
      );
    }

    if (chart) {
      // Return OHLC chart data
      switch (type) {
        case 'crypto': {
          const cryptoData = await fetchCryptoOHLCUnified(symbol, days);
          return NextResponse.json({
            symbol: symbol.toUpperCase(),
            type,
            days,
            ohlc: cryptoData.ohlc,
            volumes: cryptoData.volumes,
          });
        }
        case 'forex': {
          const forexData = await fetchForexOHLC(symbol, days);
          return NextResponse.json({
            symbol: symbol.toUpperCase(),
            type,
            days,
            ...forexData,
          });
        }
        case 'saham': {
          const sahamData = fetchSahamOHLC(symbol, days);
          return NextResponse.json({
            symbol: symbol.toUpperCase(),
            type,
            days,
            ...sahamData,
          });
        }
        default:
          return NextResponse.json(
            { error: 'Invalid asset type' },
            { status: 400 }
          );
      }
    }

    // Return price data
    let priceData: Record<string, unknown>;

    switch (type) {
      case 'crypto':
        priceData = await fetchCryptoPriceUnified(symbol);
        break;
      case 'forex':
        priceData = await fetchForexPrice(symbol);
        break;
      case 'saham':
        priceData = await fetchSahamPrice(symbol);
        break;
      default:
        return NextResponse.json(
          { error: 'Invalid asset type' },
          { status: 400 }
        );
    }

    return NextResponse.json(priceData);
  } catch (error) {
    console.error('Market data GET error:', error);

    const message = error instanceof Error ? error.message : 'Failed to fetch market data';
    const status = message.includes('Unknown') ? 400 : 500;

    return NextResponse.json(
      { error: message },
      { status }
    );
  }
}
