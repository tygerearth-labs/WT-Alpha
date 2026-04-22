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
  APTUSDT: 'aptos', APT: 'aptos',
  SEIUSDT: 'sei-network', SEI: 'sei-network',
  TIAUSDT: 'celestia', TIA: 'celestia',
  FETUSDT: 'fetch-ai', FET: 'fetch-ai',
  RNDRUSDT: 'render-token', RNDR: 'render-token',
  IMXUSDT: 'immutable-x', IMX: 'immutable-x',
  GRTUSDT: 'the-graph', GRT: 'the-graph',
  MKRUSDT: 'maker', MKR: 'maker',
  AAVEUSDT: 'aave', AAVE: 'aave',
  SNXUSDT: 'havven', SNX: 'havven',
  LDOUSDT: 'lido-dao', LDO: 'lido-dao',
  PENDLEUSDT: 'pendle', PENDLE: 'pendle',
  SUIUSDT: 'sui', SUI: 'sui',
  PEPEUSDT: 'pepe', PEPE: 'pepe',
  TONUSDT: 'the-open-network', TON: 'the-open-network',
  XLMUSDT: 'stellar', XLM: 'stellar',
  ALGOUSDT: 'algorand', ALGO: 'algorand',
  FILUSDT: 'filecoin', FIL: 'filecoin',
  CRVUSDT: 'curve-dao-token', CRV: 'curve-dao-token',
  ONDOUSDT: 'ondo-finance', ONDO: 'ondo-finance',
  WLDUSDT: 'worldcoin-wld', WLD: 'worldcoin-wld',
  JUPUSDT: 'jupiter-exchange-solana', JUP: 'jupiter-exchange-solana',
  STRKUSDT: 'starknet', STRK: 'starknet',
  ENAUSDT: 'ethena', ENA: 'ethena',
  WUSDT: 'wormhole', W: 'wormhole',
  BONKUSDT: 'bonk', BONK: 'bonk',
  WIFUSDT: 'dogwifcoin', WIF: 'dogwifcoin',
  FLOKIUSDT: 'floki', FLOKI: 'floki',
  RAYUSDT: 'raydium', RAY: 'raydium',
  ORCAUSDT: 'orca', ORCA: 'orca',
  JTOUSDT: 'jito', JTO: 'jito',
  DRIFTUSDT: 'drift-protocol', DRIFT: 'drift-protocol',
  PYTHUSDT: 'pyth-network', PYTH: 'pyth-network',
  REZUSDT: 'renzo-protocol', REZ: 'renzo-protocol',
  BBUSDT: 'bouce-bit', BB: 'bounce-bit',
  ZKUSDT: 'zksync', ZK: 'zksync',
  NOTUSDT: 'notcoin', NOT: 'notcoin',
  TAOUSDT: 'bittensor', TAO: 'bittensor',
  XMRUSDT: 'monero', XMR: 'monero',
  GALAUSDT: 'gala', GALA: 'gala',
  MANAUSDT: 'decentraland', MANA: 'decentraland',
  SANDUSDT: 'the-sandbox', SAND: 'the-sandbox',
  TRUMPUSDT: 'official-trump', TRUMP: 'official-trump',
  HBARUSDT: 'hedera-hashgraph', HBAR: 'hedera-hashgraph',
  VETUSDT: 'vechain', VET: 'vechain',
  ICPUSDT: 'internet-computer', ICP: 'internet-computer',
  FTMUSDT: 'fantom', FTM: 'fantom',
  EIGENUSDT: 'eigenlayer', EIGEN: 'eigenlayer',
  KASUSDT: 'kaspa', KAS: 'kaspa',
  RUNEUSDT: 'thorchain', RUNE: 'thorchain',
  TWTUSDT: 'trust-wallet-token', TWT: 'trust-wallet-token',
};

