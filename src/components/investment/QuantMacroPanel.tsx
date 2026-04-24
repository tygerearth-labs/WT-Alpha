'use client';

import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useBusinessStore } from '@/store/useBusinessStore';
import { useTranslation } from '@/hooks/useTranslation';
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
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import {
  Activity,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  BarChart3,
  Star,
  Globe,
  Zap,
  ArrowUpRight,
  ArrowDownRight,
  Eye,
  X,
  Gauge,
  Waves,
  Layers,
  GitBranch,
  Target,
  AlertTriangle,
  CheckCircle2,
  Minus,
  Coins,
  Flame,
  PieChart,
  Triangle,
  Square,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Brain,
  Newspaper,
  Crosshair,
  Clock,
  Trophy,
  Wallet,
  MinusCircle,
  ArrowLeftRight,
} from 'lucide-react';
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
  status: string;
  currentValue?: number;
  investedValue?: number;
  unrealizedPnl?: number;
  unrealizedPnlPercentage?: number;
}

interface WatchlistItem {
  id: string;
  symbol: string;
  type: string;
  name?: string;
  price?: number;
  change24h?: number;
}

interface TechnicalAnalysis {
  symbol: string;
  type: string;
  price: number;
  change24h: number;
  indicators: {
    rsi: { value: number; signal: string };
    macd: { value: number; signal: number; histogram: number; signalLabel?: string };
    bollingerBands: { upper: number; middle: number; lower: number; position?: string; signal?: string };
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
  overallSignal: 'buy' | 'sell' | 'neutral';
  signalStrength: number;
  signalDetails: Array<{ indicator: string; signal: string; weight: number; description?: string }>;
  lastUpdated: string;
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
}

interface TrendingAsset {
  symbol: string;
  price: string;
  change24h: number;
  type: string;
  label?: string;
}

interface MacroGlobal {
  totalMarketCap: number;
  totalVolume: number;
  btcDominance: number;
  ethDominance: number;
  activeCryptos: number;
  marketCapChange24h: number;
}

interface MacroData {
  global: MacroGlobal;
  trending: TrendingAsset[];
  topGainers: TrendingAsset[];
  topLosers: TrendingAsset[];
  fearAndGreed?: { value: number; label: string };
  fearGreedSource?: 'alternative.me' | 'proxy';
  timestamp: string;
}

// ── Design Tokens ────────────────────────────────────────────────────────────

const TYPE_COLORS: Record<string, { bg: string; text: string; hex: string }> = {
  saham: { bg: 'rgba(187,134,252,0.12)', text: '#BB86FC', hex: '#BB86FC' },
  crypto: { bg: 'rgba(3,218,198,0.12)', text: '#03DAC6', hex: '#03DAC6' },
  forex: { bg: 'rgba(207,102,121,0.12)', text: '#CF6679', hex: '#CF6679' },
  komoditas: { bg: 'rgba(255,215,0,0.12)', text: '#FFD700', hex: '#FFD700' },
  indeks: { bg: 'rgba(100,181,252,0.12)', text: '#64B5F6', hex: '#64B5F6' },
};

const STRONG_BUY_COLOR = '#03DAC6';
const BUY_COLOR = '#03DAC6';
const NEUTRAL_COLOR = '#FFD700';
const SELL_COLOR = '#CF6679';
const STRONG_SELL_COLOR = '#CF6679';
const UP_COLOR = '#03DAC6';
const DOWN_COLOR = '#CF6679';
const GOLD_COLOR = '#FFD54F';
const PURPLE_COLOR = '#BB86FC';

// ── Formatting Helpers ───────────────────────────────────────────────────────

function formatLargeNumber(num: number | undefined | null): string {
  const n = typeof num === 'number' && !isNaN(num) ? num : 0;
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(2)}K`;
  return `$${n.toFixed(2)}`;
}

function formatVolume(num: number | undefined | null): string {
  const n = typeof num === 'number' && !isNaN(num) ? num : 0;
  if (n >= 1e12) return `${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return n.toFixed(0);
}

const compactFmt = new Intl.NumberFormat('en-US', {
  notation: 'compact',
  compactDisplay: 'short',
  maximumFractionDigits: 2,
});

function formatMarketCap(value: number | undefined | null): string {
  const n = typeof value === 'number' && !isNaN(value) ? value : 0;
  return `$${compactFmt.format(n)}`;
}

function formatCompact(value: number | undefined | null): string {
  const n = typeof value === 'number' && !isNaN(value) ? value : 0;
  return compactFmt.format(n);
}

function toF(val: number | undefined | null, digits = 2): string {
  const n = typeof val === 'number' && !isNaN(val) ? val : 0;
  return n.toFixed(digits);
}

function getSignalColor(strength: number): string {
  if (strength > 50) return STRONG_BUY_COLOR;
  if (strength > 25) return 'rgba(3,218,198,0.7)';
  if (strength >= -25) return NEUTRAL_COLOR;
  if (strength >= -50) return 'rgba(207,102,121,0.7)';
  return STRONG_SELL_COLOR;
}

function getSignalLabel(signal: string, strength: number): string {
  if (signal === 'buy') return strength > 50 ? 'STRONG BUY' : 'BUY';
  if (signal === 'sell') return strength < -50 ? 'STRONG SELL' : 'SELL';
  return 'NEUTRAL';
}

function fmtPrice(type: string, val: number): string {
  const prefix = currencyPrefix(type as 'saham' | 'crypto' | 'forex');
  return `${prefix}${formatAssetPrice(val, type as 'saham' | 'crypto' | 'forex')}`;
}

function getRiskColor(risk: string): string {
  switch (risk?.toUpperCase()) {
    case 'LOW': return '#03DAC6';
    case 'MEDIUM': return '#FFD700';
    case 'HIGH': return '#FF7043';
    default: return '#888';
  }
}

function getTrendColor(trend: string): string {
  switch (trend?.toLowerCase()) {
    case 'bullish': return '#03DAC6';
    case 'bearish': return '#CF6679';
    default: return '#FFD700';
  }
}

function getTrendIcon(trend: string) {
  switch (trend?.toLowerCase()) {
    case 'bullish': return <TrendingUp className="h-3 w-3" />;
    case 'bearish': return <TrendingDown className="h-3 w-3" />;
    default: return <MinusCircle className="h-3 w-3" />;
  }
}

// ── Sentiment Helper (for Macro tab) ────────────────────────────────────────

interface SentimentInfo {
  label: string;
  color: string;
  bgColor: string;
  percentage: number;
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
  hidden: { opacity: 0, y: 12, scale: 0.97 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { delay: i * 0.06, duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] as const },
  }),
};

const macroCardVariants = {
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

const fadeIn = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.3 } },
};

const slideUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' as const } },
};

// ── Inline Sub-components ────────────────────────────────────────────────────

function RSIGauge({ value }: { value: number | undefined | null }) {
  const safe = typeof value === 'number' && !isNaN(value) ? value : 50;
  const pct = Math.min(100, Math.max(0, safe));
  const isOversold = pct < 30;
  const isOverbought = pct > 70;
  const zoneColor = isOversold ? '#CF6679' : isOverbought ? '#CF6679' : '#03DAC6';
  const label = isOversold ? 'Oversold' : isOverbought ? 'Overbought' : 'Neutral';

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-white/40 uppercase tracking-wider font-medium flex items-center gap-1">
          <Gauge className="h-3 w-3" />
          RSI
        </span>
        <span className="text-xs font-mono font-bold" style={{ color: zoneColor }}>{safe.toFixed(1)}</span>
      </div>
      <div className="relative h-3 rounded-full overflow-hidden bg-white/[0.06]">
        <div className="absolute inset-0 flex">
          <div className="w-[30%] bg-[#CF6679]/20" />
          <div className="w-[40%] bg-[#03DAC6]/10" />
          <div className="w-[30%] bg-[#CF6679]/20" />
        </div>
        <motion.div
          className="absolute top-0 bottom-0 w-1 rounded-full"
          style={{ backgroundColor: zoneColor, boxShadow: `0 0 6px ${zoneColor}80` }}
          initial={{ left: '0%' }}
          animate={{ left: `${pct}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' as const }}
        />
      </div>
      <div className="flex justify-between text-[9px] text-white/25 font-mono">
        <span>0</span><span className="text-[#CF6679]/50">30</span><span>50</span><span className="text-[#CF6679]/50">70</span><span>100</span>
      </div>
      <Badge className="text-[9px] px-1.5 py-0 h-4 font-medium border-0 self-start"
        style={{ backgroundColor: isOversold ? 'rgba(207,102,121,0.15)' : isOverbought ? 'rgba(207,102,121,0.15)' : 'rgba(3,218,198,0.15)', color: zoneColor }}>
        {label}
      </Badge>
    </div>
  );
}

function SignalBar({ strength }: { strength: number }) {
  const pct = ((strength + 100) / 200) * 100;
  const color = getSignalColor(strength);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-white/40 uppercase tracking-wider font-medium">Strength</span>
        <span className="text-xs font-mono font-bold" style={{ color }}>{strength > 0 ? '+' : ''}{strength}</span>
      </div>
      <div className="relative h-2.5 rounded-full overflow-hidden bg-white/[0.06]">
        <div className="absolute inset-0 flex">
          <div className="w-1/2 bg-gradient-to-r from-[#CF6679]/20 to-transparent" />
          <div className="w-1/2 bg-gradient-to-l from-[#03DAC6]/20 to-transparent" />
        </div>
        <div className="absolute top-0 bottom-0 left-1/2 w-px bg-white/20 -translate-x-1/2 z-10" />
        <motion.div
          className="absolute top-0 bottom-0 rounded-full"
          style={{ backgroundColor: color, boxShadow: `0 0 8px ${color}40` }}
          initial={{ width: '0%', left: '50%' }}
          animate={{ width: strength >= 0 ? `${Math.abs(pct - 50)}%` : `${Math.abs(50 - pct)}%`, left: strength >= 0 ? '50%' : `${pct}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' as const }}
        />
      </div>
      <div className="flex justify-between text-[9px] text-white/25 font-mono">
        <span className="text-[#CF6679]/60">-100</span><span>0</span><span className="text-[#03DAC6]/60">+100</span>
      </div>
    </div>
  );
}

function MACDHistogram({ macd, signal, histogram }: { macd: number | undefined | null; signal: number | undefined | null; histogram: number | undefined | null }) {
  const m = typeof macd === 'number' && !isNaN(macd) ? macd : 0;
  const s = typeof signal === 'number' && !isNaN(signal) ? signal : 0;
  const h = typeof histogram === 'number' && !isNaN(histogram) ? histogram : 0;
  const bars = useMemo(() => {
    const result: number[] = [];
    const absMax = Math.max(Math.abs(m), Math.abs(s), Math.abs(h), 0.01);
    for (let i = 0; i < 7; i++) {
      const seed = m * (i + 1) + s * (i + 2) + h * (i + 3);
      const val = ((Math.sin(seed) + Math.cos(h * i)) / 2) * absMax * 0.8;
      result.push(parseFloat(val.toFixed(6)));
    }
    return result;
  }, [m, s, h]);
  const maxAbs = Math.max(...bars.map(Math.abs), 0.01);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-white/40 uppercase tracking-wider font-medium flex items-center gap-1">
          <Waves className="h-3 w-3" /> MACD
        </span>
        <Badge className="text-[9px] px-1.5 py-0 h-4 font-medium border-0"
          style={{ backgroundColor: h >= 0 ? 'rgba(3,218,198,0.15)' : 'rgba(207,102,121,0.15)', color: h >= 0 ? '#03DAC6' : '#CF6679' }}>
          {h >= 0 ? 'Bullish' : 'Bearish'}
        </Badge>
      </div>
      <div className="flex items-end gap-1 h-12">
        {bars.map((bar, i) => {
          const height = Math.max(4, (Math.abs(bar) / maxAbs) * 40);
          return (
            <motion.div key={i} className="flex-1 rounded-sm"
              style={{ height: `${height}px`, backgroundColor: bar >= 0 ? '#03DAC6' : '#CF6679', opacity: 0.5 + (i / bars.length) * 0.5 }}
              initial={{ height: 0 }} animate={{ height: `${height}px` }} transition={{ delay: i * 0.05, duration: 0.3 }} />
          );
        })}
      </div>
      <div className="grid grid-cols-3 gap-2 text-[10px] font-mono">
        <div><span className="text-white/30">MACD </span><span style={{ color: m >= 0 ? '#03DAC6' : '#CF6679' }}>{m.toFixed(4)}</span></div>
        <div><span className="text-white/30">Signal </span><span className="text-white/60">{s.toFixed(4)}</span></div>
        <div><span className="text-white/30">Hist </span><span style={{ color: h >= 0 ? '#03DAC6' : '#CF6679' }}>{h.toFixed(4)}</span></div>
      </div>
    </div>
  );
}

