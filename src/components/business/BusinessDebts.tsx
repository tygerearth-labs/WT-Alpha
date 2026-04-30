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
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
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
  Plus, Pencil, Trash2, ArrowDownCircle, ArrowUpCircle, CreditCard,
  CalendarDays, HeartPulse, TrendingUp, AlertTriangle, CheckCircle2,
  Clock, DollarSign, MessageCircle, Info, CircleDollarSign,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { AnimatePresence, motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';

interface Debt {
  id: string;
  type: 'hutang' | 'piutang';
  counterpart: string;
  amount: number;
  remaining: number;
  dueDate: string | null;
  description?: string;
  status: string;
  createdAt: string;
  downPayment?: number | null;
  installmentAmount?: number | null;
  installmentPeriod?: number | null;
  nextInstallmentDate?: string | null;
}

const STATUS_STYLES: Record<string, { label: string; style: React.CSSProperties }> = {
  active: { label: 'biz.debtActive', style: { background: 'var(--primary)', color: 'var(--primary)', borderWidth: '1px', borderColor: 'var(--primary)' } },
  partially_paid: { label: 'biz.debtActive', style: { background: 'var(--warning)', color: 'var(--warning)', borderWidth: '1px', borderColor: 'var(--warning)' } },
  paid: { label: 'biz.debtPaid', style: { background: 'var(--secondary)', color: 'var(--secondary)', borderWidth: '1px', borderColor: 'var(--secondary)' } },
  overdue: { label: 'biz.debtOverdue', style: { background: 'var(--destructive)', color: 'var(--destructive)', borderWidth: '1px', borderColor: 'var(--destructive)' } },
};

function calculateInstallmentLateInfo(debt: Debt): { lateDays: number; currentTempo: number; paidTempo: number; isLate: boolean } {
  const created = new Date(debt.createdAt);
  const now = new Date();
  const period = debt.installmentPeriod || 1;
  const instAmount = debt.installmentAmount || 0;

  // How many tempos should have been paid by now
  const monthsElapsed = (now.getFullYear() - created.getFullYear()) * 12 + (now.getMonth() - created.getMonth());
  const expectedTempo = Math.min(Math.max(0, monthsElapsed), period);

  // How many tempos have been paid (use totalPaid / installmentAmount)
  const totalPaid = debt.amount - debt.remaining;
  const paidTempo = instAmount > 0 ? Math.floor(totalPaid / instAmount) : 0;

  // If paid tempo < expected tempo, it's late
  if (paidTempo < expectedTempo && instAmount > 0 && debt.status !== 'paid') {
    // Calculate late days from the (paidTempo + 1)th due date
    const lateDueDate = new Date(created);
    lateDueDate.setMonth(lateDueDate.getMonth() + paidTempo);
    const lateDays = Math.ceil((now.getTime() - lateDueDate.getTime()) / (1000 * 60 * 60 * 24));
    return { lateDays: Math.max(0, lateDays), currentTempo: expectedTempo, paidTempo, isLate: true };
  }

  return { lateDays: 0, currentTempo: expectedTempo, paidTempo, isLate: false };
}

function getDueDateInfo(dueDate: string | null, remaining: number, debt?: Debt): { color: string; label: string; bg: string } {
  if (remaining <= 0) return { color: 'var(--muted-foreground)', label: '', bg: '' };

  // For installment debts, use chained tempo calculation
  if (debt && debt.installmentAmount && debt.installmentAmount > 0 && debt.createdAt) {
    const info = calculateInstallmentLateInfo(debt);
    if (info.isLate) {
      return {
        color: 'var(--destructive)',
              label: `Tempo ${info.paidTempo + 1}/${debt.installmentPeriod} · Lewat ${info.lateDays} hari`,
        bg: 'var(--destructive)',
      };
    }
    if (info.currentTempo < (debt.installmentPeriod || 0) && info.currentTempo > info.paidTempo) {
      return {
        color: 'var(--warning)',
        label: `Tempo ${info.currentTempo}/${debt.installmentPeriod} · ${info.currentTempo - info.paidTempo} tertunggak`,
        bg: 'var(--warning)',
      };
    }
    if (info.paidTempo >= (debt.installmentPeriod || 0)) {
      return { color: 'var(--secondary)', label: 'Lunas', bg: 'var(--secondary)' };
    }
    return { color: 'var(--secondary)', label: 'Aman', bg: 'var(--secondary)' };
  }

  // Non-installment logic (original)
  if (!dueDate) return { color: 'var(--muted-foreground)', label: '', bg: '' };
  const daysUntilDue = Math.ceil((new Date(dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (daysUntilDue < 0) return { color: 'var(--destructive)', label: `Lewat ${Math.abs(daysUntilDue)} hari`, bg: 'var(--destructive)' };
  if (daysUntilDue <= 3) return { color: 'var(--destructive)', label: `${daysUntilDue} hari lagi`, bg: 'var(--destructive)' };
  if (daysUntilDue <= 7) return { color: 'var(--warning)', label: `${daysUntilDue} hari lagi`, bg: 'var(--warning)' };
  return { color: 'var(--secondary)', label: 'Aman', bg: 'var(--secondary)' };
}

function getDueDateColor(dueDate: string | null, remaining: number, debt?: Debt): string {
  return getDueDateInfo(dueDate, remaining, debt).color;
}

const DebtEmptyState = ({ type }: { type: string }) => (
  <motion.div 
    initial={{ opacity: 0, scale: 0.95 }} 
    animate={{ opacity: 1, scale: 1 }} 
    transition={{ duration: 0.4 }}
    className="biz-empty-state flex flex-col items-center justify-center py-12 px-4 relative"
  >
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
      <div className="w-32 h-32 rounded-full blur-3xl opacity-20" style={{ background: type === 'hutang' ? 'var(--destructive)' : 'var(--secondary)' }} />
    </div>
    <div className="biz-empty-state-icon w-16 h-16 rounded-2xl flex items-center justify-center mb-4 border relative" 
      style={{ background: type === 'hutang' ? 'var(--destructive)/10' : 'var(--secondary)/10', borderColor: type === 'hutang' ? 'var(--destructive)/20' : 'var(--secondary)/20' }}>
      {type === 'hutang' ? (
        <ArrowDownCircle className="h-8 w-8" style={{ color: 'var(--destructive)', opacity: 0.7 }} />
      ) : (
        <ArrowUpCircle className="h-8 w-8" style={{ color: 'var(--secondary)', opacity: 0.7 }} />
      )}
    </div>
    <p className="text-sm font-medium relative" style={{ color: 'var(--foreground)' }}>
      {type === 'hutang' ? 'Belum ada hutang' : 'Belum ada piutang'}
    </p>
    <p className="text-xs mt-1 relative" style={{ color: 'var(--muted-foreground)', opacity: 0.6 }}>
      {type === 'hutang' ? 'Kelola hutang Anda di sini' : 'Kelola piutang Anda di sini'}
    </p>
  </motion.div>
);

export default function BusinessDebts() {
  const { t } = useTranslation();
  const { activeBusiness } = useBusinessStore();
  const { formatAmount } = useCurrencyFormat();
  const [debts, setDebts] = useState<Debt[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>('hutang');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDebt, setEditingDebt] = useState<Debt | null>(null);
  const [formData, setFormData] = useState({
    type: 'hutang' as 'hutang' | 'piutang',
    counterpart: '',
    amount: '',
    dueDate: '',
    description: '',
    isInstallment: false,
    downPayment: '',
    installmentAmount: '',
    installmentPeriod: '',
  });
  const [saving, setSaving] = useState(false);

  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [paymentDebt, setPaymentDebt] = useState<Debt | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [paying, setPaying] = useState(false);

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [sendingRemind, setSendingRemind] = useState<string | null>(null);

  const businessId = activeBusiness?.id;

  // Derived installment preview values
  const installmentPreview = useMemo(() => {
    const numAmount = parseFloat(formData.amount) || 0;
    const numDP = parseFloat(formData.downPayment) || 0;
    const numInstallment = parseFloat(formData.installmentAmount) || 0;
    const numPeriod = parseInt(formData.installmentPeriod) || 0;

    const remainingAfterDP = numAmount - numDP;
    const totalInstallments = numInstallment * numPeriod;
    const totalDPPlusInstallments = numDP + totalInstallments;

    return {
      remainingAfterDP: Math.max(0, remainingAfterDP),
      totalInstallments,
      totalDPPlusInstallments,
      numPeriod,
      numInstallment,
    };
  }, [formData.amount, formData.downPayment, formData.installmentAmount, formData.installmentPeriod]);

  const fetchDebts = useCallback(() => {
    if (!businessId) return;
    setLoading(true);
    fetch(`/api/business/${businessId}/debts`)
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then((data) => setDebts(data?.debts || []))
      .catch(() => setDebts([]))
      .finally(() => setLoading(false));
  }, [businessId]);

  useEffect(() => {
    if (businessId) {
      fetchDebts();
    } else {
      setLoading(false);
    }
  }, [businessId, fetchDebts]);

  const openCreateDialog = () => {
    setEditingDebt(null);
    setFormData({
      type: activeTab as 'hutang' | 'piutang',
      counterpart: '',
      amount: '',
      dueDate: '',
      description: '',
      isInstallment: false,
      downPayment: '',
      installmentAmount: '',
      installmentPeriod: '',
    });
    setDialogOpen(true);
  };

  const openEditDialog = (debt: Debt) => {
    setEditingDebt(debt);
    setFormData({
      type: debt.type,
      counterpart: debt.counterpart,
      amount: debt.amount.toString(),
      dueDate: debt.dueDate ? debt.dueDate.split('T')[0] : '',
      description: debt.description || '',
      isInstallment: !!debt.installmentAmount,
      downPayment: debt.downPayment ? debt.downPayment.toString() : '',
      installmentAmount: debt.installmentAmount ? debt.installmentAmount.toString() : '',
      installmentPeriod: debt.installmentPeriod ? debt.installmentPeriod.toString() : '',
    });
    setDialogOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessId || !formData.counterpart || !formData.amount) return;

    // Validate installment fields when toggle is ON
    if (formData.isInstallment) {
      if (!formData.installmentAmount || parseFloat(formData.installmentAmount) <= 0) {
        toast.error(t('biz.installmentAmount') + ' required');
        return;
      }
      if (!formData.installmentPeriod || parseInt(formData.installmentPeriod) <= 0) {
        toast.error(t('biz.installmentPeriod') + ' required');
        return;
      }
    }

    setSaving(true);
    try {
      const url = editingDebt
        ? `/api/business/${businessId}/debts/${editingDebt.id}`
        : `/api/business/${businessId}/debts`;
      const payload: Record<string, unknown> = {
        type: formData.type,
        counterpart: formData.counterpart.trim(),
        amount: parseFloat(formData.amount),
        dueDate: formData.dueDate || undefined,
        description: formData.description || undefined,
      };

      if (!editingDebt && formData.isInstallment) {
        payload.downPayment = formData.downPayment ? parseFloat(formData.downPayment) : 0;
        payload.installmentAmount = parseFloat(formData.installmentAmount);
        payload.installmentPeriod = parseInt(formData.installmentPeriod);
      }

      const res = await fetch(url, {
        method: editingDebt ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error();
      toast.success(editingDebt ? t('biz.businessUpdated') : t('biz.businessCreated'));
      setDialogOpen(false);
      fetchDebts();
    } catch {
      toast.error(t('common.error'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!businessId || !deleteId) return;
    try {
      const res = await fetch(`/api/business/${businessId}/debts/${deleteId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      toast.success(t('biz.businessUpdated'));
      fetchDebts();
    } catch {
      toast.error(t('common.error'));
    } finally {
      setDeleteId(null);
    }
  };

  const openPaymentDialog = (debt: Debt, isInstallmentPay = false) => {
    setPaymentDebt(debt);
    setPayAmount(isInstallmentPay && debt.installmentAmount ? debt.installmentAmount.toString() : '');
    setPaymentDialogOpen(true);
  };

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessId || !paymentDebt || !payAmount) return;
    const amount = parseFloat(payAmount);
    if (amount <= 0 || amount > paymentDebt.remaining) return;
    setPaying(true);
    try {
      const res = await fetch(`/api/business/${businessId}/debts/${paymentDebt.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payAmount: amount }),
      });
      if (!res.ok) throw new Error();
      toast.success(t('biz.businessUpdated'));
      setPaymentDialogOpen(false);
      fetchDebts();
    } catch {
      toast.error(t('common.error'));
    } finally {
      setPaying(false);
    }
  };

  const handleRemind = async (debtId: string) => {
    if (!businessId) return;
    setSendingRemind(debtId);
    try {
      const res = await fetch(`/api/business/${businessId}/debts/${debtId}/remind`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal');
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
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t('common.error'));
    } finally {
      setSendingRemind(null);
    }
  };

  const filtered = debts.filter((d) => d.type === activeTab);
  const totalAmount = filtered.reduce((sum, d) => sum + d.amount, 0);
  const totalRemaining = filtered.reduce((sum, d) => sum + d.remaining, 0);
  const totalPaid = totalAmount - totalRemaining;

  // Health score calculation
  const healthData = useMemo(() => {
    const activeCount = filtered.filter(d => d.status === 'active' || d.status === 'partially_paid').length;
    const paidCount = filtered.filter(d => d.status === 'paid').length;
    const overdueCount = filtered.filter(d => d.status === 'overdue').length;
    const total = filtered.length;

    const activePercent = total > 0 ? Math.round((activeCount / total) * 100) : 0;
    const paidPercent = total > 0 ? Math.round((paidCount / total) * 100) : 0;
    const overduePercent = total > 0 ? Math.round((overdueCount / total) * 100) : 0;

    // Health score: 100 = all paid, 0 = all overdue, midpoint for active
    const score = total > 0
      ? Math.round((paidCount * 100 + activeCount * 50) / total)
      : 100;

    return { activeCount, paidCount, overdueCount, total, activePercent, paidPercent, overduePercent, score };
  }, [filtered]);

  const getHealthLabel = (score: number) => {
    if (score >= 80) return { text: 'Sehat', color: 'var(--secondary)', icon: HeartPulse };
    if (score >= 50) return { text: 'Cukup', color: 'var(--warning)', icon: TrendingUp };
    return { text: 'Berisiko', color: 'var(--destructive)', icon: AlertTriangle };
  };

  const accentColor = activeTab === 'hutang' ? 'var(--destructive)' : 'var(--secondary)';

  // ── Nominal Previews ──
  const formattedDebtNominal = useMemo(() => {
    const num = parseFloat(formData.amount);
    if (isNaN(num) || num <= 0) return '';
    return formatAmount(num);
  }, [formData.amount, formatAmount]);

  const formattedDPNominal = useMemo(() => {
    const num = parseFloat(formData.downPayment);
    if (isNaN(num) || num <= 0) return '';
    return formatAmount(num);
  }, [formData.downPayment, formatAmount]);

  const formattedInstallmentNominal = useMemo(() => {
    const num = parseFloat(formData.installmentAmount);
    if (isNaN(num) || num <= 0) return '';
    return formatAmount(num);
  }, [formData.installmentAmount, formatAmount]);

  const formattedPayNominal = useMemo(() => {
    const num = parseFloat(payAmount);
    if (isNaN(num) || num <= 0) return '';
    return formatAmount(num);
  }, [payAmount, formatAmount]);

  if (!businessId) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground text-center">{t('biz.registerFirst')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 relative">
      {/* Ambient glows */}
      <div className="absolute -top-32 -left-20 h-[400px] w-[400px] rounded-full opacity-[0.06] blur-[100px] pointer-events-none" style={{ background: 'rgba(207,102,121,0.12)' }} />
      <div className="absolute top-60 -right-24 h-[350px] w-[350px] rounded-full opacity-[0.04] blur-[100px] pointer-events-none" style={{ background: 'rgba(239,68,68,0.15)' }} />
      {/* Info Banner */}
      <div className="biz-info-banner flex items-start gap-2 p-2.5 rounded-lg text-[11px] bg-primary/5 border border-primary/15">
        <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" style={{ color: 'var(--primary)' }} />
        <span className="text-muted-foreground">
          Kelola hutang dan piutang bisnis Anda. Untuk cicilan, sistem menghitung tempo otomatis dari tanggal pembuatan.
        </span>
      </div>
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
          <TabsList
            className="biz-tab-bar bg-white/[0.02] border border-white/[0.06] backdrop-blur-xl rounded-full p-1"
          >
            <TabsTrigger
              value="hutang"
              className={cn(
                'biz-tab-item data-[state=active]:shadow-none rounded-full transition-all duration-200',
                activeTab === 'hutang' ? 'biz-tab-item-active text-white' : 'text-white/60'
              )}
              style={activeTab === 'hutang' ? { background: 'linear-gradient(135deg, var(--destructive), rgba(239,68,68,0.8))', boxShadow: '0 0 12px rgba(239,68,68,0.25)' } : undefined}
            >
              <ArrowDownCircle className="h-4 w-4 mr-1" />
              {t('biz.hutang')}
            </TabsTrigger>
            <TabsTrigger
              value="piutang"
              className={cn(
                'biz-tab-item data-[state=active]:shadow-none rounded-full transition-all duration-200',
                activeTab === 'piutang' ? 'biz-tab-item-active text-white' : 'text-white/60'
              )}
              style={activeTab === 'piutang' ? { background: 'linear-gradient(135deg, var(--secondary), rgba(16,185,129,0.8))', boxShadow: '0 0 12px rgba(16,185,129,0.25)' } : undefined}
            >
              <ArrowUpCircle className="h-4 w-4 mr-1" />
              {t('biz.piutang')}
            </TabsTrigger>
          </TabsList>

          <Button
            onClick={openCreateDialog}
            size="sm"
            className="text-black transition-colors duration-200"
            style={{ background: 'var(--primary)' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = '#9B6FDB'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--primary)'; }}
          >
            <Plus className="h-4 w-4 mr-1" />
            {t('biz.addDebt')}
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="relative rounded-2xl">
          {/* Desktop gradient border glow */}
          <div className="absolute -inset-[1.5px] rounded-[18px] hidden lg:block"
            style={{
              background: 'linear-gradient(135deg, rgba(207,102,121,0.15), rgba(239,68,68,0.2), rgba(207,102,121,0.15))',
              filter: 'blur(2px)', opacity: 0.4,
              animation: 'heroGlow 4s ease-in-out infinite',
            }}
          />
          <div className="relative rounded-2xl overflow-hidden" style={{ background: 'linear-gradient(135deg, rgba(207,102,121,0.06), rgba(239,68,68,0.03))', border: '1px solid rgba(207,102,121,0.12)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)' }}>
          <div className="absolute top-0 left-4 right-4 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(207,102,121,0.3), rgba(239,68,68,0.2), transparent)' }} />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 sm:gap-2 mb-2 p-1.5">
          {/* Total Amount */}
          <motion.div whileHover={{ scale: 1.02, y: -1 }} transition={{ type: 'spring', stiffness: 300, damping: 20 }}>
          <Card
            className="biz-stat-card rounded-xl p-3 sm:p-4 border border-border"
            style={{ background: 'linear-gradient(135deg, color-mix(in srgb, var(--card) 90%, var(--destructive) 10%), color-mix(in srgb, var(--card) 95%, var(--warning) 5%))' }}
          >
            <div className="flex items-center gap-2 mb-1.5">
              <DollarSign className="h-4 w-4" style={{ color: accentColor }} />
              <span className="text-[11px] text-muted-foreground">{t('biz.debtAmount')}</span>
            </div>
            <p className="text-sm font-bold text-foreground">{formatAmount(totalAmount)}</p>
            <div className="mt-1.5 biz-progress-track h-1 rounded-full overflow-hidden bg-border">
              <div
                className="biz-progress-fill h-full rounded-full"
                style={{ width: '100%', background: accentColor, opacity: 0.3, transition: 'width 0.8s ease' }}
              />
            </div>
          </Card>
          </motion.div>

          {/* Remaining */}
          <motion.div whileHover={{ scale: 1.02, y: -1 }} transition={{ type: 'spring', stiffness: 300, damping: 20 }}>
          <Card
            className="biz-stat-card rounded-xl p-3 sm:p-4 border border-border"
            style={{ background: 'linear-gradient(135deg, color-mix(in srgb, var(--card) 90%, var(--warning) 10%), var(--card))' }}
          >
            <div className="flex items-center gap-2 mb-1.5">
              <Clock className="h-4 w-4" style={{ color: 'var(--warning)' }} />
              <span className="text-[11px] text-muted-foreground">{t('biz.debtRemaining')}</span>
            </div>
            <p className="text-sm font-bold text-foreground">{formatAmount(totalRemaining)}</p>
            <div className="mt-1.5 biz-progress-track h-1 rounded-full overflow-hidden bg-border">
              <div
                className="biz-progress-fill h-full rounded-full"
                style={{
                  width: totalAmount > 0 ? `${(totalRemaining / totalAmount) * 100}%` : '0%',
                  background: 'var(--warning)',
                  transition: 'width 0.8s ease',
                }}
              />
            </div>
          </Card>
          </motion.div>

          {/* Paid */}
          <motion.div whileHover={{ scale: 1.02, y: -1 }} transition={{ type: 'spring', stiffness: 300, damping: 20 }}>
          <Card
            className="biz-stat-card rounded-xl p-3 sm:p-4 border border-border"
            style={{ background: 'linear-gradient(135deg, color-mix(in srgb, var(--card) 90%, var(--secondary) 10%), var(--card))' }}
          >
            <div className="flex items-center gap-2 mb-1.5">
              <CheckCircle2 className="h-4 w-4" style={{ color: 'var(--secondary)' }} />
              <span className="text-[11px] text-muted-foreground">Dibayar</span>
            </div>
            <p className="text-sm font-bold" style={{ color: 'var(--secondary)' }}>{formatAmount(totalPaid)}</p>
            <div className="mt-1.5 biz-progress-track h-1 rounded-full overflow-hidden bg-border">
              <div
                className="biz-progress-fill h-full rounded-full"
                style={{
                  width: totalAmount > 0 ? `${(totalPaid / totalAmount) * 100}%` : '0%',
                  background: 'var(--secondary)',
                  transition: 'width 0.8s ease',
                }}
              />
            </div>
          </Card>
          </motion.div>

          {/* Health Score */}
          <motion.div whileHover={{ scale: 1.02, y: -1 }} transition={{ type: 'spring', stiffness: 300, damping: 20 }}>
          <Card
            className="biz-stat-card rounded-xl p-3 sm:p-4 border border-border"
            style={{ background: 'linear-gradient(135deg, color-mix(in srgb, var(--card) 88%, var(--primary) 12%), var(--card))' }}
          >
            <div className="flex items-center gap-2 mb-1.5">
              {(() => {
                const HIcon = getHealthLabel(healthData.score).icon;
                return <HIcon className="h-4 w-4" style={{ color: getHealthLabel(healthData.score).color }} />;
              })()}
              <span className="text-[11px] text-muted-foreground">Skor Kesehatan</span>
            </div>
            <div className="flex items-end gap-1.5">
              <p className="text-xl font-bold" style={{ color: getHealthLabel(healthData.score).color }}>
                {healthData.score}
              </p>
              <span className="text-[10px] mb-0.5 text-muted-foreground">/100</span>
            </div>
            <div className="flex items-center gap-1 mt-1.5">
              <div className="flex-1 biz-progress-track h-1.5 rounded-full overflow-hidden bg-border">
                <div
                  className="biz-progress-fill h-full rounded-full"
                  style={{
                    width: `${healthData.score}%`,
                    background: getHealthLabel(healthData.score).color,
                    transition: 'width 1s ease',
                  }}
                />
              </div>
              <span className="text-[10px] font-medium" style={{ color: getHealthLabel(healthData.score).color }}>
                {getHealthLabel(healthData.score).text}
              </span>
            </div>
            {healthData.total > 0 && (
              <div className="flex items-center gap-2 mt-1.5 text-[10px] text-muted-foreground opacity-60">
                <span className="flex items-center gap-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-secondary" />
                  {healthData.paidCount} lunas
                </span>
                <span className="flex items-center gap-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                  {healthData.activeCount} aktif
                </span>
                <span className="flex items-center gap-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-destructive" />
                  {healthData.overdueCount} lewat
                </span>
              </div>
            )}
          </Card>
          </motion.div>
        </div>
          </div>
        </div>

        <TabsContent value={activeTab} className="mt-0">
          <Card
            className="biz-content-card rounded-xl overflow-hidden bg-white/[0.02] border border-white/[0.06] backdrop-blur-xl"
          >
            <CardContent className="p-0">
              {loading ? (
                <div className="space-y-3 p-3 sm:p-4">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-10 rounded-lg bg-border" />
                  ))}
                </div>
              ) : filtered.length === 0 ? (
                <DebtEmptyState type={activeTab} />
              ) : (
                <>
                  {/* Mobile Card List */}
                  <div className="sm:hidden max-h-[500px] overflow-y-auto premium-scroll">
                    <AnimatePresence>
                      {filtered.map((debt, index) => {
                        const isInstallment = !!debt.installmentAmount && debt.installmentAmount > 0;
                        const paidPercent = debt.amount > 0 ? Math.round(((debt.amount - debt.remaining) / debt.amount) * 100) : 0;
                        const dueDateInfo = getDueDateInfo(debt.dueDate, debt.remaining, debt);
                        const accentBorder = activeTab === 'hutang'
                          ? (debt.status === 'paid' ? 'var(--secondary)' : (debt.status === 'overdue' ? 'var(--destructive)' : 'var(--destructive)'))
                          : (debt.status === 'paid' ? 'var(--secondary)' : (debt.status === 'overdue' ? 'var(--warning)' : 'var(--secondary)'));
                        return (
                          <motion.div
                            key={debt.id}
                            initial={{ opacity: 0, x: -8 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="biz-list-item biz-list-item-accent p-3 pl-4 space-y-2 border-l-[3px] hover:bg-white/[0.02] transition-colors"
                            style={{ borderLeftColor: accentBorder, borderBottom: '1px solid var(--border)' }}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5">
                                  <p className="text-xs font-medium truncate text-foreground">{debt.counterpart}</p>
                                  {isInstallment && (
                                    <Badge className="text-[9px] font-bold px-1.5 py-0 h-4 leading-none" style={{ background: 'var(--warning)', color: 'var(--warning)', borderWidth: '1px', borderColor: 'var(--warning)' }}>
                                      {t('biz.installmentBadge')}
                                    </Badge>
                                  )}
                                </div>
                                {debt.description && (
                                  <p className="text-[10px] mt-0.5 truncate text-muted-foreground opacity-60">{debt.description}</p>
                                )}
                              </div>
                              <div className="text-right shrink-0">
                                <p className="text-xs font-semibold tabular-nums text-foreground">{formatAmount(debt.remaining)}</p>
                                <p className="text-[10px] text-muted-foreground">dari {formatAmount(debt.amount)}</p>
                              </div>
                            </div>
                            {debt.remaining > 0 && (
                              <div className="flex items-center gap-2">
                                <div className="flex-1 biz-progress-track h-1.5 rounded-full overflow-hidden bg-border">
                                  <div className="biz-progress-fill h-full rounded-full" style={{ width: `${paidPercent}%`, background: paidPercent >= 75 ? 'var(--secondary)' : paidPercent >= 40 ? 'var(--warning)' : 'var(--destructive)', transition: 'width 0.6s ease' }} />
                                </div>
                                <span className="text-[10px] tabular-nums text-muted-foreground">{paidPercent}%</span>
                              </div>
                            )}
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1.5">
                                {debt.remaining > 0 && dueDateInfo.label && (
                                  <span className="text-[9px] font-medium px-1.5 py-0.5 rounded" style={{ backgroundColor: dueDateInfo.bg, color: dueDateInfo.color }}>{dueDateInfo.label}</span>
                                )}
                                {debt.remaining <= 0 && (
                                  <span className="flex items-center gap-1 text-[10px]" style={{ color: 'var(--secondary)' }}><CheckCircle2 className="h-3 w-3" />{t('biz.debtPaid')}</span>
                                )}
                              </div>
                              <div className="flex items-center gap-0.5">
                                {debt.remaining > 0 && (
                                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-md text-muted-foreground" onClick={() => openPaymentDialog(debt)}>
                                    <CreditCard className="h-3.5 w-3.5" />
                                  </Button>
                                )}
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-md hover:bg-[#25D36615]" style={{ color: '#25D366' }} onClick={() => handleRemind(debt.id)} disabled={sendingRemind === debt.id}>
                                  {sendingRemind === debt.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <MessageCircle className="h-4 w-4" />}
                                </Button>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-md text-muted-foreground" onClick={() => openEditDialog(debt)}>
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-md text-muted-foreground" onClick={() => setDeleteId(debt.id)}>
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </div>
                          </motion.div>
                        );
                      })}
                    </AnimatePresence>
                  </div>

                  {/* Desktop Table */}
                  <div className="hidden sm:block max-h-[500px] overflow-y-auto premium-scroll">
                  <Table>
                    <TableHeader>
                      <TableRow className="biz-table-header hover:bg-transparent border-b border-border">
                        <TableHead className="text-xs text-muted-foreground">{t('biz.debtCounterpart')}</TableHead>
                        <TableHead className="text-xs text-right hidden sm:table-cell text-muted-foreground">{t('biz.debtAmount')}</TableHead>
                        <TableHead className="text-xs text-muted-foreground">{t('biz.debtRemaining')}</TableHead>
                        <TableHead className="text-xs hidden sm:table-cell text-muted-foreground">{t('biz.debtDueDate')}</TableHead>
                        <TableHead className="text-xs hidden lg:table-cell text-muted-foreground">{t('biz.debtStatus')}</TableHead>
                        <TableHead className="text-xs w-28 text-muted-foreground" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <AnimatePresence>
                        {filtered.map((debt, index) => {
                          const statusStyle = STATUS_STYLES[debt.status] || STATUS_STYLES.active;
                          const isInstallment = !!debt.installmentAmount && debt.installmentAmount > 0;
                          const paidPercent = debt.amount > 0 ? Math.round(((debt.amount - debt.remaining) / debt.amount) * 100) : 0;
                          const dueDateInfo = getDueDateInfo(debt.dueDate, debt.remaining, debt);
                          const isAlt = index % 2 === 1;

                          return (
                            <motion.tr
                              key={debt.id}
                              initial={{ opacity: 0, y: 4 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0 }}
                              transition={{ duration: 0.2 }}
                              className={cn(isAlt && 'bg-white/[0.015]')}
                              style={isAlt ? { background: 'rgba(255,255,255,0.015)' } : undefined}
                            >
                              <TableCell className="py-2">
                                <div>
                                  <div className="flex items-center gap-1.5">
                                    <p className="text-xs font-medium text-foreground">{debt.counterpart}</p>
                                    {isInstallment && (
                                      <Badge
                                        className="text-[9px] font-bold px-1.5 py-0 h-4 leading-none"
                                        style={{ background: 'var(--warning)', color: 'var(--warning)', borderWidth: '1px', borderColor: 'var(--warning)' }}
                                      >
                                        {t('biz.installmentBadge')}
                                      </Badge>
                                    )}
                                  </div>
                                  {debt.description && (
                                    <p className="text-[10px] mt-0.5 max-w-[150px] truncate text-muted-foreground opacity-60">{debt.description}</p>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="text-xs font-medium py-2 hidden sm:table-cell text-destructive">
                                {formatAmount(debt.amount)}
                                {isInstallment && debt.downPayment && debt.downPayment > 0 && (
                                  <p className="text-[10px] mt-0.5 text-muted-foreground opacity-60">
                                    DP: {formatAmount(debt.downPayment)}
                                  </p>
                                )}
                              </TableCell>
                              <TableCell className="text-xs py-2 text-foreground">
                                {debt.remaining > 0 ? (
                                  <div>
                                    {formatAmount(debt.remaining)}
                                    {isInstallment && (
                                      <div className="mt-1">
                                        {/* Visual Progress Bar */}
                                        <div className="flex items-center gap-2">
                                          <div className="flex-1 biz-progress-track h-1.5 rounded-full overflow-hidden bg-border">
                                            <div
                                              className="biz-progress-fill h-full rounded-full"
                                              style={{
                                                width: `${paidPercent}%`,
                                                background: paidPercent >= 75 ? 'var(--secondary)' : paidPercent >= 40 ? 'var(--warning)' : 'var(--destructive)',
                                                transition: 'width 0.6s ease',
                                              }}
                                            />
                                          </div>
                                          <span className="text-[10px] w-7 text-right text-muted-foreground">{paidPercent}%</span>
                                        </div>
                                        {/* Timeline dots */}
                                        <div className="flex items-center gap-1 mt-1">
                                          {Array.from({ length: Math.min(debt.installmentPeriod || 1, 8) }).map((_, i) => {
                                            const filled = i < Math.round((paidPercent / 100) * (debt.installmentPeriod || 1));
                                            return (
                                              <div
                                                key={i}
                                                className="flex-1 h-1 rounded-full"
                                                style={{
                                                  background: filled
                                                    ? paidPercent >= 75 ? 'var(--secondary)' : 'var(--warning)'
                                                    : 'var(--border)',
                                                }}
                                              />
                                            );
                                          })}
                                          {(debt.installmentPeriod || 0) > 8 && (
                                            <span className="text-[8px] text-muted-foreground opacity-50">...</span>
                                          )}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <span className="flex items-center gap-1" style={{ color: 'var(--secondary)' }}>
                                    <CheckCircle2 className="h-3 w-3" />
                                    {t('biz.debtPaid')}
                                  </span>
                                )}
                              </TableCell>
                              <TableCell className="text-xs py-2 hidden sm:table-cell">
                                <div>
                                  {isInstallment && debt.installmentPeriod ? (() => {
                                    const instInfo = calculateInstallmentLateInfo(debt);
                                    return (
                                      <span className="text-[10px] font-medium" style={{ color: 'var(--warning)' }}>
                                        Tempo {instInfo.paidTempo}/{debt.installmentPeriod}
                                      </span>
                                    );
                                  })() : (
                                    <span style={{ color: dueDateInfo.color }}>
                                      {debt.dueDate ? new Date(debt.dueDate).toLocaleDateString() : '-'}
                                    </span>
                                  )}
                                  {/* Due date indicator badge */}
                                  {debt.remaining > 0 && dueDateInfo.label && (
                                    <div
                                      className="mt-1 inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-medium"
                                      style={{ backgroundColor: dueDateInfo.bg }}
                                    >
                                      {debt.status === 'overdue' || dueDateInfo.label.includes('Lewat') ? (
                                        <AlertTriangle className="h-2.5 w-2.5" style={{ color: dueDateInfo.color }} />
                                      ) : (
                                        <Clock className="h-2.5 w-2.5" style={{ color: dueDateInfo.color }} />
                                      )}
                                      <span style={{ color: dueDateInfo.color }}>{dueDateInfo.label}</span>
                                    </div>
                                  )}
                                  {isInstallment && debt.nextInstallmentDate && debt.remaining > 0 && (
                                    <div className="flex items-center gap-1 mt-1">
                                      <CalendarDays className="h-3 w-3" style={{ color: 'var(--warning)' }} />
                                      <span className="text-[10px]" style={{ color: 'var(--warning)' }}>
                                        {new Date(debt.nextInstallmentDate).toLocaleDateString()}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="py-2 hidden lg:table-cell">
                                <Badge variant="outline" style={statusStyle.style}>
                                  {t(statusStyle.label)}
                                </Badge>
                              </TableCell>
                              <TableCell className="py-2 text-right">
                                <div className="flex items-center justify-end gap-0.5">
                                  {debt.remaining > 0 && (
                                    <>
                                      {isInstallment && (
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-8 w-8 p-0 hover:bg-white/5"
                                          style={{ color: 'rgba(249, 168, 37, 0.6)' }}
                                          onClick={() => openPaymentDialog(debt, true)}
                                          title={t('biz.payInstallment')}
                                        >
                                          <CreditCard className="h-3.5 w-3.5" />
                                        </Button>
                                      )}
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-8 w-8 p-0 hover:bg-white/5 text-muted-foreground"
                                        onClick={() => openPaymentDialog(debt)}
                                        title={t('biz.payDebt')}
                                      >
                                        <CreditCard className="h-3.5 w-3.5" />
                                      </Button>
                                    </>
                                  )}
                                  {/* Kirim Tagihan WA Button */}
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0 hover:bg-[#25D36615]"
                                    style={{ color: '#25D366' }}
                                    onClick={() => handleRemind(debt.id)}
                                    title="Kirim Tagihan ke WA"
                                    disabled={sendingRemind === debt.id}
                                  >
                                    {sendingRemind === debt.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <MessageCircle className="h-4 w-4" />}
                                  </Button>
                                  <div className="flex items-center gap-0.5 opacity-60 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-150">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-8 w-8 p-0 hover:bg-white/5 text-muted-foreground"
                                      onClick={() => openEditDialog(debt)}
                                    >
                                      <Pencil className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-8 w-8 p-0 hover:bg-white/5 text-muted-foreground"
                                      onClick={() => setDeleteId(debt.id)}
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                  </div>
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
        </TabsContent>
      </Tabs>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent
          className="biz-dialog-content w-[95vw] sm:max-w-[520px] max-h-[90vh] overflow-y-auto bg-[#141414] border-white/[0.08] rounded-2xl p-0 text-foreground"
          style={{ boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }}
        >
          <div className="h-px bg-white/[0.06]" />
          <div className="p-5">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-foreground">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'color-mix(in srgb, var(--primary) 15%, transparent)' }}>
                {editingDebt ? <Pencil className="h-4 w-4" style={{ color: 'var(--primary)' }} /> : <Plus className="h-4 w-4" style={{ color: 'var(--primary)' }} />}
              </div>
              {editingDebt ? t('common.edit') : t('biz.addDebt')}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              {t('biz.hutangPiutang')}
            </DialogDescription>
          </DialogHeader>

          <div className="h-px bg-white/[0.06]" />

          <form onSubmit={handleSave} className="space-y-3">
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground">{t('biz.hutangPiutang')}</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={formData.type === 'hutang' ? 'default' : 'outline'}
                  onClick={() => setFormData({ ...formData, type: 'hutang' })}
                  className={cn(
                    'flex-1 transition-colors duration-200',
                    formData.type === 'hutang' ? 'text-white border-0' : ''
                  )}
                  style={formData.type === 'hutang' ? { background: 'var(--destructive)' } : { color: 'var(--muted-foreground)', borderColor: 'var(--border)' }}
                >
                  <ArrowDownCircle className="h-4 w-4 mr-1" />
                  {t('biz.hutang')}
                </Button>
                <Button
                  type="button"
                  variant={formData.type === 'piutang' ? 'default' : 'outline'}
                  onClick={() => setFormData({ ...formData, type: 'piutang' })}
                  className={cn(
                    'flex-1 transition-colors duration-200',
                    formData.type === 'piutang' ? 'text-black border-0' : ''
                  )}
                  style={formData.type === 'piutang' ? { background: 'var(--secondary)' } : { color: 'var(--muted-foreground)', borderColor: 'var(--border)' }}
                >
                  <ArrowUpCircle className="h-4 w-4 mr-1" />
                  {t('biz.piutang')}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground">{t('biz.debtCounterpart')} *</Label>
              <Input
                value={formData.counterpart}
                onChange={(e) => setFormData({ ...formData, counterpart: e.target.value })}
                placeholder={t('biz.debtCounterpart')}
                className="bg-white/[0.04] border-white/[0.08] rounded-xl focus:border-white/15 focus:ring-0 placeholder:text-white/30 transition-colors duration-200"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground">{t('biz.debtAmount')} *</Label>
              <Input
                type="number"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                placeholder="0"
                min="0"
                className="bg-white/[0.04] border-white/[0.08] rounded-xl focus:border-white/15 focus:ring-0 placeholder:text-white/30 transition-colors duration-200"
              />
              {formattedDebtNominal && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className="flex items-center gap-1.5 px-1 mt-1"
                >
                  <CircleDollarSign className="h-3 w-3 text-muted-foreground shrink-0" />
                  <span className="text-sm font-semibold tabular-nums" style={{ color: formData.type === 'piutang' ? 'var(--secondary)' : 'var(--destructive)' }}>
                    {formattedDebtNominal}
                  </span>
                </motion.div>
              )}
            </div>

            {/* Installment Toggle */}
            {!editingDebt && (
              <>
              <div className="h-px bg-white/[0.06]" />
              <div
                className="flex items-center justify-between py-2 px-3 rounded-lg"
                style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)' }}
              >
                <div>
                  <Label className="text-sm text-muted-foreground">{t('biz.isInstallment')}</Label>
                  <p className="text-[10px] text-muted-foreground">DP + cicilan bulanan</p>
                </div>
                <Switch
                  checked={formData.isInstallment}
                  onCheckedChange={(checked) => setFormData({ ...formData, isInstallment: checked })}
                />
              </div>
              </>
            )}

            {/* Installment Fields */}
            {!editingDebt && formData.isInstallment && (
              <div className="h-px bg-white/[0.06]" />
            )}
            {!editingDebt && formData.isInstallment && (
              <div
                className="space-y-3 p-3 rounded-xl overflow-hidden bg-warning/5 border border-warning/15"
              >
                <p className="text-xs font-medium" style={{ color: 'var(--warning)' }}>{t('biz.installmentInfo')}</p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">{t('biz.downPayment')}</Label>
                    <Input
                      type="number"
                      value={formData.downPayment}
                      onChange={(e) => setFormData({ ...formData, downPayment: e.target.value })}
                      placeholder="0"
                      min="0"
                className="bg-white/[0.04] border-white/[0.08] rounded-xl focus:border-white/15 focus:ring-0 placeholder:text-white/30 text-sm h-9 transition-colors duration-200"
                    />
                    {formattedDPNominal && (
                      <motion.div
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        className="flex items-center gap-1.5 px-1 mt-1"
                      >
                        <CircleDollarSign className="h-3 w-3 text-muted-foreground shrink-0" />
                        <span className="text-sm font-semibold tabular-nums text-foreground">
                          {formattedDPNominal}
                        </span>
                      </motion.div>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">{t('biz.installmentAmount')} *</Label>
                    <Input
                      type="number"
                      value={formData.installmentAmount}
                      onChange={(e) => setFormData({ ...formData, installmentAmount: e.target.value })}
                      placeholder="0"
                      min="0"
                className="bg-white/[0.04] border-white/[0.08] rounded-xl focus:border-white/15 focus:ring-0 placeholder:text-white/30 text-sm h-9 transition-colors duration-200"
                    />
                    {formattedInstallmentNominal && (
                      <motion.div
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        className="flex items-center gap-1.5 px-1 mt-1"
                      >
                        <CircleDollarSign className="h-3 w-3 text-muted-foreground shrink-0" />
                        <span className="text-sm font-semibold tabular-nums text-foreground">
                          {formattedInstallmentNominal}
                        </span>
                      </motion.div>
                    )}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">{t('biz.installmentPeriod')} *</Label>
                  <Input
                    type="number"
                    value={formData.installmentPeriod}
                    onChange={(e) => setFormData({ ...formData, installmentPeriod: e.target.value })}
                    placeholder="12"
                    min="1"
                    className="bg-white/[0.04] border-white/[0.08] rounded-xl focus:border-white/15 focus:ring-0 placeholder:text-white/30 text-sm h-9 w-1/2 transition-colors duration-200"
                  />
                </div>

                {/* Installment Preview with Visual Timeline */}
                {formData.amount && installmentPreview.numInstallment > 0 && installmentPreview.numPeriod > 0 && (
                  <div className="mt-3 space-y-3 p-3 rounded-lg" style={{ background: 'rgba(255,255,255,0.02)' }}>
                    <div className="space-y-2">
                      <div className="flex justify-between text-[11px]">
                        <span className="text-muted-foreground">{t('biz.downPayment')}</span>
                        <span className="font-medium text-foreground">{formatAmount(parseFloat(formData.downPayment) || 0)}</span>
                      </div>
                      <div className="flex justify-between text-[11px]">
                        <span className="text-muted-foreground">{t('biz.remainingAfterDP')}</span>
                        <span className="font-medium text-foreground">{formatAmount(installmentPreview.remainingAfterDP)}</span>
                      </div>
                      <div className="flex justify-between text-[11px]">
                        <span className="text-muted-foreground">
                          {t('biz.installmentSchedule')} ({installmentPreview.numPeriod}x)
                        </span>
                        <span className="font-medium" style={{ color: 'var(--warning)' }}>{formatAmount(installmentPreview.totalInstallments)}</span>
                      </div>
                      <div className="pt-2 flex justify-between text-[11px] border-t border-border">
                        <span className="text-muted-foreground">Total</span>
                        <span className="font-bold text-foreground">{formatAmount(installmentPreview.totalDPPlusInstallments)}</span>
                      </div>
                    </div>

                    {/* Visual Timeline */}
                    <div>
                      <p className="text-[10px] mb-1.5 text-muted-foreground opacity-60">Timeline cicilan</p>
                      <div className="flex items-center gap-0.5">
                        <div className="w-2 h-2 rounded-full bg-warning" />
                        <div className="flex-1 h-0.5 bg-warning/30" />
                        {Array.from({ length: Math.min(installmentPreview.numPeriod - 1, 10) }).map((_, i) => (
                          <React.Fragment key={i}>
                            <div className="w-2 h-2 rounded-full" style={{ background: 'rgba(255,255,255,0.1)' }} />
                            {i < Math.min(installmentPreview.numPeriod - 2, 9) && (
                              <div className="flex-1 h-0.5 bg-border" />
                            )}
                          </React.Fragment>
                        ))}
                        <div className="w-2 h-2 rounded-full" style={{ background: 'rgba(255,255,255,0.1)' }} />
                      </div>
                      <div className="flex justify-between mt-1 text-[8px] text-muted-foreground opacity-50">
                        <span>DP</span>
                        <span>Bulan {installmentPreview.numPeriod}</span>
                      </div>
                    </div>

                    {installmentPreview.totalDPPlusInstallments !== parseFloat(formData.amount) && (
                      <p className="text-[9px] text-muted-foreground opacity-60">
                        {installmentPreview.totalDPPlusInstallments > parseFloat(formData.amount)
                          ? `⚠️ ${formatAmount(installmentPreview.totalDPPlusInstallments - parseFloat(formData.amount))} lebih dari jumlah`
                          : `ℹ️ ${formatAmount(parseFloat(formData.amount) - installmentPreview.totalDPPlusInstallments)} kurang dari jumlah`}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="h-px bg-white/[0.06]" />

            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground">{t('biz.debtDueDate')}</Label>
              <Input
                type="date"
                value={formData.dueDate}
                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                className="bg-white/[0.04] border-white/[0.08] rounded-xl focus:border-white/15 focus:ring-0 transition-colors duration-200"
              />
            </div>

            <div className="h-px bg-white/[0.06]" />

            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground">{t('biz.debtDescription')}</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder={t('biz.debtDescription')}
                className="bg-white/[0.04] border-white/[0.08] rounded-xl focus:border-white/15 focus:ring-0 placeholder:text-white/30 min-h-[60px] resize-none transition-colors duration-200"
              />
            </div>

            <DialogFooter className="gap-2 pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setDialogOpen(false)}
              >
                {t('common.cancel')}
              </Button>
              <Button
                type="submit"
                disabled={saving || !formData.counterpart || !formData.amount}
                className="rounded-xl text-white transition-colors duration-200"
                style={{ background: 'linear-gradient(135deg, var(--secondary), var(--primary))' }}
              >
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t('common.save')}
              </Button>
            </DialogFooter>
          </form>
          </div>
        </DialogContent>
      </Dialog>

      {/* Partial Payment Dialog */}
      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent
          className="biz-dialog-content w-[95vw] sm:max-w-[420px] bg-[#141414] border-white/[0.08] rounded-2xl p-0 text-foreground"
          style={{ boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }}
        >
          <div className="h-px bg-white/[0.06]" />
          <div className="p-5">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-foreground">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'color-mix(in srgb, var(--secondary) 15%, transparent)' }}>
                <CreditCard className="h-4 w-4" style={{ color: 'var(--secondary)' }} />
              </div>
              {paymentDebt?.installmentAmount ? t('biz.payInstallment') : t('biz.payDebt')}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              {paymentDebt?.counterpart}
            </DialogDescription>
          </DialogHeader>

          <div className="h-px bg-white/[0.06]" />

          {/* Visual Balance Preview */}
          {paymentDebt && (
            <div className="p-3 rounded-xl space-y-3 bg-white/[0.02] border border-border">
              {/* Balance Bar */}
              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-muted-foreground">Total</span>
                  <span className="font-medium text-foreground">{formatAmount(paymentDebt.amount)}</span>
                </div>
                <div className="h-3 rounded-full overflow-hidden relative bg-border">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${paymentDebt.amount > 0 ? ((paymentDebt.amount - paymentDebt.remaining) / paymentDebt.amount) * 100 : 0}%`,
                      background: 'var(--secondary)',
                      transition: 'width 0.6s ease',
                    }}
                  />
                  {payAmount && parseFloat(payAmount) > 0 && parseFloat(payAmount) <= paymentDebt.remaining && (
                    <div
                      className="absolute top-0 h-full rounded-full"
                      style={{
                        background: 'rgba(187, 134, 252, 0.4)',
                        left: `${paymentDebt.amount > 0 ? ((paymentDebt.amount - paymentDebt.remaining) / paymentDebt.amount) * 100 : 0}%`,
                        width: `${(parseFloat(payAmount) / paymentDebt.amount) * 100}%`,
                        transition: 'opacity 0.3s ease',
                      }}
                    />
                  )}
                </div>
                <div className="flex justify-between mt-1.5 text-[10px]">
                  <span style={{ color: 'var(--secondary)' }}>Dibayar: {formatAmount(paymentDebt.amount - paymentDebt.remaining)}</span>
                  <span className="text-muted-foreground">Sisa: {formatAmount(paymentDebt.remaining)}</span>
                </div>
              </div>

              <Separator className="h-px bg-white/[0.06]" />

              {/* New Balance Preview */}
              {payAmount && parseFloat(payAmount) > 0 && parseFloat(payAmount) <= paymentDebt.remaining && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Sisa setelah bayar</span>
                  <span className="text-sm font-bold" style={{ color: 'var(--secondary)' }}>
                    {formatAmount(paymentDebt.remaining - parseFloat(payAmount))}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Installment Info */}
          {paymentDebt?.installmentAmount && paymentDebt.installmentAmount > 0 && (
            <div className="h-px bg-white/[0.06]" />
          )}
          {paymentDebt?.installmentAmount && paymentDebt.installmentAmount > 0 && (
            <div className="p-3 rounded-lg bg-warning/5 border border-warning/15">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">{t('biz.installmentAmount')}</span>
                <span className="font-medium" style={{ color: 'var(--warning)' }}>{formatAmount(paymentDebt.installmentAmount)}</span>
              </div>
              {paymentDebt.nextInstallmentDate && paymentDebt.remaining > 0 && (
                <div className="flex justify-between text-xs mt-1">
                  <span className="text-muted-foreground">{t('biz.nextDueDate')}</span>
                  <span className="text-muted-foreground">{new Date(paymentDebt.nextInstallmentDate).toLocaleDateString()}</span>
                </div>
              )}
              {paymentDebt.installmentPeriod && (
                <div className="flex justify-between text-xs mt-1">
                  <span className="text-muted-foreground">{t('biz.installmentPeriod')}</span>
                  <span className="text-muted-foreground">{paymentDebt.installmentPeriod} bulan</span>
                </div>
              )}
            </div>
          )}

          <div className="h-px bg-white/[0.06]" />

          <form onSubmit={handlePay} className="space-y-3">
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground">{t('biz.debtAmount')} *</Label>
              <Input
                type="number"
                value={payAmount}
                onChange={(e) => setPayAmount(e.target.value)}
                placeholder="0"
                min="0"
                max={paymentDebt?.remaining || 0}
                className="bg-white/[0.04] border-white/[0.08] rounded-xl focus:border-white/15 focus:ring-0 placeholder:text-white/30 transition-colors duration-200"
              />
              {formattedPayNominal && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className="flex items-center gap-1.5 px-1 mt-1"
                >
                  <CircleDollarSign className="h-3 w-3 text-muted-foreground shrink-0" />
                  <span className="text-sm font-semibold tabular-nums text-destructive">
                    -{formattedPayNominal}
                  </span>
                </motion.div>
              )}
              <div className="flex items-center justify-between">
                <p className="text-[10px] text-muted-foreground opacity-60">
                  Maks: {formatAmount(paymentDebt?.remaining || 0)}
                </p>
                {paymentDebt?.installmentAmount && paymentDebt.installmentAmount > 0 && (
                  <button
                    type="button"
                    onClick={() => setPayAmount(paymentDebt.installmentAmount!.toString())}
                    className="text-[10px] transition-colors"
                    style={{ color: 'var(--warning)' }}
                  >
                    Gunakan jumlah cicilan
                  </button>
                )}
              </div>
            </div>

            <DialogFooter className="gap-2 pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setPaymentDialogOpen(false)}
              >
                {t('common.cancel')}
              </Button>
              <Button
                type="submit"
                disabled={paying || !payAmount || parseFloat(payAmount) <= 0 || parseFloat(payAmount) > (paymentDebt?.remaining || 0)}
                className="rounded-xl text-white transition-colors duration-200"
                style={{ background: 'linear-gradient(135deg, var(--secondary), var(--primary))' }}
              >
                {paying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {paymentDebt?.installmentAmount ? t('biz.payInstallment') : t('biz.payDebt')}
              </Button>
            </DialogFooter>
          </form>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent className="biz-dialog-content bg-card border border-border text-foreground">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">{t('common.delete')}</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              {t('kas.deleteDesc')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="hover:bg-white/5 border-border text-foreground">
              {t('common.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-500 hover:bg-red-600 text-white border-0"
            >
              {t('common.delete')}
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
