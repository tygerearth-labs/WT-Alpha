'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useBusinessStore } from '@/store/useBusinessStore';
import { useCurrencyFormat } from '@/hooks/useCurrencyFormat';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  LineChart,
  AreaChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  BarChart3,
  ShieldCheck,
  ShieldAlert,
  ShieldQuestion,
  ArrowUpRight,
  ArrowDownRight,
  CircleDollarSign,
  Info,
  Wallet,
  Layers,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

// ─── Color helpers ──────────────────────────────────────────────
const c = {
  primary: 'var(--primary)',
  secondary: 'var(--secondary)',
  destructive: 'var(--destructive)',
  warning: 'var(--warning)',
  muted: 'var(--muted-foreground)',
  border: 'var(--border)',
  foreground: 'var(--foreground)',
  card: 'var(--card)',
};

const alpha = (color: string, pct: number) =>
  `color-mix(in srgb, ${color} ${pct}%, transparent)`;

// ─── Types ──────────────────────────────────────────────────────
interface ForecastMonth {
  month: string;
  monthIndex: number;
  year: number;
  income: number;
  expenses: number;
  netCashFlow: number;
  projectedBalance: number;
  isForecast: boolean;
  confidenceRange?: [number, number];
}

interface ForecastCategory {
  category: string;
  total: number;
  count: number;
  percentage: number;
  type: 'income' | 'expense';
}

interface ForecastData {
  currentBalance: number;
  projectedBalance3: number;
  projectedBalance6: number;
  confidence: 'low' | 'medium' | 'high';
  confidenceScore: number;
  historicalMonths: number;
  avgMonthlyIncome: number;
  avgMonthlyExpenses: number;
  incomeTrend: number;
  expenseTrend: number;
  months: ForecastMonth[];
  categories: ForecastCategory[];
  chartData: Array<{
    month: string;
    actualIncome?: number;
    actualExpenses?: number;
    actualBalance?: number;
    forecastIncome?: number;
    forecastExpenses?: number;
    forecastBalance?: number;
    forecastUpper?: number;
    forecastLower?: number;
    isForecast: boolean;
  }>;
}

// ─── Constants ──────────────────────────────────────────────────
const MONTH_NAMES_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agt', 'Sep', 'Okt', 'Nov', 'Des'];
const MONTH_NAMES_FULL = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

// ─── Confidence badge ───────────────────────────────────────────
function ConfidenceBadge({ level, score }: { level: string; score: number }) {
  const config = {
    high: { label: 'Tinggi', color: c.secondary, bg: alpha(c.secondary, 10), icon: ShieldCheck },
    medium: { label: 'Sedang', color: c.warning, bg: alpha(c.warning, 10), icon: ShieldAlert },
    low: { label: 'Rendah', color: c.destructive, bg: alpha(c.destructive, 10), icon: ShieldQuestion },
  }[level] as { label: string; color: string; bg: string; icon: typeof ShieldCheck };

  const Icon = config.icon;

  return (
    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full" style={{ backgroundColor: config.bg, border: `1px solid ${alpha(config.color, 20)}` }}>
      <Icon className="h-3 w-3" style={{ color: config.color }} />
      <span className="text-[10px] font-semibold" style={{ color: config.color }}>{config.label}</span>
      <span className="text-[9px]" style={{ color: alpha(config.color, 60) }}>({score.toFixed(0)}%)</span>
    </div>
  );
}

