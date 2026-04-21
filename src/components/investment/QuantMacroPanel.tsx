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
    bollingerBands: { upper: number; middle: number; lower: number; signal: string };
    sma20: number;
    sma50: number;
    ema12: number;
    ema26: number;
  };
  overallSignal: 'buy' | 'sell' | 'neutral';
  signalStrength: number;
  signalDetails: Array<{ indicator: string; signal: string; weight: number }>;
  lastUpdated: string;
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
  timestamp: string;
}

// ── Design Tokens ────────────────────────────────────────────────────────────

const TYPE_COLORS: Record<string, { bg: string; text: string; hex: string }> = {
  saham: { bg: 'rgba(187,134,252,0.12)', text: '#BB86FC', hex: '#BB86FC' },
  crypto: { bg: 'rgba(3,218,198,0.12)', text: '#03DAC6', hex: '#03DAC6' },
  forex: { bg: 'rgba(207,102,121,0.12)', text: '#CF6679', hex: '#CF6679' },
  komoditas: { bg: 'rgba(255,215,0,0.12)', text: '#FFD700', hex: '#FFD700' },
  indeks: { bg: 'rgba(100,181,246,0.12)', text: '#64B5F6', hex: '#64B5F6' },
};

const STRONG_BUY_COLOR = '#03DAC6';
const BUY_COLOR = '#03DAC6';
const NEUTRAL_COLOR = '#FFD700';
const SELL_COLOR = '#CF6679';
const STRONG_SELL_COLOR = '#CF6679';
const UP_COLOR = '#03DAC6';
const DOWN_COLOR = '#CF6679';
const GOLD_COLOR = '#FFD54F';

// ── Formatting Helpers ───────────────────────────────────────────────────────

