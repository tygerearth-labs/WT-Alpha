import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';

// ── Types ────────────────────────────────────────────────────────────────────

interface SymbolRequest {
  type: 'saham' | 'crypto' | 'forex' | 'komoditas' | 'indeks';
  symbol: string;
}

interface PriceResult {
  symbol: string;
  type: string;
  price: number;
  change24h: number;
  volume: number;
  marketCap: number;
  high24h: number;
  low24h: number;
  name?: string;
  sector?: string;
}

// ── Crypto symbol → CoinGecko ID mapping ────────────────────────────────────
const CRYPTO_SYMBOL_TO_ID: Record<string, string> = {
  BTCUSDT: 'bitcoin', BTC: 'bitcoin',
  ETHUSDT: 'ethereum', ETH: 'ethereum',
  BNBUSDT: 'binancecoin', BNB: 'binancecoin',
  XRPUSDT: 'ripple', XRP: 'ripple',
  ADAUSDT: 'cardano', ADA: 'cardano',
  SOLUSDT: 'solana', SOL: 'solana',
  DOTUSDT: 'polkadot', DOT: 'polkadot',
  DOGEUSDT: 'dogecoin', DOGE: 'dogecoin',
  AVAXUSDT: 'avalanche-2', AVAX: 'avalanche-2',
  MATICUSDT: 'matic-network', MATIC: 'matic-network',
  LINKUSDT: 'chainlink', LINK: 'chainlink',
  USDTUSDT: 'tether', USDT: 'tether',
  USDCUSDT: 'usd-coin', USDC: 'usd-coin',
  SHIBUSDT: 'shiba-inu', SHIB: 'shiba-inu',
  LTCUSDT: 'litecoin', LTC: 'litecoin',
  TRXUSDT: 'tron', TRX: 'tron',
  ATOMUSDT: 'cosmos', ATOM: 'cosmos',
  UNIUSDT: 'uniswap', UNI: 'uniswap',
  NEARUSDT: 'near', NEAR: 'near',
  ARBUSDT: 'arbitrum', ARB: 'arbitrum',
  OPUSDT: 'optimism', OP: 'optimism',
  INJUSDT: 'injective-protocol', INJ: 'injective-protocol',
};

// ── Mock saham data ──────────────────────────────────────────────────────────
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
  ANTM: { name: 'Aneka Tambang', basePrice: 1350, sector: 'Mining' },
  BRIS: { name: 'Bank Syariah Indonesia', basePrice: 2400, sector: 'Banking' },
  CPIN: { name: 'Charoen Pokphand Indonesia', basePrice: 7800, sector: 'Consumer' },
  INCO: { name: 'Vale Indonesia', basePrice: 3950, sector: 'Mining' },
  JSMR: { name: 'Jasa Marga', basePrice: 5400, sector: 'Infrastructure' },
  KLBF: { name: 'Kalbe Farma', basePrice: 1650, sector: 'Healthcare' },
  PGAS: { name: 'Perusahaan Gas Negara', basePrice: 1650, sector: 'Energy' },
  SMGR: { name: 'Semen Indonesia', basePrice: 5500, sector: 'Industrial' },
  TBIG: { name: 'Tower Bersama Infrastructure', basePrice: 1580, sector: 'Infrastructure' },
  WIKA: { name: 'Wijaya Karya', basePrice: 720, sector: 'Construction' },
};

