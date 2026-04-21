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
import { Plus, Pencil, Trash2, TrendingUp, ShoppingBag } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

interface Customer {
  id: string;
  name: string;
}

interface Sale {
  id: string;
  description: string;
  amount: number;
  date: string;
  paymentMethod: string | null;
  notes?: string;
  customer?: Customer | null;
  customerId?: string | null;
  invoiceId?: string | null;
}

const PAYMENT_METHODS = [
  { value: 'cash', labelKey: 'biz.paymentCash' },
  { value: 'transfer', labelKey: 'biz.paymentTransfer' },
  { value: 'qris', labelKey: 'biz.paymentQRIS' },
];

export default function BusinessSales() {
  const { t } = useTranslation();
  const { activeBusiness } = useBusinessStore();
  const { formatAmount } = useCurrencyFormat();
  const [sales, setSales] = useState<Sale[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSale, setEditingSale] = useState<Sale | null>(null);
  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    customerId: '',
    paymentMethod: 'cash',
    notes: '',
  });
  const [saving, setSaving] = useState(false);

  const [deleteId, setDeleteId] = useState<string | null>(null);

  const businessId = activeBusiness?.id;

  const fetchSales = useCallback(() => {
    if (!businessId) return;
    setLoading(true);
    Promise.all([
      fetch(`/api/business/${businessId}/sales`).then((r) => (r.ok ? r.json() : [])),
      fetch(`/api/business/${businessId}/customers`).then((r) => (r.ok ? r.json() : [])),
    ])
      .then(([salesData, customersData]) => {
        setSales(salesData);
        setCustomers(customersData);
      })
      .catch(() => {
        setSales([]);
        setCustomers([]);
      })
      .finally(() => setLoading(false));
  }, [businessId]);

  useEffect(() => {
    if (businessId) {
      fetchSales();
    } else {
      setLoading(false);
    }
  }, [businessId, fetchSales]);

  const openCreateDialog = () => {
    setEditingSale(null);
    setFormData({
      description: '',
      amount: '',
      date: new Date().toISOString().split('T')[0],
      customerId: '',
      paymentMethod: 'cash',
      notes: '',
    });
    setDialogOpen(true);
  };

  const openEditDialog = (sale: Sale) => {
    setEditingSale(sale);
    setFormData({
      description: sale.description,
      amount: sale.amount.toString(),
      date: sale.date.split('T')[0],
      customerId: sale.customerId || '',
      paymentMethod: sale.paymentMethod || 'cash',
      notes: sale.notes || '',
    });
    setDialogOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessId || !formData.description || !formData.amount) return;
    setSaving(true);
    try {
      const url = editingSale
        ? `/api/business/${businessId}/sales/${editingSale.id}`
        : `/api/business/${businessId}/sales`;
      const body: Record<string, unknown> = {
        description: formData.description,
        amount: parseFloat(formData.amount),
        date: formData.date,
        paymentMethod: formData.paymentMethod,
        notes: formData.notes || undefined,
      };
      if (formData.customerId) body.customerId = formData.customerId;
      const res = await fetch(url, {
        method: editingSale ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error();
      toast.success(editingSale ? t('biz.businessUpdated') : t('biz.businessCreated'));
      setDialogOpen(false);
      fetchSales();
    } catch {
      toast.error(t('common.error'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!businessId || !deleteId) return;
    try {
      const res = await fetch(`/api/business/${businessId}/sales/${deleteId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      toast.success(t('biz.businessUpdated'));
      fetchSales();
    } catch {
      toast.error(t('common.error'));
    } finally {
      setDeleteId(null);
    }
  };

  const filteredSales = sales.filter(
    (s) =>
      s.description.toLowerCase().includes(search.toLowerCase()) ||
      s.customer?.name.toLowerCase().includes(search.toLowerCase())
  );

  const total = filteredSales.reduce((sum, s) => sum + s.amount, 0);

  if (!businessId) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-white/50 text-center">{t('biz.registerFirst')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <ShoppingBag className="h-5 w-5 text-[#03DAC6]" />
            {t('biz.penjualan')}
          </h2>
          <p className="text-sm text-white/50 mt-1">
            {t('biz.totalPenjualan')}: <span className="text-[#03DAC6] font-semibold">{formatAmount(total)}</span>
          </p>
        </div>
        <Button onClick={openCreateDialog} size="sm" className="bg-[#BB86FC] text-black hover:bg-[#9B6FDB]">
          <Plus className="h-4 w-4 mr-1" />
          {t('biz.addSale')}
        </Button>
      </div>

      {/* Search */}
      <Input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder={t('common.search') + '...'}
        className="bg-white/[0.05] border-white/[0.1] text-white placeholder:text-white/30 max-w-sm"
      />

      {/* Table */}
      <Card className="bg-[#1A1A2E] border border-white/[0.06] rounded-2xl">
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-3 p-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 rounded-lg bg-white/[0.06]" />
              ))}
            </div>
          ) : filteredSales.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-white/40">
              <TrendingUp className="h-10 w-10 mb-2 opacity-40" />
              <p className="text-sm">{t('biz.noBizData')}</p>
            </div>
          ) : (
            <div className="max-h-[500px] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-white/[0.06] hover:bg-transparent">
                    <TableHead className="text-white/50 text-xs">{t('biz.cashDate')}</TableHead>
                    <TableHead className="text-white/50 text-xs">{t('biz.saleDescription')}</TableHead>
                    <TableHead className="text-white/50 text-xs hidden sm:table-cell">{t('biz.saleCustomer')}</TableHead>
                    <TableHead className="text-white/50 text-xs hidden md:table-cell">{t('biz.salePaymentMethod')}</TableHead>
                    <TableHead className="text-white/50 text-xs text-right">{t('biz.saleAmount')}</TableHead>
                    <TableHead className="text-white/50 text-xs w-24" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSales.map((sale) => (
                    <TableRow key={sale.id} className="border-white/[0.04] hover:bg-white/[0.02]">
                      <TableCell className="text-white/70 text-xs py-3">
                        {new Date(sale.date).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-white text-xs py-3 font-medium max-w-[180px] truncate">
                        {sale.description}
                      </TableCell>
                      <TableCell className="py-3 hidden sm:table-cell">
                        <span className="text-white/60 text-xs">{sale.customer?.name || '-'}</span>
                      </TableCell>
                      <TableCell className="py-3 hidden md:table-cell">
                        {sale.paymentMethod && (
                          <Badge variant="outline" className="text-xs font-normal border-0 bg-[#BB86FC]/20 text-[#BB86FC]">
                            {PAYMENT_METHODS.find((m) => m.value === sale.paymentMethod)
                              ? t(PAYMENT_METHODS.find((m) => m.value === sale.paymentMethod)!.labelKey)
                              : sale.paymentMethod}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-right font-medium py-3 text-[#03DAC6]">
                        +{formatAmount(sale.amount)}
                      </TableCell>
                      <TableCell className="py-3 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-white/40 hover:text-white hover:bg-white/10"
                          onClick={() => openEditDialog(sale)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-white/40 hover:text-red-400 hover:bg-white/10"
                          onClick={() => setDeleteId(sale.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-[#1A1A2E] border border-white/[0.06] text-white sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="text-white">
              {editingSale ? t('common.edit') : t('biz.addSale')}
            </DialogTitle>
            <DialogDescription className="text-white/60">
              {t('biz.saleDescription')}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-white/80">{t('biz.saleDescription')} *</Label>
              <Input
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder={t('biz.saleDescription')}
                className="bg-white/[0.05] border-white/[0.1] text-white placeholder:text-white/30"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-white/80">{t('biz.saleAmount')} *</Label>
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
              <Label className="text-white/80">{t('biz.saleCustomer')}</Label>
              <Select value={formData.customerId} onValueChange={(v) => setFormData({ ...formData, customerId: v })}>
                <SelectTrigger className="bg-white/[0.05] border-white/[0.1] text-white">
                  <SelectValue placeholder={t('biz.saleCustomer')} />
                </SelectTrigger>
                <SelectContent>
                  {customers.map((c) => (
                    <SelectItem key={c.id} value={c.id} className="text-white">
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-white/80">{t('biz.saleDate')}</Label>
                <Input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="bg-white/[0.05] border-white/[0.1] text-white"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-white/80">{t('biz.salePaymentMethod')}</Label>
                <Select value={formData.paymentMethod} onValueChange={(v) => setFormData({ ...formData, paymentMethod: v })}>
                  <SelectTrigger className="bg-white/[0.05] border-white/[0.1] text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_METHODS.map((m) => (
                      <SelectItem key={m.value} value={m.value} className="text-white">
                        {t(m.labelKey)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-white/80">{t('biz.customerNotes')}</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder={t('biz.customerNotes')}
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
                disabled={saving || !formData.description || !formData.amount}
                className="bg-[#BB86FC] text-black hover:bg-[#9B6FDB]"
              >
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t('common.save')}
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
