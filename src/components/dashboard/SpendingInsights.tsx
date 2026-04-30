'use client';

import { motion } from 'framer-motion';
import {
  Brain,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Lightbulb,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ── Types ──────────────────────────────────────────────────────
interface SpendingInsightsProps {
  data?: Array<{
    type: 'trend' | 'alert' | 'achievement' | 'tip';
    priority: 'low' | 'medium' | 'high';
    title: string;
    analysis: string;
    metric: string;
    metricValue: string;
    trend: 'up' | 'down' | 'stable';
    trendValue: number;
  }>;
}

// ── Accent Colors ──────────────────────────────────────────────
const ACCENTS = {
  purple: '#BB86FC',
  teal: '#03DAC6',
  red: '#CF6679',
  amber: '#F9A825',
  green: '#03DAC6',
  muted: '#9E9E9E',
  border: 'rgba(255,255,255,0.06)',
  text: '#FFFFFF',
  textSecondary: '#B3B3B3',
} as const;

// ── Helpers ────────────────────────────────────────────────────
const TYPE_CONFIG = {
  alert:       { icon: AlertTriangle, accent: ACCENTS.red },
  trend:       { icon: TrendingUp,    accent: ACCENTS.amber },
  achievement: { icon: TrendingDown,  accent: ACCENTS.teal },
  tip:         { icon: Lightbulb,     accent: ACCENTS.purple },
} as const;

const PRIORITY_STYLE: Record<string, { color: string; label: string }> = {
  high:   { color: ACCENTS.red,   label: 'High' },
  medium: { color: ACCENTS.amber, label: 'Medium' },
  low:    { color: ACCENTS.green, label: 'Low' },
};

// ── Default Data ───────────────────────────────────────────────
const defaultData: SpendingInsightsProps['data'] = [
  {
    type: 'alert' as const,
    priority: 'high' as const,
    title: 'Spending Acceleration Detected',
    analysis: 'Your spending increased 23% compared to last week. Consider reviewing recent purchases.',
    metric: 'Weekly Spend',
    metricValue: 'Rp 2.4M',
    trend: 'up' as const,
    trendValue: 23,
  },
  {
    type: 'trend' as const,
    priority: 'medium' as const,
    title: 'Top Category: Food & Dining',
    analysis: 'Food expenses account for 35% of total spending this month, up from 28% last month.',
    metric: 'Monthly Total',
    metricValue: 'Rp 8.5M',
    trend: 'up' as const,
    trendValue: 12,
  },
  {
    type: 'achievement' as const,
    priority: 'low' as const,
    title: 'Below Budget Target',
    analysis: 'You are Rp 500K under your monthly budget target. Great discipline!',
    metric: 'Budget Used',
    metricValue: '82%',
    trend: 'stable' as const,
    trendValue: 0,
  },
  {
    type: 'tip' as const,
    priority: 'medium' as const,
    title: 'Savings Opportunity',
    analysis: 'Switching to weekly meal prep could save approximately Rp 1.2M per month based on your patterns.',
    metric: 'Potential Savings',
    metricValue: 'Rp 1.2M',
    trend: 'up' as const,
    trendValue: 15,
  },
];

// ── Trend Badge ────────────────────────────────────────────────
function TrendBadge({ trend, value }: { trend: string; value: number }) {
  if (trend === 'stable' || value === 0) {
    return (
      <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-md"
        style={{ color: ACCENTS.muted, background: 'rgba(255,255,255,0.04)' }}>
        <Minus className="h-3 w-3" />
        Stable
      </span>
    );
  }
  const isUp = trend === 'up';
  const color = isUp ? ACCENTS.red : ACCENTS.green;
  return (
    <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-md"
      style={{ color, background: `${color}15` }}>
      {isUp ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
      {Math.abs(value)}%
    </span>
  );
}

// ── Single Insight Card ────────────────────────────────────────
function InsightCard({ insight, index }: { insight: NonNullable<SpendingInsightsProps['data']>[number]; index: number }) {
  const cfg = TYPE_CONFIG[insight.type];
  const Icon = cfg.icon;
  const prio = PRIORITY_STYLE[insight.priority];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.15 * index, ease: [0.25, 0.46, 0.45, 0.94] }}
      className={cn(
        'shrink-0 w-[272px] sm:w-[280px] lg:w-auto',
        'rounded-xl p-4 relative overflow-hidden',
        'bg-white/[0.02] border border-white/[0.06]',
        'hover:bg-white/[0.04] hover:border-white/[0.12]',
        'transition-all duration-200 group/insight',
      )}
    >
      {/* Colored glow on hover */}
      <div
        className="pointer-events-none absolute -top-8 -right-8 w-24 h-24 rounded-full blur-[44px] opacity-0 group-hover/insight:opacity-[0.1] transition-opacity duration-300"
        style={{ background: cfg.accent }}
      />

      <div className="relative z-10 space-y-3">
        {/* Header row: priority + icon */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span
              className="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full"
              style={{ background: `${prio.color}20`, color: prio.color }}
            >
              {prio.label}
            </span>
            <div
              className="w-6 h-6 rounded-md grid place-items-center [&>*]:block leading-none"
              style={{ background: `${cfg.accent}15` }}
            >
              <Icon className="h-3 w-3" style={{ color: cfg.accent }} />
            </div>
          </div>
          <TrendBadge trend={insight.trend} value={insight.trendValue} />
        </div>

        {/* Title */}
        <h4 className="text-[13px] font-semibold leading-tight" style={{ color: ACCENTS.text }}>
          {insight.title}
        </h4>

        {/* Metric */}
        <div className="flex items-baseline gap-2">
          <span className="text-[10px] font-medium uppercase tracking-wide" style={{ color: ACCENTS.muted }}>
            {insight.metric}
          </span>
          <span className="text-base font-bold tabular-nums" style={{ color: cfg.accent }}>
            {insight.metricValue}
          </span>
        </div>

        {/* Analysis */}
        <p className="text-[11px] leading-relaxed" style={{ color: ACCENTS.textSecondary }}>
          {insight.analysis}
        </p>
      </div>
    </motion.div>
  );
}

// ── Main Widget ────────────────────────────────────────────────
export function SpendingInsights({ data }: SpendingInsightsProps) {
  const insights = data ?? defaultData;

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="glass-premium shadow-premium-md rounded-2xl p-5"
    >
      {/* Header */}
      <div className="flex items-center gap-2.5 mb-4">
        <div
          className="w-8 h-8 rounded-lg grid place-items-center [&>*]:block leading-none"
          style={{ background: `${ACCENTS.purple}15` }}
        >
          <Brain className="h-4 w-4" style={{ color: ACCENTS.purple }} />
        </div>
        <h3
          className="text-sm font-semibold bg-clip-text text-transparent"
          style={{ backgroundImage: 'linear-gradient(135deg, #BB86FC, #03DAC6)' }}
        >
          Spending Insights
        </h3>
      </div>

      {/* Cards — horizontal scroll on mobile, 2-col grid on lg+ */}
      <div className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory lg:grid lg:grid-cols-2 lg:overflow-visible scrollbar-hide">
        {insights.map((insight, i) => (
          <div key={i} className="snap-start">
            <InsightCard insight={insight} index={i} />
          </div>
        ))}
      </div>

      {/* Footer */}
      <p className="mt-3 text-[10px] text-center" style={{ color: ACCENTS.muted }}>
        Based on last 30 days
      </p>
    </motion.section>
  );
}
