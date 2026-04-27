'use client';

import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useBusinessStore } from '@/store/useBusinessStore';
import { useTranslation } from '@/hooks/useTranslation';
import { useCurrencyFormat } from '@/hooks/useCurrencyFormat';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
  Plus,
  Pencil,
  Trash2,
  Wallet,
  PiggyBank,
  ArrowDownToLine,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  Users,
  HandCoins,
  Percent,
  Inbox,
  Banknote,
  CircleDollarSign,
  UserPlus,
  Phone,
  Mail,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Search,
  CalendarDays,
  MessageCircle,
  ChevronRight,
  Info,
  X,
  Tag,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { DynamicIcon } from '@/components/shared/DynamicIcon';
import { Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, parseISO, differenceInDays } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';

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

/** Create a color with alpha using color-mix (for use in inline styles) */
const alpha = (color: string, pct: number) => `color-mix(in srgb, ${color} ${pct}%, transparent)`;

const inputCls = 'bg-transparent border text-white placeholder:text-white/30 rounded-lg focus:ring-1';

// ─── Animated Counter Hook ──────────────────────────────────────────
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

// ─── Types ──────────────────────────────────────────────────────────
interface CashEntry {
  id: string;
  description: string;
  amount: number;
  date: string;
  type: 'kas_besar' | 'kas_kecil' | 'kas_keluar';
  category: string | null;
  notes?: string;
  referenceId?: string | null;
  source?: string | null;
  investorId?: string | null;
}

interface Investor {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address?: string | null;
  notes?: string | null;
  totalInvestment: number;
  profitSharePct: number;
  status: string;
  joinDate: string;
}

interface Debt {
  id: string;
  type: string;
  counterpart: string;
  amount: number;
  remaining: number;
  dueDate: string | null;
  description: string | null;
  status: string;
  downPayment: number | null;
  installmentAmount: number | null;
  installmentPeriod: number | null;
}

interface DebtPayment {
  id: string;
  debtId: string;
  amount: number;
  paymentDate: string;
  paymentMethod: string | null;
  notes: string | null;
  createdAt: string;
}

interface Category {
  id: string;
  name: string;
  type: string;
  color?: string | null;
  icon?: string | null;
}

interface InvestorHistoryItem {
  id: string;
  date: string;
  type: 'modal_masuk' | 'dp_penjualan' | 'penjualan_lunas' | 'cicilan_diterima';
  description: string;
  amount: number;
  investorId?: string;
  investorName?: string;
  saleId?: string;
  customerName?: string;
}

interface SaleItem {
  id: string;
  description: string;
  amount: number;
  date: string;
  paymentMethod: string | null;
  downPayment: number | null;
  installmentTempo: number | null;
  installmentAmount: number | null;
  investorSharePct: number | null;
  realizedAmount?: number;
  customer?: { id: string; name: string } | null;
}

// ─── Constants ──────────────────────────────────────────────────────
const CASH_SUB_TYPES = {
  kas_besar: {
    label: 'biz.kasBesar',
    color: c.secondary,
    icon: Wallet,
  },
  kas_kecil: {
    label: 'biz.kasKecil',
    color: c.primary,
    icon: PiggyBank,
  },
  kas_keluar: {
    label: 'biz.kasKeluar',
    color: c.destructive,
    icon: ArrowDownToLine,
  },
} as const;

type CashSubType = keyof typeof CASH_SUB_TYPES;

const PIUTANG_STATUS_CONFIG = {
  berjalan: {
    label: 'Berjalan',
    statuses: ['active', 'partially_paid'],
    color: c.secondary,
    icon: Clock,
  },
  macet: {
    label: 'Macet',
    statuses: ['overdue'],
    color: c.destructive,
    icon: AlertTriangle,
  },
  selesai: {
    label: 'Selesai',
    statuses: ['paid'],
    color: c.primary,
    icon: CheckCircle2,
  },
} as const;

type PiutangSubTab = keyof typeof PIUTANG_STATUS_CONFIG;

const PERIOD_OPTIONS = [
  { value: 'day' as const, label: 'Hari' },
  { value: 'week' as const, label: 'Minggu' },
  { value: 'month' as const, label: 'Bulan' },
  { value: 'year' as const, label: 'Tahun' },
];

// ─── Mini Cash Sparkline (CSS transitions, no framer-motion) ──────
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

