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
    <Card className="rounded-xl bg-[#1A1A2E] border-white/[0.06]">
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
    <div className="space-y-3 print:space-y-2">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: alpha(c.secondary, 10) }}>
            <BarChart3 className="h-4 w-4" style={{ color: c.secondary }} />
          </div>
          <div>
            <h2 className="text-sm font-bold" style={{ color: c.foreground }}>Laporan Laba Rugi</h2>
            <p className="text-[10px]" style={{ color: c.muted }}>Profit & Loss Statement</p>
          </div>
        </div>
        <div className="flex gap-2 print:hidden">
          <Button
            onClick={handleExportCSV}
            size="sm"
            variant="outline"
            className="rounded-lg text-xs h-8"
            style={{ borderColor: alpha(c.secondary, 15), color: c.secondary }}
          >
            <FileSpreadsheet className="mr-1 h-3 w-3" />
            CSV
          </Button>
          <Button
            onClick={handlePrint}
            size="sm"
            variant="outline"
            className="rounded-lg text-xs h-8"
            style={{ borderColor: alpha(c.warning, 15), color: c.warning }}
          >
            <Printer className="mr-1 h-3 w-3" />
            Cetak
          </Button>
        </div>
      </div>

      {/* ── Period Selector ── */}
      <div className="print:hidden">
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
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Total Revenue */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ y: -2, scale: 1.02 }}
            transition={{ type: 'spring', stiffness: 400, damping: 20, duration: 0.3 }}
          >
            <Card className="rounded-xl overflow-hidden bg-[#1A1A2E] border-white/[0.06] transition-all duration-200 hover:shadow-lg hover:border-foreground/15">
              <div className="h-[3px]" style={{ background: `linear-gradient(90deg, ${c.secondary}, ${alpha(c.secondary, 30)})` }} />
              <CardContent className="p-4" style={{ background: `linear-gradient(135deg, ${alpha(c.secondary, 6)}, transparent)` }}>
                <div className="flex items-center gap-1.5 mb-2">
                  <div className="h-7 w-7 rounded-lg flex items-center justify-center" style={{ background: alpha(c.secondary, 10) }}>
                    <TrendingUp className="h-3.5 w-3.5" style={{ color: c.secondary }} />
                  </div>
                  <span className="text-[10px] font-medium uppercase tracking-wider" style={{ color: c.muted }}>Total Pendapatan</span>
                </div>
                <p className="text-base sm:text-lg font-bold tabular-nums" style={{ color: c.secondary }}>
                  {formatAmount(animRevenue)}
                </p>
                {comparison && (
                  <ChangeIndicator value={comparison.revenueChange} label="vs sebelumnya" />
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Total Expenses */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ y: -2, scale: 1.02 }}
            transition={{ type: 'spring', stiffness: 400, damping: 20, duration: 0.3, delay: 0.05 }}
          >
            <Card className="rounded-xl overflow-hidden bg-[#1A1A2E] border-white/[0.06] transition-all duration-200 hover:shadow-lg hover:border-foreground/15">
              <div className="h-[3px]" style={{ background: `linear-gradient(90deg, ${c.destructive}, ${alpha(c.destructive, 30)})` }} />
              <CardContent className="p-4" style={{ background: `linear-gradient(135deg, ${alpha(c.destructive, 6)}, transparent)` }}>
                <div className="flex items-center gap-1.5 mb-2">
                  <div className="h-7 w-7 rounded-lg flex items-center justify-center" style={{ background: alpha(c.destructive, 10) }}>
                    <TrendingDown className="h-3.5 w-3.5" style={{ color: c.destructive }} />
                  </div>
                  <span className="text-[10px] font-medium uppercase tracking-wider" style={{ color: c.muted }}>Total Pengeluaran</span>
                </div>
                <p className="text-base sm:text-lg font-bold tabular-nums" style={{ color: c.destructive }}>
                  {formatAmount(animExpenses)}
                </p>
                {comparison && (
                  <ChangeIndicator value={comparison.expensesChange} label="vs sebelumnya" />
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Net Profit */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ y: -2, scale: 1.02 }}
            transition={{ type: 'spring', stiffness: 400, damping: 20, duration: 0.3, delay: 0.1 }}
          >
            <Card className="rounded-xl overflow-hidden bg-[#1A1A2E] border-white/[0.06] transition-all duration-200 hover:shadow-lg hover:border-foreground/15"
              style={{
                borderColor: isProfit ? alpha(c.secondary, 20) : alpha(c.destructive, 20),
              }}>
              <div className="h-[3px]" style={{
                background: isProfit
                  ? `linear-gradient(90deg, ${c.secondary}, ${alpha(c.secondary, 30)})`
                  : `linear-gradient(90deg, ${c.destructive}, ${alpha(c.destructive, 30)})`,
              }} />
              <CardContent className="p-4" style={{ background: `linear-gradient(135deg, ${alpha(isProfit ? c.secondary : c.destructive, 6)}, transparent)` }}>
                <div className="flex items-center gap-1.5 mb-2">
                  <div className="h-7 w-7 rounded-lg flex items-center justify-center" style={{ background: alpha(isProfit ? c.secondary : c.destructive, 10) }}>
                    <DollarSign className="h-3.5 w-3.5" style={{ color: isProfit ? c.secondary : c.destructive }} />
                  </div>
                  <span className="text-[10px] font-medium uppercase tracking-wider" style={{ color: c.muted }}>Laba Bersih</span>
                </div>
                <p className="text-base sm:text-lg font-bold tabular-nums"
                  style={{ color: isProfit ? c.secondary : c.destructive }}>
                  {isProfit ? '+' : ''}{formatAmount(animNetProfit)}
                </p>
                {comparison && (
                  <ChangeIndicator value={comparison.netProfitChange} label="vs sebelumnya" />
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Profit Margin */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ y: -2, scale: 1.02 }}
            transition={{ type: 'spring', stiffness: 400, damping: 20, duration: 0.3, delay: 0.15 }}
          >
            <Card className="rounded-xl overflow-hidden bg-[#1A1A2E] border-white/[0.06] transition-all duration-200 hover:shadow-lg hover:border-foreground/15">
              <div className="h-[3px]" style={{ background: `linear-gradient(90deg, ${c.warning}, ${alpha(c.warning, 30)})` }} />
              <CardContent className="p-4" style={{ background: `linear-gradient(135deg, ${alpha(c.warning, 6)}, transparent)` }}>
                <div className="flex items-center gap-1.5 mb-2">
                  <div className="h-7 w-7 rounded-lg flex items-center justify-center" style={{ background: alpha(c.warning, 10) }}>
                    <Percent className="h-3.5 w-3.5" style={{ color: c.warning }} />
                  </div>
                  <span className="text-[10px] font-medium uppercase tracking-wider" style={{ color: c.muted }}>Margin Laba</span>
                </div>
                <p className="text-base sm:text-lg font-bold tabular-nums" style={{ color: c.warning }}>
                  {animMargin.toFixed(1)}%
                </p>
                {comparison && (
                  <ChangeIndicator value={comparison.profitMarginChange} label="vs sebelumnya" />
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>
      )}

      {/* ── Chart: Income vs Expenses ── */}
      {loading ? (
        <Skeleton className="h-64 sm:h-72 rounded-xl" />
      ) : chartData.length > 0 ? (
        <Card className="rounded-xl bg-[#1A1A2E] border-white/[0.06]">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="h-6 w-6 rounded-md flex items-center justify-center"
                style={{ backgroundColor: alpha(c.primary, 8) }}>
                <BarChart3 className="h-3 w-3" style={{ color: c.primary }} />
              </div>
              <h3 className="text-xs font-semibold" style={{ color: c.foreground }}>
                Perbandingan Pendapatan & Pengeluaran
              </h3>
            </div>
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
        <Card className="rounded-xl bg-[#1A1A2E] border-white/[0.06]">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="h-6 w-6 rounded-md flex items-center justify-center"
                style={{ backgroundColor: alpha(c.secondary, 10) }}>
                <Wallet className="h-3 w-3" style={{ color: c.secondary }} />
              </div>
              <h3 className="text-xs font-semibold" style={{ color: c.foreground }}>
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
                <div className="flex items-center justify-between mt-3 pt-3"
                  style={{ borderTop: `1px solid ${c.border}` }}>
                  <span className="text-xs font-bold" style={{ color: c.foreground }}>Total Pendapatan</span>
                  <span className="text-sm font-bold tabular-nums" style={{ color: c.secondary }}>
                    {formatAmount(data.summary.totalRevenue)}
                  </span>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-10">
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
        <Card className="rounded-xl bg-[#1A1A2E] border-white/[0.06]">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="h-6 w-6 rounded-md flex items-center justify-center"
                style={{ backgroundColor: alpha(c.destructive, 10) }}>
                <Receipt className="h-3 w-3" style={{ color: c.destructive }} />
              </div>
              <h3 className="text-xs font-semibold" style={{ color: c.foreground }}>
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
                <div className="flex items-center justify-between mt-3 pt-3"
                  style={{ borderTop: `1px solid ${c.border}` }}>
                  <span className="text-xs font-bold" style={{ color: c.foreground }}>Total Pengeluaran</span>
                  <span className="text-sm font-bold tabular-nums" style={{ color: c.destructive }}>
                    {formatAmount(data.summary.totalExpenses)}
                  </span>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-10">
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
        <Card className="rounded-xl overflow-hidden bg-[#1A1A2E] border-white/[0.06]"
          style={{
            borderColor: isProfit ? alpha(c.secondary, 15) : alpha(c.destructive, 15),
          }}>
          <div className="h-[3px]" style={{
            background: isProfit
              ? `linear-gradient(90deg, ${c.secondary}, ${c.warning})`
              : `linear-gradient(90deg, ${c.destructive}, ${c.warning})`,
          }} />
          <CardContent className="p-4 sm:p-5">
            <h3 className="text-xs font-bold mb-4 flex items-center gap-2" style={{ color: c.foreground }}>
              <DollarSign className="h-3.5 w-3.5" style={{ color: isProfit ? c.secondary : c.destructive }} />
              Ringkasan Laba Rugi — {data.period.label}
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

              <div className="h-px" style={{ backgroundColor: c.border }} />

              {/* Net Profit */}
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold" style={{ color: c.foreground }}>Laba Bersih</span>
                <span className={cn('text-base font-bold tabular-nums',
                  isProfit ? 'text-emerald-400' : 'text-red-400'
                )}>
                  {isProfit ? '+' : ''}{formatAmount(data.summary.netProfit)}
                </span>
              </div>

              {/* Margin */}
              <div className="flex items-center justify-between">
                <span className="text-xs" style={{ color: c.muted }}>Margin Laba</span>
                <span className="text-xs font-bold tabular-nums" style={{ color: c.warning }}>
                  {data.summary.profitMargin.toFixed(1)}%
                </span>
              </div>

              {/* Margin bar */}
              <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: alpha(c.border, 20) }}>
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${Math.min(Math.max(data.summary.profitMargin, 0), 100)}%`,
                    background: isProfit
                      ? `linear-gradient(90deg, ${c.secondary}, ${c.warning})`
                      : c.destructive,
                  }}
                />
              </div>
            </div>

            {/* Comparison section */}
            {data.comparison && (
              <div className="mt-4 pt-3" style={{ borderTop: `1px dashed ${c.border}` }}>
                <div className="flex items-center gap-1.5 mb-2">
                  <Info className="h-3 w-3" style={{ color: c.primary }} />
                  <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: c.muted }}>
                    Perbandingan Periode Sebelumnya
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2.5 rounded-lg" style={{ background: alpha(c.secondary, 4) }}>
                    <p className="text-[10px]" style={{ color: c.muted }}>Pendapatan</p>
                    <p className="text-xs font-bold tabular-nums" style={{ color: c.secondary }}>
                      {formatAmount(data.comparison.prevRevenue)}
                    </p>
                  </div>
                  <div className="p-2.5 rounded-lg" style={{ background: alpha(c.destructive, 4) }}>
                    <p className="text-[10px]" style={{ color: c.muted }}>Pengeluaran</p>
                    <p className="text-xs font-bold tabular-nums" style={{ color: c.destructive }}>
                      {formatAmount(data.comparison.prevExpenses)}
                    </p>
                  </div>
                  <div className="p-2.5 rounded-lg" style={{ background: alpha(c.primary, 4) }}>
                    <p className="text-[10px]" style={{ color: c.muted }}>Laba Bersih</p>
                    <p className={cn('text-xs font-bold tabular-nums',
                      data.comparison.prevNetProfit >= 0 ? 'text-emerald-400' : 'text-red-400'
                    )}>
                      {formatAmount(data.comparison.prevNetProfit)}
                    </p>
                  </div>
                  <div className="p-2.5 rounded-lg" style={{ background: alpha(c.warning, 4) }}>
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
        <div className="flex flex-col items-center justify-center py-16">
          <div className="h-14 w-14 rounded-xl flex items-center justify-center mb-3"
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