// ─── Custom Chart Tooltip ──────────────────────────────────────
function ChartTooltip({
  active,
  payload,
  label,
  formatAmount,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string; dataKey: string }>;
  label?: string;
  formatAmount: (n: number) => string;
}) {
  if (!active || !payload?.length) return null;
  const isForecast = payload.some((p) => p.dataKey.startsWith('forecast'));
  return (
    <div className="rounded-lg p-3 text-xs shadow-lg min-w-[180px]"
      style={{ background: 'rgba(13,13,13,0.95)', border: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(12px)' }}>
      <div className="flex items-center gap-1.5 mb-2">
        <span className="font-semibold" style={{ color: c.foreground }}>{label}</span>
        {isForecast && (
          <Badge className="text-[8px] font-bold rounded-full px-1.5 py-0 h-4"
            style={{ backgroundColor: alpha(c.primary, 15), color: c.primary, border: 'none' }}>
            PROYEKSI
          </Badge>
        )}
      </div>
      {payload.map((entry) => {
        if (entry.dataKey === 'forecastUpper' || entry.dataKey === 'forecastLower') return null;
        return (
          <div key={entry.dataKey} className="flex items-center justify-between gap-3 py-0.5">
            <span className="flex items-center gap-1.5" style={{ color: c.muted }}>
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
              {entry.name}
            </span>
            <span className="font-semibold tabular-nums" style={{ color: entry.color }}>
              {formatAmount(entry.value)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Summary stat card ─────────────────────────────────────────
function StatCard({
  icon: Icon,
  label,
  value,
  subValue,
  iconColor,
  gradientFrom,
  gradientTo,
  delay = 0,
}: {
  icon: typeof Wallet;
  label: string;
  value: string;
  subValue?: string;
  iconColor: string;
  gradientFrom: string;
  gradientTo: string;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay }}
    >
      <Card className="rounded-xl overflow-hidden" style={{ background: c.card, border: `1px solid ${c.border}` }}>
        <div className="h-1" style={{ background: `linear-gradient(90deg, ${gradientFrom}, ${gradientTo})` }} />
        <CardContent className="p-4">
          <div className="flex items-center gap-1.5 mb-2">
            <Icon className="h-3.5 w-3.5" style={{ color: iconColor }} />
            <span className="text-[10px] font-medium uppercase tracking-wider" style={{ color: c.muted }}>{label}</span>
          </div>
          <p className="text-base sm:text-lg font-bold tabular-nums" style={{ color: iconColor }}>
            {value}
          </p>
          {subValue && (
            <p className="text-[10px] mt-0.5" style={{ color: c.muted }}>{subValue}</p>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ─── Main Component ────────────────────────────────────────────
export default function BusinessForecast() {
  const { activeBusiness } = useBusinessStore();
  const { formatAmount } = useCurrencyFormat();
  const businessId = activeBusiness?.id;

  const [months, setMonths] = useState<6 | 3 | 12>(6);
  const [data, setData] = useState<ForecastData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchForecast = useCallback(async () => {
    if (!businessId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/business/${businessId}/forecast?months=${months}`);
      if (!res.ok) throw new Error();
      const json = await res.json();
      setData(json);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [businessId, months]);

  useEffect(() => {
    fetchForecast();
  }, [fetchForecast]);

  // ── Category breakdown (expense) sorted by total ──
  const expenseCategories = useMemo(() => {
    if (!data) return [];
    return data.categories
      .filter((cat) => cat.type === 'expense')
      .sort((a, b) => b.total - a.total)
      .slice(0, 6);
  }, [data]);

  const incomeCategories = useMemo(() => {
    if (!data) return [];
    return data.categories
      .filter((cat) => cat.type === 'income')
      .sort((a, b) => b.total - a.total)
      .slice(0, 6);
  }, [data]);

  // ── Guard ──
  if (!businessId) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <BarChart3 className="h-12 w-12 mx-auto mb-3" style={{ color: alpha(c.primary, 30) }} />
          <p className="text-sm" style={{ color: c.muted }}>Silakan daftarkan Bisnis terlebih dahulu</p>
        </div>
      </div>
    );
  }

  const chartData = data?.chartData ?? [];

  return (
    <div className="space-y-3">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: alpha(c.primary, 10) }}>
            <BarChart3 className="h-4 w-4" style={{ color: c.primary }} />
          </div>
          <div>
            <h2 className="text-sm font-bold" style={{ color: c.foreground }}>Proyeksi Arus Kas</h2>
            <p className="text-[10px]" style={{ color: c.muted }}>Cash Flow Forecast</p>
          </div>
        </div>

        {/* Month Selector */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl" style={{ background: alpha(c.primary, 5), border: `1px solid ${alpha(c.primary, 10)}` }}>
          {([3, 6, 12] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMonths(m)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all duration-200',
                months === m
                  ? 'shadow-sm'
                  : 'hover:bg-white/[0.04]',
              )}
              style={months === m ? {
                backgroundColor: c.primary,
                color: 'var(--primary-foreground)',
              } : { color: c.muted }}
            >
              {m} Bln
            </button>
          ))}
        </div>
      </div>

      {/* ── Info Banner ── */}
      {data && (
        <div className="flex items-start gap-2 p-3 rounded-xl"
          style={{ background: alpha(c.primary, 5), border: `1px solid ${alpha(c.primary, 10)}` }}>
          <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" style={{ color: alpha(c.primary, 60) }} />
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <p className="text-[11px] leading-relaxed" style={{ color: alpha(c.foreground, 70) }}>
              Proyeksi berdasarkan data {data.historicalMonths} bulan terakhir menggunakan analisis tren linear &amp; pola musiman.
            </p>
            <ConfidenceBadge level={data.confidence} score={data.confidenceScore} />
          </div>
        </div>
      )}

      {/* ── Summary Cards ── */}
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      ) : data ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard
            icon={Wallet}
            label="Saldo Saat Ini"
            value={formatAmount(data.currentBalance)}
            iconColor={c.foreground}
            gradientFrom={c.primary}
            gradientTo={alpha(c.primary, 40)}
          />
          <StatCard
            icon={months >= 3 ? TrendingUp : Wallet}
            label="Proyeksi 3 Bulan"
            value={formatAmount(data.projectedBalance3)}
            subValue={data.currentBalance > 0 ? `${data.projectedBalance3 >= data.currentBalance ? '+' : ''}${((data.projectedBalance3 - data.currentBalance) / Math.abs(data.currentBalance || 1) * 100).toFixed(1)}%` : undefined}
            iconColor={data.projectedBalance3 >= data.currentBalance ? c.secondary : c.destructive}
            gradientFrom={data.projectedBalance3 >= data.currentBalance ? c.secondary : c.destructive}
            gradientTo={alpha(data.projectedBalance3 >= data.currentBalance ? c.secondary : c.destructive, 40)}
            delay={0.05}
          />
          <StatCard
            icon={months >= 6 ? TrendingUp : Wallet}
            label="Proyeksi 6 Bulan"
            value={formatAmount(data.projectedBalance6)}
            subValue={data.currentBalance > 0 ? `${data.projectedBalance6 >= data.currentBalance ? '+' : ''}${((data.projectedBalance6 - data.currentBalance) / Math.abs(data.currentBalance || 1) * 100).toFixed(1)}%` : undefined}
            iconColor={data.projectedBalance6 >= data.currentBalance ? c.secondary : c.destructive}
            gradientFrom={data.projectedBalance6 >= data.currentBalance ? c.secondary : c.destructive}
            gradientTo={alpha(data.projectedBalance6 >= data.currentBalance ? c.secondary : c.destructive, 40)}
            delay={0.1}
          />
          <StatCard
            icon={Layers}
            label="Rata-rata Bulanan"
            value={formatAmount(data.avgMonthlyIncome - data.avgMonthlyExpenses)}
            subValue={`Masuk ${formatAmount(data.avgMonthlyIncome)} · Keluar ${formatAmount(data.avgMonthlyExpenses)}`}
            iconColor={data.avgMonthlyIncome >= data.avgMonthlyExpenses ? c.secondary : c.destructive}
            gradientFrom={c.warning}
            gradientTo={alpha(c.warning, 40)}
            delay={0.15}
          />
        </div>
      ) : null}

      {/* ── Chart: Historical + Forecast ── */}
      {loading ? (
        <Skeleton className="h-72 sm:h-80 rounded-xl" />
      ) : chartData.length > 0 ? (
        <Card className="rounded-xl" style={{ background: c.card, border: `1px solid ${c.border}` }}>
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="h-6 w-6 rounded-md flex items-center justify-center"
                style={{ backgroundColor: alpha(c.primary, 8) }}>
                <BarChart3 className="h-3 w-3" style={{ color: c.primary }} />
              </div>
              <h3 className="text-xs font-semibold" style={{ color: c.foreground }}>
                Arus Kas — Riwayat &amp; Proyeksi
              </h3>
            </div>
            <div className="h-60 sm:h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 4, bottom: 4 }}>
                  <defs>
                    <linearGradient id="gradForecastBalance" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={c.primary} stopOpacity={0.25} />
                      <stop offset="95%" stopColor={c.primary} stopOpacity={0.02} />
                    </linearGradient>
                    <linearGradient id="gradConfidenceBand" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={c.primary} stopOpacity={0.1} />
                      <stop offset="95%" stopColor={c.primary} stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={alpha(c.border, 25)} />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 10, fill: alpha(c.muted, 65) }}
                    axisLine={{ stroke: alpha(c.border, 15) }}
                    tickLine={false}
                    interval={chartData.length > 12 ? 1 : 0}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: alpha(c.muted, 65) }}
                    axisLine={{ stroke: alpha(c.border, 15) }}
                    tickLine={false}
                    tickFormatter={(v) => {
                      if (Math.abs(v) >= 1_000_000) return `${(v / 1_000_000).toFixed(0)}Jt`;
                      if (Math.abs(v) >= 1_000) return `${(v / 1_000).toFixed(0)}Rb`;
                      return String(v);
                    }}
                    width={55}
                  />
                  <Tooltip content={<ChartTooltip formatAmount={formatAmount} />} />
                  <Legend
                    iconType="circle"
                    iconSize={6}
                    wrapperStyle={{ fontSize: '10px', paddingTop: '8px' }}
                  />

                  {/* Confidence band */}
                  {data && data.confidence !== 'low' && (
                    <Area
                      type="monotone"
                      dataKey="forecastUpper"
                      name="Batas Atas"
                      stroke="none"
                      fill="url(#gradConfidenceBand)"
                      connectNulls
                      fillOpacity={0.6}
                    />
                  )}
                  {data && data.confidence !== 'low' && (
                    <Area
                      type="monotone"
                      dataKey="forecastLower"
                      name="Batas Bawah"
                      stroke="none"
                      fill="var(--card)"
                      connectNulls
                    />
                  )}

                  {/* Actual balance */}
                  <Line
                    type="monotone"
                    dataKey="actualBalance"
                    name="Saldo Aktual"
                    stroke={String(c.foreground)}
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4, strokeWidth: 0 }}
                    connectNulls
                  />

                  {/* Forecast balance */}
                  <Area
                    type="monotone"
                    dataKey="forecastBalance"
                    name="Saldo Proyeksi"
                    stroke={String(c.primary)}
                    strokeWidth={2}
                    strokeDasharray="6 3"
                    fill="url(#gradForecastBalance)"
                    dot={false}
                    activeDot={{ r: 4, strokeWidth: 0, strokeDasharray: '' }}
                    connectNulls
                  />

                  {/* Actual income line */}
                  <Line
                    type="monotone"
                    dataKey="actualIncome"
                    name="Pemasukan Aktual"
                    stroke={String(c.secondary)}
                    strokeWidth={1.5}
                    dot={false}
                    activeDot={{ r: 3, strokeWidth: 0 }}
                    connectNulls
                  />

                  {/* Forecast income line */}
                  <Line
                    type="monotone"
                    dataKey="forecastIncome"
                    name="Pemasukan Proyeksi"
                    stroke={String(c.secondary)}
                    strokeWidth={1.5}
                    strokeDasharray="4 3"
                    dot={false}
                    activeDot={{ r: 3, strokeWidth: 0 }}
                    connectNulls
                  />

                  {/* Zero reference line */}
                  <ReferenceLine y={0} stroke={alpha(c.muted, 20)} strokeDasharray="3 3" />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Legend explanation */}
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 pt-3" style={{ borderTop: `1px solid ${c.border}` }}>
              <div className="flex items-center gap-1.5">
                <div className="w-4 h-[2px] rounded" style={{ backgroundColor: c.foreground }} />
                <span className="text-[10px]" style={{ color: c.muted }}>Aktual</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-4 h-[2px] rounded" style={{ backgroundColor: c.primary }} />
                <div className="w-1 h-[2px]" />
                <div className="w-1 h-[2px]" />
                <div className="w-1 h-[2px]" />
                <span className="text-[10px]" style={{ color: c.muted }}>Proyeksi</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-4 h-[2px] rounded" style={{ backgroundColor: c.secondary }} />
                <span className="text-[10px]" style={{ color: c.muted }}>Pemasukan</span>
              </div>
              {data && data.confidence !== 'low' && (
                <div className="flex items-center gap-1.5">
                  <div className="w-4 h-2 rounded-sm" style={{ backgroundColor: alpha(c.primary, 12), border: `1px solid ${alpha(c.primary, 20)}` }} />
                  <span className="text-[10px]" style={{ color: c.muted }}>Rentang Keyakinan</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* ── Monthly Forecast Breakdown ── */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
      ) : data && data.months.length > 0 ? (
        <Card className="rounded-xl" style={{ background: c.card, border: `1px solid ${c.border}` }}>
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="h-6 w-6 rounded-md flex items-center justify-center"
                style={{ backgroundColor: alpha(c.warning, 10) }}>
                <CircleDollarSign className="h-3 w-3" style={{ color: c.warning }} />
              </div>
              <h3 className="text-xs font-semibold" style={{ color: c.foreground }}>
                Rincian Proyeksi Bulanan
              </h3>
              <Badge className="ml-auto text-[9px] font-medium rounded-full px-1.5 py-0"
                style={{
                  backgroundColor: alpha(c.primary, 8),
                  color: c.primary,
                  border: `1px solid ${alpha(c.primary, 15)}`,
                }}>
                {data.months.filter((m) => m.isForecast).length} bulan
              </Badge>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-[420px] overflow-y-auto pr-1">
              {data.months.map((m, idx) => {
                const isPositive = m.netCashFlow >= 0;
                return (
                  <motion.div
                    key={`${m.month}-${m.year}`}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, delay: idx * 0.03 }}
                    className="p-3 rounded-xl transition-colors"
                    style={{
                      background: m.isForecast ? alpha(c.primary, 4) : alpha(c.muted, 3),
                      border: `1px solid ${m.isForecast ? alpha(c.primary, 10) : alpha(c.border, 0.5)}`,
                    }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] font-semibold" style={{ color: c.foreground }}>
                          {m.month} {m.year}
                        </span>
                        {m.isForecast && (
                          <Badge className="text-[7px] font-bold rounded px-1 py-0 h-3"
                            style={{ backgroundColor: alpha(c.primary, 12), color: c.primary, border: 'none' }}>
                            PROYEKSI
                          </Badge>
                        )}
                      </div>
                      <div className={cn('flex items-center gap-0.5 text-[10px] font-semibold', isPositive ? 'text-emerald-400' : 'text-red-400')}>
                        {isPositive ? <ArrowUpRight className="h-2.5 w-2.5" /> : <ArrowDownRight className="h-2.5 w-2.5" />}
                        {formatAmount(m.netCashFlow)}
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px]" style={{ color: c.muted }}>Pemasukan</span>
                        <span className="text-[10px] font-semibold tabular-nums" style={{ color: c.secondary }}>
                          {formatAmount(m.income)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px]" style={{ color: c.muted }}>Pengeluaran</span>
                        <span className="text-[10px] font-semibold tabular-nums" style={{ color: c.destructive }}>
                          {formatAmount(m.expenses)}
                        </span>
                      </div>
                      <div className="h-px" style={{ backgroundColor: alpha(c.border, 0.5) }} />
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-medium" style={{ color: c.foreground }}>Saldo</span>
                        <span className="text-[10px] font-bold tabular-nums" style={{ color: m.projectedBalance >= 0 ? c.foreground : c.destructive }}>
                          {formatAmount(m.projectedBalance)}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* ── Category Breakdown ── */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Skeleton className="h-52 rounded-xl" />
          <Skeleton className="h-52 rounded-xl" />
        </div>
      ) : (expenseCategories.length > 0 || incomeCategories.length > 0) ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Expense Categories */}
          {expenseCategories.length > 0 && (
            <Card className="rounded-xl" style={{ background: c.card, border: `1px solid ${c.border}` }}>
              <CardContent className="p-4 sm:p-5">
                <div className="flex items-center gap-2 mb-3">
                  <div className="h-6 w-6 rounded-md flex items-center justify-center"
                    style={{ backgroundColor: alpha(c.destructive, 10) }}>
                    <TrendingDown className="h-3 w-3" style={{ color: c.destructive }} />
                  </div>
                  <h3 className="text-xs font-semibold" style={{ color: c.foreground }}>
                    Kategori Pengeluaran Teratas
                  </h3>
                </div>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {expenseCategories.map((cat) => (
                    <div key={cat.category} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-medium" style={{ color: c.foreground }}>
                          {cat.category}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px]" style={{ color: c.muted }}>{cat.percentage.toFixed(1)}%</span>
                          <span className="text-[11px] font-semibold tabular-nums" style={{ color: c.destructive }}>
                            {formatAmount(cat.total)}
                          </span>
                        </div>
                      </div>
                      <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: alpha(c.destructive, 8) }}>
                        <motion.div
                          className="h-full rounded-full"
                          style={{ backgroundColor: c.destructive }}
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min(cat.percentage, 100)}%` }}
                          transition={{ duration: 0.5, ease: 'easeOut' }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Income Categories */}
          {incomeCategories.length > 0 && (
            <Card className="rounded-xl" style={{ background: c.card, border: `1px solid ${c.border}` }}>
              <CardContent className="p-4 sm:p-5">
                <div className="flex items-center gap-2 mb-3">
                  <div className="h-6 w-6 rounded-md flex items-center justify-center"
                    style={{ backgroundColor: alpha(c.secondary, 10) }}>
                    <TrendingUp className="h-3 w-3" style={{ color: c.secondary }} />
                  </div>
                  <h3 className="text-xs font-semibold" style={{ color: c.foreground }}>
                    Kategori Pemasukan Teratas
                  </h3>
                </div>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {incomeCategories.map((cat) => (
                    <div key={cat.category} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-medium" style={{ color: c.foreground }}>
                          {cat.category}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px]" style={{ color: c.muted }}>{cat.percentage.toFixed(1)}%</span>
                          <span className="text-[11px] font-semibold tabular-nums" style={{ color: c.secondary }}>
                            {formatAmount(cat.total)}
                          </span>
                        </div>
                      </div>
                      <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: alpha(c.secondary, 8) }}>
                        <motion.div
                          className="h-full rounded-full"
                          style={{ backgroundColor: c.secondary }}
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min(cat.percentage, 100)}%` }}
                          transition={{ duration: 0.5, ease: 'easeOut' }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      ) : null}

      {/* ── Trend Indicators ── */}
      {loading ? (
        <Skeleton className="h-20 rounded-xl" />
      ) : data ? (
        <Card className="rounded-xl" style={{ background: c.card, border: `1px solid ${c.border}` }}>
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="h-6 w-6 rounded-md flex items-center justify-center"
                style={{ backgroundColor: alpha(c.primary, 8) }}>
                <TrendingUp className="h-3 w-3" style={{ color: c.primary }} />
              </div>
              <h3 className="text-xs font-semibold" style={{ color: c.foreground }}>
                Indikator Tren
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Income Trend */}
              <div className="p-3 rounded-lg" style={{ background: alpha(c.secondary, 4), border: `1px solid ${alpha(c.secondary, 8)}` }}>
                <div className="flex items-center gap-1.5 mb-1">
                  {data.incomeTrend >= 0 ? (
                    <ArrowUpRight className="h-3 w-3" style={{ color: c.secondary }} />
                  ) : (
                    <ArrowDownRight className="h-3 w-3" style={{ color: c.destructive }} />
                  )}
                  <span className="text-[10px] font-medium" style={{ color: c.muted }}>Tren Pemasukan</span>
                </div>
                <p className="text-sm font-bold tabular-nums"
                  style={{ color: data.incomeTrend >= 0 ? c.secondary : c.destructive }}>
                  {data.incomeTrend >= 0 ? '+' : ''}{data.incomeTrend.toFixed(1)}% / bulan
                </p>
                <p className="text-[9px] mt-0.5" style={{ color: c.muted }}>
                  {data.incomeTrend >= 0 ? 'Pemasukan cenderung naik' : 'Pemasukan cenderung turun'}
                </p>
              </div>

              {/* Expense Trend */}
              <div className="p-3 rounded-lg" style={{ background: alpha(c.destructive, 4), border: `1px solid ${alpha(c.destructive, 8)}` }}>
                <div className="flex items-center gap-1.5 mb-1">
                  {data.expenseTrend <= 0 ? (
                    <ArrowDownRight className="h-3 w-3" style={{ color: c.secondary }} />
                  ) : (
                    <ArrowUpRight className="h-3 w-3" style={{ color: c.destructive }} />
                  )}
                  <span className="text-[10px] font-medium" style={{ color: c.muted }}>Tren Pengeluaran</span>
                </div>
                <p className="text-sm font-bold tabular-nums"
                  style={{ color: data.expenseTrend <= 0 ? c.secondary : c.destructive }}>
                  {data.expenseTrend >= 0 ? '+' : ''}{data.expenseTrend.toFixed(1)}% / bulan
                </p>
                <p className="text-[9px] mt-0.5" style={{ color: c.muted }}>
                  {data.expenseTrend <= 0 ? 'Pengeluaran terkendali' : 'Pengeluaran meningkat'}
                </p>
              </div>

              {/* Cash Flow Health */}
              <div className="p-3 rounded-lg" style={{
                background: alpha(data.avgMonthlyIncome >= data.avgMonthlyExpenses ? c.secondary : c.destructive, 4),
                border: `1px solid ${alpha(data.avgMonthlyIncome >= data.avgMonthlyExpenses ? c.secondary : c.destructive, 8)}`,
              }}>
                <div className="flex items-center gap-1.5 mb-1">
                  <CircleDollarSign className="h-3 w-3" style={{
                    color: data.avgMonthlyIncome >= data.avgMonthlyExpenses ? c.secondary : c.destructive,
                  }} />
                  <span className="text-[10px] font-medium" style={{ color: c.muted }}>Kesehatan Arus Kas</span>
                </div>
                <p className="text-sm font-bold tabular-nums" style={{
                  color: data.avgMonthlyIncome >= data.avgMonthlyExpenses ? c.secondary : c.destructive,
                }}>
                  {data.avgMonthlyIncome >= data.avgMonthlyExpenses ? 'Positif' : 'Negatif'}
                </p>
                <p className="text-[9px] mt-0.5" style={{ color: c.muted }}>
                  {data.avgMonthlyIncome >= data.avgMonthlyExpenses
                    ? `Rasio arus kas: ${((data.avgMonthlyIncome / Math.max(data.avgMonthlyExpenses, 1)) * 100).toFixed(0)}%`
                    : 'Pengeluaran melebihi pemasukan'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
