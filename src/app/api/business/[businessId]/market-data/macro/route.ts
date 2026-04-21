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

// ── Data Fetchers ────────────────────────────────────────────────────────────

interface GlobalMarketData {
  totalMarketCap: number;
  totalVolume: number;
  btcDominance: number;
  ethDominance: number;
  activeCryptos: number;
  marketCapChange24h: number;
}

/** Fetch CoinGecko global market data */
async function fetchCoinGeckoGlobal(): Promise<GlobalMarketData | null> {
  try {
    const url = 'https://api.coingecko.com/api/v3/global';
    const res = await fetchWithTimeout(url, { next: { revalidate: 120 }, timeoutMs: 8000 });

    if (!res.ok) {
      console.warn(`CoinGecko global API returned ${res.status}`);
      return null;
    }

    const data = await res.json();
    const d = data?.data;

    if (!d) return null;

    return {
      totalMarketCap: d.total_market_cap?.usd ?? 0,
      totalVolume: d.total_volume?.usd ?? 0,
      btcDominance: d.market_cap_percentage?.btc ?? 0,
      ethDominance: d.market_cap_percentage?.eth ?? 0,
      activeCryptos: d.active_cryptocurrencies ?? 0,
      marketCapChange24h: d.market_cap_change_percentage_24h_usd ?? 0,
    };
  } catch (error) {
    console.warn(`CoinGecko global fetch failed: ${error instanceof Error ? error.message : error}`);
    return null;
  }
}

interface TickerEntry {
  symbol: string;
  price: number;
  change24h: number;
  volume: number;
  high24h: number;
  low24h: number;
  quoteVolume: number;
}

/** Fetch all Binance 24hr tickers and extract top movers */
async function fetchBinanceTopMovers(): Promise<{
  topGainers: TickerEntry[];
  topLosers: TickerEntry[];
} | null> {
  try {
    const url = 'https://api.binance.com/api/v3/ticker/24hr';
    const res = await fetchWithTimeout(url, { next: { revalidate: 120 }, timeoutMs: 8000 });

    if (!res.ok) {
      console.warn(`Binance ticker API returned ${res.status}`);
      return null;
    }

    const tickers = await res.json();
    if (!Array.isArray(tickers)) return null;

    // Filter only USDT pairs and valid entries
    const usdtPairs: TickerEntry[] = [];
    for (const t of tickers) {
      if (!t.symbol || !t.symbol.endsWith('USDT')) continue;
      if (t.symbol === 'USDCUSDT' || t.symbol === 'BUSDUSDT' || t.symbol === 'TUSDUSDT') continue;

      const price = parseFloat(t.lastPrice);
      const change = parseFloat(t.priceChangePercent);
      const volume = parseFloat(t.quoteVolume);

      if (isNaN(price) || price <= 0) continue;
      // Filter out very low volume or price pairs to avoid noise
      if (volume < 100000) continue;

      usdtPairs.push({
        symbol: t.symbol,
        price,
        change24h: isNaN(change) ? 0 : change,
        volume: isNaN(volume) ? 0 : volume,
        high24h: parseFloat(t.highPrice) || 0,
        low24h: parseFloat(t.lowPrice) || 0,
        quoteVolume: volume,
      });
    }

    // Sort by change24h descending for gainers, ascending for losers
    const sorted = [...usdtPairs].sort((a, b) => b.change24h - a.change24h);
    const topGainers = sorted.slice(0, 5);
    const topLosers = sorted.slice(-5).reverse();

    return { topGainers, topLosers };
  } catch (error) {
    console.warn(`Binance top movers fetch failed: ${error instanceof Error ? error.message : error}`);
    return null;
  }
}

/** Calculate a Fear & Greed proxy based on BTC dominance */
function calculateFearGreedProxy(btcDominance: number): { value: number; label: string } {
  // Simple heuristic:
  // BTC dominance > 55% → slightly fearful (money retreating to BTC)
  // BTC dominance 45-55% → neutral (healthy distribution)
  // BTC dominance < 45% → greedy (alt season, money flowing to alts)
  // We also factor in 24h market cap change

  let value = 50; // neutral baseline

  if (btcDominance > 60) {
    value = 25 + (70 - btcDominance) * 2; // very high dominance → more fearful
  } else if (btcDominance > 55) {
    value = 35 + (60 - btcDominance) * 2;
  } else if (btcDominance > 45) {
    value = 50; // healthy neutral range
  } else if (btcDominance > 40) {
    value = 55 + (45 - btcDominance) * 2; // below 45 → greedy
  } else {
    value = 70; // very low dominance → quite greedy
  }

  // Clamp between 0 and 100
  value = Math.max(0, Math.min(100, Math.round(value)));

  let label: string;
  if (value <= 20) label = 'Extreme Fear';
  else if (value <= 35) label = 'Fear';
  else if (value <= 45) label = 'Neutral Fear';
  else if (value <= 55) label = 'Neutral';
  else if (value <= 65) label = 'Neutral Greed';
  else if (value <= 80) label = 'Greed';
  else label = 'Extreme Greed';

  return { value, label };
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

    // Fetch all data sources in parallel
    const [globalData, binanceMovers] = await Promise.all([
      fetchCoinGeckoGlobal(),
      fetchBinanceTopMovers(),
    ]);

    // Build response with fallback defaults
    const global = globalData ?? {
      totalMarketCap: 0,
      totalVolume: 0,
      btcDominance: 0,
      ethDominance: 0,
      activeCryptos: 0,
      marketCapChange24h: 0,
    };

    const fearGreed = calculateFearGreedProxy(global.btcDominance);

    // Build trending from top gainers (most notable movers)
    const trending = (binanceMovers?.topGainers ?? []).slice(0, 5).map(t => ({
      symbol: t.symbol,
      price: t.price,
      change24h: parseFloat(t.change24h.toFixed(2)),
    }));

    const topGainers = (binanceMovers?.topGainers ?? []).map(t => ({
      symbol: t.symbol,
      price: t.price,
      change24h: parseFloat(t.change24h.toFixed(2)),
      volume: t.quoteVolume,
    }));

    const topLosers = (binanceMovers?.topLosers ?? []).map(t => ({
      symbol: t.symbol,
      price: t.price,
      change24h: parseFloat(t.change24h.toFixed(2)),
      volume: t.quoteVolume,
    }));

    return NextResponse.json({
      global: {
        totalMarketCap: global.totalMarketCap,
        totalVolume: global.totalVolume,
        btcDominance: parseFloat(global.btcDominance.toFixed(1)),
        ethDominance: parseFloat(global.ethDominance.toFixed(1)),
        activeCryptos: global.activeCryptos,
        marketCapChange24h: parseFloat(global.marketCapChange24h.toFixed(2)),
      },
      fearAndGreed: fearGreed,
      trending,
      topGainers,
      topLosers,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Macro market data GET error:', error);

    return NextResponse.json(
      { error: 'Failed to fetch macro market data' },
      { status: 500 }
    );
  }
}
