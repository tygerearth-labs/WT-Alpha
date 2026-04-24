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
  DollarSign, CreditCard, Wallet,
  CalendarDays, BarChart3, Receipt, ArrowUpRight, ArrowDownRight, ArrowRight,
  AlertTriangle, Info,
} from 'lucide-react';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

// ─── THEME ─────────────────────────────────────────────────────
const THEME = {
  bg: '#000000',
  surface: '#121212',
  primary: '#BB86FC',
  secondary: '#03DAC6',
  destructive: '#CF6679',
  warning: '#F9A825',
  muted: '#9E9E9E',
  border: 'rgba(255,255,255,0.08)',
  borderHover: 'rgba(255,255,255,0.15)',
  text: '#FFFFFF',
  textSecondary: '#B3B3B3',
};

const cardStyle: React.CSSProperties = { background: THEME.surface, border: `1px solid ${THEME.border}` };
const inputStyle: React.CSSProperties = { background: THEME.surface, border: `1px solid ${THEME.border}`, color: THEME.text };

/* ------------------------------------------------------------------ */
/*  Raw API response types                                              */
/* ------------------------------------------------------------------ */

interface ApiSalesItem {
  tanggal: string;
  pelanggan: string;
  deskripsi: string;
  jumlah: number;
  metodePembayaran: string;
  catatan: string;
}

interface ApiCashItem {
  tanggal: string;
  tipe: string;
  jumlah: number;
  deskripsi: string;
  kategori: string;
  catatan: string;
}

interface ApiInvoiceItem {
  nomorInvoice: string;
  pelanggan: string;
  tanggal: string;
  tanggalJatuhTempo: string;
  subtotal: number;
  pajak: number;
  diskon: number;
  total: number;
  status: string;
}

interface ApiDebtItem {
  tipe: string;
  pihak: string;
  jumlah: number;
  sisa: number;
  tanggalJatuhTempo: string;
  status: string;
  deskripsi: string;
}

interface ApiResponse {
  report: {
    businessName?: string;
    overallSummary?: {
      totalPendapatan: number;
      totalPengeluaran: number;
      laba: number;
      totalKasBesar: number;
      totalKasKecil: number;
      saldoBersih: number;
      totalHutang: number;
      totalPiutang: number;
    };
    sales?: { data: ApiSalesItem[] };
    cash?: { data: ApiCashItem[] };
    invoices?: { data: ApiInvoiceItem[] };
    debts?: { data: ApiDebtItem[] };
  };
}

/* ------------------------------------------------------------------ */
/*  Normalized data used by the UI                                     */
/* ------------------------------------------------------------------ */

interface ReportSummary {
  totalRevenue: number;
  totalExpense: number;
  netIncome: number;
  totalSales: number;
  totalCashIn: number;
  totalCashOut: number;
  totalHutang: number;
  totalPiutang: number;
}

interface SalesRow {
  id: string;
  description: string;
  amount: number;
  date: string;
  customer: string;
  paymentMethod: string;
}

interface ExpenseRow {
  id: string;
  description: string;
  amount: number;
  date: string;
  category: string;
}

interface InvoiceRow {
  id: string;
  invoiceNumber: string;
  total: number;
  date: string;
  status: string;
  customer: string;
}

interface DebtRow {
  id: string;
  type: string;
  counterpart: string;
  amount: number;
  remaining: number;
  dueDate: string;
  status: string;
}

interface PiutangDetailRow {
  id: string;
  counterpart: string;
  amount: number;
  paid: number;
  remaining: number;
  daysOverdue: number;
  status: string;
}

interface ReportData {
  summary: ReportSummary;
  sales: SalesRow[];
  expenses: ExpenseRow[];
  invoices: InvoiceRow[];
  debts: DebtRow[];
}

/* ------------------------------------------------------------------ */
/*  Expense Breakdown Bar Chart                                         */
/* ------------------------------------------------------------------ */

