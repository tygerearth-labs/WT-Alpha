'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useBusinessStore } from '@/store/useBusinessStore';
import { currencyPrefix, formatAssetPrice } from '@/lib/asset-catalogue';
import { motion } from 'framer-motion';
import {
  Card,
  CardContent,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  CalendarDays,
  Target,
  Activity,
  Zap,
  Trophy,
  AlertTriangle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ── Design Tokens ────────────────────────────────────────────────────────────

const UP_COLOR = '#03DAC6';
const DOWN_COLOR = '#CF6679';
const GOLD_COLOR = '#FFD700';
const PURPLE_COLOR = '#BB86FC';

const TYPE_COLORS: Record<string, { bg: string; text: string }> = {
  saham: { bg: 'rgba(187,134,252,0.12)', text: '#BB86FC' },
  crypto: { bg: 'rgba(3,218,198,0.12)', text: '#03DAC6' },
  forex: { bg: 'rgba(207,102,121,0.12)', text: '#CF6679' },
  komoditas: { bg: 'rgba(255,215,0,0.12)', text: '#FFD700' },
  indeks: { bg: 'rgba(100,181,246,0.12)', text: '#64B5F6' },
};

// ── Types ────────────────────────────────────────────────────────────────────

interface BacktestWeeklyData {
  weekStart: string;
  weekEnd: string;
  open: number;
  close: number;
  high: number;
  low: number;
  change: number;
  volume: number;
}

interface BacktestSummary {
  avgWeeklyChange: number;
  bestWeek: { week: string; change: number };
  worstWeek: { week: string; change: number };
  winRate: number;
  totalChange: number;
  volatility: number;
}

interface BacktestData {
  symbol: string;
  type: string;
  weeklyData: BacktestWeeklyData[];
  summary: BacktestSummary;
}

interface AssetOption {
  key: string;
  symbol: string;
  type: string;
  name?: string;
}

// ── Props ───────────────────────────────────────────────────────────────────

interface BacktestingPanelProps {
  assets: AssetOption[];
  businessId: string;
}

// ── Component ────────────────────────────────────────────────────────────────

export default function BacktestingPanel({ assets, businessId }: BacktestingPanelProps) {
  const [selectedKey, setSelectedKey] = useState<string>('');
  const [weeksCount, setWeeksCount] = useState<string>('8');
  const [data, setData] = useState<BacktestData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedAsset = useMemo(() => {
    if (!selectedKey) return null;
    return assets.find(a => a.key === selectedKey) || null;
  }, [selectedKey, assets]);

  // Auto-select first asset if none selected
  useEffect(() => {
    if (!selectedKey && assets.length > 0) {
      setSelectedKey(assets[0].key);
    }
  }, [assets, selectedKey]);

  const fetchBacktest = useCallback(async () => {
    if (!businessId || !selectedAsset) return;
    setLoading(true);
    setError(null);

    try {
      const url = `/api/business/${businessId}/backtest?symbol=${encodeURIComponent(selectedAsset.symbol)}&type=${encodeURIComponent(selectedAsset.type)}&weeks=${weeksCount}`;
      const res = await fetch(url);
      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error(errData?.error || `API error ${res.status}`);
      }
      const result = await res.json();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch backtest data');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [businessId, selectedAsset, weeksCount]);

  useEffect(() => {
    if (selectedAsset) {
      fetchBacktest();
    }
  }, [fetchBacktest, selectedAsset]);

  // ── Formatters ──────────────────────────────────────────────────────────
  const fmtPrice = useCallback((type: string, val: number) => {
    const prefix = currencyPrefix(type as 'saham' | 'crypto' | 'forex');
    return `${prefix}${formatAssetPrice(val, type as 'saham' | 'crypto' | 'forex')}`;
  }, []);

  const fmtDate = useCallback((dateStr: string) => {
    try {
      const d = new Date(dateStr + 'T00:00:00Z');
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch {
      return dateStr;
    }
  }, []);

  // ── Chart calculations ──────────────────────────────────────────────────
  const chartMax = useMemo(() => {
    if (!data?.weeklyData.length) return 1;
    const maxAbs = Math.max(...data.weeklyData.map(w => Math.abs(w.change)));
    return Math.max(maxAbs * 1.3, 0.5);
  }, [data]);

  // ── Summary cards config ────────────────────────────────────────────────
  const summaryCards = useMemo(() => {
    if (!data) return [];
    const s = data.summary;
    return [
      {
        label: 'Avg Weekly',
        value: `${s.avgWeeklyChange >= 0 ? '+' : ''}${s.avgWeeklyChange.toFixed(2)}%`,
        color: s.avgWeeklyChange >= 0 ? UP_COLOR : DOWN_COLOR,
        icon: Activity,
      },
      {
        label: 'Total Change',
        value: `${s.totalChange >= 0 ? '+' : ''}${s.totalChange.toFixed(2)}%`,
        color: s.totalChange >= 0 ? UP_COLOR : DOWN_COLOR,
        icon: s.totalChange >= 0 ? TrendingUp : TrendingDown,
      },
      {
        label: 'Win Rate',
        value: `${s.winRate.toFixed(0)}%`,
        color: s.winRate >= 60 ? UP_COLOR : s.winRate >= 40 ? GOLD_COLOR : DOWN_COLOR,
        icon: Trophy,
      },
      {
        label: 'Volatility',
        value: `${s.volatility.toFixed(2)}%`,
        color: s.volatility > 5 ? DOWN_COLOR : s.volatility > 3 ? GOLD_COLOR : UP_COLOR,
        icon: Zap,
      },
    ];
  }, [data]);

  // ── Render ─────────────────────────────────────────────────────────────

  if (assets.length === 0) {
    return null;
  }

  return (
    <Card className="bg-white/[0.03] border-white/[0.05]">
      <CardContent className="p-4 space-y-4">
        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#BB86FC]/10 border border-[#BB86FC]/20">
              <BarChart3 className="h-4 w-4 text-[#BB86FC]" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-white/80">Backtesting</h3>
              <p className="text-[10px] text-white/30">Week vs week performance</p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:ml-auto flex-1 sm:flex-none">
            {/* Asset Selector */}
            <Select value={selectedKey} onValueChange={setSelectedKey}>
              <SelectTrigger className="h-9 w-[160px] bg-white/[0.04] border-white/[0.08] text-xs text-white/80">
                <SelectValue placeholder="Select asset" />
              </SelectTrigger>
              <SelectContent className="bg-[#1A1A2E] border-white/[0.08]">
                {assets.map(asset => {
                  const tc = TYPE_COLORS[asset.type];
                  return (
                    <SelectItem key={asset.key} value={asset.key} className="text-xs text-white/70 focus:text-white focus:bg-white/[0.06]">
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] px-1.5 py-0.5 rounded font-bold" style={{ backgroundColor: tc?.bg, color: tc?.text }}>
                          {asset.symbol}
                        </span>
                        <span className="text-white/40 truncate max-w-[80px]">{asset.name || asset.type}</span>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>

            {/* Weeks Selector */}
            <Select value={weeksCount} onValueChange={setWeeksCount}>
              <SelectTrigger className="h-9 w-[80px] bg-white/[0.04] border-white/[0.08] text-xs text-white/80">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#1A1A2E] border-white/[0.08]">
                {['4', '8', '12', '16', '20', '26'].map(w => (
                  <SelectItem key={w} value={w} className="text-xs text-white/70 focus:text-white focus:bg-white/[0.06]">
                    {w}W
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Refresh */}
            <button
              onClick={fetchBacktest}
              disabled={loading}
              className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] transition-colors disabled:opacity-40"
            >
              <RefreshCw className={cn('h-3.5 w-3.5 text-white/50', loading && 'animate-spin')} />
            </button>
          </div>
        </div>

        {/* ── Error state ── */}
        {error && !loading && (
          <div className="flex items-center gap-2 rounded-lg bg-[#CF6679]/10 border border-[#CF6679]/20 px-3 py-2.5">
            <AlertTriangle className="h-3.5 w-3.5 text-[#CF6679] shrink-0" />
            <span className="text-[11px] text-[#CF6679]/80">{error}</span>
          </div>
        )}

        {/* ── Loading skeleton ── */}
        {loading && !data && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-16 rounded-lg bg-white/[0.04]" />
              ))}
            </div>
            <Skeleton className="h-40 rounded-lg bg-white/[0.04]" />
            <Skeleton className="h-48 rounded-lg bg-white/[0.04]" />
          </div>
        )}

        {/* ── Data view ── */}
        {data && !loading && (
          <>
            {/* ── Summary Cards ── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {summaryCards.map((card, idx) => (
                <motion.div
                  key={card.label}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05, duration: 0.3 }}
                  className="rounded-lg bg-white/[0.03] border border-white/[0.04] p-3"
                >
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <card.icon className="h-3 w-3 text-white/25" />
                    <span className="text-[9px] text-white/30 uppercase tracking-wider font-bold">{card.label}</span>
                  </div>
                  <span className="text-sm font-black font-mono" style={{ color: card.color }}>
                    {card.value}
                  </span>
                </motion.div>
              ))}
            </div>

            {/* ── Best / Worst Week Highlight ── */}
            {data.summary.bestWeek.week && (
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-[#03DAC6]/[0.05] border border-[#03DAC6]/15 p-3 flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#03DAC6]/10 shrink-0">
                    <ArrowUpRight className="h-4 w-4 text-[#03DAC6]" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[9px] text-[#03DAC6]/50 uppercase tracking-wider font-bold block">Best Week</span>
                    <span className="text-xs font-mono font-bold text-[#03DAC6]">
                      +{data.summary.bestWeek.change.toFixed(2)}%
                    </span>
                    <span className="text-[10px] text-white/30 ml-1.5">{fmtDate(data.summary.bestWeek.week)}</span>
                  </div>
                </div>
                <div className="rounded-lg bg-[#CF6679]/[0.05] border border-[#CF6679]/15 p-3 flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#CF6679]/10 shrink-0">
                    <ArrowDownRight className="h-4 w-4 text-[#CF6679]" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[9px] text-[#CF6679]/50 uppercase tracking-wider font-bold block">Worst Week</span>
                    <span className="text-xs font-mono font-bold text-[#CF6679]">
                      {data.summary.worstWeek.change.toFixed(2)}%
                    </span>
                    <span className="text-[10px] text-white/30 ml-1.5">{fmtDate(data.summary.worstWeek.week)}</span>
                  </div>
                </div>
              </div>
            )}

            {/* ── Weekly Returns Bar Chart ── */}
            {data.weeklyData.length > 0 && (
              <div className="rounded-lg bg-white/[0.02] border border-white/[0.04] p-4">
                <div className="flex items-center gap-1.5 mb-3">
                  <CalendarDays className="h-3.5 w-3.5 text-white/25" />
                  <span className="text-[9px] text-white/30 uppercase tracking-wider font-bold">Weekly Returns</span>
                </div>
                <div className="flex items-end gap-1.5 h-32">
                  {data.weeklyData.map((week, idx) => {
                    const isPositive = week.change >= 0;
                    const barHeight = Math.max(Math.abs(week.change) / chartMax * 100, 2);
                    return (
                      <div key={week.weekStart} className="flex-1 flex flex-col items-center gap-1 group relative">
                        {/* Tooltip */}
                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 whitespace-nowrap">
                          <div className="bg-[#0D0D0D] border border-white/10 rounded px-2 py-1 shadow-lg">
                            <span className="text-[9px] font-mono" style={{ color: isPositive ? UP_COLOR : DOWN_COLOR }}>
                              {isPositive ? '+' : ''}{week.change.toFixed(2)}%
                            </span>
                          </div>
                        </div>
                        {/* Bar */}
                        <div
                          className="w-full rounded-t-sm transition-all duration-300 min-h-[2px]"
                          style={{
                            height: `${barHeight}%`,
                            backgroundColor: isPositive ? UP_COLOR : DOWN_COLOR,
                            opacity: isPositive ? 0.7 : 0.7,
                            marginTop: isPositive ? `${100 - barHeight}%` : 0,
                          }}
                        />
                        {/* Label */}
                        <span className="text-[7px] text-white/20 font-mono mt-0.5">
                          {fmtDate(week.weekStart)}
                        </span>
                      </div>
                    );
                  })}
                </div>
                {/* Zero line indicator */}
                <div className="relative h-px mt-0.5">
                  <div className="absolute left-0 top-0 w-full h-px bg-white/[0.06]" />
                </div>
              </div>
            )}

            {/* ── Weekly Data Table ── */}
            {data.weeklyData.length > 0 && (
              <div className="rounded-lg bg-white/[0.02] border border-white/[0.04] overflow-hidden">
                <div className="flex items-center gap-1.5 px-4 py-2.5 border-b border-white/[0.04]">
                  <Target className="h-3.5 w-3.5 text-white/25" />
                  <span className="text-[9px] text-white/30 uppercase tracking-wider font-bold">Weekly Breakdown</span>
                  <Badge variant="outline" className="border-white/[0.06] text-white/25 text-[9px] ml-auto px-1.5 py-0 h-4">
                    {data.weeklyData.length} weeks
                  </Badge>
                </div>
                <div className="max-h-[280px] overflow-y-auto custom-scrollbar">
                  <table className="w-full text-left">
                    <thead className="sticky top-0 bg-[#0D0D0D] z-10">
                      <tr className="border-b border-white/[0.04]">
                        <th className="text-[8px] text-white/25 uppercase tracking-wider font-bold px-3 py-2">Week</th>
                        <th className="text-[8px] text-white/25 uppercase tracking-wider font-bold px-3 py-2 text-right">Open</th>
                        <th className="text-[8px] text-white/25 uppercase tracking-wider font-bold px-3 py-2 text-right">Close</th>
                        <th className="text-[8px] text-white/25 uppercase tracking-wider font-bold px-3 py-2 text-right hidden sm:table-cell">High</th>
                        <th className="text-[8px] text-white/25 uppercase tracking-wider font-bold px-3 py-2 text-right hidden sm:table-cell">Low</th>
                        <th className="text-[8px] text-white/25 uppercase tracking-wider font-bold px-3 py-2 text-right">Change</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.weeklyData.map((week, idx) => {
                        const isPositive = week.change >= 0;
                        const changeColor = isPositive ? UP_COLOR : DOWN_COLOR;
                        return (
                          <motion.tr
                            key={week.weekStart}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: idx * 0.02, duration: 0.2 }}
                            className="border-b border-white/[0.02] hover:bg-white/[0.02] transition-colors"
                          >
                            <td className="px-3 py-2">
                              <span className="text-[10px] text-white/50 font-mono">
                                {fmtDate(week.weekStart)} – {fmtDate(week.weekEnd)}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-right">
                              <span className="text-[10px] text-white/40 font-mono">
                                {fmtPrice(data.type, week.open)}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-right">
                              <span className="text-[10px] text-white/60 font-mono">
                                {fmtPrice(data.type, week.close)}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-right hidden sm:table-cell">
                              <span className="text-[10px] text-white/30 font-mono">
                                {fmtPrice(data.type, week.high)}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-right hidden sm:table-cell">
                              <span className="text-[10px] text-white/30 font-mono">
                                {fmtPrice(data.type, week.low)}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-right">
                              <div className="flex items-center justify-end gap-1">
                                {isPositive ? (
                                  <TrendingUp className="h-3 w-3" style={{ color: changeColor }} />
                                ) : (
                                  <TrendingDown className="h-3 w-3" style={{ color: changeColor }} />
                                )}
                                <span className="text-[10px] font-mono font-bold" style={{ color: changeColor }}>
                                  {isPositive ? '+' : ''}{week.change.toFixed(2)}%
                                </span>
                              </div>
                            </td>
                          </motion.tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
