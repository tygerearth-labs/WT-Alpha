'use client';

import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useBusinessStore } from '@/store/useBusinessStore';
import { useTranslation } from '@/hooks/useTranslation';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import {
  Globe,
  BarChart3,
  TrendingUp,
  TrendingDown,
  Activity,
  Coins,
  RefreshCw,
  Flame,
  Zap,
  ArrowUpRight,
  ArrowDownRight,
  Gauge,
  PieChart,
  Layers,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

// ── Types ────────────────────────────────────────────────────────────────────

interface MacroGlobal {
  totalMarketCap: number;
  totalVolume: number;
  btcDominance: number;
  ethDominance: number;
  activeCryptos: number;
  marketCapChange24h: number;
}

interface MacroAsset {
  symbol: string;
  price: string;
  change24h: number;
}

interface MacroData {
  global: MacroGlobal;
  trending: MacroAsset[];
  topGainers: MacroAsset[];
  topLosers: MacroAsset[];
  timestamp: string;
}

// ── Design Tokens ────────────────────────────────────────────────────────────

const UP_COLOR = '#03DAC6';
const DOWN_COLOR = '#CF6679';
const GOLD_COLOR = '#FFD54F';
const BG_DARK = '#0D0D0D';
const BG_CARD = '#1A1A2E';

// ── Number Formatting ────────────────────────────────────────────────────────

const compactFmt = new Intl.NumberFormat('en-US', {
  notation: 'compact',
  compactDisplay: 'short',
  maximumFractionDigits: 2,
});

function toF(val: number | undefined | null, digits = 2): string {
  const n = typeof val === 'number' && !isNaN(val) ? val : 0;
  return n.toFixed(digits);
}

function formatMarketCap(value: number | undefined | null): string {
  const n = typeof value === 'number' && !isNaN(value) ? value : 0;
  return `$${compactFmt.format(n)}`;
}

function formatCompact(value: number | undefined | null): string {
  const n = typeof value === 'number' && !isNaN(value) ? value : 0;
  return compactFmt.format(n);
}

// ── Sentiment Helper ─────────────────────────────────────────────────────────

interface SentimentInfo {
  label: string;
  color: string;
  bgColor: string;
  percentage: number; // 0–100 for gauge position
}

function getSentiment(change24h: number, t: (key: string) => string): SentimentInfo {
  if (change24h > 3) return { label: t('macro.extremeGreed'), color: '#00E676', bgColor: 'rgba(0,230,118,0.12)', percentage: 95 };
  if (change24h > 1) return { label: t('macro.greed'), color: '#03DAC6', bgColor: 'rgba(3,218,198,0.12)', percentage: 70 };
  if (change24h >= -1) return { label: t('macro.neutral'), color: '#FFD54F', bgColor: 'rgba(255,213,79,0.12)', percentage: 50 };
  if (change24h >= -3) return { label: t('macro.fear'), color: '#FF7043', bgColor: 'rgba(255,112,67,0.12)', percentage: 30 };
  return { label: t('macro.extremeFear'), color: '#FF1744', bgColor: 'rgba(255,23,68,0.12)', percentage: 5 };
}

// ── Animation Variants ───────────────────────────────────────────────────────

const cardVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.05, duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] as const },
  }),
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.04 } },
};

// ── Component ────────────────────────────────────────────────────────────────

