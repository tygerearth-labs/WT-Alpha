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
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, parseISO, differenceInDays } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';

// ─── THEME ─────────────────────────────────────────────────────
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
};

const inputCls = 'bg-transparent border text-white placeholder:text-white/30 rounded-lg focus:ring-1';
const inputBorder = `1px solid ${THEME.border}`;

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
}

// ─── Constants ──────────────────────────────────────────────────────
const CASH_SUB_TYPES = {
  kas_besar: {
    label: 'biz.kasBesar',
    color: THEME.secondary,
    icon: Wallet,
  },
  kas_kecil: {
    label: 'biz.kasKecil',
    color: THEME.primary,
    icon: PiggyBank,
  },
  kas_keluar: {
    label: 'biz.kasKeluar',
    color: THEME.destructive,
    icon: ArrowDownToLine,
  },
} as const;

type CashSubType = keyof typeof CASH_SUB_TYPES;

const PIUTANG_STATUS_CONFIG = {
  berjalan: {
    label: 'Berjalan',
    statuses: ['active', 'partially_paid'],
    color: THEME.secondary,
    icon: Clock,
  },
  macet: {
    label: 'Macet',
    statuses: ['overdue'],
    color: THEME.destructive,
    icon: AlertTriangle,
  },
  selesai: {
    label: 'Selesai',
    statuses: ['paid'],
    color: THEME.primary,
    icon: CheckCircle2,
  },
} as const;

type PiutangSubTab = keyof typeof PIUTANG_STATUS_CONFIG;

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

