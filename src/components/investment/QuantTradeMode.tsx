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
  Scale,
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

interface MacroData {
  global: {
    totalMarketCap: number;
    totalVolume: number;
    btcDominance: number;
    ethDominance: number;
    activeCryptos: number;
    marketCapChange24h: number;
  };
  trending: TrendingAsset[];
  topGainers: TrendingAsset[];
  topLosers: TrendingAsset[];
  timestamp: string;
}

interface BacktestMetrics {
  avgRiskReward: number;
  bestRiskReward: number;
  worstRiskReward: number;
  expectedValue: number;
  winRate: number;
  totalTrades: number;
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

// ── Formatting Helpers ───────────────────────────────────────────────────────

/** Compact number formatter with thousands separator.
 *  Examples: 1,234.56 | 12,345.67 | 123,456.78 | 1.23M | 2.45B
 */
function fmtNum(val: number | undefined | null, digits = 2): string {
  const n = typeof val === 'number' && !isNaN(val) ? val : 0;
  const abs = Math.abs(n);
  // Use compact notation for very large numbers
  if (abs >= 1e12) return `${n < 0 ? '-' : ''}${(abs / 1e12).toFixed(2)}T`;
  if (abs >= 1e9) return `${n < 0 ? '-' : ''}${(abs / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `${n < 0 ? '-' : ''}${(abs / 1e6).toFixed(2)}M`;
  // Use toLocaleString for thousands separator on normal numbers
  return n.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

/** Legacy alias kept for compatibility */
function toF(val: number | undefined | null, digits = 2): string {
  return fmtNum(val, digits);
}

function formatLargeNumber(num: number | undefined | null): string {
  const n = typeof num === 'number' && !isNaN(num) ? num : 0;
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatVolume(num: number | undefined | null): string {
  const n = typeof num === 'number' && !isNaN(num) ? num : 0;
  if (n >= 1e12) return `${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `${n.toLocaleString('en-US', { maximumFractionDigits: 1 })}`;
  return n.toLocaleString('en-US', { maximumFractionDigits: 0 });
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

const fadeIn = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.3 } },
};

const slideUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' as const } },
};

// ── Inline Sub-components ────────────────────────────────────────────────────

