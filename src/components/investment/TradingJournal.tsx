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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Plus,
  Pencil,
  Trash2,
  FileSpreadsheet,
  FileText,
  BookOpen,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface JournalEntry {
  id: string;
  portfolioId: string;
  portfolio?: { id: string; symbol: string; type: string };
  type: string;
  entryPrice: number;
  exitPrice?: number;
  quantity: number;
  pnl: number;
  pnlPercentage: number;
  riskReward?: number;
  fees: number;
  notes?: string;
  date: string;
  closedAt?: string;
}

interface PortfolioOption {
  id: string;
  symbol: string;
  type: string;
}

export default function TradingJournal() {
  const { t } = useTranslation();
  const { activeBusiness } = useBusinessStore();
  const { formatAmount } = useCurrencyFormat();

  // Currency formatting based on portfolio asset type
  const getInvCurrencyLabel = (type: string): string => {
    if (type === 'saham') return 'IDR';
    return 'USD';
  };

  const formatInvPrice = (type: string, amount: number): string => {
    if (type === 'saham') {
      return 'Rp' + new Intl.NumberFormat('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);
    }
    return '$' + new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);
  };

  const getSelectedPortfolioType = (): string => {
    const selected = portfolios.find((p) => p.id === form.portfolioId);
    return selected?.type || 'crypto';
  };

  const [journals, setJournals] = useState<JournalEntry[]>([]);
  const [portfolios, setPortfolios] = useState<PortfolioOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [portfolioFilter, setPortfolioFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<JournalEntry | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    portfolioId: '',
    type: 'buy' as string,
    entryPrice: '',
    exitPrice: '',
    quantity: '',
    fees: '',
    riskReward: '',
    pnl: '',
    pnlPercentage: '',
    notes: '',
    date: new Date().toISOString().split('T')[0],
  });

  // Delete dialog
  const [deleteTarget, setDeleteTarget] = useState<JournalEntry | null>(null);

  const businessId = activeBusiness?.id;

  const fetchData = useCallback(() => {
    if (!businessId) return;
    setLoading(true);
    Promise.all([
      fetch(`/api/business/${businessId}/journal`).then((r) => r.json()),
      fetch(`/api/business/${businessId}/portfolio`).then((r) => r.json()),
    ])
      .then(([journalRes, portfolioRes]) => {
        setJournals(journalRes.journals || []);
        const opts: PortfolioOption[] = (portfolioRes.portfolios || []).map(
          (p: { id: string; symbol: string; type: string }) => ({
            id: p.id,
            symbol: p.symbol,
            type: p.type,
          })
        );
        setPortfolios(opts);
      })
      .catch(() => {
        setJournals([]);
        setPortfolios([]);
      })
      .finally(() => setLoading(false));
  }, [businessId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filtered = useMemo(() => {
    return journals.filter((j) => {
      if (portfolioFilter !== 'all' && j.portfolioId !== portfolioFilter) return false;
      if (typeFilter !== 'all' && j.type !== typeFilter) return false;
      if (dateFrom && new Date(j.date) < new Date(dateFrom)) return false;
      if (dateTo && new Date(j.date) > new Date(dateTo + 'T23:59:59')) return false;
      return true;
    });
  }, [journals, portfolioFilter, typeFilter, dateFrom, dateTo]);

  const stats = useMemo(() => {
    const sellTrades = filtered.filter((j) => j.type === 'sell' && j.exitPrice);
    const totalTrades = sellTrades.length;
    const wins = sellTrades.filter((j) => j.pnl > 0).length;
    const winRate = totalTrades > 0 ? (wins / totalTrades) * 100 : 0;
    const avgPnl = totalTrades > 0 ? sellTrades.reduce((s, j) => s + j.pnl, 0) / totalTrades : 0;
    const best = sellTrades.length > 0 ? Math.max(...sellTrades.map((j) => j.pnl)) : 0;
    const worst = sellTrades.length > 0 ? Math.min(...sellTrades.map((j) => j.pnl)) : 0;
    return { totalTrades, winRate, avgPnl, best, worst };
  }, [filtered]);

  const pnlColor = (val: number) => (val >= 0 ? 'text-[#03DAC6]' : 'text-[#CF6679]');

  const getPortfolioSymbol = (id: string) => portfolios.find((p) => p.id === id)?.symbol || '-';

  const resetForm = () => {
    setForm({
      portfolioId: '',
      type: 'buy',
      entryPrice: '',
      exitPrice: '',
      quantity: '',
      fees: '',
      riskReward: '',
      pnl: '',
      pnlPercentage: '',
      notes: '',
      date: new Date().toISOString().split('T')[0],
    });
    setEditing(null);
  };

  const openCreate = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEdit = (item: JournalEntry) => {
    setEditing(item);
    setForm({
      portfolioId: item.portfolioId,
      type: item.type,
      entryPrice: item.entryPrice.toString(),
      exitPrice: item.exitPrice?.toString() || '',
      quantity: item.quantity.toString(),
      fees: item.fees.toString(),
      riskReward: item.riskReward?.toString() || '',
      pnl: item.pnl.toString(),
      pnlPercentage: item.pnlPercentage.toString(),
      notes: item.notes || '',
      date: item.date.split('T')[0],
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!businessId || !form.portfolioId || !form.entryPrice || !form.quantity) return;
    setSaving(true);
    try {
      const url = editing
        ? `/api/business/${businessId}/journal/${editing.id}`
        : `/api/business/${businessId}/journal`;
      const res = await fetch(url, {
        method: editing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          entryPrice: parseFloat(form.entryPrice),
          exitPrice: form.exitPrice ? parseFloat(form.exitPrice) : null,
          quantity: parseFloat(form.quantity),
          fees: form.fees ? parseFloat(form.fees) : 0,
          riskReward: form.riskReward ? parseFloat(form.riskReward) : null,
          pnl: form.pnl ? parseFloat(form.pnl) : 0,
          pnlPercentage: form.pnlPercentage ? parseFloat(form.pnlPercentage) : 0,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success(t('common.success'));
      setDialogOpen(false);
      fetchData();
    } catch {
      toast.error(t('common.error'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!businessId || !deleteTarget) return;
    try {
      const res = await fetch(`/api/business/${businessId}/journal/${deleteTarget.id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error();
      toast.success(t('common.success'));
      setDeleteTarget(null);
      fetchData();
    } catch {
      toast.error(t('common.error'));
    }
  };

  // Export to Excel
  const exportExcel = async () => {
    if (filtered.length === 0) {
      toast.error(t('common.noData'));
      return;
    }
    try {
      const XLSX = await import('xlsx');
      const data = filtered.map((j, i) => ({
        No: i + 1,
        Tipe: j.type === 'buy' ? 'Beli' : 'Jual',
        Symbol: getPortfolioSymbol(j.portfolioId),
        'Harga Masuk': j.entryPrice,
        'Harga Keluar': j.exitPrice || '-',
        Jumlah: j.quantity,
        PnL: j.pnl,
        'PnL %': j.pnlPercentage,
        'Risk/Reward': j.riskReward || '-',
        Biaya: j.fees,
        Tanggal: new Date(j.date).toLocaleDateString('id-ID'),
        Catatan: j.notes || '-',
      }));

      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Trading Journal');
      const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Trading_Journal_${new Date().toISOString().split('T')[0]}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(t('common.success'));
    } catch {
      toast.error(t('common.error'));
    }
  };

  // Export to PDF
  const exportPDF = async () => {
    if (filtered.length === 0) {
      toast.error(t('common.noData'));
      return;
    }
    try {
      const { default: jsPDF } = await import('jspdf');
      const autoTable = (await import('jspdf-autotable')).default;

      const doc = new jsPDF();
      doc.setFontSize(16);
      doc.text('Trading Journal', 14, 20);
      doc.setFontSize(10);
      doc.text(
        `Diekspor: ${new Date().toLocaleDateString('id-ID')} | Total Trade: ${stats.totalTrades} | Win Rate: ${(stats.winRate ?? 0).toFixed(1)}%`,
        14,
        30
      );

      const tableData = filtered.map((j) => [
        j.type === 'buy' ? 'Beli' : 'Jual',
        getPortfolioSymbol(j.portfolioId),
        j.entryPrice.toLocaleString('id-ID'),
        j.exitPrice?.toLocaleString('id-ID') || '-',
        j.quantity,
        j.pnl.toLocaleString('id-ID'),
        `${(j.pnlPercentage ?? 0).toFixed(2)}%`,
        j.riskReward?.toString() || '-',
        j.fees.toLocaleString('id-ID'),
        new Date(j.date).toLocaleDateString('id-ID'),
      ]);

      autoTable(doc, {
        startY: 36,
        head: [['Tipe', 'Symbol', 'H. Masuk', 'H. Keluar', 'Qty', 'PnL', 'PnL%', 'R:R', 'Biaya', 'Tanggal']],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: [187, 134, 252] },
        styles: { fontSize: 8 },
      });

      doc.save(`Trading_Journal_${new Date().toISOString().split('T')[0]}.pdf`);
      toast.success(t('common.success'));
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
      {/* Stats Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <motion.div whileHover={{ y: -2 }} transition={{ type: 'spring', stiffness: 300, damping: 20 }}>
          <Card className="bg-[#1A1A2E] border-white/[0.06]">
            <div className="h-[3px]" style={{ background: 'linear-gradient(90deg, #BB86FC, #03DAC6, #FFD54F)' }} />
            <CardContent className="p-3">
              <p className="text-[13px] font-bold uppercase tracking-wider text-white/40">{t('inv.totalTrades')}</p>
              <p className="text-lg font-bold text-white mt-1">{stats.totalTrades}</p>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div whileHover={{ y: -2 }} transition={{ type: 'spring', stiffness: 300, damping: 20 }}>
          <Card className="bg-[#1A1A2E] border-white/[0.06]">
            <div className="h-[3px]" style={{ background: 'linear-gradient(90deg, #BB86FC, #03DAC6, #FFD54F)' }} />
            <CardContent className="p-3">
              <p className="text-[13px] font-bold uppercase tracking-wider text-white/40">{t('inv.winRate')}</p>
              <p className="text-lg font-bold text-[#BB86FC] mt-1">{(stats.winRate ?? 0).toFixed(1)}%</p>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div whileHover={{ y: -2 }} transition={{ type: 'spring', stiffness: 300, damping: 20 }}>
          <Card className="bg-[#1A1A2E] border-white/[0.06]">
            <div className="h-[3px]" style={{ background: 'linear-gradient(90deg, #BB86FC, #03DAC6, #FFD54F)' }} />
            <CardContent className="p-3">
              <p className="text-[13px] font-bold uppercase tracking-wider text-white/40">{t('inv.avgPnL')}</p>
              <p className={cn('text-lg font-bold mt-1', pnlColor(stats.avgPnl))}>
                {formatAmount(stats.avgPnl)}
              </p>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div whileHover={{ y: -2 }} transition={{ type: 'spring', stiffness: 300, damping: 20 }}>
          <Card className="bg-[#1A1A2E] border-white/[0.06]">
            <div className="h-[3px]" style={{ background: 'linear-gradient(90deg, #BB86FC, #03DAC6, #FFD54F)' }} />
            <CardContent className="p-3">
              <p className="text-[13px] font-bold uppercase tracking-wider text-white/40">{t('inv.bestTrade')}</p>
              <p className="text-lg font-bold text-[#03DAC6] mt-1">{formatAmount(stats.best)}</p>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div whileHover={{ y: -2 }} transition={{ type: 'spring', stiffness: 300, damping: 20 }}>
          <Card className="bg-[#1A1A2E] border-white/[0.06]">
            <div className="h-[3px]" style={{ background: 'linear-gradient(90deg, #BB86FC, #03DAC6, #FFD54F)' }} />
            <CardContent className="p-3">
              <p className="text-[13px] font-bold uppercase tracking-wider text-white/40">{t('inv.worstTrade')}</p>
              <p className="text-lg font-bold text-[#CF6679] mt-1">{formatAmount(stats.worst)}</p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Filters & Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={portfolioFilter} onValueChange={setPortfolioFilter}>
            <SelectTrigger className="w-[140px] bg-white/[0.04] border-white/[0.08] rounded-xl focus:border-white/15 focus:ring-0 text-white text-xs h-9 transition-colors">
              <SelectValue placeholder="Semua Portofolio" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Portofolio</SelectItem>
              {portfolios.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.symbol}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[110px] bg-white/[0.04] border-white/[0.08] rounded-xl focus:border-white/15 focus:ring-0 text-white text-xs h-9 transition-colors">
              <SelectValue placeholder="Tipe" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua</SelectItem>
              <SelectItem value="buy">{t('inv.journalBuy')}</SelectItem>
              <SelectItem value="sell">{t('inv.journalSell')}</SelectItem>
            </SelectContent>
          </Select>
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="w-[140px] bg-white/[0.04] border-white/[0.08] rounded-xl focus:border-white/15 focus:ring-0 text-white text-xs h-9 transition-colors"
          />
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="w-[140px] bg-white/[0.04] border-white/[0.08] rounded-xl focus:border-white/15 focus:ring-0 text-white text-xs h-9 transition-colors"
          />
          <Badge
            variant="outline"
            className={cn(
              'border text-xs rounded-full px-3 py-0.5 transition-colors',
              portfolioFilter !== 'all' || typeFilter !== 'all' || dateFrom || dateTo
                ? 'border-[#BB86FC]/30 bg-[#BB86FC]/10 text-[#BB86FC]'
                : 'border-white/[0.08] text-white/50'
            )}
          >
            {filtered.length}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={exportExcel}
            className="border-white/[0.08] rounded-xl text-white/50 hover:text-white/80 hover:bg-white/[0.04] hover:border-white/15 h-9 text-xs transition-colors"
          >
            <FileSpreadsheet className="h-3.5 w-3.5 mr-1" />
            Excel
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={exportPDF}
            className="border-white/[0.08] rounded-xl text-white/50 hover:text-white/80 hover:bg-white/[0.04] hover:border-white/15 h-9 text-xs transition-colors"
          >
            <FileText className="h-3.5 w-3.5 mr-1" />
            PDF
          </Button>
          <Button
            onClick={openCreate}
            size="sm"
            className="rounded-xl text-white h-9 text-xs"
            style={{ background: 'linear-gradient(135deg, #BB86FC, #03DAC6)' }}
          >
            <Plus className="h-4 w-4 mr-1" />
            {t('inv.addJournal')}
          </Button>
        </div>
      </div>

      {/* Journal Table */}
      <Card className="bg-[#1A1A2E] border-white/[0.06]">
        <div className="h-[3px]" style={{ background: 'linear-gradient(90deg, #BB86FC, #03DAC6, #FFD54F)' }} />
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-3 p-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 rounded-lg bg-white/[0.03]" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="flex flex-col items-center justify-center py-16 relative"
            >
              <div className="absolute w-32 h-32 rounded-full bg-[#BB86FC]/5 blur-3xl" />
              <div className="w-16 h-16 rounded-2xl bg-[#BB86FC]/10 border border-[#BB86FC]/20 flex items-center justify-center mb-4">
                <BookOpen className="h-8 w-8 text-[#BB86FC]/60" />
              </div>
              <p className="text-white/40 text-sm font-medium">{t('inv.noJournalData')}</p>
              <p className="text-white/25 text-xs mt-1">{t('inv.startJournaling')}</p>
            </motion.div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-white/[0.06] hover:bg-transparent">
                    <TableHead className="text-[13px] font-bold uppercase tracking-wider text-white/40">Tipe</TableHead>
                    <TableHead className="text-[13px] font-bold uppercase tracking-wider text-white/40">Symbol</TableHead>
                    <TableHead className="text-[13px] font-bold uppercase tracking-wider text-white/40 text-right">H. Masuk</TableHead>
                    <TableHead className="text-[13px] font-bold uppercase tracking-wider text-white/40 text-right">H. Keluar</TableHead>
                    <TableHead className="text-[13px] font-bold uppercase tracking-wider text-white/40 text-right">Qty</TableHead>
                    <TableHead className="text-[13px] font-bold uppercase tracking-wider text-white/40 text-right">PnL</TableHead>
                    <TableHead className="text-[13px] font-bold uppercase tracking-wider text-white/40 text-right">PnL %</TableHead>
                    <TableHead className="text-[13px] font-bold uppercase tracking-wider text-white/40 text-right">R:R</TableHead>
                    <TableHead className="text-[13px] font-bold uppercase tracking-wider text-white/40">Tanggal</TableHead>
                    <TableHead className="text-[13px] font-bold uppercase tracking-wider text-white/40 w-20" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((item) => {
                    const isBuy = item.type === 'buy';
                    const isPositive = item.pnl >= 0;
                    return (
                      <motion.div
                        key={item.id}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        whileHover={{ x: 2 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                      >
                        <TableRow className={cn(
                          'border-white/[0.04] hover:bg-white/[0.02] transition-colors',
                          isBuy ? 'border-l-[3px] border-l-[#03DAC6]' : 'border-l-[3px] border-l-[#CF6679]'
                        )}>
                          <TableCell className="py-3">
                            <Badge
                              className={cn(
                                'text-[10px] px-2 py-0',
                                isBuy
                                  ? 'bg-[#03DAC6]/15 text-[#03DAC6] border border-[#03DAC6]/20'
                                  : 'bg-[#CF6679]/15 text-[#CF6679] border border-[#CF6679]/20'
                              )}
                            >
                              {isBuy ? t('inv.journalBuy') : t('inv.journalSell')}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-white text-xs font-medium py-3">
                            {getPortfolioSymbol(item.portfolioId)}
                          </TableCell>
                          <TableCell className="text-white/70 text-xs text-right py-3">
                            {formatInvPrice(item.portfolio?.type || 'crypto', item.entryPrice)}
                          </TableCell>
                          <TableCell className="text-white/70 text-xs text-right py-3">
                            {item.exitPrice ? formatInvPrice(item.portfolio?.type || 'crypto', item.exitPrice) : '-'}
                          </TableCell>
                          <TableCell className="text-white/70 text-xs text-right py-3">
                            {item.quantity}
                          </TableCell>
                          <TableCell className={cn('text-xs text-right font-medium py-3', pnlColor(item.pnl))}>
                            {isBuy ? '-' : `${isPositive ? '+' : ''}${formatInvPrice(item.portfolio?.type || 'crypto', item.pnl)}`}
                          </TableCell>
                          <TableCell className={cn('text-xs text-right font-medium py-3', isBuy ? 'text-white/50' : pnlColor(item.pnl))}>
                            {isBuy ? '-' : `${isPositive ? '+' : ''}${(item.pnlPercentage ?? 0).toFixed(2)}%`}
                          </TableCell>
                          <TableCell className="text-white/50 text-xs text-right py-3">
                            {item.riskReward?.toString() || '-'}
                          </TableCell>
                          <TableCell className="text-white/50 text-xs py-3">
                            {new Date(item.date).toLocaleDateString('id-ID')}
                          </TableCell>
                          <TableCell className="py-3 text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 text-white/40 hover:text-white hover:bg-white/[0.06] transition-colors"
                              onClick={() => openEdit(item)}
                            >
                              <Pencil className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 text-white/40 hover:text-[#CF6679] hover:bg-white/[0.06] transition-colors"
                              onClick={() => setDeleteTarget(item)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      </motion.div>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-[#141414] border-white/[0.08] rounded-2xl p-0 overflow-hidden text-white sm:max-w-[480px] max-h-[90vh] overflow-y-auto">
          <div className="h-[3px]" style={{ background: 'linear-gradient(90deg, #BB86FC, #03DAC6, #FFD54F)' }} />
          <div className="p-5">
            <DialogHeader>
              <DialogTitle className="text-white">
                {editing ? t('common.edit') : t('inv.addJournal')}
              </DialogTitle>
              <DialogDescription className="text-white/60">
                {t('inv.tradingJournal')}
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSave} className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2 col-span-2">
                  <Label className="text-white/80">{t('inv.portfolio')} *</Label>
                  <Select value={form.portfolioId} onValueChange={(v) => setForm({ ...form, portfolioId: v })}>
                    <SelectTrigger className="bg-white/[0.04] border-white/[0.08] rounded-xl focus:border-white/15 focus:ring-0 text-white transition-colors">
                      <SelectValue placeholder="Pilih portofolio" />
                    </SelectTrigger>
                    <SelectContent>
                      {portfolios.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.symbol} ({p.type})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-white/80">{t('inv.journalType')} *</Label>
                  <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                    <SelectTrigger className="bg-white/[0.04] border-white/[0.08] rounded-xl focus:border-white/15 focus:ring-0 text-white transition-colors">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="buy">{t('inv.journalBuy')}</SelectItem>
                      <SelectItem value="sell">{t('inv.journalSell')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-white/80">{t('inv.journalDate')}</Label>
                  <Input
                    type="date"
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                    className="bg-white/[0.04] border-white/[0.08] rounded-xl focus:border-white/15 focus:ring-0 text-white transition-colors"
                  />
                </div>
              </div>

              <div className="h-px bg-white/[0.06]" />

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-white/80">{t('inv.entryPrice')} ({getInvCurrencyLabel(getSelectedPortfolioType())}) *</Label>
                  <Input
                    type="number"
                    value={form.entryPrice}
                    onChange={(e) => setForm({ ...form, entryPrice: e.target.value })}
                    placeholder="0"
                    min="0"
                    step="any"
                    className="bg-white/[0.04] border-white/[0.08] rounded-xl focus:border-white/15 focus:ring-0 text-white placeholder:text-white/30 transition-colors"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-white/80">{t('inv.exitPrice')} ({getInvCurrencyLabel(getSelectedPortfolioType())})</Label>
                  <Input
                    type="number"
                    value={form.exitPrice}
                    onChange={(e) => setForm({ ...form, exitPrice: e.target.value })}
                    placeholder="0"
                    min="0"
                    step="any"
                    className="bg-white/[0.04] border-white/[0.08] rounded-xl focus:border-white/15 focus:ring-0 text-white placeholder:text-white/30 transition-colors"
                  />
                </div>
              </div>

              <div className="h-px bg-white/[0.06]" />

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
                    className="bg-white/[0.04] border-white/[0.08] rounded-xl focus:border-white/15 focus:ring-0 text-white placeholder:text-white/30 transition-colors"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-white/80">{t('inv.fees')} ({getInvCurrencyLabel(getSelectedPortfolioType())})</Label>
                  <Input
                    type="number"
                    value={form.fees}
                    onChange={(e) => setForm({ ...form, fees: e.target.value })}
                    placeholder="0"
                    min="0"
                    step="any"
                    className="bg-white/[0.04] border-white/[0.08] rounded-xl focus:border-white/15 focus:ring-0 text-white placeholder:text-white/30 transition-colors"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-white/80">{t('inv.riskReward')}</Label>
                  <Input
                    type="number"
                    value={form.riskReward}
                    onChange={(e) => setForm({ ...form, riskReward: e.target.value })}
                    placeholder="0"
                    step="any"
                    className="bg-white/[0.04] border-white/[0.08] rounded-xl focus:border-white/15 focus:ring-0 text-white placeholder:text-white/30 transition-colors"
                  />
                </div>
              </div>

              <div className="h-px bg-white/[0.06]" />

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-white/80">{t('inv.pnl')} ({getInvCurrencyLabel(getSelectedPortfolioType())})</Label>
                  <Input
                    type="number"
                    value={form.pnl}
                    onChange={(e) => setForm({ ...form, pnl: e.target.value })}
                    placeholder="0"
                    step="any"
                    className="bg-white/[0.04] border-white/[0.08] rounded-xl focus:border-white/15 focus:ring-0 text-white placeholder:text-white/30 transition-colors"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-white/80">{t('inv.pnlPercent')}</Label>
                  <Input
                    type="number"
                    value={form.pnlPercentage}
                    onChange={(e) => setForm({ ...form, pnlPercentage: e.target.value })}
                    placeholder="0"
                    step="any"
                    className="bg-white/[0.04] border-white/[0.08] rounded-xl focus:border-white/15 focus:ring-0 text-white placeholder:text-white/30 transition-colors"
                  />
                </div>
              </div>

              <div className="h-px bg-white/[0.06]" />

              <div className="space-y-2">
                <Label className="text-white/80">{t('inv.journalNotes')}</Label>
                <Textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="Catatan..."
                  className="bg-white/[0.04] border-white/[0.08] rounded-xl focus:border-white/15 focus:ring-0 text-white placeholder:text-white/30 min-h-[70px] transition-colors"
                />
              </div>

              <DialogFooter className="gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                  className="hover:bg-white/[0.06] rounded-xl"
                >
                  {t('common.cancel')}
                </Button>
                <Button
                  type="submit"
                  disabled={saving || !form.portfolioId || !form.entryPrice || !form.quantity}
                  className="rounded-xl text-white"
                  style={{ background: 'linear-gradient(135deg, #BB86FC, #03DAC6)' }}
                >
                  {t('common.save')}
                </Button>
              </DialogFooter>
            </form>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent className="bg-[#141414] border-white/[0.08] rounded-2xl text-white">
          <div className="h-[3px] w-full" style={{ background: 'linear-gradient(90deg, var(--primary), var(--secondary))' }} />
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">{t('common.delete')}</AlertDialogTitle>
            <AlertDialogDescription className="text-white/60">
              Hapus entri journal ini? Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="hover:bg-white/[0.06] rounded-xl">
              {t('common.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="rounded-xl text-white"
              style={{ background: 'linear-gradient(135deg, #CF6679, #BB86FC)' }}
            >
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
