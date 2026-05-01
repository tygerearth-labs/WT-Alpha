'use client';

import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useBusinessStore } from '@/store/useBusinessStore';
import { useCurrencyFormat } from '@/hooks/useCurrencyFormat';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  DollarSign,
  BarChart3,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Printer,
  FileSpreadsheet,
  Wallet,
  Receipt,
  CircleDollarSign,
  Percent,
  Info,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

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
type PeriodType = 'monthly' | 'quarterly' | 'yearly';

interface PnLCategoryRow {
  category: string;
  total: number;
  count: number;
  percentage: number;
}

interface PnLData {
  period: {
    type: PeriodType;
    year: number;
    month?: number;
    quarter?: number;
    label: string;
  };
  summary: {
    totalRevenue: number;
    totalExpenses: number;
    grossProfit: number;
    operatingExpenses: number;
    netProfit: number;
    profitMargin: number;
  };
  revenueCategories: PnLCategoryRow[];
  expenseCategories: PnLCategoryRow[];
  comparison: {
    prevRevenue: number;
    prevExpenses: number;
    prevNetProfit: number;
    prevProfitMargin: number;
    revenueChange: number;
    expensesChange: number;
    netProfitChange: number;
    profitMarginChange: number;
  } | null;
  chartData: Array<{
    period: string;
    revenue: number;
    expenses: number;
    netProfit: number;
  }>;
}

const MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

const QUARTER_LABELS = ['Q1 (Jan-Mar)', 'Q2 (Apr-Jun)', 'Q3 (Jul-Sep)', 'Q4 (Okt-Des)'];

// ─── Animated Counter Hook ──────────────────────────────────────
function useAnimatedCounter(target: number, duration: number = 700) {
  const [count, setCount] = useState(0);
  const prevRef = useRef(0);

  useEffect(() => {
    const start = prevRef.current;
    const diff = target - start;
    const startTime = performance.now();
    let raf: number;

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(start + diff * eased);
      if (progress < 1) raf = requestAnimationFrame(animate);
    };

    raf = requestAnimationFrame(animate);
    prevRef.current = target;
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);

  return count;
}

// ─── Change Indicator ──────────────────────────────────────────
function ChangeIndicator({ value, label }: { value: number | null; label: string }) {
  if (value === null || value === undefined) return null;
  const isPositive = value >= 0;
  const Icon = isPositive ? ArrowUpRight : ArrowDownRight;
  const color = isPositive ? c.secondary : c.destructive;
  const bg = isPositive ? alpha(c.secondary, 8) : alpha(c.destructive, 8);

  return (
    <div className="flex items-center gap-1 mt-1" title={`vs periode sebelumnya: ${isPositive ? '+' : ''}${value.toFixed(1)}%`}>
      <div className="inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
        style={{ backgroundColor: bg, color }}>
        <Icon className="h-2.5 w-2.5" />
        {Math.abs(value).toFixed(1)}%
      </div>
      <span className="text-[9px]" style={{ color: c.muted }}>{label}</span>
    </div>
  );
}

