'use client';

import { useEffect, useState, useMemo, useRef } from 'react';
import { useBusinessStore } from '@/store/useBusinessStore';
import { useTranslation } from '@/hooks/useTranslation';
import { useCurrencyFormat } from '@/hooks/useCurrencyFormat';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Wallet,
  Plus,
  FileText,
  Receipt,
  Clock,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  BarChart3,
  Sparkles,
  CalendarDays,
  Inbox,
  ArrowDownLeft,
  HandCoins,
  Activity,
  Target,
  PieChart,
  Lightbulb,
  ChevronLeft,
  ChevronRight,
  Info,
  X,
  CheckCircle2,
  Package,
  Landmark,
  CircleDollarSign,
  Download,
  Users,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

/* ── Alpha helper for color-mix with CSS variables ── */
function alpha(color: string, percent: number): string {
  return `color-mix(in srgb, ${color} ${percent}%, transparent)`;
}

interface PiutangSummaryItem {
  count: number;
  amount: number;
}

interface AllocationBreakdownItem {
  source: string;
  total: number;
  expenses: number;
  saldo: number;
}

interface AllocationBreakdown {
  kasBesarTotal: number;
  kasKecilTotal: number;
  investorTotal: number;
  expenseFromKasBesar: number;
  expenseFromKasKecil: number;
  expenseFromInvestor: number;
  kasBesarSaldo: number;
  kasKecilSaldo: number;
  investorSaldo: number;
  netCash: number;
  investorModalTotal?: number;
  investorIncomeTotal?: number;
  breakdown: AllocationBreakdownItem[];
}

interface DashboardData {
  totalRevenue: number;
  totalExpense: number;
  profit: number;
  profitMargin: number;
  totalKasBesar: number;
  totalKasKecil: number;
  totalKasKeluar: number;
  netCash: number;
  pendingInvoices: number;
  totalHutang: number;
  totalPiutang: number;
  salesCount: number;
  averageSaleValue: number;
  debtsDueSoon: Array<{
    id: string;
    counterpart: string;
    remaining: number;
    dueDate: string;
    status?: string;
  }>;
  recentSales: Array<{
    id: string;
    description: string;
    amount: number;
    date: string;
    customer: { name: string } | null;
  }>;
  recentCashEntries: Array<{
    id: string;
    description: string;
    amount: number;
    date: string;
    type: string;
  }>;
  topProductsSold: Array<{
    name: string;
    totalQuantity: number;
    totalRevenue: number;
  }>;
  piutangSummary: {
    cicilanBerjalan: PiutangSummaryItem;
    cicilanMenunggak: PiutangSummaryItem;
    cicilanSelesai: PiutangSummaryItem;
    berjalan: PiutangSummaryItem;
    menunggak: PiutangSummaryItem;
    selesai: PiutangSummaryItem;
  };
  allocationBreakdown: AllocationBreakdown;
  investorSummary?: {
    totalModalMasuk: number;
    totalPendapatan: number;
    totalPengeluaran: number;
    totalSaldo: number;
    activeInvestors: number;
  };
  investorBreakdown?: Array<{
    id: string;
    name: string;
    phone: string | null;
    email: string | null;
    totalInvestment: number;
    profitSharePct: number;
    status: string;
    modalMasuk: number;
    pendapatan: number;
    pengeluaran: number;
    totalModal: number;
    saldo: number;
    recentEntries: Array<{
      type: 'modal_masuk' | 'pendapatan' | 'pengeluaran';
      amount: number;
      description: string;
      date: string;
    }>;
  }>;
}

/* ── Helpers ── */
function generateSparklineData(value: number): number[] {
  const seed = Math.abs(value) || 42;
  const points: number[] = [];
  let acc = 30;
  for (let i = 0; i < 7; i++) {
    acc += ((seed * (i + 1) * 17) % 60) - 25;
    acc = Math.max(8, Math.min(100, acc));
    points.push(acc);
  }
  const maxVal = Math.max(...points, 1);
  return points.map((p) => (p / maxVal) * 100);
}

function getDateGroup(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86400000);
  const dDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());

  if (dDay.getTime() === today.getTime()) return 'Hari Ini';
  if (dDay.getTime() === yesterday.getTime()) return 'Kemarin';
  const daysDiff = Math.floor((today.getTime() - dDay.getTime()) / 86400000);
  if (daysDiff <= 7) return `${daysDiff} hari lalu`;
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
}

function getTimeBadge(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
}

/* ── Business Health Score Calculation ── */
function calculateHealthScore(data: DashboardData): { score: number; grade: string; color: string } {
  if (!data || data.totalRevenue === 0 && data.totalExpense === 0) {
    return { score: 0, grade: 'N/A', color: '#666666' };
  }

  let score = 50;

  const margin = data.profitMargin || 0;
  if (margin >= 20) score += 25;
  else if (margin >= 10) score += 20;
  else if (margin >= 5) score += 15;
  else if (margin > 0) score += 10;
  else if (margin > -10) score += 2;
  else score -= 10;

  const netCash = data.netCash || 0;
  if (netCash > data.totalRevenue * 0.3) score += 25;
  else if (netCash > data.totalRevenue * 0.1) score += 18;
  else if (netCash > 0) score += 12;
  else score -= 5;

  const debtRatio = data.totalRevenue > 0 ? data.totalHutang / data.totalRevenue : 1;
  if (debtRatio === 0) score += 25;
  else if (debtRatio < 0.2) score += 20;
  else if (debtRatio < 0.5) score += 12;
  else if (debtRatio < 1) score += 5;
  else score -= 5;

  const receivableRatio = data.totalRevenue > 0 ? data.totalPiutang / data.totalRevenue : 1;
  if (receivableRatio === 0) score += 25;
  else if (receivableRatio < 0.1) score += 22;
  else if (receivableRatio < 0.3) score += 15;
  else if (receivableRatio < 0.5) score += 8;
  else score -= 3;

  score = Math.max(0, Math.min(100, Math.round(score)));

  let grade: string;
  let color: string;
  if (score >= 80) { grade = 'A'; color = 'var(--secondary)'; }
  else if (score >= 60) { grade = 'B'; color = '#4FC3F7'; }
  else if (score >= 40) { grade = 'C'; color = 'var(--warning)'; }
  else { grade = 'D'; color = 'var(--destructive)'; }

  return { score, grade, color };
}

/* ── Enhanced Health Ring Component (bigger, grade letter prominent) ── */
function HealthRing({ score, color, grade }: { score: number; color: string; grade: string }) {
  const [displayScore, setDisplayScore] = useState(0);
  const animationRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);

  useEffect(() => {
    startTimeRef.current = performance.now();
    const duration = 1200;

    const animate = (now: number) => {
      const elapsed = now - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayScore(Math.round(eased * score));
      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      }
    };

    animationRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationRef.current);
  }, [score]);

  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (displayScore / 100) * circumference;
  const center = 64;

  return (
    <div className="relative flex items-center justify-center">
      <svg viewBox={`0 0 ${center * 2} ${center * 2}`} className="w-[100px] h-[100px] sm:w-32 sm:h-32 -rotate-90">
        <circle
          cx={center} cy={center} r={radius}
          stroke="var(--border)"
          strokeWidth="8"
          fill="none"
        />
        <circle
          cx={center} cy={center} r={radius}
          stroke={color}
          strokeWidth="8"
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          style={{
            strokeDashoffset,
            transition: 'stroke-dashoffset 1.2s ease-in-out',
          }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className="text-xl sm:text-2xl font-bold tabular-nums leading-none"
          style={{ color }}
        >
          {displayScore}
        </span>
        <span
          className="text-sm sm:text-base font-black mt-0.5"
          style={{ color }}
        >
          {grade}
        </span>
        <span
          className="text-[8px] font-medium uppercase tracking-wider mt-1 text-muted-foreground"
        >
          Health Score
        </span>
      </div>
    </div>
  );
}

