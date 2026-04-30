'use client';

import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Plus, TrendingDown, Calendar, ArrowDownRight, CreditCard, Activity, ArrowUp } from 'lucide-react';
import { toast } from 'sonner';
import { TransactionForm } from '@/components/transaction/TransactionForm';
import { CategoryDialog } from '@/components/transaction/CategoryDialog';
import { TransactionList } from '@/components/transaction/TransactionList';
import { CategoryList } from '@/components/transaction/CategoryList';
import { Transaction, Category, TransactionFormData, CategoryFormData } from '@/types/transaction.types';
import { useTranslation } from '@/hooks/useTranslation';
import { useCurrencyFormat } from '@/hooks/useCurrencyFormat';
import { DynamicIcon } from '@/components/shared/DynamicIcon';
import { TransactionPageSkeleton } from '@/components/shared/PageSkeleton';
import { motion, AnimatePresence } from 'framer-motion';
import { dispatchNotificationEvent } from '@/lib/notificationEvents';

type DateFilter = 'today' | 'week' | 'month' | 'all';

const T = {
  surface: '#121212',
  accent: '#CF6679',
  primary: '#BB86FC',
  muted: '#9E9E9E',
  border: 'rgba(255,255,255,0.06)',
  text: '#E6E1E5',
  textSub: '#B3B3B3',
} as const;

/* ─── Animated Number Hook ─── */
function useAnimatedValue(target: number, duration = 900) {
  const [value, setValue] = useState(0);
  const rafRef = useRef<number>(0);
  const prevTarget = useRef(0);

  useEffect(() => {
    const startTime = performance.now();
    const startValue = prevTarget.current;
    const diff = target - startValue;

    if (diff === 0) { prevTarget.current = target; return; }

    const step = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(startValue + diff * eased));
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(step);
      } else {
        prevTarget.current = target;
      }
    };

    rafRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration]);

  return value;
}

/* ─── Mini Sparkline (CSS-based SVG) ─── */
function MiniSparkline({ data, color, height = 28, className = '' }: {
  data: number[]; color: string; height?: number; className?: string;
}) {
  if (data.length < 2) return null;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const w = 100, h = 100, pad = 12;

  const points = data.map((v, i) => {
    const x = pad + (i / (data.length - 1)) * (w - 2 * pad);
    const y = h - pad - ((v - min) / range) * (h - 2 * pad);
    return `${x},${y}`;
  }).join(' ');

  const areaPoints = `${pad},${h - pad} ${points} ${w - pad},${h - pad}`;
  const gradId = `spark-${color.replace('#', '')}`;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className={className} style={{ height, width: '100%' }}>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon fill={`url(#${gradId})`} points={areaPoints} />
      <polyline fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" points={points} />
      {/* End dot */}
      {data.length > 0 && (
        <circle
          cx={pad + ((data.length - 1) / (data.length - 1)) * (w - 2 * pad)}
          cy={h - pad - ((data[data.length - 1] - min) / range) * (h - 2 * pad)}
          r="4" fill={color} stroke="#121212" strokeWidth="2"
        />
      )}
    </svg>
  );
}

/* ─── Donut Ring (CSS conic-gradient) ─── */
function DonutRing({ segments, total, size = 140, thickness = 22, centerLabel }: {
  segments: { color: string; amount: number; name: string }[];
  total: number; size?: number; thickness?: number;
  centerLabel?: string;
}) {
  const { parts: gradientParts, accumulated } = segments.slice(0, 6).reduce<{ parts: string[]; accumulated: number }>((acc, seg) => {
    const start = acc.accumulated;
    const pct = total > 0 ? (seg.amount / total) * 100 : 0;
    const next = acc.accumulated + pct;
    acc.parts.push(`${seg.color} ${start}% ${next}%`);
    acc.accumulated = next;
    return acc;
  }, { parts: [] as string[], accumulated: 0 });
  const remaining = Math.max(0, 100 - accumulated);
  const fullParts = [...gradientParts];
  if (remaining > 0.5) fullParts.push(`rgba(255,255,255,0.04) ${accumulated}% 100%`);
  const fullGradient = fullParts.join(', ');

  return (
    <div className="relative mx-auto" style={{ width: size, height: size }}>
      <motion.div
        className="rounded-full"
        style={{ width: '100%', height: '100%', background: `conic-gradient(${fullGradient})` }}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, ease: 'easeOut' as const }}
      />
      <div
        className="absolute rounded-full flex flex-col items-center justify-center"
        style={{ inset: thickness, background: 'rgba(18,18,18,0.95)' }}
      >
        {centerLabel && (
          <span className="text-[10px] font-medium" style={{ color: T.muted }}>{centerLabel}</span>
        )}
        <span className="text-sm font-bold" style={{ color: T.text }}>
          {segments.length}
        </span>
      </div>
    </div>
  );
}