// ── Mock saham data ──────────────────────────────────────────────────────────
const SAHAM_MOCK_DATA: Record<string, { name: string; basePrice: number; sector: string }> = {
  BBCA: { name: 'Bank Central Asia', basePrice: 10250, sector: 'Banking' },
  BBRI: { name: 'Bank Rakyat Indonesia', basePrice: 5450, sector: 'Banking' },
  BMRI: { name: 'Bank Mandiri', basePrice: 6850, sector: 'Banking' },
  BBNI: { name: 'Bank Negara Indonesia', basePrice: 5150, sector: 'Banking' },
  TLKM: { name: 'Telkom Indonesia', basePrice: 3150, sector: 'Telecom' },
  ASII: { name: 'Astra International', basePrice: 5900, sector: 'Conglomerate' },
  UNVR: { name: 'Unilever Indonesia', basePrice: 2580, sector: 'Consumer' },
  GOTO: { name: 'GoTo Gojek Tokopedia', basePrice: 82, sector: 'Technology' },
  BUKA: { name: 'Bukalapak', basePrice: 138, sector: 'Technology' },
  ARTO: { name: 'Bank Jago', basePrice: 2850, sector: 'Banking' },
  ANTM: { name: 'Aneka Tambang', basePrice: 1480, sector: 'Mining' },
  BRIS: { name: 'Bank Syariah Indonesia', basePrice: 2650, sector: 'Banking' },
  CPIN: { name: 'Charoen Pokphand Indonesia', basePrice: 8250, sector: 'Consumer' },
  INCO: { name: 'Vale Indonesia', basePrice: 4200, sector: 'Mining' },
  JSMR: { name: 'Jasa Marga', basePrice: 5650, sector: 'Infrastructure' },
  KLBF: { name: 'Kalbe Farma', basePrice: 1780, sector: 'Healthcare' },
  PGAS: { name: 'Perusahaan Gas Negara', basePrice: 1820, sector: 'Energy' },
  SMGR: { name: 'Semen Indonesia', basePrice: 7800, sector: 'Industrial' },
  TBIG: { name: 'Tower Bersama Infrastructure', basePrice: 1680, sector: 'Infrastructure' },
  WIKA: { name: 'Wijaya Karya', basePrice: 780, sector: 'Construction' },
  // Additional stocks
  MEGA: { name: 'Bank Mega', basePrice: 715, sector: 'Banking' },
  EXCL: { name: 'XL Axiata', basePrice: 2080, sector: 'Telecom' },
  ISAT: { name: 'Indosat Ooredoo', basePrice: 7350, sector: 'Telecom' },
  UNTR: { name: 'United Tractors', basePrice: 29500, sector: 'Industrial' },
  ADRO: { name: 'Adaro Energy', basePrice: 2980, sector: 'Mining' },
  PTBA: { name: 'Bukit Asam', basePrice: 2640, sector: 'Mining' },
  BSDE: { name: 'Bumi Serpong Damai', basePrice: 1080, sector: 'Property' },
  CTRA: { name: 'Ciputra Development', basePrice: 1320, sector: 'Property' },
  ICBP: { name: 'Indofood CBP', basePrice: 11800, sector: 'Consumer' },
  INDF: { name: 'Indofood Sukses Makmur', basePrice: 6500, sector: 'Consumer' },
  ACES: { name: 'Ace Hardware Indonesia', basePrice: 720, sector: 'Retail' },
  MAPI: { name: 'Mitra Adiperkasa', basePrice: 1780, sector: 'Retail' },
  TINS: { name: 'Timah', basePrice: 1280, sector: 'Mining' },
  INKP: { name: 'Indah Kiat Pulp & Paper', basePrice: 8500, sector: 'Industrial' },
  MEDC: { name: 'Medco Energi Internasional', basePrice: 1350, sector: 'Energy' },
  AKRA: { name: 'AKR Corporindo', basePrice: 1675, sector: 'Energy' },
  AALI: { name: 'Astra Agro Lestari', basePrice: 2850, sector: 'Plantation' },
  SSMS: { name: 'Sawit Sumbermas Sarana', basePrice: 925, sector: 'Plantation' },
  TPIA: { name: 'Chandra Asri Petrochemical', basePrice: 3150, sector: 'Petrochemical' },
  BRPT: { name: 'Barito Pacific', basePrice: 1020, sector: 'Energy' },
  EMTK: { name: 'Elang Mahkota Teknologi', basePrice: 650, sector: 'Media' },
  MDKA: { name: 'Merdeka Copper Gold', basePrice: 3900, sector: 'Mining' },
  NISP: { name: 'OCBC NISP', basePrice: 1310, sector: 'Banking' },
  MYOR: { name: 'Mayora Indah', basePrice: 2580, sector: 'Consumer' },
  SIDO: { name: 'Sido Muncul', basePrice: 720, sector: 'Healthcare' },
  ERAA: { name: 'Erajaya Swasembada', basePrice: 478, sector: 'Technology' },
  MIKA: { name: 'Mitra Keluarga Karyasehat', basePrice: 9650, sector: 'Healthcare' },
  BYAN: { name: 'Bayan Resources', basePrice: 8950, sector: 'Mining' },
  ITMG: { name: 'Indo Tambangraya Megah', basePrice: 28500, sector: 'Mining' },
  HRUM: { name: 'Harum Energy', basePrice: 2350, sector: 'Mining' },
  JPFA: { name: 'Japfa Comfeed Indonesia', basePrice: 1780, sector: 'Consumer' },
  HEAL: { name: 'Medikaloka Hermifitra', basePrice: 1120, sector: 'Healthcare' },
  WSBP: { name: 'Waskita Beton', basePrice: 420, sector: 'Construction' },
  ADHI: { name: 'Adhi Karya', basePrice: 980, sector: 'Construction' },
  PP: { name: 'PP Properti', basePrice: 560, sector: 'Property' },
  MNCN: { name: 'Media Nusantara Citra', basePrice: 1250, sector: 'Media' },
  GJTL: { name: 'Gajah Tunggal', basePrice: 1150, sector: 'Industrial' },
  MAGP: { name: 'Magna Investama Mandiri', basePrice: 195, sector: 'Technology' },
  SRTT: { name: 'Saraswati Griya Lestari', basePrice: 245, sector: 'Property' },
  // US Stocks
  AAPL: { name: 'Apple Inc.', basePrice: 229, sector: 'US Tech' },
  MSFT: { name: 'Microsoft Corp.', basePrice: 442, sector: 'US Tech' },
  GOOGL: { name: 'Alphabet Inc.', basePrice: 175, sector: 'US Tech' },
  AMZN: { name: 'Amazon.com Inc.', basePrice: 205, sector: 'US Tech' },
  NVDA: { name: 'NVIDIA Corp.', basePrice: 135, sector: 'US Tech' },
  TSLA: { name: 'Tesla Inc.', basePrice: 342, sector: 'US Tech' },
  META: { name: 'Meta Platforms', basePrice: 605, sector: 'US Tech' },
  NFLX: { name: 'Netflix Inc.', basePrice: 920, sector: 'US Tech' },
  JPM: { name: 'JPMorgan Chase', basePrice: 252, sector: 'US Finance' },
  V: { name: 'Visa Inc.', basePrice: 315, sector: 'US Finance' },
};