function ExpenseBreakdownChart({ expenses, formatAmount }: {
  expenses: ExpenseRow[];
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
  const barColors = [THEME.destructive, THEME.primary, THEME.warning, THEME.secondary, '#FF8A65', '#82B1FF'];

  if (categoryData.length === 0) return null;

  return (
    <div className="space-y-2.5">
      {categoryData.map(([cat, amount], i) => {
        const pct = (amount / maxAmount) * 100;
        return (
          <div key={cat} className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium truncate max-w-[140px]" style={{ color: THEME.textSecondary }}>{cat}</span>
              <span style={{ color: THEME.muted }}>{formatAmount(amount)}</span>
            </div>
            <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: THEME.border }}>
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${pct}%`,
                  backgroundColor: barColors[i % barColors.length],
                  transitionDelay: `${i * 0.08}s`,
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Date Range Indicator                                               */
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
      <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: THEME.border }}>
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${progress * 100}%`,
            background: `linear-gradient(to right, ${THEME.primary}, ${THEME.secondary})`,
          }}
        />
      </div>
      <span className="text-[10px] whitespace-nowrap" style={{ color: THEME.muted }}>{totalDays} hari</span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Normalize raw API response → flat UI data                          */
/* ------------------------------------------------------------------ */

function normalizeResponse(raw: ApiResponse): ReportData | null {
  const r = raw?.report;
  if (!r) return null;

  const os = r.overallSummary;

  const sales: SalesRow[] = (r.sales?.data || []).map((s, i) => ({
    id: `sale-${i}`,
    description: s.deskripsi,
    amount: s.jumlah,
    date: s.tanggal,
    customer: s.pelanggan,
    paymentMethod: s.metodePembayaran,
  }));

  const expenses: ExpenseRow[] = (r.cash?.data || [])
    .filter((c) => c.tipe === 'kas_keluar')
    .map((c, i) => ({
      id: `exp-${i}`,
      description: c.deskripsi,
      amount: c.jumlah,
      date: c.tanggal,
      category: c.kategori,
    }));

  const invoices: InvoiceRow[] = (r.invoices?.data || []).map((inv, i) => ({
    id: `inv-${i}`,
    invoiceNumber: inv.nomorInvoice,
    total: inv.total,
    date: inv.tanggal,
    status: inv.status,
    customer: inv.pelanggan,
  }));

  const debts: DebtRow[] = (r.debts?.data || []).map((d, i) => ({
    id: `debt-${i}`,
    type: d.tipe,
    counterpart: d.pihak,
    amount: d.jumlah,
    remaining: d.sisa,
    dueDate: d.tanggalJatuhTempo,
    status: d.status,
  }));

  const summary: ReportSummary = {
    totalRevenue: os?.totalPendapatan ?? 0,
    totalExpense: os?.totalPengeluaran ?? 0,
    netIncome: os?.laba ?? 0,
    totalSales: os?.totalPendapatan ?? 0,
    totalCashIn: os?.totalKasBesar ?? 0,
    totalCashOut: os?.totalPengeluaran ?? 0,
    totalHutang: os?.totalHutang ?? 0,
    totalPiutang: os?.totalPiutang ?? 0,
  };

  return { summary, sales, expenses, invoices, debts };
}

/* ------------------------------------------------------------------ */
/*  Empty State                                                        */
/* ------------------------------------------------------------------ */

function EmptyState({ icon: Icon, color, text }: { icon: React.ElementType; color: string; text: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <div className="h-14 w-14 rounded-xl flex items-center justify-center mb-3" style={{ background: THEME.surface, border: `1px solid ${THEME.border}` }}>
        <Icon className="h-7 w-7" style={{ color: `${color}50` }} />
      </div>
      <p className="text-sm" style={{ color: THEME.textSecondary }}>{text}</p>
    </div>
  );
}

/* ================================================================== */
/*  Main Component                                                      */
/* ================================================================== */

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
      .then((raw: ApiResponse) => {
        const normalized = normalizeResponse(raw);
        setData(normalized);
      })
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [businessId, fromDate, toDate]);

  useEffect(() => {
    if (businessId) fetchReport();
  }, [businessId, fetchReport]);

  /* ── Tax Audit Derivatives ── */
  const taxAudit = useMemo(() => {
    if (!data) return null;
    const piutangDebts = data.debts.filter((d) => d.type === 'piutang');
    const totalPiutangRemaining = piutangDebts.reduce((s, d) => s + d.remaining, 0);
    const totalPiutangPaid = piutangDebts.reduce((s, d) => s + (d.amount - d.remaining), 0);

    // Sales split: cash vs installment proxy
    const cashSales = data.sales.filter((s) => !s.paymentMethod || s.paymentMethod === 'cash' || s.paymentMethod === 'tunai');
    const installmentSales = data.sales.filter((s) => s.paymentMethod && (s.paymentMethod === 'cicilan' || s.paymentMethod === 'installment' || s.paymentMethod === 'kredit'));
    const pendapatanTunai = cashSales.reduce((s, sl) => s + sl.amount, 0);
    const pendapatanCicilan = installmentSales.reduce((s, sl) => s + sl.amount, 0);

    // DP received = portion of installment sales that's been paid as DP
    // We estimate: total piutang paid from installment sales
    const dpDiterima = totalPiutangPaid;
    const cicilanDiterima = totalPiutangPaid; // same as paid installments
    const totalPiutangBelumDibayar = totalPiutangRemaining;
    const labaRugiReal = pendapatanTunai + totalPiutangPaid - data.summary.totalExpense;

    return {
      pendapatanTunai,
      pendapatanCicilan,
      dpDiterima,
      cicilanDiterima,
      totalPiutangBelumDibayar,
      labaRugiReal,
    };
  }, [data]);

  /* ── Piutang Detail ── */
  const piutangDetail = useMemo((): PiutangDetailRow[] => {
    if (!data) return [];
    const now = new Date();
    return data.debts
      .filter((d) => d.type === 'piutang' && d.status !== 'paid')
      .map((d) => {
        const paid = d.amount - d.remaining;
        const daysOverdue = d.dueDate && d.dueDate !== '-'
          ? Math.max(0, Math.floor((now.getTime() - new Date(d.dueDate).getTime()) / (1000 * 60 * 60 * 24)))
          : 0;
        return {
          id: d.id,
          counterpart: d.counterpart,
          amount: d.amount,
          paid,
          remaining: d.remaining,
          daysOverdue,
          status: d.status,
        };
      })
      .sort((a, b) => b.daysOverdue - a.daysOverdue);
  }, [data]);

  /* ── Export Excel ── */
  const handleExportExcel = async () => {
    if (!businessId || !data) return;
    setExporting('excel');
    try {
      const XLSX = await import('xlsx');
      const wb = XLSX.utils.book_new();

      if (data.sales.length > 0) {
        const rows = data.sales.map((s) => ({
          Tanggal: s.date, Deskripsi: s.description, Pelanggan: s.customer,
          Metode: s.paymentMethod, Jumlah: s.amount,
        }));
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'Penjualan');
      }

      if (data.expenses.length > 0) {
        const rows = data.expenses.map((e) => ({
          Tanggal: e.date, Deskripsi: e.description, Kategori: e.category, Jumlah: e.amount,
        }));
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'Pengeluaran');
      }

      if (data.invoices.length > 0) {
        const rows = data.invoices.map((inv) => ({
          'No Invoice': inv.invoiceNumber, Pelanggan: inv.customer,
          Total: inv.total, Status: inv.status, Tanggal: inv.date,
        }));
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'Invoice');
      }

      if (data.debts.length > 0) {
        const rows = data.debts.map((d) => ({
          Pihak: d.counterpart, Tipe: d.type, Jumlah: d.amount,
          Sisa: d.remaining, 'Jatuh Tempo': d.dueDate,
        }));
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'Hutang Piutang');
      }

      XLSX.writeFile(wb, `Laporan_Bisnis_${fromDate}_${toDate}.xlsx`);
      toast.success('Export berhasil!');
    } catch {
      toast.error(t('common.error'));
    } finally {
      setExporting(null);
    }
  };

  /* ── Export PDF ── */
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
      doc.text(`Periode: ${fromDate} - ${toDate}`, 14, 28);

      let yPos = 40;
      doc.setFontSize(12);
      doc.text('Ringkasan', 14, yPos);
      yPos += 8;
      doc.setFontSize(10);

      autoTable(doc, {
        startY: yPos,
        head: [['Keterangan', 'Jumlah']],
        body: [
          ['Pendapatan', formatAmount(data.summary.totalRevenue)],
          ['Pengeluaran', formatAmount(data.summary.totalExpense)],
          ['Laba Bersih', formatAmount(data.summary.netIncome)],
          ['Total Hutang', formatAmount(data.summary.totalHutang)],
          ['Total Piutang', formatAmount(data.summary.totalPiutang)],
        ],
        theme: 'grid',
        headStyles: { fillColor: [187, 134, 252], textColor: 0 },
        styles: { fontSize: 9 },
      });

      yPos = (doc as unknown as Record<string, unknown>).lastAutoTable != null
        ? ((doc as unknown as Record<string, Record<string, number>>).lastAutoTable.finalY + 15)
        : yPos + 60;

      if (data.sales.length > 0) {
        doc.setFontSize(12);
        doc.text('Penjualan', 14, yPos);
        yPos += 4;
        autoTable(doc, {
          startY: yPos,
          head: [['Tanggal', 'Deskripsi', 'Pelanggan', 'Jumlah']],
          body: data.sales.slice(0, 50).map((s) => [s.date, s.description, s.customer, formatAmount(s.amount)]),
          theme: 'grid',
          headStyles: { fillColor: [187, 134, 252], textColor: 0 },
          styles: { fontSize: 8 },
        });
      }

      doc.save(`Laporan_Bisnis_${fromDate}_${toDate}.pdf`);
      toast.success('Export berhasil!');
    } catch {
      toast.error(t('common.error'));
    } finally {
      setExporting(null);
    }
  };

  if (!businessId) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-center" style={{ color: THEME.textSecondary }}>{t('biz.registerFirst')}</p>
      </div>
    );
  }

  const summaryCards = data
    ? [
        { label: t('biz.bizRevenue'), value: data.summary.totalRevenue, color: THEME.secondary, icon: TrendingUp },
        { label: t('biz.bizExpense'), value: data.summary.totalExpense, color: THEME.destructive, icon: TrendingDown },
        { label: t('biz.bizNetIncome'), value: data.summary.netIncome, color: data.summary.netIncome >= 0 ? THEME.secondary : THEME.destructive, icon: DollarSign },
        { label: t('biz.totalPenjualan'), value: data.summary.totalSales, color: THEME.primary, icon: Wallet },
      ]
    : [];

  return (
    <div className="space-y-3">
      {/* Info Banner */}
      <div className="flex items-start gap-2.5 p-3 rounded-xl" style={{ background: `${THEME.primary}08`, border: `1px solid ${THEME.primary}15` }}>
        <Info className="h-4 w-4 shrink-0 mt-0.5" style={{ color: THEME.primary }} />
        <p className="text-xs leading-relaxed" style={{ color: THEME.textSecondary }}>
          Laporan keuangan bisnis untuk audit dan perencanaan. Data cicilan dipisah untuk akurasi laporan pajak.
        </p>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h2 className="text-base font-bold flex items-center gap-2" style={{ color: THEME.text }}>
          <div className="h-7 w-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${THEME.primary}15` }}>
            <FileBarChart className="h-3.5 w-3.5" style={{ color: THEME.primary }} />
          </div>
          {t('biz.bizLaporan')}
        </h2>
        <div className="flex gap-2">
          <Button
            onClick={handleExportExcel}
            size="sm"
            variant="outline"
            disabled={exporting === 'excel' || loading}
            className="rounded-lg text-xs h-8"
            style={{ borderColor: `${THEME.secondary}25`, color: THEME.secondary }}
          >
            {exporting === 'excel' ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Download className="mr-1 h-3 w-3" />}
            {t('biz.exportExcel')}
          </Button>
          <Button
            onClick={handleExportPDF}
            size="sm"
            variant="outline"
            disabled={exporting === 'pdf' || loading}
            className="rounded-lg text-xs h-8"
            style={{ borderColor: `${THEME.destructive}25`, color: THEME.destructive }}
          >
            {exporting === 'pdf' ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Download className="mr-1 h-3 w-3" />}
            {t('biz.exportPDF')}
          </Button>
        </div>
      </div>

      {/* Date Range Filter */}
      <Card className="rounded-xl" style={cardStyle}>
        <CardContent className="p-3 sm:p-4">
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
            <div className="flex items-center gap-2 shrink-0">
              <div className="h-6 w-6 rounded-md flex items-center justify-center" style={{ backgroundColor: `${THEME.primary}15` }}>
                <CalendarDays className="h-3 w-3" style={{ color: THEME.primary }} />
              </div>
              <Label className="text-[10px] font-medium uppercase tracking-wider" style={{ color: THEME.muted }}>{t('biz.cashDate')}</Label>
            </div>
            <div className="flex items-center gap-2 flex-1 flex-wrap">
              <Input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="w-36 h-8 text-xs rounded-lg"
                style={inputStyle}
              />
              <div className="h-5 w-6 rounded flex items-center justify-center" style={{ background: `${THEME.primary}15` }}>
                <ArrowRight className="h-3 w-3" style={{ color: THEME.primary }} />
              </div>
              <Input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="w-36 h-8 text-xs rounded-lg"
                style={inputStyle}
              />
            </div>
            <Button
              onClick={fetchReport}
              size="sm"
              className="rounded-lg h-8 text-xs"
              style={{ backgroundColor: THEME.primary, color: '#000' }}
            >
              {loading ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <BarChart3 className="mr-1 h-3 w-3" />}
              Lihat Laporan
            </Button>
          </div>
          <DateRangeIndicator fromDate={fromDate} toDate={toDate} />
        </CardContent>
      </Card>

      {/* Summary Cards */}
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" style={{ background: THEME.surface }} />
          ))}
        </div>
      ) : data ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
          {summaryCards.map((card) => {
            const Icon = card.icon;
            return (
              <Card key={card.label} className="rounded-xl overflow-hidden" style={cardStyle}>
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="h-7 w-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${card.color}15` }}>
                      <Icon className="h-3.5 w-3.5" style={{ color: card.color }} />
                    </div>
                    <div className="h-5 w-5 rounded-full flex items-center justify-center" style={{ backgroundColor: `${card.color}15` }}>
                      {card.color === THEME.secondary || (card.label === t('biz.bizNetIncome') && data.summary.netIncome >= 0) ? (
                        <ArrowUpRight className="h-3 w-3" style={{ color: THEME.secondary }} />
                      ) : (
                        <ArrowDownRight className="h-3 w-3" style={{ color: THEME.destructive }} />
                      )}
                    </div>
                  </div>
                  <p className="text-[10px] font-medium uppercase tracking-wider" style={{ color: THEME.muted }}>{card.label}</p>
                  <p className="text-base font-bold tabular-nums mt-0.5" style={{ color: card.color }}>
                    {formatAmount(card.value)}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : null}

      {/* Tax Audit Summary */}
      {data && taxAudit && (
        <Card className="rounded-xl" style={{ background: THEME.surface, border: `1px solid ${THEME.warning}25` }}>
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="h-6 w-6 rounded-md flex items-center justify-center" style={{ backgroundColor: `${THEME.warning}15` }}>
                <AlertTriangle className="h-3 w-3" style={{ color: THEME.warning }} />
              </div>
              <h3 className="text-xs font-semibold" style={{ color: THEME.warning }}>Detail Audit Pajak</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {[
                { label: 'Pendapatan Tunai', value: taxAudit.pendapatanTunai, color: THEME.secondary, highlight: false },
                { label: 'Pendapatan Cicilan (Total)', value: taxAudit.pendapatanCicilan, color: THEME.primary, highlight: false },
                { label: 'Pendapatan Cicilan — Diterima', value: taxAudit.dpDiterima, color: THEME.secondary, highlight: false },
                { label: 'Total Piutang Belum Dibayar', value: taxAudit.totalPiutangBelumDibayar, color: THEME.warning, highlight: true },
                { label: 'Pengeluaran', value: data.summary.totalExpense, color: THEME.destructive, highlight: false },
                { label: 'LABA RUGI REAL', value: taxAudit.labaRugiReal, color: taxAudit.labaRugiReal >= 0 ? THEME.secondary : THEME.destructive, highlight: true },
              ].map((item) => (
                <div
                  key={item.label}
                  className="flex items-center justify-between p-2 rounded-lg"
                  style={{
                    background: item.highlight ? `${item.color}08` : 'transparent',
                    border: item.highlight ? `1px solid ${item.color}20` : `1px solid ${THEME.border}`,
                  }}
                >
                  <span className="text-[10px] font-medium" style={{ color: THEME.muted }}>{item.label}</span>
                  <span className="text-xs font-bold tabular-nums" style={{ color: item.color }}>
                    {formatAmount(item.value)}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Expense Breakdown Chart */}
      {data && data.expenses.length > 0 && !loading && (
        <Card className="rounded-xl" style={cardStyle}>
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="h-6 w-6 rounded-md flex items-center justify-center" style={{ backgroundColor: `${THEME.destructive}15` }}>
                <BarChart3 className="h-3 w-3" style={{ color: THEME.destructive }} />
              </div>
              <h3 className="text-xs font-semibold" style={{ color: THEME.text }}>Expense Breakdown</h3>
              <Badge className="ml-auto text-[9px] font-medium rounded-full px-1.5 py-0" style={{ backgroundColor: `${THEME.destructive}15`, color: THEME.destructive, border: `1px solid ${THEME.destructive}20` }}>
                {data.expenses.length} items
              </Badge>
            </div>
            <ExpenseBreakdownChart expenses={data.expenses} formatAmount={formatAmount} />
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full sm:w-auto rounded-xl p-1 h-auto" style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${THEME.border}` }}>
          {[
            { value: 'sales', label: t('biz.penjualan'), color: THEME.primary },
            { value: 'expenses', label: t('biz.kasKeluar'), color: THEME.destructive },
            { value: 'invoices', label: t('biz.invoices'), color: THEME.warning },
            { value: 'debts', label: t('biz.hutangPiutang'), color: THEME.secondary },
            { value: 'piutang', label: 'Piutang Detail', color: THEME.warning },
          ].map((tab) => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className="rounded-lg text-xs px-3 py-1.5 data-[state=active]:shadow-none"
              style={activeTab === tab.value
                ? { color: tab.color, backgroundColor: `${tab.color}15` }
                : { color: THEME.muted }
              }
            >
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* Sales Tab */}
        <TabsContent value="sales" className="mt-3">
          <Card className="rounded-xl overflow-hidden" style={cardStyle}>
            <CardContent className="p-0">
              {loading ? (
                <div className="space-y-2 p-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-10 rounded-lg" style={{ background: THEME.border }} />
                  ))}
                </div>
              ) : !data || data.sales.length === 0 ? (
                <EmptyState icon={TrendingUp} color={THEME.primary} text="Belum ada penjualan di periode ini" />
              ) : (
                <div className="max-h-96 overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent" style={{ borderBottom: `1px solid ${THEME.border}` }}>
                        <TableHead className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: THEME.muted }}>{t('biz.cashDate')}</TableHead>
                        <TableHead className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: THEME.muted }}>{t('biz.saleDescription')}</TableHead>
                        <TableHead className="text-[10px] font-semibold uppercase tracking-wider hidden sm:table-cell" style={{ color: THEME.muted }}>Pelanggan</TableHead>
                        <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-right" style={{ color: THEME.muted }}>{t('biz.saleAmount')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.sales.map((sale, idx) => (
                        <TableRow key={sale.id} className="transition-colors duration-150" style={{ background: idx % 2 === 1 ? 'rgba(255,255,255,0.015)' : 'transparent', borderBottom: `1px solid ${THEME.border}` }}>
                          <TableCell className="text-xs py-2" style={{ color: THEME.textSecondary }}>{sale.date}</TableCell>
                          <TableCell className="text-xs py-2 font-medium" style={{ color: THEME.text }}>{sale.description}</TableCell>
                          <TableCell className="text-xs py-2 hidden sm:table-cell" style={{ color: THEME.textSecondary }}>{sale.customer}</TableCell>
                          <TableCell className="text-xs text-right py-2 font-semibold" style={{ color: THEME.secondary }}>{formatAmount(sale.amount)}</TableCell>
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
        <TabsContent value="expenses" className="mt-3">
          <Card className="rounded-xl overflow-hidden" style={cardStyle}>
            <CardContent className="p-0">
              {loading ? (
                <div className="space-y-2 p-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-10 rounded-lg" style={{ background: THEME.border }} />
                  ))}
                </div>
              ) : !data || data.expenses.length === 0 ? (
                <EmptyState icon={TrendingDown} color={THEME.destructive} text="Belum ada pengeluaran di periode ini" />
              ) : (
                <div className="max-h-96 overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent" style={{ borderBottom: `1px solid ${THEME.border}` }}>
                        <TableHead className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: THEME.muted }}>{t('biz.cashDate')}</TableHead>
                        <TableHead className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: THEME.muted }}>{t('biz.cashDescription')}</TableHead>
                        <TableHead className="text-[10px] font-semibold uppercase tracking-wider hidden sm:table-cell" style={{ color: THEME.muted }}>{t('biz.cashCategory')}</TableHead>
                        <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-right" style={{ color: THEME.muted }}>{t('biz.cashAmount')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.expenses.map((exp, idx) => (
                        <TableRow key={exp.id} className="transition-colors duration-150" style={{ background: idx % 2 === 1 ? 'rgba(255,255,255,0.015)' : 'transparent', borderBottom: `1px solid ${THEME.border}` }}>
                          <TableCell className="text-xs py-2" style={{ color: THEME.textSecondary }}>{exp.date}</TableCell>
                          <TableCell className="text-xs py-2 font-medium" style={{ color: THEME.text }}>{exp.description}</TableCell>
                          <TableCell className="py-2 hidden sm:table-cell">
                            <Badge className="text-[9px] font-medium rounded-full px-1.5 py-0" style={{ backgroundColor: `${THEME.muted}10`, color: THEME.textSecondary, border: `1px solid ${THEME.border}` }}>{exp.category || '-'}</Badge>
                          </TableCell>
                          <TableCell className="text-xs text-right py-2 font-semibold" style={{ color: THEME.destructive }}>-{formatAmount(exp.amount)}</TableCell>
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
        <TabsContent value="invoices" className="mt-3">
          <Card className="rounded-xl overflow-hidden" style={cardStyle}>
            <CardContent className="p-0">
              {loading ? (
                <div className="space-y-2 p-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-10 rounded-lg" style={{ background: THEME.border }} />
                  ))}
                </div>
              ) : !data || data.invoices.length === 0 ? (
                <EmptyState icon={Receipt} color={THEME.warning} text="Belum ada invoice di periode ini" />
              ) : (
                <div className="max-h-96 overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent" style={{ borderBottom: `1px solid ${THEME.border}` }}>
                        <TableHead className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: THEME.muted }}>{t('biz.invoiceNumber')}</TableHead>
                        <TableHead className="text-[10px] font-semibold uppercase tracking-wider hidden sm:table-cell" style={{ color: THEME.muted }}>Pelanggan</TableHead>
                        <TableHead className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: THEME.muted }}>{t('biz.invoiceStatus')}</TableHead>
                        <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-right" style={{ color: THEME.muted }}>{t('biz.invoiceTotal')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.invoices.map((inv, idx) => {
                        const statusStyle = inv.status === 'paid'
                          ? { backgroundColor: `${THEME.secondary}15`, color: THEME.secondary, border: `1px solid ${THEME.secondary}25` }
                          : inv.status === 'overdue'
                            ? { backgroundColor: `${THEME.destructive}15`, color: THEME.destructive, border: `1px solid ${THEME.destructive}25` }
                            : { backgroundColor: `${THEME.warning}15`, color: THEME.warning, border: `1px solid ${THEME.warning}25` };
                        return (
                          <TableRow key={inv.id} className="transition-colors duration-150" style={{ background: idx % 2 === 1 ? 'rgba(255,255,255,0.015)' : 'transparent', borderBottom: `1px solid ${THEME.border}` }}>
                            <TableCell className="text-xs py-2 font-medium" style={{ color: THEME.text }}>{inv.invoiceNumber}</TableCell>
                            <TableCell className="text-xs py-2 hidden sm:table-cell" style={{ color: THEME.textSecondary }}>{inv.customer}</TableCell>
                            <TableCell className="py-2">
                              <Badge variant="outline" className="text-[9px] font-medium rounded-full px-1.5 py-0" style={statusStyle}>
                                {inv.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-xs text-right py-2 font-semibold" style={{ color: THEME.text }}>{formatAmount(inv.total)}</TableCell>
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
        <TabsContent value="debts" className="mt-3">
          <Card className="rounded-xl overflow-hidden" style={cardStyle}>
            <CardContent className="p-0">
              {loading ? (
                <div className="space-y-2 p-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-10 rounded-lg" style={{ background: THEME.border }} />
                  ))}
                </div>
              ) : !data || data.debts.length === 0 ? (
                <EmptyState icon={CreditCard} color={THEME.secondary} text="Belum ada hutang/piutang" />
              ) : (
                <div className="max-h-96 overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent" style={{ borderBottom: `1px solid ${THEME.border}` }}>
                        <TableHead className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: THEME.muted }}>{t('biz.debtCounterpart')}</TableHead>
                        <TableHead className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: THEME.muted }}>{t('biz.debtStatus')}</TableHead>
                        <TableHead className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: THEME.muted }}>{t('biz.debtAmount')}</TableHead>
                        <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-right" style={{ color: THEME.muted }}>{t('biz.debtRemaining')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.debts.map((debt, idx) => (
                        <TableRow key={debt.id} className="transition-colors duration-150" style={{ background: idx % 2 === 1 ? 'rgba(255,255,255,0.015)' : 'transparent', borderBottom: `1px solid ${THEME.border}` }}>
                          <TableCell className="text-xs py-2 font-medium" style={{ color: THEME.text }}>{debt.counterpart}</TableCell>
                          <TableCell className="py-2">
                            <Badge variant="outline" className="text-[9px] font-medium rounded-full px-1.5 py-0" style={
                              debt.type === 'hutang'
                                ? { backgroundColor: `${THEME.destructive}15`, color: THEME.destructive, border: `1px solid ${THEME.destructive}25` }
                                : { backgroundColor: `${THEME.secondary}15`, color: THEME.secondary, border: `1px solid ${THEME.secondary}25` }
                            }>
                              {debt.type}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs py-2" style={{ color: THEME.textSecondary }}>{formatAmount(debt.amount)}</TableCell>
                          <TableCell className="text-xs text-right py-2 font-semibold" style={{ color: debt.remaining > 0 ? THEME.warning : THEME.secondary }}>
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

        {/* Piutang Detail Tab */}
        <TabsContent value="piutang" className="mt-3">
          <Card className="rounded-xl overflow-hidden" style={{ background: THEME.surface, border: `1px solid ${THEME.warning}25` }}>
            <CardContent className="p-0">
              <div className="flex items-center gap-2 p-3 sm:p-4" style={{ borderBottom: `1px solid ${THEME.border}` }}>
                <div className="h-6 w-6 rounded-md flex items-center justify-center" style={{ backgroundColor: `${THEME.warning}15` }}>
                  <AlertTriangle className="h-3 w-3" style={{ color: THEME.warning }} />
                </div>
                <h3 className="text-xs font-semibold" style={{ color: THEME.warning }}>Piutang Belum Lunas</h3>
                <Badge className="ml-auto text-[9px] font-medium rounded-full px-1.5 py-0" style={{ backgroundColor: `${THEME.warning}15`, color: THEME.warning, border: `1px solid ${THEME.warning}20` }}>
                  {piutangDetail.length}
                </Badge>
              </div>
              {loading ? (
                <div className="space-y-2 p-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-10 rounded-lg" style={{ background: THEME.border }} />
                  ))}
                </div>
              ) : piutangDetail.length === 0 ? (
                <EmptyState icon={CreditCard} color={THEME.secondary} text="Tidak ada piutang yang belum lunas" />
              ) : (
                <div className="max-h-96 overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent" style={{ borderBottom: `1px solid ${THEME.border}` }}>
                        <TableHead className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: THEME.muted }}>Pelanggan</TableHead>
                        <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-right" style={{ color: THEME.muted }}>Total</TableHead>
                        <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-right" style={{ color: THEME.muted }}>Terbayar</TableHead>
                        <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-right" style={{ color: THEME.muted }}>Sisa</TableHead>
                        <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-right" style={{ color: THEME.muted }}>Lewat Jatuh</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {piutangDetail.map((row, idx) => (
                        <TableRow key={row.id} className="transition-colors duration-150" style={{
                          background: row.daysOverdue > 0 ? `${THEME.warning}05` : idx % 2 === 1 ? 'rgba(255,255,255,0.015)' : 'transparent',
                          borderBottom: `1px solid ${THEME.border}`,
                        }}>
                          <TableCell className="text-xs py-2 font-medium" style={{ color: THEME.text }}>{row.counterpart}</TableCell>
                          <TableCell className="text-xs text-right py-2" style={{ color: THEME.textSecondary }}>{formatAmount(row.amount)}</TableCell>
                          <TableCell className="text-xs text-right py-2" style={{ color: THEME.secondary }}>{formatAmount(row.paid)}</TableCell>
                          <TableCell className="text-xs text-right py-2 font-semibold" style={{ color: THEME.warning }}>{formatAmount(row.remaining)}</TableCell>
                          <TableCell className="text-xs text-right py-2">
                            {row.daysOverdue > 0 ? (
                              <Badge className="text-[9px] font-medium rounded-full px-1.5 py-0" style={{
                                backgroundColor: row.daysOverdue > 30 ? `${THEME.destructive}15` : `${THEME.warning}15`,
                                color: row.daysOverdue > 30 ? THEME.destructive : THEME.warning,
                                border: `1px solid ${row.daysOverdue > 30 ? THEME.destructive : THEME.warning}20`,
                              }}>
                                {row.daysOverdue} hari
                              </Badge>
                            ) : (
                              <span className="text-[10px]" style={{ color: THEME.muted }}>-</span>
                            )}
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
