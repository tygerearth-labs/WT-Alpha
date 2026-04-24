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
    color: '#03DAC6',
    icon: Wallet,
    gradient: 'from-[#03DAC6]/20 via-[#03DAC6]/5 to-transparent',
    bg: 'bg-[#03DAC6]/15',
    textClass: 'text-[#03DAC6]',
  },
  kas_kecil: {
    label: 'biz.kasKecil',
    color: '#BB86FC',
    icon: PiggyBank,
    gradient: 'from-[#BB86FC]/20 via-[#BB86FC]/5 to-transparent',
    bg: 'bg-[#BB86FC]/15',
    textClass: 'text-[#BB86FC]',
  },
  kas_keluar: {
    label: 'biz.kasKeluar',
    color: '#CF6679',
    icon: ArrowDownToLine,
    gradient: 'from-[#CF6679]/20 via-[#CF6679]/5 to-transparent',
    bg: 'bg-[#CF6679]/15',
    textClass: 'text-[#CF6679]',
  },
} as const;

type CashSubType = keyof typeof CASH_SUB_TYPES;

const PIUTANG_STATUS_CONFIG = {
  berjalan: {
    label: 'Berjalan',
    statuses: ['active', 'partially_paid'],
    color: '#03DAC6',
    bg: 'bg-[#03DAC6]/15',
    icon: Clock,
  },
  macet: {
    label: 'Macet',
    statuses: ['overdue'],
    color: '#CF6679',
    bg: 'bg-[#CF6679]/15',
    icon: AlertTriangle,
  },
  selesai: {
    label: 'Selesai',
    statuses: ['paid'],
    color: '#BB86FC',
    bg: 'bg-[#BB86FC]/15',
    icon: CheckCircle2,
  },
} as const;

type PiutangSubTab = keyof typeof PIUTANG_STATUS_CONFIG;

// ─── Animation Variants ─────────────────────────────────────────────
const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.07, delayChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring' as const, stiffness: 300, damping: 24 },
  },
};

const cardPopVariants = {
  hidden: { opacity: 0, scale: 0.92, y: 12 },
  show: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { type: 'spring' as const, stiffness: 260, damping: 22 },
  },
};

const rowVariants = {
  hidden: { opacity: 0, x: -12 },
  show: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: {
      delay: i * 0.04,
      type: 'spring' as const,
      stiffness: 260,
      damping: 20,
    },
  }),
  exit: { opacity: 0, x: 12, transition: { duration: 0.2 } },
};

const fadeInVariants = {
  hidden: { opacity: 0, y: 10 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring' as const, stiffness: 280, damping: 22 },
  },
  exit: { opacity: 0, y: -10, transition: { duration: 0.15 } },
};

