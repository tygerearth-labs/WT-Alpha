'use client';

import { useEffect, useState, useMemo } from 'react';
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
  BarChart3,
  Sparkles,
  CalendarDays,
  Inbox,
  ArrowDownLeft,
  HandCoins,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

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
}

/* ── Animation Variants ── */
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] as const },
  },
};

const bannerVariants = {
  hidden: { opacity: 0, y: -12, scale: 0.97 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] as const },
  },
};

const statCardVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] as const },
  },
};

const barVariants = {
  hidden: { scaleX: 0 },
  visible: (custom: number) => ({
    scaleX: 1,
    transition: {
      duration: 0.7,
      ease: [0.25, 0.46, 0.45, 0.94] as const,
      delay: 0.15 + custom * 0.12,
    },
  }),
};

const sparkleVariants = {
  hidden: { opacity: 0, scale: 0 },
  visible: (i: number) => ({
    opacity: 1,
    scale: 1,
    transition: { delay: 0.6 + i * 0.15, duration: 0.3, ease: 'easeOut' as const },
  }),
};

/* ── Helpers ── */
function generateSparklineData(value: number): number[] {
  // Deterministic pseudo-random sparkline based on value
  const seed = Math.abs(value) || 42;
  const points: number[] = [];
  let acc = 30;
  for (let i = 0; i < 7; i++) {
    acc += ((seed * (i + 1) * 17) % 60) - 25;
    acc = Math.max(8, Math.min(100, acc));
    points.push(acc);
  }
  // Normalize so last point roughly reflects value direction
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

/* ── Mini Sparkline Component ── */
function MiniSparkline({ data, color, trend }: { data: number[]; color: string; trend: 'up' | 'down' | 'flat' }) {
  return (
    <div className="flex items-end gap-[3px] h-[28px]">
      {data.map((h, i) => (
        <motion.div
          key={i}
          className="w-[5px] rounded-sm origin-bottom"
          style={{
            backgroundColor: color,
            opacity: 0.25 + (i / data.length) * 0.75,
          }}
          initial={{ scaleY: 0 }}
          animate={{ scaleY: 1 }}
          transition={{
            duration: 0.35,
            delay: 0.3 + i * 0.04,
            ease: [0.25, 0.46, 0.45, 0.94],
          }}
        >
          <div
            className="w-full rounded-sm"
            style={{ height: `${Math.max(h * 0.28, 3)}px` }}
          />
        </motion.div>
      ))}
      <motion.span
        className="ml-1 text-[9px] font-semibold leading-none self-center"
        style={{ color }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
      >
        {trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→'}
      </motion.span>
    </div>
  );
}

/* ── Empty State Component ── */
function EmptyState({
  icon: Icon,
  title,
  description,
  gradientFrom,
  gradientTo,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  gradientFrom: string;
  gradientTo: string;
}) {
  return (
    <motion.div
      className="flex flex-col items-center justify-center py-12 px-6"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div
        className="relative flex h-16 w-16 items-center justify-center rounded-2xl mb-4"
        style={{
          background: `linear-gradient(135deg, ${gradientFrom}20, ${gradientTo}15)`,
          boxShadow: `0 0 30px ${gradientFrom}08`,
        }}
      >
        <div
          className="absolute inset-0 rounded-2xl opacity-40"
          style={{
            background: `linear-gradient(135deg, ${gradientFrom}10, transparent)`,
          }}
        />
        <Icon className="h-7 w-7 relative" style={{ color: gradientFrom, opacity: 0.6 }} />
        <motion.div
          className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full"
          style={{ background: gradientTo, boxShadow: `0 0 8px ${gradientTo}60` }}
          animate={{ scale: [1, 1.3, 1], opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>
      <p className="text-sm font-medium text-white/40 mb-1">{title}</p>
      <p className="text-xs text-white/25 text-center max-w-[200px]">{description}</p>
    </motion.div>
  );
}

/* ── Main Component ── */
export default function BusinessDashboard() {
  const { t } = useTranslation();
  const { activeBusiness } = useBusinessStore();
  const { formatAmount } = useCurrencyFormat();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchKey, setFetchKey] = useState(0);

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

  // Group recent sales by date (must be before early returns for React hooks rule)
  const groupedActivities = useMemo(() => {
    if (!data || data.recentSales.length === 0) return [];
    const groups: Record<string, typeof data.recentSales> = {};
    data.recentSales.forEach((sale) => {
      const group = getDateGroup(sale.date);
      if (!groups[group]) groups[group] = [];
      groups[group].push(sale);
    });
    return Object.entries(groups).map(([group, items]) => ({ group, items }));
  }, [data]);

  if (!businessId) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-white/50 text-center">{t('biz.registerFirst')}</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-[88px] rounded-2xl bg-[#1A1A2E]" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-[118px] rounded-xl bg-[#1A1A2E]" />
          ))}
        </div>
        <Skeleton className="h-[52px] rounded-xl bg-[#1A1A2E]" />
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          <Skeleton className="h-[300px] rounded-xl bg-[#1A1A2E] lg:col-span-3" />
          <Skeleton className="h-[300px] rounded-xl bg-[#1A1A2E] lg:col-span-2" />
        </div>
        <Skeleton className="h-[260px] rounded-xl bg-[#1A1A2E]" />
      </div>
    );
  }

  // Derived values
  const totalCash = (data?.totalKasBesar ?? 0) + (data?.totalKasKecil ?? 0);
  const netCashValue = data?.netCash ?? totalCash;

  // Quick stats definition
  const quickStats = data
    ? [
        {
          label: t('biz.bizRevenue'),
          value: data.totalRevenue,
          icon: TrendingUp,
          accentColor: '#03DAC6',
          subText: data.totalRevenue > 0 ? t('biz.totalPenjualan') : t('biz.noBizData'),
          trend: 'up' as const,
        },
        {
          label: t('biz.bizExpense'),
          value: data.totalExpense,
          icon: TrendingDown,
          accentColor: '#CF6679',
          subText: data.totalExpense > 0
            ? `${t('biz.kasKeluar')}: ${formatAmount(data.totalKasKeluar)}`
            : t('biz.noBizData'),
          trend: 'down' as const,
        },
        {
          label: t('biz.bizProfit'),
          value: data.profit,
          icon: DollarSign,
          accentColor: data.profit >= 0 ? '#03DAC6' : '#CF6679',
          subText: (data.profitMargin ?? 0) > 0
            ? `${t('biz.bizNetIncome')}: ${(data.profitMargin ?? 0).toFixed(1)}%`
            : t('biz.noBizData'),
          badge: (data.profitMargin ?? 0) > 0 ? `+${(data.profitMargin ?? 0).toFixed(1)}%` : null,
          trend: (data.profit ?? 0) > 0 ? ('up' as const) : (data.profit ?? 0) < 0 ? ('down' as const) : ('flat' as const),
        },
        {
          label: 'Cash Flow',
          value: netCashValue,
          icon: Wallet,
          accentColor: netCashValue >= 0 ? '#03DAC6' : '#CF6679',
          subText: `${t('biz.kasBesar')}: ${formatAmount(data.totalKasBesar)} · ${t('biz.kasKecil')}: ${formatAmount(data.totalKasKecil)}`,
          trend: netCashValue >= 0 ? ('up' as const) : ('down' as const),
        },
      ]
    : [];

  // Chart data: bar comparison of revenue vs expense
  const comparisonData = data
    ? [
        { name: t('biz.bizRevenue'), value: data.totalRevenue, fill: '#03DAC6', gradientFrom: '#03DAC6', gradientTo: '#00B894' },
        { name: t('biz.bizExpense'), value: data.totalExpense, fill: '#CF6679', gradientFrom: '#CF6679', gradientTo: '#E84393' },
        { name: t('biz.bizProfit'), value: Math.max(0, data.profit), fill: '#4CAF50', gradientFrom: '#4CAF50', gradientTo: '#03DAC6' },
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
          accentColor: '#FFD700',
          bgColor: 'rgba(255, 215, 0, 0.06)',
          emptyLabel: t('biz.noBizData'),
        },
        {
          label: t('biz.bizDebtDue'),
          count: data.totalHutang > 0 ? undefined : 0,
          amount: data.totalHutang,
          icon: AlertTriangle,
          accentColor: '#CF6679',
          bgColor: 'rgba(207, 102, 121, 0.06)',
          emptyLabel: t('biz.noBizData'),
        },
        {
          label: t('biz.bizReceivableDue'),
          count: data.totalPiutang > 0 ? undefined : 0,
          amount: data.totalPiutang,
          icon: ArrowUpRight,
          accentColor: '#03DAC6',
          bgColor: 'rgba(3, 218, 198, 0.06)',
          emptyLabel: t('biz.noBizData'),
        },
      ]
    : [];

  // Quick actions
  const quickActions = [
    { label: t('biz.addSale'), icon: Plus, color: '#03DAC6', gradient: 'linear-gradient(135deg, rgba(3,218,198,0.12), rgba(3,218,198,0.04))' },
    { label: t('biz.addInvoice'), icon: FileText, color: '#BB86FC', gradient: 'linear-gradient(135deg, rgba(187,134,252,0.12), rgba(187,134,252,0.04))' },
    { label: t('biz.kasKeluar'), icon: Receipt, color: '#CF6679', gradient: 'linear-gradient(135deg, rgba(207,102,121,0.12), rgba(207,102,121,0.04))' },
  ];

  // Format date helper
  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const hasAnyData = data && (
    data.totalRevenue > 0 || data.totalExpense > 0 || data.recentSales.length > 0
  );

  return (
    <motion.div
      className="space-y-5"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* ── Welcome Banner ── */}
      <motion.div variants={bannerVariants}>
        <div className="relative overflow-hidden rounded-2xl border border-white/[0.06]">
          {/* Gradient background */}
          <div
            className="absolute inset-0"
            style={{
              background: 'linear-gradient(135deg, #1A1A2E 0%, #16213E 40%, #1A1A2E 100%)',
            }}
          />
          {/* Decorative orbs */}
          <motion.div
            className="absolute -top-12 -right-12 h-40 w-40 rounded-full opacity-[0.07]"
            style={{ background: 'radial-gradient(circle, #03DAC6, transparent)' }}
            animate={{ scale: [1, 1.15, 1], opacity: [0.07, 0.1, 0.07] }}
            transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.div
            className="absolute -bottom-8 -left-8 h-28 w-28 rounded-full opacity-[0.05]"
            style={{ background: 'radial-gradient(circle, #BB86FC, transparent)' }}
            animate={{ scale: [1, 1.1, 1], opacity: [0.05, 0.08, 0.05] }}
            transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
          />
          {/* Subtle grid pattern */}
          <div
            className="absolute inset-0 opacity-[0.02]"
            style={{
              backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',
              backgroundSize: '24px 24px',
            }}
          />
          <CardContent className="relative p-5 md:p-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div className="flex items-center gap-3.5">
                <motion.div
                  className="flex h-11 w-11 items-center justify-center rounded-xl shrink-0"
                  style={{
                    background: 'linear-gradient(135deg, #03DAC620, #BB86FC15)',
                    boxShadow: '0 0 20px #03DAC610',
                  }}
                  animate={{ rotate: [0, 2, -2, 0] }}
                  transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                >
                  <Sparkles className="h-5 w-5 text-[#03DAC6]" />
                </motion.div>
                <div>
                  <h2 className="text-lg md:text-xl font-bold text-white">
                    {greeting.greet}, <span style={{ color: '#03DAC6' }}>{activeBusiness?.name || 'Pengguna'}</span> 👋
                  </h2>
                  <div className="flex items-center gap-2 mt-0.5">
                    <CalendarDays className="h-3.5 w-3.5 text-white/30" />
                    <p className="text-xs text-white/40">{greeting.dateStr}</p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {/* Decorative sparkle dots */}
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    className="h-1.5 w-1.5 rounded-full"
                    style={{
                      backgroundColor: ['#03DAC6', '#BB86FC', '#FFD700'][i],
                    }}
                    custom={i}
                    variants={sparkleVariants}
                    initial="hidden"
                    animate="visible"
                  />
                ))}
                <span className="text-xs text-white/25 ml-1">Dashboard</span>
              </div>
            </div>
          </CardContent>
        </div>
      </motion.div>

      {/* ── Section 1: Quick Stats Row with Sparklines ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {quickStats.map((stat, idx) => {
          const Icon = stat.icon;
          const sparkData = generateSparklineData(stat.value);
          return (
            <motion.div key={stat.label} variants={statCardVariants} custom={idx}>
              <Card
                className="bg-[#1A1A2E] border-white/[0.06] hover:border-white/[0.12] transition-all duration-300 group cursor-default"
                style={{
                  boxShadow: '0 2px 12px rgba(0,0,0,0.2), 0 0 0 0 transparent',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.boxShadow = `0 4px 20px rgba(0,0,0,0.3), 0 0 24px ${stat.accentColor}08`;
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 12px rgba(0,0,0,0.2)';
                }}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2.5">
                    <div
                      className="flex h-9 w-9 items-center justify-center rounded-lg shrink-0 transition-transform duration-200 group-hover:scale-110"
                      style={{
                        backgroundColor: `${stat.accentColor}12`,
                        boxShadow: `inset 0 0 0 1px ${stat.accentColor}10`,
                      }}
                    >
                      <Icon className="h-4.5 w-4.5" style={{ color: stat.accentColor }} />
                    </div>
                    {stat.badge && (
                      <motion.span
                        className="text-xs font-semibold px-1.5 py-0.5 rounded-md"
                        style={{
                          color: stat.accentColor,
                          backgroundColor: `${stat.accentColor}15`,
                        }}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.5 }}
                      >
                        {stat.badge}
                      </motion.span>
                    )}
                  </div>
                  <p className="text-[11px] text-white/40 uppercase tracking-wide font-medium mb-1">
                    {stat.label}
                  </p>
                  <p className="text-xl font-bold leading-tight text-white">
                    {formatAmount(stat.value)}
                  </p>
                  <div className="flex items-end justify-between mt-2.5 gap-2">
                    <p className="text-[11px] text-white/30 leading-snug truncate flex-1 min-w-0">
                      {stat.subText}
                    </p>
                    {/* Mini sparkline trend */}
                    <div className="shrink-0" title="Tren Bulanan">
                      <MiniSparkline data={sparkData} color={stat.accentColor} trend={stat.trend} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* ── Section 2: Enhanced Quick Actions ── */}
      <motion.div variants={itemVariants}>
        <Card className="bg-[#1A1A2E] border-white/[0.06] overflow-hidden">
          <CardContent className="px-5 py-3.5">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2 shrink-0">
                <BarChart3 className="h-3.5 w-3.5 text-white/30" />
                <span className="text-xs text-white/40 font-medium uppercase tracking-wide">
                  Quick Actions
                </span>
              </div>
              <Separator orientation="vertical" className="h-5 bg-white/[0.06]" />
              <div className="flex items-center gap-2 flex-wrap">
                {quickActions.map((action) => {
                  const Icon = action.icon;
                  return (
                    <motion.div
                      key={action.label}
                      whileHover={{ scale: 1.04, y: -1 }}
                      whileTap={{ scale: 0.97 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                    >
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-9 px-3.5 gap-2 text-xs text-white/60 hover:text-white rounded-xl border border-white/[0.06] hover:border-white/[0.12] transition-all duration-200 relative overflow-hidden"
                        style={{ background: 'transparent' }}
                        onMouseEnter={(e) => {
                          (e.currentTarget as HTMLElement).style.background = action.gradient;
                          (e.currentTarget as HTMLElement).style.borderColor = `${action.color}25`;
                        }}
                        onMouseLeave={(e) => {
                          (e.currentTarget as HTMLElement).style.background = 'transparent';
                          (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.06)';
                        }}
                      >
                        <div
                          className="flex h-6 w-6 items-center justify-center rounded-md shrink-0"
                          style={{
                            backgroundColor: `${action.color}15`,
                          }}
                        >
                          <Icon className="h-3.5 w-3.5" style={{ color: action.color }} />
                        </div>
                        <span className="font-medium">{action.label}</span>
                      </Button>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* ── Section 3: Chart + Status ── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Left: Pendapatan vs Pengeluaran */}
        <motion.div variants={itemVariants} className="lg:col-span-3">
          <Card className="bg-[#1A1A2E] border-white/[0.06] h-full" style={{ boxShadow: '0 2px 16px rgba(0,0,0,0.15)' }}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-white text-sm font-semibold flex items-center gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-[#03DAC6]" />
                  {t('biz.bizRevenue')} vs {t('biz.bizExpense')}
                </CardTitle>
                <span className="text-[10px] text-white/25 uppercase tracking-wider font-medium">
                  Overview
                </span>
              </div>
            </CardHeader>
            <CardContent className="pb-5">
              {comparisonData.some(d => d.value > 0) ? (
                <div className="space-y-4">
                  {comparisonData.map((item, idx) => {
                    const pct = totalComparison > 0 ? ((item.value / totalComparison) * 100) : 0;
                    return (
                      <div key={item.name} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div
                              className="h-2.5 w-2.5 rounded-sm"
                              style={{ backgroundColor: item.fill }}
                            />
                            <span className="text-xs text-white/50 font-medium">{item.name}</span>
                          </div>
                          <div className="flex items-center gap-2.5">
                            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-md text-white/40 bg-white/[0.04]">
                              {pct.toFixed(1)}%
                            </span>
                            <span className="text-sm font-bold text-white tabular-nums">
                              {formatAmount(item.value)}
                            </span>
                          </div>
                        </div>
                        <div className="h-8 bg-white/[0.03] rounded-xl overflow-hidden relative">
                          <motion.div
                            className="h-full rounded-xl relative overflow-hidden"
                            style={{ transformOrigin: 'left' }}
                            custom={idx}
                            variants={barVariants}
                            initial="hidden"
                            animate="visible"
                          >
                            <div
                              className="absolute inset-0"
                              style={{
                                width: `${Math.max((item.value / maxChartValue) * 100, 2)}%`,
                                background: `linear-gradient(90deg, ${item.gradientFrom}, ${item.gradientTo}dd)`,
                                borderRadius: '12px',
                              }}
                            >
                              <div
                                className="absolute inset-0"
                                style={{
                                  background: `linear-gradient(180deg, rgba(255,255,255,0.12) 0%, transparent 60%)`,
                                  borderRadius: '12px',
                                }}
                              />
                            </div>
                          </motion.div>
                        </div>
                      </div>
                    );
                  })}

                  {/* Profit / Loss indicator */}
                  {data && (
                    <>
                      <Separator className="my-1 bg-white/[0.06]" />
                      <motion.div
                        className="flex items-center justify-between pt-1"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.6 }}
                      >
                        <span className="text-xs text-white/40 font-medium">{t('biz.bizProfitLoss')}</span>
                        <div className="flex items-center gap-2.5">
                          <span
                            className="text-base font-bold tabular-nums"
                            style={{ color: data.profit >= 0 ? '#03DAC6' : '#CF6679' }}
                          >
                            {data.profit >= 0 ? '+' : ''}{formatAmount(data.profit)}
                          </span>
                          <span
                            className="text-xs font-semibold px-2 py-0.5 rounded-lg"
                            style={{
                              color: data.profitMargin >= 0 ? '#03DAC6' : '#CF6679',
                              backgroundColor: data.profitMargin >= 0 ? 'rgba(3,218,198,0.1)' : 'rgba(207,102,121,0.1)',
                              boxShadow: data.profitMargin >= 0
                                ? '0 0 8px rgba(3,218,198,0.08)'
                                : '0 0 8px rgba(207,102,121,0.08)',
                            }}
                          >
                            {(data.profitMargin ?? 0).toFixed(1)}%
                          </span>
                        </div>
                      </motion.div>
                    </>
                  )}
                </div>
              ) : (
                <EmptyState
                  icon={BarChart3}
                  title={t('biz.noBizData')}
                  description="Mulai catat penjualan untuk melihat grafik"
                  gradientFrom="#03DAC6"
                  gradientTo="#00B894"
                />
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Right: Status Ringkas */}
        <motion.div variants={itemVariants} className="lg:col-span-2">
          <Card className="bg-[#1A1A2E] border-white/[0.06] h-full" style={{ boxShadow: '0 2px 16px rgba(0,0,0,0.15)' }}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-white text-sm font-semibold flex items-center gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-[#BB86FC]" />
                  Status Ringkas
                </CardTitle>
                <span className="text-[10px] text-white/25 uppercase tracking-wider font-medium">
                  Snapshot
                </span>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 pb-5">
              <AnimatePresence>
                {statusItems.map((item) => {
                  const Icon = item.icon;
                  const hasData = (item.count !== undefined && item.count > 0) || (item.amount !== null && item.amount > 0);
                  return (
                    <motion.div
                      key={item.label}
                      className="flex items-center gap-3 p-3 rounded-xl transition-all duration-200 border border-transparent hover:border-white/[0.06]"
                      style={{ backgroundColor: item.bgColor }}
                      whileHover={{ x: 2 }}
                      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                    >
                      <div
                        className="flex h-9 w-9 items-center justify-center rounded-lg shrink-0 transition-transform duration-200"
                        style={{
                          backgroundColor: `${item.accentColor}12`,
                          boxShadow: `0 0 12px ${item.accentColor}08`,
                        }}
                      >
                        <Icon className="h-4 w-4" style={{ color: item.accentColor }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-white/45 mb-0.5 font-medium">{item.label}</p>
                        {hasData ? (
                          <div className="flex items-center gap-2">
                            {item.count !== undefined && item.count > 0 && (
                              <span className="text-sm font-bold text-white">
                                {item.count} <span className="text-[11px] font-normal text-white/35">items</span>
                              </span>
                            )}
                            {item.amount !== null && item.amount > 0 && (
                              <span className="text-sm font-bold tabular-nums" style={{ color: item.accentColor }}>
                                {formatAmount(item.amount)}
                              </span>
                            )}
                          </div>
                        ) : (
                          <p className="text-xs text-white/20">{item.emptyLabel}</p>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>

              {/* Debts due soon detail */}
              {data && data.debtsDueSoon.length > 0 && (
                <>
                  <Separator className="bg-white/[0.06]" />
                  <div className="space-y-2">
                    <p className="text-xs text-white/35 uppercase tracking-wide font-medium">
                      {t('biz.bizDebtDue')}
                    </p>
                    {data.debtsDueSoon.slice(0, 3).map((debt, idx) => (
                      <motion.div
                        key={debt.id}
                        className="flex items-center justify-between py-2 border-b border-white/[0.04] last:border-0"
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.4 + idx * 0.08 }}
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-xs text-white/75 truncate font-medium">{debt.counterpart}</p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <Clock className="h-2.5 w-2.5 text-white/25" />
                            <p className="text-[10px] text-white/30">{formatDate(debt.dueDate)}</p>
                          </div>
                        </div>
                        <span
                          className="text-xs font-bold text-[#CF6679] ml-2 shrink-0 tabular-nums px-2 py-0.5 rounded-md bg-[#CF6679]/[0.08]"
                        >
                          {formatAmount(debt.remaining)}
                        </span>
                      </motion.div>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* ── Section 4: Enhanced Aktivitas Terbaru ── */}
      <motion.div variants={itemVariants}>
        <Card className="bg-[#1A1A2E] border-white/[0.06]" style={{ boxShadow: '0 2px 16px rgba(0,0,0,0.15)' }}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-white text-sm font-semibold flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-[#FFD700]" />
                Aktivitas Terbaru
              </CardTitle>
              {data && data.recentSales.length > 0 && (
                <span className="text-[10px] text-white/25 font-medium px-2 py-0.5 rounded-full bg-white/[0.04]">
                  {data.recentSales.length} transaksi
                </span>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="max-h-[320px] overflow-y-auto pr-1 custom-scrollbar">
              {data && groupedActivities.length > 0 ? (
                <div className="space-y-4">
                  {groupedActivities.map((group, groupIdx) => (
                    <motion.div
                      key={group.group}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.2 + groupIdx * 0.1 }}
                    >
                      {/* Date group header */}
                      <div className="flex items-center gap-2 mb-2">
                        <div className="h-px flex-1 bg-white/[0.04]" />
                        <span className="text-[10px] font-semibold text-white/30 uppercase tracking-wider px-2">
                          {group.group}
                        </span>
                        <div className="h-px flex-1 bg-white/[0.04]" />
                      </div>

                      {/* Activity items */}
                      <div className="space-y-0.5">
                        {group.items.map((sale, saleIdx) => (
                          <motion.div
                            key={sale.id}
                            className="flex items-center gap-3 py-2.5 group hover:bg-white/[0.02] rounded-xl px-3 -mx-1 transition-all duration-200 cursor-default"
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{
                              delay: 0.25 + groupIdx * 0.1 + saleIdx * 0.04,
                              duration: 0.3,
                            }}
                            whileHover={{ x: 3 }}
                          >
                            <div
                              className="flex h-8 w-8 items-center justify-center rounded-lg shrink-0 transition-transform duration-200 group-hover:scale-105"
                              style={{
                                background: 'linear-gradient(135deg, rgba(3,218,198,0.1), rgba(3,218,198,0.04))',
                                boxShadow: '0 0 10px rgba(3,218,198,0.06)',
                              }}
                            >
                              <ArrowUpRight className="h-3.5 w-3.5 text-[#03DAC6]" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-white/80 truncate group-hover:text-white transition-colors font-medium">
                                {sale.description}
                              </p>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="text-[11px] text-white/30">
                                  {sale.customer?.name || '-'}
                                </span>
                                {/* Time badge */}
                                <span className="text-[10px] font-medium text-[#BB86FC]/60 bg-[#BB86FC]/[0.08] px-1.5 py-px rounded-md">
                                  {getTimeBadge(sale.date)}
                                </span>
                              </div>
                            </div>
                            <span className="text-sm font-bold text-[#03DAC6] ml-2 shrink-0 tabular-nums">
                              +{formatAmount(sale.amount)}
                            </span>
                          </motion.div>
                        ))}
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <EmptyState
                  icon={Inbox}
                  title={t('biz.noBizData')}
                  description="Belum ada aktivitas. Mulai catat penjualan pertama Anda."
                  gradientFrom="#BB86FC"
                  gradientTo="#03DAC6"
                />
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* ── Footer Section: Financial Tips ── */}
      <motion.div variants={itemVariants}>
        <Card className="bg-[#1A1A2E] border-white/[0.06] overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div
                className="flex h-9 w-9 items-center justify-center rounded-lg shrink-0"
                style={{
                  background: 'linear-gradient(135deg, rgba(255,215,0,0.12), rgba(255,215,0,0.04))',
                }}
              >
                <HandCoins className="h-4 w-4 text-[#FFD700]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-white/50 font-medium">Tips Keuangan</p>
                <p className="text-[11px] text-white/30 mt-0.5 leading-relaxed">
                  {hasAnyData
                    ? 'Pantau arus kas secara rutin untuk menjaga kesehatan keuangan bisnis Anda.'
                    : 'Mulai catat transaksi pertama Anda untuk mendapatkan insight keuangan.'
                  }
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.06);
          border-radius: 999px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.12);
        }
      `}</style>
    </motion.div>
  );
}
