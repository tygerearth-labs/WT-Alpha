'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useBusinessStore } from '@/store/useBusinessStore';
import { useTranslation } from '@/hooks/useTranslation';
import { useCurrencyFormat } from '@/hooks/useCurrencyFormat';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  FileBarChart, Download, TrendingUp, TrendingDown,
  DollarSign, FileText, CreditCard, Wallet,
  CalendarDays, BarChart3, Receipt, ArrowUpRight, ArrowDownRight, ArrowRight,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

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

interface ReportSummary {
  totalRevenue: number;
  totalExpense: number;
  netIncome: number;
  totalSales: number;
  totalInvoices: number;
  totalCashIn: number;
  totalCashOut: number;
  totalHutang: number;
  totalPiutang: number;
}

interface ReportData {
  summary: ReportSummary;
  sales: Array<{
    id: string;
    description: string;
    amount: number;
    date: string;
    customer?: { name: string } | null;
    paymentMethod: string | null;
  }>;
  expenses: Array<{
    id: string;
    description: string;
    amount: number;
    date: string;
    category: string | null;
  }>;
  cashEntries: Array<{
    id: string;
    description: string;
    amount: number;
    date: string;
    type: string;
    category: string | null;
  }>;
  invoices: Array<{
    id: string;
    invoiceNumber: string;
    total: number;
    date: string;
    status: string;
    customer?: { name: string } | null;
  }>;
  debts: Array<{
    id: string;
    type: string;
    counterpart: string;
    amount: number;
    remaining: number;
    dueDate: string | null;
    status: string;
  }>;
}

/* ------------------------------------------------------------------ */
/*  Expense Breakdown Bar Chart                                         */
/* ------------------------------------------------------------------ */