// ── Forex pair mappings ──────────────────────────────────────────────────────
const FOREX_BASE_CURRENCIES: Record<string, string> = {
  EURUSD: 'EUR', GBPUSD: 'GBP', USDJPY: 'JPY', USDIDR: 'IDR',
  AUDUSD: 'AUD', USDCAD: 'CAD', USDCHF: 'CHF', NZDUSD: 'NZD',
  USDSGD: 'SGD', XAUUSD: 'XAU',
  USDHKD: 'HKD', USDCNH: 'CNH', USDMXN: 'MXN', USDZAR: 'ZAR',
  USDTRY: 'TRY', USDTHB: 'THB', USDPHP: 'PHP', USDKRW: 'KRW',
  USDTWD: 'TWD', USDSEK: 'SEK', USDNOK: 'NOK', USDDKK: 'DKK',
  USDPLN: 'PLN', USDINR: 'INR',
  EURGBP: 'EUR', EURJPY: 'EUR', EURCHF: 'EUR', EURAUD: 'EUR',
  EURSGD: 'EUR', EURCNH: 'EUR', EURIDR: 'EUR',
  GBPJPY: 'GBP', GBPCHF: 'GBP', GBPAUD: 'GBP', GBPNZD: 'GBP',
  GBPCAD: 'GBP', GBPSGD: 'GBP', GBPCNH: 'GBP',
  AUDJPY: 'AUD', AUDNZD: 'AUD', AUDCAD: 'AUD', AUDCHF: 'AUD',
  NZDJPY: 'NZD', NZDCHF: 'NZD', NZDCAD: 'NZD',
  CADJPY: 'CAD', CADCHF: 'CAD', CHFJPY: 'CHF', SGDJPY: 'SGD',
};
const FOREX_QUOTE_CURRENCIES: Record<string, string> = {
  EURUSD: 'USD', GBPUSD: 'USD', USDJPY: 'JPY', USDIDR: 'IDR',
  AUDUSD: 'USD', USDCAD: 'CAD', USDCHF: 'CHF', NZDUSD: 'USD',
  USDSGD: 'SGD', XAUUSD: 'USD',
  USDHKD: 'HKD', USDCNH: 'CNH', USDMXN: 'MXN', USDZAR: 'ZAR',
  USDTRY: 'TRY', USDTHB: 'THB', USDPHP: 'PHP', USDKRW: 'KRW',
  USDTWD: 'TWD', USDSEK: 'SEK', USDNOK: 'NOK', USDDKK: 'DKK',
  USDPLN: 'PLN', USDINR: 'INR',
  EURGBP: 'GBP', EURJPY: 'JPY', EURCHF: 'CHF', EURAUD: 'AUD',
  EURSGD: 'SGD', EURCNH: 'CNH', EURIDR: 'IDR',
  GBPJPY: 'JPY', GBPCHF: 'CHF', GBPAUD: 'AUD', GBPNZD: 'NZD',
  GBPCAD: 'CAD', GBPSGD: 'SGD', GBPCNH: 'CNH',
  AUDJPY: 'JPY', AUDNZD: 'NZD', AUDCAD: 'CAD', AUDCHF: 'CHF',
  NZDJPY: 'JPY', NZDCHF: 'CHF', NZDCAD: 'CAD',
  CADJPY: 'JPY', CADCHF: 'CHF', CHFJPY: 'JPY', SGDJPY: 'JPY',
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

// ── Mock fallbacks ───────────────────────────────────────────────────────────

const CRYPTO_MOCK_PRICES: Record<string, number> = {
  BTCUSDT: 104800, BTC: 104800,
  ETHUSDT: 2520, ETH: 2520,
  BNBUSDT: 695, BNB: 695,
  XRPUSDT: 2.48, XRP: 2.48,
  ADAUSDT: 0.78, ADA: 0.78,
  SOLUSDT: 172, SOL: 172,
  DOTUSDT: 4.85, DOT: 4.85,
  DOGEUSDT: 0.228, DOGE: 0.228,
  AVAXUSDT: 24.5, AVAX: 24.5,
  MATICUSDT: 0.26, MATIC: 0.26,
  LINKUSDT: 16.8, LINK: 16.8,
  USDTUSDT: 1.0, USDT: 1.0,
  USDCUSDT: 1.0, USDC: 1.0,
  SHIBUSDT: 0.000016, SHIB: 0.000016,
  LTCUSDT: 103, LTC: 103,
  TRXUSDT: 0.27, TRX: 0.27,
  ATOMUSDT: 8.9, ATOM: 8.9,
  UNIUSDT: 7.8, UNI: 7.8,
  NEARUSDT: 3.15, NEAR: 3.15,
  ARBUSDT: 0.53, ARB: 0.53,
  OPUSDT: 1.35, OP: 1.35,
  INJUSDT: 14.5, INJ: 14.5,
  PEPEUSDT: 0.0000125, PEPE: 0.0000125,
  TONUSDT: 3.72, TON: 3.72,
  SUIUSDT: 3.58, SUI: 3.58,
  APTUSDT: 9.25, APT: 9.25,
  FETUSDT: 1.42, FET: 1.42,
  RNDRUSDT: 5.2, RNDR: 5.2,
  HBARUSDT: 0.24, HBAR: 0.24,
  VETUSDT: 0.038, VET: 0.038,
  ICPUSDT: 11.5, ICP: 11.5,
  FTMUSDT: 0.42, FTM: 0.42,
  XMRUSDT: 268, XMR: 268,
  GALAUSDT: 0.024, GALA: 0.024,
  MANAUSDT: 0.55, MANA: 0.55,
  SANDUSDT: 0.48, SAND: 0.48,
  TRUMPUSDT: 12.5, TRUMP: 12.5,
  KASUSDT: 0.12, KAS: 0.12,
  RUNEUSDT: 1.25, RUNE: 1.25,
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
  EURUSD: 1.1342, GBPUSD: 1.2718, USDJPY: 143.25, USDIDR: 15850,
  AUDUSD: 0.6532, USDCAD: 1.3985, USDCHF: 0.8812, NZDUSD: 0.5875,
  USDSGD: 1.3420, XAUUSD: 3315,
  USDHKD: 7.7890, USDCNH: 7.2480, USDMXN: 17.15, USDZAR: 18.25,
  USDTRY: 34.50, USDTHB: 34.15, USDPHP: 58.20, USDKRW: 1375,
  USDTWD: 32.50, USDSEK: 10.85, USDNOK: 11.25, USDDKK: 6.95,
  USDPLN: 4.02, USDINR: 84.50,
  EURGBP: 0.8420, EURJPY: 162.45, EURCHF: 0.9550, EURAUD: 1.6285,
  EURSGD: 1.4395, EURCNH: 7.8250, EURIDR: 17980,
  GBPJPY: 181.20, GBPCHF: 1.1265, GBPAUD: 1.9345, GBPNZD: 2.1645,
  GBPCAD: 1.7785, GBPSGD: 1.7060, GBPCNH: 9.2100,
  AUDJPY: 93.58, AUDNZD: 1.0850, AUDCAD: 0.9135, AUDCHF: 1.3490,
  NZDJPY: 84.20, NZDCHF: 1.2435, NZDCAD: 0.8420,
  CADJPY: 102.40, CADCHF: 0.6300, CHFJPY: 162.60, SGDJPY: 106.75,
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

/** Batch fetch crypto prices from CoinGecko (primary) */
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

/** Batch fetch crypto prices from CoinMarketCap (requires CMC_API_KEY) */
async function batchFetchCryptoPricesCMC(symbols: string[]): Promise<Map<string, PriceResult> | null> {
  const apiKey = process.env.CMC_API_KEY;
  if (!apiKey) return null;
  try {
    // Build comma-separated symbol list, stripping USDT suffix
    const cmcSymbols = [...new Set(symbols.map(s => s.toUpperCase().replace('USDT', '')))].join(',');
    const url = `https://pro-api.coinmarketcap.com/v2/cryptocurrency/quotes/latest?symbol=${cmcSymbols}&convert=USD`;
    const res = await fetchWithTimeout(url, {
      next: { revalidate: 30 },
      timeoutMs: 8000,
      headers: { 'X-CMC_PRO_API_KEY': apiKey },
    });
    if (!res.ok) {
      console.warn(`CMC batch API returned ${res.status}`);
      return null;
    }
    const data = await res.json();
    const cmcData = data?.data;
    if (!cmcData || typeof cmcData !== 'object') return null;

    const results = new Map<string, PriceResult>();
    for (const symbol of symbols) {
      const upper = symbol.toUpperCase();
      const cmcSymbol = upper.replace('USDT', '');
      const entry = cmcData[cmcSymbol];
      if (!entry?.quote?.USD) {
        results.set(upper, mockCryptoPrice(symbol));
        continue;
      }
      const price = entry.quote.USD.price;
      if (typeof price !== 'number' || isNaN(price)) {
        results.set(upper, mockCryptoPrice(symbol));
        continue;
      }
      const change24h = entry.quote.USD.percent_change_24h ?? 0;
      const changeAbs = Math.abs(price * (change24h / 100));
      results.set(upper, {
        symbol: upper,
        type: 'crypto',
        price,
        change24h: parseFloat(change24h.toFixed(2)),
        volume: entry.quote.USD.volume_24h || 0,
        marketCap: entry.quote.USD.market_cap || 0,
        high24h: parseFloat((price + changeAbs * (0.3 + seededRandom(symbol + 'cmc-hi') * 0.7)).toFixed(2)),
        low24h: parseFloat((price - changeAbs * (0.3 + seededRandom(symbol + 'cmc-lo') * 0.7)).toFixed(2)),
      });
    }
    return results;
  } catch (error) {
    console.warn(`CMC batch fetch failed: ${error instanceof Error ? error.message : error}`);
    return null;
  }
}

/** Batch fetch crypto prices from Binance API (fast, free, reliable) */
async function batchFetchCryptoPricesBinance(symbols: string[]): Promise<Map<string, PriceResult>> {
  const results = new Map<string, PriceResult>();
  // Binance uses SYMBOLS like BTCUSDT - filter only valid ones
  const validSymbols = symbols.filter(s => {
    const upper = s.toUpperCase();
    return upper.endsWith('USDT') || upper.endsWith('BUSD') || upper.endsWith('BTC') || upper.endsWith('ETH') || upper.endsWith('BNB');
  });

  if (validSymbols.length === 0) return results;

  try {
    // Binance batch ticker API - returns all symbols at once
    const url = 'https://api.binance.com/api/v3/ticker/24hr';
    const res = await fetchWithTimeout(url, { next: { revalidate: 15 }, timeoutMs: 8000 });
    if (!res.ok) {
      console.warn(`Binance API returned ${res.status}`);
      return results;
    }

    const data = await res.json();
    if (!Array.isArray(data)) return results;

    // Build a map from Binance symbol to price data
    const binanceMap = new Map<string, { price: number; change24h: number; volume: number; high: number; low: number }>();
    for (const item of data) {
      if (item.symbol && item.lastPrice && parseFloat(item.lastPrice) > 0) {
        binanceMap.set(item.symbol, {
          price: parseFloat(item.lastPrice),
          change24h: parseFloat(item.priceChangePercent || '0'),
          volume: parseFloat(item.quoteVolume || '0'),
          high: parseFloat(item.highPrice || '0'),
          low: parseFloat(item.lowPrice || '0'),
        });
      }
    }

    for (const symbol of validSymbols) {
      const upper = symbol.toUpperCase();
      const binanceData = binanceMap.get(upper);
      if (binanceData && binanceData.price > 0) {
        results.set(upper, {
          symbol: upper,
          type: 'crypto',
          price: binanceData.price,
          change24h: parseFloat(binanceData.change24h.toFixed(2)),
          volume: Math.floor(binanceData.volume),
          marketCap: 0, // Binance doesn't provide marketCap in this endpoint
          high24h: binanceData.high,
          low24h: binanceData.low,
        });
      }
    }
  } catch (error) {
    console.warn(`Binance batch fetch failed: ${error instanceof Error ? error.message : error}`);
  }

  return results;
}

/** Unified batch crypto fetch: Binance primary, CoinGecko fallback, CMC fallback, mock last resort */
async function batchFetchCryptoPrices(symbols: string[]): Promise<Map<string, PriceResult>> {
  if (symbols.length === 0) return new Map();

  // Try Binance first (fastest, most reliable for USDT pairs)
  const binanceResults = await batchFetchCryptoPricesBinance(symbols);
  if (binanceResults.size > 0) {
    // For any symbols Binance didn't cover, try CoinGecko
    const remaining = symbols.filter(s => !binanceResults.has(s.toUpperCase()));
    if (remaining.length > 0) {
      const cgResults = await batchFetchCryptoPricesCoinGecko(remaining);
      for (const [key, val] of cgResults) binanceResults.set(key, val);
    }
    return binanceResults;
  }

  // Fallback: CoinGecko
  const cgResults = await batchFetchCryptoPricesCoinGecko(symbols);
  if (cgResults.size > 0) return cgResults;

  // Fallback: CoinMarketCap (requires API key)
  const cmcResults = await batchFetchCryptoPricesCMC(symbols);
  if (cmcResults) return cmcResults;

  // Last resort: mock for all
  const results = new Map<string, PriceResult>();
  for (const symbol of symbols) {
    results.set(symbol.toUpperCase(), mockCryptoPrice(symbol));
  }
  return results;
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
        price = 3280 + seededRandom(upper + Date.now().toString().slice(0, -4)) * 70;
      } else if (isDirect && base === 'USD') {
        // USD/XXX pairs - get rate directly
        price = rates[quote] || 0;
      } else if (quote === 'USD') {
        // XXX/USD pairs - invert
        if (rates[base]) price = 1 / rates[base];
        else price = 0;
      } else {
        // Cross pairs: XXX/YYY = (USD/YYY) / (USD/XXX)
        const rateQuote = rates[quote] || 0; // USD/YYY
        const rateBase = rates[base] || 0;   // USD/XXX
        if (rateQuote > 0 && rateBase > 0) price = rateQuote / rateBase;
        else price = 0;
      }

      if (!price || price === 0) {
        results.set(upper, mockForexPrice(symbol));
        continue;
      }

      const change24h = parseFloat(((seededRandom(upper + '24h') - 0.45) * 1.2).toFixed(4));
      const changeAbs = Math.abs(price * (change24h / 100));
      const decimals = upper.includes('IDR') || upper.includes('JPY') || upper.includes('KRW') ? 2 : 4;

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

/** Generate a single mock saham price result (used as fallback) */
function mockSahamPrice(symbol: string): PriceResult {
  const upper = symbol.toUpperCase();
  const mockInfo = SAHAM_MOCK_DATA[upper];
  const timeSeed = Math.floor(Date.now() / 60000).toString();

  if (!mockInfo) {
    const basePrice = 1000 + seededRandom(symbol) * 9000;
    const change24h = parseFloat(((seededRandom(symbol + 'ch') - 0.45) * 4).toFixed(2));
    const changeAbs = Math.abs(basePrice * (change24h / 100));
    return {
      symbol: upper, type: 'saham',
      price: parseFloat(basePrice.toFixed(0)),
      change24h,
      volume: Math.floor(seededRandom(symbol + 'vol') * 50000000),
      marketCap: Math.floor(basePrice * (seededRandom(symbol + 'mcap') * 10000000000)),
      high24h: parseFloat((basePrice + changeAbs * 0.8).toFixed(0)),
      low24h: parseFloat((basePrice - changeAbs * 0.8).toFixed(0)),
    };
  }

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

/** Fetch a single symbol from Yahoo Finance */
async function fetchYahooPrice(yahooSymbol: string): Promise<{ price: number; change24h: number } | null> {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}?interval=1d&range=5d`;
    const res = await fetchWithTimeout(url, {
      timeoutMs: 5000,
      headers: { 'User-Agent': 'Mozilla/5.0' },
    });
    if (!res.ok) return null;
    const data = await res.json();
    const meta = data?.chart?.result?.[0]?.meta;
    if (!meta || typeof meta.regularMarketPrice !== 'number') return null;
    const price = meta.regularMarketPrice;
    const prevClose = meta.chartPreviousClose;
    const change24h = prevClose ? parseFloat((((price - prevClose) / prevClose) * 100).toFixed(2)) : 0;
    return { price, change24h };
  } catch {
    return null;
  }
}

/** Batch fetch saham prices from Yahoo Finance with mock fallback */
async function batchFetchSahamPrices(symbols: string[]): Promise<Map<string, PriceResult>> {
  const results = new Map<string, PriceResult>();
  const fetchPromises = symbols.map(async (symbol) => {
    const upper = symbol.toUpperCase();
    // US stocks: AAPL, MSFT, NVDA, etc. (no .JK suffix)
    // Indonesian stocks: BBCA, BBRI, etc. (use .JK suffix)
    const usStockSymbols = new Set(['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'TSLA', 'META', 'NFLX', 'JPM', 'V']);
    const yahooSymbol = usStockSymbols.has(upper) ? upper : `${upper}.JK`;
    const yahooResult = await fetchYahooPrice(yahooSymbol);
    if (yahooResult) {
      const { price, change24h } = yahooResult;
      const changeAbs = Math.abs(price * (change24h / 100));
      const mockInfo = SAHAM_MOCK_DATA[upper];
      results.set(upper, {
        symbol: upper,
        type: 'saham',
        name: mockInfo?.name,
        sector: mockInfo?.sector,
        price,
        change24h,
        volume: Math.floor(seededRandom(upper + 'vol') * 80000000),
        marketCap: Math.floor(price * (seededRandom(upper + 'mcap') * 50000000000)),
        high24h: parseFloat((price + changeAbs * 1.2).toFixed(usStockSymbols.has(upper) ? 2 : 0)),
        low24h: parseFloat((price - changeAbs * 1.2).toFixed(usStockSymbols.has(upper) ? 2 : 0)),
      });
    } else {
      results.set(upper, mockSahamPrice(symbol));
    }
  });
  await Promise.allSettled(fetchPromises);
  return results;
}

// ── Komoditas mock data & fetcher ──────────────────────────────────────────

const KOMODITAS_MOCK_DATA: Record<string, { name: string; basePrice: number; unit: string }> = {
  XAUUSD: { name: 'Gold', basePrice: 3315, unit: 'oz' },
  XAGUSD: { name: 'Silver', basePrice: 33.5, unit: 'oz' },
  XPTUSD: { name: 'Platinum', basePrice: 985, unit: 'oz' },
  WTIUSD: { name: 'WTI Crude Oil', basePrice: 61.5, unit: 'bbl' },
  BRENTUSD: { name: 'Brent Crude Oil', basePrice: 64.8, unit: 'bbl' },
  NGUSD: { name: 'Natural Gas', basePrice: 3.85, unit: 'MMBtu' },
  COPPER: { name: 'Copper', basePrice: 4.15, unit: 'lb' },
};

function mockKomoditasPrice(symbol: string): PriceResult {
  const upper = symbol.toUpperCase();
  const mockInfo = KOMODITAS_MOCK_DATA[upper];
  const basePrice = mockInfo?.basePrice ?? (100 + seededRandom(symbol) * 5000);
  const timeSeed = Math.floor(Date.now() / 60000).toString();
  const variance = (seededRandom(upper + timeSeed) - 0.5) * basePrice * 0.02;
  const price = basePrice + variance;
  const change24h = parseFloat(((seededRandom(upper + '24h') - 0.45) * 3).toFixed(2));
  const changeAbs = Math.abs(price * (change24h / 100));
  const decimals = price < 10 ? 3 : price < 100 ? 2 : 2;
  return {
    symbol: upper,
    type: 'komoditas',
    name: mockInfo?.name,
    price: parseFloat(price.toFixed(decimals)),
    change24h,
    volume: 0,
    marketCap: 0,
    high24h: parseFloat((price + changeAbs * 1.3).toFixed(decimals)),
    low24h: parseFloat((price - changeAbs * 1.3).toFixed(decimals)),
  };
}

/** Batch fetch komoditas prices (metals.live for metals, Yahoo for oil, mock fallback) */
async function batchFetchKomoditasPrices(symbols: string[]): Promise<Map<string, PriceResult>> {
  const results = new Map<string, PriceResult>();
  const metalSymbols = new Set(['XAUUSD', 'XAGUSD', 'XPTUSD', 'COPPER']);
  const oilSymbols = new Set(['WTIUSD', 'BRENTUSD', 'NGUSD']);

  // Yahoo Finance symbol mapping for oil/gas
  const OIL_YAHOO_MAP: Record<string, string> = {
    WTIUSD: 'CL=F',
    BRENTUSD: 'BZ=F',
    NGUSD: 'NG=F',
    COPPER: 'HG=F',
  };

  // metals.live name mapping
  const METALS_LIVE_MAP: Record<string, string> = {
    XAUUSD: 'gold',
    XAGUSD: 'silver',
    XPTUSD: 'platinum',
    COPPER: 'copper',
  };

  const metalList = symbols.filter(s => metalSymbols.has(s.toUpperCase()));
  const oilList = symbols.filter(s => oilSymbols.has(s.toUpperCase()));
  const copperList = symbols.filter(s => s.toUpperCase() === 'COPPER');

  // Fetch metals from metals.live in one call
  try {
    if (metalList.length > 0 || copperList.length > 0) {
      const res = await fetchWithTimeout('https://api.metals.live/v1/spot', { timeoutMs: 5000 });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          for (const symbol of [...metalList, ...copperList]) {
            const upper = symbol.toUpperCase();
            const metalName = METALS_LIVE_MAP[upper];
            const spot = data.find((item: { name: string; price: number }) =>
              metalName && item.name.toLowerCase() === metalName
            );
            if (spot && typeof spot.price === 'number' && spot.price > 0) {
              const mockInfo = KOMODITAS_MOCK_DATA[upper];
              const change24h = parseFloat(((seededRandom(upper + '24h') - 0.45) * 2.5).toFixed(2));
              const changeAbs = Math.abs(spot.price * (change24h / 100));
              const decimals = spot.price < 10 ? 3 : 2;
              results.set(upper, {
                symbol: upper,
                type: 'komoditas',
                name: mockInfo?.name,
                price: parseFloat(spot.price.toFixed(decimals)),
                change24h,
                volume: 0,
                marketCap: 0,
                high24h: parseFloat((spot.price + changeAbs * 1.3).toFixed(decimals)),
                low24h: parseFloat((spot.price - changeAbs * 1.3).toFixed(decimals)),
              });
            } else {
              results.set(upper, mockKomoditasPrice(symbol));
            }
          }
        } else {
          for (const symbol of [...metalList, ...copperList]) {
            results.set(symbol.toUpperCase(), mockKomoditasPrice(symbol));
          }
        }
      } else {
        for (const symbol of [...metalList, ...copperList]) {
          results.set(symbol.toUpperCase(), mockKomoditasPrice(symbol));
        }
      }
    }
  } catch {
    for (const symbol of [...metalList, ...copperList]) {
      results.set(symbol.toUpperCase(), mockKomoditasPrice(symbol));
    }
  }

  // Fetch oil/gas from Yahoo Finance
  const oilPromises = oilList.map(async (symbol) => {
    const upper = symbol.toUpperCase();
    const yahooSym = OIL_YAHOO_MAP[upper];
    if (!yahooSym) {
      results.set(upper, mockKomoditasPrice(symbol));
      return;
    }
    const yahooResult = await fetchYahooPrice(yahooSym);
    if (yahooResult) {
      const { price, change24h } = yahooResult;
      const changeAbs = Math.abs(price * (change24h / 100));
      const mockInfo = KOMODITAS_MOCK_DATA[upper];
      const decimals = price < 10 ? 3 : 2;
      results.set(upper, {
        symbol: upper,
        type: 'komoditas',
        name: mockInfo?.name,
        price: parseFloat(price.toFixed(decimals)),
        change24h,
        volume: 0,
        marketCap: 0,
        high24h: parseFloat((price + changeAbs * 1.3).toFixed(decimals)),
        low24h: parseFloat((price - changeAbs * 1.3).toFixed(decimals)),
      });
    } else {
      results.set(upper, mockKomoditasPrice(symbol));
    }
  });
  await Promise.allSettled(oilPromises);

  // Any symbols not handled above get mock
  for (const symbol of symbols) {
    if (!results.has(symbol.toUpperCase())) {
      results.set(symbol.toUpperCase(), mockKomoditasPrice(symbol));
    }
  }

  return results;
}

// ── Indeks mock data & fetcher ────────────────────────────────────────────

const INDEKS_MOCK_DATA: Record<string, { name: string; basePrice: number }> = {
  US100: { name: 'NASDAQ 100', basePrice: 21250 },
  US30: { name: 'Dow Jones 30', basePrice: 42850 },
  SPX500: { name: 'S&P 500', basePrice: 5942 },
  US2000: { name: 'Russell 2000', basePrice: 2085 },
  VIX: { name: 'VIX', basePrice: 14.5 },
  DXY: { name: 'US Dollar Index', basePrice: 104.2 },
  FTSE100: { name: 'FTSE 100', basePrice: 8650 },
  DAX40: { name: 'DAX 40', basePrice: 19850 },
  STOXX600: { name: 'STOXX 600', basePrice: 510 },
  NIKKEI225: { name: 'Nikkei 225', basePrice: 38900 },
  HSI50: { name: 'Hang Seng', basePrice: 19800 },
  SHCOMP: { name: 'Shanghai Composite', basePrice: 3350 },
  KOSPI200: { name: 'KOSPI 200', basePrice: 265 },
  ASX200: { name: 'ASX 200', basePrice: 7750 },
  IDXCOMPOSITE: { name: 'IHSG', basePrice: 6800 },
  LQ45: { name: 'LQ45', basePrice: 1050 },
};

const INDEKS_YAHOO_MAP: Record<string, string> = {
  US100: '%5EIXIC',
  US30: '%5EDJI',
  SPX500: '%5EGSPC',
  US2000: '%5ERUT',
  VIX: '%5EVIX',
  DXY: 'DX-Y.NYB',
  FTSE100: '%5EFTSE',
  DAX40: '%5EGDAXI',
  STOXX600: '%5ESTOXX',
  NIKKEI225: '%5EN225',
  HSI50: '%5EHSI',
  SHCOMP: '000001.SS',
  KOSPI200: '%5EKS11',
  ASX200: '%5EAXJO',
  IDXCOMPOSITE: '%5EJKSE',
  LQ45: '%5ELQ45',
};

function mockIndeksPrice(symbol: string): PriceResult {
  const upper = symbol.toUpperCase();
  const mockInfo = INDEKS_MOCK_DATA[upper];
  const basePrice = mockInfo?.basePrice ?? (1000 + seededRandom(symbol) * 20000);
  const timeSeed = Math.floor(Date.now() / 60000).toString();
  const variance = (seededRandom(upper + timeSeed) - 0.5) * basePrice * 0.015;
  const price = basePrice + variance;
  const change24h = parseFloat(((seededRandom(upper + '24h') - 0.45) * 2.5).toFixed(2));
  const changeAbs = Math.abs(price * (change24h / 100));
  const decimals = price < 100 ? 2 : 2;
  return {
    symbol: upper,
    type: 'indeks',
    name: mockInfo?.name,
    price: parseFloat(price.toFixed(decimals)),
    change24h,
    volume: 0,
    marketCap: 0,
    high24h: parseFloat((price + changeAbs * 1.2).toFixed(decimals)),
    low24h: parseFloat((price - changeAbs * 1.2).toFixed(decimals)),
  };
}

/** Batch fetch indeks prices from Yahoo Finance with mock fallback */
async function batchFetchIndeksPrices(symbols: string[]): Promise<Map<string, PriceResult>> {
  const results = new Map<string, PriceResult>();
  const fetchPromises = symbols.map(async (symbol) => {
    const upper = symbol.toUpperCase();
    const yahooSymbol = INDEKS_YAHOO_MAP[upper];
    if (!yahooSymbol) {
      results.set(upper, mockIndeksPrice(symbol));
      return;
    }
    const yahooResult = await fetchYahooPrice(yahooSymbol);
    if (yahooResult) {
      const { price, change24h } = yahooResult;
      const changeAbs = Math.abs(price * (change24h / 100));
      const mockInfo = INDEKS_MOCK_DATA[upper];
      results.set(upper, {
        symbol: upper,
        type: 'indeks',
        name: mockInfo?.name,
        price,
        change24h,
        volume: 0,
        marketCap: 0,
        high24h: parseFloat((price + changeAbs * 1.2).toFixed(2)),
        low24h: parseFloat((price - changeAbs * 1.2).toFixed(2)),
      });
    } else {
      results.set(upper, mockIndeksPrice(symbol));
    }
  });
  await Promise.allSettled(fetchPromises);
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

    // Fetch all types in parallel
    const [cryptoResults, forexResults, sahamResults, komoditasResults, indeksResults] = await Promise.all([
      cryptoSymbols.length > 0 ? batchFetchCryptoPrices(cryptoSymbols) : Promise.resolve(new Map<string, PriceResult>()),
      forexSymbols.length > 0 ? batchFetchForexPrices(forexSymbols) : Promise.resolve(new Map<string, PriceResult>()),
      sahamSymbols.length > 0 ? batchFetchSahamPrices(sahamSymbols) : Promise.resolve(new Map<string, PriceResult>()),
      komoditasSymbols.length > 0 ? batchFetchKomoditasPrices(komoditasSymbols) : Promise.resolve(new Map<string, PriceResult>()),
      indeksSymbols.length > 0 ? batchFetchIndeksPrices(indeksSymbols) : Promise.resolve(new Map<string, PriceResult>()),
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