function formatLargeNumber(num: number): string {
  if (num >= 1e12) return `$${(num / 1e12).toFixed(2)}T`;
  if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;
  if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`;
  if (num >= 1e3) return `$${(num / 1e3).toFixed(2)}K`;
  return `$${num.toFixed(2)}`;
}

function formatVolume(num: number): string {
  if (num >= 1e12) return `${(num / 1e12).toFixed(2)}T`;
  if (num >= 1e9) return `${(num / 1e9).toFixed(2)}B`;
  if (num >= 1e6) return `${(num / 1e6).toFixed(2)}M`;
  if (num >= 1e3) return `${(num / 1e3).toFixed(1)}K`;
  return num.toFixed(0);
}

const compactFmt = new Intl.NumberFormat('en-US', {
  notation: 'compact',
  compactDisplay: 'short',
  maximumFractionDigits: 2,
});

function formatMarketCap(value: number): string {
  return `$${compactFmt.format(value)}`;
}

function formatCompact(value: number): string {
  return compactFmt.format(value);
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

function RSIGauge({ value }: { value: number }) {
  const pct = Math.min(100, Math.max(0, value));
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
        <span className="text-xs font-mono font-bold" style={{ color: zoneColor }}>{value.toFixed(1)}</span>
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
          transition={{ duration: 0.8, ease: 'easeOut' }}
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
          transition={{ duration: 0.6, ease: 'easeOut' }}
        />
      </div>
      <div className="flex justify-between text-[9px] text-white/25 font-mono">
        <span className="text-[#CF6679]/60">-100</span><span>0</span><span className="text-[#03DAC6]/60">+100</span>
      </div>
    </div>
  );
}

function MACDHistogram({ macd, signal, histogram }: { macd: number; signal: number; histogram: number }) {
  const bars = useMemo(() => {
    const result: number[] = [];
    const absMax = Math.max(Math.abs(macd), Math.abs(signal), Math.abs(histogram), 0.01);
    for (let i = 0; i < 7; i++) {
      const seed = macd * (i + 1) + signal * (i + 2) + histogram * (i + 3);
      const val = ((Math.sin(seed) + Math.cos(histogram * i)) / 2) * absMax * 0.8;
      result.push(parseFloat(val.toFixed(6)));
    }
    return result;
  }, [macd, signal, histogram]);
  const maxAbs = Math.max(...bars.map(Math.abs), 0.01);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-white/40 uppercase tracking-wider font-medium flex items-center gap-1">
          <Waves className="h-3 w-3" /> MACD
        </span>
        <Badge className="text-[9px] px-1.5 py-0 h-4 font-medium border-0"
          style={{ backgroundColor: histogram >= 0 ? 'rgba(3,218,198,0.15)' : 'rgba(207,102,121,0.15)', color: histogram >= 0 ? '#03DAC6' : '#CF6679' }}>
          {histogram >= 0 ? 'Bullish' : 'Bearish'}
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
        <div><span className="text-white/30">MACD </span><span style={{ color: macd >= 0 ? '#03DAC6' : '#CF6679' }}>{macd.toFixed(4)}</span></div>
        <div><span className="text-white/30">Signal </span><span className="text-white/60">{signal.toFixed(4)}</span></div>
        <div><span className="text-white/30">Hist </span><span style={{ color: histogram >= 0 ? '#03DAC6' : '#CF6679' }}>{histogram.toFixed(4)}</span></div>
      </div>
    </div>
  );
}

function BollingerBandsInfo({ upper, middle, lower, price }: { upper: number; middle: number; lower: number; price: number }) {
  const range = upper - lower;
  const position = range > 0 ? ((price - lower) / range) * 100 : 50;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-white/40 uppercase tracking-wider font-medium flex items-center gap-1">
          <Layers className="h-3 w-3" /> Bollinger Bands
        </span>
        <Badge className="text-[9px] px-1.5 py-0 h-4 font-medium border-0"
          style={{ backgroundColor: price <= lower ? 'rgba(3,218,198,0.15)' : price >= upper ? 'rgba(207,102,121,0.15)' : 'rgba(255,215,0,0.15)', color: price <= lower ? '#03DAC6' : price >= upper ? '#CF6679' : '#FFD700' }}>
          {price <= lower ? 'Below Lower' : price >= upper ? 'Above Upper' : 'Within'}
        </Badge>
      </div>
      <div className="relative h-6 rounded bg-white/[0.04] overflow-hidden">
        <div className="absolute inset-x-0 top-0 bottom-0 bg-[#03DAC6]/5" />
        <motion.div className="absolute top-0 bottom-0 w-0.5"
          style={{ left: `${Math.min(100, Math.max(0, position))}%`, backgroundColor: price <= lower ? '#03DAC6' : price >= upper ? '#CF6679' : '#FFD700', boxShadow: `0 0 6px ${price <= lower ? '#03DAC680' : price >= upper ? '#CF667980' : '#FFD70080'}` }}
          initial={{ left: '50%' }} animate={{ left: `${Math.min(100, Math.max(0, position))}%` }} transition={{ duration: 0.6 }} />
      </div>
      <div className="grid grid-cols-3 gap-1 text-[10px] font-mono">
        <div className="text-right"><span className="text-white/25">Upper </span><span className="text-[#CF6679]/80">{upper.toLocaleString()}</span></div>
        <div className="text-center"><span className="text-white/25">Mid </span><span className="text-white/50">{middle.toLocaleString()}</span></div>
        <div><span className="text-white/25">Lower </span><span className="text-[#03DAC6]/80">{lower.toLocaleString()}</span></div>
      </div>
    </div>
  );
}

function MovingAverageSection({ sma20, sma50, ema12, ema26 }: { sma20: number; sma50: number; ema12: number; ema26: number }) {
  const smaGoldenCross = sma20 > sma50;
  const emaGoldenCross = ema12 > ema26;

  return (
    <div className="space-y-2">
      <span className="text-[10px] text-white/40 uppercase tracking-wider font-medium flex items-center gap-1">
        <GitBranch className="h-3 w-3" /> Moving Averages
      </span>
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-lg bg-white/[0.03] p-2 space-y-1">
          <div className="flex items-center justify-between"><span className="text-[10px] text-white/40 font-mono">SMA 20</span><span className="text-[11px] font-mono text-white/70">{sma20.toLocaleString()}</span></div>
          <div className="flex items-center justify-between"><span className="text-[10px] text-white/40 font-mono">SMA 50</span><span className="text-[11px] font-mono text-white/70">{sma50.toLocaleString()}</span></div>
          <Badge className="text-[9px] px-1.5 py-0 h-4 font-medium border-0"
            style={{ backgroundColor: smaGoldenCross ? 'rgba(3,218,198,0.15)' : 'rgba(207,102,121,0.15)', color: smaGoldenCross ? '#03DAC6' : '#CF6679' }}>
            {smaGoldenCross ? 'Golden Cross ↑' : 'Death Cross ↓'}
          </Badge>
        </div>
        <div className="rounded-lg bg-white/[0.03] p-2 space-y-1">
          <div className="flex items-center justify-between"><span className="text-[10px] text-white/40 font-mono">EMA 12</span><span className="text-[11px] font-mono text-white/70">{ema12.toLocaleString()}</span></div>
          <div className="flex items-center justify-between"><span className="text-[10px] text-white/40 font-mono">EMA 26</span><span className="text-[11px] font-mono text-white/70">{ema26.toLocaleString()}</span></div>
          <Badge className="text-[9px] px-1.5 py-0 h-4 font-medium border-0"
            style={{ backgroundColor: emaGoldenCross ? 'rgba(3,218,198,0.15)' : 'rgba(207,102,121,0.15)', color: emaGoldenCross ? '#03DAC6' : '#CF6679' }}>
            {emaGoldenCross ? 'Bullish EMA ↑' : 'Bearish EMA ↓'}
          </Badge>
        </div>
      </div>
    </div>
  );
}

function DominanceBar({ value, color }: { value: number; color: string }) {
  return (
    <div className="flex items-center gap-2 mt-1">
      <div className="h-1.5 w-full bg-white/[0.06] rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${Math.min(value, 100).toFixed(1)}%`, backgroundColor: color }} />
      </div>
      <span className="text-[10px] text-white/25 font-mono shrink-0 w-9 text-right">{value.toFixed(1)}%</span>
    </div>
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
  onAddToWatchlist: (symbol: string) => void;
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
                {item.type.toUpperCase()}
              </Badge>
            </div>
            {!item.isWatchlist && (
              <button
                className="p-1.5 rounded-md text-white/20 hover:text-[#FFD700] hover:bg-white/[0.06] transition-colors opacity-0 group-hover:opacity-100"
                onClick={(e) => { e.stopPropagation(); onAddToWatchlist(item.symbol); }}
              >
                <Star className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Price & change */}
          <div className="mb-3">
            {signal ? (
              <>
                <p className="text-lg font-bold text-white/95 font-mono">{fmtPrice(item.type, signal.price)}</p>
                <div className="flex items-center gap-1 mt-0.5">
                  {isUp ? <ArrowUpRight className="h-3 w-3 text-[#03DAC6]" /> : <ArrowDownRight className="h-3 w-3 text-[#CF6679]" />}
                  <span className={cn('text-xs font-mono font-medium', isUp ? 'text-[#03DAC6]' : 'text-[#CF6679]')}>
                    {isUp ? '+' : ''}{signal.change24h.toFixed(2)}%
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

          {/* Mini indicators */}
          {signal && (
            <div className="flex items-center gap-3 mt-3 pt-2 border-t border-white/[0.04]">
              <div className="flex items-center gap-1">
                <span className="text-[9px] text-white/25">RSI</span>
                <span className={cn('text-[10px] font-mono font-bold', signal.indicators.rsi.value < 30 || signal.indicators.rsi.value > 70 ? 'text-[#CF6679]' : 'text-[#03DAC6]')}>
                  {signal.indicators.rsi.value.toFixed(1)}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-[9px] text-white/25">MACD</span>
                <span className={cn('text-[10px] font-mono font-bold', signal.indicators.macd.histogram >= 0 ? 'text-[#03DAC6]' : 'text-[#CF6679]')}>
                  {signal.indicators.macd.histogram >= 0 ? '▲' : '▼'}
                </span>
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

  // ── Fetch portfolio ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!businessId) return;
    let cancelled = false;
    fetch(`/api/business/${businessId}/portfolio`)
      .then(res => res.ok ? res.json() : { portfolios: [] })
      .then(data => {
        if (!cancelled) {
          setPortfolioItems((data.portfolios || []).filter((p: PortfolioItem) => p.status === 'open'));
          setLoadingPortfolio(false);
        }
      })
      .catch(() => {
        if (!cancelled) { setPortfolioItems([]); setLoadingPortfolio(false); }
      });
    return () => { cancelled = true; };
  }, [businessId]);

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

  const handleAddToWatchlist = useCallback((symbol: string) => {
    toast.success(`${symbol} added to watchlist`);
  }, []);

  const handleSelectTrending = useCallback((asset: TrendingAsset) => {
    if (!businessId) return;
    fetch(`/api/business/${businessId}/market-data/technical?type=${asset.type}&symbol=${asset.symbol}`)
      .then(res => res.ok ? res.json() : null)
      .then(data => { if (data) setSelectedAsset(data); })
      .catch(() => toast.error('Failed to load analysis'));
  }, [businessId]);

  // ── Computed ───────────────────────────────────────────────────────────────
  const signalArray = useMemo(() => Array.from(signals.values()), [signals]);

  const sentiment = useMemo(() => (macroData ? getSentiment(macroData.global.marketCapChange24h, t) : null), [macroData, t]);

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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (<Skeleton key={i} className="h-20 rounded-xl bg-[#1A1A2E]" />))}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {Array.from({ length: 3 }).map((_, i) => (<Skeleton key={i} className="h-40 rounded-xl bg-[#1A1A2E]" />))}
        </div>
      </div>
    );
  }

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
      { label: t('macro.totalMarketCap'), value: formatMarketCap(g.totalMarketCap), sub: `${g.marketCapChange24h >= 0 ? '+' : ''}${g.marketCapChange24h.toFixed(1)}%`, icon: Globe, color: g.marketCapChange24h >= 0 ? UP_COLOR : DOWN_COLOR },
      { label: t('macro.totalVolume'), value: formatMarketCap(g.totalVolume), sub: `${((g.totalVolume / g.totalMarketCap) * 100).toFixed(2)}% of mcap`, icon: BarChart3, color: '#BB86FC' },
      { label: t('macro.btcDominance'), value: `${g.btcDominance.toFixed(1)}%`, sub: <DominanceBar value={g.btcDominance} color="#F7931A" />, icon: Coins, color: '#F7931A' },
      { label: t('macro.ethDominance'), value: `${g.ethDominance.toFixed(1)}%`, sub: <DominanceBar value={g.ethDominance} color="#627EEA" />, icon: Layers, color: '#627EEA' },
      { label: t('macro.activeCryptos'), value: formatCompact(g.activeCryptos), sub: 'tracked assets', icon: Zap, color: '#03DAC6' },
      { label: t('macro.marketChange24h'), value: `${g.marketCapChange24h >= 0 ? '+' : ''}${g.marketCapChange24h.toFixed(1)}%`, sub: '24 hours', icon: g.marketCapChange24h >= 0 ? TrendingUp : TrendingDown, color: g.marketCapChange24h >= 0 ? UP_COLOR : DOWN_COLOR },
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
                    <p className="text-[11px] text-white/25 font-mono mt-1">{g.marketCapChange24h >= 0 ? '+' : ''}{g.marketCapChange24h.toFixed(2)}% 24h</p>
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
                      <div className="h-full rounded-full transition-all duration-700" style={{ width: `${Math.min((altcoinMarketCap / g.totalMarketCap) * 100, 100).toFixed(1)}%`, backgroundColor: '#BB86FC' }} />
                    </div>
                    <p className="text-[10px] text-white/25 mt-1 font-mono">{((altcoinMarketCap / g.totalMarketCap) * 100).toFixed(1)}% of total</p>
                  </div>
                  <Separator className="bg-white/[0.04]" />
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[11px] text-white/50 font-medium">{t('macro.turnoverRate')}</span>
                      <span className="text-sm font-bold text-white/80 font-mono">{turnoverRate.toFixed(2)}%</span>
                    </div>
                    <div className="h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-700" style={{ width: `${Math.min(turnoverRate * 4, 100).toFixed(1)}%`, backgroundColor: turnoverRate > 5 ? UP_COLOR : turnoverRate > 3 ? GOLD_COLOR : DOWN_COLOR }} />
                    </div>
                    <p className="text-[10px] text-white/25 mt-1 font-mono">Vol / MCap ratio</p>
                  </div>
                  <Separator className="bg-white/[0.04]" />
                  <div className="grid grid-cols-2 gap-4">
                    <div><p className="text-[10px] text-white/25 uppercase mb-0.5">BTC + ETH</p><p className="text-base font-bold text-white/80 font-mono">{(g.btcDominance + g.ethDominance).toFixed(1)}%</p></div>
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
                        <div className="flex items-center gap-1.5"><ArrowUpRight className="h-3.5 w-3.5 text-[#03DAC6]" /><span className="text-xs font-bold font-mono text-[#03DAC6]">+{item.change24h.toFixed(2)}%</span></div>
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
                        <div className="flex items-center gap-1.5"><ArrowDownRight className="h-3.5 w-3.5 text-[#CF6679]" /><span className="text-xs font-bold font-mono text-[#CF6679]">{item.change24h.toFixed(2)}%</span></div>
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
                            <span className="text-[11px] font-bold font-mono" style={{ color }}>{isUp ? '+' : ''}{item.change24h.toFixed(2)}%</span>
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
              { label: 'BTC Dominance', value: `${macroData.global.btcDominance.toFixed(1)}%`, change: null, icon: TrendingUp },
              { label: 'ETH Dominance', value: `${macroData.global.ethDominance.toFixed(1)}%`, change: null, icon: Layers },
              { label: 'Active Cryptos', value: macroData.global.activeCryptos.toLocaleString(), change: null, icon: Zap },
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
                        <span className={cn('text-[11px] font-mono font-medium', isUp ? 'text-[#03DAC6]' : 'text-[#CF6679]')}>{isUp ? '+' : ''}{card.change!.toFixed(2)}%</span>
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
                          style={{ backgroundColor: TYPE_COLORS[asset.type]?.bg || 'rgba(255,255,255,0.06)', color: TYPE_COLORS[asset.type]?.text || '#888' }}>
                          {asset.type.toUpperCase()}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-white/50">{asset.price}</span>
                        <span className="text-[11px] font-mono font-bold text-[#03DAC6]">+{asset.change24h.toFixed(2)}%</span>
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
                          style={{ backgroundColor: TYPE_COLORS[asset.type]?.bg || 'rgba(255,255,255,0.06)', color: TYPE_COLORS[asset.type]?.text || '#888' }}>
                          {asset.type.toUpperCase()}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-white/50">{asset.price}</span>
                        <span className="text-[11px] font-mono font-bold text-[#CF6679]">{asset.change24h.toFixed(2)}%</span>
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
        <DialogContent aria-describedby={undefined} className="max-w-3xl w-[95vw] max-h-[90vh] bg-[#0D0D0D] border-white/[0.08] p-0 gap-0 overflow-hidden">
          {selectedAsset && (
            <>
              <DialogHeader className="px-5 pt-5 pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <DialogTitle className="text-white text-base font-bold flex items-center gap-2">{selectedAsset.symbol}</DialogTitle>
                    <Badge className="text-[9px] px-2 py-0 h-4 font-medium border-0"
                      style={{ backgroundColor: TYPE_COLORS[selectedAsset.type]?.bg || 'rgba(255,255,255,0.06)', color: TYPE_COLORS[selectedAsset.type]?.text || '#888' }}>
                      {selectedAsset.type.toUpperCase()}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <button className="p-2 rounded-lg text-white/30 hover:text-[#FFD700] hover:bg-white/[0.06] transition-colors"
                      onClick={() => handleAddToWatchlist(selectedAsset.symbol)}>
                      <Star className="h-4 w-4" />
                    </button>
                    <button className="p-2 rounded-lg text-white/30 hover:text-white/60 hover:bg-white/[0.06] transition-colors"
                      onClick={() => setSelectedAsset(null)}>
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <div className="mt-3 flex items-end gap-3">
                  <span className="text-3xl font-bold text-white/95 font-mono tracking-tight">{fmtPrice(selectedAsset.type, selectedAsset.price)}</span>
                  <div className="flex items-center gap-1 mb-1">
                    {selectedAsset.change24h >= 0 ? <ArrowUpRight className="h-5 w-5 text-[#03DAC6]" /> : <ArrowDownRight className="h-5 w-5 text-[#CF6679]" />}
                    <span className={cn('text-lg font-mono font-bold', selectedAsset.change24h >= 0 ? 'text-[#03DAC6]' : 'text-[#CF6679]')}>
                      {selectedAsset.change24h >= 0 ? '+' : ''}{selectedAsset.change24h.toFixed(2)}%
                    </span>
                  </div>
                </div>
              </DialogHeader>
              <ScrollArea className="max-h-[calc(90vh-180px)]">
                <div className="px-5 pb-5 space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="rounded-xl bg-[#1A1A2E] border border-white/[0.06] p-4 space-y-3">
                      <SignalBar strength={selectedAsset.signalStrength} />
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-white/40 uppercase tracking-wider font-medium">{tf('quant.signal', 'Signal')}</span>
                        <Badge className="text-xs px-3 py-1 h-6 font-bold border-0"
                          style={{ backgroundColor: `${getSignalColor(selectedAsset.signalStrength)}20`, color: getSignalColor(selectedAsset.signalStrength), boxShadow: `0 0 16px ${getSignalColor(selectedAsset.signalStrength)}20` }}>
                          {getSignalLabel(selectedAsset.overallSignal, selectedAsset.signalStrength)}
                        </Badge>
                      </div>
                    </div>
                    <div className="rounded-xl border p-4 flex flex-col items-center justify-center text-center space-y-2"
                      style={{ backgroundColor: `${getSignalColor(selectedAsset.signalStrength)}08`, borderColor: `${getSignalColor(selectedAsset.signalStrength)}20` }}>
                      <span className="text-[10px] text-white/40 uppercase tracking-wider font-bold">{tf('quant.recommendation', 'Recommendation')}</span>
                      <div className="flex items-center gap-2">
                        {selectedAsset.overallSignal === 'buy' ? <CheckCircle2 className="h-6 w-6 text-[#03DAC6]" /> : selectedAsset.overallSignal === 'sell' ? <AlertTriangle className="h-6 w-6 text-[#CF6679]" /> : <Minus className="h-6 w-6 text-[#FFD700]" />}
                        <span className="text-2xl font-black font-mono" style={{ color: getSignalColor(selectedAsset.signalStrength) }}>
                          {selectedAsset.overallSignal === 'buy' ? tf('quant.buy', 'BUY') : selectedAsset.overallSignal === 'sell' ? tf('quant.sell', 'SELL') : tf('quant.neutral', 'NEUTRAL')}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-white/30">Confidence</span>
                        <div className="h-1.5 w-20 rounded-full bg-white/[0.06] overflow-hidden">
                          <motion.div className="h-full rounded-full" style={{ backgroundColor: getSignalColor(selectedAsset.signalStrength), width: `${Math.abs(selectedAsset.signalStrength)}%` }}
                            initial={{ width: '0%' }} animate={{ width: `${Math.abs(selectedAsset.signalStrength)}%` }} transition={{ duration: 0.8, delay: 0.3 }} />
                        </div>
                        <span className="text-xs font-mono font-bold" style={{ color: getSignalColor(selectedAsset.signalStrength) }}>{Math.abs(selectedAsset.signalStrength)}%</span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <span className="text-[10px] text-white/40 uppercase tracking-wider font-bold flex items-center gap-1.5 mb-3">
                      <BarChart3 className="h-3.5 w-3.5" /> {tf('quant.indicators', 'Indicators')}
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="rounded-xl bg-[#1A1A2E] border border-white/[0.06] p-4"><RSIGauge value={selectedAsset.indicators.rsi.value} /></div>
                      <div className="rounded-xl bg-[#1A1A2E] border border-white/[0.06] p-4"><MACDHistogram macd={selectedAsset.indicators.macd.value} signal={selectedAsset.indicators.macd.signal} histogram={selectedAsset.indicators.macd.histogram} /></div>
                      <div className="rounded-xl bg-[#1A1A2E] border border-white/[0.06] p-4"><BollingerBandsInfo upper={selectedAsset.indicators.bollingerBands.upper} middle={selectedAsset.indicators.bollingerBands.middle} lower={selectedAsset.indicators.bollingerBands.lower} price={selectedAsset.price} /></div>
                      <div className="rounded-xl bg-[#1A1A2E] border border-white/[0.06] p-4"><MovingAverageSection sma20={selectedAsset.indicators.sma20} sma50={selectedAsset.indicators.sma50} ema12={selectedAsset.indicators.ema12} ema26={selectedAsset.indicators.ema26} /></div>
                    </div>
                  </div>
                  <div className="rounded-xl bg-[#1A1A2E] border border-white/[0.06] p-4">
                    <span className="text-[10px] text-white/40 uppercase tracking-wider font-bold flex items-center gap-1.5 mb-3">
                      <Target className="h-3.5 w-3.5" /> Signal Breakdown
                    </span>
                    <div className="space-y-2">
                      {selectedAsset.signalDetails.map(detail => {
                        const signalColor = detail.signal === 'BUY' ? '#03DAC6' : detail.signal === 'SELL' ? '#CF6679' : '#FFD700';
                        return (
                          <div key={detail.indicator} className="flex items-center justify-between px-3 py-2 rounded-lg bg-white/[0.02]">
                            <div className="flex items-center gap-3">
                              <span className="text-xs text-white/60 font-medium w-16">{detail.indicator}</span>
                              <Badge className="text-[9px] px-1.5 py-0 h-4 font-bold border-0" style={{ backgroundColor: `${signalColor}15`, color: signalColor }}>{detail.signal}</Badge>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="h-1.5 w-16 rounded-full bg-white/[0.06] overflow-hidden">
                                <div className="h-full rounded-full transition-all duration-500" style={{ width: `${detail.weight}%`, backgroundColor: signalColor }} />
                              </div>
                              <span className="text-[10px] text-white/30 font-mono w-8 text-right">{detail.weight}%</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <div className="flex items-center justify-center gap-2 text-white/20">
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
