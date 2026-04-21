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

    // 1. Search for breaking financial news using web search
    const newsQueries = [
      'crypto market breaking news today',
      'forex USD IDR breaking news',
      'Indonesian stock market IDX news',
      'gold XAU price news today',
      'Bitcoin BTC breaking news',
    ];

    const allNews: NewsItem[] = [];

    await Promise.allSettled(
      newsQueries.map(async (query) => {
        try {
          const zai = await import('z-ai-web-dev-sdk');
          const ZAI = zai.default;
          const zaiClient = await ZAI.create();

          const results = await zaiClient.functions.invoke('web_search', {
            query,
            num: 3,
            recency_days: 1,
          });

          if (Array.isArray(results)) {
            for (const item of results) {
              allNews.push({
                title: item.name || '',
                url: item.url || '',
                snippet: item.snippet || '',
                source: item.host_name || '',
                publishedAt: new Date().toISOString(),
                sentiment: 'neutral',
              });
            }
          }
        } catch {
          // search failure is ok
        }
      }),
    );

    // Deduplicate by title
    const seen = new Set<string>();
    const uniqueNews = allNews.filter((n) => {
      const key = n.title.slice(0, 50).toLowerCase();
      if (seen.has(key) || !n.title) return false;
      seen.add(key);
      return true;
    });

    // 2. Use LLM to analyze news impact on portfolio
    let assetImpacts: AssetImpact[] = [];
    let overallSentiment: 'neutral' = 'neutral';

    if (uniqueNews.length > 0) {
      try {
        const zai = await import('z-ai-web-dev-sdk');
        const ZAI = zai.default;
        const zaiClient = await ZAI.create();

        // Read portfolio from DB
        const { db } = await import('@/lib/db');
        const portfolio = await db.portfolioItem.findMany({
          where: { businessId, status: 'open' },
          select: { symbol: true, type: true, entryPrice: true },
        });

        const portfolioSymbols = portfolio.map((p) => `${p.type}:${p.symbol}`).join(', ');

        if (portfolioSymbols) {
          const newsDigest = uniqueNews
            .slice(0, 8)
            .map((n, i) => `[${i + 1}] ${n.title}: ${n.snippet}`)
            .join('\n');

          const analysisPrompt = `You are a financial analyst AI. Analyze this breaking financial news and predict impact on the user's portfolio assets.

Portfolio Assets: ${portfolioSymbols}

Breaking News:
${newsDigest}

For each portfolio asset that is mentioned or could be impacted, provide:
1. The asset symbol and type
2. Impact assessment: positive, negative, or mixed
3. Confidence level (0-100)
4. Trading action recommendation: BUY, SELL, HOLD, or WATCH
5. Brief reasoning (1-2 sentences)

Also detect the overall market sentiment from the news: bullish, bearish, or neutral.

Respond ONLY with valid JSON in this exact format:
{
  "sentiment": "bullish" or "bearish" or "neutral",
  "impacts": [
    {
      "symbol": "BTCUSDT",
      "type": "crypto",
      "impact": "positive",
      "confidence": 75,
      "action": "BUY",
      "entryPrice": "$65000",
      "targetPrice": "$68000",
      "stopLoss": "$63000",
      "reasoning": "Bitcoin breaking resistance on positive news"
    }
  ]
}

If no assets are clearly impacted, return empty impacts array. Provide realistic but conservative price levels. Only include assets you're confident about.`;

          const llmResult = await zaiClient.chat.completions.create({
            messages: [
              {
                role: 'user',
                content: analysisPrompt,
              },
            ],
          });

          const content =
            llmResult?.choices?.[0]?.message?.content || '';
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
        console.warn('LLM analysis failed:', error);
      }
    }

    return NextResponse.json({
      news: uniqueNews.slice(0, 10),
      sentiment: overallSentiment,
      impacts: assetImpacts,
      totalNewsSearched: allNews.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('News API error:', error);

    return NextResponse.json(
      {
        error: 'Failed to fetch news data',
        news: [],
        sentiment: 'neutral',
        impacts: [],
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}
