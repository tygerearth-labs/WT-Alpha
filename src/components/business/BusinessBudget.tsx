'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useBusinessStore } from '@/store/useBusinessStore';
import { useTranslation } from '@/hooks/useTranslation';
import { useCurrencyFormat } from '@/hooks/useCurrencyFormat';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  PiggyBank,
  Wallet,
  TrendingDown,
  Plus,
  Pencil,
  Trash2,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Users,
  CircleDollarSign,
  Target,
  ArrowUpDown,
  CalendarDays,
  Info,
  CheckCircle,
  X,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

// ─── Color helpers using CSS variables ───────────────────────────
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
interface FundAllocation {
  id: string;
  budgetId: string;
  fundSource: string;
  investorId?: string;
  investorName?: string;
  amount: number;
  description?: string;
}

interface BudgetItem {
  id: string;
  businessId: string;
  categoryName: string;
  categoryId?: string;
  amount: number;
  period: number;
  year: number;
  notes?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  spent: number;
  remaining: number;
  spentPct: number;
  allocations: FundAllocation[];
}

interface BudgetSummary {
  totalBudget: number;
  totalSpent: number;
  totalAllocated: number;
  totalRemaining: number;
  budgetCount: number;
  overBudgetCount: number;
}

interface Category {
  id: string;
  name: string;
  type: string;
  color?: string;
  icon?: string;
}

interface Investor {
  id: string;
  name: string;
  totalInvestment: number;
  profitSharePct: number;
  status: string;
}

interface CashSummary {
  kasBesarSaldo: number;
  kasKecilSaldo: number;
  investorSaldo: number;
}

// ─── Constants ──────────────────────────────────────────────────
const MONTH_NAMES = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
];

const FUND_SOURCES = [
  { value: 'kas_besar', label: 'Kas Besar' },
  { value: 'kas_kecil', label: 'Kas Kecil' },
  { value: 'investor', label: 'Dana Investor' },
] as const;

// ─── Progress Color Helper ──────────────────────────────────────
function getProgressColor(pct: number): { color: string; bg: string } {
  if (pct >= 95) return { color: c.destructive, bg: alpha(c.destructive, 15) };
  if (pct >= 85) return { color: '#F97316', bg: alpha('#F97316', 15) };
  if (pct >= 60) return { color: c.warning, bg: alpha(c.warning, 15) };
  return { color: c.secondary, bg: alpha(c.secondary, 15) };
}

function getProgressBgColor(pct: number): string {
  if (pct >= 95) return c.destructive;
  if (pct >= 85) return '#F97316';
  if (pct >= 60) return c.warning;
  return c.secondary;
}

// ─── Animation Variants ─────────────────────────────────────────
const cardVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.03,
      type: 'spring' as const,
      stiffness: 300,
      damping: 24,
    },
  }),
  exit: { opacity: 0, y: 8, transition: { duration: 0.15 } },
};

const expandVariants = {
  hidden: { opacity: 0, height: 0, marginTop: 0 },
  visible: {
    opacity: 1,
    height: 'auto',
    marginTop: 12,
    transition: {
      type: 'spring' as const,
      stiffness: 200,
      damping: 22,
      opacity: { duration: 0.25 },
    },
  },
  exit: {
    opacity: 0,
    height: 0,
    marginTop: 0,
    transition: { duration: 0.2, opacity: { duration: 0.1 } },
  },
};

