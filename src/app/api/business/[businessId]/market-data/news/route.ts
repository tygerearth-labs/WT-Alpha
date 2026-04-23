import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';

// ── Types ────────────────────────────────────────────────────────────────────

interface NewsItem {
  title: string;
  url: string;
  snippet: string;
  source: string;
  publishedAt?: string;
  sentiment: 'bullish' | 'bearish' | 'neutral';
}

interface AssetImpact {
  symbol: string;
  type: string;
  impact: 'positive' | 'negative' | 'mixed';
  confidence: number;
  action: 'BUY' | 'SELL' | 'HOLD' | 'WATCH';
  entryPrice?: string;
  targetPrice?: string;
  stopLoss?: string;
  reasoning: string;
}

// ── GET Handler ──────────────────────────────────────────────────────────────

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ businessId: string }> },
) {
  try {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;

    const { businessId } = await params;

    // 1. Read portfolio + watchlist symbols for targeted queries
    const { db } = await import('@/lib/db');
    const [portfolioItems, watchlistItems] = await Promise.all([
      db.investmentPortfolio.findMany({
        where: { businessId, status: 'open' },
        select: { symbol: true, type: true },
      }),
      db.watchlistItem.findMany({
        where: { businessId, isActive: true },
        select: { symbol: true, type: true },
      }),
    ]);

    const uniqueAssets = new Map<string, string>();
    for (const p of portfolioItems) uniqueAssets.set(p.symbol, p.type);
    for (const w of watchlistItems) uniqueAssets.set(w.symbol, w.type);

    // Build targeted asset queries
    const assetNewsQueries: string[] = [];
    const topAssets = Array.from(uniqueAssets.entries()).slice(0, 4);
    for (const [symbol, type] of topAssets) {
      const assetType = type === 'crypto' ? 'cryptocurrency' : type === 'forex' ? 'forex' : type === 'komoditas' ? 'commodity' : type === 'indeks' ? 'stock index' : 'stock';
      assetNewsQueries.push(`${symbol} ${assetType} price news today 2025`);
    }

    // 2. Build search queries
    const newsQueries = [
      ...assetNewsQueries,
      'cryptocurrency market news today Bitcoin Ethereum Solana price',
      'forex market USD IDR EUR news today',
      'Indonesian stock market IDX IHSG news today',
      'gold silver XAU XAG commodity price news',
      'oil crude commodity market news today',
      'US stock market S&P 500 Nasdaq news today',
      'Federal Reserve interest rate decision',
      'Bank Indonesia BI rate decision news',
      'global trade war tariff news 2025',
    ];

    const allNews: NewsItem[] = [];

    // 3. Initialize ZAI ONCE, reuse for all queries
    let zaiClient: any = null;
    try {
      const zai = await import('z-ai-web-dev-sdk');
      const ZAI = zai.default;
      zaiClient = await ZAI.create();
    } catch (error) {
      console.warn('ZAI SDK init failed for news:', error instanceof Error ? error.message : error);
    }

    if (zaiClient) {
      // Execute queries in batches of 3 to avoid rate limiting
      for (let i = 0; i < newsQueries.length; i += 3) {
        const batch = newsQueries.slice(i, i + 3);
        await Promise.allSettled(
          batch.map(async (query) => {
            try {
              const results = await zaiClient.functions.invoke('web_search', {
                query,
                num: 3,
                recency_days: 1,
              });

              if (Array.isArray(results)) {
                for (const item of results) {
                  const title = item.name || '';
                  if (!title) continue;
                  allNews.push({
                    title,
                    url: item.url || '#',
                    snippet: item.snippet || '',
                    source: item.host_name || 'Web',
                    publishedAt: new Date().toISOString(),
                    sentiment: 'neutral',
                  });
                }
              }
            } catch (error) {
              console.warn(`Web search failed for: "${query}":`, error instanceof Error ? error.message : error);
            }
          }),
        );

        // Small delay between batches to avoid rate limiting
        if (i + 3 < newsQueries.length) {
          await new Promise(r => setTimeout(r, 500));
        }
      }
    }

    // Deduplicate by title
    const seen = new Set<string>();
    const uniqueNews = allNews.filter((n) => {
      const key = n.title.slice(0, 50).toLowerCase().replace(/[^a-z0-9]/g, '');
      if (seen.has(key) || !n.title) return false;
      seen.add(key);
      return true;
    });

    // No fake fallback news — return only real data
    const isPartial = uniqueNews.length < 5;

    // 4. Use LLM to analyze news impact on portfolio
    let assetImpacts: AssetImpact[] = [];
    let overallSentiment: 'bullish' | 'bearish' | 'neutral' = 'neutral';

    if (uniqueNews.length > 0 && zaiClient) {
      try {
        const portfolioSymbols = Array.from(uniqueAssets.entries())
          .map(([symbol, type]) => `${type}:${symbol}`)
          .join(', ');

        if (portfolioSymbols) {
          const newsDigest = uniqueNews
            .slice(0, 10)
            .map((n, i) => `[${i + 1}] ${n.title}: ${n.snippet}`)
            .join('\n');

          const analysisPrompt = `You are a financial analyst AI. Analyze this financial news and predict impact on the user's portfolio.

Portfolio Assets: ${portfolioSymbols}

News:
${newsDigest}

For each portfolio asset impacted, provide:
1. Asset symbol and type
2. Impact: positive, negative, or mixed
3. Confidence (0-100)
4. Action: BUY, SELL, HOLD, or WATCH
5. Brief reasoning (1-2 sentences)

Detect overall market sentiment: bullish, bearish, or neutral.

Respond ONLY with valid JSON:
{
  "sentiment": "bullish" or "bearish" or "neutral",
  "impacts": [
    {
      "symbol": "BTC",
      "type": "crypto",
      "impact": "positive",
      "confidence": 75,
      "action": "BUY",
      "entryPrice": "$95000",
      "targetPrice": "$98000",
      "stopLoss": "$92000",
      "reasoning": "Strong momentum from positive news"
    }
  ]
}`;

          const llmResult = await zaiClient.chat.completions.create({
            messages: [{ role: 'user', content: analysisPrompt }],
          });

          const content = llmResult?.choices?.[0]?.message?.content || '';
          const jsonMatch = content.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);

            if (parsed.sentiment) {
              overallSentiment = parsed.sentiment;
              for (const news of uniqueNews) {
                news.sentiment = parsed.sentiment;
              }
            }

            if (Array.isArray(parsed.impacts)) {
              assetImpacts = parsed.impacts
                .filter((imp: AssetImpact) => imp.symbol && imp.action)
                .map((imp: AssetImpact) => ({
                  symbol: imp.symbol,
                  type: imp.type || 'crypto',
                  impact: imp.impact || 'mixed',
                  confidence: Math.min(100, Math.max(0, imp.confidence || 50)),
                  action: imp.action || 'WATCH',
                  entryPrice: imp.entryPrice || undefined,
                  targetPrice: imp.targetPrice || undefined,
                  stopLoss: imp.stopLoss || undefined,
                  reasoning: imp.reasoning || '',
                }));
            }
          }
        }
      } catch (error) {
        console.warn('LLM news analysis failed:', error instanceof Error ? error.message : error);
      }
    }

    return NextResponse.json({
      news: uniqueNews.slice(0, 12),
      sentiment: overallSentiment,
      impacts: assetImpacts,
      totalNewsSearched: allNews.length,
      isPartial,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('News API error:', error);

    return NextResponse.json(
      {
        error: 'Failed to fetch news data',
        news: [],
        sentiment: 'error',
        impacts: [],
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}
