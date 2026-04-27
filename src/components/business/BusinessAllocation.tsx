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
import {
  Plus, ArrowDownToLine, History, Wallet, TrendingUp,
  Percent, DollarSign, Layers, ArrowUpRight, Lightbulb, Info,
} from 'lucide-react';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

// ─── THEME ─────────────────────────────────────────────────────
const cardStyle: React.CSSProperties = { background: 'var(--card)', border: '1px solid var(--border)' };
const inputStyle: React.CSSProperties = { background: 'var(--card)', border: '1px solid var(--border)', color: 'var(--foreground)' };
const textMuted: React.CSSProperties = { color: 'var(--muted-foreground)' };
const textPrimary: React.CSSProperties = { color: 'var(--primary)' };
const textSecondary: React.CSSProperties = { color: 'var(--secondary)' };
const textDestructive: React.CSSProperties = { color: 'var(--destructive)' };
const textWarning: React.CSSProperties = { color: 'var(--warning)' };

interface Sale {
  id: string;
  description: string;
  amount: number;
  date: string;
  downPayment?: number | null;
  downPaymentPct?: number | null;
  installmentTempo?: number | null;
  installmentAmount?: number | null;
  paymentMethod?: string | null;
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

/* ------------------------------------------------------------------ */
/*  Allocation Visual Bar                                               */
/* ------------------------------------------------------------------ */

function AllocationBar({ allocations, totalSales }: { allocations: Allocation[]; totalSales: number }) {
  const totalAllocated = allocations.reduce((s, a) => s + a.amount, 0);
  const pct = totalSales > 0 ? Math.min((totalAllocated / totalSales) * 100, 100) : 0;

  const barSegments = allocations.slice(0, 5).map((a, i) => ({
    width: a.percentage || 0,
    color: ['var(--primary)', 'var(--secondary)', 'var(--warning)', 'var(--destructive)', '#FF8A65'][i % 5],
  }));

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground" >Total Allocated vs Total Sales</span>
        <span className="font-medium tabular-nums text-muted-foreground" >{pct.toFixed(1)}%</span>
      </div>
      <div className="h-2.5 rounded-full overflow-hidden flex" style={{ backgroundColor: 'var(--border)' }}>
        {barSegments.map((seg, i) => (
          <div
            key={i}
            className="h-full transition-all duration-700"
            style={{
              width: `${seg.width}%`,
              backgroundColor: seg.color,
              opacity: 0.8,
              transitionDelay: `${i * 0.12}s`,
            }}
          />
        ))}
        {pct < 100 && totalSales > 0 && (
          <div className="h-full transition-all duration-500" style={{ width: `${100 - pct}%`, backgroundColor: 'var(--border)' }} />
        )}
      </div>
      <div className="flex items-center justify-between text-[10px] text-muted-foreground" >
        <span>{allocations.length} allocations</span>
        <span>{totalSales > 0 ? `${pct.toFixed(0)}% of sales` : 'No sales data'}</span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Empty State                                                        */
/* ------------------------------------------------------------------ */

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="h-14 w-14 rounded-xl flex items-center justify-center mb-3 bg-card border border-border">
        <ArrowDownToLine className="h-7 w-7" style={{ color: 'color-mix(in srgb, var(--primary) 31%, transparent)' }} />
      </div>
      <p className="text-sm font-medium text-muted-foreground" >{'Belum ada alokasi'}</p>
      <p className="text-xs mt-1 text-muted-foreground" >Buat alokasi pertama untuk memulai</p>
    </div>
  );
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
        setAllocations(allocData?.allocations || []);
        setSales(salesData?.sales || []);
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
  const totalSales = sales.reduce((s, sale) => s + sale.amount, 0);
  const avgPercentage = allocations.length > 0 ? allocations.reduce((s, a) => s + a.percentage, 0) / allocations.length : 0;
  const latestAlloc = allocations.length > 0 ? allocations[allocations.length - 1] : null;

  // Check if selected sale is installment
  const selectedSale = formData.saleId ? sales.find((s) => s.id === formData.saleId) : null;
  const isInstallment = selectedSale && (selectedSale.installmentTempo && selectedSale.installmentTempo > 0);

