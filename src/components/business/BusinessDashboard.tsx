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
import { Badge } from '@/components/ui/badge';
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
  Info,
  X,
  CheckCircle2,
  Package,
  Landmark,
  CircleDollarSign,
  Download,
  Users,
  ShieldCheck,
  UserCheck,
  Banknote,
  Flame,
  Timer,
  Zap,
  ShoppingBag,
  ArrowDownToLine,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

/* ── Color System (matches BusinessCash.tsx) ── */
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
const alpha = (color: string, pct: number) => `color-mix(in srgb, ${color} ${pct}%, transparent)`;

/* ── Period Options ── */
const PERIOD_OPTIONS = [
  { value: 'day', label: 'Hari' },
  { value: 'week', label: 'Minggu' },
  { value: 'month', label: 'Bulan' },
  { value: 'year', label: 'Tahun' },
] as const;
type PeriodOption = (typeof PERIOD_OPTIONS)[number]['value'];

/* ── Interfaces ── */
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

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatCompactAmount(value: number): string {
  if (value >= 1_000_000_000) {
    return `${(value / 1_000_000_000).toFixed(1)}M`;
  }
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}Jt`;
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(0)}Rb`;
  }
  return value.toString();
}

/* ── Animated Counter Hook ── */
function useAnimatedCounter(target: number, duration: number = 800) {
  const [count, setCount] = useState(0);
  const prevTarget = useRef(0);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const start = prevTarget.current;
    const diff = target - start;
    const startTime = performance.now();

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(start + diff * eased);
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      }
    };

    rafRef.current = requestAnimationFrame(animate);
    prevTarget.current = target;

    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration]);

  return count;
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
  if (score >= 80) { grade = 'A'; color = c.secondary; }
  else if (score >= 60) { grade = 'B'; color = '#4FC3F7'; }
  else if (score >= 40) { grade = 'C'; color = c.warning; }
  else { grade = 'D'; color = c.destructive; }

  return { score, grade, color };
}

/* ── Mini Cash Sparkline (CSS transitions) ── */
function MiniCashSparkline({ color, value }: { color: string; value: number }) {
  const seed = Math.abs(value) || 42;
  const points: number[] = [];
  let acc = 30;
  for (let i = 0; i < 7; i++) {
    acc += ((seed * (i + 1) * 17) % 60) - 25;
    acc = Math.max(8, Math.min(100, acc));
    points.push(acc);
  }
  const maxVal = Math.max(...points, 1);
  const data = points.map((p) => (p / maxVal) * 100);

  return (
    <div className="flex items-end gap-[2px] h-[16px]">
      {data.map((h, i) => (
        <div
          key={i}
          className="w-[3px] rounded-sm origin-bottom transition-all duration-500"
          style={{
            backgroundColor: color,
            opacity: 0.2 + (i / data.length) * 0.5,
            height: `${Math.max(h * 0.16, 2)}px`,
            transitionDelay: `${0.1 + i * 0.03}s`,
          }}
        />
      ))}
    </div>
  );
}

/* ── Gradient Helper ── */
function getGradientCSS(colorFrom: string, colorTo: string, angle: number = 135): string {
  return `linear-gradient(${angle}deg, ${alpha(colorFrom, 12)}, ${alpha(colorTo, 4)})`;
}

/* ── Gradient Progress Bar ── */
function GradientProgressBar({
  value,
  max,
  colorFrom,
  colorTo,
  height = 6,
}: {
  value: number;
  max: number;
  colorFrom: string;
  colorTo: string;
  height?: number;
}) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div
      className="w-full rounded-full overflow-hidden"
      style={{ height: `${height}px`, backgroundColor: alpha(colorFrom, 8) }}
    >
      <div
        className="h-full rounded-full transition-all duration-700 ease-out"
        style={{
          width: `${Math.max(pct, 2)}%`,
          background: `linear-gradient(90deg, ${colorFrom}, ${colorTo})`,
          opacity: 0.85,
        }}
      />
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
    <div className="flex flex-col items-center justify-center py-10 px-4">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="relative mb-4"
      >
        <div
          className="flex h-14 w-14 items-center justify-center rounded-2xl"
          style={{ background: `linear-gradient(135deg, ${alpha(accentColor, 10)}, ${alpha(accentColor, 4)})`, border: `1px solid ${alpha(accentColor, 12)}` }}
        >
          <Icon className="h-6 w-6" style={{ color: accentColor, opacity: 0.7 }} />
        </div>
        {/* Decorative pulse ring */}
        <div
          className="absolute inset-0 rounded-2xl"
          style={{ border: `1px solid ${alpha(accentColor, 6)}`, transform: 'scale(1.2)' }}
        />
      </motion.div>
      <p className="text-sm font-semibold mb-1 text-foreground">{title}</p>
      <p className="text-[11px] text-center max-w-[220px] leading-relaxed text-muted-foreground">{description}</p>
    </div>
  );
}