export function KasKeluar() {
  const { t } = useTranslation();
  const { formatAmount } = useCurrencyFormat();

  const FILTERS: { key: DateFilter; label: string }[] = [
    { key: 'today', label: t('kas.filterDay') },
    { key: 'week', label: t('kas.filterWeek') },
    { key: 'month', label: t('kas.filterMonth') },
    { key: 'all', label: t('filter.all') },
  ];

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [serverTotalAmount, setServerTotalAmount] = useState<number>(0);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; id: string; type: 'transaction' | 'category' }>({ open: false, id: '', type: 'transaction' });
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [dateFilter, setDateFilter] = useState<DateFilter>('month');
  const [showAllTransactions, setShowAllTransactions] = useState(false);

  const fetchData = useCallback(async (filter: DateFilter) => {
    try {
      const searchParams = new URLSearchParams();
      searchParams.append('type', 'expense');

      if (filter === 'month') {
        const now = new Date();
        searchParams.append('year', now.getFullYear().toString());
        searchParams.append('month', (now.getMonth() + 1).toString());
      } else if (filter === 'today') {
        const now = new Date();
        const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
        searchParams.append('startDate', start.toISOString());
        searchParams.append('endDate', end.toISOString());
      } else if (filter === 'week') {
        const now = new Date();
        const dayOfWeek = now.getDay();
        const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - diff);
        const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
        searchParams.append('startDate', start.toISOString());
        searchParams.append('endDate', end.toISOString());
      }

      const [transRes, catRes] = await Promise.all([
        fetch(`/api/transactions?${searchParams.toString()}`),
        fetch('/api/categories?type=expense'),
      ]);

      if (transRes.ok && catRes.ok) {
        const transData = await transRes.json();
        const catData = await catRes.json();

        const transactions = transData.transactions || [];
        setTransactions(transactions);
        setServerTotalAmount(transData.totalAmount || 0);
        setCategories(catData.categories);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error(t('kas.loadError'));
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  useEffect(() => {
    fetchData(dateFilter);
  }, [dateFilter, fetchData]);

  const handleAddTransaction = async (data: TransactionFormData) => {
    try {
      const response = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (response.ok) {
        dispatchNotificationEvent('notification-created');
        toast.success(t('kas.addExpenseSuccess'));
        setIsAddDialogOpen(false);
        fetchData(dateFilter);
      } else {
        const error = await response.json();
        toast.error(error.error || t('kas.addError'));
      }
    } catch {
      toast.error(t('common.error'));
    }
  };

  const handleEditTransaction = async (data: TransactionFormData) => {
    if (!selectedTransaction) return;
    try {
      const response = await fetch(`/api/transactions/${selectedTransaction.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (response.ok) {
        toast.success(t('kas.updateExpenseSuccess'));
        setIsEditDialogOpen(false);
        setSelectedTransaction(null);
        fetchData(dateFilter);
      } else {
        const error = await response.json();
        toast.error(error.error || t('kas.updateError'));
      }
    } catch {
      toast.error(t('common.error'));
    }
  };

  const handleDelete = async () => {
    try {
      let response;
      let successMessage;
      if (deleteDialog.type === 'transaction') {
        response = await fetch(`/api/transactions/${deleteDialog.id}`, { method: 'DELETE' });
        successMessage = t('kas.deleteExpenseSuccess');
      } else {
        response = await fetch(`/api/categories/${deleteDialog.id}`, { method: 'DELETE' });
        successMessage = t('kas.deleteCategorySuccess');
      }
      if (response.ok) {
        toast.success(successMessage);
        setDeleteDialog({ open: false, id: '', type: 'transaction' });
        fetchData(dateFilter);
      } else {
        const error = await response.json();
        toast.error(error.error || t('kas.deleteError'));
      }
    } catch {
      toast.error(t('common.error'));
    }
  };

  const handleAddCategory = async (data: CategoryFormData) => {
    try {
      const response = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, type: 'expense' }),
      });
      if (response.ok) {
        toast.success(t('kas.addCategorySuccess'));
        setIsCategoryDialogOpen(false);
        fetchData(dateFilter);
      } else {
        const error = await response.json();
        toast.error(error.error || t('kas.addCategoryError'));
      }
    } catch {
      toast.error(t('common.error'));
    }
  };

  const handleEditCategory = async (data: CategoryFormData) => {
    if (!selectedCategory) return;
    try {
      const response = await fetch(`/api/categories/${selectedCategory.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (response.ok) {
        toast.success(t('kas.updateCategorySuccess'));
        setSelectedCategory(null);
        fetchData(dateFilter);
      } else {
        const error = await response.json();
        toast.error(error.error || t('kas.updateCategoryError'));
      }
    } catch {
      toast.error(t('common.error'));
    }
  };

  const openEditTransactionDialog = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setIsEditDialogOpen(true);
  };

  const openEditCategoryDialog = (category: Category) => {
    setSelectedCategory(category);
    setIsCategoryDialogOpen(true);
  };

  const totalExpense = serverTotalAmount;
  const avgExpense = transactions.length > 0 ? totalExpense / transactions.length : 0;
  const maxExpense = transactions.length > 0 ? Math.max(...transactions.map(t => t.amount)) : 0;

  const expenseByCategory = categories
    .map(cat => {
      const catTransactions = transactions.filter(t => t.categoryId === cat.id);
      const total = catTransactions.reduce((sum, t) => sum + t.amount, 0);
      return { name: cat.name, amount: total, color: cat.color, icon: cat.icon, count: catTransactions.length };
    })
    .filter(item => item.amount > 0);

  // Build category amounts map for CategoryList
  const categoryAmounts: Record<string, { amount: number; count: number }> = {};
  categories.forEach(cat => {
    const catTransactions = transactions.filter(t => t.categoryId === cat.id);
    const total = catTransactions.reduce((sum, t) => sum + t.amount, 0);
    categoryAmounts[cat.id] = { amount: total, count: catTransactions.length };
  });

  /* ─── Desktop Enhancement Computations ─── */
  const sparklineData = useMemo(() => {
    const days: number[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dayStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const dayTotal = transactions
        .filter(t => t.date.startsWith(dayStr))
        .reduce((sum, t) => sum + t.amount, 0);
      days.push(dayTotal);
    }
    return days;
  }, [transactions]);

  // Derive a synthetic "vs last month" trend from data pattern
  const trendPct = useMemo(() => {
    if (transactions.length < 2) return 0;
    const mid = Math.floor(transactions.length / 2);
    const firstHalf = transactions.slice(0, mid).reduce((s, t) => s + t.amount, 0);
    const secondHalf = transactions.slice(mid).reduce((s, t) => s + t.amount, 0);
    if (firstHalf === 0) return secondHalf > 0 ? 12 : 0;
    return Math.round(((secondHalf - firstHalf) / firstHalf) * 100);
  }, [transactions]);

  // Monthly progress (% of month elapsed)
  const monthlyProgress = useMemo(() => {
    const now = new Date();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    return Math.round(((now.getDate() - 1) / Math.max(daysInMonth - 1, 1)) * 100);
  }, []);

  // Animated values
  const animatedAvg = useAnimatedValue(Math.round(avgExpense));
  const animatedMax = useAnimatedValue(Math.round(maxExpense));
  const animatedCount = useAnimatedValue(transactions.length, 500);

  if (isLoading) {
    return <TransactionPageSkeleton />;
  }

  const displayedTransactions = showAllTransactions ? transactions : transactions.slice(0, 6);

  return (
    <div className="w-full max-w-full space-y-3 sm:space-y-4">
      <style>{`
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes progressFill {
          from { width: 0%; }
        }
        @keyframes badgePop {
          0% { opacity: 0; transform: scale(0.6); }
          70% { transform: scale(1.08); }
          100% { opacity: 1; transform: scale(1); }
        }
        @keyframes ambientDrift {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(10px, -15px) scale(1.05); }
          66% { transform: translate(-8px, 8px) scale(0.97); }
        }
      `}</style>
      {/* ── Ambient Background ── */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full opacity-[0.03] blur-[120px]" style={{ background: T.accent, animation: 'ambientDrift 20s ease-in-out infinite' }} />
        <div className="absolute top-1/3 -right-24 w-80 h-80 rounded-full opacity-[0.025] blur-[100px]" style={{ background: T.primary, animation: 'ambientDrift 25s ease-in-out infinite 5s' }} />
        <div className="absolute bottom-0 left-1/3 w-72 h-72 rounded-full opacity-[0.02] blur-[100px]" style={{ background: T.accent, animation: 'ambientDrift 22s ease-in-out infinite 10s' }} />
      </div>

      {/* ── Hero Strip ── */}
      <div className="relative rounded-2xl">
        {/* Per-card colored glow */}
        <div className="absolute -top-8 -right-8 w-48 h-48 rounded-full blur-3xl opacity-[0.05] pointer-events-none" style={{ background: T.accent }} />
        <div className="absolute bottom-0 left-0 w-36 h-36 rounded-full blur-3xl opacity-[0.03] pointer-events-none hidden lg:block" style={{ background: T.primary }} />

        {/* Main content */}
        <div
          className="relative rounded-2xl p-4 sm:p-5 lg:p-8 overflow-hidden bg-white/[0.03] backdrop-blur-xl"
          style={{ border: '1px solid rgba(255,255,255,0.08)' }}
        >
          {/* Desktop dot pattern overlay */}
          <div className="absolute inset-0 hidden lg:block pointer-events-none" style={{
            backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px)',
            backgroundSize: '20px 20px',
            maskImage: 'linear-gradient(180deg, transparent 0%, black 25%, black 75%, transparent 100%)',
            WebkitMaskImage: 'linear-gradient(180deg, transparent 0%, black 25%, black 75%, transparent 100%)',
          }} />

          {/* Decorative blurs */}
          <div className="absolute top-0 right-0 w-32 h-32 lg:w-56 lg:h-56 rounded-full opacity-[0.08] blur-3xl pointer-events-none"
            style={{ background: T.accent, transform: 'translate(30%, -30%)' }}
          />
          <div className="absolute bottom-0 left-1/4 w-24 h-24 lg:w-40 lg:h-40 rounded-full opacity-[0.05] blur-3xl pointer-events-none hidden lg:block"
            style={{ background: T.primary }}
          />

          <div className="relative z-10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 lg:gap-5">
                {/* Icon with glow */}
                <div className="relative">
                  <div className="absolute inset-0 rounded-xl blur-xl opacity-30 hidden lg:block" style={{ background: T.accent }} />
                  <div className="relative w-10 h-10 lg:w-14 lg:h-14 rounded-xl lg:rounded-2xl grid place-items-center [&>*]:block leading-none" style={{ background: `${T.accent}20` }}>
                    <CreditCard className="h-5 w-5 lg:h-7 lg:w-7" style={{ color: T.accent }} />
                  </div>
                </div>
                <div>
                  <p className="text-[10px] lg:text-sm font-medium uppercase tracking-wider" style={{ color: T.muted }}>{t('kas.totalExpense')}</p>
                  <p className="text-xl sm:text-2xl lg:text-4xl font-bold tracking-tight bg-gradient-to-r from-white to-white/80 bg-clip-text text-transparent">
                    {formatAmount(totalExpense)}
                  </p>
                </div>
              </div>
              <Button
                onClick={() => setIsAddDialogOpen(true)}
                className="h-10 w-10 lg:h-12 lg:w-12 rounded-xl lg:rounded-2xl shrink-0"
                style={{ background: T.accent, color: '#000' }}
              >
                <Plus className="h-5 w-5 lg:h-6 lg:w-6" />
              </Button>
            </div>

            {/* Desktop inline stats row — Enhanced with badges & sparkline */}
            <div className="hidden lg:flex lg:items-center lg:gap-6 mt-5 pt-4" style={{ borderTop: `1px solid rgba(255,255,255,0.06)` }}>
              {/* 7-day sparkline */}
              <div className="w-24 h-8 shrink-0 opacity-70">
                <MiniSparkline data={sparklineData} color={T.accent} height={32} />
              </div>

              <div className="w-px h-6" style={{ background: 'rgba(255,255,255,0.08)' }} />

              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" style={{ color: T.muted }} />
                <span className="text-sm font-medium" style={{ color: T.textSub }}>
                  {t('filter.transactionCount', { count: transactions.length })}
                </span>
                <span
                  className="text-[10px] font-bold px-2 py-0.5 rounded-full hidden xl:inline-block"
                  style={{ background: `${T.accent}18`, color: T.accent, animation: 'badgePop 0.4s ease-out 0.2s both' }}
                >
                  {transactions.length > 0 ? '-1' : '—'}
                </span>
              </div>
              <div className="w-px h-4" style={{ background: 'rgba(255,255,255,0.08)' }} />
              <div className="flex items-center gap-2">
                <TrendingDown className="h-4 w-4" style={{ color: T.accent }} />
                <span className="text-sm font-medium" style={{ color: T.textSub }}>{t('kas.average')}: </span>
                <span className="text-sm font-bold" style={{ color: T.accent }}>{formatAmount(avgExpense)}</span>
              </div>
              <div className="w-px h-4" style={{ background: 'rgba(255,255,255,0.08)' }} />
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4" style={{ color: T.primary }} />
                <span className="text-sm font-medium" style={{ color: T.textSub }}>{t('kas.largest')}: </span>
                <span className="text-sm font-bold" style={{ color: T.primary }}>{formatAmount(maxExpense)}</span>
                <span
                  className="text-[10px] font-bold px-2 py-0.5 rounded-full hidden xl:inline-block"
                  style={{ background: `${T.primary}18`, color: T.primary, animation: 'badgePop 0.4s ease-out 0.35s both' }}
                >
                  MAX
                </span>
              </div>
            </div>

            {/* Mobile stats */}
            <div className="mt-3 flex items-center gap-1.5 text-[11px] lg:hidden" style={{ color: T.textSub }}>
              <Calendar className="h-3 w-3" />
              <span>{t('filter.transactionCount', { count: transactions.length })}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Quick Stats ── Enhanced ── */}
      <div className="grid grid-cols-3 gap-2 lg:gap-5">
        {[
          {
            label: t('kas.average'),
            rawValue: Math.round(avgExpense),
            displayValue: formatAmount(avgExpense),
            color: T.accent,
            icon: TrendingDown,
            sparkData: sparklineData,
            hoverContext: trendPct >= 0 ? `+${Math.abs(trendPct)}%` : `-${Math.abs(trendPct)}%`,
            trendUp: trendPct <= 0,
          },
          {
            label: t('kas.transactions'),
            rawValue: transactions.length,
            displayValue: transactions.length.toString(),
            color: T.primary,
            icon: ArrowDownRight,
            sparkData: transactions.length > 0
              ? transactions.slice(-7).reduce<number[][]>((acc, _, i) => {
                  if (i % Math.ceil(transactions.length / 7) === 0) acc.push([]);
                  if (acc.length > 0) acc[acc.length - 1].push(transactions[i]?.amount || 0);
                  return acc;
                }, [[]]).map(g => g.reduce((s, v) => s + v, 0)).slice(0, 7)
              : [0, 0, 0, 0, 0, 0, 0],
            hoverContext: `vs last month`,
            trendUp: false,
          },
          {
            label: t('kas.largest'),
            rawValue: Math.round(maxExpense),
            displayValue: formatAmount(maxExpense),
            color: T.primary,
            icon: CreditCard,
            sparkData: [maxExpense * 0.5, maxExpense * 0.7, maxExpense * 0.4, maxExpense * 0.85, maxExpense * 0.75, maxExpense * 0.9, maxExpense],
            hoverContext: `single entry`,
            trendUp: false,
          },
        ].map((stat) => (
          <motion.div
            key={stat.label}
            className="rounded-xl p-3 lg:p-5 lg:py-6 text-center relative overflow-hidden group bg-white/[0.03] backdrop-blur-xl border border-white/[0.08]"
            whileHover={{ scale: 1.02, y: -1 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          >
            {/* Per-card colored glow */}
            <div className="absolute -top-6 -right-6 w-28 h-28 rounded-full blur-3xl opacity-[0.05] pointer-events-none" style={{ background: stat.color }} />
            <div className="relative z-10">
              <div className="relative inline-block">
                <div className="absolute inset-0 rounded-full blur-lg opacity-0 hidden lg:block group-hover:opacity-30 transition-opacity duration-300" style={{ background: stat.color }} />
                <stat.icon className="relative h-3.5 w-3.5 lg:h-5 lg:w-5 mx-auto mb-1.5 lg:mb-2" style={{ color: stat.color, opacity: 0.7 }} />
              </div>
              <p className="text-[10px] lg:text-xs font-medium uppercase tracking-wider mb-0.5 lg:mb-1" style={{ color: T.muted }}>{stat.label}</p>
              <p className="text-xs sm:text-sm lg:text-lg font-bold truncate" style={{ color: stat.color }}>
                {/* Mobile: show actual value */}
                <span className="lg:hidden">{stat.displayValue}</span>
                {/* Desktop: show animated value for numeric stats */}
                {stat.label === t('kas.transactions') ? (
                  <span className="hidden lg:inline">{animatedCount}</span>
                ) : (
                  <span className="hidden lg:inline">{formatAmount(stat.label === t('kas.average') ? animatedAvg : animatedMax)}</span>
                )}
              </p>
              {/* Desktop sparkline */}
              <div className="hidden lg:block mt-2 h-6 opacity-60">
                <MiniSparkline data={stat.sparkData} color={stat.color} height={24} />
              </div>
              {/* Desktop hover context */}
              <div className="hidden lg:flex lg:items-center lg:justify-center lg:gap-1 mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <Activity className="h-3 w-3" style={{ color: stat.trendUp ? T.accent : T.muted, opacity: 0.6 }} />
                <span className="text-[10px] font-medium" style={{ color: T.textSub }}>{stat.hoverContext}</span>
                {stat.trendUp && (
                  <ArrowUp className="h-3 w-3" style={{ color: T.accent, opacity: 0.7 }} />
                )}
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* ═══ Desktop 2-column layout ═══ */}
      <div className="hidden lg:grid lg:grid-cols-[380px_1fr] xl:grid-cols-[440px_1fr] lg:gap-5 xl:gap-6">
        {/* Left column: Categories + Distribution — Glass card */}
        <div
          className="rounded-2xl p-5 space-y-5 overflow-hidden bg-white/[0.02] backdrop-blur-xl"
          style={{ border: '1px solid rgba(255,255,255,0.06)' }}
        >
          {/* Donut Ring — Desktop only */}
          {expenseByCategory.length > 0 && (
            <div className="flex flex-col items-center space-y-3">
              <DonutRing
                segments={expenseByCategory}
                total={totalExpense}
                size={130}
                thickness={20}
                centerLabel={t('kas.categories')}
              />
              {/* Legend dots */}
              <div className="flex flex-wrap justify-center gap-x-3 gap-y-1">
                {expenseByCategory.slice(0, 5).map((cat, i) => (
                  <motion.div
                    key={cat.name}
                    className="flex items-center gap-1.5"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 + i * 0.06, duration: 0.3 }}
                  >
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ background: cat.color }} />
                    <span className="text-[10px] font-medium truncate max-w-[80px]" style={{ color: T.textSub }}>{cat.name}</span>
                    <span
                      className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                      style={{ background: `${cat.color}18`, color: cat.color }}
                    >
                      {totalExpense > 0 ? ((cat.amount / totalExpense) * 100 || 0).toFixed(0) : 0}%
                    </span>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {/* Top 3 Categories — Desktop only highlight */}
          {expenseByCategory.length > 0 && (
            <div className="space-y-2.5">
              <div className="flex items-center gap-2.5">
                <div className="w-1 h-4 rounded-full" style={{ background: `linear-gradient(180deg, ${T.accent}, ${T.primary})` }} />
                <p className="text-xs font-semibold uppercase tracking-wider bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">{t('kas.topCategories')}</p>
              </div>
              <div className="space-y-2">
                {[...expenseByCategory].sort((a, b) => b.amount - a.amount).slice(0, 3).map((cat, i) => {
                  const pct = totalExpense > 0 ? (cat.amount / totalExpense) * 100 : 0;
                  const medals = ['🥇', '🥈', '🥉'];
                  return (
                    <motion.div
                      key={cat.name}
                      className="flex items-center gap-3 p-3 rounded-xl transition-colors duration-200 hover:bg-white/[0.03] cursor-default overflow-hidden"
                      style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${T.border}` }}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1 + i * 0.07, duration: 0.35 }}
                    >
                      <div className="w-10 h-10 rounded-xl grid place-items-center shrink-0 [&>*]:block leading-none relative"
                        style={{ background: `${cat.color}20` }}>
                        <DynamicIcon name={cat.icon} className="h-5 w-5" style={{ color: cat.color }} />
                        <span className="absolute -top-1 -right-1 text-xs">{medals[i]}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1 min-w-0 gap-2">
                          <span className="text-sm font-semibold truncate min-w-0" style={{ color: T.text }}>{cat.name}</span>
                          <span className="text-sm font-bold shrink-0" style={{ color: cat.color }}>{formatAmount(cat.amount)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                            <motion.div
                              className="h-full rounded-full"
                              style={{ background: `linear-gradient(90deg, ${cat.color}, ${cat.color}AA)` }}
                              initial={{ width: 0 }}
                              animate={{ width: `${Math.max(pct, 3)}%` }}
                              transition={{ duration: 0.7, delay: 0.2 + i * 0.08, ease: 'easeOut' as const }}
                            />
                          </div>
                          <motion.span
                            className="text-[10px] font-bold tabular-nums shrink-0 w-10 text-right"
                            style={{ color: cat.color }}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.5 + i * 0.08 }}
                          >
                            {(pct || 0).toFixed(0)}%
                          </motion.span>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Categories section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-1 h-4 rounded-full" style={{ background: `linear-gradient(180deg, ${T.primary}, ${T.accent})` }} />
                <p className="text-xs font-semibold uppercase tracking-wider bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">{t('kas.categories')}</p>
              </div>
              <Button
                size="icon"
                className="h-8 w-8 rounded-lg transition-transform hover:scale-110"
                style={{ background: `${T.primary}12`, color: T.primary, border: `1px solid ${T.primary}20` }}
                onClick={() => setIsCategoryDialogOpen(true)}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <CategoryList
              categories={categories}
              onEdit={openEditCategoryDialog}
              onDelete={(id) => setDeleteDialog({ open: true, id, type: 'category' })}
              type="expense"
              compact
              categoryAmounts={categoryAmounts}
            />
          </div>

          {/* Category Distribution */}
          {expenseByCategory.length > 0 && (
            <div>
              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-1 h-4 rounded-full" style={{ background: `linear-gradient(180deg, ${T.accent}, ${T.primary})` }} />
                <p className="text-xs font-semibold uppercase tracking-wider bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">{t('kas.distribution')}</p>
              </div>
              <div className="space-y-3">
                {expenseByCategory.slice(0, 5).map((cat) => {
                  const pct = totalExpense > 0 ? (cat.amount / totalExpense) * 100 : 0;
                  return (
                    <div key={cat.name} className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded-lg grid place-items-center shrink-0 [&>*]:block leading-none"
                        style={{ background: `${cat.color}25` }}>
                        <DynamicIcon name={cat.icon} className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1 min-w-0 gap-2">
                          <span className="text-xs font-medium truncate min-w-0" style={{ color: T.textSub }}>{cat.name}</span>
                          <span className="text-xs font-semibold shrink-0 max-w-[120px] truncate" style={{ color: cat.color }}>{(pct || 0).toFixed(0)}% · {formatAmount(cat.amount)}</span>
                        </div>
                        <div className="h-3 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                          <div className="h-full rounded-full transition-all duration-500"
                            style={{ width: `${Math.max(pct, 2)}%`, background: `linear-gradient(90deg, ${cat.color}, ${cat.color}CC)` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Right column: Transactions — Glass card */}
        <div
          className="rounded-2xl p-5 space-y-4 bg-white/[0.02] backdrop-blur-xl"
          style={{ border: '1px solid rgba(255,255,255,0.06)' }}
        >
          {/* Transactions header with filter pills */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-1 h-4 rounded-full" style={{ background: `linear-gradient(180deg, ${T.accent}, ${T.primary})` }} />
              <p className="text-xs font-semibold uppercase tracking-wider bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">{t('kas.history')}</p>
            </div>
            <div className="flex gap-1.5">
              {FILTERS.map((f) => (
                <button
                  key={f.key}
                  onClick={() => { setDateFilter(f.key); setShowAllTransactions(false); }}
                  className="text-xs font-semibold px-4 py-1.5 rounded-full shrink-0 transition-all duration-200 hover:scale-105"
                  style={{
                    background: dateFilter === f.key ? `${T.accent}18` : 'rgba(255,255,255,0.04)',
                    color: dateFilter === f.key ? '#000' : T.muted,
                    border: 'none',
                  }}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          <div className="max-h-[700px] overflow-y-auto">
            {/* Enhanced desktop empty state */}
            {transactions.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center justify-center text-center py-12 relative rounded-xl bg-white/[0.02]"
                style={{ border: `1px solid ${T.border}` }}
              >
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-32 h-32 rounded-full blur-3xl opacity-20" style={{ background: 'var(--destructive)' }} />
                </div>
                <div className="relative">
                  <div
                    className="w-20 h-20 rounded-2xl grid place-items-center [&>*]:block leading-none"
                    style={{ background: `${T.accent}08`, border: `2px dashed ${T.accent}20` }}
                  >
                    <CreditCard className="h-9 w-9" style={{ color: T.accent, opacity: 0.35 }} />
                  </div>
                </div>
                <p className="text-base font-semibold mb-1.5 mt-4" style={{ color: T.text }}>{t('kas.noData')}</p>
                <p className="text-sm max-w-[260px] leading-relaxed" style={{ color: T.textSub }}>{t('kas.noDataHint')}</p>
                <motion.button
                  onClick={() => setIsAddDialogOpen(true)}
                  className="mt-5 flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold transition-all duration-200 hover:scale-105 active:scale-95"
                  style={{
                    background: `linear-gradient(135deg, ${T.accent}20, ${T.accent}08)`,
                    color: T.accent,
                    border: `1px solid ${T.accent}25`,
                  }}
                >
                  <Plus className="h-4 w-4" />
                  {t('kas.addExpense')}
                </motion.button>
              </motion.div>
            ) : (
              <TransactionList
                transactions={displayedTransactions}
                onEdit={openEditTransactionDialog}
                onDelete={(id) => setDeleteDialog({ open: true, id, type: 'transaction' })}
                type="expense"
              />
            )}
          </div>

          {transactions.length > 6 && (
            <button
              onClick={() => setShowAllTransactions(!showAllTransactions)}
              className="w-full text-center py-3 text-sm font-medium rounded-xl transition-all hover:scale-[1.01]"
              style={{ color: T.primary, background: `${T.primary}08`, border: `1px solid ${T.primary}15` }}
            >
              {showAllTransactions ? t('filter.showLess') : `${t('filter.showAll')} (${transactions.length})`}
            </button>
          )}

          {/* Summary footer — Desktop enhanced */}
          <div className="hidden lg:block pt-3 mt-3 space-y-3" style={{ borderTop: `1px solid ${T.border}` }}>
            {/* Monthly progress bar */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-medium" style={{ color: T.muted }}>Monthly Progress</span>
                <span className="text-[11px] font-bold tabular-nums" style={{ color: T.textSub }}>{monthlyProgress}%</span>
              </div>
              <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: `linear-gradient(90deg, ${T.accent}, ${T.primary})` }}
                  initial={{ width: 0 }}
                  animate={{ width: `${monthlyProgress}%` }}
                  transition={{ duration: 1.2, ease: 'easeOut' as const, delay: 0.3 }}
                />
              </div>
            </div>
            {/* Total + trend comparison */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium" style={{ color: T.muted }}>{t('kas.totalShown')}</span>
                {trendPct !== 0 && (
                  <motion.span
                    className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full"
                    style={{
                      background: trendPct < 0 ? `${T.accent}15` : `${T.accent}10`,
                      color: trendPct < 0 ? T.accent : T.muted,
                    }}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.6, duration: 0.3 }}
                  >
                    {trendPct > 0 ? <TrendingDown className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" style={{ transform: 'rotate(180deg)' }} />}
                    {trendPct > 0 ? '+' : ''}{trendPct}% trend
                  </motion.span>
                )}
              </div>
              <span className="text-sm font-bold tabular-nums" style={{ color: T.accent }}>
                {formatAmount(displayedTransactions.reduce((s, t) => s + t.amount, 0))}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ Tablet 2-column layout (md → lg / 768px–1024px) ═══ */}
      <div className="hidden md:grid lg:hidden md:grid-cols-[240px_1fr] md:gap-4">
        {/* Left column: Categories — Glass card */}
        <div
          className="rounded-2xl p-4 space-y-4 bg-white/[0.02] backdrop-blur-xl"
          style={{ border: '1px solid rgba(255,255,255,0.06)' }}
        >
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-1 h-3.5 rounded-full" style={{ background: `linear-gradient(180deg, ${T.primary}, ${T.accent})` }} />
                <p className="text-[11px] font-semibold uppercase tracking-wider bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">{t('kas.categories')}</p>
              </div>
              <Button
                size="icon"
                className="h-7 w-7 rounded-lg transition-transform hover:scale-110"
                style={{ background: `${T.primary}12`, color: T.primary, border: `1px solid ${T.primary}20` }}
                onClick={() => setIsCategoryDialogOpen(true)}
              >
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </div>
            <CategoryList
              categories={categories}
              onEdit={openEditCategoryDialog}
              onDelete={(id) => setDeleteDialog({ open: true, id, type: 'category' })}
              type="expense"
              compact
              categoryAmounts={categoryAmounts}
            />
          </div>

          {/* Category Distribution (compact) */}
          {expenseByCategory.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2.5">
                <div className="w-1 h-3.5 rounded-full" style={{ background: `linear-gradient(180deg, ${T.accent}, ${T.primary})` }} />
                <p className="text-[11px] font-semibold uppercase tracking-wider bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">{t('kas.distribution')}</p>
              </div>
              <div className="space-y-2">
                {expenseByCategory.slice(0, 5).map((cat) => {
                  const pct = totalExpense > 0 ? (cat.amount / totalExpense) * 100 : 0;
                  return (
                    <div key={cat.name} className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-md grid place-items-center shrink-0 [&>*]:block leading-none"
                        style={{ background: `${cat.color}20` }}>
                        <DynamicIcon name={cat.icon} className="h-3 w-3" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-0.5 min-w-0 gap-1">
                          <span className="text-[10px] font-medium truncate min-w-0" style={{ color: T.textSub }}>{cat.name}</span>
                          <span className="text-[10px] font-semibold shrink-0" style={{ color: cat.color }}>{(pct || 0).toFixed(0)}%</span>
                        </div>
                        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: `${T.border}` }}>
                          <div className="h-full rounded-full transition-all duration-500"
                            style={{ width: `${Math.max(pct, 2)}%`, background: `linear-gradient(90deg, ${cat.color}, ${cat.color}99)` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Right column: Transactions — Glass card */}
        <div
          className="rounded-2xl p-4 space-y-3 bg-white/[0.02] backdrop-blur-xl"
          style={{ border: '1px solid rgba(255,255,255,0.06)' }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-1 h-3.5 rounded-full" style={{ background: `linear-gradient(180deg, ${T.accent}, ${T.primary})` }} />
              <p className="text-[11px] font-semibold uppercase tracking-wider bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">{t('kas.history')}</p>
            </div>
            <div className="flex gap-1">
              {FILTERS.map((f) => (
                <button
                  key={f.key}
                  onClick={() => { setDateFilter(f.key); setShowAllTransactions(false); }}
                  className="text-[10px] font-semibold px-2.5 py-1 rounded-full shrink-0 transition-all"
                  style={{
                    background: dateFilter === f.key ? `${T.accent}18` : 'rgba(255,255,255,0.04)',
                    color: dateFilter === f.key ? '#000' : T.muted,
                    border: 'none',
                  }}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          <div className="max-h-[600px] overflow-y-auto">
            <TransactionList
              transactions={displayedTransactions}
              onEdit={openEditTransactionDialog}
              onDelete={(id) => setDeleteDialog({ open: true, id, type: 'transaction' })}
              type="expense"
            />
          </div>

          {transactions.length > 6 && (
            <button
              onClick={() => setShowAllTransactions(!showAllTransactions)}
              className="w-full text-center py-2.5 text-xs font-medium rounded-xl transition-all"
              style={{ color: T.primary, background: `${T.primary}08`, border: `1px solid ${T.primary}15` }}
            >
              {showAllTransactions ? t('filter.showLess') : `${t('filter.showAll')} (${transactions.length})`}
            </button>
          )}
        </div>
      </div>

      {/* ═══ Mobile stacked layout (< md / <768px) ═══ */}
      <div className="md:hidden space-y-3">
        {/* Category Distribution */}
        {expenseByCategory.length > 0 && (
          <div
            className="rounded-xl p-3 sm:p-4 bg-white/[0.02]"
            style={{ border: '1px solid rgba(255,255,255,0.06)' }}
          >
            <p className="text-[10px] font-semibold uppercase tracking-wider mb-2.5 bg-gradient-to-r from-white/80 to-white/50 bg-clip-text text-transparent">{t('kas.distribution')}</p>
            <div className="space-y-2">
              {expenseByCategory.slice(0, 5).map((cat) => {
                const pct = totalExpense > 0 ? (cat.amount / totalExpense) * 100 : 0;
                return (
                  <div key={cat.name} className="flex items-center gap-2.5">
                    <div className="w-5 h-5 rounded-md grid place-items-center shrink-0 [&>*]:block leading-none"
                      style={{ background: `${cat.color}20` }}>
                      <DynamicIcon name={cat.icon} className="h-3.5 w-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5 min-w-0 gap-2">
                        <span className="text-[11px] font-medium truncate min-w-0" style={{ color: T.textSub }}>{cat.name}</span>
                        <span className="text-[10px] font-semibold shrink-0" style={{ color: cat.color }}>{(pct || 0).toFixed(0)}%</span>
                      </div>
                      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: `${T.border}` }}>
                        <div className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${Math.max(pct, 2)}%`, background: `linear-gradient(90deg, ${cat.color}, ${cat.color}99)` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Categories */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-semibold uppercase tracking-wider bg-gradient-to-r from-white/80 to-white/50 bg-clip-text text-transparent">{t('kas.categories')}</p>
            <Button
              size="icon"
              className="h-7 w-7 rounded-lg"
              style={{ background: `${T.primary}12`, color: T.primary, border: `1px solid ${T.primary}20` }}
              onClick={() => setIsCategoryDialogOpen(true)}
            >
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </div>
          <CategoryList
            categories={categories}
            onEdit={openEditCategoryDialog}
            onDelete={(id) => setDeleteDialog({ open: true, id, type: 'category' })}
            type="expense"
            compact
            categoryAmounts={categoryAmounts}
          />
        </div>

        {/* Transactions */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-semibold uppercase tracking-wider bg-gradient-to-r from-white/80 to-white/50 bg-clip-text text-transparent">{t('kas.history')}</p>
            <div className="flex gap-1 overflow-x-auto scrollbar-hide">
              {FILTERS.map((f) => (
                <button
                  key={f.key}
                  onClick={() => { setDateFilter(f.key); setShowAllTransactions(false); }}
                  className="text-[10px] font-semibold px-2.5 py-1 rounded-full shrink-0 transition-all"
                  style={{
                    background: dateFilter === f.key ? `${T.accent}18` : 'transparent',
                    color: dateFilter === f.key ? '#000' : T.muted,
                    border: 'none',
                  }}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          <TransactionList
            transactions={displayedTransactions}
            onEdit={openEditTransactionDialog}
            onDelete={(id) => setDeleteDialog({ open: true, id, type: 'transaction' })}
            type="expense"
          />

          {transactions.length > 6 && (
            <button
              onClick={() => setShowAllTransactions(!showAllTransactions)}
              className="w-full text-center py-2.5 text-[11px] font-medium rounded-xl transition-colors"
              style={{ color: T.primary, background: `${T.primary}08`, border: `1px solid ${T.primary}15` }}
            >
              {showAllTransactions ? t('filter.showLess') : `${t('filter.showAll')} (${transactions.length})`}
            </button>
          )}
        </div>
      </div>

      {/* ── Dialogs ── */}
      <TransactionForm
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        type="expense"
        categories={categories}
        onSubmit={handleAddTransaction}
      />
      <TransactionForm
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        type="expense"
        categories={categories}
        initialData={selectedTransaction}
        onSubmit={handleEditTransaction}
      />
      <CategoryDialog
        open={isCategoryDialogOpen}
        onOpenChange={setIsCategoryDialogOpen}
        type="expense"
        initialData={selectedCategory}
        onSubmit={selectedCategory ? handleEditCategory : handleAddCategory}
      />
      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ ...deleteDialog, open })}>
        <AlertDialogContent className="bg-[#141414] border-white/[0.08] rounded-2xl">
          <div className="h-px bg-white/[0.08] -mt-2 mb-4" />
          <AlertDialogHeader>
            <AlertDialogTitle style={{ color: T.text }}>
              {deleteDialog.type === 'transaction' ? t('kas.deleteExpense') : t('kas.deleteCategory')}
            </AlertDialogTitle>
            <AlertDialogDescription style={{ color: T.textSub }}>
              {deleteDialog.type === 'transaction'
                ? t('kas.deleteExpenseDesc')
                : t('kas.deleteCategoryDesc')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-white/[0.06] text-white/70 hover:bg-white/[0.1] hover:text-white border-0">{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="border-0"
              style={{ background: '#CF6679', color: '#fff' }}
            >
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
