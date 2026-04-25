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
  Clock, DollarSign, MessageCircle, Info,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { AnimatePresence, motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';

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
  active: { label: 'biz.debtActive', style: { background: `${THEME.primary}20`, color: THEME.primary, borderWidth: '1px', borderColor: `${THEME.primary}30` } },
  partially_paid: { label: 'biz.debtActive', style: { background: `${THEME.warning}20`, color: THEME.warning, borderWidth: '1px', borderColor: `${THEME.warning}30` } },
  paid: { label: 'biz.debtPaid', style: { background: `${THEME.secondary}20`, color: THEME.secondary, borderWidth: '1px', borderColor: `${THEME.secondary}30` } },
  overdue: { label: 'biz.debtOverdue', style: { background: `${THEME.destructive}20`, color: THEME.destructive, borderWidth: '1px', borderColor: `${THEME.destructive}30` } },
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
  if (remaining <= 0) return { color: THEME.muted, label: '', bg: '' };

  // For installment debts, use chained tempo calculation
  if (debt && debt.installmentAmount && debt.installmentAmount > 0 && debt.createdAt) {
    const info = calculateInstallmentLateInfo(debt);
    if (info.isLate) {
      return {
        color: THEME.destructive,
        label: `Tempo ${info.paidTempo + 1}/${debt.installmentPeriod} · Lewat ${info.lateDays} hari`,
        bg: `${THEME.destructive}1A`,
      };
    }
    if (info.currentTempo < (debt.installmentPeriod || 0) && info.currentTempo > info.paidTempo) {
      return {
        color: THEME.warning,
        label: `Tempo ${info.currentTempo}/${debt.installmentPeriod} · ${info.currentTempo - info.paidTempo} tertunggak`,
        bg: `${THEME.warning}1A`,
      };
    }
    if (info.paidTempo >= (debt.installmentPeriod || 0)) {
      return { color: THEME.secondary, label: 'Lunas', bg: `${THEME.secondary}1A` };
    }
    return { color: THEME.secondary, label: 'Aman', bg: `${THEME.secondary}1A` };
  }

  // Non-installment logic (original)
  if (!dueDate) return { color: THEME.muted, label: '', bg: '' };
  const daysUntilDue = Math.ceil((new Date(dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (daysUntilDue < 0) return { color: THEME.destructive, label: `Lewat ${Math.abs(daysUntilDue)} hari`, bg: `${THEME.destructive}1A` };
  if (daysUntilDue <= 3) return { color: THEME.destructive, label: `${daysUntilDue} hari lagi`, bg: `${THEME.destructive}1A` };
  if (daysUntilDue <= 7) return { color: THEME.warning, label: `${daysUntilDue} hari lagi`, bg: `${THEME.warning}1A` };
  return { color: THEME.secondary, label: 'Aman', bg: `${THEME.secondary}1A` };
}

function getDueDateColor(dueDate: string | null, remaining: number, debt?: Debt): string {
  return getDueDateInfo(dueDate, remaining, debt).color;
}

const DebtEmptyState = ({ type }: { type: string }) => (
  <div className="flex flex-col items-center justify-center py-12 px-4">
    <div
      className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
      style={{ background: type === 'hutang' ? `${THEME.destructive}15` : `${THEME.secondary}15` }}
    >
      {type === 'hutang' ? (
        <ArrowDownCircle className="h-8 w-8" style={{ color: THEME.destructive, opacity: 0.6 }} />
      ) : (
        <ArrowUpCircle className="h-8 w-8" style={{ color: THEME.secondary, opacity: 0.6 }} />
      )}
    </div>
    <p style={{ color: THEME.muted }} className="text-sm font-medium">
      {type === 'hutang' ? 'Belum ada hutang' : 'Belum ada piutang'}
    </p>
    <p style={{ color: THEME.muted, opacity: 0.6 }} className="text-xs mt-1">
      {type === 'hutang' ? 'Kelola hutang Anda di sini' : 'Kelola piutang Anda di sini'}
    </p>
  </div>
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
      window.open(data.message, '_blank');
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
    if (score >= 80) return { text: 'Sehat', color: THEME.secondary, icon: HeartPulse };
    if (score >= 50) return { text: 'Cukup', color: THEME.warning, icon: TrendingUp };
    return { text: 'Berisiko', color: THEME.destructive, icon: AlertTriangle };
  };

  const accentColor = activeTab === 'hutang' ? THEME.destructive : THEME.secondary;

  if (!businessId) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p style={{ color: THEME.muted }} className="text-center">{t('biz.registerFirst')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Info Banner */}
      <div
        className="flex items-start gap-2.5 p-3 rounded-lg text-[11px]"
        style={{ background: `${THEME.primary}08`, border: `1px solid ${THEME.primary}20` }}
      >
        <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" style={{ color: THEME.primary }} />
        <span style={{ color: THEME.textSecondary }}>
          Kelola hutang dan piutang bisnis Anda. Untuk cicilan, sistem menghitung tempo otomatis dari tanggal pembuatan.
        </span>
      </div>
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
          <TabsList
            style={{ background: THEME.surface, border: `1px solid ${THEME.border}` }}
            className="rounded-lg"
          >
            <TabsTrigger
              value="hutang"
              className={cn(
                'data-[state=active]:shadow-none transition-colors duration-200',
                activeTab === 'hutang' ? 'text-white' : 'text-white/60'
              )}
              style={activeTab === 'hutang' ? { background: `${THEME.destructive}20`, color: THEME.destructive } : undefined}
            >
              <ArrowDownCircle className="h-4 w-4 mr-1" />
              {t('biz.hutang')}
            </TabsTrigger>
            <TabsTrigger
              value="piutang"
              className={cn(
                'data-[state=active]:shadow-none transition-colors duration-200',
                activeTab === 'piutang' ? 'text-white' : 'text-white/60'
              )}
              style={activeTab === 'piutang' ? { background: `${THEME.secondary}20`, color: THEME.secondary } : undefined}
            >
              <ArrowUpCircle className="h-4 w-4 mr-1" />
              {t('biz.piutang')}
            </TabsTrigger>
          </TabsList>

          <Button
            onClick={openCreateDialog}
            size="sm"
            className="text-black transition-colors duration-200"
            style={{ background: THEME.primary }}
            onMouseEnter={(e) => { e.currentTarget.style.background = '#9B6FDB'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = THEME.primary; }}
          >
            <Plus className="h-4 w-4 mr-1" />
            {t('biz.addDebt')}
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 mb-3">
          {/* Total Amount */}
          <Card
            className="rounded-xl p-3 sm:p-4"
            style={{ background: THEME.surface, border: `1px solid ${THEME.border}` }}
          >
            <div className="flex items-center gap-2 mb-1.5">
              <DollarSign className="h-4 w-4" style={{ color: accentColor }} />
              <span className="text-[11px]" style={{ color: THEME.muted }}>{t('biz.debtAmount')}</span>
            </div>
            <p className="text-sm font-bold" style={{ color: THEME.text }}>{formatAmount(totalAmount)}</p>
            <div className="mt-1.5 h-1 rounded-full overflow-hidden" style={{ background: THEME.border }}>
              <div
                className="h-full rounded-full"
                style={{ width: '100%', background: accentColor, opacity: 0.3, transition: 'width 0.8s ease' }}
              />
            </div>
          </Card>

          {/* Remaining */}
          <Card
            className="rounded-xl p-3 sm:p-4"
            style={{ background: THEME.surface, border: `1px solid ${THEME.border}` }}
          >
            <div className="flex items-center gap-2 mb-1.5">
              <Clock className="h-4 w-4" style={{ color: THEME.warning }} />
              <span className="text-[11px]" style={{ color: THEME.muted }}>{t('biz.debtRemaining')}</span>
            </div>
            <p className="text-sm font-bold" style={{ color: THEME.text }}>{formatAmount(totalRemaining)}</p>
            <div className="mt-1.5 h-1 rounded-full overflow-hidden" style={{ background: THEME.border }}>
              <div
                className="h-full rounded-full"
                style={{
                  width: totalAmount > 0 ? `${(totalRemaining / totalAmount) * 100}%` : '0%',
                  background: THEME.warning,
                  transition: 'width 0.8s ease',
                }}
              />
            </div>
          </Card>

          {/* Paid */}
          <Card
            className="rounded-xl p-3 sm:p-4"
            style={{ background: THEME.surface, border: `1px solid ${THEME.border}` }}
          >
            <div className="flex items-center gap-2 mb-1.5">
              <CheckCircle2 className="h-4 w-4" style={{ color: THEME.secondary }} />
              <span className="text-[11px]" style={{ color: THEME.muted }}>Dibayar</span>
            </div>
            <p className="text-sm font-bold" style={{ color: THEME.secondary }}>{formatAmount(totalPaid)}</p>
            <div className="mt-1.5 h-1 rounded-full overflow-hidden" style={{ background: THEME.border }}>
              <div
                className="h-full rounded-full"
                style={{
                  width: totalAmount > 0 ? `${(totalPaid / totalAmount) * 100}%` : '0%',
                  background: THEME.secondary,
                  transition: 'width 0.8s ease',
                }}
              />
            </div>
          </Card>

          {/* Health Score */}
          <Card
            className="rounded-xl p-3 sm:p-4"
            style={{ background: THEME.surface, border: `1px solid ${THEME.border}` }}
          >
            <div className="flex items-center gap-2 mb-1.5">
              {(() => {
                const HIcon = getHealthLabel(healthData.score).icon;
                return <HIcon className="h-4 w-4" style={{ color: getHealthLabel(healthData.score).color }} />;
              })()}
              <span className="text-[11px]" style={{ color: THEME.muted }}>Skor Kesehatan</span>
            </div>
            <div className="flex items-end gap-1.5">
              <p className="text-xl font-bold" style={{ color: getHealthLabel(healthData.score).color }}>
                {healthData.score}
              </p>
              <span className="text-[10px] mb-0.5" style={{ color: THEME.muted }}>/100</span>
            </div>
            <div className="flex items-center gap-1 mt-1.5">
              <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: THEME.border }}>
                <div
                  className="h-full rounded-full"
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
              <div className="flex items-center gap-2 mt-1.5 text-[10px]" style={{ color: THEME.muted, opacity: 0.6 }}>
                <span className="flex items-center gap-0.5">
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: THEME.secondary }} />
                  {healthData.paidCount} lunas
                </span>
                <span className="flex items-center gap-0.5">
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: THEME.primary }} />
                  {healthData.activeCount} aktif
                </span>
                <span className="flex items-center gap-0.5">
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: THEME.destructive }} />
                  {healthData.overdueCount} lewat
                </span>
              </div>
            )}
          </Card>
        </div>

        <TabsContent value={activeTab} className="mt-0">
          <Card
            className="rounded-xl overflow-hidden"
            style={{ background: THEME.surface, border: `1px solid ${THEME.border}` }}
          >
            <CardContent className="p-0">
              {loading ? (
                <div className="space-y-3 p-3 sm:p-4">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-10 rounded-lg" style={{ background: THEME.border }} />
                  ))}
                </div>
              ) : filtered.length === 0 ? (
                <DebtEmptyState type={activeTab} />
              ) : (
                <div className="max-h-[500px] overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow style={{ borderBottom: `1px solid ${THEME.border}` }} className="hover:bg-transparent">
                        <TableHead className="text-xs" style={{ color: THEME.muted }}>{t('biz.debtCounterpart')}</TableHead>
                        <TableHead className="text-xs" style={{ color: THEME.muted }}>{t('biz.debtAmount')}</TableHead>
                        <TableHead className="text-xs" style={{ color: THEME.muted }}>{t('biz.debtRemaining')}</TableHead>
                        <TableHead className="text-xs hidden sm:table-cell" style={{ color: THEME.muted }}>{t('biz.debtDueDate')}</TableHead>
                        <TableHead className="text-xs" style={{ color: THEME.muted }}>{t('biz.debtStatus')}</TableHead>
                        <TableHead className="text-xs w-28" style={{ color: THEME.muted }} />
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
                                    <p className="text-xs font-medium" style={{ color: THEME.text }}>{debt.counterpart}</p>
                                    {isInstallment && (
                                      <Badge
                                        className="text-[9px] font-bold px-1.5 py-0 h-4 leading-none"
                                        style={{ background: `${THEME.warning}20`, color: THEME.warning, borderWidth: '1px', borderColor: `${THEME.warning}30` }}
                                      >
                                        {t('biz.installmentBadge')}
                                      </Badge>
                                    )}
                                  </div>
                                  {debt.description && (
                                    <p className="text-[10px] mt-0.5 max-w-[150px] truncate" style={{ color: THEME.muted, opacity: 0.6 }}>{debt.description}</p>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="text-xs font-medium py-2" style={{ color: activeTab === 'hutang' ? THEME.destructive : THEME.secondary }}>
                                {formatAmount(debt.amount)}
                                {isInstallment && debt.downPayment && debt.downPayment > 0 && (
                                  <p className="text-[10px] mt-0.5" style={{ color: THEME.muted, opacity: 0.6 }}>
                                    DP: {formatAmount(debt.downPayment)}
                                  </p>
                                )}
                              </TableCell>
                              <TableCell className="text-xs py-2" style={{ color: THEME.text }}>
                                {debt.remaining > 0 ? (
                                  <div>
                                    {formatAmount(debt.remaining)}
                                    {isInstallment && (
                                      <div className="mt-1">
                                        {/* Visual Progress Bar */}
                                        <div className="flex items-center gap-2">
                                          <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: THEME.border }}>
                                            <div
                                              className="h-full rounded-full"
                                              style={{
                                                width: `${paidPercent}%`,
                                                background: paidPercent >= 75 ? THEME.secondary : paidPercent >= 40 ? THEME.warning : THEME.destructive,
                                                transition: 'width 0.6s ease',
                                              }}
                                            />
                                          </div>
                                          <span className="text-[10px] w-7 text-right" style={{ color: THEME.muted }}>{paidPercent}%</span>
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
                                                    ? paidPercent >= 75 ? THEME.secondary : THEME.warning
                                                    : THEME.border,
                                                }}
                                              />
                                            );
                                          })}
                                          {(debt.installmentPeriod || 0) > 8 && (
                                            <span className="text-[8px]" style={{ color: THEME.muted, opacity: 0.5 }}>...</span>
                                          )}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <span className="flex items-center gap-1" style={{ color: THEME.secondary }}>
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
                                      <span className="text-[10px] font-medium" style={{ color: THEME.warning }}>
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
                                      <CalendarDays className="h-3 w-3" style={{ color: THEME.warning }} />
                                      <span className="text-[10px]" style={{ color: THEME.warning }}>
                                        {new Date(debt.nextInstallmentDate).toLocaleDateString()}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="py-2">
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
                                          style={{ color: `${THEME.warning}99` }}
                                          onClick={() => openPaymentDialog(debt, true)}
                                          title={t('biz.payInstallment')}
                                        >
                                          <CreditCard className="h-3.5 w-3.5" />
                                        </Button>
                                      )}
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-8 w-8 p-0 hover:bg-white/5"
                                        style={{ color: THEME.muted }}
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
                                      className="h-8 w-8 p-0 hover:bg-white/5"
                                      style={{ color: THEME.muted }}
                                      onClick={() => openEditDialog(debt)}
                                    >
                                      <Pencil className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-8 w-8 p-0 hover:bg-white/5"
                                      style={{ color: THEME.muted }}
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
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent
          className="sm:max-w-[520px] max-h-[90vh] overflow-y-auto"
          style={{ background: THEME.surface, border: `1px solid ${THEME.border}`, color: THEME.text }}
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2" style={{ color: THEME.text }}>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${THEME.primary}15` }}>
                {editingDebt ? <Pencil className="h-4 w-4" style={{ color: THEME.primary }} /> : <Plus className="h-4 w-4" style={{ color: THEME.primary }} />}
              </div>
              {editingDebt ? t('common.edit') : t('biz.addDebt')}
            </DialogTitle>
            <DialogDescription style={{ color: THEME.textSecondary }}>
              {t('biz.hutangPiutang')}
            </DialogDescription>
          </DialogHeader>

          <Separator style={{ backgroundColor: THEME.border }} />

          <form onSubmit={handleSave} className="space-y-3">
            <div className="space-y-2">
              <Label className="text-xs font-medium" style={{ color: THEME.textSecondary }}>{t('biz.hutangPiutang')}</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={formData.type === 'hutang' ? 'default' : 'outline'}
                  onClick={() => setFormData({ ...formData, type: 'hutang' })}
                  className={cn(
                    'flex-1 transition-colors duration-200',
                    formData.type === 'hutang' ? 'text-white border-0' : ''
                  )}
                  style={formData.type === 'hutang' ? { background: THEME.destructive } : { color: THEME.muted, borderColor: THEME.borderHover }}
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
                  style={formData.type === 'piutang' ? { background: THEME.secondary } : { color: THEME.muted, borderColor: THEME.borderHover }}
                >
                  <ArrowUpCircle className="h-4 w-4 mr-1" />
                  {t('biz.piutang')}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-medium" style={{ color: THEME.textSecondary }}>{t('biz.debtCounterpart')} *</Label>
              <Input
                value={formData.counterpart}
                onChange={(e) => setFormData({ ...formData, counterpart: e.target.value })}
                placeholder={t('biz.debtCounterpart')}
                className="bg-white/[0.05] placeholder:text-white/30 focus:ring-1 transition-colors duration-200"
                style={{ border: `1px solid ${THEME.borderHover}`, color: THEME.text }}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-medium" style={{ color: THEME.textSecondary }}>{t('biz.debtAmount')} *</Label>
              <Input
                type="number"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                placeholder="0"
                min="0"
                className="bg-white/[0.05] placeholder:text-white/30 focus:ring-1 transition-colors duration-200"
                style={{ border: `1px solid ${THEME.borderHover}`, color: THEME.text }}
              />
            </div>

            {/* Installment Toggle */}
            {!editingDebt && (
              <div
                className="flex items-center justify-between py-2 px-3 rounded-lg"
                style={{ background: 'rgba(255,255,255,0.02)', border: `1px solid ${THEME.border}` }}
              >
                <div>
                  <Label className="text-sm" style={{ color: THEME.textSecondary }}>{t('biz.isInstallment')}</Label>
                  <p className="text-[10px]" style={{ color: THEME.muted }}>DP + cicilan bulanan</p>
                </div>
                <Switch
                  checked={formData.isInstallment}
                  onCheckedChange={(checked) => setFormData({ ...formData, isInstallment: checked })}
                />
              </div>
            )}

            {/* Installment Fields */}
            {!editingDebt && formData.isInstallment && (
              <div
                className="space-y-3 p-3 rounded-xl overflow-hidden"
                style={{ background: `${THEME.warning}08`, border: `1px solid ${THEME.warning}1F` }}
              >
                <p className="text-xs font-medium" style={{ color: THEME.warning }}>{t('biz.installmentInfo')}</p>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs" style={{ color: THEME.muted }}>{t('biz.downPayment')}</Label>
                    <Input
                      type="number"
                      value={formData.downPayment}
                      onChange={(e) => setFormData({ ...formData, downPayment: e.target.value })}
                      placeholder="0"
                      min="0"
                      className="bg-white/[0.05] placeholder:text-white/30 text-sm h-9 focus:ring-1 transition-colors duration-200"
                      style={{ border: `1px solid ${THEME.borderHover}`, color: THEME.text }}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs" style={{ color: THEME.muted }}>{t('biz.installmentAmount')} *</Label>
                    <Input
                      type="number"
                      value={formData.installmentAmount}
                      onChange={(e) => setFormData({ ...formData, installmentAmount: e.target.value })}
                      placeholder="0"
                      min="0"
                      className="bg-white/[0.05] placeholder:text-white/30 text-sm h-9 focus:ring-1 transition-colors duration-200"
                      style={{ border: `1px solid ${THEME.borderHover}`, color: THEME.text }}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs" style={{ color: THEME.muted }}>{t('biz.installmentPeriod')} *</Label>
                  <Input
                    type="number"
                    value={formData.installmentPeriod}
                    onChange={(e) => setFormData({ ...formData, installmentPeriod: e.target.value })}
                    placeholder="12"
                    min="1"
                    className="bg-white/[0.05] placeholder:text-white/30 text-sm h-9 w-1/2 focus:ring-1 transition-colors duration-200"
                    style={{ border: `1px solid ${THEME.borderHover}`, color: THEME.text }}
                  />
                </div>

                {/* Installment Preview with Visual Timeline */}
                {formData.amount && installmentPreview.numInstallment > 0 && installmentPreview.numPeriod > 0 && (
                  <div className="mt-3 space-y-3 p-3 rounded-lg" style={{ background: 'rgba(255,255,255,0.02)' }}>
                    <div className="space-y-2">
                      <div className="flex justify-between text-[11px]">
                        <span style={{ color: THEME.muted }}>{t('biz.downPayment')}</span>
                        <span className="font-medium" style={{ color: THEME.text }}>{formatAmount(parseFloat(formData.downPayment) || 0)}</span>
                      </div>
                      <div className="flex justify-between text-[11px]">
                        <span style={{ color: THEME.muted }}>{t('biz.remainingAfterDP')}</span>
                        <span className="font-medium" style={{ color: THEME.text }}>{formatAmount(installmentPreview.remainingAfterDP)}</span>
                      </div>
                      <div className="flex justify-between text-[11px]">
                        <span style={{ color: THEME.muted }}>
                          {t('biz.installmentSchedule')} ({installmentPreview.numPeriod}x)
                        </span>
                        <span className="font-medium" style={{ color: THEME.warning }}>{formatAmount(installmentPreview.totalInstallments)}</span>
                      </div>
                      <div className="pt-2 flex justify-between text-[11px]" style={{ borderTop: `1px solid ${THEME.border}` }}>
                        <span style={{ color: THEME.muted }}>Total</span>
                        <span className="font-bold" style={{ color: THEME.text }}>{formatAmount(installmentPreview.totalDPPlusInstallments)}</span>
                      </div>
                    </div>

                    {/* Visual Timeline */}
                    <div>
                      <p className="text-[10px] mb-1.5" style={{ color: THEME.muted, opacity: 0.6 }}>Timeline cicilan</p>
                      <div className="flex items-center gap-0.5">
                        <div className="w-2 h-2 rounded-full" style={{ background: THEME.warning }} />
                        <div className="flex-1 h-0.5" style={{ background: `${THEME.warning}4D` }} />
                        {Array.from({ length: Math.min(installmentPreview.numPeriod - 1, 10) }).map((_, i) => (
                          <React.Fragment key={i}>
                            <div className="w-2 h-2 rounded-full" style={{ background: 'rgba(255,255,255,0.1)' }} />
                            {i < Math.min(installmentPreview.numPeriod - 2, 9) && (
                              <div className="flex-1 h-0.5" style={{ background: THEME.border }} />
                            )}
                          </React.Fragment>
                        ))}
                        <div className="w-2 h-2 rounded-full" style={{ background: 'rgba(255,255,255,0.1)' }} />
                      </div>
                      <div className="flex justify-between mt-1 text-[8px]" style={{ color: THEME.muted, opacity: 0.5 }}>
                        <span>DP</span>
                        <span>Bulan {installmentPreview.numPeriod}</span>
                      </div>
                    </div>

                    {installmentPreview.totalDPPlusInstallments !== parseFloat(formData.amount) && (
                      <p className="text-[9px]" style={{ color: THEME.muted, opacity: 0.6 }}>
                        {installmentPreview.totalDPPlusInstallments > parseFloat(formData.amount)
                          ? `⚠️ ${formatAmount(installmentPreview.totalDPPlusInstallments - parseFloat(formData.amount))} lebih dari jumlah`
                          : `ℹ️ ${formatAmount(parseFloat(formData.amount) - installmentPreview.totalDPPlusInstallments)} kurang dari jumlah`}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label className="text-xs font-medium" style={{ color: THEME.textSecondary }}>{t('biz.debtDueDate')}</Label>
              <Input
                type="date"
                value={formData.dueDate}
                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                className="bg-white/[0.05] focus:ring-1 transition-colors duration-200"
                style={{ border: `1px solid ${THEME.borderHover}`, color: THEME.text }}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-medium" style={{ color: THEME.textSecondary }}>{t('biz.debtDescription')}</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder={t('biz.debtDescription')}
                className="bg-white/[0.05] placeholder:text-white/30 min-h-[60px] focus:ring-1 resize-none transition-colors duration-200"
                style={{ border: `1px solid ${THEME.borderHover}`, color: THEME.text }}
              />
            </div>

            <DialogFooter className="gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
                className="hover:bg-white/5"
                style={{ borderColor: THEME.borderHover, color: THEME.text }}
              >
                {t('common.cancel')}
              </Button>
              <Button
                type="submit"
                disabled={saving || !formData.counterpart || !formData.amount}
                className="text-black transition-colors duration-200"
                style={{ background: THEME.primary }}
              >
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t('common.save')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Partial Payment Dialog */}
      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent
          className="sm:max-w-[420px]"
          style={{ background: THEME.surface, border: `1px solid ${THEME.border}`, color: THEME.text }}
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2" style={{ color: THEME.text }}>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${THEME.secondary}15` }}>
                <CreditCard className="h-4 w-4" style={{ color: THEME.secondary }} />
              </div>
              {paymentDebt?.installmentAmount ? t('biz.payInstallment') : t('biz.payDebt')}
            </DialogTitle>
            <DialogDescription style={{ color: THEME.textSecondary }}>
              {paymentDebt?.counterpart}
            </DialogDescription>
          </DialogHeader>

          {/* Visual Balance Preview */}
          {paymentDebt && (
            <div className="p-3 rounded-xl space-y-3" style={{ background: 'rgba(255,255,255,0.02)', border: `1px solid ${THEME.border}` }}>
              {/* Balance Bar */}
              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span style={{ color: THEME.muted }}>Total</span>
                  <span className="font-medium" style={{ color: THEME.text }}>{formatAmount(paymentDebt.amount)}</span>
                </div>
                <div className="h-3 rounded-full overflow-hidden relative" style={{ background: THEME.border }}>
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${paymentDebt.amount > 0 ? ((paymentDebt.amount - paymentDebt.remaining) / paymentDebt.amount) * 100 : 0}%`,
                      background: THEME.secondary,
                      transition: 'width 0.6s ease',
                    }}
                  />
                  {payAmount && parseFloat(payAmount) > 0 && parseFloat(payAmount) <= paymentDebt.remaining && (
                    <div
                      className="absolute top-0 h-full rounded-full"
                      style={{
                        background: `${THEME.primary}66`,
                        left: `${paymentDebt.amount > 0 ? ((paymentDebt.amount - paymentDebt.remaining) / paymentDebt.amount) * 100 : 0}%`,
                        width: `${(parseFloat(payAmount) / paymentDebt.amount) * 100}%`,
                        transition: 'opacity 0.3s ease',
                      }}
                    />
                  )}
                </div>
                <div className="flex justify-between mt-1.5 text-[10px]">
                  <span style={{ color: THEME.secondary }}>Dibayar: {formatAmount(paymentDebt.amount - paymentDebt.remaining)}</span>
                  <span style={{ color: THEME.muted }}>Sisa: {formatAmount(paymentDebt.remaining)}</span>
                </div>
              </div>

              <Separator style={{ backgroundColor: THEME.border }} />

              {/* New Balance Preview */}
              {payAmount && parseFloat(payAmount) > 0 && parseFloat(payAmount) <= paymentDebt.remaining && (
                <div className="flex items-center justify-between">
                  <span className="text-xs" style={{ color: THEME.muted }}>Sisa setelah bayar</span>
                  <span className="text-sm font-bold" style={{ color: THEME.secondary }}>
                    {formatAmount(paymentDebt.remaining - parseFloat(payAmount))}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Installment Info */}
          {paymentDebt?.installmentAmount && paymentDebt.installmentAmount > 0 && (
            <div className="p-3 rounded-lg" style={{ background: `${THEME.warning}08`, border: `1px solid ${THEME.warning}1F` }}>
              <div className="flex justify-between text-xs">
                <span style={{ color: THEME.muted }}>{t('biz.installmentAmount')}</span>
                <span className="font-medium" style={{ color: THEME.warning }}>{formatAmount(paymentDebt.installmentAmount)}</span>
              </div>
              {paymentDebt.nextInstallmentDate && paymentDebt.remaining > 0 && (
                <div className="flex justify-between text-xs mt-1">
                  <span style={{ color: THEME.muted }}>{t('biz.nextDueDate')}</span>
                  <span style={{ color: THEME.textSecondary }}>{new Date(paymentDebt.nextInstallmentDate).toLocaleDateString()}</span>
                </div>
              )}
              {paymentDebt.installmentPeriod && (
                <div className="flex justify-between text-xs mt-1">
                  <span style={{ color: THEME.muted }}>{t('biz.installmentPeriod')}</span>
                  <span style={{ color: THEME.textSecondary }}>{paymentDebt.installmentPeriod} bulan</span>
                </div>
              )}
            </div>
          )}

          <form onSubmit={handlePay} className="space-y-3">
            <div className="space-y-2">
              <Label className="text-xs font-medium" style={{ color: THEME.textSecondary }}>{t('biz.debtAmount')} *</Label>
              <Input
                type="number"
                value={payAmount}
                onChange={(e) => setPayAmount(e.target.value)}
                placeholder="0"
                min="0"
                max={paymentDebt?.remaining || 0}
                className="bg-white/[0.05] placeholder:text-white/30 focus:ring-1 transition-colors duration-200"
                style={{ border: `1px solid ${THEME.borderHover}`, color: THEME.text }}
              />
              <div className="flex items-center justify-between">
                <p className="text-[10px]" style={{ color: THEME.muted, opacity: 0.6 }}>
                  Maks: {formatAmount(paymentDebt?.remaining || 0)}
                </p>
                {paymentDebt?.installmentAmount && paymentDebt.installmentAmount > 0 && (
                  <button
                    type="button"
                    onClick={() => setPayAmount(paymentDebt.installmentAmount!.toString())}
                    className="text-[10px] transition-colors"
                    style={{ color: THEME.warning }}
                  >
                    Gunakan jumlah cicilan
                  </button>
                )}
              </div>
            </div>

            <DialogFooter className="gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setPaymentDialogOpen(false)}
                className="hover:bg-white/5"
                style={{ borderColor: THEME.borderHover, color: THEME.text }}
              >
                {t('common.cancel')}
              </Button>
              <Button
                type="submit"
                disabled={paying || !payAmount || parseFloat(payAmount) <= 0 || parseFloat(payAmount) > (paymentDebt?.remaining || 0)}
                className="text-black transition-colors duration-200"
                style={{ background: THEME.secondary }}
              >
                {paying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {paymentDebt?.installmentAmount ? t('biz.payInstallment') : t('biz.payDebt')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent style={{ background: THEME.surface, border: `1px solid ${THEME.border}`, color: THEME.text }}>
          <AlertDialogHeader>
            <AlertDialogTitle style={{ color: THEME.text }}>{t('common.delete')}</AlertDialogTitle>
            <AlertDialogDescription style={{ color: THEME.textSecondary }}>
              {t('kas.deleteDesc')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="hover:bg-white/5" style={{ borderColor: THEME.borderHover, color: THEME.text }}>
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
    </div>
  );
}
