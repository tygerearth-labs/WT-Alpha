'use client';

import { useEffect, useState, useCallback } from 'react';
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
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

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

      // Sales Sheet
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

      // Expenses (cash keluar) Sheet
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

      // Cash Sheet
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

      // Invoice Sheet
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

      // Debts Sheet
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

      // Summary
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

      yPos = (doc as unknown as Record<string, number>).lastAutoTable?.finalY + 15 || yPos + 60;

      // Sales table
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
        { label: t('biz.bizRevenue'), value: data.summary.totalRevenue, color: 'text-[#03DAC6]', icon: TrendingUp },
        { label: t('biz.bizExpense'), value: data.summary.totalExpense, color: 'text-[#CF6679]', icon: TrendingDown },
        { label: t('biz.bizNetIncome'), value: data.summary.netIncome, color: data.summary.netIncome >= 0 ? 'text-[#03DAC6]' : 'text-[#CF6679]', icon: DollarSign },
        { label: t('biz.totalPenjualan'), value: data.summary.totalSales, color: 'text-[#BB86FC]', icon: Wallet },
      ]
    : [];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <FileBarChart className="h-5 w-5 text-[#BB86FC]" />
          {t('biz.bizLaporan')}
        </h2>
        <div className="flex gap-2">
          <Button
            onClick={handleExportExcel}
            size="sm"
            variant="outline"
            disabled={exporting === 'excel' || loading}
            className="border-[#03DAC6]/30 text-[#03DAC6] hover:bg-[#03DAC6]/10"
          >
            {exporting === 'excel' ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Download className="mr-1 h-4 w-4" />}
            {t('biz.exportExcel')}
          </Button>
          <Button
            onClick={handleExportPDF}
            size="sm"
            variant="outline"
            disabled={exporting === 'pdf' || loading}
            className="border-[#CF6679]/30 text-[#CF6679] hover:bg-[#CF6679]/10"
          >
            {exporting === 'pdf' ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Download className="mr-1 h-4 w-4" />}
            {t('biz.exportPDF')}
          </Button>
        </div>
      </div>

      {/* Date Range Filter */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <div className="flex items-center gap-2">
          <Label className="text-white/60 text-xs">{t('biz.cashDate')}</Label>
          <Input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="bg-white/[0.05] border-white/[0.1] text-white w-40 h-9 text-xs"
          />
          <span className="text-white/40 text-xs">—</span>
          <Input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="bg-white/[0.05] border-white/[0.1] text-white w-40 h-9 text-xs"
          />
        </div>
        <Button
          onClick={fetchReport}
          size="sm"
          className="bg-[#BB86FC] text-black hover:bg-[#9B6FDB] h-9 text-xs"
        >
          {t('dashboard.savingsTargets')}
        </Button>
      </div>

      {/* Summary Cards */}
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl bg-[#1A1A2E]" />
          ))}
        </div>
      ) : data ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {summaryCards.map((card) => (
            <Card key={card.label} className="bg-[#1A1A2E] border border-white/[0.06] rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <card.icon className="h-4 w-4 text-white/40" />
                <p className="text-xs text-white/50">{card.label}</p>
              </div>
              <p className={cn('text-lg font-bold', card.color)}>{formatAmount(card.value)}</p>
            </Card>
          ))}
        </div>
      ) : null}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-white/[0.03] border border-white/[0.06] w-full sm:w-auto">
          <TabsTrigger value="sales" className="data-[state=active]:bg-[#BB86FC]/20 data-[state=active]:text-[#BB86FC] text-white/60 data-[state=active]:shadow-none">
            {t('biz.penjualan')}
          </TabsTrigger>
          <TabsTrigger value="expenses" className="data-[state=active]:bg-[#CF6679]/20 data-[state=active]:text-[#CF6679] text-white/60 data-[state=active]:shadow-none">
            {t('biz.kasKeluar')}
          </TabsTrigger>
          <TabsTrigger value="invoices" className="data-[state=active]:bg-[#FFD700]/20 data-[state=active]:text-[#FFD700] text-white/60 data-[state=active]:shadow-none">
            {t('biz.invoices')}
          </TabsTrigger>
          <TabsTrigger value="debts" className="data-[state=active]:bg-[#03DAC6]/20 data-[state=active]:text-[#03DAC6] text-white/60 data-[state=active]:shadow-none">
            {t('biz.hutangPiutang')}
          </TabsTrigger>
        </TabsList>

        {/* Sales Tab */}
        <TabsContent value="sales" className="mt-4">
          <Card className="bg-[#1A1A2E] border border-white/[0.06] rounded-2xl">
            <CardContent className="p-0">
              {loading ? (
                <div className="space-y-3 p-4">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-10 rounded-lg bg-white/[0.06]" />
                  ))}
                </div>
              ) : !data || data.sales.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-white/40">
                  <TrendingUp className="h-8 w-8 mb-2 opacity-40" />
                  <p className="text-sm">{t('biz.noBizData')}</p>
                </div>
              ) : (
                <div className="max-h-[400px] overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-white/[0.06] hover:bg-transparent">
                        <TableHead className="text-white/50 text-xs">{t('biz.cashDate')}</TableHead>
                        <TableHead className="text-white/50 text-xs">{t('biz.saleDescription')}</TableHead>
                        <TableHead className="text-white/50 text-xs hidden sm:table-cell">{t('biz.saleCustomer')}</TableHead>
                        <TableHead className="text-white/50 text-xs text-right">{t('biz.saleAmount')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.sales.map((sale) => (
                        <TableRow key={sale.id} className="border-white/[0.04] hover:bg-white/[0.02]">
                          <TableCell className="text-white/70 text-xs py-2">{new Date(sale.date).toLocaleDateString()}</TableCell>
                          <TableCell className="text-white text-xs py-2 font-medium">{sale.description}</TableCell>
                          <TableCell className="text-white/60 text-xs py-2 hidden sm:table-cell">{sale.customer?.name || '-'}</TableCell>
                          <TableCell className="text-[#03DAC6] text-xs text-right py-2 font-medium">{formatAmount(sale.amount)}</TableCell>
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
          <Card className="bg-[#1A1A2E] border border-white/[0.06] rounded-2xl">
            <CardContent className="p-0">
              {loading ? (
                <div className="space-y-3 p-4">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-10 rounded-lg bg-white/[0.06]" />
                  ))}
                </div>
              ) : !data || data.expenses.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-white/40">
                  <TrendingDown className="h-8 w-8 mb-2 opacity-40" />
                  <p className="text-sm">{t('biz.noBizData')}</p>
                </div>
              ) : (
                <div className="max-h-[400px] overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-white/[0.06] hover:bg-transparent">
                        <TableHead className="text-white/50 text-xs">{t('biz.cashDate')}</TableHead>
                        <TableHead className="text-white/50 text-xs">{t('biz.cashDescription')}</TableHead>
                        <TableHead className="text-white/50 text-xs hidden sm:table-cell">{t('biz.cashCategory')}</TableHead>
                        <TableHead className="text-white/50 text-xs text-right">{t('biz.cashAmount')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.expenses.map((exp) => (
                        <TableRow key={exp.id} className="border-white/[0.04] hover:bg-white/[0.02]">
                          <TableCell className="text-white/70 text-xs py-2">{new Date(exp.date).toLocaleDateString()}</TableCell>
                          <TableCell className="text-white text-xs py-2 font-medium">{exp.description}</TableCell>
                          <TableCell className="text-white/60 text-xs py-2 hidden sm:table-cell">{exp.category || '-'}</TableCell>
                          <TableCell className="text-[#CF6679] text-xs text-right py-2 font-medium">-{formatAmount(exp.amount)}</TableCell>
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
          <Card className="bg-[#1A1A2E] border border-white/[0.06] rounded-2xl">
            <CardContent className="p-0">
              {loading ? (
                <div className="space-y-3 p-4">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-10 rounded-lg bg-white/[0.06]" />
                  ))}
                </div>
              ) : !data || data.invoices.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-white/40">
                  <FileText className="h-8 w-8 mb-2 opacity-40" />
                  <p className="text-sm">{t('biz.noBizData')}</p>
                </div>
              ) : (
                <div className="max-h-[400px] overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-white/[0.06] hover:bg-transparent">
                        <TableHead className="text-white/50 text-xs">{t('biz.invoiceNumber')}</TableHead>
                        <TableHead className="text-white/50 text-xs hidden sm:table-cell">{t('biz.invoiceCustomer')}</TableHead>
                        <TableHead className="text-white/50 text-xs">{t('biz.invoiceStatus')}</TableHead>
                        <TableHead className="text-white/50 text-xs text-right">{t('biz.invoiceTotal')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.invoices.map((inv) => {
                        const statusClass = inv.status === 'paid' ? 'bg-[#03DAC6]/20 text-[#03DAC6]' : inv.status === 'overdue' ? 'bg-[#CF6679]/20 text-[#CF6679]' : 'bg-[#FFD700]/20 text-[#FFD700]';
                        return (
                          <TableRow key={inv.id} className="border-white/[0.04] hover:bg-white/[0.02]">
                            <TableCell className="text-white text-xs py-2 font-medium">{inv.invoiceNumber}</TableCell>
                            <TableCell className="text-white/60 text-xs py-2 hidden sm:table-cell">{inv.customer?.name || '-'}</TableCell>
                            <TableCell className="py-2">
                              <Badge variant="outline" className={cn('text-xs font-normal border-0', statusClass)}>
                                {inv.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-white text-xs text-right py-2 font-medium">{formatAmount(inv.total)}</TableCell>
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
          <Card className="bg-[#1A1A2E] border border-white/[0.06] rounded-2xl">
            <CardContent className="p-0">
              {loading ? (
                <div className="space-y-3 p-4">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-10 rounded-lg bg-white/[0.06]" />
                  ))}
                </div>
              ) : !data || data.debts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-white/40">
                  <CreditCard className="h-8 w-8 mb-2 opacity-40" />
                  <p className="text-sm">{t('biz.noBizData')}</p>
                </div>
              ) : (
                <div className="max-h-[400px] overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-white/[0.06] hover:bg-transparent">
                        <TableHead className="text-white/50 text-xs">{t('biz.debtCounterpart')}</TableHead>
                        <TableHead className="text-white/50 text-xs">{t('biz.debtStatus')}</TableHead>
                        <TableHead className="text-white/50 text-xs">{t('biz.debtAmount')}</TableHead>
                        <TableHead className="text-white/50 text-xs text-right">{t('biz.debtRemaining')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.debts.map((debt) => (
                        <TableRow key={debt.id} className="border-white/[0.04] hover:bg-white/[0.02]">
                          <TableCell className="text-white text-xs py-2 font-medium">{debt.counterpart}</TableCell>
                          <TableCell className="py-2">
                            <Badge
                              variant="outline"
                              className={cn(
                                'text-xs font-normal border-0',
                                debt.type === 'hutang' ? 'bg-[#CF6679]/20 text-[#CF6679]' : 'bg-[#03DAC6]/20 text-[#03DAC6]'
                              )}
                            >
                              {debt.type}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-white/70 text-xs py-2">{formatAmount(debt.amount)}</TableCell>
                          <TableCell className={cn('text-xs text-right py-2 font-medium', debt.remaining > 0 ? 'text-[#FFD700]' : 'text-[#03DAC6]')}>
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
    </div>
  );
}
