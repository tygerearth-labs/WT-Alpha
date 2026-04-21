'use client';

import { useEffect, useState, useCallback } from 'react';
import { useBusinessStore } from '@/store/useBusinessStore';
import { useTranslation } from '@/hooks/useTranslation';
import { useCurrencyFormat } from '@/hooks/useCurrencyFormat';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import { Plus, Pencil, Trash2, ArrowDownCircle, ArrowUpCircle, CreditCard } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
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
}

const STATUS_STYLES: Record<string, { label: string; className: string }> = {
  active: { label: 'biz.debtActive', className: 'bg-[#BB86FC]/20 text-[#BB86FC]' },
  partially_paid: { label: 'biz.debtActive', className: 'bg-[#FFD700]/20 text-[#FFD700]' },
  paid: { label: 'biz.debtPaid', className: 'bg-[#03DAC6]/20 text-[#03DAC6]' },
  overdue: { label: 'biz.debtOverdue', className: 'bg-[#CF6679]/20 text-[#CF6679]' },
};

function getDueDateColor(dueDate: string | null, remaining: number): string {
  if (!dueDate || remaining <= 0) return 'text-white/50';
  const daysUntilDue = Math.ceil((new Date(dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (daysUntilDue < 0) return 'text-[#CF6679]';
  if (daysUntilDue <= 7) return 'text-[#FFD700]';
  return 'text-white/50';
}

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
  });
  const [saving, setSaving] = useState(false);

  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [paymentDebt, setPaymentDebt] = useState<Debt | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [paying, setPaying] = useState(false);

  const [deleteId, setDeleteId] = useState<string | null>(null);

  const businessId = activeBusiness?.id;

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
    });
    setDialogOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessId || !formData.counterpart || !formData.amount) return;
    setSaving(true);
    try {
      const url = editingDebt
        ? `/api/business/${businessId}/debts/${editingDebt.id}`
        : `/api/business/${businessId}/debts`;
      const res = await fetch(url, {
        method: editingDebt ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: formData.type,
          counterpart: formData.counterpart.trim(),
          amount: parseFloat(formData.amount),
          dueDate: formData.dueDate || undefined,
          description: formData.description || undefined,
        }),
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

  const openPaymentDialog = (debt: Debt) => {
    setPaymentDebt(debt);
    setPayAmount('');
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
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <TabsList className="bg-white/[0.03] border border-white/[0.06]">
            <TabsTrigger
              value="hutang"
              className={cn(
                'text-white/60 data-[state=active]:shadow-none',
                activeTab === 'hutang' && 'bg-[#CF6679]/20 text-[#CF6679]'
              )}
            >
              <ArrowDownCircle className="h-4 w-4 mr-1" />
              {t('biz.hutang')}
            </TabsTrigger>
            <TabsTrigger
              value="piutang"
              className={cn(
                'text-white/60 data-[state=active]:shadow-none',
                activeTab === 'piutang' && 'bg-[#03DAC6]/20 text-[#03DAC6]'
              )}
            >
              <ArrowUpCircle className="h-4 w-4 mr-1" />
              {t('biz.piutang')}
            </TabsTrigger>
          </TabsList>

          <Button onClick={openCreateDialog} size="sm" className="bg-[#BB86FC] text-black hover:bg-[#9B6FDB]">
            <Plus className="h-4 w-4 mr-1" />
            {t('biz.addDebt')}
          </Button>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <Card className="bg-[#1A1A2E] border border-white/[0.06] rounded-xl p-3">
            <p className="text-xs text-white/50">{t('biz.debtAmount')}</p>
            <p className={cn('text-sm font-bold', activeTab === 'hutang' ? 'text-[#CF6679]' : 'text-[#03DAC6]')}>
              {formatAmount(totalAmount)}
            </p>
          </Card>
          <Card className="bg-[#1A1A2E] border border-white/[0.06] rounded-xl p-3">
            <p className="text-xs text-white/50">{t('biz.debtRemaining')}</p>
            <p className={cn('text-sm font-bold', activeTab === 'hutang' ? 'text-[#CF6679]' : 'text-[#03DAC6]')}>
              {formatAmount(totalRemaining)}
            </p>
          </Card>
        </div>

        <TabsContent value={activeTab} className="mt-0">
          <Card className="bg-[#1A1A2E] border border-white/[0.06] rounded-2xl">
            <CardContent className="p-0">
              {loading ? (
                <div className="space-y-3 p-4">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 rounded-lg bg-white/[0.06]" />
                  ))}
                </div>
              ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-white/40">
                  <CreditCard className="h-10 w-10 mb-2 opacity-40" />
                  <p className="text-sm">{t('biz.noBizData')}</p>
                </div>
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
                    <TableBody>
                      {filtered.map((debt) => {
                        const statusStyle = STATUS_STYLES[debt.status] || STATUS_STYLES.active;
                        return (
                          <TableRow key={debt.id} className="border-white/[0.04] hover:bg-white/[0.02]">
                            <TableCell className="py-3">
                              <div>
                                <p className="text-white text-xs font-medium">{debt.counterpart}</p>
                                {debt.description && (
                                  <p className="text-white/30 text-[10px] mt-0.5 max-w-[150px] truncate">{debt.description}</p>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className={cn('text-xs font-medium py-3', activeTab === 'hutang' ? 'text-[#CF6679]' : 'text-[#03DAC6]')}>
                              {formatAmount(debt.amount)}
                            </TableCell>
                            <TableCell className="text-white text-xs py-3">
                              {debt.remaining > 0 ? formatAmount(debt.remaining) : (
                                <span className="text-[#03DAC6]">{t('biz.debtPaid')}</span>
                              )}
                            </TableCell>
                            <TableCell className="text-xs py-3 hidden sm:table-cell">
                              <span className={getDueDateColor(debt.dueDate, debt.remaining)}>
                                {debt.dueDate ? new Date(debt.dueDate).toLocaleDateString() : '-'}
                              </span>
                            </TableCell>
                            <TableCell className="py-3">
                              <Badge variant="outline" className={cn('text-xs font-normal border-0', statusStyle.className)}>
                                {t(statusStyle.label)}
                              </Badge>
                            </TableCell>
                            <TableCell className="py-3 text-right">
                              {debt.remaining > 0 && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0 text-white/40 hover:text-[#03DAC6] hover:bg-white/10"
                                  onClick={() => openPaymentDialog(debt)}
                                  title={t('biz.payDebt')}
                                >
                                  <CreditCard className="h-3.5 w-3.5" />
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-white/40 hover:text-white hover:bg-white/10"
                                onClick={() => openEditDialog(debt)}
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-white/40 hover:text-red-400 hover:bg-white/10"
                                onClick={() => setDeleteId(debt.id)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
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
        <DialogContent className="bg-[#1A1A2E] border border-white/[0.06] text-white sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle className="text-white">
              {editingDebt ? t('common.edit') : t('biz.addDebt')}
            </DialogTitle>
            <DialogDescription className="text-white/60">
              {t('biz.hutangPiutang')}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-white/80">{t('biz.hutangPiutang')}</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={formData.type === 'hutang' ? 'default' : 'outline'}
                  onClick={() => setFormData({ ...formData, type: 'hutang' })}
                  className={cn(
                    'flex-1 border-0',
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
                    'flex-1 border-0',
                    formData.type === 'piutang' ? 'bg-[#03DAC6] text-black' : 'border-white/[0.1] text-white/60 hover:bg-white/10'
                  )}
                >
                  <ArrowUpCircle className="h-4 w-4 mr-1" />
                  {t('biz.piutang')}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-white/80">{t('biz.debtCounterpart')} *</Label>
              <Input
                value={formData.counterpart}
                onChange={(e) => setFormData({ ...formData, counterpart: e.target.value })}
                placeholder={t('biz.debtCounterpart')}
                className="bg-white/[0.05] border-white/[0.1] text-white placeholder:text-white/30"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-white/80">{t('biz.debtAmount')} *</Label>
              <Input
                type="number"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                placeholder="0"
                min="0"
                className="bg-white/[0.05] border-white/[0.1] text-white placeholder:text-white/30"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-white/80">{t('biz.debtDueDate')}</Label>
              <Input
                type="date"
                value={formData.dueDate}
                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                className="bg-white/[0.05] border-white/[0.1] text-white"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-white/80">{t('biz.debtDescription')}</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder={t('biz.debtDescription')}
                className="bg-white/[0.05] border-white/[0.1] text-white placeholder:text-white/30 min-h-[60px]"
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
                className="bg-[#BB86FC] text-black hover:bg-[#9B6FDB]"
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
        <DialogContent className="bg-[#1A1A2E] border border-white/[0.06] text-white sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="text-white">{t('biz.payDebt')}</DialogTitle>
            <DialogDescription className="text-white/60">
              {paymentDebt?.counterpart} — Sisa: {formatAmount(paymentDebt?.remaining || 0)}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handlePay} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-white/80">{t('biz.debtAmount')} *</Label>
              <Input
                type="number"
                value={payAmount}
                onChange={(e) => setPayAmount(e.target.value)}
                placeholder="0"
                min="0"
                max={paymentDebt?.remaining || 0}
                className="bg-white/[0.05] border-white/[0.1] text-white placeholder:text-white/30"
              />
              <p className="text-[10px] text-white/30">
                Maks: {formatAmount(paymentDebt?.remaining || 0)}
              </p>
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
                className="bg-[#03DAC6] text-black hover:bg-[#02B8A8]"
              >
                {paying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t('biz.payDebt')}
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
