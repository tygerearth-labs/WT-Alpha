'use client';

import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useBusinessStore } from '@/store/useBusinessStore';
import { useTranslation } from '@/hooks/useTranslation';
import { useCurrencyFormat } from '@/hooks/useCurrencyFormat';
import { formatAssetPrice, currencyPrefix } from '@/lib/asset-catalogue';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
  Card,
  CardContent,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  LayoutDashboard,
  Gem,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  Trophy,
  Activity,
  BarChart3,
  RefreshCw,
  Maximize2,
  Globe,
  Zap,
  Gauge,
  Layers,
  Eye,
  Plus,
  X,
  Minus,
  ExternalLink,
  Target,
  Newspaper,
  RotateCcw,
  ChevronDown,
  BookOpen,
} from 'lucide-react';
import InvestmentChart from '@/components/investment/InvestmentChart';
import AssetSearchInput, { type SelectedAsset } from '@/components/investment/AssetSearchInput';
import { cn } from '@/lib/utils';

// ── Types ────────────────────────────────────────────────────────────────────

interface PortfolioItem {
  id: string;
  type: string;
  symbol: string;
  name?: string;
  entryPrice: number;
  currentPrice: number;
  quantity: number;
  targetPrice?: number;
  stopLoss?: number;
  status: string;
  notes?: string;
  currentValue: number;
  investedValue: number;
  unrealizedPnl: number;
  unrealizedPnlPercentage: number;
}

interface LivePrice {
  price: number;
  change24h: number;
}

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
  fearAndGreed?: { value: number; label: string };
  timestamp: string;
}

interface TechnicalAnalysis {
  symbol: string;
  type: string;
  price: number;
  change24h: number;
  overallSignal: 'buy' | 'sell' | 'neutral';
  signalStrength: number;
  indicators: {
    rsi: { value: number; signal: string };
    macd: { histogram: number };
  };
}

interface WatchlistItem {
  id: string;
  symbol: string;
  type: string;
  name?: string;
  price?: number;
  change24h?: number;
  targetBuy?: number;
  targetSell?: number;
  alertOnSignal: boolean;
  isActive: boolean;
  createdAt: string;
}

interface NewsItem {
  title: string;
  url: string;
  snippet: string;
  source: string;
  sentiment: 'bullish' | 'bearish' | 'neutral';
  category?: string;
}

interface SocialItem {
  title: string;
  source: string;
  snippet: string;
  sentiment: 'bullish' | 'bearish' | 'neutral';
  url: string;
  category: 'asset' | 'macro' | 'policy';
}

// ── Design Tokens ────────────────────────────────────────────────────────────

const TYPE_COLORS: Record<string, { bg: string; text: string; hex: string }> = {
  saham: { bg: 'rgba(187,134,252,0.12)', text: '#BB86FC', hex: '#BB86FC' },
  crypto: { bg: 'rgba(3,218,198,0.12)', text: '#03DAC6', hex: '#03DAC6' },
  forex: { bg: 'rgba(207,102,121,0.12)', text: '#CF6679', hex: '#CF6679' },
  komoditas: { bg: 'rgba(255,215,0,0.12)', text: '#FFD700', hex: '#FFD700' },
  indeks: { bg: 'rgba(100,181,246,0.12)', text: '#64B5F6', hex: '#64B5F6' },
};

const UP_COLOR = '#03DAC6';
const DOWN_COLOR = '#CF6679';
const GOLD_COLOR = '#FFD700';
const PURPLE_COLOR = '#BB86FC';

// ── Animation Variants ───────────────────────────────────────────────────────

const cardVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.04, duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] as const },
  }),
};

const fadeIn = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.3 } },
};

// ── Number Formatting ────────────────────────────────────────────────────────

const compactFmt = new Intl.NumberFormat('en-US', {
  notation: 'compact',
  compactDisplay: 'short',
  maximumFractionDigits: 2,
});

function formatMarketCap(value: number): string {
  return `$${compactFmt.format(value)}`;
}

// ── Signal Helpers ───────────────────────────────────────────────────────────

function getSignalColor(strength: number): string {
  if (strength > 50) return UP_COLOR;
  if (strength > 25) return 'rgba(3,218,198,0.7)';
  if (strength >= -25) return GOLD_COLOR;
  if (strength >= -50) return 'rgba(207,102,121,0.7)';
  return DOWN_COLOR;
}

function getSignalLabel(signal: string, strength: number): string {
  if (signal === 'buy') return strength > 50 ? 'STRONG BUY' : 'BUY';
  if (signal === 'sell') return strength < -50 ? 'STRONG SELL' : 'SELL';
  return 'NEUTRAL';
}

// ── Component ────────────────────────────────────────────────────────────────