function BollingerBandsInfo({ upper, middle, lower, price }: { upper: number | undefined | null; middle: number | undefined | null; lower: number | undefined | null; price: number | undefined | null }) {
  const u = typeof upper === 'number' && !isNaN(upper) ? upper : 0;
  const md = typeof middle === 'number' && !isNaN(middle) ? middle : 0;
  const lo = typeof lower === 'number' && !isNaN(lower) ? lower : 0;
  const pr = typeof price === 'number' && !isNaN(price) ? price : 0;
  const range = u - lo;
  const position = range > 0 ? ((pr - lo) / range) * 100 : 50;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-white/40 uppercase tracking-wider font-medium flex items-center gap-1">
          <Layers className="h-3 w-3" /> Bollinger Bands
        </span>
        <Badge className="text-[9px] px-1.5 py-0 h-4 font-medium border-0"
          style={{ backgroundColor: pr <= lo ? 'rgba(3,218,198,0.15)' : pr >= u ? 'rgba(207,102,121,0.15)' : 'rgba(255,215,0,0.15)', color: pr <= lo ? '#03DAC6' : pr >= u ? '#CF6679' : '#FFD700' }}>
          {pr <= lo ? 'Below Lower' : pr >= u ? 'Above Upper' : 'Within'}
        </Badge>
      </div>
      <div className="relative h-6 rounded bg-white/[0.04] overflow-hidden">
        <div className="absolute inset-x-0 top-0 bottom-0 bg-[#03DAC6]/5" />
        <motion.div className="absolute top-0 bottom-0 w-0.5"
          style={{ left: `${Math.min(100, Math.max(0, position))}%`, backgroundColor: pr <= lo ? '#03DAC6' : pr >= u ? '#CF6679' : '#FFD700', boxShadow: `0 0 6px ${pr <= lo ? '#03DAC680' : pr >= u ? '#CF667980' : '#FFD70080'}` }}
          initial={{ left: '50%' }} animate={{ left: `${Math.min(100, Math.max(0, position))}%` }} transition={{ duration: 0.6 }} />
      </div>
      <div className="grid grid-cols-3 gap-1 text-[10px] font-mono">
        <div className="text-right"><span className="text-white/25">Upper </span><span className="text-[#CF6679]/80">{formatCompact(u)}</span></div>
        <div className="text-center"><span className="text-white/25">Mid </span><span className="text-white/50">{formatCompact(md)}</span></div>
        <div><span className="text-white/25">Lower </span><span className="text-[#03DAC6]/80">{formatCompact(lo)}</span></div>
      </div>
    </div>
  );
}

function MovingAverageSection({ sma20, sma50, ema12, ema26 }: { sma20: number | undefined | null; sma50: number | undefined | null; ema12: number | undefined | null; ema26: number | undefined | null }) {
  const s20 = typeof sma20 === 'number' && !isNaN(sma20) ? sma20 : 0;
  const s50 = typeof sma50 === 'number' && !isNaN(sma50) ? sma50 : 0;
  const e12 = typeof ema12 === 'number' && !isNaN(ema12) ? ema12 : 0;
  const e26 = typeof ema26 === 'number' && !isNaN(ema26) ? ema26 : 0;
  const smaGoldenCross = s20 > s50;
  const emaGoldenCross = e12 > e26;

  return (
    <div className="space-y-2">
      <span className="text-[10px] text-white/40 uppercase tracking-wider font-medium flex items-center gap-1">
        <GitBranch className="h-3 w-3" /> Moving Averages
      </span>
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-lg bg-white/[0.03] p-2 space-y-1">
          <div className="flex items-center justify-between"><span className="text-[10px] text-white/40 font-mono">SMA 20</span><span className="text-[11px] font-mono text-white/70">{formatCompact(s20)}</span></div>
          <div className="flex items-center justify-between"><span className="text-[10px] text-white/40 font-mono">SMA 50</span><span className="text-[11px] font-mono text-white/70">{formatCompact(s50)}</span></div>
          <Badge className="text-[9px] px-1.5 py-0 h-4 font-medium border-0"
            style={{ backgroundColor: smaGoldenCross ? 'rgba(3,218,198,0.15)' : 'rgba(207,102,121,0.15)', color: smaGoldenCross ? '#03DAC6' : '#CF6679' }}>
            {smaGoldenCross ? 'Golden Cross ↑' : 'Death Cross ↓'}
          </Badge>
        </div>
        <div className="rounded-lg bg-white/[0.03] p-2 space-y-1">
          <div className="flex items-center justify-between"><span className="text-[10px] text-white/40 font-mono">EMA 12</span><span className="text-[11px] font-mono text-white/70">{formatCompact(e12)}</span></div>
          <div className="flex items-center justify-between"><span className="text-[10px] text-white/40 font-mono">EMA 26</span><span className="text-[11px] font-mono text-white/70">{formatCompact(e26)}</span></div>
          <Badge className="text-[9px] px-1.5 py-0 h-4 font-medium border-0"
            style={{ backgroundColor: emaGoldenCross ? 'rgba(3,218,198,0.15)' : 'rgba(207,102,121,0.15)', color: emaGoldenCross ? '#03DAC6' : '#CF6679' }}>
            {emaGoldenCross ? 'Bullish EMA ↑' : 'Bearish EMA ↓'}
          </Badge>
        </div>
      </div>
    </div>
  );
}

function DominanceBar({ value, color }: { value: number | undefined | null; color: string }) {
  const safeVal = typeof value === 'number' && !isNaN(value) ? value : 0;
  return (
    <div className="flex items-center gap-2 mt-1">
      <div className="h-1.5 w-full bg-white/[0.06] rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${Math.min(safeVal, 100).toFixed(1)}%`, backgroundColor: color }} />
      </div>
      <span className="text-[10px] text-white/25 font-mono shrink-0 w-9 text-right">{safeVal.toFixed(1)}%</span>
    </div>
  );
}

// ── SMC Status Indicators ────────────────────────────────────────────────────

function SMCStatusIcons({ smc }: { smc: TechnicalAnalysis['smc'] }) {
  if (!smc) return null;

  return (
    <div className="flex items-center gap-1.5">
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={cn(
            'flex items-center justify-center w-4 h-4 rounded-sm transition-colors',
            !smc.fairValueGaps.filled ? 'bg-[#03DAC6]/15 text-[#03DAC6]' : 'bg-white/[0.04] text-white/20'
          )}>
            <Triangle className="h-2.5 w-2.5" fill="currentColor" />
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="bg-[#1A1A2E] border-white/[0.06] text-white/60 text-[10px]">
          FVG: {!smc.fairValueGaps.filled ? 'Active' : 'Filled'}
        </TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <div className={cn(
            'flex items-center justify-center w-4 h-4 rounded-sm transition-colors',
            smc.orderBlock.type === 'bullish' ? 'bg-[#03DAC6]/15 text-[#03DAC6]' : smc.orderBlock.type === 'bearish' ? 'bg-[#CF6679]/15 text-[#CF6679]' : 'bg-white/[0.04] text-white/20'
          )}>
            <Square className="h-2.5 w-2.5" fill="currentColor" />
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="bg-[#1A1A2E] border-white/[0.06] text-white/60 text-[10px]">
          OB: {smc.orderBlock.type}
        </TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <div className={cn(
            'flex items-center justify-center w-4 h-4 rounded-sm transition-colors',
            smc.liquiditySweep.swept ? 'bg-[#FFD700]/15 text-[#FFD700]' : 'bg-white/[0.04] text-white/20'
          )}>
            <Zap className="h-2.5 w-2.5" />
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="bg-[#1A1A2E] border-white/[0.06] text-white/60 text-[10px]">
          Liq Sweep: {smc.liquiditySweep.swept ? 'Swept' : 'No'}
        </TooltipContent>
      </Tooltip>
    </div>
  );
}

// ── AI Confidence Bar ───────────────────────────────────────────────────────

function AIConfidenceBadge({ confidence }: { confidence: number }) {
  const color = confidence >= 70 ? '#03DAC6' : confidence >= 40 ? '#FFD700' : '#CF6679';

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="flex items-center gap-1.5">
          <Brain className="h-3 w-3" style={{ color }} />
          <div className="h-1.5 w-12 rounded-full bg-white/[0.06] overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              style={{ backgroundColor: color }}
              initial={{ width: '0%' }}
              animate={{ width: `${confidence}%` }}
              transition={{ duration: 0.6 }}
            />
          </div>
          <span className="text-[9px] font-mono font-bold" style={{ color }}>{confidence}%</span>
        </div>
      </TooltipTrigger>
      <TooltipContent side="top" className="bg-[#1A1A2E] border-white/[0.06] text-white/60 text-[10px]">
        AI Confidence: {confidence}%
      </TooltipContent>
    </Tooltip>
  );
}

// ── Trend Structure Badge ────────────────────────────────────────────────────

function TrendBadge({ trend }: { trend: string }) {
  const color = getTrendColor(trend);
  const icon = getTrendIcon(trend);

  return (
    <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-md" style={{ backgroundColor: `${color}12` }}>
      <span style={{ color }}>{icon}</span>
      <span className="text-[9px] font-bold uppercase" style={{ color }}>{trend}</span>
    </div>
  );
}

// ── Mini Sparkline Chart ────────────────────────────────────────────────────

