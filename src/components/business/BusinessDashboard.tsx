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
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

/* ── Theme Constants ── */
const THEME = {
  bg: '#000000',
  surface: '#121212',
  primary: '#BB86FC',
  secondary: '#03DAC6',
  destructive: '#CF6679',
  warning: '#F9A825',
  muted: '#9E9E9E',
  border: 'rgba(255,255,255,0.08)',
  borderHover: 'rgba(255,255,255,0.15)',
  text: '#FFFFFF',
  textSecondary: '#B3B3B3',
} as const;

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
    totalQty: number;
    totalRevenue: number;
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
  if (score >= 80) { grade = 'A'; color = THEME.secondary; }
  else if (score >= 60) { grade = 'B'; color = '#4FC3F7'; }
  else if (score >= 40) { grade = 'C'; color = THEME.warning; }
  else { grade = 'D'; color = THEME.destructive; }

  return { score, grade, color };
}

/* ── Health Ring Component (compact) ── */
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

  const radius = 32;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (displayScore / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center">
      <svg width="88" height="88" viewBox="0 0 88 88" className="-rotate-90">
        <circle
          cx="44" cy="44" r={radius}
          stroke={THEME.border}
          strokeWidth="7"
          fill="none"
        />
        <circle
          cx="44" cy="44" r={radius}
          stroke={color}
          strokeWidth="7"
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
          className="text-lg font-bold tabular-nums"
          style={{ color }}
        >
          {displayScore}
        </span>
        <span
          className="text-[9px] font-semibold uppercase tracking-wider mt-0.5"
          style={{ color: THEME.muted }}
        >
          Grade {grade}
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
          background: `${accentColor}15`,
        }}
      >
        <Icon className="h-5 w-5" style={{ color: accentColor, opacity: 0.6 }} />
      </div>
      <p className="text-sm font-medium mb-1" style={{ color: THEME.muted }}>{title}</p>
      <p className="text-[11px] text-center max-w-[200px]" style={{ color: THEME.muted }}>{description}</p>
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
                className="flex-1 rounded-t-sm origin-bottom min-h-[2px]"
                style={{
                  backgroundColor: THEME.secondary,
                  opacity: 0.8,
                  height: `${Math.max(bar.revenue, 3)}%`,
                  transition: `height 0.4s ease ${i * 0.06}s`,
                }}
              />
              <div
                className="flex-1 rounded-t-sm origin-bottom min-h-[2px]"
                style={{
                  backgroundColor: THEME.destructive,
                  opacity: 0.7,
                  height: `${Math.max(bar.expense, 3)}%`,
                  transition: `height 0.4s ease ${i * 0.06 + 0.05}s`,
                }}
              />
            </div>
            <span className="text-[8px] font-medium" style={{ color: THEME.muted }}>{bar.label.slice(0, 2)}</span>
          </div>
        ))
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <span className="text-[10px]" style={{ color: THEME.muted }}>Belum ada data</span>
        </div>
      )}
    </div>
  );
}

