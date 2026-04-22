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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Plus, Pencil, Trash2, Wallet, PiggyBank, ArrowDownToLine } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

const CASH_TYPES = {
  kas_besar: { label: 'biz.kasBesar', color: 'text-green-400', bg: 'bg-green-500/20', hoverBg: 'bg-green-500 hover:bg-green-600', icon: Wallet },
  kas_kecil: { label: 'biz.kasKecil', color: 'text-teal-400', bg: 'bg-teal-500/20', hoverBg: 'bg-teal-500 hover:bg-teal-600', icon: PiggyBank },
  kas_keluar: { label: 'biz.kasKeluar', color: 'text-red-400', bg: 'bg-red-500/20', hoverBg: 'bg-red-500 hover:bg-red-600', icon: ArrowDownToLine },
};

interface CashEntry {
  id: string;
  description: string;
  amount: number;
  date: string;
  type: 'kas_besar' | 'kas_kecil' | 'kas_keluar';
  category: string | null;
  notes?: string;
}

export default function BusinessCash() {
  const { t } = useTranslation();
  const { activeBusiness } = useBusinessStore();
  const { formatAmount } = useCurrencyFormat();
  const [entries, setEntries] = useState<CashEntry[]>([]);
  const [serverTotal, setServerTotal] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>('kas_besar');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<CashEntry | null>(null);
  const [formData, setFormData] = useState<{
    description: string;
    amount: string;
    date: string;
    type: 'kas_besar' | 'kas_kecil' | 'kas_keluar';
    category: string;
    notes: string;
  }>({
    description: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    type: 'kas_besar',
    category: '',
    notes: '',
  });
  const [saving, setSaving] = useState(false);

  const [deleteId, setDeleteId] = useState<string | null>(null);

  const businessId = activeBusiness?.id;

  const fetchEntries = useCallback(() => {
    if (!businessId) return;
    fetch(`/api/business/${businessId}/cash?type=${activeTab}`)
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then((result) => {
        setEntries(result?.cashEntries || []);
        setServerTotal(result?.total || 0);
      })
      .catch(() => setEntries([]))
      .finally(() => setLoading(false));
  }, [businessId, activeTab]);

  useEffect(() => {
    if (businessId) {
      setLoading(true);
      fetchEntries();
    } else {
      setLoading(false);
    }
  }, [businessId, fetchEntries]);

  const openCreateDialog = () => {
    setEditingEntry(null);
    setFormData({
      description: '',
      amount: '',
      date: new Date().toISOString().split('T')[0],
      type: activeTab as 'kas_besar' | 'kas_kecil' | 'kas_keluar',
      category: '',
      notes: '',
    });
    setDialogOpen(true);
  };

  const openEditDialog = (entry: CashEntry) => {
    setEditingEntry(entry);
    setFormData({
      description: entry.description,
      amount: entry.amount.toString(),
      date: entry.date.split('T')[0],
      type: entry.type,
      category: entry.category || '',
      notes: entry.notes || '',
    });
    setDialogOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessId || !formData.description || !formData.amount) return;
    setSaving(true);
    try {
      const url = editingEntry
        ? `/api/business/${businessId}/cash/${editingEntry.id}`
        : `/api/business/${businessId}/cash`;
      const res = await fetch(url, {
        method: editingEntry ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: formData.type,
          amount: parseFloat(formData.amount),
          description: formData.description,
          category: formData.category || undefined,
          date: formData.date,
          notes: formData.notes || undefined,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success(editingEntry ? t('biz.businessUpdated') : t('biz.businessCreated'));
      setDialogOpen(false);
      fetchEntries();
    } catch {
      toast.error(t('common.error'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!businessId || !deleteId) return;
    try {
      const res = await fetch(`/api/business/${businessId}/cash/${deleteId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      toast.success(t('biz.businessUpdated'));
      fetchEntries();
    } catch {
      toast.error(t('common.error'));
    } finally {
      setDeleteId(null);
    }
  };

  const filtered = entries.filter((e) => e.type === activeTab);
  const typeConfig = CASH_TYPES[activeTab as keyof typeof CASH_TYPES] || CASH_TYPES.kas_besar;
  const total = serverTotal;

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
            {(Object.keys(CASH_TYPES) as Array<keyof typeof CASH_TYPES>).map((key) => (
              <TabsTrigger
                key={key}
                value={key}
                className={cn(
                  'text-white/60 data-[state=active]:shadow-none',
                  activeTab === key && `${CASH_TYPES[key].bg} ${CASH_TYPES[key].color}`
                )}
              >
                {t(CASH_TYPES[key].label)}
              </TabsTrigger>
            ))}
          </TabsList>

          <Button
            onClick={openCreateDialog}
            size="sm"
            className={cn('text-white border-0 hover:opacity-90', typeConfig.hoverBg)}
          >
            <Plus className="h-4 w-4 mr-1" />
            {t('common.add')}
          </Button>
        </div>

        <TabsContent value={activeTab} className="mt-0 space-y-4">
          <div className="text-lg font-bold text-white">
            {t('common.total')}: <span className={typeConfig.color}>{formatAmount(total)}</span>
          </div>

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
                  {(() => {
                    const Icon = typeConfig.icon;
                    return <Icon className="h-10 w-10 mb-2 opacity-40" />;
                  })()}
                  <p className="text-sm">{t('biz.noBizData')}</p>
                </div>
              ) : (
                <div className="max-h-[500px] overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-white/[0.06] hover:bg-transparent">
                        <TableHead className="text-white/50 text-xs">{t('biz.cashDate')}</TableHead>
                        <TableHead className="text-white/50 text-xs">{t('biz.cashDescription')}</TableHead>
                        <TableHead className="text-white/50 text-xs hidden sm:table-cell">{t('biz.cashCategory')}</TableHead>
                        <TableHead className="text-white/50 text-xs text-right">{t('biz.cashAmount')}</TableHead>
                        <TableHead className="text-white/50 text-xs w-24" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filtered.map((entry) => (
                        <TableRow key={entry.id} className="border-white/[0.04] hover:bg-white/[0.02]">
                          <TableCell className="text-white/70 text-xs py-3">
                            {new Date(entry.date).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="text-white text-xs py-3 font-medium max-w-[200px] truncate">
                            {entry.description}
                          </TableCell>
                          <TableCell className="py-3 hidden sm:table-cell">
                            {entry.category ? (
                              <Badge variant="outline" className={cn('text-xs font-normal border-0', typeConfig.bg, typeConfig.color)}>
                                {entry.category}
                              </Badge>
                            ) : (
                              <span className="text-white/30 text-xs">-</span>
                            )}
                          </TableCell>
                          <TableCell className={cn('text-xs text-right font-medium py-3', typeConfig.color)}>
                            {activeTab === 'kas_keluar' ? '-' : '+'}{formatAmount(entry.amount)}
                          </TableCell>
                          <TableCell className="py-3 text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-white/40 hover:text-white hover:bg-white/10"
                              onClick={() => openEditDialog(entry)}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-white/40 hover:text-red-400 hover:bg-white/10"
                              onClick={() => setDeleteId(entry.id)}
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
        </TabsContent>
      </Tabs>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-[#1A1A2E] border border-white/[0.06] text-white sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle className="text-white">
              {editingEntry ? t('common.edit') : t('biz.addCashEntry')}
            </DialogTitle>
            <DialogDescription className="text-white/60">
              {t(CASH_TYPES[formData.type as keyof typeof CASH_TYPES]?.label || 'biz.kasBesar')}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-white/80">{t('biz.cashDescription')} *</Label>
              <Input
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder={t('biz.cashDescription')}
                className="bg-white/[0.05] border-white/[0.1] text-white placeholder:text-white/30"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-white/80">{t('biz.cashAmount')} *</Label>
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
              <Label className="text-white/80">{t('biz.cashDate')} *</Label>
              <Input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="bg-white/[0.05] border-white/[0.1] text-white"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-white/80">{t('biz.cashCategory')}</Label>
              <Input
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                placeholder={t('biz.cashCategory')}
                className="bg-white/[0.05] border-white/[0.1] text-white placeholder:text-white/30"
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
                className={cn('text-white border-0', typeConfig.hoverBg)}
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
