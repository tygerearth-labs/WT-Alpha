'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
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
import {
  Plus,
  Pencil,
  Trash2,
  Wallet,
  PiggyBank,
  ArrowDownToLine,
  TrendingUp,
  Receipt,
  Calculator,
  CircleDollarSign,
  Inbox,
  Banknote,
  FileText,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, parseISO } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';

const CASH_TYPES = {
  kas_besar: {
    label: 'biz.kasBesar',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/15',
    hoverBg: 'bg-emerald-500 hover:bg-emerald-600',
    icon: Wallet,
    gradient: 'from-emerald-500/20 via-emerald-500/5 to-transparent',
    accentDot: 'bg-emerald-400',
    ringColor: 'ring-emerald-500/30',
  },
  kas_kecil: {
    label: 'biz.kasKecil',
    color: 'text-[#03DAC6]',
    bg: 'bg-[#03DAC6]/15',
    hoverBg: 'bg-[#03DAC6] hover:bg-[#03DAC6]/90',
    icon: PiggyBank,
    gradient: 'from-[#03DAC6]/20 via-[#03DAC6]/5 to-transparent',
    accentDot: 'bg-[#03DAC6]',
    ringColor: 'ring-[#03DAC6]/30',
  },
  kas_keluar: {
    label: 'biz.kasKeluar',
    color: 'text-[#CF6679]',
    bg: 'bg-[#CF6679]/15',
    hoverBg: 'bg-[#CF6679] hover:bg-[#CF6679]/90',
    icon: ArrowDownToLine,
    gradient: 'from-[#CF6679]/20 via-[#CF6679]/5 to-transparent',
    accentDot: 'bg-[#CF6679]',
    ringColor: 'ring-[#CF6679]/30',
  },
} as const;

interface CashEntry {
  id: string;
  description: string;
  amount: number;
  date: string;
  type: 'kas_besar' | 'kas_kecil' | 'kas_keluar';
  category: string | null;
  notes?: string;
}

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.07, delayChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } },
};

const cardPopVariants = {
  hidden: { opacity: 0, scale: 0.92, y: 12 },
  show: { opacity: 1, scale: 1, y: 0, transition: { type: 'spring', stiffness: 260, damping: 22 } },
};

