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

    // Fetch 250 coins from CoinGecko (max free tier) then sort client-side for REAL top gainers/losers
    // Using market_cap order to get the broadest set, then we find real movers across all 250
    const allCoinsRes = await fetchWithTimeout(
      'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=250&page=1&sparkline=false&price_change_percentage=24h',
      { next: { revalidate: 120 }, timeoutMs: 12000 },
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

    // Parse all 250 coins, sort by 24h change, extract real top 5 gainers & top 5 losers
    if (allCoinsRes.ok) {
      const allCoinsData = await allCoinsRes.json();
      if (Array.isArray(allCoinsData) && allCoinsData.length > 0) {
        // Filter out coins with null change and very low volume (< $50k) to avoid noise
        const validCoins = allCoinsData.filter(
          (c: Record<string, unknown>) => c.price_change_percentage_24h != null && ((c.total_volume as number) ?? 0) > 50000
        );

        // Sort by 24h change descending for gainers
        const sortedByChangeDesc = [...validCoins].sort(
          (a: Record<string, unknown>, b: Record<string, unknown>) =>
            (b.price_change_percentage_24h as number) - (a.price_change_percentage_24h as number)
        );

        // Top 5 gainers (highest positive 24h change)
        for (const coin of sortedByChangeDesc.slice(0, 5)) {
          topGainers.push({
            symbol: (coin.symbol || '').toUpperCase(),
            price: coin.current_price ?? 0,
            change24h: coin.price_change_percentage_24h != null ? coin.price_change_percentage_24h : 0,
            volume: coin.total_volume ?? 0,
            high24h: coin.high_24h ?? 0,
            low24h: coin.low_24h ?? 0,
            quoteVolume: coin.total_volume ?? 0,
            type: 'crypto',
            label: coin.name || undefined,
          });
        }

        // Top 5 losers (most negative 24h change)
        for (const coin of sortedByChangeDesc.slice(-5).reverse()) {
          topLosers.push({
            symbol: (coin.symbol || '').toUpperCase(),
            price: coin.current_price ?? 0,
            change24h: coin.price_change_percentage_24h != null ? coin.price_change_percentage_24h : 0,
            volume: coin.total_volume ?? 0,
            high24h: coin.low_24h ?? 0,
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

/** Fetch real Fear & Greed Index from Alternative.me (free, no API key) */
async function fetchRealFearGreed(): Promise<{ value: number; label: string } | null> {
  try {
    const url = 'https://api.alternative.me/fng/?limit=1';
    const res = await fetchWithTimeout(url, { timeoutMs: 5000 });
    if (!res.ok) {
      console.warn(`Alternative.me FNG API returned ${res.status}`);
      return null;
    }
    const data = await res.json();
    const entry = data?.data?.[0];
    if (!entry) return null;
    const value = parseInt(entry.value, 10);
    const label = entry.value_classification as string;
    if (isNaN(value)) return null;
    return { value, label: label || 'Unknown' };
  } catch (error) {
    console.warn(`Alternative.me FNG fetch failed: ${error instanceof Error ? error.message : error}`);
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

    // Try real Fear & Greed API first, fallback to proxy
    const realFearGreed = await fetchRealFearGreed();
    const fearGreed = realFearGreed ?? calculateFearGreedProxy(global.btcDominance);
    const fearGreedSource: 'alternative.me' | 'proxy' = realFearGreed ? 'alternative.me' : 'proxy';

    // Build trending from CoinGecko trending coins
    const trending = (moversData?.trending ?? []).slice(0, 5).map(t => ({
      symbol: t.symbol,
      price: t.price,
      change24h: parseFloat((t.change24h ?? 0).toFixed(2)),
      type: 'crypto',
    }));

    const topGainers = (moversData?.topGainers ?? []).slice(0, 5).map(t => ({
      symbol: t.symbol,
      price: t.price,
      change24h: parseFloat((t.change24h ?? 0).toFixed(2)),
      volume: t.quoteVolume,
      label: t.label,
      type: 'crypto',
    }));

    const topLosers = (moversData?.topLosers ?? []).slice(0, 5).map(t => ({
      symbol: t.symbol,
      price: t.price,
      change24h: parseFloat((t.change24h ?? 0).toFixed(2)),
      volume: t.quoteVolume,
      label: t.label,
      type: 'crypto',
    }));

    return NextResponse.json({
      global: {
        totalMarketCap: global.totalMarketCap,
        totalVolume: global.totalVolume,
        btcDominance: parseFloat((global.btcDominance ?? 0).toFixed(1)),
        ethDominance: parseFloat((global.ethDominance ?? 0).toFixed(1)),
        activeCryptos: global.activeCryptos,
        marketCapChange24h: parseFloat((global.marketCapChange24h ?? 0).toFixed(2)),
      },
      fearAndGreed: fearGreed,
      fearGreedSource,
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