// ─── Section Title ─────────────────────────────────────────────
function SectionTitle({ children, icon: Icon, color }: { children: React.ReactNode; icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>; color: string }) {
  return (
    <div className="biz-section-header flex items-center gap-2 mb-3 sm:mb-4">
      <div className="biz-section-header-icon h-7 w-7 rounded-lg flex items-center justify-center"
        style={{ backgroundColor: alpha(color, 10) }}>
        <Icon className="h-3.5 w-3.5" style={{ color }} />
      </div>
      <h3
        className="text-xs font-bold tracking-tight"
        style={{
          background: `linear-gradient(135deg, ${c.foreground}, ${alpha(c.foreground, 65)})`,
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}
      >
        {children}
      </h3>
    </div>
  );
}

// ─── Period Navigator ──────────────────────────────────────────
function PeriodNavigator({
  period,
  year,
  month,
  quarter,
  onPeriodChange,
  onYearChange,
  onMonthChange,
  onQuarterChange,
  onPrev,
  onNext,
}: {
  period: PeriodType;
  year: number;
  month: number;
  quarter: number;
  onPeriodChange: (v: PeriodType) => void;
  onYearChange: (v: number) => void;
  onMonthChange: (v: number) => void;
  onQuarterChange: (v: number) => void;
  onPrev: () => void;
  onNext: () => void;
}) {
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);
  const months = MONTH_NAMES.map((name, i) => ({ value: i + 1, label: name }));

  return (
    <Card className="biz-content-card rounded-xl bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] transition-colors duration-300 hover:bg-white/[0.05]">
      <CardContent className="p-3 sm:p-4">
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          <div className="flex items-center gap-2 shrink-0">
            <div className="h-6 w-6 rounded-md flex items-center justify-center"
              style={{ backgroundColor: alpha(c.primary, 8) }}>
              <CalendarDays className="h-3 w-3" style={{ color: c.primary }} />
            </div>
            <Label className="text-[10px] font-medium uppercase tracking-wider"
              style={{ color: c.muted }}>Periode</Label>
          </div>

          <div className="flex items-center gap-2 flex-1 flex-wrap">
            <Select value={period} onValueChange={(v) => onPeriodChange(v as PeriodType)}>
              <SelectTrigger className="w-[140px] h-8 text-xs rounded-lg"
                style={{ background: 'transparent', border: `1px solid ${c.border}`, color: c.foreground }}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="monthly">Bulanan</SelectItem>
                <SelectItem value="quarterly">Triwulanan</SelectItem>
                <SelectItem value="yearly">Tahunan</SelectItem>
              </SelectContent>
            </Select>

            {period === 'yearly' ? (
              <Select value={String(year)} onValueChange={(v) => onYearChange(Number(v))}>
                <SelectTrigger className="w-[100px] h-8 text-xs rounded-lg"
                  style={{ background: 'transparent', border: `1px solid ${c.border}`, color: c.foreground }}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {years.map((y) => (
                    <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : period === 'monthly' ? (
              <>
                <Select value={String(month)} onValueChange={(v) => onMonthChange(Number(v))}>
                  <SelectTrigger className="w-[130px] h-8 text-xs rounded-lg"
                    style={{ background: 'transparent', border: `1px solid ${c.border}`, color: c.foreground }}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {months.map((m) => (
                      <SelectItem key={m.value} value={String(m.value)}>{m.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={String(year)} onValueChange={(v) => onYearChange(Number(v))}>
                  <SelectTrigger className="w-[100px] h-8 text-xs rounded-lg"
                    style={{ background: 'transparent', border: `1px solid ${c.border}`, color: c.foreground }}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {years.map((y) => (
                      <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </>
            ) : (
              <>
                <Select value={String(quarter)} onValueChange={(v) => onQuarterChange(Number(v))}>
                  <SelectTrigger className="w-[130px] h-8 text-xs rounded-lg"
                    style={{ background: 'transparent', border: `1px solid ${c.border}`, color: c.foreground }}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {QUARTER_LABELS.map((label, i) => (
                      <SelectItem key={i + 1} value={String(i + 1)}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={String(year)} onValueChange={(v) => onYearChange(Number(v))}>
                  <SelectTrigger className="w-[100px] h-8 text-xs rounded-lg"
                    style={{ background: 'transparent', border: `1px solid ${c.border}`, color: c.foreground }}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {years.map((y) => (
                      <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </>
            )}

            {/* Prev/Next arrows */}
            <div className="flex items-center gap-1 ml-auto sm:ml-0">
              <button
                onClick={onPrev}
                className="h-8 w-8 rounded-lg flex items-center justify-center transition-colors"
                style={{ background: alpha(c.primary, 8), color: c.primary, border: `1px solid ${alpha(c.primary, 15)}` }}
                title="Periode sebelumnya"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={onNext}
                className="h-8 w-8 rounded-lg flex items-center justify-center transition-colors"
                style={{ background: alpha(c.primary, 8), color: c.primary, border: `1px solid ${alpha(c.primary, 15)}` }}
                title="Periode berikutnya"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Custom Tooltip for Chart ──────────────────────────────────
function CustomTooltip({
  active,
  payload,
  label: tooltipLabel,
  formatAmount,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
  formatAmount: (n: number) => string;
}) {
  if (!active || !payload) return null;
  return (
    <div className="rounded-lg p-2.5 text-xs shadow-lg"
      style={{ background: 'rgba(13,13,13,0.95)', border: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(12px)' }}>
      <p className="font-semibold mb-1.5" style={{ color: c.foreground }}>{tooltipLabel}</p>
      {payload.map((entry) => (
        <div key={entry.name} className="flex items-center justify-between gap-4 py-0.5">
          <span className="flex items-center gap-1.5" style={{ color: c.muted }}>
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
            {entry.name}
          </span>
          <span className="font-semibold tabular-nums" style={{ color: entry.color }}>
            {formatAmount(entry.value)}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────
export default function BusinessPnL() {
  const { activeBusiness } = useBusinessStore();
  const { formatAmount } = useCurrencyFormat();
  const businessId = activeBusiness?.id;

  // ── State ──
  const now = new Date();
  const [period, setPeriod] = useState<PeriodType>('monthly');
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [quarter, setQuarter] = useState(Math.ceil((now.getMonth() + 1) / 3));
  const [data, setData] = useState<PnLData | null>(null);
  const [loading, setLoading] = useState(true);

  // ── Animated Counters ──
  const animRevenue = useAnimatedCounter(data?.summary.totalRevenue ?? 0);
  const animExpenses = useAnimatedCounter(data?.summary.totalExpenses ?? 0);
  const animNetProfit = useAnimatedCounter(data?.summary.netProfit ?? 0);
  const animMargin = useAnimatedCounter(data?.summary.profitMargin ?? 0, 500);

  // ── Period Navigation ──
  const handlePrev = useCallback(() => {
    if (period === 'monthly') {
      if (month === 1) { setMonth(12); setYear(year - 1); }
      else setMonth(month - 1);
    } else if (period === 'quarterly') {
      if (quarter === 1) { setQuarter(4); setYear(year - 1); }
      else setQuarter(quarter - 1);
    } else {
      setYear(year - 1);
    }
  }, [period, month, quarter, year]);

  const handleNext = useCallback(() => {
    const maxYear = now.getFullYear();
    const maxMonth = now.getMonth() + 1;
    const maxQuarter = Math.ceil(maxMonth / 3);

    if (period === 'monthly') {
      if (year >= maxYear && month >= maxMonth) return;
      if (month === 12) { setMonth(1); setYear(year + 1); }
      else setMonth(month + 1);
    } else if (period === 'quarterly') {
      if (year >= maxYear && quarter >= maxQuarter) return;
      if (quarter === 4) { setQuarter(1); setYear(year + 1); }
      else setQuarter(quarter + 1);
    } else {
      if (year >= maxYear) return;
      setYear(year + 1);
    }
  }, [period, month, quarter, year, now]);

  // ── Period label ──
  const periodLabel = useMemo(() => {
    if (period === 'monthly') return `${MONTH_NAMES[month - 1]} ${year}`;
    if (period === 'quarterly') return `Q${quarter} ${year}`;
    return `Tahun ${year}`;
  }, [period, month, quarter, year]);

  // ── Fetch Data ──
  const fetchPnL = useCallback(async () => {
    if (!businessId) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ period, year: String(year) });
      if (period === 'monthly') params.set('month', String(month));
      if (period === 'quarterly') params.set('quarter', String(quarter));

      const res = await fetch(`/api/business/${businessId}/pnl?${params}`);
      if (!res.ok) throw new Error();
      const json = await res.json();
      setData(json);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [businessId, period, year, month, quarter]);

  useEffect(() => {
    fetchPnL();
  }, [fetchPnL]);

  // ── Print handler ──
  const handlePrint = () => {
    window.print();
    toast.success('Menyiapkan cetak laporan...');
  };

  // ── Export CSV handler ──
  const handleExportCSV = () => {
    if (!data) return;
    const rows: string[][] = [
      ['Laporan Laba Rugi', data.period.label],
      [],
      ['PENDAPATAN'],
      ['Kategori', 'Jumlah', 'Jumlah Transaksi', '% dari Total'],
      ...data.revenueCategories.map((r) => [
        r.category,
        String(r.total),
        String(r.count),
        `${r.percentage.toFixed(1)}%`,
      ]),
      ['Total Pendapatan', String(data.summary.totalRevenue)],
      [],
      ['PENGELUARAN'],
      ['Kategori', 'Jumlah', 'Jumlah Transaksi', '% dari Total'],
      ...data.expenseCategories.map((r) => [
        r.category,
        String(r.total),
        String(r.count),
        `${r.percentage.toFixed(1)}%`,
      ]),
      ['Total Pengeluaran', String(data.summary.totalExpenses)],
      [],
      ['Laba Bersih', String(data.summary.netProfit)],
      ['Margin Laba', `${data.summary.profitMargin.toFixed(1)}%`],
    ];

    if (data.comparison) {
      rows.push(
        [],
        ['PERBANDINGAN DENGAN PERIODE SEBELUMNYA'],
        ['Perubahan Pendapatan', `${data.comparison.revenueChange >= 0 ? '+' : ''}${data.comparison.revenueChange.toFixed(1)}%`],
        ['Perubahan Pengeluaran', `${data.comparison.expensesChange >= 0 ? '+' : ''}${data.comparison.expensesChange.toFixed(1)}%`],
        ['Perubahan Laba Bersih', `${data.comparison.netProfitChange >= 0 ? '+' : ''}${data.comparison.netProfitChange.toFixed(1)}%`],
      );
    }

    const csv = rows.map((r) => r.map((cell) => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Laporan_Laba_Rugi_${data.period.label.replace(/\s+/g, '_')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Export CSV berhasil!');
  };

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

  const summary = data?.summary;
  const comparison = data?.comparison;
  const isProfit = (summary?.netProfit ?? 0) >= 0;
  const chartData = data?.chartData ?? [];

  return (
    <div className="relative space-y-3 sm:space-y-4 print:space-y-2 overflow-hidden">
      <style>{`
        @keyframes heroGlow {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 0.6; }
        }
        @keyframes shimmer {
          0% { transform: translateX(-150%); }
          100% { transform: translateX(250%); }
        }
      `}</style>
      {/* ── Ambient Background Effects ── */}
      <div className="pointer-events-none absolute -top-40 -left-40 h-[400px] w-[400px] rounded-full blur-[100px]"
        style={{ backgroundColor: alpha(c.secondary, 3) }} aria-hidden="true" />
      <div className="pointer-events-none absolute top-1/3 -right-40 h-[350px] w-[350px] rounded-full blur-[100px]"
        style={{ backgroundColor: alpha(c.destructive, 2.5) }} aria-hidden="true" />
      <div className="pointer-events-none absolute -bottom-24 left-1/4 h-[300px] w-[300px] rounded-full blur-[100px]"
        style={{ backgroundColor: alpha(c.warning, 2) }} aria-hidden="true" />

      {/* ── Header ── */}
      <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: alpha(c.secondary, 10), boxShadow: `0 0 20px ${alpha(c.secondary, 8)}` }}>
            <BarChart3 className="h-4 w-4" style={{ color: c.secondary }} />
          </div>
          <div>
            <h2 className="text-sm font-extrabold tracking-tight" style={{ color: c.foreground }}>Laporan Laba Rugi</h2>
            <p className="text-[10px]" style={{ color: c.muted }}>Profit & Loss Statement</p>
          </div>
        </div>
        <div className="flex gap-2 print:hidden">
          <Button
            onClick={handleExportCSV}
            size="sm"
            variant="outline"
            className="rounded-lg text-xs h-8 transition-colors duration-200 hover:bg-white/[0.05]"
            style={{ borderColor: alpha(c.secondary, 15), color: c.secondary }}
          >
            <FileSpreadsheet className="mr-1 h-3 w-3" />
            CSV
          </Button>
          <Button
            onClick={handlePrint}
            size="sm"
            variant="outline"
            className="rounded-lg text-xs h-8 transition-colors duration-200 hover:bg-white/[0.05]"
            style={{ borderColor: alpha(c.warning, 15), color: c.warning }}
          >
            <Printer className="mr-1 h-3 w-3" />
            Cetak
          </Button>
        </div>
      </div>

      {/* ── Period Selector ── */}
      <div className="relative print:hidden">
        <PeriodNavigator
          period={period}
          year={year}
          month={month}
          quarter={quarter}
          onPeriodChange={setPeriod}
          onYearChange={setYear}
          onMonthChange={setMonth}
          onQuarterChange={setQuarter}
          onPrev={handlePrev}
          onNext={handleNext}
        />
      </div>

      {/* ── Print-only period label ── */}
      <div className="hidden print:block text-center mb-4">
        <h3 className="text-lg font-bold">Laporan Laba Rugi — {periodLabel}</h3>
        <p className="text-xs text-gray-500">{activeBusiness?.name}</p>
      </div>

      {/* ── Summary Cards ── */}
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Total Revenue — Emerald glow */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ scale: 1.005 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25, duration: 0.3 }}
          >
            <div className="relative">
              {/* Ambient glow behind card */}
              <div className="absolute -bottom-3 -left-2 h-16 w-16 rounded-full blur-3xl"
                style={{ backgroundColor: alpha(c.secondary, 15) }} />
              <Card className="biz-content-card relative rounded-xl bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] overflow-hidden transition-all duration-300 hover:bg-white/[0.05] hover:border-white/[0.12]">
                {/* Bottom accent glow line */}
                <div className="absolute bottom-0 left-6 right-6 h-px"
                  style={{ background: `linear-gradient(90deg, transparent, ${alpha(c.secondary, 35)}, transparent)` }} />
                <CardContent className="relative p-4 sm:p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="h-8 w-8 rounded-lg flex items-center justify-center"
                      style={{ background: alpha(c.secondary, 10) }}>
                      <TrendingUp className="h-4 w-4" style={{ color: c.secondary }} />
                    </div>
                    <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: c.muted }}>Total Pendapatan</span>
                  </div>
                  <p className="text-lg sm:text-xl font-extrabold tabular-nums tracking-tight"
                    style={{ color: c.secondary, textShadow: `0 0 24px ${alpha(c.secondary, 20)}` }}>
                    {formatAmount(animRevenue)}
                  </p>
                  {comparison && (
                    <ChangeIndicator value={comparison.revenueChange} label="vs sebelumnya" />
                  )}
                </CardContent>
              </Card>
            </div>
          </motion.div>

          {/* Total Expenses — Rose glow */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ scale: 1.005 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25, duration: 0.3, delay: 0.05 }}
          >
            <div className="relative">
              <div className="absolute -bottom-3 -left-2 h-16 w-16 rounded-full blur-3xl"
                style={{ backgroundColor: alpha(c.destructive, 15) }} />
              <Card className="biz-content-card relative rounded-xl bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] overflow-hidden transition-all duration-300 hover:bg-white/[0.05] hover:border-white/[0.12]">
                <div className="absolute bottom-0 left-6 right-6 h-px"
                  style={{ background: `linear-gradient(90deg, transparent, ${alpha(c.destructive, 35)}, transparent)` }} />
                <CardContent className="relative p-4 sm:p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="h-8 w-8 rounded-lg flex items-center justify-center"
                      style={{ background: alpha(c.destructive, 10) }}>
                      <TrendingDown className="h-4 w-4" style={{ color: c.destructive }} />
                    </div>
                    <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: c.muted }}>Total Pengeluaran</span>
                  </div>
                  <p className="text-lg sm:text-xl font-extrabold tabular-nums tracking-tight"
                    style={{ color: c.destructive, textShadow: `0 0 24px ${alpha(c.destructive, 20)}` }}>
                    {formatAmount(animExpenses)}
                  </p>
                  {comparison && (
                    <ChangeIndicator value={comparison.expensesChange} label="vs sebelumnya" />
                  )}
                </CardContent>
              </Card>
            </div>
          </motion.div>

          {/* Net Profit — Contextual glow */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ scale: 1.005 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25, duration: 0.3, delay: 0.1 }}
          >
            <div className="relative">
              <div className="absolute -bottom-3 -left-2 h-16 w-16 rounded-full blur-3xl"
                style={{ backgroundColor: alpha(isProfit ? c.secondary : c.destructive, 15) }} />
              {/* Animated gradient border glow */}
              <div className="absolute -inset-[1.5px] rounded-[18px] hidden lg:block" style={{ background: 'linear-gradient(135deg, rgba(3,218,198,0.15), rgba(187,134,252,0.10), rgba(3,218,198,0.15))', filter: 'blur(2px)', opacity: 0.4, animation: 'heroGlow 4s ease-in-out infinite' }} />
              <Card className="biz-hero-card relative rounded-xl overflow-hidden transition-all duration-300 hover:border-white/[0.15]"
                style={{ background: 'linear-gradient(135deg, rgba(3,218,198,0.10) 0%, rgba(3,218,198,0.03) 40%, rgba(187,134,252,0.05) 100%)', border: '1px solid rgba(3,218,198,0.12)', backdropFilter: 'blur(24px)' }}>
                {/* h-px accent line at top */}
                <div className="absolute top-0 left-6 right-6 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(3,218,198,0.25), rgba(187,134,252,0.18), transparent)' }} />
                <div className="absolute bottom-0 left-6 right-6 h-px"
                  style={{ background: `linear-gradient(90deg, transparent, ${alpha(isProfit ? c.secondary : c.destructive, 40)}, transparent)` }} />
                <CardContent className="relative p-4 sm:p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="h-8 w-8 rounded-lg flex items-center justify-center"
                      style={{ background: alpha(isProfit ? c.secondary : c.destructive, 10) }}>
                      <DollarSign className="h-4 w-4" style={{ color: isProfit ? c.secondary : c.destructive }} />
                    </div>
                    <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: c.muted }}>Laba Bersih</span>
                  </div>
                  <p className="text-lg sm:text-xl font-extrabold tabular-nums tracking-tight"
                    style={{
                      color: isProfit ? c.secondary : c.destructive,
                      textShadow: `0 0 24px ${alpha(isProfit ? c.secondary : c.destructive, 20)}`,
                    }}>
                    {isProfit ? '+' : ''}{formatAmount(animNetProfit)}
                  </p>
                  {comparison && (
                    <ChangeIndicator value={comparison.netProfitChange} label="vs sebelumnya" />
                  )}
                </CardContent>
              </Card>
            </div>
          </motion.div>

          {/* Profit Margin — Amber glow */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ scale: 1.005 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25, duration: 0.3, delay: 0.15 }}
          >
            <div className="relative">
              <div className="absolute -bottom-3 -left-2 h-16 w-16 rounded-full blur-3xl"
                style={{ backgroundColor: alpha(c.warning, 15) }} />
              <Card className="biz-content-card relative rounded-xl bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] overflow-hidden transition-all duration-300 hover:bg-white/[0.05] hover:border-white/[0.12]">
                <div className="absolute bottom-0 left-6 right-6 h-px"
                  style={{ background: `linear-gradient(90deg, transparent, ${alpha(c.warning, 35)}, transparent)` }} />
                <CardContent className="relative p-4 sm:p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="h-8 w-8 rounded-lg flex items-center justify-center"
                      style={{ background: alpha(c.warning, 10) }}>
                      <Percent className="h-4 w-4" style={{ color: c.warning }} />
                    </div>
                    <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: c.muted }}>Margin Laba</span>
                  </div>
                  <p className="text-lg sm:text-xl font-extrabold tabular-nums tracking-tight"
                    style={{ color: c.warning, textShadow: `0 0 24px ${alpha(c.warning, 20)}` }}>
                    {animMargin.toFixed(1)}%
                  </p>
                  {comparison && (
                    <ChangeIndicator value={comparison.profitMarginChange} label="vs sebelumnya" />
                  )}
                </CardContent>
              </Card>
            </div>
          </motion.div>
        </div>
      )}

      {/* ── Chart: Income vs Expenses ── */}
      {loading ? (
        <Skeleton className="h-64 sm:h-72 rounded-xl" />
      ) : chartData.length > 0 ? (
        <Card className="biz-content-card rounded-xl border border-white/[0.05] transition-colors duration-300 hover:border-white/[0.08]"
          style={{ background: 'linear-gradient(180deg, #0f0f14 0%, #13131a 100%)' }}>
          <CardContent className="p-5 sm:p-6">
            <SectionTitle icon={BarChart3} color={c.primary}>
              Perbandingan Pendapatan & Pengeluaran
            </SectionTitle>
            <div className="h-56 sm:h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={alpha(c.border, 30)} />
                  <XAxis
                    dataKey="period"
                    tick={{ fontSize: 10, fill: alpha(c.muted, 70) }}
                    axisLine={{ stroke: alpha(c.border, 20) }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: alpha(c.muted, 70) }}
                    axisLine={{ stroke: alpha(c.border, 20) }}
                    tickLine={false}
                    tickFormatter={(v) => {
                      if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(0)}Jt`;
                      if (v >= 1_000) return `${(v / 1_000).toFixed(0)}Rb`;
                      return String(v);
                    }}
                  />
                  <Tooltip content={<CustomTooltip formatAmount={formatAmount} />} />
                  <Legend
                    iconType="circle"
                    iconSize={6}
                    wrapperStyle={{ fontSize: '10px', paddingTop: '8px' }}
                  />
                  <Bar
                    dataKey="revenue"
                    name="Pendapatan"
                    fill={String(c.secondary)}
                    radius={[4, 4, 0, 0]}
                    maxBarSize={40}
                  />
                  <Bar
                    dataKey="expenses"
                    name="Pengeluaran"
                    fill={String(c.destructive)}
                    radius={[4, 4, 0, 0]}
                    maxBarSize={40}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* ── Income Breakdown Table ── */}
      {loading ? (
        <Skeleton className="h-48 rounded-xl" />
      ) : (
        <Card className="biz-content-card rounded-xl border border-white/[0.05] transition-colors duration-300 hover:border-white/[0.08]"
          style={{ background: 'linear-gradient(180deg, #0f0f14 0%, #13131a 100%)' }}>
          <CardContent className="p-5 sm:p-6">
            <div className="flex items-center gap-2 mb-3">
              <div className="h-7 w-7 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: alpha(c.secondary, 10) }}>
                <Wallet className="h-3.5 w-3.5" style={{ color: c.secondary }} />
              </div>
              <h3 className="text-xs font-bold tracking-tight"
                style={{
                  background: `linear-gradient(135deg, ${c.foreground}, ${alpha(c.foreground, 65)})`,
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}>
                Rincian Pendapatan
              </h3>
              {data && data.revenueCategories.length > 0 && (
                <Badge className="ml-auto text-[9px] font-medium rounded-full px-1.5 py-0"
                  style={{
                    backgroundColor: alpha(c.secondary, 8),
                    color: c.secondary,
                    border: `1px solid ${alpha(c.secondary, 15)}`,
                  }}>
                  {data.revenueCategories.length} kategori
                </Badge>
              )}
            </div>

            {data && data.revenueCategories.length > 0 ? (
              <>
                {/* Mobile: Card Layout */}
                <div className="sm:hidden space-y-2 max-h-64 overflow-y-auto">
                  {data.revenueCategories.map((row) => (
                    <div key={row.category}
                      className="p-3 rounded-lg flex items-center justify-between"
                      style={{ background: alpha(c.secondary, 4), border: `1px solid ${alpha(c.secondary, 8)}` }}>
                      <div>
                        <p className="text-xs font-medium" style={{ color: c.foreground }}>{row.category}</p>
                        <p className="text-[10px]" style={{ color: c.muted }}>{row.count} transaksi</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-bold tabular-nums" style={{ color: c.secondary }}>
                          {formatAmount(row.total)}
                        </p>
                        <p className="text-[10px]" style={{ color: c.muted }}>{row.percentage.toFixed(1)}%</p>
                      </div>
                    </div>
                  ))}
                </div>
                {/* Desktop: Table */}
                <div className="hidden sm:block max-h-64 overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-[10px] font-semibold uppercase tracking-wider"
                          style={{ color: c.muted }}>Kategori</TableHead>
                        <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-right"
                          style={{ color: c.muted }}>Transaksi</TableHead>
                        <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-right"
                          style={{ color: c.muted }}>Jumlah</TableHead>
                        <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-right"
                          style={{ color: c.muted }}>% Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.revenueCategories.map((row) => (
                        <TableRow key={row.category}>
                          <TableCell className="text-xs font-medium" style={{ color: c.foreground }}>
                            {row.category}
                          </TableCell>
                          <TableCell className="text-xs text-right" style={{ color: c.muted }}>
                            {row.count}
                          </TableCell>
                          <TableCell className="text-xs font-semibold text-right tabular-nums"
                            style={{ color: c.secondary }}>
                            {formatAmount(row.total)}
                          </TableCell>
                          <TableCell className="text-xs text-right tabular-nums" style={{ color: c.muted }}>
                            {row.percentage.toFixed(1)}%
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                {/* Total */}
                <div className="flex items-center justify-between mt-4 pt-3"
                  style={{ borderTop: `1px solid ${alpha(c.border, 40)}` }}>
                  <span className="text-xs font-bold" style={{ color: c.foreground }}>Total Pendapatan</span>
                  <span className="text-sm font-bold tabular-nums"
                    style={{ color: c.secondary, textShadow: `0 0 16px ${alpha(c.secondary, 15)}` }}>
                    {formatAmount(data.summary.totalRevenue)}
                  </span>
                </div>
              </>
            ) : (
              <div className="biz-empty-state flex flex-col items-center justify-center py-10">
                <CircleDollarSign className="h-10 w-10 mb-2" style={{ color: alpha(c.muted, 30) }} />
                <p className="text-xs" style={{ color: c.muted }}>Belum ada data pendapatan pada periode ini</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Expense Breakdown Table ── */}
      {loading ? (
        <Skeleton className="h-48 rounded-xl" />
      ) : (
        <Card className="biz-content-card rounded-xl border border-white/[0.05] transition-colors duration-300 hover:border-white/[0.08]"
          style={{ background: 'linear-gradient(180deg, #0f0f14 0%, #13131a 100%)' }}>
          <CardContent className="p-5 sm:p-6">
            <div className="flex items-center gap-2 mb-3">
              <div className="h-7 w-7 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: alpha(c.destructive, 10) }}>
                <Receipt className="h-3.5 w-3.5" style={{ color: c.destructive }} />
              </div>
              <h3 className="text-xs font-bold tracking-tight"
                style={{
                  background: `linear-gradient(135deg, ${c.foreground}, ${alpha(c.foreground, 65)})`,
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}>
                Rincian Pengeluaran
              </h3>
              {data && data.expenseCategories.length > 0 && (
                <Badge className="ml-auto text-[9px] font-medium rounded-full px-1.5 py-0"
                  style={{
                    backgroundColor: alpha(c.destructive, 8),
                    color: c.destructive,
                    border: `1px solid ${alpha(c.destructive, 15)}`,
                  }}>
                  {data.expenseCategories.length} kategori
                </Badge>
              )}
            </div>

            {data && data.expenseCategories.length > 0 ? (
              <>
                {/* Mobile: Card Layout */}
                <div className="sm:hidden space-y-2 max-h-64 overflow-y-auto">
                  {data.expenseCategories.map((row) => (
                    <div key={row.category}
                      className="p-3 rounded-lg flex items-center justify-between"
                      style={{ background: alpha(c.destructive, 4), border: `1px solid ${alpha(c.destructive, 8)}` }}>
                      <div>
                        <p className="text-xs font-medium" style={{ color: c.foreground }}>{row.category}</p>
                        <p className="text-[10px]" style={{ color: c.muted }}>{row.count} transaksi</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-bold tabular-nums" style={{ color: c.destructive }}>
                          {formatAmount(row.total)}
                        </p>
                        <p className="text-[10px]" style={{ color: c.muted }}>{row.percentage.toFixed(1)}%</p>
                      </div>
                    </div>
                  ))}
                </div>
                {/* Desktop: Table */}
                <div className="hidden sm:block max-h-64 overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-[10px] font-semibold uppercase tracking-wider"
                          style={{ color: c.muted }}>Kategori</TableHead>
                        <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-right"
                          style={{ color: c.muted }}>Transaksi</TableHead>
                        <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-right"
                          style={{ color: c.muted }}>Jumlah</TableHead>
                        <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-right"
                          style={{ color: c.muted }}>% Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.expenseCategories.map((row) => (
                        <TableRow key={row.category}>
                          <TableCell className="text-xs font-medium" style={{ color: c.foreground }}>
                            {row.category}
                          </TableCell>
                          <TableCell className="text-xs text-right" style={{ color: c.muted }}>
                            {row.count}
                          </TableCell>
                          <TableCell className="text-xs font-semibold text-right tabular-nums"
                            style={{ color: c.destructive }}>
                            {formatAmount(row.total)}
                          </TableCell>
                          <TableCell className="text-xs text-right tabular-nums" style={{ color: c.muted }}>
                            {row.percentage.toFixed(1)}%
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                {/* Total */}
                <div className="flex items-center justify-between mt-4 pt-3"
                  style={{ borderTop: `1px solid ${alpha(c.border, 40)}` }}>
                  <span className="text-xs font-bold" style={{ color: c.foreground }}>Total Pengeluaran</span>
                  <span className="text-sm font-bold tabular-nums"
                    style={{ color: c.destructive, textShadow: `0 0 16px ${alpha(c.destructive, 15)}` }}>
                    {formatAmount(data.summary.totalExpenses)}
                  </span>
                </div>
              </>
            ) : (
              <div className="biz-empty-state flex flex-col items-center justify-center py-10">
                <Receipt className="h-10 w-10 mb-2" style={{ color: alpha(c.muted, 30) }} />
                <p className="text-xs" style={{ color: c.muted }}>Belum ada data pengeluaran pada periode ini</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Profit & Loss Summary Card ── */}
      {loading ? (
        <Skeleton className="h-36 rounded-xl" />
      ) : data ? (
        <Card className="biz-content-card rounded-xl border overflow-hidden transition-colors duration-300 hover:border-white/[0.08]"
          style={{
            background: 'linear-gradient(180deg, #0f0f14 0%, #13131a 100%)',
            borderColor: alpha(isProfit ? c.secondary : c.destructive, 10),
          }}>
          {/* Subtle side accent glow — left edge */}
          <div className="absolute top-0 left-0 bottom-0 w-px"
            style={{ background: `linear-gradient(180deg, ${alpha(isProfit ? c.secondary : c.destructive, 30)}, transparent 60%, ${alpha(c.warning, 20)})` }} />
          <CardContent className="relative p-5 sm:p-6">
            <h3 className="text-xs font-bold mb-4 flex items-center gap-2 tracking-tight"
              style={{
                background: `linear-gradient(135deg, ${c.foreground}, ${alpha(c.foreground, 65)})`,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}>
              <DollarSign className="h-3.5 w-3.5"
                style={{ color: isProfit ? c.secondary : c.destructive, WebkitTextFillColor: undefined }} />
              <span>Ringkasan Laba Rugi — {data.period.label}</span>
            </h3>

            <div className="space-y-3">
              {/* Gross Profit */}
              <div className="flex items-center justify-between">
                <span className="text-xs" style={{ color: c.muted }}>Laba Kotor</span>
                <span className={cn('text-xs font-semibold tabular-nums',
                  (data.summary.grossProfit ?? 0) >= 0 ? 'text-emerald-400' : 'text-red-400'
                )}>
                  {formatAmount(data.summary.grossProfit ?? 0)}
                </span>
              </div>

              {/* Operating Expenses */}
              <div className="flex items-center justify-between">
                <span className="text-xs" style={{ color: c.muted }}>Beban Operasional</span>
                <span className="text-xs font-semibold tabular-nums" style={{ color: c.destructive }}>
                  -{formatAmount(data.summary.operatingExpenses ?? 0)}
                </span>
              </div>

              <div className="h-px" style={{ backgroundColor: alpha(c.border, 40) }} />

              {/* Net Profit */}
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold" style={{ color: c.foreground }}>Laba Bersih</span>
                <span className={cn('text-base font-bold tabular-nums',
                  isProfit ? 'text-emerald-400' : 'text-red-400'
                )}
                  style={isProfit
                    ? { textShadow: '0 0 20px rgba(16,185,129,0.2)' }
                    : { textShadow: '0 0 20px rgba(244,63,94,0.2)' }
                  }>
                  {isProfit ? '+' : ''}{formatAmount(data.summary.netProfit)}
                </span>
              </div>

              {/* Margin */}
              <div className="flex items-center justify-between">
                <span className="text-xs" style={{ color: c.muted }}>Margin Laba</span>
                <span className="text-xs font-bold tabular-nums"
                  style={{ color: c.warning, textShadow: `0 0 16px ${alpha(c.warning, 15)}` }}>
                  {data.summary.profitMargin.toFixed(1)}%
                </span>
              </div>

              {/* Margin bar */}
              <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: alpha(c.border, 20) }}>
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${Math.min(Math.max(data.summary.profitMargin, 0), 100)}%`,
                    background: isProfit
                      ? `linear-gradient(90deg, ${c.secondary}, ${c.warning})`
                      : c.destructive,
                    boxShadow: isProfit
                      ? `0 0 12px ${alpha(c.secondary, 20)}`
                      : `0 0 12px ${alpha(c.destructive, 20)}`,
                  }}
                />
              </div>
            </div>

            {/* Comparison section */}
            {data.comparison && (
              <div className="mt-5 pt-4" style={{ borderTop: `1px dashed ${alpha(c.border, 40)}` }}>
                <div className="flex items-center gap-1.5 mb-3">
                  <Info className="h-3 w-3" style={{ color: c.primary }} />
                  <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: c.muted }}>
                    Perbandingan Periode Sebelumnya
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-3 rounded-lg transition-colors duration-200"
                    style={{ background: alpha(c.secondary, 4), border: `1px solid ${alpha(c.secondary, 6)}` }}>
                    <p className="text-[10px]" style={{ color: c.muted }}>Pendapatan</p>
                    <p className="text-xs font-bold tabular-nums" style={{ color: c.secondary }}>
                      {formatAmount(data.comparison.prevRevenue)}
                    </p>
                  </div>
                  <div className="p-3 rounded-lg transition-colors duration-200"
                    style={{ background: alpha(c.destructive, 4), border: `1px solid ${alpha(c.destructive, 6)}` }}>
                    <p className="text-[10px]" style={{ color: c.muted }}>Pengeluaran</p>
                    <p className="text-xs font-bold tabular-nums" style={{ color: c.destructive }}>
                      {formatAmount(data.comparison.prevExpenses)}
                    </p>
                  </div>
                  <div className="p-3 rounded-lg transition-colors duration-200"
                    style={{ background: alpha(c.primary, 4), border: `1px solid ${alpha(c.primary, 6)}` }}>
                    <p className="text-[10px]" style={{ color: c.muted }}>Laba Bersih</p>
                    <p className={cn('text-xs font-bold tabular-nums',
                      data.comparison.prevNetProfit >= 0 ? 'text-emerald-400' : 'text-red-400'
                    )}>
                      {formatAmount(data.comparison.prevNetProfit)}
                    </p>
                  </div>
                  <div className="p-3 rounded-lg transition-colors duration-200"
                    style={{ background: alpha(c.warning, 4), border: `1px solid ${alpha(c.warning, 6)}` }}>
                    <p className="text-[10px]" style={{ color: c.muted }}>Margin</p>
                    <p className="text-xs font-bold tabular-nums" style={{ color: c.warning }}>
                      {data.comparison.prevProfitMargin.toFixed(1)}%
                    </p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ) : null}

      {/* ── No Data State ── */}
      {!loading && !data && (
        <div className="biz-empty-state flex flex-col items-center justify-center py-16">
          <div className="biz-empty-state-icon h-14 w-14 rounded-xl flex items-center justify-center mb-3"
            style={{ background: c.card, border: `1px solid ${c.border}` }}>
            <BarChart3 className="h-7 w-7" style={{ color: alpha(c.primary, 30) }} />
          </div>
          <p className="text-sm mb-1" style={{ color: c.foreground }}>Belum ada data</p>
          <p className="text-xs text-center max-w-[240px]" style={{ color: c.muted }}>
            Tambahkan transaksi kas untuk melihat Laporan Laba Rugi
          </p>
        </div>
      )}
    </div>
  );
}
