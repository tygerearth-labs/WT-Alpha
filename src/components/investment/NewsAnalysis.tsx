'use client';

import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useBusinessStore } from '@/store/useBusinessStore';
import { useTranslation } from '@/hooks/useTranslation';
import {
  Card,
  CardContent,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import {
  ExternalLink,
  Newspaper,
  Flame,
  TrendingUp,
  TrendingDown,
  Activity,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  Zap,
  Target,
  ShieldAlert,
  Minus,
  BrainCircuit,
  Clock,
  ChevronRight,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

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

interface NewsData {
  news: NewsItem[];
  sentiment: 'bullish' | 'bearish' | 'neutral';
  impacts: AssetImpact[];
  totalNewsSearched: number;
  timestamp: string;
}

// ── Design Tokens ────────────────────────────────────────────────────────────

const TYPE_COLORS: Record<string, { bg: string; text: string; hex: string }> = {
  saham: { bg: 'rgba(187,134,252,0.12)', text: '#BB86FC', hex: '#BB86FC' },
  crypto: { bg: 'rgba(3,218,198,0.12)', text: '#03DAC6', hex: '#03DAC6' },
  forex: { bg: 'rgba(207,102,121,0.12)', text: '#CF6679', hex: '#CF6679' },
};

const UP = '#03DAC6';
const DOWN = '#CF6679';
const NEUTRAL = '#FFD54F';
const BG_CARD = '#1A1A2E';

// ── Animation ─────────────────────────────────────────────────────────────────

const fadeIn = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.3 } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.06, duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] },
  }),
};

// ── Helpers ────────────────────────────────────────────────────────────────────

function getActionColor(action: string): string {
  switch (action) {
    case 'BUY': return UP;
    case 'SELL': return DOWN;
    case 'HOLD': return NEUTRAL;
    default: return '#888';
  }
}

function getActionBg(action: string): string {
  switch (action) {
    case 'BUY': return 'rgba(3,218,198,0.12)';
    case 'SELL': return 'rgba(207,102,121,0.12)';
    case 'HOLD': return 'rgba(255,213,79,0.12)';
    default: return 'rgba(255,255,255,0.06)';
  }
}

