'use client';

import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useBusinessStore } from '@/store/useBusinessStore';
import { useTranslation } from '@/hooks/useTranslation';
import { useCurrencyFormat } from '@/hooks/useCurrencyFormat';
import { formatAssetPrice, currencyPrefix, getAssetNativeCurrency, type AssetType } from '@/lib/asset-catalogue';
import { convertCurrency, formatCurrency } from '@/lib/currency';
import type { CurrencyCode } from '@/lib/currency';
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
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  Shield,
  AlertTriangle,
  Brain,
  Clock,
  ArrowRight,
  CheckCircle2,
  Info,
  Calculator,
  CircleDollarSign,
} from 'lucide-react';
import InvestmentChart from '@/components/investment/InvestmentChart';
import AssetSearchInput, { type SelectedAsset } from '@/components/investment/AssetSearchInput';
import BacktestingPanel from '@/components/investment/BacktestingPanel';
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
  convertedCurrentValue?: number;
  convertedInvestedValue?: number;
  convertedUnrealizedPnl?: number;
  nativeCurrency?: string;
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
  fearGreedSource?: 'alternative.me' | 'proxy';
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
    macd: { value: number; signal: number; histogram: number; signalLabel?: string };
    bollingerBands?: { upper: number; middle: number; lower: number; position?: string; signal?: string };
    sma20?: number;
    sma50?: number;
    ema12?: number;
    ema26?: number;
  };
  smc?: {
    fairValueGaps: { high: number; low: number; filled: boolean; description: string };
    orderBlock: { zone: { high: number; low: number }; type: string; description: string };
    liquiditySweep: { level: number; swept: boolean; description: string };
    trendStructure: string;
    premiumDiscount: string;
  };
  aiAnalysis?: {
    overallSignal: string;
    signalStrength: number;
    confidence: number;
    reasoning: string;
    strategy: string;
    priceForecast: {
      shortTerm: { target: number; timeframe: string };
      midTerm: { target: number; timeframe: string };
      longTerm: { target: number; timeframe: string };
    };
    riskLevel: string;
    entryZone: string;
    stopLossZone: string;
    takeProfitZone: string;
    tradeDirection?: string;
    entryPrice?: number;
    stopLossPrice?: number;
    takeProfitPrice?: number;
    riskRewardRatio?: number;
  };
  newsConfirmation?: {
    confirmed: boolean;
    recentEvents: string[];
    sentiment: string;
    source: string;
  };
  signalDetails?: Array<{ indicator: string; signal: string; weight: number; description: string }>;
  marketDetail?: {
    marketCap: number | null;
    totalVolume: number | null;
    high24h: number | null;
    low24h: number | null;
    ath: number | null;
    athChangePercentage: number | null;
    atl: number | null;
    atlChangePercentage: number | null;
    priceChangePercentage7d: number | null;
    priceChangePercentage30d: number | null;
    circulatingSupply: number | null;
    marketCapRank: number | null;
    sparkline7d: number[] | null;
    source: string;
  } | null;
  dataQuality?: {
    isMock: boolean;
    ohlcvSource: string;
    indicatorsComputed: boolean;
  };
  layerScores?: Record<string, { score: number; signal: string; description: string }>;
  confluenceCount?: number;
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