  if (!businessId) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-center text-muted-foreground" >{t('biz.registerFirst')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Info Banner */}
      <div className="flex items-start gap-2 p-2.5 rounded-lg" style={{ background: 'color-mix(in srgb, var(--primary) 3%, transparent)', border: '1px solid color-mix(in srgb, var(--primary) 8%, transparent)' }}>
        <Info className="h-3.5 w-3.5 shrink-0 mt-0.5 text-primary" />
        <p className="text-xs leading-relaxed text-muted-foreground" >
          Atur pembagian dana dari pendapatan bisnis Anda.
        </p>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h2 className="text-base font-bold flex items-center gap-2 text-foreground" >
          <div className="h-7 w-7 rounded-lg flex items-center justify-center bg-primary/12">
            <ArrowDownToLine className="h-3.5 w-3.5 text-primary" />
          </div>
          {t('biz.autoAllocation')}
        </h2>
        <Button
          onClick={openCreateDialog}
          size="sm"
          className="rounded-lg h-8 text-xs"
          style={{ backgroundColor: 'var(--primary)', color: '#000' }}
        >
          <Plus className="h-3.5 w-3.5 mr-1" />
          {t('common.add')}
        </Button>
      </div>

      {/* Explanation Card */}
      <div className="flex items-start gap-3 p-3 sm:p-4 rounded-xl" style={{ background: 'color-mix(in srgb, var(--primary) 2%, transparent)', border: '1px solid color-mix(in srgb, var(--primary) 12%, transparent)' }}>
        <div className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0 bg-primary/12">
          <Lightbulb className="h-4 w-4 text-primary" />
        </div>
        <div>
          <p className="text-xs font-semibold mb-1 text-primary" >Apa itu Alokasi Otomatis?</p>
          <p className="text-[11px] leading-relaxed text-muted-foreground" >
            Alokasi otomatis membagikan pendapatan penjualan ke berbagai keperluan bisnis (operasional, investasi, cadangan). Anda bisa menetapkan persentase atau nominal tetap yang otomatis dialokasikan dari setiap penjualan.
          </p>
        </div>
      </div>

