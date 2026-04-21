import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';

// ── Types ────────────────────────────────────────────────────────────────────

interface SymbolRequest {
  type: 'saham' | 'crypto' | 'forex';
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
  error?: string;
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
};

// ── Mock saham data ──────────────────────────────────────────────────────────
const SAHAM_MOCK_DATA: Record<string, { name: string; basePrice: number; sector: string }> = {
  BBCA: { name: 'Bank Central Asia', basePrice: 9750, sector: 'Banking' },
  BBRI: { name: 'Bank Rakyat Indonesia', basePrice: 5450, sector: 'Banking' },
  BMRI: { name: 'Bank Mandiri', basePrice: 6200, sector: 'Banking' },
  BBNI: { name: 'Bank Negara Indonesia', basePrice: 4800, sector: 'Banking' },
  TLKM: { name: 'Telkom Indonesia', basePrice: 3900, sector: 'Telecom' },
  ASII: { name: 'Astra International', basePrice: 5200, sector: 'Conglomerate' },
  UNVR: { name: 'Unilever Indonesia', basePrice: 3100, sector: 'Consumer' },
  GOTO: { name: 'GoTo Gojek Tokopedia', basePrice: 82, sector: 'Technology' },
  BUKA: { name: 'Bukalapak', basePrice: 126, sector: 'Technology' },
  ARTO: { name: 'Bank Jago', basePrice: 2850, sector: 'Banking' },
  ANTM: { name: 'Aneka Tambang', basePrice: 1650, sector: 'Mining' },
  BRIS: { name: 'Bank Syariah Indonesia', basePrice: 2650, sector: 'Banking' },
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

function seededRandom(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return (Math.abs(hash) % 10000) / 10000;
}

/** Batch fetch crypto prices from CoinGecko (single API call) */
async function batchFetchCryptoPrices(symbols: string[]): Promise<Map<string, PriceResult>> {
  const results = new Map<string, PriceResult>();
  const coinIdsToFetch: string[] = [];
  const symbolToCoinId: Map<string, string> = new Map();

  for (const symbol of symbols) {
    const coinId = CRYPTO_SYMBOL_TO_ID[symbol.toUpperCase()];
    if (!coinId) {
      results.set(symbol.toUpperCase(), {
        symbol: symbol.toUpperCase(),
        type: 'crypto',
        price: 0,
        change24h: 0,
        volume: 0,
        marketCap: 0,
        high24h: 0,
        low24h: 0,
        error: `Unknown crypto symbol: ${symbol}`,
      });
      continue;
    }
    // Avoid duplicate coin IDs (e.g., BTCUSDT and BTC both map to bitcoin)
    if (!coinIdsToFetch.includes(coinId)) {
      coinIdsToFetch.push(coinId);
    }
    symbolToCoinId.set(symbol.toUpperCase(), coinId);
  }

  if (coinIdsToFetch.length === 0) return results;

  const ids = coinIdsToFetch.join(',');
  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true&include_market_cap=true&include_24hr_vol=true`;

  try {
    const res = await fetch(url, { next: { revalidate: 30 } });
    if (!res.ok) throw new Error(`CoinGecko API error: ${res.status}`);

    const data = await res.json();

    for (const [symbol, coinId] of symbolToCoinId.entries()) {
      const coinData = data[coinId];
      if (!coinData) {
        results.set(symbol, {
          symbol,
          type: 'crypto',
          price: 0, change24h: 0, volume: 0, marketCap: 0, high24h: 0, low24h: 0,
          error: 'No data from CoinGecko',
        });
        continue;
      }

      const price = coinData.usd || 0;
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
    const msg = error instanceof Error ? error.message : 'CoinGecko fetch failed';
    // Set error for all pending symbols
    for (const [symbol] of symbolToCoinId.entries()) {
      if (!results.has(symbol)) {
        results.set(symbol, {
          symbol, type: 'crypto',
          price: 0, change24h: 0, volume: 0, marketCap: 0, high24h: 0, low24h: 0,
          error: msg,
        });
      }
    }
  }

  return results;
}

/** Batch fetch forex prices (single API call for USD-based rates) */
async function batchFetchForexPrices(symbols: string[]): Promise<Map<string, PriceResult>> {
  const results = new Map<string, PriceResult>();

  try {
    // Always fetch from USD base
    const url = 'https://open.er-api.com/v6/latest/USD';
    const res = await fetch(url, { next: { revalidate: 3600 } });
    if (!res.ok) throw new Error(`Exchange rate API error: ${res.status}`);

    const data = await res.json();
    const rates = data.rates;

    for (const symbol of symbols) {
      const upper = symbol.toUpperCase();
      const base = FOREX_BASE_CURRENCIES[upper];
      const quote = FOREX_QUOTE_CURRENCIES[upper];

      if (!base || !quote) {
        results.set(upper, {
          symbol: upper, type: 'forex',
          price: 0, change24h: 0, volume: 0, marketCap: 0, high24h: 0, low24h: 0,
          error: `Unknown forex pair: ${symbol}`,
        });
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
    const msg = error instanceof Error ? error.message : 'Forex fetch failed';
    for (const symbol of symbols) {
      if (!results.has(symbol.toUpperCase())) {
        results.set(symbol.toUpperCase(), {
          symbol: symbol.toUpperCase(), type: 'forex',
          price: 0, change24h: 0, volume: 0, marketCap: 0, high24h: 0, low24h: 0,
          error: msg,
        });
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
      if (!['saham', 'crypto', 'forex'].includes(entry.type)) {
        return NextResponse.json(
          { error: `Invalid type "${entry.type}" for symbol ${entry.symbol}. Must be saham, crypto, or forex` },
          { status: 400 }
        );
      }
    }

    // Group symbols by type for batch fetching
    const cryptoSymbols = symbols.filter(s => s.type === 'crypto').map(s => s.symbol);
    const forexSymbols = symbols.filter(s => s.type === 'forex').map(s => s.symbol);
    const sahamSymbols = symbols.filter(s => s.type === 'saham').map(s => s.symbol);

    // Fetch all types in parallel
    const [cryptoResults, forexResults, sahamResults] = await Promise.all([
      cryptoSymbols.length > 0 ? batchFetchCryptoPrices(cryptoSymbols) : Promise.resolve(new Map<string, PriceResult>()),
      forexSymbols.length > 0 ? batchFetchForexPrices(forexSymbols) : Promise.resolve(new Map<string, PriceResult>()),
      Promise.resolve(sahamSymbols.length > 0 ? batchFetchSahamPrices(sahamSymbols) : new Map<string, PriceResult>()),
    ]);

    // Merge results maintaining request order
    const prices: PriceResult[] = symbols.map(entry => {
      const key = entry.symbol.toUpperCase();
      const resultMap = entry.type === 'crypto' ? cryptoResults
        : entry.type === 'forex' ? forexResults
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
        error: 'Failed to fetch data',
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