// ─── Helpers ────────────────────────────────────────────────────────
function formatDate(dateStr: string): string {
  try {
    const parsed = parseISO(dateStr);
    return format(parsed, 'd MMM yyyy', { locale: idLocale });
  } catch {
    return new Date(dateStr).toLocaleDateString();
  }
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

function getStatusConfig(status: string): { label: string; color: string; textClass: string } {
  switch (status) {
    case 'active':
      return { label: 'Aktif', color: c.secondary, textClass: '' };
    case 'partially_paid':
      return { label: 'Sebagian', color: c.warning, textClass: '' };
    case 'paid':
      return { label: 'Lunas', color: c.primary, textClass: '' };
    case 'overdue':
      return { label: 'Jatuh Tempo', color: c.destructive, textClass: '' };
    default:
      return { label: status, color: '#999', textClass: '' };
  }
}

// ─── Empty State ──────────────────────────────────────────────────
function EmptyState({
  icon,
  accentColor,
  title,
  description,
  onAction,
  actionLabel,
}: {
  icon: React.ReactNode;
  accentColor: string;
  title: string;
  description: string;
  onAction?: () => void;
  actionLabel?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-6">
      <div className="relative mb-4 w-16 h-16 rounded-xl flex items-center justify-center bg-card border border-border">
        {icon}
      </div>
      <p className="text-sm font-medium text-muted-foreground">{title}</p>
      <p className="text-xs mt-1 text-center max-w-[220px] text-muted-foreground">{description}</p>
      {onAction && actionLabel && (
        <Button
          onClick={onAction}
          size="sm"
          variant="outline"
          className="mt-4 rounded-lg h-8 border-0"
          style={{ backgroundColor: alpha(accentColor, 8), color: accentColor, borderColor: alpha(accentColor, 20) }}
        >
          <Plus className="h-3.5 w-3.5 mr-1" />
          {actionLabel}
        </Button>
      )}
    </div>
  );
}

// ─── Donut Chart Component ───────────────────────────────────────
function DonutChart({ segments, size = 120 }: {
  segments: Array<{ label: string; value: number; color: string }>;
  size?: number;
}) {
  const total = segments.reduce((s, seg) => s + seg.value, 0);
  if (total === 0) {
    return (
      <div className="relative" style={{ width: size, height: size }}>
        <div className="rounded-full flex items-center justify-center bg-border"
          style={{ width: size, height: size }}>
          <span className="text-[10px] text-muted-foreground">No data</span>
        </div>
      </div>
    );
  }
  const gradientParts: string[] = [];
  let accumulated = 0;
  for (const seg of segments) {
    if (seg.value <= 0) continue;
    const start = accumulated;
    const end = accumulated + (seg.value / total) * 100;
    gradientParts.push(`${seg.color} ${start}% ${end}%`);
    accumulated = end;
  }
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <div
        className="rounded-full"
        style={{
          width: size,
          height: size,
          background: `conic-gradient(${gradientParts.join(', ')})`,
        }}
      />
      <div
        className="absolute rounded-full flex items-center justify-center bg-card"
        style={{
          width: size * 0.65,
          height: size * 0.65,
          top: size * 0.175,
          left: size * 0.175,
        }}
      >
        <div className="text-center">
          <p className="text-[9px] uppercase text-muted-foreground">Total</p>
          <p className="text-[10px] font-bold text-foreground">
            {formatCompactAmount(total)}
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────
export default function BusinessCash() {
  const { t } = useTranslation();
  const { activeBusiness } = useBusinessStore();
  const { formatAmount } = useCurrencyFormat();
  const businessId = activeBusiness?.id;

  // ── Main Tab State ──
  type MainTab = 'arus_kas' | 'investor' | 'piutang';
  const [mainTab, setMainTab] = useState<MainTab>('arus_kas');

  // ── Arus Kas State ──
  const [cashSubTab, setCashSubTab] = useState<CashSubType>('kas_besar');
  const [cashPeriod, setCashPeriod] = useState<'day' | 'week' | 'month' | 'year'>('month');
  const [cashEntries, setCashEntries] = useState<CashEntry[]>([]);
  const [incomeTotal, setIncomeTotal] = useState<number>(0);
  const [expenseTotal, setExpenseTotal] = useState<number>(0);
  const [cashLoading, setCashLoading] = useState(true);
  const [cashDialogOpen, setCashDialogOpen] = useState(false);
  const [editingCashEntry, setEditingCashEntry] = useState<CashEntry | null>(null);
  const [cashForm, setCashForm] = useState({
    description: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    type: 'kas_besar' as CashSubType,
    category: '',
    notes: '',
    source: '' as 'kas_besar' | 'kas_kecil' | 'investor' | '',
    investorId: '',
  });
  const [cashSaving, setCashSaving] = useState(false);
  const [cashDeleteId, setCashDeleteId] = useState<string | null>(null);
  const [cashCategories, setCashCategories] = useState<Category[]>([]);
  const [cashSearch, setCashSearch] = useState('');
  const [cashPageSize, setCashPageSize] = useState(10);
  const [searchMode, setSearchMode] = useState(false);

  // ── Quick Add State ──
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [quickForm, setQuickForm] = useState({ description: '', amount: '' });
  const [quickSaving, setQuickSaving] = useState(false);

  // ── Category Management State ──
  const [newCategoryName, setNewCategoryName] = useState('');
  const [categorySaving, setCategorySaving] = useState(false);

  // ── Investor History State ──
  const [investorHistory, setInvestorHistory] = useState<InvestorHistoryItem[]>([]);

  // ── Sales Data (Arus Kas) ──
  const [salesData, setSalesData] = useState<SaleItem[]>([]);

  // ── Investor State ──
  const [investors, setInvestors] = useState<Investor[]>([]);
  const [investorSummary, setInvestorSummary] = useState({
    activeCount: 0,
    totalInvestment: 0,
    avgSharePct: 0,
  });
  const [investorLoading, setInvestorLoading] = useState(true);
  const [investorDialogOpen, setInvestorDialogOpen] = useState(false);
  const [investorSaving, setInvestorSaving] = useState(false);
  const [editingInvestor, setEditingInvestor] = useState<Investor | null>(null);
  const [investorForm, setInvestorForm] = useState({
    name: '',
    phone: '',
    email: '',
    totalInvestment: '',
    profitSharePct: '',
  });

  // ── Piutang State ──
  const [piutangSubTab, setPiutangSubTab] = useState<PiutangSubTab>('berjalan');
  const [allDebts, setAllDebts] = useState<Debt[]>([]);
  const [piutangLoading, setPiutangLoading] = useState(true);

  // ── Piutang Enhanced State ──
  const [paymentDialogDebt, setPaymentDialogDebt] = useState<Debt | null>(null);
  const [detailDialogDebt, setDetailDialogDebt] = useState<Debt | null>(null);
  const [debtPayments, setDebtPayments] = useState<Record<string, DebtPayment[]>>({});
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    paymentDate: new Date().toISOString().split('T')[0],
    paymentMethod: 'transfer' as 'transfer' | 'cash' | 'qris',
    notes: '',
  });
  const [paymentSaving, setPaymentSaving] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [piutangSearch, setPiutangSearch] = useState('');

  // ── Tab Switcher Dialog State ──
  const [tabSwitcherOpen, setTabSwitcherOpen] = useState(false);

  // ── Source Balance State ──
  const [sourceBalances, setSourceBalances] = useState({
    kasBesarSaldo: 0,
    kasKecilSaldo: 0,
    investorSaldo: 0,
  });

  // ── Animated Counters (Arus Kas) ──
  const animIncome = useAnimatedCounter(incomeTotal);
  const animExpense = useAnimatedCounter(expenseTotal);
  const animNet = useAnimatedCounter(incomeTotal - expenseTotal);

  // ── Animated Counters (Investor) ──
  const animTotalInvestment = useAnimatedCounter(investorSummary.totalInvestment);
  const animAvgShare = useAnimatedCounter(investorSummary.avgSharePct, 600);

  // ══════════════════════════════════════════════════════════════════
  // ── Data Fetching ─────────────────────────────────────────────────
  // ══════════════════════════════════════════════════════════════════

  const fetchAllCashData = useCallback(() => {
    if (!businessId) return;
    setCashLoading(true);

    Promise.all([
      fetch(`/api/business/${businessId}/cash?type=kas_besar&period=${cashPeriod}`).then((r) =>
        r.ok ? r.json() : { cashEntries: [], total: 0 }
      ),
      fetch(`/api/business/${businessId}/cash?type=kas_kecil&period=${cashPeriod}`).then((r) =>
        r.ok ? r.json() : { cashEntries: [], total: 0 }
      ),
      fetch(`/api/business/${businessId}/cash?type=kas_keluar&period=${cashPeriod}`).then((r) =>
        r.ok ? r.json() : { cashEntries: [], total: 0 }
      ),
      fetch(`/api/business/${businessId}/categories?type=pengeluaran`).then((r) =>
        r.ok ? r.json() : { categories: [] }
      ),
      fetch(`/api/business/${businessId}/sales?pageSize=20`).then((r) =>
        r.ok ? r.json() : { sales: [], summary: {} }
      ),
      fetch(`/api/business/${businessId}/cash?summary=true`).then((r) =>
        r.ok ? r.json() : {}
      ) as Promise<Record<string, number>>,
    ])
      .then(([besarData, kecilData, keluarData, catData, salesRes, summaryData]) => {
        const besarEntries: CashEntry[] = besarData?.cashEntries || [];
        const kecilEntries: CashEntry[] = kecilData?.cashEntries || [];
        const keluarEntries: CashEntry[] = keluarData?.cashEntries || [];
        const allEntries = [...besarEntries, ...kecilEntries, ...keluarEntries];
        setCashEntries(allEntries);
        const inc = (besarData?.total || 0) + (kecilData?.total || 0) + investorSummary.totalInvestment;
        const exp = keluarData?.total || 0;
        setIncomeTotal(inc);
        setExpenseTotal(exp);
        setCashCategories(catData?.categories || []);
        setSalesData(salesRes?.sales || []);
        // Update source balances for validation
        if (summaryData) {
          setSourceBalances({
            kasBesarSaldo: summaryData.kasBesarSaldo || 0,
            kasKecilSaldo: summaryData.kasKecilSaldo || 0,
            investorSaldo: summaryData.investorSaldo || 0,
          });
        }
      })
      .catch(() => {
        setCashEntries([]);
        setIncomeTotal(0);
        setExpenseTotal(0);
        setCashCategories([]);
        setSalesData([]);
      })
      .finally(() => setCashLoading(false));
  }, [businessId, cashSubTab, cashPeriod, investorSummary.totalInvestment]);

  const fetchInvestors = useCallback(() => {
    if (!businessId) return;
    setInvestorLoading(true);
    fetch(`/api/business/${businessId}/investors`)
      .then((r) => (r.ok ? r.json() : { investors: [], summary: {} }))
      .then((result) => {
        setInvestors(result?.investors || []);
        setInvestorSummary(result?.summary || { activeCount: 0, totalInvestment: 0, avgSharePct: 0 });
        setInvestorHistory(result?.investorHistory || []);
      })
      .catch(() => {
        setInvestors([]);
        setInvestorSummary({ activeCount: 0, totalInvestment: 0, avgSharePct: 0 });
        setInvestorHistory([]);
      })
      .finally(() => setInvestorLoading(false));
  }, [businessId]);

  const fetchDebts = useCallback(() => {
    if (!businessId) return;
    setPiutangLoading(true);
    fetch(`/api/business/${businessId}/debts`)
      .then((r) => (r.ok ? r.json() : { debts: [] }))
      .then((result) => {
        setAllDebts(result?.debts || []);
      })
      .catch(() => setAllDebts([]))
      .finally(() => setPiutangLoading(false));
  }, [businessId]);

  const fetchDebtPayments = useCallback(async (debtId: string) => {
    if (!businessId) return;
    try {
      const res = await fetch(`/api/business/${businessId}/debts/${debtId}/payments`);
      if (res.ok) {
        const data = await res.json();
        setDebtPayments((prev) => ({ ...prev, [debtId]: data.payments || [] }));
        return data.payments || [];
      }
    } catch {
      // ignore
    }
    return [];
  }, [businessId]);

  const recordPayment = async () => {
    if (!businessId || !paymentDialogDebt || !paymentForm.amount) return;
    const numAmount = parseFloat(paymentForm.amount);
    if (isNaN(numAmount) || numAmount <= 0) return;
    setPaymentSaving(true);
    try {
      const res = await fetch(`/api/business/${businessId}/debts/${paymentDialogDebt.id}/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: numAmount,
          paymentDate: paymentForm.paymentDate,
          paymentMethod: paymentForm.paymentMethod,
          notes: paymentForm.notes || undefined,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success('Pembayaran berhasil dicatat');
      setPaymentDialogDebt(null);
      setPaymentForm({
        amount: '',
        paymentDate: new Date().toISOString().split('T')[0],
        paymentMethod: 'transfer',
        notes: '',
      });
      fetchDebts();
    } catch {
      toast.error(t('common.error'));
    } finally {
      setPaymentSaving(false);
    }
  };

  const sendReminder = async (debt: Debt) => {
    if (!businessId) return;
    try {
      const res = await fetch(`/api/business/${businessId}/debts/${debt.id}/remind`, {
        method: 'POST',
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Gagal mengirim pengingat');
      }
      const data = await res.json();
      if (data.message) {
        // Use <a> click trick for reliable mobile + desktop redirect
        const a = document.createElement('a');
        a.href = data.message;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('common.error'));
    }
  };

  const openDetailDialog = async (debt: Debt) => {
    setDetailDialogDebt(debt);
    setDetailLoading(true);
    await fetchDebtPayments(debt.id);
    setDetailLoading(false);
  };

  // Fetch on mount and tab change
  useEffect(() => {
    if (businessId) {
      fetchAllCashData();
      fetchInvestors();
      fetchDebts();
    } else {
      setCashLoading(false);
      setInvestorLoading(false);
      setPiutangLoading(false);
    }
  }, [businessId, mainTab]);

  useEffect(() => {
    if (businessId && mainTab === 'arus_kas') {
      fetchAllCashData();
    }
  }, [businessId, cashSubTab, cashPeriod, mainTab, fetchAllCashData]);

  // ══════════════════════════════════════════════════════════════════
  // ── Derived Data ──────────────────────────────────────────────────
  // ══════════════════════════════════════════════════════════════════

  // Reset page size and search mode when sub-tab or search changes
  useEffect(() => {
    setCashPageSize(10);
  }, [cashSubTab]);

  useEffect(() => {
    if (!cashSearch.trim()) {
      setSearchMode(false);
      setCashPageSize(10);
    } else {
      // Check if search has matches in other tabs
      const q = cashSearch.toLowerCase();
      const matchesAll = cashEntries.filter(
        (e) =>
          e.description.toLowerCase().includes(q) ||
          (e.category && e.category.toLowerCase().includes(q)) ||
          (e.notes && e.notes.toLowerCase().includes(q))
      );
      const matchesCurrentTab = matchesAll.filter((e) => e.type === cashSubTab);
      const hasOtherTabMatches = matchesAll.length > matchesCurrentTab.length;
      setSearchMode(hasOtherTabMatches);
      setCashPageSize(10);
    }
  }, [cashSearch, cashEntries, cashSubTab]);

  const filteredCashEntries = useMemo(() => {
    let entries = searchMode
      ? [...cashEntries]
      : cashEntries.filter((e) => e.type === cashSubTab);
    if (cashSearch.trim()) {
      const q = cashSearch.toLowerCase();
      entries = entries.filter(
        (e) =>
          e.description.toLowerCase().includes(q) ||
          (e.category && e.category.toLowerCase().includes(q)) ||
          (e.notes && e.notes.toLowerCase().includes(q))
      );
    }
    return entries;
  }, [cashEntries, cashSubTab, cashSearch, searchMode]);

  const currentCashSubTotal = useMemo(() => {
    return filteredCashEntries.reduce((sum, e) => sum + e.amount, 0);
  }, [filteredCashEntries]);

  // Donut chart data
  const donutSegments = useMemo(() => {
    const kasBesarTotal = cashEntries
      .filter((e) => e.type === 'kas_besar' && e.source !== 'investor')
      .reduce((s, e) => s + e.amount, 0);
    const kasKecilTotal = cashEntries
      .filter((e) => e.type === 'kas_kecil')
      .reduce((s, e) => s + e.amount, 0);
    return [
      { label: 'Dana Investor', value: investorSummary.totalInvestment, color: c.primary },
      { label: 'Modal Kas Besar', value: kasBesarTotal, color: c.secondary },
      { label: 'Modal Kas Kecil', value: kasKecilTotal, color: c.warning },
    ];
  }, [cashEntries, investorSummary.totalInvestment]);

  const piutangDebts = useMemo(() => {
    let debts = allDebts.filter(
      (d) =>
        d.type === 'piutang' &&
        PIUTANG_STATUS_CONFIG[piutangSubTab].statuses.includes(d.status as never)
    );
    if (piutangSearch.trim()) {
      const q = piutangSearch.toLowerCase();
      debts = debts.filter(
        (d) =>
          d.counterpart.toLowerCase().includes(q) ||
          (d.description && d.description.toLowerCase().includes(q))
      );
    }
    return debts;
  }, [allDebts, piutangSubTab, piutangSearch]);

  const allPiutang = useMemo(() => allDebts.filter((d) => d.type === 'piutang'), [allDebts]);

  const piutangStats = useMemo(() => {
    const berjalan = allPiutang.filter((d) =>
      ['active', 'partially_paid'].includes(d.status)
    );
    const macet = allPiutang.filter((d) => d.status === 'overdue');
    const selesai = allPiutang.filter((d) => d.status === 'paid');
    const totalPaid = allPiutang.reduce((s, d) => s + (d.amount - d.remaining), 0);
    const totalRemaining = berjalan.reduce((s, d) => s + d.remaining, 0);
    const overdueCount = macet.length;
    return {
      total: allPiutang.reduce((s, d) => s + d.amount, 0),
      totalPaid,
      totalRemaining,
      overdueCount,
      berjalanCount: berjalan.length,
      berjalanRemaining: berjalan.reduce((s, d) => s + d.remaining, 0),
      macetCount: macet.length,
      macetRemaining: macet.reduce((s, d) => s + d.remaining, 0),
      selesaiCount: selesai.length,
      selesaiAmount: selesai.reduce((s, d) => s + d.amount, 0),
    };
  }, [allPiutang]);

  const getDebtPaidAmount = useCallback((debtId: string): number => {
    const payments = debtPayments[debtId];
    if (!payments || payments.length === 0) {
      const debt = allDebts.find((d) => d.id === debtId);
      return debt ? (debt.amount - debt.remaining) : 0;
    }
    return payments.reduce((sum, p) => sum + p.amount, 0);
  }, [debtPayments, allDebts]);

  const getPaymentScore = useCallback((debt: Debt): { score: number; label: string; color: string } => {
    const payments = debtPayments[debt.id] || [];
    if (payments.length === 0) {
      if (debt.dueDate && debt.status !== 'paid') {
        const days = differenceInDays(new Date(), parseISO(debt.dueDate));
        if (days > 0) {
          return { score: 0, label: 'Belum Bayar', color: c.destructive };
        }
      }
      return { score: 50, label: 'Menunggu Pembayaran', color: c.warning };
    }
    const sortedPayments = [...payments].sort(
      (a, b) => new Date(a.paymentDate).getTime() - new Date(b.paymentDate).getTime()
    );
    const latestPayment = sortedPayments[sortedPayments.length - 1];
    if (!debt.dueDate) {
      return { score: 75, label: 'Agak Terlambat', color: c.warning };
    }
    const dueDate = parseISO(debt.dueDate);
    const payDate = new Date(latestPayment.paymentDate);
    const diffDays = differenceInDays(payDate, dueDate);
    if (diffDays <= 0) {
      return { score: 100, label: 'Tepat Waktu', color: c.secondary };
    } else if (diffDays <= 7) {
      return { score: 75, label: 'Agak Terlambat', color: c.warning };
    } else {
      return { score: 50, label: 'Terlambat', color: c.destructive };
    }
  }, [debtPayments]);

  const cashflowRealization = useMemo(() => {
    const totalPiutangRemaining = allPiutang
      .filter((d) => d.status !== 'paid')
      .reduce((s, d) => s + d.remaining, 0);
    return {
      pendapatanTercatat: piutangStats.total,
      sudahDiterima: piutangStats.totalPaid,
      belumDiterima: totalPiutangRemaining,
    };
  }, [allPiutang, piutangStats]);

  // Helper: get source label for table
  const getEntrySourceLabel = useCallback((entry: CashEntry): { label: string; color: string } => {
    if (entry.source === 'investor' && entry.investorId) {
      const inv = investors.find((i) => i.id === entry.investorId);
      return { label: inv ? inv.name : 'Investor', color: c.primary };
    }
    if (entry.source === 'kas_besar') {
      return { label: 'Kas Besar', color: c.secondary };
    }
    if (entry.source === 'kas_kecil') {
      return { label: 'Kas Kecil', color: c.warning };
    }
    // Default based on type
    if (entry.type === 'kas_besar') return { label: 'Kas Besar', color: c.secondary };
    if (entry.type === 'kas_kecil') return { label: 'Kas Kecil', color: c.warning };
    return { label: '—', color: c.muted };
  }, [investors]);

  // ── Cash CRUD ──
  const openCashCreate = () => {
    setEditingCashEntry(null);
    let defaultSource: 'kas_besar' | 'kas_kecil' | 'investor' | '' = '';
    if (cashSubTab === 'kas_kecil') defaultSource = 'kas_besar';
    if (cashSubTab === 'kas_keluar') defaultSource = 'kas_kecil';
    setCashForm({
      description: '',
      amount: '',
      date: new Date().toISOString().split('T')[0],
      type: cashSubTab,
      category: '',
      notes: '',
      source: defaultSource,
      investorId: '',
    });
    setCashDialogOpen(true);
  };

  const openCashEdit = (entry: CashEntry) => {
    setEditingCashEntry(entry);
    setCashForm({
      description: entry.description,
      amount: entry.amount.toString(),
      date: entry.date.split('T')[0],
      type: entry.type as CashSubType,
      category: entry.category || '',
      notes: entry.notes || '',
      source: (entry.source as 'kas_besar' | 'kas_kecil' | 'investor') || '',
      investorId: entry.investorId || '',
    });
    setCashDialogOpen(true);
  };

  const handleCashSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessId || !cashForm.description || !cashForm.amount) return;

    // Client-side balance validation for kas_keluar
    if (cashForm.type === 'kas_keluar' && cashForm.source) {
      const numAmount = parseFloat(cashForm.amount);
      let currentSaldo = 0;
      let sourceLabel = '';
      if (cashForm.source === 'kas_besar') {
        currentSaldo = sourceBalances.kasBesarSaldo;
        sourceLabel = 'Kas Besar';
      } else if (cashForm.source === 'kas_kecil') {
        currentSaldo = sourceBalances.kasKecilSaldo;
        sourceLabel = 'Kas Kecil';
      } else if (cashForm.source === 'investor') {
        currentSaldo = sourceBalances.investorSaldo;
        sourceLabel = 'Dana Investor';
      }
      if (numAmount > currentSaldo) {
        toast.error(`Saldo ${sourceLabel} tidak mencukupi (Sisa: ${formatAmount(currentSaldo)})`);
        return;
      }
    }

    setCashSaving(true);
    try {
      const url = editingCashEntry
        ? `/api/business/${businessId}/cash/${editingCashEntry.id}`
        : `/api/business/${businessId}/cash`;
      const body: Record<string, unknown> = {
        type: cashForm.type,
        amount: parseFloat(cashForm.amount),
        description: cashForm.description,
        category: cashForm.category || undefined,
        date: cashForm.date,
        notes: cashForm.notes || undefined,
      };
      // Include source fields for kas_kecil and kas_keluar
      if (cashForm.type === 'kas_kecil' || cashForm.type === 'kas_keluar') {
        if (cashForm.source) {
          body.source = cashForm.source;
          if (cashForm.source === 'investor' && cashForm.investorId) {
            body.investorId = cashForm.investorId;
          }
        }
      }
      const res = await fetch(url, {
        method: editingCashEntry ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        if (errData.code === 'INSUFFICIENT_BALANCE') {
          toast.error(errData.error || 'Saldo tidak mencukupi');
        } else {
          throw new Error();
        }
        return;
      }
      toast.success(editingCashEntry ? t('biz.businessUpdated') : t('biz.businessCreated'));
      setCashDialogOpen(false);
      fetchAllCashData();
    } catch {
      toast.error(t('common.error'));
    } finally {
      setCashSaving(false);
    }
  };

  const handleCashDelete = async () => {
    if (!businessId || !cashDeleteId) return;
    try {
      const res = await fetch(`/api/business/${businessId}/cash/${cashDeleteId}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error();
      toast.success(t('biz.businessUpdated'));
      fetchAllCashData();
    } catch {
      toast.error(t('common.error'));
    } finally {
      setCashDeleteId(null);
    }
  };

  // ── Quick Add Handler ──
  const handleQuickAddSave = async () => {
    if (!businessId || !quickForm.description || !quickForm.amount) return;
    const numAmount = parseFloat(quickForm.amount);
    if (isNaN(numAmount) || numAmount <= 0) return;

    // Balance validation for quick add (kas_keluar)
    if (cashSubTab === 'kas_keluar') {
      let defaultSource: 'kas_besar' | 'kas_kecil' | 'investor' | '' = 'kas_kecil';
      let currentSaldo = sourceBalances.kasKecilSaldo;
      let sourceLabel = 'Kas Kecil';
      if (numAmount > currentSaldo) {
        toast.error(`Saldo ${sourceLabel} tidak mencukupi (Sisa: ${formatAmount(currentSaldo)})`);
        return;
      }
    }

    setQuickSaving(true);
    try {
      let defaultSource: 'kas_besar' | 'kas_kecil' | 'investor' | '' = '';
      if (cashSubTab === 'kas_kecil') defaultSource = 'kas_besar';
      if (cashSubTab === 'kas_keluar') defaultSource = 'kas_kecil';

      const body: Record<string, unknown> = {
        type: cashSubTab,
        amount: numAmount,
        description: quickForm.description,
        date: new Date().toISOString().split('T')[0],
        category: '',
        notes: '',
      };
      if (defaultSource) {
        body.source = defaultSource;
      }

      const res = await fetch(`/api/business/${businessId}/cash`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        if (errData.code === 'INSUFFICIENT_BALANCE') {
          toast.error(errData.error || 'Saldo tidak mencukupi');
        } else {
          throw new Error();
        }
        return;
      }
      toast.success(t('biz.businessCreated'));
      setQuickForm({ description: '', amount: '' });
      setQuickAddOpen(false);
      fetchAllCashData();
    } catch {
      toast.error(t('common.error'));
    } finally {
      setQuickSaving(false);
    }
  };

  // ── Category CRUD ──
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [selectedCategoryIcon, setSelectedCategoryIcon] = useState('Tag');
  const ICON_PICKER_OPTIONS = [
    'Tag', 'ShoppingBag', 'Receipt', 'Briefcase', 'Car', 'Home', 'Laptop', 'Smartphone',
    'Coffee', 'UtensilsCrossed', 'Pill', 'Fuel', 'Truck', 'Wrench', 'Hammer', 'Paintbrush',
    'GraduationCap', 'BookOpen', 'Plane', 'Bus', 'Train', 'Heart', 'Dumbbell', 'Music',
    'Gamepad2', 'Camera', 'Tv', 'Headphones', 'Zap', 'Droplets', 'Flame', 'Leaf',
    'Gift', 'Shirt', 'Landmark', 'CreditCard', 'Banknote', 'Coins', 'FileText',
    'Lightbulb', 'Star', 'Package', 'Store', 'Building', 'Phone', 'Mail',
    'Stethoscope', 'Baby', 'Dog', 'TreePine', 'Umbrella', 'Trophy', 'Crown', 'Gem',
  ];

  const openCategoryDialog = () => {
    setNewCategoryName('');
    setSelectedCategoryIcon('Tag');
    setCategoryDialogOpen(true);
  };

  const handleAddCategoryFromDialog = async () => {
    if (!businessId || !newCategoryName.trim()) return;
    setCategorySaving(true);
    try {
      const res = await fetch(`/api/business/${businessId}/categories`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'pengeluaran', name: newCategoryName.trim(), color: '#03DAC6', icon: selectedCategoryIcon }),
      });
      if (!res.ok) throw new Error();
      toast.success('Kategori berhasil ditambahkan');
      setNewCategoryName('');
      setSelectedCategoryIcon('Tag');
      setCategoryDialogOpen(false);
      fetchAllCashData();
    } catch {
      toast.error(t('common.error'));
    } finally {
      setCategorySaving(false);
    }
  };

  const handleDeleteCategory = async (catId: string) => {
    if (!businessId) return;
    try {
      const res = await fetch(`/api/business/${businessId}/categories/${catId}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error();
      toast.success('Kategori berhasil dihapus');
      fetchAllCashData();
    } catch {
      toast.error(t('common.error'));
    }
  };

  // ── Investor CRUD ──
  const openInvestorCreate = () => {
    setEditingInvestor(null);
    setInvestorForm({ name: '', phone: '', email: '', totalInvestment: '', profitSharePct: '' });
    setInvestorDialogOpen(true);
  };

  const openInvestorEdit = (investor: Investor) => {
    setEditingInvestor(investor);
    setInvestorForm({
      name: investor.name,
      phone: investor.phone || '',
      email: investor.email || '',
      totalInvestment: investor.totalInvestment.toString(),
      profitSharePct: investor.profitSharePct.toString(),
    });
    setInvestorDialogOpen(true);
  };

  const handleInvestorSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessId || !investorForm.name) return;
    setInvestorSaving(true);
    try {
      const url = editingInvestor
        ? `/api/business/${businessId}/investors/${editingInvestor.id}`
        : `/api/business/${businessId}/investors`;
      const res = await fetch(url, {
        method: editingInvestor ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: investorForm.name,
          phone: investorForm.phone || undefined,
          email: investorForm.email || undefined,
          totalInvestment: parseFloat(investorForm.totalInvestment) || 0,
          profitSharePct: parseFloat(investorForm.profitSharePct) || 0,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success(editingInvestor ? 'Investor berhasil diperbarui' : 'Investor berhasil ditambahkan');
      setInvestorDialogOpen(false);
      fetchInvestors();
    } catch {
      toast.error(t('common.error'));
    } finally {
      setInvestorSaving(false);
    }
  };

  // ── Payment dialog open ──
  const openPaymentDialog = (debt: Debt) => {
    setPaymentDialogDebt(debt);
    setPaymentForm({
      amount: debt.installmentAmount ? debt.installmentAmount.toString() : debt.remaining.toString(),
      paymentDate: new Date().toISOString().split('T')[0],
      paymentMethod: 'transfer',
      notes: '',
    });
  };

  // ── Nominal previews ──
  const formattedCashNominal = useMemo(() => {
    const num = parseFloat(cashForm.amount);
    if (isNaN(num) || num <= 0) return '';
    return formatAmount(num);
  }, [cashForm.amount, formatAmount]);

  const formattedInvestorNominal = useMemo(() => {
    const num = parseFloat(investorForm.totalInvestment);
    if (isNaN(num) || num <= 0) return '';
    return formatAmount(num);
  }, [investorForm.totalInvestment, formatAmount]);

  const formattedPaymentNominal = useMemo(() => {
    const num = parseFloat(paymentForm.amount);
    if (isNaN(num) || num <= 0) return '';
    return formatAmount(num);
  }, [paymentForm.amount, formatAmount]);

  const activeInvestors = useMemo(() => investors.filter((i) => i.status === 'active'), [investors]);

  // ══════════════════════════════════════════════════════════════════
  // ── No Business Guard ─────────────────────────────────────────────
  // ══════════════════════════════════════════════════════════════════
  if (!businessId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
        <div className="h-12 w-12 rounded-xl flex items-center justify-center bg-card border border-border">
          <Banknote className="h-6 w-6 text-muted-foreground" />
        </div>
        <p className="text-sm text-center text-muted-foreground">{t('biz.registerFirst')}</p>
      </div>
    );
  }

  // ── Tab configs ──
  const mainTabs: Array<{
    key: MainTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    color: string;
  }> = [
    { key: 'arus_kas', label: 'Arus Kas', icon: TrendingUp, color: c.secondary },
    { key: 'investor', label: 'Investor', icon: Users, color: c.primary },
    { key: 'piutang', label: 'Piutang', icon: HandCoins, color: c.warning },
  ];

  const subTypeConfig = CASH_SUB_TYPES[cashSubTab];

  // ══════════════════════════════════════════════════════════════════
  // ── RENDER ────────────────────────────────────────────────────────
  // ══════════════════════════════════════════════════════════════════

  // Current tab info for floating button display
  const currentTabInfo = mainTabs.find((mt) => mt.key === mainTab)!;
  const CurrentTabIcon = currentTabInfo.icon;

  return (
    <div className="space-y-3">
      {/* ── Floating Tab Switcher Button ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <motion.button
            onClick={() => setTabSwitcherOpen(true)}
            className="flex items-center gap-2 px-3 py-2 rounded-xl border border-border bg-card hover:bg-muted/30 transition-all duration-200 group"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <div
              className="h-7 w-7 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: alpha(currentTabInfo.color, 12) }}
            >
              <span style={{ color: currentTabInfo.color }}><CurrentTabIcon className="h-3.5 w-3.5" /></span>
            </div>
            <span className="text-sm font-semibold" style={{ color: currentTabInfo.color }}>
              {currentTabInfo.label}
            </span>
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40 group-hover:text-muted-foreground/70 transition-colors" />
          </motion.button>
        </div>
      </div>

      {/* ── Tab Switcher Dialog ── */}
      <Dialog open={tabSwitcherOpen} onOpenChange={setTabSwitcherOpen}>
        <DialogContent className="bg-[#141414] border-white/[0.08] rounded-2xl p-0 overflow-hidden max-w-[calc(100%-2rem)] sm:max-w-sm">
          <DialogTitle className="sr-only">Pilih Halaman</DialogTitle>
          <DialogDescription className="sr-only">Pilih halaman cashflow yang ingin ditampilkan</DialogDescription>
          <div className="px-5 pt-5 pb-3">
            <p className="text-sm font-semibold text-foreground">Pilih Halaman</p>
            <p className="text-[11px] text-muted-foreground/50 mt-0.5">Pindah antar modul cashflow bisnis</p>
          </div>
          <div className="px-3 pb-4 space-y-2">
            {mainTabs.map((mt) => {
              const Icon = mt.icon;
              const isActive = mainTab === mt.key;
              return (
                <motion.button
                  key={mt.key}
                  onClick={() => {
                    setMainTab(mt.key);
                    setTabSwitcherOpen(false);
                  }}
                  className={cn(
                    'w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 text-left',
                    isActive ? '' : 'hover:bg-white/[0.03]'
                  )}
                  style={isActive ? {
                    background: alpha(mt.color, 10),
                    border: `1px solid ${alpha(mt.color, 20)}`,
                  } : {
                    background: 'transparent',
                    border: '1px solid transparent',
                  }}
                  whileHover={{ x: 4 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div
                    className="h-9 w-9 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: alpha(mt.color, isActive ? 18 : 8) }}
                  >
                    <span style={{ color: isActive ? mt.color : c.muted }}><Icon className="h-4 w-4" /></span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={cn('text-sm', isActive ? 'font-semibold' : 'font-medium')} style={{ color: isActive ? mt.color : c.foreground }}>
                      {mt.label}
                    </p>
                    <p className="text-[10px] text-muted-foreground/40 mt-0.5">
                      {mt.key === 'arus_kas' && 'Kelola arus kas besar, kecil & keluar'}
                      {mt.key === 'investor' && 'Data modal & profit sharing investor'}
                      {mt.key === 'piutang' && 'Kelola piutang, cicilan & pembayaran'}
                    </p>
                  </div>
                  {isActive && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="h-5 w-5 rounded-full flex items-center justify-center shrink-0"
                      style={{ background: alpha(mt.color, 20) }}
                    >
                      <CheckCircle2 className="h-3 w-3" style={{ color: mt.color }} />
                    </motion.div>
                  )}
                </motion.button>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

      <AnimatePresence mode="wait">
        {/* ══════════════════════════════════════════════════ */}
        {/* ── TAB 1: ARUS KAS ─────────────────────────────────────── */}
        {/* ══════════════════════════════════════════════════ */}
        {mainTab === 'arus_kas' && (
          <div key="arus_kas" className="space-y-3 p-3 sm:p-4">
            {/* ── Flow Summary — Merged Compact Card ── */}
            <Card className="rounded-xl overflow-hidden border border-border">
              <CardContent className="p-3 sm:p-4">
                {/* Row 1: Pemasukan vs Pengeluaran */}
                <div className="grid grid-cols-2 gap-2 sm:gap-3">
                  {/* Pemasukan */}
                  <div className="rounded-lg bg-secondary/5 p-2.5">
                    <div className="flex items-center gap-1.5 mb-1">
                      <ArrowUpRight className="h-3 w-3 text-secondary" />
                      <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">Pemasukan</span>
                    </div>
                    <p className="text-xs sm:text-sm font-bold tabular-nums text-secondary leading-tight">
                      {formatAmount(animIncome)}
                    </p>
                    <div className="mt-1.5">
                      <MiniCashSparkline color={c.secondary} value={animIncome} />
                    </div>
                  </div>
                  {/* Pengeluaran */}
                  <div className="rounded-lg bg-destructive/5 p-2.5">
                    <div className="flex items-center gap-1.5 mb-1">
                      <ArrowDownRight className="h-3 w-3 text-destructive" />
                      <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">Pengeluaran</span>
                    </div>
                    <p className="text-xs sm:text-sm font-bold tabular-nums text-destructive leading-tight">
                      {formatAmount(animExpense)}
                    </p>
                    <div className="mt-1.5">
                      <MiniCashSparkline color={c.destructive} value={animExpense} />
                    </div>
                  </div>
                </div>

                {/* Divider */}
                <div className="border-t border-border my-2.5" />

                {/* Row 2: Arus Bersih + Komposisi Dana */}
                <div className="flex gap-3 sm:gap-4 items-start">
                  {/* Arus Bersih */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-1">
                      <CircleDollarSign className={cn("h-3 w-3", animNet >= 0 ? "text-secondary" : "text-destructive")} />
                      <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">Arus Bersih</span>
                    </div>
                    <p className={cn("text-xs sm:text-sm font-bold tabular-nums leading-tight", animNet >= 0 ? "text-secondary" : "text-destructive")}>
                      {animNet >= 0 ? '+' : '-'}
                      {formatAmount(Math.abs(animNet))}
                    </p>
                    <div className="mt-1.5">
                      <MiniCashSparkline color={animNet >= 0 ? c.secondary : c.destructive} value={animNet} />
                    </div>
                  </div>

                  {/* Komposisi Dana — mini donut */}
                  <div className="flex-shrink-0">
                    <div className="flex items-center gap-1 mb-1.5">
                      <PieChartIcon className="h-3 w-3 text-primary" />
                      <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">Komposisi Dana</span>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <DonutChart segments={donutSegments} size={64} />
                      <div className="space-y-1">
                        {donutSegments.map((seg) => {
                          const total = donutSegments.reduce((s, d) => s + d.value, 0);
                          const pct = total > 0 ? ((seg.value / total) * 100).toFixed(0) : '0';
                          return (
                            <div key={seg.label} className="flex items-center gap-1.5">
                              <div className="h-1.5 w-1.5 rounded-sm shrink-0" style={{ backgroundColor: seg.color }} />
                              <span className="text-[9px] text-muted-foreground truncate max-w-[70px] sm:max-w-[90px]">{seg.label}</span>
                              <span className="text-[9px] font-semibold tabular-nums text-muted-foreground">{pct}%</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* ── Cashflow Realization Info Card ── */}
            {allPiutang.length > 0 && (
              <Card className="rounded-xl overflow-hidden border border-primary/15">
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-center gap-2 mb-2.5">
                    <div className="h-6 w-6 rounded-md flex items-center justify-center bg-primary/8">
                      <TrendingUp className="h-3 w-3 text-primary" />
                    </div>
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Realisasi Pendapatan
                    </span>
                  </div>
                  {/* Mobile: compact vertical */}
                  <div className="sm:hidden space-y-2">
                    <div className="flex items-center justify-between rounded-lg bg-white/[0.03] p-2">
                      <div className="flex items-center gap-1.5">
                        <div className="h-2 w-2 rounded-full bg-primary" />
                        <span className="text-[10px] text-muted-foreground">Tercatat</span>
                      </div>
                      <span className="text-xs font-bold tabular-nums text-primary">{formatAmount(cashflowRealization.pendapatanTercatat)}</span>
                    </div>
                    <div className="flex items-center justify-between rounded-lg bg-white/[0.03] p-2">
                      <div className="flex items-center gap-1.5">
                        <div className="h-2 w-2 rounded-full bg-secondary" />
                        <span className="text-[10px] text-muted-foreground">Diterima</span>
                      </div>
                      <span className="text-xs font-bold tabular-nums text-secondary">{formatAmount(cashflowRealization.sudahDiterima)}</span>
                    </div>
                    <div className="flex items-center justify-between rounded-lg bg-white/[0.03] p-2">
                      <div className="flex items-center gap-1.5">
                        <div className="h-2 w-2 rounded-full bg-warning" />
                        <span className="text-[10px] text-muted-foreground">Belum</span>
                      </div>
                      <span className="text-xs font-bold tabular-nums text-warning">{formatAmount(cashflowRealization.belumDiterima)}</span>
                    </div>
                  </div>
                  {/* Desktop: horizontal */}
                  <div className="hidden sm:grid sm:grid-cols-3 gap-3">
                    <div>
                      <p className="text-[9px] uppercase tracking-wider mb-1 text-muted-foreground">Pendapatan Tercatat</p>
                      <p className="text-sm font-bold tabular-nums text-primary">{formatAmount(cashflowRealization.pendapatanTercatat)}</p>
                    </div>
                    <div>
                      <p className="text-[9px] uppercase tracking-wider mb-1 text-muted-foreground">Sudah Diterima</p>
                      <p className="text-sm font-bold tabular-nums text-secondary">{formatAmount(cashflowRealization.sudahDiterima)}</p>
                    </div>
                    <div>
                      <p className="text-[9px] uppercase tracking-wider mb-1 text-muted-foreground">Belum Diterima</p>
                      <p className="text-sm font-bold tabular-nums text-warning">{formatAmount(cashflowRealization.belumDiterima)}</p>
                    </div>
                  </div>
                  {cashflowRealization.pendapatanTercatat > 0 && (
                    <div className="border-t border-border mt-2.5 pt-2.5">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 rounded-full overflow-hidden bg-border">
                          <div
                            className="h-full rounded-full bg-secondary transition-all duration-700"
                            style={{
                              width: `${Math.min(100, (cashflowRealization.sudahDiterima / cashflowRealization.pendapatanTercatat) * 100)}%`,
                            }}
                          />
                        </div>
                        <span className="text-xs tabular-nums min-w-[36px] text-right font-semibold text-muted-foreground">
                          {Math.round((cashflowRealization.sudahDiterima / cashflowRealization.pendapatanTercatat) * 100)}%
                        </span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* ── Penjualan Terbaru ── */}
            {salesData.length > 0 && (
              <Card className="rounded-xl overflow-hidden border border-border">
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="h-6 w-6 rounded-md flex items-center justify-center bg-secondary/8">
                      <Wallet className="h-3 w-3 text-secondary" />
                    </div>
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Penjualan Terbaru
                    </span>
                    <Badge
                      variant="outline"
                      className="text-[10px] font-medium border-0 rounded-full px-1.5 py-0"
                      style={{ backgroundColor: alpha(c.secondary, 8), color: c.secondary }}
                    >
                      {salesData.length}
                    </Badge>
                  </div>
                  <div className="max-h-96 overflow-y-auto space-y-2">
                    <AnimatePresence mode="popLayout">
                      {salesData.slice(0, 8).map((sale, index) => {
                        const isInstallment = sale.installmentTempo && sale.installmentTempo > 0;
                        const realized = sale.realizedAmount || 0;
                        const remaining = isInstallment ? sale.amount - realized : 0;
                        const paidPct = sale.amount > 0 ? Math.round((realized / sale.amount) * 100) : 0;
                        const saleColor = isInstallment ? c.warning : c.secondary;
                        return (
                          <motion.div
                            key={sale.id}
                            custom={index}
                            variants={{
                              hidden: { opacity: 0, x: -6 },
                              show: (i: number) => ({
                                opacity: 1, x: 0,
                                transition: { delay: i * 0.02, duration: 0.2 },
                              }),
                              exit: { opacity: 0, transition: { duration: 0.1 } },
                            }}
                            initial="hidden"
                            animate="show"
                            layout
                            className="rounded-lg p-2.5 border border-border bg-white/[0.01] hover:bg-white/[0.03] transition-colors duration-150"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap mb-1">
                                  <Badge
                                    variant="outline"
                                    className="text-[9px] font-medium border-0 rounded-full px-1.5 py-0 whitespace-nowrap"
                                    style={{ backgroundColor: alpha(saleColor, 8), color: saleColor }}
                                  >
                                    {isInstallment ? 'Cicilan' : 'Tunai'}
                                  </Badge>
                                  {sale.investorSharePct && sale.investorSharePct > 0 && (
                                    <Badge
                                      variant="outline"
                                      className="text-[9px] font-medium border-0 rounded-full px-1.5 py-0"
                                      style={{ backgroundColor: alpha(c.primary, 8), color: c.primary }}
                                    >
                                      Investor {sale.investorSharePct}%
                                    </Badge>
                                  )}
                                  {sale.paymentMethod && (
                                    <Badge
                                      variant="outline"
                                      className="text-[9px] font-medium border-0 rounded-full px-1.5 py-0 whitespace-nowrap"
                                      style={{ backgroundColor: alpha(c.muted, 6), color: c.muted }}
                                    >
                                      {sale.paymentMethod}
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-xs font-medium truncate text-foreground">{sale.description}</p>
                                <div className="text-[10px] text-muted-foreground mt-0.5 space-y-0.5">
                                  <p className="flex items-center gap-1.5">
                                    <span>{formatDate(sale.date)}</span>
                                    {sale.customer?.name && (
                                      <>
                                        <span className="text-border">•</span>
                                        <span className="truncate max-w-[100px]">{sale.customer.name}</span>
                                      </>
                                    )}
                                  </p>
                                  {isInstallment && sale.downPayment && sale.downPayment > 0 && (
                                    <p className="flex items-center gap-2">
                                      <span>DP <span className="font-semibold text-foreground">{formatAmount(sale.downPayment)}</span></span>
                                      <span className="text-border">•</span>
                                      <span>Cicilan <span className="font-semibold text-foreground">{formatAmount(sale.installmentAmount || 0)}/{sale.installmentTempo}x</span></span>
                                    </p>
                                  )}
                                </div>
                              </div>
                              <div className="text-right shrink-0 min-w-[80px]">
                                <p className="text-[9px] text-muted-foreground">Total</p>
                                <p className="text-xs font-bold tabular-nums" style={{ color: saleColor }}>
                                  {formatAmount(sale.amount)}
                                </p>
                                {isInstallment && (
                                  <>
                                    <div className="mt-1 pt-1 border-t border-border">
                                      <p className="text-[8px] text-muted-foreground">Tercatat</p>
                                      <p className="text-[10px] font-semibold tabular-nums text-secondary">{formatAmount(realized)}</p>
                                    </div>
                                    <p className="text-[8px] tabular-nums text-destructive mt-0.5">
                                      sisa {formatAmount(remaining)}
                                    </p>
                                    <div className="flex items-center gap-1 mt-1">
                                      <div className="h-1 w-12 rounded-full overflow-hidden bg-border">
                                        <div
                                          className="h-full rounded-full transition-all duration-500"
                                          style={{
                                            width: `${Math.min(100, paidPct)}%`,
                                            backgroundColor: saleColor,
                                          }}
                                        />
                                      </div>
                                      <span className="text-[8px] tabular-nums text-muted-foreground">{paidPct}%</span>
                                    </div>
                                  </>
                                )}
                              </div>
                            </div>
                          </motion.div>
                        );
                      })}
                    </AnimatePresence>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* ── Period Filter ── */}
            <div className="flex gap-1 rounded-lg p-0.5 w-fit bg-white/[0.03] border border-border overflow-x-auto">
              {PERIOD_OPTIONS.map((opt) => {
                const isActive = cashPeriod === opt.value;
                return (
                  <button
                    key={opt.value}
                    onClick={() => setCashPeriod(opt.value)}
                    className="px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all duration-200"
                    style={
                      isActive
                        ? { backgroundColor: alpha(c.secondary, 8), color: c.secondary }
                        : { color: c.muted }
                    }
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>

            {/* ── Kategori Pengeluaran ── */}
            <Card className="rounded-xl overflow-hidden border border-border">
              <CardContent className="p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Tag className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs font-semibold text-foreground">Kategori Pengeluaran</span>
                    {cashCategories.length > 0 && (
                      <Badge variant="outline" className="text-[10px] font-medium border-0 rounded-full px-1.5 py-0" style={{ backgroundColor: alpha(c.secondary, 8), color: c.secondary }}>
                        {cashCategories.length}
                      </Badge>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={openCategoryDialog}
                    className="h-7 px-2 text-[10px] font-medium rounded-lg text-muted-foreground hover:text-secondary hover:bg-secondary/5"
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Tambah
                  </Button>
                </div>

                {/* Category List — row style */}
                {cashCategories.length > 0 ? (
                  <div className="space-y-0.5">
                    {cashCategories.map((cat) => (
                      <div
                        key={cat.id}
                        className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 hover:bg-white/[0.03] transition-colors group"
                      >
                        <div className="h-7 w-7 rounded-md flex items-center justify-center shrink-0" style={{ backgroundColor: alpha(cat.color || c.secondary, 10) }}>
                          <DynamicIcon
                            name={cat.icon || 'Tag'}
                            className="h-3.5 w-3.5"
                            style={{ color: cat.color || c.secondary }}
                          />
                        </div>
                        <span className="text-xs text-foreground flex-1 min-w-0 truncate">{cat.name}</span>
                        <button
                          onClick={() => handleDeleteCategory(cat.id)}
                          className="h-6 w-6 rounded-md flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-destructive/15 transition-all text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[11px] text-muted-foreground text-center py-3">Belum ada kategori</p>
                )}
              </CardContent>
            </Card>

            {/* ── Category Dialog ── */}
            <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
              <DialogContent className="bg-[#141414] border-white/[0.08] rounded-2xl p-0 overflow-hidden max-w-[calc(100%-2rem)] sm:max-w-md">
                <DialogTitle className="sr-only">Tambah Kategori</DialogTitle>
                <DialogDescription className="sr-only">Tambah kategori pengeluaran baru</DialogDescription>
                <div className="px-5 pt-5 pb-4">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="h-8 w-8 rounded-lg flex items-center justify-center bg-secondary/10">
                      <Tag className="h-4 w-4 text-secondary" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">Tambah Kategori</p>
                      <p className="text-[11px] text-muted-foreground/60">Pilih ikon dan nama kategori baru</p>
                    </div>
                  </div>
                  {/* Icon Picker */}
                  <div className="mb-4">
                    <Label className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground mb-2 block">Pilih Ikon</Label>
                    <div className="grid grid-cols-8 gap-1.5 max-h-[160px] overflow-y-auto p-1">
                      {ICON_PICKER_OPTIONS.map((iconName) => {
                        const isSelected = selectedCategoryIcon === iconName;
                        return (
                          <button
                            key={iconName}
                            type="button"
                            onClick={() => setSelectedCategoryIcon(iconName)}
                            className={cn(
                              "h-9 w-full rounded-lg flex items-center justify-center transition-all duration-150",
                              isSelected
                                ? "bg-secondary/15 border border-secondary/30 ring-1 ring-secondary/20"
                                : "bg-white/[0.03] border border-transparent hover:bg-white/[0.06] hover:border-white/[0.08]"
                            )}
                          >
                            <DynamicIcon
                              name={iconName}
                              className={cn("h-4 w-4 transition-colors", isSelected ? "text-secondary" : "text-muted-foreground")}
                            />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  {/* Selected icon preview + Name */}
                  <div className="mb-4">
                    <Label className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground mb-2 block">Nama Kategori</Label>
                    <div className="flex items-center gap-2">
                      <div className="h-9 w-9 rounded-lg flex items-center justify-center shrink-0 bg-secondary/10">
                        <DynamicIcon name={selectedCategoryIcon} className="h-4 w-4 text-secondary" />
                      </div>
                      <Input
                        value={newCategoryName}
                        onChange={(e) => setNewCategoryName(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddCategoryFromDialog()}
                        placeholder="Contoh: Operasional Kendaraan"
                        className="h-9 text-xs rounded-lg bg-white/[0.03] border border-border text-foreground flex-1"
                        autoFocus
                      />
                    </div>
                  </div>
                </div>
                <DialogFooter className="px-5 pb-5 pt-0">
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      onClick={() => setCategoryDialogOpen(false)}
                      className="flex-1 h-9 rounded-lg text-xs text-muted-foreground hover:text-foreground"
                    >
                      Batal
                    </Button>
                    <Button
                      onClick={handleAddCategoryFromDialog}
                      disabled={!newCategoryName.trim() || categorySaving}
                      className="flex-1 h-9 rounded-lg text-xs bg-secondary text-secondary-foreground hover:bg-secondary/90"
                    >
                      {categorySaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Simpan Kategori'}
                    </Button>
                  </div>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* ── Sub-tab toggle + Search + Add Button ── */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3">
              <div className="flex items-center gap-2 flex-1">
                {/* Sub-tabs */}
                <div className="flex gap-1 rounded-lg p-0.5 bg-white/[0.02] border border-border/50">
                  {(Object.keys(CASH_SUB_TYPES) as CashSubType[]).map((key) => {
                    const cfg = CASH_SUB_TYPES[key];
                    const Icon = cfg.icon;
                    const isActive = cashSubTab === key;
                    return (
                      <button
                        key={key}
                        onClick={() => setCashSubTab(key)}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all duration-200"
                        style={
                          isActive
                            ? { backgroundColor: alpha(cfg.color, 15), color: cfg.color, boxShadow: `0 0 0 1px ${alpha(cfg.color, 25)}` }
                            : { color: c.muted }
                        }
                      >
                        <Icon className="h-3 w-3" />
                        <span className="hidden sm:inline">{t(cfg.label)}</span>
                        <span className="sm:hidden">{t(cfg.label).replace('Kas ', '')}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Search */}
                <div className="relative flex-1 max-w-[200px] hidden sm:block">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    value={cashSearch}
                    onChange={(e) => setCashSearch(e.target.value)}
                    placeholder={t('common.search') + '...'}
                    className="pl-8 rounded-lg h-8 text-xs bg-white/[0.03] border border-border text-foreground"
                  />
                </div>
              </div>

              {/* Mobile Search Bar */}
              <div className="relative flex-1 sm:hidden">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  value={cashSearch}
                  onChange={(e) => setCashSearch(e.target.value)}
                  placeholder={t('common.search') + '...'}
                  className="pl-8 rounded-lg h-8 text-xs bg-white/[0.03] border border-border text-foreground w-full"
                />
              </div>

              <Button
                onClick={openCashCreate}
                size="sm"
                className="rounded-lg h-8 bg-secondary text-secondary-foreground hover:bg-secondary/90"
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                {t('biz.addCashEntry')}
              </Button>
            </div>

            {/* ── Quick Add FAB (Bottom Floating) ── */}
            <motion.button
              onClick={() => setQuickAddOpen(!quickAddOpen)}
              className="fixed bottom-20 right-4 sm:bottom-6 sm:right-6 z-30 h-12 w-12 rounded-2xl flex items-center justify-center shadow-lg transition-all duration-300"
              style={{
                background: `linear-gradient(135deg, ${subTypeConfig.color}, ${subTypeConfig.color}88)`,
              }}
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.92 }}
              animate={{ rotate: quickAddOpen ? 45 : 0 }}
            >
              <Plus className="h-5 w-5 text-white" />
            </motion.button>

            {/* Quick Add Bottom Sheet */}
            <AnimatePresence>
              {quickAddOpen && (
                <>
                  {/* Backdrop */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setQuickAddOpen(false)}
                    className="fixed inset-0 bg-black/40 z-40 sm:hidden"
                  />
                  {/* Sheet */}
                  <motion.div
                    initial={{ opacity: 0, y: 80 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 80 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                    className="fixed bottom-0 left-0 right-0 z-50 sm:bottom-auto sm:right-6 sm:left-auto sm:top-auto sm:z-50 sm:w-[340px]"
                    style={{ bottom: 0 }}
                  >
                    <div className="bg-[#1a1a1a] border-t border-white/[0.08] sm:border sm:border-white/[0.08] sm:rounded-2xl sm:shadow-2xl p-4 sm:p-5">
                      {/* Handle bar (mobile) */}
                      <div className="w-10 h-1 rounded-full bg-white/10 mx-auto mb-3 sm:hidden" />
                      <div className="flex items-center gap-2 mb-3">
                        <div className="h-7 w-7 rounded-lg flex items-center justify-center shrink-0"
                          style={{ backgroundColor: alpha(subTypeConfig.color, 12) }}>
                          <Plus className="h-3.5 w-3.5" style={{ color: subTypeConfig.color }} />
                        </div>
                        <span className="text-sm font-semibold text-foreground">Quick Add</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                          style={{ backgroundColor: alpha(subTypeConfig.color, 8), color: subTypeConfig.color }}>
                          {t(subTypeConfig.label)}
                        </span>
                      </div>
                      <div className="space-y-2">
                        <Input
                          value={quickForm.description}
                          onChange={(e) => setQuickForm({ ...quickForm, description: e.target.value })}
                          onKeyDown={(e) => e.key === 'Enter' && handleQuickAddSave()}
                          placeholder="Deskripsi transaksi..."
                          className="h-10 text-sm rounded-xl bg-white/[0.04] border border-border text-foreground"
                          autoFocus
                        />
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-medium">Rp</span>
                          <Input
                            type="number"
                            value={quickForm.amount}
                            onChange={(e) => setQuickForm({ ...quickForm, amount: e.target.value })}
                            onKeyDown={(e) => e.key === 'Enter' && handleQuickAddSave()}
                            placeholder="0"
                            className="h-10 text-sm rounded-xl bg-white/[0.04] border border-border text-foreground pl-8"
                          />
                        </div>
                        <div className="flex gap-2 pt-1">
                          <Button
                            variant="ghost"
                            onClick={() => setQuickAddOpen(false)}
                            className="flex-1 h-10 rounded-xl text-sm text-muted-foreground hover:text-foreground"
                          >
                            Batal
                          </Button>
                          <Button
                            onClick={handleQuickAddSave}
                            disabled={!quickForm.description || !quickForm.amount || quickSaving}
                            className="flex-1 h-10 rounded-xl text-sm font-medium"
                            style={{ backgroundColor: subTypeConfig.color, color: 'white' }}
                          >
                            {quickSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Simpan'}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>

            {/* ── Sub-total indicator ── */}
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full" style={{ backgroundColor: subTypeConfig.color }} />
              <span className="text-xs text-muted-foreground">{t('common.total')}:</span>
              <span className="text-sm font-bold" style={{ color: subTypeConfig.color }}>
                {formatAmount(currentCashSubTotal)}
              </span>
              <span className="text-[10px] text-muted-foreground">({filteredCashEntries.length} transaksi)</span>
            </div>

            {/* ── Cash Entries Table ── */}
            <Card className="rounded-xl overflow-hidden border border-border">
              <CardContent className="p-0">
                {cashLoading ? (
                  <div className="space-y-2 p-3 sm:p-4">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Skeleton key={i} className="h-10 rounded-lg bg-border" />
                    ))}
                  </div>
                ) : filteredCashEntries.length === 0 ? (
                  <EmptyState
                    icon={<Inbox className="h-8 w-8 text-muted-foreground" />}
                    accentColor={subTypeConfig.color}
                    title="Belum ada transaksi"
                    description={`Mulai tambahkan catatan ${t(subTypeConfig.label).toLowerCase()} pertama Anda`}
                    onAction={openCashCreate}
                    actionLabel={t('biz.addCashEntry')}
                  />
                ) : (
                  <>
                    {/* Search mode banner */}
                    {searchMode && (
                      <div className="flex items-center gap-2 px-3 sm:px-4 pt-3 pb-1">
                        <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        <span className="text-[11px] text-muted-foreground">
                          Menampilkan hasil dari <span className="font-medium text-foreground">semua tab</span> ({filteredCashEntries.length} hasil)
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="ml-auto h-6 px-2 text-[10px] rounded-md text-muted-foreground hover:text-foreground"
                          onClick={() => { setCashSearch(''); setSearchMode(false); }}
                        >
                          <X className="h-3 w-3 mr-1" />
                          Reset
                        </Button>
                      </div>
                    )}
                  {/* Mobile Card List */}
                  <div className="sm:hidden max-h-[500px] overflow-y-auto space-y-2 p-3">
                    <AnimatePresence mode="popLayout">
                      {filteredCashEntries.slice(0, cashPageSize).map((entry, index) => {
                        const isExpense = entry.type === 'kas_keluar';
                        const entryColor = CASH_SUB_TYPES[entry.type as CashSubType];
                        const sourceInfo = getEntrySourceLabel(entry);
                        return (
                          <motion.div
                            key={entry.id}
                            custom={index}
                            variants={{
                              hidden: { opacity: 0, y: -4 },
                              show: (i: number) => ({
                                opacity: 1, y: 0,
                                transition: { delay: i * 0.02, duration: 0.2 },
                              }),
                              exit: { opacity: 0, transition: { duration: 0.15 } },
                            }}
                            initial="hidden"
                            animate="show"
                            layout
                            className="rounded-lg p-3 border border-border bg-white/[0.01]"
                          >
                            <div className="flex items-start justify-between gap-2 mb-1.5">
                              <div className="flex items-center gap-1.5 min-w-0">
                                {isExpense ? (
                                  <ArrowDownRight className="h-3.5 w-3.5 shrink-0 text-destructive" />
                                ) : (
                                  <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-secondary" />
                                )}
                                <span className="text-xs font-medium truncate text-foreground">{entry.description}</span>
                              </div>
                              <span className={cn("text-xs font-bold tabular-nums shrink-0", isExpense ? "text-destructive" : "text-secondary")}>
                                {isExpense ? '-' : '+'}{formatAmount(entry.amount)}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-[10px] font-mono text-muted-foreground">{formatDate(entry.date)}</span>
                              <Badge
                                variant="outline"
                                className="text-[9px] font-medium border-0 rounded-full px-1.5 py-0 whitespace-nowrap"
                                style={{ backgroundColor: alpha(sourceInfo.color, 8), color: sourceInfo.color }}
                              >
                                {sourceInfo.label}
                              </Badge>
                              {entry.category && (
                                <Badge
                                  variant="outline"
                                  className="text-[9px] font-medium border-0 rounded-full px-1.5 py-0 gap-0.5 whitespace-nowrap"
                                  style={{ backgroundColor: alpha(entryColor.color, 8), color: entryColor.color }}
                                >
                                  {(() => {
                                    const catInfo = cashCategories.find(c => c.name === entry.category);
                                    return catInfo?.icon ? (
                                      <DynamicIcon name={catInfo.icon} className="h-2.5 w-2.5 shrink-0" style={{ color: catInfo.color || entryColor.color }} />
                                    ) : null;
                                  })()}
                                  {entry.category}
                                </Badge>
                              )}
                              <div className="ml-auto flex items-center gap-0.5">
                                <Button variant="ghost" size="sm" className="h-6 w-6 p-0 rounded-md text-muted-foreground" onClick={() => openCashEdit(entry)}>
                                  <Pencil className="h-3 w-3" />
                                </Button>
                                <Button variant="ghost" size="sm" className="h-6 w-6 p-0 rounded-md text-muted-foreground" onClick={() => setCashDeleteId(entry.id)}>
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          </motion.div>
                        );
                      })}
                    </AnimatePresence>
                  </div>
                  {/* Desktop Table */}
                  <div className="hidden sm:block max-h-[500px] overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-b border-border hover:bg-transparent">
                          <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground w-[90px]">
                            {t('biz.cashDate')}
                          </TableHead>
                          <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                            {t('biz.cashDescription')}
                          </TableHead>
                          <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground w-[110px]">
                            Sumber
                          </TableHead>
                          <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                            {t('biz.cashCategory')}
                          </TableHead>
                          <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground text-right w-[120px]">
                            {t('biz.cashAmount')}
                          </TableHead>
                          <TableHead className="w-16" />
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <AnimatePresence mode="popLayout">
                          {filteredCashEntries.slice(0, cashPageSize).map((entry, index) => {
                            const isExpense = entry.type === 'kas_keluar';
                            const entryColor = CASH_SUB_TYPES[entry.type as CashSubType];
                            const sourceInfo = getEntrySourceLabel(entry);
                            return (
                              <motion.tr
                                key={entry.id}
                                custom={index}
                                variants={{
                                  hidden: { opacity: 0, x: -8 },
                                  show: (i: number) => ({
                                    opacity: 1, x: 0,
                                    transition: { delay: i * 0.02, duration: 0.2 },
                                  }),
                                  exit: { opacity: 0, x: 8, transition: { duration: 0.15 } },
                                }}
                                initial="hidden"
                                animate="show"
                                layout
                                className="transition-colors duration-150 group cursor-default border-b border-border"
                              >
                                <TableCell className="text-xs py-2 font-mono text-muted-foreground">
                                  {formatDate(entry.date)}
                                </TableCell>
                                <TableCell className="text-xs py-2 font-medium max-w-[180px] truncate text-foreground">
                                  <span className="flex items-center gap-1.5">
                                    {isExpense ? (
                                      <ArrowDownRight className="h-3 w-3 shrink-0 text-destructive" />
                                    ) : (
                                      <ArrowUpRight className="h-3 w-3 shrink-0 text-secondary" />
                                    )}
                                    <span className="truncate">{entry.description}</span>
                                  </span>
                                </TableCell>
                                <TableCell className="py-2">
                                  <Badge
                                    variant="outline"
                                    className="text-[10px] font-medium border-0 rounded-full px-2 py-0"
                                    style={{ backgroundColor: alpha(sourceInfo.color, 8), color: sourceInfo.color }}
                                  >
                                    {sourceInfo.label}
                                  </Badge>
                                </TableCell>
                                <TableCell className="py-2">
                                  {entry.category ? (
                                    <Badge
                                      variant="outline"
                                      className="text-[10px] font-medium border-0 rounded-full px-2 py-0 gap-1"
                                      style={{ backgroundColor: alpha(entryColor.color, 8), color: entryColor.color }}
                                    >
                                      {(() => {
                                        const catInfo = cashCategories.find(c => c.name === entry.category);
                                        return catInfo?.icon ? (
                                          <DynamicIcon name={catInfo.icon} className="h-2.5 w-2.5 shrink-0" style={{ color: catInfo.color || entryColor.color }} />
                                        ) : null;
                                      })()}
                                      {entry.category}
                                    </Badge>
                                  ) : (
                                    <span className="text-xs text-muted-foreground">—</span>
                                  )}
                                </TableCell>
                                <TableCell
                                  className={cn("text-xs text-right font-semibold py-2 tabular-nums", isExpense ? "text-destructive" : "text-secondary")}
                                >
                                  {isExpense ? '-' : '+'}
                                  {formatAmount(entry.amount)}
                                </TableCell>
                                <TableCell className="py-2 text-right">
                                  <div className="flex items-center justify-end gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 rounded-md text-muted-foreground" onClick={() => openCashEdit(entry)}>
                                      <Pencil className="h-3 w-3" />
                                    </Button>
                                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 rounded-md text-muted-foreground" onClick={() => setCashDeleteId(entry.id)}>
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </div>
                                </TableCell>
                              </motion.tr>
                            );
                          })}
                        </AnimatePresence>
                      </TableBody>
                    </Table>
                  </div>
                  {/* Pagination: Tampilkan Lebih Banyak */}
                  {filteredCashEntries.length > cashPageSize && (
                    <div className="flex justify-center py-3 border-t border-border">
                      <Button
                        onClick={() => setCashPageSize((p) => p + 10)}
                        variant="ghost"
                        className="rounded-lg h-8 px-4 text-xs text-muted-foreground hover:text-foreground"
                      >
                        Tampilkan Lebih Banyak ({filteredCashEntries.length - cashPageSize} lagi)
                      </Button>
                    </div>
                  )}
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════ */}
        {/* ── TAB 2: INVESTOR ─────────────────────────────────── */}
        {/* ══════════════════════════════════════════════════════════ */}
        {mainTab === 'investor' && (
          <div key="investor" className="space-y-3 p-3 sm:p-4">
            {/* ── Investor Summary — Merged Compact Card ── */}
            <Card className="rounded-xl overflow-hidden border border-border">
              <CardContent className="p-3 sm:p-4">
                <div className="grid grid-cols-3 gap-2 sm:gap-3">
                  {/* Total Modal Investor */}
                  <div className="rounded-lg bg-primary/5 p-2.5 text-center sm:text-left">
                    <div className="flex items-center justify-center sm:justify-start gap-1.5 mb-1">
                      <HandCoins className="h-3 w-3 text-primary" />
                      <span className="text-[8px] sm:text-[9px] font-semibold uppercase tracking-wider text-muted-foreground leading-none">Modal</span>
                    </div>
                    <p className="text-[11px] sm:text-sm font-bold tabular-nums text-primary leading-tight">
                      {formatAmount(animTotalInvestment)}
                    </p>
                  </div>
                  {/* Jumlah Investor */}
                  <div className="rounded-lg bg-secondary/5 p-2.5 text-center sm:text-left">
                    <div className="flex items-center justify-center sm:justify-start gap-1.5 mb-1">
                      <Users className="h-3 w-3 text-secondary" />
                      <span className="text-[8px] sm:text-[9px] font-semibold uppercase tracking-wider text-muted-foreground leading-none">Investor</span>
                    </div>
                    <p className="text-xs sm:text-sm font-bold text-secondary leading-tight">
                      {investorSummary.activeCount}
                      <span className="text-[10px] font-normal ml-0.5 text-muted-foreground">aktif</span>
                    </p>
                  </div>
                  {/* Rata-rata Bagi Hasil */}
                  <div className="rounded-lg bg-warning/5 p-2.5 text-center sm:text-left">
                    <div className="flex items-center justify-center sm:justify-start gap-1.5 mb-1">
                      <Percent className="h-3 w-3 text-warning" />
                      <span className="text-[8px] sm:text-[9px] font-semibold uppercase tracking-wider text-muted-foreground leading-none">Bagi Hasil</span>
                    </div>
                    <p className="text-xs sm:text-sm font-bold text-warning leading-tight">{animAvgShare.toFixed(1)}%</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* ── Header with Add Button ── */}
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold flex items-center gap-2 text-foreground">
                <Users className="h-4 w-4 text-primary" />
                Daftar Investor
              </h2>
              <Button
                onClick={openInvestorCreate}
                size="sm"
                className="rounded-lg h-8 bg-primary text-primary-foreground hover:bg-primary/90"
              >
                <UserPlus className="h-3.5 w-3.5 mr-1" />
                Tambah Investor
              </Button>
            </div>

            {/* ── Investor Cards ── */}
            {investorLoading ? (
              <Card className="rounded-xl border border-border">
                <CardContent className="p-3 space-y-2">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-14 rounded-lg bg-card" />
                  ))}
                </CardContent>
              </Card>
            ) : investors.length === 0 ? (
              <Card className="rounded-xl border border-border">
                <CardContent className="p-0">
                  <EmptyState
                    icon={<Users className="h-8 w-8 text-muted-foreground" />}
                    accentColor={c.primary}
                    title="Belum ada investor"
                    description="Tambahkan investor untuk mulai mengelola modal dan bagi hasil"
                    onAction={openInvestorCreate}
                    actionLabel="Tambah Investor"
                  />
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Mobile: compact list inside single card */}
                <Card className="rounded-xl overflow-hidden border border-border sm:hidden">
                  <CardContent className="p-2">
                    <AnimatePresence mode="popLayout">
                      {investors.map((inv) => (
                        <motion.div
                          key={inv.id}
                          layout
                          exit={{ opacity: 0, height: 0, transition: { duration: 0.15 } }}
                        >
                          <div className="flex items-center gap-2 py-2 border-b border-border last:border-b-0">
                            {/* Avatar */}
                            <div className="h-8 w-8 rounded-lg flex items-center justify-center text-[11px] font-bold shrink-0 bg-primary/8 text-primary">
                              {inv.name.charAt(0).toUpperCase()}
                            </div>
                            {/* Info */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5">
                                <p className="text-xs font-semibold truncate text-foreground">{inv.name}</p>
                                <Badge
                                  variant="outline"
                                  className={cn(
                                    "text-[8px] font-medium border-0 rounded-full px-1 py-0 shrink-0",
                                    inv.status === 'active'
                                      ? "bg-secondary/15 text-secondary"
                                      : "bg-destructive/15 text-destructive"
                                  )}
                                >
                                  {inv.status === 'active' ? 'Aktif' : 'Nonaktif'}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-[10px] text-muted-foreground">Modal</span>
                                <span className="text-[11px] font-bold tabular-nums text-primary">{formatAmount(inv.totalInvestment)}</span>
                                <span className="text-[10px] text-muted-foreground">•</span>
                                <span className="text-[10px] text-muted-foreground">BH</span>
                                <span className="text-[11px] font-bold text-warning">{inv.profitSharePct}%</span>
                              </div>
                            </div>
                            {/* Edit */}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 rounded-md shrink-0 text-muted-foreground hover:text-primary hover:bg-primary/5"
                              onClick={() => openInvestorEdit(inv)}
                            >
                              <Pencil className="h-3 w-3" />
                            </Button>
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </CardContent>
                </Card>

                {/* Desktop: card grid */}
                <div className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
                  <AnimatePresence mode="popLayout">
                    {investors.map((inv) => (
                      <motion.div
                        key={inv.id}
                        layout
                        exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.15 } }}
                      >
                        <Card className="rounded-xl overflow-hidden transition-colors duration-200 border border-primary/15 hover:border-primary/30">
                          <CardContent className="p-2.5 sm:p-3">
                            <div className="flex items-start justify-between mb-1.5 sm:mb-2">
                              <div className="flex items-center gap-2 min-w-0">
                                <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 bg-primary/8 text-primary">
                                  {inv.name.charAt(0).toUpperCase()}
                                </div>
                                <div className="min-w-0">
                                  <p className="text-xs font-semibold truncate max-w-[120px] sm:max-w-[140px] text-foreground">{inv.name}</p>
                                  <Badge
                                    variant="outline"
                                    className={cn(
                                      "text-[9px] font-medium border-0 rounded-full px-1.5 py-0",
                                      inv.status === 'active'
                                        ? "bg-secondary/15 text-secondary"
                                        : "bg-destructive/15 text-destructive"
                                    )}
                                  >
                                    {inv.status === 'active' ? 'Aktif' : 'Nonaktif'}
                                  </Badge>
                                </div>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 rounded-md shrink-0 text-muted-foreground hover:text-primary hover:bg-primary/5"
                                onClick={() => openInvestorEdit(inv)}
                              >
                                <Pencil className="h-3 w-3" />
                              </Button>
                            </div>

                            <div className="space-y-1.5">
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Modal</span>
                                <span className="text-sm font-bold tabular-nums text-primary">{formatAmount(inv.totalInvestment)}</span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Bagi Hasil</span>
                                <span className="text-sm font-bold text-warning">{inv.profitSharePct}%</span>
                              </div>
                            </div>

                            {(inv.phone || inv.email) && (
                              <div className="border-t border-border mt-2 pt-2 flex items-center gap-3">
                                {inv.phone && (
                                  <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                                    <Phone className="h-2.5 w-2.5" />
                                    {inv.phone}
                                  </span>
                                )}
                                {inv.email && (
                                  <span className="flex items-center gap-1 text-[10px] truncate text-muted-foreground">
                                    <Mail className="h-2.5 w-2.5" />
                                    {inv.email}
                                  </span>
                                )}
                              </div>
                            )}

                            <p className="text-[10px] mt-1 text-muted-foreground">
                              Bergabung {formatDate(inv.joinDate)}
                            </p>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </>
            )}

            {/* ── Riwayat Pemasukan Investor ── */}
            {investorHistory.length > 0 && (
              <Card className="rounded-xl overflow-hidden border border-border">
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="h-6 w-6 rounded-md flex items-center justify-center bg-secondary/8">
                      <TrendingUp className="h-3 w-3 text-secondary" />
                    </div>
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Riwayat Pemasukan Investor
                    </span>
                    <Badge
                      variant="outline"
                      className="text-[10px] font-medium border-0 rounded-full px-1.5 py-0"
                      style={{ backgroundColor: alpha(c.secondary, 8), color: c.secondary }}
                    >
                      {investorHistory.length}
                    </Badge>
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    {/* Mobile Card List */}
                    <div className="sm:hidden space-y-2">
                      <AnimatePresence mode="popLayout">
                        {investorHistory.map((item, index) => {
                          const typeConfig = {
                            modal_masuk: { label: 'Modal Masuk', color: c.primary, bg: alpha(c.primary, 8) },
                            dp_penjualan: { label: 'DP Penjualan', color: c.secondary, bg: alpha(c.secondary, 8) },
                            penjualan_lunas: { label: 'Penjualan', color: '#14b8a6', bg: 'color-mix(in srgb, #14b8a6 8%, transparent)' },
                            cicilan_diterima: { label: 'Cicilan', color: '#a855f7', bg: 'color-mix(in srgb, #a855f7 8%, transparent)' },
                          }[item.type];
                          return (
                            <motion.div
                              key={item.id}
                              custom={index}
                              variants={{
                                hidden: { opacity: 0, y: -4 },
                                show: (i: number) => ({
                                  opacity: 1, y: 0,
                                  transition: { delay: i * 0.015, duration: 0.15 },
                                }),
                                exit: { opacity: 0, transition: { duration: 0.1 } },
                              }}
                              initial="hidden"
                              animate="show"
                              layout
                              className="rounded-lg p-2.5 border border-border bg-white/[0.01]"
                            >
                              <div className="flex items-start justify-between gap-2 mb-1">
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <Badge
                                    variant="outline"
                                    className="text-[9px] font-medium border-0 rounded-full px-1.5 py-0 whitespace-nowrap shrink-0"
                                    style={{ backgroundColor: typeConfig.bg, color: typeConfig.color }}
                                  >
                                    {typeConfig.label}
                                  </Badge>
                                  <span className="text-xs truncate text-foreground">
                                    {item.investorName && item.type === 'modal_masuk' && (
                                      <span className="text-muted-foreground mr-1">{item.investorName}</span>
                                    )}
                                    {item.description}
                                  </span>
                                </div>
                                <span className="text-xs font-semibold tabular-nums shrink-0" style={{ color: typeConfig.color }}>
                                  +{formatAmount(item.amount)}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                                <span className="font-mono">{formatDate(item.date)}</span>
                                {item.customerName && (
                                  <>
                                    <span className="text-border">•</span>
                                    <span className="truncate">{item.customerName}</span>
                                  </>
                                )}
                              </div>
                            </motion.div>
                          );
                        })}
                      </AnimatePresence>
                    </div>
                    {/* Desktop Table */}
                    <div className="hidden sm:block">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-b border-border hover:bg-transparent">
                          <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground w-[80px]">Tanggal</TableHead>
                          <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground w-[90px]">Tipe</TableHead>
                          <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Deskripsi</TableHead>
                          <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Pelanggan</TableHead>
                          <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground text-right w-[110px]">Bagian Investor</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <AnimatePresence mode="popLayout">
                          {investorHistory.map((item, index) => {
                            const typeConfig = {
                              modal_masuk: { label: 'Modal Masuk', color: c.primary, bg: alpha(c.primary, 8) },
                              dp_penjualan: { label: 'DP Penjualan', color: c.secondary, bg: alpha(c.secondary, 8) },
                              penjualan_lunas: { label: 'Penjualan', color: '#14b8a6', bg: 'color-mix(in srgb, #14b8a6 8%, transparent)' },
                              cicilan_diterima: { label: 'Cicilan', color: '#a855f7', bg: 'color-mix(in srgb, #a855f7 8%, transparent)' },
                            }[item.type];
                            return (
                              <motion.tr
                                key={item.id}
                                custom={index}
                                variants={{
                                  hidden: { opacity: 0, y: -4 },
                                  show: (i: number) => ({
                                    opacity: 1, y: 0,
                                    transition: { delay: i * 0.015, duration: 0.15 },
                                  }),
                                  exit: { opacity: 0, transition: { duration: 0.1 } },
                                }}
                                initial="hidden"
                                animate="show"
                                layout
                                className="border-b border-border transition-colors duration-150"
                              >
                                <TableCell className="text-xs py-2 font-mono text-muted-foreground">
                                  {formatDate(item.date)}
                                </TableCell>
                                <TableCell className="py-2">
                                  <Badge
                                    variant="outline"
                                    className="text-[9px] font-medium border-0 rounded-full px-1.5 py-0 whitespace-nowrap"
                                    style={{ backgroundColor: typeConfig.bg, color: typeConfig.color }}
                                  >
                                    {typeConfig.label}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-xs py-2 max-w-[180px] truncate text-foreground">
                                  {item.investorName && item.type === 'modal_masuk' && (
                                    <span className="text-muted-foreground mr-1">{item.investorName}</span>
                                  )}
                                  {item.description}
                                </TableCell>
                                <TableCell className="text-xs py-2 text-muted-foreground">
                                  {item.customerName || (
                                    item.investorName && item.type !== 'modal_masuk' ? item.investorName : '—'
                                  )}
                                </TableCell>
                                <TableCell className="text-xs text-right font-semibold py-2 tabular-nums" style={{ color: typeConfig.color }}>
                                  +{formatAmount(item.amount)}
                                </TableCell>
                              </motion.tr>
                            );
                          })}
                        </AnimatePresence>
                      </TableBody>
                    </Table>
                    </div>
                  </div>
                  {/* Total investor income */}
                  <div className="border-t border-border mt-2 pt-2 flex items-center justify-between">
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Total Pemasukan Investor</span>
                    <span className="text-sm font-bold tabular-nums text-secondary">
                      {formatAmount(investorHistory.reduce((sum, item) => sum + item.amount, 0))}
                    </span>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
        {/* ══════════════════════════════════════════════════════════ */}
        {mainTab === 'piutang' && (
          <div key="piutang" className="space-y-3 p-3 sm:p-4">
            {/* ── Piutang Info Banner ── */}
            <div className="rounded-xl p-3 flex items-start gap-2.5 bg-muted-foreground/3 border border-border">
              <Info className="h-4 w-4 shrink-0 mt-0.5 text-muted-foreground" />
              <p className="text-[11px] leading-relaxed text-muted-foreground">
                Kelola piutang pelanggan Anda. Pantau status cicilan, kirim pengingat pembayaran, dan catat pembayaran yang diterima.
              </p>
            </div>

            {/* ── Piutang Summary Cards (Detailed) ── */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {/* Cicilan Berjalan */}
              <Card className="rounded-xl overflow-hidden border border-secondary/15">
                <CardContent className="p-3">
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className="h-6 w-6 rounded-md flex items-center justify-center bg-secondary/8">
                      <Clock className="h-3 w-3 text-secondary" />
                    </div>
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Cicilan Berjalan</span>
                  </div>
                  <p className="text-sm font-bold tabular-nums text-secondary">{piutangStats.berjalanCount} <span className="text-[10px] font-normal text-muted-foreground">piutang</span></p>
                  <p className="text-[11px] font-semibold tabular-nums mt-0.5 text-muted-foreground">Sisa: {formatAmount(piutangStats.berjalanRemaining)}</p>
                  {allPiutang.filter(d => ['active', 'partially_paid'].includes(d.status)).slice(0, 3).map((d) => {
                    const paidSoFar = d.amount - d.remaining;
                    const paidPct = d.amount > 0 ? Math.round((paidSoFar / d.amount) * 100) : 0;
                    return (
                      <div key={d.id} className="mt-1.5 pt-1.5 border-t border-border">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] truncate max-w-[120px] text-foreground">{d.counterpart}</span>
                          <span className="text-[10px] font-bold tabular-nums text-secondary">{formatAmount(d.remaining)}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <div className="flex-1 h-1 rounded-full overflow-hidden bg-border">
                            <div className="h-full rounded-full bg-secondary transition-[width] duration-500 ease-in-out" style={{ width: `${paidPct}%` }} />
                          </div>
                          <span className="text-[9px] tabular-nums text-muted-foreground">{paidPct}%</span>
                        </div>
                        {d.dueDate && (
                          <span className="text-[9px] block mt-0.5 text-muted-foreground">Jatuh tempo: {formatDate(d.dueDate)}</span>
                        )}
                      </div>
                    );
                  })}
                </CardContent>
              </Card>

              {/* Total Cicilan Menunggak */}
              <Card className="rounded-xl overflow-hidden border border-destructive/15">
                <CardContent className="p-3">
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className="h-6 w-6 rounded-md flex items-center justify-center bg-destructive/8">
                      <AlertTriangle className="h-3 w-3 text-destructive" />
                    </div>
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Menunggak</span>
                  </div>
                  <p className="text-sm font-bold tabular-nums text-destructive">{piutangStats.macetCount} <span className="text-[10px] font-normal text-muted-foreground">piutang</span></p>
                  <p className="text-[11px] font-semibold tabular-nums mt-0.5 text-muted-foreground">Sisa: {formatAmount(piutangStats.macetRemaining)}</p>
                  {allPiutang.filter(d => d.status === 'overdue').slice(0, 3).map((d) => {
                    const overdueDays = d.dueDate ? differenceInDays(new Date(), parseISO(d.dueDate)) : 0;
                    return (
                      <div key={d.id} className="mt-1.5 pt-1.5 border-t border-border">
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-[10px] truncate max-w-[120px] text-foreground">{d.counterpart}</span>
                          <span className="text-[9px] px-1.5 py-px rounded-full font-medium bg-destructive text-primary-foreground">
                            {overdueDays > 0 ? `${overdueDays} hari` : 'Lewat'}
                          </span>
                        </div>
                        <span className="text-[10px] font-bold tabular-nums text-destructive">{formatAmount(d.remaining)}</span>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>

              {/* Cicilan Selesai */}
              <Card className="rounded-xl overflow-hidden border border-primary/15">
                <CardContent className="p-3">
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className="h-6 w-6 rounded-md flex items-center justify-center bg-primary/8">
                      <CheckCircle2 className="h-3 w-3 text-primary" />
                    </div>
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Selesai</span>
                  </div>
                  <p className="text-sm font-bold tabular-nums text-primary">{piutangStats.selesaiCount} <span className="text-[10px] font-normal text-muted-foreground">piutang</span></p>
                  <p className="text-[11px] font-semibold tabular-nums mt-0.5 text-muted-foreground">Total: {formatAmount(piutangStats.selesaiAmount)}</p>
                  {allPiutang.filter(d => d.status === 'paid').slice(0, 2).map((d) => (
                    <div key={d.id} className="flex items-center justify-between py-1 mt-1 border-t border-border">
                      <span className="text-[10px] truncate text-muted-foreground">{d.counterpart}</span>
                      <span className="text-[10px] font-semibold tabular-nums text-primary">{formatAmount(d.amount)}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

            {/* ── Sub-tabs + Search ── */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3">
              <div className="flex gap-1 rounded-lg p-0.5 bg-white/[0.03] border border-border">
                {(Object.keys(PIUTANG_STATUS_CONFIG) as PiutangSubTab[]).map((key) => {
                  const cfg = PIUTANG_STATUS_CONFIG[key];
                  const Icon = cfg.icon;
                  const isActive = piutangSubTab === key;
                  const count = key === 'berjalan'
                    ? piutangStats.berjalanCount
                    : key === 'macet'
                      ? piutangStats.macetCount
                      : piutangStats.selesaiCount;
                  return (
                    <button
                      key={key}
                      onClick={() => setPiutangSubTab(key)}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all duration-200"
                      style={isActive ? { backgroundColor: alpha(cfg.color, 8), color: cfg.color } : { color: c.muted }}
                    >
                      <Icon className="h-3 w-3" />
                      <span>{cfg.label}</span>
                      {count > 0 && (
                        <span
                          className="ml-0.5 h-4 min-w-[16px] px-1 text-[10px] font-bold rounded-full flex items-center justify-center"
                          style={{
                            backgroundColor: isActive ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.06)',
                            color: isActive ? 'current' : c.muted,
                          }}
                        >
                          {count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
              <div className="relative flex-1 sm:max-w-[200px] w-full">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  value={piutangSearch}
                  onChange={(e) => setPiutangSearch(e.target.value)}
                  placeholder={t('common.search') + '...'}
                  className="pl-8 rounded-lg h-8 text-xs bg-white/[0.03] border border-border text-foreground w-full"
                />
              </div>
            </div>

            {/* ── Piutang Table ── */}
            <Card className="rounded-xl overflow-hidden border border-border">
              <CardContent className="p-0">
                {piutangLoading ? (
                  <div className="space-y-2 p-3 sm:p-4">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <Skeleton key={i} className="h-10 rounded-lg bg-border" />
                    ))}
                  </div>
                ) : piutangDebts.length === 0 ? (
                  <EmptyState
                    icon={<HandCoins className="h-8 w-8 text-muted-foreground" />}
                    accentColor={PIUTANG_STATUS_CONFIG[piutangSubTab].color}
                    title={`Tidak ada piutang ${PIUTANG_STATUS_CONFIG[piutangSubTab].label.toLowerCase()}`}
                    description="Semua piutang dalam kategori ini sudah bersih"
                  />
                ) : (
                  <>
                    {/* Mobile Card List */}
                    <div className="sm:hidden max-h-[480px] overflow-y-auto space-y-2 p-3">
                      <AnimatePresence mode="popLayout">
                        {piutangDebts.map((debt, index) => {
                          const statusCfg = getStatusConfig(debt.status);
                          const paidAmount = getDebtPaidAmount(debt.id);
                          const overdueDays = debt.dueDate && debt.status !== 'paid'
                            ? differenceInDays(new Date(), parseISO(debt.dueDate))
                            : null;
                          const isOverdue = overdueDays !== null && overdueDays > 0;
                          return (
                            <motion.div
                              key={debt.id}
                              custom={index}
                              variants={{
                                hidden: { opacity: 0, y: -4 },
                                show: (i: number) => ({
                                  opacity: 1, y: 0,
                                  transition: { delay: i * 0.02, duration: 0.2 },
                                }),
                                exit: { opacity: 0, transition: { duration: 0.15 } },
                              }}
                              initial="hidden"
                              animate="show"
                              layout
                              className="rounded-lg p-3 border border-border bg-white/[0.01]"
                            >
                              <div className="flex items-start justify-between gap-2 mb-1.5">
                                <div className="flex items-center gap-2 min-w-0">
                                  <div className="h-6 w-6 rounded-md bg-white/[0.06] flex items-center justify-center text-[10px] font-bold shrink-0 text-muted-foreground">
                                    {debt.counterpart.charAt(0).toUpperCase()}
                                  </div>
                                  <div className="min-w-0">
                                    <p className="text-xs font-medium truncate text-foreground">{debt.counterpart}</p>
                                    {debt.description && (
                                      <p className="text-[10px] truncate text-muted-foreground">{debt.description}</p>
                                    )}
                                  </div>
                                </div>
                                <Badge
                                  variant="outline"
                                  className="text-[9px] font-medium border-0 rounded-full px-1.5 py-0 shrink-0"
                                  style={{ backgroundColor: alpha(statusCfg.color, 8), color: statusCfg.color }}
                                >
                                  {statusCfg.label}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-3 text-[10px] mb-1.5">
                                <span className="text-muted-foreground">Total: <span className="font-semibold text-foreground">{formatAmount(debt.amount)}</span></span>
                                <span className="text-muted-foreground">Dibayar: <span className="font-semibold" style={{ color: statusCfg.color }}>{formatAmount(paidAmount)}</span></span>
                                <span className="text-muted-foreground">Sisa: <span className="font-bold" style={{ color: statusCfg.color }}>{formatAmount(debt.remaining)}</span></span>
                              </div>
                              {debt.dueDate && (
                                <div className="flex items-center gap-1.5 mb-1.5">
                                  <CalendarDays className="h-3 w-3 text-muted-foreground" />
                                  <span className={cn("text-[10px] font-mono", isOverdue ? "text-destructive" : "text-muted-foreground")}>
                                    {formatDate(debt.dueDate)}
                                  </span>
                                  {isOverdue && (
                                    <span className="text-[9px] px-1.5 py-px rounded-full font-medium bg-destructive text-primary-foreground">
                                      {overdueDays} hari
                                    </span>
                                  )}
                                </div>
                              )}
                              <div className="flex items-center gap-1.5 pt-1.5 border-t border-border">
                                {debt.status !== 'paid' && (
                                  <Button variant="ghost" size="sm" className="h-7 px-2 text-[10px] font-medium rounded-md text-secondary" onClick={() => openPaymentDialog(debt)}>
                                    <CircleDollarSign className="h-3 w-3 mr-1" />Bayar
                                  </Button>
                                )}
                                <Button variant="ghost" size="sm" className="h-7 px-2 text-[10px] font-medium rounded-md" style={{ color: '#25D366' }} onClick={() => sendReminder(debt)}>
                                  <MessageCircle className="h-3 w-3 mr-1" />Tagih
                                </Button>
                                <Button variant="ghost" size="sm" className="h-7 px-2 text-[10px] font-medium rounded-md text-muted-foreground ml-auto" onClick={() => openDetailDialog(debt)}>
                                  <ChevronRight className="h-3 w-3" />
                                </Button>
                              </div>
                            </motion.div>
                          );
                        })}
                      </AnimatePresence>
                    </div>
                    {/* Desktop Table */}
                    <div className="hidden sm:block max-h-[480px] overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-b border-border hover:bg-transparent">
                          <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                            {t('biz.debtCounterpart')}
                          </TableHead>
                          <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground hidden sm:table-cell">
                            Deskripsi
                          </TableHead>
                          <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground text-right">
                            Total
                          </TableHead>
                          <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground text-right">
                            Dibayar
                          </TableHead>
                          <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground text-right">
                            Sisa
                          </TableHead>
                          <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground hidden md:table-cell w-[90px]">
                            {t('biz.debtDueDate')}
                          </TableHead>
                          <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground w-[70px]">
                            Status
                          </TableHead>
                          <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground w-[100px] text-center">
                            Aksi
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <AnimatePresence mode="popLayout">
                          {piutangDebts.map((debt, index) => {
                            const statusCfg = getStatusConfig(debt.status);
                            const paidAmount = getDebtPaidAmount(debt.id);
                            const overdueDays = debt.dueDate && debt.status !== 'paid'
                              ? differenceInDays(new Date(), parseISO(debt.dueDate))
                              : null;
                            const isOverdue = overdueDays !== null && overdueDays > 0;
                            return (
                              <motion.tr
                                key={debt.id}
                                custom={index}
                                variants={{
                                  hidden: { opacity: 0, x: -8 },
                                  show: (i: number) => ({
                                    opacity: 1, x: 0,
                                    transition: { delay: i * 0.02, duration: 0.2 },
                                  }),
                                  exit: { opacity: 0, x: 8, transition: { duration: 0.15 } },
                                }}
                                initial="hidden"
                                animate="show"
                                layout
                                className="transition-colors duration-150 group cursor-default border-b border-border"
                              >
                                <TableCell className="text-xs py-2 font-medium text-foreground">
                                  <div className="flex items-center gap-2">
                                    <div className="h-6 w-6 rounded-md bg-white/[0.06] flex items-center justify-center text-[10px] font-bold shrink-0 text-muted-foreground">
                                      {debt.counterpart.charAt(0).toUpperCase()}
                                    </div>
                                    <span className="truncate max-w-[120px]">{debt.counterpart}</span>
                                  </div>
                                </TableCell>
                                <TableCell className="text-xs py-2 hidden sm:table-cell max-w-[140px] truncate text-muted-foreground">
                                  {debt.description || '—'}
                                </TableCell>
                                <TableCell className="text-xs text-right py-2 font-semibold tabular-nums text-muted-foreground">
                                  {formatAmount(debt.amount)}
                                </TableCell>
                                <TableCell className="text-xs text-right py-2 font-bold tabular-nums" style={{ color: statusCfg.color }}>
                                  {formatAmount(paidAmount)}
                                </TableCell>
                                <TableCell className="text-xs text-right py-2 font-bold tabular-nums" style={{ color: statusCfg.color }}>
                                  {formatAmount(debt.remaining)}
                                </TableCell>
                                <TableCell className="text-xs py-2 hidden md:table-cell">
                                  {debt.dueDate ? (
                                    <div className="flex flex-col gap-0.5">
                                      <span className={cn("font-mono", isOverdue ? "text-destructive" : "text-muted-foreground")}>
                                        {formatDate(debt.dueDate)}
                                      </span>
                                      {isOverdue && (
                                        <span className="text-[9px] px-1.5 py-0 rounded-full inline-flex items-center gap-1 w-fit bg-destructive/8 text-destructive">
                                          <AlertTriangle className="h-2.5 w-2.5" />
                                          TERLAMBAT {overdueDays} HARI
                                        </span>
                                      )}
                                    </div>
                                  ) : (
                                    <span className="text-muted-foreground">—</span>
                                  )}
                                </TableCell>
                                <TableCell className="py-2">
                                  <Badge
                                    variant="outline"
                                    className="text-[10px] font-medium border-0 rounded-full px-2 py-0"
                                    style={{
                                      backgroundColor: alpha(statusCfg.color, 8),
                                      color: statusCfg.color,
                                    }}
                                  >
                                    {statusCfg.label}
                                  </Badge>
                                </TableCell>
                                <TableCell className="py-2">
                                  <div className="flex items-center justify-center gap-1">
                                    {debt.status !== 'paid' && (
                                      <Button variant="ghost" size="sm" className="h-6 px-1.5 text-[10px] font-medium rounded-md text-secondary" onClick={() => openPaymentDialog(debt)} title="Bayar">
                                        <CircleDollarSign className="h-3 w-3" />
                                        <span className="hidden lg:inline">Bayar</span>
                                      </Button>
                                    )}
                                    <Button variant="ghost" size="sm" className="h-6 px-1.5 text-[10px] font-medium rounded-md" style={{ color: '#25D366' }} onClick={() => sendReminder(debt)} title="Kirim tagihan via WhatsApp">
                                      <MessageCircle className="h-3 w-3" />
                                      <span className="hidden lg:inline">Kirim Tagihan</span>
                                    </Button>
                                    <Button variant="ghost" size="sm" className="h-6 px-1.5 text-[10px] font-medium rounded-md text-muted-foreground" onClick={() => openDetailDialog(debt)} title="Detail">
                                      <ChevronRight className="h-3 w-3" />
                                    </Button>
                                  </div>
                                </TableCell>
                              </motion.tr>
                            );
                          })}
                        </AnimatePresence>
                      </TableBody>
                    </Table>
                  </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </AnimatePresence>

      {/* ════════════════════════════════════════════════════════════ */}
      {/* ── CASH ENTRY DIALOG ──────────────────────────────────── */}
      {/* ════════════════════════════════════════════════════════════ */}
      <Dialog open={cashDialogOpen} onOpenChange={setCashDialogOpen}>
        <DialogContent className="w-[95vw] sm:max-w-lg rounded-xl bg-card border border-border">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold flex items-center gap-2 text-foreground">
              <div
                className="h-7 w-7 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: alpha(subTypeConfig.color, 8) }}
              >
                <span style={{ color: subTypeConfig.color }}>{editingCashEntry ? <Pencil className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}</span>
              </div>
              {editingCashEntry ? t('common.edit') : t('biz.addCashEntry')}
            </DialogTitle>
            <DialogDescription className="pl-9 text-muted-foreground">
              {t(CASH_SUB_TYPES[cashForm.type]?.label || 'biz.kasBesar')}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCashSave} className="space-y-3 mt-1">
            {/* Type selector */}
            <div className="space-y-1.5">
              <Label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Tipe Kas</Label>
              <Select
                value={cashForm.type}
                onValueChange={(v) => {
                  const newType = v as CashSubType;
                  let defaultSource: 'kas_besar' | 'kas_kecil' | 'investor' | '' = '';
                  if (newType === 'kas_kecil') defaultSource = 'kas_besar';
                  if (newType === 'kas_keluar') defaultSource = 'kas_kecil';
                  setCashForm({ ...cashForm, type: newType, source: defaultSource, investorId: '' });
                }}
              >
                <SelectTrigger className="text-sm h-9 rounded-lg bg-card border border-input text-foreground">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card border border-border">
                  {(Object.keys(CASH_SUB_TYPES) as CashSubType[]).map((key) => {
                    const cfg = CASH_SUB_TYPES[key];
                    const Icon = cfg.icon;
                    return (
                      <SelectItem key={key} value={key} className="rounded-lg">
                        <span className="flex items-center gap-2">
                          <span style={{ color: cfg.color }}><Icon className="h-3.5 w-3.5" /></span>
                          {t(cfg.label)}
                        </span>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            {/* Source selector for kas_kecil — Sumber Dana */}
            {cashForm.type === 'kas_kecil' && (
              <div className="space-y-1.5">
                <Label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Sumber Dana</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {([
                    { value: 'kas_besar' as const, label: 'Kas Besar', color: c.secondary, saldo: sourceBalances.kasBesarSaldo },
                    { value: 'investor' as const, label: 'Dana Investor', color: c.primary, saldo: sourceBalances.investorSaldo },
                  ]).map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setCashForm({ ...cashForm, source: opt.value, investorId: '' })}
                      className="py-1.5 px-1 rounded-lg text-[11px] font-medium border transition-all duration-200 flex flex-col items-center gap-0.5"
                      style={
                        cashForm.source === opt.value
                          ? { backgroundColor: alpha(opt.color, 8), color: opt.color, borderColor: alpha(opt.color, 25) }
                          : { borderColor: c.border, color: c.muted }
                      }
                    >
                      <span>{opt.label}</span>
                      <span className="text-[9px] opacity-70">{formatAmount(opt.saldo)}</span>
                    </button>
                  ))}
                </div>
                {/* Investor dropdown when source is investor */}
                {cashForm.source === 'investor' && (
                  <Select
                    value={cashForm.investorId}
                    onValueChange={(v) => setCashForm({ ...cashForm, investorId: v })}
                  >
                    <SelectTrigger className="text-sm h-9 rounded-lg bg-card border border-input text-foreground">
                      <SelectValue placeholder="Pilih Investor" />
                    </SelectTrigger>
                    <SelectContent className="bg-card border border-border">
                      {activeInvestors.map((inv) => (
                        <SelectItem key={inv.id} value={inv.id} className="rounded-lg">
                          <span className="flex items-center gap-2">
                            <div className="h-5 w-5 rounded-md flex items-center justify-center text-[9px] font-bold shrink-0 bg-primary/8 text-primary">
                              {inv.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <span className="text-xs">{inv.name}</span>
                              <span className="text-[10px] ml-1.5 text-muted-foreground">({formatAmount(inv.totalInvestment)})</span>
                            </div>
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            )}

            {/* Source selector for kas_keluar — Dibayar Dari */}
            {cashForm.type === 'kas_keluar' && (
              <div className="space-y-1.5">
                <Label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Dibayar Dari</Label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5">
                  {([
                    { value: 'kas_kecil' as const, label: 'Kas Kecil', color: c.warning, saldo: sourceBalances.kasKecilSaldo },
                    { value: 'kas_besar' as const, label: 'Kas Besar', color: c.secondary, saldo: sourceBalances.kasBesarSaldo },
                    { value: 'investor' as const, label: 'Investor', color: c.primary, saldo: sourceBalances.investorSaldo },
                  ]).map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setCashForm({ ...cashForm, source: opt.value, investorId: '' })}
                      className="py-1.5 px-1 rounded-lg text-[11px] font-medium border transition-all duration-200 flex flex-col items-center gap-0.5"
                      style={
                        cashForm.source === opt.value
                          ? { backgroundColor: alpha(opt.color, 8), color: opt.color, borderColor: alpha(opt.color, 25) }
                          : { borderColor: c.border, color: c.muted }
                      }
                    >
                      <span>{opt.label}</span>
                      <span className="text-[9px] opacity-70">{formatAmount(opt.saldo)}</span>
                    </button>
                  ))}
                </div>
                {/* Balance warning */}
                {cashForm.source && parseFloat(cashForm.amount || '0') > 0 && (() => {
                  const currentSaldo = cashForm.source === 'kas_besar' ? sourceBalances.kasBesarSaldo
                    : cashForm.source === 'kas_kecil' ? sourceBalances.kasKecilSaldo
                    : sourceBalances.investorSaldo;
                  const numAmount = parseFloat(cashForm.amount || '0');
                  if (numAmount > currentSaldo) {
                    return (
                      <div className="flex items-center gap-1.5 p-2 rounded-lg bg-destructive/8 border border-destructive/15">
                        <AlertTriangle className="h-3.5 w-3.5 text-destructive shrink-0" />
                        <span className="text-[10px] text-destructive font-medium">Saldo tidak mencukupi! Sisa: {formatAmount(currentSaldo)}</span>
                      </div>
                    );
                  }
                  return null;
                })()}
                {/* Investor dropdown when source is investor */}
                {cashForm.source === 'investor' && (
                  <Select
                    value={cashForm.investorId}
                    onValueChange={(v) => setCashForm({ ...cashForm, investorId: v })}
                  >
                    <SelectTrigger className="text-sm h-9 rounded-lg bg-card border border-input text-foreground">
                      <SelectValue placeholder="Pilih Investor" />
                    </SelectTrigger>
                    <SelectContent className="bg-card border border-border">
                      {activeInvestors.map((inv) => (
                        <SelectItem key={inv.id} value={inv.id} className="rounded-lg">
                          <span className="flex items-center gap-2">
                            <div className="h-5 w-5 rounded-md flex items-center justify-center text-[9px] font-bold shrink-0 bg-primary/8 text-primary">
                              {inv.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <span className="text-xs">{inv.name}</span>
                              <span className="text-[10px] ml-1.5 text-muted-foreground">({formatAmount(inv.totalInvestment)})</span>
                            </div>
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            )}

            {/* Description */}
            <div className="space-y-1.5">
              <Label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                {t('biz.cashDescription')} <span className="text-destructive">*</span>
              </Label>
              <Input
                value={cashForm.description}
                onChange={(e) => setCashForm({ ...cashForm, description: e.target.value })}
                placeholder={t('biz.cashDescription')}
                className="text-sm rounded-lg bg-card border border-input text-foreground"
              />
            </div>

            {/* Amount with Preview */}
            <div className="space-y-1.5">
              <Label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                {t('biz.cashAmount')} <span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-medium pointer-events-none text-muted-foreground">Rp</span>
                <Input
                  type="number"
                  value={cashForm.amount}
                  onChange={(e) => setCashForm({ ...cashForm, amount: e.target.value })}
                  placeholder="0"
                  min="0"
                  className="text-sm font-semibold pl-8 pr-3 rounded-lg tabular-nums bg-card border border-input text-foreground"
                />
              </div>
              <AnimatePresence mode="wait">
                {formattedCashNominal && (
                  <div
                    className="flex items-center gap-2 px-3 py-2 rounded-lg border-0"
                    style={{
                      backgroundColor: alpha(CASH_SUB_TYPES[cashForm.type].color, 3),
                      borderColor: alpha(CASH_SUB_TYPES[cashForm.type].color, 12),
                      color: CASH_SUB_TYPES[cashForm.type].color,
                    }}
                  >
                    <CircleDollarSign className="h-3.5 w-3.5" />
                    <span className="text-sm font-semibold tabular-nums">{formattedCashNominal}</span>
                  </div>
                )}
              </AnimatePresence>
            </div>

            {/* Date */}
            <div className="space-y-1.5">
              <Label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                {t('biz.cashDate')}
              </Label>
              <Input
                type="date"
                value={cashForm.date}
                onChange={(e) => setCashForm({ ...cashForm, date: e.target.value })}
                className="text-sm rounded-lg bg-card border border-input text-foreground"
              />
            </div>

            {/* Category */}
            <div className="space-y-1.5">
              <Label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                {t('biz.cashCategory')}
              </Label>
              <Select value={cashForm.category} onValueChange={(v) => setCashForm({ ...cashForm, category: v })}>
                <SelectTrigger className="text-sm h-9 rounded-lg bg-card border border-input text-foreground">
                  <SelectValue placeholder={t('biz.cashCategory')} />
                </SelectTrigger>
                <SelectContent className="bg-card border border-border">
                  {cashCategories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.name} className="rounded-lg">
                      <span className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full" style={{ backgroundColor: cat.color || c.secondary }} />
                        {cat.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                value={cashForm.category}
                onChange={(e) => setCashForm({ ...cashForm, category: e.target.value })}
                placeholder="Atau ketik kategori manual..."
                className="text-xs h-8 rounded-lg bg-card border border-input text-foreground"
              />
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <Label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Catatan
              </Label>
              <Textarea
                value={cashForm.notes}
                onChange={(e) => setCashForm({ ...cashForm, notes: e.target.value })}
                placeholder="Catatan tambahan (opsional)"
                className="text-xs min-h-[52px] resize-none rounded-lg bg-card border border-input text-foreground"
              />
            </div>

            <DialogFooter className="gap-2 pt-1">
              <Button
                type="button"
                variant="outline"
                onClick={() => setCashDialogOpen(false)}
                className="rounded-lg border-border text-muted-foreground"
              >
                {t('common.cancel')}
              </Button>
              <Button
                type="submit"
                disabled={cashSaving || !cashForm.description || !cashForm.amount}
                className="rounded-lg disabled:opacity-40 bg-secondary text-secondary-foreground hover:bg-secondary/90"
              >
                {cashSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t('common.save')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ════════════════════════════════════════════════════════════ */}
      {/* ── INVESTOR DIALOG ────────────────────────────────────── */}
      {/* ════════════════════════════════════════════════════════════ */}
      <Dialog open={investorDialogOpen} onOpenChange={setInvestorDialogOpen}>
        <DialogContent className="w-[95vw] sm:max-w-lg rounded-xl bg-card border border-border">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold flex items-center gap-2 text-foreground">
              <div className="h-7 w-7 rounded-lg flex items-center justify-center bg-primary/5">
                {editingInvestor ? <Pencil className="h-3.5 w-3.5 text-primary" /> : <UserPlus className="h-3.5 w-3.5 text-primary" />}
              </div>
              {editingInvestor ? 'Edit Investor' : 'Tambah Investor'}
            </DialogTitle>
            <DialogDescription className="pl-9 text-muted-foreground">
              {editingInvestor ? `Edit data ${editingInvestor.name}` : 'Tambahkan investor baru untuk modal bisnis'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleInvestorSave} className="space-y-3 mt-1">
            {/* Name */}
            <div className="space-y-1.5">
              <Label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Nama Investor <span className="text-destructive">*</span>
              </Label>
              <Input
                value={investorForm.name}
                onChange={(e) => setInvestorForm({ ...investorForm, name: e.target.value })}
                placeholder="Nama lengkap investor"
                className="text-sm rounded-lg bg-card border border-input text-foreground"
              />
            </div>

            {/* Phone & Email */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  <Phone className="h-3 w-3 inline mr-1" />Telepon
                </Label>
                <Input value={investorForm.phone} onChange={(e) => setInvestorForm({ ...investorForm, phone: e.target.value })} placeholder="08xx" className="text-sm rounded-lg bg-card border border-input text-foreground" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  <Mail className="h-3 w-3 inline mr-1" />Email
                </Label>
                <Input type="email" value={investorForm.email} onChange={(e) => setInvestorForm({ ...investorForm, email: e.target.value })} placeholder="email@contoh.com" className="text-sm rounded-lg bg-card border border-input text-foreground" />
              </div>
            </div>

            {/* Investment Amount */}
            <div className="space-y-1.5">
              <Label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Total Modal (Rp) <span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <HandCoins className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="number"
                  value={investorForm.totalInvestment}
                  onChange={(e) => setInvestorForm({ ...investorForm, totalInvestment: e.target.value })}
                  placeholder="0"
                  min="0"
                  className="text-sm font-semibold pl-9 pr-3 rounded-lg tabular-nums bg-card border border-input text-foreground"
                />
              </div>
              <AnimatePresence mode="wait">
                {formattedInvestorNominal && (
                  <div
                    className="flex items-center gap-2 px-3 py-2 rounded-lg border-0"
                    style={{ backgroundColor: alpha(c.primary, 3), borderColor: alpha(c.primary, 8), color: c.primary }}
                  >
                    <CircleDollarSign className="h-3.5 w-3.5" />
                    <span className="text-sm font-semibold tabular-nums">{formattedInvestorNominal}</span>
                  </div>
                )}
              </AnimatePresence>
            </div>

            {/* Profit Share % */}
            <div className="space-y-1.5">
              <Label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                <Percent className="h-3 w-3 inline mr-1" />Bagi Hasil (%)
              </Label>
              <Input
                type="number"
                value={investorForm.profitSharePct}
                onChange={(e) => setInvestorForm({ ...investorForm, profitSharePct: e.target.value })}
                placeholder="0"
                min="0"
                max="100"
                step="0.1"
                className="text-sm rounded-lg tabular-nums bg-card border border-input text-foreground"
              />
            </div>

            <DialogFooter className="gap-2 pt-1">
              <Button
                type="button"
                variant="outline"
                onClick={() => setInvestorDialogOpen(false)}
                className="rounded-lg border-border text-muted-foreground"
              >
                {t('common.cancel')}
              </Button>
              <Button
                type="submit"
                disabled={investorSaving || !investorForm.name}
                className="rounded-lg disabled:opacity-40 bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {investorSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t('common.save')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ════════════════════════════════════════════════════════════ */}
      {/* ── PAYMENT RECORDING DIALOG ───────────────────────────────── */}
      {/* ════════════════════════════════════════════════════════════ */}
      <Dialog open={!!paymentDialogDebt} onOpenChange={(open) => !open && setPaymentDialogDebt(null)}>
        <DialogContent className="max-w-[95vw] sm:max-w-[440px] rounded-xl bg-card border border-border">
          <DialogHeader>
            <DialogTitle className="text-sm sm:text-lg font-semibold flex items-center gap-2 text-foreground">
              <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-lg flex items-center justify-center bg-secondary/8">
                <CircleDollarSign className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-secondary" />
              </div>
              Catat Pembayaran
            </DialogTitle>
            <DialogDescription className="pl-9 text-muted-foreground">
              {paymentDialogDebt?.counterpart} — {paymentDialogDebt?.description || 'Piutang'}
            </DialogDescription>
          </DialogHeader>

          {paymentDialogDebt && (
            <div className="space-y-3 mt-1">
              {/* Debt summary mini */}
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-white/[0.03] border border-border">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-lg bg-white/[0.06] flex items-center justify-center text-[10px] font-bold shrink-0 text-muted-foreground">
                    {paymentDialogDebt.counterpart.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-[9px] sm:text-[10px] uppercase tracking-wider text-muted-foreground">Sisa Tagihan</p>
                    <p className="text-[11px] sm:text-sm font-bold tabular-nums text-destructive">{formatAmount(paymentDialogDebt.remaining)}</p>
                  </div>
                </div>
                {paymentDialogDebt.installmentAmount && (
                  <div className="text-right">
                    <p className="text-[9px] sm:text-[10px] uppercase tracking-wider text-muted-foreground">Angsuran</p>
                    <p className="text-[11px] sm:text-sm font-bold tabular-nums text-warning">{formatAmount(paymentDialogDebt.installmentAmount)}</p>
                  </div>
                )}
              </div>

              {/* Amount */}
              <div className="space-y-1.5">
                <Label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  Jumlah Bayar <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-medium pointer-events-none text-muted-foreground">Rp</span>
                  <Input
                    type="number"
                    value={paymentForm.amount}
                    onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                    placeholder="0"
                    min="0"
                    max={paymentDialogDebt.remaining}
                    className="text-sm font-semibold pl-8 pr-3 rounded-lg tabular-nums bg-card border border-secondary/25 text-foreground"
                  />
                </div>
                <AnimatePresence mode="wait">
                  {formattedPaymentNominal && (
                    <div
                      className="flex items-center gap-2 px-3 py-2 rounded-lg border-0"
                      style={{ backgroundColor: alpha(c.secondary, 3), borderColor: alpha(c.secondary, 8), color: c.secondary }}
                    >
                      <CircleDollarSign className="h-4 w-4" />
                      <span className="text-sm font-semibold tabular-nums">{formattedPaymentNominal}</span>
                    </div>
                  )}
                </AnimatePresence>
              </div>

              {/* Payment Date */}
              <div className="space-y-1.5">
                <Label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  <CalendarDays className="h-3 w-3 inline mr-1" />Tanggal Bayar
                </Label>
                <Input
                  type="date"
                  value={paymentForm.paymentDate}
                  onChange={(e) => setPaymentForm({ ...paymentForm, paymentDate: e.target.value })}
                  className="text-sm rounded-lg bg-card border border-secondary/25 text-foreground"
                />
              </div>

              {/* Payment Method */}
              <div className="space-y-1.5">
                <Label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  Metode Pembayaran
                </Label>
                <div className="grid grid-cols-3 gap-1.5">
                  {([
                    { value: 'transfer' as const, label: 'Transfer', color: c.secondary },
                    { value: 'cash' as const, label: 'Cash', color: c.warning },
                    { value: 'qris' as const, label: 'QRIS', color: c.primary },
                  ]).map((method) => (
                    <button
                      key={method.value}
                      onClick={() => setPaymentForm({ ...paymentForm, paymentMethod: method.value })}
                      className="py-1.5 rounded-lg text-[11px] font-medium border transition-all duration-200"
                      style={
                        paymentForm.paymentMethod === method.value
                          ? { backgroundColor: alpha(method.color, 8), color: method.color, borderColor: alpha(method.color, 25) }
                          : { borderColor: c.border, color: c.muted }
                      }
                    >
                      {method.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-1.5">
                <Label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  Catatan
                </Label>
                <Textarea
                  value={paymentForm.notes}
                  onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                  placeholder="Catatan pembayaran (opsional)"
                  className="text-xs min-h-[52px] resize-none rounded-lg bg-card border border-input text-foreground"
                />
              </div>

              <DialogFooter className="gap-2 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setPaymentDialogDebt(null)}
                  className="rounded-lg border-border text-muted-foreground"
                >
                  {t('common.cancel')}
                </Button>
                <Button
                  onClick={recordPayment}
                  disabled={paymentSaving || !paymentForm.amount}
                  className="rounded-lg disabled:opacity-40 bg-secondary text-secondary-foreground hover:bg-secondary/90"
                >
                  {paymentSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  <CircleDollarSign className="h-4 w-4 mr-1.5" />
                  Simpan Pembayaran
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ════════════════════════════════════════════════════════════ */}
      {/* ── DETAIL / TIMELINE DIALOG ───────────────────────────────── */}
      {/* ════════════════════════════════════════════════════════════ */}
      <Dialog open={!!detailDialogDebt} onOpenChange={(open) => !open && setDetailDialogDebt(null)}>
        <DialogContent className="max-w-[95vw] sm:max-w-[480px] rounded-xl max-h-[85vh] overflow-y-auto bg-card border border-border">
          {detailDialogDebt && (
            <>
              <DialogHeader>
                <DialogTitle className="text-sm sm:text-lg font-semibold flex items-center gap-2 text-foreground">
                  <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-lg flex items-center justify-center bg-primary/5">
                    <HandCoins className="h-4 w-4 text-primary" />
                  </div>
                  Detail Piutang
                </DialogTitle>
                <DialogDescription className="pl-9 text-muted-foreground">
                  {detailDialogDebt.counterpart}
                </DialogDescription>
              </DialogHeader>

              {detailLoading ? (
                <div className="space-y-2 py-3">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-14 rounded-xl bg-card" />
                  ))}
                </div>
              ) : (
                <div className="space-y-3 mt-1">
                  {/* ── Summary Card ── */}
                  <div className="p-3 rounded-xl space-y-3 bg-white/[0.03] border border-border">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="h-7 w-7 rounded-lg bg-white/[0.06] flex items-center justify-center text-[10px] font-bold shrink-0 text-muted-foreground">
                        {detailDialogDebt.counterpart.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs sm:text-sm font-semibold break-words text-foreground">{detailDialogDebt.counterpart}</p>
                        {detailDialogDebt.description && (
                          <p className="text-[10px] sm:text-[11px] break-words text-muted-foreground">{detailDialogDebt.description}</p>
                        )}
                      </div>
                      <Badge
                        variant="outline"
                        className="text-[10px] font-medium border-0 rounded-full px-2.5 py-0.5 shrink-0"
                        style={{ backgroundColor: alpha(getStatusConfig(detailDialogDebt.status).color, 8), color: getStatusConfig(detailDialogDebt.status).color }}
                      >
                        {getStatusConfig(detailDialogDebt.status).label}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-3 gap-2 sm:gap-3">
                      <div>
                        <p className="text-white/30 text-[8px] sm:text-[9px] uppercase tracking-wider">Total</p>
                        <p className="text-[11px] sm:text-sm font-bold tabular-nums text-foreground">{formatAmount(detailDialogDebt.amount)}</p>
                      </div>
                      <div>
                        <p className="text-white/30 text-[8px] sm:text-[9px] uppercase tracking-wider">Dibayar</p>
                        <p className="text-[11px] sm:text-sm font-bold tabular-nums text-secondary">{formatAmount(detailDialogDebt.amount - detailDialogDebt.remaining)}</p>
                      </div>
                      <div>
                        <p className="text-white/30 text-[8px] sm:text-[9px] uppercase tracking-wider">Sisa</p>
                        <p className="text-[11px] sm:text-sm font-bold tabular-nums text-warning">{formatAmount(detailDialogDebt.remaining)}</p>
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-white/25 text-[10px]">Progress</span>
                        <span className="text-white/25 text-[10px] tabular-nums">
                          {detailDialogDebt.amount > 0
                            ? Math.round(((detailDialogDebt.amount - detailDialogDebt.remaining) / detailDialogDebt.amount) * 100)
                            : 0}%
                        </span>
                      </div>
                      <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full bg-secondary transition-all duration-700"
                          style={{
                            width: `${detailDialogDebt.amount > 0 ? Math.min(100, ((detailDialogDebt.amount - detailDialogDebt.remaining) / detailDialogDebt.amount) * 100) : 0}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>

                    {/* Due date info */}
                    {detailDialogDebt.dueDate && (
                      <div className="flex items-center gap-2 pt-1">
                        <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-xs">
                          Jatuh tempo:{' '}
                          <span
                            className={cn(
                              "font-mono",
                              detailDialogDebt.status !== 'paid' && differenceInDays(new Date(), parseISO(detailDialogDebt.dueDate)) > 0
                                ? 'font-semibold text-destructive'
                                : ''
                            )}
                          >
                            {formatDate(detailDialogDebt.dueDate)}
                          </span>
                        </span>
                      </div>
                    )}

                  {/* ── Payment Score ── */}
                  <div className="p-3 rounded-xl border-0" style={{
                    backgroundColor: alpha(getPaymentScore(detailDialogDebt).color, 3),
                    borderColor: alpha(getPaymentScore(detailDialogDebt).color, 12),
                  }}>
                    <div className="flex items-center gap-2 sm:gap-3">
                      <div
                        className="h-8 w-8 sm:h-10 sm:w-10 rounded-xl flex items-center justify-center text-sm sm:text-lg font-bold"
                        style={{
                          backgroundColor: alpha(getPaymentScore(detailDialogDebt).color, 8),
                          color: getPaymentScore(detailDialogDebt).color,
                        }}
                      >
                        {getPaymentScore(detailDialogDebt).score}
                      </div>
                      <div>
                        <p className="text-white/40 text-[9px] sm:text-[10px] uppercase tracking-wider">Skor Pembayaran</p>
                        <p className="text-[11px] sm:text-sm font-bold" style={{ color: getPaymentScore(detailDialogDebt).color }}>
                          {getPaymentScore(detailDialogDebt).label}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* ── Payment Timeline ── */}
                  <div>
                    <h3 className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider mb-2 flex items-center gap-2 text-muted-foreground">
                      <Clock className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                      Riwayat Pembayaran
                    </h3>
                    {(debtPayments[detailDialogDebt.id] || []).length === 0 ? (
                      <div className="text-center py-6 rounded-lg bg-white/[0.02] border border-border">
                        <Inbox className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
                        <p className="text-[10px] text-muted-foreground">Belum ada pembayaran tercatat</p>
                      </div>
                    ) : (
                      <div className="space-y-1.5 max-h-[220px] overflow-y-auto">
                        {[...(debtPayments[detailDialogDebt.id] || [])]
                          .sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime())
                          .map((payment, idx) => (
                            <div
                              key={payment.id}
                              className="flex items-start gap-2 p-2.5 rounded-xl hover:border-opacity-100 transition-colors bg-white/[0.03] border border-border"
                            >
                              <div className="mt-0.5 flex flex-col items-center">
                                <div className="h-5 w-5 rounded-full flex items-center justify-center bg-secondary/8">
                                  <CheckCircle2 className="h-2.5 w-2.5 text-secondary" />
                                </div>
                                {idx < (debtPayments[detailDialogDebt.id] || []).length - 1 && (
                                  <div className="w-px flex-1 mt-1 min-h-[14px] bg-border" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-1.5">
                                  <p className="text-[11px] font-bold tabular-nums text-secondary">
                                    +{formatAmount(payment.amount)}
                                  </p>
                                  <div className="flex items-center gap-1 shrink-0">
                                    {payment.paymentMethod && (
                                      <Badge variant="outline" className={cn(
                                        "text-[9px] font-medium border-0 rounded-full px-1.5 py-0",
                                        payment.paymentMethod === 'transfer' ? "bg-secondary/8 text-secondary" :
                                        payment.paymentMethod === 'cash' ? "bg-warning/8 text-warning" :
                                        "bg-primary/8 text-primary"
                                      )}>
                                        {payment.paymentMethod === 'transfer' ? 'Transfer' : payment.paymentMethod === 'cash' ? 'Cash' : 'QRIS'}
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className="text-[10px] font-mono text-muted-foreground">
                                    {formatDate(payment.paymentDate)}
                                  </span>
                                  {detailDialogDebt.dueDate && (() => {
                                    const diff = differenceInDays(new Date(payment.paymentDate), parseISO(detailDialogDebt.dueDate));
                                    if (diff <= 0) return <span className="text-[9px] text-secondary/50">Tepat waktu</span>;
                                    if (diff <= 7) return <span className="text-[9px] text-warning/50">+{diff} hari</span>;
                                    return <span className="text-[9px] text-destructive/50">+{diff} hari</span>;
                                  })()}
                                </div>
                                {payment.notes && (
                                  <p className="text-[10px] mt-1 truncate text-muted-foreground">{payment.notes}</p>
                                )}
                              </div>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>

                  {/* ── Action Buttons ── */}
                  {detailDialogDebt.status !== 'paid' && (
                    <div className="flex gap-2 pt-1">
                      <Button
                        onClick={() => {
                          setDetailDialogDebt(null);
                          openPaymentDialog(detailDialogDebt);
                        }}
                        className="flex-1 border-0 rounded-lg h-9 bg-secondary text-secondary-foreground hover:bg-secondary/90"
                      >
                        <CircleDollarSign className="h-4 w-4 mr-1.5" />
                        Catat Pembayaran
                      </Button>
                      <Button
                        onClick={() => sendReminder(detailDialogDebt)}
                        variant="outline"
                        className="flex-1 border-0 rounded-lg h-9"
                        style={{ borderColor: alpha('#25D366', 25), color: '#25D366' }}
                      >
                        <MessageCircle className="h-4 w-4 mr-1.5" />
                        Kirim Tagihan
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ══════════════════════════════════════════════════════════ */}
      {/* ── DELETE CONFIRMATION ────────────────────────────────────── */}
      {/* ══════════════════════════════════════════════════════════ */}
      <AlertDialog open={!!cashDeleteId} onOpenChange={(open) => !open && setCashDeleteId(null)}>
        <AlertDialogContent className="w-[95vw] sm:max-w-md rounded-xl bg-card border border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-foreground">
              <div className="h-7 w-7 rounded-lg flex items-center justify-center bg-destructive/5">
                <Trash2 className="h-4 w-4 text-destructive" />
              </div>
              {t('common.delete')}
            </AlertDialogTitle>
            <AlertDialogDescription className="pl-9 text-muted-foreground">
              Apakah Anda yakin ingin menghapus transaksi ini? Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 pt-2">
            <AlertDialogCancel className="rounded-lg border-border text-muted-foreground">
              {t('common.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCashDelete}
              className="rounded-lg border-0 bg-destructive hover:bg-destructive/90 text-primary-foreground"
            >
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ─── Inline SVG Pie Chart Icon (replaces missing lucide PieChart) ──
function PieChartIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
    >
      <path d="M21.21 15.89A10 10 0 1 1 8 2.83" />
      <path d="M22 12A10 10 0 0 0 12 2v10z" />
    </svg>
  );
}