interface NewsImpact {
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

function toF(val: number | undefined | null, digits = 2): string {
  const n = typeof val === 'number' && !isNaN(val) ? val : 0;
  return n.toFixed(digits);
}

function formatLargeNumber(num: number | null | undefined): string {
  const n = typeof num === 'number' && !isNaN(num) ? num : 0;
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(2)}K`;
  return `$${n.toFixed(2)}`;
}

function formatMarketCap(value: number | undefined | null): string {
  const n = typeof value === 'number' && !isNaN(value) ? value : 0;
  return `$${compactFmt.format(n)}`;
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
  const { formatAmount, currency } = useCurrencyFormat();
  const businessId = activeBusiness?.id;

  // ── State ──────────────────────────────────────────────────────────────────
  const [portfolios, setPortfolios] = useState<PortfolioItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [livePrices, setLivePrices] = useState<Record<string, LivePrice>>(() => {
    // Restore cached prices from localStorage
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem(`inv-prices-${businessId}`);
        if (cached) {
          const parsed = JSON.parse(cached);
          // Only use if less than 5 minutes old
          if (parsed.timestamp && Date.now() - parsed.timestamp < 5 * 60 * 1000) {
            return parsed.prices || {};
          }
        }
      } catch {}
    }
    return {};
  });
  const [expandedChart, setExpandedChart] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(30);
  const [selectedAsset, setSelectedAsset] = useState<string | null>(() => {
    // Restore selected asset from localStorage
    if (typeof window !== 'undefined') {
      try {
        return localStorage.getItem(`inv-selected-${businessId}`) || null;
      } catch {}
    }
    return null;
  });
  const [closingId, setClosingId] = useState<string | null>(null);
  const [positionFilter, setPositionFilter] = useState<'open' | 'closed' | 'all'>(() => {
    // Restore position filter from localStorage
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(`inv-filter-${businessId}`);
        if (saved && ['open', 'closed', 'all'].includes(saved)) return saved as 'open' | 'closed' | 'all';
      } catch {}
    }
    return 'open';
  });

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

  // Quick add portfolio (from dashboard)
  const [showAddPortfolio, setShowAddPortfolio] = useState(false);
  const [addPortfolioForm, setAddPortfolioForm] = useState({
    symbol: '', name: '', type: 'crypto' as string, entryPrice: '', quantity: '', notes: '',
  });
  const [addPortfolioSelected, setAddPortfolioSelected] = useState<SelectedAsset | null>(null);
  const [savingPortfolio, setSavingPortfolio] = useState(false);

  // News + Social + Impacts
  const [newsItems, setNewsItems] = useState<NewsItem[]>([]);
  const [socialItems, setSocialItems] = useState<SocialItem[]>([]);
  const [newsImpacts, setNewsImpacts] = useState<NewsImpact[]>([]);
  const [newsSentiment, setNewsSentiment] = useState<string>('neutral');
  const [loadingNews, setLoadingNews] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);

  // Refs
  const abortRef = useRef<AbortController | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const loadingRef = useRef(true);
  const portfoliosRef = useRef<PortfolioItem[]>([]);

  // ── Persist state to localStorage ──────────────────────────────────────────
  useEffect(() => {
    if (!businessId) return;
    if (selectedAsset) localStorage.setItem(`inv-selected-${businessId}`, selectedAsset);
  }, [selectedAsset, businessId]);

  useEffect(() => {
    if (!businessId) return;
    localStorage.setItem(`inv-filter-${businessId}`, positionFilter);
  }, [positionFilter, businessId]);

  useEffect(() => {
    if (!businessId || Object.keys(livePrices).length === 0) return;
    try {
      localStorage.setItem(`inv-prices-${businessId}`, JSON.stringify({
        prices: livePrices,
        timestamp: Date.now(),
      }));
    } catch {}
  }, [livePrices, businessId]);

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

  // ── Fetch news + social + impacts ────────────────────────────────────────
  const fetchNewsAndSocial = useCallback(() => {
    if (!businessId) return;
    setLoadingNews(true);
    Promise.allSettled([
      fetch(`/api/business/${businessId}/market-data/news`)
        .then((res) => (res.ok ? res.json() : { news: [], sentiment: 'neutral', impacts: [] }))
        .then((data) => {
          setNewsItems(data.news || []);
          setNewsImpacts(data.impacts || []);
          setNewsSentiment(data.sentiment || 'neutral');
        })
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

  // ── Fetch quant signals for top 6 assets (portfolio + watchlist) ─────────
  const fetchSignals = useCallback(async (items: Array<{ type: string; symbol: string }>) => {
    if (!businessId || items.length === 0) return;
    const topAssets = items.slice(0, 8);
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
    const items: Array<{ type: string; symbol: string }> = [
      ...portfolios.filter((p) => p.status === 'open').map((p) => ({ type: p.type, symbol: p.symbol })),
      ...watchlist.map((w) => ({ type: w.type, symbol: w.symbol })),
    ];
    // Deduplicate
    const unique = items.filter(
      (item, i, arr) =>
        arr.findIndex((a) => `${a.type}:${a.symbol}` === `${item.type}:${item.symbol}`) === i,
    );

    if (unique.length > 0) {
      const timer = setTimeout(() => {
        setLoadingSignals(true);
        fetchSignals(unique);
      }, 0);
      return () => clearTimeout(timer);
    } else {
      setLoadingSignals(false);
    }
  }, [portfolios, watchlist, fetchSignals]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleAnalyzeAll = useCallback(async () => {
    setAnalyzingAll(true);
    const items: Array<{ type: string; symbol: string }> = [
      ...portfolios.filter((p) => p.status === 'open').map((p) => ({ type: p.type, symbol: p.symbol })),
      ...watchlist.map((w) => ({ type: w.type, symbol: w.symbol })),
    ];
    const unique = items.filter(
      (item, i, arr) =>
        arr.findIndex((a) => `${a.type}:${a.symbol}` === `${item.type}:${item.symbol}`) === i,
    );
    await fetchSignals(unique);
    setAnalyzingAll(false);
    toast.success(tf('quant.analyzing', 'Analysis complete!'));
  }, [fetchSignals, portfolios, watchlist, tf]);

  const handleAddToWatchlist = useCallback(async (asset: SelectedAsset) => {
    try {
      const res = await fetch(`/api/business/${businessId}/watchlist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol: asset.symbol, type: asset.type, name: asset.name }),
      });
      if (res.ok) {
        toast.success(tf('inv.dashAddedWatchlist', `${asset.symbol} ditambahkan ke watchlist`));
        fetchWatchlist();
        setShowAddAsset(false);
      }
    } catch {
      toast.error(tf('inv.dashAddedWatchlist', 'Gagal menambahkan ke watchlist'));
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
    if (!window.confirm(tf('inv.dashCloseConfirm', `Close position for ${p.symbol} at ${fmtPrice(p.type, exitPrice)}?\nPnL: ${p.unrealizedPnl >= 0 ? '+' : ''}${toF(p.unrealizedPnlPercentage)}%`))) return;
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

  // ── Quick add portfolio handler ─────────────────────────────────────────────
  const handleQuickAddPortfolio = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessId || !addPortfolioForm.symbol || !addPortfolioForm.entryPrice || !addPortfolioForm.quantity) return;
    setSavingPortfolio(true);
    try {
      const res = await fetch(`/api/business/${businessId}/portfolio`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: addPortfolioForm.type,
          symbol: addPortfolioForm.symbol,
          name: addPortfolioForm.name,
          entryPrice: parseFloat(addPortfolioForm.entryPrice),
          quantity: parseFloat(addPortfolioForm.quantity),
          currentPrice: parseFloat(addPortfolioForm.entryPrice),
          notes: addPortfolioForm.notes || null,
          status: 'open',
        }),
      });
      if (res.ok) {
        toast.success(tf('inv.portfolioCreated', 'Portofolio berhasil dibuat'));
        setShowAddPortfolio(false);
        setAddPortfolioForm({ symbol: '', name: '', type: 'crypto', entryPrice: '', quantity: '', notes: '' });
        setAddPortfolioSelected(null);
        fetchPortfolios();
      } else {
        toast.error(tf('common.error', 'Gagal membuat portofolio'));
      }
    } catch {
      toast.error(tf('common.error', 'Gagal membuat portofolio'));
    } finally {
      setSavingPortfolio(false);
    }
  }, [businessId, addPortfolioForm, fetchPortfolios, tf]);

  const openQuickAddPortfolio = useCallback(() => {
    setAddPortfolioForm({ symbol: '', name: '', type: 'crypto', entryPrice: '', quantity: '', notes: '' });
    setAddPortfolioSelected(null);
    setShowAddPortfolio(true);
  }, []);

  const fmtPrice = (type: string, val: number) => {
    const prefix = currencyPrefix(type as 'saham' | 'crypto' | 'forex');
    return `${prefix}${formatAssetPrice(val, type as 'saham' | 'crypto' | 'forex')}`;
  };

  // ── Enriched portfolios with live prices & currency conversion ─────────────
  const enrichedPortfolios = useMemo(() => {
    return portfolios.map((p) => {
      const live = livePrices[`${p.type}:${p.symbol}`];
      const currentPrice = live?.price ?? p.currentPrice;
      const currentValue = currentPrice * p.quantity; // native currency
      const investedValue = p.entryPrice * p.quantity; // native currency
      const unrealizedPnl = currentValue - investedValue; // native currency
      const unrealizedPnlPercentage = investedValue > 0 ? ((currentValue - investedValue) / investedValue) * 100 : 0;

      // Convert to user's display currency
      const nativeCurrency = getAssetNativeCurrency(p.type as AssetType, p.symbol) as CurrencyCode;
      const targetCurrency = currency as CurrencyCode;
      const conversionRate = convertCurrency(1, nativeCurrency, targetCurrency);

      return {
        ...p,
        currentPrice,
        currentValue,
        investedValue,
        unrealizedPnl,
        unrealizedPnlPercentage,
        // Converted values in user's display currency
        convertedCurrentValue: currentValue * conversionRate,
        convertedInvestedValue: investedValue * conversionRate,
        convertedUnrealizedPnl: unrealizedPnl * conversionRate,
        nativeCurrency,
      };
    });
  }, [portfolios, livePrices, currency]);

  // ── Computed data (all from enriched) ─────────────────────────────────────
  const openPortfolios = useMemo(() => enrichedPortfolios.filter((p) => p.status === 'open'), [enrichedPortfolios]);
  const closedPortfolios = useMemo(() => enrichedPortfolios.filter((p) => p.status === 'closed'), [enrichedPortfolios]);

  const stats = useMemo(() => {
    // Use converted values (in user's display currency)
    const totalValue = openPortfolios.reduce((s, p) => s + p.convertedCurrentValue, 0);
    const investedValue = openPortfolios.reduce((s, p) => s + p.convertedInvestedValue, 0);
    const unrealizedPnl = openPortfolios.reduce((s, p) => s + p.convertedUnrealizedPnl, 0);
    const realizedPnl = closedPortfolios.reduce((s, p) => s + p.convertedUnrealizedPnl, 0);
    const winTrades = closedPortfolios.filter((p) => p.unrealizedPnl > 0).length;
    const totalTrades = closedPortfolios.length;
    const winRate = totalTrades > 0 ? (winTrades / totalTrades) * 100 : 0;
    return { totalValue, investedValue, unrealizedPnl, realizedPnl, winRate, totalTrades };
  }, [openPortfolios, closedPortfolios]);

  const allocationData = useMemo(() => {
    const byType: Record<string, { value: number; count: number }> = {};
    openPortfolios.forEach((p) => {
      if (!byType[p.type]) byType[p.type] = { value: 0, count: 0 };
      byType[p.type].value += p.convertedCurrentValue;
      byType[p.type].count++;
    });
    return Object.entries(byType).map(([type, { value, count }]) => ({
      type,
      value,
      count,
      color: TYPE_COLORS[type]?.hex || '#888',
      pct: stats.totalValue > 0 ? toF((value / stats.totalValue) * 100, 1) : '0',
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

  // Build a set of portfolio/watchlist asset keys for impact matching
  const portfolioAssetKeys = useMemo(() => {
    const keys = new Set<string>();
    openPortfolios.forEach((p) => keys.add(p.symbol.toUpperCase()));
    watchlist.forEach((w) => keys.add(w.symbol.toUpperCase()));
    return keys;
  }, [openPortfolios, watchlist]);

  // Merged feed from news + social, with minimum 5 items, prioritize portfolio asset news
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

    // Sort: items matching portfolio assets first
    feed.sort((a, b) => {
      const aMatch = portfolioAssetKeys.has(a.title.split(' ').find((w) => w.length > 2)?.toUpperCase() || '') ? 0 : 1;
      const bMatch = portfolioAssetKeys.has(b.title.split(' ').find((w) => w.length > 2)?.toUpperCase() || '') ? 0 : 1;
      return aMatch - bMatch;
    });

    return feed.slice(0, Math.max(15, feed.length));
  }, [newsItems, socialItems, portfolioAssetKeys]);

  // Get the active chart signal for AI Insights
  const activeChartSignal = useMemo(() => {
    if (!activeChartAsset) return null;
    const key = activeChartAsset.key.startsWith('wl:')
      ? activeChartAsset.key.slice(3)
      : activeChartAsset.key;
    return signals.get(key) || null;
  }, [activeChartAsset, signals]);

  // Build backtesting asset list from portfolio + watchlist (deduplicated)
  const backtestAssets = useMemo(() => {
    const list: Array<{ key: string; symbol: string; type: string; name?: string }> = [];
    openPortfolios.forEach((p) => {
      list.push({ key: `${p.type}:${p.symbol}`, symbol: p.symbol, type: p.type, name: p.name });
    });
    watchlist.forEach((w) => {
      list.push({ key: `wl:${w.type}:${w.symbol}`, symbol: w.symbol, type: w.type, name: w.name });
    });
    const seen = new Set<string>();
    return list.filter((a) => {
      const k = `${a.type}:${a.symbol}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  }, [openPortfolios, watchlist]);

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
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 p-4 pt-3">
                  {[
                    { icon: LayoutDashboard, color: '#BB86FC', title: tf('inv.dashGuideDashboard', 'Dashboard'), desc: 'Monitor portofolio & sinyal real-time' },
                    { icon: TrendingUp, color: '#03DAC6', title: tf('inv.dashGuideQuant', 'Quant Trade'), desc: 'Analisis teknikal otomatis dengan smart money logic' },
                    { icon: BookOpen, color: '#FFD700', title: tf('inv.dashGuideJournal', 'Trading Journal'), desc: 'Catat trade & evaluasi performa' },
                  ].map((item) => (
                    <div key={item.title} className="flex items-start gap-3 px-3 py-3 rounded-lg bg-[#0D0D0D]/60 border border-white/[0.04] hover:border-white/[0.08] transition-colors">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg shrink-0 mt-0.5" style={{ backgroundColor: `${item.color}15` }}>
                        <item.icon className="h-4 w-4" style={{ color: item.color }} />
                      </div>
                      <div className="min-w-0">
                        <span className="text-xs text-white/70 font-bold block">{item.title}</span>
                        <span className="text-[11px] text-white/40 mt-0.5 block leading-relaxed">{item.desc}</span>
                      </div>
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
                      {isUp ? '+' : ''}{toF(change)}%
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
                      {isUp ? '+' : ''}{toF(change)}%
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
                { label: tf('inv.dashBtcDom', 'BTC Dom'), value: `${toF(macroData.global.btcDominance, 1)}%`, icon: Zap, change: null },
                { label: tf('inv.dashVolume24h', 'Volume 24h'), value: formatMarketCap(macroData.global.totalVolume), icon: BarChart3, change: null },
                { label: tf('inv.dashChange24h', '24h Change'), value: `${macroData.global.marketCapChange24h >= 0 ? '+' : ''}${toF(macroData.global.marketCapChange24h)}%`, icon: macroData.global.marketCapChange24h >= 0 ? TrendingUp : TrendingDown, change: macroData.global.marketCapChange24h },
                ...(macroData.fearAndGreed ? [{ label: macroData.fearGreedSource === 'alternative.me' ? 'Fear & Greed Index (Alternative.me)' : 'Market Sentiment (estimated)', value: `${macroData.fearAndGreed.value} ${macroData.fearAndGreed.label}`, icon: Gauge, change: null }] : []),
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
                          <div className="h-full rounded-full bg-[#03DAC6]" style={{ width: `${Math.min(100, Math.abs(item.change24h ?? 0) * 5)}%` }} />
                        </div>
                        <span className="text-[11px] font-bold font-mono text-[#03DAC6]">+{toF(item.change24h)}%</span>
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
                          <div className="h-full rounded-full bg-[#CF6679]" style={{ width: `${Math.min(100, Math.abs(item.change24h ?? 0) * 5)}%` }} />
                        </div>
                        <span className="text-[11px] font-bold font-mono text-[#CF6679]">{toF(item.change24h)}%</span>
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
            { label: t('inv.portfolioValue'), value: formatCurrency(stats.totalValue, currency as CurrencyCode), sub: formatCurrency(stats.investedValue, currency as CurrencyCode) + ' invested', icon: Wallet, color: PURPLE_COLOR },
            { label: t('inv.unrealizedPnL'), value: (stats.unrealizedPnl >= 0 ? '+' : '') + formatCurrency(stats.unrealizedPnl, currency as CurrencyCode), sub: toF(stats.investedValue > 0 ? (stats.unrealizedPnl / stats.investedValue) * 100 : 0) + '% return', icon: stats.unrealizedPnl >= 0 ? TrendingUp : TrendingDown, color: pnlColor(stats.unrealizedPnl) },
            { label: t('inv.realizedPnL'), value: (stats.realizedPnl >= 0 ? '+' : '') + formatCurrency(stats.realizedPnl, currency as CurrencyCode), sub: stats.totalTrades + ' trades closed', icon: stats.realizedPnl >= 0 ? TrendingUp : TrendingDown, color: pnlColor(stats.realizedPnl) },
            { label: t('inv.winRate'), value: toF(stats.winRate, 1) + '%', sub: stats.totalTrades > 0 ? (stats.winRate >= 50 ? 'Profitable' : 'Review strategy') : 'No closed trades', icon: Trophy, color: stats.winRate >= 50 ? UP_COLOR : DOWN_COLOR },
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

      {/* ── CHART + WATCHLIST + QUANT SIGNALS + NEWS ── */}
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

          {/* ── AI INSIGHTS PANEL (below chart) ── */}
          {activeChartAsset && activeChartSignal && (
            <motion.div variants={cardVariants} custom={7} className="mt-4">
              <Card className="bg-white/[0.03] border-white/[0.05]">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Brain className="h-4 w-4 text-[#BB86FC]/80" />
                    <span className="text-[10px] text-white/40 uppercase tracking-wider font-bold">
                      AI Insights — {activeChartAsset.symbol}
                    </span>
                    {activeChartSignal.aiAnalysis && (
                      <Badge className="text-[8px] px-1.5 py-0 h-3.5 font-bold border-0 ml-auto" style={{
                        backgroundColor: `${activeChartSignal.aiAnalysis.confidence > 70 ? UP_COLOR : activeChartSignal.aiAnalysis.confidence > 50 ? GOLD_COLOR : DOWN_COLOR}18`,
                        color: activeChartSignal.aiAnalysis.confidence > 70 ? UP_COLOR : activeChartSignal.aiAnalysis.confidence > 50 ? GOLD_COLOR : DOWN_COLOR,
                      }}>
                        {activeChartSignal.aiAnalysis.confidence}% confidence
                      </Badge>
                    )}
                  </div>

                  {/* Live Market Data Bar */}
                  {activeChartSignal.marketDetail && (() => {
                    const md = activeChartSignal.marketDetail;
                    return (
                      <div className="rounded-lg bg-white/[0.02] border border-white/[0.04] p-3 mb-3">
                        <div className="flex items-center gap-1.5 mb-2">
                          <Activity className="h-3 w-3 text-[#03DAC6]/60" />
                          <span className="text-[9px] text-white/30 uppercase tracking-wider font-bold">Live Market Data</span>
                          <Badge className="text-[7px] px-1 py-0 h-3 font-mono border-0 ml-auto" style={{
                            backgroundColor: 'rgba(3,218,198,0.1)',
                            color: '#03DAC6',
                          }}>
                            {md.source}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          {md.marketCap != null && (
                            <div>
                              <span className="text-[8px] text-white/20 uppercase tracking-wider block mb-0.5">Market Cap</span>
                              <span className="text-[11px] font-mono font-bold text-white/60">{formatLargeNumber(md.marketCap)}</span>
                            </div>
                          )}
                          {md.totalVolume != null && (
                            <div>
                              <span className="text-[8px] text-white/20 uppercase tracking-wider block mb-0.5">Volume 24h</span>
                              <span className="text-[11px] font-mono font-bold text-white/60">{formatLargeNumber(md.totalVolume)}</span>
                            </div>
                          )}
                          {md.high24h != null && md.low24h != null && (
                            <div>
                              <span className="text-[8px] text-white/20 uppercase tracking-wider block mb-0.5">24h Range</span>
                              <span className="text-[10px] font-mono text-white/50 block">
                                <span className="text-[#03DAC6]/70">${md.low24h.toLocaleString(undefined, {maximumFractionDigits: md.low24h < 1 ? 6 : 2})}</span>
                                <span className="text-white/15 mx-1">—</span>
                                <span className="text-[#CF6679]/70">${md.high24h.toLocaleString(undefined, {maximumFractionDigits: md.high24h < 1 ? 6 : 2})}</span>
                              </span>
                            </div>
                          )}
                          {md.priceChangePercentage7d != null && (
                            <div>
                              <span className="text-[8px] text-white/20 uppercase tracking-wider block mb-0.5">7d Change</span>
                              <span className={cn('text-[11px] font-mono font-bold', md.priceChangePercentage7d >= 0 ? 'text-[#03DAC6]' : 'text-[#CF6679]')}>
                                {md.priceChangePercentage7d >= 0 ? '+' : ''}{md.priceChangePercentage7d.toFixed(2)}%
                              </span>
                            </div>
                          )}
                        </div>
                        {(md.ath != null || md.atl != null) && (
                          <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-white/[0.04]">
                            {md.ath != null && (
                              <div>
                                <span className="text-[8px] text-white/20 uppercase tracking-wider block mb-0.5">ATH</span>
                                <span className="text-[10px] font-mono text-white/40">${md.ath.toLocaleString(undefined, {maximumFractionDigits: md.ath < 1 ? 6 : 2})}</span>
                                {md.athChangePercentage != null && (
                                  <span className="text-[9px] text-[#CF6679]/60 ml-1 font-mono">({md.athChangePercentage.toFixed(1)}%)</span>
                                )}
                              </div>
                            )}
                            {md.atl != null && (
                              <div>
                                <span className="text-[8px] text-white/20 uppercase tracking-wider block mb-0.5">ATL</span>
                                <span className="text-[10px] font-mono text-white/40">${md.atl.toLocaleString(undefined, {maximumFractionDigits: md.atl < 1 ? 6 : 2})}</span>
                                {md.atlChangePercentage != null && (
                                  <span className={cn('text-[9px] font-mono ml-1', md.atlChangePercentage >= 0 ? 'text-[#03DAC6]/60' : 'text-[#CF6679]/60')}>
                                    (+{md.atlChangePercentage.toFixed(1)}%)
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {activeChartSignal.aiAnalysis ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {/* AI Reasoning + Strategy */}
                      <div className="space-y-3">
                        {/* Reasoning */}
                        <div className="rounded-lg bg-white/[0.02] border border-white/[0.04] p-3">
                          <div className="flex items-center gap-1.5 mb-1.5">
                            <Info className="h-3 w-3 text-white/30" />
                            <span className="text-[9px] text-white/30 uppercase tracking-wider font-bold">Analysis</span>
                          </div>
                          <p className="text-[11px] text-white/50 leading-relaxed">{activeChartSignal.aiAnalysis.reasoning}</p>
                        </div>
                        {/* Strategy + Risk */}
                        <div className="flex gap-2">
                          <div className="flex-1 rounded-lg bg-white/[0.02] border border-white/[0.04] p-2.5">
                            <span className="text-[8px] text-white/25 uppercase tracking-wider block mb-1">Strategy</span>
                            <p className="text-[11px] text-white/60 font-medium">{activeChartSignal.aiAnalysis.strategy}</p>
                          </div>
                          <div className="flex-1 rounded-lg bg-white/[0.02] border border-white/[0.04] p-2.5">
                            <span className="text-[8px] text-white/25 uppercase tracking-wider block mb-1">Risk Level</span>
                            <Badge className="text-[10px] px-2 py-0 h-4 font-bold border-0" style={{
                              backgroundColor: activeChartSignal.aiAnalysis.riskLevel === 'LOW' ? 'rgba(3,218,198,0.15)' : activeChartSignal.aiAnalysis.riskLevel === 'HIGH' ? 'rgba(207,102,121,0.15)' : 'rgba(255,215,0,0.15)',
                              color: activeChartSignal.aiAnalysis.riskLevel === 'LOW' ? UP_COLOR : activeChartSignal.aiAnalysis.riskLevel === 'HIGH' ? DOWN_COLOR : GOLD_COLOR,
                            }}>
                              <Shield className="h-3 w-3 mr-1" />
                              {activeChartSignal.aiAnalysis.riskLevel}
                            </Badge>
                          </div>
                        </div>
                      </div>

                      {/* Price Forecast */}
                      <div className="rounded-lg bg-white/[0.02] border border-white/[0.04] p-3 space-y-2.5">
                        <div className="flex items-center gap-1.5">
                          <Target className="h-3 w-3 text-white/30" />
                          <span className="text-[9px] text-white/30 uppercase tracking-wider font-bold">Price Forecast</span>
                        </div>
                        {[
                          { label: 'Short Term', data: activeChartSignal.aiAnalysis.priceForecast.shortTerm, icon: Clock, color: UP_COLOR },
                          { label: 'Mid Term', data: activeChartSignal.aiAnalysis.priceForecast.midTerm, icon: TrendingUp, color: GOLD_COLOR },
                          { label: 'Long Term', data: activeChartSignal.aiAnalysis.priceForecast.longTerm, icon: ArrowRight, color: PURPLE_COLOR },
                        ].map((fc) => (
                          <div key={fc.label} className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                              <fc.icon className="h-3 w-3" style={{ color: fc.color }} />
                              <span className="text-[10px] text-white/40">{fc.label}</span>
                              <span className="text-[9px] text-white/20">({fc.data.timeframe})</span>
                            </div>
                            <span className="text-[11px] font-mono font-bold text-white/70">
                              {fmtPrice(activeChartAsset.type, fc.data.target)}
                            </span>
                          </div>
                        ))}

                        {/* Trade Zones */}
                        <div className="border-t border-white/[0.04] pt-2.5 mt-1 space-y-1.5">
                          <span className="text-[8px] text-white/25 uppercase tracking-wider block">Trade Zones</span>
                          <div className="flex items-center gap-1.5">
                            <div className={cn('h-1.5 w-1.5 rounded-full', activeChartSignal.aiAnalysis.tradeDirection === 'SHORT' ? 'bg-[#CF6679]' : 'bg-[#03DAC6]')} />
                            <span className="text-[9px] text-white/25 w-14">{activeChartSignal.aiAnalysis.tradeDirection === 'SHORT' ? 'Entry (SELL)' : activeChartSignal.aiAnalysis.tradeDirection === 'LONG' ? 'Entry (BUY)' : 'Entry'}</span>
                            <span className="text-[10px] text-white/50 font-mono text-xs">{activeChartSignal.aiAnalysis.entryZone}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <div className="h-1.5 w-1.5 rounded-full bg-[#CF6679]" />
                            <span className="text-[9px] text-white/25 w-14">Stop Loss</span>
                            <span className="text-[10px] text-[#CF6679]/70 font-mono text-xs">{activeChartSignal.aiAnalysis.stopLossZone}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <div className="h-1.5 w-1.5 rounded-full bg-[#FFD700]" />
                            <span className="text-[9px] text-white/25 w-14">Take Profit</span>
                            <span className="text-[10px] text-[#FFD700]/70 font-mono text-xs">{activeChartSignal.aiAnalysis.takeProfitZone}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center py-6">
                      <div className="flex items-center gap-2">
                        <RefreshCw className="h-3.5 w-3.5 text-white/15 animate-spin" />
                        <span className="text-[11px] text-white/25">Loading AI analysis...</span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}
        </div>

        {/* Right Panel: Watchlist + Quant Signals + News stacked */}
        <div className="flex flex-col gap-4">
          {/* Compact Watchlist */}
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
                  {tf('inv.dashAddAsset', 'Add')}
                </Button>
              </div>
              <div className="max-h-[200px] overflow-y-auto custom-scrollbar space-y-0.5">
                {watchlist.length === 0 && !loadingWatchlist ? (
                  <div className="flex flex-col items-center justify-center py-6">
                    <Eye className="h-8 w-8 text-white/10 mb-2" />
                    <p className="text-white/30 text-xs">{tf('inv.dashWatchlistEmpty', 'Tambahkan aset ke watchlist')}</p>
                  </div>
                ) : (
                  watchlist.slice(0, 5).map((w) => {
                    const tc = TYPE_COLORS[w.type];
                    const isUp = (w.change24h ?? 0) >= 0;
                    const wlSignal = signals.get(`${w.type}:${w.symbol}`);
                    const signalColor = wlSignal ? getSignalColor(wlSignal.signalStrength) : null;
                    return (
                      <div
                        key={w.id}
                        className="group flex items-center justify-between px-2.5 py-2 rounded-lg hover:bg-white/[0.04] transition-colors cursor-pointer"
                        onClick={() => setSelectedAsset(`wl:${w.type}:${w.symbol}`)}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          {signalColor && (
                            <div className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: signalColor }} title={wlSignal ? getSignalLabel(wlSignal.overallSignal, wlSignal.signalStrength) : ''} />
                          )}
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-bold text-white/80 font-mono">{w.symbol}</span>
                              <Badge className="text-[7px] px-1 py-0 h-3 font-medium border-0" style={{ backgroundColor: tc?.bg, color: tc?.text }}>
                                {(w.type || 'crypto').toUpperCase()}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[10px] font-mono text-white/50">{fmtPrice(w.type, w.price ?? 0)}</span>
                              <span className={cn('text-[10px] font-mono font-bold', isUp ? 'text-[#03DAC6]' : 'text-[#CF6679]')}>
                                {isUp ? '+' : ''}{(w.change24h ?? 0).toFixed(2)}%
                              </span>
                            </div>
                          </div>
                        </div>
                        <button
                          className="p-1 rounded opacity-0 group-hover:opacity-100 text-white/20 hover:text-[#CF6679] hover:bg-white/[0.06] transition-all shrink-0"
                          onClick={(e) => { e.stopPropagation(); handleRemoveFromWatchlist(w.symbol, w.type); }}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>

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
                  disabled={analyzingAll}
                >
                  <RefreshCw className={cn('h-3 w-3', analyzingAll && 'animate-spin')} />
                  Analyze
                </Button>
              </div>
              <div className="max-h-[200px] overflow-y-auto custom-scrollbar space-y-2">
                {(openPortfolios.length === 0 && watchlist.length === 0) ? (
                  <div className="flex flex-col items-center justify-center py-6">
                    <BarChart3 className="h-8 w-8 text-white/10 mb-2" />
                    <p className="text-white/30 text-xs">{tf('inv.noSignals', 'Add positions to see signals')}</p>
                  </div>
                ) : (
                  [...openPortfolios.slice(0, 4), ...watchlist.slice(0, 2)].map((item) => {
                    const key = `${item.type}:${item.symbol}`;
                    const signal = signals.get(key);
                    const tc = TYPE_COLORS[item.type];
                    const strength = signal?.signalStrength ?? 0;
                    const signalColor = signal ? getSignalColor(strength) : '#666';
                    const signalLabel = signal ? getSignalLabel(signal.overallSignal, strength) : 'LOADING';

                    return (
                      <div key={key} className="flex items-center justify-between px-3 py-2 rounded-lg bg-white/[0.02] hover:bg-white/[0.04] transition-colors cursor-pointer" onClick={() => setSelectedAsset(key)}>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-white/80 font-mono">{item.symbol}</span>
                          <Badge className="text-[7px] px-1 py-0 h-3 font-medium border-0" style={{ backgroundColor: tc?.bg, color: tc?.text }}>
                            {(item.type || 'crypto').toUpperCase()}
                          </Badge>
                          {!('status' in item) ? (
                            <Eye className="h-3 w-3 text-white/15" />
                          ) : null}
                          {signal && (
                            <div className="flex items-center gap-1">
                              <span className="text-[9px] text-white/25">RSI</span>
                              <span className={cn('text-[10px] font-mono font-bold', (signal.indicators?.rsi?.value ?? 50) < 30 || (signal.indicators?.rsi?.value ?? 50) > 70 ? 'text-[#CF6679]' : 'text-[#03DAC6]')}>
                                {toF(signal.indicators?.rsi?.value, 1)}
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5">
                          {signal ? (
                            <>
                              <div className="w-12 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                                <div className="h-full rounded-full transition-all" style={{ width: `${((strength + 100) / 200) * 100}%`, backgroundColor: signalColor }} />
                              </div>
                              <Badge className="text-[8px] px-1.5 py-0 h-3.5 font-bold border-0" style={{ backgroundColor: `${signalColor}18`, color: signalColor }}>
                                {signalLabel}
                              </Badge>
                            </>
                          ) : (
                            <Skeleton className="h-4 w-14 rounded bg-white/[0.06]" />
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
                <div className="flex items-center gap-1.5">
                  {newsSentiment && newsSentiment !== 'neutral' && (
                    <Badge className="text-[7px] px-1 py-0 h-3 font-bold border-0" style={{
                      backgroundColor: newsSentiment === 'bullish' ? 'rgba(3,218,198,0.15)' : 'rgba(207,102,121,0.15)',
                      color: newsSentiment === 'bullish' ? UP_COLOR : DOWN_COLOR,
                    }}>
                      {newsSentiment.toUpperCase()}
                    </Badge>
                  )}
                  <Badge variant="outline" className="border-white/[0.06] text-white/30 text-[8px]">{mergedFeed.length}</Badge>
                </div>
              </div>
              <div className="max-h-[240px] overflow-y-auto custom-scrollbar">
                {mergedFeed.length === 0 && !loadingNews && (
                  <div className="flex flex-col items-center justify-center py-6">
                    <Newspaper className="h-8 w-8 text-white/10 mb-2" />
                    <p className="text-white/30 text-xs">{tf('inv.dashNoNews', 'No news available')}</p>
                  </div>
                )}
                <AnimatePresence mode="popLayout">
                  {mergedFeed.map((item, i) => {
                    const catConfig = CATEGORY_CONFIG[item.category || 'asset'] || CATEGORY_CONFIG.asset;
                    const isBullish = item.sentiment === 'bullish';
                    const isBearish = item.sentiment === 'bearish';
                    const sentimentColor = isBullish ? UP_COLOR : isBearish ? DOWN_COLOR : GOLD_COLOR;

                    const matchedImpact = newsImpacts.find((imp) =>
                      item.title.toLowerCase().includes(imp.symbol.toLowerCase()),
                    );
                    const decisionText = matchedImpact ? matchedImpact.action : (isBullish
                      ? 'Consider Buy'
                      : isBearish
                        ? 'Consider Sell'
                        : 'Hold & Monitor');
                    const decisionBg = matchedImpact
                      ? matchedImpact.action === 'BUY' ? 'rgba(3,218,198,0.2)' : matchedImpact.action === 'SELL' ? 'rgba(207,102,121,0.2)' : 'rgba(255,215,0,0.15)'
                      : isBullish ? 'rgba(3,218,198,0.15)' : isBearish ? 'rgba(207,102,121,0.15)' : 'rgba(255,215,0,0.15)';
                    const isPortfolioAsset = portfolioAssetKeys.has(
                      item.title.split(' ').find((w) => w.length > 2)?.toUpperCase() || '',
                    );

                    return (
                      <motion.div
                        key={item.url || i}
                        variants={cardVariants}
                        custom={i}
                        layout
                        initial="hidden"
                        animate="visible"
                      >
                        <div className="flex items-start gap-2 px-2 py-2.5 transition-colors border-b border-white/[0.03] last:border-0 hover:bg-white/[0.02] group">
                          <div className="mt-0.5 shrink-0" style={{ color: sentimentColor }}>
                            {isBullish ? <TrendingUp className="h-3 w-3" /> : isBearish ? <TrendingDown className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1 mb-0.5 flex-wrap">
                              <Badge className="text-[6px] px-1 py-0 h-2.5 font-medium border-0 shrink-0" style={{ backgroundColor: catConfig.bg, color: catConfig.text }}>
                                {catConfig.label}
                              </Badge>
                              <Badge className="text-[7px] px-1 py-0 h-3 font-bold border-0 shrink-0" style={{ backgroundColor: decisionBg, color: matchedImpact ? (decisionText === 'BUY' ? UP_COLOR : decisionText === 'SELL' ? DOWN_COLOR : GOLD_COLOR) : sentimentColor }}>
                                {decisionText}
                              </Badge>
                              {matchedImpact && (
                                <Badge className="text-[6px] px-1 py-0 h-2.5 font-bold border-0 shrink-0" style={{ backgroundColor: 'rgba(187,134,252,0.15)', color: PURPLE_COLOR }}>
                                  {matchedImpact.confidence}%
                                </Badge>
                              )}
                            </div>
                            <h4 className="text-[11px] text-white/60 font-medium leading-snug line-clamp-2">{item.title}</h4>
                          </div>
                          {item.url && (
                            <a href={item.url} target="_blank" rel="noopener noreferrer" className="shrink-0 p-1 rounded text-white/10 hover:text-white/50 hover:bg-white/[0.06] transition-all opacity-0 group-hover:opacity-100" onClick={(e) => e.stopPropagation()}>
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
                {/* AI News Impact Summary */}
                {newsImpacts.length > 0 && (
                  <div className="mt-1.5 px-2 py-2 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                    <div className="flex items-center gap-1 mb-1.5">
                      <Brain className="h-3 w-3 text-[#BB86FC]" />
                      <span className="text-[9px] text-white/50 font-bold uppercase tracking-wider">AI Impact</span>
                    </div>
                    <div className="space-y-1">
                      {newsImpacts.slice(0, 3).map((imp, idx) => {
                        const impColor = imp.action === 'BUY' ? UP_COLOR : imp.action === 'SELL' ? DOWN_COLOR : GOLD_COLOR;
                        return (
                          <div key={idx} className="flex items-center justify-between text-[9px]">
                            <div className="flex items-center gap-1 min-w-0">
                              <span className="font-bold text-white/60 font-mono">{imp.symbol}</span>
                              <span className="text-white/20 truncate">{imp.reasoning}</span>
                            </div>
                            <div className="flex items-center gap-1 shrink-0 ml-2">
                              <span className="text-white/25 font-mono">{imp.confidence}%</span>
                              <Badge className="text-[7px] px-1 py-0 h-3 font-bold border-0" style={{ backgroundColor: `${impColor}18`, color: impColor }}>
                                {imp.action}
                              </Badge>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ── SMART MONEY SIGNALS ── */}
      {activeChartAsset && activeChartSignal && (() => {
        const signal = activeChartSignal;
        const ai = signal.aiAnalysis;
        const smc = signal.smc;
        const newsConf = signal.newsConfirmation;
        const signalDetails = signal.signalDetails;

        const strength = signal.signalStrength ?? 0;
        const signalColor = getSignalColor(strength);
        const signalLabel = getSignalLabel(signal.overallSignal, strength);

        return (
          <motion.div variants={cardVariants} custom={8}>
            <Card className="bg-white/[0.03] border-white/[0.05]">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Zap className="h-4 w-4 text-[#FFD700]/60" />
                    <span className="text-[10px] text-white/40 uppercase tracking-wider font-bold">
                      Smart Money Signals — {activeChartAsset.symbol}
                    </span>
                    {activeChartSignal.dataQuality?.isMock && (
                      <Badge className="text-[8px] px-1.5 py-0 h-3 border-0" style={{
                        backgroundColor: 'rgba(255,215,0,0.15)',
                        color: '#FFD700',
                      }}>
                        ⚠ Limited Data
                      </Badge>
                    )}
                    {loadingSignals && <RefreshCw className="h-3 w-3 text-white/20 animate-spin" />}
                  </div>
                  <Badge className="text-[10px] px-2.5 py-0 h-5 font-bold border-0" style={{ backgroundColor: `${signalColor}18`, color: signalColor }}>
                    {signalLabel} {strength > 0 ? '+' : ''}{strength}
                  </Badge>
                </div>

                {/* Compact Market Data Bar */}
                {signal.marketDetail && (() => {
                  const md = signal.marketDetail;
                  return (
                    <div className="flex items-center gap-3 mb-3 pb-3 border-b border-white/[0.06] overflow-x-auto">
                      {md.marketCapRank != null && (
                        <div className="flex items-center gap-1 shrink-0">
                          <Trophy className="h-3 w-3 text-[#FFD700]/50" />
                          <span className="text-[10px] text-white/30 font-mono">#{md.marketCapRank}</span>
                        </div>
                      )}
                      {md.marketCap != null && (
                        <div className="shrink-0">
                          <span className="text-[8px] text-white/20 uppercase">MCap</span>
                          <span className="text-[10px] font-mono text-white/50 ml-1">{formatLargeNumber(md.marketCap)}</span>
                        </div>
                      )}
                      {md.totalVolume != null && (
                        <div className="shrink-0">
                          <span className="text-[8px] text-white/20 uppercase">Vol</span>
                          <span className="text-[10px] font-mono text-white/50 ml-1">{formatLargeNumber(md.totalVolume)}</span>
                        </div>
                      )}
                      {md.high24h != null && md.low24h != null && (
                        <div className="shrink-0">
                          <span className="text-[8px] text-white/20 uppercase">24h</span>
                          <span className="text-[10px] font-mono text-white/50 ml-1">
                            ${md.low24h < 1 ? md.low24h.toFixed(6) : md.low24h.toLocaleString(undefined, {maximumFractionDigits: 2})}
                            <span className="text-white/15">—</span>
                            ${md.high24h < 1 ? md.high24h.toFixed(6) : md.high24h.toLocaleString(undefined, {maximumFractionDigits: 2})}
                          </span>
                        </div>
                      )}
                      {md.priceChangePercentage7d != null && (
                        <div className="shrink-0">
                          <span className="text-[8px] text-white/20 uppercase">7d</span>
                          <span className={cn('text-[10px] font-mono font-bold ml-1', md.priceChangePercentage7d >= 0 ? 'text-[#03DAC6]' : 'text-[#CF6679]')}>
                            {md.priceChangePercentage7d >= 0 ? '+' : ''}{md.priceChangePercentage7d.toFixed(2)}%
                          </span>
                        </div>
                      )}
                      {md.priceChangePercentage30d != null && (
                        <div className="shrink-0">
                          <span className="text-[8px] text-white/20 uppercase">30d</span>
                          <span className={cn('text-[10px] font-mono font-bold ml-1', md.priceChangePercentage30d >= 0 ? 'text-[#03DAC6]' : 'text-[#CF6679]')}>
                            {md.priceChangePercentage30d >= 0 ? '+' : ''}{md.priceChangePercentage30d.toFixed(2)}%
                          </span>
                        </div>
                      )}
                      <Badge className="text-[7px] px-1 py-0 h-3 font-mono border-0 shrink-0 ml-auto" style={{
                        backgroundColor: 'rgba(3,218,198,0.1)',
                        color: '#03DAC6',
                      }}>
                        {md.source}
                      </Badge>
                    </div>
                  );
                })()}

                {/* ── BUY / SELL Signal Card — always visible ── */}
                <div className={cn(
                  'rounded-xl p-4 mb-4 border relative overflow-hidden',
                  signal.overallSignal === 'buy'
                    ? 'bg-gradient-to-r from-[#03DAC6]/[0.08] to-transparent border-[#03DAC6]/20'
                    : signal.overallSignal === 'sell'
                      ? 'bg-gradient-to-r from-[#CF6679]/[0.08] to-transparent border-[#CF6679]/20'
                      : 'bg-gradient-to-r from-[#FFD700]/[0.06] to-transparent border-[#FFD700]/15',
                )}>
                  {/* Background glow */}
                  <div className={cn(
                    'absolute top-0 right-0 w-40 h-40 rounded-full blur-3xl opacity-30 pointer-events-none',
                    signal.overallSignal === 'buy' ? 'bg-[#03DAC6]/20' : signal.overallSignal === 'sell' ? 'bg-[#CF6679]/20' : 'bg-[#FFD700]/15',
                  )} />

                  <div className="relative flex flex-col sm:flex-row sm:items-center gap-4">
                    {/* Main Signal */}
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        'grid place-items-center w-14 h-14 rounded-2xl shrink-0 border',
                        signal.overallSignal === 'buy'
                          ? 'bg-[#03DAC6]/15 border-[#03DAC6]/25'
                          : signal.overallSignal === 'sell'
                            ? 'bg-[#CF6679]/15 border-[#CF6679]/25'
                            : 'bg-[#FFD700]/15 border-[#FFD700]/20',
                      )}>
                        {signal.overallSignal === 'buy' ? (
                          <TrendingUp className="h-7 w-7 text-[#03DAC6]" />
                        ) : signal.overallSignal === 'sell' ? (
                          <TrendingDown className="h-7 w-7 text-[#CF6679]" />
                        ) : (
                          <Minus className="h-7 w-7 text-[#FFD700]" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className={cn(
                            'text-lg font-black uppercase tracking-wider',
                            signal.overallSignal === 'buy' ? 'text-[#03DAC6]' : signal.overallSignal === 'sell' ? 'text-[#CF6679]' : 'text-[#FFD700]',
                          )}>
                            {signal.overallSignal === 'buy' ? 'BELI' : signal.overallSignal === 'sell' ? 'JUAL' : 'HOLD'}
                          </span>
                          {/* Trade Direction Badge — always visible */}
                          {ai?.tradeDirection && ai.tradeDirection !== 'NONE' && (
                            <Badge className="text-[9px] px-2 py-0 h-4 font-black border-0" style={{
                              backgroundColor: ai.tradeDirection === 'SHORT' ? 'rgba(207,102,121,0.25)' : 'rgba(3,218,198,0.25)',
                              color: ai.tradeDirection === 'SHORT' ? '#CF6679' : '#03DAC6',
                            }}>
                              {ai.tradeDirection === 'SHORT' ? '⬇ SHORT' : '⬆ LONG'}
                            </Badge>
                          )}
                          {strength > 50 && (
                            <Badge className="text-[8px] px-1.5 py-0 h-3.5 font-black border-0" style={{
                              backgroundColor: signal.overallSignal === 'buy' ? 'rgba(3,218,198,0.25)' : 'rgba(207,102,121,0.25)',
                              color: signal.overallSignal === 'buy' ? '#03DAC6' : '#CF6679',
                            }}>
                              STRONG
                            </Badge>
                          )}
                          {ai?.riskRewardRatio && ai.riskRewardRatio > 0 && (
                            <Badge className="text-[8px] px-1.5 py-0 h-3.5 font-black border-0" style={{
                              backgroundColor: 'rgba(255,215,0,0.15)',
                              color: '#FFD700',
                            }}>
                              R:R {ai.riskRewardRatio}
                            </Badge>
                          )}
                        </div>
                        {ai ? (
                          <p className="text-[11px] text-white/40">{ai.strategy}</p>
                        ) : (
                          <p className="text-[11px] text-white/25 italic">AI Analysis loading...</p>
                        )}
                      </div>
                    </div>

                    {/* Confidence Meter — only if AI data available */}
                    {ai ? (
                      <div className="flex-1 sm:ml-auto">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[9px] text-white/30 uppercase tracking-wider font-bold">Confidence</span>
                          <span className={cn(
                            'text-sm font-black font-mono',
                            ai.confidence >= 70 ? 'text-[#03DAC6]' : ai.confidence >= 40 ? 'text-[#FFD700]' : 'text-[#CF6679]',
                          )}>
                            {ai.confidence}%
                          </span>
                        </div>
                        <div className="h-2.5 rounded-full bg-white/[0.06] overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-700"
                            style={{
                              width: `${ai.confidence}%`,
                              backgroundColor: ai.confidence >= 70 ? '#03DAC6' : ai.confidence >= 40 ? '#FFD700' : '#CF6679',
                              boxShadow: `0 0 8px ${ai.confidence >= 70 ? 'rgba(3,218,198,0.5)' : ai.confidence >= 40 ? 'rgba(255,215,0,0.4)' : 'rgba(207,102,121,0.4)'}`,
                            }}
                          />
                        </div>
                        <div className="flex justify-between mt-1">
                          <span className="text-[8px] text-white/15">Low</span>
                          <span className="text-[8px] text-white/15">Medium</span>
                          <span className="text-[8px] text-white/15">High</span>
                        </div>
                      </div>
                    ) : (
                      <div className="flex-1 sm:ml-auto space-y-2">
                        <Skeleton className="h-3 w-20 bg-white/[0.06]" />
                        <Skeleton className="h-2.5 w-full rounded-full bg-white/[0.06]" />
                        <Skeleton className="h-2 w-full rounded-full bg-white/[0.06]" />
                      </div>
                    )}
                  </div>

                  {/* Trade Direction Banner — clear BUY/SELL indicator */}
                  {ai?.tradeDirection && ai.tradeDirection !== 'NONE' && (
                    <div className={cn(
                      'flex items-center justify-center gap-2 rounded-lg py-2 px-3 mb-3 border',
                      ai.tradeDirection === 'SHORT'
                        ? 'bg-[#CF6679]/[0.08] border-[#CF6679]/15'
                        : 'bg-[#03DAC6]/[0.08] border-[#03DAC6]/15',
                    )}>
                      {ai.tradeDirection === 'SHORT' ? (
                        <ArrowDownRight className="h-4 w-4 text-[#CF6679]" />
                      ) : (
                        <ArrowUpRight className="h-4 w-4 text-[#03DAC6]" />
                      )}
                      <span className={cn(
                        'text-xs font-black uppercase tracking-widest',
                        ai.tradeDirection === 'SHORT' ? 'text-[#CF6679]' : 'text-[#03DAC6]',
                      )}>
                        {ai.tradeDirection === 'SHORT' ? 'SELL / SHORT' : 'BUY / LONG'}
                      </span>
                      <span className="text-[10px] text-white/25 ml-2">
                        SL {ai.tradeDirection === 'SHORT' ? '↑' : '↓'}  •  TP {ai.tradeDirection === 'SHORT' ? '↓' : '↑'}
                      </span>
                    </div>
                  )}

                  {/* Entry / SL / TP Zones — only if AI data available */}
                  {ai ? (
                    <div className="relative grid grid-cols-3 gap-3 mt-4 pt-3 border-t border-white/[0.06]">
                      {/* Entry Zone */}
                      <div className={cn(
                        "rounded-lg bg-white/[0.03] border p-2.5 text-center",
                        ai?.tradeDirection === 'SHORT' ? 'border-[#CF6679]/15' : ai?.tradeDirection === 'LONG' ? 'border-[#03DAC6]/15' : 'border-white/[0.06]',
                      )}>
                        <div className="flex items-center justify-center gap-1 mb-1">
                          <div className={cn('h-2 w-2 rounded-full', ai?.tradeDirection === 'SHORT' ? 'bg-[#CF6679]' : ai?.tradeDirection === 'LONG' ? 'bg-[#03DAC6]' : 'bg-white/20')} />
                          <span className="text-[8px] text-white/30 uppercase tracking-wider font-bold">
                            {ai?.tradeDirection === 'SHORT' ? 'Entry (SELL)' : ai?.tradeDirection === 'LONG' ? 'Entry (BUY)' : 'Entry'}
                          </span>
                        </div>
                        <p className="text-[11px] font-mono font-bold text-white/70 truncate">{ai.entryZone}</p>
                        <div className="mt-1.5">
                          <div className="h-1 rounded-full bg-white/[0.06] overflow-hidden">
                            <div className="h-full rounded-full bg-[#03DAC6]/70 transition-all" style={{ width: `${Math.min(ai.confidence + 10, 100)}%` }} />
                          </div>
                          <span className="text-[8px] font-mono text-[#03DAC6]/60 mt-0.5 block">{Math.min(ai.confidence + 10, 100)}%</span>
                        </div>
                      </div>

                      {/* Stop Loss */}
                      <div className="rounded-lg bg-white/[0.03] border border-[#CF6679]/15 p-2.5 text-center">
                        <div className="flex items-center justify-center gap-1 mb-1">
                          <div className="h-2 w-2 rounded-full bg-[#CF6679]" />
                          <span className="text-[8px] text-white/30 uppercase tracking-wider font-bold">Stop Loss</span>
                        </div>
                        <p className="text-[11px] font-mono font-bold text-[#CF6679]/70 truncate">{ai.stopLossZone}</p>
                        <div className="mt-1.5">
                          <div className="h-1 rounded-full bg-white/[0.06] overflow-hidden">
                            <div className="h-full rounded-full bg-[#CF6679]/70 transition-all" style={{ width: `${Math.max(100 - ai.confidence, 30)}%` }} />
                          </div>
                          <span className="text-[8px] font-mono text-[#CF6679]/60 mt-0.5 block">Risk Zone</span>
                        </div>
                      </div>

                      {/* Take Profit */}
                      <div className="rounded-lg bg-white/[0.03] border border-[#FFD700]/15 p-2.5 text-center">
                        <div className="flex items-center justify-center gap-1 mb-1">
                          <div className="h-2 w-2 rounded-full bg-[#FFD700]" />
                          <span className="text-[8px] text-white/30 uppercase tracking-wider font-bold">Take Profit</span>
                        </div>
                        <p className="text-[11px] font-mono font-bold text-[#FFD700]/70 truncate">{ai.takeProfitZone}</p>
                        <div className="mt-1.5">
                          <div className="h-1 rounded-full bg-white/[0.06] overflow-hidden">
                            <div className="h-full rounded-full bg-[#FFD700]/70 transition-all" style={{ width: `${Math.min(ai.confidence - 5, 100)}%` }} />
                          </div>
                          <span className="text-[8px] font-mono text-[#FFD700]/60 mt-0.5 block">{Math.min(ai.confidence - 5, 95)}%</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="relative grid grid-cols-3 gap-3 mt-4 pt-3 border-t border-white/[0.06]">
                      {['Entry', 'Stop Loss', 'Take Profit'].map((label) => (
                        <div key={label} className="rounded-lg bg-white/[0.03] border border-white/[0.04] p-2.5 text-center space-y-1.5">
                          <Skeleton className="h-2 w-12 mx-auto bg-white/[0.06]" />
                          <Skeleton className="h-3 w-16 mx-auto bg-white/[0.06]" />
                          <Skeleton className="h-1 w-full mx-auto rounded-full bg-white/[0.06]" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {/* Column 1: AI Analysis */}
                  <div className="rounded-lg bg-white/[0.02] border border-white/[0.04] p-3 space-y-2.5">
                    <div className="flex items-center gap-1.5">
                      <Brain className="h-3.5 w-3.5 text-[#BB86FC]" />
                      <span className="text-[9px] text-white/30 uppercase tracking-wider font-bold">AI Analysis</span>
                    </div>
                    {ai ? (
                      <>
                        <p className="text-[10px] text-white/45 leading-relaxed">{ai.reasoning}</p>
                        <div className="space-y-1.5 pt-1">
                          <div className="flex items-center justify-between">
                            <span className="text-[9px] text-white/25">Strategy</span>
                            <span className="text-[10px] text-white/60 font-medium">{ai.strategy}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-[9px] text-white/25">Confidence</span>
                            <div className="flex items-center gap-1.5">
                              <div className="w-12 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                                <div className="h-full rounded-full bg-[#BB86FC]" style={{ width: `${ai.confidence}%` }} />
                              </div>
                              <span className="text-[10px] font-mono font-bold text-[#BB86FC]">{ai.confidence}%</span>
                            </div>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-[9px] text-white/25">Risk</span>
                            <Badge className="text-[8px] px-1.5 py-0 h-3.5 font-bold border-0" style={{
                              backgroundColor: ai.riskLevel === 'LOW' ? 'rgba(3,218,198,0.15)' : ai.riskLevel === 'HIGH' ? 'rgba(207,102,121,0.15)' : 'rgba(255,215,0,0.15)',
                              color: ai.riskLevel === 'LOW' ? UP_COLOR : ai.riskLevel === 'HIGH' ? DOWN_COLOR : GOLD_COLOR,
                            }}>
                              {ai.riskLevel}
                            </Badge>
                          </div>
                        </div>
                      </>
                    ) : (
                      <p className="text-[10px] text-white/25 italic">AI analysis not available</p>
                    )}
                  </div>

                  {/* Column 2: SMC Concepts */}
                  <div className="rounded-lg bg-white/[0.02] border border-white/[0.04] p-3 space-y-2.5">
                    <div className="flex items-center gap-1.5">
                      <Layers className="h-3.5 w-3.5 text-[#03DAC6]" />
                      <span className="text-[9px] text-white/30 uppercase tracking-wider font-bold">SMC Concepts</span>
                    </div>
                    {smc ? (
                      <div className="space-y-1.5">
                        {/* Trend Structure */}
                        <div className="flex items-center justify-between">
                          <span className="text-[9px] text-white/25">Trend</span>
                          <Badge className="text-[8px] px-1.5 py-0 h-3.5 font-bold border-0" style={{
                            backgroundColor: smc.trendStructure === 'bullish' ? 'rgba(3,218,198,0.15)' : smc.trendStructure === 'bearish' ? 'rgba(207,102,121,0.15)' : 'rgba(255,215,0,0.15)',
                            color: smc.trendStructure === 'bullish' ? UP_COLOR : smc.trendStructure === 'bearish' ? DOWN_COLOR : GOLD_COLOR,
                          }}>
                            {smc.trendStructure.toUpperCase()}
                          </Badge>
                        </div>
                        {/* Premium/Discount */}
                        <div className="flex items-center justify-between">
                          <span className="text-[9px] text-white/25">Zone</span>
                          <span className={cn('text-[10px] font-mono font-bold', smc.premiumDiscount === 'discount' ? 'text-[#03DAC6]' : smc.premiumDiscount === 'premium' ? 'text-[#CF6679]' : 'text-white/50')}>
                            {smc.premiumDiscount.charAt(0).toUpperCase() + smc.premiumDiscount.slice(1)}
                          </span>
                        </div>
                        {/* FVG */}
                        {smc.fairValueGaps && (
                          <div className="flex items-start gap-1.5 pt-1">
                            <span className="text-[9px] text-white/25 shrink-0 w-8">FVG</span>
                            <div className="min-w-0">
                              <p className={cn('text-[9px] leading-relaxed', smc.fairValueGaps.filled ? 'text-white/25' : 'text-white/50')}>
                                {smc.fairValueGaps.description}
                              </p>
                              <Badge className="text-[7px] px-1 py-0 h-3 font-bold border-0 mt-0.5" style={{
                                backgroundColor: smc.fairValueGaps.filled ? 'rgba(255,255,255,0.05)' : 'rgba(3,218,198,0.12)',
                                color: smc.fairValueGaps.filled ? 'text-white/25' : UP_COLOR,
                              }}>
                                {smc.fairValueGaps.filled ? 'FILLED' : 'UNFILLED'}
                              </Badge>
                            </div>
                          </div>
                        )}
                        {/* Order Block */}
                        {smc.orderBlock && (
                          <div className="flex items-start gap-1.5">
                            <span className="text-[9px] text-white/25 shrink-0 w-8">OB</span>
                            <div className="min-w-0">
                              <p className="text-[9px] text-white/45 leading-relaxed">{smc.orderBlock.description}</p>
                              {smc.orderBlock.zone && (
                                <span className="text-[8px] text-white/20 font-mono">
                                  {fmtPrice(activeChartAsset.type, smc.orderBlock.zone.low)} — {fmtPrice(activeChartAsset.type, smc.orderBlock.zone.high)}
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                        {/* Liquidity Sweep */}
                        {smc.liquiditySweep && smc.liquiditySweep.swept && (
                          <div className="flex items-start gap-1.5">
                            <span className="text-[9px] text-white/25 shrink-0 w-8">Sweep</span>
                            <div className="min-w-0">
                              <p className="text-[9px] text-[#FFD700]/70 leading-relaxed">{smc.liquiditySweep.description}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-[10px] text-white/25 italic">SMC data not available</p>
                    )}

                    {/* Signal Details */}
                    {signalDetails && signalDetails.length > 0 && (
                      <div className="border-t border-white/[0.04] pt-2 mt-1 space-y-1 max-h-[100px] overflow-y-auto custom-scrollbar">
                        <span className="text-[8px] text-white/25 uppercase tracking-wider">Indicator Breakdown</span>
                        {signalDetails.slice(0, 5).map((sd, idx) => (
                          <div key={idx} className="flex items-center justify-between">
                            <div className="flex items-center gap-1">
                              <div className="h-1.5 w-1.5 rounded-full" style={{
                                backgroundColor: sd.signal === 'BULLISH' ? UP_COLOR : sd.signal === 'BEARISH' ? DOWN_COLOR : GOLD_COLOR,
                              }} />
                              <span className="text-[9px] text-white/30">{sd.indicator}</span>
                            </div>
                            <span className="text-[8px] text-white/20 font-mono">{sd.weight}%</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Column 3: Trade Zones + News Confirmation */}
                  <div className="space-y-3">
                    {/* Trade Zones */}
                    {ai && (
                      <div className="rounded-lg bg-white/[0.02] border border-white/[0.04] p-3 space-y-2">
                        <div className="flex items-center gap-1.5">
                          <Target className="h-3.5 w-3.5 text-[#FFD700]" />
                          <span className="text-[9px] text-white/30 uppercase tracking-wider font-bold">Trade Zones</span>
                        </div>
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2">
                            <div className={cn('h-2 w-2 rounded-full shrink-0', ai.tradeDirection === 'SHORT' ? 'bg-[#CF6679]' : 'bg-[#03DAC6]')} />
                            <span className="text-[9px] text-white/25 w-14 shrink-0">{ai.tradeDirection === 'SHORT' ? 'Entry (SELL)' : ai.tradeDirection === 'LONG' ? 'Entry (BUY)' : 'Entry'}</span>
                            <span className="text-[10px] text-white/50 font-mono truncate">{ai.entryZone}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-2 rounded-full bg-[#CF6679] shrink-0" />
                            <span className="text-[9px] text-white/25 w-14 shrink-0">Stop Loss</span>
                            <span className="text-[10px] text-[#CF6679]/70 font-mono truncate">{ai.stopLossZone}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-2 rounded-full bg-[#FFD700] shrink-0" />
                            <span className="text-[9px] text-white/25 w-14 shrink-0">TP</span>
                            <span className="text-[10px] text-[#FFD700]/70 font-mono truncate">{ai.takeProfitZone}</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* News Confirmation */}
                    {newsConf && (
                      <div className="rounded-lg bg-white/[0.02] border border-white/[0.04] p-3 space-y-2">
                        <div className="flex items-center gap-1.5">
                          <Newspaper className="h-3.5 w-3.5 text-white/30" />
                          <span className="text-[9px] text-white/30 uppercase tracking-wider font-bold">News Confirmation</span>
                          {newsConf.confirmed ? (
                            <CheckCircle2 className="h-3 w-3 text-[#03DAC6] ml-auto" />
                          ) : (
                            <AlertTriangle className="h-3 w-3 text-white/20 ml-auto" />
                          )}
                        </div>
                        <Badge className="text-[8px] px-1.5 py-0 h-3.5 font-bold border-0" style={{
                          backgroundColor: newsConf.sentiment === 'bullish' ? 'rgba(3,218,198,0.15)' : newsConf.sentiment === 'bearish' ? 'rgba(207,102,121,0.15)' : 'rgba(255,215,0,0.15)',
                          color: newsConf.sentiment === 'bullish' ? UP_COLOR : newsConf.sentiment === 'bearish' ? DOWN_COLOR : GOLD_COLOR,
                        }}>
                          {newsConf.sentiment?.toUpperCase() || 'NEUTRAL'}
                        </Badge>
                        {newsConf.recentEvents && newsConf.recentEvents.length > 0 && (
                          <div className="space-y-1 mt-1">
                            {newsConf.recentEvents.slice(0, 2).map((event, idx) => (
                              <p key={idx} className="text-[9px] text-white/25 leading-relaxed line-clamp-2">• {event}</p>
                            ))}
                          </div>
                        )}
                        <p className="text-[8px] text-white/15 italic">{newsConf.source}</p>
                      </div>
                    )}
                  </div>
                </div>
                {/* Multi-Layer Confluence Breakdown */}
                {signal.layerScores && Object.keys(signal.layerScores).length > 0 && (() => {
                  const layers = Object.entries(signal.layerScores!);
                  const bullishCount = layers.filter(([, l]) => l.signal.toLowerCase() === 'buy' || l.signal.toLowerCase() === 'bullish').length;
                  const totalLayers = layers.length;
                  return (
                    <div className="mt-3 pt-3 border-t border-white/[0.04]">
                      <div className="flex items-center gap-1.5 mb-2">
                        <Layers className="h-3 w-3 text-white/25" />
                        <span className="text-[9px] text-white/30 uppercase tracking-wider font-bold">Layer Confluence</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                        {layers.map(([name, layer]) => {
                          const isBullish = layer.signal.toLowerCase() === 'buy' || layer.signal.toLowerCase() === 'bullish';
                          const isBearish = layer.signal.toLowerCase() === 'sell' || layer.signal.toLowerCase() === 'bearish';
                          const dotColor = isBullish ? '#03DAC6' : isBearish ? '#CF6679' : '#FFD700';
                          return (
                            <div key={name} className="flex items-center gap-1 px-1.5 py-0.5 rounded-md" style={{ backgroundColor: `${dotColor}12` }}>
                              <div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: dotColor }} />
                              <span className="text-[8px] font-bold capitalize" style={{ color: dotColor }}>{name}</span>
                            </div>
                          );
                        })}
                      </div>
                      <p className="text-[9px] text-white/25 font-mono">
                        <span style={{ color: bullishCount > totalLayers / 2 ? '#03DAC6' : bullishCount < totalLayers / 2 ? '#CF6679' : '#FFD700' }}>
                          {bullishCount}/{totalLayers}
                        </span>
                        {' '}layers {bullishCount > totalLayers / 2 ? 'bullish' : bullishCount < totalLayers / 2 ? 'bearish' : 'neutral'}
                        {signal.confluenceCount != null && (
                          <span className="ml-2 text-white/15">({signal.confluenceCount} confluence)</span>
                        )}
                      </p>
                    </div>
                  );
                })()}
                {/* Financial Disclaimer */}
                <p className="text-[9px] text-white/15 italic mt-2 text-center">
                  ⚠️ Sinyal ini bersifat informatif dan bukan rekomendasi investasi. Selalu lakukan riset mandiri.
                </p>
              </CardContent>
            </Card>
          </motion.div>
        );
      })()}

      {/* ── BACKTESTING ── */}
      <motion.div variants={cardVariants} custom={8.5}>
        <BacktestingPanel
          businessId={businessId}
          assets={backtestAssets}
        />
      </motion.div>

      {/* ── ALLOCATION + POSITIONS ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Simplified Allocation */}
        {allocationData.length > 0 && (
          <motion.div variants={cardVariants} custom={9}>
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
        <motion.div variants={cardVariants} custom={10} className={allocationData.length > 0 ? 'lg:col-span-2' : 'lg:col-span-3'}>
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
                <div className="flex items-center gap-1.5">
                  <Button
                    size="sm"
                    className="h-7 px-2.5 text-[10px] gap-1 bg-[#BB86FC]/10 text-[#BB86FC] hover:bg-[#BB86FC]/20 border border-[#BB86FC]/20"
                    onClick={openQuickAddPortfolio}
                  >
                    <Plus className="h-3 w-3" />
                    <span className="hidden sm:inline">{tf('inv.addPortfolio', 'Tambah Porto')}</span>
                  </Button>
                  <Button variant="ghost" size="sm" className="h-7 px-2 text-white/30 hover:text-white/60 hover:bg-white/[0.06]" onClick={() => fetchLivePrices(true)}>
                    <RefreshCw className="h-3 w-3 mr-1" />
                    <span className="text-[10px]">{countdown}s</span>
                  </Button>
                </div>
              </div>
              <div className="max-h-[420px] overflow-y-auto custom-scrollbar">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/[0.06]">
                      <th className="text-left text-[10px] text-white/30 uppercase tracking-wider pb-2 pr-2">{tf('inv.dashAsset', 'Asset')}</th>
                      <th className="text-right text-[10px] text-white/30 uppercase tracking-wider pb-2 pr-1">Entry</th>
                      <th className="text-right text-[10px] text-white/30 uppercase tracking-wider pb-2 pr-2">Harga</th>
                      <th className="text-right text-[10px] text-white/30 uppercase tracking-wider pb-2 pr-1 hidden md:table-cell">SL</th>
                      <th className="text-right text-[10px] text-white/30 uppercase tracking-wider pb-2 pr-1 hidden md:table-cell">TP</th>
                      <th className="text-right text-[10px] text-white/30 uppercase tracking-wider pb-2 pr-2">{tf('inv.dashQty', 'Qty')}</th>
                      <th className="text-right text-[10px] text-white/30 uppercase tracking-wider pb-2">{tf('inv.pnl', 'PnL')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPositions.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-white/20 text-xs">{tf('inv.dashNoPositions', 'No positions')}</td>
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
                                    {(p.type || 'crypto').toUpperCase()}
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
                            <td className="text-right py-2.5 pr-1">
                              <p className="text-white/40 text-[11px] font-mono">{fmtPrice(p.type, p.entryPrice)}</p>
                            </td>
                            <td className="text-right py-2.5 pr-2">
                              <p className="text-white/70 text-xs font-mono">{fmtPrice(p.type, p.currentPrice)}</p>
                              {live && p.status === 'open' && (
                                <p className={cn('text-[10px] font-mono', live.change24h >= 0 ? 'text-[#03DAC6]' : 'text-[#CF6679]')}>
                                  {live.change24h >= 0 ? '+' : ''}{toF(live.change24h)}%
                                </p>
                              )}
                            </td>
                            <td className="text-right py-2.5 pr-1 hidden md:table-cell">
                              <p className="text-[#CF6679]/60 text-[11px] font-mono">{p.stopLoss ? fmtPrice(p.type, p.stopLoss) : '-'}</p>
                            </td>
                            <td className="text-right py-2.5 pr-1 hidden md:table-cell">
                              <p className="text-[#03DAC6]/60 text-[11px] font-mono">{p.targetPrice ? fmtPrice(p.type, p.targetPrice) : '-'}</p>
                            </td>
                            <td className="text-right text-white/50 text-xs font-mono py-2.5 pr-2">{p.quantity}</td>
                            <td className="text-right py-2.5">
                              <div className="flex flex-col items-end gap-1">
                                <div className="flex items-center gap-0.5">
                                  {isUp ? <ArrowUpRight className="h-3 w-3 text-[#03DAC6] shrink-0" /> : <ArrowDownRight className="h-3 w-3 text-[#CF6679] shrink-0" />}
                                  <span className={cn('text-xs font-bold font-mono', isUp ? 'text-[#03DAC6]' : 'text-[#CF6679]')}>
                                    {isUp ? '+' : ''}{toF(p.unrealizedPnlPercentage)}%
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
                        {(type || 'crypto').toUpperCase()}
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

      {/* ── Quick Add Portfolio Sheet ── */}
      <Sheet open={showAddPortfolio} onOpenChange={setShowAddPortfolio}>
        <SheetContent side="right" className="w-[400px] max-w-[92vw] bg-[#0D0D0D] border-white/[0.06] text-white overflow-y-auto">
          <SheetHeader className="pt-8 pb-4">
            <SheetTitle className="text-white flex items-center gap-2">
              <Gem className="h-5 w-5 text-[#BB86FC]" />
              Tambah Posisi Portofolio
            </SheetTitle>
          </SheetHeader>

          <form onSubmit={handleQuickAddPortfolio} className="space-y-5 px-6 pb-8">
            {/* Asset Search */}
            <div className="space-y-2">
              <Label className="text-white/80 text-sm">Cari Aset *</Label>
              {businessId && (
                <AssetSearchInput
                  businessId={businessId}
                  value={addPortfolioSelected}
                  onSelect={(asset) => {
                    setAddPortfolioSelected(asset);
                    setAddPortfolioForm({
                      ...addPortfolioForm,
                      type: asset.type,
                      symbol: asset.symbol,
                      name: asset.name,
                      entryPrice: asset.currentPrice ? asset.currentPrice.toString() : '',
                    });
                  }}
                />
              )}
              <p className="text-[11px] text-white/30">Ketik kode aset — harga otomatis terisi</p>
            </div>

            {/* Live price card */}
            {addPortfolioSelected && addPortfolioSelected.currentPrice > 0 && (
              <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-[#03DAC6]/[0.06] border border-[#03DAC6]/15">
                <div className="flex items-center gap-2.5">
                  <div className="h-2 w-2 rounded-full bg-[#03DAC6] animate-pulse" />
                  <span className="text-[10px] text-[#03DAC6]/70 uppercase tracking-wider font-bold">Harga Pasar</span>
                </div>
                <span className="text-white font-bold font-mono text-sm">
                  {fmtPrice(addPortfolioForm.type, addPortfolioSelected.currentPrice)}
                </span>
              </div>
            )}

            {/* Entry Price */}
            <div className="space-y-2">
              <Label className="text-white/80 text-sm">Harga Masuk ({addPortfolioForm.type === 'saham' ? 'IDR' : 'USD'}) *</Label>
              <Input
                type="number"
                value={addPortfolioForm.entryPrice}
                onChange={(e) => setAddPortfolioForm({ ...addPortfolioForm, entryPrice: e.target.value })}
                placeholder={addPortfolioForm.type === 'saham' ? '9750' : '65000'}
                min="0"
                step="any"
                className="bg-white/[0.05] border-white/[0.1] text-white placeholder:text-white/20 text-lg font-mono h-12"
              />
              {addPortfolioSelected && addPortfolioSelected.currentPrice > 0 && parseFloat(addPortfolioForm.entryPrice) === addPortfolioSelected.currentPrice && (
                <p className="text-[10px] text-[#03DAC6]/60 flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" /> Mengikuti harga pasar
                </p>
              )}
            </div>

            {/* Quantity */}
            <div className="space-y-2">
              <Label className="text-white/80 text-sm">Jumlah Aset (unit) *</Label>
              <Input
                type="number"
                value={addPortfolioForm.quantity}
                onChange={(e) => setAddPortfolioForm({ ...addPortfolioForm, quantity: e.target.value })}
                placeholder="Contoh: 0.5 BTC, 100 BBCA, 1000 EUR"
                min="0"
                step="any"
                className="bg-white/[0.05] border-white/[0.1] text-white placeholder:text-white/20 text-lg font-mono h-12"
              />
              <p className="text-[11px] text-white/25">Jumlah unit aset yang kamu beli / pegang</p>
            </div>

            {/* Auto-calculated nominal */}
            {addPortfolioForm.entryPrice && addPortfolioForm.quantity && parseFloat(addPortfolioForm.entryPrice) > 0 && parseFloat(addPortfolioForm.quantity) > 0 && (() => {
              const nominal = parseFloat(addPortfolioForm.entryPrice) * parseFloat(addPortfolioForm.quantity);
              const isSaham = addPortfolioForm.type === 'saham';
              const nominalStr = isSaham
                ? 'Rp' + new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(nominal)
                : '$' + new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(nominal);
              const idrEstimate = !isSaham
                ? 'Rp' + new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(nominal * 15500)
                : null;
              return (
                <div className="rounded-xl bg-[#BB86FC]/[0.07] border border-[#BB86FC]/15 p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <Calculator className="h-4 w-4 text-[#BB86FC]/70" />
                    <span className="text-xs text-[#BB86FC]/70 uppercase tracking-wider font-bold">Total Investasi</span>
                  </div>
                  <p className="text-white font-bold font-mono text-xl">{nominalStr}</p>
                  {idrEstimate && (
                    <p className="text-[11px] text-white/30 flex items-center gap-1">
                      <CircleDollarSign className="h-3 w-3" />
                      ≈ {idrEstimate} (estimasi kurs ~15.500)
                    </p>
                  )}
                </div>
              );
            })()}

            {/* Notes */}
            <div className="space-y-2">
              <Label className="text-white/80 text-sm">Catatan (opsional)</Label>
              <Input
                value={addPortfolioForm.notes}
                onChange={(e) => setAddPortfolioForm({ ...addPortfolioForm, notes: e.target.value })}
                placeholder="Alasan beli, strategi, dll..."
                className="bg-white/[0.05] border-white/[0.1] text-white placeholder:text-white/20"
              />
            </div>

            <SheetFooter className="gap-2 pt-2 px-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowAddPortfolio(false)}
                className="border-white/[0.1] text-white hover:bg-white/10 flex-1"
              >
                Batal
              </Button>
              <Button
                type="submit"
                disabled={savingPortfolio || !addPortfolioForm.symbol || !addPortfolioForm.entryPrice || !addPortfolioForm.quantity}
                className="bg-[#BB86FC] text-black hover:bg-[#9B6FDB] flex-1 h-11"
              >
                {savingPortfolio ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4 mr-1.5" />
                )}
                Simpan Posisi
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>

      {/* ── Add Watchlist Dialog ── */}
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
              Cari aset untuk dipantau — crypto, saham, forex, komoditas, indeks
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