function formatDate(dateStr: string): string {
  try {
    const parsed = parseISO(dateStr);
    return format(parsed, 'd MMM yyyy', { locale: idLocale });
  } catch {
    return new Date(dateStr).toLocaleDateString();
  }
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

  const averagePerTransaction = useMemo(() => {
    if (filtered.length === 0) return 0;
    const sum = filtered.reduce((acc, e) => acc + e.amount, 0);
    return sum / filtered.length;
  }, [filtered]);

  // Get counts per type
  const typeCounts = useMemo(() => {
    return {
      kas_besar: entries.filter((e) => e.type === 'kas_besar').length,
      kas_kecil: entries.filter((e) => e.type === 'kas_kecil').length,
      kas_keluar: entries.filter((e) => e.type === 'kas_keluar').length,
    };
  }, [entries]);

  // Formatted nominal preview
  const formattedNominal = useMemo(() => {
    const num = parseFloat(formData.amount);
    if (isNaN(num) || num <= 0) return '';
    return formatAmount(num);
  }, [formData.amount, formatAmount]);

  if (!businessId) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="flex flex-col items-center justify-center min-h-[400px] gap-3"
      >
        <div className="h-16 w-16 rounded-2xl bg-white/[0.04] flex items-center justify-center">
          <Banknote className="h-8 w-8 text-white/20" />
        </div>
        <p className="text-white/40 text-center text-sm">{t('biz.registerFirst')}</p>
      </motion.div>
    );
  }

  const summaryCards = [
    {
      icon: CircleDollarSign,
      label: 'Total Saldo',
      value: formatAmount(total),
      valueColor: total >= 0 ? typeConfig.color : 'text-[#CF6679]',
      gradient: typeConfig.gradient,
      accentDot: typeConfig.accentDot,
    },
    {
      icon: Receipt,
      label: 'Jumlah Transaksi',
      value: filtered.length.toString(),
      valueColor: 'text-white',
      gradient: 'from-[#BB86FC]/20 via-[#BB86FC]/5 to-transparent',
      accentDot: 'bg-[#BB86FC]',
    },
    {
      icon: Calculator,
      label: 'Rata-rata / Transaksi',
      value: filtered.length > 0 ? formatAmount(averagePerTransaction) : '-',
      valueColor: 'text-[#FFD700]',
      gradient: 'from-[#FFD700]/20 via-[#FFD700]/5 to-transparent',
      accentDot: 'bg-[#FFD700]',
    },
  ];

  return (
    <div className="space-y-5">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        {/* Tab Bar + Add Button */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
          <TabsList className="bg-white/[0.03] border border-white/[0.06] h-auto p-1 rounded-xl">
            {(Object.keys(CASH_TYPES) as Array<keyof typeof CASH_TYPES>).map((key) => {
              const cfg = CASH_TYPES[key];
              const Icon = cfg.icon;
              const isActive = activeTab === key;
              return (
                <TabsTrigger
                  key={key}
                  value={key}
                  className={cn(
                    'relative text-white/50 data-[state=active]:shadow-none transition-all duration-200 rounded-lg px-3 py-2 text-xs font-medium',
                    'hover:text-white/70',
                    isActive && `${cfg.bg} ${cfg.color} shadow-sm`
                  )}
                >
                  <span className="flex items-center gap-1.5">
                    <Icon className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">{t(cfg.label)}</span>
                    <span className="sm:hidden">{t(cfg.label).replace('Kas ', '')}</span>
                    {typeCounts[key] > 0 && (
                      <Badge
                        className={cn(
                          'ml-1 h-4 min-w-[18px] px-1 text-[10px] font-bold border-0',
                          isActive
                            ? 'bg-white/20 text-current'
                            : 'bg-white/[0.06] text-white/40'
                        )}
                      >
                        {typeCounts[key]}
                      </Badge>
                    )}
                  </span>
                </TabsTrigger>
              );
            })}
          </TabsList>

          <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
            <Button
              onClick={openCreateDialog}
              size="sm"
              className={cn(
                'text-white border-0 shadow-lg shadow-black/20',
                typeConfig.hoverBg,
                'transition-all duration-200'
              )}
            >
              <Plus className="h-4 w-4 mr-1.5" />
              {t('common.add')}
            </Button>
          </motion.div>
        </div>

        <TabsContent value={activeTab} className="mt-0 space-y-5">
          {/* Summary Cards */}
          <motion.div
            className="grid grid-cols-1 sm:grid-cols-3 gap-3"
            variants={containerVariants}
            initial="hidden"
            animate="show"
          >
            {summaryCards.map((card) => {
              const CardIcon = card.icon;
              return (
                <motion.div key={card.label} variants={cardPopVariants}>
                  <Card className="bg-[#1A1A2E] border border-white/[0.06] rounded-xl overflow-hidden shadow-lg shadow-black/20 hover:shadow-xl hover:shadow-black/30 transition-shadow duration-300">
                    {/* Gradient header strip */}
                    <div className={cn('h-1 bg-gradient-to-r', card.gradient)} />
                    <CardContent className="p-4 flex items-center gap-3">
                      <div className="relative">
                        <div className="h-10 w-10 rounded-xl bg-white/[0.04] flex items-center justify-center">
                          <CardIcon className={cn('h-5 w-5', card.valueColor)} />
                        </div>
                        <div className={cn('absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full', card.accentDot)} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white/40 text-xs font-medium truncate">{card.label}</p>
                        <p className={cn('text-sm font-bold truncate mt-0.5', card.valueColor)}>
                          {card.value}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </motion.div>

          {/* Current Total */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.3 }}
            className="flex items-center gap-2"
          >
            <div className={cn('h-2 w-2 rounded-full', typeConfig.accentDot)} />
            <span className="text-white/50 text-sm">{t('common.total')}:</span>
            <span className={cn('text-lg font-bold', typeConfig.color)}>
              {formatAmount(total)}
            </span>
          </motion.div>

          {/* Table Card */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.4 }}
          >
            <Card className="bg-[#1A1A2E] border border-white/[0.06] rounded-xl shadow-lg shadow-black/20 overflow-hidden">
              {/* Gradient header strip */}
              <div className={cn('h-0.5 bg-gradient-to-r', typeConfig.gradient)} />
              <CardContent className="p-0">
                {loading ? (
                  <div className="space-y-3 p-5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Skeleton key={i} className="h-12 rounded-lg bg-white/[0.06]" />
                    ))}
                  </div>
                ) : filtered.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 px-4">
                    <motion.div
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ type: 'spring', stiffness: 200, damping: 18, delay: 0.1 }}
                    >
                      <div className="relative mb-4">
                        <div className="h-20 w-20 rounded-2xl bg-white/[0.03] flex items-center justify-center">
                          <Inbox className="h-9 w-9 text-white/15" />
                        </div>
                        <motion.div
                          className={cn('absolute -top-1 -right-1 h-3 w-3 rounded-full', typeConfig.accentDot)}
                          animate={{ scale: [1, 1.3, 1], opacity: [0.6, 1, 0.6] }}
                          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                        />
                      </div>
                    </motion.div>
                    <p className="text-white/30 text-sm font-medium mb-1">Belum ada transaksi</p>
                    <p className="text-white/20 text-xs text-center max-w-[240px]">
                      Mulai tambahkan catatan {t(CASH_TYPES[activeTab as keyof typeof CASH_TYPES]?.label || 'biz.kasBesar').toLowerCase()} pertama Anda
                    </p>
                  </div>
                ) : (
                  <div className="max-h-[500px] overflow-y-auto custom-scrollbar">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-white/[0.06] hover:bg-transparent">
                          <TableHead className="text-white/40 text-[11px] font-semibold uppercase tracking-wider">{t('biz.cashDate')}</TableHead>
                          <TableHead className="text-white/40 text-[11px] font-semibold uppercase tracking-wider">{t('biz.cashDescription')}</TableHead>
                          <TableHead className="text-white/40 text-[11px] font-semibold uppercase tracking-wider hidden sm:table-cell">{t('biz.cashCategory')}</TableHead>
                          <TableHead className="text-white/40 text-[11px] font-semibold uppercase tracking-wider text-right">{t('biz.cashAmount')}</TableHead>
                          <TableHead className="w-24" />
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <AnimatePresence mode="popLayout">
                          {filtered.map((entry, index) => {
                            const isExpense = activeTab === 'kas_keluar';
                            const amountColor = isExpense ? 'text-[#CF6679]' : 'text-[#03DAC6]';
                            return (
                              <motion.tr
                                key={entry.id}
                                variants={itemVariants}
                                initial="hidden"
                                animate="show"
                                exit={{ opacity: 0, x: -20, transition: { duration: 0.2 } }}
                                transition={{ delay: index * 0.04 }}
                                className="border-white/[0.04] hover:bg-white/[0.03] transition-colors duration-150 group"
                              >
                                <TableCell className="text-white/50 text-xs py-3.5">
                                  {formatDate(entry.date)}
                                </TableCell>
                                <TableCell className="text-white text-xs py-3.5 font-medium max-w-[200px] truncate">
                                  <span className="flex items-center gap-2">
                                    {isExpense ? (
                                      <ArrowDownToLine className="h-3.5 w-3.5 text-[#CF6679]/50 shrink-0" />
                                    ) : (
                                      <TrendingUp className="h-3.5 w-3.5 text-[#03DAC6]/50 shrink-0" />
                                    )}
                                    <span className="truncate">{entry.description}</span>
                                  </span>
                                </TableCell>
                                <TableCell className="py-3.5 hidden sm:table-cell">
                                  {entry.category ? (
                                    <Badge
                                      variant="outline"
                                      className={cn(
                                        'text-[11px] font-normal border-0 rounded-md',
                                        typeConfig.bg,
                                        typeConfig.color
                                      )}
                                    >
                                      {entry.category}
                                    </Badge>
                                  ) : (
                                    <span className="text-white/20 text-xs">-</span>
                                  )}
                                </TableCell>
                                <TableCell className={cn('text-xs text-right font-bold py-3.5 tabular-nums', amountColor)}>
                                  {isExpense ? '-' : '+'}{formatAmount(entry.amount)}
                                </TableCell>
                                <TableCell className="py-3.5 text-right">
                                  <div className="flex items-center justify-end gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                                    <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-8 w-8 p-0 text-white/30 hover:text-[#BB86FC] hover:bg-[#BB86FC]/10"
                                        onClick={() => openEditDialog(entry)}
                                      >
                                        <Pencil className="h-3.5 w-3.5" />
                                      </Button>
                                    </motion.div>
                                    <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-8 w-8 p-0 text-white/30 hover:text-[#CF6679] hover:bg-[#CF6679]/10"
                                        onClick={() => setDeleteId(entry.id)}
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </Button>
                                    </motion.div>
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
          </motion.div>
        </TabsContent>
      </Tabs>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-[#1A1A2E] border border-white/[0.06] text-white sm:max-w-[440px] overflow-hidden">
          {/* Gradient top accent */}
          <div className={cn('absolute top-0 left-0 right-0 h-1 bg-gradient-to-r', typeConfig.gradient)} />

          <DialogHeader className="pt-2">
            <DialogTitle className="text-white flex items-center gap-2">
              {(() => {
                const Icon = CASH_TYPES[formData.type as keyof typeof CASH_TYPES]?.icon || Wallet;
                return <Icon className="h-5 w-5 text-white/60" />;
              })()}
              {editingEntry ? t('common.edit') : t('biz.addCashEntry')}
            </DialogTitle>
            <DialogDescription className="text-white/50">
              {t(CASH_TYPES[formData.type as keyof typeof CASH_TYPES]?.label || 'biz.kasBesar')}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-white/70 text-xs font-medium">{t('biz.cashDescription')} *</Label>
              <Input
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder={t('biz.cashDescription')}
                className="bg-white/[0.05] border-white/[0.08] text-white placeholder:text-white/20 focus:border-white/20 transition-colors rounded-lg h-10"
              />
            </div>

            {/* Nominal Input with Preview */}
            <div className="space-y-2">
              <Label className="text-white/70 text-xs font-medium">{t('biz.cashAmount')} *</Label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20 text-sm font-medium pointer-events-none">
                  Rp
                </div>
                <Input
                  type="number"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  placeholder="0"
                  min="0"
                  className="bg-white/[0.05] border-white/[0.08] text-white placeholder:text-white/20 focus:border-white/20 transition-colors rounded-lg h-10 pl-9 tabular-nums"
                />
              </div>
              {/* Live formatted preview */}
              <AnimatePresence mode="wait">
                {formattedNominal && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.15 }}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.04]"
                  >
                    <FileText className="h-3.5 w-3.5 text-white/30 shrink-0" />
                    <span className={cn('text-sm font-semibold', typeConfig.color)}>
                      {formattedNominal}
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="space-y-2">
              <Label className="text-white/70 text-xs font-medium">{t('biz.cashDate')} *</Label>
              <Input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="bg-white/[0.05] border-white/[0.08] text-white focus:border-white/20 transition-colors rounded-lg h-10"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-white/70 text-xs font-medium">{t('biz.cashCategory')}</Label>
              <Input
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                placeholder={t('biz.cashCategory')}
                className="bg-white/[0.05] border-white/[0.08] text-white placeholder:text-white/20 focus:border-white/20 transition-colors rounded-lg h-10"
              />
            </div>

            <DialogFooter className="gap-2 pt-2">
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                  className="border-white/[0.08] text-white/60 hover:bg-white/[0.05] hover:text-white transition-colors"
                >
                  {t('common.cancel')}
                </Button>
              </motion.div>
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button
                  type="submit"
                  disabled={saving || !formData.description || !formData.amount}
                  className={cn(
                    'text-white border-0 shadow-md shadow-black/20 disabled:opacity-40',
                    typeConfig.hoverBg,
                    'transition-all duration-200'
                  )}
                >
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {t('common.save')}
                </Button>
              </motion.div>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent className="bg-[#1A1A2E] border border-white/[0.06] text-white rounded-xl overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#CF6679]/30 via-[#CF6679]/10 to-transparent" />
          <AlertDialogHeader className="pt-2">
            <AlertDialogTitle className="text-white flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-[#CF6679]/10 flex items-center justify-center">
                <Trash2 className="h-4 w-4 text-[#CF6679]" />
              </div>
              {t('common.delete')}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-white/50 pl-10">
              {t('kas.deleteDesc')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 pt-2">
            <AlertDialogCancel className="border-white/[0.08] text-white/60 hover:bg-white/[0.05] hover:text-white transition-colors">
              {t('common.cancel')}
            </AlertDialogCancel>
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-[#CF6679] hover:bg-[#CF6679]/90 text-white border-0 shadow-md shadow-[#CF6679]/20 transition-colors"
              >
                {t('common.delete')}
              </AlertDialogAction>
            </motion.div>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Custom scrollbar styles */}
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,0.08);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255,255,255,0.15);
        }
      `}</style>
    </div>
  );
}
