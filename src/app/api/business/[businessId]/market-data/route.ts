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
  BBRI: { name: 'Bank Rakyat Indonesia', basePrice: 5450, sector: 'Banking' },
  BMRI: { name: 'Bank Mandiri', basePrice: 6200, sector: 'Banking' },
  BBNI: { name: 'Bank Negara Indonesia', basePrice: 4800, sector: 'Banking' },
  TLKM: { name: 'Telkom Indonesia', basePrice: 3900, sector: 'Telecom' },
  ASII: { name: 'Astra International', basePrice: 5200, sector: 'Conglomerate' },
  UNVR: { name: 'Unilever Indonesia', basePrice: 3100, sector: 'Consumer' },
  GOTO: { name: 'GoTo Gojek Tokopedia', basePrice: 82, sector: 'Technology' },
  BUKA: { name: 'Bukalapak', basePrice: 126, sector: 'Technology' },
  ARTO: { name: 'Bank Jago', basePrice: 2850, sector: 'Banking' },
  ACST: { name: 'Ace Hardware Indonesia', basePrice: 710, sector: 'Retail' },
  ANTM: { name: 'Aneka Tambang', basePrice: 1650, sector: 'Mining' },
  BRIS: { name: 'Bank Syariah Indonesia', basePrice: 2650, sector: 'Banking' },
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

/** Fetch crypto price data from CoinGecko */
async function fetchCryptoPrice(symbol: string): Promise<Record<string, unknown>> {
  const coinId = CRYPTO_SYMBOL_TO_ID[symbol.toUpperCase()];
  if (!coinId) {
    throw new Error(`Unknown crypto symbol: ${symbol}. Supported: ${Object.keys(CRYPTO_SYMBOL_TO_ID).join(', ')}`);
  }

  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd,idr&include_24hr_change=true&include_market_cap=true&include_24hr_vol=true`;

  const res = await fetch(url, {
    next: { revalidate: 30 }, // Cache for 30 seconds
  });

  if (!res.ok) {
    throw new Error(`CoinGecko API error: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();
  const coinData = data[coinId];

  if (!coinData) {
    throw new Error(`No data returned for ${symbol} from CoinGecko`);
  }

  const price = coinData.usd || 0;
  const change24h = coinData.usd_24h_change || 0;
  const marketCap = coinData.usd_market_cap || 0;
  const volume = coinData.usd_24h_vol || 0;
  const priceIdr = coinData.idr || 0;

  // Estimate high/low from 24h change (CoinGecko simple price doesn't return these directly)
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
  };
}

/** Fetch crypto OHLC data from CoinGecko */
async function fetchCryptoOHLC(symbol: string, days: number = 30): Promise<{ ohlc: number[][] }> {
  const coinId = CRYPTO_SYMBOL_TO_ID[symbol.toUpperCase()];
  if (!coinId) {
    throw new Error(`Unknown crypto symbol: ${symbol}`);
  }

  const url = `https://api.coingecko.com/api/v3/coins/${coinId}/ohlc?vs_currency=usd&days=${days}`;

  const res = await fetch(url, {
    next: { revalidate: 300 }, // Cache for 5 minutes for chart data
  });

  if (!res.ok) {
    // Fall back to mock data if CoinGecko rate-limits
    const priceData = await fetchCryptoPrice(symbol);
    const price = priceData.price as number;
    return { ohlc: generateMockOHLC(price, days, symbol) };
  }

  const ohlc = await res.json();
  return { ohlc: ohlc || [] };
}