function getSentimentConfig(sentiment: string) {
  switch (sentiment) {
    case 'bullish':
      return {
        label: 'Bullish',
        color: UP,
        bg: 'rgba(3,218,198,0.12)',
        icon: TrendingUp,
        gradient: 'from-[#03DAC6]/10 to-transparent',
      };
    case 'bearish':
      return {
        label: 'Bearish',
        color: DOWN,
        bg: 'rgba(207,102,121,0.12)',
        icon: TrendingDown,
        gradient: 'from-[#CF6679]/10 to-transparent',
      };
    default:
      return {
        label: 'Neutral',
        color: NEUTRAL,
        bg: 'rgba(255,213,79,0.12)',
        icon: Activity,
        gradient: 'from-[#FFD54F]/10 to-transparent',
      };
  }
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function NewsAnalysis() {
  const { activeBusiness } = useBusinessStore();
  const { t } = useTranslation();
  const businessId = activeBusiness?.id;

  const [newsData, setNewsData] = useState<NewsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedNews, setExpandedNews] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // ── Fetch news ───────────────────────────────────────────────────────────
  const fetchNews = useCallback(
    (isRefresh = false) => {
      if (!businessId) return;

      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      if (abortRef.current) abortRef.current.abort();
      abortRef.current = new AbortController();

      fetch(`/api/business/${businessId}/market-data/news`, {
        signal: abortRef.current.signal,
      })
        .then((res) => {
          if (!res.ok) throw new Error('Failed');
          return res.json();
        })
        .then((data: NewsData) => {
          setNewsData(data);
          setLoading(false);
          setRefreshing(false);
        })
        .catch((err) => {
          if (err.name !== 'AbortError') {
            setNewsData(null);
          }
          setLoading(false);
          setRefreshing(false);
        });
    },
    [businessId],
  );

  useEffect(() => {
    if (!businessId) return;
    const timer = setTimeout(() => fetchNews(), 0);
    return () => clearTimeout(timer);
  }, [businessId, fetchNews]);

  // ── Guard ──────────────────────────────────────────────────────────────────
  if (!businessId) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-white/50 text-center">{t('inv.registerFirst')}</p>
      </div>
    );
  }

  const sentiment = newsData ? getSentimentConfig(newsData.sentiment) : null;
  const SentimentIcon = sentiment?.icon || Activity;

  // ── Loading ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Skeleton className="h-8 w-8 rounded-lg bg-[#1A1A2E]" />
            <Skeleton className="h-6 w-48 rounded bg-[#1A1A1E]" />
          </div>
          <Skeleton className="h-8 w-24 rounded-lg bg-[#1A1A2E]" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Skeleton className="h-[300px] rounded-xl bg-[#1A1A2E]" />
          <Skeleton className="h-[300px] rounded-xl bg-[#1A1A2E]" />
          <Skeleton className="h-[300px] rounded-xl bg-[#1A1A2E]" />
        </div>
      </div>
    );
  }

  if (!newsData) {
    return (
      <Card className={cn('border-white/[0.06]', 'bg-[#1A1A2E]')}>
        <CardContent className="flex flex-col items-center justify-center py-16">
          <Newspaper className="h-12 w-12 text-white/15 mb-3" />
          <p className="text-white/40 text-center mb-1">Unable to load market news</p>
          <Button
            variant="ghost"
            size="sm"
            className="mt-3 text-white/30 hover:text-white/60 hover:bg-white/[0.04] gap-2"
            onClick={() => fetchNews(true)}
          >
            <RefreshCw className="h-4 w-4" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div
      className="space-y-4"
      variants={fadeIn}
      initial="hidden"
      animate="visible"
    >
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <motion.div
        className="flex items-center justify-between"
        variants={cardVariants}
        custom={0}
      >
        <div className="flex items-center gap-3">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-lg"
            style={{ backgroundColor: `${UP}18` }}
          >
            <Newspaper className="h-5 w-5" style={{ color: UP }} />
          </div>
          <div>
            <h2 className="text-base font-bold text-white tracking-tight">
              {t('macro.trending') || 'Breaking News & AI Analysis'}
            </h2>
            <p className="text-[11px] text-white/30">
              Market news with AI-powered asset analysis
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {sentiment && (
            <Badge
              className="text-[10px] font-bold px-2.5 py-1 border-0 gap-1"
              style={{ backgroundColor: sentiment.bg, color: sentiment.color }}
            >
              <SentimentIcon className="h-3 w-3" />
              {sentiment.label}
            </Badge>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2.5 text-white/40 hover:text-white/70 hover:bg-white/[0.06] gap-1.5"
            onClick={() => fetchNews(true)}
            disabled={refreshing}
          >
            <RefreshCw className={cn('h-3.5 w-3.5', refreshing && 'animate-spin')} />
            <span className="text-[10px]">Refresh</span>
          </Button>
        </div>
      </motion.div>

      {/* ── AI Impact Cards ──────────────────────────────────────────────── */}
      {newsData.impacts.length > 0 && (
        <motion.div variants={cardVariants} custom={1}>
          <div className="flex items-center gap-2 mb-3">
            <BrainCircuit className="h-4 w-4 text-[#03DAC6]/60" />
            <span className="text-[10px] text-white/40 uppercase tracking-wider font-bold">
              AI Asset Impact Analysis
            </span>
            <Badge
              variant="outline"
              className="border-[#03DAC6]/20 text-[#03DAC6]/60 text-[10px]"
            >
              Powered by AI
            </Badge>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <AnimatePresence mode="popLayout">
              {newsData.impacts.map((impact, i) => {
                const tc = TYPE_COLORS[impact.type] || TYPE_COLORS.crypto;
                const actionColor = getActionColor(impact.action);
                const actionBg = getActionBg(impact.action);

                return (
                  <motion.div
                    key={`${impact.symbol}-${i}`}
                    variants={cardVariants}
                    custom={i + 2}
                    layout
                    initial="hidden"
                    animate="visible"
                    exit="hidden"
                  >
                    <Card
                      className={cn(
                        'bg-[#1A1A2E] border border-white/[0.06] hover:border-white/[0.12]',
                        'transition-all relative overflow-hidden group cursor-default',
                      )}
                    >
                      {/* Top accent line */}
                      <div
                        className="absolute top-0 inset-x-0 h-0.5"
                        style={{ backgroundColor: actionColor }}
                      />

                      <CardContent className="p-4 pt-5 relative">
                        {/* Header */}
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-white/90 font-mono">
                              {impact.symbol}
                            </span>
                            <Badge
                              className="text-[8px] px-1.5 py-0 h-4 font-medium border-0"
                              style={{
                                backgroundColor: tc.bg,
                                color: tc.text,
                              }}
                            >
                              {impact.type.toUpperCase()}
                            </Badge>
                          </div>
                          {/* Action badge */}
                          <Badge
                            className="text-[10px] px-2 py-0.5 h-5 font-bold border-0"
                            style={{
                              backgroundColor: actionBg,
                              color: actionColor,
                              boxShadow: `0 0 8px ${actionColor}20`,
                            }}
                          >
                            {impact.action}
                          </Badge>
                        </div>

                        {/* Reasoning */}
                        <p className="text-[11px] text-white/40 leading-relaxed mb-3 line-clamp-2">
                          {impact.reasoning}
                        </p>

                        {/* Confidence bar */}
                        <div className="mb-3">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[9px] text-white/25 uppercase">
                              Confidence
                            </span>
                            <span
                              className="text-[10px] font-mono font-bold"
                              style={{ color: actionColor }}
                            >
                              {impact.confidence}%
                            </span>
                          </div>
                          <div className="h-1.5 rounded-full bg-white/[0.04] overflow-hidden">
                            <motion.div
                              className="h-full rounded-full"
                              style={{ backgroundColor: actionColor }}
                              initial={{ width: '0%' }}
                              animate={{ width: `${impact.confidence}%` }}
                              transition={{ duration: 0.8, ease: 'easeOut' }}
                            />
                          </div>
                        </div>

                        {/* Price levels */}
                        <div className="grid grid-cols-3 gap-2 pt-3 border-t border-white/[0.04]">
                          {impact.entryPrice && (
                            <div className="text-center">
                              <p className="text-[9px] text-white/25 uppercase mb-0.5">
                                Entry
                              </p>
                              <p className="text-[11px] font-mono font-bold text-white/70">
                                {impact.entryPrice}
                              </p>
                            </div>
                          )}
                          {impact.targetPrice && (
                            <div className="text-center">
                              <p className="text-[9px] text-white/25 uppercase mb-0.5">
                                Target
                              </p>
                              <p className="text-[11px] font-mono font-bold text-[#03DAC6]">
                                {impact.targetPrice}
                              </p>
                            </div>
                          )}
                          {impact.stopLoss && (
                            <div className="text-center">
                              <p className="text-[9px] text-white/25 uppercase mb-0.5">
                                Stop Loss
                              </p>
                              <p className="text-[11px] font-mono font-bold text-[#CF6679]">
                                {impact.stopLoss}
                              </p>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </motion.div>
      )}

      {/* ── News Feed ─────────────────────────────────────────────────────── */}
      {newsData.news.length > 0 && (
        <motion.div variants={cardVariants} custom={2}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Flame className="h-4 w-4 text-[#FF7043]" />
              <span className="text-[10px] text-white/40 uppercase tracking-wider font-bold">
                Latest News
              </span>
              <Badge
                variant="outline"
                className="border-white/[0.06] text-white/30 text-[10px]"
              >
                {newsData.news.length} articles
              </Badge>
            </div>
          </div>

          <Card className="bg-[#1A1A2E] border border-white/[0.06]">
            <CardContent className="p-0">
              <div className="max-h-[400px] overflow-y-auto">
                <AnimatePresence mode="popLayout">
                  {newsData.news.slice(0, 5).map((item, i) => {
                    const isUp =
                      item.sentiment === 'bullish';
                    const isDown =
                      item.sentiment === 'bearish';
                    const sentimentColor = isUp
                      ? UP
                      : isDown
                        ? DOWN
                        : '#888';
                    const isSelected = expandedNews === item.url;

                    return (
                      <motion.div
                        key={item.url || i}
                        variants={cardVariants}
                        custom={i}
                        layout
                        initial="hidden"
                        animate="visible"
                        exit="hidden"
                      >
                        <button
                          className="w-full text-left"
                          onClick={() =>
                            setExpandedNews(
                              isSelected ? null : item.url,
                            )
                          }
                        >
                          <div
                            className={cn(
                              'flex items-start gap-3 px-4 py-3 transition-colors border-b border-white/[0.04] last:border-0 hover:bg-white/[0.02]',
                            isSelected && 'bg-white/[0.03]',
                          )}
                        >
                          {/* Sentiment indicator */}
                          <div
                            className="mt-1 shrink-0"
                            style={{
                              color: sentimentColor,
                            }}
                          >
                            {isUp ? (
                              <TrendingUp className="h-4 w-4" />
                            ) : isDown ? (
                              <TrendingDown className="h-4 w-4" />
                            ) : (
                              <Minus className="h-4 w-4" />
                            )}
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <h4
                                className="text-[13px] text-white/70 font-semibold leading-snug line-clamp-1"
                                title={item.title}
                              >
                                {item.title}
                              </h4>
                              <ChevronRight
                                className={cn(
                                  'h-4 w-4 shrink-0 mt-0.5 transition-transform text-white/20',
                                  isSelected && 'rotate-90',
                                )}
                              />
                            </div>

                            {isSelected && (
                              <motion.p
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                className="text-[11px] text-white/35 leading-relaxed mt-1.5 line-clamp-3"
                              >
                                {item.snippet}
                              </motion.p>
                            )}

                            <div className="flex items-center gap-2 mt-1.5">
                              <span className="text-[10px] text-white/20 truncate max-w-[200px]">
                                {item.source}
                              </span>
                              <span className="text-[10px] text-white/15">•</span>
                              <Clock className="h-3 w-3 text-white/15" />
                              <span className="text-[10px] text-white/15">
                                {item.publishedAt
                                  ? new Date(item.publishedAt).toLocaleTimeString([], {
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    })
                                  : 'now'}
                              </span>
                            </div>
                          </div>

                          {/* External link icon */}
                          <a
                            href={item.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-0.5 shrink-0 p-1.5 rounded-md text-white/15 hover:text-white/50 hover:bg-white/[0.06] transition-colors"
                            onClick={(e) => e.stopPropagation()}
                            title="Open article"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        </div>
                      </button>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </CardContent>
        </Card>
      </motion.div>
      )}

      {/* ── No impacts disclaimer ─────────────────────────────────────────── */}
      {newsData.impacts.length === 0 && newsData.news.length > 0 && (
        <Card className="bg-[#1A1A2E] border-white/[0.06]">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div
                className="flex h-8 w-8 items-center justify-center rounded-lg shrink-0"
                style={{ backgroundColor: 'rgba(255,213,79,0.1)' }}
              >
                <ShieldAlert className="h-4 w-4" style={{ color: NEUTRAL }} />
              </div>
              <div>
                <p className="text-xs text-white/50 font-semibold mb-1">
                  AI Analysis Complete
                </p>
                <p className="text-[11px] text-white/30 leading-relaxed">
                  No significant impact detected on your current portfolio
                  positions from today&apos;s news. Market conditions are
                  stable — continue monitoring with your current strategy.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </motion.div>
  );
}