/* ── Mini Sparkline Component ── */
function MiniSparkline({ data, color, trend }: { data: number[]; color: string; trend: 'up' | 'down' | 'flat' }) {
  return (
    <div className="flex items-end gap-[2px] h-[22px]">
      {data.map((h, i) => (
        <div
          key={i}
          className="w-[4px] rounded-sm origin-bottom"
          style={{
            backgroundColor: color,
            opacity: 0.25 + (i / data.length) * 0.75,
            height: `${Math.max(h * 0.22, 2)}px`,
            transition: `height 0.35s ease ${i * 0.04}s`,
          }}
        />
      ))}
      <span
        className="ml-0.5 text-[8px] font-semibold leading-none self-center"
        style={{ color }}
      >
        {trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→'}
      </span>
    </div>
  );
}

/* ── Empty State Component ── */
function EmptyState({
  icon: Icon,
  title,
  description,
  accentColor,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  accentColor: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-8 px-4">
      <div
        className="flex h-12 w-12 items-center justify-center rounded-xl mb-3"
        style={{
          background: alpha(accentColor, 8),
        }}
      >
        <Icon className="h-5 w-5" style={{ color: accentColor, opacity: 0.6 }} />
      </div>
      <p className="text-sm font-medium mb-1 text-muted-foreground">{title}</p>
      <p className="text-[11px] text-center max-w-[200px] text-muted-foreground">{description}</p>
    </div>
  );
}

/* ── Mini Revenue Trend (CSS bars) ── */
function MiniRevenueTrend({ recentSales, recentCashEntries }: {
  recentSales: DashboardData['recentSales'];
  recentCashEntries: DashboardData['recentCashEntries'];
}) {
  const bars = useMemo(() => {
    const dayMap: Record<string, { revenue: number; expense: number; label: string }> = {};

    recentSales.forEach((s) => {
      const d = new Date(s.date);
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      if (!dayMap[key]) {
        dayMap[key] = { revenue: 0, expense: 0, label: d.toLocaleDateString('id-ID', { weekday: 'short' }) };
      }
      dayMap[key].revenue += s.amount;
    });

    recentCashEntries.forEach((e) => {
      if (e.type === 'kas_keluar') {
        const d = new Date(e.date);
        const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
        if (!dayMap[key]) {
          dayMap[key] = { revenue: 0, expense: 0, label: d.toLocaleDateString('id-ID', { weekday: 'short' }) };
        }
        dayMap[key].expense += e.amount;
      }
    });

    const sorted = Object.entries(dayMap)
      .sort(([a], [b]) => b.localeCompare(a))
      .slice(0, 7)
      .reverse();

    const maxVal = Math.max(...sorted.map(([, v]) => Math.max(v.revenue, v.expense)), 1);
    return sorted.map(([, v]) => ({
      revenue: (v.revenue / maxVal) * 100,
      expense: (v.expense / maxVal) * 100,
      label: v.label,
    }));
  }, [recentSales, recentCashEntries]);

  const hasData = bars.length > 0;

  return (
    <div className="flex items-end gap-1.5 h-[60px] w-full">
      {hasData ? (
        bars.map((bar, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-1">
            <div className="flex items-end gap-px w-full h-[44px]">
              <div
                className="flex-1 rounded-t-sm origin-bottom min-h-[2px] bg-secondary/80"
                style={{
                  height: `${Math.max(bar.revenue, 3)}%`,
                  transition: `height 0.4s ease ${i * 0.06}s`,
                }}
              />
              <div
                className="flex-1 rounded-t-sm origin-bottom min-h-[2px] bg-destructive/70"
                style={{
                  height: `${Math.max(bar.expense, 3)}%`,
                  transition: `height 0.4s ease ${i * 0.06 + 0.05}s`,
                }}
              />
            </div>
            <span className="text-[8px] font-medium text-muted-foreground">{bar.label.slice(0, 2)}</span>
          </div>
        ))
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <span className="text-[10px] text-muted-foreground">Belum ada data</span>
        </div>
      )}
    </div>
  );
}

/* ── Insight Tips ── */
const bizTips = [
  { title: 'Kelola Piutang', desc: 'Follow up piutang yang sudah lewat tempo untuk menjaga arus kas.', color: 'var(--destructive)', icon: TrendingDown },
  { title: 'Target Penjualan', desc: 'Tetapkan target harian untuk mencapai target bulanan.', color: 'var(--secondary)', icon: Target },
  { title: 'Efisiensi Pengeluaran', desc: 'Review kas keluar mingguan untuk mengidentifikasi penghematan.', color: 'var(--warning)', icon: PieChart },
  { title: 'Diversifikasi Produk', desc: 'Tambah variasi produk untuk meningkatkan peluang penjualan.', color: 'var(--primary)', icon: Sparkles },
];

/* ── Main Component ── */
export default function BusinessDashboard() {
  const { t } = useTranslation();
  const { activeBusiness } = useBusinessStore();
  const { formatAmount } = useCurrencyFormat();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchKey, setFetchKey] = useState(0);
  const [tipIndex, setTipIndex] = useState(0);
  const [infoDismissed, setInfoDismissed] = useState(false);

  const businessId = activeBusiness?.id;

  useEffect(() => {
    if (!businessId) return;
    let cancelled = false;
    const controller = new AbortController();

    const load = async () => {
      try {
        const res = await fetch(`/api/business/${businessId}/dashboard`, { signal: controller.signal });
        if (!res.ok) throw new Error('Failed to load dashboard');
        const result = await res.json();
        if (!cancelled) {
          setData(result);
          setLoading(false);
        }
      } catch {
        if (!cancelled) {
          setData(null);
          setLoading(false);
        }
      }
    };

    load();
    return () => { cancelled = true; controller.abort(); };
  }, [businessId, fetchKey]);

  // Auto-rotate tips
  useEffect(() => {
    const interval = setInterval(() => {
      setTipIndex((prev) => (prev + 1) % bizTips.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // Greeting data
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    let greet = 'Selamat Pagi';
    if (hour >= 11 && hour < 15) greet = 'Selamat Siang';
    else if (hour >= 15 && hour < 18) greet = 'Selamat Sore';
    else if (hour >= 18) greet = 'Selamat Malam';
    const dateStr = new Date().toLocaleDateString('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
    return { greet, dateStr };
  }, []);

  // Format date helper (before memos)
  const _fmtDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  // Combined recent activity (sales + cash entries)
  const combinedActivities = useMemo(() => {
    if (!data) return [];
    const activities: Array<{
      id: string;
      description: string;
      amount: number;
      date: string;
      type: 'sale' | 'income' | 'expense';
      customer?: string | null;
    }> = [];
    data.recentSales.forEach((s) => {
      activities.push({ id: s.id, description: s.description, amount: s.amount, date: s.date, type: 'sale', customer: s.customer?.name });
    });
    data.recentCashEntries.forEach((e) => {
      activities.push({ id: e.id, description: e.description, amount: e.amount, date: e.date, type: e.type === 'kas_keluar' ? 'expense' : 'income' });
    });
    activities.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return activities.slice(0, 5);
  }, [data]);

  // Group activities by date
  const groupedActivities = useMemo(() => {
    if (combinedActivities.length === 0) return [];
    const groups: Record<string, typeof combinedActivities> = {};
    combinedActivities.forEach((item) => {
      const group = getDateGroup(item.date);
      if (!groups[group]) groups[group] = [];
      groups[group].push(item);
    });
    return Object.entries(groups).map(([group, items]) => ({ group, items }));
  }, [combinedActivities]);

  // Piutang due soon with badge color
  const debtsDueSoonWithBadge = useMemo(() => {
    if (!data || !data.debtsDueSoon) return [];
    return data.debtsDueSoon.slice(0, 5).map((debt) => {
      const now = new Date();
      const due = new Date(debt.dueDate);
      const diffDays = Math.ceil((due.getTime() - now.getTime()) / 86400000);
      let badgeColor: string;
      let badgeLabel: string;
      if (diffDays < 0) {
        badgeColor = 'var(--destructive)';
        badgeLabel = `Lewat ${Math.abs(diffDays)} hari`;
      } else if (diffDays <= 3) {
        badgeColor = 'var(--warning)';
        badgeLabel = diffDays === 0 ? 'Hari ini' : `${diffDays} hari lagi`;
      } else if (diffDays <= 7) {
        badgeColor = 'var(--secondary)';
        badgeLabel = `${diffDays} hari lagi`;
      } else {
        badgeColor = 'var(--muted-foreground)';
        badgeLabel = _fmtDate(debt.dueDate);
      }
      return { ...debt, badgeColor, badgeLabel };
    });
  }, [data]);

  // Health score
  const healthScore = useMemo(() => {
    if (!data) return { score: 0, grade: 'N/A', color: '#666666' };
    return calculateHealthScore(data);
  }, [data]);

  if (!businessId) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-center text-muted-foreground">{t('biz.registerFirst')}</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-[60px] rounded-xl bg-card" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-[96px] rounded-xl bg-card" />
          ))}
        </div>
        <Skeleton className="h-[44px] rounded-xl bg-card" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-[72px] rounded-xl bg-card" />
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Skeleton className="h-[280px] rounded-xl bg-card" />
          <Skeleton className="h-[280px] rounded-xl bg-card" />
          <Skeleton className="h-[280px] rounded-xl bg-card" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Skeleton className="h-[200px] rounded-xl md:col-span-2 lg:col-span-2 bg-card" />
          <Skeleton className="h-[200px] rounded-xl bg-card" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Skeleton className="h-[260px] rounded-xl bg-card" />
          <Skeleton className="h-[260px] rounded-xl bg-card" />
        </div>
        <Skeleton className="h-[60px] rounded-xl bg-card" />
        <Skeleton className="h-[120px] rounded-xl bg-card" />
      </div>
    );
  }

  if (!data) return null;

  // Derived values
  const totalCash = (data.totalKasBesar ?? 0) + (data.totalKasKecil ?? 0);
  const netCashValue = data.netCash ?? totalCash;
  const debtToRevenueRatio = data.totalRevenue > 0
    ? ((data.totalHutang / data.totalRevenue) * 100)
    : 0;

  // Quick stats definition
  const quickStats = data
    ? [
        {
          label: t('biz.bizRevenue'),
          value: data.totalRevenue,
          icon: TrendingUp,
          accentColor: 'var(--secondary)' as string,
          subText: `${data.salesCount || 0} transaksi · Avg: ${formatAmount(data.averageSaleValue || 0)}`,
          trend: 'up' as const,
        },
        {
          label: t('biz.bizExpense'),
          value: data.totalExpense,
          icon: TrendingDown,
          accentColor: 'var(--destructive)' as string,
          subText: data.totalExpense > 0
            ? `${t('biz.kasKeluar')}: ${formatAmount(data.totalKasKeluar)}`
            : t('biz.noBizData'),
          trend: 'down' as const,
        },
        {
          label: t('biz.bizProfit'),
          value: data.profit,
          icon: DollarSign,
          accentColor: (data.profit >= 0 ? 'var(--secondary)' : 'var(--destructive)') as string,
          subText: `Margin: ${(data.profitMargin ?? 0).toFixed(1)}%`,
          badge: (data.profitMargin ?? 0) > 0 ? `+${(data.profitMargin ?? 0).toFixed(1)}%` : null,
          trend: (data.profit ?? 0) > 0 ? ('up' as const) : (data.profit ?? 0) < 0 ? ('down' as const) : ('flat' as const),
        },
        {
          label: 'Cash Flow',
          value: netCashValue,
          icon: Wallet,
          accentColor: (netCashValue >= 0 ? 'var(--secondary)' : 'var(--destructive)') as string,
          subText: `Hutang/Revenue: ${debtToRevenueRatio.toFixed(0)}%`,
          badge: debtToRevenueRatio > 50 ? `${debtToRevenueRatio.toFixed(0)}%` : null,
          trend: netCashValue >= 0 ? ('up' as const) : ('down' as const),
        },
      ]
    : [];

  // Chart data: bar comparison of revenue vs expense
  const comparisonData = data
    ? [
        { name: t('biz.bizRevenue'), value: data.totalRevenue, fill: 'var(--secondary)' as string, gradientFrom: 'var(--secondary)' as string, gradientTo: '#00B894' },
        { name: t('biz.bizExpense'), value: data.totalExpense, fill: 'var(--destructive)' as string, gradientFrom: 'var(--destructive)' as string, gradientTo: '#E84393' },
        { name: t('biz.bizProfit'), value: Math.max(0, data.profit), fill: '#4CAF50', gradientFrom: '#4CAF50', gradientTo: 'var(--secondary)' as string },
      ]
    : [];

  const maxChartValue = Math.max(...comparisonData.map(d => d.value), 1);
  const totalComparison = comparisonData.reduce((sum, d) => sum + d.value, 0) || 1;

  // Status items
  const statusItems = data
    ? [
        {
          label: t('biz.bizPendingInvoice'),
          count: data.pendingInvoices,
          amount: null as number | null,
          icon: Clock,
          accentColor: 'var(--warning)' as string,
          bgColor: 'color-mix(in srgb, var(--warning) 6%, transparent)' as string,
          emptyLabel: t('biz.noBizData'),
        },
        {
          label: t('biz.bizDebtDue'),
          count: data.totalHutang > 0 ? undefined : 0,
          amount: data.totalHutang,
          icon: AlertTriangle,
          accentColor: 'var(--destructive)' as string,
          bgColor: 'color-mix(in srgb, var(--destructive) 6%, transparent)' as string,
          emptyLabel: t('biz.noBizData'),
        },
        {
          label: t('biz.bizReceivableDue'),
          count: data.totalPiutang > 0 ? undefined : 0,
          amount: data.totalPiutang,
          icon: ArrowUpRight,
          accentColor: 'var(--secondary)' as string,
          bgColor: 'color-mix(in srgb, var(--secondary) 6%, transparent)' as string,
          emptyLabel: t('biz.noBizData'),
        },
      ]
    : [];

  // Quick actions
  const quickActions = [
    { label: t('biz.addSale'), icon: Plus, color: 'var(--secondary)' as string },
    { label: t('biz.addInvoice'), icon: FileText, color: 'var(--primary)' as string },
    { label: t('biz.kasKeluar'), icon: Receipt, color: 'var(--destructive)' as string },
    { label: 'Export Ringkasan', icon: Download, color: 'var(--warning)' as string, onClick: () => toast.info('Fitur export akan segera tersedia') },
  ];

  // Format date helper (reuse from above)
  const formatDate = _fmtDate;

  const hasAnyData = data && (
    data.totalRevenue > 0 || data.totalExpense > 0 || data.recentSales.length > 0
  );

  // Quick insight (computed after derived values)
  const quickInsight = (() => {
    if (!data || !hasAnyData) return 'Mulai catat penjualan dan pengeluaran untuk melihat insight bisnis Anda.';
    const parts: string[] = [];
    if (data.profit > 0) {
      parts.push(`Bisnis Anda untung ${formatAmount(data.profit)} (margin ${(data.profitMargin ?? 0).toFixed(1)}%)`);
    } else if (data.profit < 0) {
      parts.push('Bisnis Anda sedang merugi — perlu evaluasi pengeluaran.');
    } else {
      parts.push('Pendapatan dan pengeluaran Anda seimbang.');
    }
    if (netCashValue > 0) {
      parts.push(`Kas bersih positif ${formatAmount(netCashValue)}.`);
    } else if (netCashValue < 0) {
      parts.push('Kas bersih negatif — perlu tambahan modal.');
    }
    if ((data.debtsDueSoon?.length ?? 0) > 0) {
      parts.push(`${data.debtsDueSoon!.length} piutang akan jatuh tempo.`);
    }
    if (healthScore.score >= 80) {
      parts.push('Kesehatan bisnis: Sangat Baik.');
    } else if (healthScore.score >= 60) {
      parts.push('Kesehatan bisnis: Baik.');
    } else if (healthScore.score >= 40) {
      parts.push('Kesehatan bisnis: Perlu perhatian.');
    } else {
      parts.push('Kesehatan bisnis: Kritis.');
    }
    return parts.join(' ');
  })();

  // Health score breakdown
  const healthBreakdown = data ? [
    {
      label: 'Profit Margin',
      value: data.profitMargin || 0,
      color: (data.profitMargin || 0) >= 10 ? 'var(--secondary)' : (data.profitMargin || 0) > 0 ? 'var(--warning)' : 'var(--destructive)',
      suffix: '%',
    },
    {
      label: 'Cash Flow',
      value: data.totalRevenue > 0 ? Math.min(100, (netCashValue / data.totalRevenue) * 100) : 0,
      color: netCashValue > 0 ? 'var(--secondary)' : 'var(--destructive)',
      suffix: '%',
    },
    {
      label: 'Debt Ratio',
      value: Math.max(0, 100 - debtToRevenueRatio),
      color: debtToRevenueRatio < 0.3 ? 'var(--secondary)' : debtToRevenueRatio < 0.6 ? 'var(--warning)' : 'var(--destructive)',
      suffix: '%',
    },
    {
      label: 'Receivables',
      value: data.totalRevenue > 0 ? Math.max(0, 100 - ((data.totalPiutang / data.totalRevenue) * 100)) : 100,
      color: data.totalPiutang / (data.totalRevenue || 1) < 0.2 ? 'var(--secondary)' : data.totalPiutang / (data.totalRevenue || 1) < 0.5 ? 'var(--warning)' : 'var(--destructive)',
      suffix: '%',
    },
  ] : [];

  // Kas & Dana data
  const kasBesarSaldo = data.allocationBreakdown?.kasBesarSaldo ?? (data.totalKasBesar ?? 0);
  const kasKecilSaldo = data.allocationBreakdown?.kasKecilSaldo ?? (data.totalKasKecil ?? 0);
  const investorSaldo = data.allocationBreakdown?.investorSaldo ?? ((data.allocationBreakdown?.investorTotal ?? 0) - (data.allocationBreakdown?.expenseFromInvestor ?? 0));
  const investorIncomeTotal = data.allocationBreakdown?.investorIncomeTotal ?? 0;
  const allocationNetCash = data.allocationBreakdown?.netCash ?? (data.netCash ?? 0);

  const kasDanaCards = [
    { label: 'Kas Besar', value: kasBesarSaldo, icon: Landmark, color: 'var(--secondary)' as string, bgColor: 'color-mix(in srgb, var(--secondary) 6%, transparent)' as string },
    { label: 'Kas Kecil', value: kasKecilSaldo, icon: Wallet, color: 'var(--primary)' as string, bgColor: 'color-mix(in srgb, var(--primary) 6%, transparent)' as string },
    { label: 'Dana Investor', value: investorSaldo, icon: HandCoins, color: '#BB86FC' as string, bgColor: 'color-mix(in srgb, #BB86FC 6%, transparent)' as string, subText: data.allocationBreakdown?.investorModalTotal ? `Modal: ${formatAmount(data.allocationBreakdown.investorModalTotal)}${investorIncomeTotal > 0 ? ` · Pendapatan: ${formatAmount(investorIncomeTotal)}` : ''}` : undefined },
    { label: 'Net Cash', value: allocationNetCash, icon: Activity, color: (allocationNetCash >= 0 ? 'var(--secondary)' : 'var(--destructive)') as string, bgColor: (allocationNetCash >= 0 ? 'color-mix(in srgb, var(--secondary) 6%, transparent)' : 'color-mix(in srgb, var(--destructive) 6%, transparent)') as string },
  ];

  // Piutang summary data
  const ps = data.piutangSummary;
  const piutangSummaryCards = ps ? [
    { label: 'Cicilan Berjalan', count: ps.berjalan.count, amount: ps.berjalan.amount, icon: Clock, color: 'var(--primary)' as string, bgColor: 'color-mix(in srgb, var(--primary) 6%, transparent)' as string },
    { label: 'Menunggak', count: ps.menunggak.count, amount: ps.menunggak.amount, icon: AlertTriangle, color: 'var(--destructive)' as string, bgColor: 'color-mix(in srgb, var(--destructive) 6%, transparent)' as string },
    { label: 'Selesai / Lunas', count: ps.selesai.count, amount: ps.selesai.amount, icon: CheckCircle2, color: 'var(--secondary)' as string, bgColor: 'color-mix(in srgb, var(--secondary) 6%, transparent)' as string },
  ] : [];

  const currentTip = bizTips[tipIndex];
  const TipIcon = currentTip.icon;

  // Top products with rank colors
  const rankColors = ['#FFD700', '#C0C0C0', '#CD7F32'];

  return (
    <div className="space-y-4">
      {/* ── Welcome Banner (compact) ── */}
      <div className="relative overflow-hidden rounded-xl p-3 sm:p-4 bg-card border border-border">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-secondary/50 to-transparent" />
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg shrink-0 bg-secondary/8">
              <Sparkles className="h-4 w-4 text-secondary" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-semibold text-foreground">
                {greeting.greet}, <span className="text-secondary">{activeBusiness?.name || 'Pengguna'}</span>
              </h2>
              <div className="flex items-center gap-1.5 mt-0.5">
                <CalendarDays className="h-3 w-3 text-muted-foreground" />
                <p className="text-[11px] text-muted-foreground">{greeting.dateStr}</p>
              </div>
            </div>
          </div>
          <span className="text-[11px] font-medium text-muted-foreground">Dashboard</span>
        </div>
      </div>

      {/* ── Info Card (dismissible) ── */}
      {!infoDismissed && (
        <div className="rounded-xl p-3 flex items-start gap-2.5 transition-opacity duration-200 border border-border" style={{ background: 'color-mix(in srgb, var(--muted-foreground) 3%, transparent)' }}>
          <Info className="h-4 w-4 shrink-0 mt-0.5 text-muted-foreground" />
          <p className="text-[11px] leading-relaxed flex-1 text-muted-foreground">
            Dashboard menampilkan ringkasan bisnis Anda: pendapatan, pengeluaran, profit, arus kas, piutang yang akan jatuh tempo, dan produk terlaris.
          </p>
          <button
            onClick={() => setInfoDismissed(true)}
            className="shrink-0 h-5 w-5 rounded-md flex items-center justify-center transition-colors duration-150 text-muted-foreground"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      )}

      {/* ── Section 1: Quick Stats Row with Sparklines ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {quickStats.map((stat) => {
          const Icon = stat.icon;
          const sparkData = generateSparklineData(stat.value);
          return (
            <Card
              key={stat.label}
              className="cursor-default transition-all duration-200 group border-border hover:border-foreground/15 hover:shadow-lg hover:-translate-y-0.5"
            >
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-start justify-between mb-2">
                  <div
                    className="flex h-7 w-7 items-center justify-center rounded-md shrink-0 transition-transform duration-200 group-hover:scale-105"
                    style={{ backgroundColor: alpha(stat.accentColor, 8) }}
                  >
                    <Icon className="h-3.5 w-3.5" style={{ color: stat.accentColor }} />
                  </div>
                  {stat.badge && (
                    <span
                      className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md"
                      style={{
                        color: stat.accentColor,
                        backgroundColor: alpha(stat.accentColor, 8),
                      }}
                    >
                      {stat.badge}
                    </span>
                  )}
                </div>
                <p className="text-[10px] sm:text-[11px] uppercase tracking-wide font-medium mb-0.5 truncate text-muted-foreground">
                  {stat.label}
                </p>
                <p className="text-xs sm:text-sm font-bold leading-tight truncate text-foreground">
                  {formatAmount(stat.value)}
                </p>
                <div className="flex items-end justify-between mt-2 gap-2">
                  <p className="text-[10px] leading-snug truncate flex-1 min-w-0 text-muted-foreground">
                    {stat.subText}
                  </p>
                  <div className="shrink-0" title="Tren Bulanan">
                    <MiniSparkline data={sparkData} color={stat.accentColor} trend={stat.trend} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* ── Section 2: Quick Actions ── */}
      <Card className="overflow-hidden border-border">
        <CardContent className="px-3 sm:px-4 py-2.5">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 shrink-0">
              <BarChart3 className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Quick Actions
              </span>
            </div>
            <Separator orientation="vertical" className="h-4" />
            <div className="flex items-center gap-2 overflow-x-auto flex-nowrap min-w-0">
              {quickActions.map((action) => {
                const Icon = action.icon;
                return (
                  <Button
                    key={action.label}
                    variant="ghost"
                    size="sm"
                    onClick={action.onClick}
                    className="h-8 px-3 gap-1.5 text-[11px] rounded-lg transition-all duration-200 text-muted-foreground border border-border"
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.background = alpha(action.color, 7);
                      (e.currentTarget as HTMLElement).style.borderColor = alpha(action.color, 19);
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.background = 'transparent';
                      (e.currentTarget as HTMLElement).style.borderColor = '';
                    }}
                  >
                    <div
                      className="flex h-5 w-5 items-center justify-center rounded-md shrink-0"
                      style={{ backgroundColor: alpha(action.color, 8) }}
                    >
                      <Icon className="h-3 w-3" style={{ color: action.color }} />
                    </div>
                    <span className="font-medium">{action.label}</span>
                  </Button>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Section 2b: Kas & Dana Breakdown ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {kasDanaCards.map((item) => {
          const Icon = item.icon;
          return (
            <Card
              key={item.label}
              className="cursor-default transition-all duration-200 group border-border hover:border-foreground/15"
            >
              <CardContent className="p-3">
                <div className="flex items-center gap-2 mb-2">
                  <div
                    className="flex h-7 w-7 items-center justify-center rounded-md shrink-0"
                    style={{ backgroundColor: item.bgColor }}
                  >
                    <Icon className="h-3.5 w-3.5" style={{ color: item.color }} />
                  </div>
                  <span className="text-[10px] uppercase tracking-wide font-medium text-muted-foreground">
                    {item.label}
                  </span>
                </div>
                <p className="text-xs sm:text-sm font-bold leading-tight truncate" style={{ color: item.color }}>
                  {formatAmount(item.value)}
                </p>
                {item.subText && (
                  <p className="text-[10px] text-muted-foreground mt-1 truncate">{item.subText}</p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* ── Section 2c: Investor Detail Cards ── */}
      {data.investorBreakdown && data.investorBreakdown.length > 0 && (
        <Card className="border-border">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2 text-foreground">
                <div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: '#BB86FC' }} />
                <Users className="h-3.5 w-3.5" style={{ color: '#BB86FC' }} />
                Detail Dana Investor
              </CardTitle>
              <div className="flex items-center gap-2">
                {data.investorSummary && (
                  <>
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full" style={{ color: '#BB86FC', backgroundColor: alpha('#BB86FC', 8) }}>
                      {data.investorSummary.activeInvestors} investor aktif
                    </span>
                  </>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="pb-4">
            {/* Summary row */}
            {data.investorSummary && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
                {[
                  { label: 'Total Modal Masuk', value: data.investorSummary.totalModalMasuk, color: 'var(--secondary)' as string },
                  { label: 'Pendapatan Investor', value: data.investorSummary.totalPendapatan, color: '#4CAF50' as string },
                  { label: 'Pengeluaran Investor', value: data.investorSummary.totalPengeluaran, color: 'var(--destructive)' as string },
                  { label: 'Saldo Investor', value: data.investorSummary.totalSaldo, color: '#BB86FC' as string },
                ].map((item) => (
                  <div key={item.label} className="p-2.5 rounded-lg" style={{ backgroundColor: alpha(item.color, 5) }}>
                    <p className="text-[10px] uppercase tracking-wide font-medium text-muted-foreground mb-1">{item.label}</p>
                    <p className="text-xs sm:text-sm font-bold tabular-nums" style={{ color: item.color }}>
                      {formatAmount(item.value)}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {/* Per-investor cards */}
            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1 custom-scrollbar">
              {data.investorBreakdown.map((inv) => {
                const saldoPct = inv.totalModal > 0 ? (inv.saldo / inv.totalModal) * 100 : 0;
                const saldoColor = inv.saldo >= 0 ? '#BB86FC' : 'var(--destructive)';
                return (
                  <div key={inv.id} className="p-3 sm:p-4 rounded-xl border border-border space-y-3" style={{ backgroundColor: alpha('#BB86FC', 2) }}>
                    {/* Investor header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg shrink-0" style={{ backgroundColor: alpha('#BB86FC', 10) }}>
                          <HandCoins className="h-4 w-4" style={{ color: '#BB86FC' }} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-foreground truncate">{inv.name}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            {inv.profitSharePct > 0 && (
                              <span className="text-[9px] font-medium px-1.5 py-0.5 rounded-md" style={{ color: '#BB86FC', backgroundColor: alpha('#BB86FC', 8) }}>
                                Bagian {inv.profitSharePct}%
                              </span>
                            )}
                            <span className="text-[10px] text-muted-foreground">
                              Modal: {formatAmount(inv.totalModal)}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm sm:text-base font-bold tabular-nums" style={{ color: saldoColor }}>
                          {formatAmount(inv.saldo)}
                        </p>
                        <p className="text-[10px] text-muted-foreground">Saldo</p>
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div className="h-2 rounded-full overflow-hidden bg-border">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{
                          width: `${Math.min(Math.max(saldoPct, 0), 100)}%`,
                          backgroundColor: saldoColor,
                        }}
                      />
                    </div>

                    {/* Detail breakdown */}
                    <div className="grid grid-cols-3 gap-2">
                      <div className="text-center p-2 rounded-lg" style={{ backgroundColor: 'color-mix(in srgb, var(--secondary) 5%, transparent)' }}>
                        <p className="text-[9px] uppercase tracking-wide font-medium text-muted-foreground mb-0.5">Modal Masuk</p>
                        <p className="text-[11px] sm:text-xs font-bold tabular-nums text-secondary">
                          {formatAmount(inv.modalMasuk)}
                        </p>
                      </div>
                      <div className="text-center p-2 rounded-lg" style={{ backgroundColor: 'color-mix(in srgb, #4CAF50 5%, transparent)' }}>
                        <p className="text-[9px] uppercase tracking-wide font-medium text-muted-foreground mb-0.5">Pendapatan</p>
                        <p className="text-[11px] sm:text-xs font-bold tabular-nums" style={{ color: '#4CAF50' }}>
                          {formatAmount(inv.pendapatan)}
                        </p>
                      </div>
                      <div className="text-center p-2 rounded-lg" style={{ backgroundColor: 'color-mix(in srgb, var(--destructive) 5%, transparent)' }}>
                        <p className="text-[9px] uppercase tracking-wide font-medium text-muted-foreground mb-0.5">Pengeluaran</p>
                        <p className="text-[11px] sm:text-xs font-bold tabular-nums text-destructive">
                          {formatAmount(inv.pengeluaran)}
                        </p>
                      </div>
                    </div>

                    {/* Recent entries */}
                    {inv.recentEntries && inv.recentEntries.length > 0 && (
                      <div className="space-y-1 pt-1 border-t border-border">
                        <p className="text-[10px] uppercase tracking-wide font-medium text-muted-foreground mb-1.5">Transaksi Terakhir</p>
                        {inv.recentEntries.map((entry, idx) => {
                          const isExpense = entry.type === 'pengeluaran';
                          const entryColor = isExpense ? 'var(--destructive)' : entry.type === 'pendapatan' ? '#4CAF50' : 'var(--secondary)';
                          const EntryIcon = isExpense ? ArrowDownRight : ArrowUpRight;
                          return (
                            <div key={idx} className="flex items-center justify-between py-1">
                              <div className="flex items-center gap-2 min-w-0">
                                <div className="flex h-5 w-5 items-center justify-center rounded-md shrink-0" style={{ backgroundColor: alpha(entryColor, 8) }}>
                                  <EntryIcon className="h-2.5 w-2.5" style={{ color: entryColor }} />
                                </div>
                                <div className="min-w-0">
                                  <p className="text-[10px] truncate text-foreground">{entry.description}</p>
                                  <p className="text-[9px] text-muted-foreground">
                                    {entry.type === 'modal_masuk' ? 'Modal Masuk' : entry.type === 'pendapatan' ? 'Pendapatan' : 'Pengeluaran'}
                                  </p>
                                </div>
                              </div>
                              <span className="text-[10px] font-bold tabular-nums shrink-0 ml-2" style={{ color: entryColor }}>
                                {isExpense ? '-' : '+'}{formatAmount(entry.amount)}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Section 3: Health Score + Revenue vs Expense + Status Ringkas ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {/* Left: Business Health Score (Enhanced Ring) */}
        <Card className="h-full border-border">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2 text-foreground">
                <div className="h-1.5 w-1.5 rounded-full bg-secondary" />
                Ring Keuangan
              </CardTitle>
              <span
                className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                style={{
                  color: healthScore.color,
                  backgroundColor: alpha(healthScore.color, 8),
                }}
              >
                Grade {healthScore.grade}
              </span>
            </div>
          </CardHeader>
          <CardContent className="pb-4">
            <div className="flex flex-col items-center">
              <HealthRing score={healthScore.score} color={healthScore.color} grade={healthScore.grade} />

              {/* Health breakdown bars */}
              <div className="w-full mt-3 space-y-2">
                {healthBreakdown.map((item) => (
                  <div key={item.label} className="space-y-0.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-medium text-muted-foreground">{item.label}</span>
                      <span className="text-[10px] font-bold tabular-nums" style={{ color: item.color }}>
                        {item.value.toFixed(0)}{item.suffix}
                      </span>
                    </div>
                    <div className="h-1 rounded-full overflow-hidden bg-border">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{
                          backgroundColor: item.color,
                          width: `${Math.min(item.value, 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Center: Revenue vs Expense Chart */}
        <Card className="h-full border-border">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2 text-foreground">
                <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                {t('biz.bizRevenue')} vs {t('biz.bizExpense')}
              </CardTitle>
              <span className="text-[10px] uppercase tracking-wider font-medium text-muted-foreground">
                Overview
              </span>
            </div>
          </CardHeader>
          <CardContent className="pb-4">
            {comparisonData.some(d => d.value > 0) ? (
              <div className="space-y-3">
                {comparisonData.map((item) => {
                  const pct = totalComparison > 0 ? ((item.value / totalComparison) * 100) : 0;
                  return (
                    <div key={item.name} className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <div
                            className="h-2 w-2 rounded-sm"
                            style={{ backgroundColor: item.fill }}
                          />
                          <span className="text-[11px] font-medium text-muted-foreground truncate">{item.name}</span>
                        </div>
                        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-md text-muted-foreground bg-border">
                            {pct.toFixed(1)}%
                          </span>
                          <span className="text-xs sm:text-sm font-bold tabular-nums text-foreground">
                            {formatAmount(item.value)}
                          </span>
                        </div>
                      </div>
                      <div className="h-5 sm:h-6 rounded-lg overflow-hidden relative bg-border">
                        <div
                          className="h-full rounded-lg relative overflow-hidden transition-all duration-700"
                          style={{
                            width: `${Math.max((item.value / maxChartValue) * 100, 2)}%`,
                            backgroundColor: item.fill,
                            transitionDelay: `${0.15 * comparisonData.indexOf(item)}s`,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}

                {data && (
                  <>
                    <Separator className="my-1" />
                    <div className="flex items-center justify-between pt-0.5">
                      <span className="text-[11px] font-medium text-muted-foreground">{t('biz.bizProfitLoss')}</span>
                      <div className="flex items-center gap-2">
                        <span
                          className="text-sm font-bold tabular-nums"
                          style={{ color: data.profit >= 0 ? 'var(--secondary)' : 'var(--destructive)' }}
                        >
                          {data.profit >= 0 ? '+' : ''}{formatAmount(data.profit)}
                        </span>
                        <span
                          className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md"
                          style={{
                            color: data.profitMargin >= 0 ? 'var(--secondary)' : 'var(--destructive)',
                            backgroundColor: data.profitMargin >= 0 ? 'color-mix(in srgb, var(--secondary) 9%, transparent)' : 'color-mix(in srgb, var(--destructive) 9%, transparent)',
                          }}
                        >
                          {(data.profitMargin ?? 0).toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <EmptyState
                icon={BarChart3}
                title={t('biz.noBizData')}
                description="Mulai catat penjualan untuk melihat grafik"
                accentColor="var(--secondary)"
              />
            )}
          </CardContent>
        </Card>

        {/* Right: Status Ringkas */}
        <Card className="h-full border-border">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2 text-foreground">
                <div className="h-1.5 w-1.5 rounded-full bg-warning" />
                Status Ringkas
              </CardTitle>
              <span className="text-[10px] uppercase tracking-wider font-medium text-muted-foreground">
                Snapshot
              </span>
            </div>
          </CardHeader>
          <CardContent className="space-y-2 pb-4">
            {statusItems.map((item) => {
              const Icon = item.icon;
              const hasData = (item.count !== undefined && item.count > 0) || (item.amount !== null && item.amount > 0);
              return (
                <div
                  key={item.label}
                  className="flex items-center gap-2.5 p-2.5 rounded-lg transition-all duration-200"
                  style={{ backgroundColor: item.bgColor }}
                >
                  <div
                    className="flex h-7 w-7 items-center justify-center rounded-md shrink-0"
                    style={{ backgroundColor: alpha(item.accentColor, 8) }}
                  >
                    <Icon className="h-3.5 w-3.5" style={{ color: item.accentColor }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] mb-0.5 font-medium text-muted-foreground">{item.label}</p>
                    {hasData ? (
                      <div className="flex items-center gap-2">
                        {item.count !== undefined && item.count > 0 && (
                          <span className="text-sm font-bold text-foreground">
                            {item.count} <span className="text-[10px] font-normal text-muted-foreground">items</span>
                          </span>
                        )}
                        {item.amount !== null && item.amount > 0 && (
                          <span className="text-sm font-bold tabular-nums" style={{ color: item.accentColor }}>
                            {formatAmount(item.amount)}
                          </span>
                        )}
                      </div>
                    ) : (
                      <p className="text-[11px] text-muted-foreground">{item.emptyLabel}</p>
                    )}
                  </div>
                </div>
              );
            })}

            {data && data.debtsDueSoon.length > 0 && (
              <>
                <Separator />
                <div className="space-y-1.5">
                  <p className="text-[10px] uppercase tracking-wide font-medium text-muted-foreground">
                    {t('biz.bizDebtDue')}
                  </p>
                  {data.debtsDueSoon.slice(0, 3).map((debt) => (
                    <div
                      key={debt.id}
                      className="flex items-center justify-between py-1.5 border-b border-border"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] truncate font-medium text-muted-foreground">{debt.counterpart}</p>
                        <div className="flex items-center gap-1 mt-0.5">
                          <Clock className="h-2.5 w-2.5 text-muted-foreground" />
                          <p className="text-[10px] text-muted-foreground">{formatDate(debt.dueDate)}</p>
                        </div>
                      </div>
                      <span
                        className="text-[11px] font-bold ml-2 shrink-0 tabular-nums px-1.5 py-0.5 rounded-md text-destructive"
                        style={{ backgroundColor: 'color-mix(in srgb, var(--destructive) 7%, transparent)' }}
                      >
                        {formatAmount(debt.remaining)}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Section 3b: Piutang Jatuh Tempo + Piutang Summary (2/3 + 1/3) ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Piutang Jatuh Tempo (2/3) */}
        <Card className="md:col-span-2 lg:col-span-2 border-border">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2 text-foreground">
                <div className="h-1.5 w-1.5 rounded-full bg-warning" />
                <AlertTriangle className="h-3.5 w-3.5 text-warning" />
                Piutang Jatuh Tempo
              </CardTitle>
              {(data?.debtsDueSoon?.length ?? 0) > 0 && (
                <span
                  className="text-[10px] font-bold px-2 py-0.5 rounded-full text-warning"
                  style={{ backgroundColor: alpha('var(--warning)', 8) }}
                >
                  {data.debtsDueSoon.length} item
                </span>
              )}
            </div>
          </CardHeader>
          <CardContent className="pb-4">
            {debtsDueSoonWithBadge.length > 0 ? (
              <div className="max-h-[220px] overflow-y-auto pr-1 custom-scrollbar space-y-1.5">
                {debtsDueSoonWithBadge.map((debt) => (
                  <div
                    key={debt.id}
                    className="flex items-center gap-2 sm:gap-2.5 py-1.5 sm:py-2 px-2 sm:px-2.5 rounded-lg transition-colors duration-150 hover:bg-white/[0.02] border-b border-border"
                  >
                    <div
                      className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-lg shrink-0"
                      style={{
                        backgroundColor: alpha(debt.badgeColor, 7),
                        border: `1px solid ${alpha(debt.badgeColor, 12)}`,
                      }}
                    >
                      <Clock className="h-3 w-3 sm:h-3.5 sm:w-3.5" style={{ color: debt.badgeColor }} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[12px] truncate font-medium text-foreground">{debt.counterpart}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] text-muted-foreground">{_fmtDate(debt.dueDate)}</span>
                        {debt.status && (
                          <span
                            className="text-[9px] font-medium px-1 py-px rounded-md"
                            style={{
                              color: debt.status === 'overdue' ? 'var(--destructive)' : 'var(--muted-foreground)',
                              backgroundColor: debt.status === 'overdue' ? 'color-mix(in srgb, var(--destructive) 7%, transparent)' : 'transparent',
                            }}
                          >
                            {debt.status === 'overdue' ? 'Overdue' : 'Aktif'}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-[11px] sm:text-[12px] font-bold tabular-nums" style={{ color: debt.badgeColor }}>{formatAmount(debt.remaining)}</p>
                      <span
                        className="text-[8px] sm:text-[9px] font-semibold px-1 sm:px-1.5 py-0.5 rounded-full mt-0.5 inline-block whitespace-nowrap"
                        style={{ color: debt.badgeColor, backgroundColor: alpha(debt.badgeColor, 8) }}
                      >
                        {debt.badgeLabel}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center gap-2 py-2 px-2.5 rounded-lg" style={{ backgroundColor: 'color-mix(in srgb, var(--secondary) 3%, transparent)' }}>
                <CheckCircle2 className="h-4 w-4 text-secondary" />
                <p className="text-[12px] font-medium text-secondary">Semua piutang aman — tidak ada yang jatuh tempo dalam 7 hari</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Piutang Summary (1/3) */}
        <Card className="h-full border-border">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2 text-foreground">
                <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                <HandCoins className="h-3.5 w-3.5 text-primary" />
                Piutang Summary
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pb-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {piutangSummaryCards.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.label}
                  className="p-2.5 rounded-lg transition-all duration-200"
                  style={{ backgroundColor: item.bgColor }}
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <div
                      className="flex h-6 w-6 items-center justify-center rounded-md shrink-0"
                      style={{ backgroundColor: alpha(item.color, 8) }}
                    >
                      <Icon className="h-3 w-3" style={{ color: item.color }} />
                    </div>
                    <span className="text-[10px] uppercase tracking-wide font-medium text-muted-foreground">
                      {item.label}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="text-base sm:text-lg font-bold tabular-nums text-foreground">
                        {item.count}
                      </span>
                      <span className="text-[10px] text-muted-foreground">cicilan</span>
                    </div>
                    <span className="text-[10px] sm:text-[11px] font-bold tabular-nums" style={{ color: item.color }}>
                      {formatAmount(item.amount)}
                    </span>
                  </div>
                </div>
              );
            })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Section 3c: Top Produk Terjual (Enhanced) ── */}
      {data?.topProductsSold && data.topProductsSold.length > 0 && (
        <Card className="border-border">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2 text-foreground">
                <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                <Package className="h-3.5 w-3.5 text-primary" />
                Top Produk Terjual
              </CardTitle>
              <span className="text-[10px] uppercase tracking-wider font-medium text-muted-foreground">
                Top 5
              </span>
            </div>
          </CardHeader>
          <CardContent className="pb-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {data.topProductsSold.slice(0, 5).map((product, idx) => {
                const maxRevenue = Math.max(...data.topProductsSold.map(p => p.totalRevenue), 1);
                const barPct = (product.totalRevenue / maxRevenue) * 100;
                const rankColor = idx < 3 ? rankColors[idx] : '#9E9E9E';
                return (
                  <div
                    key={product.name}
                    className="p-2 sm:p-2.5 rounded-lg space-y-1.5 sm:space-y-2 transition-all duration-200 border border-border"
                    style={{ backgroundColor: 'color-mix(in srgb, var(--primary) 2%, transparent)' }}
                  >
                    {/* Rank + Name */}
                    <div className="flex items-center gap-1.5 sm:gap-2">
                      <div
                        className="flex h-5 w-5 sm:h-6 sm:w-6 items-center justify-center rounded-md shrink-0 text-[9px] sm:text-[10px] font-bold"
                        style={{
                          backgroundColor: idx < 3 ? alpha(rankColor, 12) : 'color-mix(in srgb, var(--muted-foreground) 7%, transparent)',
                          color: idx < 3 ? rankColor : 'var(--muted-foreground)',
                          border: idx < 3 ? `1px solid ${alpha(rankColor, 19)}` : 'none',
                        }}
                      >
                        #{idx + 1}
                      </div>
                      <span className="text-[11px] sm:text-[12px] truncate font-medium flex-1 min-w-0 text-foreground">
                        {product.name}
                      </span>
                    </div>

                    {/* Progress bar */}
                    <div className="h-1.5 sm:h-2 rounded-full overflow-hidden bg-border">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{
                          width: `${Math.max(barPct, 3)}%`,
                          background: 'linear-gradient(90deg, color-mix(in srgb, var(--primary) 56%, transparent), var(--primary))',
                          transitionDelay: `${idx * 0.1}s`,
                        }}
                      />
                    </div>

                    {/* Stats row */}
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] sm:text-[10px] text-muted-foreground">
                        {product.totalQuantity} pcs terjual
                      </span>
                      <span className="text-[10px] sm:text-[11px] font-bold tabular-nums text-primary">
                        {formatAmount(product.totalRevenue)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Section 4: Revenue Trend + Activity (2-col) ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Mini Revenue Trend */}
        <Card className="h-full border-border">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2 text-foreground">
                <div className="h-1.5 w-1.5 rounded-full bg-secondary" />
                Tren Pendapatan Harian
              </CardTitle>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1">
                  <div className="h-1.5 w-1.5 rounded-sm bg-secondary" />
                  <span className="text-[9px] text-muted-foreground">Pendapatan</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="h-1.5 w-1.5 rounded-sm bg-destructive" />
                  <span className="text-[9px] text-muted-foreground">Pengeluaran</span>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pb-4">
            <MiniRevenueTrend recentSales={data?.recentSales || []} recentCashEntries={data?.recentCashEntries || []} />
          </CardContent>
        </Card>

        {/* Aktivitas Terbaru */}
        <Card className="h-full border-border">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2 text-foreground">
                <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                Aktivitas Terbaru
              </CardTitle>
              {combinedActivities.length > 0 && (
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full text-muted-foreground bg-border">
                  {combinedActivities.length} aktivitas
                </span>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="max-h-[260px] overflow-y-auto pr-1 custom-scrollbar">
              {groupedActivities.length > 0 ? (
                <div className="space-y-3">
                  {groupedActivities.map((group) => (
                    <div key={group.group}>
                      <div className="flex items-center gap-2 mb-1.5">
                        <div className="h-px flex-1 bg-border" />
                        <span className="text-[10px] font-semibold uppercase tracking-wider px-2 text-muted-foreground">
                          {group.group}
                        </span>
                        <div className="h-px flex-1 bg-border" />
                      </div>
                      <div className="space-y-0.5">
                        {group.items.map((item) => {
                          const isExpense = item.type === 'expense';
                          const actColor = isExpense ? 'var(--destructive)' : item.type === 'sale' ? 'var(--secondary)' : 'var(--primary)';
                          const ActIcon = isExpense ? ArrowDownRight : ArrowUpRight;
                          return (
                            <div
                              key={item.id}
                              className="flex items-center gap-2 sm:gap-2.5 py-1.5 sm:py-2 rounded-lg px-2 -mx-1 transition-colors duration-150 cursor-default hover:bg-white/[0.03]"
                            >
                              <div
                                className="flex h-6 w-6 sm:h-7 sm:w-7 items-center justify-center rounded-md shrink-0"
                                style={{ backgroundColor: alpha(actColor, 7) }}
                              >
                                <ActIcon className="h-2.5 w-2.5 sm:h-3 sm:w-3" style={{ color: actColor }} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-[12px] truncate font-medium text-muted-foreground">
                                  {item.description}
                                </p>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  <span className="text-[10px] text-muted-foreground">
                                    {item.type === 'sale' ? (item.customer || '-') : item.type === 'expense' ? 'Pengeluaran' : 'Pemasukan'}
                                  </span>
                                  <span
                                    className="text-[9px] font-medium px-1 py-px rounded-md text-primary"
                                    style={{ backgroundColor: alpha('var(--primary)', 7) }}
                                  >
                                    {getTimeBadge(item.date)}
                                  </span>
                                </div>
                              </div>
                              <span className="text-xs sm:text-sm font-bold ml-1 shrink-0 tabular-nums" style={{ color: actColor }}>
                                {isExpense ? '-' : '+'}{formatAmount(item.amount)}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState
                  icon={Inbox}
                  title={t('biz.noBizData')}
                  description="Belum ada aktivitas. Mulai catat penjualan pertama Anda."
                  accentColor="var(--primary)"
                />
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Section 6: Insight Tips (Rotating) ── */}
      <Card className="overflow-hidden relative border-border">
        <CardContent className="p-3 sm:p-4 relative">
          <div className="flex items-center gap-3">
            {/* Tip icon + dots */}
            <div className="flex flex-col items-center gap-1.5 shrink-0">
              <div
                className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-xl"
                style={{
                  background: alpha(currentTip.color, 8),
                  border: `1px solid ${alpha(currentTip.color, 12)}`,
                }}
              >
                <TipIcon className="h-4 w-4" style={{ color: currentTip.color }} />
              </div>
              {/* Navigation dots */}
              <div className="flex gap-0.5">
                {bizTips.map((_, i) => (
                  <button
                    key={i}
                    className="rounded-full cursor-pointer transition-all duration-300"
                    style={{
                      width: i === tipIndex ? 12 : 4,
                      height: 4,
                      backgroundColor: i === tipIndex ? currentTip.color : 'var(--border)',
                    }}
                    onClick={() => setTipIndex(i)}
                  />
                ))}
              </div>
            </div>

            {/* Tip content */}
            <div className="flex-1 min-w-0">
              <AnimatePresence mode="wait">
                <motion.div
                  key={tipIndex}
                  initial={{ opacity: 0, y: 6, x: 8 }}
                  animate={{ opacity: 1, y: 0, x: 0 }}
                  exit={{ opacity: 0, y: -6, x: -8 }}
                  transition={{ duration: 0.25 }}
                >
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <Lightbulb className="h-3 w-3" style={{ color: currentTip.color }} />
                    <span className="text-xs sm:text-sm font-semibold text-foreground">{currentTip.title}</span>
                    <span
                      className="text-[9px] font-medium px-1.5 py-0.5 rounded-full"
                      style={{
                        color: currentTip.color,
                        backgroundColor: alpha(currentTip.color, 7),
                      }}
                    >
                      Tips Bisnis
                    </span>
                  </div>
                  <p className="text-[11px] leading-relaxed text-muted-foreground">{currentTip.desc}</p>
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Nav arrows */}
            <div className="hidden sm:flex flex-col gap-0.5 shrink-0">
              <button
                className="h-6 w-6 rounded-md flex items-center justify-center transition-colors duration-150 bg-border text-muted-foreground"
                onClick={() => setTipIndex((prev) => (prev - 1 + bizTips.length) % bizTips.length)}
              >
                <ChevronLeft className="h-3 w-3" />
              </button>
              <button
                className="h-6 w-6 rounded-md flex items-center justify-center transition-colors duration-150 bg-border text-muted-foreground"
                onClick={() => setTipIndex((prev) => (prev + 1) % bizTips.length)}
              >
                <ChevronRight className="h-3 w-3" />
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Section 7: Quick Insight ── */}
      <div className="rounded-xl p-3 flex items-start gap-2.5 bg-card border border-border">
        <Lightbulb className="h-4 w-4 shrink-0 mt-0.5 text-secondary" />
        <div className="flex-1 min-w-0">
          <p className="text-[10px] uppercase tracking-wider font-semibold mb-0.5 text-muted-foreground">
            Quick Insight
          </p>
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            {quickInsight}
          </p>
        </div>
        <span
          className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full shrink-0 mt-0.5"
          style={{
            color: healthScore.color,
            backgroundColor: alpha(healthScore.color, 8),
          }}
        >
          {healthScore.grade}
        </span>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: 'var(--border)';
          border-radius: 999px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255,255,255,0.15);
        }
      `}</style>
    </div>
  );
}
