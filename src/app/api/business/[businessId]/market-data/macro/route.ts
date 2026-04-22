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
  type: string;
  label?: string;
}

/** Fetch top trending/movers from CoinGecko trending + top gainers/losers */
async function fetchCoinGeckoTopMovers(): Promise<{
  trending: TickerEntry[];
  topGainers: TickerEntry[];
  topLosers: TickerEntry[];
} | null> {
  try {
    // Fetch trending coins from CoinGecko
    const trendingRes = await fetchWithTimeout(
      'https://api.coingecko.com/api/v3/search/trending',
      { next: { revalidate: 300 }, timeoutMs: 8000 },
    );

    // Fetch top gainers and losers from CoinGecko (biggest movers in 24h)
    const gainersRes = await fetchWithTimeout(
      'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=price_change_percentage_24h_desc&per_page=10&page=1&sparkline=false&price_change_percentage=24h',
      { next: { revalidate: 120 }, timeoutMs: 10000 },
    );
    const losersRes = await fetchWithTimeout(
      'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=price_change_percentage_24h_asc&per_page=10&page=1&sparkline=false&price_change_percentage=24h',
      { next: { revalidate: 120 }, timeoutMs: 10000 },
    );

    const trending: TickerEntry[] = [];
    const topGainers: TickerEntry[] = [];
    const topLosers: TickerEntry[] = [];

    // Parse trending
    if (trendingRes.ok) {
      const trendingData = await trendingRes.json();
      if (Array.isArray(trendingData?.coins)) {
        for (const item of trendingData.coins.slice(0, 5)) {
          const coin = item.item;
          if (!coin) continue;
          trending.push({
            symbol: (coin.symbol || '').toUpperCase(),
            price: coin.data?.price ?? 0,
            change24h: coin.data?.price_change_percentage_24h?.usd ?? 0,
            volume: coin.data?.total_volume?.usd ?? 0,
            high24h: coin.data?.high_24h?.usd ?? 0,
            low24h: coin.data?.low_24h?.usd ?? 0,
            quoteVolume: coin.data?.total_volume?.usd ?? 0,
            type: 'crypto',
            label: coin.name || undefined,
          });
        }
      }
    }

    // Parse top gainers
    if (gainersRes.ok) {
      const gainersData = await gainersRes.json();
      if (Array.isArray(gainersData)) {
        for (const coin of gainersData.slice(0, 10)) {
          topGainers.push({
            symbol: (coin.symbol || '').toUpperCase(),
            price: coin.current_price ?? 0,
            change24h: coin.price_change_percentage_24h ?? 0,
            volume: coin.total_volume ?? 0,
            high24h: coin.high_24h ?? 0,
            low24h: coin.low_24h ?? 0,
            quoteVolume: coin.total_volume ?? 0,
            type: 'crypto',
            label: coin.name || undefined,
          });
        }
      }
    }

    // Parse top losers
    if (losersRes.ok) {
      const losersData = await losersRes.json();
      if (Array.isArray(losersData)) {
        for (const coin of losersData.slice(0, 10)) {
          topLosers.push({
            symbol: (coin.symbol || '').toUpperCase(),
            price: coin.current_price ?? 0,
            change24h: coin.price_change_percentage_24h ?? 0,
            volume: coin.total_volume ?? 0,
            high24h: coin.high_24h ?? 0,
            low24h: coin.low_24h ?? 0,
            quoteVolume: coin.total_volume ?? 0,
            type: 'crypto',
            label: coin.name || undefined,
          });
        }
      }
    }

    return { trending, topGainers, topLosers };
  } catch (error) {
    console.warn(`CoinGecko top movers fetch failed: ${error instanceof Error ? error.message : error}`);
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
    const [globalData, moversData] = await Promise.all([
      fetchCoinGeckoGlobal(),
      fetchCoinGeckoTopMovers(),
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

    // Build trending from CoinGecko trending coins
    const trending = (moversData?.trending ?? []).slice(0, 5).map(t => ({
      symbol: t.symbol,
      price: t.price,
      change24h: parseFloat(t.change24h.toFixed(2)),
    }));

    const topGainers = (moversData?.topGainers ?? []).slice(0, 10).map(t => ({
      symbol: t.symbol,
      price: t.price,
      change24h: parseFloat(t.change24h.toFixed(2)),
      volume: t.quoteVolume,
      label: t.label,
    }));

    const topLosers = (moversData?.topLosers ?? []).slice(0, 10).map(t => ({
      symbol: t.symbol,
      price: t.price,
      change24h: parseFloat(t.change24h.toFixed(2)),
      volume: t.quoteVolume,
      label: t.label,
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