function MiniSparkline({ data }: { data: number[] }) {
  if (!data || data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const width = 280;
  const height = 40;
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((v - min) / range) * height;
    return `${x},${y}`;
  }).join(' ');
  const isUp = data[data.length - 1] >= data[0];
  const color = isUp ? '#03DAC6' : '#CF6679';
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-10" preserveAspectRatio="none">
      <defs>
        <linearGradient id={`sparkGrad-${isUp ? 'up' : 'down'}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.15" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon
        points={`0,${height} ${points} ${width},${height}`}
        fill={`url(#sparkGrad-${isUp ? 'up' : 'down'})`}
      />
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ── Unified signal card item for portfolio + watchlist ───────────────────────

interface SignalGridItem {
  key: string;
  type: string;
  symbol: string;
  isWatchlist: boolean;
}

function SignalCard({
  item,
  signal,
  onSelect,
  onAddToWatchlist,
  index,
}: {
  item: SignalGridItem;
  signal: TechnicalAnalysis | undefined;
  onSelect: (signal: TechnicalAnalysis) => void;
  onAddToWatchlist: (item: SignalGridItem) => void;
  index: number;
}) {
  const tc = TYPE_COLORS[item.type] || TYPE_COLORS.crypto;
  const isUp = (signal?.change24h ?? 0) >= 0;
  const strength = signal?.signalStrength ?? 0;
  const signalColor = signal ? getSignalColor(strength) : '#666';
  const signalLabel = signal ? getSignalLabel(signal.overallSignal, strength) : 'LOADING';

  return (
    <motion.div
      key={item.key}
      custom={index}
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      layout
    >
      <Card
        className="bg-[#1A1A2E] border-white/[0.06] hover:border-white/[0.12] transition-all cursor-pointer group relative overflow-hidden"
        onClick={() => signal && onSelect(signal)}
      >
        {/* Glow effect */}
        <div
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
          style={{ background: `radial-gradient(ellipse at 50% 0%, ${signalColor}08 0%, transparent 70%)` }}
        />

        <CardContent className="p-4 relative">
          {/* Header row */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              {item.isWatchlist && (
                <div className="flex items-center justify-center w-5 h-5 rounded-md bg-[#BB86FC]/10 border border-[#BB86FC]/20">
                  <Eye className="h-3 w-3 text-[#BB86FC]" />
                </div>
              )}
              <span className="text-sm font-bold text-white/90 font-mono">{item.symbol}</span>
              <Badge className="text-[8px] px-1.5 py-0 h-4 font-medium border-0" style={{ backgroundColor: tc.bg, color: tc.text }}>
                {(item.type || 'crypto').toUpperCase()}
              </Badge>
            </div>
            <div className="flex items-center gap-1.5">
              {signal?.smc && <SMCStatusIcons smc={signal.smc} />}
              {!item.isWatchlist && (
                <button
                  className="p-1.5 rounded-md text-white/20 hover:text-[#FFD700] hover:bg-white/[0.06] transition-colors opacity-0 group-hover:opacity-100"
                  onClick={(e) => { e.stopPropagation(); onAddToWatchlist(item); }}
                >
                  <Star className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Price & change */}
          <div className="mb-3">
            {signal ? (
              <>
                <p className="text-lg font-bold text-white/95 font-mono">{fmtPrice(item.type, signal.price)}</p>
                <div className="flex items-center gap-1 mt-0.5">
                  {isUp ? <ArrowUpRight className="h-3 w-3 text-[#03DAC6]" /> : <ArrowDownRight className="h-3 w-3 text-[#CF6679]" />}
                  <span className={cn('text-xs font-mono font-medium', isUp ? 'text-[#03DAC6]' : 'text-[#CF6679]')}>
                    {isUp ? '+' : ''}{toF(signal.change24h)}%
                  </span>
                </div>
              </>
            ) : (
              <Skeleton className="h-7 w-28 rounded bg-white/[0.06]" />
            )}
          </div>

          {/* Signal badge & strength */}
          <div className="flex items-center justify-between mb-2">
            <Badge className="text-[10px] px-2 py-0.5 h-5 font-bold border-0"
              style={{ backgroundColor: `${signalColor}18`, color: signalColor, boxShadow: `0 0 12px ${signalColor}15` }}>
              {signalLabel}
            </Badge>
            {signal && <span className="text-[10px] font-mono" style={{ color: signalColor }}>{strength > 0 ? '+' : ''}{strength}</span>}
          </div>

          {/* Strength bar */}
          {signal ? <SignalBar strength={strength} /> : <Skeleton className="h-4 w-full rounded-full bg-white/[0.06]" />}

          {/* Mini indicators + SMC + AI row */}
          {signal && (
            <div className="flex items-center justify-between mt-3 pt-2 border-t border-white/[0.04]">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1">
                  <span className="text-[9px] text-white/25">RSI</span>
                  <span className={cn('text-[10px] font-mono font-bold', (signal.indicators?.rsi?.value ?? 50) < 30 || (signal.indicators?.rsi?.value ?? 50) > 70 ? 'text-[#CF6679]' : 'text-[#03DAC6]')}>
                    {toF(signal.indicators?.rsi?.value, 1)}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-[9px] text-white/25">MACD</span>
                  <span className={cn('text-[10px] font-mono font-bold', (signal.indicators?.macd?.histogram ?? 0) >= 0 ? 'text-[#03DAC6]' : 'text-[#CF6679]')}>
                    {(signal.indicators?.macd?.histogram ?? 0) >= 0 ? '▲' : '▼'}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {signal.smc && (
                  <TrendBadge trend={signal.smc.trendStructure} />
                )}
                {signal.aiAnalysis && (
                  <AIConfidenceBadge confidence={signal.aiAnalysis.confidence} />
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ── Main Component ───────────────────────────────────────────────────────────

export default function QuantMacroPanel() {
  const { t } = useTranslation();
  const { activeBusiness } = useBusinessStore();
  const businessId = activeBusiness?.id;

  // ── Tab state ──────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<'quant' | 'macro'>('quant');

  // ── Quant state ────────────────────────────────────────────────────────────
  const [portfolioItems, setPortfolioItems] = useState<PortfolioItem[]>([]);
  const [allPortfolioItems, setAllPortfolioItems] = useState<PortfolioItem[]>([]);
  const [watchlistItems, setWatchlistItems] = useState<WatchlistItem[]>([]);
  const [signals, setSignals] = useState<Map<string, TechnicalAnalysis>>(new Map());
  const [selectedAsset, setSelectedAsset] = useState<TechnicalAnalysis | null>(null);
  const [loadingPortfolio, setLoadingPortfolio] = useState(true);
  const [loadingSignals, setLoadingSignals] = useState(false);
  const [analyzingAll, setAnalyzingAll] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  // ── Macro state ────────────────────────────────────────────────────────────
  const [macroData, setMacroData] = useState<MacroData | null>(null);
  const [loadingMacro, setLoadingMacro] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const macroAbortRef = useRef<AbortController | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [countdown, setCountdown] = useState(60);

  // ── Translation helper with fallback ───────────────────────────────────────
  const tf = useCallback((key: string, fallback: string) => {
    return t(key) || fallback;
  }, [t]);

  // ── Fetch portfolio (all items, for PNL stats) ─────────────────────────────
  useEffect(() => {
    if (!businessId) return;
    let cancelled = false;
    fetch(`/api/business/${businessId}/portfolio`)
      .then(res => res.ok ? res.json() : { portfolios: [] })
      .then(data => {
        if (!cancelled) {
          const items = data.portfolios || [];
          setAllPortfolioItems(items);
          setPortfolioItems(items.filter((p: PortfolioItem) => p.status === 'open'));
          setLoadingPortfolio(false);
        }
      })
      .catch(() => {
        if (!cancelled) { setAllPortfolioItems([]); setPortfolioItems([]); setLoadingPortfolio(false); }
      });
    return () => { cancelled = true; };
  }, [businessId]);

  // ── PNL Stats ──────────────────────────────────────────────────────────────
  const portfolioStats = useMemo(() => {
    const openItems = allPortfolioItems.filter(p => p.status === 'open');
    const closedItems = allPortfolioItems.filter(p => p.status === 'closed');

    const totalValue = openItems.reduce((s, p) => s + ((p.currentValue ?? p.currentPrice * p.quantity) || 0), 0);
    const investedValue = openItems.reduce((s, p) => s + ((p.investedValue ?? p.entryPrice * p.quantity) || 0), 0);
    const unrealizedPnl = openItems.reduce((s, p) => s + ((p.unrealizedPnl ?? 0) || 0), 0);
    const unrealizedPnlPct = investedValue > 0 ? (unrealizedPnl / investedValue) * 100 : 0;

    const realizedPnl = closedItems.reduce((s, p) => {
      const cv = (p.currentValue ?? p.currentPrice * p.quantity) || 0;
      const iv = (p.investedValue ?? p.entryPrice * p.quantity) || 0;
      return s + (cv - iv);
    }, 0);

    const winTrades = closedItems.filter(p => {
      const cv = (p.currentValue ?? p.currentPrice * p.quantity) || 0;
      const iv = (p.investedValue ?? p.entryPrice * p.quantity) || 0;
      return (cv - iv) > 0;
    }).length;
    const totalTrades = closedItems.length;
    const winRate = totalTrades > 0 ? (winTrades / totalTrades) * 100 : 0;

    return { totalValue, investedValue, unrealizedPnl, unrealizedPnlPct, realizedPnl, winRate, totalTrades };
  }, [allPortfolioItems]);

  // ── Fetch watchlist ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!businessId) return;
    let cancelled = false;
    fetch(`/api/business/${businessId}/watchlist`)
      .then(res => res.ok ? res.json() : { watchlist: [] })
      .then(data => {
        if (!cancelled) {
          setWatchlistItems(data.watchlist || []);
        }
      })
      .catch(() => {
        if (!cancelled) setWatchlistItems([]);
      });
    return () => { cancelled = true; };
  }, [businessId]);

  // ── Build combined items for signal fetching ───────────────────────────────
  const allItems = useMemo(() => {
    const items: SignalGridItem[] = [];
    portfolioItems.forEach(p => items.push({ key: `${p.type}:${p.symbol}`, type: p.type, symbol: p.symbol, isWatchlist: false }));
    watchlistItems.forEach(w => {
      const exists = items.some(i => i.key === `${w.type}:${w.symbol}`);
      if (!exists) items.push({ key: `${w.type}:${w.symbol}`, type: w.type, symbol: w.symbol, isWatchlist: true });
    });
    return items;
  }, [portfolioItems, watchlistItems]);

  // ── Fetch technical signals for all items ──────────────────────────────────
  const fetchSignalsForItems = useCallback(async (items: SignalGridItem[]) => {
    if (!businessId || items.length === 0) return;
    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();

    const newSignals = new Map<string, TechnicalAnalysis>();

    await Promise.allSettled(
      items.map(async (item) => {
        try {
          const res = await fetch(
            `/api/business/${businessId}/market-data/technical?type=${item.type}&symbol=${item.symbol}`,
            { signal: abortRef.current?.signal }
          );
          if (res.ok) {
            const data = await res.json();
            newSignals.set(item.key, data);
          }
        } catch { /* individual failure is ok */ }
      })
    );

    setSignals(newSignals);
    setLoadingSignals(false);
  }, [businessId]);

  // Trigger signal fetch when allItems changes
  useEffect(() => {
    const timer = setTimeout(() => {
      if (allItems.length > 0) {
        setLoadingSignals(true);
        fetchSignalsForItems(allItems);
      } else {
        setSignals(new Map());
        setLoadingSignals(false);
      }
    }, 0);
    return () => clearTimeout(timer);
  }, [allItems, fetchSignalsForItems]);

  // ── Fetch macro data (shared between tabs) ────────────────────────────────
  const fetchMacro = useCallback((isRefresh = false) => {
    if (!businessId) return;
    if (macroAbortRef.current) macroAbortRef.current.abort();
    macroAbortRef.current = new AbortController();

    fetch(`/api/business/${businessId}/market-data/macro`, {
      signal: macroAbortRef.current.signal,
    })
      .then(res => { if (!res.ok) throw new Error('Failed'); return res.json(); })
      .then((data: MacroData) => {
        setMacroData(data);
        setLoadingMacro(false);
        setRefreshing(false);
        setLastRefresh(new Date());
        setCountdown(60);
      })
      .catch(err => {
        if (err.name !== 'AbortError') { setLoadingMacro(false); setRefreshing(false); }
      });
    if (isRefresh) setRefreshing(true);
  }, [businessId]);

  useEffect(() => {
    if (!businessId) return;
    const timer = setTimeout(() => fetchMacro(), 0);
    return () => clearTimeout(timer);
  }, [businessId, fetchMacro]);

  // ── Auto-refresh countdown ────────────────────────────────────────────────
  useEffect(() => {
    if (!businessId || loadingMacro) return;
    countdownRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) { fetchMacro(true); return 60; }
        return prev - 1;
      });
    }, 1000);
    return () => { if (countdownRef.current) clearInterval(countdownRef.current); };
  }, [businessId, loadingMacro, fetchMacro]);

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleAnalyzeAll = useCallback(async () => {
    setAnalyzingAll(true);
    await fetchSignalsForItems(allItems);
    setAnalyzingAll(false);
    toast.success(tf('quant.analyzing', 'Analysis complete!'));
  }, [fetchSignalsForItems, allItems, tf]);

  const handleAddToWatchlist = useCallback(async (item: { symbol: string; type: string; name?: string }) => {
    if (!businessId) return;
    try {
      const res = await fetch(`/api/business/${businessId}/watchlist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol: item.symbol, type: item.type, name: item.name }),
      });
      if (res.ok) {
        toast.success(`${item.symbol} added to watchlist`);
        // Refresh watchlist items
        const wlRes = await fetch(`/api/business/${businessId}/watchlist`);
        if (wlRes.ok) {
          const data = await wlRes.json();
          setWatchlistItems(data.watchlist || []);
        }
      } else {
        toast.error(`Failed to add ${item.symbol} to watchlist`);
      }
    } catch {
      toast.error(`Failed to add ${item.symbol} to watchlist`);
    }
  }, [businessId]);

  const handleSelectTrending = useCallback((asset: TrendingAsset) => {
    if (!businessId) return;
    fetch(`/api/business/${businessId}/market-data/technical?type=${asset.type}&symbol=${asset.symbol}`)
      .then(res => res.ok ? res.json() : null)
      .then(data => { if (data) setSelectedAsset(data); })
      .catch(() => toast.error('Failed to load analysis'));
  }, [businessId]);

  // ── Computed ───────────────────────────────────────────────────────────────
  const signalArray = useMemo(() => Array.from(signals.values()), [signals]);

  const sentiment = useMemo(() => {
    if (!macroData) return null;
    // Prefer real Fear & Greed data if available
    if (macroData.fearAndGreed && macroData.fearGreedSource === 'alternative.me') {
      const v = macroData.fearAndGreed.value;
      const label = macroData.fearAndGreed.label;
      let color: string, bgColor: string;
      if (v <= 25) { color = '#FF1744'; bgColor = 'rgba(255,23,68,0.12)'; }
      else if (v <= 45) { color = '#FF7043'; bgColor = 'rgba(255,112,67,0.12)'; }
      else if (v <= 55) { color = '#FFD54F'; bgColor = 'rgba(255,213,79,0.12)'; }
      else if (v <= 75) { color = '#03DAC6'; bgColor = 'rgba(3,218,198,0.12)'; }
      else { color = '#00E676'; bgColor = 'rgba(0,230,118,0.12)'; }
      return { label, color, bgColor, percentage: v };
    }
    // Fallback to simple heuristic
    return getSentiment(macroData.global.marketCapChange24h, t);
  }, [macroData, t]);

  const altcoinMarketCap = useMemo(() => {
    if (!macroData) return 0;
    return macroData.global.totalMarketCap - (macroData.global.totalMarketCap * (macroData.global.btcDominance / 100));
  }, [macroData]);

  const turnoverRate = useMemo(() => {
    if (!macroData || macroData.global.totalMarketCap === 0) return 0;
    return ((macroData.global.totalVolume / macroData.global.totalMarketCap) * 100);
  }, [macroData]);

  // ── Guard ──────────────────────────────────────────────────────────────────
  if (!businessId) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-white/50 text-center">{tf('inv.registerFirst', 'Register a business first')}</p>
      </div>
    );
  }

  // ── Loading Skeleton ───────────────────────────────────────────────────────
  if (loadingPortfolio || loadingMacro) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48 rounded-lg bg-[#1A1A2E]" />
          <Skeleton className="h-9 w-32 rounded-lg bg-[#1A1A2E]" />
        </div>
        <div className="flex gap-3">
          <Skeleton className="h-10 w-32 rounded-lg bg-[#1A1A2E]" />
          <Skeleton className="h-10 w-32 rounded-lg bg-[#1A1A2E]" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {Array.from({ length: 5 }).map((_, i) => (<Skeleton key={i} className="h-20 rounded-xl bg-[#1A1A2E]" />))}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {Array.from({ length: 3 }).map((_, i) => (<Skeleton key={i} className="h-40 rounded-xl bg-[#1A1A2E]" />))}
        </div>
      </div>
    );
  }

  // ── PNL Summary Strip ──────────────────────────────────────────────────────
  const renderPNLStrip = () => (
    <motion.div
      className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {[
        {
          label: 'Portfolio Value',
          value: formatLargeNumber(portfolioStats.totalValue),
          icon: Wallet,
          color: '#03DAC6',
          sub: `${portfolioItems.length} open positions`,
        },
        {
          label: 'Unrealized PnL',
          value: `${portfolioStats.unrealizedPnl >= 0 ? '+' : ''}${formatLargeNumber(Math.abs(portfolioStats.unrealizedPnl))}`,
          icon: portfolioStats.unrealizedPnl >= 0 ? TrendingUp : TrendingDown,
          color: portfolioStats.unrealizedPnl >= 0 ? '#03DAC6' : '#CF6679',
          sub: `${portfolioStats.unrealizedPnlPct >= 0 ? '+' : ''}${toF(portfolioStats.unrealizedPnlPct)}%`,
        },
        {
          label: 'Realized PnL',
          value: `${portfolioStats.realizedPnl >= 0 ? '+' : ''}${formatLargeNumber(Math.abs(portfolioStats.realizedPnl))}`,
          icon: portfolioStats.realizedPnl >= 0 ? Trophy : AlertTriangle,
          color: portfolioStats.realizedPnl >= 0 ? '#03DAC6' : '#CF6679',
          sub: 'All closed trades',
        },
        {
          label: 'Win Rate',
          value: `${toF(portfolioStats.winRate, 1)}%`,
          icon: Crosshair,
          color: portfolioStats.winRate >= 50 ? '#03DAC6' : portfolioStats.winRate >= 30 ? '#FFD700' : '#CF6679',
          sub: `${portfolioStats.totalTrades > 0 ? Math.round(portfolioStats.winRate * portfolioStats.totalTrades / 100) : 0}W / ${portfolioStats.totalTrades}T`,
        },
        {
          label: 'Total Trades',
          value: portfolioStats.totalTrades.toString(),
          icon: BarChart3,
          color: '#BB86FC',
          sub: `${portfolioItems.length} open`,
        },
      ].map((item, i) => (
        <motion.div key={item.label} variants={cardVariants} custom={i}>
          <Card className="bg-[#1A1A2E] border-white/[0.06] hover:border-white/[0.1] transition-all group">
            <CardContent className="p-3">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[9px] text-white/35 uppercase tracking-wider font-medium">{item.label}</span>
                <div className="flex h-5 w-5 items-center justify-center rounded-md" style={{ backgroundColor: `${item.color}12` }}>
                  <item.icon className="h-3 w-3" style={{ color: item.color }} />
                </div>
              </div>
              <p className="text-sm font-bold text-white/90 font-mono tracking-tight">{item.value}</p>
              <p className="text-[10px] text-white/25 font-mono mt-0.5">{item.sub}</p>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </motion.div>
  );

  // ── Macro tab no-data state ────────────────────────────────────────────────
  const renderMacroNoData = () => (
    <Card className="bg-[#1A1A2E] border-white/[0.06]">
      <CardContent className="flex flex-col items-center justify-center py-20">
        <Globe className="h-14 w-14 text-white/15 mb-4" />
        <p className="text-white/40 text-center mb-1">{t('macro.noData')}</p>
        <Button variant="ghost" size="sm" className="mt-3 text-white/30 hover:text-white/60 hover:bg-white/[0.04] gap-2"
          onClick={() => fetchMacro(true)}>
          <RefreshCw className="h-4 w-4" /> Retry
        </Button>
      </CardContent>
    </Card>
  );

  // ── Macro tab content ──────────────────────────────────────────────────────
  const renderMacroTab = () => {
    if (!macroData) return renderMacroNoData();
    const g = macroData.global;

    const metricCards = [
      { label: t('macro.totalMarketCap'), value: formatMarketCap(g.totalMarketCap), sub: `${g.marketCapChange24h >= 0 ? '+' : ''}${toF(g.marketCapChange24h, 1)}%`, icon: Globe, color: g.marketCapChange24h >= 0 ? UP_COLOR : DOWN_COLOR },
      { label: t('macro.totalVolume'), value: formatMarketCap(g.totalVolume), sub: `${toF(g.totalMarketCap ? (g.totalVolume / g.totalMarketCap) * 100 : 0)}% of mcap`, icon: BarChart3, color: '#BB86FC' },
      { label: t('macro.btcDominance'), value: `${toF(g.btcDominance, 1)}%`, sub: <DominanceBar value={g.btcDominance} color="#F7931A" />, icon: Coins, color: '#F7931A' },
      { label: t('macro.ethDominance'), value: `${toF(g.ethDominance, 1)}%`, sub: <DominanceBar value={g.ethDominance} color="#627EEA" />, icon: Layers, color: '#627EEA' },
      { label: t('macro.activeCryptos'), value: formatCompact(g.activeCryptos), sub: 'tracked assets', icon: Zap, color: '#03DAC6' },
      { label: t('macro.marketChange24h'), value: `${g.marketCapChange24h >= 0 ? '+' : ''}${toF(g.marketCapChange24h, 1)}%`, sub: '24 hours', icon: g.marketCapChange24h >= 0 ? TrendingUp : TrendingDown, color: g.marketCapChange24h >= 0 ? UP_COLOR : DOWN_COLOR },
    ];

    return (
      <motion.div className="space-y-4" variants={containerVariants} initial="hidden" animate="visible">
        {/* Metric Cards Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {metricCards.map((card, i) => (
            <motion.div key={card.label} variants={macroCardVariants} custom={i + 1}>
              <Card className="bg-[#1A1A2E] border-white/[0.06] h-full">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2.5">
                    <p className="text-[10px] text-white/40 uppercase tracking-wider font-medium leading-tight">{card.label}</p>
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg" style={{ backgroundColor: `${card.color}18` }}>
                      <card.icon className="h-3.5 w-3.5" style={{ color: card.color }} />
                    </div>
                  </div>
                  <p className="text-base font-bold tracking-tight text-white/90">{card.value}</p>
                  <div className="mt-1">{typeof card.sub === 'string' ? <p className="text-[11px] text-white/30 font-mono">{card.sub}</p> : card.sub}</div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Sentiment + Market Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {sentiment && (
            <motion.div variants={macroCardVariants} custom={8}>
              <Card className="bg-[#1A1A2E] border-white/[0.06] h-full">
                <CardContent className="p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <Gauge className="h-4 w-4 text-white/40" />
                    <p className="text-xs text-white/40 uppercase tracking-wider font-medium">{t('macro.marketSentiment')}</p>
                  </div>
                  <div className="flex flex-col items-center">
                    <div className="relative w-48 h-28 mb-3">
                      <svg viewBox="0 0 200 120" className="w-full h-full">
                        <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="12" strokeLinecap="round" />
                        <path d="M 20 100 A 80 80 0 0 1 50 42" fill="none" stroke="#FF1744" strokeWidth="12" strokeLinecap="round" opacity="0.7" />
                        <path d="M 50 42 A 80 80 0 0 1 80 25" fill="none" stroke="#FF7043" strokeWidth="12" opacity="0.7" />
                        <path d="M 80 25 A 80 80 0 0 1 120 25" fill="none" stroke="#FFD54F" strokeWidth="12" opacity="0.7" />
                        <path d="M 120 25 A 80 80 0 0 1 150 42" fill="none" stroke="#03DAC6" strokeWidth="12" opacity="0.7" />
                        <path d="M 150 42 A 80 80 0 0 1 180 100" fill="none" stroke="#00E676" strokeWidth="12" strokeLinecap="round" opacity="0.7" />
                        <line x1="100" y1="100" x2={100 + 65 * Math.cos(((100 - sentiment.percentage) / 100) * Math.PI)} y2={100 - 65 * Math.sin(((100 - sentiment.percentage) / 100) * Math.PI)} stroke="white" strokeWidth="2.5" strokeLinecap="round" />
                        <circle cx="100" cy="100" r="5" fill="white" />
                      </svg>
                    </div>
                    <Badge className="text-xs font-bold px-4 py-1 border-0 mb-1" style={{ backgroundColor: sentiment.bgColor, color: sentiment.color }}>{sentiment.label}</Badge>
                    <p className="text-[11px] text-white/25 font-mono mt-1">{g.marketCapChange24h >= 0 ? '+' : ''}{toF(g.marketCapChange24h)}% 24h</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
          <motion.div variants={macroCardVariants} custom={9}>
            <Card className="bg-[#1A1A2E] border-white/[0.06] h-full">
              <CardContent className="p-5">
                <div className="flex items-center gap-2 mb-4">
                  <PieChart className="h-4 w-4 text-white/40" />
                  <p className="text-xs text-white/40 uppercase tracking-wider font-medium">{t('macro.marketStats')}</p>
                </div>
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[11px] text-white/50 font-medium">{t('macro.altcoinMarketCap')}</span>
                      <span className="text-sm font-bold text-white/80 font-mono">{formatMarketCap(altcoinMarketCap)}</span>
                    </div>
                    <div className="h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-700" style={{ width: `${toF(g.totalMarketCap ? (altcoinMarketCap / g.totalMarketCap) * 100 : 0, 1)}%`, backgroundColor: '#BB86FC' }} />
                    </div>
                    <p className="text-[10px] text-white/25 mt-1 font-mono">{toF(g.totalMarketCap ? (altcoinMarketCap / g.totalMarketCap) * 100 : 0, 1)}% of total</p>
                  </div>
                  <Separator className="bg-white/[0.04]" />
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[11px] text-white/50 font-medium">{t('macro.turnoverRate')}</span>
                      <span className="text-sm font-bold text-white/80 font-mono">{toF(turnoverRate)}%</span>
                    </div>
                    <div className="h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-700" style={{ width: `${toF(turnoverRate * 4, 1)}%`, backgroundColor: turnoverRate > 5 ? UP_COLOR : turnoverRate > 3 ? GOLD_COLOR : DOWN_COLOR }} />
                    </div>
                    <p className="text-[10px] text-white/25 mt-1 font-mono">Vol / MCap ratio</p>
                  </div>
                  <Separator className="bg-white/[0.04]" />
                  <div className="grid grid-cols-2 gap-4">
                    <div><p className="text-[10px] text-white/25 uppercase mb-0.5">BTC + ETH</p><p className="text-base font-bold text-white/80 font-mono">{toF(g.btcDominance + g.ethDominance, 1)}%</p></div>
                    <div><p className="text-[10px] text-white/25 uppercase mb-0.5">Trending</p><p className="text-base font-bold text-white/80 font-mono">{macroData.trending.length}</p></div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Top Movers */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <motion.div variants={macroCardVariants} custom={10}>
            <Card className="bg-[#1A1A2E] border-white/[0.06]">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2"><TrendingUp className="h-4 w-4 text-[#03DAC6]" /><p className="text-xs text-white/50 font-semibold">{t('macro.topGainers')}</p></div>
                  <Badge variant="outline" className="border-[#03DAC6]/20 text-[#03DAC6]/60 text-[10px]">24h</Badge>
                </div>
                <div className="max-h-[380px] overflow-y-auto custom-scrollbar">
                  <div className="space-y-1">
                    {macroData.topGainers.map((item, i) => (
                      <div key={item.symbol} className="flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-white/[0.03] transition-colors">
                        <div className="flex items-center gap-3">
                          <span className="text-[10px] text-white/20 font-mono w-4 text-right">{i + 1}</span>
                          <div className="flex flex-col"><span className="text-sm font-bold text-white/80 font-mono">{item.symbol}</span><span className="text-[11px] text-white/30 font-mono">{item.price}</span></div>
                        </div>
                        <div className="flex items-center gap-1.5"><ArrowUpRight className="h-3.5 w-3.5 text-[#03DAC6]" /><span className="text-xs font-bold font-mono text-[#03DAC6]">+{(item.change24h ?? 0).toFixed(2)}%</span></div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
          <motion.div variants={macroCardVariants} custom={11}>
            <Card className="bg-[#1A1A2E] border-white/[0.06]">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2"><TrendingDown className="h-4 w-4 text-[#CF6679]" /><p className="text-xs text-white/50 font-semibold">{t('macro.topLosers')}</p></div>
                  <Badge variant="outline" className="border-[#CF6679]/20 text-[#CF6679]/60 text-[10px]">24h</Badge>
                </div>
                <div className="max-h-[380px] overflow-y-auto custom-scrollbar">
                  <div className="space-y-1">
                    {macroData.topLosers.map((item, i) => (
                      <div key={item.symbol} className="flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-white/[0.03] transition-colors">
                        <div className="flex items-center gap-3">
                          <span className="text-[10px] text-white/20 font-mono w-4 text-right">{i + 1}</span>
                          <div className="flex flex-col"><span className="text-sm font-bold text-white/80 font-mono">{item.symbol}</span><span className="text-[11px] text-white/30 font-mono">{item.price}</span></div>
                        </div>
                        <div className="flex items-center gap-1.5"><ArrowDownRight className="h-3.5 w-3.5 text-[#CF6679]" /><span className="text-xs font-bold font-mono text-[#CF6679]">{(item.change24h ?? 0).toFixed(2)}%</span></div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Trending Assets */}
        {macroData.trending.length > 0 && (
          <motion.div variants={macroCardVariants} custom={12}>
            <Card className="bg-[#1A1A2E] border-white/[0.06]">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2"><Flame className="h-4 w-4 text-[#FF7043]" /><p className="text-xs text-white/50 font-semibold">{t('macro.trending')}</p></div>
                  <Badge variant="outline" className="border-white/[0.06] text-white/30 text-[10px]"><Activity className="h-3 w-3 mr-1 animate-pulse" /> Live</Badge>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-8 gap-2.5">
                  {macroData.trending.map(item => {
                    const isUp = item.change24h >= 0;
                    const color = isUp ? UP_COLOR : DOWN_COLOR;
                    return (
                      <motion.div key={item.symbol} whileHover={{ scale: 1.03, y: -2 }} transition={{ duration: 0.15 }}
                        className="rounded-xl border border-white/[0.06] p-3 hover:border-white/[0.12] transition-colors cursor-default"
                        style={{ backgroundColor: `${color}06` }}>
                        <div className="flex flex-col items-start gap-1.5">
                          <div className="flex items-center gap-1.5">
                            <div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />
                            <span className="text-xs font-bold text-white/80 font-mono">{item.symbol}</span>
                          </div>
                          <span className="text-[11px] text-white/30 font-mono">{item.price}</span>
                          <div className="flex items-center gap-0.5">
                            {isUp ? <ArrowUpRight className="h-3 w-3" style={{ color }} /> : <ArrowDownRight className="h-3 w-3" style={{ color }} />}
                            <span className="text-[11px] font-bold font-mono" style={{ color }}>{isUp ? '+' : ''}{(item.change24h ?? 0).toFixed(2)}%</span>
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
      </motion.div>
    );
  };

  // ── Quant tab content ──────────────────────────────────────────────────────
  const renderQuantTab = () => (
    <div className="space-y-5">
      {/* PNL Summary Strip */}
      {renderPNLStrip()}

      {/* Global Market Overview */}
      {macroData && (
        <motion.div variants={fadeIn} initial="hidden" animate="visible">
          <div className="flex items-center gap-2 mb-3">
            <Globe className="h-3.5 w-3.5 text-white/30" />
            <span className="text-[10px] text-white/40 uppercase tracking-wider font-bold">{tf('quant.globalMarket', 'Global Market')}</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {[
              { label: 'Market Cap', value: formatLargeNumber(macroData.global.totalMarketCap), change: macroData.global.marketCapChange24h, icon: BarChart3 },
              { label: '24h Volume', value: formatLargeNumber(macroData.global.totalVolume), change: null, icon: Activity },
              { label: 'BTC Dominance', value: `${toF(macroData.global.btcDominance, 1)}%`, change: null, icon: TrendingUp },
              { label: 'ETH Dominance', value: `${toF(macroData.global.ethDominance, 1)}%`, change: null, icon: Layers },
              { label: 'Active Cryptos', value: formatCompact(macroData.global.activeCryptos ?? 0), change: null, icon: Zap },
            ].map(card => {
              const isUp = card.change !== null && card.change >= 0;
              return (
                <Card key={card.label} className="bg-[#1A1A2E] border-white/[0.06] hover:border-white/[0.1] transition-colors">
                  <CardContent className="p-3">
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <card.icon className="h-3 w-3 text-white/20" />
                      <p className="text-[9px] text-white/35 uppercase tracking-wider font-medium">{card.label}</p>
                    </div>
                    <p className="text-sm font-bold text-white/90 font-mono">{card.value}</p>
                    {card.change !== null && (
                      <div className="flex items-center gap-0.5 mt-0.5">
                        {isUp ? <ArrowUpRight className="h-3 w-3 text-[#03DAC6]" /> : <ArrowDownRight className="h-3 w-3 text-[#CF6679]" />}
                        <span className={cn('text-[11px] font-mono font-medium', isUp ? 'text-[#03DAC6]' : 'text-[#CF6679]')}>{isUp ? '+' : ''}{(card.change ?? 0).toFixed(2)}%</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Portfolio + Watchlist Signals */}
      <motion.div variants={fadeIn} initial="hidden" animate="visible">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Target className="h-3.5 w-3.5 text-[#FFD700]/60" />
            <span className="text-[10px] text-white/40 uppercase tracking-wider font-bold">{tf('quant.portfolioSignals', 'Portfolio Signals')}</span>
            {loadingSignals && <RefreshCw className="h-3 w-3 text-white/20 animate-spin" />}
          </div>
          <div className="flex items-center gap-2">
            {watchlistItems.length > 0 && (
              <Badge className="border-0 text-[9px] font-medium" style={{ backgroundColor: 'rgba(187,134,252,0.1)', color: '#BB86FC' }}>
                <Eye className="h-2.5 w-2.5 mr-1" />{watchlistItems.length} watchlist
              </Badge>
            )}
            <Badge className="border-0 text-[9px] font-medium" style={{ backgroundColor: 'rgba(255,215,0,0.1)', color: '#FFD700' }}>
              {portfolioItems.length} portfolio
            </Badge>
          </div>
        </div>

        {allItems.length === 0 ? (
          <Card className="bg-[#1A1A2E] border-white/[0.06]">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <BarChart3 className="h-12 w-12 text-white/10 mb-3" />
              <p className="text-white/30 text-sm">{tf('quant.noSignals', 'No signals available. Add assets to your portfolio or watchlist to see analysis.')}</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <AnimatePresence mode="popLayout">
              {allItems.map((item, i) => (
                <SignalCard
                  key={item.key}
                  item={item}
                  signal={signals.get(item.key)}
                  onSelect={setSelectedAsset}
                  onAddToWatchlist={handleAddToWatchlist}
                  index={i}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </motion.div>

      {/* Trending Assets */}
      {macroData && (
        <motion.div variants={slideUp} initial="hidden" animate="visible">
          <div className="flex items-center gap-2 mb-3">
            <Activity className="h-3.5 w-3.5 text-[#03DAC6]/60" />
            <span className="text-[10px] text-white/40 uppercase tracking-wider font-bold">{tf('quant.trendingAssets', 'Trending Assets')}</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Top Gainers */}
            <Card className="bg-[#1A1A2E] border-white/[0.06]">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUp className="h-3.5 w-3.5 text-[#03DAC6]" />
                  <span className="text-[11px] text-[#03DAC6]/80 font-bold uppercase tracking-wider">{tf('quant.topGainers', 'Top Gainers')}</span>
                </div>
                <div className="space-y-1.5">
                  {macroData.topGainers.map(asset => (
                    <button key={asset.symbol} className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-white/[0.04] transition-colors group/trend cursor-pointer"
                      onClick={() => handleSelectTrending(asset)}>
                      <div className="flex items-center gap-2.5">
                        <div className="h-1.5 w-8 rounded-full bg-[#03DAC6]/30 overflow-hidden">
                          <motion.div className="h-full rounded-full bg-[#03DAC6]" initial={{ width: '0%' }} animate={{ width: `${Math.min(100, asset.change24h * 10)}%` }} transition={{ duration: 0.5, delay: 0.2 }} />
                        </div>
                        <span className="text-xs font-bold text-white/80 font-mono group-hover/trend:text-[#03DAC6] transition-colors">{asset.symbol}</span>
                        <Badge className="text-[8px] px-1 py-0 h-3.5 font-medium border-0"
                          style={{ backgroundColor: TYPE_COLORS[asset.type || 'crypto']?.bg || 'rgba(255,255,255,0.06)', color: TYPE_COLORS[asset.type || 'crypto']?.text || '#888' }}>
                          {(asset.type || 'crypto').toUpperCase()}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-white/50">{asset.price}</span>
                        <span className="text-[11px] font-mono font-bold text-[#03DAC6]">+{(asset.change24h ?? 0).toFixed(2)}%</span>
                      </div>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
            {/* Top Losers */}
            <Card className="bg-[#1A1A2E] border-white/[0.06]">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <TrendingDown className="h-3.5 w-3.5 text-[#CF6679]" />
                  <span className="text-[11px] text-[#CF6679]/80 font-bold uppercase tracking-wider">{tf('quant.topLosers', 'Top Losers')}</span>
                </div>
                <div className="space-y-1.5">
                  {macroData.topLosers.map(asset => (
                    <button key={asset.symbol} className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-white/[0.04] transition-colors group/trend cursor-pointer"
                      onClick={() => handleSelectTrending(asset)}>
                      <div className="flex items-center gap-2.5">
                        <div className="h-1.5 w-8 rounded-full bg-[#CF6679]/30 overflow-hidden">
                          <motion.div className="h-full rounded-full bg-[#CF6679]" initial={{ width: '0%' }} animate={{ width: `${Math.min(100, Math.abs(asset.change24h) * 10)}%` }} transition={{ duration: 0.5, delay: 0.2 }} />
                        </div>
                        <span className="text-xs font-bold text-white/80 font-mono group-hover/trend:text-[#CF6679] transition-colors">{asset.symbol}</span>
                        <Badge className="text-[8px] px-1 py-0 h-3.5 font-medium border-0"
                          style={{ backgroundColor: TYPE_COLORS[asset.type || 'crypto']?.bg || 'rgba(255,255,255,0.06)', color: TYPE_COLORS[asset.type || 'crypto']?.text || '#888' }}>
                          {(asset.type || 'crypto').toUpperCase()}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-white/50">{asset.price}</span>
                        <span className="text-[11px] font-mono font-bold text-[#CF6679]">{(asset.change24h ?? 0).toFixed(2)}%</span>
                      </div>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </motion.div>
      )}
    </div>
  );

  // ── Bloomberg-Style Detail Panel Section ───────────────────────────────────

  const renderSMCPanel = (smc: NonNullable<TechnicalAnalysis['smc']>) => (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="flex h-5 w-5 items-center justify-center rounded-md bg-[#BB86FC]/10">
          <Layers className="h-3 w-3 text-[#BB86FC]" />
        </div>
        <span className="text-[11px] text-white/40 uppercase tracking-wider font-bold">Smart Money Concepts</span>
      </div>

      {/* Trend Structure + Premium/Discount */}
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-lg bg-white/[0.03] p-3 space-y-2">
          <span className="text-[10px] text-white/30 uppercase tracking-wider">Trend Structure</span>
          <TrendBadge trend={smc.trendStructure} />
        </div>
        <div className="rounded-lg bg-white/[0.03] p-3 space-y-2">
          <span className="text-[10px] text-white/30 uppercase tracking-wider">Premium / Discount</span>
          <Badge className="text-[10px] px-2 py-0.5 h-5 font-bold border-0"
            style={{
              backgroundColor: smc.premiumDiscount === 'discount' ? 'rgba(3,218,198,0.15)' : 'rgba(207,102,121,0.15)',
              color: smc.premiumDiscount === 'discount' ? '#03DAC6' : '#CF6679',
            }}>
            {smc.premiumDiscount === 'discount' ? '▼ Discount' : '▲ Premium'}
          </Badge>
        </div>
      </div>

      {/* FVG */}
      <div className="rounded-lg bg-white/[0.03] p-3 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Triangle className="h-3 w-3 text-[#03DAC6]" fill="currentColor" />
            <span className="text-[10px] text-white/50 uppercase tracking-wider font-medium">Fair Value Gap</span>
          </div>
          <Badge className="text-[8px] px-1.5 py-0 h-3.5 font-bold border-0"
            style={{ backgroundColor: !smc.fairValueGaps.filled ? 'rgba(3,218,198,0.15)' : 'rgba(255,255,255,0.06)', color: !smc.fairValueGaps.filled ? '#03DAC6' : '#666' }}>
            {!smc.fairValueGaps.filled ? 'ACTIVE' : 'FILLED'}
          </Badge>
        </div>
        <div className="flex items-center gap-2 text-[11px] font-mono">
          <span className="text-white/30">Range:</span>
          <span className="text-[#03DAC6]/80">{formatCompact(smc.fairValueGaps.low)}</span>
          <ArrowLeftRight className="h-3 w-3 text-white/20" />
          <span className="text-[#CF6679]/80">{formatCompact(smc.fairValueGaps.high)}</span>
        </div>
        <p className="text-[10px] text-white/25 leading-relaxed line-clamp-2">{smc.fairValueGaps.description}</p>
      </div>

      {/* Order Block */}
      <div className="rounded-lg bg-white/[0.03] p-3 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Square className="h-3 w-3" style={{ color: smc.orderBlock.type === 'bullish' ? '#03DAC6' : '#CF6679' }} fill="currentColor" />
            <span className="text-[10px] text-white/50 uppercase tracking-wider font-medium">Order Block</span>
          </div>
          <Badge className="text-[8px] px-1.5 py-0 h-3.5 font-bold border-0 capitalize"
            style={{ backgroundColor: smc.orderBlock.type === 'bullish' ? 'rgba(3,218,198,0.15)' : 'rgba(207,102,121,0.15)', color: smc.orderBlock.type === 'bullish' ? '#03DAC6' : '#CF6679' }}>
            {smc.orderBlock.type}
          </Badge>
        </div>
        <div className="flex items-center gap-2 text-[11px] font-mono">
          <span className="text-white/30">Zone:</span>
          <span className="text-white/50">{formatCompact(smc.orderBlock.zone.low)}</span>
          <span className="text-white/20">—</span>
          <span className="text-white/50">{formatCompact(smc.orderBlock.zone.high)}</span>
        </div>
        <p className="text-[10px] text-white/25 leading-relaxed line-clamp-2">{smc.orderBlock.description}</p>
      </div>

      {/* Liquidity Sweep */}
      <div className="rounded-lg bg-white/[0.03] p-3 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Zap className="h-3 w-3 text-[#FFD700]" />
            <span className="text-[10px] text-white/50 uppercase tracking-wider font-medium">Liquidity Sweep</span>
          </div>
          <Badge className="text-[8px] px-1.5 py-0 h-3.5 font-bold border-0"
            style={{ backgroundColor: smc.liquiditySweep.swept ? 'rgba(255,215,0,0.15)' : 'rgba(255,255,255,0.06)', color: smc.liquiditySweep.swept ? '#FFD700' : '#666' }}>
            {smc.liquiditySweep.swept ? 'SWEPT' : 'NO SWEEP'}
          </Badge>
        </div>
        <div className="flex items-center gap-2 text-[11px] font-mono">
          <span className="text-white/30">Level:</span>
          <span className="text-[#FFD700]/80">{formatCompact(smc.liquiditySweep.level)}</span>
        </div>
        <p className="text-[10px] text-white/25 leading-relaxed line-clamp-2">{smc.liquiditySweep.description}</p>
      </div>
    </div>
  );

  const renderAIPanel = (ai: NonNullable<TechnicalAnalysis['aiAnalysis']>, news: TechnicalAnalysis['newsConfirmation']) => (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="flex h-5 w-5 items-center justify-center rounded-md bg-[#03DAC6]/10">
          <Brain className="h-3 w-3 text-[#03DAC6]" />
        </div>
        <span className="text-[11px] text-white/40 uppercase tracking-wider font-bold">AI Analysis</span>
      </div>

      {/* Confidence + Risk */}
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-lg bg-white/[0.03] p-3 text-center space-y-1.5">
          <span className="text-[10px] text-white/30 uppercase tracking-wider">Confidence</span>
          <div className="flex items-center justify-center gap-1.5">
            <motion.div
              className="h-2 rounded-full"
              style={{ backgroundColor: getSignalColor(ai.signalStrength), width: `${ai.confidence * 0.6}px` }}
              initial={{ width: 0 }}
              animate={{ width: `${ai.confidence * 0.6}px` }}
              transition={{ duration: 0.6, delay: 0.3 }}
            />
            <span className="text-sm font-bold font-mono" style={{ color: getSignalColor(ai.signalStrength) }}>{ai.confidence}%</span>
          </div>
        </div>
        <div className="rounded-lg bg-white/[0.03] p-3 text-center space-y-1.5">
          <span className="text-[10px] text-white/30 uppercase tracking-wider">Risk Level</span>
          <div className="flex items-center justify-center gap-1.5">
            {ai.riskLevel === 'LOW' && <ShieldCheck className="h-3.5 w-3.5 text-[#03DAC6]" />}
            {ai.riskLevel === 'MEDIUM' && <ShieldAlert className="h-3.5 w-3.5 text-[#FFD700]" />}
            {ai.riskLevel === 'HIGH' && <ShieldAlert className="h-3.5 w-3.5 text-[#CF6679]" />}
            {!['LOW', 'MEDIUM', 'HIGH'].includes(ai.riskLevel) && <Shield className="h-3.5 w-3.5 text-white/40" />}
            <span className="text-sm font-bold font-mono" style={{ color: getRiskColor(ai.riskLevel) }}>{ai.riskLevel}</span>
          </div>
        </div>
      </div>

      {/* Reasoning */}
      <div className="rounded-lg bg-white/[0.03] p-3 space-y-1.5">
        <span className="text-[10px] text-white/30 uppercase tracking-wider font-medium">Reasoning</span>
        <p className="text-[11px] sm:text-xs text-white/60 leading-relaxed">{ai.reasoning}</p>
      </div>

      {/* Strategy */}
      <div className="rounded-lg bg-white/[0.03] p-3 space-y-1.5">
        <span className="text-[10px] text-white/30 uppercase tracking-wider font-medium">Detected Strategy</span>
        <div className="flex items-center gap-1.5">
          <Crosshair className="h-3 w-3 text-[#BB86FC]" />
          <span className="text-[11px] sm:text-xs text-[#BB86FC] font-medium">{ai.strategy}</span>
        </div>
      </div>

      {/* News Confirmation */}
      {news && (
        <div className="rounded-lg bg-white/[0.03] p-3 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Newspaper className="h-3 w-3 text-[#03DAC6]" />
              <span className="text-[10px] text-white/30 uppercase tracking-wider font-medium">News Confirmation</span>
            </div>
            <div className="flex items-center gap-1">
              {news.confirmed ? (
                <Badge className="text-[8px] px-1.5 py-0 h-3.5 font-bold border-0" style={{ backgroundColor: 'rgba(3,218,198,0.15)', color: '#03DAC6' }}>
                  <CheckCircle2 className="h-2.5 w-2.5 mr-0.5" /> CONFIRMED
                </Badge>
              ) : (
                <Badge className="text-[8px] px-1.5 py-0 h-3.5 font-bold border-0" style={{ backgroundColor: 'rgba(255,255,255,0.06)', color: '#666' }}>
                  UNCONFIRMED
                </Badge>
              )}
              <Badge className="text-[8px] px-1.5 py-0 h-3.5 font-bold border-0 capitalize"
                style={{ backgroundColor: `${getTrendColor(news.sentiment)}15`, color: getTrendColor(news.sentiment) }}>
                {news.sentiment}
              </Badge>
            </div>
          </div>
          {news.recentEvents && news.recentEvents.length > 0 && (
            <div className="space-y-1">
              {news.recentEvents.map((event, i) => (
                <div key={i} className="flex items-start gap-1.5 text-[10px] sm:text-[11px] text-white/40">
                  <span className="text-white/15 font-mono shrink-0">•</span>
                  <span className="leading-relaxed">{event}</span>
                </div>
              ))}
            </div>
          )}
          {news.source && (
            <p className="text-[9px] text-white/20 font-mono italic">{news.source}</p>
          )}
        </div>
      )}
    </div>
  );

  const renderTradeZonesPanel = (ai: NonNullable<TechnicalAnalysis['aiAnalysis']>) => (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="flex h-5 w-5 items-center justify-center rounded-md bg-[#FFD700]/10">
          <Crosshair className="h-3 w-3 text-[#FFD700]" />
        </div>
        <span className="text-[11px] text-white/40 uppercase tracking-wider font-bold">Trade Zones & Forecast</span>
      </div>

      {/* Entry / SL / TP */}
      <div className="space-y-2">
        <div className={cn(
          "rounded-lg border p-3 space-y-1",
          ai.tradeDirection === 'SHORT' ? 'bg-[#CF6679]/[0.04] border-[#CF6679]/10' : 'bg-[#03DAC6]/[0.04] border-[#03DAC6]/10',
        )}>
          <div className="flex items-center gap-1.5">
            <div className={cn('h-1.5 w-1.5 rounded-full', ai.tradeDirection === 'SHORT' ? 'bg-[#CF6679]' : 'bg-[#03DAC6]')} />
            <span className={cn(
              "text-[10px] uppercase tracking-wider font-bold",
              ai.tradeDirection === 'SHORT' ? 'text-[#CF6679]/60' : 'text-[#03DAC6]/60',
            )}>{ai.tradeDirection === 'SHORT' ? 'Entry Zone (SELL)' : ai.tradeDirection === 'LONG' ? 'Entry Zone (BUY)' : 'Entry Zone'}</span>
          </div>
          <p className="text-[11px] sm:text-xs text-white/60 font-medium">{ai.entryZone}</p>
        </div>

        <div className="rounded-lg bg-[#CF6679]/[0.04] border border-[#CF6679]/10 p-3 space-y-1">
          <div className="flex items-center gap-1.5">
            <div className="h-1.5 w-1.5 rounded-full bg-[#CF6679]" />
            <span className="text-[10px] text-[#CF6679]/60 uppercase tracking-wider font-bold">Stop Loss Zone</span>
          </div>
          <p className="text-[11px] sm:text-xs text-white/60 font-medium">{ai.stopLossZone}</p>
        </div>

        <div className="rounded-lg bg-[#03DAC6]/[0.04] border border-[#03DAC6]/10 p-3 space-y-1">
          <div className="flex items-center gap-1.5">
            <div className="h-1.5 w-1.5 rounded-full bg-[#03DAC6]" />
            <span className="text-[10px] text-[#03DAC6]/60 uppercase tracking-wider font-bold">Take Profit Zone</span>
          </div>
          <p className="text-[11px] sm:text-xs text-white/60 font-medium">{ai.takeProfitZone}</p>
        </div>
      </div>

      {/* Price Forecast Table */}
      <div className="rounded-lg bg-white/[0.03] p-3 space-y-2">
        <span className="text-[10px] text-white/30 uppercase tracking-wider font-bold">Price Forecast</span>
        <div className="space-y-1.5">
          {[
            { label: 'Short Term', data: ai.priceForecast.shortTerm, color: '#03DAC6' },
            { label: 'Mid Term', data: ai.priceForecast.midTerm, color: '#FFD700' },
            { label: 'Long Term', data: ai.priceForecast.longTerm, color: '#BB86FC' },
          ].map(row => (
            <div key={row.label} className="flex items-center justify-between px-2.5 py-2 rounded-md bg-white/[0.02]">
              <div className="flex items-center gap-2">
                <div className="h-1 w-4 rounded-full" style={{ backgroundColor: row.color }} />
                <span className="text-[10px] sm:text-[11px] text-white/40 font-medium">{row.label}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[11px] font-bold font-mono text-white/70">{formatCompact(row.data.target)}</span>
                <div className="flex items-center gap-1 text-[9px] text-white/25">
                  <Clock className="h-2.5 w-2.5" />
                  <span className="font-mono">{row.data.timeframe}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // ── Main Render ────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <motion.div className="flex items-center justify-between flex-wrap gap-3" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#03DAC6]/20 to-[#FFD700]/10 border border-white/[0.08]">
            <Zap className="h-5 w-5 text-[#03DAC6]" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white tracking-tight">{tf('quant.title', 'Quant & Market')}</h1>
            <p className="text-[11px] text-white/35 font-medium">
              {tf('quant.technicalAnalysis', 'Technical Analysis')} • {signalArray.length} {tf('quant.portfolioSignals', 'assets analyzed')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Macro refresh button (visible on macro tab) */}
          {activeTab === 'macro' && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="sm" className="h-9 px-2.5 text-white/40 hover:text-white/70 hover:bg-white/[0.06] gap-1.5"
                  onClick={() => fetchMacro(true)} disabled={refreshing}>
                  <RefreshCw className={cn('h-3.5 w-3.5', refreshing && 'animate-spin')} />
                  <span className="text-[10px] font-mono">{countdown}s</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="left" className="bg-[#1A1A2E] border-white/[0.06] text-white/60">
                {refreshing ? t('macro.refreshing') : 'Refresh data'}
              </TooltipContent>
            </Tooltip>
          )}
          {/* Analyze all button (visible on quant tab) */}
          {activeTab === 'quant' && (
            <Button size="sm" className="gap-1.5 bg-[#03DAC6]/10 text-[#03DAC6] hover:bg-[#03DAC6]/20 border border-[#03DAC6]/20 text-xs font-semibold rounded-lg h-9 px-3"
              onClick={handleAnalyzeAll} disabled={analyzingAll || allItems.length === 0}>
              <RefreshCw className={cn('h-3.5 w-3.5', analyzingAll && 'animate-spin')} />
              {analyzingAll ? tf('quant.analyzing', 'Analyzing...') : tf('quant.analyzeAll', 'Analyze All')}
            </Button>
          )}
        </div>
      </motion.div>

      {/* ── Tab Buttons ────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2">
        <div className="relative flex items-center gap-1 p-[3px] rounded-xl bg-white/[0.03] border border-white/[0.06]">
          {/* Sliding pill indicator */}
          <div className="absolute top-[3px] bottom-[3px] rounded-lg transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]"
            style={{
              width: 'calc(50% - 4px)',
              left: activeTab === 'quant' ? '3px' : 'calc(50% + 1px)',
              background: activeTab === 'quant' ? 'rgba(3,218,198,0.12)' : 'rgba(255,213,0,0.12)',
              border: activeTab === 'quant' ? '1px solid rgba(3,218,198,0.25)' : '1px solid rgba(255,213,0,0.25)',
              boxShadow: activeTab === 'quant' ? '0 0 16px rgba(3,218,198,0.1), inset 0 1px 0 rgba(3,218,198,0.1)' : '0 0 16px rgba(255,213,0,0.08), inset 0 1px 0 rgba(255,213,0,0.1)',
            }} />
          <button
            onClick={() => setActiveTab('quant')}
            className={cn(
              'relative z-10 flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all duration-200',
              activeTab === 'quant' ? 'text-[#03DAC6]' : 'text-white/35 hover:text-white/55'
            )}
          >
            <Zap className="h-3.5 w-3.5" />
            Quant Signals
          </button>
          <button
            onClick={() => setActiveTab('macro')}
            className={cn(
              'relative z-10 flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all duration-200',
              activeTab === 'macro' ? 'text-[#FFD700]' : 'text-white/35 hover:text-white/55'
            )}
          >
            <Globe className="h-3.5 w-3.5" />
            Market Overview
          </button>
        </div>
        {activeTab === 'macro' && lastRefresh && (
          <span className="text-[10px] text-white/20 font-mono hidden sm:inline-block">
            {t('macro.lastUpdated')}: {lastRefresh.toLocaleTimeString()}
          </span>
        )}
      </div>

      {/* ── Tab Content ─────────────────────────────────────────────────────── */}
      <AnimatePresence mode="wait">
        {activeTab === 'quant' ? (
          <motion.div key="quant" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.25 }}>
            {renderQuantTab()}
          </motion.div>
        ) : (
          <motion.div key="macro" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.25 }}>
            {renderMacroTab()}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Expanded Analysis Dialog (shared between tabs) ─────────────────── */}
      <Dialog open={!!selectedAsset} onOpenChange={() => setSelectedAsset(null)}>
        <DialogContent showCloseButton={false} aria-describedby={undefined} className="max-w-7xl w-[calc(100vw-1.5rem)] sm:w-[95vw] max-h-[92vh] bg-[#0D0D0D] border border-white/[0.08] rounded-2xl p-0 gap-0 overflow-hidden">
          {selectedAsset && (
            <>
              {/* ── Dialog Header ──────────────────────────────────────────────── */}
              <DialogHeader className="px-4 sm:px-6 pt-5 sm:pt-6 pb-0">
                {/* Top row: symbol + badges + actions */}
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                    <DialogTitle className="text-white text-base sm:text-lg font-bold flex items-center gap-2 shrink-0">{selectedAsset.symbol}</DialogTitle>
                    <Badge className="text-[8px] sm:text-[9px] px-1.5 sm:px-2 py-0 h-4 font-medium border-0 shrink-0"
                      style={{ backgroundColor: TYPE_COLORS[selectedAsset.type]?.bg || 'rgba(255,255,255,0.06)', color: TYPE_COLORS[selectedAsset.type]?.text || '#888' }}>
                      {(selectedAsset.type || 'crypto').toUpperCase()}
                    </Badge>
                    {selectedAsset.smc && (
                      <TrendBadge trend={selectedAsset.smc.trendStructure} />
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button className="p-2 rounded-lg text-white/30 hover:text-[#FFD700] hover:bg-white/[0.06] transition-colors"
                      onClick={() => handleAddToWatchlist({ symbol: selectedAsset.symbol, type: selectedAsset.type, name: selectedAsset.symbol })}>
                      <Star className="h-4 w-4" />
                    </button>
                    <button className="p-2 rounded-lg text-white/30 hover:text-white/60 hover:bg-white/[0.06] transition-colors"
                      onClick={() => setSelectedAsset(null)}>
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                {/* Price row: price + change + signal badge */}
                <div className="mt-3 sm:mt-4 flex flex-wrap items-end gap-x-4 gap-y-2">
                  <div className="flex items-end gap-2.5">
                    <span className="text-2xl sm:text-3xl font-bold text-white/95 font-mono tracking-tight leading-none">{fmtPrice(selectedAsset.type, selectedAsset.price)}</span>
                    <div className="flex items-center gap-1 mb-0.5">
                      {(selectedAsset.change24h ?? 0) >= 0 ? <ArrowUpRight className="h-4 w-4 sm:h-5 sm:w-5 text-[#03DAC6]" /> : <ArrowDownRight className="h-4 w-4 sm:h-5 sm:w-5 text-[#CF6679]" />}
                      <span className={cn('text-sm sm:text-lg font-mono font-bold', (selectedAsset.change24h ?? 0) >= 0 ? 'text-[#03DAC6]' : 'text-[#CF6679]')}>
                        {(selectedAsset.change24h ?? 0) >= 0 ? '+' : ''}{toF(selectedAsset.change24h)}%
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mb-0.5 ml-auto">
                    <Badge className="text-[11px] sm:text-xs px-2.5 sm:px-3 py-1 h-6 font-bold border-0"
                      style={{ backgroundColor: `${getSignalColor(selectedAsset.signalStrength)}20`, color: getSignalColor(selectedAsset.signalStrength), boxShadow: `0 0 16px ${getSignalColor(selectedAsset.signalStrength)}20` }}>
                      {getSignalLabel(selectedAsset.overallSignal, selectedAsset.signalStrength)}
                    </Badge>
                    {selectedAsset.aiAnalysis && (
                      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/[0.04]">
                        <Brain className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-[#03DAC6]" />
                        <span className="text-[10px] sm:text-[11px] font-mono font-bold" style={{ color: getSignalColor(selectedAsset.signalStrength) }}>
                          {selectedAsset.aiAnalysis.confidence}%
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                {/* Separator */}
                <div className="mt-4 h-px bg-white/[0.06]" />
              </DialogHeader>

              {/* ── Dialog Body ────────────────────────────────────────────────── */}
              <ScrollArea className="max-h-[calc(92vh-200px)]">
                <div className="px-4 sm:px-6 py-5 space-y-5">
                  {/* ── Live Market Data (from CoinGecko) ── */}
                  {selectedAsset.marketDetail && (() => {
                    const md = selectedAsset.marketDetail;
                    return (
                      <div className="rounded-xl bg-[#1A1A2E] border border-white/[0.06] p-4 sm:p-5">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <div className="flex h-5 w-5 items-center justify-center rounded-md bg-[#03DAC6]/10">
                              <Activity className="h-3 w-3 text-[#03DAC6]" />
                            </div>
                            <span className="text-[11px] text-white/40 uppercase tracking-wider font-bold">Live Market Data</span>
                          </div>
                          <Badge className="text-[8px] px-1.5 py-0 h-3.5 font-mono border-0" style={{
                            backgroundColor: 'rgba(3,218,198,0.1)',
                            color: '#03DAC6',
                          }}>
                            {md.source}
                          </Badge>
                        </div>

                        {/* Main stats grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
                          {md.marketCapRank != null && (
                            <div className="rounded-lg bg-white/[0.02] p-2.5 text-center">
                              <Trophy className="h-3.5 w-3.5 text-[#FFD700]/50 mx-auto mb-1" />
                              <span className="text-[8px] text-white/25 uppercase tracking-wider block">Rank</span>
                              <span className="text-sm font-bold font-mono text-white/70">#{md.marketCapRank}</span>
                            </div>
                          )}
                          {md.marketCap != null && (
                            <div className="rounded-lg bg-white/[0.02] p-2.5 text-center">
                              <span className="text-[8px] text-white/25 uppercase tracking-wider block">Market Cap</span>
                              <span className="text-sm font-bold font-mono text-white/70">{formatMarketCap(md.marketCap)}</span>
                            </div>
                          )}
                          {md.totalVolume != null && (
                            <div className="rounded-lg bg-white/[0.02] p-2.5 text-center">
                              <span className="text-[8px] text-white/25 uppercase tracking-wider block">Volume 24h</span>
                              <span className="text-sm font-bold font-mono text-white/70">{formatMarketCap(md.totalVolume)}</span>
                            </div>
                          )}
                          {md.circulatingSupply != null && (
                            <div className="rounded-lg bg-white/[0.02] p-2.5 text-center">
                              <span className="text-[8px] text-white/25 uppercase tracking-wider block">Supply</span>
                              <span className="text-sm font-bold font-mono text-white/70">{formatCompact(md.circulatingSupply)}</span>
                            </div>
                          )}
                        </div>

                        {/* 24h Range bar */}
                        {md.high24h != null && md.low24h != null && selectedAsset.price > 0 && (() => {
                          const range = md.high24h - md.low24h;
                          const position = range > 0 ? ((selectedAsset.price - md.low24h) / range) * 100 : 50;
                          return (
                            <div className="rounded-lg bg-white/[0.02] p-3 mb-3">
                              <div className="flex items-center justify-between mb-1.5">
                                <span className="text-[9px] text-white/25 uppercase tracking-wider font-bold">24h Price Range</span>
                              </div>
                              <div className="relative h-1.5 rounded-full bg-gradient-to-r from-[#CF6679]/30 via-[#FFD700]/20 to-[#03DAC6]/30 mb-2">
                                <div
                                  className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white border-2 border-[#03DAC6] shadow-lg shadow-[#03DAC6]/30 transition-all"
                                  style={{ left: `calc(${Math.min(Math.max(position, 2), 98)}% - 6px)` }}
                                />
                              </div>
                              <div className="flex items-center justify-between">
                                <div className="text-left">
                                  <span className="text-[8px] text-white/20 uppercase block">Low</span>
                                  <span className="text-[11px] font-mono text-[#CF6679]/70">${md.low24h < 1 ? md.low24h.toFixed(6) : formatCompact(md.low24h)}</span>
                                </div>
                                <div className="text-center">
                                  <span className="text-[8px] text-white/20 uppercase block">Current</span>
                                  <span className="text-[11px] font-mono text-white/60">${selectedAsset.price < 1 ? selectedAsset.price.toFixed(6) : formatCompact(selectedAsset.price)}</span>
                                </div>
                                <div className="text-right">
                                  <span className="text-[8px] text-white/20 uppercase block">High</span>
                                  <span className="text-[11px] font-mono text-[#03DAC6]/70">${md.high24h < 1 ? md.high24h.toFixed(6) : formatCompact(md.high24h)}</span>
                                </div>
                              </div>
                            </div>
                          );
                        })()}

                        {/* Price changes row */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {md.priceChangePercentage7d != null && (
                            <div className="rounded-lg bg-white/[0.02] p-2.5 text-center">
                              <span className="text-[8px] text-white/25 uppercase tracking-wider block mb-0.5">7d Change</span>
                              <span className={cn('text-xs font-mono font-bold', md.priceChangePercentage7d >= 0 ? 'text-[#03DAC6]' : 'text-[#CF6679]')}>
                                {md.priceChangePercentage7d >= 0 ? '+' : ''}{md.priceChangePercentage7d.toFixed(2)}%
                              </span>
                            </div>
                          )}
                          {md.priceChangePercentage30d != null && (
                            <div className="rounded-lg bg-white/[0.02] p-2.5 text-center">
                              <span className="text-[8px] text-white/25 uppercase tracking-wider block mb-0.5">30d Change</span>
                              <span className={cn('text-xs font-mono font-bold', md.priceChangePercentage30d >= 0 ? 'text-[#03DAC6]' : 'text-[#CF6679]')}>
                                {md.priceChangePercentage30d >= 0 ? '+' : ''}{md.priceChangePercentage30d.toFixed(2)}%
                              </span>
                            </div>
                          )}
                          {md.ath != null && (
                            <div className="rounded-lg bg-white/[0.02] p-2.5 text-center">
                              <span className="text-[8px] text-white/25 uppercase tracking-wider block mb-0.5">ATH</span>
                              <span className="text-[10px] font-mono text-white/50">${md.ath < 1 ? md.ath.toFixed(6) : formatCompact(md.ath)}</span>
                              {md.athChangePercentage != null && (
                                <span className="text-[9px] text-[#CF6679]/50 font-mono block">({md.athChangePercentage.toFixed(1)}%)</span>
                              )}
                            </div>
                          )}
                        </div>

                        {/* 7d Sparkline */}
                        {md.sparkline7d && md.sparkline7d.length > 10 && (
                          <div className="mt-3 pt-3 border-t border-white/[0.04]">
                            <span className="text-[8px] text-white/25 uppercase tracking-wider font-bold block mb-2">7 Day Price</span>
                            <MiniSparkline data={md.sparkline7d} />
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* Two-column grid: desktop side-by-side, mobile stacked */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                    {/* Column 1: Signal Overview + Indicators + Breakdown */}
                    <div className="space-y-4">
                      {/* Signal Overview Card */}
                      <div className="rounded-xl bg-[#1A1A2E] border border-white/[0.06] p-4 sm:p-5 space-y-4">
                        <div className="flex items-center gap-2">
                          <div className="flex h-6 w-6 items-center justify-center rounded-lg" style={{ backgroundColor: `${getSignalColor(selectedAsset.signalStrength)}15` }}>
                            <Activity className="h-3.5 w-3.5" style={{ color: getSignalColor(selectedAsset.signalStrength) }} />
                          </div>
                          <span className="text-[11px] text-white/40 uppercase tracking-wider font-bold">Signal Overview</span>
                        </div>
                        <SignalBar strength={selectedAsset.signalStrength} />
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] text-white/40 uppercase tracking-wider font-medium">{tf('quant.signal', 'Signal')}</span>
                          <div className="flex items-center gap-2">
                            {selectedAsset.overallSignal === 'buy' ? <CheckCircle2 className="h-5 w-5 text-[#03DAC6]" /> : selectedAsset.overallSignal === 'sell' ? <AlertTriangle className="h-5 w-5 text-[#CF6679]" /> : <Minus className="h-5 w-5 text-[#FFD700]" />}
                            <span className="text-lg font-black font-mono" style={{ color: getSignalColor(selectedAsset.signalStrength) }}>
                              {selectedAsset.overallSignal === 'buy' ? 'BUY' : selectedAsset.overallSignal === 'sell' ? 'SELL' : 'NEUTRAL'}
                            </span>
                            {selectedAsset.aiAnalysis?.riskRewardRatio && selectedAsset.aiAnalysis.riskRewardRatio > 0 && (
                              <Badge className="text-[8px] px-1.5 py-0 h-3.5 font-black border-0" style={{
                                backgroundColor: 'rgba(255,215,0,0.15)',
                                color: '#FFD700',
                              }}>
                                R:R {selectedAsset.aiAnalysis.riskRewardRatio}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Technical Indicators */}
                      <div>
                        <span className="text-[11px] text-white/40 uppercase tracking-wider font-bold flex items-center gap-1.5 mb-3">
                          <BarChart3 className="h-3.5 w-3.5" /> {tf('quant.indicators', 'Indicators')}
                        </span>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="rounded-xl bg-[#1A1A2E] border border-white/[0.06] p-3 sm:p-4"><RSIGauge value={selectedAsset.indicators?.rsi?.value} /></div>
                          <div className="rounded-xl bg-[#1A1A2E] border border-white/[0.06] p-3 sm:p-4"><MACDHistogram macd={selectedAsset.indicators?.macd?.value} signal={selectedAsset.indicators?.macd?.signal} histogram={selectedAsset.indicators?.macd?.histogram} /></div>
                          <div className="rounded-xl bg-[#1A1A2E] border border-white/[0.06] p-3 sm:p-4"><BollingerBandsInfo upper={selectedAsset.indicators?.bollingerBands?.upper} middle={selectedAsset.indicators?.bollingerBands?.middle} lower={selectedAsset.indicators?.bollingerBands?.lower} price={selectedAsset.price} /></div>
                          {selectedAsset.indicators?.sma20 && selectedAsset.indicators?.sma50 && selectedAsset.indicators?.ema12 && selectedAsset.indicators?.ema26 && (
                            <div className="rounded-xl bg-[#1A1A2E] border border-white/[0.06] p-3 sm:p-4"><MovingAverageSection sma20={selectedAsset.indicators?.sma20} sma50={selectedAsset.indicators?.sma50} ema12={selectedAsset.indicators?.ema12} ema26={selectedAsset.indicators?.ema26} /></div>
                          )}
                        </div>
                      </div>

                      {/* Signal Breakdown */}
                      <div className="rounded-xl bg-[#1A1A2E] border border-white/[0.06] p-4 sm:p-5">
                        <span className="text-[11px] text-white/40 uppercase tracking-wider font-bold flex items-center gap-1.5 mb-3">
                          <Target className="h-3.5 w-3.5" /> Signal Breakdown
                        </span>
                        <div className="space-y-1.5 max-h-[240px] overflow-y-auto custom-scrollbar pr-1">
                          {selectedAsset.signalDetails.map(detail => {
                            const signalColor = detail.signal === 'BUY' || detail.signal === 'BULLISH' ? '#03DAC6' : detail.signal === 'SELL' || detail.signal === 'BEARISH' ? '#CF6679' : '#FFD700';
                            return (
                              <div key={detail.indicator} className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-white/[0.02] hover:bg-white/[0.04] transition-colors">
                                <div className="flex items-center gap-3 min-w-0">
                                  <span className="text-xs text-white/60 font-medium shrink-0">{detail.indicator}</span>
                                  <Badge className="text-[9px] px-1.5 py-0 h-4 font-bold border-0 shrink-0" style={{ backgroundColor: `${signalColor}15`, color: signalColor }}>{detail.signal}</Badge>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  <div className="h-1.5 w-14 sm:w-16 rounded-full bg-white/[0.06] overflow-hidden">
                                    <div className="h-full rounded-full transition-all duration-500" style={{ width: `${detail.weight}%`, backgroundColor: signalColor }} />
                                  </div>
                                  <span className="text-[10px] text-white/30 font-mono w-8 text-right">{detail.weight}%</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {/* Column 2: SMC + AI + Trade Zones */}
                    <div className="space-y-4">
                      {/* SMC Analysis */}
                      {selectedAsset.smc && (
                        <div className="rounded-xl bg-[#1A1A2E] border border-white/[0.06] p-4 sm:p-5">
                          {renderSMCPanel(selectedAsset.smc)}
                        </div>
                      )}

                      {/* AI Analysis */}
                      {selectedAsset.aiAnalysis && (
                        <div className="rounded-xl bg-[#1A1A2E] border border-white/[0.06] p-4 sm:p-5">
                          {renderAIPanel(selectedAsset.aiAnalysis, selectedAsset.newsConfirmation)}
                        </div>
                      )}

                      {/* Trade Zones & Forecast */}
                      {selectedAsset.aiAnalysis && (
                        <div className="rounded-xl bg-[#1A1A2E] border border-white/[0.06] p-4 sm:p-5">
                          {renderTradeZonesPanel(selectedAsset.aiAnalysis)}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Last updated timestamp */}
                  <div className="flex items-center justify-center gap-2 text-white/15 pt-2 border-t border-white/[0.04]">
                    <Eye className="h-3 w-3" />
                    <span className="text-[10px] font-mono">{new Date(selectedAsset.lastUpdated).toLocaleString()}</span>
                  </div>
                </div>
              </ScrollArea>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Custom scrollbar style ──────────────────────────────────────────── */}
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.08); border-radius: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255, 255, 255, 0.15); }
      `}</style>
    </div>
  );
}