// ── Forex pair mappings ──────────────────────────────────────────────────────
const FOREX_BASE_CURRENCIES: Record<string, string> = {
  EURUSD: 'EUR', GBPUSD: 'GBP', USDJPY: 'JPY', USDIDR: 'IDR',
  AUDUSD: 'AUD', USDCAD: 'CAD', USDCHF: 'CHF', NZDUSD: 'NZD',
  USDSGD: 'SGD', XAUUSD: 'XAU',
};
const FOREX_QUOTE_CURRENCIES: Record<string, string> = {
  EURUSD: 'USD', GBPUSD: 'USD', USDJPY: 'JPY', USDIDR: 'IDR',
  AUDUSD: 'USD', USDCAD: 'CAD', USDCHF: 'CHF', NZDUSD: 'USD',
  USDSGD: 'SGD', XAUUSD: 'USD',
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

// ── Mock fallbacks ───────────────────────────────────────────────────────────

const CRYPTO_MOCK_PRICES: Record<string, number> = {
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

function mockCryptoPrice(symbol: string): PriceResult {
  const base = CRYPTO_MOCK_PRICES[symbol.toUpperCase()] ?? (100 + seededRandom(symbol) * 9000);
  const timeSeed = Math.floor(Date.now() / 60000).toString();
  const variance = (seededRandom(symbol + timeSeed) - 0.5) * base * 0.02;
  const price = base + variance;
  const change24h = parseFloat(((seededRandom(symbol + '24h') - 0.45) * 5).toFixed(2));
  const changeAbs = Math.abs(price * (change24h / 100));

  return {
    symbol: symbol.toUpperCase(),
    type: 'crypto',
    price: parseFloat(price.toFixed(price < 1 ? 6 : 2)),
    change24h,
    volume: Math.floor(seededRandom(symbol + 'vol') * 500000000),
    marketCap: Math.floor(price * (seededRandom(symbol + 'mcap') * 50000000000)),
    high24h: parseFloat((price + changeAbs * 1.3).toFixed(price < 1 ? 6 : 2)),
    low24h: parseFloat((price - changeAbs * 1.3).toFixed(price < 1 ? 6 : 2)),
  };
}

const FOREX_MOCK_RATES: Record<string, number> = {
  EURUSD: 1.1776, GBPUSD: 1.3528, USDJPY: 158.80, USDIDR: 17136,
  AUDUSD: 0.7170, USDCAD: 1.3653, USDCHF: 0.8830, NZDUSD: 0.5897,
  USDSGD: 1.3410, XAUUSD: 3325,
};

function mockForexPrice(symbol: string): PriceResult {
  const upper = symbol.toUpperCase();
  const base = FOREX_MOCK_RATES[upper] ?? 1.0;
  const timeSeed = Math.floor(Date.now() / 60000).toString();
  const variance = (seededRandom(upper + timeSeed) - 0.5) * base * 0.004;
  const price = base + variance;
  const decimals = upper.includes('IDR') || upper.includes('JPY') ? 2 : 4;
  const change24h = parseFloat(((seededRandom(upper + '24h') - 0.45) * 1.2).toFixed(decimals));
  const changeAbs = Math.abs(price * (change24h / 100));

  return {
    symbol: upper,
    type: 'forex',
    price: parseFloat(price.toFixed(decimals)),
    change24h,
    volume: 0,
    marketCap: 0,
    high24h: parseFloat((price + changeAbs * 1.5).toFixed(decimals)),
    low24h: parseFloat((price - changeAbs * 1.5).toFixed(decimals)),
  };
}

// ── Batch fetchers ───────────────────────────────────────────────────────────

/** Batch fetch crypto prices from Binance (primary — all symbols in ONE call) */
async function batchFetchCryptoPricesBinance(symbols: string[]): Promise<Map<string, PriceResult> | null> {
  try {
    const url = 'https://api.binance.com/api/v3/ticker/24hr';
    const res = await fetchWithTimeout(url, { next: { revalidate: 30 }, timeoutMs: 8000 });

    if (!res.ok) {
      console.warn(`Binance batch ticker returned ${res.status}`);
      return null;
    }

    const allTickers = await res.json();
    if (!Array.isArray(allTickers)) return null;

    // Build a lookup map for the symbols we need
    const neededBinanceSymbols = new Set<string>();
    const requestedToBinance = new Map<string, string>(); // requested symbol -> binance symbol
    for (const symbol of symbols) {
      const binanceSym = toBinanceSymbol(symbol);
      neededBinanceSymbols.add(binanceSym);
      requestedToBinance.set(symbol.toUpperCase(), binanceSym);
    }

    // Build a fast lookup from Binance response
    const tickerMap = new Map<string, {
      lastPrice: string;
      priceChangePercent: string;
      quoteVolume: string;
      highPrice: string;
      lowPrice: string;
    }>();

    for (const ticker of allTickers) {
      if (ticker && ticker.symbol && neededBinanceSymbols.has(ticker.symbol)) {
        tickerMap.set(ticker.symbol, {
          lastPrice: ticker.lastPrice,
          priceChangePercent: ticker.priceChangePercent,
          quoteVolume: ticker.quoteVolume,
          highPrice: ticker.highPrice,
          lowPrice: ticker.lowPrice,
        });
      }
    }

    // Map back to requested symbols
    const results = new Map<string, PriceResult>();
    for (const [requested, binanceSym] of requestedToBinance.entries()) {
      const ticker = tickerMap.get(binanceSym);
      if (ticker) {
        const price = parseFloat(ticker.lastPrice);
        if (isNaN(price) || price === 0) {
          results.set(requested, mockCryptoPrice(requested));
          continue;
        }
        results.set(requested, {
          symbol: requested,
          type: 'crypto',
          price,
          change24h: parseFloat(parseFloat(ticker.priceChangePercent).toFixed(2)),
          volume: parseFloat(ticker.quoteVolume) || 0,
          marketCap: 0,
          high24h: parseFloat(ticker.highPrice),
          low24h: parseFloat(ticker.lowPrice),
        });
      } else {
        results.set(requested, mockCryptoPrice(requested));
      }
    }

    return results;
  } catch (error) {
    console.warn(`Binance batch fetch failed: ${error instanceof Error ? error.message : error}`);
    return null;
  }
}

/** Batch fetch crypto prices from CoinGecko (fallback) */
async function batchFetchCryptoPricesCoinGecko(symbols: string[]): Promise<Map<string, PriceResult>> {
  const results = new Map<string, PriceResult>();
  const coinIdsToFetch: string[] = [];
  const symbolToCoinId: Map<string, string> = new Map();

  for (const symbol of symbols) {
    const coinId = CRYPTO_SYMBOL_TO_ID[symbol.toUpperCase()];
    if (!coinId) {
      results.set(symbol.toUpperCase(), mockCryptoPrice(symbol));
      continue;
    }
    if (!coinIdsToFetch.includes(coinId)) {
      coinIdsToFetch.push(coinId);
    }
    symbolToCoinId.set(symbol.toUpperCase(), coinId);
  }

  if (coinIdsToFetch.length === 0) return results;

  const ids = coinIdsToFetch.join(',');
  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true&include_market_cap=true&include_24hr_vol=true`;

  try {
    const res = await fetchWithTimeout(url, { next: { revalidate: 30 }, timeoutMs: 8000 });
    if (!res.ok) {
      console.warn(`Batch CoinGecko API returned ${res.status}, using mock for all crypto symbols`);
      for (const [symbol] of symbolToCoinId.entries()) {
        results.set(symbol, mockCryptoPrice(symbol));
      }
      return results;
    }

    const data = await res.json();

    for (const [symbol, coinId] of symbolToCoinId.entries()) {
      const coinData = data[coinId];
      if (!coinData || !coinData.usd) {
        results.set(symbol, mockCryptoPrice(symbol));
        continue;
      }

      const price = coinData.usd;
      const change24h = coinData.usd_24h_change || 0;
      const changeAbs = Math.abs(price * (change24h / 100));

      results.set(symbol, {
        symbol,
        type: 'crypto',
        price,
        change24h: parseFloat(change24h.toFixed(2)),
        volume: coinData.usd_24h_vol || 0,
        marketCap: coinData.usd_market_cap || 0,
        high24h: parseFloat((price + changeAbs * (0.3 + seededRandom(symbol + 'hi') * 0.7)).toFixed(2)),
        low24h: parseFloat((price - changeAbs * (0.3 + seededRandom(symbol + 'lo') * 0.7)).toFixed(2)),
      });
    }
  } catch (error) {
    console.warn(`Batch CoinGecko fetch failed: ${error instanceof Error ? error.message : error}, using mock for all crypto symbols`);
    for (const [symbol] of symbolToCoinId.entries()) {
      if (!results.has(symbol)) {
        results.set(symbol, mockCryptoPrice(symbol));
      }
    }
  }

  return results;
}

/** Unified batch crypto fetch: Binance primary, CoinGecko fallback, mock last resort */
async function batchFetchCryptoPrices(symbols: string[]): Promise<Map<string, PriceResult>> {
  if (symbols.length === 0) return new Map();

  // Try Binance first (one API call for all symbols)
  const binanceResults = await batchFetchCryptoPricesBinance(symbols);
  if (binanceResults) return binanceResults;

  // Fallback: CoinGecko
  return batchFetchCryptoPricesCoinGecko(symbols);
}

/** Batch fetch forex prices (single API call for USD-based rates, with mock fallback) */
async function batchFetchForexPrices(symbols: string[]): Promise<Map<string, PriceResult>> {
  const results = new Map<string, PriceResult>();

  try {
    const url = 'https://open.er-api.com/v6/latest/USD';
    const res = await fetchWithTimeout(url, { next: { revalidate: 3600 }, timeoutMs: 8000 });
    if (!res.ok) {
      console.warn(`Batch forex API returned ${res.status}, using mock for all forex symbols`);
      for (const symbol of symbols) {
        results.set(symbol.toUpperCase(), mockForexPrice(symbol));
      }
      return results;
    }

    const data = await res.json();
    const rates = data.rates;

    if (!rates || typeof rates !== 'object') {
      console.warn('Batch forex API returned invalid data, using mock for all forex symbols');
      for (const symbol of symbols) {
        results.set(symbol.toUpperCase(), mockForexPrice(symbol));
      }
      return results;
    }

    for (const symbol of symbols) {
      const upper = symbol.toUpperCase();
      const base = FOREX_BASE_CURRENCIES[upper];
      const quote = FOREX_QUOTE_CURRENCIES[upper];

      if (!base || !quote) {
        results.set(upper, mockForexPrice(symbol));
        continue;
      }

      const isDirect = upper.startsWith('USD') || upper === 'XAUUSD';
      let price: number;

      if (upper === 'XAUUSD') {
        price = 2350 + seededRandom(upper + Date.now().toString().slice(0, -4)) * 50;
      } else if (isDirect) {
        price = rates[quote] || 0;
      } else {
        price = rates['USD'] ? 1 / rates['USD'] : 0;
      }

      if (!price || price === 0) {
        results.set(upper, mockForexPrice(symbol));
        continue;
      }

      const change24h = parseFloat(((seededRandom(upper + '24h') - 0.45) * 1.2).toFixed(4));
      const changeAbs = Math.abs(price * (change24h / 100));
      const decimals = upper.includes('IDR') || upper.includes('JPY') ? 2 : 4;

      results.set(upper, {
        symbol: upper,
        type: 'forex',
        price: parseFloat(price.toFixed(decimals)),
        change24h,
        volume: 0,
        marketCap: 0,
        high24h: parseFloat((price + changeAbs * 1.5).toFixed(decimals)),
        low24h: parseFloat((price - changeAbs * 1.5).toFixed(decimals)),
      });
    }
  } catch (error) {
    console.warn(`Batch forex fetch failed: ${error instanceof Error ? error.message : error}, using mock for all forex symbols`);
    for (const symbol of symbols) {
      if (!results.has(symbol.toUpperCase())) {
        results.set(symbol.toUpperCase(), mockForexPrice(symbol));
      }
    }
  }

  return results;
}

/** Generate mock saham prices */
function batchFetchSahamPrices(symbols: string[]): Map<string, PriceResult> {
  const results = new Map<string, PriceResult>();
  const timeSeed = Math.floor(Date.now() / 60000).toString();

  for (const symbol of symbols) {
    const upper = symbol.toUpperCase();
    const mockInfo = SAHAM_MOCK_DATA[upper];

    if (!mockInfo) {
      const basePrice = 1000 + seededRandom(symbol) * 9000;
      const change24h = parseFloat(((seededRandom(symbol + 'ch') - 0.45) * 4).toFixed(2));
      const changeAbs = Math.abs(basePrice * (change24h / 100));

      results.set(upper, {
        symbol: upper, type: 'saham',
        price: parseFloat(basePrice.toFixed(0)),
        change24h,
        volume: Math.floor(seededRandom(symbol + 'vol') * 50000000),
        marketCap: Math.floor(basePrice * (seededRandom(symbol + 'mcap') * 10000000000)),
        high24h: parseFloat((basePrice + changeAbs * 0.8).toFixed(0)),
        low24h: parseFloat((basePrice - changeAbs * 0.8).toFixed(0)),
      });
      continue;
    }

    const priceVariance = (seededRandom(upper + timeSeed) - 0.5) * mockInfo.basePrice * 0.02;
    const price = mockInfo.basePrice + priceVariance;
    const change24h = parseFloat(((seededRandom(upper + '24h') - 0.45) * 3.5).toFixed(2));
    const changeAbs = Math.abs(price * (change24h / 100));

    results.set(upper, {
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
    });
  }

  return results;
}

// ── POST Handler ─────────────────────────────────────────────────────────────

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ businessId: string }> }
) {
  try {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;

    const { businessId } = await params;
    const body = await request.json();
    const { symbols } = body as { symbols?: SymbolRequest[] };

    if (!symbols || !Array.isArray(symbols) || symbols.length === 0) {
      return NextResponse.json(
        { error: 'Request body must include a non-empty symbols array' },
        { status: 400 }
      );
    }

    if (symbols.length > 50) {
      return NextResponse.json(
        { error: 'Maximum 50 symbols per batch request' },
        { status: 400 }
      );
    }

    // Validate all symbol entries
    for (const entry of symbols) {
      if (!entry.type || !entry.symbol) {
        return NextResponse.json(
          { error: 'Each symbol entry must have type and symbol fields' },
          { status: 400 }
        );
      }
      if (!['saham', 'crypto', 'forex', 'komoditas', 'indeks'].includes(entry.type)) {
        return NextResponse.json(
          { error: `Invalid type "${entry.type}" for symbol ${entry.symbol}. Must be saham, crypto, forex, komoditas, or indeks` },
          { status: 400 }
        );
      }
    }

    // Group symbols by type for batch fetching
    const cryptoSymbols = symbols.filter(s => s.type === 'crypto').map(s => s.symbol);
    const forexSymbols = symbols.filter(s => s.type === 'forex').map(s => s.symbol);
    const sahamSymbols = symbols.filter(s => s.type === 'saham').map(s => s.symbol);
    const komoditasSymbols = symbols.filter(s => s.type === 'komoditas').map(s => s.symbol);
    const indeksSymbols = symbols.filter(s => s.type === 'indeks').map(s => s.symbol);

    // Fetch all types in parallel (komoditas/indeks use saham mock as base)
    const [cryptoResults, forexResults, sahamResults, komoditasResults, indeksResults] = await Promise.all([
      cryptoSymbols.length > 0 ? batchFetchCryptoPrices(cryptoSymbols) : Promise.resolve(new Map<string, PriceResult>()),
      forexSymbols.length > 0 ? batchFetchForexPrices(forexSymbols) : Promise.resolve(new Map<string, PriceResult>()),
      Promise.resolve(sahamSymbols.length > 0 ? batchFetchSahamPrices(sahamSymbols) : new Map<string, PriceResult>()),
      Promise.resolve(komoditasSymbols.length > 0 ? batchFetchSahamPrices(komoditasSymbols) : new Map<string, PriceResult>()),
      Promise.resolve(indeksSymbols.length > 0 ? batchFetchSahamPrices(indeksSymbols) : new Map<string, PriceResult>()),
    ]);

    // Merge results maintaining request order
    const prices: PriceResult[] = symbols.map(entry => {
      const key = entry.symbol.toUpperCase();
      const resultMap = entry.type === 'crypto' ? cryptoResults
        : entry.type === 'forex' ? forexResults
        : entry.type === 'komoditas' ? komoditasResults
        : entry.type === 'indeks' ? indeksResults
        : sahamResults;

      return resultMap.get(key) || {
        symbol: key,
        type: entry.type,
        price: 0,
        change24h: 0,
        volume: 0,
        marketCap: 0,
        high24h: 0,
        low24h: 0,
      };
    });

    return NextResponse.json({
      prices,
      count: prices.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Market data batch POST error:', error);

    return NextResponse.json(
      { error: 'Failed to fetch batch market data' },
      { status: 500 }
    );
  }
}