// ─── Section Header Helper ──────────────────────────────────────
function SectionHeader({
  icon: Icon,
  label,
}: {
  icon: React.ElementType;
  label: string;
}) {
  return (
    <div className="biz-section-header flex items-center gap-2 mb-3">
      <div
        className="biz-section-header-icon h-6 w-6 rounded-md flex items-center justify-center"
        style={{ background: alpha(c.primary, 12) }}
      >
        <Icon className="h-3 w-3" style={{ color: c.primary }} />
      </div>
      <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: c.foreground }}>
        {label}
      </span>
      <div className="flex-1 h-px" style={{ background: c.border }} />
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────
export default function BusinessBudget() {
  const { t } = useTranslation();
  const { activeBusiness } = useBusinessStore();
  const { formatAmount } = useCurrencyFormat();

  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());

  const [budgets, setBudgets] = useState<BudgetItem[]>([]);
  const [summary, setSummary] = useState<BudgetSummary | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [investors, setInvestors] = useState<Investor[]>([]);
  const [cashSummary, setCashSummary] = useState<CashSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<BudgetItem | null>(null);
  const [formData, setFormData] = useState({
    categoryName: '',
    categoryId: '',
    amount: '',
    period: now.getMonth() + 1,
    year: now.getFullYear(),
    notes: '',
    allocations: [{ fundSource: 'kas_besar', investorId: '', amount: '', description: '' }],
  });
  const [saving, setSaving] = useState(false);

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [expandLoading, setExpandLoading] = useState<string | null>(null);

  const businessId = activeBusiness?.id;

  // ── Data Fetching ─────────────────────────────────────────────
  const fetchBudgets = useCallback(() => {
    if (!businessId) return;
    setLoading(true);
    Promise.all([
      fetch(
        `/api/business/${businessId}/budgets?period=${selectedMonth}&year=${selectedYear}`
      ).then((r) => (r.ok ? r.json() : { budgets: [], summary: null })),
      fetch(
        `/api/business/${businessId}/categories?type=pengeluaran`
      ).then((r) => (r.ok ? r.json() : { categories: [] })),
      fetch(`/api/business/${businessId}/investors`).then((r) =>
        r.ok ? r.json() : { investors: [] }
      ),
      fetch(`/api/business/${businessId}/cash?summary=true`).then((r) =>
        r.ok ? r.json() : null
      ),
    ])
      .then(([budgetData, catData, invData, cashData]) => {
        setBudgets(budgetData?.budgets || []);
        setSummary(budgetData?.summary || null);
        setCategories(catData?.categories || []);
        setInvestors(invData?.investors || []);
        setCashSummary(cashData);
      })
      .catch(() => {
        setBudgets([]);
        setSummary(null);
        setCategories([]);
        setInvestors([]);
        setCashSummary(null);
      })
      .finally(() => setLoading(false));
  }, [businessId, selectedMonth, selectedYear]);

  useEffect(() => {
    if (businessId) {
      fetchBudgets();
    } else {
      setLoading(false);
    }
  }, [businessId, fetchBudgets]);

  // ── CRUD Operations ───────────────────────────────────────────
  const openCreateDialog = () => {
    setEditingBudget(null);
    setFormData({
      categoryName: '',
      categoryId: '',
      amount: '',
      period: selectedMonth,
      year: selectedYear,
      notes: '',
      allocations: [{ fundSource: 'kas_besar', investorId: '', amount: '', description: '' }],
    });
    setDialogOpen(true);
  };

  const openEditDialog = (budget: BudgetItem) => {
    setEditingBudget(budget);
    const allocs =
      budget.allocations.length > 0
        ? budget.allocations.map((a) => ({
            fundSource: a.fundSource,
            investorId: a.investorId || '',
            amount: a.amount.toString(),
            description: a.description || '',
          }))
        : [{ fundSource: 'kas_besar' as const, investorId: '', amount: '', description: '' }];
    setFormData({
      categoryName: budget.categoryName,
      categoryId: budget.categoryId || '',
      amount: budget.amount.toString(),
      period: budget.period,
      year: budget.year,
      notes: budget.notes || '',
      allocations: allocs,
    });
    setDialogOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessId || !formData.categoryName || !formData.amount) return;
    const budgetAmount = parseFloat(formData.amount);
    if (isNaN(budgetAmount) || budgetAmount <= 0) return;

    // Validate allocations total
    const totalAllocated = formData.allocations.reduce(
      (sum, a) => sum + (parseFloat(a.amount) || 0),
      0
    );
    if (totalAllocated > budgetAmount) {
      toast.error('Total alokasi melebihi anggaran');
      return;
    }

    setSaving(true);
    try {
      const url = editingBudget
        ? `/api/business/${businessId}/budgets/${editingBudget.id}`
        : `/api/business/${businessId}/budgets`;

      const allocations = formData.allocations
        .filter((a) => a.amount && parseFloat(a.amount) > 0)
        .map((a) => ({
          fundSource: a.fundSource,
          investorId: a.fundSource === 'investor' && a.investorId ? a.investorId : undefined,
          amount: parseFloat(a.amount),
          description: a.description || undefined,
        }));

      const body: Record<string, unknown> = {
        categoryName: formData.categoryName.trim(),
        amount: budgetAmount,
        period: formData.period,
        year: formData.year,
        notes: formData.notes || undefined,
      };

      if (formData.categoryId) body.categoryId = formData.categoryId;
      if (allocations.length > 0) body.allocations = allocations;

      const res = await fetch(url, {
        method: editingBudget ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error();
      toast.success(
        editingBudget ? t('biz.businessUpdated') : t('biz.businessCreated')
      );
      setDialogOpen(false);
      fetchBudgets();
    } catch {
      toast.error(t('common.error'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!businessId || !deleteId) return;
    try {
      const res = await fetch(`/api/business/${businessId}/budgets/${deleteId}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error();
      toast.success(t('biz.businessUpdated'));
      fetchBudgets();
    } catch {
      toast.error(t('common.error'));
    } finally {
      setDeleteId(null);
    }
  };

  // ── Expand/Collapse ───────────────────────────────────────────
  const toggleExpand = async (budgetId: string) => {
    if (expandedId === budgetId) {
      setExpandedId(null);
      return;
    }
    setExpandedId(budgetId);
    setExpandLoading(budgetId);
    // Fetch single budget with expense entries
    try {
      const res = await fetch(`/api/business/${businessId}/budgets/${budgetId}`);
      if (res.ok) {
        const data = await res.json();
        setBudgets((prev) =>
          prev.map((b) => (b.id === budgetId ? { ...b, ...data } : b))
        );
      }
    } catch {
      // silent
    } finally {
      setExpandLoading(null);
    }
  };

  // ── Form Helpers ──────────────────────────────────────────────
  const updateAllocation = (
    index: number,
    field: string,
    value: string
  ) => {
    setFormData((prev) => {
      const newAllocs = [...prev.allocations];
      newAllocs[index] = { ...newAllocs[index], [field]: value };
      // Reset investorId if fundSource changes away from investor
      if (field === 'fundSource' && value !== 'investor') {
        newAllocs[index].investorId = '';
      }
      return { ...prev, allocations: newAllocs };
    });
  };

  const addAllocation = () => {
    setFormData((prev) => ({
      ...prev,
      allocations: [
        ...prev.allocations,
        { fundSource: 'kas_besar', investorId: '', amount: '', description: '' },
      ],
    }));
  };

  const removeAllocation = (index: number) => {
    if (formData.allocations.length <= 1) return;
    setFormData((prev) => ({
      ...prev,
      allocations: prev.allocations.filter((_, i) => i !== index),
    }));
  };

  const totalAllocated = formData.allocations.reduce(
    (sum, a) => sum + (parseFloat(a.amount) || 0),
    0
  );
  const budgetAmount = parseFloat(formData.amount) || 0;
  const allocationExceeds = budgetAmount > 0 && totalAllocated > budgetAmount;

  // ── Category Select Handler ───────────────────────────────────
  const handleCategoryChange = (value: string) => {
    if (value === '__custom__') {
      setFormData((prev) => ({ ...prev, categoryName: '', categoryId: '' }));
    } else {
      const cat = categories.find((c) => c.id === value);
      setFormData((prev) => ({
        ...prev,
        categoryName: cat?.name || '',
        categoryId: cat?.id || '',
      }));
    }
  };

  // ── Formatted Nominals ────────────────────────────────────────
  const formattedAmount = useMemo(() => {
    const num = parseFloat(formData.amount);
    if (isNaN(num) || num <= 0) return '';
    return formatAmount(num);
  }, [formData.amount, formatAmount]);

  // ── Year Navigation ───────────────────────────────────────────
  const goToPrevYear = () => setSelectedYear((y) => y - 1);
  const goToNextYear = () => setSelectedYear((y) => y + 1);
  const goToCurrentYear = () => {
    setSelectedYear(now.getFullYear());
    setSelectedMonth(now.getMonth() + 1);
  };

  // ── Guard ─────────────────────────────────────────────────────
  if (!businessId) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground text-center">{t('biz.registerFirst')}</p>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════
  // ── RENDER ────────────────────────────────────────────────────
  // ══════════════════════════════════════════════════════════════
  return (
    <div className="space-y-3 relative">
      {/* Ambient glows */}
      <div className="absolute -top-32 -left-20 h-[400px] w-[400px] rounded-full opacity-[0.06] blur-[100px] pointer-events-none" style={{ background: 'rgba(255,183,77,0.12)' }} />
      <div className="absolute top-60 -right-24 h-[350px] w-[350px] rounded-full opacity-[0.04] blur-[100px] pointer-events-none" style={{ background: 'rgba(251,146,60,0.15)' }} />
      {/* ═══ INFO BANNER ═══ */}
      <div
        className="biz-info-banner flex items-start gap-2 p-2.5 rounded-lg text-[11px] border"
        style={{
          background: alpha(c.primary, 5),
          borderColor: alpha(c.primary, 15),
        }}
      >
        <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" style={{ color: c.primary }} />
        <span style={{ color: c.muted }}>
          Atur anggaran pengeluaran bisnis per bulan. Lacak realisasi pengeluaran dan kelola sumber dana untuk setiap kategori anggaran.
        </span>
      </div>

      {/* ═══ MONTH / YEAR SELECTOR ═══ */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {/* Year Selector */}
        <div className="flex items-center justify-center gap-3 mb-3">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 rounded-md"
            onClick={goToPrevYear}
          >
            <ChevronDown className="h-4 w-4 -rotate-90" style={{ color: c.muted }} />
          </Button>
          <span
            className="text-sm font-bold tabular-nums min-w-[48px] text-center"
            style={{ color: c.foreground }}
          >
            {selectedYear}
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 rounded-md"
            onClick={goToNextYear}
          >
            <ChevronDown className="h-4 w-4 rotate-90" style={{ color: c.muted }} />
          </Button>
          {selectedYear !== now.getFullYear() && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 rounded-md text-[10px] font-medium"
              style={{ color: c.primary }}
              onClick={goToCurrentYear}
            >
              Hari Ini
            </Button>
          )}
        </div>

        {/* Month Pills */}
        <div
          className="biz-scroll-mobile flex items-center gap-1 overflow-x-auto pb-1 px-1"
          style={{
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
          }}
        >
          {MONTH_NAMES.map((name, idx) => {
            const monthNum = idx + 1;
            const isActive = selectedMonth === monthNum;
            const isCurrentMonth =
              monthNum === now.getMonth() + 1 && selectedYear === now.getFullYear();
            return (
              <button
                key={monthNum}
                onClick={() => setSelectedMonth(monthNum)}
                className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 border ${isActive ? 'biz-period-pill-active' : 'biz-period-pill'}`}
                style={{
                  background: isActive ? alpha(c.primary, 15) : 'transparent',
                  color: isActive ? c.primary : c.muted,
                  borderColor: isActive ? alpha(c.primary, 25) : 'transparent',
                }}
              >
                <span className="block text-[10px] opacity-60 mb-0.5">
                  {String(monthNum).padStart(2, '0')}
                </span>
                {name.substring(0, 3)}
                {isCurrentMonth && !isActive && (
                  <span
                    className="block w-1 h-1 rounded-full mx-auto mt-0.5"
                    style={{ background: c.primary }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </motion.div>

      {/* ═══ HERO SUMMARY CARD ═══ */}
      {!loading && summary && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
        >
          <div className="relative rounded-2xl">
            {/* Desktop gradient border glow */}
            <div className="absolute -inset-[1.5px] rounded-[18px] hidden lg:block"
              style={{
                background: 'linear-gradient(135deg, rgba(255,183,77,0.15), rgba(251,146,60,0.2), rgba(255,183,77,0.15))',
                filter: 'blur(2px)', opacity: 0.4,
                animation: 'heroGlow 4s ease-in-out infinite',
              }}
            />
          <Card className="biz-hero-card relative rounded-xl overflow-hidden" style={{ background: 'linear-gradient(135deg, rgba(255,183,77,0.06), rgba(251,146,60,0.03))', border: '1px solid rgba(255,183,77,0.12)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)' }}>
            <div className="absolute top-0 left-4 right-4 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,183,77,0.3), rgba(251,146,60,0.2), transparent)' }} />
            <CardContent className="p-4 sm:p-5">
              {/* Header */}
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center"
                    style={{ background: alpha(c.primary, 12) }}
                  >
                    <PiggyBank className="h-4.5 w-4.5" style={{ color: c.primary }} />
                  </div>
                  <div>
                    <h2
                      className="text-sm font-bold"
                      style={{ color: c.foreground }}
                    >
                      Total Anggaran
                    </h2>
                    <p className="text-[10px] mt-0.5" style={{ color: c.muted }}>
                      {MONTH_NAMES[selectedMonth - 1]} {selectedYear} · {summary.budgetCount} kategori
                    </p>
                  </div>
                </div>
                {summary.overBudgetCount > 0 && (
                  <Badge
                    className="text-[10px] font-bold rounded-full px-2 py-0.5 border-0 shrink-0"
                    style={{
                      background: alpha(c.destructive, 15),
                      color: c.destructive,
                    }}
                  >
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    {summary.overBudgetCount} Over Budget
                  </Badge>
                )}
              </div>

              {/* Main Total */}
              <p
                className="text-2xl sm:text-3xl font-bold tabular-nums mb-4"
                style={{ color: c.foreground }}
              >
                {formatAmount(summary.totalBudget)}
              </p>

              {/* Overall Progress Bar */}
              {summary.totalBudget > 0 && (
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-medium" style={{ color: c.muted }}>
                      Realisasi Pengeluaran
                    </span>
                    <span className="text-[10px] font-bold tabular-nums" style={{ color: c.foreground }}>
                      {Math.round((summary.totalSpent / summary.totalBudget) * 100)}%
                    </span>
                  </div>
                  <div className="biz-progress-track h-2.5 rounded-full overflow-hidden" style={{ background: c.border }}>
                    <motion.div
                      className="biz-progress-fill h-full rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min((summary.totalSpent / summary.totalBudget) * 100, 100)}%` }}
                      transition={{ duration: 0.8, ease: 'easeOut' }}
                      style={{
                        background: `linear-gradient(to right, ${c.secondary}, ${c.primary})`,
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Metric Chips */}
              <div className="flex items-center gap-2 flex-wrap">
                {/* Spent Chip */}
                <div
                  className="biz-metric-chip flex items-center gap-2 px-3 py-2 rounded-lg border"
                  style={{ background: alpha(c.warning, 6), borderColor: alpha(c.warning, 12) }}
                >
                  <div
                    className="biz-metric-chip-icon w-6 h-6 rounded-md flex items-center justify-center"
                    style={{ background: alpha(c.warning, 15) }}
                  >
                    <TrendingDown className="h-3 w-3" style={{ color: c.warning }} />
                  </div>
                  <div>
                    <p className="text-[9px] uppercase font-medium" style={{ color: c.muted }}>Terpakai</p>
                    <p className="text-xs font-bold tabular-nums" style={{ color: c.warning }}>
                      {formatAmount(summary.totalSpent)}
                    </p>
                  </div>
                </div>

                {/* Remaining Chip */}
                <div
                  className="biz-metric-chip flex items-center gap-2 px-3 py-2 rounded-lg border"
                  style={{ background: alpha(c.secondary, 6), borderColor: alpha(c.secondary, 12) }}
                >
                  <div
                    className="biz-metric-chip-icon w-6 h-6 rounded-md flex items-center justify-center"
                    style={{ background: alpha(c.secondary, 15) }}
                  >
                    <CheckCircle className="h-3 w-3" style={{ color: c.secondary }} />
                  </div>
                  <div>
                    <p className="text-[9px] uppercase font-medium" style={{ color: c.muted }}>Sisa</p>
                    <p className="text-xs font-bold tabular-nums" style={{ color: c.secondary }}>
                      {formatAmount(summary.totalRemaining)}
                    </p>
                  </div>
                </div>

                {/* Allocated Chip */}
                <div
                  className="biz-metric-chip flex items-center gap-2 px-3 py-2 rounded-lg border"
                  style={{ background: alpha(c.primary, 6), borderColor: alpha(c.primary, 12) }}
                >
                  <div
                    className="biz-metric-chip-icon w-6 h-6 rounded-md flex items-center justify-center"
                    style={{ background: alpha(c.primary, 15) }}
                  >
                    <CircleDollarSign className="h-3 w-3" style={{ color: c.primary }} />
                  </div>
                  <div>
                    <p className="text-[9px] uppercase font-medium" style={{ color: c.muted }}>Dialokasikan</p>
                    <p className="text-xs font-bold tabular-nums" style={{ color: c.primary }}>
                      {formatAmount(summary.totalAllocated)}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          </div>
        </motion.div>
      )}

      {/* ═══ FUND SOURCE OVERVIEW ═══ */}
      {!loading && cashSummary && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.1 }}
        >
          <Card className="biz-content-card rounded-xl bg-white/[0.02] border border-white/[0.06] backdrop-blur-xl">
            <CardContent className="p-4">
              <div className="biz-section-header flex items-center gap-2 mb-3">
                <Wallet className="biz-section-header-icon h-3.5 w-3.5" style={{ color: c.primary }} />
                <span className="text-xs font-semibold" style={{ color: c.foreground }}>
                  Saldo Sumber Dana
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {/* Kas Besar */}
                <div className="rounded-lg p-2.5 border" style={{ background: 'linear-gradient(135deg, color-mix(in srgb, var(--secondary) 8%, transparent), transparent)', borderColor: c.border }}>
                  <div className="flex items-center gap-1.5 mb-1">
                    <div className="w-2 h-2 rounded-full" style={{ background: c.secondary }} />
                    <span className="text-[10px] font-medium" style={{ color: c.muted }}>Kas Besar</span>
                  </div>
                  <p className="text-xs font-bold tabular-nums" style={{ color: c.secondary }}>
                    {formatAmount(cashSummary.kasBesarSaldo)}
                  </p>
                </div>

                {/* Kas Kecil */}
                <div className="rounded-lg p-2.5 border" style={{ background: 'linear-gradient(135deg, color-mix(in srgb, var(--warning) 8%, transparent), transparent)', borderColor: c.border }}>
                  <div className="flex items-center gap-1.5 mb-1">
                    <div className="w-2 h-2 rounded-full" style={{ background: c.warning }} />
                    <span className="text-[10px] font-medium" style={{ color: c.muted }}>Kas Kecil</span>
                  </div>
                  <p className="text-xs font-bold tabular-nums" style={{ color: c.warning }}>
                    {formatAmount(cashSummary.kasKecilSaldo)}
                  </p>
                </div>

                {/* Investor */}
                <div className="rounded-lg p-2.5 border" style={{ background: 'linear-gradient(135deg, color-mix(in srgb, var(--primary) 8%, transparent), transparent)', borderColor: c.border }}>
                  <div className="flex items-center gap-1.5 mb-1">
                    <div className="w-2 h-2 rounded-full" style={{ background: c.primary }} />
                    <span className="text-[10px] font-medium" style={{ color: c.muted }}>Investor</span>
                  </div>
                  <p className="text-xs font-bold tabular-nums" style={{ color: c.primary }}>
                    {formatAmount(cashSummary.investorSaldo)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* ═══ BUDGET LIST ═══ */}
      <Card className="biz-content-card rounded-xl overflow-hidden bg-white/[0.02] border border-white/[0.06] backdrop-blur-xl">
        <CardContent className="p-0">
          {/* Header with Add Button */}
          <div className="flex items-center justify-between p-3 sm:p-4" style={{ borderBottom: `1px solid ${c.border}` }}>
            <div className="biz-section-header flex items-center gap-2">
              <div
                className="biz-section-header-icon h-6 w-6 rounded-md flex items-center justify-center"
                style={{ background: alpha(c.primary, 12) }}
              >
                <Target className="h-3 w-3" style={{ color: c.primary }} />
              </div>
              <h3 className="text-xs font-semibold" style={{ color: c.foreground }}>
                Daftar Anggaran
              </h3>
              {!loading && budgets.length > 0 && (
                <Badge
                  className="text-[9px] font-medium rounded-full px-1.5 py-0 border-0"
                  style={{ background: alpha(c.primary, 10), color: c.primary }}
                >
                  {budgets.length}
                </Badge>
              )}
            </div>
            <Button
              onClick={openCreateDialog}
              size="sm"
              className="h-10 sm:h-8 rounded-lg"
              style={{ background: c.primary, color: 'var(--primary-foreground)' }}
            >
              <Plus className="h-4 w-4 sm:h-3.5 sm:w-3.5 mr-1" />
              <span className="hidden sm:inline text-xs">Tambah Anggaran</span>
              <span className="sm:hidden text-xs">Tambah</span>
            </Button>
          </div>

          {loading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-16 rounded-lg" style={{ background: c.border }} />
              ))}
            </div>
          ) : budgets.length === 0 ? (
            /* ═══ EMPTY STATE ═══ */
            <div className="biz-empty-state flex flex-col items-center justify-center py-12 sm:py-16 px-6">
              <div
                className="biz-empty-state-icon w-14 h-14 rounded-xl flex items-center justify-center mb-4 border"
                style={{ background: alpha(c.primary, 5), borderColor: c.border }}
              >
                <PiggyBank className="h-6 w-6" style={{ color: c.muted }} />
              </div>
              <p className="text-sm font-medium" style={{ color: c.muted }}>
                Belum ada anggaran
              </p>
              <p className="text-xs mt-1" style={{ color: c.muted }}>
                Buat anggaran pertama untuk bulan {MONTH_NAMES[selectedMonth - 1]} {selectedYear}
              </p>
              <Button
                onClick={openCreateDialog}
                size="sm"
                className="mt-4 rounded-lg text-sm"
                style={{ background: c.primary, color: 'var(--primary-foreground)' }}
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                Tambah Anggaran
              </Button>
            </div>
          ) : (
            <>
              {/* ─── Mobile Card List ─── */}
              <div className="sm:hidden max-h-[600px] overflow-y-auto divide-y" style={{ borderColor: c.border }}>
                <AnimatePresence mode="popLayout">
                  {budgets.map((budget, i) => {
                    const isExpanded = expandedId === budget.id;
                    const isOverBudget = budget.remaining < 0;
                    const progressColor = getProgressColor(budget.spentPct);

                    // Allocations breakdown
                    const kasBesarAlloc = budget.allocations
                      .filter((a) => a.fundSource === 'kas_besar')
                      .reduce((s, a) => s + a.amount, 0);
                    const kasKecilAlloc = budget.allocations
                      .filter((a) => a.fundSource === 'kas_kecil')
                      .reduce((s, a) => s + a.amount, 0);
                    const investorAlloc = budget.allocations
                      .filter((a) => a.fundSource === 'investor')
                      .reduce((s, a) => s + a.amount, 0);

                    return (
                      <motion.div
                        key={budget.id}
                        custom={i}
                        variants={cardVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        layout
                        whileHover={{ x: 2 }}
                        className="p-3.5 min-h-[44px]"
                        style={{
                          borderLeft: budget.spentPct >= 95
                            ? '3px solid var(--destructive)'
                            : budget.spentPct >= 85
                              ? '3px solid #F97316'
                              : '3px solid var(--secondary)',
                        }}
                      >
                        {/* Row 1: Category + Actions */}
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <p className="text-xs font-semibold truncate" style={{ color: c.foreground }}>
                                {budget.categoryName}
                              </p>
                              {isOverBudget && (
                                <Badge
                                  className="text-[8px] font-bold rounded px-1.5 py-0 border-0 shrink-0"
                                  style={{ background: alpha(c.destructive, 15), color: c.destructive }}
                                >
                                  OVER BUDGET
                                </Badge>
                              )}
                              {!budget.isActive && (
                                <Badge
                                  className="text-[8px] font-bold rounded px-1.5 py-0 border-0 shrink-0"
                                  style={{ background: alpha(c.muted, 10), color: c.muted }}
                                >
                                  NON-AKTIF
                                </Badge>
                              )}
                            </div>
                            {/* Allocation breakdown */}
                            {(kasBesarAlloc > 0 || kasKecilAlloc > 0 || investorAlloc > 0) && (
                              <div className="flex items-center gap-2 mt-1 flex-wrap">
                                {kasBesarAlloc > 0 && (
                                  <span className="text-[9px] font-medium" style={{ color: c.secondary }}>
                                    Kas Besar: {formatAmount(kasBesarAlloc)}
                                  </span>
                                )}
                                {kasKecilAlloc > 0 && (
                                  <span className="text-[9px] font-medium" style={{ color: c.warning }}>
                                    Kas Kecil: {formatAmount(kasKecilAlloc)}
                                  </span>
                                )}
                                {investorAlloc > 0 && (
                                  <span className="text-[9px] font-medium" style={{ color: c.primary }}>
                                    Investor: {formatAmount(investorAlloc)}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-9 w-9 p-0 rounded-lg"
                              style={{ color: c.muted }}
                              onClick={() => openEditDialog(budget)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-9 w-9 p-0 rounded-lg"
                              style={{ color: c.destructive }}
                              onClick={() => setDeleteId(budget.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="flex items-center gap-2 mb-2">
                          <div className="biz-progress-track flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: c.border }}>
                            <div
                              className="biz-progress-fill h-full rounded-full transition-all duration-700"
                              style={{
                                width: `${Math.min(budget.spentPct, 100)}%`,
                                background: getProgressBgColor(budget.spentPct),
                              }}
                            />
                          </div>
                          <span className="text-[10px] font-bold tabular-nums shrink-0" style={{ color: progressColor.color }}>
                            {Math.round(budget.spentPct)}%
                          </span>
                        </div>

                        {/* Row 2: Spent / Budget / Remaining */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] tabular-nums" style={{ color: c.muted }}>
                              Terpakai:{' '}
                              <span className="font-semibold" style={{ color: c.foreground }}>
                                {formatAmount(budget.spent)}
                              </span>
                            </span>
                            <span className="text-[10px]" style={{ color: c.muted }}>/</span>
                            <span className="text-[10px] tabular-nums" style={{ color: c.muted }}>
                              {formatAmount(budget.amount)}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] tabular-nums font-medium" style={{ color: isOverBudget ? c.destructive : c.secondary }}>
                              {isOverBudget ? '-' : ''}{formatAmount(Math.abs(budget.remaining))} sisa
                            </span>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 rounded-lg"
                              style={{ color: c.muted }}
                              onClick={() => toggleExpand(budget.id)}
                            >
                              {expandLoading === budget.id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : isExpanded ? (
                                <ChevronUp className="h-3.5 w-3.5" />
                              ) : (
                                <ChevronDown className="h-3.5 w-3.5" />
                              )}
                            </Button>
                          </div>
                        </div>

                        {/* Expandable Expense Entries */}
                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div
                              variants={expandVariants}
                              initial="hidden"
                              animate="visible"
                              exit="exit"
                            >
                              <div
                                className="rounded-lg p-3 space-y-2"
                                style={{
                                  background: alpha(c.primary, 3),
                                  border: `1px solid ${alpha(c.primary, 8)}`,
                                }}
                              >
                                <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: c.muted }}>
                                  Detail Pengeluaran
                                </p>
                                {expandLoading === budget.id ? (
                                  <div className="space-y-1.5">
                                    <Skeleton className="h-8 rounded-md" style={{ background: c.border }} />
                                    <Skeleton className="h-8 rounded-md" style={{ background: c.border }} />
                                  </div>
                                ) : budget.spent === 0 ? (
                                  <p className="text-[10px] py-2 text-center" style={{ color: c.muted }}>
                                    Belum ada pengeluaran untuk kategori ini
                                  </p>
                                ) : (
                                  <div className="space-y-1">
                                    <div className="flex items-center gap-1.5 text-[9px] font-medium" style={{ color: c.muted }}>
                                      <CalendarDays className="h-2.5 w-2.5" />
                                      <span className="flex-1">Tanggal</span>
                                      <span className="flex-1">Keterangan</span>
                                      <span className="text-right">Jumlah</span>
                                    </div>
                                    {(budget as unknown as Record<string, unknown>).recentEntries !== undefined &&
                                    Array.isArray((budget as unknown as Record<string, unknown>).recentEntries) ? (
                                      ((budget as unknown as Record<string, unknown>).recentEntries as Array<Record<string, unknown>>).map(
                                        (entry, idx) => (
                                          <div
                                            key={idx}
                                            className="flex items-center gap-1.5 text-[10px] rounded-md px-2 py-1.5"
                                            style={{
                                              background: idx % 2 === 0 ? 'transparent' : alpha(c.foreground, 2),
                                            }}
                                          >
                                            <span className="flex-1 tabular-nums" style={{ color: c.muted }}>
                                              {entry.date
                                                ? new Date(entry.date as string).toLocaleDateString('id-ID', {
                                                    day: '2-digit',
                                                    month: 'short',
                                                  })
                                                : '-'}
                                            </span>
                                            <span className="flex-1 truncate" style={{ color: c.foreground }}>
                                              {entry.description as string || '-'}
                                            </span>
                                            <span
                                              className="text-right font-semibold tabular-nums"
                                              style={{ color: c.warning }}
                                            >
                                              {formatAmount(entry.amount as number || 0)}
                                            </span>
                                          </div>
                                        )
                                      )
                                    ) : (
                                      <p className="text-[10px] py-2 text-center" style={{ color: c.muted }}>
                                        Detail tidak tersedia
                                      </p>
                                    )}
                                  </div>
                                )}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>

              {/* ─── Desktop Table ─── */}
              <div className="hidden sm:block max-h-[600px] overflow-y-auto">
                <table className="w-full">
                  <thead>
                    <tr className="biz-table-header" style={{ borderBottom: `1px solid ${c.border}` }}>
                      <th className="text-[10px] font-medium uppercase tracking-wider text-left py-2.5 px-4" style={{ color: c.muted }}>
                        Kategori
                      </th>
                      <th className="text-[10px] font-medium uppercase tracking-wider text-left py-2.5 px-4 hidden md:table-cell" style={{ color: c.muted }}>
                        Alokasi
                      </th>
                      <th className="text-[10px] font-medium uppercase tracking-wider text-right py-2.5 px-4" style={{ color: c.muted }}>
                        Anggaran
                      </th>
                      <th className="text-[10px] font-medium uppercase tracking-wider text-right py-2.5 px-4" style={{ color: c.muted }}>
                        Terpakai
                      </th>
                      <th className="text-[10px] font-medium uppercase tracking-wider text-right py-2.5 px-4" style={{ color: c.muted }}>
                        Sisa
                      </th>
                      <th className="text-[10px] font-medium uppercase tracking-wider text-center py-2.5 px-4 w-32" style={{ color: c.muted }}>
                        Progress
                      </th>
                      <th className="text-[10px] font-medium uppercase tracking-wider py-2.5 px-4 w-24" style={{ color: c.muted }} />
                    </tr>
                  </thead>
                  <tbody>
                    <AnimatePresence>
                      {budgets.map((budget, i) => {
                        const isExpanded = expandedId === budget.id;
                        const isOverBudget = budget.remaining < 0;
                        const progressColor = getProgressColor(budget.spentPct);

                        const kasBesarAlloc = budget.allocations
                          .filter((a) => a.fundSource === 'kas_besar')
                          .reduce((s, a) => s + a.amount, 0);
                        const kasKecilAlloc = budget.allocations
                          .filter((a) => a.fundSource === 'kas_kecil')
                          .reduce((s, a) => s + a.amount, 0);
                        const investorAlloc = budget.allocations
                          .filter((a) => a.fundSource === 'investor')
                          .reduce((s, a) => s + a.amount, 0);

                        return (
                          <motion.tr
                            key={budget.id}
                            className="biz-table-row"
                            custom={i}
                            initial={{ opacity: 0, y: 4 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2, delay: i * 0.03 }}
                            style={{
                              borderBottom: `1px solid ${c.border}`,
                              background: i % 2 === 1 ? alpha(c.foreground, 1) : 'transparent',
                              borderLeft: budget.spentPct >= 95
                                ? '3px solid var(--destructive)'
                                : budget.spentPct >= 85
                                  ? '3px solid #F97316'
                                  : '3px solid var(--secondary)',
                            }}
                          >
                            {/* Category */}
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-1.5">
                                <p className="text-xs font-medium" style={{ color: c.foreground }}>
                                  {budget.categoryName}
                                </p>
                                {isOverBudget && (
                                  <Badge
                                    className="text-[8px] font-bold rounded px-1.5 py-0 border-0"
                                    style={{ background: alpha(c.destructive, 15), color: c.destructive }}
                                  >
                                    OVER BUDGET
                                  </Badge>
                                )}
                              </div>
                            </td>

                            {/* Allocations */}
                            <td className="py-3 px-4 hidden md:table-cell">
                              <div className="flex items-center gap-2 flex-wrap">
                                {kasBesarAlloc > 0 && (
                                  <span className="text-[10px] font-medium px-1.5 py-0.5 rounded" style={{ background: alpha(c.secondary, 10), color: c.secondary }}>
                                    KB: {formatAmount(kasBesarAlloc)}
                                  </span>
                                )}
                                {kasKecilAlloc > 0 && (
                                  <span className="text-[10px] font-medium px-1.5 py-0.5 rounded" style={{ background: alpha(c.warning, 10), color: c.warning }}>
                                    KK: {formatAmount(kasKecilAlloc)}
                                  </span>
                                )}
                                {investorAlloc > 0 && (
                                  <span className="text-[10px] font-medium px-1.5 py-0.5 rounded" style={{ background: alpha(c.primary, 10), color: c.primary }}>
                                    INV: {formatAmount(investorAlloc)}
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* Budget */}
                            <td className="py-3 px-4 text-right">
                              <span className="text-xs font-semibold tabular-nums" style={{ color: c.foreground }}>
                                {formatAmount(budget.amount)}
                              </span>
                            </td>

                            {/* Spent */}
                            <td className="py-3 px-4 text-right">
                              <span className="text-xs font-semibold tabular-nums" style={{ color: c.warning }}>
                                {formatAmount(budget.spent)}
                              </span>
                            </td>

                            {/* Remaining */}
                            <td className="py-3 px-4 text-right">
                              <span
                                className="text-xs font-semibold tabular-nums"
                                style={{ color: isOverBudget ? c.destructive : c.secondary }}
                              >
                                {isOverBudget ? '-' : ''}{formatAmount(Math.abs(budget.remaining))}
                              </span>
                            </td>

                            {/* Progress */}
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2">
                                <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: c.border }}>
                                  <div
                                    className="biz-progress-fill h-full rounded-full transition-all duration-700"
                                    style={{
                                      width: `${Math.min(budget.spentPct, 100)}%`,
                                      background: getProgressBgColor(budget.spentPct),
                                    }}
                                  />
                                </div>
                                <span className="text-[10px] font-bold tabular-nums w-8 text-right" style={{ color: progressColor.color }}>
                                  {Math.round(budget.spentPct)}%
                                </span>
                              </div>
                            </td>

                            {/* Actions */}
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-0.5">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 w-7 p-0 rounded-md"
                                  style={{ color: c.muted }}
                                  onClick={() => toggleExpand(budget.id)}
                                >
                                  {expandLoading === budget.id ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                  ) : isExpanded ? (
                                    <ChevronUp className="h-3 w-3" />
                                  ) : (
                                    <ChevronDown className="h-3 w-3" />
                                  )}
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 w-7 p-0 rounded-md"
                                  style={{ color: c.muted }}
                                  onClick={() => openEditDialog(budget)}
                                >
                                  <Pencil className="h-3 w-3" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 w-7 p-0 rounded-md"
                                  style={{ color: c.destructive }}
                                  onClick={() => setDeleteId(budget.id)}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </td>
                          </motion.tr>
                        );
                      })}
                    </AnimatePresence>
                  </tbody>
                </table>

                {/* Desktop expanded detail */}
                <AnimatePresence>
                  {expandedId && (() => {
                    const budget = budgets.find((b) => b.id === expandedId);
                    if (!budget) return null;
                    return (
                      <motion.div
                        key={`expand-${budget.id}`}
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="px-4 py-3"
                        style={{ borderTop: `1px solid ${c.border}` }}
                      >
                        <div
                          className="rounded-lg p-3"
                          style={{
                            background: alpha(c.primary, 3),
                            border: `1px solid ${alpha(c.primary, 8)}`,
                          }}
                        >
                          <p className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: c.muted }}>
                            Detail Pengeluaran — {budget.categoryName}
                          </p>
                          {expandLoading === budget.id ? (
                            <div className="space-y-1.5">
                              <Skeleton className="h-8 rounded-md" style={{ background: c.border }} />
                              <Skeleton className="h-8 rounded-md" style={{ background: c.border }} />
                            </div>
                          ) : budget.spent === 0 ? (
                            <p className="text-[10px] py-2 text-center" style={{ color: c.muted }}>
                              Belum ada pengeluaran untuk kategori ini
                            </p>
                          ) : (
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 text-[9px] font-medium" style={{ color: c.muted }}>
                                <CalendarDays className="h-2.5 w-2.5" />
                                <span className="flex-1">Tanggal</span>
                                <span className="flex-1">Keterangan</span>
                                <span className="text-right">Jumlah</span>
                              </div>
                              {(budget as unknown as Record<string, unknown>).recentEntries !== undefined &&
                              Array.isArray((budget as unknown as Record<string, unknown>).recentEntries) ? (
                                ((budget as unknown as Record<string, unknown>).recentEntries as Array<Record<string, unknown>>).map(
                                  (entry, idx) => (
                                    <div
                                      key={idx}
                                      className="flex items-center gap-2 text-xs rounded-md px-2 py-1.5"
                                      style={{
                                        background: idx % 2 === 0 ? 'transparent' : alpha(c.foreground, 2),
                                      }}
                                    >
                                      <span className="flex-1 tabular-nums" style={{ color: c.muted }}>
                                        {entry.date
                                          ? new Date(entry.date as string).toLocaleDateString('id-ID', {
                                              day: '2-digit',
                                              month: 'short',
                                            })
                                          : '-'}
                                      </span>
                                      <span className="flex-1 truncate" style={{ color: c.foreground }}>
                                        {entry.description as string || '-'}
                                      </span>
                                      <span className="text-right font-semibold tabular-nums" style={{ color: c.warning }}>
                                        {formatAmount(entry.amount as number || 0)}
                                      </span>
                                    </div>
                                  )
                                )
                              ) : (
                                <p className="text-[10px] py-2 text-center" style={{ color: c.muted }}>
                                  Detail tidak tersedia
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      </motion.div>
                    );
                  })()}
                </AnimatePresence>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* ═══ ADD / EDIT BUDGET DIALOG ═══ */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent
          className="biz-dialog-content bg-[#141414] border-white/[0.08] rounded-2xl p-0 overflow-hidden w-[calc(100%-1.5rem)] sm:max-w-[500px] max-h-[92vh] sm:max-h-[90vh] overflow-y-auto"
          style={{ boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }}
        >
          <div className="h-px bg-white/[0.06]" />
          <DialogHeader className="px-5 pt-5">
            <DialogTitle
              className="text-sm font-semibold flex items-center gap-2"
              style={{ color: c.foreground }}
            >
              <div
                className="h-7 w-7 rounded-lg flex items-center justify-center"
                style={{ background: alpha(c.primary, 12) }}
              >
                <PiggyBank className="h-3.5 w-3.5" style={{ color: c.primary }} />
              </div>
              {editingBudget ? 'Edit Anggaran' : 'Tambah Anggaran'}
            </DialogTitle>
            <DialogDescription className="text-xs" style={{ color: c.muted }}>
              {editingBudget
                ? 'Ubah detail anggaran pengeluaran'
                : `Buat anggaran baru untuk ${MONTH_NAMES[formData.period - 1]} ${formData.year}`}
            </DialogDescription>
          </DialogHeader>

          {/* Top gradient accent line */}
          <div
            className="h-px -mt-1"
            style={{
              background: `linear-gradient(to right, transparent, ${c.secondary}, ${c.primary}, transparent)`,
            }}
          />

          <form onSubmit={handleSave} className="space-y-5 px-5 pb-5 scroll-smooth">
            {/* ═══ Section 1: Detail Anggaran ═══ */}
            <div>
              <SectionHeader icon={Target} label="Detail Anggaran" />

              {/* Category Select */}
              <div className="space-y-1.5 mb-3">
                <Label className="text-xs font-medium" style={{ color: c.foreground }}>
                  Kategori Pengeluaran
                </Label>
                <Select value={formData.categoryId || formData.categoryName || ''} onValueChange={handleCategoryChange}>
                  <SelectTrigger className="h-10 rounded-xl text-sm bg-white/[0.04] border-white/[0.08] focus:border-white/15 focus:ring-0" style={{ color: c.foreground }}>
                    <SelectValue placeholder="Pilih kategori..." />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                    {categories.length > 0 && (
                      <>
                        <div className="h-px my-1" style={{ background: c.border }} />
                        <SelectItem value="__custom__">
                          <span className="text-xs italic">Ketik kategori sendiri...</span>
                        </SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>
                {(!formData.categoryId || formData.categoryId === '__custom__') && (
                  <Input
                    value={formData.categoryName}
                    onChange={(e) => setFormData((prev) => ({ ...prev, categoryName: e.target.value }))}
                    placeholder="Nama kategori..."
                    className="h-10 rounded-xl text-sm mt-1.5 bg-white/[0.04] border-white/[0.08] focus:border-white/15 focus:ring-0"
                    style={{ color: c.foreground }}
                  />
                )}
              </div>

              {/* Amount */}
              <div className="space-y-1.5 mb-3">
                <Label className="text-xs font-medium" style={{ color: c.foreground }}>
                  Nominal Anggaran
                </Label>
                <Input
                  type="number"
                  value={formData.amount}
                  onChange={(e) => setFormData((prev) => ({ ...prev, amount: e.target.value }))}
                  placeholder="0"
                  min="0"
                  className="h-10 rounded-xl text-sm tabular-nums bg-white/[0.04] border-white/[0.08] focus:border-white/15 focus:ring-0"
                  style={{ color: c.foreground }}
                />
                {formattedAmount && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-1.5 px-1 mt-1"
                  >
                    <CircleDollarSign className="h-3 w-3 shrink-0" style={{ color: c.primary }} />
                    <span className="text-sm font-semibold tabular-nums" style={{ color: c.primary }}>
                      {formattedAmount}
                    </span>
                  </motion.div>
                )}
              </div>

              {/* Period / Year (read-only display) */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium" style={{ color: c.foreground }}>
                    Periode
                  </Label>
                  <div
                    className="h-10 rounded-lg flex items-center px-3 text-sm border"
                    style={{ background: alpha(c.primary, 3), borderColor: c.border, color: c.foreground }}
                  >
                    <CalendarDays className="h-3.5 w-3.5 mr-2" style={{ color: c.primary }} />
                    {MONTH_NAMES[formData.period - 1]}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium" style={{ color: c.foreground }}>
                    Tahun
                  </Label>
                  <div
                    className="h-10 rounded-lg flex items-center px-3 text-sm border"
                    style={{ background: alpha(c.primary, 3), borderColor: c.border, color: c.foreground }}
                  >
                    <CalendarDays className="h-3.5 w-3.5 mr-2" style={{ color: c.primary }} />
                    {formData.year}
                  </div>
                </div>
              </div>
            </div>

            <div className="h-px bg-white/[0.06]" />

            {/* ═══ Section 2: Alokasi Dana ═══ */}
            <div>
              <SectionHeader icon={Wallet} label="Alokasi Dana" />

              <div className="space-y-2.5">
                {formData.allocations.map((alloc, idx) => (
                  <div
                    key={idx}
                    className="rounded-lg border p-3 space-y-2.5"
                    style={{ borderColor: c.border, background: alpha(c.foreground, 1) }}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: c.muted }}>
                        Alokasi #{idx + 1}
                      </span>
                      {formData.allocations.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 rounded-md"
                          style={{ color: c.destructive }}
                          onClick={() => removeAllocation(idx)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      )}
                    </div>

                    {/* Fund Source */}
                    <div className="space-y-1">
                      <Label className="text-[10px] font-medium" style={{ color: c.muted }}>
                        Sumber Dana
                      </Label>
                      <Select
                        value={alloc.fundSource}
                        onValueChange={(v) => updateAllocation(idx, 'fundSource', v)}
                      >
                        <SelectTrigger className="h-10 rounded-xl text-xs bg-white/[0.04] border-white/[0.08] focus:border-white/15 focus:ring-0" style={{ color: c.foreground }}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {FUND_SOURCES.map((fs) => (
                            <SelectItem key={fs.value} value={fs.value}>
                              {fs.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Investor dropdown (if Dana Investor selected) */}
                    {alloc.fundSource === 'investor' && (
                      <div className="space-y-1">
                        <Label className="text-[10px] font-medium" style={{ color: c.muted }}>
                          Investor
                        </Label>
                        <Select
                          value={alloc.investorId}
                          onValueChange={(v) => updateAllocation(idx, 'investorId', v)}
                        >
                          <SelectTrigger className="h-10 rounded-xl text-xs bg-white/[0.04] border-white/[0.08] focus:border-white/15 focus:ring-0" style={{ color: c.foreground }}>
                            <SelectValue placeholder="Pilih investor..." />
                          </SelectTrigger>
                          <SelectContent>
                            {investors.map((inv) => (
                              <SelectItem key={inv.id} value={inv.id}>
                                <span className="flex items-center gap-1.5">
                                  <Users className="h-3 w-3" style={{ color: c.primary }} />
                                  {inv.name}
                                </span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {/* Amount */}
                    <div className="space-y-1">
                      <Label className="text-[10px] font-medium" style={{ color: c.muted }}>
                        Jumlah
                      </Label>
                      <Input
                        type="number"
                        value={alloc.amount}
                        onChange={(e) => updateAllocation(idx, 'amount', e.target.value)}
                        placeholder="0"
                        min="0"
                        className="h-10 rounded-xl text-xs tabular-nums bg-white/[0.04] border-white/[0.08] focus:border-white/15 focus:ring-0"
                        style={{ color: c.foreground }}
                      />
                    </div>

                    {/* Description (optional) */}
                    <div className="space-y-1">
                      <Label className="text-[10px] font-medium" style={{ color: c.muted }}>
                        Keterangan <span style={{ opacity: 0.5 }}>(opsional)</span>
                      </Label>
                      <Input
                        value={alloc.description}
                        onChange={(e) => updateAllocation(idx, 'description', e.target.value)}
                        placeholder="Catatan alokasi..."
                        className="h-10 rounded-xl text-xs bg-white/[0.04] border-white/[0.08] focus:border-white/15 focus:ring-0"
                        style={{ color: c.foreground }}
                      />
                    </div>
                  </div>
                ))}

                {/* Add Allocation Button */}
                <Button
                  type="button"
                  variant="outline"
                  className="w-full h-10 rounded-lg text-xs border-dashed"
                  style={{ borderColor: c.border, color: c.muted }}
                  onClick={addAllocation}
                >
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  Tambah Alokasi
                </Button>

                {/* Allocation Summary */}
                {budgetAmount > 0 && (
                  <div className="rounded-lg p-2.5 border" style={{
                    borderColor: allocationExceeds ? c.destructive : c.border,
                    background: allocationExceeds ? alpha(c.destructive, 5) : alpha(c.foreground, 1),
                  }}>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-medium" style={{ color: c.muted }}>
                        Total Alokasi / Anggaran
                      </span>
                      <span
                        className="text-xs font-bold tabular-nums"
                        style={{ color: allocationExceeds ? c.destructive : c.secondary }}
                      >
                        {formatAmount(totalAllocated)} / {formatAmount(budgetAmount)}
                      </span>
                    </div>
                    {allocationExceeds && (
                      <div className="flex items-center gap-1 mt-1">
                        <AlertTriangle className="h-3 w-3" style={{ color: c.destructive }} />
                        <span className="text-[10px] font-medium" style={{ color: c.destructive }}>
                          Total alokasi melebihi anggaran sebesar{' '}
                          {formatAmount(totalAllocated - budgetAmount)}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="h-px bg-white/[0.06]" />

            {/* ═══ Section 3: Catatan ═══ */}
            <div>
              <SectionHeader icon={Info} label="Catatan" />

              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
                placeholder="Catatan tambahan (opsional)..."
                className="rounded-xl text-sm resize-none min-h-[70px] bg-white/[0.04] border-white/[0.08] focus:border-white/15 focus:ring-0"
                style={{ color: c.foreground }}
              />
            </div>

            {/* ═══ Footer ═══ */}
            <DialogFooter className="gap-2 pt-1 px-5 pb-5">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setDialogOpen(false)}
                className="rounded-xl text-xs h-10 hover:bg-white/[0.06]"
                style={{ color: c.foreground }}
              >
                {t('common.cancel')}
              </Button>
              <Button
                type="submit"
                disabled={
                  saving ||
                  !formData.categoryName.trim() ||
                  !formData.amount ||
                  parseFloat(formData.amount) <= 0
                }
                className="rounded-xl text-xs h-10 text-white"
                style={{ background: 'linear-gradient(135deg, var(--secondary), var(--primary))' }}
              >
                {saving && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                {t('common.save')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ═══ DELETE CONFIRMATION ═══ */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent
          className="bg-[#141414] border-white/[0.08] rounded-2xl p-0 overflow-hidden w-[calc(100%-1.5rem)] sm:max-w-[400px]"
          style={{ boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }}
        >
          <div className="h-px bg-white/[0.06]" />
          <AlertDialogHeader className="p-5 pb-0">
            <AlertDialogTitle className="text-sm font-semibold flex items-center gap-2" style={{ color: c.foreground }}>
              <AlertTriangle className="h-4 w-4" style={{ color: c.destructive }} />
              Hapus Anggaran
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs" style={{ color: c.muted }}>
              Apakah Anda yakin ingin menghapus anggaran ini? Tindakan ini tidak dapat dibatalkan dan semua alokasi dana terkait juga akan dihapus.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 p-5 pt-3">
            <AlertDialogCancel
              className="rounded-xl text-xs h-10 hover:bg-white/[0.06]"
              style={{ color: c.foreground }}
            >
              Batal
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="rounded-xl text-xs h-10"
              style={{ background: c.destructive, color: 'white' }}
            >
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <style>{`
        @keyframes heroGlow { 0%, 100% { opacity: 0.3; } 50% { opacity: 0.6; } }
        @keyframes shimmer { 0% { transform: translateX(-150%); } 100% { transform: translateX(250%); } }
      `}</style>
    </div>
  );
}
