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
import { Progress } from '@/components/ui/progress';
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
  Clock, DollarSign,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
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

const STATUS_STYLES: Record<string, { label: string; className: string; icon?: React.ReactNode }> = {
  active: { label: 'biz.debtActive', className: 'bg-[#BB86FC]/20 text-[#BB86FC] border-[#BB86FC]/30' },
  partially_paid: { label: 'biz.debtActive', className: 'bg-[#FFD700]/20 text-[#FFD700] border-[#FFD700]/30' },
  paid: { label: 'biz.debtPaid', className: 'bg-[#03DAC6]/20 text-[#03DAC6] border-[#03DAC6]/30' },
  overdue: { label: 'biz.debtOverdue', className: 'bg-[#CF6679]/20 text-[#CF6679] border-[#CF6679]/30' },
};

function getDueDateInfo(dueDate: string | null, remaining: number): { color: string; label: string; bg: string } {
  if (!dueDate || remaining <= 0) return { color: 'text-white/50', label: '', bg: '' };
  const daysUntilDue = Math.ceil((new Date(dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (daysUntilDue < 0) return { color: 'text-[#CF6679]', label: `Lewat ${Math.abs(daysUntilDue)} hari`, bg: 'bg-[#CF6679]/10' };
  if (daysUntilDue <= 3) return { color: 'text-[#CF6679]', label: `${daysUntilDue} hari lagi`, bg: 'bg-[#CF6679]/10' };
  if (daysUntilDue <= 7) return { color: 'text-[#FFD700]', label: `${daysUntilDue} hari lagi`, bg: 'bg-[#FFD700]/10' };
  return { color: 'text-[#03DAC6]', label: 'Aman', bg: 'bg-[#03DAC6]/10' };
}

function getDueDateColor(dueDate: string | null, remaining: number): string {
  return getDueDateInfo(dueDate, remaining).color;
}

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.06 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 400, damping: 25 } },
};

const cardVariants = {
  hidden: { opacity: 0, scale: 0.92, y: 12 },
  show: { opacity: 1, scale: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } },
};