/* ── Insight Tips ── */
const bizTips = [
  { title: 'Kelola Piutang', desc: 'Follow up piutang yang sudah lewat tempo untuk menjaga arus kas.', color: THEME.destructive, icon: TrendingDown },
  { title: 'Target Penjualan', desc: 'Tetapkan target harian untuk mencapai target bulanan.', color: THEME.secondary, icon: Target },
  { title: 'Efisiensi Pengeluaran', desc: 'Review kas keluar mingguan untuk mengidentifikasi penghematan.', color: THEME.warning, icon: PieChart },
  { title: 'Diversifikasi Produk', desc: 'Tambah variasi produk untuk meningkatkan peluang penjualan.', color: THEME.primary, icon: Sparkles },
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
        badgeColor = THEME.destructive;
        badgeLabel = `Lewat ${Math.abs(diffDays)} hari`;
      } else if (diffDays <= 3) {
        badgeColor = THEME.warning;
        badgeLabel = diffDays === 0 ? 'Hari ini' : `${diffDays} hari lagi`;
      } else if (diffDays <= 7) {
        badgeColor = THEME.secondary;
        badgeLabel = `${diffDays} hari lagi`;
      } else {
        badgeColor = THEME.muted;
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
        <p className="text-center" style={{ color: THEME.muted }}>{t('biz.registerFirst')}</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-[60px] rounded-xl" style={{ background: THEME.surface }} />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-[96px] rounded-xl" style={{ background: THEME.surface }} />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-3">
          <Skeleton className="h-[240px] rounded-xl lg:col-span-3" style={{ background: THEME.surface }} />
          <Skeleton className="h-[240px] rounded-xl lg:col-span-2" style={{ background: THEME.surface }} />
        </div>
        <Skeleton className="h-[44px] rounded-xl" style={{ background: THEME.surface }} />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          <Skeleton className="h-[220px] rounded-xl" style={{ background: THEME.surface }} />
          <Skeleton className="h-[220px] rounded-xl" style={{ background: THEME.surface }} />
          <Skeleton className="h-[220px] rounded-xl" style={{ background: THEME.surface }} />
        </div>
        <Skeleton className="h-[160px] rounded-xl" style={{ background: THEME.surface }} />
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
          accentColor: THEME.secondary,
          subText: `${data.salesCount || 0} transaksi · Avg: ${formatAmount(data.averageSaleValue || 0)}`,
          trend: 'up' as const,
        },
        {
          label: t('biz.bizExpense'),
          value: data.totalExpense,
          icon: TrendingDown,
          accentColor: THEME.destructive,
          subText: data.totalExpense > 0
            ? `${t('biz.kasKeluar')}: ${formatAmount(data.totalKasKeluar)}`
            : t('biz.noBizData'),
          trend: 'down' as const,
        },
        {
          label: t('biz.bizProfit'),
          value: data.profit,
          icon: DollarSign,
          accentColor: data.profit >= 0 ? THEME.secondary : THEME.destructive,
          subText: `Margin: ${(data.profitMargin ?? 0).toFixed(1)}%`,
          badge: (data.profitMargin ?? 0) > 0 ? `+${(data.profitMargin ?? 0).toFixed(1)}%` : null,
          trend: (data.profit ?? 0) > 0 ? ('up' as const) : (data.profit ?? 0) < 0 ? ('down' as const) : ('flat' as const),
        },
        {
          label: 'Cash Flow',
          value: netCashValue,
          icon: Wallet,
          accentColor: netCashValue >= 0 ? THEME.secondary : THEME.destructive,
          subText: `Hutang/Revenue: ${debtToRevenueRatio.toFixed(0)}%`,
          badge: debtToRevenueRatio > 50 ? `${debtToRevenueRatio.toFixed(0)}%` : null,
          trend: netCashValue >= 0 ? ('up' as const) : ('down' as const),
        },
      ]
    : [];

  // Chart data: bar comparison of revenue vs expense
  const comparisonData = data
    ? [
        { name: t('biz.bizRevenue'), value: data.totalRevenue, fill: THEME.secondary, gradientFrom: THEME.secondary, gradientTo: '#00B894' },
        { name: t('biz.bizExpense'), value: data.totalExpense, fill: THEME.destructive, gradientFrom: THEME.destructive, gradientTo: '#E84393' },
        { name: t('biz.bizProfit'), value: Math.max(0, data.profit), fill: '#4CAF50', gradientFrom: '#4CAF50', gradientTo: THEME.secondary },
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
          accentColor: THEME.warning,
          bgColor: `${THEME.warning}0F`,
          emptyLabel: t('biz.noBizData'),
        },
        {
          label: t('biz.bizDebtDue'),
          count: data.totalHutang > 0 ? undefined : 0,
          amount: data.totalHutang,
          icon: AlertTriangle,
          accentColor: THEME.destructive,
          bgColor: `${THEME.destructive}0F`,
          emptyLabel: t('biz.noBizData'),
        },
        {
          label: t('biz.bizReceivableDue'),
          count: data.totalPiutang > 0 ? undefined : 0,
          amount: data.totalPiutang,
          icon: ArrowUpRight,
          accentColor: THEME.secondary,
          bgColor: `${THEME.secondary}0F`,
          emptyLabel: t('biz.noBizData'),
        },
      ]
    : [];

  // Quick actions
  const quickActions = [
    { label: t('biz.addSale'), icon: Plus, color: THEME.secondary },
    { label: t('biz.addInvoice'), icon: FileText, color: THEME.primary },
    { label: t('biz.kasKeluar'), icon: Receipt, color: THEME.destructive },
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
      color: (data.profitMargin || 0) >= 10 ? THEME.secondary : (data.profitMargin || 0) > 0 ? THEME.warning : THEME.destructive,
      suffix: '%',
    },
    {
      label: 'Cash Flow',
      value: data.totalRevenue > 0 ? Math.min(100, (netCashValue / data.totalRevenue) * 100) : 0,
      color: netCashValue > 0 ? THEME.secondary : THEME.destructive,
      suffix: '%',
    },
    {
      label: 'Debt Ratio',
      value: Math.max(0, 100 - debtToRevenueRatio),
      color: debtToRevenueRatio < 0.3 ? THEME.secondary : debtToRevenueRatio < 0.6 ? THEME.warning : THEME.destructive,
      suffix: '%',
    },
    {
      label: 'Receivables',
      value: data.totalRevenue > 0 ? Math.max(0, 100 - ((data.totalPiutang / data.totalRevenue) * 100)) : 100,
      color: data.totalPiutang / (data.totalRevenue || 1) < 0.2 ? THEME.secondary : data.totalPiutang / (data.totalRevenue || 1) < 0.5 ? THEME.warning : THEME.destructive,
      suffix: '%',
    },
  ] : [];

  const currentTip = bizTips[tipIndex];
  const TipIcon = currentTip.icon;

  return (
    <div className="space-y-4">
      {/* ── Welcome Banner (compact) ── */}
      <div
        className="rounded-xl p-3 sm:p-4"
        style={{
          background: THEME.surface,
          border: `1px solid ${THEME.border}`,
        }}
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="flex items-center gap-3">
            <div
              className="flex h-9 w-9 items-center justify-center rounded-lg shrink-0"
              style={{ background: `${THEME.secondary}15` }}
            >
              <Sparkles className="h-4 w-4" style={{ color: THEME.secondary }} />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-semibold" style={{ color: THEME.text }}>
                {greeting.greet}, <span style={{ color: THEME.secondary }}>{activeBusiness?.name || 'Pengguna'}</span>
              </h2>
              <div className="flex items-center gap-1.5 mt-0.5">
                <CalendarDays className="h-3 w-3" style={{ color: THEME.muted }} />
                <p className="text-[11px]" style={{ color: THEME.muted }}>{greeting.dateStr}</p>
              </div>
            </div>
          </div>
          <span className="text-[11px] font-medium" style={{ color: THEME.muted }}>Dashboard</span>
        </div>
      </div>

      {/* ── Info Card (dismissible) ── */}
      {!infoDismissed && (
        <div
          className="rounded-xl p-3 flex items-start gap-2.5 transition-opacity duration-200"
          style={{
            background: `${THEME.muted}08`,
            border: `1px solid ${THEME.border}`,
          }}
        >
          <Info className="h-4 w-4 shrink-0 mt-0.5" style={{ color: THEME.muted }} />
          <p className="text-[11px] leading-relaxed flex-1" style={{ color: THEME.muted }}>
            Dashboard menampilkan ringkasan bisnis Anda: pendapatan, pengeluaran, profit, arus kas, piutang yang akan jatuh tempo, dan produk terlaris.
          </p>
          <button
            onClick={() => setInfoDismissed(true)}
            className="shrink-0 h-5 w-5 rounded-md flex items-center justify-center transition-colors duration-150"
            style={{ color: THEME.muted }}
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      )}

      {/* ── Section 1: Quick Stats Row with Sparklines ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {quickStats.map((stat) => {
          const Icon = stat.icon;
          const sparkData = generateSparklineData(stat.value);
          return (
            <Card
              key={stat.label}
              className="cursor-default transition-all duration-200 group"
              style={{
                background: THEME.surface,
                border: `1px solid ${THEME.border}`,
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor = THEME.borderHover;
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor = THEME.border;
              }}
            >
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-start justify-between mb-2">
                  <div
                    className="flex h-7 w-7 items-center justify-center rounded-md shrink-0 transition-transform duration-200 group-hover:scale-105"
                    style={{
                      backgroundColor: `${stat.accentColor}15`,
                    }}
                  >
                    <Icon className="h-3.5 w-3.5" style={{ color: stat.accentColor }} />
                  </div>
                  {stat.badge && (
                    <span
                      className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md"
                      style={{
                        color: stat.accentColor,
                        backgroundColor: `${stat.accentColor}15`,
                      }}
                    >
                      {stat.badge}
                    </span>
                  )}
                </div>
                <p className="text-[11px] uppercase tracking-wide font-medium mb-0.5" style={{ color: THEME.muted }}>
                  {stat.label}
                </p>
                <p className="text-sm font-bold leading-tight" style={{ color: THEME.text }}>
                  {formatAmount(stat.value)}
                </p>
                <div className="flex items-end justify-between mt-2 gap-2">
                  <p className="text-[10px] leading-snug truncate flex-1 min-w-0" style={{ color: THEME.muted }}>
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
      <Card
        className="overflow-hidden"
        style={{
          background: THEME.surface,
          border: `1px solid ${THEME.border}`,
        }}
      >
        <CardContent className="px-3 sm:px-4 py-2.5">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 shrink-0">
              <BarChart3 className="h-3.5 w-3.5" style={{ color: THEME.muted }} />
              <span className="text-[11px] font-medium uppercase tracking-wide" style={{ color: THEME.muted }}>
                Quick Actions
              </span>
            </div>
            <Separator orientation="vertical" className="h-4" style={{ background: THEME.border }} />
            <div className="flex items-center gap-2 flex-wrap">
              {quickActions.map((action) => {
                const Icon = action.icon;
                return (
                  <Button
                    key={action.label}
                    variant="ghost"
                    size="sm"
                    className="h-8 px-3 gap-1.5 text-[11px] rounded-lg transition-all duration-200"
                    style={{
                      color: THEME.textSecondary,
                      background: 'transparent',
                      border: `1px solid ${THEME.border}`,
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.background = `${action.color}12`;
                      (e.currentTarget as HTMLElement).style.borderColor = `${action.color}30`;
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.background = 'transparent';
                      (e.currentTarget as HTMLElement).style.borderColor = THEME.border;
                    }}
                  >
                    <div
                      className="flex h-5 w-5 items-center justify-center rounded-md shrink-0"
                      style={{
                        backgroundColor: `${action.color}15`,
                      }}
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

      {/* ── Section 3: Health Score + Revenue Trend + Chart ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
        {/* Left: Business Health Score */}
        <div className="lg:col-span-4">
          <Card
            className="h-full"
            style={{
              background: THEME.surface,
              border: `1px solid ${THEME.border}`,
            }}
          >
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold flex items-center gap-2" style={{ color: THEME.text }}>
                  <div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: THEME.secondary }} />
                  Skor Kesehatan
                </CardTitle>
                <span
                  className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                  style={{
                    color: healthScore.color,
                    backgroundColor: `${healthScore.color}15`,
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
                        <span className="text-[10px] font-medium" style={{ color: THEME.textSecondary }}>{item.label}</span>
                        <span className="text-[10px] font-bold tabular-nums" style={{ color: item.color }}>
                          {item.value.toFixed(0)}{item.suffix}
                        </span>
                      </div>
                      <div className="h-1 rounded-full overflow-hidden" style={{ background: THEME.border }}>
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
        </div>

        {/* Center: Revenue vs Expense Chart */}
        <div className="lg:col-span-5">
          <Card
            className="h-full"
            style={{
              background: THEME.surface,
              border: `1px solid ${THEME.border}`,
            }}
          >
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold flex items-center gap-2" style={{ color: THEME.text }}>
                  <div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: THEME.primary }} />
                  {t('biz.bizRevenue')} vs {t('biz.bizExpense')}
                </CardTitle>
                <span className="text-[10px] uppercase tracking-wider font-medium" style={{ color: THEME.muted }}>
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
                            <span className="text-[11px] font-medium" style={{ color: THEME.textSecondary }}>{item.name}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span
                              className="text-[10px] font-medium px-1.5 py-0.5 rounded-md"
                              style={{ color: THEME.muted, backgroundColor: `${THEME.border}` }}
                            >
                              {pct.toFixed(1)}%
                            </span>
                            <span className="text-sm font-bold tabular-nums" style={{ color: THEME.text }}>
                              {formatAmount(item.value)}
                            </span>
                          </div>
                        </div>
                        <div className="h-6 rounded-lg overflow-hidden relative" style={{ background: `${THEME.border}` }}>
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
                      <Separator className="my-1" style={{ background: THEME.border }} />
                      <div className="flex items-center justify-between pt-0.5">
                        <span className="text-[11px] font-medium" style={{ color: THEME.muted }}>{t('biz.bizProfitLoss')}</span>
                        <div className="flex items-center gap-2">
                          <span
                            className="text-sm font-bold tabular-nums"
                            style={{ color: data.profit >= 0 ? THEME.secondary : THEME.destructive }}
                          >
                            {data.profit >= 0 ? '+' : ''}{formatAmount(data.profit)}
                          </span>
                          <span
                            className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md"
                            style={{
                              color: data.profitMargin >= 0 ? THEME.secondary : THEME.destructive,
                              backgroundColor: data.profitMargin >= 0 ? `${THEME.secondary}18` : `${THEME.destructive}18`,
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
                  accentColor={THEME.secondary}
                />
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right: Status Ringkas */}
        <div className="lg:col-span-3">
          <Card
            className="h-full"
            style={{
              background: THEME.surface,
              border: `1px solid ${THEME.border}`,
            }}
          >
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold flex items-center gap-2" style={{ color: THEME.text }}>
                  <div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: THEME.warning }} />
                  Status Ringkas
                </CardTitle>
                <span className="text-[10px] uppercase tracking-wider font-medium" style={{ color: THEME.muted }}>
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
                      style={{
                        backgroundColor: `${item.accentColor}15`,
                      }}
                    >
                      <Icon className="h-3.5 w-3.5" style={{ color: item.accentColor }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] mb-0.5 font-medium" style={{ color: THEME.textSecondary }}>{item.label}</p>
                      {hasData ? (
                        <div className="flex items-center gap-2">
                          {item.count !== undefined && item.count > 0 && (
                            <span className="text-sm font-bold" style={{ color: THEME.text }}>
                              {item.count} <span className="text-[10px] font-normal" style={{ color: THEME.muted }}>items</span>
                            </span>
                          )}
                          {item.amount !== null && item.amount > 0 && (
                            <span className="text-sm font-bold tabular-nums" style={{ color: item.accentColor }}>
                              {formatAmount(item.amount)}
                            </span>
                          )}
                        </div>
                      ) : (
                        <p className="text-[11px]" style={{ color: THEME.muted }}>{item.emptyLabel}</p>
                      )}
                    </div>
                  </div>
                );
              })}

              {data && data.debtsDueSoon.length > 0 && (
                <>
                  <Separator style={{ background: THEME.border }} />
                  <div className="space-y-1.5">
                    <p className="text-[10px] uppercase tracking-wide font-medium" style={{ color: THEME.muted }}>
                      {t('biz.bizDebtDue')}
                    </p>
                    {data.debtsDueSoon.slice(0, 3).map((debt) => (
                      <div
                        key={debt.id}
                        className="flex items-center justify-between py-1.5"
                        style={{ borderBottom: `1px solid ${THEME.border}` }}
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-[11px] truncate font-medium" style={{ color: THEME.textSecondary }}>{debt.counterpart}</p>
                          <div className="flex items-center gap-1 mt-0.5">
                            <Clock className="h-2.5 w-2.5" style={{ color: THEME.muted }} />
                            <p className="text-[10px]" style={{ color: THEME.muted }}>{formatDate(debt.dueDate)}</p>
                          </div>
                        </div>
                        <span
                          className="text-[11px] font-bold ml-2 shrink-0 tabular-nums px-1.5 py-0.5 rounded-md"
                          style={{
                            color: THEME.destructive,
                            backgroundColor: `${THEME.destructive}12`,
                          }}
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
      </div>

      {/* ── Section 3b: Piutang Mau Jatuh Tempo ── */}
      <Card
        style={{
          background: THEME.surface,
          border: `1px solid ${THEME.border}`,
        }}
      >
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center gap-2" style={{ color: THEME.text }}>
              <div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: THEME.warning }} />
              <AlertTriangle className="h-3.5 w-3.5" style={{ color: THEME.warning }} />
              Piutang Mau Jatuh Tempo
            </CardTitle>
            {(data?.debtsDueSoon?.length ?? 0) > 0 && (
              <span
                className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                style={{ color: THEME.warning, backgroundColor: `${THEME.warning}15` }}
              >
                {data.debtsDueSoon.length} item
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent className="pb-4">
          {debtsDueSoonWithBadge.length > 0 ? (
            <div className="space-y-1.5">
              {debtsDueSoonWithBadge.map((debt) => (
                <div
                  key={debt.id}
                  className="flex items-center gap-2.5 py-2 px-2.5 rounded-lg"
                  style={{ borderBottom: `1px solid ${THEME.border}` }}
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-[12px] truncate font-medium" style={{ color: THEME.text }}>{debt.counterpart}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Clock className="h-2.5 w-2.5" style={{ color: THEME.muted }} />
                      <p className="text-[10px]" style={{ color: THEME.muted }}>{_fmtDate(debt.dueDate)}</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[11px] font-bold tabular-nums" style={{ color: debt.badgeColor }}>{formatAmount(debt.remaining)}</p>
                    <span
                      className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full mt-0.5 inline-block"
                      style={{ color: debt.badgeColor, backgroundColor: `${debt.badgeColor}15` }}
                    >
                      {debt.badgeLabel}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-2 py-2 px-2.5 rounded-lg" style={{ backgroundColor: `${THEME.secondary}08` }}>
              <CheckCircle2 className="h-4 w-4" style={{ color: THEME.secondary }} />
              <p className="text-[12px] font-medium" style={{ color: THEME.secondary }}>Semua piutang aman</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Section 3c: Top Produk Terjual ── */}
      {data?.topProductsSold && data.topProductsSold.length > 0 && (
        <Card
          style={{
            background: THEME.surface,
            border: `1px solid ${THEME.border}`,
          }}
        >
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2" style={{ color: THEME.text }}>
                <div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: THEME.primary }} />
                <Package className="h-3.5 w-3.5" style={{ color: THEME.primary }} />
                Top Produk Terjual
              </CardTitle>
              <span className="text-[10px] uppercase tracking-wider font-medium" style={{ color: THEME.muted }}>
                Top 5
              </span>
            </div>
          </CardHeader>
          <CardContent className="pb-4">
            <div className="space-y-2.5">
              {data.topProductsSold.slice(0, 5).map((product, idx) => {
                const maxRevenue = Math.max(...data.topProductsSold.map(p => p.totalRevenue), 1);
                const barPct = (product.totalRevenue / maxRevenue) * 100;
                return (
                  <div key={product.name} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-[10px] font-bold tabular-nums w-4" style={{ color: THEME.muted }}>{idx + 1}</span>
                        <span className="text-[12px] truncate font-medium" style={{ color: THEME.textSecondary }}>{product.name}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[10px]" style={{ color: THEME.muted }}>{product.totalQty} pcs</span>
                        <span className="text-[11px] font-bold tabular-nums" style={{ color: THEME.primary }}>{formatAmount(product.totalRevenue)}</span>
                      </div>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: THEME.border }}>
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{
                          backgroundColor: THEME.primary,
                          width: `${Math.max(barPct, 2)}%`,
                          opacity: 1 - idx * 0.12,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Section 4: Mini Revenue Trend ── */}
      <Card
        style={{
          background: THEME.surface,
          border: `1px solid ${THEME.border}`,
        }}
      >
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center gap-2" style={{ color: THEME.text }}>
              <div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: THEME.secondary }} />
              Tren Pendapatan Harian
            </CardTitle>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                <div className="h-1.5 w-1.5 rounded-sm" style={{ backgroundColor: THEME.secondary }} />
                <span className="text-[9px]" style={{ color: THEME.muted }}>Pendapatan</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="h-1.5 w-1.5 rounded-sm" style={{ backgroundColor: THEME.destructive }} />
                <span className="text-[9px]" style={{ color: THEME.muted }}>Pengeluaran</span>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pb-4">
          <MiniRevenueTrend recentSales={data?.recentSales || []} recentCashEntries={data?.recentCashEntries || []} />
        </CardContent>
      </Card>

      {/* ── Section 5: Aktivitas Terbaru ── */}
      <Card
        style={{
          background: THEME.surface,
          border: `1px solid ${THEME.border}`,
        }}
      >
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center gap-2" style={{ color: THEME.text }}>
              <div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: THEME.primary }} />
              Aktivitas Terbaru
            </CardTitle>
            {combinedActivities.length > 0 && (
              <span
                className="text-[10px] font-medium px-2 py-0.5 rounded-full"
                style={{ color: THEME.muted, backgroundColor: `${THEME.border}` }}
              >
                {combinedActivities.length} aktivitas
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="max-h-[280px] overflow-y-auto pr-1 custom-scrollbar">
            {groupedActivities.length > 0 ? (
              <div className="space-y-3">
                {groupedActivities.map((group) => (
                  <div key={group.group}>
                    <div className="flex items-center gap-2 mb-1.5">
                      <div className="h-px flex-1" style={{ background: THEME.border }} />
                      <span className="text-[10px] font-semibold uppercase tracking-wider px-2" style={{ color: THEME.muted }}>
                        {group.group}
                      </span>
                      <div className="h-px flex-1" style={{ background: THEME.border }} />
                    </div>
                    <div className="space-y-0.5">
                      {group.items.map((item) => {
                        const isExpense = item.type === 'expense';
                        const actColor = isExpense ? THEME.destructive : item.type === 'sale' ? THEME.secondary : THEME.primary;
                        const ActIcon = isExpense ? ArrowDownRight : ArrowUpRight;
                        return (
                          <div
                            key={item.id}
                            className="flex items-center gap-2.5 py-2 rounded-lg px-2 -mx-1 transition-colors duration-150 cursor-default hover:bg-white/[0.03]"
                          >
                            <div
                              className="flex h-7 w-7 items-center justify-center rounded-md shrink-0"
                              style={{
                                backgroundColor: `${actColor}12`,
                              }}
                            >
                              <ActIcon className="h-3 w-3" style={{ color: actColor }} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-[12px] truncate font-medium" style={{ color: THEME.textSecondary }}>
                                {item.description}
                              </p>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="text-[10px]" style={{ color: THEME.muted }}>
                                  {item.type === 'sale' ? (item.customer || '-') : item.type === 'expense' ? 'Pengeluaran' : 'Pemasukan'}
                                </span>
                                <span
                                  className="text-[9px] font-medium px-1 py-px rounded-md"
                                  style={{
                                    color: `${THEME.primary}90`,
                                    backgroundColor: `${THEME.primary}12`,
                                  }}
                                >
                                  {getTimeBadge(item.date)}
                                </span>
                              </div>
                            </div>
                            <span className="text-sm font-bold ml-1 shrink-0 tabular-nums" style={{ color: actColor }}>
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
                accentColor={THEME.primary}
              />
            )}
          </div>
        </CardContent>
      </Card>

      {/* ── Section 6: Insight Tips (Rotating) ── */}
      <Card
        className="overflow-hidden relative"
        style={{
          background: THEME.surface,
          border: `1px solid ${THEME.border}`,
        }}
      >
        <CardContent className="p-3 sm:p-4 relative">
          <div className="flex items-center gap-3">
            {/* Tip icon + dots */}
            <div className="flex flex-col items-center gap-1.5 shrink-0">
              <div
                className="flex h-10 w-10 items-center justify-center rounded-xl"
                style={{
                  background: `${currentTip.color}15`,
                  border: `1px solid ${currentTip.color}20`,
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
                      backgroundColor: i === tipIndex ? currentTip.color : `${THEME.border}`,
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
                    <span className="text-sm font-semibold" style={{ color: THEME.text }}>{currentTip.title}</span>
                    <span
                      className="text-[9px] font-medium px-1.5 py-0.5 rounded-full"
                      style={{
                        color: currentTip.color,
                        backgroundColor: `${currentTip.color}12`,
                      }}
                    >
                      Tips Bisnis
                    </span>
                  </div>
                  <p className="text-[11px] leading-relaxed" style={{ color: THEME.textSecondary }}>{currentTip.desc}</p>
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Nav arrows */}
            <div className="flex flex-col gap-0.5 shrink-0">
              <button
                className="h-6 w-6 rounded-md flex items-center justify-center transition-colors duration-150"
                style={{
                  background: THEME.border,
                  color: THEME.muted,
                }}
                onClick={() => setTipIndex((prev) => (prev - 1 + bizTips.length) % bizTips.length)}
              >
                <ChevronLeft className="h-3 w-3" />
              </button>
              <button
                className="h-6 w-6 rounded-md flex items-center justify-center transition-colors duration-150"
                style={{
                  background: THEME.border,
                  color: THEME.muted,
                }}
                onClick={() => setTipIndex((prev) => (prev + 1) % bizTips.length)}
              >
                <ChevronRight className="h-3 w-3" />
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Section 7: Quick Insight ── */}
      <div
        className="rounded-xl p-3 flex items-start gap-2.5"
        style={{
          background: THEME.surface,
          border: `1px solid ${THEME.border}`,
        }}
      >
        <Lightbulb className="h-4 w-4 shrink-0 mt-0.5" style={{ color: THEME.secondary }} />
        <div className="flex-1 min-w-0">
          <p className="text-[10px] uppercase tracking-wider font-semibold mb-0.5" style={{ color: THEME.muted }}>
            Quick Insight
          </p>
          <p className="text-[11px] leading-relaxed" style={{ color: THEME.textSecondary }}>
            {quickInsight}
          </p>
        </div>
        <span
          className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full shrink-0 mt-0.5"
          style={{
            color: healthScore.color,
            backgroundColor: `${healthScore.color}15`,
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
          background: ${THEME.border};
          border-radius: 999px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: ${THEME.borderHover};
        }
      `}</style>
    </div>
  );
}