/* ── Insight Tips ── */
const bizTips = [
  { title: 'Kelola Piutang', desc: 'Follow up piutang yang sudah lewat tempo untuk menjaga arus kas.', color: c.destructive, icon: TrendingDown },
  { title: 'Target Penjualan', desc: 'Tetapkan target harian untuk mencapai target bulanan.', color: c.secondary, icon: Target },
  { title: 'Efisiensi Pengeluaran', desc: 'Review kas keluar mingguan untuk mengidentifikasi penghematan.', color: c.warning, icon: PieChart },
  { title: 'Diversifikasi Produk', desc: 'Tambah variasi produk untuk meningkatkan peluang penjualan.', color: c.primary, icon: Sparkles },
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
  const [period, setPeriod] = useState<PeriodOption>('month');

  const businessId = activeBusiness?.id;

  // ── Animated Counters ──
  const animRevenue = useAnimatedCounter(data?.totalRevenue ?? 0);
  const animExpense = useAnimatedCounter(data?.totalExpense ?? 0);
  const animProfit = useAnimatedCounter(data?.profit ?? 0);
  const animNetCash = useAnimatedCounter(data?.netCash ?? 0);

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

  // Combined recent activity (sales + cash entries) — 7 items max
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
    return activities.slice(0, 7);
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
        badgeColor = c.destructive;
        badgeLabel = `Lewat ${Math.abs(diffDays)} hari`;
      } else if (diffDays <= 3) {
        badgeColor = c.warning;
        badgeLabel = diffDays === 0 ? 'Hari ini' : `${diffDays} hari lagi`;
      } else if (diffDays <= 7) {
        badgeColor = c.secondary;
        badgeLabel = `${diffDays} hari lagi`;
      } else {
        badgeColor = c.muted;
        badgeLabel = formatDate(debt.dueDate);
      }
      return { ...debt, badgeColor, badgeLabel };
    });
  }, [data]);

  // Health score
  const healthScore = useMemo(() => {
    if (!data) return { score: 0, grade: 'N/A', color: '#666666' };
    return calculateHealthScore(data);
  }, [data]);

  // Alerts: overdue piutang + low saldo
  const alerts = useMemo(() => {
    if (!data) return [];
    const items: Array<{ id: string; type: 'overdue' | 'low_saldo' | 'warning'; title: string; description: string; color: string; icon: React.ElementType }> = [];

    // Overdue piutang
    const overduePiutang = data.debtsDueSoon.filter(d => d.status === 'overdue');
    if (overduePiutang.length > 0) {
      items.push({
        id: 'overdue-piutang',
        type: 'overdue',
        title: `${overduePiutang.length} Piutang Menunggak`,
        description: overduePiutang.map(d => `${d.counterpart} (${formatAmount(d.remaining)})`).slice(0, 2).join(', '),
        color: c.destructive,
        icon: AlertTriangle,
      });
    }

    // Due soon piutang (within 3 days)
    const dueSoonNotOverdue = debtsDueSoonWithBadge.filter(d => d.badgeColor === c.warning);
    if (dueSoonNotOverdue.length > 0) {
      items.push({
        id: 'due-soon-piutang',
        type: 'warning',
        title: `${dueSoonNotOverdue.length} Piutang Jatuh Tempo`,
        description: `Akan jatuh tempo dalam 3 hari ke depan`,
        color: c.warning,
        icon: Clock,
      });
    }

    // Low saldo warning
    const netCash = data.netCash ?? 0;
    if (netCash < 0) {
      items.push({
        id: 'low-saldo',
        type: 'low_saldo',
        title: 'Kas Bersih Negatif',
        description: `Defisit ${formatAmount(Math.abs(netCash))} — perlu tambahan modal`,
        color: c.destructive,
        icon: TrendingDown,
      });
    }

    return items;
  }, [data, debtsDueSoonWithBadge]);

  // Top 5 customers by spending (from recentSales)
  const topCustomers = useMemo(() => {
    if (!data?.recentSales) return [];
    const customerMap = new Map<string, { name: string; total: number; count: number }>();
    data.recentSales.forEach((s) => {
      const name = s.customer?.name || 'Tanpa Pelanggan';
      const existing = customerMap.get(name);
      if (existing) {
        existing.total += s.amount;
        existing.count += 1;
      } else {
        customerMap.set(name, { name, total: s.amount, count: 1 });
      }
    });
    return Array.from(customerMap.values()).sort((a, b) => b.total - a.total).slice(0, 5);
  }, [data]);

  // Financial health indicators
  const financialHealth = useMemo(() => {
    if (!data) return null;
    const totalExpense = data.totalExpense ?? 0;
    const totalRevenue = data.totalRevenue ?? 0;
    const kasBesarSaldo = data.allocationBreakdown?.kasBesarSaldo ?? 0;
    const kasKecilSaldo = data.allocationBreakdown?.kasKecilSaldo ?? 0;
    const totalSaldo = kasBesarSaldo + kasKecilSaldo;
    const ps = data.piutangSummary;
    const burnRate = totalExpense;
    const runway = burnRate > 0 ? Math.floor(totalSaldo / burnRate) : (totalSaldo > 0 ? 99 : 0);
    const cashRatio = totalExpense > 0 ? totalSaldo / totalExpense : (totalSaldo > 0 ? 99 : 0);
    const totalPiutangAmount = (ps?.berjalan.amount ?? 0) + (ps?.menunggak.amount ?? 0) + (ps?.selesai.amount ?? 0);
    const collectionRate = totalPiutangAmount > 0
      ? Math.round(((ps?.selesai.amount ?? 0) / totalPiutangAmount) * 100) / 100
      : (totalRevenue > 0 ? 1 : 0);
    return { burnRate, runway, cashRatio, collectionRate };
  }, [data]);

  if (!businessId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.4 }}
          className="flex h-16 w-16 items-center justify-center rounded-2xl"
          style={{ background: `linear-gradient(135deg, ${alpha(c.primary, 12)}, ${alpha(c.primary, 4)})`, border: `1px solid ${alpha(c.primary, 12)}` }}
        >
          <Wallet className="h-7 w-7" style={{ color: c.primary }} />
        </motion.div>
        <p className="text-sm font-semibold text-foreground text-center">{t('biz.registerFirst')}</p>
        <p className="text-xs text-muted-foreground text-center max-w-[250px]">Daftarkan bisnis Anda untuk mulai memantau keuangan secara real-time.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-[220px] rounded-xl bg-card" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-[88px] rounded-xl bg-card" />
          ))}
        </div>
        <Skeleton className="h-[300px] rounded-xl bg-card" />
        <Skeleton className="h-[140px] rounded-xl bg-card" />
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

  const ps = data.piutangSummary;
  const piutangBerjalan = ps?.berjalan.amount ?? 0;
  const investorSaldo = data.allocationBreakdown?.investorSaldo ?? 0;

  // Quick actions with navigation
  const quickActions = [
    { label: 'Tambah Penjualan', desc: 'Catat penjualan baru', icon: ShoppingBag, color: c.secondary, navPage: 'biz-penjualan' },
    { label: 'Catat Pengeluaran', desc: 'Input kas keluar', icon: ArrowDownToLine, color: c.destructive, navPage: 'biz-kas' },
    { label: 'Buat Invoice', desc: 'Kirim tagihan', icon: FileText, color: c.primary, navPage: 'biz-invoice' },
    { label: 'Lihat Laporan', desc: 'Analisis bisnis', icon: BarChart3, color: c.warning, navPage: 'biz-laporan' },
  ];

  const handleNav = (page: string) => {
    window.dispatchEvent(new CustomEvent('biz-navigate', { detail: { page } }));
  };

  // Quick stats for row 2
  const quickStats = [
    {
      label: 'Total Penjualan',
      value: formatAmount(data.totalRevenue),
      subValue: `${data.salesCount || 0} transaksi`,
      icon: BarChart3,
      color: c.secondary,
    },
    {
      label: 'Piutang Berjalan',
      value: formatAmount(piutangBerjalan),
      subValue: `${ps?.berjalan.count ?? 0} cicilan aktif`,
      icon: HandCoins,
      color: c.warning,
    },
    {
      label: 'Pelanggan Aktif',
      value: formatAmount(data.totalRevenue > 0 ? data.salesCount : 0),
      subValue: data.salesCount > 0 ? `Avg ${formatAmount(data.averageSaleValue)}/trx` : 'Belum ada data',
      icon: UserCheck,
      color: c.primary,
    },
    {
      label: 'Margin Laba',
      value: `${(data.profitMargin ?? 0).toFixed(1)}%`,
      subValue: data.profit >= 0 ? `Profit ${formatAmount(data.profit)}` : `Rugi ${formatAmount(Math.abs(data.profit))}`,
      icon: Target,
      color: data.profitMargin >= 0 ? c.secondary : c.destructive,
    },
  ];

  const currentTip = bizTips[tipIndex];
  const TipIcon = currentTip.icon;

  const profitColor = data.profit >= 0 ? c.secondary : c.destructive;

  return (
    <div className="space-y-4">
      {/* ═══════════════════════════════════════════════════════════════
          SECTION 1: HERO OVERVIEW CARD (Financial Command Center)
          ═══════════════════════════════════════════════════════════════ */}
      <Card className="border-border overflow-hidden shadow-sm">
        {/* Hero gradient accent strip */}
        <div
          className="h-0.5 w-full"
          style={{
            background: `linear-gradient(90deg, ${c.secondary}, ${alpha('#4CAF50', 50)}, ${alpha(c.warning, 50)}, transparent)`,
          }}
        />
        <CardContent className="p-4 sm:p-5">
          {/* Header row: Title + Period selector */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div
                className="flex h-8 w-8 items-center justify-center rounded-lg shrink-0"
                style={{ backgroundColor: alpha(c.secondary, 10) }}
              >
                <Wallet className="h-4 w-4" style={{ color: c.secondary }} />
              </div>
              <div>
                <h2 className="text-[15px] font-bold text-foreground leading-tight">Ringkasan Keuangan</h2>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {greeting.dateStr}
                </p>
              </div>
            </div>
            {/* Period selector pills */}
            <div className="flex items-center gap-1 p-0.5 rounded-lg" style={{ backgroundColor: alpha(c.muted, 6) }}>
              {PERIOD_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setPeriod(opt.value)}
                  className="relative px-2.5 py-1 text-[10px] font-semibold rounded-md transition-all duration-300 ease-out"
                  style={{
                    color: period === opt.value ? c.foreground : c.muted,
                    backgroundColor: period === opt.value ? alpha(c.foreground, 10) : 'transparent',
                    transform: period === opt.value ? 'scale(1.02)' : 'scale(1)',
                  }}
                >
                  {opt.label}
                  {period === opt.value && (
                    <motion.div
                      layoutId="period-indicator"
                      className="absolute inset-0 rounded-md"
                      style={{ backgroundColor: alpha(c.foreground, 6), border: `1px solid ${alpha(c.foreground, 10)}` }}
                      transition={{ type: 'spring', bounce: 0.15, duration: 0.4 }}
                    />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Large Net Profit/Loss */}
          <div className="mb-5">
            <p className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground mb-1.5">
              Laba Bersih {PERIOD_OPTIONS.find(p => p.value === period)?.label}
            </p>
            <div className="flex items-end gap-3">
              <motion.span
                className="text-3xl sm:text-4xl font-extrabold tabular-nums leading-none"
                style={{ color: profitColor }}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
              >
                {data.profit >= 0 ? '+' : ''}{formatAmount(animProfit)}
              </motion.span>
              <div className="flex items-center gap-1.5 mb-1">
                {data.profit >= 0 ? (
                  <TrendingUp className="h-3.5 w-3.5" style={{ color: c.secondary }} />
                ) : (
                  <TrendingDown className="h-3.5 w-3.5" style={{ color: c.destructive }} />
                )}
                <span
                  className="text-[10px] font-bold px-1.5 py-0.5 rounded-full border-0"
                  style={{
                    color: profitColor,
                    backgroundColor: alpha(profitColor, 8),
                  }}
                >
                  {(data.profitMargin ?? 0) >= 0 ? '+' : ''}{(data.profitMargin ?? 0).toFixed(1)}%
                </span>
              </div>
            </div>
          </div>

          {/* Revenue vs Expense row with sparklines */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            {/* Pendapatan — warm emerald gradient */}
            <div
              className="p-3 rounded-xl transition-transform duration-200 hover:scale-[1.02]"
              style={{ background: `linear-gradient(135deg, ${alpha(c.secondary, 8)}, ${alpha('#4CAF50', 3)})`, border: `1px solid ${alpha(c.secondary, 8)}` }}
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5">
                  <div className="h-2 w-2 rounded-full shadow-sm" style={{ backgroundColor: c.secondary, boxShadow: `0 0 6px ${alpha(c.secondary, 40)}` }} />
                  <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Pendapatan</span>
                </div>
                <MiniCashSparkline color={c.secondary} value={data.totalRevenue} />
              </div>
              <p className="text-base sm:text-lg font-extrabold tabular-nums" style={{ color: c.secondary }}>
                {formatAmount(animRevenue)}
              </p>
            </div>

            {/* Pengeluaran — soft coral gradient */}
            <div
              className="p-3 rounded-xl transition-transform duration-200 hover:scale-[1.02]"
              style={{ background: `linear-gradient(135deg, ${alpha(c.destructive, 8)}, ${alpha('#FF8A80', 3)})`, border: `1px solid ${alpha(c.destructive, 8)}` }}
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5">
                  <div className="h-2 w-2 rounded-full shadow-sm" style={{ backgroundColor: c.destructive, boxShadow: `0 0 6px ${alpha(c.destructive, 40)}` }} />
                  <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Pengeluaran</span>
                </div>
                <MiniCashSparkline color={c.destructive} value={data.totalExpense} />
              </div>
              <p className="text-base sm:text-lg font-extrabold tabular-nums" style={{ color: c.destructive }}>
                {formatAmount(animExpense)}
              </p>
            </div>
          </div>

          {/* Source breakdown chips */}
          <div className="flex flex-wrap gap-2">
            {[
              { label: 'Kas Besar', value: data.allocationBreakdown?.kasBesarSaldo ?? 0, color: c.secondary },
              { label: 'Kas Kecil', value: data.allocationBreakdown?.kasKecilSaldo ?? 0, color: c.primary },
              { label: 'Investor', value: investorSaldo, color: '#BB86FC' },
              { label: 'Net Cash', value: netCashValue, color: netCashValue >= 0 ? c.secondary : c.destructive },
            ].map((chip) => (
              <div
                key={chip.label}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-transparent transition-colors duration-150"
                style={{ backgroundColor: alpha(chip.color, 6) }}
              >
                <div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: chip.color }} />
                <span className="text-[10px] font-medium text-muted-foreground">{chip.label}</span>
                <span className="text-[10px] font-bold tabular-nums" style={{ color: chip.color }}>
                  {formatCompactAmount(chip.value)}
                </span>
              </div>
            ))}

            {/* Health Score chip */}
            <div
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg ml-auto"
              style={{ backgroundColor: alpha(healthScore.color, 8) }}
            >
              <ShieldCheck className="h-3 w-3" style={{ color: healthScore.color }} />
              <span className="text-[10px] font-bold tabular-nums" style={{ color: healthScore.color }}>
                {healthScore.score}
              </span>
              <span className="text-[10px] font-black" style={{ color: healthScore.color }}>
                {healthScore.grade}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ═══════════════════════════════════════════════════════════════
          SECTION 2: QUICK STATS ROW (4 compact cards)
          ═══════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {quickStats.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              whileHover={{ y: -2, scale: 1.02 }}
              transition={{ duration: 0.3, delay: idx * 0.06 }}
            >
              <Card className="border-border cursor-default overflow-hidden transition-all duration-200 hover:shadow-lg hover:border-foreground/15">
                {/* Gradient header strip */}
                <div
                  className="h-1 w-full"
                  style={{
                    background: `linear-gradient(90deg, ${stat.color}, ${alpha(stat.color, 30)})`,
                  }}
                />
                <CardContent className="p-3 pt-2.5">
                  <div className="flex items-center gap-2 mb-2">
                    <div
                      className="flex h-7 w-7 items-center justify-center rounded-lg shrink-0 transition-transform duration-200"
                      style={{ background: getGradientCSS(stat.color, c.card) }}
                    >
                      <Icon className="h-3.5 w-3.5" style={{ color: stat.color }} />
                    </div>
                    <span className="text-[10px] uppercase tracking-wider font-medium text-muted-foreground truncate">
                      {stat.label}
                    </span>
                  </div>
                  <p className="text-sm font-bold tabular-nums leading-tight text-foreground truncate">
                    {stat.value}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{stat.subValue}</p>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          SECTION 2.5: QUICK ACTIONS GRID
          ═══════════════════════════════════════════════════════════════ */}
      <Card className="border-border">
        <CardHeader className="pb-2 pt-4 px-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-[13px] font-bold flex items-center gap-2 text-foreground">
              <div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: c.primary }} />
              <Zap className="h-3.5 w-3.5" style={{ color: c.primary }} />
              Aksi Cepat
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="pb-4 px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {quickActions.map((action, idx) => {
              const AIcon = action.icon;
              return (
                <motion.div
                  key={action.label}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: idx * 0.05 }}
                >
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-auto flex-col gap-1.5 rounded-xl border border-border p-3 text-muted-foreground w-full"
                    style={{ background: 'transparent' }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.background = alpha(action.color, 7);
                      (e.currentTarget as HTMLElement).style.borderColor = alpha(action.color, 15);
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.background = 'transparent';
                      (e.currentTarget as HTMLElement).style.borderColor = '';
                    }}
                    onClick={() => handleNav(action.navPage)}
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg shrink-0" style={{ backgroundColor: alpha(action.color, 10) }}>
                      <AIcon className="h-4 w-4" style={{ color: action.color }} />
                    </div>
                    <span className="text-[11px] font-semibold text-foreground">{action.label}</span>
                    <span className="text-[9px] text-muted-foreground leading-tight">{action.desc}</span>
                  </Button>
                </motion.div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* ═══════════════════════════════════════════════════════════════
          SECTION 2.6: FINANCIAL HEALTH SCORE CARD
          ═══════════════════════════════════════════════════════════════ */}
      {financialHealth && (
        <Card className="border-border">
          <CardHeader className="pb-2 pt-4 px-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-[13px] font-bold flex items-center gap-2 text-foreground">
                <div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: healthScore.color }} />
                <ShieldCheck className="h-3.5 w-3.5" style={{ color: healthScore.color }} />
                Kesehatan Finansial
              </CardTitle>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border-0" style={{ color: healthScore.color, backgroundColor: alpha(healthScore.color, 8) }}>
                Skor {healthScore.score}/100 • Grade {healthScore.grade}
              </span>
            </div>
          </CardHeader>
          <CardContent className="pb-4 px-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {[
                {
                  label: 'Burn Rate',
                  value: formatAmount(financialHealth.burnRate),
                  desc: 'Pengeluaran periode ini',
                  icon: Flame,
                  color: c.destructive,
                  status: financialHealth.burnRate > 0 ? 'Aktif' : 'Minimal',
                },
                {
                  label: 'Runway',
                  value: financialHealth.runway >= 99 ? '99+ bulan' : `${financialHealth.runway} bulan`,
                  desc: 'Sisa waktu operasional',
                  icon: Timer,
                  color: financialHealth.runway >= 6 ? c.secondary : financialHealth.runway >= 3 ? c.warning : c.destructive,
                  status: financialHealth.runway >= 6 ? 'Aman' : financialHealth.runway >= 3 ? 'Terbatas' : 'Kritis',
                },
                {
                  label: 'Cash Ratio',
                  value: financialHealth.cashRatio >= 99 ? '∞' : financialHealth.cashRatio.toFixed(2),
                  desc: 'Saldo Kas / Pengeluaran',
                  icon: DollarSign,
                  color: financialHealth.cashRatio >= 1 ? c.secondary : financialHealth.cashRatio >= 0.5 ? c.warning : c.destructive,
                  status: financialHealth.cashRatio >= 1 ? 'Sehat' : financialHealth.cashRatio >= 0.5 ? 'Waspada' : 'Kritis',
                },
                {
                  label: 'Collection Rate',
                  value: financialHealth.collectionRate >= 99 ? 'N/A' : `${(financialHealth.collectionRate * 100).toFixed(0)}%`,
                  desc: 'Piutang Lunas / Total',
                  icon: Target,
                  color: financialHealth.collectionRate >= 0.8 ? c.secondary : financialHealth.collectionRate >= 0.5 ? c.warning : c.destructive,
                  status: financialHealth.collectionRate >= 0.8 ? 'Baik' : financialHealth.collectionRate >= 0.5 ? 'Cukup' : 'Rendah',
                },
              ].map((metric, metricIdx) => {
                const MIcon = metric.icon;
                // Progress bar data
                let progressValue = 0;
                let progressMax = 1;
                let gradientFrom = metric.color;
                let gradientTo = metric.color;
                if (metric.label === 'Runway') {
                  progressValue = financialHealth.runway >= 99 ? 1 : financialHealth.runway;
                  progressMax = 12;
                  gradientFrom = metric.color;
                  gradientTo = c.secondary;
                } else if (metric.label === 'Cash Ratio') {
                  progressValue = financialHealth.cashRatio >= 99 ? 1 : financialHealth.cashRatio;
                  progressMax = 2;
                  gradientFrom = metric.color;
                  gradientTo = c.secondary;
                } else if (metric.label === 'Collection Rate') {
                  progressValue = financialHealth.collectionRate >= 99 ? 1 : financialHealth.collectionRate;
                  progressMax = 1;
                  gradientFrom = c.warning;
                  gradientTo = metric.color;
                }
                const showProgress = metric.label !== 'Burn Rate';

                return (
                  <div key={metric.label} className="p-2.5 rounded-xl transition-transform duration-200 hover:scale-[1.01]" style={{ backgroundColor: alpha(metric.color, 4) }}>
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <MIcon className="h-3 w-3" style={{ color: metric.color }} />
                      <span className="text-[9px] uppercase tracking-wider font-medium text-muted-foreground">{metric.label}</span>
                    </div>
                    <p className="text-sm font-bold tabular-nums text-foreground leading-tight">{metric.value}</p>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className="text-[9px] text-muted-foreground">{metric.desc}</span>
                    </div>
                    {/* Gradient progress bar */}
                    {showProgress && (
                      <div className="mt-2">
                        <GradientProgressBar
                          value={progressValue}
                          max={progressMax}
                          colorFrom={gradientFrom}
                          colorTo={gradientTo}
                          height={4}
                        />
                      </div>
                    )}
                    <span className="text-[9px] font-semibold px-1.5 py-px rounded-full mt-1.5 inline-block border-0" style={{ color: metric.color, backgroundColor: alpha(metric.color, 8) }}>
                      {metric.status}
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          SECTION 3: ALERTS / NOTIFICATIONS
          ═══════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {alerts.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-2 overflow-hidden"
          >
            {alerts.map((alert) => {
              const AIcon = alert.icon;
              return (
                <motion.div
                  key={alert.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.25 }}
                  className="flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer transition-colors duration-150 hover:bg-white/[0.02]"
                  style={{
                    backgroundColor: alpha(alert.color, 4),
                    borderColor: alpha(alert.color, 10),
                  }}
                >
                  <div
                    className="flex h-7 w-7 items-center justify-center rounded-lg shrink-0 mt-0.5"
                    style={{ backgroundColor: alpha(alert.color, 10) }}
                  >
                    <AIcon className="h-3.5 w-3.5" style={{ color: alert.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-foreground">{alert.title}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{alert.description}</p>
                  </div>
                  <ChevronRightIcon style={{ color: alpha(alert.color, 50) }} />
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══════════════════════════════════════════════════════════════
          SECTION 4: RECENT ACTIVITY (Unified Timeline)
          ═══════════════════════════════════════════════════════════════ */}
      <Card className="border-border">
        <CardHeader className="pb-2 pt-4 px-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-[13px] font-bold flex items-center gap-2 text-foreground">
              <div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: c.primary }} />
              <Activity className="h-3.5 w-3.5" style={{ color: c.primary }} />
              Aktivitas Terbaru
            </CardTitle>
            {combinedActivities.length > 0 && (
              <span
                className="text-[10px] font-medium px-2 py-0.5 rounded-full border-0"
                style={{
                  color: c.muted,
                  backgroundColor: alpha(c.muted, 6),
                }}
              >
                {combinedActivities.length} aktivitas
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent className="pb-4 px-4">
          <div className="max-h-[360px] overflow-y-auto pr-1 custom-scrollbar">
            {groupedActivities.length > 0 ? (
              <AnimatePresence initial={false}>
                <div className="space-y-3">
                  {groupedActivities.map((group) => (
                    <motion.div
                      key={group.group}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.2 }}
                    >
                      {/* Date group header */}
                      <div className="flex items-center gap-2 mb-2">
                        <div className="h-px flex-1" style={{ backgroundColor: alpha(c.muted, 8) }} />
                        <span className="text-[10px] font-semibold uppercase tracking-wider px-2 text-muted-foreground">
                          {group.group}
                        </span>
                        <div className="h-px flex-1" style={{ backgroundColor: alpha(c.muted, 8) }} />
                      </div>

                      {/* Activity items */}
                      <div className="space-y-1">
                        {group.items.map((item, itemIdx) => {
                          const isExpense = item.type === 'expense';
                          const isSale = item.type === 'sale';
                          const actColor = isExpense ? c.destructive : isSale ? c.secondary : c.primary;
                          const ActIcon = isExpense ? ArrowDownRight : ArrowUpRight;

                          const typeLabel = isSale
                            ? (item.customer || 'Penjualan')
                            : isExpense
                              ? 'Pengeluaran'
                              : 'Pemasukan';

                          return (
                            <motion.div
                              key={item.id}
                              initial={{ opacity: 0, x: -6 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ duration: 0.2, delay: itemIdx * 0.04 }}
                              className="flex items-center gap-2.5 sm:gap-3 py-2 sm:py-2.5 px-2.5 -mx-1 rounded-lg cursor-pointer transition-all duration-150 hover:bg-white/[0.03] hover:translate-x-0.5"
                            >
                              {/* Color-coded status dot + Icon */}
                              <div className="relative shrink-0">
                                <div
                                  className="absolute -left-0.5 -top-0.5 h-2 w-2 rounded-full z-10 transition-transform duration-200"
                                  style={{ backgroundColor: actColor, boxShadow: `0 0 5px ${alpha(actColor, 50)}` }}
                                />
                                <div
                                  className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-lg"
                                  style={{ backgroundColor: alpha(actColor, 7) }}
                                >
                                  <ActIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" style={{ color: actColor }} />
                                </div>
                              </div>

                              {/* Content */}
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-medium text-foreground truncate">
                                  {item.description}
                                </p>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  <span
                                    className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full border-0"
                                    style={{
                                      color: actColor,
                                      backgroundColor: alpha(actColor, 8),
                                    }}
                                  >
                                    {typeLabel}
                                  </span>
                                  <span className="text-[10px] text-muted-foreground">
                                    {getTimeBadge(item.date)}
                                  </span>
                                </div>
                              </div>

                              {/* Amount */}
                              <div className="text-right shrink-0">
                                <span
                                  className="text-xs sm:text-sm font-bold tabular-nums block"
                                  style={{ color: actColor }}
                                >
                                  {isExpense ? '-' : '+'}{formatAmount(item.amount)}
                                </span>
                              </div>
                            </motion.div>
                          );
                        })}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </AnimatePresence>
            ) : (
              <EmptyState
                icon={Inbox}
                title={t('biz.noBizData')}
                description="Belum ada aktivitas. Mulai catat penjualan pertama Anda."
                accentColor={c.primary}
              />
            )}
          </div>
        </CardContent>
      </Card>

      {/* ═══════════════════════════════════════════════════════════════
          SECTION 5: PIUTANG JATUH TEMPO + QUICK ACTIONS
          ═══════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Piutang Jatuh Tempo (2/3) */}
        <Card className="md:col-span-2 border-border">
          <CardHeader className="pb-2 pt-4 px-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-[13px] font-bold flex items-center gap-2 text-foreground">
                <div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: c.warning }} />
                <AlertTriangle className="h-3.5 w-3.5" style={{ color: c.warning }} />
                Piutang Jatuh Tempo
              </CardTitle>
              {(data?.debtsDueSoon?.length ?? 0) > 0 && (
                <span
                  className="text-[10px] font-bold px-2 py-0.5 rounded-full border-0"
                  style={{
                    color: c.warning,
                    backgroundColor: alpha(c.warning, 8),
                  }}
                >
                  {data.debtsDueSoon.length} item
                </span>
              )}
            </div>
          </CardHeader>
          <CardContent className="pb-4 px-4">
            {debtsDueSoonWithBadge.length > 0 ? (
              <div className="max-h-[240px] overflow-y-auto pr-1 custom-scrollbar space-y-1">
                {debtsDueSoonWithBadge.map((debt) => (
                  <motion.div
                    key={debt.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.2 }}
                    className="flex items-center gap-2.5 py-2 px-2.5 rounded-lg cursor-pointer transition-colors duration-150 hover:bg-white/[0.02] border-b"
                    style={{ borderColor: alpha(c.muted, 8) }}
                  >
                    <div
                      className="flex h-8 w-8 items-center justify-center rounded-lg shrink-0"
                      style={{
                        backgroundColor: alpha(debt.badgeColor, 7),
                        border: `1px solid ${alpha(debt.badgeColor, 12)}`,
                      }}
                    >
                      <Clock className="h-3.5 w-3.5" style={{ color: debt.badgeColor }} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs truncate font-medium text-foreground">{debt.counterpart}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[10px] text-muted-foreground">{formatDate(debt.dueDate)}</span>
                        {debt.status === 'overdue' && (
                          <span
                            className="text-[9px] font-medium px-1 py-px rounded-full border-0"
                            style={{
                              color: c.destructive,
                              backgroundColor: alpha(c.destructive, 7),
                            }}
                          >
                            Overdue
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs font-bold tabular-nums" style={{ color: debt.badgeColor }}>
                        {formatAmount(debt.remaining)}
                      </p>
                      <span
                        className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full mt-0.5 inline-block whitespace-nowrap border-0"
                        style={{ color: debt.badgeColor, backgroundColor: alpha(debt.badgeColor, 8) }}
                      >
                        {debt.badgeLabel}
                      </span>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="flex items-center gap-2.5 py-3 px-3 rounded-lg" style={{ backgroundColor: alpha(c.secondary, 4) }}>
                <CheckCircle2 className="h-4 w-4" style={{ color: c.secondary }} />
                <p className="text-xs font-medium" style={{ color: c.secondary }}>
                  Semua piutang aman — tidak ada yang jatuh tempo dalam 7 hari
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Customers + Piutang Summary (1/3) */}
        <div className="space-y-3">
          {/* Top Customers */}
          {topCustomers.length > 0 && (
            <Card className="border-border">
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-[13px] font-bold flex items-center gap-2 text-foreground">
                  <div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: c.warning }} />
                  <Users className="h-3.5 w-3.5" style={{ color: c.warning }} />
                  Top Pelanggan
                </CardTitle>
              </CardHeader>
              <CardContent className="pb-4 px-4">
                <div className="space-y-2">
                  {topCustomers.map((cust, idx) => {
                    const rankColors = ['#FFD700', '#C0C0C0', '#CD7F32'];
                    const rankColor = idx < 3 ? rankColors[idx] : c.muted;
                    return (
                      <div key={cust.name} className="flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors duration-150 hover:bg-white/[0.02]">
                        <div className="flex h-5 w-5 items-center justify-center rounded-md shrink-0 text-[9px] font-bold" style={{ backgroundColor: idx < 3 ? alpha(rankColor, 12) : alpha(c.muted, 7), color: idx < 3 ? rankColor : c.muted }}>
                          #{idx + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-foreground truncate">{cust.name}</p>
                          <p className="text-[9px] text-muted-foreground">{cust.count} transaksi</p>
                        </div>
                        <span className="text-[11px] font-bold tabular-nums shrink-0" style={{ color: c.warning }}>
                          {formatAmount(cust.total)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Piutang Summary */}
          <Card className="border-border">
            <CardHeader className="pb-2 pt-3 px-4">
              <CardTitle className="text-xs font-semibold flex items-center gap-2 text-foreground">
                <div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: c.primary }} />
                <HandCoins className="h-3 w-3" style={{ color: c.primary }} />
                Piutang
              </CardTitle>
            </CardHeader>
            <CardContent className="pb-3 px-4 space-y-1.5">
              {ps ? (
                [
                  { label: 'Berjalan', count: ps.berjalan.count, amount: ps.berjalan.amount, color: c.primary },
                  { label: 'Menunggak', count: ps.menunggak.count, amount: ps.menunggak.amount, color: c.destructive },
                  { label: 'Lunas', count: ps.selesai.count, amount: ps.selesai.amount, color: c.secondary },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between py-1.5 px-1 rounded-md transition-colors duration-150 hover:bg-white/[0.02]">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: item.color, boxShadow: `0 0 4px ${alpha(item.color, 40)}` }} />
                      <span className="text-[10px] font-semibold text-muted-foreground">{item.label}</span>
                      <span className="text-[10px] tabular-nums text-muted-foreground">({item.count})</span>
                    </div>
                    <span className="text-[11px] font-bold tabular-nums" style={{ color: item.color }}>
                      {formatAmount(item.amount)}
                    </span>
                  </div>
                ))
              ) : (
                <EmptyState
                  icon={HandCoins}
                  title="Belum Ada Piutang"
                  description="Data piutang akan muncul setelah transaksi cicilan dicatat."
                  accentColor={c.primary}
                />
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          SECTION 6: TOP PRODUCTS + INVESTOR (if any)
          ═══════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Top Produk Terjual */}
        <Card className="border-border">
          <CardHeader className="pb-2 pt-4 px-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-[13px] font-bold flex items-center gap-2 text-foreground">
                <div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: c.primary }} />
                <Package className="h-3.5 w-3.5" style={{ color: c.primary }} />
                Top Produk
              </CardTitle>
              {(data?.topProductsSold?.length ?? 0) > 0 && (
                <span
                  className="text-[10px] uppercase tracking-wider font-medium text-muted-foreground"
                >
                  Top 5
                </span>
              )}
            </div>
          </CardHeader>
          <CardContent className="pb-4 px-4">
            {data?.topProductsSold && data.topProductsSold.length > 0 ? (
              <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1 custom-scrollbar">
                {data.topProductsSold.slice(0, 5).map((product, idx) => {
                  const maxRevenue = Math.max(...data.topProductsSold.map(p => p.totalRevenue), 1);
                  const barPct = (product.totalRevenue / maxRevenue) * 100;
                  const rankColors = ['#FFD700', '#C0C0C0', '#CD7F32'];
                  const rankColor = idx < 3 ? rankColors[idx] : c.muted;
                  return (
                    <motion.div
                      key={product.name}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.2, delay: idx * 0.05 }}
                      className="p-2.5 rounded-lg cursor-pointer transition-colors duration-150 hover:bg-white/[0.02]"
                    >
                      <div className="flex items-center gap-2 mb-1.5">
                        <div
                          className="flex h-5 w-5 items-center justify-center rounded-md shrink-0 text-[9px] font-bold"
                          style={{
                            backgroundColor: idx < 3 ? alpha(rankColor, 12) : alpha(c.muted, 7),
                            color: idx < 3 ? rankColor : c.muted,
                          }}
                        >
                          #{idx + 1}
                        </div>
                        <span className="text-xs truncate font-medium flex-1 min-w-0 text-foreground">
                          {product.name}
                        </span>
                        <span className="text-[10px] font-bold tabular-nums shrink-0" style={{ color: c.primary }}>
                          {formatAmount(product.totalRevenue)}
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: alpha(c.primary, 8) }}>
                        <div
                          className="h-full rounded-full transition-all duration-700"
                          style={{
                            width: `${Math.max(barPct, 3)}%`,
                            backgroundColor: c.primary,
                            opacity: 0.6,
                            transitionDelay: `${idx * 0.08}s`,
                          }}
                        />
                      </div>
                      <p className="text-[9px] text-muted-foreground mt-1">
                        {product.totalQuantity} pcs terjual
                      </p>
                    </motion.div>
                  );
                })}
              </div>
            ) : (
              <EmptyState
                icon={Package}
                title="Belum Ada Produk"
                description="Data produk akan muncul setelah penjualan pertama dicatat."
                accentColor={c.primary}
              />
            )}
          </CardContent>
        </Card>

        {/* Investor Summary (if any) */}
        {data.investorBreakdown && data.investorBreakdown.length > 0 && (
          <Card className="border-border">
            <CardHeader className="pb-2 pt-4 px-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-[13px] font-bold flex items-center gap-2 text-foreground">
                  <div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: '#BB86FC' }} />
                  <Users className="h-3.5 w-3.5" style={{ color: '#BB86FC' }} />
                  Dana Investor
                </CardTitle>
                {data.investorSummary && (
                  <span
                    className="text-[10px] font-medium px-2 py-0.5 rounded-full border-0"
                    style={{ color: '#BB86FC', backgroundColor: alpha('#BB86FC', 8) }}
                  >
                    {data.investorSummary.activeInvestors} aktif
                  </span>
                )}
              </div>
            </CardHeader>
            <CardContent className="pb-4 px-4">
              {/* Aggregate stats */}
              {data.investorSummary && (
                <div className="grid grid-cols-3 gap-2 mb-3">
                  {[
                    { label: 'Modal', value: data.investorSummary.totalModalMasuk, color: c.secondary },
                    { label: 'Pendapatan', value: data.investorSummary.totalPendapatan, color: '#4CAF50' },
                    { label: 'Saldo', value: data.investorSummary.totalSaldo, color: '#BB86FC' },
                  ].map((item) => (
                    <div key={item.label} className="text-center p-2 rounded-lg" style={{ backgroundColor: alpha(item.color, 5) }}>
                      <p className="text-[9px] uppercase tracking-wider font-medium text-muted-foreground mb-0.5">{item.label}</p>
                      <p className="text-[11px] font-bold tabular-nums" style={{ color: item.color }}>
                        {formatCompactAmount(item.value)}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {/* Per-investor list */}
              <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1 custom-scrollbar">
                {data.investorBreakdown.map((inv) => {
                  const saldoColor = inv.saldo >= 0 ? '#BB86FC' : c.destructive;
                  return (
                    <div
                      key={inv.id}
                      className="flex items-center gap-2.5 p-2 rounded-lg cursor-pointer transition-colors duration-150 hover:bg-white/[0.02]"
                      style={{ backgroundColor: alpha('#BB86FC', 3) }}
                    >
                      <div
                        className="flex h-8 w-8 items-center justify-center rounded-lg shrink-0"
                        style={{ backgroundColor: alpha('#BB86FC', 10) }}
                      >
                        <HandCoins className="h-3.5 w-3.5" style={{ color: '#BB86FC' }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-foreground truncate">{inv.name}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[9px] text-muted-foreground">Modal: {formatCompactAmount(inv.totalModal)}</span>
                          {inv.profitSharePct > 0 && (
                            <span
                              className="text-[8px] font-medium px-1 py-px rounded-full border-0"
                              style={{ color: '#BB86FC', backgroundColor: alpha('#BB86FC', 7) }}
                            >
                              {inv.profitSharePct}%
                            </span>
                          )}
                        </div>
                      </div>
                      <span className="text-xs font-bold tabular-nums shrink-0" style={{ color: saldoColor }}>
                        {formatAmount(inv.saldo)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          SECTION 7: TIPS + INSIGHT
          ═══════════════════════════════════════════════════════════════ */}
      <Card className="overflow-hidden border-border">
        <CardContent className="p-3 sm:p-4">
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
              <div className="flex gap-0.5">
                {bizTips.map((_, i) => (
                  <button
                    key={i}
                    className="rounded-full cursor-pointer transition-all duration-300"
                    style={{
                      width: i === tipIndex ? 12 : 4,
                      height: 4,
                      backgroundColor: i === tipIndex ? currentTip.color : c.border,
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
                      className="text-[9px] font-medium px-1.5 py-0.5 rounded-full border-0"
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
          </div>
        </CardContent>
      </Card>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: var(--border);
          border-radius: 999px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255,255,255,0.15);
        }
      `}</style>
    </div>
  );
}

/* ── Small ChevronRight icon component (inline to avoid extra import) ── */
function ChevronRightIcon({ style }: { style?: React.CSSProperties }) {
  return (
    <svg className="h-4 w-4 mt-1 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}