export default function InvestmentDashboard() {
  const { t } = useTranslation();
  const { activeBusiness } = useBusinessStore();
  const { formatAmount } = useCurrencyFormat();
  const businessId = activeBusiness?.id;

  // ── State ──────────────────────────────────────────────────────────────────
  const [portfolios, setPortfolios] = useState<PortfolioItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [livePrices, setLivePrices] = useState<Record<string, LivePrice>>({});
  const [expandedChart, setExpandedChart] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(30);
  const [selectedAsset, setSelectedAsset] = useState<string | null>(null);
  const [closingId, setClosingId] = useState<string | null>(null);
  const [positionFilter, setPositionFilter] = useState<'open' | 'closed' | 'all'>('open');

  // Macro data
  const [macroData, setMacroData] = useState<MacroData | null>(null);

  // Quant signals
  const [signals, setSignals] = useState<Map<string, TechnicalAnalysis>>(new Map());
  const [loadingSignals, setLoadingSignals] = useState(false);
  const [analyzingAll, setAnalyzingAll] = useState(false);

  // Watchlist
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [loadingWatchlist, setLoadingWatchlist] = useState(false);
  const [showAddAsset, setShowAddAsset] = useState(false);

  // News + Social
  const [newsItems, setNewsItems] = useState<NewsItem[]>([]);
  const [socialItems, setSocialItems] = useState<SocialItem[]>([]);
  const [loadingNews, setLoadingNews] = useState(false);
  const [expandedNews, setExpandedNews] = useState<string | null>(null);
  const [guideOpen, setGuideOpen] = useState(true);

  // Refs
  const abortRef = useRef<AbortController | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const loadingRef = useRef(true);
  const portfoliosRef = useRef<PortfolioItem[]>([]);

  // ── Translation helper ─────────────────────────────────────────────────────
  const tf = useCallback((key: string, fallback: string) => t(key) || fallback, [t]);

  // ── Fetch portfolios (extracted callback) ─────────────────────────────────
  const fetchPortfolios = useCallback(() => {
    if (!businessId) return;
    fetch(`/api/business/${businessId}/portfolio`)
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((result) => {
        portfoliosRef.current = result.portfolios || [];
        setPortfolios(portfoliosRef.current);
        loadingRef.current = false;
        setLoading(false);
      })
      .catch(() => {
        portfoliosRef.current = [];
        setPortfolios([]);
        loadingRef.current = false;
        setLoading(false);
      });
  }, [businessId]);

  useEffect(() => {
    if (!businessId) return;
    loadingRef.current = true;
    fetchPortfolios();
  }, [businessId, fetchPortfolios]);

  // ── Fetch macro data ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!businessId) return;
    let cancelled = false;
    fetch(`/api/business/${businessId}/market-data/macro`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => { if (!cancelled) setMacroData(data); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [businessId]);

  // ── Auto-refresh macro every 60s ──────────────────────────────────────────
  useEffect(() => {
    if (!businessId) return;
    const timer = setInterval(() => {
      fetch(`/api/business/${businessId}/market-data/macro`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => { if (data) setMacroData(data); })
        .catch(() => {});
    }, 60000);
    return () => clearInterval(timer);
  }, [businessId]);

  // ── Fetch watchlist ───────────────────────────────────────────────────────
  const fetchWatchlist = useCallback(() => {
    if (!businessId) return;
    setLoadingWatchlist(true);
    fetch(`/api/business/${businessId}/watchlist`)
      .then((res) => (res.ok ? res.json() : { watchlist: [] }))
      .then((data) => { setWatchlist(data.watchlist || []); setLoadingWatchlist(false); })
      .catch(() => { setLoadingWatchlist(false); });
  }, [businessId]);

  useEffect(() => {
    if (!businessId) return;
    const timer = setTimeout(() => fetchWatchlist(), 0);
    return () => clearTimeout(timer);
  }, [businessId, fetchWatchlist]);

  // ── Fetch news + social ───────────────────────────────────────────────────
  const fetchNewsAndSocial = useCallback(() => {
    if (!businessId) return;
    setLoadingNews(true);
    Promise.allSettled([
      fetch(`/api/business/${businessId}/market-data/news`)
        .then((res) => (res.ok ? res.json() : { news: [] }))
        .then((data) => { setNewsItems(data.news || []); })
        .catch(() => {}),
      fetch(`/api/business/${businessId}/market-data/social`)
        .then((res) => (res.ok ? res.json() : { social: [] }))
        .then((data) => { setSocialItems(data.social || []); })
        .catch(() => {}),
    ]).finally(() => { setLoadingNews(false); });
  }, [businessId]);

  useEffect(() => {
    if (!businessId) return;
    const timer = setTimeout(() => fetchNewsAndSocial(), 0);
    return () => clearTimeout(timer);
  }, [businessId, fetchNewsAndSocial]);

  // ── Fetch live prices for portfolio assets ───────────────────────────────
  const fetchLivePrices = useCallback((isRefresh = false) => {
    if (!businessId || portfolios.length === 0) return;
    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();

    const symbols = portfolios
      .filter((p) => p.status === 'open')
      .map((p) => ({ type: p.type, symbol: p.symbol }));
    if (symbols.length === 0) return;

    fetch(`/api/business/${businessId}/market-data/batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ symbols }),
      signal: abortRef.current.signal,
    })
      .then((r) => (r.ok ? r.json() : { prices: [] }))
      .then((data: { prices?: Array<{ symbol: string; type: string; price: number; change24h: number }> }) => {
        const map: Record<string, LivePrice> = {};
        for (const p of data.prices || []) {
          map[`${p.type}:${p.symbol}`] = { price: p.price, change24h: p.change24h };
        }
        setLivePrices(map);
        if (isRefresh) setCountdown(30);
      })
      .catch(() => {});
  }, [businessId, portfolios]);

  // ── Auto-refresh countdown ────────────────────────────────────────────────
  useEffect(() => {
    if (!businessId || portfolios.length === 0) return;
    countdownRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          fetchLivePrices(true);
          return 30;
        }
        return prev - 1;
      });
    }, 1000);
    return () => { if (countdownRef.current) clearInterval(countdownRef.current); };
  }, [businessId, portfolios, fetchLivePrices]);

  // ── Fetch quant signals for top 6 assets ─────────────────────────────────
  const fetchSignals = useCallback(async (items: PortfolioItem[]) => {
    if (!businessId || items.length === 0) return;
    const topAssets = items.slice(0, 6);
    const newSignals = new Map<string, TechnicalAnalysis>();

    await Promise.allSettled(
      topAssets.map(async (item) => {
        try {
          const res = await fetch(
            `/api/business/${businessId}/market-data/technical?type=${item.type}&symbol=${item.symbol}`,
          );
          if (res.ok) {
            const data = await res.json();
            newSignals.set(`${item.type}:${item.symbol}`, data);
          }
        } catch { /* ok */ }
      }),
    );
    setSignals(newSignals);
    setLoadingSignals(false);
  }, [businessId]);

  useEffect(() => {
    if (portfolios.length > 0) {
      const timer = setTimeout(() => {
        setLoadingSignals(true);
        fetchSignals(portfolios.filter((p) => p.status === 'open'));
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [portfolios, fetchSignals]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleAnalyzeAll = useCallback(async () => {
    setAnalyzingAll(true);
    await fetchSignals(portfolios.filter((p) => p.status === 'open'));
    setAnalyzingAll(false);
    toast.success(tf('quant.analyzing', 'Analysis complete!'));
  }, [fetchSignals, portfolios, tf]);

  const handleAddToWatchlist = useCallback(async (asset: SelectedAsset) => {
    try {
      const res = await fetch(`/api/business/${businessId}/watchlist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol: asset.symbol, type: asset.type, name: asset.name }),
      });
      if (res.ok) {
        toast.success(tf('inv.dashAddedWatchlist', `${asset.symbol} added to watchlist`));
        fetchWatchlist();
      }
    } catch {
      toast.error(tf('inv.dashAddedWatchlist', 'Failed to add to watchlist'));
    }
  }, [businessId, fetchWatchlist, tf]);

  const handleRemoveFromWatchlist = useCallback(async (symbol: string, type: string) => {
    try {
      const res = await fetch(
        `/api/business/${businessId}/watchlist?symbol=${encodeURIComponent(symbol)}&type=${encodeURIComponent(type)}`,
        { method: 'DELETE' },
      );
      if (res.ok) {
        toast.success(tf('inv.dashRemovedWatchlist', `${symbol} removed from watchlist`));
        fetchWatchlist();
      }
    } catch {
      toast.error(tf('inv.dashRemovedWatchlist', 'Failed to remove'));
    }
  }, [businessId, fetchWatchlist, tf]);

  const handleClosePosition = useCallback(async (p: PortfolioItem) => {
    const live = livePrices[`${p.type}:${p.symbol}`];
    const exitPrice = live?.price ?? p.currentPrice;
    if (!window.confirm(tf('inv.dashCloseConfirm', `Close position for ${p.symbol} at ${fmtPrice(p.type, exitPrice)}?\nPnL: ${p.unrealizedPnl >= 0 ? '+' : ''}${p.unrealizedPnlPercentage.toFixed(2)}%`))) return;
    setClosingId(p.id);
    try {
      const res = await fetch(`/api/business/${businessId}/portfolio/${p.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'closed', currentPrice: exitPrice }),
      });
      if (res.ok) {
        toast.success(tf('inv.dashPositionClosed', `${p.symbol} position closed`));
        await fetchPortfolios();
        // If this was the selected asset, select next open position
        if (selectedAsset === `${p.type}:${p.symbol}`) {
          const remaining = (portfoliosRef.current || []).filter((x: PortfolioItem) => x.status === 'open');
          if (remaining.length > 0) {
            setSelectedAsset(`${remaining[0].type}:${remaining[0].symbol}`);
          } else {
            setSelectedAsset(null);
          }
        }
      } else {
        toast.error(tf('inv.dashPositionClosed', 'Failed to close position'));
      }
    } catch {
      toast.error(tf('inv.dashPositionClosed', 'Failed to close position'));
    } finally {
      setClosingId(null);
    }
  }, [businessId, livePrices, fetchPortfolios, selectedAsset, tf]);

  const handleReopenPosition = useCallback(async (p: PortfolioItem) => {
    if (!window.confirm(tf('inv.dashReopenConfirm', `Reopen position for ${p.symbol}?`))) return;
    setClosingId(p.id);
    try {
      const res = await fetch(`/api/business/${businessId}/portfolio/${p.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'open' }),
      });
      if (res.ok) {
        toast.success(tf('inv.dashPositionReopened', `${p.symbol} position reopened`));
        await fetchPortfolios();
      } else {
        toast.error(tf('inv.dashPositionReopened', 'Failed to reopen position'));
      }
    } catch {
      toast.error(tf('inv.dashPositionReopened', 'Failed to reopen position'));
    } finally {
      setClosingId(null);
    }
  }, [businessId, fetchPortfolios, tf]);

  const fmtPrice = (type: string, val: number) => {
    const prefix = currencyPrefix(type as 'saham' | 'crypto' | 'forex');
    return `${prefix}${formatAssetPrice(val, type as 'saham' | 'crypto' | 'forex')}`;
  };

  // ── Enriched portfolios with live prices ──────────────────────────────────
  const enrichedPortfolios = useMemo(() => {
    return portfolios.map((p) => {
      const live = livePrices[`${p.type}:${p.symbol}`];
      const currentPrice = live?.price ?? p.currentPrice;
      const currentValue = currentPrice * p.quantity;
      const investedValue = p.entryPrice * p.quantity;
      const unrealizedPnl = currentValue - investedValue;
      const unrealizedPnlPercentage = investedValue > 0 ? ((currentValue - investedValue) / investedValue) * 100 : 0;
      return { ...p, currentPrice, currentValue, investedValue, unrealizedPnl, unrealizedPnlPercentage };
    });
  }, [portfolios, livePrices]);

  // ── Computed data (all from enriched) ─────────────────────────────────────
  const openPortfolios = useMemo(() => enrichedPortfolios.filter((p) => p.status === 'open'), [enrichedPortfolios]);
  const closedPortfolios = useMemo(() => enrichedPortfolios.filter((p) => p.status === 'closed'), [enrichedPortfolios]);

  const stats = useMemo(() => {
    const totalValue = openPortfolios.reduce((s, p) => s + p.currentValue, 0);
    const investedValue = openPortfolios.reduce((s, p) => s + p.investedValue, 0);
    const unrealizedPnl = openPortfolios.reduce((s, p) => s + p.unrealizedPnl, 0);
    const realizedPnl = closedPortfolios.reduce((s, p) => s + p.unrealizedPnl, 0);
    const winTrades = closedPortfolios.filter((p) => p.unrealizedPnl > 0).length;
    const totalTrades = closedPortfolios.length;
    const winRate = totalTrades > 0 ? (winTrades / totalTrades) * 100 : 0;
    return { totalValue, investedValue, unrealizedPnl, realizedPnl, winRate, totalTrades };
  }, [openPortfolios, closedPortfolios]);

  const allocationData = useMemo(() => {
    const byType: Record<string, { value: number; count: number }> = {};
    openPortfolios.forEach((p) => {
      if (!byType[p.type]) byType[p.type] = { value: 0, count: 0 };
      byType[p.type].value += p.currentValue;
      byType[p.type].count++;
    });
    return Object.entries(byType).map(([type, { value, count }]) => ({
      type,
      value,
      count,
      color: TYPE_COLORS[type]?.hex || '#888',
      pct: stats.totalValue > 0 ? ((value / stats.totalValue) * 100).toFixed(1) : '0',
    }));
  }, [openPortfolios, stats.totalValue]);

  const sortedPositions = useMemo(() => {
    return [...openPortfolios].sort(
      (a, b) => Math.abs(b.unrealizedPnlPercentage) - Math.abs(a.unrealizedPnlPercentage),
    );
  }, [openPortfolios]);

  // Chart tabs: open positions + watchlist items
  const chartTabs = useMemo(() => {
    const tabs: Array<{ key: string; symbol: string; type: string; name?: string }> = [];
    openPortfolios.forEach((p) => {
      tabs.push({ key: `${p.type}:${p.symbol}`, symbol: p.symbol, type: p.type, name: p.name });
    });
    watchlist.forEach((w) => {
      tabs.push({ key: `wl:${w.type}:${w.symbol}`, symbol: w.symbol, type: w.type, name: w.name });
    });
    return tabs;
  }, [openPortfolios, watchlist]);

  const activeChartAsset = useMemo(() => {
    if (chartTabs.length === 0) return null;
    if (!selectedAsset) return chartTabs[0];
    return chartTabs.find((tab) => tab.key === selectedAsset) || chartTabs[0];
  }, [selectedAsset, chartTabs]);

  // Auto-select first open position when available
  useEffect(() => {
    if (!selectedAsset && openPortfolios.length > 0) {
      setSelectedAsset(`${openPortfolios[0].type}:${openPortfolios[0].symbol}`);
    }
  }, [selectedAsset, openPortfolios]);

  // Positions filtered for table
  const filteredPositions = useMemo(() => {
    let items: PortfolioItem[];
    if (positionFilter === 'open') items = openPortfolios;
    else if (positionFilter === 'closed') items = closedPortfolios;
    else items = enrichedPortfolios;
    return [...items].sort((a, b) => Math.abs(b.unrealizedPnlPercentage) - Math.abs(a.unrealizedPnlPercentage));
  }, [positionFilter, openPortfolios, closedPortfolios, enrichedPortfolios]);

  // Merge watchlist prices into livePrices for ticker bar
  const watchlistPrices = useMemo(() => {
    const map: Record<string, LivePrice> = {};
    for (const w of watchlist) {
      if (w.price !== undefined && w.change24h !== undefined) {
        map[`${w.type}:${w.symbol}`] = { price: w.price, change24h: w.change24h };
      }
    }
    return map;
  }, [watchlist]);

  const allLivePrices = useMemo(() => ({ ...livePrices, ...watchlistPrices }), [livePrices, watchlistPrices]);

  // Merged feed from news + social
  const mergedFeed = useMemo(() => {
    const feed: Array<NewsItem & { category?: string }> = [
      ...newsItems.map((n) => ({ ...n, category: 'asset' })),
      ...socialItems.map((s) => ({
        title: s.title,
        url: s.url,
        snippet: s.snippet,
        source: s.source,
        sentiment: s.sentiment,
        category: s.category,
      })),
    ];
    return feed.slice(0, 15);
  }, [newsItems, socialItems]);

  const pnlColor = (val: number) => (val >= 0 ? UP_COLOR : DOWN_COLOR);

  // ── Category badge config ─────────────────────────────────────────────────
  const CATEGORY_CONFIG: Record<string, { bg: string; text: string; label: string }> = {
    asset: { bg: 'rgba(3,218,198,0.12)', text: '#03DAC6', label: 'ASSET' },
    macro: { bg: 'rgba(187,134,252,0.12)', text: '#BB86FC', label: 'MACRO' },
    policy: { bg: 'rgba(255,215,0,0.12)', text: '#FFD700', label: 'POLICY' },
  };

  // ── Guards ────────────────────────────────────────────────────────────────
  if (!businessId) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-white/50 text-center">{t('inv.registerFirst')}</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 rounded-xl bg-[#1A1A2E]" />
        <Skeleton className="h-10 rounded-xl bg-[#1A1A2E]" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl bg-[#1A1A2E]" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Skeleton className="h-[420px] rounded-xl bg-[#1A1A2E] lg:col-span-2" />
          <Skeleton className="h-[420px] rounded-xl bg-[#1A1A2E]" />
        </div>
      </div>
    );
  }

  return (
    <motion.div
      className="space-y-4"
      variants={fadeIn}
      initial="hidden"
      animate="visible"
    >
      {/* ── WELCOME / FEATURE GUIDE ── */}
      <motion.div variants={cardVariants} custom={-1}>
        <div className="rounded-xl bg-[#1A1A2E]/80 border border-white/[0.06] overflow-hidden">
          {/* Gradient header */}
          <button
            className="w-full flex items-center justify-between px-5 py-3.5 bg-gradient-to-r from-[#BB86FC]/20 via-[#03DAC6]/10 to-[#FFD700]/10 hover:from-[#BB86FC]/25 hover:via-[#03DAC6]/15 hover:to-[#FFD700]/15 transition-all"
            onClick={() => setGuideOpen(!guideOpen)}
          >
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.08]">
                <Layers className="h-4 w-4 text-[#BB86FC]" />
              </div>
              <div className="text-left">
                <h3 className="text-sm font-bold text-white/90">{t('inv.dashWelcomeTitle')}</h3>
                <p className="text-[11px] text-white/40 mt-0.5">{t('inv.dashWelcomeDesc')}</p>
              </div>
            </div>
            <ChevronDown className={cn('h-4 w-4 text-white/30 transition-transform duration-300', guideOpen && 'rotate-180')} />
          </button>
          {/* Collapsible guide grid */}
          <AnimatePresence>
            {guideOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3, ease: 'easeInOut' }}
                className="overflow-hidden"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 p-4 pt-3">
                  {[
                    { icon: LayoutDashboard, color: '#BB86FC', text: tf('inv.dashGuideDashboard', 'Dashboard') },
                    { icon: Gem, color: '#03DAC6', text: tf('inv.dashGuidePortfolio', 'Portfolio') },
                    { icon: TrendingUp, color: '#FFD700', text: tf('inv.dashGuideQuant', 'Quant') },
                    { icon: BarChart3, color: '#FF7043', text: tf('inv.dashGuideMacro', 'Macro') },
                    { icon: BookOpen, color: '#CF6679', text: tf('inv.dashGuideJournal', 'Journal') },
                    { icon: Newspaper, color: '#4FC3F7', text: tf('inv.dashGuideNews', 'News & Social') },
                  ].map((item) => (
                    <div key={item.text} className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-[#0D0D0D]/60 border border-white/[0.04] hover:border-white/[0.08] transition-colors">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg shrink-0" style={{ backgroundColor: `${item.color}15` }}>
                        <item.icon className="h-4 w-4" style={{ color: item.color }} />
                      </div>
                      <span className="text-xs text-white/60 font-medium">{item.text}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* ── TICKER BAR ── */}
      {(sortedPositions.length > 0 || watchlist.length > 0) && (
        <motion.div variants={cardVariants} custom={0}>
          <div className="rounded-xl bg-[#0D0D0D] border border-white/[0.06] px-4 py-2.5 overflow-hidden">
            <div className="flex items-center gap-4 overflow-x-auto scrollbar-none">
              <div className="flex items-center gap-1.5 shrink-0">
                <Activity className="h-3.5 w-3.5 text-[#03DAC6] animate-pulse" />
                <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider">{tf('inv.dashTicker', 'Live')}</span>
              </div>
              <div className="h-4 w-px bg-white/[0.08] shrink-0" />
              {sortedPositions.map((p) => {
                const live = allLivePrices[`${p.type}:${p.symbol}`];
                const change = live?.change24h ?? 0;
                const price = p.currentPrice;
                const isUp = change >= 0;
                const tc = TYPE_COLORS[p.type];
                return (
                  <div key={`pos-${p.symbol}`} className="flex items-center gap-2.5 shrink-0 px-1">
                    <div className="flex items-center gap-1.5">
                      <span className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded', tc?.bg)} style={{ color: tc?.text }}>
                        {p.symbol}
                      </span>
                    </div>
                    <span className="text-xs font-mono text-white/80">{fmtPrice(p.type, price)}</span>
                    <span className={cn('text-[11px] font-mono font-medium', isUp ? 'text-[#03DAC6]' : 'text-[#CF6679]')}>
                      {isUp ? '+' : ''}{change.toFixed(2)}%
                    </span>
                    <div className="h-4 w-px bg-white/[0.06]" />
                  </div>
                );
              })}
              {watchlist.slice(0, 5).map((w) => {
                const live = allLivePrices[`${w.type}:${w.symbol}`];
                const change = live?.change24h ?? 0;
                const price = live?.price ?? 0;
                const isUp = change >= 0;
                const tc = TYPE_COLORS[w.type];
                return (
                  <div key={`wl-${w.symbol}`} className="flex items-center gap-2.5 shrink-0 px-1">
                    <div className="flex items-center gap-1.5">
                      <Eye className="h-3 w-3 text-white/20" />
                      <span className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded', tc?.bg)} style={{ color: tc?.text }}>
                        {w.symbol}
                      </span>
                    </div>
                    <span className="text-xs font-mono text-white/60">{fmtPrice(w.type, price)}</span>
                    <span className={cn('text-[11px] font-mono font-medium', isUp ? 'text-[#03DAC6]' : 'text-[#CF6679]')}>
                      {isUp ? '+' : ''}{change.toFixed(2)}%
                    </span>
                    <div className="h-4 w-px bg-white/[0.06]" />
                  </div>
                );
              })}
              <div className="flex items-center gap-1.5 shrink-0 pl-1">
                <RefreshCw className="h-3 w-3 text-white/20" />
                <span className="text-[10px] text-white/25 font-mono">{countdown}s</span>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* ── MACRO STRIP ── */}
      {macroData && (
        <motion.div variants={cardVariants} custom={1}>
          <div className="rounded-xl bg-white/[0.03] border border-white/[0.05] px-4 py-3 overflow-hidden">
            <div className="flex items-center gap-6 overflow-x-auto scrollbar-none">
              {[
                { label: tf('inv.dashMarketCap', 'Market Cap'), value: formatMarketCap(macroData.global.totalMarketCap), icon: Globe, change: macroData.global.marketCapChange24h },
                { label: tf('inv.dashBtcDom', 'BTC Dom'), value: `${macroData.global.btcDominance.toFixed(1)}%`, icon: Zap, change: null },
                { label: tf('inv.dashVolume24h', 'Volume 24h'), value: formatMarketCap(macroData.global.totalVolume), icon: BarChart3, change: null },
                { label: tf('inv.dashChange24h', '24h Change'), value: `${macroData.global.marketCapChange24h >= 0 ? '+' : ''}${macroData.global.marketCapChange24h.toFixed(2)}%`, icon: macroData.global.marketCapChange24h >= 0 ? TrendingUp : TrendingDown, change: macroData.global.marketCapChange24h },
                ...(macroData.fearAndGreed ? [{ label: tf('inv.dashFearGreed', 'Fear & Greed'), value: `${macroData.fearAndGreed.value} ${macroData.fearAndGreed.label}`, icon: Gauge, change: null }] : []),
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-2.5 shrink-0">
                  <item.icon className="h-3.5 w-3.5 text-white/25" />
                  <div className="flex flex-col">
                    <span className="text-[9px] text-white/30 uppercase tracking-wider">{item.label}</span>
                    <div className="flex items-center gap-1">
                      <span className={cn(
                        'text-xs font-mono font-bold',
                        item.change !== null ? (item.change >= 0 ? 'text-[#03DAC6]' : 'text-[#CF6679]') : 'text-white/70',
                      )}>
                        {item.value}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {/* ── TOP GAINERS / LOSERS ── */}
      {macroData && (macroData.topGainers?.length > 0 || macroData.topLosers?.length > 0) && (
        <motion.div variants={cardVariants} custom={2} className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Top Gainers */}
          {macroData.topGainers?.length > 0 && (
            <Card className="bg-white/[0.03] border-white/[0.05]">
              <CardContent className="p-3">
                <div className="flex items-center gap-2 mb-2.5">
                  <TrendingUp className="h-3.5 w-3.5 text-[#03DAC6]" />
                  <span className="text-[10px] text-white/50 uppercase tracking-wider font-bold">{tf('inv.dashTopGainers', 'Top Gainers')}</span>
                  <Badge variant="outline" className="border-[#03DAC6]/20 text-[#03DAC6]/60 text-[9px] ml-auto">24h</Badge>
                </div>
                <div className="space-y-1">
                  {macroData.topGainers.slice(0, 5).map((item, i) => (
                    <div key={item.symbol} className="flex items-center justify-between px-2.5 py-2 rounded-lg hover:bg-white/[0.03] transition-colors">
                      <div className="flex items-center gap-2.5">
                        <span className="text-[10px] text-white/20 font-mono w-3 text-right">{i + 1}</span>
                        <span className="text-xs font-bold text-white/80 font-mono">{item.symbol}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="h-1.5 w-12 rounded-full bg-[#03DAC6]/20 overflow-hidden">
                          <div className="h-full rounded-full bg-[#03DAC6]" style={{ width: `${Math.min(100, Math.abs(item.change24h) * 5)}%` }} />
                        </div>
                        <span className="text-[11px] font-bold font-mono text-[#03DAC6]">+{item.change24h.toFixed(2)}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
          {/* Top Losers */}
          {macroData.topLosers?.length > 0 && (
            <Card className="bg-white/[0.03] border-white/[0.05]">
              <CardContent className="p-3">
                <div className="flex items-center gap-2 mb-2.5">
                  <TrendingDown className="h-3.5 w-3.5 text-[#CF6679]" />
                  <span className="text-[10px] text-white/50 uppercase tracking-wider font-bold">{tf('inv.dashTopLosers', 'Top Losers')}</span>
                  <Badge variant="outline" className="border-[#CF6679]/20 text-[#CF6679]/60 text-[9px] ml-auto">24h</Badge>
                </div>
                <div className="space-y-1">
                  {macroData.topLosers.slice(0, 5).map((item, i) => (
                    <div key={item.symbol} className="flex items-center justify-between px-2.5 py-2 rounded-lg hover:bg-white/[0.03] transition-colors">
                      <div className="flex items-center gap-2.5">
                        <span className="text-[10px] text-white/20 font-mono w-3 text-right">{i + 1}</span>
                        <span className="text-xs font-bold text-white/80 font-mono">{item.symbol}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="h-1.5 w-12 rounded-full bg-[#CF6679]/20 overflow-hidden">
                          <div className="h-full rounded-full bg-[#CF6679]" style={{ width: `${Math.min(100, Math.abs(item.change24h) * 5)}%` }} />
                        </div>
                        <span className="text-[11px] font-bold font-mono text-[#CF6679]">{item.change24h.toFixed(2)}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </motion.div>
      )}

      {/* ── PORTFOLIO SUMMARY CARDS ── */}
      {portfolios.length > 0 && (
        <motion.div variants={cardVariants} custom={3} className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: t('inv.portfolioValue'), value: formatAmount(stats.totalValue), sub: formatAmount(stats.investedValue) + ' invested', icon: Wallet, color: PURPLE_COLOR },
            { label: t('inv.unrealizedPnL'), value: (stats.unrealizedPnl >= 0 ? '+' : '') + formatAmount(stats.unrealizedPnl), sub: ((stats.investedValue > 0 ? (stats.unrealizedPnl / stats.investedValue) * 100 : 0)).toFixed(2) + '% return', icon: stats.unrealizedPnl >= 0 ? TrendingUp : TrendingDown, color: pnlColor(stats.unrealizedPnl) },
            { label: t('inv.realizedPnL'), value: (stats.realizedPnl >= 0 ? '+' : '') + formatAmount(stats.realizedPnl), sub: stats.totalTrades + ' trades closed', icon: stats.realizedPnl >= 0 ? TrendingUp : TrendingDown, color: pnlColor(stats.realizedPnl) },
            { label: t('inv.winRate'), value: stats.winRate.toFixed(1) + '%', sub: stats.totalTrades > 0 ? (stats.winRate >= 50 ? 'Profitable' : 'Review strategy') : 'No closed trades', icon: Trophy, color: stats.winRate >= 50 ? UP_COLOR : DOWN_COLOR },
          ].map((card) => (
            <Card key={card.label} className="bg-white/[0.03] border-white/[0.05]">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[11px] text-white/40 uppercase tracking-wider font-medium">{card.label}</p>
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ backgroundColor: `${card.color}18` }}>
                    <card.icon className="h-4 w-4" style={{ color: card.color }} />
                  </div>
                </div>
                <p className="text-lg font-bold tracking-tight" style={{ color: card.color }}>{card.value}</p>
                <p className="text-[11px] text-white/30 mt-0.5 font-mono">{card.sub}</p>
              </CardContent>
            </Card>
          ))}
        </motion.div>
      )}

      {/* ── QUANT SIGNALS + NEWS FEED ── */}
      <motion.div variants={cardVariants} custom={4} className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Quant Signals */}
        <Card className="bg-white/[0.03] border-white/[0.05]">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-[#FFD700]/60" />
                <span className="text-[10px] text-white/40 uppercase tracking-wider font-bold">{tf('inv.dashQuantSignals', 'Quant Signals')}</span>
                {loadingSignals && <RefreshCw className="h-3 w-3 text-white/20 animate-spin" />}
              </div>
              <Button
                size="sm"
                className="h-7 px-2.5 text-[10px] gap-1 bg-[#03DAC6]/10 text-[#03DAC6] hover:bg-[#03DAC6]/20 border border-[#03DAC6]/20"
                onClick={handleAnalyzeAll}
                disabled={analyzingAll || openPortfolios.length === 0}
              >
                <RefreshCw className={cn('h-3 w-3', analyzingAll && 'animate-spin')} />
                Analyze All
              </Button>
            </div>
            <div className="max-h-[320px] overflow-y-auto custom-scrollbar space-y-2">
              {openPortfolios.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8">
                  <BarChart3 className="h-10 w-10 text-white/10 mb-2" />
                  <p className="text-white/30 text-xs">{tf('inv.noSignals', 'Add positions to see signals')}</p>
                </div>
              ) : (
                openPortfolios.slice(0, 6).map((p) => {
                  const key = `${p.type}:${p.symbol}`;
                  const signal = signals.get(key);
                  const tc = TYPE_COLORS[p.type];
                  const strength = signal?.signalStrength ?? 0;
                  const signalColor = signal ? getSignalColor(strength) : '#666';
                  const signalLabel = signal ? getSignalLabel(signal.overallSignal, strength) : 'LOADING';

                  return (
                    <div key={key} className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-white/[0.02] hover:bg-white/[0.04] transition-colors cursor-pointer" onClick={() => setSelectedAsset(key)}>
                      <div className="flex items-center gap-2.5">
                        <span className="text-xs font-bold text-white/80 font-mono">{p.symbol}</span>
                        <Badge className="text-[8px] px-1.5 py-0 h-3.5 font-medium border-0" style={{ backgroundColor: tc?.bg, color: tc?.text }}>
                          {p.type.toUpperCase()}
                        </Badge>
                        {signal && (
                          <div className="flex items-center gap-1.5 ml-2">
                            <span className="text-[9px] text-white/25">RSI</span>
                            <span className={cn('text-[10px] font-mono font-bold', signal.indicators.rsi.value < 30 || signal.indicators.rsi.value > 70 ? 'text-[#CF6679]' : 'text-[#03DAC6]')}>
                              {signal.indicators.rsi.value.toFixed(1)}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {signal ? (
                          <>
                            <div className="w-16 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                              <div className="h-full rounded-full transition-all" style={{ width: `${((strength + 100) / 200) * 100}%`, backgroundColor: signalColor }} />
                            </div>
                            <Badge className="text-[9px] px-2 py-0 h-4 font-bold border-0" style={{ backgroundColor: `${signalColor}18`, color: signalColor }}>
                              {signalLabel}
                            </Badge>
                          </>
                        ) : (
                          <Skeleton className="h-5 w-16 rounded bg-white/[0.06]" />
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>

        {/* News + Social Feed */}
        <Card className="bg-white/[0.03] border-white/[0.05]">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Newspaper className="h-4 w-4 text-[#FF7043]/60" />
                <span className="text-[10px] text-white/40 uppercase tracking-wider font-bold">{tf('inv.dashNewsSocial', 'News & Social')}</span>
                {loadingNews && <RefreshCw className="h-3 w-3 text-white/20 animate-spin" />}
              </div>
              <Badge variant="outline" className="border-white/[0.06] text-white/30 text-[9px]">{mergedFeed.length} items</Badge>
            </div>
            <div className="max-h-[320px] overflow-y-auto custom-scrollbar">
              {mergedFeed.length === 0 && !loadingNews && (
                <div className="flex flex-col items-center justify-center py-8">
                  <Newspaper className="h-10 w-10 text-white/10 mb-2" />
                  <p className="text-white/30 text-xs">{tf('inv.dashNoNews', 'No news available')}</p>
                </div>
              )}
              <AnimatePresence mode="popLayout">
                {mergedFeed.map((item, i) => {
                  const catConfig = CATEGORY_CONFIG[item.category || 'asset'] || CATEGORY_CONFIG.asset;
                  const isBullish = item.sentiment === 'bullish';
                  const isBearish = item.sentiment === 'bearish';
                  const sentimentColor = isBullish ? UP_COLOR : isBearish ? DOWN_COLOR : '#888';
                  const isSelected = expandedNews === item.url;

                  return (
                    <motion.div
                      key={item.url || i}
                      variants={cardVariants}
                      custom={i}
                      layout
                      initial="hidden"
                      animate="visible"
                    >
                      <button className="w-full text-left" onClick={() => setExpandedNews(isSelected ? null : item.url)}>
                        <div className={cn('flex items-start gap-2.5 px-2.5 py-2.5 transition-colors border-b border-white/[0.03] last:border-0 hover:bg-white/[0.02]', isSelected && 'bg-white/[0.03]')}>
                          <div className="mt-1 shrink-0" style={{ color: sentimentColor }}>
                            {isBullish ? <TrendingUp className="h-3.5 w-3.5" /> : isBearish ? <TrendingDown className="h-3.5 w-3.5" /> : <Minus className="h-3.5 w-3.5" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start gap-1.5">
                              <Badge className="text-[8px] px-1 py-0 h-3 font-medium border-0 shrink-0" style={{ backgroundColor: catConfig.bg, color: catConfig.text }}>
                                {catConfig.label}
                              </Badge>
                              <h4 className="text-[12px] text-white/60 font-medium leading-snug line-clamp-1">{item.title}</h4>
                            </div>
                            {isSelected && (
                              <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="text-[11px] text-white/30 leading-relaxed mt-1 line-clamp-2">
                                {item.snippet}
                              </motion.p>
                            )}
                            <div className="flex items-center gap-1.5 mt-1">
                              <span className="text-[9px] text-white/20 truncate max-w-[120px]">{item.source}</span>
                            </div>
                          </div>
                          <a href={item.url} target="_blank" rel="noopener noreferrer" className="shrink-0 p-1 rounded text-white/10 hover:text-white/40 transition-colors" onClick={(e) => e.stopPropagation()}>
                            <ExternalLink className="h-3 w-3" />
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

      {/* ── WATCHLIST TABLE ── */}
      <motion.div variants={cardVariants} custom={5}>
        <Card className="bg-white/[0.03] border-white/[0.05]">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Eye className="h-4 w-4 text-[#FFD700]/60" />
                <span className="text-[10px] text-white/40 uppercase tracking-wider font-bold">{tf('inv.dashWatchlist', 'Watchlist')}</span>
                <Badge variant="outline" className="border-white/[0.06] text-white/30 text-[9px]">{watchlist.length}</Badge>
              </div>
              <Button
                size="sm"
                className="h-7 px-2.5 text-[10px] gap-1 bg-[#FFD700]/10 text-[#FFD700] hover:bg-[#FFD700]/20 border border-[#FFD700]/20"
                onClick={() => setShowAddAsset(true)}
              >
                <Plus className="h-3 w-3" />
                {tf('inv.dashAddAsset', 'Add Asset')}
              </Button>
            </div>

            {watchlist.length === 0 && !loadingWatchlist ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Eye className="h-10 w-10 text-white/10 mb-3" />
                <p className="text-white/40 text-sm mb-1">{tf('inv.dashWatchlistEmpty', 'Tambahkan aset ke watchlist')}</p>
                <p className="text-white/25 text-xs mb-3">untuk memantau pergerakan harga</p>
                <Button
                  size="sm"
                  className="h-8 px-3 text-[11px] gap-1.5 bg-white/[0.05] text-white/50 hover:bg-white/[0.1] border border-white/[0.08]"
                  onClick={() => setShowAddAsset(true)}
                >
                  <Plus className="h-3 w-3" />
                  {tf('inv.dashAddAsset', 'Add Asset')}
                </Button>
              </div>
            ) : (
              <div className="max-h-72 overflow-y-auto custom-scrollbar">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/[0.06]">
                      <th className="text-left text-[10px] text-white/30 uppercase tracking-wider pb-2 pr-2">{tf('inv.dashAsset', 'Symbol')}</th>
                      <th className="text-right text-[10px] text-white/30 uppercase tracking-wider pb-2 pr-2">{tf('inv.dashPrice', 'Price')}</th>
                      <th className="text-right text-[10px] text-white/30 uppercase tracking-wider pb-2 pr-2">24h</th>
                      <th className="text-right text-[10px] text-white/30 uppercase tracking-wider pb-2 pr-2">{tf('inv.dashTarget', 'Target')}</th>
                      <th className="text-center text-[10px] text-white/30 uppercase tracking-wider pb-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {watchlist.map((w) => {
                      const tc = TYPE_COLORS[w.type];
                      const isUp = (w.change24h ?? 0) >= 0;
                      return (
                        <tr key={w.id} className="border-b border-white/[0.03] last:border-0 hover:bg-white/[0.02] transition-colors">
                          <td className="py-2.5 pr-2">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-bold text-white/80 font-mono">{w.symbol}</span>
                              <Badge className="text-[8px] px-1 py-0 h-3.5 font-medium border-0" style={{ backgroundColor: tc?.bg, color: tc?.text }}>
                                {w.type.toUpperCase()}
                              </Badge>
                              {w.name && <span className="text-[10px] text-white/25 truncate max-w-[80px]">{w.name}</span>}
                            </div>
                          </td>
                          <td className="text-right py-2.5 pr-2">
                            <span className="text-xs font-mono text-white/70">{fmtPrice(w.type, w.price ?? 0)}</span>
                          </td>
                          <td className="text-right py-2.5 pr-2">
                            <span className={cn('text-xs font-mono font-bold', isUp ? 'text-[#03DAC6]' : 'text-[#CF6679]')}>
                              {isUp ? '+' : ''}{(w.change24h ?? 0).toFixed(2)}%
                            </span>
                          </td>
                          <td className="text-right py-2.5 pr-2">
                            <div className="flex items-center justify-end gap-1 text-[10px] font-mono text-white/30">
                              {w.targetBuy && <span className="text-[#03DAC6]/50">{fmtPrice(w.type, w.targetBuy)}</span>}
                              {w.targetBuy && w.targetSell && <span>/</span>}
                              {w.targetSell && <span className="text-[#CF6679]/50">{fmtPrice(w.type, w.targetSell)}</span>}
                              {!w.targetBuy && !w.targetSell && <span>—</span>}
                            </div>
                          </td>
                          <td className="text-center py-2.5">
                            <button
                              className="p-1.5 rounded-md text-white/20 hover:text-[#CF6679] hover:bg-white/[0.06] transition-colors"
                              onClick={() => handleRemoveFromWatchlist(w.symbol, w.type)}
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* ── CHART + POSITIONS ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Chart Column */}
        <div className="lg:col-span-2">
          {chartTabs.length > 0 ? (
            <motion.div variants={cardVariants} custom={6}>
              <Card className="bg-[#0D0D0D] border-white/[0.06] overflow-hidden group">
                <CardContent className="p-0">
                  {/* Tab pills */}
                  <div className="flex items-center gap-2 px-4 pt-3 pb-2 overflow-x-auto scrollbar-none">
                    {chartTabs.map((tab) => {
                      const isActive = selectedAsset === tab.key || (!selectedAsset && chartTabs[0]?.key === tab.key);
                      const isWatchlist = tab.key.startsWith('wl:');
                      return (
                        <button
                          key={tab.key}
                          onClick={() => setSelectedAsset(tab.key)}
                          className={cn(
                            'shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold font-mono transition-all',
                            isActive
                              ? 'bg-[#BB86FC]/20 text-[#BB86FC] border border-[#BB86FC]/30'
                              : 'bg-white/[0.04] text-white/40 border border-white/[0.06] hover:bg-white/[0.08] hover:text-white/60',
                          )}
                        >
                          {isWatchlist && <Eye className="h-3 w-3 opacity-50" />}
                          {tab.symbol}
                        </button>
                      );
                    })}
                    {activeChartAsset && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="ml-auto shrink-0 h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-white/30 hover:text-white/70 hover:bg-white/10"
                        onClick={() => setExpandedChart(activeChartAsset.key)}
                      >
                        <Maximize2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                  {/* Chart */}
                  {activeChartAsset && (
                    <div className="px-1 pb-1">
                      <InvestmentChart
                        symbol={activeChartAsset.symbol}
                        type={activeChartAsset.type as 'saham' | 'crypto' | 'forex'}
                        height={380}
                        showHeader={true}
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ) : (
            <motion.div variants={cardVariants} custom={6}>
              <Card className="bg-white/[0.03] border-white/[0.05]">
                <CardContent className="flex flex-col items-center justify-center py-20">
                  <BarChart3 className="h-12 w-12 text-white/15 mb-3" />
                  <p className="text-white/30 text-sm">{tf('inv.dashNoChartAssets', 'No open positions or watchlist items')}</p>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Simplified Allocation */}
          {allocationData.length > 0 && (
            <motion.div variants={cardVariants} custom={7}>
              <Card className="bg-white/[0.03] border-white/[0.05]">
                <CardContent className="p-4 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-white/40 uppercase tracking-wider font-medium">{tf('inv.dashAllocation', 'Allocation')}</p>
                    <Badge variant="outline" className="border-white/[0.06] text-white/30 text-[10px]">{openPortfolios.length} open</Badge>
                  </div>
                  {/* Stacked bar */}
                  <div className="flex h-2.5 rounded-full overflow-hidden bg-white/[0.04]">
                    {allocationData.map((item) => (
                      <div
                        key={item.type}
                        className="h-full transition-all duration-700"
                        style={{ width: `${item.pct}%`, backgroundColor: item.color }}
                        title={`${item.type}: ${item.pct}%`}
                      />
                    ))}
                  </div>
                  {/* Legend */}
                  <div className="flex items-center gap-3 flex-wrap">
                    {allocationData.map((item) => (
                      <div key={item.type} className="flex items-center gap-1.5">
                        <div className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
                        <span className="text-[10px] text-white/40 capitalize">{item.type}</span>
                        <span className="text-[10px] text-white/25 font-mono">{item.pct}%</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Positions Table */}
          <motion.div variants={cardVariants} custom={8}>
            <Card className="bg-white/[0.03] border-white/[0.05]">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <p className="text-xs text-white/40 uppercase tracking-wider font-medium">{tf('inv.dashPositions', 'Positions')}</p>
                    <div className="flex items-center gap-0.5">
                      {(['open', 'closed', 'all'] as const).map((f) => (
                        <button
                          key={f}
                          onClick={() => setPositionFilter(f)}
                          className={cn(
                            'px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider transition-colors',
                            positionFilter === f
                              ? 'bg-white/[0.08] text-white/70'
                              : 'text-white/25 hover:text-white/40',
                          )}
                        >
                          {f} {f === 'open' ? `(${openPortfolios.length})` : f === 'closed' ? `(${closedPortfolios.length})` : `(${enrichedPortfolios.length})`}
                        </button>
                      ))}
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" className="h-7 px-2 text-white/30 hover:text-white/60 hover:bg-white/[0.06]" onClick={() => fetchLivePrices(true)}>
                    <RefreshCw className="h-3 w-3 mr-1" />
                    <span className="text-[10px]">{countdown}s</span>
                  </Button>
                </div>
                <div className="max-h-[420px] overflow-y-auto custom-scrollbar">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-white/[0.06]">
                        <th className="text-left text-[10px] text-white/30 uppercase tracking-wider pb-2 pr-2">{tf('inv.dashAsset', 'Asset')}</th>
                        <th className="text-right text-[10px] text-white/30 uppercase tracking-wider pb-2 pr-2">{tf('inv.dashPrice', 'Price')}</th>
                        <th className="text-right text-[10px] text-white/30 uppercase tracking-wider pb-2 pr-2">{tf('inv.dashQty', 'Qty')}</th>
                        <th className="text-right text-[10px] text-white/30 uppercase tracking-wider pb-2">{tf('inv.pnl', 'PnL')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredPositions.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="py-8 text-center text-white/20 text-xs">{tf('inv.dashNoPositions', 'No positions')}</td>
                        </tr>
                      ) : (
                        filteredPositions.map((p) => {
                          const live = allLivePrices[`${p.type}:${p.symbol}`];
                          const isUp = p.unrealizedPnl >= 0;
                          const tc = TYPE_COLORS[p.type];
                          const isClosing = closingId === p.id;
                          const isActive = selectedAsset === `${p.type}:${p.symbol}`;
                          return (
                            <tr
                              key={p.id}
                              className={cn(
                                'border-b border-white/[0.03] last:border-0 hover:bg-white/[0.02] transition-colors group',
                                isActive && 'bg-white/[0.03]',
                              )}
                            >
                              <td className="py-2.5 pr-2">
                                <button
                                  className="w-full text-left"
                                  onClick={() => setSelectedAsset(`${p.type}:${p.symbol}`)}
                                >
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-white text-xs font-bold font-mono">{p.symbol}</span>
                                    <Badge className="text-[8px] px-1 py-0 h-3.5 font-medium border-0" style={{ backgroundColor: tc?.bg, color: tc?.text }}>
                                      {p.type.toUpperCase()}
                                    </Badge>
                                    {p.status === 'closed' && (
                                      <Badge className="text-[7px] px-1 py-0 h-3 font-medium border-0 bg-white/[0.06] text-white/30">
                                        CLOSED
                                      </Badge>
                                    )}
                                  </div>
                                  {p.name && <p className="text-[10px] text-white/30 truncate max-w-[100px]">{p.name}</p>}
                                </button>
                              </td>
                              <td className="text-right py-2.5 pr-2">
                                <p className="text-white/70 text-xs font-mono">{fmtPrice(p.type, p.currentPrice)}</p>
                                {live && p.status === 'open' && (
                                  <p className={cn('text-[10px] font-mono', live.change24h >= 0 ? 'text-[#03DAC6]' : 'text-[#CF6679]')}>
                                    {live.change24h >= 0 ? '+' : ''}{live.change24h.toFixed(2)}%
                                  </p>
                                )}
                              </td>
                              <td className="text-right text-white/50 text-xs font-mono py-2.5 pr-2">{p.quantity}</td>
                              <td className="text-right py-2.5">
                                <div className="flex flex-col items-end gap-1">
                                  <div className="flex items-center gap-0.5">
                                    {isUp ? <ArrowUpRight className="h-3 w-3 text-[#03DAC6] shrink-0" /> : <ArrowDownRight className="h-3 w-3 text-[#CF6679] shrink-0" />}
                                    <span className={cn('text-xs font-bold font-mono', isUp ? 'text-[#03DAC6]' : 'text-[#CF6679]')}>
                                      {isUp ? '+' : ''}{p.unrealizedPnlPercentage.toFixed(2)}%
                                    </span>
                                  </div>
                                  <p className={cn('text-[10px] font-mono', isUp ? 'text-[#03DAC6]/60' : 'text-[#CF6679]/60')}>
                                    {isUp ? '+' : ''}{fmtPrice(p.type, p.unrealizedPnl)}
                                  </p>
                                  {/* Close / Reopen button */}
                                  {p.status === 'open' ? (
                                    <button
                                      className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider text-[#CF6679]/70 border border-[#CF6679]/20 hover:bg-[#CF6679]/10 hover:text-[#CF6679] transition-colors disabled:opacity-40"
                                      disabled={isClosing}
                                      onClick={(e) => { e.stopPropagation(); handleClosePosition(p); }}
                                    >
                                      {isClosing ? (
                                        <RefreshCw className="h-2.5 w-2.5 animate-spin" />
                                      ) : (
                                        <X className="h-2.5 w-2.5" />
                                      )}
                                      CLOSE
                                    </button>
                                  ) : (
                                    <button
                                      className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider text-[#03DAC6]/70 border border-[#03DAC6]/20 hover:bg-[#03DAC6]/10 hover:text-[#03DAC6] transition-colors disabled:opacity-40"
                                      disabled={isClosing}
                                      onClick={(e) => { e.stopPropagation(); handleReopenPosition(p); }}
                                    >
                                      {isClosing ? (
                                        <RefreshCw className="h-2.5 w-2.5 animate-spin" />
                                      ) : (
                                        <RotateCcw className="h-2.5 w-2.5" />
                                      )}
                                      REOPEN
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>

      {/* ── Expanded Chart Dialog ── */}
      <Dialog open={!!expandedChart} onOpenChange={() => setExpandedChart(null)}>
        <DialogContent aria-describedby={undefined} className="max-w-5xl w-[95vw] bg-[#0D0D0D] border-white/[0.06] p-0 gap-0 overflow-hidden">
          {expandedChart && (() => {
            // Find in chartTabs first (covers both portfolio and watchlist)
            const tab = chartTabs.find((t) => t.key === expandedChart);
            // Also try to find in enriched portfolios for extra info
            const pKey = expandedChart.startsWith('wl:') ? expandedChart.slice(3) : expandedChart;
            const p = enrichedPortfolios.find((x) => `${x.type}:${x.symbol}` === pKey);

            let symbol: string;
            let type: string;
            let name: string | undefined;

            if (tab) {
              symbol = tab.symbol;
              type = tab.type;
              name = tab.name || p?.name;
            } else {
              const parts = expandedChart.split(':');
              symbol = parts[parts.length - 1];
              type = parts[parts.length - 2];
              name = p?.name;
            }

            return (
              <>
                <DialogHeader className="px-5 pt-4 pb-2">
                  <div className="flex items-center gap-3">
                    <DialogTitle className="text-white text-sm font-bold flex items-center gap-2">
                      {symbol}
                      {name && <span className="text-white/30 font-normal text-xs">{name}</span>}
                    </DialogTitle>
                    {type && (
                      <Badge className="text-[9px] px-2 py-0 h-4 font-medium border-0" style={{ backgroundColor: TYPE_COLORS[type]?.bg, color: TYPE_COLORS[type]?.text }}>
                        {type.toUpperCase()}
                      </Badge>
                    )}
                  </div>
                </DialogHeader>
                <div className="px-3 pb-3">
                  <InvestmentChart symbol={symbol} type={type as 'saham' | 'crypto' | 'forex'} height={450} showHeader={false} />
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* ── Add Asset Dialog ── */}
      <Dialog open={showAddAsset} onOpenChange={setShowAddAsset}>
        <DialogContent aria-describedby={undefined} className="max-w-md bg-[#0D0D0D] border-white/[0.06]">
          <DialogHeader>
            <DialogTitle className="text-white text-sm font-bold">{tf('inv.dashAddToWatchlist', 'Add to Watchlist')}</DialogTitle>
          </DialogHeader>
          <div className="p-2">
            {businessId && (
              <AssetSearchInput
                businessId={businessId}
                onSelect={handleAddToWatchlist}
              />
            )}
            <p className="text-[11px] text-white/30 mt-2">
              Search for crypto, forex, or saham assets to add to your watchlist
            </p>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Inline scrollbar styles ── */}
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.15); }
        .scrollbar-none::-webkit-scrollbar { display: none; }
        .scrollbar-none { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </motion.div>
  );
}
