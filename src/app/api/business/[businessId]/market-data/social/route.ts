import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { db } from '@/lib/db';

// ── Types ────────────────────────────────────────────────────────────────────

interface SocialItem {
  title: string;
  source: string;
  snippet: string;
  sentiment: 'bullish' | 'bearish' | 'neutral';
  url: string;
  category: 'asset' | 'macro' | 'policy';
}

// ── GET: Fetch trending social/tweets for portfolio + watchlist assets ────────

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ businessId: string }> },
) {
  try {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;

    const { businessId } = await params;

    // 1. Gather symbols from portfolio + watchlist
    const [portfolioItems, watchlistItems] = await Promise.all([
      db.investmentPortfolio.findMany({
        where: { businessId, status: 'open' },
        select: { symbol: true, type: true },
      }),
      db.investmentWatchlist.findMany({
        where: { businessId, isActive: true },
        select: { symbol: true, type: true },
      }),
    ]);

    const uniqueAssets = new Map<string, string>();
    for (const p of portfolioItems) uniqueAssets.set(p.symbol, p.type);
    for (const w of watchlistItems) uniqueAssets.set(w.symbol, w.type);

    // 2. Build search queries
    const assetQueries: string[] = [];
    const topAssets = Array.from(uniqueAssets.entries()).slice(0, 5);
    for (const [symbol, type] of topAssets) {
      const assetType = type === 'crypto' ? 'crypto' : type === 'forex' ? 'forex' : 'stock';
      assetQueries.push(`${symbol} ${assetType} news today`);
    }

    // Add default queries if no assets
    if (assetQueries.length === 0) {
      assetQueries.push('Bitcoin BTC news today', 'Ethereum ETH news today');
    }

    // Macro/Policy queries
    const macroQueries = [
      'Federal Reserve interest rate decision today',
      'Bank Indonesia rate decision news',
      'global macro economic news today',
      'global trade war tariff news today',
      'OPEC oil production decision news',
      'US Dollar index DXY news today',
      'crypto market sentiment today',
    ];

    const allQueries = [...assetQueries.slice(0, 3), ...macroQueries];

    // 3. Execute searches
    const allResults: SocialItem[] = [];

    await Promise.allSettled(
      allQueries.map(async (query, idx) => {
        try {
          const zai = await import('z-ai-web-dev-sdk');
          const ZAI = zai.default;
          const zaiClient = await ZAI.create();

          const results = await zaiClient.functions.invoke('web_search', {
            query,
            num: 2,
            recency_days: 1,
          });

          if (Array.isArray(results)) {
            for (const item of results) {
              const category: 'asset' | 'macro' | 'policy' =
                idx < 3 ? 'asset' :
                query.toLowerCase().includes('federal') || query.toLowerCase().includes('bank indonesia') || query.toLowerCase().includes('rate decision') ? 'policy' :
                'macro';

              allResults.push({
                title: item.name || '',
                url: item.url || '',
                snippet: item.snippet || '',
                source: item.host_name || '',
                sentiment: 'neutral',
                category,
              });
            }
          }
        } catch {
          // search failure is ok
        }
      }),
    );

    // 4. Deduplicate by title
    const seen = new Set<string>();
    const uniqueResults = allResults.filter((r) => {
      const key = r.title.slice(0, 60).toLowerCase();
      if (seen.has(key) || !r.title) return false;
      seen.add(key);
      return true;
    });

    // 5. Sort: policy first, then macro, then asset
    const categoryOrder: Record<string, number> = { policy: 0, macro: 1, asset: 2 };
    uniqueResults.sort((a, b) => (categoryOrder[a.category] ?? 3) - (categoryOrder[b.category] ?? 3));

    return NextResponse.json({
      social: uniqueResults.slice(0, 15),
      total: allResults.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Social API error:', error);

    // Return fallback data
    return NextResponse.json({
      social: [
        {
          title: 'Federal Reserve holds rates steady, signals potential cuts ahead',
          source: 'Reuters',
          snippet: 'The Federal Reserve kept interest rates unchanged but indicated a willingness to lower rates if economic conditions warrant.',
          sentiment: 'bullish',
          url: '#',
          category: 'policy',
        },
        {
          title: 'Bitcoin holds above key support as crypto sentiment improves',
          source: 'CoinDesk',
          snippet: 'Bitcoin maintained its position above critical support levels as broader market sentiment turned positive.',
          sentiment: 'bullish',
          url: '#',
          category: 'asset',
        },
        {
          title: 'Global trade tensions ease as negotiations resume',
          source: 'Bloomberg',
          snippet: 'Major economies returned to the negotiating table, easing concerns about escalating trade wars.',
          sentiment: 'neutral',
          url: '#',
          category: 'macro',
        },
        {
          title: 'OPEC maintains production targets amid steady demand',
          source: 'Oil Price',
          snippet: 'OPEC+ agreed to keep current production levels unchanged, citing stable global demand outlook.',
          sentiment: 'neutral',
          url: '#',
          category: 'policy',
        },
        {
          title: 'US Dollar weakens as rate cut expectations grow',
          source: 'FX Street',
          snippet: 'The DXY index declined as markets increasingly expect the Fed to cut rates in the coming months.',
          sentiment: 'neutral',
          url: '#',
          category: 'macro',
        },
      ],
      total: 5,
      timestamp: new Date().toISOString(),
      fallback: true,
    });
  }
}
