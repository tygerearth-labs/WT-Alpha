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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Plus, ArrowDownToLine, History, Wallet } from 'lucide-react';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

interface Sale {
  id: string;
  description: string;
  amount: number;
  date: string;
}

interface Allocation {
  id: string;
  saleId: string | null;
  amount: number;
  percentage: number;
  personalNote?: string;
  allocatedAt: string;
  sale?: Sale;
}

export default function BusinessAllocation() {
  const { t } = useTranslation();
  const { activeBusiness } = useBusinessStore();
  const { formatAmount } = useCurrencyFormat();
  const [allocations, setAllocations] = useState<Allocation[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    saleId: '',
    amount: '',
    percentage: '',
    personalNote: '',
  });
  const [saving, setSaving] = useState(false);

  const businessId = activeBusiness?.id;

  const fetchData = useCallback(() => {
    if (!businessId) return;
    setLoading(true);
    Promise.all([
      fetch(`/api/business/${businessId}/allocations`).then((r) => (r.ok ? r.json() : [])),
      fetch(`/api/business/${businessId}/sales`).then((r) => (r.ok ? r.json() : [])),
    ])
      .then(([allocData, salesData]) => {
        setAllocations(allocData || []);
        setSales(salesData || []);
      })
      .catch(() => {
        setAllocations([]);
        setSales([]);
      })
      .finally(() => setLoading(false));
  }, [businessId]);

  useEffect(() => {
    if (businessId) {
      fetchData();
    } else {
      setLoading(false);
    }
  }, [businessId, fetchData]);

  const openCreateDialog = () => {
    setFormData({ saleId: '', amount: '', percentage: '', personalNote: '' });
    setDialogOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessId || (!formData.amount && !formData.percentage)) return;
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        amount: formData.amount ? parseFloat(formData.amount) : 0,
        percentage: formData.percentage ? parseFloat(formData.percentage) : 0,
        personalNote: formData.personalNote || undefined,
      };
      if (formData.saleId) body.saleId = formData.saleId;
      const res = await fetch(`/api/business/${businessId}/allocations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error();
      toast.success(t('biz.businessCreated'));
      setDialogOpen(false);
      fetchData();
    } catch {
      toast.error(t('common.error'));
    } finally {
      setSaving(false);
    }
  };

  const totalAllocated = allocations.reduce((sum, a) => sum + a.amount, 0);

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
            <ArrowDownToLine className="h-5 w-5 text-[#BB86FC]" />
            {t('biz.autoAllocation')}
          </h2>
          <p className="text-sm text-white/50 mt-1">
            {t('biz.totalAllocated')}: <span className="text-[#BB86FC] font-semibold">{formatAmount(totalAllocated)}</span>
          </p>
        </div>
        <Button onClick={openCreateDialog} size="sm" className="bg-[#BB86FC] text-black hover:bg-[#9B6FDB]">
          <Plus className="h-4 w-4 mr-1" />
          {t('common.add')}
        </Button>
      </div>

      {/* Config Card */}
      <Card className="bg-[#1A1A2E] border border-white/[0.06] rounded-2xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Wallet className="h-4 w-4 text-[#BB86FC]" />
          <h3 className="text-sm font-medium text-white">{t('biz.autoAllocation')}</h3>
        </div>
        <p className="text-xs text-white/50 mb-3">
          {t('biz.allocatedFrom')}
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="bg-white/[0.03] rounded-xl p-3">
            <p className="text-xs text-white/40">{t('biz.allocationPercent')}</p>
            <p className="text-lg font-bold text-white mt-1">
              {allocations.length > 0
                ? `${(allocations.reduce((s, a) => s + a.percentage, 0) / allocations.length).toFixed(1)}%`
                : '-'}
            </p>
          </div>
          <div className="bg-white/[0.03] rounded-xl p-3">
            <p className="text-xs text-white/40">{t('biz.allocationFixed')}</p>
            <p className="text-lg font-bold text-[#BB86FC] mt-1">
              {totalAllocated > 0 ? formatAmount(totalAllocated / Math.max(allocations.length, 1)) : '-'}
            </p>
          </div>
        </div>
      </Card>

      {/* History Table */}
      <Card className="bg-[#1A1A2E] border border-white/[0.06] rounded-2xl">
        <CardContent className="p-0">
          <div className="flex items-center gap-2 p-4 border-b border-white/[0.04]">
            <History className="h-4 w-4 text-white/40" />
            <h3 className="text-sm font-medium text-white">{t('laporan.history')}</h3>
            <Badge variant="outline" className="text-xs font-normal border-0 bg-[#BB86FC]/20 text-[#BB86FC] ml-auto">
              {allocations.length}
            </Badge>
          </div>
          {loading ? (
            <div className="space-y-3 p-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-12 rounded-lg bg-white/[0.06]" />
              ))}
            </div>
          ) : allocations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-white/40">
              <ArrowDownToLine className="h-10 w-10 mb-2 opacity-40" />
              <p className="text-sm">{t('biz.noBizData')}</p>
            </div>
          ) : (
            <div className="max-h-[400px] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-white/[0.06] hover:bg-transparent">
                    <TableHead className="text-white/50 text-xs">{t('biz.cashDate')}</TableHead>
                    <TableHead className="text-white/50 text-xs">{t('biz.saleDescription')}</TableHead>
                    <TableHead className="text-white/50 text-xs text-right">{t('biz.debtAmount')}</TableHead>
                    <TableHead className="text-white/50 text-xs text-right">{t('biz.allocationPercent')}</TableHead>
                    <TableHead className="text-white/50 text-xs hidden sm:table-cell">{t('biz.customerNotes')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allocations.map((alloc) => (
                    <TableRow key={alloc.id} className="border-white/[0.04] hover:bg-white/[0.02]">
                      <TableCell className="text-white/70 text-xs py-3">
                        {new Date(alloc.allocatedAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-white text-xs py-3 font-medium max-w-[180px] truncate">
                        {alloc.sale?.description || '-'}
                      </TableCell>
                      <TableCell className="text-xs text-right font-medium py-3 text-[#BB86FC]">
                        {formatAmount(alloc.amount)}
                      </TableCell>
                      <TableCell className="text-white/60 text-xs text-right py-3">
                        {alloc.percentage > 0 ? `${alloc.percentage}%` : '-'}
                      </TableCell>
                      <TableCell className="text-white/40 text-xs py-3 max-w-[150px] truncate hidden sm:table-cell">
                        {alloc.personalNote || '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Allocation Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-[#1A1A2E] border border-white/[0.06] text-white sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle className="text-white">
              {t('biz.autoAllocation')}
            </DialogTitle>
            <DialogDescription className="text-white/60">
              {t('biz.allocatedFrom')}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-white/80">{t('biz.saleDescription')}</Label>
              <Select value={formData.saleId} onValueChange={(v) => setFormData({ ...formData, saleId: v })}>
                <SelectTrigger className="bg-white/[0.05] border-white/[0.1] text-white">
                  <SelectValue placeholder={t('biz.saleDescription')} />
                </SelectTrigger>
                <SelectContent>
                  {sales.map((s) => (
                    <SelectItem key={s.id} value={s.id} className="text-white">
                      {s.description} — {formatAmount(s.amount)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-white/80">{t('biz.allocationPercent')}</Label>
                <Input
                  type="number"
                  value={formData.percentage}
                  onChange={(e) => setFormData({ ...formData, percentage: e.target.value })}
                  placeholder="0"
                  min="0"
                  max="100"
                  className="bg-white/[0.05] border-white/[0.1] text-white placeholder:text-white/30"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-white/80">{t('biz.allocationFixed')}</Label>
                <Input
                  type="number"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  placeholder="0"
                  min="0"
                  className="bg-white/[0.05] border-white/[0.1] text-white placeholder:text-white/30"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-white/80">{t('biz.customerNotes')}</Label>
              <Textarea
                value={formData.personalNote}
                onChange={(e) => setFormData({ ...formData, personalNote: e.target.value })}
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
                disabled={saving || (!formData.amount && !formData.percentage)}
                className="bg-[#BB86FC] text-black hover:bg-[#9B6FDB]"
              >
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t('common.save')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
