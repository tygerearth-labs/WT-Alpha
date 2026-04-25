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
  Percent, DollarSign, Receipt, Layers, ArrowUpRight,
} from 'lucide-react';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.07, delayChildren: 0.05 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' as const } },
};

const cardHover = {
  rest: { scale: 1 },
  hover: { scale: 1.02, transition: { duration: 0.2 } },
};

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

/* ------------------------------------------------------------------ */
/*  Allocation Visual Bar                                               */
/* ------------------------------------------------------------------ */

function AllocationBar({ allocations, totalSales }: { allocations: Allocation[]; totalSales: number }) {
  const totalAllocated = allocations.reduce((s, a) => s + a.amount, 0);
  const pct = totalSales > 0 ? Math.min((totalAllocated / totalSales) * 100, 100) : 0;

  const barSegments = allocations.slice(0, 5).map((a, i) => ({
    width: a.percentage || 0,
    color: ['#BB86FC', '#03DAC6', '#FFD700', '#CF6679', '#FF8A65'][i % 5],
  }));

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs">
        <span className="text-white/50">Total Allocated vs Total Sales</span>
        <span className="text-white/70 font-medium">{pct.toFixed(1)}%</span>
      </div>
      <div className="h-3 rounded-full bg-white/[0.04] overflow-hidden flex">
        {barSegments.map((seg, i) => (
          <motion.div
            key={i}
            initial={{ width: 0 }}
            animate={{ width: `${seg.width}%` }}
            transition={{ duration: 0.6, delay: i * 0.15, ease: 'easeOut' as const }}
            className="h-full"
            style={{ backgroundColor: seg.color, opacity: 0.8 }}
          />
        ))}
        {pct < 100 && totalSales > 0 && (
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${100 - pct}%` }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="h-full bg-white/[0.04]"
          />
        )}
      </div>
      <div className="flex items-center justify-between text-[10px] text-white/40">
        <span>{allocations.length} allocations</span>
        <span>{totalSales > 0 ? `${pct.toFixed(0)}% of sales` : 'No sales data'}</span>
      </div>
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

  const statCards = [
    { label: t('biz.totalAllocated'), value: formatAmount(totalAllocated), icon: DollarSign, color: '#BB86FC', gradient: 'from-[#BB86FC]/20 to-[#BB86FC]/5' },
    { label: t('biz.allocationPercent'), value: `${avgPercentage.toFixed(1)}%`, icon: Percent, color: '#03DAC6', gradient: 'from-[#03DAC6]/20 to-[#03DAC6]/5' },
    { label: 'Total Sales', value: formatAmount(totalSales), icon: TrendingUp, color: '#FFD700', gradient: 'from-[#FFD700]/20 to-[#FFD700]/5' },
    { label: 'Total Allocations', value: allocations.length, icon: Layers, color: '#CF6679', gradient: 'from-[#CF6679]/20 to-[#CF6679]/5' },
  ];

  if (!businessId) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-white/50 text-center">{t('biz.registerFirst')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <motion.div variants={containerVariants} initial="hidden" animate="visible">
        {/* Header */}
        <motion.div variants={itemVariants} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-[#BB86FC]/15 flex items-center justify-center">
              <ArrowDownToLine className="h-4 w-4 text-[#BB86FC]" />
            </div>
            {t('biz.autoAllocation')}
          </h2>
          <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>
            <Button onClick={openCreateDialog} size="sm" className="bg-gradient-to-r from-[#BB86FC] to-[#9B6FDB] text-black hover:opacity-90 shadow-lg shadow-[#BB86FC]/20">
              <Plus className="h-4 w-4 mr-1" />
              {t('common.add')}
            </Button>
          </motion.div>
        </motion.div>

        {/* Summary Stat Cards */}
        {!loading && (
          <motion.div variants={itemVariants} className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
            {statCards.map((card, idx) => (
              <motion.div
                key={idx}
                variants={cardHover}
                initial="rest"
                whileHover="hover"
              >
                <Card className={cn('relative overflow-hidden rounded-2xl border-white/[0.06] bg-gradient-to-br', card.gradient)}>
                  <div className="absolute top-0 right-0 h-20 w-20 rounded-full opacity-10 blur-2xl" style={{ backgroundColor: card.color }} />
                  <CardContent className="p-4 relative">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="h-8 w-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${card.color}20` }}>
                        <card.icon className="h-4 w-4" style={{ color: card.color }} />
                      </div>
                    </div>
                    <p className="text-[10px] text-white/50 uppercase tracking-wider">{card.label}</p>
                    <p className="text-lg font-bold text-white mt-0.5">{card.value}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        )}

        {/* Visual Allocation Bar */}
        {!loading && allocations.length > 0 && (
          <motion.div variants={itemVariants} className="mt-4">
            <Card className="bg-[#1A1A2E] border border-white/[0.06] rounded-2xl">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-4">
                  <div className="h-7 w-7 rounded-lg bg-[#BB86FC]/15 flex items-center justify-center">
                    <Wallet className="h-3.5 w-3.5 text-[#BB86FC]" />
                  </div>
                  <h3 className="text-sm font-semibold text-white">{t('biz.autoAllocation')}</h3>
                  <Badge className="bg-[#BB86FC]/20 text-[#BB86FC] border-[#BB86FC]/20 text-[10px] ml-auto">
                    {allocations.length} records
                  </Badge>
                </div>
                <AllocationBar allocations={allocations} totalSales={totalSales} />
                {latestAlloc && (
                  <div className="mt-4 pt-3 border-t border-white/[0.04] flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-[#03DAC6]/15 flex items-center justify-center shrink-0">
                      <ArrowUpRight className="h-3.5 w-3.5 text-[#03DAC6]" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-white/40">Latest Allocation</p>
                      <p className="text-xs text-white/80 font-medium truncate">{latestAlloc.sale?.description || 'Manual allocation'}</p>
                    </div>
                    <p className="text-xs text-[#BB86FC] font-semibold ml-auto">{formatAmount(latestAlloc.amount)}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Config Card */}
        <motion.div variants={itemVariants} className="mt-4">
          <Card className="bg-[#1A1A2E] border border-white/[0.06] rounded-2xl overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-4">
                <div className="h-7 w-7 rounded-lg bg-[#FFD700]/15 flex items-center justify-center">
                  <Percent className="h-3.5 w-3.5 text-[#FFD700]" />
                </div>
                <h3 className="text-sm font-semibold text-white">Allocation Config</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <motion.div variants={cardHover} initial="rest" whileHover="hover">
                  <div className="bg-gradient-to-br from-white/[0.04] to-white/[0.01] rounded-xl p-4 border border-white/[0.04]">
                    <p className="text-[10px] text-white/40 uppercase tracking-wider">{t('biz.allocationPercent')}</p>
                    <p className="text-2xl font-bold text-white mt-1">
                      {allocations.length > 0 ? `${avgPercentage.toFixed(1)}%` : '-'}
                    </p>
                    <p className="text-[10px] text-white/30 mt-1">Average allocation percentage</p>
                  </div>
                </motion.div>
                <motion.div variants={cardHover} initial="rest" whileHover="hover">
                  <div className="bg-gradient-to-br from-[#BB86FC]/10 to-[#BB86FC]/[0.02] rounded-xl p-4 border border-[#BB86FC]/10">
                    <p className="text-[10px] text-white/40 uppercase tracking-wider">{t('biz.allocationFixed')}</p>
                    <p className="text-2xl font-bold text-[#BB86FC] mt-1">
                      {totalAllocated > 0 ? formatAmount(totalAllocated / Math.max(allocations.length, 1)) : '-'}
                    </p>
                    <p className="text-[10px] text-white/30 mt-1">Average fixed amount</p>
                  </div>
                </motion.div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* History Table */}
        <motion.div variants={itemVariants} className="mt-4">
          <Card className="bg-[#1A1A2E] border border-white/[0.06] rounded-2xl overflow-hidden">
            <CardContent className="p-0">
              <div className="flex items-center gap-2 p-4 border-b border-white/[0.04]">
                <div className="h-7 w-7 rounded-lg bg-[#03DAC6]/15 flex items-center justify-center">
                  <History className="h-3.5 w-3.5 text-[#03DAC6]" />
                </div>
                <h3 className="text-sm font-semibold text-white">{t('laporan.history')}</h3>
                <Badge className="bg-[#BB86FC]/20 text-[#BB86FC] border-[#BB86FC]/20 text-[10px] ml-auto">
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
                <div className="flex flex-col items-center justify-center py-20 text-white/40">
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.5 }}
                    className="relative"
                  >
                    <div className="h-16 w-16 rounded-2xl bg-[#BB86FC]/10 flex items-center justify-center">
                      <ArrowDownToLine className="h-8 w-8 text-[#BB86FC]/40" />
                    </div>
                    <div className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-[#03DAC6]/20 flex items-center justify-center">
                      <Plus className="h-3 w-3 text-[#03DAC6]" />
                    </div>
                  </motion.div>
                  <p className="text-sm mt-4">{t('biz.noBizData')}</p>
                  <p className="text-xs mt-1 text-white/25">Create your first allocation to get started</p>
                </div>
              ) : (
                <div className="max-h-[400px] overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-white/[0.06] hover:bg-transparent bg-white/[0.01]">
                        <TableHead className="text-white/50 text-xs font-medium">{t('biz.cashDate')}</TableHead>
                        <TableHead className="text-white/50 text-xs font-medium">{t('biz.saleDescription')}</TableHead>
                        <TableHead className="text-white/50 text-xs font-medium text-right">{t('biz.debtAmount')}</TableHead>
                        <TableHead className="text-white/50 text-xs font-medium text-right">{t('biz.allocationPercent')}</TableHead>
                        <TableHead className="text-white/50 text-xs font-medium hidden sm:table-cell">{t('biz.customerNotes')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <AnimatePresence>
                        {allocations.map((alloc, idx) => (
                          <motion.tr
                            key={alloc.id}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.03, duration: 0.3 }}
                            className={cn(
                              'border-white/[0.04] transition-colors duration-150 group',
                              idx % 2 === 0 ? 'bg-transparent' : 'bg-white/[0.015]',
                              'hover:bg-white/[0.04]'
                            )}
                          >
                            <TableCell className="text-white/70 text-xs py-3">
                              {new Date(alloc.allocatedAt).toLocaleDateString()}
                            </TableCell>
                            <TableCell className="py-3">
                              <div className="flex items-center gap-2">
                                <div className="h-1.5 w-1.5 rounded-full bg-[#BB86FC] shrink-0" />
                                <span className="text-white text-xs font-medium max-w-[180px] truncate">
                                  {alloc.sale?.description || '-'}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="text-xs text-right font-semibold py-3 text-[#BB86FC]">
                              {formatAmount(alloc.amount)}
                            </TableCell>
                            <TableCell className="py-3 text-right">
                              {alloc.percentage > 0 ? (
                                <Badge className="bg-[#03DAC6]/15 text-[#03DAC6] border-[#03DAC6]/20 text-[10px] font-medium">
                                  {alloc.percentage}%
                                </Badge>
                              ) : (
                                <span className="text-white/30 text-xs">-</span>
                              )}
                            </TableCell>
                            <TableCell className="text-white/40 text-xs py-3 max-w-[150px] truncate hidden sm:table-cell">
                              {alloc.personalNote || '-'}
                            </TableCell>
                          </motion.tr>
                        ))}
                      </AnimatePresence>
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>

      {/* Add Allocation Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-[#1A1A2E] border border-white/[0.06] text-white sm:max-w-[460px] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-[#03DAC6]/20 flex items-center justify-center">
                <ArrowDownToLine className="h-3.5 w-3.5 text-[#03DAC6]" />
              </div>
              {t('biz.autoAllocation')}
            </DialogTitle>
            <DialogDescription className="text-white/60">
              {t('biz.allocatedFrom')}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-white/80 text-xs">{t('biz.saleDescription')}</Label>
              <Select value={formData.saleId} onValueChange={(v) => setFormData({ ...formData, saleId: v })}>
                <SelectTrigger className="bg-white/[0.04] border-white/[0.08] text-white rounded-xl">
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
                <Label className="text-white/80 text-xs">{t('biz.allocationPercent')}</Label>
                <Input
                  type="number"
                  value={formData.percentage}
                  onChange={(e) => setFormData({ ...formData, percentage: e.target.value })}
                  placeholder="0"
                  min="0"
                  max="100"
                  className="bg-white/[0.04] border-white/[0.08] text-white placeholder:text-white/30 rounded-xl focus:border-[#BB86FC]/40"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-white/80 text-xs">{t('biz.allocationFixed')}</Label>
                <Input
                  type="number"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  placeholder="0"
                  min="0"
                  className="bg-white/[0.04] border-white/[0.08] text-white placeholder:text-white/30 rounded-xl focus:border-[#BB86FC]/40"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-white/80 text-xs">{t('biz.customerNotes')}</Label>
              <Textarea
                value={formData.personalNote}
                onChange={(e) => setFormData({ ...formData, personalNote: e.target.value })}
                placeholder={t('biz.customerNotes')}
                className="bg-white/[0.04] border-white/[0.08] text-white placeholder:text-white/30 min-h-[60px] rounded-xl focus:border-[#BB86FC]/40"
              />
            </div>

            <DialogFooter className="gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
                className="border-white/[0.1] text-white hover:bg-white/10 rounded-xl"
              >
                {t('common.cancel')}
              </Button>
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button
                  type="submit"
                  disabled={saving || (!formData.amount && !formData.percentage)}
                  className="bg-gradient-to-r from-[#BB86FC] to-[#9B6FDB] text-black hover:opacity-90 rounded-xl shadow-lg shadow-[#BB86FC]/20"
                >
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {t('common.save')}
                </Button>
              </motion.div>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