/** Fetch forex price data from exchange rate API */
async function fetchForexPrice(symbol: string): Promise<Record<string, unknown>> {
  const base = FOREX_BASE_CURRENCIES[symbol.toUpperCase()];
  const quote = FOREX_QUOTE_CURRENCIES[symbol.toUpperCase()];

  if (!base || !quote) {
    throw new Error(`Unknown forex pair: ${symbol}. Supported: ${Object.keys(FOREX_BASE_CURRENCIES).join(', ')}`);
  }

  // For pairs starting with USD, we can directly use the rate
  // For others (EURUSD, GBPUSD, AUDUSD, NZDUSD), the rate from the API is inverted
  const isDirect = symbol.toUpperCase().startsWith('USD') || symbol.toUpperCase() === 'XAUUSD';

  // Determine which base currency to query
  const queryBase = isDirect ? 'USD' : base;

  const url = `https://open.er-api.com/v6/latest/${queryBase}`;

  const res = await fetch(url, {
    next: { revalidate: 3600 }, // Cache for 1 hour
  });

  if (!res.ok) {
    throw new Error(`Exchange rate API error: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();
  const rates = data.rates;

  let price: number;

  if (isDirect) {
    // USDJPY, USDIDR, USDCAD, etc. → rate is direct
    price = rates[quote] || 0;
  } else {
    // EURUSD, GBPUSD, etc. → rate = 1 / rates['USD']
    price = rates['USD'] ? 1 / rates['USD'] : 0;
  }

  // For XAUUSD, the exchange rate API may not have it, use a reasonable mock
  if (symbol.toUpperCase() === 'XAUUSD') {
    price = 2350 + seededRandom(symbol + Date.now().toString().slice(0, -4)) * 50;
  }

  // Estimate change, volume, etc. (exchange rate API doesn't provide these)
  const change24h = parseFloat(((seededRandom(symbol + '24h') - 0.45) * 1.2).toFixed(4));
  const volume = 0; // Not available from free API
  const marketCap = 0; // Not applicable for forex
  const changeAbs = Math.abs(price * (change24h / 100));
  const high24h = parseFloat((price + changeAbs * 1.5).toFixed(
    symbol.toUpperCase().includes('IDR') || symbol.toUpperCase().includes('JPY') ? 2 : 4
  ));
  const low24h = parseFloat((price - changeAbs * 1.5).toFixed(
    symbol.toUpperCase().includes('IDR') || symbol.toUpperCase().includes('JPY') ? 2 : 4
  ));

  return {
    symbol,
    type: 'forex',
    price: parseFloat(price.toFixed(symbol.toUpperCase().includes('IDR') || symbol.toUpperCase().includes('JPY') ? 2 : 4)),
    change24h,
    volume,
    marketCap,
    high24h,
    low24h,
  };
}

/** Generate mock saham price data */
function fetchSahamPrice(symbol: string): Record<string, unknown> {
  const upper = symbol.toUpperCase();
  const mockInfo = SAHAM_MOCK_DATA[upper];

  if (!mockInfo) {
    // Generate generic mock data for unknown stocks
    const basePrice = 1000 + seededRandom(symbol) * 9000;
    const change24h = parseFloat(((seededRandom(symbol + 'ch') - 0.45) * 4).toFixed(2));

    return {
      symbol,
      type: 'saham',
      name: symbol,
      price: parseFloat(basePrice.toFixed(0)),
      change24h,
      volume: Math.floor(seededRandom(symbol + 'vol') * 50000000),
      marketCap: Math.floor(basePrice * (seededRandom(symbol + 'mcap') * 10000000000)),
      high24h: parseFloat((basePrice * (1 + Math.abs(change24h) / 100 * 0.8)).toFixed(0)),
      low24h: parseFloat((basePrice * (1 - Math.abs(change24h) / 100 * 0.8)).toFixed(0)),
    };
  }

  // Generate slightly varying price based on current time (changes every minute)
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
    return { ohlc: generateMockOHLC(1.0, days, symbol + 'forex') };
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
      let ohlcData: { ohlc: number[][] };

      switch (type) {
        case 'crypto':
          ohlcData = await fetchCryptoOHLC(symbol, days);
          break;
        case 'forex':
          ohlcData = await fetchForexOHLC(symbol, days);
          break;
        case 'saham':
          ohlcData = fetchSahamOHLC(symbol, days);
          break;
        default:
          return NextResponse.json(
            { error: 'Invalid asset type' },
            { status: 400 }
          );
      }

      return NextResponse.json({
        symbol: symbol.toUpperCase(),
        type,
        days,
        ...ohlcData,
      });
    }

    // Return price data
    let priceData: Record<string, unknown>;

    switch (type) {
      case 'crypto':
        priceData = await fetchCryptoPrice(symbol);
        break;
      case 'forex':
        priceData = await fetchForexPrice(symbol);
        break;
      case 'saham':
        priceData = fetchSahamPrice(symbol);
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