function RiskRewardCard({ metrics, tf }: { metrics: BacktestMetrics; tf: (key: string, fallback: string) => string }) {
  const rr = metrics.avgRiskReward;
  const rrColor = rr >= 1.5 ? '#03DAC6' : rr >= 1 ? '#FFD700' : '#CF6679';
  const rrLabel = rr >= 1.5 ? tf('biz.favorableRR', 'Favorable R:R') : rr >= 1 ? tf('biz.cautionRR', 'Caution R:R') : tf('biz.poorRR', 'Poor R:R');
  const evColor = metrics.expectedValue >= 0 ? '#03DAC6' : '#CF6679';

  return (
    <div className="rounded-xl bg-[#1A1A2E] border border-white/[0.06] p-4 space-y-4">
      <div className="flex items-center gap-1.5">
        <Scale className="h-3.5 w-3.5 text-white/40" />
        <span className="text-[10px] text-white/40 uppercase tracking-wider font-bold">
          {tf('biz.riskReward', 'Risk:Reward')}
        </span>
      </div>

      {/* Average R:R Hero */}
      <div className="flex flex-col items-center space-y-2">
        <span className="text-3xl font-black font-mono tracking-tight" style={{ color: rrColor }}>
          1:{rr.toFixed(2)}
        </span>
        <Badge
          className="text-[9px] px-2 py-0.5 h-4 font-bold border-0"
          style={{
            backgroundColor: `${rrColor}20`,
            color: rrColor,
          }}
        >
          {rrLabel}
        </Badge>
      </div>

      {/* R:R Visual Bar */}
      <div className="space-y-1">
        <div className="h-2.5 rounded-full bg-white/[0.06] overflow-hidden relative">
          <div
            className="absolute left-0 top-0 h-full rounded-full transition-all duration-700"
            style={{
              width: `${Math.min(100, (rr / 3) * 100)}%`,
              backgroundColor: rrColor,
              boxShadow: `0 0 8px ${rrColor}40`,
            }}
          />
          {/* Threshold markers */}
          <div className="absolute top-0 bottom-0 w-px bg-white/30" style={{ left: '33.33%' }} />
          <div className="absolute top-0 bottom-0 w-px bg-white/30" style={{ left: '66.67%' }} />
        </div>
        <div className="flex justify-between text-[8px] text-white/25 font-mono">
          <span>0</span>
          <span className="text-[#FFD700]/50">1:1</span>
          <span className="text-[#03DAC6]/50">1:2</span>
          <span>1:3</span>
        </div>
      </div>

      {/* Detail Grid */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg bg-white/[0.03] p-2.5 space-y-1">
          <span className="text-[9px] text-white/35 uppercase tracking-wider font-medium">
            {tf('biz.bestRiskReward', 'Best R:R')}
          </span>
          <p className="text-sm font-bold font-mono text-[#03DAC6]">
            1:{metrics.bestRiskReward.toFixed(2)}
          </p>
        </div>
        <div className="rounded-lg bg-white/[0.03] p-2.5 space-y-1">
          <span className="text-[9px] text-white/35 uppercase tracking-wider font-medium">
            {tf('biz.worstRiskReward', 'Worst R:R')}
          </span>
          <p className="text-sm font-bold font-mono text-[#CF6679]">
            1:{metrics.worstRiskReward.toFixed(2)}
          </p>
        </div>
        <div className="rounded-lg bg-white/[0.03] p-2.5 space-y-1">
          <span className="text-[9px] text-white/35 uppercase tracking-wider font-medium">
            {tf('biz.expectedValue', 'Expected Value')}
          </span>
          <p className="text-sm font-bold font-mono" style={{ color: evColor }}>
            {metrics.expectedValue >= 0 ? '+' : ''}{metrics.expectedValue.toFixed(3)}%
          </p>
        </div>
        <div className="rounded-lg bg-white/[0.03] p-2.5 space-y-1">
          <span className="text-[9px] text-white/35 uppercase tracking-wider font-medium">
            {tf('biz.avgRiskReward', 'Avg R:R')}
          </span>
          <p className="text-sm font-bold font-mono text-white/80">
            1:{metrics.avgRiskReward.toFixed(2)}
          </p>
        </div>
      </div>

      {/* Trades count */}
      <div className="text-center">
        <span className="text-[9px] text-white/25 font-mono">
          Based on {metrics.totalTrades} simulated trades
        </span>
      </div>
    </div>
  );
}

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
        <span className="text-xs font-mono font-bold" style={{ color: zoneColor }}>
          {safe.toFixed(1)}
        </span>
      </div>
      <div className="relative h-3 rounded-full overflow-hidden bg-white/[0.06]">
        {/* Zones */}
        <div className="absolute inset-0 flex">
          <div className="w-[30%] bg-[#CF6679]/20" />
          <div className="w-[40%] bg-[#03DAC6]/10" />
          <div className="w-[30%] bg-[#CF6679]/20" />
        </div>
        {/* Marker */}
        <motion.div
          className="absolute top-0 bottom-0 w-1 rounded-full"
          style={{ backgroundColor: zoneColor, boxShadow: `0 0 6px ${zoneColor}80` }}
          initial={{ left: '0%' }}
          animate={{ left: `${pct}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      </div>
      <div className="flex justify-between text-[9px] text-white/25 font-mono">
        <span>0</span>
        <span className="text-[#CF6679]/50">30</span>
        <span>50</span>
        <span className="text-[#CF6679]/50">70</span>
        <span>100</span>
      </div>
      <Badge
        className="text-[9px] px-1.5 py-0 h-4 font-medium border-0 self-start"
        style={{
          backgroundColor: isOversold ? 'rgba(207,102,121,0.15)' : isOverbought ? 'rgba(207,102,121,0.15)' : 'rgba(3,218,198,0.15)',
          color: zoneColor,
        }}
      >
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
        <span className="text-xs font-mono font-bold" style={{ color }}>
          {strength > 0 ? '+' : ''}{strength}
        </span>
      </div>
      <div className="relative h-2.5 rounded-full overflow-hidden bg-white/[0.06]">
        {/* Gradient background zones */}
        <div className="absolute inset-0 flex">
          <div className="w-1/2 bg-gradient-to-r from-[#CF6679]/20 to-transparent" />
          <div className="w-1/2 bg-gradient-to-l from-[#03DAC6]/20 to-transparent" />
        </div>
        {/* Center line */}
        <div className="absolute top-0 bottom-0 left-1/2 w-px bg-white/20 -translate-x-1/2 z-10" />
        {/* Fill bar */}
        <motion.div
          className="absolute top-0 bottom-0 rounded-full"
          style={{
            backgroundColor: color,
            boxShadow: `0 0 8px ${color}40`,
            left: strength >= 0 ? '50%' : `${pct}%`,
            width: strength >= 0 ? `${pct - 50}%` : `${50 - pct}%`,
          }}
          initial={{ width: '0%', left: '50%' }}
          animate={{
            width: strength >= 0 ? `${Math.abs(pct - 50)}%` : `${Math.abs(50 - pct)}%`,
            left: strength >= 0 ? '50%' : `${pct}%`,
          }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        />
      </div>
      <div className="flex justify-between text-[9px] text-white/25 font-mono">
        <span className="text-[#CF6679]/60">-100</span>
        <span>0</span>
        <span className="text-[#03DAC6]/60">+100</span>
      </div>
    </div>
  );
}

function MACDHistogram({ macd, signal, histogram }: { macd: number | undefined | null; signal: number | undefined | null; histogram: number | undefined | null }) {
  const m = typeof macd === 'number' && !isNaN(macd) ? macd : 0;
  const s = typeof signal === 'number' && !isNaN(signal) ? signal : 0;
  const h = typeof histogram === 'number' && !isNaN(histogram) ? histogram : 0;
  // Generate a mini histogram with 7 bars
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
          <Waves className="h-3 w-3" />
          MACD
        </span>
        <Badge
          className="text-[9px] px-1.5 py-0 h-4 font-medium border-0"
          style={{
            backgroundColor: h >= 0 ? 'rgba(3,218,198,0.15)' : 'rgba(207,102,121,0.15)',
            color: h >= 0 ? '#03DAC6' : '#CF6679',
          }}
        >
          {h >= 0 ? 'Bullish' : 'Bearish'}
        </Badge>
      </div>
      <div className="flex items-end gap-1 h-12">
        {bars.map((bar, i) => {
          const height = Math.max(4, (Math.abs(bar) / maxAbs) * 40);
          const isPositive = bar >= 0;
          return (
            <motion.div
              key={i}
              className="flex-1 rounded-sm"
              style={{
                height: `${height}px`,
                backgroundColor: isPositive ? '#03DAC6' : '#CF6679',
                opacity: 0.5 + (i / bars.length) * 0.5,
              }}
              initial={{ height: 0 }}
              animate={{ height: `${height}px` }}
              transition={{ delay: i * 0.05, duration: 0.3 }}
            />
          );
        })}
      </div>
      <div className="grid grid-cols-3 gap-2 text-[10px] font-mono">
        <div>
          <span className="text-white/30">MACD </span>
          <span style={{ color: m >= 0 ? '#03DAC6' : '#CF6679' }}>{m.toFixed(4)}</span>
        </div>
        <div>
          <span className="text-white/30">Signal </span>
          <span className="text-white/60">{s.toFixed(4)}</span>
        </div>
        <div>
          <span className="text-white/30">Hist </span>
          <span style={{ color: h >= 0 ? '#03DAC6' : '#CF6679' }}>{h.toFixed(4)}</span>
        </div>
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
          <Layers className="h-3 w-3" />
          Bollinger Bands
        </span>
        <Badge
          className="text-[9px] px-1.5 py-0 h-4 font-medium border-0"
          style={{
            backgroundColor: pr <= lo ? 'rgba(3,218,198,0.15)' : pr >= u ? 'rgba(207,102,121,0.15)' : 'rgba(255,215,0,0.15)',
            color: pr <= lo ? '#03DAC6' : pr >= u ? '#CF6679' : '#FFD700',
          }}
        >
          {pr <= lo ? 'Below Lower' : pr >= u ? 'Above Upper' : 'Within'}
        </Badge>
      </div>
      <div className="relative h-6 rounded bg-white/[0.04] overflow-hidden">
        {/* Upper/lower bands area */}
        <div className="absolute inset-x-0 top-0 bottom-0 bg-[#03DAC6]/5" />
        {/* Current price marker */}
        <motion.div
          className="absolute top-0 bottom-0 w-0.5"
          style={{
            left: `${Math.min(100, Math.max(0, position))}%`,
            backgroundColor: pr <= lo ? '#03DAC6' : pr >= u ? '#CF6679' : '#FFD700',
            boxShadow: `0 0 6px ${pr <= lo ? '#03DAC680' : pr >= u ? '#CF667980' : '#FFD70080'}`,
          }}
          initial={{ left: '50%' }}
          animate={{ left: `${Math.min(100, Math.max(0, position))}%` }}
          transition={{ duration: 0.6 }}
        />
      </div>
      <div className="grid grid-cols-3 gap-1 text-[10px] font-mono">
        <div className="text-right">
          <span className="text-white/25">Upper </span>
          <span className="text-[#CF6679]/80">{fmtNum(u)}</span>
        </div>
        <div className="text-center">
          <span className="text-white/25">Mid </span>
          <span className="text-white/50">{fmtNum(md)}</span>
        </div>
        <div>
          <span className="text-white/25">Lower </span>
          <span className="text-[#03DAC6]/80">{fmtNum(lo)}</span>
        </div>
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
        <GitBranch className="h-3 w-3" />
        Moving Averages
      </span>
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-lg bg-white/[0.03] p-2 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-white/40 font-mono">SMA 20</span>
            <span className="text-[11px] font-mono text-white/70">{fmtNum(s20)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-white/40 font-mono">SMA 50</span>
            <span className="text-[11px] font-mono text-white/70">{fmtNum(s50)}</span>
          </div>
          <Badge
            className="text-[9px] px-1.5 py-0 h-4 font-medium border-0"
            style={{
              backgroundColor: smaGoldenCross ? 'rgba(3,218,198,0.15)' : 'rgba(207,102,121,0.15)',
              color: smaGoldenCross ? '#03DAC6' : '#CF6679',
            }}
          >
            {smaGoldenCross ? 'Golden Cross ↑' : 'Death Cross ↓'}
          </Badge>
        </div>
        <div className="rounded-lg bg-white/[0.03] p-2 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-white/40 font-mono">EMA 12</span>
            <span className="text-[11px] font-mono text-white/70">{fmtNum(e12)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-white/40 font-mono">EMA 26</span>
            <span className="text-[11px] font-mono text-white/70">{fmtNum(e26)}</span>
          </div>
          <Badge
            className="text-[9px] px-1.5 py-0 h-4 font-medium border-0"
            style={{
              backgroundColor: emaGoldenCross ? 'rgba(3,218,198,0.15)' : 'rgba(207,102,121,0.15)',
              color: emaGoldenCross ? '#03DAC6' : '#CF6679',
            }}
          >
            {emaGoldenCross ? 'Bullish EMA ↑' : 'Bearish EMA ↓'}
          </Badge>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────────────────────

export default function QuantTradeMode() {
  const { t } = useTranslation();
  const { activeBusiness } = useBusinessStore();
  const businessId = activeBusiness?.id;

  const [portfolioItems, setPortfolioItems] = useState<PortfolioItem[]>([]);
  const [signals, setSignals] = useState<Map<string, TechnicalAnalysis>>(new Map());
  const [macroData, setMacroData] = useState<MacroData | null>(null);
  const [selectedAsset, setSelectedAsset] = useState<TechnicalAnalysis | null>(null);
  const [loadingPortfolio, setLoadingPortfolio] = useState(true);
  const [loadingSignals, setLoadingSignals] = useState(false);
  const [loadingMacro, setLoadingMacro] = useState(true);
  const [analyzingAll, setAnalyzingAll] = useState(false);
  const [backtestMetrics, setBacktestMetrics] = useState<BacktestMetrics | null>(null);
  const abortRef = useRef<AbortController | null>(null);

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
        if (!cancelled) {
          setPortfolioItems([]);
          setLoadingPortfolio(false);
        }
      });
    return () => { cancelled = true; };
  }, [businessId]);

  // ── Fetch technical signals for portfolio assets ───────────────────────────
  const fetchSignalsForItems = useCallback(async (items: PortfolioItem[]) => {
    if (!businessId || items.length === 0) return;

    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();

    const newSignals = new Map<string, TechnicalAnalysis>();

    await Promise.allSettled(
      items.map(async (item) => {
        const key = `${item.type}:${item.symbol}`;
        try {
          const res = await fetch(
            `/api/business/${businessId}/market-data/technical?type=${item.type}&symbol=${item.symbol}`,
            { signal: abortRef.current?.signal }
          );
          if (res.ok) {
            const data = await res.json();
            newSignals.set(key, data);
          }
        } catch {
          // individual failure is ok
        }
      })
    );

    setSignals(newSignals);
    setLoadingSignals(false);
  }, [businessId]);

  // Trigger signal fetch when portfolio changes
  useEffect(() => {
    if (portfolioItems.length > 0) {
      const timer = setTimeout(() => {
        setLoadingSignals(true);
        fetchSignalsForItems(portfolioItems);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [portfolioItems, fetchSignalsForItems]);

  // ── Fetch macro data ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!businessId) return;
    let cancelled = false;
    fetch(`/api/business/${businessId}/market-data/macro`)
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (!cancelled) {
          setMacroData(data);
          setLoadingMacro(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setLoadingMacro(false);
        }
      });
    return () => { cancelled = true; };
  }, [businessId]);

  // ── Fetch single asset analysis (for trending) ────────────────────────────
  const fetchSingleAnalysis = useCallback(async (type: string, symbol: string) => {
    if (!businessId) return;
    try {
      const res = await fetch(
        `/api/business/${businessId}/market-data/technical?type=${type}&symbol=${symbol}`
      );
      if (res.ok) {
        const data = await res.json();
        setSelectedAsset(data);
      }
    } catch {
      toast.error('Failed to load analysis');
    }
  }, [businessId]);

  // ── Fetch backtest metrics when an asset is selected ─────────────────────
  useEffect(() => {
    if (!businessId || !selectedAsset) return;
    let cancelled = false;
    fetch(`/api/business/${businessId}/backtest?symbol=${encodeURIComponent(selectedAsset.symbol)}&type=${encodeURIComponent(selectedAsset.type)}&strategy=smartmoney&weeks=8`)
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (!cancelled) {
          if (data?.metrics && data.metrics.totalTrades > 0) {
            const m = data.metrics;
            setBacktestMetrics({
              avgRiskReward: m.avgRiskReward ?? 0,
              bestRiskReward: m.bestRiskReward ?? 0,
              worstRiskReward: m.worstRiskReward ?? 0,
              expectedValue: m.expectedValue ?? 0,
              winRate: m.winRate ?? 0,
              totalTrades: m.totalTrades ?? 0,
            });
          } else {
            setBacktestMetrics(null);
          }
        }
      })
      .catch(() => {
        if (!cancelled) {
          setBacktestMetrics(null);
        }
      });
    return () => { cancelled = true; };
  }, [businessId, selectedAsset]);

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleAnalyzeAll = useCallback(async () => {
    setAnalyzingAll(true);
    await fetchSignalsForItems(portfolioItems);
    setAnalyzingAll(false);
    toast.success(tf('quant.analyzing', 'Analysis complete!'));
  }, [fetchSignalsForItems, portfolioItems, tf]);

  const handleAddToWatchlist = useCallback((symbol: string) => {
    toast.success(`${symbol} added to watchlist`);
  }, []);

  const handleSelectTrending = useCallback((asset: TrendingAsset) => {
    fetchSingleAnalysis(asset.type, asset.symbol);
  }, [fetchSingleAnalysis]);

  // ── Computed ───────────────────────────────────────────────────────────────
  const signalArray = useMemo(() => Array.from(signals.values()), [signals]);

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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl bg-[#1A1A2E]" />
          ))}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-xl bg-[#1A1A2E]" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* ── Header ───────────────────────────────────────────────────────── */}
      <motion.div
        className="flex items-center justify-between flex-wrap gap-3"
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#03DAC6]/20 to-[#FFD700]/10 border border-white/[0.08]">
            <Zap className="h-5 w-5 text-[#03DAC6]" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white tracking-tight">
              {tf('quant.title', 'Quant Trade Mode')}
            </h1>
            <p className="text-[11px] text-white/35 font-medium">
              {tf('quant.technicalAnalysis', 'Technical Analysis')} • {signalArray.length} {tf('quant.portfolioSignals', 'assets analyzed')}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            className="gap-1.5 bg-[#03DAC6]/10 text-[#03DAC6] hover:bg-[#03DAC6]/20 border border-[#03DAC6]/20 text-xs font-semibold rounded-lg h-9 px-3"
            onClick={handleAnalyzeAll}
            disabled={analyzingAll || portfolioItems.length === 0}
          >
            <RefreshCw className={cn('h-3.5 w-3.5', analyzingAll && 'animate-spin')} />
            {analyzingAll ? tf('quant.analyzing', 'Analyzing...') : tf('quant.analyzeAll', 'Analyze All')}
          </Button>
        </div>
      </motion.div>

      {/* ── Global Market Overview ──────────────────────────────────────── */}
      {macroData && (
        <motion.div
          variants={fadeIn}
          initial="hidden"
          animate="visible"
        >
          <div className="flex items-center gap-2 mb-3">
            <Globe className="h-3.5 w-3.5 text-white/30" />
            <span className="text-[10px] text-white/40 uppercase tracking-wider font-bold">
              {tf('quant.globalMarket', 'Global Market')}
            </span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {[
              {
                label: 'Market Cap',
                value: formatLargeNumber(macroData.global.totalMarketCap),
                change: macroData.global.marketCapChange24h,
                icon: BarChart3,
              },
              {
                label: '24h Volume',
                value: formatLargeNumber(macroData.global.totalVolume),
                change: null,
                icon: Activity,
              },
              {
                label: 'BTC Dominance',
                value: `${toF(macroData.global.btcDominance, 1)}%`,
                change: null,
                icon: TrendingUp,
              },
              {
                label: 'ETH Dominance',
                value: `${toF(macroData.global.ethDominance, 1)}%`,
                change: null,
                icon: Layers,
              },
              {
                label: 'Active Cryptos',
                value: fmtNum(macroData.global.activeCryptos),
                change: null,
                icon: Zap,
              },
            ].map((card) => {
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
                        {isUp ? (
                          <ArrowUpRight className="h-3 w-3 text-[#03DAC6]" />
                        ) : (
                          <ArrowDownRight className="h-3 w-3 text-[#CF6679]" />
                        )}
                        <span className={cn('text-[11px] font-mono font-medium', isUp ? 'text-[#03DAC6]' : 'text-[#CF6679]')}>
                          {isUp ? '+' : ''}{toF(card.change)}%
                        </span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* ── Portfolio Signals Panel ─────────────────────────────────────── */}
      <motion.div
        variants={fadeIn}
        initial="hidden"
        animate="visible"
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Target className="h-3.5 w-3.5 text-[#FFD700]/60" />
            <span className="text-[10px] text-white/40 uppercase tracking-wider font-bold">
              {tf('quant.portfolioSignals', 'Portfolio Signals')}
            </span>
            {loadingSignals && (
              <RefreshCw className="h-3 w-3 text-white/20 animate-spin" />
            )}
          </div>
          <Badge
            className="border-0 text-[9px] font-medium"
            style={{
              backgroundColor: 'rgba(255,215,0,0.1)',
              color: '#FFD700',
            }}
          >
            {portfolioItems.length} {tf('quant.portfolioSignals', 'assets')}
          </Badge>
        </div>

        {portfolioItems.length === 0 ? (
          <Card className="bg-[#1A1A2E] border-white/[0.06]">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <BarChart3 className="h-12 w-12 text-white/10 mb-3" />
              <p className="text-white/30 text-sm">{tf('quant.noSignals', 'No signals available. Add assets to your portfolio to see analysis.')}</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <AnimatePresence mode="popLayout">
              {portfolioItems.map((item, i) => {
                const key = `${item.type}:${item.symbol}`;
                const signal = signals.get(key);
                const tc = TYPE_COLORS[item.type] || TYPE_COLORS.crypto;
                const isUp = (signal?.change24h ?? 0) >= 0;
                const strength = signal?.signalStrength ?? 0;
                const signalColor = signal ? getSignalColor(strength) : '#666';
                const signalLabel = signal ? getSignalLabel(signal.overallSignal, strength) : 'LOADING';

                return (
                  <motion.div
                    key={key}
                    custom={i}
                    variants={cardVariants}
                    initial="hidden"
                    animate="visible"
                    exit="hidden"
                    layout
                  >
                    <Card
                      className="bg-[#1A1A2E] border-white/[0.06] hover:border-white/[0.12] transition-all cursor-pointer group relative overflow-hidden"
                      onClick={() => signal && setSelectedAsset(signal)}
                    >
                      {/* Glow effect */}
                      <div
                        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                        style={{
                          background: `radial-gradient(ellipse at 50% 0%, ${signalColor}08 0%, transparent 70%)`,
                        }}
                      />

                      <CardContent className="p-4 relative">
                        {/* Header row */}
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-white/90 font-mono">{item.symbol}</span>
                            <Badge
                              className="text-[8px] px-1.5 py-0 h-4 font-medium border-0"
                              style={{ backgroundColor: tc.bg, color: tc.text }}
                            >
                              {(item.type || 'crypto').toUpperCase()}
                            </Badge>
                          </div>
                          <button
                            className="p-1.5 rounded-md text-white/20 hover:text-[#FFD700] hover:bg-white/[0.06] transition-colors opacity-0 group-hover:opacity-100"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAddToWatchlist(item.symbol);
                            }}
                          >
                            <Star className="h-3.5 w-3.5" />
                          </button>
                        </div>

                        {/* Price & change */}
                        <div className="mb-3">
                          {signal ? (
                            <>
                              <p className="text-lg font-bold text-white/95 font-mono">
                                {fmtPrice(item.type, signal.price)}
                              </p>
                              <div className="flex items-center gap-1 mt-0.5">
                                {isUp ? (
                                  <ArrowUpRight className="h-3 w-3 text-[#03DAC6]" />
                                ) : (
                                  <ArrowDownRight className="h-3 w-3 text-[#CF6679]" />
                                )}
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
                          <Badge
                            className="text-[10px] px-2 py-0.5 h-5 font-bold border-0"
                            style={{
                              backgroundColor: `${signalColor}18`,
                              color: signalColor,
                              boxShadow: `0 0 12px ${signalColor}15`,
                            }}
                          >
                            {signalLabel}
                          </Badge>
                          {signal && (
                            <span className="text-[10px] font-mono" style={{ color: signalColor }}>
                              {strength > 0 ? '+' : ''}{strength}
                            </span>
                          )}
                        </div>

                        {/* Strength bar */}
                        {signal ? (
                          <SignalBar strength={strength} />
                        ) : (
                          <Skeleton className="h-4 w-full rounded-full bg-white/[0.06]" />
                        )}

                        {/* Mini indicators */}
                        {signal && (
                          <div className="flex items-center gap-3 mt-3 pt-2 border-t border-white/[0.04]">
                            <div className="flex items-center gap-1">
                              <span className="text-[9px] text-white/25">RSI</span>
                              <span className={cn(
                                'text-[10px] font-mono font-bold',
                                (signal.indicators?.rsi?.value ?? 50) < 30 || (signal.indicators?.rsi?.value ?? 50) > 70 ? 'text-[#CF6679]' : 'text-[#03DAC6]'
                              )}>
                                {toF(signal.indicators?.rsi?.value, 1)}
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="text-[9px] text-white/25">MACD</span>
                              <span className={cn(
                                'text-[10px] font-mono font-bold',
                                (signal.indicators?.macd?.histogram ?? 0) >= 0 ? 'text-[#03DAC6]' : 'text-[#CF6679]'
                              )}>
                                {(signal.indicators?.macd?.histogram ?? 0) >= 0 ? '▲' : '▼'}
                              </span>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </motion.div>

      {/* ── Trending Assets Section ─────────────────────────────────────── */}
      {macroData && (
        <motion.div
          variants={slideUp}
          initial="hidden"
          animate="visible"
        >
          <div className="flex items-center gap-2 mb-3">
            <Activity className="h-3.5 w-3.5 text-[#03DAC6]/60" />
            <span className="text-[10px] text-white/40 uppercase tracking-wider font-bold">
              {tf('quant.trendingAssets', 'Trending Assets')}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Top Gainers */}
            <Card className="bg-[#1A1A2E] border-white/[0.06]">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUp className="h-3.5 w-3.5 text-[#03DAC6]" />
                  <span className="text-[11px] text-[#03DAC6]/80 font-bold uppercase tracking-wider">
                    {tf('quant.topGainers', 'Top Gainers')}
                  </span>
                </div>
                <div className="space-y-1.5">
                  {macroData.topGainers.map((asset) => (
                    <button
                      key={asset.symbol}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-white/[0.04] transition-colors group/trend cursor-pointer"
                      onClick={() => handleSelectTrending(asset)}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="h-1.5 w-8 rounded-full bg-[#03DAC6]/30 overflow-hidden">
                          <motion.div
                            className="h-full rounded-full bg-[#03DAC6]"
                            initial={{ width: '0%' }}
                            animate={{ width: `${Math.min(100, asset.change24h * 10)}%` }}
                            transition={{ duration: 0.5, delay: 0.2 }}
                          />
                        </div>
                        <span className="text-xs font-bold text-white/80 font-mono group-hover/trend:text-[#03DAC6] transition-colors">
                          {asset.symbol}
                        </span>
                        <Badge
                          className="text-[8px] px-1 py-0 h-3.5 font-medium border-0"
                          style={{
                            backgroundColor: TYPE_COLORS[asset.type]?.bg || 'rgba(255,255,255,0.06)',
                            color: TYPE_COLORS[asset.type]?.text || '#888',
                          }}
                        >
                          {(asset.type || 'crypto').toUpperCase()}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-white/50">{asset.price}</span>
                        <span className="text-[11px] font-mono font-bold text-[#03DAC6]">
                          +{toF(asset.change24h)}%
                        </span>
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
                  <span className="text-[11px] text-[#CF6679]/80 font-bold uppercase tracking-wider">
                    {tf('quant.topLosers', 'Top Losers')}
                  </span>
                </div>
                <div className="space-y-1.5">
                  {macroData.topLosers.map((asset) => (
                    <button
                      key={asset.symbol}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-white/[0.04] transition-colors group/trend cursor-pointer"
                      onClick={() => handleSelectTrending(asset)}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="h-1.5 w-8 rounded-full bg-[#CF6679]/30 overflow-hidden">
                          <motion.div
                            className="h-full rounded-full bg-[#CF6679]"
                            initial={{ width: '0%' }}
                            animate={{ width: `${Math.min(100, Math.abs(asset.change24h) * 10)}%` }}
                            transition={{ duration: 0.5, delay: 0.2 }}
                          />
                        </div>
                        <span className="text-xs font-bold text-white/80 font-mono group-hover/trend:text-[#CF6679] transition-colors">
                          {asset.symbol}
                        </span>
                        <Badge
                          className="text-[8px] px-1 py-0 h-3.5 font-medium border-0"
                          style={{
                            backgroundColor: TYPE_COLORS[asset.type]?.bg || 'rgba(255,255,255,0.06)',
                            color: TYPE_COLORS[asset.type]?.text || '#888',
                          }}
                        >
                          {(asset.type || 'crypto').toUpperCase()}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-white/50">{asset.price}</span>
                        <span className="text-[11px] font-mono font-bold text-[#CF6679]">
                          {toF(asset.change24h)}%
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </motion.div>
      )}

      {/* ── Expanded Analysis Dialog ─────────────────────────────────────── */}
      <Dialog open={!!selectedAsset} onOpenChange={() => setSelectedAsset(null)}>
        <DialogContent aria-describedby={undefined} className="max-w-7xl w-[95vw] max-h-[90vh] bg-[#0D0D0D] border-white/[0.08] p-0 gap-0 overflow-hidden">
          {selectedAsset && (
            <>
              {/* Dialog Header */}
              <DialogHeader className="px-5 pt-5 pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <DialogTitle className="text-white text-base font-bold flex items-center gap-2">
                      {selectedAsset.symbol}
                    </DialogTitle>
                    <Badge
                      className="text-[9px] px-2 py-0 h-4 font-medium border-0"
                      style={{
                        backgroundColor: TYPE_COLORS[selectedAsset.type]?.bg || 'rgba(255,255,255,0.06)',
                        color: TYPE_COLORS[selectedAsset.type]?.text || '#888',
                      }}
                    >
                      {(selectedAsset.type || 'crypto').toUpperCase()}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      className="p-2 rounded-lg text-white/30 hover:text-[#FFD700] hover:bg-white/[0.06] transition-colors"
                      onClick={() => handleAddToWatchlist(selectedAsset.symbol)}
                    >
                      <Star className="h-4 w-4" />
                    </button>
                    <button
                      className="p-2 rounded-lg text-white/30 hover:text-white/60 hover:bg-white/[0.06] transition-colors"
                      onClick={() => setSelectedAsset(null)}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Large Price Display */}
                <div className="mt-3 flex items-end gap-3">
                  <span className="text-3xl font-bold text-white/95 font-mono tracking-tight">
                    {fmtPrice(selectedAsset.type, selectedAsset.price)}
                  </span>
                  <div className="flex items-center gap-1 mb-1">
                    {selectedAsset.change24h >= 0 ? (
                      <ArrowUpRight className="h-5 w-5 text-[#03DAC6]" />
                    ) : (
                      <ArrowDownRight className="h-5 w-5 text-[#CF6679]" />
                    )}
                    <span className={cn(
                      'text-lg font-mono font-bold',
                      selectedAsset.change24h >= 0 ? 'text-[#03DAC6]' : 'text-[#CF6679]'
                    )}>
                      {selectedAsset.change24h >= 0 ? '+' : ''}{toF(selectedAsset.change24h)}%
                    </span>
                  </div>
                </div>
              </DialogHeader>

              {/* Content */}
              <ScrollArea className="max-h-[calc(90vh-180px)]">
                <div className="px-5 pb-5 space-y-5">
                  {/* Signal Strength & Recommendation */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="rounded-xl bg-[#1A1A2E] border border-white/[0.06] p-4 space-y-3">
                      <SignalBar strength={selectedAsset.signalStrength} />
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-white/40 uppercase tracking-wider font-medium">
                          {tf('quant.signal', 'Signal')}
                        </span>
                        <Badge
                          className="text-xs px-3 py-1 h-6 font-bold border-0"
                          style={{
                            backgroundColor: `${getSignalColor(selectedAsset.signalStrength)}20`,
                            color: getSignalColor(selectedAsset.signalStrength),
                            boxShadow: `0 0 16px ${getSignalColor(selectedAsset.signalStrength)}20`,
                          }}
                        >
                          {getSignalLabel(selectedAsset.overallSignal, selectedAsset.signalStrength)}
                        </Badge>
                      </div>
                    </div>

                    {/* Recommendation Box */}
                    <div
                      className="rounded-xl border p-4 flex flex-col items-center justify-center text-center space-y-2"
                      style={{
                        backgroundColor: `${getSignalColor(selectedAsset.signalStrength)}08`,
                        borderColor: `${getSignalColor(selectedAsset.signalStrength)}20`,
                      }}
                    >
                      <span className="text-[10px] text-white/40 uppercase tracking-wider font-bold">
                        {tf('quant.recommendation', 'Recommendation')}
                      </span>
                      <div className="flex items-center gap-2">
                        {selectedAsset.overallSignal === 'buy' ? (
                          <CheckCircle2 className="h-6 w-6 text-[#03DAC6]" />
                        ) : selectedAsset.overallSignal === 'sell' ? (
                          <AlertTriangle className="h-6 w-6 text-[#CF6679]" />
                        ) : (
                          <Minus className="h-6 w-6 text-[#FFD700]" />
                        )}
                        <span
                          className="text-2xl font-black font-mono"
                          style={{ color: getSignalColor(selectedAsset.signalStrength) }}
                        >
                          {selectedAsset.overallSignal === 'buy'
                            ? tf('quant.buy', 'BUY')
                            : selectedAsset.overallSignal === 'sell'
                            ? tf('quant.sell', 'SELL')
                            : tf('quant.neutral', 'NEUTRAL')}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-white/30">Confidence</span>
                        <div className="h-1.5 w-20 rounded-full bg-white/[0.06] overflow-hidden">
                          <motion.div
                            className="h-full rounded-full"
                            style={{
                              backgroundColor: getSignalColor(selectedAsset.signalStrength),
                              width: `${Math.abs(selectedAsset.signalStrength)}%`,
                            }}
                            initial={{ width: '0%' }}
                            animate={{ width: `${Math.abs(selectedAsset.signalStrength)}%` }}
                            transition={{ duration: 0.8, delay: 0.3 }}
                          />
                        </div>
                        <span
                          className="text-xs font-mono font-bold"
                          style={{ color: getSignalColor(selectedAsset.signalStrength) }}
                        >
                          {Math.abs(selectedAsset.signalStrength)}%
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Technical Indicators Grid */}
                  <div>
                    <span className="text-[10px] text-white/40 uppercase tracking-wider font-bold flex items-center gap-1.5 mb-3">
                      <BarChart3 className="h-3.5 w-3.5" />
                      {tf('quant.indicators', 'Indicators')}
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* RSI */}
                      <div className="rounded-xl bg-[#1A1A2E] border border-white/[0.06] p-4">
                        <RSIGauge value={selectedAsset.indicators?.rsi?.value} />
                      </div>

                      {/* MACD */}
                      <div className="rounded-xl bg-[#1A1A2E] border border-white/[0.06] p-4">
                        <MACDHistogram
                          macd={selectedAsset.indicators?.macd?.value}
                          signal={selectedAsset.indicators?.macd?.signal}
                          histogram={selectedAsset.indicators?.macd?.histogram}
                        />
                      </div>

                      {/* Bollinger Bands */}
                      <div className="rounded-xl bg-[#1A1A2E] border border-white/[0.06] p-4">
                        <BollingerBandsInfo
                          upper={selectedAsset.indicators?.bollingerBands?.upper}
                          middle={selectedAsset.indicators?.bollingerBands?.middle}
                          lower={selectedAsset.indicators?.bollingerBands?.lower}
                          price={selectedAsset.price}
                        />
                      </div>

                      {/* Moving Averages */}
                      <div className="rounded-xl bg-[#1A1A2E] border border-white/[0.06] p-4">
                        <MovingAverageSection
                          sma20={selectedAsset.indicators?.sma20}
                          sma50={selectedAsset.indicators?.sma50}
                          ema12={selectedAsset.indicators?.ema12}
                          ema26={selectedAsset.indicators?.ema26}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Signal Breakdown */}
                  <div className="rounded-xl bg-[#1A1A2E] border border-white/[0.06] p-4">
                    <span className="text-[10px] text-white/40 uppercase tracking-wider font-bold flex items-center gap-1.5 mb-3">
                      <Target className="h-3.5 w-3.5" />
                      Signal Breakdown
                    </span>
                    <div className="space-y-2">
                      {selectedAsset.signalDetails.map((detail) => {
                        const signalColor = detail.signal === 'BUY' ? '#03DAC6' : detail.signal === 'SELL' ? '#CF6679' : '#FFD700';
                        return (
                          <div key={detail.indicator} className="flex items-center justify-between px-3 py-2 rounded-lg bg-white/[0.02]">
                            <div className="flex items-center gap-3">
                              <span className="text-xs text-white/60 font-medium w-16">{detail.indicator}</span>
                              <Badge
                                className="text-[9px] px-1.5 py-0 h-4 font-bold border-0"
                                style={{
                                  backgroundColor: `${signalColor}15`,
                                  color: signalColor,
                                }}
                              >
                                {detail.signal}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="h-1.5 w-16 rounded-full bg-white/[0.06] overflow-hidden">
                                <div
                                  className="h-full rounded-full transition-all duration-500"
                                  style={{ width: `${detail.weight}%`, backgroundColor: signalColor }}
                                />
                              </div>
                              <span className="text-[10px] text-white/30 font-mono w-8 text-right">{detail.weight}%</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Risk/Reward Analysis */}
                  {backtestMetrics && backtestMetrics.totalTrades > 0 && (
                    <RiskRewardCard metrics={backtestMetrics} tf={tf} />
                  )}

                  {/* Last Updated */}
                  <div className="flex items-center justify-center gap-2 text-white/20">
                    <Eye className="h-3 w-3" />
                    <span className="text-[10px] font-mono">
                      {new Date(selectedAsset.lastUpdated).toLocaleString()}
                    </span>
                  </div>
                </div>
              </ScrollArea>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
