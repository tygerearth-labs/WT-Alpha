'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useBusinessStore } from '@/store/useBusinessStore';
import { currencyPrefix, formatAssetPrice } from '@/lib/asset-catalogue';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Card,
  CardContent,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
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
  DollarSign,
  Percent,
  Shield,
  ChevronDown,
  ChevronUp,
  Wallet,
  LineChart,
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

const STRATEGY_LABELS: Record<string, string> = {
  trend: 'Trend Following',
  rsi: 'RSI Mean Reversion',
  breakout: 'Breakout',
  smartmoney: 'Smart Money',
  conservative: 'Conservative',
  all: 'Compare All',
};

const REGIME_COLORS: Record<string, string> = {
  trending: UP_COLOR,
  ranging: GOLD_COLOR,
  volatile: DOWN_COLOR,
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

interface StrategyMetrics {
  finalBalance: number;
  totalReturnPct: number;
  totalReturnUsd: number;
  winRate: number;
  totalTrades: number;
  winTrades: number;
  lossTrades: number;
  longTrades: number;
  shortTrades: number;
  avgWinPct: number;
  avgLossPct: number;
  profitFactor: number;
  maxDrawdownPct: number;
  maxDrawdownUsd: number;
  sharpeRatio: number;
  avgTradeDuration: number;
  consecutiveWins: number;
  consecutiveLosses: number;
  bestTradePct: number;
  worstTradePct: number;
  avgRiskReward: number;
  bestRiskReward: number;
  worstRiskReward: number;
  expectedValue: number;
}

interface EquityPoint {
  date: string;
  balance: number;
  drawdownPct: number;
}

interface SimulatedTrade {
  id: number;
  direction: 'LONG' | 'SHORT';
  entryDate: string;
  exitDate: string;
  entryPrice: number;
  exitPrice: number;
  stopLoss: number;
  takeProfit: number;
  pnlPct: number;
  pnlUsd: number;
  balanceAfter: number;
  isWin: boolean;
  exitReason: 'TAKE_PROFIT' | 'STOP_LOSS' | 'SIGNAL_REVERSAL' | 'TIME_EXIT' | 'MARGIN_CALL';
}

interface RegimeStats {
  pct: number;
  avgReturnPct: number;
  trades: number;
  winRate: number;
}

interface MarketRegime {
  trending: RegimeStats;
  ranging: RegimeStats;
  volatile: RegimeStats;
  recommendedStrategy: string;
  currentRegime: 'trending' | 'ranging' | 'volatile';
  regimeDescription: string;
}

interface StrategyComparisonItem {
  name: string;
  label: string;
  metrics: StrategyMetrics;
}

interface BacktestData {
  symbol: string;
  type: string;
  strategy: string;
  initialBalance: number;
  metrics: StrategyMetrics;
  equityCurve: EquityPoint[];
  trades: SimulatedTrade[];
  regimeAnalysis: MarketRegime;
  strategyComparison?: StrategyComparisonItem[];
  weeklyData: BacktestWeeklyData[];
  summary: BacktestSummary;
  marginCall?: boolean;
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

// ── Helpers ──────────────────────────────────────────────────────────────────

function toF(val: number | undefined | null, digits = 2): string {
  const n = typeof val === 'number' && !isNaN(val) ? val : 0;
  return n.toFixed(digits);
}

function fmtUsd(val: number): string {
  const abs = Math.abs(val);
  const sign = val >= 0 ? '' : '-';
  if (abs >= 1e6) return `${sign}$${toF(abs / 1e6, 2)}M`;
  if (abs >= 1e3) return `${sign}$${toF(abs / 1e3, 2)}K`;
  return `${sign}$${toF(abs, 2)}`;
}

// ── Component ────────────────────────────────────────────────────────────────

export default function BacktestingPanel({ assets, businessId }: BacktestingPanelProps) {
  const [selectedKey, setSelectedKey] = useState<string>('');
  const [strategy, setStrategy] = useState<string>('smartmoney');
  const [initialBalance, setInitialBalance] = useState<string>('10000');
  const [riskPerTrade, setRiskPerTrade] = useState<string>('2');
  const [data, setData] = useState<BacktestData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [startDate, setStartDate] = useState<string>(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  });
  const [endDate, setEndDate] = useState<string>(() => {
    return new Date().toISOString().slice(0, 10);
  });
  const [weeklyOpen, setWeeklyOpen] = useState(false);
  const weeklyRef = useRef<HTMLDivElement>(null);

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
      const params = new URLSearchParams({
        symbol: encodeURIComponent(selectedAsset.symbol),
        type: encodeURIComponent(selectedAsset.type),
        weeks: '8',
        strategy,
        initialBalance: initialBalance || '10000',
        riskPerTrade: riskPerTrade || '2',
      });
      // Add date range if set
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);
      const url = `/api/business/${businessId}/backtest?${params.toString()}`;
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
  }, [businessId, selectedAsset, startDate, endDate, strategy, initialBalance, riskPerTrade]);

  useEffect(() => {
    if (selectedAsset) {
      fetchBacktest();
    }
  }, [fetchBacktest]);

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
    const maxAbs = Math.max(...data.weeklyData.map(w => Math.abs(w.change ?? 0)));
    return Math.max(maxAbs * 1.3, 0.5);
  }, [data]);

  // ── Summary cards config ────────────────────────────────────────────────
  const metricCards = useMemo(() => {
    if (!data) return [];
    const m = data.metrics;
    return [
      {
        label: 'Total Return',
        value: `${m.totalReturnPct >= 0 ? '+' : ''}${toF(m.totalReturnPct)}%`,
        subValue: `${m.totalReturnUsd >= 0 ? '+' : ''}${fmtUsd(m.totalReturnUsd)}`,
        color: m.totalReturnPct >= 0 ? UP_COLOR : DOWN_COLOR,
        icon: DollarSign,
      },
      {
        label: 'Win Rate',
        value: `${toF(m.winRate, 1)}%`,
        subValue: `${m.winTrades}W / ${m.lossTrades}L`,
        color: m.winRate >= 55 ? UP_COLOR : m.winRate >= 40 ? GOLD_COLOR : DOWN_COLOR,
        icon: Trophy,
      },
      {
        label: 'Max Drawdown',
        value: `-${toF(m.maxDrawdownPct)}%`,
        subValue: `-${fmtUsd(m.maxDrawdownUsd)}`,
        color: DOWN_COLOR,
        icon: Shield,
      },
      {
        label: 'Profit Factor',
        value: m.profitFactor > 999 ? '∞' : toF(m.profitFactor, 2),
        subValue: m.profitFactor >= 1.5 ? 'Healthy' : m.profitFactor >= 1 ? 'Marginal' : 'Negative',
        color: m.profitFactor >= 1.5 ? UP_COLOR : m.profitFactor >= 1 ? GOLD_COLOR : DOWN_COLOR,
        icon: Target,
      },
      {
        label: 'Sharpe Ratio',
        value: toF(m.sharpeRatio, 2),
        subValue: m.sharpeRatio >= 2 ? 'Excellent' : m.sharpeRatio >= 1 ? 'Good' : m.sharpeRatio >= 0.5 ? 'Fair' : 'Poor',
        color: m.sharpeRatio >= 1.5 ? UP_COLOR : m.sharpeRatio >= 1 ? GOLD_COLOR : m.sharpeRatio >= 0.5 ? GOLD_COLOR : DOWN_COLOR,
        icon: Activity,
      },
      {
        label: 'Total Trades',
        value: `${m.totalTrades}`,
        subValue: `${m.longTrades} Long / ${m.shortTrades} Short`,
        color: m.totalTrades > 0 ? PURPLE_COLOR : 'rgba(255,255,255,0.4)',
        icon: BarChart3,
      },
    ];
  }, [data]);

  // ── Strategy comparison ─────────────────────────────────────────────────
  const bestStrategyName = useMemo(() => {
    if (!data?.strategyComparison?.length) return null;
    let best = data.strategyComparison[0];
    for (const s of data.strategyComparison) {
      if (s.metrics.totalReturnPct > best.metrics.totalReturnPct) best = s;
    }
    return best.name;
  }, [data]);

  // ── Trade stats ─────────────────────────────────────────────────────────
  const tradeStats = useMemo(() => {
    if (!data?.trades.length) return null;
    const trades = data.trades;
    const totalPnl = trades.reduce((s, t) => s + t.pnlUsd, 0);
    const wins = trades.filter(t => t.isWin).length;
    const losses = trades.filter(t => !t.isWin).length;
    return { total: trades.length, wins, losses, totalPnl };
  }, [data]);

  // ── Render ─────────────────────────────────────────────────────────────

  if (assets.length === 0) {
    return null;
  }

  return (
    <Card className="bg-white/[0.03] border-white/[0.05]">
      <CardContent className="p-4 space-y-4">
        {/* ── Header ── */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#BB86FC]/10 border border-[#BB86FC]/20">
              <LineChart className="h-4 w-4 text-[#BB86FC]" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-white/80">Strategy Backtesting</h3>
              <p className="text-[10px] text-white/30">Simulasi trading dengan saldo real</p>
            </div>
          </div>

          {/* Controls Row */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Asset Selector */}
            <Select value={selectedKey} onValueChange={setSelectedKey}>
              <SelectTrigger className="h-8 w-[150px] bg-white/[0.04] border-white/[0.08] text-[11px] text-white/80">
                <SelectValue placeholder="Select asset" />
              </SelectTrigger>
              <SelectContent className="bg-[#1A1A2E] border-white/[0.08]">
                {assets.map(asset => {
                  const tc = TYPE_COLORS[asset.type];
                  return (
                    <SelectItem key={asset.key} value={asset.key} className="text-[11px] text-white/70 focus:text-white focus:bg-white/[0.06]">
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

            {/* Strategy Selector */}
            <Select value={strategy} onValueChange={setStrategy}>
              <SelectTrigger className="h-8 w-[150px] bg-white/[0.04] border-white/[0.08] text-[11px] text-white/80">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#1A1A2E] border-white/[0.08]">
                {Object.entries(STRATEGY_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key} className="text-[11px] text-white/70 focus:text-white focus:bg-white/[0.06]">
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Initial Balance */}
            <div className="relative">
              <Wallet className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-white/30" />
              <Input
                type="number"
                value={initialBalance}
                onChange={e => setInitialBalance(e.target.value)}
                className="h-8 w-[120px] bg-white/[0.04] border-white/[0.08] text-[11px] text-white/80 font-mono pl-7 pr-2"
                placeholder="10000"
                min={100}
              />
            </div>

            {/* Risk % */}
            <Select value={riskPerTrade} onValueChange={setRiskPerTrade}>
              <SelectTrigger className="h-8 w-[90px] bg-white/[0.04] border-white/[0.08] text-[11px] text-white/80">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#1A1A2E] border-white/[0.08]">
                {[1, 1.5, 2, 2.5, 3, 4, 5].map(r => (
                  <SelectItem key={r} value={String(r)} className="text-[11px] text-white/70 focus:text-white focus:bg-white/[0.06]">
                    {r}% risk
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Date Range */}
            <div className="flex items-center gap-1">
              <CalendarDays className="h-3 w-3 text-white/30" />
              <Input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="h-8 w-[130px] bg-white/[0.04] border-white/[0.08] text-[10px] text-white/80 font-mono px-2"
                max={endDate || undefined}
              />
              <span className="text-[10px] text-white/25">→</span>
              <Input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="h-8 w-[130px] bg-white/[0.04] border-white/[0.08] text-[10px] text-white/80 font-mono px-2"
                min={startDate || undefined}
              />
            </div>

            {/* Run Backtest Button */}
            <button
              onClick={fetchBacktest}
              disabled={loading}
              className={cn(
                "flex h-8 items-center justify-center rounded-lg px-3 gap-1.5 text-[10px] font-bold transition-colors disabled:opacity-40",
                "bg-[#BB86FC]/15 border border-[#BB86FC]/25 text-[#BB86FC] hover:bg-[#BB86FC]/25"
              )}
            >
              <Zap className="h-3 w-3" />
              {loading ? 'Running...' : 'Run'}
            </button>

            {/* Strategy badge */}
            {data && (
              <Badge
                className="text-[9px] px-2 py-0.5 h-5 font-bold ml-auto"
                style={{
                  backgroundColor: `${PURPLE_COLOR}15`,
                  color: PURPLE_COLOR,
                  borderColor: `${PURPLE_COLOR}30`,
                  borderWidth: 1,
                  borderStyle: 'solid',
                }}
              >
                {STRATEGY_LABELS[data.strategy] || data.strategy}
              </Badge>
            )}
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
            <Skeleton className="h-40 rounded-lg bg-white/[0.04]" />
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-20 rounded-lg bg-white/[0.04]" />
              ))}
            </div>
            <Skeleton className="h-32 rounded-lg bg-white/[0.04]" />
            <Skeleton className="h-40 rounded-lg bg-white/[0.04]" />
          </div>
        )}

        {/* ── Data view ── */}
        {data && !loading && (
          <>
            {/* ════════════════════════════════════════════════════════════
                MARGIN CALL WARNING
                ════════════════════════════════════════════════════════════ */}
            {data.marginCall && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-lg bg-[#CF6679]/10 border border-[#CF6679]/30 p-5 text-center"
              >
                <AlertTriangle className="h-8 w-8 text-[#CF6679] mx-auto mb-2" />
                <h4 className="text-sm font-bold text-[#CF6679] mb-1">MARGIN CALL - Saldo Habis</h4>
                <p className="text-[11px] text-white/40">
                  Strategi ini menghabiskan seluruh modal ({fmtUsd(data.metrics.finalBalance)} tersisa).{' '}
                  Strategi dihentikan karena saldo mencapai $0.
                </p>
              </motion.div>
            )}

            {/* ════════════════════════════════════════════════════════════
                NO TRADES FOUND - explain why
                ════════════════════════════════════════════════════════════ */}
            {data.metrics.totalTrades === 0 && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-lg bg-white/[0.02] border border-[#FFD700]/20 p-5 text-center"
              >
                <div className="flex justify-center mb-2">
                  <div className="h-10 w-10 rounded-full bg-[#FFD700]/10 flex items-center justify-center">
                    <AlertTriangle className="h-5 w-5 text-[#FFD700]" />
                  </div>
                </div>
                <h4 className="text-xs font-bold text-white/70 mb-1">Tidak Ada Sinyal Trading</h4>
                <p className="text-[10px] text-white/35 leading-relaxed max-w-md mx-auto">
                  Strategi <span className="text-[#BB86FC] font-bold">{STRATEGY_LABELS[data.strategy] || data.strategy}</span> tidak menghasilkan sinyal entry pada periode ini. Ini berdasarkan simulasi indikator, bukan trade aktual.
                </p>
                <div className="mt-3 space-y-1.5 text-[9px] text-white/25">
                  <p>💡 <span className="text-white/40">Tips:</span> Coba ubah range tanggal atau ganti aset untuk melihat sinyal yang berbeda.</p>
                  <p>• <span className="text-[#03DAC6]/70">Trend Following</span> — baik di market yang jelas naik/turun</p>
                  <p>• <span className="text-[#03DAC6]/70">RSI Mean Reversion</span> — baik saat market oversold/overbought</p>
                  <p>• <span className="text-[#03DAC6]/70">Smart Money</span> — komposit skor dari 4 layer indikator</p>
                  <p>• <span className="text-[#03DAC6]/70">Breakout</span> — baik saat harga menembus resistance/support</p>
                </div>
              </motion.div>
            )}

            {/* ════════════════════════════════════════════════════════════
                1.5 BALANCE PROGRESSION (start → end)
                ════════════════════════════════════════════════════════════ */}
            {data.metrics.totalTrades > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1, duration: 0.3 }}
                className="rounded-lg bg-white/[0.03] border border-white/[0.06] p-4"
              >
                <div className="flex items-center gap-1.5 mb-3">
                  <Wallet className="h-3.5 w-3.5 text-white/25" />
                  <span className="text-[9px] text-white/30 uppercase tracking-wider font-bold">Balance Progression</span>
                </div>
                <div className="flex items-center justify-center gap-4">
                  <div className="text-center">
                    <span className="text-[8px] text-white/25 uppercase tracking-wider block mb-1">Starting</span>
                    <span className="text-sm font-black font-mono text-white/50">
                      {fmtUsd(data.initialBalance)}
                    </span>
                  </div>
                  <div className="flex flex-col items-center">
                    <ArrowUpRight className={cn("h-5 w-5", data.metrics.totalReturnPct >= 0 ? "text-[#03DAC6]" : "text-[#CF6679] hidden")} />
                    <ArrowDownRight className={cn("h-5 w-5", data.metrics.totalReturnPct < 0 ? "text-[#CF6679]" : "text-[#03DAC6] hidden")} />
                    <span className={cn("text-[10px] font-bold font-mono", data.metrics.totalReturnPct >= 0 ? "text-[#03DAC6]" : "text-[#CF6679]")}>
                      {data.metrics.totalReturnPct >= 0 ? '+' : ''}{toF(data.metrics.totalReturnPct)}%
                    </span>
                  </div>
                  <div className="text-center">
                    <span className="text-[8px] text-white/25 uppercase tracking-wider block mb-1">Ending</span>
                    <span className={cn("text-sm font-black font-mono", data.metrics.totalReturnPct >= 0 ? "text-[#03DAC6]" : "text-[#CF6679]")}>
                      {fmtUsd(data.metrics.finalBalance)}
                    </span>
                  </div>
                </div>
                <div className="mt-2 flex items-center justify-center gap-3 text-[9px] text-white/25">
                  <span>{data.metrics.totalTrades} trades</span>
                  <span>•</span>
                  <span>Best: <span className="text-[#03DAC6] font-mono">+{toF(data.metrics.bestTradePct)}%</span></span>
                  <span>•</span>
                  <span>Worst: <span className="text-[#CF6679] font-mono">{toF(data.metrics.worstTradePct)}%</span></span>
                </div>
              </motion.div>
            )}

            {/* ════════════════════════════════════════════════════════════
                1. EQUITY CURVE CHART
                ════════════════════════════════════════════════════════════ */}
            {data.equityCurve.length > 2 && data.metrics.totalTrades > 0 && <EquityCurveChart equityCurve={data.equityCurve} initialBalance={data.initialBalance} fmtDate={fmtDate} />}

            {/* ════════════════════════════════════════════════════════════
                2. KEY METRICS DASHBOARD (6 cards in 2x3 grid)
                ════════════════════════════════════════════════════════════ */}
            {data.metrics.totalTrades > 0 && (
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
              {metricCards.map((card, idx) => (
                <motion.div
                  key={card.label}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.04, duration: 0.3 }}
                  className="rounded-lg bg-white/[0.03] border border-white/[0.04] p-3"
                >
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <card.icon className="h-3 w-3" style={{ color: `${card.color}60` }} />
                    <span className="text-[9px] text-white/30 uppercase tracking-wider font-bold">{card.label}</span>
                  </div>
                  <span className="text-sm font-black font-mono block" style={{ color: card.color }}>
                    {card.value}
                  </span>
                  <span className="text-[10px] text-white/30 font-mono block mt-0.5">
                    {card.subValue}
                  </span>
                </motion.div>
              ))}
            </div>
            )}

            {/* ════════════════════════════════════════════════════════════
                3. STRATEGY COMPARISON BAR (only when strategy=all)
                ════════════════════════════════════════════════════════════ */}
            {data.strategyComparison && data.strategyComparison.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25, duration: 0.3 }}
                className="rounded-lg bg-white/[0.02] border border-white/[0.04] p-4"
              >
                <div className="flex items-center gap-1.5 mb-3">
                  <BarChart3 className="h-3.5 w-3.5 text-white/25" />
                  <span className="text-[9px] text-white/30 uppercase tracking-wider font-bold">Strategy Comparison</span>
                </div>
                <div className="space-y-2">
                  {data.strategyComparison.map(s => {
                    const isBest = s.name === bestStrategyName;
                    const returnPct = s.metrics.totalReturnPct;
                    const maxAbs = Math.max(
                      ...data.strategyComparison!.map(x => Math.abs(x.metrics.totalReturnPct)),
                      1,
                    );
                    const barWidth = Math.max(Math.abs(returnPct) / maxAbs * 100, 3);
                    const barColor = returnPct >= 0 ? UP_COLOR : DOWN_COLOR;

                    return (
                      <div key={s.name} className="flex items-center gap-3">
                        <span className={cn(
                          'text-[10px] w-[100px] shrink-0 truncate font-medium',
                          isBest ? 'text-white/90' : 'text-white/50',
                        )}>
                          {s.label}
                        </span>
                        <div className="flex-1 relative h-5 bg-white/[0.02] rounded-sm overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${barWidth}%` }}
                            transition={{ duration: 0.6, ease: 'easeOut' }}
                            className={cn(
                              'absolute top-0 h-full rounded-sm',
                              returnPct >= 0 ? 'left-0' : 'right-0',
                            )}
                            style={{
                              backgroundColor: barColor,
                              opacity: isBest ? 0.8 : 0.4,
                            }}
                          />
                          {isBest && (
                            <motion.div
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              transition={{ delay: 0.8 }}
                              className="absolute top-0 h-full w-full border border-[#FFD700]/30 rounded-sm"
                            />
                          )}
                        </div>
                        <span
                          className="text-[10px] font-mono font-bold w-[65px] text-right shrink-0"
                          style={{ color: barColor }}
                        >
                          {returnPct >= 0 ? '+' : ''}{toF(returnPct)}%
                        </span>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* ════════════════════════════════════════════════════════════
                4. MARKET REGIME ANALYSIS
                ════════════════════════════════════════════════════════════ */}
            {data.metrics.totalTrades > 0 && data.regimeAnalysis && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.3 }}
                className="rounded-lg bg-white/[0.02] border border-white/[0.04] p-4"
              >
                <div className="flex items-center gap-1.5 mb-3">
                  <Activity className="h-3.5 w-3.5 text-white/25" />
                  <span className="text-[9px] text-white/30 uppercase tracking-wider font-bold">Market Regime Analysis</span>
                </div>

                <div className="flex flex-wrap items-center gap-2 mb-3">
                  <Badge
                    className="text-[9px] px-2 py-0.5 h-5 font-bold uppercase tracking-wider"
                    style={{
                      backgroundColor: `${REGIME_COLORS[data.regimeAnalysis.currentRegime]}15`,
                      color: REGIME_COLORS[data.regimeAnalysis.currentRegime],
                      borderColor: `${REGIME_COLORS[data.regimeAnalysis.currentRegime]}30`,
                      borderWidth: 1,
                      borderStyle: 'solid',
                    }}
                  >
                    {data.regimeAnalysis.currentRegime}
                  </Badge>
                  <span className="text-[10px] text-white/40">{data.regimeAnalysis.regimeDescription}</span>
                </div>

                {/* Recommended Strategy */}
                <div className="flex items-center gap-2 mb-3">
                  <Zap className="h-3 w-3 text-[#FFD700]/60" />
                  <span className="text-[9px] text-white/30 uppercase tracking-wider font-bold">Recommended</span>
                  <Badge
                    className="text-[9px] px-2 py-0.5 h-5 font-bold"
                    style={{
                      backgroundColor: 'rgba(187,134,252,0.12)',
                      color: PURPLE_COLOR,
                      borderColor: 'rgba(187,134,252,0.3)',
                      borderWidth: 1,
                      borderStyle: 'solid',
                    }}
                  >
                    {STRATEGY_LABELS[data.regimeAnalysis.recommendedStrategy] || data.regimeAnalysis.recommendedStrategy}
                  </Badge>
                </div>

                {/* Regime cards */}
                <div className="grid grid-cols-3 gap-2">
                  {(['trending', 'ranging', 'volatile'] as const).map(regime => {
                    const stats = data.regimeAnalysis[regime];
                    const color = REGIME_COLORS[regime];
                    return (
                      <div
                        key={regime}
                        className="rounded-lg bg-white/[0.02] border border-white/[0.04] p-2.5"
                      >
                        <span className="text-[9px] uppercase tracking-wider font-bold block mb-1.5" style={{ color: `${color}80` }}>
                          {regime}
                        </span>
                        <div className="space-y-1">
                          <div className="flex justify-between">
                            <span className="text-[8px] text-white/25">Time</span>
                            <span className="text-[10px] text-white/60 font-mono">{toF(stats.pct, 0)}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-[8px] text-white/25">Avg Ret</span>
                            <span className="text-[10px] font-mono" style={{ color: stats.avgReturnPct >= 0 ? UP_COLOR : DOWN_COLOR }}>
                              {stats.avgReturnPct >= 0 ? '+' : ''}{toF(stats.avgReturnPct)}%
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-[8px] text-white/25">Win Rate</span>
                            <span className="text-[10px] text-white/60 font-mono">{toF(stats.winRate, 0)}%</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Insight */}
                <div className="mt-3 px-2.5 py-2 rounded-md bg-white/[0.02] border border-white/[0.03]">
                  <p className="text-[10px] text-white/35 leading-relaxed">
                    In uncertain/ranging markets, <span className="text-[#FFD700]/70 font-semibold">Conservative</span> strategy has higher win rate because it avoids low-confluence trades. In trending markets, <span style={{ color: UP_COLOR }} className="font-semibold">Trend Following</span> captures directional momentum.
                  </p>
                </div>
              </motion.div>
            )}

            {/* ════════════════════════════════════════════════════════════
                5. TRADE HISTORY TABLE
                ════════════════════════════════════════════════════════════ */}
            {data.trades.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35, duration: 0.3 }}
                className="rounded-lg bg-white/[0.02] border border-white/[0.04] overflow-hidden"
              >
                <div className="flex items-center gap-1.5 px-4 py-2.5 border-b border-white/[0.04]">
                  <Target className="h-3.5 w-3.5 text-white/25" />
                  <span className="text-[9px] text-white/30 uppercase tracking-wider font-bold">Trade History</span>
                  <Badge variant="outline" className="border-white/[0.06] text-white/25 text-[9px] ml-auto px-1.5 py-0 h-4">
                    {data.trades.length} trades
                  </Badge>
                </div>
                <div className="max-h-[320px] overflow-y-auto custom-scrollbar">
                  <table className="w-full text-left">
                    <thead className="sticky top-0 bg-[#0D0D0D] z-10">
                      <tr className="border-b border-white/[0.04]">
                        <th className="text-[8px] text-white/25 uppercase tracking-wider font-bold px-3 py-2">#</th>
                        <th className="text-[8px] text-white/25 uppercase tracking-wider font-bold px-3 py-2">Dir</th>
                        <th className="text-[8px] text-white/25 uppercase tracking-wider font-bold px-3 py-2 hidden sm:table-cell">Entry Date</th>
                        <th className="text-[8px] text-white/25 uppercase tracking-wider font-bold px-3 py-2 hidden md:table-cell">Entry Price</th>
                        <th className="text-[8px] text-white/25 uppercase tracking-wider font-bold px-3 py-2 hidden sm:table-cell">Exit Date</th>
                        <th className="text-[8px] text-white/25 uppercase tracking-wider font-bold px-3 py-2 hidden md:table-cell">Exit Price</th>
                        <th className="text-[8px] text-white/25 uppercase tracking-wider font-bold px-3 py-2 text-right">PnL %</th>
                        <th className="text-[8px] text-white/25 uppercase tracking-wider font-bold px-3 py-2 text-right">PnL $</th>
                        <th className="text-[8px] text-white/25 uppercase tracking-wider font-bold px-3 py-2 hidden lg:table-cell">Exit Reason</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.trades.map((trade, idx) => {
                        const pnlColor = trade.pnlPct >= 0 ? UP_COLOR : DOWN_COLOR;
                        return (
                          <motion.tr
                            key={trade.id}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: idx * 0.015, duration: 0.2 }}
                            className={cn(
                              'border-b border-white/[0.02] hover:bg-white/[0.02] transition-colors',
                              trade.isWin ? 'bg-[#03DAC6]/[0.03]' : 'bg-[#CF6679]/[0.03]',
                            )}
                          >
                            <td className="px-3 py-1.5">
                              <span className="text-[10px] text-white/30 font-mono">{trade.id}</span>
                            </td>
                            <td className="px-3 py-1.5">
                              <Badge
                                className="text-[8px] px-1.5 py-0 h-4 font-bold"
                                style={{
                                  backgroundColor: trade.direction === 'LONG'
                                    ? `${UP_COLOR}15`
                                    : `${DOWN_COLOR}15`,
                                  color: trade.direction === 'LONG' ? UP_COLOR : DOWN_COLOR,
                                  borderColor: trade.direction === 'LONG'
                                    ? `${UP_COLOR}30`
                                    : `${DOWN_COLOR}30`,
                                  borderWidth: 1,
                                  borderStyle: 'solid',
                                }}
                              >
                                {trade.direction}
                              </Badge>
                            </td>
                            <td className="px-3 py-1.5 hidden sm:table-cell">
                              <span className="text-[10px] text-white/50 font-mono">{fmtDate(trade.entryDate)}</span>
                            </td>
                            <td className="px-3 py-1.5 hidden md:table-cell">
                              <span className="text-[10px] text-white/40 font-mono">{fmtPrice(data.type, trade.entryPrice)}</span>
                            </td>
                            <td className="px-3 py-1.5 hidden sm:table-cell">
                              <span className="text-[10px] text-white/50 font-mono">{fmtDate(trade.exitDate)}</span>
                            </td>
                            <td className="px-3 py-1.5 hidden md:table-cell">
                              <span className="text-[10px] text-white/40 font-mono">{fmtPrice(data.type, trade.exitPrice)}</span>
                            </td>
                            <td className="px-3 py-1.5 text-right">
                              <span className="text-[10px] font-mono font-bold" style={{ color: pnlColor }}>
                                {trade.pnlPct >= 0 ? '+' : ''}{toF(trade.pnlPct)}%
                              </span>
                            </td>
                            <td className="px-3 py-1.5 text-right">
                              <span className="text-[10px] font-mono font-bold" style={{ color: pnlColor }}>
                                {trade.pnlUsd >= 0 ? '+' : ''}{fmtUsd(trade.pnlUsd)}
                              </span>
                            </td>
                            <td className="px-3 py-1.5 hidden lg:table-cell">
                              <span className="text-[9px] text-white/30 font-mono">
                                {trade.exitReason.replace(/_/g, ' ')}
                              </span>
                            </td>
                          </motion.tr>
                        );
                      })}
                    </tbody>
                    {/* Summary row */}
                    {tradeStats && (
                      <tfoot>
                        <tr className="bg-white/[0.03] border-t border-white/[0.06]">
                          <td colSpan={6} className="px-3 py-2">
                            <span className="text-[9px] text-white/40 uppercase tracking-wider font-bold">
                              Summary: {tradeStats.total} trades
                            </span>
                          </td>
                          <td className="px-3 py-2 text-right">
                            <span className="text-[10px] font-mono font-bold text-white/50">
                              <span style={{ color: UP_COLOR }}>{tradeStats.wins}W</span>
                              {' / '}
                              <span style={{ color: DOWN_COLOR }}>{tradeStats.losses}L</span>
                            </span>
                          </td>
                          <td className="px-3 py-2 text-right">
                            <span
                              className="text-[10px] font-mono font-bold"
                              style={{ color: tradeStats.totalPnl >= 0 ? UP_COLOR : DOWN_COLOR }}
                            >
                              {tradeStats.totalPnl >= 0 ? '+' : ''}{fmtUsd(tradeStats.totalPnl)}
                            </span>
                          </td>
                          <td className="hidden lg:table-cell" />
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              </motion.div>
            )}

            {/* ════════════════════════════════════════════════════════════
                6. WEEKLY RETURNS (collapsible)
                ════════════════════════════════════════════════════════════ */}
            {data.weeklyData.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.3 }}
                className="rounded-lg bg-white/[0.02] border border-white/[0.04] overflow-hidden"
              >
                <button
                  onClick={() => setWeeklyOpen(!weeklyOpen)}
                  className="w-full flex items-center gap-2 px-4 py-2.5 hover:bg-white/[0.02] transition-colors"
                >
                  <CalendarDays className="h-3.5 w-3.5 text-white/25" />
                  <span className="text-[9px] text-white/30 uppercase tracking-wider font-bold">Weekly Returns</span>
                  <Badge variant="outline" className="border-white/[0.06] text-white/25 text-[9px] px-1.5 py-0 h-4">
                    {data.weeklyData.length} weeks
                  </Badge>
                  {weeklyOpen ? (
                    <ChevronUp className="h-3.5 w-3.5 text-white/20 ml-auto" />
                  ) : (
                    <ChevronDown className="h-3.5 w-3.5 text-white/20 ml-auto" />
                  )}
                </button>

                <AnimatePresence>
                  {weeklyOpen && (
                    <motion.div
                      ref={weeklyRef}
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: 'easeInOut' }}
                      className="overflow-hidden"
                    >
                      {/* Weekly Bar Chart */}
                      <div className="px-4 pb-3">
                        <div className="flex items-end gap-1.5 h-32">
                          {data.weeklyData.map((week) => {
                            const isPositive = (week.change ?? 0) >= 0;
                            const barHeight = Math.max(Math.abs(week.change ?? 0) / chartMax * 100, 2);
                            return (
                              <div key={week.weekStart} className="flex-1 flex flex-col items-center gap-0.5 group relative min-w-0">
                                <div className="absolute -top-12 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 whitespace-nowrap">
                                  <div className="bg-[#0D0D0D] border border-white/10 rounded px-2 py-1 shadow-lg space-y-0.5">
                                    <div>
                                      <span className="text-[8px] text-white/30">{fmtDate(week.weekStart)} - {fmtDate(week.weekEnd)}</span>
                                    </div>
                                    <div>
                                      <span className="text-[9px] font-mono" style={{ color: isPositive ? UP_COLOR : DOWN_COLOR }}>
                                        {isPositive ? '+' : ''}{toF(week.change)}%
                                      </span>
                                    </div>
                                    <div>
                                      <span className="text-[8px] text-white/40 font-mono">Close: {fmtPrice(data.type, week.close)}</span>
                                    </div>
                                  </div>
                                </div>
                                <div
                                  className="w-full rounded-t-sm transition-all duration-300 min-h-[2px]"
                                  style={{
                                    height: `${barHeight}%`,
                                    backgroundColor: isPositive ? UP_COLOR : DOWN_COLOR,
                                    opacity: 0.7,
                                    marginTop: isPositive ? `${100 - barHeight}%` : 0,
                                  }}
                                />
                                <span className="text-[7px] text-white/30 font-mono mt-0.5 truncate w-full text-center block">
                                  {fmtPrice(data.type, week.close)}
                                </span>
                                <span className="text-[7px] text-white/15 font-mono truncate w-full text-center block">
                                  {fmtDate(week.weekStart)}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                        <div className="relative h-px mt-0.5">
                          <div className="absolute left-0 top-0 w-full h-px bg-white/[0.06]" />
                        </div>
                      </div>

                      {/* Weekly Table */}
                      <div className="border-t border-white/[0.04]">
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
                            {data.weeklyData.map((week) => {
                              const isPositive = (week.change ?? 0) >= 0;
                              const changeColor = isPositive ? UP_COLOR : DOWN_COLOR;
                              return (
                                <tr key={week.weekStart} className="border-b border-white/[0.02] hover:bg-white/[0.02] transition-colors">
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
                                        {isPositive ? '+' : ''}{toF(week.change)}%
                                      </span>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

// ── Equity Curve Chart Sub-Component ─────────────────────────────────────────

function EquityCurveChart({
  equityCurve,
  initialBalance,
  fmtDate,
}: {
  equityCurve: EquityPoint[];
  initialBalance: number;
  fmtDate: (d: string) => string;
}) {
  const svgRef = useRef<SVGSVGElement>(null);

  const { points, drawdownPath, xLabels, yLabels, maxBalance, minBalance, padding } = useMemo(() => {
    if (equityCurve.length < 2) return { points: [], drawdownPath: '', xLabels: [], yLabels: [], maxBalance: initialBalance, minBalance: initialBalance, padding: { t: 20, r: 10, b: 24, l: 55 } };

    const p = { t: 20, r: 10, b: 24, l: 55 };
    const balances = equityCurve.map(e => e.balance);
    const maxB = Math.max(...balances, initialBalance) * 1.05;
    const minB = Math.min(...balances, initialBalance) * 0.95;
    const range = maxB - minB || 1;

    const w = 600;
    const h = 160;
    const chartW = w - p.l - p.r;
    const chartH = h - p.t - p.b;

    const pts = equityCurve.map((e, i) => {
      const x = p.l + (i / (equityCurve.length - 1)) * chartW;
      const y = p.t + (1 - (e.balance - minB) / range) * chartH;
      return { x, y, date: e.date, balance: e.balance, drawdownPct: e.drawdownPct };
    });

    const linePath = pts.map((pt, i) => `${i === 0 ? 'M' : 'L'}${pt.x.toFixed(1)},${pt.y.toFixed(1)}`).join(' ');

    // Drawdown area path (inverted)
    const ddMaxPct = Math.max(...equityCurve.map(e => e.drawdownPct), 0.1);
    const ddPath = equityCurve.map((e, i) => {
      const x = p.l + (i / (equityCurve.length - 1)) * chartW;
      const ddHeight = (e.drawdownPct / ddMaxPct) * chartH * 0.3;
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${(p.t + chartH - ddHeight).toFixed(1)}`;
    }).join(' ') + ` L${p.l + chartW},${p.t + chartH} L${p.l},${p.t + chartH} Z`;

    // X-axis labels (every Nth date)
    const labelCount = Math.min(6, equityCurve.length);
    const step = Math.max(1, Math.floor(equityCurve.length / labelCount));
    const xLbls = equityCurve
      .filter((_, i) => i % step === 0 || i === equityCurve.length - 1)
      .map((e, idx) => {
        const x = p.l + (Math.min(idx * step, equityCurve.length - 1) / (equityCurve.length - 1)) * chartW;
        return { label: fmtDate(e.date), x };
      });

    // Y-axis labels
    const yCount = 4;
    const yLbls = Array.from({ length: yCount + 1 }).map((_, i) => {
      const val = minB + (range * i) / yCount;
      const y = p.t + (1 - (val - minB) / range) * chartH;
      return { label: fmtUsd(val), y, val };
    });

    return {
      points: pts,
      drawdownPath: ddPath,
      linePath,
      xLabels: xLbls,
      yLabels: yLbls,
      maxBalance: maxB,
      minBalance: minB,
      padding: p,
      chartW,
      chartH,
      w,
      h,
    };
  }, [equityCurve, initialBalance, fmtDate]);

  if (equityCurve.length < 2) return null;

  const finalBalance = equityCurve[equityCurve.length - 1].balance;
  const isProfitable = finalBalance >= initialBalance;
  const lastPoint = points[points.length - 1];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1, duration: 0.3 }}
      className="rounded-lg bg-white/[0.02] border border-white/[0.04] p-4"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5">
          <LineChart className="h-3.5 w-3.5 text-white/25" />
          <span className="text-[9px] text-white/30 uppercase tracking-wider font-bold">Equity Curve</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <div className="w-2 h-0.5 rounded" style={{ backgroundColor: isProfitable ? UP_COLOR : DOWN_COLOR }} />
            <span className="text-[8px] text-white/25">Balance</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-sm" style={{ backgroundColor: `${DOWN_COLOR}30` }} />
            <span className="text-[8px] text-white/25">Drawdown</span>
          </div>
        </div>
      </div>

      <svg ref={svgRef} viewBox={`0 0 600 160`} className="w-full" preserveAspectRatio="none">
        {/* Drawdown area */}
        {drawdownPath && (
          <path
            d={drawdownPath}
            fill={DOWN_COLOR}
            fillOpacity={0.08}
          />
        )}

        {/* Grid lines */}
        {yLabels.map((lbl, i) => (
          <g key={i}>
            <line
              x1={padding.l}
              y1={lbl.y}
              x2={600 - padding.r}
              y2={lbl.y}
              stroke="rgba(255,255,255,0.04)"
              strokeDasharray={i === 0 ? '0' : '3,3'}
            />
            <text x={padding.l - 5} y={lbl.y + 3} textAnchor="end" className="text-[7px]" fill="rgba(255,255,255,0.25)">
              {lbl.label}
            </text>
          </g>
        ))}

        {/* Starting balance dashed line */}
        {(() => {
          const y = padding.t + (1 - (initialBalance - (points ? (yLabels[0]?.val ?? 0) : initialBalance)) / ((points ? (yLabels[0]?.val ?? 0) : initialBalance) === initialBalance ? 1 : 1)) * (points ? 120 : 1);
          // Simplified: find Y for initialBalance
          const minB = points ? yLabels[yLabels.length - 1]?.val ?? initialBalance : initialBalance;
          const maxB = points ? yLabels[0]?.val ?? initialBalance : initialBalance;
          const range = maxB - minB || 1;
          const ibY = padding.t + (1 - (initialBalance - minB) / range) * (160 - padding.t - padding.b);
          return (
            <line
              x1={padding.l}
              y1={ibY}
              x2={600 - padding.r}
              y2={ibY}
              stroke="rgba(255,255,255,0.12)"
              strokeDasharray="4,4"
            />
          );
        })()}

        {/* Balance line */}
        {points.length > 1 && (
          <motion.path
            d={points.map((pt, i) => `${i === 0 ? 'M' : 'L'}${pt.x.toFixed(1)},${pt.y.toFixed(1)}`).join(' ')}
            fill="none"
            stroke={isProfitable ? UP_COLOR : DOWN_COLOR}
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1, ease: 'easeOut' }}
          />
        )}

        {/* End dot */}
        {lastPoint && (
          <motion.circle
            cx={lastPoint.x}
            cy={lastPoint.y}
            r={3}
            fill={isProfitable ? UP_COLOR : DOWN_COLOR}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.8, duration: 0.3 }}
          />
        )}

        {/* Final balance label */}
        {lastPoint && (
          <motion.text
            x={lastPoint.x - 5}
            y={lastPoint.y - 8}
            textAnchor="end"
            className="text-[8px] font-mono font-bold"
            fill={isProfitable ? UP_COLOR : DOWN_COLOR}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.9 }}
          >
            {fmtUsd(finalBalance)}
          </motion.text>
        )}

        {/* X-axis labels */}
        {xLabels.map((lbl, i) => (
          <text
            key={i}
            x={lbl.x}
            y={160 - 4}
            textAnchor="middle"
            className="text-[7px]"
            fill="rgba(255,255,255,0.2)"
          >
            {lbl.label}
          </text>
        ))}
      </svg>
    </motion.div>
  );
}