const DebtEmptyState = ({ type }: { type: string }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.9 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ duration: 0.5, ease: 'easeOut' }}
    className="flex flex-col items-center justify-center py-16 px-4"
  >
    <div className="relative mb-6">
      <div className={cn(
        'w-20 h-20 rounded-2xl flex items-center justify-center',
        type === 'hutang' ? 'bg-gradient-to-br from-[#CF6679]/20 to-[#CF6679]/5' : 'bg-gradient-to-br from-[#03DAC6]/20 to-[#03DAC6]/5'
      )}>
        {type === 'hutang' ? (
          <ArrowDownCircle className="h-10 w-10 text-[#CF6679]/60" />
        ) : (
          <ArrowUpCircle className="h-10 w-10 text-[#03DAC6]/60" />
        )}
      </div>
      <motion.div
        animate={{ y: [0, -4, 0] }}
        transition={{ repeat: Infinity, duration: 2.5, ease: 'easeInOut' }}
        className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-white/[0.06] flex items-center justify-center"
      >
        <CreditCard className="h-4 w-4 text-white/40" />
      </motion.div>
    </div>
    <p className="text-white/40 text-sm font-medium">
      {type === 'hutang' ? 'Belum ada hutang' : 'Belum ada piutang'}
    </p>
    <p className="text-white/25 text-xs mt-1">
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
    if (score >= 80) return { text: 'Sehat', color: '#03DAC6', icon: HeartPulse };
    if (score >= 50) return { text: 'Cukup', color: '#FFD700', icon: TrendingUp };
    return { text: 'Berisiko', color: '#CF6679', icon: AlertTriangle };
  };

  const accentColor = activeTab === 'hutang' ? '#CF6679' : '#03DAC6';

  if (!businessId) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-white/50 text-center">{t('biz.registerFirst')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4"
        >
          <TabsList className="bg-white/[0.03] border border-white/[0.06]">
            <TabsTrigger
              value="hutang"
              className={cn(
                'text-white/60 data-[state=active]:shadow-none transition-all duration-200',
                activeTab === 'hutang' && 'bg-[#CF6679]/20 text-[#CF6679]'
              )}
            >
              <ArrowDownCircle className="h-4 w-4 mr-1" />
              {t('biz.hutang')}
            </TabsTrigger>
            <TabsTrigger
              value="piutang"
              className={cn(
                'text-white/60 data-[state=active]:shadow-none transition-all duration-200',
                activeTab === 'piutang' && 'bg-[#03DAC6]/20 text-[#03DAC6]'
              )}
            >
              <ArrowUpCircle className="h-4 w-4 mr-1" />
              {t('biz.piutang')}
            </TabsTrigger>
          </TabsList>

          <Button onClick={openCreateDialog} size="sm" className="bg-[#BB86FC] text-black hover:bg-[#9B6FDB] transition-colors duration-200">
            <Plus className="h-4 w-4 mr-1" />
            {t('biz.addDebt')}
          </Button>
        </motion.div>

        {/* Summary Cards with Progress */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4"
        >
          <motion.div variants={cardVariants}>
            <Card className="bg-[#1A1A2E] border border-white/[0.06] rounded-xl p-4 hover:border-white/[0.12] transition-all duration-300">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${accentColor}15` }}>
                  <DollarSign className="h-4 w-4" style={{ color: accentColor }} />
                </div>
                <span className="text-xs text-white/50">{t('biz.debtAmount')}</span>
              </div>
              <p className="text-lg font-bold text-white">{formatAmount(totalAmount)}</p>
              <div className="mt-2 h-1 rounded-full bg-white/[0.06] overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: '100%' }}
                  transition={{ duration: 0.8, delay: 0.3 }}
                  className="h-full rounded-full"
                  style={{ background: accentColor, opacity: 0.3 }}
                />
              </div>
            </Card>
          </motion.div>

          <motion.div variants={cardVariants}>
            <Card className="bg-[#1A1A2E] border border-white/[0.06] rounded-xl p-4 hover:border-white/[0.12] transition-all duration-300">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg bg-[#FFD700]/15 flex items-center justify-center">
                  <Clock className="h-4 w-4 text-[#FFD700]" />
                </div>
                <span className="text-xs text-white/50">{t('biz.debtRemaining')}</span>
              </div>
              <p className="text-lg font-bold text-white">{formatAmount(totalRemaining)}</p>
              <div className="mt-2 h-1 rounded-full bg-white/[0.06] overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: totalAmount > 0 ? `${(totalRemaining / totalAmount) * 100}%` : '0%' }}
                  transition={{ duration: 0.8, delay: 0.4 }}
                  className="h-full rounded-full bg-[#FFD700]"
                />
              </div>
            </Card>
          </motion.div>

          <motion.div variants={cardVariants}>
            <Card className="bg-[#1A1A2E] border border-white/[0.06] rounded-xl p-4 hover:border-[#03DAC6]/30 transition-all duration-300">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg bg-[#03DAC6]/15 flex items-center justify-center">
                  <CheckCircle2 className="h-4 w-4 text-[#03DAC6]" />
                </div>
                <span className="text-xs text-white/50">Dibayar</span>
              </div>
              <p className="text-lg font-bold text-[#03DAC6]">{formatAmount(totalPaid)}</p>
              <div className="mt-2 h-1 rounded-full bg-white/[0.06] overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: totalAmount > 0 ? `${(totalPaid / totalAmount) * 100}%` : '0%' }}
                  transition={{ duration: 0.8, delay: 0.5 }}
                  className="h-full rounded-full bg-[#03DAC6]"
                />
              </div>
            </Card>
          </motion.div>

          {/* Health Score Card */}
          <motion.div variants={cardVariants}>
            <Card className="bg-[#1A1A2E] border border-white/[0.06] rounded-xl p-4 hover:border-white/[0.12] transition-all duration-300">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${getHealthLabel(healthData.score).color}15` }}>
                  {(() => {
                    const HIcon = getHealthLabel(healthData.score).icon;
                    return <HIcon className="h-4 w-4" style={{ color: getHealthLabel(healthData.score).color }} />;
                  })()}
                </div>
                <span className="text-xs text-white/50">Skor Kesehatan</span>
              </div>
              <div className="flex items-end gap-2">
                <motion.p
                  className="text-2xl font-bold"
                  style={{ color: getHealthLabel(healthData.score).color }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.6 }}
                >
                  {healthData.score}
                </motion.p>
                <span className="text-xs text-white/40 mb-1">/100</span>
              </div>
              <div className="flex items-center gap-1 mt-2">
                <div className="flex-1 h-2 rounded-full bg-white/[0.06] overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${healthData.score}%` }}
                    transition={{ duration: 1, delay: 0.6 }}
                    className="h-full rounded-full"
                    style={{ background: getHealthLabel(healthData.score).color }}
                  />
                </div>
                <span className="text-[10px] font-medium" style={{ color: getHealthLabel(healthData.score).color }}>
                  {getHealthLabel(healthData.score).text}
                </span>
              </div>
              {healthData.total > 0 && (
                <div className="flex items-center gap-2 mt-2 text-[10px] text-white/30">
                  <span className="flex items-center gap-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#03DAC6]" />
                    {healthData.paidCount} lunas
                  </span>
                  <span className="flex items-center gap-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#BB86FC]" />
                    {healthData.activeCount} aktif
                  </span>
                  <span className="flex items-center gap-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#CF6679]" />
                    {healthData.overdueCount} lewat
                  </span>
                </div>
              )}
            </Card>
          </motion.div>
        </motion.div>

        <TabsContent value={activeTab} className="mt-0">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.4 }}
          >
            <Card className="bg-[#1A1A2E] border border-white/[0.06] rounded-2xl overflow-hidden">
              <CardContent className="p-0">
                {loading ? (
                  <div className="space-y-3 p-4">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Skeleton key={i} className="h-12 rounded-lg bg-white/[0.06]" />
                    ))}
                  </div>
                ) : filtered.length === 0 ? (
                  <DebtEmptyState type={activeTab} />
                ) : (
                  <div className="max-h-[500px] overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-white/[0.06] hover:bg-transparent">
                          <TableHead className="text-white/50 text-xs">{t('biz.debtCounterpart')}</TableHead>
                          <TableHead className="text-white/50 text-xs">{t('biz.debtAmount')}</TableHead>
                          <TableHead className="text-white/50 text-xs">{t('biz.debtRemaining')}</TableHead>
                          <TableHead className="text-white/50 text-xs hidden sm:table-cell">{t('biz.debtDueDate')}</TableHead>
                          <TableHead className="text-white/50 text-xs">{t('biz.debtStatus')}</TableHead>
                          <TableHead className="text-white/50 text-xs w-28" />
                        </TableRow>
                      </TableHeader>
                      <TableBody asChild>
                        <motion.tbody variants={containerVariants} initial="hidden" animate="show">
                          {filtered.map((debt, index) => {
                            const statusStyle = STATUS_STYLES[debt.status] || STATUS_STYLES.active;
                            const isInstallment = !!debt.installmentAmount && debt.installmentAmount > 0;
                            const paidPercent = debt.amount > 0 ? Math.round(((debt.amount - debt.remaining) / debt.amount) * 100) : 0;
                            const dueDateInfo = getDueDateInfo(debt.dueDate, debt.remaining);
                            const isAlt = index % 2 === 1;

                            return (
                              <motion.tr
                                key={debt.id}
                                variants={itemVariants}
                                className={cn(
                                  'border-white/[0.04] hover:bg-white/[0.04] transition-colors duration-200 cursor-default',
                                  isAlt && 'bg-white/[0.015]'
                                )}
                              >
                                <TableCell className="py-3">
                                  <div>
                                    <div className="flex items-center gap-1.5">
                                      <p className="text-white text-xs font-medium">{debt.counterpart}</p>
                                      {isInstallment && (
                                        <Badge className="text-[9px] font-bold px-1.5 py-0 h-4 bg-[#FFD700]/20 text-[#FFD700] border-[#FFD700]/30 leading-none">
                                          {t('biz.installmentBadge')}
                                        </Badge>
                                      )}
                                    </div>
                                    {debt.description && (
                                      <p className="text-white/30 text-[10px] mt-0.5 max-w-[150px] truncate">{debt.description}</p>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell className={cn('text-xs font-medium py-3', activeTab === 'hutang' ? 'text-[#CF6679]' : 'text-[#03DAC6]')}>
                                  {formatAmount(debt.amount)}
                                  {isInstallment && debt.downPayment && debt.downPayment > 0 && (
                                    <p className="text-[10px] text-white/40 mt-0.5">
                                      DP: {formatAmount(debt.downPayment)}
                                    </p>
                                  )}
                                </TableCell>
                                <TableCell className="text-white text-xs py-3">
                                  {debt.remaining > 0 ? (
                                    <div>
                                      {formatAmount(debt.remaining)}
                                      {isInstallment && (
                                        <div className="mt-1.5">
                                          {/* Visual Progress Bar */}
                                          <div className="flex items-center gap-2">
                                            <div className="flex-1 h-2 rounded-full bg-white/[0.06] overflow-hidden">
                                              <motion.div
                                                initial={{ width: 0 }}
                                                animate={{ width: `${paidPercent}%` }}
                                                transition={{ duration: 0.6, delay: index * 0.05 }}
                                                className={cn(
                                                  'h-full rounded-full',
                                                  paidPercent >= 75 ? 'bg-[#03DAC6]' : paidPercent >= 40 ? 'bg-[#FFD700]' : 'bg-[#CF6679]'
                                                )}
                                              />
                                            </div>
                                            <span className="text-[10px] text-white/40 w-7 text-right">{paidPercent}%</span>
                                          </div>
                                          {/* Timeline dots */}
                                          <div className="flex items-center gap-1 mt-1">
                                            {Array.from({ length: Math.min(debt.installmentPeriod || 1, 8) }).map((_, i) => {
                                              const filled = i < Math.round((paidPercent / 100) * (debt.installmentPeriod || 1));
                                              return (
                                                <motion.div
                                                  key={i}
                                                  initial={{ scale: 0 }}
                                                  animate={{ scale: 1 }}
                                                  transition={{ delay: 0.3 + i * 0.05 }}
                                                  className={cn(
                                                    'flex-1 h-1 rounded-full',
                                                    filled
                                                      ? paidPercent >= 75 ? 'bg-[#03DAC6]' : 'bg-[#FFD700]'
                                                      : 'bg-white/[0.08]'
                                                  )}
                                                />
                                              );
                                            })}
                                            {(debt.installmentPeriod || 0) > 8 && (
                                              <span className="text-[8px] text-white/30">...</span>
                                            )}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  ) : (
                                    <span className="text-[#03DAC6] flex items-center gap-1">
                                      <CheckCircle2 className="h-3 w-3" />
                                      {t('biz.debtPaid')}
                                    </span>
                                  )}
                                </TableCell>
                                <TableCell className="text-xs py-3 hidden sm:table-cell">
                                  <div>
                                    <span className={dueDateInfo.color}>
                                      {debt.dueDate ? new Date(debt.dueDate).toLocaleDateString() : '-'}
                                    </span>
                                    {/* Due date indicator badge */}
                                    {debt.remaining > 0 && dueDateInfo.label && (
                                      <motion.div
                                        initial={{ opacity: 0, x: -4 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: 0.2 }}
                                        className={cn(
                                          'mt-1 inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-medium',
                                          dueDateInfo.bg
                                        )}
                                      >
                                        {debt.status === 'overdue' || dueDateInfo.label.includes('Lewat') ? (
                                          <AlertTriangle className="h-2.5 w-2.5" style={{ color: dueDateInfo.color }} />
                                        ) : (
                                          <Clock className="h-2.5 w-2.5" style={{ color: dueDateInfo.color }} />
                                        )}
                                        <span style={{ color: dueDateInfo.color }}>{dueDateInfo.label}</span>
                                      </motion.div>
                                    )}
                                    {isInstallment && debt.nextInstallmentDate && debt.remaining > 0 && (
                                      <div className="flex items-center gap-1 mt-1">
                                        <CalendarDays className="h-3 w-3 text-[#FFD700]" />
                                        <span className="text-[#FFD700] text-[10px]">
                                          {new Date(debt.nextInstallmentDate).toLocaleDateString()}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell className="py-3">
                                  <Badge variant="outline" className={cn('text-xs font-normal', statusStyle.className)}>
                                    {t(statusStyle.label)}
                                  </Badge>
                                </TableCell>
                                <TableCell className="py-3 text-right">
                                  {debt.remaining > 0 && (
                                    <>
                                      {isInstallment && (
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-8 w-8 p-0 text-[#FFD700]/60 hover:text-[#FFD700] hover:bg-[#FFD700]/10 transition-colors duration-200"
                                          onClick={() => openPaymentDialog(debt, true)}
                                          title={t('biz.payInstallment')}
                                        >
                                          <CreditCard className="h-3.5 w-3.5" />
                                        </Button>
                                      )}
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-8 w-8 p-0 text-white/40 hover:text-[#03DAC6] hover:bg-[#03DAC6]/10 transition-colors duration-200"
                                        onClick={() => openPaymentDialog(debt)}
                                        title={t('biz.payDebt')}
                                      >
                                        <CreditCard className="h-3.5 w-3.5" />
                                      </Button>
                                    </>
                                  )}
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0 text-white/40 hover:text-white hover:bg-white/10 transition-colors duration-200"
                                    onClick={() => openEditDialog(debt)}
                                  >
                                    <Pencil className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0 text-white/40 hover:text-red-400 hover:bg-red-400/10 transition-colors duration-200"
                                    onClick={() => setDeleteId(debt.id)}
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </TableCell>
                              </motion.tr>
                            );
                          })}
                        </motion.tbody>
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>
      </Tabs>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-[#1A1A2E] border border-white/[0.06] text-white sm:max-w-[520px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[#BB86FC]/15 flex items-center justify-center">
                {editingDebt ? <Pencil className="h-4 w-4 text-[#BB86FC]" /> : <Plus className="h-4 w-4 text-[#BB86FC]" />}
              </div>
              {editingDebt ? t('common.edit') : t('biz.addDebt')}
            </DialogTitle>
            <DialogDescription className="text-white/60">
              {t('biz.hutangPiutang')}
            </DialogDescription>
          </DialogHeader>

          <Separator className="bg-white/[0.06]" />

          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-white/80 text-xs font-medium">{t('biz.hutangPiutang')}</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={formData.type === 'hutang' ? 'default' : 'outline'}
                  onClick={() => setFormData({ ...formData, type: 'hutang' })}
                  className={cn(
                    'flex-1 border-0 transition-all duration-200',
                    formData.type === 'hutang' ? 'bg-[#CF6679] text-white' : 'border-white/[0.1] text-white/60 hover:bg-white/10'
                  )}
                >
                  <ArrowDownCircle className="h-4 w-4 mr-1" />
                  {t('biz.hutang')}
                </Button>
                <Button
                  type="button"
                  variant={formData.type === 'piutang' ? 'default' : 'outline'}
                  onClick={() => setFormData({ ...formData, type: 'piutang' })}
                  className={cn(
                    'flex-1 border-0 transition-all duration-200',
                    formData.type === 'piutang' ? 'bg-[#03DAC6] text-black' : 'border-white/[0.1] text-white/60 hover:bg-white/10'
                  )}
                >
                  <ArrowUpCircle className="h-4 w-4 mr-1" />
                  {t('biz.piutang')}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-white/80 text-xs font-medium">{t('biz.debtCounterpart')} *</Label>
              <Input
                value={formData.counterpart}
                onChange={(e) => setFormData({ ...formData, counterpart: e.target.value })}
                placeholder={t('biz.debtCounterpart')}
                className="bg-white/[0.05] border-white/[0.1] text-white placeholder:text-white/30 focus:border-[#BB86FC]/40 focus:ring-1 focus:ring-[#BB86FC]/20 transition-all duration-200"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-white/80 text-xs font-medium">{t('biz.debtAmount')} *</Label>
              <Input
                type="number"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                placeholder="0"
                min="0"
                className="bg-white/[0.05] border-white/[0.1] text-white placeholder:text-white/30 focus:border-[#BB86FC]/40 focus:ring-1 focus:ring-[#BB86FC]/20 transition-all duration-200"
              />
            </div>

            {/* Installment Toggle */}
            {!editingDebt && (
              <div className="flex items-center justify-between py-2.5 px-3 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                <div>
                  <Label className="text-white/80 text-sm">{t('biz.isInstallment')}</Label>
                  <p className="text-[10px] text-white/40">DP + cicilan bulanan</p>
                </div>
                <Switch
                  checked={formData.isInstallment}
                  onCheckedChange={(checked) => setFormData({ ...formData, isInstallment: checked })}
                  className="data-[state=checked]:bg-[#FFD700]"
                />
              </div>
            )}

            {/* Installment Fields */}
            {!editingDebt && formData.isInstallment && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
                className="space-y-3 p-3 rounded-xl bg-[#FFD700]/[0.04] border border-[#FFD700]/[0.12] overflow-hidden"
              >
                <p className="text-xs font-medium text-[#FFD700]">{t('biz.installmentInfo')}</p>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-white/60 text-xs">{t('biz.downPayment')}</Label>
                    <Input
                      type="number"
                      value={formData.downPayment}
                      onChange={(e) => setFormData({ ...formData, downPayment: e.target.value })}
                      placeholder="0"
                      min="0"
                      className="bg-white/[0.05] border-white/[0.1] text-white placeholder:text-white/30 text-sm h-9 focus:border-[#FFD700]/40 focus:ring-1 focus:ring-[#FFD700]/20 transition-all duration-200"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-white/60 text-xs">{t('biz.installmentAmount')} *</Label>
                    <Input
                      type="number"
                      value={formData.installmentAmount}
                      onChange={(e) => setFormData({ ...formData, installmentAmount: e.target.value })}
                      placeholder="0"
                      min="0"
                      className="bg-white/[0.05] border-white/[0.1] text-white placeholder:text-white/30 text-sm h-9 focus:border-[#FFD700]/40 focus:ring-1 focus:ring-[#FFD700]/20 transition-all duration-200"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-white/60 text-xs">{t('biz.installmentPeriod')} *</Label>
                  <Input
                    type="number"
                    value={formData.installmentPeriod}
                    onChange={(e) => setFormData({ ...formData, installmentPeriod: e.target.value })}
                    placeholder="12"
                    min="1"
                    className="bg-white/[0.05] border-white/[0.1] text-white placeholder:text-white/30 text-sm h-9 w-1/2 focus:border-[#FFD700]/40 focus:ring-1 focus:ring-[#FFD700]/20 transition-all duration-200"
                  />
                </div>

                {/* Installment Preview with Visual Timeline */}
                {formData.amount && installmentPreview.numInstallment > 0 && installmentPreview.numPeriod > 0 && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.3 }}
                    className="mt-3 space-y-3 p-3 rounded-lg bg-white/[0.03]"
                  >
                    <div className="space-y-2">
                      <div className="flex justify-between text-[11px]">
                        <span className="text-white/50">{t('biz.downPayment')}</span>
                        <span className="text-white font-medium">{formatAmount(parseFloat(formData.downPayment) || 0)}</span>
                      </div>
                      <div className="flex justify-between text-[11px]">
                        <span className="text-white/50">{t('biz.remainingAfterDP')}</span>
                        <span className="text-white font-medium">{formatAmount(installmentPreview.remainingAfterDP)}</span>
                      </div>
                      <div className="flex justify-between text-[11px]">
                        <span className="text-white/50">
                          {t('biz.installmentSchedule')} ({installmentPreview.numPeriod}x)
                        </span>
                        <span className="text-[#FFD700] font-medium">{formatAmount(installmentPreview.totalInstallments)}</span>
                      </div>
                      <div className="border-t border-white/[0.06] pt-2 flex justify-between text-[11px]">
                        <span className="text-white/50">Total</span>
                        <span className="text-white font-bold">{formatAmount(installmentPreview.totalDPPlusInstallments)}</span>
                      </div>
                    </div>

                    {/* Visual Timeline */}
                    <div>
                      <p className="text-[10px] text-white/40 mb-1.5">Timeline cicilan</p>
                      <div className="flex items-center gap-0.5">
                        <div className="w-2 h-2 rounded-full bg-[#FFD700]" />
                        <div className="flex-1 h-0.5 bg-[#FFD700]/30" />
                        {Array.from({ length: Math.min(installmentPreview.numPeriod - 1, 10) }).map((_, i) => (
                          <React.Fragment key={i}>
                            <div className="w-2 h-2 rounded-full bg-white/[0.1]" />
                            {i < Math.min(installmentPreview.numPeriod - 2, 9) && (
                              <div className="flex-1 h-0.5 bg-white/[0.06]" />
                            )}
                          </React.Fragment>
                        ))}
                        <div className="w-2 h-2 rounded-full bg-white/[0.1]" />
                      </div>
                      <div className="flex justify-between mt-1 text-[8px] text-white/30">
                        <span>DP</span>
                        <span>Bulan {installmentPreview.numPeriod}</span>
                      </div>
                    </div>

                    {installmentPreview.totalDPPlusInstallments !== parseFloat(formData.amount) && (
                      <p className="text-[9px] text-white/30">
                        {installmentPreview.totalDPPlusInstallments > parseFloat(formData.amount)
                          ? `⚠️ ${formatAmount(installmentPreview.totalDPPlusInstallments - parseFloat(formData.amount))} lebih dari jumlah`
                          : `ℹ️ ${formatAmount(parseFloat(formData.amount) - installmentPreview.totalDPPlusInstallments)} kurang dari jumlah`}
                      </p>
                    )}
                  </motion.div>
                )}
              </motion.div>
            )}

            <div className="space-y-2">
              <Label className="text-white/80 text-xs font-medium">{t('biz.debtDueDate')}</Label>
              <Input
                type="date"
                value={formData.dueDate}
                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                className="bg-white/[0.05] border-white/[0.1] text-white focus:border-[#BB86FC]/40 focus:ring-1 focus:ring-[#BB86FC]/20 transition-all duration-200"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-white/80 text-xs font-medium">{t('biz.debtDescription')}</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder={t('biz.debtDescription')}
                className="bg-white/[0.05] border-white/[0.1] text-white placeholder:text-white/30 min-h-[60px] focus:border-[#BB86FC]/40 focus:ring-1 focus:ring-[#BB86FC]/20 transition-all duration-200 resize-none"
              />
            </div>

            <DialogFooter className="gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
                className="border-white/[0.1] text-white hover:bg-white/10"
              >
                {t('common.cancel')}
              </Button>
              <Button
                type="submit"
                disabled={saving || !formData.counterpart || !formData.amount}
                className="bg-[#BB86FC] text-black hover:bg-[#9B6FDB] transition-colors duration-200"
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
        <DialogContent className="bg-[#1A1A2E] border border-white/[0.06] text-white sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[#03DAC6]/15 flex items-center justify-center">
                <CreditCard className="h-4 w-4 text-[#03DAC6]" />
              </div>
              {paymentDebt?.installmentAmount ? t('biz.payInstallment') : t('biz.payDebt')}
            </DialogTitle>
            <DialogDescription className="text-white/60">
              {paymentDebt?.counterpart}
            </DialogDescription>
          </DialogHeader>

          {/* Visual Balance Preview */}
          {paymentDebt && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06] space-y-3"
            >
              {/* Balance Bar */}
              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-white/50">Total</span>
                  <span className="text-white font-medium">{formatAmount(paymentDebt.amount)}</span>
                </div>
                <div className="h-3 rounded-full bg-white/[0.06] overflow-hidden relative">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{
                      width: `${paymentDebt.amount > 0 ? ((paymentDebt.amount - paymentDebt.remaining) / paymentDebt.amount) * 100 : 0}%`
                    }}
                    transition={{ duration: 0.6 }}
                    className="h-full rounded-full bg-[#03DAC6]"
                  />
                  {payAmount && parseFloat(payAmount) > 0 && parseFloat(payAmount) <= paymentDebt.remaining && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="absolute top-0 h-full bg-[#BB86FC]/40 rounded-full"
                      style={{
                        left: `${paymentDebt.amount > 0 ? ((paymentDebt.amount - paymentDebt.remaining) / paymentDebt.amount) * 100 : 0}%`,
                        width: `${(parseFloat(payAmount) / paymentDebt.amount) * 100}%`,
                      }}
                    />
                  )}
                </div>
                <div className="flex justify-between mt-1.5 text-[10px]">
                  <span className="text-[#03DAC6]">Dibayar: {formatAmount(paymentDebt.amount - paymentDebt.remaining)}</span>
                  <span className="text-white/50">Sisa: {formatAmount(paymentDebt.remaining)}</span>
                </div>
              </div>

              <Separator className="bg-white/[0.06]" />

              {/* New Balance Preview */}
              {payAmount && parseFloat(payAmount) > 0 && parseFloat(payAmount) <= paymentDebt.remaining && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex items-center justify-between"
                >
                  <span className="text-xs text-white/50">Sisa setelah bayar</span>
                  <span className="text-sm font-bold text-[#03DAC6]">
                    {formatAmount(paymentDebt.remaining - parseFloat(payAmount))}
                  </span>
                </motion.div>
              )}
            </motion.div>
          )}

          {/* Installment Info */}
          {paymentDebt?.installmentAmount && paymentDebt.installmentAmount > 0 && (
            <div className="p-3 rounded-lg bg-[#FFD700]/[0.04] border border-[#FFD700]/[0.12]">
              <div className="flex justify-between text-xs">
                <span className="text-white/50">{t('biz.installmentAmount')}</span>
                <span className="text-[#FFD700] font-medium">{formatAmount(paymentDebt.installmentAmount)}</span>
              </div>
              {paymentDebt.nextInstallmentDate && paymentDebt.remaining > 0 && (
                <div className="flex justify-between text-xs mt-1">
                  <span className="text-white/50">{t('biz.nextDueDate')}</span>
                  <span className="text-white/80">{new Date(paymentDebt.nextInstallmentDate).toLocaleDateString()}</span>
                </div>
              )}
              {paymentDebt.installmentPeriod && (
                <div className="flex justify-between text-xs mt-1">
                  <span className="text-white/50">{t('biz.installmentPeriod')}</span>
                  <span className="text-white/80">{paymentDebt.installmentPeriod} bulan</span>
                </div>
              )}
            </div>
          )}

          <form onSubmit={handlePay} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-white/80 text-xs font-medium">{t('biz.debtAmount')} *</Label>
              <Input
                type="number"
                value={payAmount}
                onChange={(e) => setPayAmount(e.target.value)}
                placeholder="0"
                min="0"
                max={paymentDebt?.remaining || 0}
                className="bg-white/[0.05] border-white/[0.1] text-white placeholder:text-white/30 focus:border-[#03DAC6]/40 focus:ring-1 focus:ring-[#03DAC6]/20 transition-all duration-200"
              />
              <div className="flex items-center justify-between">
                <p className="text-[10px] text-white/30">
                  Maks: {formatAmount(paymentDebt?.remaining || 0)}
                </p>
                {paymentDebt?.installmentAmount && paymentDebt.installmentAmount > 0 && (
                  <button
                    type="button"
                    onClick={() => setPayAmount(paymentDebt.installmentAmount!.toString())}
                    className="text-[10px] text-[#FFD700] hover:text-[#FFD700]/80 transition-colors"
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
                className="border-white/[0.1] text-white hover:bg-white/10"
              >
                {t('common.cancel')}
              </Button>
              <Button
                type="submit"
                disabled={paying || !payAmount || parseFloat(payAmount) <= 0 || parseFloat(payAmount) > (paymentDebt?.remaining || 0)}
                className="bg-[#03DAC6] text-black hover:bg-[#02B8A8] transition-colors duration-200"
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
        <AlertDialogContent className="bg-[#1A1A2E] border border-white/[0.06] text-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">{t('common.delete')}</AlertDialogTitle>
            <AlertDialogDescription className="text-white/60">
              {t('kas.deleteDesc')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-white/[0.1] text-white hover:bg-white/10">
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