function getStatusConfig(status: string): { label: string; color: string; textClass: string } {
  switch (status) {
    case 'active':
      return { label: 'Aktif', color: THEME.secondary, textClass: '' };
    case 'partially_paid':
      return { label: 'Sebagian', color: THEME.warning, textClass: '' };
    case 'paid':
      return { label: 'Lunas', color: THEME.primary, textClass: '' };
    case 'overdue':
      return { label: 'Jatuh Tempo', color: THEME.destructive, textClass: '' };
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
      <div
        className="relative mb-4 w-16 h-16 rounded-xl flex items-center justify-center"
        style={{ background: THEME.surface, border: `1px solid ${THEME.border}` }}
      >
        {icon}
      </div>
      <p className="text-sm font-medium" style={{ color: THEME.textSecondary }}>{title}</p>
      <p className="text-xs mt-1 text-center max-w-[220px]" style={{ color: THEME.muted }}>{description}</p>
      {onAction && actionLabel && (
        <Button
          onClick={onAction}
          size="sm"
          className="mt-4 rounded-lg h-8"
          style={{ backgroundColor: `${accentColor}15`, color: accentColor, border: `1px solid ${accentColor}30` }}
        >
          <Plus className="h-3.5 w-3.5 mr-1" />
          {actionLabel}
        </Button>
      )}
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
  });
  const [cashSaving, setCashSaving] = useState(false);
  const [cashDeleteId, setCashDeleteId] = useState<string | null>(null);
  const [cashCategories, setCashCategories] = useState<Category[]>([]);
  const [cashSearch, setCashSearch] = useState('');

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
    const catType = cashSubTab === 'kas_keluar' ? 'pengeluaran' : 'pemasukan';

    Promise.all([
      fetch(`/api/business/${businessId}/cash?type=kas_besar`).then((r) =>
        r.ok ? r.json() : { cashEntries: [], total: 0 }
      ),
      fetch(`/api/business/${businessId}/cash?type=kas_kecil`).then((r) =>
        r.ok ? r.json() : { cashEntries: [], total: 0 }
      ),
      fetch(`/api/business/${businessId}/cash?type=kas_keluar`).then((r) =>
        r.ok ? r.json() : { cashEntries: [], total: 0 }
      ),
      fetch(`/api/business/${businessId}/categories?type=${catType}`).then((r) =>
        r.ok ? r.json() : { categories: [] }
      ),
    ])
      .then(([besarData, kecilData, keluarData, catData]) => {
        const besarEntries: CashEntry[] = besarData?.cashEntries || [];
        const kecilEntries: CashEntry[] = kecilData?.cashEntries || [];
        const keluarEntries: CashEntry[] = keluarData?.cashEntries || [];
        const allEntries = [...besarEntries, ...kecilEntries, ...keluarEntries];
        setCashEntries(allEntries);
        const inc = (besarData?.total || 0) + (kecilData?.total || 0);
        const exp = keluarData?.total || 0;
        setIncomeTotal(inc);
        setExpenseTotal(exp);
        setCashCategories(catData?.categories || []);
      })
      .catch(() => {
        setCashEntries([]);
        setIncomeTotal(0);
        setExpenseTotal(0);
        setCashCategories([]);
      })
      .finally(() => setCashLoading(false));
  }, [businessId, cashSubTab]);

  const fetchInvestors = useCallback(() => {
    if (!businessId) return;
    setInvestorLoading(true);
    fetch(`/api/business/${businessId}/investors`)
      .then((r) => (r.ok ? r.json() : { investors: [], summary: {} }))
      .then((result) => {
        setInvestors(result?.investors || []);
        setInvestorSummary(result?.summary || { activeCount: 0, totalInvestment: 0, avgSharePct: 0 });
      })
      .catch(() => {
        setInvestors([]);
        setInvestorSummary({ activeCount: 0, totalInvestment: 0, avgSharePct: 0 });
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
        window.open(data.message, '_blank');
      }
      toast.success('Pengingat WhatsApp berhasil dibuat');
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
  }, [businessId, cashSubTab, mainTab, fetchAllCashData]);

  // ══════════════════════════════════════════════════════════════════
  // ── Derived Data ──────────────────────────────────────────────────
  // ══════════════════════════════════════════════════════════════════

  const filteredCashEntries = useMemo(() => {
    let entries = cashEntries.filter((e) => e.type === cashSubTab);
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
  }, [cashEntries, cashSubTab, cashSearch]);

  const currentCashSubTotal = useMemo(() => {
    return filteredCashEntries.reduce((sum, e) => sum + e.amount, 0);
  }, [filteredCashEntries]);

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
          return { score: 0, label: 'Belum Bayar', color: THEME.destructive };
        }
      }
      return { score: 50, label: 'Menunggu Pembayaran', color: THEME.warning };
    }
    const sortedPayments = [...payments].sort(
      (a, b) => new Date(a.paymentDate).getTime() - new Date(b.paymentDate).getTime()
    );
    const latestPayment = sortedPayments[sortedPayments.length - 1];
    if (!debt.dueDate) {
      return { score: 75, label: 'Agak Terlambat', color: THEME.warning };
    }
    const dueDate = parseISO(debt.dueDate);
    const payDate = new Date(latestPayment.paymentDate);
    const diffDays = differenceInDays(payDate, dueDate);
    if (diffDays <= 0) {
      return { score: 100, label: 'Tepat Waktu', color: THEME.secondary };
    } else if (diffDays <= 7) {
      return { score: 75, label: 'Agak Terlambat', color: THEME.warning };
    } else {
      return { score: 50, label: 'Terlambat', color: THEME.destructive };
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

  // ── Cash CRUD ──
  const openCashCreate = () => {
    setEditingCashEntry(null);
    setCashForm({
      description: '',
      amount: '',
      date: new Date().toISOString().split('T')[0],
      type: cashSubTab,
      category: '',
      notes: '',
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
    });
    setCashDialogOpen(true);
  };

  const handleCashSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessId || !cashForm.description || !cashForm.amount) return;
    setCashSaving(true);
    try {
      const url = editingCashEntry
        ? `/api/business/${businessId}/cash/${editingCashEntry.id}`
        : `/api/business/${businessId}/cash`;
      const res = await fetch(url, {
        method: editingCashEntry ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: cashForm.type,
          amount: parseFloat(cashForm.amount),
          description: cashForm.description,
          category: cashForm.category || undefined,
          date: cashForm.date,
          notes: cashForm.notes || undefined,
        }),
      });
      if (!res.ok) throw new Error();
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

  // ── Investor CRUD ──
  const openInvestorCreate = () => {
    setInvestorForm({ name: '', phone: '', email: '', totalInvestment: '', profitSharePct: '' });
    setInvestorDialogOpen(true);
  };

  const handleInvestorSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessId || !investorForm.name) return;
    setInvestorSaving(true);
    try {
      const res = await fetch(`/api/business/${businessId}/investors`, {
        method: 'POST',
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
      toast.success('Investor berhasil ditambahkan');
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

  // ══════════════════════════════════════════════════════════════════
  // ── No Business Guard ─────────────────────────────────────────────
  // ══════════════════════════════════════════════════════════════════
  if (!businessId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
        <div className="h-12 w-12 rounded-xl flex items-center justify-center" style={{ background: THEME.surface, border: `1px solid ${THEME.border}` }}>
          <Banknote className="h-6 w-6" style={{ color: THEME.muted }} />
        </div>
        <p className="text-sm text-center" style={{ color: THEME.textSecondary }}>{t('biz.registerFirst')}</p>
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
    { key: 'arus_kas', label: 'Arus Kas', icon: TrendingUp, color: THEME.secondary },
    { key: 'investor', label: 'Investor', icon: Users, color: THEME.primary },
    { key: 'piutang', label: 'Piutang', icon: HandCoins, color: THEME.warning },
  ];

  const subTypeConfig = CASH_SUB_TYPES[cashSubTab];

  // ══════════════════════════════════════════════════════════════════
  // ── RENDER ────────────────────────────────────────────────────────
  // ══════════════════════════════════════════════════════════════════
  return (
    <div className="space-y-4">
      {/* ── Main Tab Header ── */}
      <div
        className="flex gap-1 rounded-xl p-1 w-fit"
        style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${THEME.border}` }}
      >
        {mainTabs.map((mt) => {
          const Icon = mt.icon;
          const isActive = mainTab === mt.key;
          return (
            <Button
              key={mt.key}
              variant="ghost"
              size="sm"
              onClick={() => setMainTab(mt.key)}
              className={cn(
                'rounded-lg px-3 sm:px-4 transition-colors duration-200 text-xs',
                isActive ? 'font-semibold' : '',
              )}
              style={isActive ? { color: mt.color, background: `${mt.color}15` } : { color: THEME.muted }}
            >
              <Icon className="h-3.5 w-3.5 mr-1" />
              <span className="hidden sm:inline">{mt.label}</span>
              <span className="sm:hidden">{mt.label.split(' ')[0]}</span>
            </Button>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        {/* ══════════════════════════════════════════════════ */}
        {/* ── TAB 1: ARUS KAS ─────────────────────────────────────── */}
        {/* ══════════════════════════════════════════════════ */}
        {mainTab === 'arus_kas' && (
          <div key="arus_kas" className="space-y-4">
            {/* ── Flow Summary Cards ── */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
              {/* Total Pemasukan */}
              <Card
                className="rounded-xl overflow-hidden transition-colors duration-200 cursor-default"
                style={{ background: THEME.surface, border: `1px solid ${THEME.border}` }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor = `${THEME.secondary}40`;
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor = THEME.border;
                }}
              >
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="h-7 w-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${THEME.secondary}15` }}>
                      <ArrowUpRight className="h-3.5 w-3.5" style={{ color: THEME.secondary }} />
                    </div>
                    <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: THEME.muted }}>
                      Total Pemasukan
                    </span>
                  </div>
                  <p className="text-sm font-bold tabular-nums" style={{ color: THEME.secondary }}>
                    {formatAmount(animIncome)}
                  </p>
                  <div className="mt-2">
                    <MiniCashSparkline color={THEME.secondary} value={animIncome} />
                  </div>
                </CardContent>
              </Card>

              {/* Total Pengeluaran */}
              <Card
                className="rounded-xl overflow-hidden transition-colors duration-200 cursor-default"
                style={{ background: THEME.surface, border: `1px solid ${THEME.border}` }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor = `${THEME.destructive}40`;
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor = THEME.border;
                }}
              >
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="h-7 w-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${THEME.destructive}15` }}>
                      <ArrowDownRight className="h-3.5 w-3.5" style={{ color: THEME.destructive }} />
                    </div>
                    <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: THEME.muted }}>
                      Total Pengeluaran
                    </span>
                  </div>
                  <p className="text-sm font-bold tabular-nums" style={{ color: THEME.destructive }}>
                    {formatAmount(animExpense)}
                  </p>
                  <div className="mt-2">
                    <MiniCashSparkline color={THEME.destructive} value={animExpense} />
                  </div>
                </CardContent>
              </Card>

              {/* Arus Bersih */}
              <Card
                className="rounded-xl overflow-hidden transition-colors duration-200 cursor-default"
                style={{
                  background: THEME.surface,
                  border: `1px solid ${animNet >= 0 ? `${THEME.secondary}30` : THEME.border}`,
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor = `${(animNet >= 0 ? THEME.secondary : THEME.destructive)}50`;
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor = THEME.border;
                }}
              >
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div
                      className="h-7 w-7 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: `${(animNet >= 0 ? THEME.secondary : THEME.destructive)}15` }}
                    >
                      <CircleDollarSign className="h-3.5 w-3.5" style={{ color: animNet >= 0 ? THEME.secondary : THEME.destructive }} />
                    </div>
                    <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: THEME.muted }}>
                      Arus Bersih
                    </span>
                  </div>
                  <p className="text-sm font-bold tabular-nums" style={{ color: animNet >= 0 ? THEME.secondary : THEME.destructive }}>
                    {animNet >= 0 ? '+' : '-'}
                    {formatAmount(Math.abs(animNet))}
                  </p>
                  <div className="mt-2">
                    <MiniCashSparkline color={animNet >= 0 ? THEME.secondary : THEME.destructive} value={animNet} />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* ── Cashflow Realization Info Card ── */}
            {allPiutang.length > 0 && (
              <Card
                className="rounded-xl overflow-hidden"
                style={{ background: THEME.surface, border: `1px solid ${THEME.primary}20` }}
              >
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="h-6 w-6 rounded-md flex items-center justify-center" style={{ backgroundColor: `${THEME.primary}15` }}>
                      <TrendingUp className="h-3 w-3" style={{ color: THEME.primary }} />
                    </div>
                    <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: THEME.muted }}>
                      Realisasi Pendapatan
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 sm:gap-3">
                    <div>
                      <p className="text-[9px] uppercase tracking-wider mb-1" style={{ color: THEME.muted }}>Pendapatan Tercatat</p>
                      <p className="text-sm font-bold tabular-nums" style={{ color: THEME.primary }}>{formatAmount(cashflowRealization.pendapatanTercatat)}</p>
                    </div>
                    <div>
                      <p className="text-[9px] uppercase tracking-wider mb-1" style={{ color: THEME.muted }}>Sudah Diterima</p>
                      <p className="text-sm font-bold tabular-nums" style={{ color: THEME.secondary }}>{formatAmount(cashflowRealization.sudahDiterima)}</p>
                    </div>
                    <div>
                      <p className="text-[9px] uppercase tracking-wider mb-1" style={{ color: THEME.muted }}>Belum Diterima</p>
                      <p className="text-sm font-bold tabular-nums" style={{ color: THEME.warning }}>{formatAmount(cashflowRealization.belumDiterima)}</p>
                    </div>
                  </div>
                  {cashflowRealization.pendapatanTercatat > 0 && (
                    <div style={{ borderTop: `1px solid ${THEME.border}`, marginTop: '12px', paddingTop: '12px' }}>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: THEME.border }}>
                          <div
                            className="h-full rounded-full transition-all duration-700"
                            style={{
                              width: `${Math.min(100, (cashflowRealization.sudahDiterima / cashflowRealization.pendapatanTercatat) * 100)}%`,
                              backgroundColor: THEME.secondary,
                            }}
                          />
                        </div>
                        <span className="text-[10px] tabular-nums min-w-[32px] text-right" style={{ color: THEME.muted }}>
                          {Math.round((cashflowRealization.sudahDiterima / cashflowRealization.pendapatanTercatat) * 100)}%
                        </span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* ── Sub-tab toggle + Search + Add Button ── */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3">
              <div className="flex items-center gap-2 flex-1">
                {/* Sub-tabs */}
                <div className="flex gap-1 rounded-lg p-0.5" style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${THEME.border}` }}>
                  {(Object.keys(CASH_SUB_TYPES) as CashSubType[]).map((key) => {
                    const cfg = CASH_SUB_TYPES[key];
                    const Icon = cfg.icon;
                    const isActive = cashSubTab === key;
                    return (
                      <button
                        key={key}
                        onClick={() => setCashSubTab(key)}
                        className={cn(
                          'flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all duration-200',
                        )}
                        style={
                          isActive
                            ? { backgroundColor: `${cfg.color}15`, color: cfg.color }
                            : { color: THEME.muted }
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
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5" style={{ color: THEME.muted }} />
                  <Input
                    value={cashSearch}
                    onChange={(e) => setCashSearch(e.target.value)}
                    placeholder={t('common.search') + '...'}
                    className="pl-8 rounded-lg h-8 text-xs"
                    style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${THEME.border}`, color: THEME.text }}
                  />
                </div>
              </div>

              <Button
                onClick={openCashCreate}
                size="sm"
                className="rounded-lg h-8"
                style={{ backgroundColor: THEME.secondary, color: '#fff' }}
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                {t('biz.addCashEntry')}
              </Button>
            </div>

            {/* ── Sub-total indicator ── */}
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full" style={{ backgroundColor: subTypeConfig.color }} />
              <span className="text-xs" style={{ color: THEME.muted }}>{t('common.total')}:</span>
              <span className="text-sm font-bold" style={{ color: subTypeConfig.color }}>
                {formatAmount(currentCashSubTotal)}
              </span>
              <span className="text-[10px]" style={{ color: THEME.muted }}>({filteredCashEntries.length} transaksi)</span>
            </div>

            {/* ── Cash Entries Table ── */}
            <Card
              className="rounded-xl overflow-hidden"
              style={{ background: THEME.surface, border: `1px solid ${THEME.border}` }}
            >
              <CardContent className="p-0">
                {cashLoading ? (
                  <div className="space-y-2 p-3 sm:p-4">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Skeleton key={i} className="h-10 rounded-lg" style={{ background: THEME.border }} />
                    ))}
                  </div>
                ) : filteredCashEntries.length === 0 ? (
                  <EmptyState
                    icon={<Inbox className="h-8 w-8" style={{ color: THEME.muted }} />}
                    accentColor={subTypeConfig.color}
                    title="Belum ada transaksi"
                    description={`Mulai tambahkan catatan ${t(subTypeConfig.label).toLowerCase()} pertama Anda`}
                    onAction={openCashCreate}
                    actionLabel={t('biz.addCashEntry')}
                  />
                ) : (
                  <div className="max-h-[500px] overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow style={{ borderBottom: `1px solid ${THEME.border}` }} className="hover:bg-transparent">
                          <TableHead className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: THEME.muted, width: '90px' }}>
                            {t('biz.cashDate')}
                          </TableHead>
                          <TableHead className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: THEME.muted }}>
                            {t('biz.cashDescription')}
                          </TableHead>
                          <TableHead className="text-[10px] font-semibold uppercase tracking-wider hidden sm:table-cell" style={{ color: THEME.muted }}>
                            {t('biz.cashCategory')}
                          </TableHead>
                          <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-right" style={{ color: THEME.muted, width: '120px' }}>
                            {t('biz.cashAmount')}
                          </TableHead>
                          <TableHead className="w-16" />
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <AnimatePresence mode="popLayout">
                          {filteredCashEntries.map((entry, index) => {
                            const isExpense = entry.type === 'kas_keluar';
                            const entryColor = CASH_SUB_TYPES[entry.type as CashSubType];
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
                                className="transition-colors duration-150 group cursor-default"
                                style={{ borderBottom: `1px solid ${THEME.border}` }}
                              >
                                <TableCell className="text-xs py-2 font-mono" style={{ color: THEME.textSecondary }}>
                                  {formatDate(entry.date)}
                                </TableCell>
                                <TableCell className="text-xs py-2 font-medium max-w-[180px] truncate" style={{ color: THEME.text }}>
                                  <span className="flex items-center gap-1.5">
                                    {isExpense ? (
                                      <ArrowDownRight className="h-3 w-3 shrink-0" style={{ color: THEME.destructive }} />
                                    ) : (
                                      <ArrowUpRight className="h-3 w-3 shrink-0" style={{ color: THEME.secondary }} />
                                    )}
                                    <span className="truncate">{entry.description}</span>
                                  </span>
                                </TableCell>
                                <TableCell className="py-2 hidden sm:table-cell">
                                  {entry.category ? (
                                    <Badge
                                      variant="outline"
                                      className="text-[10px] font-medium border-0 rounded-full px-2 py-0"
                                      style={{ backgroundColor: `${entryColor.color}15`, color: entryColor.color }}
                                    >
                                      {entry.category}
                                    </Badge>
                                  ) : (
                                    <span className="text-xs" style={{ color: THEME.muted }}>—</span>
                                  )}
                                </TableCell>
                                <TableCell
                                  className="text-xs text-right font-semibold py-2 tabular-nums"
                                  style={{ color: isExpense ? THEME.destructive : THEME.secondary }}
                                >
                                  {isExpense ? '-' : '+'}
                                  {formatAmount(entry.amount)}
                                </TableCell>
                                <TableCell className="py-2 text-right">
                                  <div className="flex items-center justify-end gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 rounded-md" style={{ color: THEME.muted }} onClick={() => openCashEdit(entry)}>
                                      <Pencil className="h-3 w-3" />
                                    </Button>
                                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 rounded-md" style={{ color: THEME.muted }} onClick={() => setCashDeleteId(entry.id)}>
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
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════ */}
        {/* ── TAB 2: INVESTOR ─────────────────────────────────── */}
        {/* ══════════════════════════════════════════════════════════ */}
        {mainTab === 'investor' && (
          <div key="investor" className="space-y-4">
            {/* ── Investor Summary Cards ── */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
              <Card className="rounded-xl overflow-hidden" style={{ background: THEME.surface, border: `1px solid ${THEME.primary}20` }}>
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="h-7 w-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${THEME.primary}15` }}>
                      <HandCoins className="h-3.5 w-3.5" style={{ color: THEME.primary }} />
                    </div>
                    <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: THEME.muted }}>Total Modal Investor</span>
                  </div>
                  <p className="text-sm font-bold tabular-nums" style={{ color: THEME.primary }}>{formatAmount(animTotalInvestment)}</p>
                </CardContent>
              </Card>

              <Card className="rounded-xl overflow-hidden" style={{ background: THEME.surface, border: `1px solid ${THEME.secondary}20` }}>
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="h-7 w-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${THEME.secondary}15` }}>
                      <Users className="h-3.5 w-3.5" style={{ color: THEME.secondary }} />
                    </div>
                    <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: THEME.muted }}>Jumlah Investor</span>
                  </div>
                  <p className="text-sm font-bold" style={{ color: THEME.secondary }}>
                    {investorSummary.activeCount}
                    <span className="text-xs font-normal ml-1.5" style={{ color: THEME.muted }}>aktif</span>
                  </p>
                </CardContent>
              </Card>

              <Card className="rounded-xl overflow-hidden" style={{ background: THEME.surface, border: `1px solid ${THEME.warning}20` }}>
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="h-7 w-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${THEME.warning}15` }}>
                      <Percent className="h-3.5 w-3.5" style={{ color: THEME.warning }} />
                    </div>
                    <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: THEME.muted }}>Rata-rata Bagi Hasil</span>
                  </div>
                  <p className="text-sm font-bold" style={{ color: THEME.warning }}>{animAvgShare.toFixed(1)}%</p>
                </CardContent>
              </Card>
            </div>

            {/* ── Header with Add Button ── */}
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold flex items-center gap-2" style={{ color: THEME.text }}>
                <Users className="h-4 w-4" style={{ color: THEME.primary }} />
                Daftar Investor
              </h2>
              <Button
                onClick={openInvestorCreate}
                size="sm"
                className="rounded-lg h-8"
                style={{ backgroundColor: THEME.primary, color: '#fff' }}
              >
                <UserPlus className="h-3.5 w-3.5 mr-1" />
                Tambah Investor
              </Button>
            </div>

            {/* ── Investor Cards ── */}
            {investorLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-24 rounded-xl" style={{ background: THEME.surface }} />
                ))}
              </div>
            ) : investors.length === 0 ? (
              <Card className="rounded-xl" style={{ background: THEME.surface, border: `1px solid ${THEME.border}` }}>
                <CardContent className="p-0">
                  <EmptyState
                    icon={<Users className="h-8 w-8" style={{ color: THEME.muted }} />}
                    accentColor={THEME.primary}
                    title="Belum ada investor"
                    description="Tambahkan investor untuk mulai mengelola modal dan bagi hasil"
                    onAction={openInvestorCreate}
                    actionLabel="Tambah Investor"
                  />
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
                <AnimatePresence mode="popLayout">
                  {investors.map((inv) => (
                    <motion.div
                      key={inv.id}
                      layout
                      exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.15 } }}
                    >
                      <Card
                        className="rounded-xl overflow-hidden transition-colors duration-200 hover:border-opacity-100"
                        style={{ background: THEME.surface, border: `1px solid ${THEME.primary}20` }}
                        onMouseEnter={(e) => {
                          (e.currentTarget as HTMLElement).style.borderColor = `${THEME.primary}50`;
                        }}
                        onMouseLeave={(e) => {
                          (e.currentTarget as HTMLElement).style.borderColor = `${THEME.primary}20`;
                        }}
                      >
                        <CardContent className="p-3 sm:p-4">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <div className="h-8 w-8 rounded-lg flex items-center justify-center text-xs font-bold" style={{ backgroundColor: `${THEME.primary}15`, color: THEME.primary }}>
                                {inv.name.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <p className="text-xs font-semibold truncate max-w-[140px]" style={{ color: THEME.text }}>{inv.name}</p>
                                <Badge
                                  variant="outline"
                                  className="text-[9px] font-medium border-0 rounded-full px-1.5 py-0"
                                  style={{
                                    backgroundColor: inv.status === 'active' ? `${THEME.secondary}20` : `${THEME.destructive}20`,
                                    color: inv.status === 'active' ? THEME.secondary : THEME.destructive,
                                  }}
                                >
                                  {inv.status === 'active' ? 'Aktif' : 'Nonaktif'}
                                </Badge>
                              </div>
                            </div>
                          </div>

                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] uppercase tracking-wider" style={{ color: THEME.muted }}>Modal</span>
                              <span className="text-sm font-bold tabular-nums" style={{ color: THEME.primary }}>{formatAmount(inv.totalInvestment)}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] uppercase tracking-wider" style={{ color: THEME.muted }}>Bagi Hasil</span>
                              <span className="text-sm font-bold" style={{ color: THEME.warning }}>{inv.profitSharePct}%</span>
                            </div>
                          </div>

                          {(inv.phone || inv.email) && (
                            <div style={{ borderTop: `1px solid ${THEME.border}`, marginTop: '8px', paddingTop: '8px' }} className="flex items-center gap-3">
                              {inv.phone && (
                                <span className="flex items-center gap-1 text-[10px]" style={{ color: THEME.muted }}>
                                  <Phone className="h-2.5 w-2.5" />
                                  {inv.phone}
                                </span>
                              )}
                              {inv.email && (
                                <span className="flex items-center gap-1 text-[10px] truncate" style={{ color: THEME.muted }}>
                                  <Mail className="h-2.5 w-2.5" />
                                  {inv.email}
                                </span>
                              )}
                            </div>
                          )}

                          <p className="text-[10px] mt-1" style={{ color: THEME.muted }}>
                            Bergabung {formatDate(inv.joinDate)}
                          </p>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════ */}
        {/* ── TAB 3: PIUTANG ──────────────────────────────────── */}
        {/* ══════════════════════════════════════════════════════════ */}
        {mainTab === 'piutang' && (
          <div key="piutang" className="space-y-4">
            {/* ── Piutang Summary Cards ── */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
              {[
                { label: 'Total Piutang', value: piutangStats.total, color: THEME.warning },
                { label: 'Sudah Realisasi', value: piutangStats.totalPaid, color: THEME.secondary },
                { label: 'Belum Realisasi', value: piutangStats.totalRemaining, color: THEME.warning },
                { label: 'Terlambat', value: piutangStats.overdueCount, color: THEME.destructive },
              ].map((item, idx) => (
                <Card key={idx} className="rounded-xl overflow-hidden" style={{ background: THEME.surface, border: `1px solid ${item.color}20` }}>
                  <CardContent className="p-3">
                    <span className="text-[10px] font-semibold uppercase tracking-wider block mb-1" style={{ color: THEME.muted }}>{item.label}</span>
                    <p className="text-sm font-bold tabular-nums" style={{ color: item.color }}>{item.value}</p>
                    <p className="text-[9px] mt-0.5" style={{ color: THEME.muted }}>{idx === 3 ? `${piutangStats.macetCount} aktif` : idx === 2 ? `${piutangStats.berjalanCount + piutangStats.macetCount} aktif` : idx === 1 ? `${piutangStats.selesaiCount} lunas` : ''}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* ── Sub-tabs + Search ── */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3">
              <div className="flex gap-1 rounded-lg p-0.5" style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${THEME.border}` }}>
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
                      style={isActive ? { backgroundColor: `${cfg.color}15`, color: cfg.color } : { color: THEME.muted }}
                    >
                      <Icon className="h-3 w-3" />
                      <span>{cfg.label}</span>
                      {count > 0 && (
                        <span
                          className="ml-0.5 h-4 min-w-[16px] px-1 text-[10px] font-bold rounded-full flex items-center justify-center"
                          style={{
                            backgroundColor: isActive ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.06)',
                            color: isActive ? 'current' : THEME.muted,
                          }}
                        >
                          {count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
              <div className="relative flex-1 max-w-[200px]">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5" style={{ color: THEME.muted }} />
                <Input
                  value={piutangSearch}
                  onChange={(e) => setPiutangSearch(e.target.value)}
                  placeholder={t('common.search') + '...'}
                  className="pl-8 rounded-lg h-8 text-xs"
                  style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${THEME.border}`, color: THEME.text }}
                />
              </div>
            </div>

            {/* ── Piutang Table ── */}
            <Card
              className="rounded-xl overflow-hidden"
              style={{ background: THEME.surface, border: `1px solid ${THEME.border}` }}
            >
              <CardContent className="p-0">
                {piutangLoading ? (
                  <div className="space-y-2 p-3 sm:p-4">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <Skeleton key={i} className="h-10 rounded-lg" style={{ background: THEME.border }} />
                    ))}
                  </div>
                ) : piutangDebts.length === 0 ? (
                  <EmptyState
                    icon={<HandCoins className="h-8 w-8" style={{ color: THEME.muted }} />}
                    accentColor={PIUTANG_STATUS_CONFIG[piutangSubTab].color}
                    title={`Tidak ada piutang ${PIUTANG_STATUS_CONFIG[piutangSubTab].label.toLowerCase()}`}
                    description="Semua piutang dalam kategori ini sudah bersih"
                  />
                ) : (
                  <div className="max-h-[480px] overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow style={{ borderBottom: `1px solid ${THEME.border}` }} className="hover:bg-transparent">
                          <TableHead className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: THEME.muted }}>
                            {t('biz.debtCounterpart')}
                          </TableHead>
                          <TableHead className="text-[10px] font-semibold uppercase tracking-wider hidden sm:table-cell">
                            Deskripsi
                          </TableHead>
                          <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-right" style={{ color: THEME.muted }}>
                            Total
                          </TableHead>
                          <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-right" style={{ color: THEME.muted }}>
                            Dibayar
                          </TableHead>
                          <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-right" style={{ color: THEME.muted }}>
                            Sisa
                          </TableHead>
                          <TableHead className="text-[10px] font-semibold uppercase tracking-wider hidden md:table-cell" style={{ color: THEME.muted, width: '90px' }}>
                            {t('biz.debtDueDate')}
                          </TableHead>
                          <TableHead className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: THEME.muted, width: '70px' }}>
                            Status
                          </TableHead>
                          <TableHead className="w-[100px] text-center" style={{ color: THEME.muted }}>
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
                                className="transition-colors duration-150 group cursor-default"
                                style={{ borderBottom: `1px solid ${THEME.border}` }}
                              >
                                <TableCell className="text-xs py-2 font-medium" style={{ color: THEME.text }}>
                                  <div className="flex items-center gap-2">
                                    <div className="h-6 w-6 rounded-md bg-white/[0.06] flex items-center justify-center text-[10px] font-bold shrink-0" style={{ color: THEME.textSecondary }}>
                                      {debt.counterpart.charAt(0).toUpperCase()}
                                    </div>
                                    <span className="truncate max-w-[120px]">{debt.counterpart}</span>
                                  </div>
                                </TableCell>
                                <TableCell className="text-xs py-2 hidden sm:table-cell max-w-[140px] truncate" style={{ color: THEME.textSecondary }}>
                                  {debt.description || '—'}
                                </TableCell>
                                <TableCell className="text-xs text-right py-2 font-semibold tabular-nums" style={{ color: THEME.textSecondary }}>
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
                                      <span className="font-mono" style={{ color: isOverdue ? THEME.destructive : THEME.textSecondary }}>
                                        {formatDate(debt.dueDate)}
                                      </span>
                                      {isOverdue && (
                                        <span className="text-[9px] px-1.5 py-0 rounded-full inline-flex items-center gap-1 w-fit" style={{ backgroundColor: `${THEME.destructive}15`, color: THEME.destructive }}>
                                          <AlertTriangle className="h-2.5 w-2.5" />
                                          TERLAMBAT {overdueDays} HARI
                                        </span>
                                      )}
                                    </div>
                                  ) : (
                                    <span style={{ color: THEME.muted }}>—</span>
                                  )}
                                </TableCell>
                                <TableCell className="py-2">
                                  <Badge
                                    variant="outline"
                                    className="text-[10px] font-medium border-0 rounded-full px-2 py-0"
                                    style={{
                                      backgroundColor: `${statusCfg.color}15`,
                                      color: statusCfg.color,
                                    }}
                                  >
                                    {statusCfg.label}
                                  </Badge>
                                </TableCell>
                                <TableCell className="py-2">
                                  <div className="flex items-center justify-center gap-1">
                                    {debt.status !== 'paid' && (
                                      <Button variant="ghost" size="sm" className="h-6 px-1.5 text-[10px] font-medium rounded-md" style={{ color: THEME.secondary }} onClick={() => openPaymentDialog(debt)} title="Bayar">
                                        <CircleDollarSign className="h-3 w-3" />
                                        <span className="hidden lg:inline">Bayar</span>
                                      </Button>
                                    )}
                                    <Button variant="ghost" size="sm" className="h-6 px-1.5 text-[10px] font-medium rounded-md" style={{ color: '#25D366' }} onClick={() => sendReminder(debt)} title="Ingatkan via WhatsApp">
                                      <MessageCircle className="h-3 w-3" />
                                    </Button>
                                    <Button variant="ghost" size="sm" className="h-6 px-1.5 text-[10px] font-medium rounded-md" style={{ color: THEME.muted }} onClick={() => openDetailDialog(debt)} title="Detail">
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
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </AnimatePresence>

      {/* ════════════════════════════════════════════════════════════ */}
      {/* ── CASH ENTRY DIALOG ──────────────────────────────────── */}
      {/* ══════════════════════════════════════════════════════════ */}
      <Dialog open={cashDialogOpen} onOpenChange={setCashDialogOpen}>
        <DialogContent className="rounded-xl" style={{ background: THEME.surface, border: `1px solid ${THEME.border}` }}>
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold flex items-center gap-2" style={{ color: THEME.text }}>
              <div
                className="h-7 w-7 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: `${subTypeConfig.color}15` }}
              >
                {editingCashEntry ? <Pencil className="h-3.5 w-3.5" style={{ color: subTypeConfig.color }} /> : <Plus className="h-3.5 w-3.5" style={{ color: subTypeConfig.color }} />}
              </div>
              {editingCashEntry ? t('common.edit') : t('biz.addCashEntry')}
            </DialogTitle>
            <DialogDescription className="pl-9" style={{ color: THEME.textSecondary }}>
              {t(CASH_SUB_TYPES[cashForm.type]?.label || 'biz.kasBesar')}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCashSave} className="space-y-3 mt-1">
            {/* Type selector */}
            <div className="space-y-1.5">
              <Label className="text-[11px] font-medium uppercase tracking-wider" style={{ color: THEME.muted }}>Tipe Kas</Label>
              <Select
                value={cashForm.type}
                onValueChange={(v) => setCashForm({ ...cashForm, type: v as CashSubType })}
              >
                <SelectTrigger className="text-sm h-9 rounded-lg" style={{ background: THEME.surface, border: inputBorder, color: THEME.text }}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent style={{ background: THEME.surface, border: `1px solid ${THEME.border}` }}>
                  {(Object.keys(CASH_SUB_TYPES) as CashSubType[]).map((key) => {
                    const cfg = CASH_SUB_TYPES[key];
                    const Icon = cfg.icon;
                    return (
                      <SelectItem key={key} value={key} className="rounded-lg">
                        <span className="flex items-center gap-2">
                          <Icon className="h-3.5 w-3.5" style={{ color: cfg.color }} />
                          {t(cfg.label)}
                        </span>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label className="text-[11px] font-medium uppercase tracking-wider" style={{ color: THEME.muted }}>
                {t('biz.cashDescription')} <span style={{ color: THEME.destructive }}>*</span>
              </Label>
              <Input
                value={cashForm.description}
                onChange={(e) => setCashForm({ ...cashForm, description: e.target.value })}
                placeholder={t('biz.cashDescription')}
                className="text-sm rounded-lg"
                style={{ background: THEME.surface, border: inputBorder, color: THEME.text }}
              />
            </div>

            {/* Amount with Preview */}
            <div className="space-y-1.5">
              <Label className="text-[11px] font-medium uppercase tracking-wider" style={{ color: THEME.muted }}>
                {t('biz.cashAmount')} <span style={{ color: THEME.destructive }}>*</span>
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-medium pointer-events-none" style={{ color: THEME.muted }}>Rp</span>
                <Input
                  type="number"
                  value={cashForm.amount}
                  onChange={(e) => setCashForm({ ...cashForm, amount: e.target.value })}
                  placeholder="0"
                  min="0"
                  className="text-sm font-semibold pl-8 pr-3 rounded-lg tabular-nums"
                  style={{ background: THEME.surface, border: inputBorder, color: THEME.text }}
                />
              </div>
              <AnimatePresence mode="wait">
                {formattedCashNominal && (
                  <div
                    className="flex items-center gap-2 px-3 py-2 rounded-lg"
                    style={{
                      backgroundColor: `${CASH_SUB_TYPES[cashForm.type].color}08`,
                      borderColor: `${CASH_SUB_TYPES[cashForm.type].color}20`,
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
              <Label className="text-[11px] font-medium uppercase tracking-wider" style={{ color: THEME.muted }}>
                {t('biz.cashDate')}
              </Label>
              <Input
                type="date"
                value={cashForm.date}
                onChange={(e) => setCashForm({ ...cashForm, date: e.target.value })}
                className="text-sm rounded-lg"
                style={{ background: THEME.surface, border: inputBorder, color: THEME.text }}
              />
            </div>

            {/* Category */}
            <div className="space-y-1.5">
              <Label className="text-[11px] font-medium uppercase tracking-wider" style={{ color: THEME.muted }}>
                {t('biz.cashCategory')}
              </Label>
              <Select value={cashForm.category} onValueChange={(v) => setCashForm({ ...cashForm, category: v })}>
                <SelectTrigger className="text-sm h-9 rounded-lg" style={{ background: THEME.surface, border: inputBorder, color: THEME.text }}>
                  <SelectValue placeholder={t('biz.cashCategory')} />
                </SelectTrigger>
                <SelectContent style={{ background: THEME.surface, border: `1px solid ${THEME.border}` }}>
                  {cashCategories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.name} className="rounded-lg">
                      <span className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full" style={{ backgroundColor: cat.color || THEME.secondary }} />
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
                className="text-xs h-8 rounded-lg"
                style={{ background: THEME.surface, border: inputBorder, color: THEME.text }}
              />
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <Label className="text-[11px] font-medium uppercase tracking-wider" style={{ color: THEME.muted }}>
                Catatan
              </Label>
              <Textarea
                value={cashForm.notes}
                onChange={(e) => setCashForm({ ...cashForm, notes: e.target.value })}
                placeholder="Catatan tambahan (opsional)"
                className="text-xs min-h-[52px] resize-none rounded-lg"
                style={{ background: THEME.surface, border: inputBorder, color: THEME.text }}
              />
            </div>

            <DialogFooter className="gap-2 pt-1">
              <Button
                type="button"
                variant="outline"
                onClick={() => setCashDialogOpen(false)}
                className="rounded-lg"
                style={{ borderColor: THEME.border, color: THEME.textSecondary }}
              >
                {t('common.cancel')}
              </Button>
              <Button
                type="submit"
                disabled={cashSaving || !cashForm.description || !cashForm.amount}
                className="rounded-lg disabled:opacity-40"
                style={{ backgroundColor: THEME.secondary, color: '#fff' }}
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
      {/* ══════════════════════════════════════════════════════════ */}
      <Dialog open={investorDialogOpen} onOpenChange={setInvestorDialogOpen}>
        <DialogContent className="rounded-xl" style={{ background: THEME.surface, border: `1px solid ${THEME.border}` }}>
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold flex items-center gap-2" style={{ color: THEME.text }}>
              <div className="h-7 w-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${THEME.primary}10` }}>
                <UserPlus className="h-3.5 w-3.5" style={{ color: THEME.primary }} />
              </div>
              Tambah Investor
            </DialogTitle>
            <DialogDescription className="pl-9" style={{ color: THEME.textSecondary }}>
              Tambahkan investor baru untuk modal bisnis
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleInvestorSave} className="space-y-3 mt-1">
            {/* Name */}
            <div className="space-y-1.5">
              <Label className="text-[11px] font-medium uppercase tracking-wider" style={{ color: THEME.muted }}>
                Nama Investor <span style={{ color: THEME.destructive }}>*</span>
              </Label>
              <Input
                value={investorForm.name}
                onChange={(e) => setInvestorForm({ ...investorForm, name: e.target.value })}
                placeholder="Nama lengkap investor"
                className="text-sm rounded-lg"
                style={{ background: THEME.surface, border: inputBorder, color: THEME.text }}
              />
            </div>

            {/* Phone & Email */}
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label className="text-[11px] font-medium uppercase tracking-wider" style={{ color: THEME.muted }}>
                  <Phone className="h-3 w-3 inline mr-1" />Telepon
                </Label>
                <Input value={investorForm.phone} onChange={(e) => setInvestorForm({ ...investorForm, phone: e.target.value })} placeholder="08xx" className="text-sm rounded-lg" style={{ background: THEME.surface, border: inputBorder, color: THEME.text }} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] font-medium uppercase tracking-wider" style={{ color: THEME.muted }}>
                  <Mail className="h-3 w-3 inline mr-1" />Email
                </Label>
                <Input type="email" value={investorForm.email} onChange={(e) => setInvestorForm({ ...investorForm, email: e.target.value })} placeholder="email@contoh.com" className="text-sm rounded-lg" style={{ background: THEME.surface, border: inputBorder, color: THEME.text }} />
              </div>
            </div>

            {/* Investment Amount */}
            <div className="space-y-1.5">
              <Label className="text-[11px] font-medium uppercase tracking-wider" style={{ color: THEME.muted }}>
                Total Modal (Rp) <span style={{ color: THEME.destructive }}>*</span>
              </Label>
              <div className="relative">
                <HandCoins className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: THEME.muted }} />
                <Input
                  type="number"
                  value={investorForm.totalInvestment}
                  onChange={(e) => setInvestorForm({ ...investorForm, totalInvestment: e.target.value })}
                  placeholder="0"
                  min="0"
                  className="text-sm font-semibold pl-9 pr-3 rounded-lg tabular-nums"
                  style={{ background: THEME.surface, border: inputBorder, color: THEME.text }}
                />
              </div>
              <AnimatePresence mode="wait">
                {formattedInvestorNominal && (
                  <div
                    className="flex items-center gap-2 px-3 py-2 rounded-lg"
                    style={{ backgroundColor: `${THEME.primary}08`, borderColor: `${THEME.primary}15`, color: THEME.primary }}
                  >
                    <CircleDollarSign className="h-3.5 w-3.5" />
                    <span className="text-sm font-semibold tabular-nums">{formattedInvestorNominal}</span>
                  </div>
                )}
              </AnimatePresence>
            </div>

            {/* Profit Share % */}
            <div className="space-y-1.5">
              <Label className="text-[11px] font-medium uppercase tracking-wider" style={{ color: THEME.muted }}>
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
                className="text-sm rounded-lg tabular-nums"
                style={{ background: THEME.surface, border: inputBorder, color: THEME.text }}
              />
            </div>

            <DialogFooter className="gap-2 pt-1">
              <Button
                type="button"
                variant="outline"
                onClick={() => setInvestorDialogOpen(false)}
                className="rounded-lg"
                style={{ borderColor: THEME.border, color: THEME.textSecondary }}
              >
                {t('common.cancel')}
              </Button>
              <Button
                type="submit"
                disabled={investorSaving || !investorForm.name}
                className="rounded-lg disabled:opacity-40"
                style={{ backgroundColor: THEME.primary, color: '#fff' }}
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
      {/* ══════════════════════════════════════════════════════════ */}
      <Dialog open={!!paymentDialogDebt} onOpenChange={(open) => !open && setPaymentDialogDebt(null)}>
        <DialogContent className="max-w-[95vw] sm:max-w-[440px] rounded-xl" style={{ background: THEME.surface, border: `1px solid ${THEME.border}` }}>
          <DialogHeader>
            <DialogTitle className="text-sm sm:text-lg font-semibold flex items-center gap-2" style={{ color: THEME.text }}>
              <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${THEME.secondary}15` }}>
                <CircleDollarSign className="h-3.5 w-3.5 sm:h-4 sm:w-4" style={{ color: THEME.secondary }} />
              </div>
              Catat Pembayaran
            </DialogTitle>
            <DialogDescription className="pl-9" style={{ color: THEME.textSecondary }}>
              {paymentDialogDebt?.counterpart} — {paymentDialogDebt?.description || 'Piutang'}
            </DialogDescription>
          </DialogHeader>

          {paymentDialogDebt && (
            <div className="space-y-3 mt-1">
              {/* Debt summary mini */}
              <div
                className="flex items-center justify-between p-2.5 rounded-lg"
                style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${THEME.border}` }}
              >
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-lg bg-white/[0.06] flex items-center justify-center text-[10px] font-bold shrink-0" style={{ color: THEME.textSecondary }}>
                    {paymentDialogDebt.counterpart.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-[9px] sm:text-[10px] uppercase tracking-wider" style={{ color: THEME.muted }}>Sisa Tagihan</p>
                    <p className="text-[11px] sm:text-sm font-bold tabular-nums" style={{ color: THEME.destructive }}>{formatAmount(paymentDialogDebt.remaining)}</p>
                  </div>
                </div>
                {paymentDialogDebt.installmentAmount && (
                  <div className="text-right">
                    <p className="text-[9px] sm:text-[10px] uppercase tracking-wider" style={{ color: THEME.muted }}>Angsuran</p>
                    <p className="text-[11px] sm:text-sm font-bold tabular-nums" style={{ color: THEME.warning }}>{formatAmount(paymentDialogDebt.installmentAmount)}</p>
                  </div>
                )}
              </div>

              {/* Amount */}
              <div className="space-y-1.5">
                <Label className="text-[11px] font-medium uppercase tracking-wider" style={{ color: THEME.muted }}>
                  Jumlah Bayar <span style={{ color: THEME.destructive }}>*</span>
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-medium pointer-events-none" style={{ color: THEME.muted }}>Rp</span>
                  <Input
                    type="number"
                    value={paymentForm.amount}
                    onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                    placeholder="0"
                    min="0"
                    max={paymentDialogDebt.remaining}
                    className="text-sm font-semibold pl-8 pr-3 rounded-lg tabular-nums"
                    style={{ background: THEME.surface, border: `1px solid ${THEME.secondary}40`, color: THEME.text }}
                  />
                </div>
                <AnimatePresence mode="wait">
                  {formattedPaymentNominal && (
                    <div
                      className="flex items-center gap-2 px-3 py-2 rounded-lg"
                      style={{ backgroundColor: `${THEME.secondary}08`, borderColor: `${THEME.secondary}15`, color: THEME.secondary }}
                    >
                      <CircleDollarSign className="h-4 w-4" />
                      <span className="text-sm font-semibold tabular-nums">{formattedPaymentNominal}</span>
                    </div>
                  )}
                </AnimatePresence>
              </div>

              {/* Payment Date */}
              <div className="space-y-1.5">
                <Label className="text-[11px] font-medium uppercase tracking-wider" style={{ color: THEME.muted }}>
                  <CalendarDays className="h-3 w-3 inline mr-1" />Tanggal Bayar
                </Label>
                <Input
                  type="date"
                  value={paymentForm.paymentDate}
                  onChange={(e) => setPaymentForm({ ...paymentForm, paymentDate: e.target.value })}
                  className="text-sm rounded-lg"
                  style={{ background: THEME.surface, border: `1px solid ${THEME.secondary}40`, color: THEME.text }}
                />
              </div>

              {/* Payment Method */}
              <div className="space-y-1.5">
                <Label className="text-[11px] font-medium uppercase tracking-wider" style={{ color: THEME.muted }}>
                  Metode Pembayaran
                </Label>
                <div className="grid grid-cols-3 gap-1.5">
                  {([
                    { value: 'transfer' as const, label: 'Transfer', color: THEME.secondary },
                    { value: 'cash' as const, label: 'Cash', color: THEME.warning },
                    { value: 'qris' as const, label: 'QRIS', color: THEME.primary },
                  ]).map((method) => (
                    <button
                      key={method.value}
                      onClick={() => setPaymentForm({ ...paymentForm, paymentMethod: method.value })}
                      className="py-1.5 rounded-lg text-[11px] font-medium border transition-all duration-200"
                      style={
                        paymentForm.paymentMethod === method.value
                          ? { backgroundColor: `${method.color}15`, color: method.color, borderColor: `${method.color}40` }
                          : { borderColor: THEME.border, color: THEME.muted }
                      }
                    >
                      {method.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-1.5">
                <Label className="text-[11px] font-medium uppercase tracking-wider" style={{ color: THEME.muted }}>
                  Catatan
                </Label>
                <Textarea
                  value={paymentForm.notes}
                  onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                  placeholder="Catatan pembayaran (opsional)"
                  className="text-xs min-h-[52px] resize-none rounded-lg"
                  style={{ background: THEME.surface, border: inputBorder, color: THEME.text }}
                />
              </div>

              <DialogFooter className="gap-2 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setPaymentDialogDebt(null)}
                  className="rounded-lg"
                  style={{ borderColor: THEME.border, color: THEME.textSecondary }}
                >
                  {t('common.cancel')}
                </Button>
                <Button
                  onClick={recordPayment}
                  disabled={paymentSaving || !paymentForm.amount}
                  className="rounded-lg disabled:opacity-40"
                  style={{ backgroundColor: THEME.secondary, color: '#fff' }}
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
        <DialogContent className="max-w-[95vw] sm:max-w-[480px] rounded-xl max-h-[85vh] overflow-y-auto" style={{ background: THEME.surface, border: `1px solid ${THEME.border}` }}>
          {detailDialogDebt && (
            <>
              <DialogHeader>
                <DialogTitle className="text-sm sm:text-lg font-semibold flex items-center gap-2" style={{ color: THEME.text }}>
                  <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${THEME.primary}10` }}>
                    <HandCoins className="h-4 w-4" style={{ color: THEME.primary }} />
                  </div>
                  Detail Piutang
                </DialogTitle>
                <DialogDescription className="pl-9" style={{ color: THEME.textSecondary }}>
                  {detailDialogDebt.counterpart}
                </DialogDescription>
              </DialogHeader>

              {detailLoading ? (
                <div className="space-y-2 py-3">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-14 rounded-xl" style={{ background: THEME.surface }} />
                  ))}
                </div>
              ) : (
                <div className="space-y-3 mt-1">
                  {/* ── Summary Card ── */}
                  <div className="p-3 rounded-xl space-y-3" style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${THEME.border}` }}>
                    <div className="flex items-center gap-2 mb-1">
                      <div className="h-7 w-7 rounded-lg bg-white/[0.06] flex items-center justify-center text-[10px] font-bold shrink-0" style={{ color: THEME.textSecondary }}>
                        {detailDialogDebt.counterpart.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs sm:text-sm font-semibold break-words" style={{ color: THEME.text }}>{detailDialogDebt.counterpart}</p>
                        {detailDialogDebt.description && (
                          <p className="text-[10px] sm:text-[11px] break-words" style={{ color: THEME.textSecondary }}>{detailDialogDebt.description}</p>
                        )}
                      </div>
                      <Badge
                        variant="outline"
                        className="text-[10px] font-medium border-0 rounded-full px-2.5 py-0.5 shrink-0"
                        style={{ backgroundColor: `${getStatusConfig(detailDialogDebt.status).color}15`, color: getStatusConfig(detailDialogDebt.status).color }}
                      >
                        {getStatusConfig(detailDialogDebt.status).label}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-3 gap-2 sm:gap-3">
                      <div>
                        <p className="text-white/30 text-[8px] sm:text-[9px] uppercase tracking-wider">Total</p>
                        <p className="text-[11px] sm:text-sm font-bold tabular-nums" style={{ color: THEME.text }}>{formatAmount(detailDialogDebt.amount)}</p>
                      </div>
                      <div>
                        <p className="text-white/30 text-[8px] sm:text-[9px] uppercase tracking-wider">Dibayar</p>
                        <p className="text-[11px] sm:text-sm font-bold tabular-nums" style={{ color: THEME.secondary }}>{formatAmount(detailDialogDebt.amount - detailDialogDebt.remaining)}</p>
                      </div>
                      <div>
                        <p className="text-white/30 text-[8px] sm:text-[9px] uppercase tracking-wider">Sisa</p>
                        <p className="text-[11px] sm:text-sm font-bold tabular-nums" style={{ color: THEME.warning }}>{formatAmount(detailDialogDebt.remaining)}</p>
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
                          className="h-full rounded-full transition-all duration-700"
                          style={{
                            width: `${detailDialogDebt.amount > 0 ? Math.min(100, ((detailDialogDebt.amount - detailDialogDebt.remaining) / detailDialogDebt.amount) * 100) : 0}%`,
                            backgroundColor: THEME.secondary,
                          }}
                        />
                      </div>
                    </div>
                  </div>

                    {/* Due date info */}
                    {detailDialogDebt.dueDate && (
                      <div className="flex items-center gap-2 pt-1">
                        <CalendarDays className="h-3.5 w-3.5" style={{ color: THEME.muted }} />
                        <span className="text-xs">
                          Jatuh tempo:{' '}
                          <span
                            className="font-mono"
                            style={{ color: detailDialogDebt.status !== 'paid' && differenceInDays(new Date(), parseISO(detailDialogDebt.dueDate)) > 0
                              ? 'font-semibold text-[#CF6679]'
                              : ''
                            }}
                          >
                            {formatDate(detailDialogDebt.dueDate)}
                          </span>
                        </span>
                      </div>
                    )}

                  {/* ── Payment Score ── */}
                  <div className="p-3 rounded-xl" style={{
                    backgroundColor: `${getPaymentScore(detailDialogDebt).color}08`,
                    borderColor: `${getPaymentScore(detailDialogDebt).color}20`,
                  }}>
                    <div className="flex items-center gap-2 sm:gap-3">
                      <div
                        className="h-8 w-8 sm:h-10 sm:w-10 rounded-xl flex items-center justify-center text-sm sm:text-lg font-bold"
                        style={{
                          backgroundColor: `${getPaymentScore(detailDialogDebt).color}15`,
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
                    <h3 className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider mb-2 flex items-center gap-2" style={{ color: THEME.muted }}>
                      <Clock className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                      Riwayat Pembayaran
                    </h3>
                    {(debtPayments[detailDialogDebt.id] || []).length === 0 ? (
                      <div className="text-center py-6 rounded-lg" style={{ background: 'rgba(255,255,255,0.02)', border: `1px solid ${THEME.border}` }}>
                        <Inbox className="h-6 w-6 mx-auto mb-2" style={{ color: THEME.muted }} />
                        <p className="text-[10px]" style={{ color: THEME.muted }}>Belum ada pembayaran tercatat</p>
                      </div>
                    ) : (
                      <div className="space-y-1.5 max-h-[220px] overflow-y-auto">
                        {[...(debtPayments[detailDialogDebt.id] || [])]
                          .sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime())
                          .map((payment, idx) => (
                            <div
                              key={payment.id}
                              className="flex items-start gap-2 p-2.5 rounded-xl hover:border-opacity-100 transition-colors"
                              style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${THEME.border}` }}
                            >
                              <div className="mt-0.5 flex flex-col items-center">
                                <div className="h-5 w-5 rounded-full flex items-center justify-center" style={{ backgroundColor: `${THEME.secondary}15` }}>
                                  <CheckCircle2 className="h-2.5 w-2.5" style={{ color: THEME.secondary }} />
                                </div>
                                {idx < (debtPayments[detailDialogDebt.id] || []).length - 1 && (
                                  <div className="w-px flex-1 mt-1 min-h-[14px]" style={{ backgroundColor: THEME.border }} />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-1.5">
                                  <p className="text-[11px] font-bold tabular-nums" style={{ color: THEME.secondary }}>
                                    +{formatAmount(payment.amount)}
                                  </p>
                                  <div className="flex items-center gap-1 shrink-0">
                                    {payment.paymentMethod && (
                                      <Badge variant="outline" className="text-[9px] font-medium border-0 rounded-full px-1.5 py-0" style={{
                                        backgroundColor: payment.paymentMethod === 'transfer' ? `${THEME.secondary}15` : payment.paymentMethod === 'cash' ? `${THEME.warning}15` : `${THEME.primary}15`,
                                        color: payment.paymentMethod === 'transfer' ? THEME.secondary : payment.paymentMethod === 'cash' ? THEME.warning : THEME.primary,
                                      }}>
                                        {payment.paymentMethod === 'transfer' ? 'Transfer' : payment.paymentMethod === 'cash' ? 'Cash' : 'QRIS'}
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className="text-[10px] font-mono" style={{ color: THEME.muted }}>
                                    {formatDate(payment.paymentDate)}
                                  </span>
                                  {detailDialogDebt.dueDate && (() => {
                                    const diff = differenceInDays(new Date(payment.paymentDate), parseISO(detailDialogDebt.dueDate));
                                    if (diff <= 0) return <span className="text-[9px]" style={{ color: `${THEME.secondary}80` }}>Tepat waktu</span>;
                                    if (diff <= 7) return <span className="text-[9px]" style={{ color: `${THEME.warning}80` }}>+{diff} hari</span>;
                                    return <span className="text-[9px]" style={{ color: `${THEME.destructive}80` }}>+{diff} hari</span>;
                                  })()}
                                </div>
                                {payment.notes && (
                                  <p className="text-[10px] mt-1 truncate" style={{ color: THEME.muted }}>{payment.notes}</p>
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
                        className="flex-1 text-white border-0 rounded-lg h-9"
                        style={{ backgroundColor: THEME.secondary }}
                      >
                        <CircleDollarSign className="h-4 w-4 mr-1.5" />
                        Catat Pembayaran
                      </Button>
                      <Button
                        onClick={() => sendReminder(detailDialogDebt)}
                        variant="outline"
                        className="flex-1 text-white border-0 rounded-lg h-9"
                        style={{ borderColor: `${'#25D366'}40`, color: '#25D366' }}
                      >
                        <MessageCircle className="h-4 w-4 mr-1.5" />
                        Ingatkan WA
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
      {/* ══════════════════════════════════════════════════════ */}
      <AlertDialog open={!!cashDeleteId} onOpenChange={(open) => !open && setCashDeleteId(null)}>
        <AlertDialogContent className="rounded-xl" style={{ background: THEME.surface, border: `1px solid ${THEME.border}` }}>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2" style={{ color: THEME.text }}>
              <div className="h-7 w-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${THEME.destructive}10` }}>
                <Trash2 className="h-4 w-4" style={{ color: THEME.destructive }} />
              </div>
              {t('common.delete')}
            </AlertDialogTitle>
            <AlertDialogDescription className="pl-9" style={{ color: THEME.textSecondary }}>
              Apakah Anda yakin ingin menghapus transaksi ini? Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 pt-2">
            <AlertDialogCancel className="rounded-lg" style={{ borderColor: THEME.border, color: THEME.textSecondary }}>
              {t('common.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCashDelete}
              className="rounded-lg text-white border-0"
              style={{ backgroundColor: THEME.destructive, color: THEME.text }}
            >
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