export default function MacroEconomy() {
  const { activeBusiness } = useBusinessStore();
  const { t } = useTranslation();

  const [macroData, setMacroData] = useState<MacroData | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [countdown, setCountdown] = useState(60);

  const businessId = activeBusiness?.id;

  // ── Fetch macro data ──────────────────────────────────────────────────────
  const fetchMacro = useCallback(
    (isRefresh = false) => {
      if (!businessId) return;

      if (abortRef.current) abortRef.current.abort();
      abortRef.current = new AbortController();

      fetch(`/api/business/${businessId}/market-data/macro`, {
        signal: abortRef.current.signal,
      })
        .then((res) => {
          if (!res.ok) throw new Error('Failed to fetch');
          return res.json();
        })
        .then((data: MacroData) => {
          setMacroData(data);
          setLoading(false);
          setRefreshing(false);
          setLastRefresh(new Date());
          setCountdown(60);
        })
        .catch((err) => {
          if (err.name !== 'AbortError') {
            setLoading(false);
            setRefreshing(false);
          }
        });

      if (isRefresh) setRefreshing(true);
    },
    [businessId],
  );

  // ── Initial fetch (deferred to avoid synchronous setState in effect) ──────
  useEffect(() => {
    if (!businessId) return;
    const timer = setTimeout(() => fetchMacro(), 0);
    return () => clearTimeout(timer);
  }, [businessId, fetchMacro]);

  // ── Auto-refresh countdown ────────────────────────────────────────────────
  useEffect(() => {
    if (!businessId || loading) return;

    countdownRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          fetchMacro(true);
          return 60;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [businessId, loading, fetchMacro]);

  // ── Computed values ───────────────────────────────────────────────────────
  const sentiment = useMemo(
    () => (macroData ? getSentiment(macroData.global.marketCapChange24h, t) : null),
    [macroData, t],
  );

  const altcoinMarketCap = useMemo(() => {
    if (!macroData) return 0;
    const btcMcap = macroData.global.totalMarketCap * (macroData.global.btcDominance / 100);
    return macroData.global.totalMarketCap - btcMcap;
  }, [macroData]);

  const turnoverRate = useMemo(() => {
    if (!macroData || macroData.global.totalMarketCap === 0) return 0;
    return ((macroData.global.totalVolume / macroData.global.totalMarketCap) * 100);
  }, [macroData]);

  // ── Guard: no business ────────────────────────────────────────────────────
  if (!businessId) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-white/50 text-center">{t('inv.registerFirst')}</p>
      </div>
    );
  }

  // ── Loading skeleton ──────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="space-y-4">
        {/* Header skeleton */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Skeleton className="h-8 w-8 rounded-lg bg-[#1A1A2E]" />
            <Skeleton className="h-6 w-40 rounded bg-[#1A1A2E]" />
          </div>
          <Skeleton className="h-8 w-24 rounded-lg bg-[#1A1A2E]" />
        </div>

        {/* Metric cards grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-[100px] rounded-xl bg-[#1A1A2E]" />
          ))}
        </div>

        {/* Sentiment + Stats row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Skeleton className="h-[180px] rounded-xl bg-[#1A1A2E]" />
          <Skeleton className="h-[180px] rounded-xl bg-[#1A1A2E]" />
        </div>

        {/* Top Movers */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Skeleton className="h-[400px] rounded-xl bg-[#1A1A2E]" />
          <Skeleton className="h-[400px] rounded-xl bg-[#1A1A2E]" />
        </div>

        {/* Trending */}
        <Skeleton className="h-[200px] rounded-xl bg-[#1A1A2E]" />
      </div>
    );
  }

  // ── No data state ─────────────────────────────────────────────────────────
  if (!macroData) {
    return (
      <Card className="bg-[#1A1A2E] border-white/[0.06]">
        <CardContent className="flex flex-col items-center justify-center py-20">
          <Globe className="h-14 w-14 text-white/15 mb-4" />
          <p className="text-white/40 text-center mb-1">{t('macro.noData')}</p>
          <Button
            variant="ghost"
            size="sm"
            className="mt-3 text-white/30 hover:text-white/60 hover:bg-white/[0.04] gap-2"
            onClick={() => fetchMacro(true)}
          >
            <RefreshCw className="h-4 w-4" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  const g = macroData.global;

  // ── Metric cards config ───────────────────────────────────────────────────
  const metricCards = [
    {
      label: t('macro.totalMarketCap'),
      value: formatMarketCap(g.totalMarketCap),
      sub: `${g.marketCapChange24h >= 0 ? '+' : ''}${toF(g.marketCapChange24h, 1)}%`,
      icon: Globe,
      color: g.marketCapChange24h >= 0 ? UP_COLOR : DOWN_COLOR,
    },
    {
      label: t('macro.totalVolume'),
      value: formatMarketCap(g.totalVolume),
      sub: `${toF(g.totalMarketCap > 0 ? (g.totalVolume / g.totalMarketCap) * 100 : 0)}% of mcap`,
      icon: BarChart3,
      color: '#BB86FC',
    },
    {
      label: t('macro.btcDominance'),
      value: `${toF(g.btcDominance, 1)}%`,
      sub: <DominanceBar value={g.btcDominance} color="#F7931A" />,
      icon: Coins,
      color: '#F7931A',
    },
    {
      label: t('macro.ethDominance'),
      value: `${toF(g.ethDominance, 1)}%`,
      sub: <DominanceBar value={g.ethDominance} color="#627EEA" />,
      icon: Layers,
      color: '#627EEA',
    },
    {
      label: t('macro.activeCryptos'),
      value: formatCompact(g.activeCryptos),
      sub: 'tracked assets',
      icon: Zap,
      color: '#03DAC6',
    },
    {
      label: t('macro.marketChange24h'),
      value: `${g.marketCapChange24h >= 0 ? '+' : ''}${toF(g.marketCapChange24h, 1)}%`,
      sub: '24 hours',
      icon: g.marketCapChange24h >= 0 ? TrendingUp : TrendingDown,
      color: g.marketCapChange24h >= 0 ? UP_COLOR : DOWN_COLOR,
    },
  ];

  return (
    <motion.div
      className="space-y-4"
      variants={containerVariants}
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
          <div className="flex h-9 w-9 items-center justify-center rounded-lg" style={{ backgroundColor: `${UP_COLOR}18` }}>
            <Globe className="h-5 w-5" style={{ color: UP_COLOR }} />
          </div>
          <div>
            <h2 className="text-base font-bold text-white tracking-tight">{t('macro.title')}</h2>
            <p className="text-[11px] text-white/30">{t('macro.globalMarket')}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {lastRefresh && (
            <span className="text-[10px] text-white/25 font-mono hidden sm:inline-block">
              {t('macro.lastUpdated')}: {lastRefresh.toLocaleTimeString()}
            </span>
          )}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2.5 text-white/40 hover:text-white/70 hover:bg-white/[0.06] gap-1.5"
                onClick={() => fetchMacro(true)}
                disabled={refreshing}
              >
                <RefreshCw className={cn('h-3.5 w-3.5', refreshing && 'animate-spin')} />
                <span className="text-[10px] font-mono">{countdown}s</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left" className="bg-[#1A1A2E] border-white/[0.06] text-white/60">
              {refreshing ? t('macro.refreshing') : 'Refresh data'}
            </TooltipContent>
          </Tooltip>
        </div>
      </motion.div>

      {/* ── Metric Cards Grid ──────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {metricCards.map((card, i) => (
          <motion.div key={card.label} variants={cardVariants} custom={i + 1}>
            <Card className="bg-[#1A1A2E] border-white/[0.06] h-full">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2.5">
                  <p className="text-[10px] text-white/40 uppercase tracking-wider font-medium leading-tight">
                    {card.label}
                  </p>
                  <div
                    className="flex h-7 w-7 items-center justify-center rounded-lg"
                    style={{ backgroundColor: `${card.color}18` }}
                  >
                    <card.icon className="h-3.5 w-3.5" style={{ color: card.color }} />
                  </div>
                </div>
                <p className="text-base font-bold tracking-tight text-white/90">{card.value}</p>
                <div className="mt-1">{typeof card.sub === 'string' ? (
                  <p className="text-[11px] text-white/30 font-mono">{card.sub}</p>
                ) : card.sub}</div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* ── Sentiment + Market Stats ───────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Sentiment Gauge */}
        {sentiment && (
          <motion.div variants={cardVariants} custom={8}>
            <Card className="bg-[#1A1A2E] border-white/[0.06] h-full">
              <CardContent className="p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Gauge className="h-4 w-4 text-white/40" />
                  <p className="text-xs text-white/40 uppercase tracking-wider font-medium">
                    {t('macro.marketSentiment')}
                  </p>
                </div>

                {/* Gauge visualization */}
                <div className="flex flex-col items-center">
                  <div className="relative w-48 h-28 mb-3">
                    <svg viewBox="0 0 200 120" className="w-full h-full">
                      {/* Background arc */}
                      <path
                        d="M 20 100 A 80 80 0 0 1 180 100"
                        fill="none"
                        stroke="rgba(255,255,255,0.06)"
                        strokeWidth="12"
                        strokeLinecap="round"
                      />
                      {/* Color segments */}
                      <path
                        d="M 20 100 A 80 80 0 0 1 50 42"
                        fill="none"
                        stroke="#FF1744"
                        strokeWidth="12"
                        strokeLinecap="round"
                        opacity="0.7"
                      />
                      <path
                        d="M 50 42 A 80 80 0 0 1 80 25"
                        fill="none"
                        stroke="#FF7043"
                        strokeWidth="12"
                        opacity="0.7"
                      />
                      <path
                        d="M 80 25 A 80 80 0 0 1 120 25"
                        fill="none"
                        stroke="#FFD54F"
                        strokeWidth="12"
                        opacity="0.7"
                      />
                      <path
                        d="M 120 25 A 80 80 0 0 1 150 42"
                        fill="none"
                        stroke="#03DAC6"
                        strokeWidth="12"
                        opacity="0.7"
                      />
                      <path
                        d="M 150 42 A 80 80 0 0 1 180 100"
                        fill="none"
                        stroke="#00E676"
                        strokeWidth="12"
                        strokeLinecap="round"
                        opacity="0.7"
                      />
                      {/* Needle */}
                      <line
                        x1="100"
                        y1="100"
                        x2={100 + 65 * Math.cos(((100 - sentiment.percentage) / 100) * Math.PI)}
                        y2={100 - 65 * Math.sin(((100 - sentiment.percentage) / 100) * Math.PI)}
                        stroke="white"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                      />
                      {/* Center dot */}
                      <circle cx="100" cy="100" r="5" fill="white" />
                    </svg>
                  </div>

                  <Badge
                    className="text-xs font-bold px-4 py-1 border-0 mb-1"
                    style={{ backgroundColor: sentiment.bgColor, color: sentiment.color }}
                  >
                    {sentiment.label}
                  </Badge>
                  <p className="text-[11px] text-white/25 font-mono mt-1">
                    {g.marketCapChange24h >= 0 ? '+' : ''}{toF(g.marketCapChange24h)}% 24h
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Market Statistics */}
        <motion.div variants={cardVariants} custom={9}>
          <Card className="bg-[#1A1A2E] border-white/[0.06] h-full">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-4">
                <PieChart className="h-4 w-4 text-white/40" />
                <p className="text-xs text-white/40 uppercase tracking-wider font-medium">
                  {t('macro.marketStats')}
                </p>
              </div>

              <div className="space-y-4">
                {/* Altcoin Market Cap */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] text-white/50 font-medium">{t('macro.altcoinMarketCap')}</span>
                    <span className="text-sm font-bold text-white/80 font-mono">{formatMarketCap(altcoinMarketCap)}</span>
                  </div>
                  <div className="h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${toF(g.totalMarketCap > 0 ? Math.min((altcoinMarketCap / g.totalMarketCap) * 100, 100) : 0, 1)}%`,
                        backgroundColor: '#BB86FC',
                      }}
                    />
                  </div>
                  <p className="text-[10px] text-white/25 mt-1 font-mono">
                    {toF(g.totalMarketCap > 0 ? (altcoinMarketCap / g.totalMarketCap) * 100 : 0, 1)}% of total
                  </p>
                </div>

                <Separator className="bg-white/[0.04]" />

                {/* Turnover Rate */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] text-white/50 font-medium">{t('macro.turnoverRate')}</span>
                    <span className="text-sm font-bold text-white/80 font-mono">{toF(turnoverRate)}%</span>
                  </div>
                  <div className="h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${toF(Math.min(turnoverRate * 4, 100), 1)}%`,
                        backgroundColor: turnoverRate > 5 ? UP_COLOR : turnoverRate > 3 ? GOLD_COLOR : DOWN_COLOR,
                      }}
                    />
                  </div>
                  <p className="text-[10px] text-white/25 mt-1 font-mono">
                    Vol / MCap ratio
                  </p>
                </div>

                <Separator className="bg-white/[0.04]" />

                {/* Other stats */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[10px] text-white/25 uppercase mb-0.5">BTC + ETH</p>
                    <p className="text-base font-bold text-white/80 font-mono">
                      {toF(g.btcDominance + g.ethDominance, 1)}%
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-white/25 uppercase mb-0.5">Trending</p>
                    <p className="text-base font-bold text-white/80 font-mono">
                      {macroData.trending.length}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* ── Top Movers (Side by Side) ──────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Top Gainers */}
        <motion.div variants={cardVariants} custom={10}>
          <Card className="bg-[#1A1A2E] border-white/[0.06]">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-[#03DAC6]" />
                  <p className="text-xs text-white/50 font-semibold">{t('macro.topGainers')}</p>
                </div>
                <Badge variant="outline" className="border-[#03DAC6]/20 text-[#03DAC6]/60 text-[10px]">
                  24h
                </Badge>
              </div>

              <div className="max-h-[380px] overflow-y-auto custom-scrollbar">
                <div className="space-y-1">
                  {macroData.topGainers.map((item, i) => (
                    <div
                      key={item.symbol}
                      className="flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-white/[0.03] transition-colors group"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] text-white/20 font-mono w-4 text-right">{i + 1}</span>
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-white/80 font-mono">{item.symbol}</span>
                          <span className="text-[11px] text-white/30 font-mono">{item.price}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <ArrowUpRight className="h-3.5 w-3.5 text-[#03DAC6]" />
                        <span className="text-xs font-bold font-mono text-[#03DAC6]">
                          +{toF(item.change24h)}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Top Losers */}
        <motion.div variants={cardVariants} custom={11}>
          <Card className="bg-[#1A1A2E] border-white/[0.06]">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <TrendingDown className="h-4 w-4 text-[#CF6679]" />
                  <p className="text-xs text-white/50 font-semibold">{t('macro.topLosers')}</p>
                </div>
                <Badge variant="outline" className="border-[#CF6679]/20 text-[#CF6679]/60 text-[10px]">
                  24h
                </Badge>
              </div>

              <div className="max-h-[380px] overflow-y-auto custom-scrollbar">
                <div className="space-y-1">
                  {macroData.topLosers.map((item, i) => (
                    <div
                      key={item.symbol}
                      className="flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-white/[0.03] transition-colors group"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] text-white/20 font-mono w-4 text-right">{i + 1}</span>
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-white/80 font-mono">{item.symbol}</span>
                          <span className="text-[11px] text-white/30 font-mono">{item.price}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <ArrowDownRight className="h-3.5 w-3.5 text-[#CF6679]" />
                        <span className="text-xs font-bold font-mono text-[#CF6679]">
                          {toF(item.change24h)}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* ── Trending Assets ────────────────────────────────────────────── */}
      {macroData.trending.length > 0 && (
        <motion.div variants={cardVariants} custom={12}>
          <Card className="bg-[#1A1A2E] border-white/[0.06]">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Flame className="h-4 w-4 text-[#FF7043]" />
                  <p className="text-xs text-white/50 font-semibold">{t('macro.trending')}</p>
                </div>
                <Badge variant="outline" className="border-white/[0.06] text-white/30 text-[10px]">
                  <Activity className="h-3 w-3 mr-1 animate-pulse" />
                  Live
                </Badge>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-8 gap-2.5">
                {macroData.trending.map((item) => {
                  const isUp = item.change24h >= 0;
                  const color = isUp ? UP_COLOR : DOWN_COLOR;
                  return (
                    <motion.div
                      key={item.symbol}
                      whileHover={{ scale: 1.03, y: -2 }}
                      transition={{ duration: 0.15 }}
                      className="rounded-xl border border-white/[0.06] p-3 hover:border-white/[0.12] transition-colors cursor-default"
                      style={{ backgroundColor: `${color}06` }}
                    >
                      <div className="flex flex-col items-start gap-1.5">
                        <div className="flex items-center gap-1.5">
                          <div
                            className="h-1.5 w-1.5 rounded-full"
                            style={{ backgroundColor: color }}
                          />
                          <span className="text-xs font-bold text-white/80 font-mono">{item.symbol}</span>
                        </div>
                        <span className="text-[11px] text-white/30 font-mono">{item.price}</span>
                        <div className="flex items-center gap-0.5">
                          {isUp ? (
                            <ArrowUpRight className="h-3 w-3" style={{ color }} />
                          ) : (
                            <ArrowDownRight className="h-3 w-3" style={{ color }} />
                          )}
                          <span className="text-[11px] font-bold font-mono" style={{ color }}>
                            {isUp ? '+' : ''}{toF(item.change24h)}%
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* ── Inline custom scrollbar style ──────────────────────────────── */}
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.08);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.15);
        }
      `}</style>
    </motion.div>
  );
}

// ── Sub-components ───────────────────────────────────────────────────────────

/** Small dominance bar for BTC/ETH cards */
function DominanceBar({ value, color }: { value: number | undefined | null; color: string }) {
  const safeVal = typeof value === 'number' && !isNaN(value) ? value : 0;
  return (
    <div className="flex items-center gap-2 mt-1">
      <div className="h-1.5 w-full bg-white/[0.06] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${Math.min(safeVal, 100).toFixed(1)}%`, backgroundColor: color }}
        />
      </div>
      <span className="text-[10px] text-white/25 font-mono shrink-0 w-9 text-right">
        {toF(safeVal, 1)}%
      </span>
    </div>
  );
}