function ExpenseBreakdownChart({ expenses, formatAmount }: {
  expenses: Array<{ category: string | null; amount: number }>;
  formatAmount: (n: number) => string;
}) {
  const categoryData = useMemo(() => {
    const map = new Map<string, number>();
    expenses.forEach((e) => {
      const cat = e.category || 'Uncategorized';
      map.set(cat, (map.get(cat) || 0) + e.amount);
    });
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6);
  }, [expenses]);

  const maxAmount = Math.max(...categoryData.map(([, a]) => a), 1);

  const barColors = ['#CF6679', '#BB86FC', '#FFD700', '#03DAC6', '#FF8A65', '#82B1FF'];

  if (categoryData.length === 0) return null;

  return (
    <div className="space-y-3">
      {categoryData.map(([cat, amount], i) => {
        const pct = (amount / maxAmount) * 100;
        return (
          <div key={cat} className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-white/70 font-medium truncate max-w-[140px]">{cat}</span>
              <span className="text-white/50">{formatAmount(amount)}</span>
            </div>
            <div className="h-2.5 rounded-full bg-white/[0.04] overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.6, delay: i * 0.1, ease: 'easeOut' as const }}
                className="h-full rounded-full"
                style={{ backgroundColor: barColors[i % barColors.length] }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Visual Date Range Indicator                                        */
/* ------------------------------------------------------------------ */

function DateRangeIndicator({ fromDate, toDate }: { fromDate: string; toDate: string }) {
  const totalDays = Math.max(Math.ceil((new Date(toDate).getTime() - new Date(fromDate).getTime()) / (1000 * 60 * 60 * 24)), 1);
  const now = new Date();
  const fromMs = new Date(fromDate).getTime();
  const toMs = new Date(toDate).getTime();
  const nowMs = now.getTime();
  const progress = Math.min(Math.max((nowMs - fromMs) / (toMs - fromMs), 0), 1);

  return (
    <div className="flex items-center gap-3 mt-2">
      <div className="flex-1 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${progress * 100}%` }}
          transition={{ duration: 0.5 }}
          className="h-full rounded-full bg-gradient-to-r from-[#BB86FC] to-[#03DAC6]"
        />
      </div>
      <span className="text-[10px] text-white/40 whitespace-nowrap">{totalDays} days</span>
    </div>
  );
}

export default function BusinessLaporan() {
  const { t } = useTranslation();
  const { activeBusiness } = useBusinessStore();
  const { formatAmount } = useCurrencyFormat();
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('sales');

  const today = new Date();
  const thirtyDaysAgo = new Date(today);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [fromDate, setFromDate] = useState(thirtyDaysAgo.toISOString().split('T')[0]);
  const [toDate, setToDate] = useState(today.toISOString().split('T')[0]);

  const [exporting, setExporting] = useState<string | null>(null);

  const businessId = activeBusiness?.id;

  const fetchReport = useCallback(() => {
    if (!businessId) return;
    setLoading(true);
    fetch(`/api/business/${businessId}/report?from=${encodeURIComponent(fromDate)}&to=${encodeURIComponent(toDate)}`)
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then((result) => setData(result))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [businessId, fromDate, toDate]);

  useEffect(() => {
    if (businessId) {
      fetchReport();
    }
  }, [businessId, fetchReport]);

  const handleExportExcel = async () => {
    if (!businessId || !data) return;
    setExporting('excel');
    try {
      const XLSX = await import('xlsx');
      const wb = XLSX.utils.book_new();

      if (data.sales.length > 0) {
        const salesData = data.sales.map((s) => ({
          [t('biz.cashDate')]: new Date(s.date).toLocaleDateString(),
          [t('biz.saleDescription')]: s.description,
          [t('biz.saleCustomer')]: s.customer?.name || '-',
          [t('biz.salePaymentMethod')]: s.paymentMethod || '-',
          [t('biz.saleAmount')]: s.amount,
        }));
        const ws = XLSX.utils.json_to_sheet(salesData);
        XLSX.utils.book_append_sheet(wb, ws, t('biz.penjualan'));
      }

      if (data.expenses.length > 0) {
        const expData = data.expenses.map((e) => ({
          [t('biz.cashDate')]: new Date(e.date).toLocaleDateString(),
          [t('biz.cashDescription')]: e.description,
          [t('biz.cashCategory')]: e.category || '-',
          [t('biz.cashAmount')]: e.amount,
        }));
        const ws = XLSX.utils.json_to_sheet(expData);
        XLSX.utils.book_append_sheet(wb, ws, t('biz.kasKeluar'));
      }

      if (data.cashEntries.length > 0) {
        const cashData = data.cashEntries.map((c) => ({
          [t('biz.cashDate')]: new Date(c.date).toLocaleDateString(),
          [t('biz.cashDescription')]: c.description,
          [t('biz.cashCategory')]: c.category || '-',
          [t('biz.debtAmount')]: c.amount,
          [t('biz.debtStatus')]: c.type,
        }));
        const ws = XLSX.utils.json_to_sheet(cashData);
        XLSX.utils.book_append_sheet(wb, ws, t('biz.kasBesar'));
      }

      if (data.invoices.length > 0) {
        const invData = data.invoices.map((inv) => ({
          [t('biz.invoiceNumber')]: inv.invoiceNumber,
          [t('biz.invoiceCustomer')]: inv.customer?.name || '-',
          [t('biz.invoiceTotal')]: inv.total,
          [t('biz.invoiceStatus')]: inv.status,
          [t('biz.cashDate')]: new Date(inv.date).toLocaleDateString(),
        }));
        const ws = XLSX.utils.json_to_sheet(invData);
        XLSX.utils.book_append_sheet(wb, ws, t('biz.invoices'));
      }

      if (data.debts.length > 0) {
        const debtData = data.debts.map((d) => ({
          [t('biz.debtCounterpart')]: d.counterpart,
          [t('biz.debtStatus')]: d.type,
          [t('biz.debtAmount')]: d.amount,
          [t('biz.debtRemaining')]: d.remaining,
          [t('biz.debtDueDate')]: d.dueDate ? new Date(d.dueDate).toLocaleDateString() : '-',
        }));
        const ws = XLSX.utils.json_to_sheet(debtData);
        XLSX.utils.book_append_sheet(wb, ws, t('biz.hutangPiutang'));
      }

      XLSX.writeFile(wb, `Laporan_Bisnis_${fromDate}_${toDate}.xlsx`);
      toast.success(t('laporan.downloadSuccess'));
    } catch {
      toast.error(t('common.error'));
    } finally {
      setExporting(null);
    }
  };

  const handleExportPDF = async () => {
    if (!businessId || !data) return;
    setExporting('pdf');
    try {
      const { default: jsPDF } = await import('jspdf');
      const autoTable = (await import('jspdf-autotable')).default;
      const doc = new jsPDF();

      doc.setFontSize(16);
      doc.text(t('biz.bizLaporan'), 14, 20);
      doc.setFontSize(10);
      doc.text(
        `${t('biz.cashDate')}: ${fromDate} - ${toDate}`,
        14,
        28
      );

      let yPos = 40;

      doc.setFontSize(12);
      doc.text(t('dashboard.totalSavings'), 14, yPos);
      yPos += 8;
      doc.setFontSize(10);

      const summaryRows = [
        [t('biz.bizRevenue'), formatAmount(data.summary.totalRevenue)],
        [t('biz.bizExpense'), formatAmount(data.summary.totalExpense)],
        [t('biz.bizNetIncome'), formatAmount(data.summary.netIncome)],
        [t('biz.totalPenjualan'), formatAmount(data.summary.totalSales)],
        [t('biz.totalHutang'), formatAmount(data.summary.totalHutang)],
        [t('biz.totalPiutang'), formatAmount(data.summary.totalPiutang)],
      ];

      autoTable(doc, {
        startY: yPos,
        head: [['Keterangan', 'Jumlah']],
        body: summaryRows,
        theme: 'grid',
        headStyles: { fillColor: [187, 134, 252], textColor: 0 },
        styles: { fontSize: 9 },
      });

      yPos = (doc as unknown as Record<string, unknown>).lastAutoTable != null ? ((doc as unknown as Record<string, Record<string, number>>).lastAutoTable.finalY + 15) : yPos + 60;

      if (data.sales.length > 0) {
        doc.setFontSize(12);
        doc.text(t('biz.penjualan'), 14, yPos);
        yPos += 4;
        autoTable(doc, {
          startY: yPos,
          head: [[t('biz.cashDate'), t('biz.saleDescription'), t('biz.saleCustomer'), t('biz.saleAmount')]],
          body: data.sales.slice(0, 50).map((s) => [
            new Date(s.date).toLocaleDateString(),
            s.description,
            s.customer?.name || '-',
            formatAmount(s.amount),
          ]),
          theme: 'grid',
          headStyles: { fillColor: [187, 134, 252], textColor: 0 },
          styles: { fontSize: 8 },
        });
      }

      doc.save(`Laporan_Bisnis_${fromDate}_${toDate}.pdf`);
      toast.success(t('laporan.downloadSuccess'));
    } catch {
      toast.error(t('common.error'));
    } finally {
      setExporting(null);
    }
  };

  if (!businessId) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-white/50 text-center">{t('biz.registerFirst')}</p>
      </div>
    );
  }

  const summaryCards = data
    ? [
        { label: t('biz.bizRevenue'), value: data.summary.totalRevenue, color: '#03DAC6', icon: TrendingUp, gradient: 'from-[#03DAC6]/20 to-[#03DAC6]/5', trend: 'up' },
        { label: t('biz.bizExpense'), value: data.summary.totalExpense, color: '#CF6679', icon: TrendingDown, gradient: 'from-[#CF6679]/20 to-[#CF6679]/5', trend: 'down' },
        { label: t('biz.bizNetIncome'), value: data.summary.netIncome, color: data.summary.netIncome >= 0 ? '#03DAC6' : '#CF6679', icon: DollarSign, gradient: data.summary.netIncome >= 0 ? 'from-[#03DAC6]/20 to-[#03DAC6]/5' : 'from-[#CF6679]/20 to-[#CF6679]/5', trend: data.summary.netIncome >= 0 ? 'up' : 'down' },
        { label: t('biz.totalPenjualan'), value: data.summary.totalSales, color: '#BB86FC', icon: Wallet, gradient: 'from-[#BB86FC]/20 to-[#BB86FC]/5', trend: 'up' },
      ]
    : [];

  return (
    <div className="space-y-5">
      <motion.div variants={containerVariants} initial="hidden" animate="visible">
        {/* Header */}
        <motion.div variants={itemVariants} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-[#BB86FC]/15 flex items-center justify-center">
              <FileBarChart className="h-4 w-4 text-[#BB86FC]" />
            </div>
            {t('biz.bizLaporan')}
          </h2>
          <div className="flex gap-2">
            <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>
              <Button
                onClick={handleExportExcel}
                size="sm"
                variant="outline"
                disabled={exporting === 'excel' || loading}
                className="border-[#03DAC6]/20 text-[#03DAC6] hover:bg-[#03DAC6]/10 rounded-xl"
              >
                {exporting === 'excel' ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <Download className="mr-1 h-3.5 w-3.5" />}
                {t('biz.exportExcel')}
              </Button>
            </motion.div>
            <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>
              <Button
                onClick={handleExportPDF}
                size="sm"
                variant="outline"
                disabled={exporting === 'pdf' || loading}
                className="border-[#CF6679]/20 text-[#CF6679] hover:bg-[#CF6679]/10 rounded-xl"
              >
                {exporting === 'pdf' ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <Download className="mr-1 h-3.5 w-3.5" />}
                {t('biz.exportPDF')}
              </Button>
            </motion.div>
          </div>
        </motion.div>

        {/* Date Range Filter with Visual Indicator */}
        <motion.div variants={itemVariants} className="mt-4">
          <Card className="bg-[#1A1A2E] border border-white/[0.06] rounded-2xl">
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                <div className="flex items-center gap-2 shrink-0">
                  <div className="h-7 w-7 rounded-lg bg-[#BB86FC]/15 flex items-center justify-center">
                    <CalendarDays className="h-3.5 w-3.5 text-[#BB86FC]" />
                  </div>
                  <Label className="text-white/60 text-xs font-medium">{t('biz.cashDate')}</Label>
                </div>
                <div className="flex items-center gap-2 flex-1 flex-wrap">
                  <Input
                    type="date"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    className="bg-white/[0.04] border-white/[0.08] text-white w-40 h-9 text-xs rounded-lg focus:border-[#BB86FC]/40"
                  />
                  <div className="h-4 w-8 rounded bg-gradient-to-r from-[#BB86FC]/30 to-[#03DAC6]/30 flex items-center justify-center">
                    <ArrowRight className="h-3 w-3 text-white/40" />
                  </div>
                  <Input
                    type="date"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                    className="bg-white/[0.04] border-white/[0.08] text-white w-40 h-9 text-xs rounded-lg focus:border-[#BB86FC]/40"
                  />
                </div>
                <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>
                  <Button
                    onClick={fetchReport}
                    size="sm"
                    className="bg-gradient-to-r from-[#BB86FC] to-[#9B6FDB] text-black hover:opacity-90 h-9 text-xs rounded-xl shadow-lg shadow-[#BB86FC]/15"
                  >
                    {loading ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <BarChart3 className="mr-1 h-3.5 w-3.5" />}
                    {t('dashboard.savingsTargets')}
                  </Button>
                </motion.div>
              </div>
              <DateRangeIndicator fromDate={fromDate} toDate={toDate} />
            </CardContent>
          </Card>
        </motion.div>

        {/* Summary Cards */}
        {loading ? (
          <motion.div variants={itemVariants} className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-28 rounded-2xl bg-[#1A1A2E]" />
            ))}
          </motion.div>
        ) : data ? (
          <motion.div variants={itemVariants} className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
            {summaryCards.map((card) => (
              <motion.div
                key={card.label}
                variants={cardHover}
                initial="rest"
                whileHover="hover"
              >
                <Card className={cn('relative overflow-hidden rounded-2xl border-white/[0.06] bg-gradient-to-br', card.gradient)}>
                  <div className="absolute top-0 right-0 h-20 w-20 rounded-full opacity-10 blur-2xl" style={{ backgroundColor: card.color }} />
                  <CardContent className="p-4 relative">
                    <div className="flex items-center justify-between mb-2">
                      <div className="h-8 w-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${card.color}20` }}>
                        <card.icon className="h-4 w-4" style={{ color: card.color }} />
                      </div>
                      <div className={cn(
                        'h-5 w-5 rounded-full flex items-center justify-center',
                        card.trend === 'up' ? 'bg-[#03DAC6]/20' : 'bg-[#CF6679]/20'
                      )}>
                        {card.trend === 'up' ? (
                          <ArrowUpRight className="h-3 w-3 text-[#03DAC6]" />
                        ) : (
                          <ArrowDownRight className="h-3 w-3 text-[#CF6679]" />
                        )}
                      </div>
                    </div>
                    <p className="text-[10px] text-white/50 uppercase tracking-wider">{card.label}</p>
                    <p className={cn('text-lg font-bold mt-0.5', card.color === '#03DAC6' && 'text-[#03DAC6]', card.color === '#CF6679' && 'text-[#CF6679]', card.color === '#BB86FC' && 'text-[#BB86FC]')}>
                      {formatAmount(card.value)}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        ) : null}

        {/* Expense Breakdown Chart */}
        {data && data.expenses.length > 0 && !loading && (
          <motion.div variants={itemVariants} className="mt-4">
            <Card className="bg-[#1A1A2E] border border-white/[0.06] rounded-2xl">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-4">
                  <div className="h-7 w-7 rounded-lg bg-[#CF6679]/15 flex items-center justify-center">
                    <BarChart3 className="h-3.5 w-3.5 text-[#CF6679]" />
                  </div>
                  <h3 className="text-sm font-semibold text-white">Expense Breakdown</h3>
                  <Badge className="bg-[#CF6679]/20 text-[#CF6679] border-[#CF6679]/20 text-[10px] ml-auto">
                    {data.expenses.length} items
                  </Badge>
                </div>
                <ExpenseBreakdownChart expenses={data.expenses} formatAmount={formatAmount} />
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Tabs */}
        <motion.div variants={itemVariants} className="mt-4">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="bg-white/[0.03] border border-white/[0.06] w-full sm:w-auto rounded-xl p-1">
              <TabsTrigger value="sales" className="data-[state=active]:bg-[#BB86FC]/20 data-[state=active]:text-[#BB86FC] text-white/60 data-[state=active]:shadow-none rounded-lg text-xs">
                {t('biz.penjualan')}
              </TabsTrigger>
              <TabsTrigger value="expenses" className="data-[state=active]:bg-[#CF6679]/20 data-[state=active]:text-[#CF6679] text-white/60 data-[state=active]:shadow-none rounded-lg text-xs">
                {t('biz.kasKeluar')}
              </TabsTrigger>
              <TabsTrigger value="invoices" className="data-[state=active]:bg-[#FFD700]/20 data-[state=active]:text-[#FFD700] text-white/60 data-[state=active]:shadow-none rounded-lg text-xs">
                {t('biz.invoices')}
              </TabsTrigger>
              <TabsTrigger value="debts" className="data-[state=active]:bg-[#03DAC6]/20 data-[state=active]:text-[#03DAC6] text-white/60 data-[state=active]:shadow-none rounded-lg text-xs">
                {t('biz.hutangPiutang')}
              </TabsTrigger>
            </TabsList>

            {/* Sales Tab */}
            <TabsContent value="sales" className="mt-4">
              <Card className="bg-[#1A1A2E] border border-white/[0.06] rounded-2xl overflow-hidden">
                <CardContent className="p-0">
                  {loading ? (
                    <div className="space-y-3 p-4">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Skeleton key={i} className="h-10 rounded-lg bg-white/[0.06]" />
                      ))}
                    </div>
                  ) : !data || data.sales.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-white/40">
                      <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ duration: 0.5 }}
                        className="relative"
                      >
                        <div className="h-16 w-16 rounded-2xl bg-[#BB86FC]/10 flex items-center justify-center">
                          <TrendingUp className="h-8 w-8 text-[#BB86FC]/40" />
                        </div>
                      </motion.div>
                      <p className="text-sm mt-3">{t('biz.noBizData')}</p>
                      <p className="text-xs mt-1 text-white/25">No sales recorded for this period</p>
                    </div>
                  ) : (
                    <div className="max-h-[400px] overflow-y-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="border-white/[0.06] hover:bg-transparent bg-white/[0.01]">
                            <TableHead className="text-white/50 text-xs font-medium">{t('biz.cashDate')}</TableHead>
                            <TableHead className="text-white/50 text-xs font-medium">{t('biz.saleDescription')}</TableHead>
                            <TableHead className="text-white/50 text-xs font-medium hidden sm:table-cell">{t('biz.saleCustomer')}</TableHead>
                            <TableHead className="text-white/50 text-xs font-medium text-right">{t('biz.saleAmount')}</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {data.sales.map((sale, idx) => (
                            <TableRow key={sale.id} className={cn('border-white/[0.04] hover:bg-white/[0.04] transition-colors', idx % 2 === 1 && 'bg-white/[0.015]')}>
                              <TableCell className="text-white/70 text-xs py-2.5">{new Date(sale.date).toLocaleDateString()}</TableCell>
                              <TableCell className="text-white text-xs py-2.5 font-medium">{sale.description}</TableCell>
                              <TableCell className="text-white/60 text-xs py-2.5 hidden sm:table-cell">{sale.customer?.name || '-'}</TableCell>
                              <TableCell className="text-[#03DAC6] text-xs text-right py-2.5 font-semibold">{formatAmount(sale.amount)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Expenses Tab */}
            <TabsContent value="expenses" className="mt-4">
              <Card className="bg-[#1A1A2E] border border-white/[0.06] rounded-2xl overflow-hidden">
                <CardContent className="p-0">
                  {loading ? (
                    <div className="space-y-3 p-4">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Skeleton key={i} className="h-10 rounded-lg bg-white/[0.06]" />
                      ))}
                    </div>
                  ) : !data || data.expenses.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-white/40">
                      <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ duration: 0.5 }}
                        className="relative"
                      >
                        <div className="h-16 w-16 rounded-2xl bg-[#CF6679]/10 flex items-center justify-center">
                          <TrendingDown className="h-8 w-8 text-[#CF6679]/40" />
                        </div>
                      </motion.div>
                      <p className="text-sm mt-3">{t('biz.noBizData')}</p>
                      <p className="text-xs mt-1 text-white/25">No expenses recorded for this period</p>
                    </div>
                  ) : (
                    <div className="max-h-[400px] overflow-y-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="border-white/[0.06] hover:bg-transparent bg-white/[0.01]">
                            <TableHead className="text-white/50 text-xs font-medium">{t('biz.cashDate')}</TableHead>
                            <TableHead className="text-white/50 text-xs font-medium">{t('biz.cashDescription')}</TableHead>
                            <TableHead className="text-white/50 text-xs font-medium hidden sm:table-cell">{t('biz.cashCategory')}</TableHead>
                            <TableHead className="text-white/50 text-xs font-medium text-right">{t('biz.cashAmount')}</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {data.expenses.map((exp, idx) => (
                            <TableRow key={exp.id} className={cn('border-white/[0.04] hover:bg-white/[0.04] transition-colors', idx % 2 === 1 && 'bg-white/[0.015]')}>
                              <TableCell className="text-white/70 text-xs py-2.5">{new Date(exp.date).toLocaleDateString()}</TableCell>
                              <TableCell className="text-white text-xs py-2.5 font-medium">{exp.description}</TableCell>
                              <TableCell className="py-2.5 hidden sm:table-cell">
                                <Badge className="bg-white/[0.05] text-white/60 border-white/[0.08] text-[10px]">{exp.category || '-'}</Badge>
                              </TableCell>
                              <TableCell className="text-[#CF6679] text-xs text-right py-2.5 font-semibold">-{formatAmount(exp.amount)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Invoices Tab */}
            <TabsContent value="invoices" className="mt-4">
              <Card className="bg-[#1A1A2E] border border-white/[0.06] rounded-2xl overflow-hidden">
                <CardContent className="p-0">
                  {loading ? (
                    <div className="space-y-3 p-4">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Skeleton key={i} className="h-10 rounded-lg bg-white/[0.06]" />
                      ))}
                    </div>
                  ) : !data || data.invoices.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-white/40">
                      <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ duration: 0.5 }}
                        className="relative"
                      >
                        <div className="h-16 w-16 rounded-2xl bg-[#FFD700]/10 flex items-center justify-center">
                          <Receipt className="h-8 w-8 text-[#FFD700]/40" />
                        </div>
                      </motion.div>
                      <p className="text-sm mt-3">{t('biz.noBizData')}</p>
                      <p className="text-xs mt-1 text-white/25">No invoices for this period</p>
                    </div>
                  ) : (
                    <div className="max-h-[400px] overflow-y-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="border-white/[0.06] hover:bg-transparent bg-white/[0.01]">
                            <TableHead className="text-white/50 text-xs font-medium">{t('biz.invoiceNumber')}</TableHead>
                            <TableHead className="text-white/50 text-xs font-medium hidden sm:table-cell">{t('biz.invoiceCustomer')}</TableHead>
                            <TableHead className="text-white/50 text-xs font-medium">{t('biz.invoiceStatus')}</TableHead>
                            <TableHead className="text-white/50 text-xs font-medium text-right">{t('biz.invoiceTotal')}</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {data.invoices.map((inv, idx) => {
                            const statusClass = inv.status === 'paid' ? 'bg-[#03DAC6]/15 text-[#03DAC6] border-[#03DAC6]/20' : inv.status === 'overdue' ? 'bg-[#CF6679]/15 text-[#CF6679] border-[#CF6679]/20' : 'bg-[#FFD700]/15 text-[#FFD700] border-[#FFD700]/20';
                            return (
                              <TableRow key={inv.id} className={cn('border-white/[0.04] hover:bg-white/[0.04] transition-colors', idx % 2 === 1 && 'bg-white/[0.015]')}>
                                <TableCell className="text-white text-xs py-2.5 font-medium">{inv.invoiceNumber}</TableCell>
                                <TableCell className="text-white/60 text-xs py-2.5 hidden sm:table-cell">{inv.customer?.name || '-'}</TableCell>
                                <TableCell className="py-2.5">
                                  <Badge variant="outline" className={cn('text-[10px] font-medium border', statusClass)}>
                                    {inv.status}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-white text-xs text-right py-2.5 font-semibold">{formatAmount(inv.total)}</TableCell>
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

            {/* Debts Tab */}
            <TabsContent value="debts" className="mt-4">
              <Card className="bg-[#1A1A2E] border border-white/[0.06] rounded-2xl overflow-hidden">
                <CardContent className="p-0">
                  {loading ? (
                    <div className="space-y-3 p-4">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Skeleton key={i} className="h-10 rounded-lg bg-white/[0.06]" />
                      ))}
                    </div>
                  ) : !data || data.debts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-white/40">
                      <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ duration: 0.5 }}
                        className="relative"
                      >
                        <div className="h-16 w-16 rounded-2xl bg-[#03DAC6]/10 flex items-center justify-center">
                          <CreditCard className="h-8 w-8 text-[#03DAC6]/40" />
                        </div>
                      </motion.div>
                      <p className="text-sm mt-3">{t('biz.noBizData')}</p>
                      <p className="text-xs mt-1 text-white/25">No debts or receivables for this period</p>
                    </div>
                  ) : (
                    <div className="max-h-[400px] overflow-y-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="border-white/[0.06] hover:bg-transparent bg-white/[0.01]">
                            <TableHead className="text-white/50 text-xs font-medium">{t('biz.debtCounterpart')}</TableHead>
                            <TableHead className="text-white/50 text-xs font-medium">{t('biz.debtStatus')}</TableHead>
                            <TableHead className="text-white/50 text-xs font-medium">{t('biz.debtAmount')}</TableHead>
                            <TableHead className="text-white/50 text-xs font-medium text-right">{t('biz.debtRemaining')}</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {data.debts.map((debt, idx) => (
                            <TableRow key={debt.id} className={cn('border-white/[0.04] hover:bg-white/[0.04] transition-colors', idx % 2 === 1 && 'bg-white/[0.015]')}>
                              <TableCell className="text-white text-xs py-2.5 font-medium">{debt.counterpart}</TableCell>
                              <TableCell className="py-2.5">
                                <Badge
                                  variant="outline"
                                  className={cn(
                                    'text-[10px] font-medium border',
                                    debt.type === 'hutang' ? 'bg-[#CF6679]/15 text-[#CF6679] border-[#CF6679]/20' : 'bg-[#03DAC6]/15 text-[#03DAC6] border-[#03DAC6]/20'
                                  )}
                                >
                                  {debt.type}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-white/70 text-xs py-2.5">{formatAmount(debt.amount)}</TableCell>
                              <TableCell className={cn('text-xs text-right py-2.5 font-semibold', debt.remaining > 0 ? 'text-[#FFD700]' : 'text-[#03DAC6]')}>
                                {debt.remaining > 0 ? formatAmount(debt.remaining) : t('biz.debtPaid')}
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
        </motion.div>
      </motion.div>
    </div>
  );
}