// ─── Helpers ────────────────────────────────────────────────────────
function formatDate(dateStr: string): string {
  try {
    const parsed = parseISO(dateStr);
    return format(parsed, 'd MMM yyyy', { locale: idLocale });
  } catch {
    return new Date(dateStr).toLocaleDateString();
  }
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

  // Fetch cash entries for all types simultaneously
  const fetchAllCashData = useCallback(() => {
    if (!businessId) return;
    setCashLoading(true);

    // Determine category type for dropdown
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

        const inc =
          (besarData?.total || 0) + (kecilData?.total || 0);
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

  // Fetch payments for a specific debt
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

  // Record a payment
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

  // Send WhatsApp reminder
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

  // Open detail dialog
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

  // Re-fetch cash data when sub-tab changes
  useEffect(() => {
    if (businessId && mainTab === 'arus_kas') {
      fetchAllCashData();
    }
  }, [businessId, cashSubTab, mainTab, fetchAllCashData]);

  // ══════════════════════════════════════════════════════════════════
  // ── Derived Data ──────────────────────────────────────────────────
  // ══════════════════════════════════════════════════════════════════

  // Filtered cash entries by sub-tab
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

  // Piutang (debts filtered by type=piutang)
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

  // Compute per-debt paid amount from payment cache
  const getDebtPaidAmount = useCallback((debtId: string): number => {
    const payments = debtPayments[debtId];
    if (!payments || payments.length === 0) {
      // Fallback: compute from debt.amount - debt.remaining
      const debt = allDebts.find((d) => d.id === debtId);
      return debt ? (debt.amount - debt.remaining) : 0;
    }
    return payments.reduce((sum, p) => sum + p.amount, 0);
  }, [debtPayments, allDebts]);

  // Compute payment score for detail dialog
  const getPaymentScore = useCallback((debt: Debt): { score: number; label: string; color: string } => {
    const payments = debtPayments[debt.id] || [];
    if (payments.length === 0) {
      if (debt.dueDate && debt.status !== 'paid') {
        const days = differenceInDays(new Date(), parseISO(debt.dueDate));
        if (days > 0) {
          return { score: 0, label: 'Belum Bayar', color: '#CF6679' };
        }
      }
      return { score: 50, label: 'Menunggu Pembayaran', color: '#FFD700' };
    }

    // Check latest payment timeliness
    const sortedPayments = [...payments].sort(
      (a, b) => new Date(a.paymentDate).getTime() - new Date(b.paymentDate).getTime()
    );
    const latestPayment = sortedPayments[sortedPayments.length - 1];

    if (!debt.dueDate) {
      return { score: 75, label: 'Agak Terlambat', color: '#FFD700' };
    }

    const dueDate = parseISO(debt.dueDate);
    const payDate = new Date(latestPayment.paymentDate);
    const diffDays = differenceInDays(payDate, dueDate);

    if (diffDays <= 0) {
      return { score: 100, label: 'Tepat Waktu', color: '#03DAC6' };
    } else if (diffDays <= 7) {
      return { score: 75, label: 'Agak Terlambat', color: '#FFD700' };
    } else {
      return { score: 50, label: 'Terlambat', color: '#CF6679' };
    }
  }, [debtPayments]);

  // Cashflow realization data for Arus Kas tab
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

  // ── Cash form nominal preview ──
  const formattedCashNominal = useMemo(() => {
    const num = parseFloat(cashForm.amount);
    if (isNaN(num) || num <= 0) return '';
    return formatAmount(num);
  }, [cashForm.amount, formatAmount]);

  // ── Investor form nominal preview ──
  const formattedInvestorNominal = useMemo(() => {
    const num = parseFloat(investorForm.totalInvestment);
    if (isNaN(num) || num <= 0) return '';
    return formatAmount(num);
  }, [investorForm.totalInvestment, formatAmount]);

  // ── Payment form nominal preview ──
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
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' as const }}
        className="flex flex-col items-center justify-center min-h-[400px] gap-3"
      >
        <div className="h-16 w-16 rounded-2xl bg-white/[0.04] flex items-center justify-center">
          <Banknote className="h-8 w-8 text-white/20" />
        </div>
        <p className="text-white/40 text-center text-sm">{t('biz.registerFirst')}</p>
      </motion.div>
    );
  }

  // ══════════════════════════════════════════════════════════════════
  // ── Main Tab Configuration ────────────────────────────────────────
  // ══════════════════════════════════════════════════════════════════
  const mainTabs: Array<{
    key: MainTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    color: string;
  }> = [
    { key: 'arus_kas', label: 'Arus Kas', icon: TrendingUp, color: '#03DAC6' },
    { key: 'investor', label: 'Investor', icon: Users, color: '#BB86FC' },
    { key: 'piutang', label: 'Piutang', icon: HandCoins, color: '#FFD700' },
  ];

  const subTypeConfig = CASH_SUB_TYPES[cashSubTab];

  // ══════════════════════════════════════════════════════════════════
  // ── RENDER ────────────────────────────────────────────────────────
  // ══════════════════════════════════════════════════════════════════
  return (
    <div className="space-y-5">
      {/* ── Main Tab Header ── */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative flex gap-1 bg-white/[0.04] rounded-2xl p-1 w-fit border border-white/[0.06]"
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={mainTab}
            className="absolute top-1 bottom-1 rounded-xl"
            style={{
              backgroundColor: `${mainTabs.find((mt) => mt.key === mainTab)?.color}18`,
              borderColor: `${mainTabs.find((mt) => mt.key === mainTab)?.color}40`,
            }}
            animate={{
              width: `calc(${(100 / mainTabs.length)}% - 6px)`,
              left: `${(mainTabs.findIndex((mt) => mt.key === mainTab) * 100) / mainTabs.length + 2}%`,
            }}
            transition={{ type: 'spring' as const, stiffness: 300, damping: 30 }}
          />
        </AnimatePresence>
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
                'relative z-10 rounded-xl px-4 sm:px-5 transition-colors duration-200',
                isActive
                  ? 'font-semibold'
                  : 'text-white/40 hover:text-white/70'
              )}
              style={isActive ? { color: mt.color } : undefined}
            >
              <Icon className="h-4 w-4 mr-1.5" />
              <span className="hidden sm:inline">{mt.label}</span>
              <span className="sm:hidden">{mt.label.split(' ')[0]}</span>
            </Button>
          );
        })}
      </motion.div>

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* ── TAB 1: ARUS KAS ───────────────────────────────────────── */}
      {/* ══════════════════════════════════════════════════════════════ */}
      <AnimatePresence mode="wait">
        {mainTab === 'arus_kas' && (
          <motion.div
            key="arus_kas"
            variants={fadeInVariants}
            initial="hidden"
            animate="show"
            exit="exit"
            className="space-y-5"
          >
            {/* ── Flow Summary Cards ── */}
            <motion.div
              className="grid grid-cols-1 sm:grid-cols-3 gap-3"
              variants={containerVariants}
              initial="hidden"
              animate="show"
            >
              {/* Total Pemasukan */}
              <motion.div variants={cardPopVariants}>
                <Card className="bg-gradient-to-br from-[#1A1A2E] to-[#1A1A2E]/80 border border-white/[0.06] rounded-2xl overflow-hidden relative group">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-[#03DAC6]/5 rounded-full -translate-y-8 translate-x-8 group-hover:scale-150 transition-transform duration-500" />
                  <div className="h-1 bg-gradient-to-r from-[#03DAC6]/60 via-[#03DAC6]/30 to-transparent" />
                  <CardContent className="p-4 relative">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="h-8 w-8 rounded-lg bg-[#03DAC6]/10 flex items-center justify-center">
                        <ArrowUpRight className="h-4 w-4 text-[#03DAC6]" />
                      </div>
                      <span className="text-white/40 text-[10px] font-semibold uppercase tracking-wider">
                        Total Pemasukan
                      </span>
                    </div>
                    <p className="text-lg font-bold text-[#03DAC6] tabular-nums">
                      {formatAmount(animIncome)}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Total Pengeluaran */}
              <motion.div variants={cardPopVariants}>
                <Card className="bg-gradient-to-br from-[#1A1A2E] to-[#1A1A2E]/80 border border-white/[0.06] rounded-2xl overflow-hidden relative group">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-[#CF6679]/5 rounded-full -translate-y-8 translate-x-8 group-hover:scale-150 transition-transform duration-500" />
                  <div className="h-1 bg-gradient-to-r from-[#CF6679]/60 via-[#CF6679]/30 to-transparent" />
                  <CardContent className="p-4 relative">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="h-8 w-8 rounded-lg bg-[#CF6679]/10 flex items-center justify-center">
                        <ArrowDownRight className="h-4 w-4 text-[#CF6679]" />
                      </div>
                      <span className="text-white/40 text-[10px] font-semibold uppercase tracking-wider">
                        Total Pengeluaran
                      </span>
                    </div>
                    <p className="text-lg font-bold text-[#CF6679] tabular-nums">
                      {formatAmount(animExpense)}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Arus Bersih */}
              <motion.div variants={cardPopVariants}>
                <Card className="bg-gradient-to-br from-[#1A1A2E] to-[#1A1A2E]/80 border border-white/[0.06] rounded-2xl overflow-hidden relative group">
                  <div
                    className={cn(
                      'absolute top-0 right-0 w-24 h-24 rounded-full -translate-y-8 translate-x-8 group-hover:scale-150 transition-transform duration-500',
                      animNet >= 0 ? 'bg-[#03DAC6]/5' : 'bg-[#CF6679]/5'
                    )}
                  />
                  <div
                    className={cn(
                      'h-1 bg-gradient-to-r',
                      animNet >= 0
                        ? 'from-[#03DAC6]/60 via-[#03DAC6]/30 to-transparent'
                        : 'from-[#CF6679]/60 via-[#CF6679]/30 to-transparent'
                    )}
                  />
                  <CardContent className="p-4 relative">
                    <div className="flex items-center gap-2 mb-2">
                      <div
                        className={cn(
                          'h-8 w-8 rounded-lg flex items-center justify-center',
                          animNet >= 0 ? 'bg-[#03DAC6]/10' : 'bg-[#CF6679]/10'
                        )}
                      >
                        <CircleDollarSign
                          className={cn(
                            'h-4 w-4',
                            animNet >= 0 ? 'text-[#03DAC6]' : 'text-[#CF6679]'
                          )}
                        />
                      </div>
                      <span className="text-white/40 text-[10px] font-semibold uppercase tracking-wider">
                        Arus Bersih
                      </span>
                    </div>
                    <p
                      className={cn(
                        'text-lg font-bold tabular-nums',
                        animNet >= 0 ? 'text-[#03DAC6]' : 'text-[#CF6679]'
                      )}
                    >
                      {animNet >= 0 ? '+' : '-'}
                      {formatAmount(Math.abs(animNet))}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            </motion.div>

            {/* ── Cashflow Realization Info Card ── */}
            {allPiutang.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
              >
                <Card className="bg-gradient-to-br from-[#1A1A2E]/80 to-[#1A1A2E]/60 border border-[#BB86FC]/15 rounded-2xl overflow-hidden">
                  <div className="h-0.5 bg-gradient-to-r from-[#BB86FC]/40 via-[#03DAC6]/20 to-[#FFD700]/20" />
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="h-7 w-7 rounded-lg bg-[#BB86FC]/10 flex items-center justify-center">
                        <TrendingUp className="h-3.5 w-3.5 text-[#BB86FC]" />
                      </div>
                      <span className="text-white/50 text-[10px] font-semibold uppercase tracking-wider">
                        Realisasi Pendapatan
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <p className="text-white/30 text-[9px] uppercase tracking-wider mb-1">Pendapatan Tercatat</p>
                        <p className="text-[#BB86FC] text-sm font-bold tabular-nums">{formatAmount(cashflowRealization.pendapatanTercatat)}</p>
                      </div>
                      <div>
                        <p className="text-white/30 text-[9px] uppercase tracking-wider mb-1">Sudah Diterima</p>
                        <p className="text-[#03DAC6] text-sm font-bold tabular-nums">{formatAmount(cashflowRealization.sudahDiterima)}</p>
                      </div>
                      <div>
                        <p className="text-white/30 text-[9px] uppercase tracking-wider mb-1">Belum Diterima (Piutang)</p>
                        <p className="text-[#FFD700] text-sm font-bold tabular-nums">{formatAmount(cashflowRealization.belumDiterima)}</p>
                      </div>
                    </div>
                    {cashflowRealization.pendapatanTercatat > 0 && (
                      <div className="mt-3 pt-3 border-t border-white/[0.05]">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                            <motion.div
                              className="h-full rounded-full bg-gradient-to-r from-[#03DAC6] to-[#03DAC6]/60"
                              initial={{ width: 0 }}
                              animate={{ width: `${Math.min(100, (cashflowRealization.sudahDiterima / cashflowRealization.pendapatanTercatat) * 100)}%` }}
                              transition={{ duration: 0.8, ease: 'easeOut' as const }}
                            />
                          </div>
                          <span className="text-white/30 text-[10px] tabular-nums min-w-[36px] text-right">
                            {cashflowRealization.pendapatanTercatat > 0
                              ? Math.round((cashflowRealization.sudahDiterima / cashflowRealization.pendapatanTercatat) * 100)
                              : 0}%
                          </span>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* ── Sub-tab toggle + Search + Add Button ── */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.3 }}
              className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
            >
              <div className="flex items-center gap-3 flex-1">
                {/* Sub-tabs */}
                <div className="flex gap-1 bg-white/[0.03] border border-white/[0.06] rounded-xl p-1">
                  {(Object.keys(CASH_SUB_TYPES) as CashSubType[]).map((key) => {
                    const cfg = CASH_SUB_TYPES[key];
                    const Icon = cfg.icon;
                    const isActive = cashSubTab === key;
                    return (
                      <button
                        key={key}
                        onClick={() => setCashSubTab(key)}
                        className={cn(
                          'relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200',
                          isActive ? `${cfg.bg} ${cfg.textClass} shadow-sm` : 'text-white/40 hover:text-white/70'
                        )}
                      >
                        <Icon className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">{t(cfg.label)}</span>
                        <span className="sm:hidden">{t(cfg.label).replace('Kas ', '')}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Search */}
                <div className="relative flex-1 max-w-xs hidden sm:block">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/30" />
                  <Input
                    value={cashSearch}
                    onChange={(e) => setCashSearch(e.target.value)}
                    placeholder={t('common.search') + '...'}
                    className="bg-white/[0.05] border-white/[0.08] text-white placeholder:text-white/25 pl-9 rounded-lg h-9 text-xs focus:border-white/20 transition-all"
                  />
                </div>
              </div>

              <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                <Button
                  onClick={openCashCreate}
                  size="sm"
                  className="text-white border-0 shadow-lg shadow-black/20 bg-[#03DAC6] hover:bg-[#03DAC6]/90 transition-all duration-200"
                >
                  <Plus className="h-4 w-4 mr-1.5" />
                  {t('biz.addCashEntry')}
                </Button>
              </motion.div>
            </motion.div>

            {/* ── Sub-total indicator ── */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.25 }}
              className="flex items-center gap-2"
            >
              <div
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: subTypeConfig.color }}
              />
              <span className="text-white/50 text-xs">{t('common.total')}:</span>
              <span className={cn('text-base font-bold', subTypeConfig.textClass)}>
                {formatAmount(currentCashSubTotal)}
              </span>
              <span className="text-white/20 text-xs">({filteredCashEntries.length} transaksi)</span>
            </motion.div>

            {/* ── Cash Entries Table ── */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.4 }}
            >
              <Card className="bg-gradient-to-br from-[#1A1A2E] to-[#1A1A2E]/90 border border-white/[0.06] rounded-2xl shadow-xl shadow-black/20 overflow-hidden">
                <div
                  className={cn('h-0.5 bg-gradient-to-r', subTypeConfig.gradient)}
                />
                <CardContent className="p-0">
                  {cashLoading ? (
                    <div className="space-y-3 p-5">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Skeleton key={i} className="h-12 rounded-lg bg-white/[0.06]" />
                      ))}
                    </div>
                  ) : filteredCashEntries.length === 0 ? (
                    <EmptyState
                      icon={<Inbox className="h-9 w-9 text-white/15" />}
                      accentColor={subTypeConfig.color}
                      title="Belum ada transaksi"
                      description={`Mulai tambahkan catatan ${t(subTypeConfig.label).toLowerCase()} pertama Anda`}
                      onAction={openCashCreate}
                      actionLabel={t('biz.addCashEntry')}
                    />
                  ) : (
                    <div className="max-h-[500px] overflow-y-auto custom-scrollbar">
                      <Table>
                        <TableHeader>
                          <TableRow className="border-white/[0.06] hover:bg-transparent">
                            <TableHead className="text-white/40 text-[11px] font-semibold uppercase tracking-wider w-[100px]">
                              {t('biz.cashDate')}
                            </TableHead>
                            <TableHead className="text-white/40 text-[11px] font-semibold uppercase tracking-wider">
                              {t('biz.cashDescription')}
                            </TableHead>
                            <TableHead className="text-white/40 text-[11px] font-semibold uppercase tracking-wider hidden sm:table-cell">
                              {t('biz.cashCategory')}
                            </TableHead>
                            <TableHead className="text-white/40 text-[11px] font-semibold uppercase tracking-wider text-right w-[130px]">
                              {t('biz.cashAmount')}
                            </TableHead>
                            <TableHead className="w-20" />
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
                                  variants={rowVariants}
                                  initial="hidden"
                                  animate="show"
                                  exit="exit"
                                  layout
                                  className={cn(
                                    'border-white/[0.04] transition-colors duration-150 group cursor-default',
                                    index % 2 === 0 ? 'bg-transparent' : 'bg-white/[0.015]',
                                    'hover:bg-white/[0.04]'
                                  )}
                                >
                                  <TableCell className="text-white/50 text-xs py-3 font-mono">
                                    {formatDate(entry.date)}
                                  </TableCell>
                                  <TableCell className="text-white/90 text-xs py-3 font-medium max-w-[200px] truncate group-hover:text-white transition-colors">
                                    <span className="flex items-center gap-2">
                                      {isExpense ? (
                                        <ArrowDownRight className="h-3.5 w-3.5 text-[#CF6679]/50 shrink-0" />
                                      ) : (
                                        <ArrowUpRight className="h-3.5 w-3.5 text-[#03DAC6]/50 shrink-0" />
                                      )}
                                      <span className="truncate">{entry.description}</span>
                                    </span>
                                  </TableCell>
                                  <TableCell className="py-3 hidden sm:table-cell">
                                    {entry.category ? (
                                      <Badge
                                        variant="outline"
                                        className="text-[10px] font-medium border-0 rounded-full px-2.5 py-0.5"
                                        style={{
                                          backgroundColor: `${entryColor.color}15`,
                                          color: entryColor.color,
                                        }}
                                      >
                                        {entry.category}
                                      </Badge>
                                    ) : (
                                      <span className="text-white/20 text-xs">—</span>
                                    )}
                                  </TableCell>
                                  <TableCell
                                    className={cn(
                                      'text-xs text-right font-semibold py-3 tabular-nums',
                                      isExpense ? 'text-[#CF6679]' : 'text-[#03DAC6]'
                                    )}
                                  >
                                    {isExpense ? '-' : '+'}
                                    {formatAmount(entry.amount)}
                                  </TableCell>
                                  <TableCell className="py-3 text-right">
                                    <div className="flex items-center justify-end gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                                      <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-7 w-7 p-0 text-white/30 hover:text-[#BB86FC] hover:bg-[#BB86FC]/10 rounded-lg"
                                          onClick={() => openCashEdit(entry)}
                                        >
                                          <Pencil className="h-3 w-3" />
                                        </Button>
                                      </motion.div>
                                      <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-7 w-7 p-0 text-white/30 hover:text-[#CF6679] hover:bg-[#CF6679]/10 rounded-lg"
                                          onClick={() => setCashDeleteId(entry.id)}
                                        >
                                          <Trash2 className="h-3 w-3" />
                                        </Button>
                                      </motion.div>
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
            </motion.div>
          </motion.div>
        )}

        {/* ══════════════════════════════════════════════════════════════ */}
        {/* ── TAB 2: INVESTOR ──────────────────────────────────────── */}
        {/* ══════════════════════════════════════════════════════════════ */}
        {mainTab === 'investor' && (
          <motion.div
            key="investor"
            variants={fadeInVariants}
            initial="hidden"
            animate="show"
            exit="exit"
            className="space-y-5"
          >
            {/* ── Investor Summary Cards ── */}
            <motion.div
              className="grid grid-cols-1 sm:grid-cols-3 gap-3"
              variants={containerVariants}
              initial="hidden"
              animate="show"
            >
              {/* Total Modal Investor */}
              <motion.div variants={cardPopVariants}>
                <Card className="bg-gradient-to-br from-[#1A1A2E] to-[#1A1A2E]/80 border border-white/[0.06] rounded-2xl overflow-hidden relative group">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-[#BB86FC]/5 rounded-full -translate-y-8 translate-x-8 group-hover:scale-150 transition-transform duration-500" />
                  <div className="h-1 bg-gradient-to-r from-[#BB86FC]/60 via-[#BB86FC]/30 to-transparent" />
                  <CardContent className="p-4 relative">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="h-8 w-8 rounded-lg bg-[#BB86FC]/10 flex items-center justify-center">
                        <HandCoins className="h-4 w-4 text-[#BB86FC]" />
                      </div>
                      <span className="text-white/40 text-[10px] font-semibold uppercase tracking-wider">
                        Total Modal Investor
                      </span>
                    </div>
                    <p className="text-lg font-bold text-[#BB86FC] tabular-nums">
                      {formatAmount(animTotalInvestment)}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Jumlah Investor */}
              <motion.div variants={cardPopVariants}>
                <Card className="bg-gradient-to-br from-[#1A1A2E] to-[#1A1A2E]/80 border border-white/[0.06] rounded-2xl overflow-hidden relative group">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-[#03DAC6]/5 rounded-full -translate-y-8 translate-x-8 group-hover:scale-150 transition-transform duration-500" />
                  <div className="h-1 bg-gradient-to-r from-[#03DAC6]/60 via-[#03DAC6]/30 to-transparent" />
                  <CardContent className="p-4 relative">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="h-8 w-8 rounded-lg bg-[#03DAC6]/10 flex items-center justify-center">
                        <Users className="h-4 w-4 text-[#03DAC6]" />
                      </div>
                      <span className="text-white/40 text-[10px] font-semibold uppercase tracking-wider">
                        Jumlah Investor
                      </span>
                    </div>
                    <p className="text-lg font-bold text-[#03DAC6]">
                      {investorSummary.activeCount}
                      <span className="text-white/30 text-xs font-normal ml-2">aktif</span>
                    </p>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Rata-rata Bagi Hasil */}
              <motion.div variants={cardPopVariants}>
                <Card className="bg-gradient-to-br from-[#1A1A2E] to-[#1A1A2E]/80 border border-white/[0.06] rounded-2xl overflow-hidden relative group">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-[#FFD700]/5 rounded-full -translate-y-8 translate-x-8 group-hover:scale-150 transition-transform duration-500" />
                  <div className="h-1 bg-gradient-to-r from-[#FFD700]/60 via-[#FFD700]/30 to-transparent" />
                  <CardContent className="p-4 relative">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="h-8 w-8 rounded-lg bg-[#FFD700]/10 flex items-center justify-center">
                        <Percent className="h-4 w-4 text-[#FFD700]" />
                      </div>
                      <span className="text-white/40 text-[10px] font-semibold uppercase tracking-wider">
                        Rata-rata Bagi Hasil
                      </span>
                    </div>
                    <p className="text-lg font-bold text-[#FFD700]">
                      {animAvgShare.toFixed(1)}%
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            </motion.div>

            {/* ── Header with Add Button ── */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="flex items-center justify-between"
            >
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Users className="h-4 w-4 text-[#BB86FC]" />
                Daftar Investor
              </h2>
              <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                <Button
                  onClick={openInvestorCreate}
                  size="sm"
                  className="text-white border-0 shadow-lg shadow-black/20 bg-[#BB86FC] hover:bg-[#BB86FC]/90 transition-all duration-200"
                >
                  <UserPlus className="h-4 w-4 mr-1.5" />
                  Tambah Investor
                </Button>
              </motion.div>
            </motion.div>

            {/* ── Investor Cards ── */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              {investorLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-28 rounded-2xl bg-white/[0.06]" />
                  ))}
                </div>
              ) : investors.length === 0 ? (
                <Card className="bg-gradient-to-br from-[#1A1A2E] to-[#1A1A2E]/90 border border-white/[0.06] rounded-2xl shadow-xl overflow-hidden">
                  <CardContent className="p-0">
                    <EmptyState
                      icon={<Users className="h-9 w-9 text-white/15" />}
                      accentColor="#BB86FC"
                      title="Belum ada investor"
                      description="Tambahkan investor untuk mulai mengelola modal dan bagi hasil"
                      onAction={openInvestorCreate}
                      actionLabel="Tambah Investor"
                    />
                  </CardContent>
                </Card>
              ) : (
                <motion.div
                  className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3"
                  variants={containerVariants}
                  initial="hidden"
                  animate="show"
                >
                  <AnimatePresence mode="popLayout">
                    {investors.map((inv) => (
                      <motion.div
                        key={inv.id}
                        variants={cardPopVariants}
                        layout
                        exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
                      >
                        <Card className="bg-gradient-to-br from-[#1A1A2E] to-[#1A1A2E]/80 border border-white/[0.06] rounded-2xl overflow-hidden relative group hover:border-[#BB86FC]/20 transition-all duration-300 hover:shadow-lg hover:shadow-[#BB86FC]/5">
                          <div className="h-0.5 bg-gradient-to-r from-[#BB86FC]/40 via-[#BB86FC]/20 to-transparent" />
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex items-center gap-2.5">
                                <div className="h-9 w-9 rounded-xl bg-[#BB86FC]/10 flex items-center justify-center text-sm font-bold text-[#BB86FC]">
                                  {inv.name.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                  <p className="text-white text-sm font-semibold truncate max-w-[140px]">
                                    {inv.name}
                                  </p>
                                  <div className="flex items-center gap-1.5 mt-0.5">
                                    <Badge
                                      variant="outline"
                                      className="text-[9px] font-medium border-0 rounded-full px-2 py-0"
                                      style={{
                                        backgroundColor:
                                          inv.status === 'active'
                                            ? '#03DAC620'
                                            : '#CF667920',
                                        color:
                                          inv.status === 'active'
                                            ? '#03DAC6'
                                            : '#CF6679',
                                      }}
                                    >
                                      {inv.status === 'active' ? 'Aktif' : 'Nonaktif'}
                                    </Badge>
                                  </div>
                                </div>
                              </div>
                            </div>

                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-white/40 text-[10px] uppercase tracking-wider">
                                  Modal
                                </span>
                                <span className="text-[#BB86FC] text-sm font-bold tabular-nums">
                                  {formatAmount(inv.totalInvestment)}
                                </span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-white/40 text-[10px] uppercase tracking-wider">
                                  Bagi Hasil
                                </span>
                                <span className="text-[#FFD700] text-sm font-bold">
                                  {inv.profitSharePct}%
                                </span>
                              </div>
                            </div>

                            {/* Contact row */}
                            {(inv.phone || inv.email) && (
                              <div className="mt-3 pt-3 border-t border-white/[0.05] flex items-center gap-3 text-white/25">
                                {inv.phone && (
                                  <span className="flex items-center gap-1 text-[10px]">
                                    <Phone className="h-2.5 w-2.5" />
                                    {inv.phone}
                                  </span>
                                )}
                                {inv.email && (
                                  <span className="flex items-center gap-1 text-[10px] truncate">
                                    <Mail className="h-2.5 w-2.5" />
                                    {inv.email}
                                  </span>
                                )}
                              </div>
                            )}

                            {/* Join date */}
                            <p className="text-white/15 text-[10px] mt-2">
                              Bergabung {formatDate(inv.joinDate)}
                            </p>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </motion.div>
              )}
            </motion.div>
          </motion.div>
        )}

        {/* ══════════════════════════════════════════════════════════════ */}
        {/* ── TAB 3: PIUTANG (Enhanced) ────────────────────────────── */}
        {/* ══════════════════════════════════════════════════════════════ */}
        {mainTab === 'piutang' && (
          <motion.div
            key="piutang"
            variants={fadeInVariants}
            initial="hidden"
            animate="show"
            exit="exit"
            className="space-y-5"
          >
            {/* ── Piutang Summary Cards (Enhanced) ── */}
            <motion.div
              className="grid grid-cols-2 sm:grid-cols-4 gap-3"
              variants={containerVariants}
              initial="hidden"
              animate="show"
            >
              {/* Total Piutang */}
              <motion.div variants={cardPopVariants}>
                <Card className="bg-gradient-to-br from-[#1A1A2E] to-[#1A1A2E]/80 border border-white/[0.06] rounded-2xl overflow-hidden relative group">
                  <div className="h-1 bg-gradient-to-r from-[#FFD700]/60 via-[#FFD700]/30 to-transparent" />
                  <CardContent className="p-4">
                    <span className="text-white/40 text-[10px] font-semibold uppercase tracking-wider block mb-1">
                      Total Piutang
                    </span>
                    <p className="text-base font-bold text-[#FFD700] tabular-nums">
                      {formatAmount(piutangStats.total)}
                    </p>
                    <p className="text-white/20 text-[10px] mt-1">{allPiutang.length} total</p>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Sudah Realisasi */}
              <motion.div variants={cardPopVariants}>
                <Card className="bg-gradient-to-br from-[#1A1A2E] to-[#1A1A2E]/80 border border-white/[0.06] rounded-2xl overflow-hidden relative group">
                  <div className="h-1 bg-gradient-to-r from-[#03DAC6]/60 via-[#03DAC6]/30 to-transparent" />
                  <CardContent className="p-4">
                    <span className="text-white/40 text-[10px] font-semibold uppercase tracking-wider block mb-1">
                      Sudah Realisasi
                    </span>
                    <p className="text-base font-bold text-[#03DAC6] tabular-nums">
                      {formatAmount(piutangStats.totalPaid)}
                    </p>
                    <p className="text-white/20 text-[10px] mt-1">{piutangStats.selesaiCount} lunas</p>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Belum Realisasi */}
              <motion.div variants={cardPopVariants}>
                <Card className="bg-gradient-to-br from-[#1A1A2E] to-[#1A1A2E]/80 border border-white/[0.06] rounded-2xl overflow-hidden relative group">
                  <div className="h-1 bg-gradient-to-r from-[#FFD700]/60 via-[#FFD700]/30 to-transparent" />
                  <CardContent className="p-4">
                    <span className="text-white/40 text-[10px] font-semibold uppercase tracking-wider block mb-1">
                      Belum Realisasi
                    </span>
                    <p className="text-base font-bold text-[#FFD700] tabular-nums">
                      {formatAmount(piutangStats.totalRemaining)}
                    </p>
                    <p className="text-white/20 text-[10px] mt-1">{piutangStats.berjalanCount + piutangStats.macetCount} aktif</p>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Terlambat */}
              <motion.div variants={cardPopVariants}>
                <Card className="bg-gradient-to-br from-[#1A1A2E] to-[#1A1A2E]/80 border border-white/[0.06] rounded-2xl overflow-hidden relative group">
                  <div className="h-1 bg-gradient-to-r from-[#CF6679]/60 via-[#CF6679]/30 to-transparent" />
                  <CardContent className="p-4">
                    <span className="text-white/40 text-[10px] font-semibold uppercase tracking-wider block mb-1">
                      Terlambat
                    </span>
                    <p className="text-base font-bold text-[#CF6679]">
                      {piutangStats.overdueCount}
                    </p>
                    <p className="text-white/20 text-[10px] mt-1">{formatAmount(piutangStats.macetRemaining)}</p>
                  </CardContent>
                </Card>
              </motion.div>
            </motion.div>

            {/* ── Sub-tabs + Search for Piutang ── */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
            >
              <div className="flex gap-1 bg-white/[0.03] border border-white/[0.06] rounded-xl p-1">
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
                      className={cn(
                        'relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200',
                        isActive
                          ? 'shadow-sm'
                          : 'text-white/40 hover:text-white/70'
                      )}
                      style={
                        isActive
                          ? {
                              backgroundColor: `${cfg.color}15`,
                              color: cfg.color,
                            }
                          : undefined
                      }
                    >
                      <Icon className="h-3.5 w-3.5" />
                      <span>{cfg.label}</span>
                      {count > 0 && (
                        <span
                          className={cn(
                            'ml-1 h-4 min-w-[18px] px-1 text-[10px] font-bold rounded-full flex items-center justify-center',
                            isActive
                              ? 'bg-white/15 text-current'
                              : 'bg-white/[0.06] text-white/30'
                          )}
                        >
                          {count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
              <div className="relative flex-1 max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/30" />
                <Input
                  value={piutangSearch}
                  onChange={(e) => setPiutangSearch(e.target.value)}
                  placeholder={t('common.search') + '...'}
                  className="bg-white/[0.05] border-white/[0.08] text-white placeholder:text-white/25 pl-9 rounded-lg h-9 text-xs focus:border-white/20 transition-all"
                />
              </div>
            </motion.div>

            {/* ── Enhanced Piutang Table ── */}
            <motion.div
              key={piutangSubTab}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <Card className="bg-gradient-to-br from-[#1A1A2E] to-[#1A1A2E]/90 border border-white/[0.06] rounded-2xl shadow-xl shadow-black/20 overflow-hidden">
                <div
                  className={cn(
                    'h-0.5 bg-gradient-to-r',
                    PIUTANG_STATUS_CONFIG[piutangSubTab].color === '#03DAC6'
                      ? 'from-[#03DAC6]/40 via-[#03DAC6]/20 to-transparent'
                      : PIUTANG_STATUS_CONFIG[piutangSubTab].color === '#CF6679'
                        ? 'from-[#CF6679]/40 via-[#CF6679]/20 to-transparent'
                        : 'from-[#BB86FC]/40 via-[#BB86FC]/20 to-transparent'
                  )}
                />
                <CardContent className="p-0">
                  {piutangLoading ? (
                    <div className="space-y-3 p-5">
                      {Array.from({ length: 4 }).map((_, i) => (
                        <Skeleton key={i} className="h-12 rounded-lg bg-white/[0.06]" />
                      ))}
                    </div>
                  ) : piutangDebts.length === 0 ? (
                    <EmptyState
                      icon={<HandCoins className="h-9 w-9 text-white/15" />}
                      accentColor={PIUTANG_STATUS_CONFIG[piutangSubTab].color}
                      title={`Tidak ada piutang ${PIUTANG_STATUS_CONFIG[piutangSubTab].label.toLowerCase()}`}
                      description="Semua piutang dalam kategori ini sudah bersih"
                    />
                  ) : (
                    <div className="max-h-[480px] overflow-y-auto custom-scrollbar">
                      <Table>
                        <TableHeader>
                          <TableRow className="border-white/[0.06] hover:bg-transparent">
                            <TableHead className="text-white/40 text-[11px] font-semibold uppercase tracking-wider">
                              {t('biz.debtCounterpart')}
                            </TableHead>
                            <TableHead className="text-white/40 text-[11px] font-semibold uppercase tracking-wider hidden sm:table-cell">
                              Deskripsi
                            </TableHead>
                            <TableHead className="text-white/40 text-[11px] font-semibold uppercase tracking-wider text-right w-[100px]">
                              Total
                            </TableHead>
                            <TableHead className="text-white/40 text-[11px] font-semibold uppercase tracking-wider text-right w-[100px]">
                              Dibayar
                            </TableHead>
                            <TableHead className="text-white/40 text-[11px] font-semibold uppercase tracking-wider text-right w-[100px]">
                              Sisa
                            </TableHead>
                            <TableHead className="text-white/40 text-[11px] font-semibold uppercase tracking-wider hidden md:table-cell w-[100px]">
                              {t('biz.debtDueDate')}
                            </TableHead>
                            <TableHead className="text-white/40 text-[11px] font-semibold uppercase tracking-wider w-[80px]">
                              Status
                            </TableHead>
                            <TableHead className="w-[120px] text-center">
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
                                  variants={rowVariants}
                                  initial="hidden"
                                  animate="show"
                                  exit="exit"
                                  layout
                                  className={cn(
                                    'border-white/[0.04] transition-colors duration-150 group cursor-default',
                                    index % 2 === 0 ? 'bg-transparent' : 'bg-white/[0.015]',
                                    'hover:bg-white/[0.04]'
                                  )}
                                >
                                  <TableCell className="text-white/90 text-xs py-3 font-medium">
                                    <div className="flex items-center gap-2">
                                      <div className="h-7 w-7 rounded-lg bg-white/[0.06] flex items-center justify-center text-[10px] font-bold text-white/60 shrink-0">
                                        {debt.counterpart.charAt(0).toUpperCase()}
                                      </div>
                                      <span className="truncate max-w-[120px]">{debt.counterpart}</span>
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-white/50 text-xs py-3 hidden sm:table-cell max-w-[160px] truncate">
                                    {debt.description || '—'}
                                  </TableCell>
                                  <TableCell className="text-white/70 text-xs text-right py-3 font-semibold tabular-nums">
                                    {formatAmount(debt.amount)}
                                  </TableCell>
                                  <TableCell className="text-[#03DAC6]/80 text-xs text-right py-3 font-semibold tabular-nums">
                                    {formatAmount(paidAmount)}
                                  </TableCell>
                                  <TableCell className={cn('text-xs text-right py-3 font-bold tabular-nums', statusCfg.textClass)}>
                                    {formatAmount(debt.remaining)}
                                  </TableCell>
                                  <TableCell className="text-xs py-3 hidden md:table-cell">
                                    {debt.dueDate ? (
                                      <div className="flex flex-col gap-1">
                                        <span className={cn(
                                          'font-mono',
                                          isOverdue ? 'text-[#CF6679]' : 'text-white/50'
                                        )}>
                                          {formatDate(debt.dueDate)}
                                        </span>
                                        {isOverdue && (
                                          <span className="text-[9px] bg-[#CF6679]/15 text-[#CF6679] px-1.5 py-0.5 rounded-full font-bold inline-flex items-center gap-1 w-fit">
                                            <AlertTriangle className="h-2.5 w-2.5" />
                                            TERLAMBAT {overdueDays} HARI
                                          </span>
                                        )}
                                      </div>
                                    ) : (
                                      <span className="text-white/20">—</span>
                                    )}
                                  </TableCell>
                                  <TableCell className="py-3">
                                    <Badge
                                      variant="outline"
                                      className="text-[10px] font-medium border-0 rounded-full px-2.5 py-0.5"
                                      style={{
                                        backgroundColor: `${statusCfg.color}15`,
                                        color: statusCfg.color,
                                      }}
                                    >
                                      {statusCfg.label}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="py-3">
                                    <div className="flex items-center justify-center gap-1">
                                      {debt.status !== 'paid' && (
                                        <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}>
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-7 px-2 text-[10px] font-medium text-white/40 hover:text-[#03DAC6] hover:bg-[#03DAC6]/10 rounded-lg gap-1"
                                            onClick={() => openPaymentDialog(debt)}
                                            title="Bayar"
                                          >
                                            <CircleDollarSign className="h-3 w-3" />
                                            <span className="hidden lg:inline">Bayar</span>
                                          </Button>
                                        </motion.div>
                                      )}
                                      <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-7 px-2 text-white/40 hover:text-[#25D366] hover:bg-[#25D366]/10 rounded-lg"
                                          onClick={() => sendReminder(debt)}
                                          title="Ingatkan via WhatsApp"
                                        >
                                          <MessageCircle className="h-3 w-3" />
                                        </Button>
                                      </motion.div>
                                      <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-7 px-2 text-white/40 hover:text-[#BB86FC] hover:bg-[#BB86FC]/10 rounded-lg"
                                          onClick={() => openDetailDialog(debt)}
                                          title="Detail"
                                        >
                                          <ChevronRight className="h-3 w-3" />
                                        </Button>
                                      </motion.div>
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
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* ── CASH ENTRY DIALOG ──────────────────────────────────────── */}
      {/* ══════════════════════════════════════════════════════════════ */}
      <Dialog open={cashDialogOpen} onOpenChange={setCashDialogOpen}>
        <DialogContent className="bg-gradient-to-b from-[#1A1A2E] to-[#1A1A2E]/95 border border-white/[0.08] text-white sm:max-w-[480px] rounded-2xl shadow-2xl shadow-black/40 overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[#03DAC6] via-[#BB86FC] to-[#FFD700]" />

          <DialogHeader className="pt-2">
            <DialogTitle className="text-white text-lg font-semibold flex items-center gap-2">
              <div
                className="h-8 w-8 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: `${subTypeConfig.color}15` }}
              >
                {editingCashEntry ? (
                  <Pencil className="h-4 w-4" style={{ color: subTypeConfig.color }} />
                ) : (
                  <Plus className="h-4 w-4" style={{ color: subTypeConfig.color }} />
                )}
              </div>
              {editingCashEntry ? t('common.edit') : t('biz.addCashEntry')}
            </DialogTitle>
            <DialogDescription className="text-white/50 pl-10">
              {t(CASH_SUB_TYPES[cashForm.type]?.label || 'biz.kasBesar')}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCashSave} className="space-y-4 mt-2">
            {/* Type selector */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="space-y-2"
            >
              <Label className="text-white/70 text-xs font-medium uppercase tracking-wider">
                Tipe Kas
              </Label>
              <Select
                value={cashForm.type}
                onValueChange={(v) =>
                  setCashForm({ ...cashForm, type: v as CashSubType })
                }
              >
                <SelectTrigger className="bg-white/[0.04] border-white/[0.08] text-white rounded-xl focus:border-white/20 transition-all">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#1A1A2E] border-white/[0.08] rounded-xl">
                  {(Object.keys(CASH_SUB_TYPES) as CashSubType[]).map((key) => {
                    const cfg = CASH_SUB_TYPES[key];
                    const Icon = cfg.icon;
                    return (
                      <SelectItem key={key} value={key} className="text-white rounded-lg focus:bg-white/[0.06]">
                        <span className="flex items-center gap-2">
                          <Icon className="h-3.5 w-3.5" style={{ color: cfg.color }} />
                          {t(cfg.label)}
                        </span>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </motion.div>

            {/* Description */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="space-y-2"
            >
              <Label className="text-white/70 text-xs font-medium uppercase tracking-wider">
                {t('biz.cashDescription')} <span className="text-[#CF6679]">*</span>
              </Label>
              <Input
                value={cashForm.description}
                onChange={(e) => setCashForm({ ...cashForm, description: e.target.value })}
                placeholder={t('biz.cashDescription')}
                className="bg-white/[0.04] border-white/[0.08] text-white placeholder:text-white/20 rounded-xl focus:border-white/20 transition-all"
              />
            </motion.div>

            {/* Amount with Preview */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="space-y-2"
            >
              <Label className="text-white/70 text-xs font-medium uppercase tracking-wider">
                {t('biz.cashAmount')} <span className="text-[#CF6679]">*</span>
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20 text-sm font-medium pointer-events-none">
                  Rp
                </span>
                <Input
                  type="number"
                  value={cashForm.amount}
                  onChange={(e) => setCashForm({ ...cashForm, amount: e.target.value })}
                  placeholder="0"
                  min="0"
                  className="bg-white/[0.04] border-white/[0.08] text-white text-lg font-semibold placeholder:text-white/20 pl-9 pr-4 rounded-xl focus:border-white/20 transition-all tabular-nums"
                />
              </div>
              <AnimatePresence mode="wait">
                {formattedCashNominal && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.15 }}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg border"
                    style={{
                      backgroundColor: `${CASH_SUB_TYPES[cashForm.type].color}08`,
                      borderColor: `${CASH_SUB_TYPES[cashForm.type].color}20`,
                    }}
                  >
                    <CircleDollarSign className="h-4 w-4" style={{ color: CASH_SUB_TYPES[cashForm.type].color }} />
                    <span className="text-sm font-semibold tabular-nums" style={{ color: CASH_SUB_TYPES[cashForm.type].color }}>
                      {formattedCashNominal}
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

            {/* Date */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="space-y-2"
            >
              <Label className="text-white/70 text-xs font-medium uppercase tracking-wider">
                {t('biz.cashDate')}
              </Label>
              <Input
                type="date"
                value={cashForm.date}
                onChange={(e) => setCashForm({ ...cashForm, date: e.target.value })}
                className="bg-white/[0.04] border-white/[0.08] text-white rounded-xl focus:border-white/20 transition-all"
              />
            </motion.div>

            {/* Category */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="space-y-2"
            >
              <Label className="text-white/70 text-xs font-medium uppercase tracking-wider">
                {t('biz.cashCategory')}
              </Label>
              <Select
                value={cashForm.category}
                onValueChange={(v) => setCashForm({ ...cashForm, category: v })}
              >
                <SelectTrigger className="bg-white/[0.04] border-white/[0.08] text-white rounded-xl focus:border-white/20 transition-all">
                  <SelectValue placeholder={t('biz.cashCategory')} />
                </SelectTrigger>
                <SelectContent className="bg-[#1A1A2E] border-white/[0.08] rounded-xl">
                  {cashCategories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.name} className="text-white rounded-lg focus:bg-white/[0.06]">
                      <span className="flex items-center gap-2">
                        <div
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: cat.color || '#03DAC6' }}
                        />
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
                className="bg-white/[0.04] border-white/[0.08] text-white placeholder:text-white/20 rounded-xl focus:border-white/20 transition-all text-xs h-9"
              />
            </motion.div>

            {/* Notes */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="space-y-2"
            >
              <Label className="text-white/70 text-xs font-medium uppercase tracking-wider">
                Catatan
              </Label>
              <Textarea
                value={cashForm.notes}
                onChange={(e) => setCashForm({ ...cashForm, notes: e.target.value })}
                placeholder="Catatan tambahan (opsional)"
                className="bg-white/[0.04] border-white/[0.08] text-white placeholder:text-white/20 rounded-xl focus:border-white/20 transition-all text-xs min-h-[60px] resize-none"
              />
            </motion.div>

            <DialogFooter className="gap-2 pt-2">
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCashDialogOpen(false)}
                  className="border-white/[0.08] text-white/60 hover:bg-white/[0.05] hover:text-white transition-colors"
                >
                  {t('common.cancel')}
                </Button>
              </motion.div>
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button
                  type="submit"
                  disabled={cashSaving || !cashForm.description || !cashForm.amount}
                  className="text-white border-0 shadow-md shadow-black/20 disabled:opacity-40 bg-[#03DAC6] hover:bg-[#03DAC6]/90 transition-all duration-200"
                >
                  {cashSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {t('common.save')}
                </Button>
              </motion.div>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* ── INVESTOR DIALOG ────────────────────────────────────────── */}
      {/* ══════════════════════════════════════════════════════════════ */}
      <Dialog open={investorDialogOpen} onOpenChange={setInvestorDialogOpen}>
        <DialogContent className="bg-gradient-to-b from-[#1A1A2E] to-[#1A1A2E]/95 border border-white/[0.08] text-white sm:max-w-[460px] rounded-2xl shadow-2xl shadow-black/40 overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[#BB86FC] via-[#03DAC6] to-[#FFD700]" />

          <DialogHeader className="pt-2">
            <DialogTitle className="text-white text-lg font-semibold flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-[#BB86FC]/10 flex items-center justify-center">
                <UserPlus className="h-4 w-4 text-[#BB86FC]" />
              </div>
              Tambah Investor
            </DialogTitle>
            <DialogDescription className="text-white/50 pl-10">
              Tambahkan investor baru untuk modal bisnis
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleInvestorSave} className="space-y-4 mt-2">
            {/* Name */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="space-y-2"
            >
              <Label className="text-white/70 text-xs font-medium uppercase tracking-wider">
                Nama Investor <span className="text-[#CF6679]">*</span>
              </Label>
              <Input
                value={investorForm.name}
                onChange={(e) => setInvestorForm({ ...investorForm, name: e.target.value })}
                placeholder="Nama lengkap investor"
                className="bg-white/[0.04] border-white/[0.08] text-white placeholder:text-white/20 rounded-xl focus:border-[#BB86FC]/40 focus:ring-1 focus:ring-[#BB86FC]/20 transition-all"
              />
            </motion.div>

            {/* Phone & Email */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="grid grid-cols-2 gap-3"
            >
              <div className="space-y-2">
                <Label className="text-white/70 text-xs font-medium uppercase tracking-wider">
                  <Phone className="h-3 w-3 inline mr-1" />
                  Telepon
                </Label>
                <Input
                  value={investorForm.phone}
                  onChange={(e) => setInvestorForm({ ...investorForm, phone: e.target.value })}
                  placeholder="08xx"
                  className="bg-white/[0.04] border-white/[0.08] text-white placeholder:text-white/20 rounded-xl focus:border-[#BB86FC]/40 transition-all"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-white/70 text-xs font-medium uppercase tracking-wider">
                  <Mail className="h-3 w-3 inline mr-1" />
                  Email
                </Label>
                <Input
                  type="email"
                  value={investorForm.email}
                  onChange={(e) => setInvestorForm({ ...investorForm, email: e.target.value })}
                  placeholder="email@contoh.com"
                  className="bg-white/[0.04] border-white/[0.08] text-white placeholder:text-white/20 rounded-xl focus:border-[#BB86FC]/40 transition-all"
                />
              </div>
            </motion.div>

            {/* Investment Amount */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="space-y-2"
            >
              <Label className="text-white/70 text-xs font-medium uppercase tracking-wider">
                Total Modal (Rp) <span className="text-[#CF6679]">*</span>
              </Label>
              <div className="relative">
                <HandCoins className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/20" />
                <Input
                  type="number"
                  value={investorForm.totalInvestment}
                  onChange={(e) => setInvestorForm({ ...investorForm, totalInvestment: e.target.value })}
                  placeholder="0"
                  min="0"
                  className="bg-white/[0.04] border-white/[0.08] text-white text-lg font-semibold placeholder:text-white/20 pl-10 pr-4 rounded-xl focus:border-[#BB86FC]/40 transition-all tabular-nums"
                />
              </div>
              <AnimatePresence mode="wait">
                {formattedInvestorNominal && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.15 }}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#BB86FC]/5 border border-[#BB86FC]/10"
                  >
                    <CircleDollarSign className="h-4 w-4 text-[#BB86FC]" />
                    <span className="text-sm text-[#BB86FC] font-semibold tabular-nums">
                      {formattedInvestorNominal}
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

            {/* Profit Share % */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="space-y-2"
            >
              <Label className="text-white/70 text-xs font-medium uppercase tracking-wider">
                <Percent className="h-3 w-3 inline mr-1" />
                Bagi Hasil (%)
              </Label>
              <Input
                type="number"
                value={investorForm.profitSharePct}
                onChange={(e) => setInvestorForm({ ...investorForm, profitSharePct: e.target.value })}
                placeholder="0"
                min="0"
                max="100"
                step="0.1"
                className="bg-white/[0.04] border-white/[0.08] text-white placeholder:text-white/20 rounded-xl focus:border-[#BB86FC]/40 transition-all tabular-nums"
              />
            </motion.div>

            <DialogFooter className="gap-2 pt-2">
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setInvestorDialogOpen(false)}
                  className="border-white/[0.08] text-white/60 hover:bg-white/[0.05] hover:text-white transition-colors"
                >
                  {t('common.cancel')}
                </Button>
              </motion.div>
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button
                  type="submit"
                  disabled={investorSaving || !investorForm.name}
                  className="text-white border-0 shadow-md shadow-black/20 disabled:opacity-40 bg-[#BB86FC] hover:bg-[#BB86FC]/90 transition-all duration-200"
                >
                  {investorSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {t('common.save')}
                </Button>
              </motion.div>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* ── PAYMENT RECORDING DIALOG ───────────────────────────────── */}
      {/* ══════════════════════════════════════════════════════════════ */}
      <Dialog open={!!paymentDialogDebt} onOpenChange={(open) => !open && setPaymentDialogDebt(null)}>
        <DialogContent className="bg-gradient-to-b from-[#1A1A2E] to-[#1A1A2E]/95 border border-white/[0.08] text-white sm:max-w-[460px] rounded-2xl shadow-2xl shadow-black/40 overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[#03DAC6] via-[#03DAC6]/50 to-transparent" />

          <DialogHeader className="pt-2">
            <DialogTitle className="text-white text-lg font-semibold flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-[#03DAC6]/10 flex items-center justify-center">
                <CircleDollarSign className="h-4 w-4 text-[#03DAC6]" />
              </div>
              Catat Pembayaran
            </DialogTitle>
            <DialogDescription className="text-white/50 pl-10">
              {paymentDialogDebt?.counterpart} — {paymentDialogDebt?.description || 'Piutang'}
            </DialogDescription>
          </DialogHeader>

          {paymentDialogDebt && (
            <div className="space-y-4 mt-2">
              {/* Debt summary mini */}
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]"
              >
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-white/[0.06] flex items-center justify-center text-[10px] font-bold text-white/60">
                    {paymentDialogDebt.counterpart.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-white/70 text-[10px] uppercase tracking-wider">Sisa Tagihan</p>
                    <p className="text-[#CF6679] text-sm font-bold tabular-nums">{formatAmount(paymentDialogDebt.remaining)}</p>
                  </div>
                </div>
                {paymentDialogDebt.installmentAmount && (
                  <div className="text-right">
                    <p className="text-white/70 text-[10px] uppercase tracking-wider">Angsuran</p>
                    <p className="text-[#FFD700] text-sm font-bold tabular-nums">{formatAmount(paymentDialogDebt.installmentAmount)}</p>
                  </div>
                )}
              </motion.div>

              {/* Amount */}
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 }}
                className="space-y-2"
              >
                <Label className="text-white/70 text-xs font-medium uppercase tracking-wider">
                  Jumlah Bayar <span className="text-[#CF6679]">*</span>
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20 text-sm font-medium pointer-events-none">Rp</span>
                  <Input
                    type="number"
                    value={paymentForm.amount}
                    onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                    placeholder="0"
                    min="0"
                    max={paymentDialogDebt.remaining}
                    className="bg-white/[0.04] border-white/[0.08] text-white text-lg font-semibold placeholder:text-white/20 pl-9 pr-4 rounded-xl focus:border-[#03DAC6]/40 transition-all tabular-nums"
                  />
                </div>
                <AnimatePresence mode="wait">
                  {formattedPaymentNominal && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: 0.15 }}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#03DAC6]/5 border border-[#03DAC6]/10"
                    >
                      <CircleDollarSign className="h-4 w-4 text-[#03DAC6]" />
                      <span className="text-sm text-[#03DAC6] font-semibold tabular-nums">
                        {formattedPaymentNominal}
                      </span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>

              {/* Payment Date */}
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="space-y-2"
              >
                <Label className="text-white/70 text-xs font-medium uppercase tracking-wider">
                  <CalendarDays className="h-3 w-3 inline mr-1" />
                  Tanggal Bayar
                </Label>
                <Input
                  type="date"
                  value={paymentForm.paymentDate}
                  onChange={(e) => setPaymentForm({ ...paymentForm, paymentDate: e.target.value })}
                  className="bg-white/[0.04] border-white/[0.08] text-white rounded-xl focus:border-[#03DAC6]/40 transition-all"
                />
              </motion.div>

              {/* Payment Method */}
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="space-y-2"
              >
                <Label className="text-white/70 text-xs font-medium uppercase tracking-wider">
                  Metode Pembayaran
                </Label>
                <div className="grid grid-cols-3 gap-2">
                  {([
                    { value: 'transfer' as const, label: 'Transfer', color: '#03DAC6' },
                    { value: 'cash' as const, label: 'Cash', color: '#FFD700' },
                    { value: 'qris' as const, label: 'QRIS', color: '#BB86FC' },
                  ]).map((method) => (
                    <button
                      key={method.value}
                      onClick={() => setPaymentForm({ ...paymentForm, paymentMethod: method.value })}
                      className={cn(
                        'py-2 rounded-xl text-xs font-medium border transition-all duration-200',
                        paymentForm.paymentMethod === method.value
                          ? 'border-current shadow-sm'
                          : 'border-white/[0.06] text-white/40 hover:text-white/70 hover:border-white/15'
                      )}
                      style={
                        paymentForm.paymentMethod === method.value
                          ? { backgroundColor: `${method.color}15`, color: method.color, borderColor: `${method.color}40` }
                          : undefined
                      }
                    >
                      {method.label}
                    </button>
                  ))}
                </div>
              </motion.div>

              {/* Notes */}
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="space-y-2"
              >
                <Label className="text-white/70 text-xs font-medium uppercase tracking-wider">
                  Catatan
                </Label>
                <Textarea
                  value={paymentForm.notes}
                  onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                  placeholder="Catatan pembayaran (opsional)"
                  className="bg-white/[0.04] border-white/[0.08] text-white placeholder:text-white/20 rounded-xl focus:border-[#03DAC6]/40 transition-all text-xs min-h-[60px] resize-none"
                />
              </motion.div>

              <DialogFooter className="gap-2 pt-2">
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setPaymentDialogDebt(null)}
                    className="border-white/[0.08] text-white/60 hover:bg-white/[0.05] hover:text-white transition-colors"
                  >
                    {t('common.cancel')}
                  </Button>
                </motion.div>
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Button
                    onClick={recordPayment}
                    disabled={paymentSaving || !paymentForm.amount}
                    className="text-white border-0 shadow-md shadow-black/20 disabled:opacity-40 bg-[#03DAC6] hover:bg-[#03DAC6]/90 transition-all duration-200"
                  >
                    {paymentSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    <CircleDollarSign className="h-4 w-4 mr-1.5" />
                    Simpan Pembayaran
                  </Button>
                </motion.div>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* ── DETAIL / TIMELINE DIALOG ───────────────────────────────── */}
      {/* ══════════════════════════════════════════════════════════════ */}
      <Dialog open={!!detailDialogDebt} onOpenChange={(open) => !open && setDetailDialogDebt(null)}>
        <DialogContent className="bg-gradient-to-b from-[#1A1A2E] to-[#1A1A2E]/95 border border-white/[0.08] text-white sm:max-w-[520px] rounded-2xl shadow-2xl shadow-black/40 overflow-hidden max-h-[85vh] overflow-y-auto custom-scrollbar">
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[#BB86FC] via-[#03DAC6] to-[#FFD700]" />

          {detailDialogDebt && (
            <>
              <DialogHeader className="pt-2">
                <DialogTitle className="text-white text-lg font-semibold flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-[#BB86FC]/10 flex items-center justify-center">
                    <HandCoins className="h-4 w-4 text-[#BB86FC]" />
                  </div>
                  Detail Piutang
                </DialogTitle>
                <DialogDescription className="text-white/50 pl-10">
                  {detailDialogDebt.counterpart}
                </DialogDescription>
              </DialogHeader>

              {detailLoading ? (
                <div className="space-y-3 py-4">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-16 rounded-xl bg-white/[0.06]" />
                  ))}
                </div>
              ) : (
                <div className="space-y-4 mt-2">
                  {/* ── Summary Card ── */}
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06] space-y-3"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <div className="h-7 w-7 rounded-lg bg-white/[0.06] flex items-center justify-center text-[10px] font-bold text-white/60">
                        {detailDialogDebt.counterpart.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-semibold truncate">{detailDialogDebt.counterpart}</p>
                        {detailDialogDebt.description && (
                          <p className="text-white/40 text-[11px] truncate">{detailDialogDebt.description}</p>
                        )}
                      </div>
                      <Badge
                        variant="outline"
                        className="text-[10px] font-medium border-0 rounded-full px-2.5 py-0.5 shrink-0"
                        style={{
                          backgroundColor: `${getStatusConfig(detailDialogDebt.status).color}15`,
                          color: getStatusConfig(detailDialogDebt.status).color,
                        }}
                      >
                        {getStatusConfig(detailDialogDebt.status).label}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <p className="text-white/30 text-[9px] uppercase tracking-wider">Total</p>
                        <p className="text-white text-sm font-bold tabular-nums">{formatAmount(detailDialogDebt.amount)}</p>
                      </div>
                      <div>
                        <p className="text-white/30 text-[9px] uppercase tracking-wider">Dibayar</p>
                        <p className="text-[#03DAC6] text-sm font-bold tabular-nums">{formatAmount(detailDialogDebt.amount - detailDialogDebt.remaining)}</p>
                      </div>
                      <div>
                        <p className="text-white/30 text-[9px] uppercase tracking-wider">Sisa</p>
                        <p className="text-[#FFD700] text-sm font-bold tabular-nums">{formatAmount(detailDialogDebt.remaining)}</p>
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
                      <div className="h-2 bg-white/[0.06] rounded-full overflow-hidden">
                        <motion.div
                          className="h-full rounded-full bg-gradient-to-r from-[#03DAC6] to-[#03DAC6]/60"
                          initial={{ width: 0 }}
                          animate={{
                            width: `${detailDialogDebt.amount > 0 ? Math.min(100, ((detailDialogDebt.amount - detailDialogDebt.remaining) / detailDialogDebt.amount) * 100) : 0}%`,
                          }}
                          transition={{ duration: 0.8, ease: 'easeOut' as const }}
                        />
                      </div>
                    </div>

                    {/* Due date info */}
                    {detailDialogDebt.dueDate && (
                      <div className="flex items-center gap-2 pt-1">
                        <CalendarDays className="h-3.5 w-3.5 text-white/30" />
                        <span className="text-white/40 text-xs">
                          Jatuh tempo: <span className={cn(
                            'font-mono',
                            detailDialogDebt.status !== 'paid' && differenceInDays(new Date(), parseISO(detailDialogDebt.dueDate)) > 0
                              ? 'text-[#CF6679] font-semibold'
                              : ''
                          )}>{formatDate(detailDialogDebt.dueDate)}</span>
                        </span>
                      </div>
                    )}
                  </motion.div>

                  {/* ── Payment Score ── */}
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="p-4 rounded-xl border"
                    style={{
                      backgroundColor: `${getPaymentScore(detailDialogDebt).color}08`,
                      borderColor: `${getPaymentScore(detailDialogDebt).color}20`,
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="h-10 w-10 rounded-xl flex items-center justify-center text-lg font-bold"
                        style={{
                          backgroundColor: `${getPaymentScore(detailDialogDebt).color}15`,
                          color: getPaymentScore(detailDialogDebt).color,
                        }}
                      >
                        {getPaymentScore(detailDialogDebt).score}
                      </div>
                      <div>
                        <p className="text-white/40 text-[10px] uppercase tracking-wider">Skor Pembayaran</p>
                        <p
                          className="text-sm font-bold"
                          style={{ color: getPaymentScore(detailDialogDebt).color }}
                        >
                          {getPaymentScore(detailDialogDebt).label}
                        </p>
                      </div>
                    </div>
                  </motion.div>

                  {/* ── Payment Timeline ── */}
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 }}
                  >
                    <h3 className="text-white/50 text-[11px] font-semibold uppercase tracking-wider mb-3 flex items-center gap-2">
                      <Clock className="h-3.5 w-3.5" />
                      Riwayat Pembayaran
                    </h3>
                    {(debtPayments[detailDialogDebt.id] || []).length === 0 ? (
                      <div className="text-center py-8 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                        <Inbox className="h-8 w-8 text-white/10 mx-auto mb-2" />
                        <p className="text-white/25 text-xs">Belum ada pembayaran tercatat</p>
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-[250px] overflow-y-auto custom-scrollbar">
                        {[...(debtPayments[detailDialogDebt.id] || [])]
                          .sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime())
                          .map((payment, idx) => (
                            <motion.div
                              key={payment.id}
                              initial={{ opacity: 0, x: -8 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: idx * 0.05 }}
                              className="flex items-start gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/[0.05] hover:border-white/[0.1] transition-colors"
                            >
                              <div className="mt-0.5 flex flex-col items-center">
                                <div className="h-6 w-6 rounded-full bg-[#03DAC6]/10 flex items-center justify-center">
                                  <CheckCircle2 className="h-3 w-3 text-[#03DAC6]" />
                                </div>
                                {idx < (debtPayments[detailDialogDebt.id] || []).length - 1 && (
                                  <div className="w-px flex-1 bg-white/[0.06] mt-1 min-h-[16px]" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-2">
                                  <p className="text-[#03DAC6] text-sm font-bold tabular-nums">
                                    +{formatAmount(payment.amount)}
                                  </p>
                                  <div className="flex items-center gap-1.5 shrink-0">
                                    {payment.paymentMethod && (
                                      <Badge
                                        variant="outline"
                                        className="text-[9px] font-medium border-0 rounded-full px-2 py-0"
                                        style={{
                                          backgroundColor: payment.paymentMethod === 'transfer' ? '#03DAC615' : payment.paymentMethod === 'cash' ? '#FFD70015' : '#BB86FC15',
                                          color: payment.paymentMethod === 'transfer' ? '#03DAC6' : payment.paymentMethod === 'cash' ? '#FFD700' : '#BB86FC',
                                        }}
                                      >
                                        {payment.paymentMethod === 'transfer' ? 'Transfer' : payment.paymentMethod === 'cash' ? 'Cash' : 'QRIS'}
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className="text-white/30 text-[10px] font-mono">
                                    {formatDate(payment.paymentDate)}
                                  </span>
                                  {detailDialogDebt.dueDate && (() => {
                                    const diff = differenceInDays(new Date(payment.paymentDate), parseISO(detailDialogDebt.dueDate));
                                    if (diff <= 0) return <span className="text-[9px] text-[#03DAC6]/60">Tepat waktu</span>;
                                    if (diff <= 7) return <span className="text-[9px] text-[#FFD700]/60">+{diff} hari</span>;
                                    return <span className="text-[9px] text-[#CF6679]/60">+{diff} hari</span>;
                                  })()}
                                </div>
                                {payment.notes && (
                                  <p className="text-white/20 text-[10px] mt-1 truncate">{payment.notes}</p>
                                )}
                              </div>
                            </motion.div>
                          ))}
                      </div>
                    )}
                  </motion.div>

                  {/* ── Action Buttons ── */}
                  {detailDialogDebt.status !== 'paid' && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 }}
                      className="flex gap-2 pt-1"
                    >
                      <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="flex-1">
                        <Button
                          onClick={() => {
                            setDetailDialogDebt(null);
                            openPaymentDialog(detailDialogDebt);
                          }}
                          className="w-full text-white border-0 bg-[#03DAC6] hover:bg-[#03DAC6]/90 transition-all duration-200"
                          size="sm"
                        >
                          <CircleDollarSign className="h-4 w-4 mr-1.5" />
                          Catat Pembayaran
                        </Button>
                      </motion.div>
                      <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="flex-1">
                        <Button
                          onClick={() => sendReminder(detailDialogDebt)}
                          variant="outline"
                          className="w-full border-[#25D366]/30 text-[#25D366] hover:bg-[#25D366]/10 transition-all duration-200"
                          size="sm"
                        >
                          <MessageCircle className="h-4 w-4 mr-1.5" />
                          Ingatkan WA
                        </Button>
                      </motion.div>
                    </motion.div>
                  )}
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* ── DELETE CONFIRMATION ────────────────────────────────────── */}
      {/* ══════════════════════════════════════════════════════════════ */}
      <AlertDialog open={!!cashDeleteId} onOpenChange={(open) => !open && setCashDeleteId(null)}>
        <AlertDialogContent className="bg-[#1A1A2E] border border-white/[0.06] text-white rounded-2xl overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#CF6679]/30 via-[#CF6679]/10 to-transparent" />
          <AlertDialogHeader className="pt-2">
            <AlertDialogTitle className="text-white flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-[#CF6679]/10 flex items-center justify-center">
                <Trash2 className="h-4 w-4 text-[#CF6679]" />
              </div>
              {t('common.delete')}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-white/50 pl-10">
              Apakah Anda yakin ingin menghapus transaksi ini? Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 pt-2">
            <AlertDialogCancel className="border-white/[0.08] text-white/60 hover:bg-white/[0.05] hover:text-white transition-colors">
              {t('common.cancel')}
            </AlertDialogCancel>
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <AlertDialogAction
                onClick={handleCashDelete}
                className="bg-[#CF6679] hover:bg-[#CF6679]/90 text-white border-0 shadow-md shadow-[#CF6679]/20 transition-colors"
              >
                {t('common.delete')}
              </AlertDialogAction>
            </motion.div>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Custom Scrollbar Styles ── */}
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,0.08);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255,255,255,0.15);
        }
      `}</style>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════
// ── Helper: Status Config for Debts ────────────────────────────────
// ══════════════════════════════════════════════════════════════════════
function getStatusConfig(status: string): { label: string; color: string; textClass: string } {
  switch (status) {
    case 'active':
      return { label: 'Aktif', color: '#03DAC6', textClass: 'text-[#03DAC6]' };
    case 'partially_paid':
      return { label: 'Sebagian', color: '#FFD700', textClass: 'text-[#FFD700]' };
    case 'paid':
      return { label: 'Lunas', color: '#BB86FC', textClass: 'text-[#BB86FC]' };
    case 'overdue':
      return { label: 'Jatuh Tempo', color: '#CF6679', textClass: 'text-[#CF6679]' };
    default:
      return { label: status, color: '#999', textClass: 'text-white/50' };
  }
}

// ══════════════════════════════════════════════════════════════════════
// ── Reusable Empty State Component ─────────────────────────────────
// ══════════════════════════════════════════════════════════════════════
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
    <div className="flex flex-col items-center justify-center py-16 px-6">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring' as const, stiffness: 200, damping: 20, delay: 0.1 }}
        className="relative mb-5"
      >
        <div
          className="absolute -inset-4 rounded-full animate-pulse"
          style={{ backgroundColor: `${accentColor}08` }}
        />
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-white/[0.06] to-white/[0.02] border border-white/[0.08] flex items-center justify-center relative">
          {icon}
          <motion.div
            className="absolute -top-1 -right-1 h-3 w-3 rounded-full"
            style={{ backgroundColor: accentColor }}
            animate={{ scale: [1, 1.3, 1], opacity: [0.6, 1, 0.6] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' as const }}
          />
        </div>
      </motion.div>
      <motion.p
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="text-white/40 text-sm font-medium"
      >
        {title}
      </motion.p>
      <motion.p
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="text-white/20 text-xs mt-1.5 text-center max-w-[240px]"
      >
        {description}
      </motion.p>
      {onAction && actionLabel && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Button
            onClick={onAction}
            size="sm"
            className="mt-5 bg-gradient-to-r from-white/10 to-white/5 border border-white/[0.1] text-white/70 hover:text-white hover:bg-white/10 rounded-xl transition-all duration-200"
          >
            <Plus className="h-4 w-4 mr-1" />
            {actionLabel}
          </Button>
        </motion.div>
      )}
    </div>
  );
}
