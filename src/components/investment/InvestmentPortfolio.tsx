'use client';

import { useEffect, useState, useCallback } from 'react';
import { useBusinessStore } from '@/store/useBusinessStore';
import { useTranslation } from '@/hooks/useTranslation';
import { useCurrencyFormat } from '@/hooks/useCurrencyFormat';
import {
  Card,
  CardContent,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
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
import { Plus, Pencil, Trash2, ArrowUpRight, ArrowDownRight, Package } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface PortfolioItem {
  id: string;
  type: string;
  symbol: string;
  name?: string;
  entryPrice: number;
  currentPrice: number;
  quantity: number;
  targetPrice?: number;
  stopLoss?: number;
  status: string;
  notes?: string;
  currentValue: number;
  investedValue: number;
  unrealizedPnl: number;
  unrealizedPnlPercentage: number;
}

const TYPE_COLORS: Record<string, { bg: string; text: string }> = {
  saham: { bg: 'bg-purple-500/15', text: 'text-purple-400' },
  crypto: { bg: 'bg-teal-500/15', text: 'text-teal-400' },
  forex: { bg: 'bg-pink-500/15', text: 'text-pink-400' },
};

const STATUS_VARIANTS: Record<string, string> = {
  open: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
  closed: 'bg-gray-500/15 text-gray-400 border-gray-500/20',
};

export default function InvestmentPortfolio() {
  const { t } = useTranslation();
  const { activeBusiness } = useBusinessStore();
  const { formatAmount } = useCurrencyFormat();

  const [portfolios, setPortfolios] = useState<PortfolioItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<PortfolioItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    type: 'saham' as string,
    symbol: '',
    name: '',
    entryPrice: '',
    quantity: '',
    targetPrice: '',
    stopLoss: '',
    notes: '',
    status: 'open' as string,
    currentPrice: '',
  });

  // Delete dialog state
  const [deleteTarget, setDeleteTarget] = useState<PortfolioItem | null>(null);

  const businessId = activeBusiness?.id;

  const fetchPortfolios = useCallback(() => {
    if (!businessId) return;
    setLoading(true);
    fetch(`/api/business/${businessId}/portfolio`)
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then((result) => setPortfolios(result.portfolios || []))
      .catch(() => setPortfolios([]))
      .finally(() => setLoading(false));
  }, [businessId]);

  useEffect(() => {
    fetchPortfolios();
  }, [fetchPortfolios]);

  const filtered = portfolios.filter((p) => {
    if (typeFilter !== 'all' && p.type !== typeFilter) return false;
    if (statusFilter !== 'all' && p.status !== statusFilter) return false;
    return true;
  });

  const pnlColor = (val: number) => (val >= 0 ? 'text-[#03DAC6]' : 'text-[#CF6679]');

  const resetForm = () => {
    setForm({
      type: 'saham',
      symbol: '',
      name: '',
      entryPrice: '',
      quantity: '',
      targetPrice: '',
      stopLoss: '',
      notes: '',
      status: 'open',
      currentPrice: '',
    });
    setEditing(null);
  };

  const openCreate = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEdit = (item: PortfolioItem) => {
    setEditing(item);
    setForm({
      type: item.type,
      symbol: item.symbol,
      name: item.name || '',
      entryPrice: item.entryPrice.toString(),
      quantity: item.quantity.toString(),
      targetPrice: item.targetPrice?.toString() || '',
      stopLoss: item.stopLoss?.toString() || '',
      notes: item.notes || '',
      status: item.status,
      currentPrice: item.currentPrice.toString(),
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!businessId || !form.symbol || !form.entryPrice || !form.quantity) return;
    setSaving(true);
    try {
      const url = editing
        ? `/api/business/${businessId}/portfolio/${editing.id}`
        : `/api/business/${businessId}/portfolio`;
      const res = await fetch(url, {
        method: editing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          entryPrice: parseFloat(form.entryPrice),
          quantity: parseFloat(form.quantity),
          currentPrice: form.currentPrice ? parseFloat(form.currentPrice) : 0,
          targetPrice: form.targetPrice ? parseFloat(form.targetPrice) : null,
          stopLoss: form.stopLoss ? parseFloat(form.stopLoss) : null,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success(editing ? t('inv.portfolioUpdated') : t('inv.portfolioCreated'));
      setDialogOpen(false);
      fetchPortfolios();
    } catch {
      toast.error(t('common.error'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!businessId || !deleteTarget) return;
    try {
      const res = await fetch(`/api/business/${businessId}/portfolio/${deleteTarget.id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error();
      toast.success(t('inv.portfolioDeleted'));
      setDeleteTarget(null);
      fetchPortfolios();
    } catch {
      toast.error(t('common.error'));
    }
  };

  if (!businessId) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-white/50 text-center">{t('inv.registerFirst')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters & Add Button */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[130px] bg-white/[0.05] border-white/[0.1] text-white text-xs h-9">
              <SelectValue placeholder="Tipe" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Tipe</SelectItem>
              <SelectItem value="saham">Saham</SelectItem>
              <SelectItem value="crypto">Crypto</SelectItem>
              <SelectItem value="forex">Forex</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[130px] bg-white/[0.05] border-white/[0.1] text-white text-xs h-9">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Status</SelectItem>
              <SelectItem value="open">Terbuka</SelectItem>
              <SelectItem value="closed">Tertutup</SelectItem>
            </SelectContent>
          </Select>
          <Badge variant="outline" className="border-white/[0.1] text-white/50 text-xs">
            {filtered.length} item
          </Badge>
        </div>
        <Button
          onClick={openCreate}
          size="sm"
          className="bg-[#BB86FC] text-black hover:bg-[#9B6FDB] h-9"
        >
          <Plus className="h-4 w-4 mr-1" />
          {t('inv.addPortfolio')}
        </Button>
      </div>

      {/* Portfolio Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-xl bg-[#1A1A2E]" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="bg-[#1A1A2E] border-white/[0.06]">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Package className="h-10 w-10 text-white/20 mb-3" />
            <p className="text-white/40 text-sm">{t('inv.noInvData')}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((item) => {
            const typeColor = TYPE_COLORS[item.type] || TYPE_COLORS.saham;
            const isPositive = item.unrealizedPnl >= 0;

            return (
              <Card key={item.id} className="bg-[#1A1A2E] border-white/[0.06] hover:border-white/[0.1] transition-colors">
                <CardContent className="p-4 space-y-3">
                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className={cn('flex h-9 w-9 items-center justify-center rounded-lg', typeColor.bg)}>
                        <span className={cn('text-xs font-bold', typeColor.text)}>
                          {item.type.slice(0, 2).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="text-white text-sm font-semibold">{item.symbol}</p>
                        {item.name && (
                          <p className="text-white/40 text-xs truncate max-w-[140px]">
                            {item.name}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Badge variant="outline" className={cn('text-[10px] border-0 px-2 py-0', STATUS_VARIANTS[item.status] || '')}>
                        {item.status === 'open' ? t('inv.statusOpen') : t('inv.statusClosed')}
                      </Badge>
                    </div>
                  </div>

                  {/* Price Info */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <p className="text-white/40 mb-0.5">{t('inv.entryPrice')}</p>
                      <p className="text-white/80 font-medium">{formatAmount(item.entryPrice)}</p>
                    </div>
                    <div>
                      <p className="text-white/40 mb-0.5">{t('inv.currentPrice')}</p>
                      <p className="text-white/80 font-medium">{formatAmount(item.currentPrice)}</p>
                    </div>
                    <div>
                      <p className="text-white/40 mb-0.5">{t('inv.quantity')}</p>
                      <p className="text-white/80 font-medium">{item.quantity}</p>
                    </div>
                    <div>
                      <p className="text-white/40 mb-0.5">{t('inv.totalPnL')}</p>
                      <p className={cn('font-bold flex items-center gap-0.5', pnlColor(item.unrealizedPnl))}>
                        {isPositive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                        {isPositive ? '+' : ''}
                        {formatAmount(item.unrealizedPnl)}
                      </p>
                    </div>
                  </div>

                  {/* PnL Bar */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-white/40">PnL %</span>
                      <span className={cn('font-semibold', pnlColor(item.unrealizedPnl))}>
                        {isPositive ? '+' : ''}{item.unrealizedPnlPercentage.toFixed(2)}%
                      </span>
                    </div>
                    <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{
                          width: `${Math.min(Math.abs(item.unrealizedPnlPercentage), 100)}%`,
                          backgroundColor: isPositive ? '#03DAC6' : '#CF6679',
                        }}
                      />
                    </div>
                  </div>

                  {/* Target/StopLoss */}
                  {(item.targetPrice || item.stopLoss) && (
                    <div className="flex gap-3 text-[10px] text-white/30">
                      {item.targetPrice && (
                        <span>Target: {formatAmount(item.targetPrice)}</span>
                      )}
                      {item.stopLoss && (
                        <span>SL: {formatAmount(item.stopLoss)}</span>
                      )}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center justify-end gap-1 pt-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-white/40 hover:text-white hover:bg-white/10"
                      onClick={() => openEdit(item)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-white/40 hover:text-[#CF6679] hover:bg-white/10"
                      onClick={() => setDeleteTarget(item)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-[#1A1A2E] border-white/[0.06] text-white sm:max-w-[480px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white">
              {editing ? t('common.edit') : t('inv.addPortfolio')}
            </DialogTitle>
            <DialogDescription className="text-white/60">
              {editing ? t('inv.portfolioUpdated') : t('inv.portfolioCreated')}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-white/80">{t('inv.portfolioType')} *</Label>
                <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                  <SelectTrigger className="bg-white/[0.05] border-white/[0.1] text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="saham">{t('inv.typeSaham')}</SelectItem>
                    <SelectItem value="crypto">{t('inv.typeCrypto')}</SelectItem>
                    <SelectItem value="forex">{t('inv.typeForex')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-white/80">{t('inv.status')}</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger className="bg-white/[0.05] border-white/[0.1] text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">{t('inv.statusOpen')}</SelectItem>
                    <SelectItem value="closed">{t('inv.statusClosed')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-white/80">{t('inv.symbol')} *</Label>
                <Input
                  value={form.symbol}
                  onChange={(e) => setForm({ ...form, symbol: e.target.value.toUpperCase() })}
                  placeholder="BBCA"
                  className="bg-white/[0.05] border-white/[0.1] text-white placeholder:text-white/30"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-white/80">{t('inv.assetName')}</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Bank BC"
                  className="bg-white/[0.05] border-white/[0.1] text-white placeholder:text-white/30"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-white/80">{t('inv.entryPrice')} *</Label>
                <Input
                  type="number"
                  value={form.entryPrice}
                  onChange={(e) => setForm({ ...form, entryPrice: e.target.value })}
                  placeholder="0"
                  min="0"
                  step="any"
                  className="bg-white/[0.05] border-white/[0.1] text-white placeholder:text-white/30"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-white/80">{t('inv.currentPrice')}</Label>
                <Input
                  type="number"
                  value={form.currentPrice}
                  onChange={(e) => setForm({ ...form, currentPrice: e.target.value })}
                  placeholder="0"
                  min="0"
                  step="any"
                  className="bg-white/[0.05] border-white/[0.1] text-white placeholder:text-white/30"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label className="text-white/80">{t('inv.quantity')} *</Label>
                <Input
                  type="number"
                  value={form.quantity}
                  onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                  placeholder="0"
                  min="0"
                  step="any"
                  className="bg-white/[0.05] border-white/[0.1] text-white placeholder:text-white/30"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-white/80">{t('inv.targetPrice')}</Label>
                <Input
                  type="number"
                  value={form.targetPrice}
                  onChange={(e) => setForm({ ...form, targetPrice: e.target.value })}
                  placeholder="0"
                  step="any"
                  className="bg-white/[0.05] border-white/[0.1] text-white placeholder:text-white/30"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-white/80">{t('inv.stopLoss')}</Label>
                <Input
                  type="number"
                  value={form.stopLoss}
                  onChange={(e) => setForm({ ...form, stopLoss: e.target.value })}
                  placeholder="0"
                  step="any"
                  className="bg-white/[0.05] border-white/[0.1] text-white placeholder:text-white/30"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-white/80">{t('inv.journalNotes')}</Label>
              <Textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Catatan..."
                className="bg-white/[0.05] border-white/[0.1] text-white placeholder:text-white/30 min-h-[70px]"
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
                disabled={saving || !form.symbol || !form.entryPrice || !form.quantity}
                className="bg-[#BB86FC] text-black hover:bg-[#9B6FDB]"
              >
                {t('common.save')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent className="bg-[#1A1A2E] border-white/[0.06] text-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">{t('common.delete')}</AlertDialogTitle>
            <AlertDialogDescription className="text-white/60">
              Hapus portofolio <strong className="text-white">{deleteTarget?.symbol}</strong>? Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-white/[0.1] text-white hover:bg-white/10">
              {t('common.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-[#CF6679] text-white hover:bg-[#B85A6C]"
            >
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