      {/* Summary Stat Cards */}
      {!loading && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 sm:gap-2">
          {[
            { label: t('biz.totalAllocated'), value: formatAmount(totalAllocated), icon: DollarSign, color: 'var(--primary)' },
            { label: t('biz.allocationPercent'), value: `${avgPercentage.toFixed(1)}%`, icon: Percent, color: 'var(--secondary)' },
            { label: 'Total Sales', value: formatAmount(totalSales), icon: TrendingUp, color: 'var(--warning)' },
            { label: 'Total Allocations', value: allocations.length, icon: Layers, color: 'var(--destructive)' },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <Card key={item.label} className="rounded-xl overflow-hidden bg-card border border-border">
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className="h-7 w-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${item.color}15` }}>
                      <Icon className="h-3.5 w-3.5" style={{ color: item.color }} />
                    </div>
                    <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground" >{item.label}</span>
                  </div>
                  <p className="text-base font-bold tabular-nums" style={{ color: item.color }}>{item.value}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Visual Allocation Bar */}
      {!loading && allocations.length > 0 && (
        <Card className="rounded-xl bg-card border border-border">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="h-6 w-6 rounded-md flex items-center justify-center bg-primary/12">
                <Wallet className="h-3 w-3 text-primary" />
              </div>
              <h3 className="text-xs font-semibold text-foreground" >{t('biz.autoAllocation')}</h3>
              <Badge className="ml-auto text-[9px] font-medium rounded-full px-1.5 py-0" style={{ backgroundColor: 'color-mix(in srgb, var(--primary) 8%, transparent)', color: 'var(--primary)', border: '1px solid color-mix(in srgb, var(--primary) 12%, transparent)' }}>
                {allocations.length} records
              </Badge>
            </div>
            <AllocationBar allocations={allocations} totalSales={totalSales} />
            {latestAlloc && (
              <div className="mt-3 pt-3 flex items-center gap-2.5 border-t border-border">
                <div className="h-7 w-7 rounded-lg flex items-center justify-center shrink-0 bg-secondary/12">
                  <ArrowUpRight className="h-3 w-3 text-secondary" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] text-muted-foreground" >Latest Allocation</p>
                  <p className="text-xs font-medium truncate text-muted-foreground" >{latestAlloc.sale?.description || 'Manual allocation'}</p>
                </div>
                <p className="text-xs font-semibold tabular-nums text-primary" >{formatAmount(latestAlloc.amount)}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Config Card */}
      <Card className="rounded-xl bg-card border border-border">
        <CardContent className="p-3 sm:p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="h-6 w-6 rounded-md flex items-center justify-center bg-warning/12">
              <Percent className="h-3 w-3 text-warning" />
            </div>
            <h3 className="text-xs font-semibold text-foreground" >Allocation Config</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div className="rounded-lg p-3" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)' }}>
              <p className="text-[10px] font-medium uppercase tracking-wider mb-1 text-muted-foreground" >{t('biz.allocationPercent')}</p>
              <p className="text-xl font-bold text-foreground" >
                {allocations.length > 0 ? `${avgPercentage.toFixed(1)}%` : '-'}
              </p>
              <p className="text-[10px] mt-0.5 text-muted-foreground" >Average allocation percentage</p>
            </div>
            <div className="rounded-lg p-3" style={{ background: 'color-mix(in srgb, var(--primary) 2%, transparent)', border: '1px solid color-mix(in srgb, var(--primary) 8%, transparent)' }}>
              <p className="text-[10px] font-medium uppercase tracking-wider mb-1 text-muted-foreground" >{t('biz.allocationFixed')}</p>
              <p className="text-xl font-bold tabular-nums text-primary" >
                {totalAllocated > 0 ? formatAmount(totalAllocated / Math.max(allocations.length, 1)) : '-'}
              </p>
              <p className="text-[10px] mt-0.5 text-muted-foreground" >Average fixed amount</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* History Table */}
      <Card className="rounded-xl overflow-hidden bg-card border border-border">
        <CardContent className="p-0">
          <div className="flex items-center gap-2 p-3 sm:p-4 border-b border-border">
            <div className="h-6 w-6 rounded-md flex items-center justify-center bg-secondary/12">
              <History className="h-3 w-3 text-secondary" />
            </div>
            <h3 className="text-xs font-semibold text-foreground" >{t('laporan.history')}</h3>
            <Badge className="ml-auto text-[9px] font-medium rounded-full px-1.5 py-0" style={{ backgroundColor: 'color-mix(in srgb, var(--primary) 8%, transparent)', color: 'var(--primary)', border: '1px solid color-mix(in srgb, var(--primary) 12%, transparent)' }}>
              {allocations.length}
            </Badge>
          </div>
          {loading ? (
            <div className="space-y-2 p-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-12 rounded-lg bg-border" />
              ))}
            </div>
          ) : allocations.length === 0 ? (
            <EmptyState />
          ) : (
            <>
              {/* Mobile Card List */}
              <div className="sm:hidden max-h-96 overflow-y-auto divide-y divide-border">
                {allocations.map((alloc, idx) => (
                  <div key={alloc.id} className="p-3 space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium truncate text-foreground">{alloc.sale?.description || '-'}</p>
                        <p className="text-[10px] text-muted-foreground">{new Date(alloc.allocatedAt).toLocaleDateString()}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs font-semibold tabular-nums text-primary">{formatAmount(alloc.amount)}</p>
                        {alloc.percentage > 0 && (
                          <Badge className="text-[9px] font-medium rounded-full px-1.5 py-0" style={{ backgroundColor: 'color-mix(in srgb, var(--secondary) 8%, transparent)', color: 'var(--secondary)', border: '1px solid color-mix(in srgb, var(--secondary) 12%, transparent)' }}>{alloc.percentage}%</Badge>
                        )}
                      </div>
                    </div>
                    {alloc.personalNote && (
                      <p className="text-[10px] truncate text-muted-foreground">{alloc.personalNote}</p>
                    )}
                  </div>
                ))}
              </div>

              {/* Desktop Table */}
              <div className="hidden sm:block max-h-96 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-b border-border">
                    <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground" >{t('biz.cashDate')}</TableHead>
                    <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground" >{t('biz.saleDescription')}</TableHead>
                    <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-right text-muted-foreground" >{t('biz.debtAmount')}</TableHead>
                    <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-right text-muted-foreground" >{t('biz.allocationPercent')}</TableHead>
                    <TableHead className="text-[10px] font-semibold uppercase tracking-wider hidden sm:table-cell text-muted-foreground" >{t('biz.customerNotes')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allocations.map((alloc, idx) => (
                    <TableRow
                      key={alloc.id}
                      className="transition-colors duration-150"
                      style={{
                        background: idx % 2 === 1 ? 'rgba(255,255,255,0.015)' : 'transparent',
                        borderBottom: '1px solid var(--border)',
                      }}
                    >
                      <TableCell className="text-xs py-2.5 tabular-nums text-muted-foreground" >
                        {new Date(alloc.allocatedAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="py-2.5">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-1.5 rounded-full shrink-0" style={{ backgroundColor: 'var(--primary)' }} />
                          <span className="text-xs font-medium max-w-[180px] truncate text-foreground" >
                            {alloc.sale?.description || '-'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-right font-semibold py-2.5 tabular-nums text-primary" >
                        {formatAmount(alloc.amount)}
                      </TableCell>
                      <TableCell className="py-2.5 text-right">
                        {alloc.percentage > 0 ? (
                          <Badge className="text-[9px] font-medium rounded-full px-1.5 py-0" style={{ backgroundColor: 'color-mix(in srgb, var(--secondary) 8%, transparent)', color: 'var(--secondary)', border: '1px solid color-mix(in srgb, var(--secondary) 12%, transparent)' }}>
                            {alloc.percentage}%
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground" >-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs py-2.5 max-w-[150px] truncate hidden sm:table-cell text-muted-foreground" >
                        {alloc.personalNote || '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Add Allocation Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="rounded-xl w-[95vw] sm:max-w-[460px] bg-card border border-border">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold flex items-center gap-2 text-foreground" >
              <div className="h-7 w-7 rounded-lg flex items-center justify-center bg-secondary/12">
                <ArrowDownToLine className="h-3.5 w-3.5 text-secondary" />
              </div>
              {t('biz.autoAllocation')}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground" >
              {t('biz.allocatedFrom')}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSave} className="space-y-3 mt-1">
            <div className="space-y-1.5">
              <Label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground" >{t('biz.saleDescription')}</Label>
              <Select value={formData.saleId} onValueChange={(v) => setFormData({ ...formData, saleId: v })}>
                <SelectTrigger className="text-sm rounded-lg bg-card border border-border text-foreground">
                  <SelectValue placeholder={t('biz.saleDescription')} />
                </SelectTrigger>
                <SelectContent>
                  {sales.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.description} — {formatAmount(s.amount)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Installment split note */}
            {isInstallment && selectedSale && (
              <div className="flex items-start gap-2 p-2.5 rounded-lg" style={{ background: 'color-mix(in srgb, var(--warning) 3%, transparent)', border: '1px solid color-mix(in srgb, var(--warning) 12%, transparent)' }}>
                <Lightbulb className="h-3.5 w-3.5 shrink-0 mt-0.5 text-warning" />
                <div className="text-[10px] leading-relaxed text-muted-foreground" >
                  <p className="font-medium mb-1 text-warning" >Penjualan Cicilan</p>
                  <p>Alokasi dari cicilan akan dibagi: DP saat penjualan, sisanya per tempo cicilan.</p>
                  {selectedSale.downPayment != null && (
                    <div className="mt-1.5 space-y-0.5">
                      <p className="text-foreground" >• DP: {formatAmount(selectedSale.downPayment)}</p>
                      {selectedSale.installmentAmount && selectedSale.installmentTempo && (
                        <p className="text-foreground" >• Cicilan: {formatAmount(selectedSale.installmentAmount)} × {selectedSale.installmentTempo} tempo</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground" >{t('biz.allocationPercent')}</Label>
                <Input
                  type="number"
                  value={formData.percentage}
                  onChange={(e) => setFormData({ ...formData, percentage: e.target.value })}
                  placeholder="0"
                  min="0"
                  max="100"
                  className="text-sm rounded-lg tabular-nums bg-card border border-border text-foreground"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground" >{t('biz.allocationFixed')}</Label>
                <Input
                  type="number"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  placeholder="0"
                  min="0"
                  className="text-sm rounded-lg tabular-nums bg-card border border-border text-foreground"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground" >{t('biz.customerNotes')}</Label>
              <Textarea
                value={formData.personalNote}
                onChange={(e) => setFormData({ ...formData, personalNote: e.target.value })}
                placeholder={t('biz.customerNotes')}
                className="text-sm rounded-lg resize-none min-h-[60px] bg-card border border-border text-foreground"
              />
            </div>

            <DialogFooter className="gap-2 pt-1">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
                className="rounded-lg text-xs"
                style={{ borderColor: 'var(--border)', color: 'var(--foreground)' }}
              >
                {t('common.cancel')}
              </Button>
              <Button
                type="submit"
                disabled={saving || (!formData.amount && !formData.percentage)}
                className="rounded-lg text-xs"
                style={{ backgroundColor: 'var(--primary)', color: '#000' }}
              >
                {saving && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                {t('common.save')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
