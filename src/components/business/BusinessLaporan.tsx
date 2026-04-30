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
  AlertTriangle, Info, Landmark, PiggyBank, Clock, CircleDollarSign,
  Building2, ArrowDownUp, Banknote, Timer, Users, Target, Percent,
} from 'lucide-react';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

const c = {
  primary: 'var(--primary)', secondary: 'var(--secondary)', destructive: 'var(--destructive)',
  warning: 'var(--warning)', muted: 'var(--muted-foreground)', border: 'var(--border)',
  foreground: 'var(--foreground)', card: 'var(--card)',
};
const alpha = (color: string, pct: number) => `color-mix(in srgb, ${color} ${pct}%, transparent)`;

const cardStyle: React.CSSProperties = { background: 'var(--card)', border: '1px solid var(--border)' };
const inputStyle: React.CSSProperties = { background: 'var(--card)', border: '1px solid var(--border)', color: 'var(--foreground)' };

const springHover = { scale: 1.02, y: -1, transition: { type: 'spring' as const, stiffness: 300, damping: 20 } };

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
  tipe?: string;
  downPayment?: number;
  realizedAmount?: number;
  sisaPiutang?: number;
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
      labaKotor?: number;
      pendapatanTerealisasi?: number;
      pendapatanBelumTerealisasi?: number;
      totalKasBesar: number;
      totalKasKecil: number;
      saldoBersih: number;
      totalHutang: number;
      totalPiutang: number;
    };
    sales?: {
      data: ApiSalesItem[];
      summary?: Record<string, number>;
      salesBreakdown?: {
        tunai?: { jumlahTransaksi?: number; total?: number };
        cicilan?: { jumlahTransaksi?: number; totalProduk?: number; totalDPDiterima?: number; totalCicilanDiterima?: number; totalTerealisasi?: number; totalSisa?: number };
      };
    };
    cash?: {
      data: ApiCashItem[];
      summary?: { totalKasBesar?: number; totalKasKecil?: number; totalKasKeluar?: number; saldoBersih?: number };
    };
    invoices?: { data: ApiInvoiceItem[] };
    debts?: { data: ApiDebtItem[] };
    piutangDetail?: {
      berjalan?: Array<Record<string, unknown>>;
      menunggak?: Array<Record<string, unknown>>;
      selesai?: Array<Record<string, unknown>>;
      ringkasan?: Record<string, number>;
    };
    taxAudit?: {
      pengeluaranPerKategori?: Array<{ kategori: string; jumlah: number }>;
      labaRugi?: { pendapatanRealized?: number; totalPengeluaran?: number; labaBersih?: number };
      pendapatanTunai?: { total?: number };
      dpDiterima?: { total?: number };
      cicilanDiterima?: { total?: number };
    };
    investorSummary?: Record<string, unknown>;
    budgetUtilization?: Record<string, unknown>;
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
  kasBesarSaldo: number;
  kasKecilSaldo: number;
  labaKotor: number;
  pendapatanTerealisasi: number;
  pendapatanBelumTerealisasi: number;
}

interface SalesRow {
  id: string;
  description: string;
  amount: number;
  date: string;
  customer: string;
  paymentMethod: string;
  tipe?: string;
  downPayment?: number;
  realizedAmount?: number;
  sisaPiutang?: number;
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
  createdAt?: string;
}

interface ExpenseCategoryRow {
  category: string;
  total: number;
  count: number;
  percentage: number;
}

interface PiutangAgingBucket {
  label: string;
  count: number;
  total: number;
  color: string;
}

interface ApiInvestorRow {
  id: string;
  name: string;
  totalInvestment: number;
  profitSharePct: number;
  status: string;
  joinDate: string;
}

interface ApiBudgetCategoryRow {
  categoryName: string;
  budgeted: number;
  actual: number;
  remaining: number;
  utilizationPct: number;
  isOverBudget: boolean;
  allocations: Array<{ fundSource: string; amount: number }>;
}

interface ReportData {
  summary: ReportSummary;
  sales: SalesRow[];
  expenses: ExpenseRow[];
  invoices: InvoiceRow[];
  debts: DebtRow[];
  cashItems: ApiCashItem[];
  salesBreakdown?: { tunai?: { jumlahTransaksi?: number; total?: number }; cicilan?: { jumlahTransaksi?: number; totalProduk?: number; totalDPDiterima?: number; totalCicilanDiterima?: number; totalTerealisasi?: number; totalSisa?: number } };
  piutangDetailApi?: ApiResponse['report']['piutangDetail'];
  taxAuditApi?: ApiResponse['report']['taxAudit'];
  investorSummary?: {
    totalInvestors: number;
    activeInvestors: number;
    totalInvested: number;
    totalActiveInvested: number;
    investorIncomeInPeriod: number;
    investors: ApiInvestorRow[];
  };
  budgetUtilization?: {
    period: number;
    year: number;
    totalBudgeted: number;
    totalActual: number;
    categories: ApiBudgetCategoryRow[];
  };
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
  const barColors = ['var(--destructive)', 'var(--primary)', 'var(--warning)', 'var(--secondary)', '#FF8A65', '#82B1FF'];

  if (categoryData.length === 0) return null;

  return (
    <div className="space-y-2.5">
      {categoryData.map(([cat, amount], i) => {
        const pct = (amount / maxAmount) * 100;
        return (
          <div key={cat} className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium truncate max-w-[140px] text-foreground">{cat}</span>
              <span style={{ color: 'var(--muted-foreground)' }}>{formatAmount(amount)}</span>
            </div>
            <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--border)' }}>
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
      <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--border)' }}>
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${progress * 100}%`,
            background: 'linear-gradient(to right, var(--primary), var(--secondary))',
          }}
        />
      </div>
      <span className="text-[10px] whitespace-nowrap" style={{ color: 'var(--muted-foreground)' }}>{totalDays} hari</span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Section Header Helper                                              */
/* ------------------------------------------------------------------ */

function SectionHeader({ icon: Icon, color, title, badge }: {
  icon: React.ElementType;
  color: string;
  title: string;
  badge?: string | number;
}) {
  return (
    <div className="biz-section-header flex items-center gap-2 mb-3">
      <div className="biz-section-header-icon h-6 w-6 rounded-md flex items-center justify-center" style={{ backgroundColor: `color-mix(in srgb, ${color} 8%, transparent)` }}>
        <Icon className="h-3 w-3" style={{ color } as React.CSSProperties} />
      </div>
      <h3 className="text-xs font-semibold" style={{ color } as React.CSSProperties}>{title}</h3>
      {badge !== undefined && (
        <Badge className="ml-auto text-[9px] font-medium rounded-full px-1.5 py-0" style={{
          backgroundColor: `color-mix(in srgb, ${color} 8%, transparent)`,
          color: color as string,
          border: `1px solid color-mix(in srgb, ${color} 12%, transparent)`,
        }}>
          {badge}
        </Badge>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Progress Bar Helper                                                */
/* ------------------------------------------------------------------ */

function ProgressBar({ value, max, color, height = 6 }: {
  value: number;
  max: number;
  color: string;
  height?: number;
}) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div className="biz-progress-track rounded-full overflow-hidden" style={{ backgroundColor: 'var(--border)', height: `${height}px` }}>
      <div
        className="biz-progress-fill h-full rounded-full transition-all duration-700"
        style={{ width: `${pct}%`, backgroundColor: color }}
      />
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
    tipe: s.tipe,
    downPayment: s.downPayment,
    realizedAmount: s.realizedAmount,
    sisaPiutang: s.sisaPiutang,
  }));

  const cashItems = r.cash?.data || [];

  const expenses: ExpenseRow[] = cashItems
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
    kasBesarSaldo: os?.totalKasBesar ?? 0,
    kasKecilSaldo: os?.totalKasKecil ?? 0,
    labaKotor: os?.labaKotor ?? 0,
    pendapatanTerealisasi: os?.pendapatanTerealisasi ?? 0,
    pendapatanBelumTerealisasi: os?.pendapatanBelumTerealisasi ?? 0,
  };

  return {
    summary,
    sales,
    expenses,
    invoices,
    debts,
    cashItems,
    salesBreakdown: r.sales?.salesBreakdown,
    piutangDetailApi: r.piutangDetail,
    taxAuditApi: r.taxAudit,
    investorSummary: r.investorSummary as ReportData['investorSummary'],
    budgetUtilization: r.budgetUtilization as ReportData['budgetUtilization'],
  };
}

/* ------------------------------------------------------------------ */
/*  Empty State                                                        */
/* ------------------------------------------------------------------ */

function EmptyState({ icon: Icon, color, text }: { icon: React.ElementType; color: string; text: string }) {
  return (
    <motion.div
      className="biz-empty-state flex flex-col items-center justify-center py-16"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring' as const, stiffness: 200, damping: 20 }}
    >
      <div className="relative">
        <motion.div
          className="absolute inset-0 rounded-xl"
          style={{ background: `color-mix(in srgb, ${color} 12%, transparent)`, filter: 'blur(16px)' }}
          animate={{ opacity: [0.4, 0.7, 0.4] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        />
        <div className="biz-empty-state-icon relative h-14 w-14 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, color-mix(in srgb, var(--card) 80%, transparent), color-mix(in srgb, var(--card) 60%, transparent))', border: '1px solid var(--border)' }}>
          <Icon className="h-7 w-7" style={{ color } as React.CSSProperties} />
        </div>
      </div>
      <motion.p
        className="text-sm mt-4"
        style={{ color: 'var(--muted-foreground)' }}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >{text}</motion.p>
    </motion.div>
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
  const [activeTab, setActiveTab] = useState('labaRugi');

  const today = new Date();
  const thirtyDaysAgo = new Date(today);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [fromDate, setFromDate] = useState(thirtyDaysAgo.toISOString().split('T')[0]);
  const [toDate, setToDate] = useState(today.toISOString().split('T')[0]);

  const [exporting, setExporting] = useState<string | null>(null);
  const [plCashData, setPlCashData] = useState<{ totalPendapatan: number; totalPengeluaran: number; loading: boolean }>({ totalPendapatan: 0, totalPengeluaran: 0, loading: false });
  const businessId = activeBusiness?.id;

  /* ── P&L Cash API fetch (kas_besar + kas_kecil = pendapatan, kas_keluar = pengeluaran) ── */
  const fetchPlCash = useCallback(() => {
    if (!businessId) return;
    setPlCashData(prev => ({ ...prev, loading: true }));
    Promise.all([
      fetch(`/api/business/${businessId}/cash?type=kas_besar&from=${fromDate}&to=${toDate}`).then(r => r.ok ? r.json() : { data: [] }).catch(() => ({ data: [] })),
      fetch(`/api/business/${businessId}/cash?type=kas_kecil&from=${fromDate}&to=${toDate}`).then(r => r.ok ? r.json() : { data: [] }).catch(() => ({ data: [] })),
      fetch(`/api/business/${businessId}/cash?type=kas_keluar&from=${fromDate}&to=${toDate}`).then(r => r.ok ? r.json() : { data: [] }).catch(() => ({ data: [] })),
    ]).then(([besar, kecil, keluar]) => {
      const totalPendapatan = (besar.data || []).reduce((s: number, c: { jumlah?: number }) => s + (c.jumlah || 0), 0)
        + (kecil.data || []).reduce((s: number, c: { jumlah?: number }) => s + (c.jumlah || 0), 0);
      const totalPengeluaran = (keluar.data || []).reduce((s: number, c: { jumlah?: number }) => s + (c.jumlah || 0), 0);
      setPlCashData({ totalPendapatan, totalPengeluaran, loading: false });
    }).catch(() => setPlCashData(prev => ({ ...prev, loading: false })));
  }, [businessId, fromDate, toDate]);

  useEffect(() => {
    if (businessId) fetchPlCash();
  }, [businessId, fetchPlCash]);

  /* ── Computed P&L values ── */
  const plLaba = plCashData.totalPendapatan - plCashData.totalPengeluaran;
  const plMargin = plCashData.totalPendapatan > 0 ? (plLaba / plCashData.totalPendapatan) * 100 : 0;
  const isRugi = plLaba < 0;

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

  /* ── Expense by Category with percentages ── */
  const expenseCategories = useMemo((): ExpenseCategoryRow[] => {
    if (!data) return [];
    const totalExpense = data.summary.totalExpense;
    const map = new Map<string, { total: number; count: number }>();
    data.expenses.forEach((e) => {
      const cat = e.category || 'Tidak Berkategori';
      const existing = map.get(cat) || { total: 0, count: 0 };
      map.set(cat, { total: existing.total + e.amount, count: existing.count + 1 });
    });
    return Array.from(map.entries())
      .map(([category, { total, count }]) => ({
        category,
        total,
        count,
        percentage: totalExpense > 0 ? (total / totalExpense) * 100 : 0,
      }))
      .sort((a, b) => b.total - a.total);
  }, [data]);

  /* ── Laba Rugi Detail ── */
  const labaRugiDetail = useMemo(() => {
    if (!data) return null;
    const sb = data.salesBreakdown;
    const tunaiTotal = sb?.tunai?.total || 0;
    const cicilanDPTotal = sb?.cicilan?.totalDPDiterima || 0;
    const cicilanDiterima = sb?.cicilan?.totalCicilanDiterima || 0;
    const cicilanTerealisasi = sb?.cicilan?.totalTerealisasi || 0;
    const cicilanTotalProduk = sb?.cicilan?.totalProduk || 0;

    const pendapatanTunai = tunaiTotal;
    const pendapatanDP = cicilanDPTotal;
    const pendapatanCicilan = cicilanDiterima;
    const pendapatanInvestor = 0; // investor income from cash entries
    const totalPendapatan = pendapatanTunai + pendapatanDP + pendapatanCicilan + pendapatanInvestor;
    const totalPengeluaran = data.summary.totalExpense;
    const labaKotor = totalPendapatan - totalPengeluaran;

    return {
      income: [
        { label: 'Penjualan Tunai', amount: pendapatanTunai, color: 'var(--secondary)' },
        { label: 'DP Cicilan Diterima', amount: pendapatanDP, color: 'var(--primary)' },
        { label: 'Cicilan Diterima', amount: pendapatanCicilan, color: 'color-mix(in srgb, var(--primary) 60%, var(--secondary))' },
        { label: 'Modal Investor', amount: pendapatanInvestor, color: 'var(--warning)' },
      ],
      totalIncome: totalPendapatan,
      totalExpense: totalPengeluaran,
      labaKotor,
      totalPendapatanBruto: tunaiTotal + cicilanTotalProduk,
      sisaPiutangCicilan: sb?.cicilan?.totalSisa || 0,
    };
  }, [data]);

  /* ── Arus Kas Detail ── */
  const arusKasDetail = useMemo(() => {
    if (!data) return null;
    const cashIn = data.cashItems.filter((c) => c.tipe === 'kas_besar');
    const cashKecil = data.cashItems.filter((c) => c.tipe === 'kas_kecil');
    const cashOut = data.cashItems.filter((c) => c.tipe === 'kas_keluar');
    const investorCash = data.cashItems.filter((c) => c.tipe === 'investor');

    const kasBesarIn = cashIn.reduce((s, c) => s + c.jumlah, 0);
    const kasKecilIn = cashKecil.reduce((s, c) => s + c.jumlah, 0);
    const totalExpenses = cashOut.reduce((s, c) => s + c.jumlah, 0);
    const investorIn = investorCash.reduce((s, c) => s + c.jumlah, 0);

    // Operating cash flow: sales income - operating expenses
    const operatingIncome = kasBesarIn + kasKecilIn;
    const operatingExpenses = totalExpenses;
    const operatingCashFlow = operatingIncome - operatingExpenses;

    // Investing: investor deposits - withdrawals (we only track deposits here)
    const investorDeposits = investorIn;
    const investingCashFlow = investorDeposits;

    // Cash balances
    const kasBesarSaldo = kasBesarIn - totalExpenses;
    const kasKecilSaldo = kasKecilIn;

    return {
      operating: {
        inflow: operatingIncome,
        outflow: operatingExpenses,
        net: operatingCashFlow,
      },
      investing: {
        inflow: investorDeposits,
        outflow: 0,
        net: investingCashFlow,
      },
      kasBesarSaldo,
      kasKecilSaldo,
      totalSaldo: kasBesarSaldo + kasKecilSaldo + investorDeposits,
    };
  }, [data]);

  /* ── Piutang Analysis ── */
  const piutangAnalysis = useMemo(() => {
    if (!data) return null;

    const piutangAll = data.debts.filter((d) => d.type === 'piutang');
    const outstanding = piutangAll.filter((d) => d.status !== 'paid');
    const berjalan = outstanding.filter((d) => d.status === 'active' || d.status === 'partially_paid');
    const macet = outstanding.filter((d) => d.status === 'overdue');
    const selesai = piutangAll.filter((d) => d.status === 'paid');

    const totalOutstanding = outstanding.reduce((s, d) => s + d.remaining, 0);
    const totalBerjalan = berjalan.reduce((s, d) => s + d.remaining, 0);
    const totalMacet = macet.reduce((s, d) => s + d.remaining, 0);
    const totalSelesai = selesai.reduce((s, d) => s + d.amount, 0);

    // Aging analysis
    const now = new Date();
    const agingBuckets: PiutangAgingBucket[] = [
      { label: '0-30 hari', count: 0, total: 0, color: 'var(--secondary)' },
      { label: '31-60 hari', count: 0, total: 0, color: 'var(--warning)' },
      { label: '61-90 hari', count: 0, total: 0, color: 'var(--primary)' },
      { label: '> 90 hari', count: 0, total: 0, color: 'var(--destructive)' },
    ];

    outstanding.forEach((d) => {
      const days = d.dueDate && d.dueDate !== '-'
        ? Math.max(0, Math.floor((now.getTime() - new Date(d.dueDate).getTime()) / (1000 * 60 * 60 * 24)))
        : 0;
      if (days <= 30) {
        agingBuckets[0].total += d.remaining;
        agingBuckets[0].count++;
      } else if (days <= 60) {
        agingBuckets[1].total += d.remaining;
        agingBuckets[1].count++;
      } else if (days <= 90) {
        agingBuckets[2].total += d.remaining;
        agingBuckets[2].count++;
      } else {
        agingBuckets[3].total += d.remaining;
        agingBuckets[3].count++;
      }
    });

    // Top 5 biggest piutang
    const top5 = [...outstanding]
      .sort((a, b) => b.remaining - a.remaining)
      .slice(0, 5);

    return {
      totalOutstanding,
      berjalan: { count: berjalan.length, total: totalBerjalan },
      macet: { count: macet.length, total: totalMacet },
      selesai: { count: selesai.length, total: totalSelesai },
      aging: agingBuckets,
      top5,
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

  /* ── Tax Audit Derivatives ── */
  const taxAudit = useMemo(() => {
    if (!data) return null;
    const piutangDebts = data.debts.filter((d) => d.type === 'piutang');
    const totalPiutangRemaining = piutangDebts.reduce((s, d) => s + d.remaining, 0);
    const totalPiutangPaid = piutangDebts.reduce((s, d) => s + (d.amount - d.remaining), 0);

    const cashSales = data.sales.filter((s) => !s.paymentMethod || s.paymentMethod === 'cash' || s.paymentMethod === 'tunai' || s.tipe === 'tunai');
    const installmentSales = data.sales.filter((s) => s.paymentMethod && (s.paymentMethod === 'cicilan' || s.paymentMethod === 'installment' || s.paymentMethod === 'kredit') || s.tipe === 'cicilan');
    const pendapatanTunai = cashSales.reduce((s, sl) => s + sl.amount, 0);
    const pendapatanCicilan = installmentSales.reduce((s, sl) => s + sl.amount, 0);

    const dpDiterima = totalPiutangPaid;
    const cicilanDiterima = totalPiutangPaid;
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
        <p className="text-center" >{t('biz.registerFirst')}</p>
      </div>
    );
  }

  const summaryCards = data
    ? [
        { label: 'Total Pendapatan', value: data.summary.totalRevenue, color: 'var(--secondary)', icon: TrendingUp },
        { label: 'Total Pengeluaran', value: data.summary.totalExpense, color: 'var(--destructive)', icon: TrendingDown },
        { label: 'Laba Bersih', value: data.summary.netIncome, color: data.summary.netIncome >= 0 ? 'var(--secondary)' : 'var(--destructive)', icon: DollarSign },
        { label: 'Saldo Kas', value: data.summary.kasBesarSaldo + data.summary.kasKecilSaldo, color: 'var(--primary)', icon: Wallet },
        { label: 'Piutang Outstanding', value: data.summary.totalPiutang, color: 'var(--warning)', icon: CreditCard },
      ]
    : [];

  /* ── Pct helper ── */
  const pct = (value: number, total: number) => (total > 0 ? ((value / total) * 100).toFixed(1) : '0.0');

  return (
    <div className="space-y-3">
      {/* ═══════════════════════════════════════════════════════════════
          P&L HERO CARD — Profit & Loss at-a-Glance (from Cash API)
          ═══════════════════════════════════════════════════════════════ */}
      <Card className="biz-hero-card rounded-xl overflow-hidden" style={{ background: alpha(c.card, 0), border: `1px solid ${alpha(c.border, 0)}` }}>
        <CardContent className="p-4 sm:p-5">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="biz-section-header-icon h-8 w-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: alpha(c.secondary, 10) }}>
                <TrendingUp className="h-4 w-4" style={{ color: c.secondary }} />
              </div>
              <div>
                <h3 className="text-sm font-bold" style={{ color: c.foreground }}>Profit & Loss</h3>
                <p className="text-[10px]" style={{ color: c.muted }}>{fromDate} — {toDate}</p>
              </div>
            </div>
            <Badge className="text-[9px] font-semibold rounded-full px-2 py-0.5" style={{
              backgroundColor: isRugi ? alpha(c.destructive, 10) : alpha(c.secondary, 10),
              color: isRugi ? c.destructive : c.secondary,
              border: `1px solid ${isRugi ? alpha(c.destructive, 18) : alpha(c.secondary, 18)}`,
            }}>
              {isRugi ? 'Rugi' : 'Laba'}
            </Badge>
          </div>

          {plCashData.loading ? (
            <div className="grid grid-cols-2 gap-3">
              <Skeleton className="h-16 rounded-lg" />
              <Skeleton className="h-16 rounded-lg" />
            </div>
          ) : (
            <>
              {/* Metrics Grid */}
              <div className="grid grid-cols-2 gap-3 mb-3">
                {/* Total Pendapatan */}
                <div className="p-3 rounded-lg" style={{ backgroundColor: alpha(c.secondary, 5), border: `1px solid ${alpha(c.secondary, 10)}` }}>
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <ArrowUpRight className="h-3 w-3" style={{ color: c.secondary }} />
                    <span className="text-[10px] font-medium uppercase tracking-wider" style={{ color: c.muted }}>Pendapatan</span>
                  </div>
                  <p className="text-sm font-bold tabular-nums" style={{ color: c.secondary }}>
                    {formatAmount(plCashData.totalPendapatan)}
                  </p>
                  <p className="text-[9px] mt-0.5" style={{ color: c.muted }}>Kas Besar + Kas Kecil</p>
                </div>

                {/* Total Pengeluaran */}
                <div className="p-3 rounded-lg" style={{ backgroundColor: alpha(c.destructive, 5), border: `1px solid ${alpha(c.destructive, 10)}` }}>
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <ArrowDownRight className="h-3 w-3" style={{ color: c.destructive }} />
                    <span className="text-[10px] font-medium uppercase tracking-wider" style={{ color: c.muted }}>Pengeluaran</span>
                  </div>
                  <p className="text-sm font-bold tabular-nums" style={{ color: c.destructive }}>
                    {formatAmount(plCashData.totalPengeluaran)}
                  </p>
                  <p className="text-[9px] mt-0.5" style={{ color: c.muted }}>Kas Keluar</p>
                </div>
              </div>

              {/* Laba Kotor Row */}
              <div className="flex items-center justify-between p-3 rounded-lg mb-3" style={{
                backgroundColor: isRugi ? alpha(c.destructive, 6) : alpha(c.secondary, 6),
                border: `1px solid ${isRugi ? alpha(c.destructive, 14) : alpha(c.secondary, 14)}`,
              }}>
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4" style={{ color: isRugi ? c.destructive : c.secondary }} />
                  <span className="text-xs font-semibold" style={{ color: c.foreground }}>Laba Kotor</span>
                </div>
                <span className="text-base font-bold tabular-nums" style={{ color: isRugi ? c.destructive : c.secondary }}>
                  {isRugi ? '-' : '+'}{formatAmount(Math.abs(plLaba))}
                </span>
              </div>

              {/* Margin Laba with Progress Bar */}
              {plCashData.totalPendapatan > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-medium uppercase tracking-wider" style={{ color: c.muted }}>Margin Laba</span>
                    <span className="text-xs font-bold tabular-nums" style={{ color: isRugi ? c.destructive : c.secondary }}>
                      {plMargin.toFixed(1)}%
                    </span>
                  </div>
                  <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: alpha(c.border, 20) }}>
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${Math.min(Math.max(plMargin, 0), 100)}%`,
                        backgroundColor: isRugi ? c.destructive : c.secondary,
                      }}
                    />
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Info Banner */}
      <div className="flex items-start gap-2.5 p-3 rounded-xl" style={{ background: 'color-mix(in srgb, var(--primary) 3%, transparent)', border: '1px solid color-mix(in srgb, var(--primary) 8%, transparent)' }}>
        <Info className="h-4 w-4 shrink-0 mt-0.5" style={{ color: 'var(--primary)' }} />
        <p className="text-xs leading-relaxed" >
          Laporan keuangan bisnis untuk audit dan perencanaan. Data cicilan dipisah untuk akurasi laporan pajak.
        </p>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h2 className="text-base font-bold flex items-center gap-2" >
          <div className="h-7 w-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'color-mix(in srgb, var(--primary) 8%, transparent)' }}>
            <FileBarChart className="h-3.5 w-3.5" style={{ color: 'var(--primary)' }} />
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
            style={{ borderColor: 'color-mix(in srgb, var(--secondary) 15%, transparent)', color: 'var(--secondary)' }}
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
            style={{ borderColor: 'color-mix(in srgb, var(--destructive) 15%, transparent)', color: 'var(--destructive)' }}
          >
            {exporting === 'pdf' ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Download className="mr-1 h-3 w-3" />}
            {t('biz.exportPDF')}
          </Button>
        </div>
      </div>

      {/* Date Range Filter */}
      <Card className="biz-content-card rounded-xl" style={cardStyle}>
        <CardContent className="p-3 sm:p-4">
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
            <div className="flex items-center gap-2 shrink-0">
              <div className="h-6 w-6 rounded-md flex items-center justify-center" style={{ backgroundColor: 'color-mix(in srgb, var(--primary) 8%, transparent)' }}>
                <CalendarDays className="h-3 w-3" style={{ color: 'var(--primary)' }} />
              </div>
              <Label className="text-[10px] font-medium uppercase tracking-wider" style={{ color: 'var(--muted-foreground)' }}>{t('biz.cashDate')}</Label>
            </div>
            <div className="flex items-center gap-2 flex-1 flex-wrap sm:flex-nowrap">
              <Input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="w-full sm:w-36 h-8 text-xs rounded-lg"
                style={inputStyle}
              />
              <div className="h-5 w-6 rounded flex items-center justify-center" style={{ background: 'color-mix(in srgb, var(--primary) 8%, transparent)' }}>
                <ArrowRight className="h-3 w-3" style={{ color: 'var(--primary)' }} />
              </div>
              <Input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="w-full sm:w-36 h-8 text-xs rounded-lg"
                style={inputStyle}
              />
            </div>
            <Button
              onClick={fetchReport}
              size="sm"
              className="rounded-lg h-8 text-xs"
              style={{ backgroundColor: 'var(--primary)', color: '#000' }}
            >
              {loading ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <BarChart3 className="mr-1 h-3 w-3" />}
              Lihat Laporan
            </Button>
          </div>
          <DateRangeIndicator fromDate={fromDate} toDate={toDate} />
        </CardContent>
      </Card>

      {/* Enhanced Summary Cards */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" style={{ background: 'var(--card)' }} />
          ))}
        </div>
      ) : data ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3">
          {summaryCards.map((card, idx) => {
            const Icon = card.icon;
            return (
              <motion.div
                key={card.label}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05, type: 'spring' as const, stiffness: 300, damping: 24 }}
                whileHover={springHover}
              >
                <Card className="biz-content-card rounded-xl overflow-hidden" style={cardStyle}>
                  <div className="h-px bg-white/[0.06]" />
                  <CardContent className="p-3 sm:p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="h-7 w-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${card.color}15` }}>
                        <Icon className="h-3.5 w-3.5" style={{ color: card.color }} />
                      </div>
                      <div className="h-5 w-5 rounded-full flex items-center justify-center" style={{ backgroundColor: `${card.color}15` }}>
                        {(card.label === 'Laba Bersih' && data.summary.netIncome >= 0) || card.label === 'Total Pendapatan' || card.label === 'Saldo Kas' ? (
                          <ArrowUpRight className="h-3 w-3" style={{ color: 'var(--secondary)' }} />
                        ) : card.label === 'Laba Bersih' && data.summary.netIncome < 0 ? (
                          <ArrowDownRight className="h-3 w-3" style={{ color: 'var(--destructive)' }} />
                        ) : (
                          <CircleDollarSign className="h-3 w-3" style={{ color: card.color } as React.CSSProperties} />
                        )}
                      </div>
                    </div>
                    <p className="text-[10px] font-medium uppercase tracking-wider" style={{ color: 'var(--muted-foreground)' }}>{card.label}</p>
                    <p className="text-base font-bold tabular-nums mt-0.5" style={{ color: card.color }}>
                      {formatAmount(card.value)}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      ) : null}

      {/* ═══════════════════════════════════════════════════════════════
          P&L SUMMARY CARD (Profit & Loss At-a-Glance)
          ═══════════════════════════════════════════════════════════════ */}
      {!loading && data && (
        <Card className="biz-content-card rounded-xl" style={cardStyle}>
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="h-7 w-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'color-mix(in srgb, var(--secondary) 8%, transparent)' }}>
                <TrendingUp className="h-3.5 w-3.5" style={{ color: 'var(--secondary)' } as React.CSSProperties} />
              </div>
              <div>
                <h3 className="text-xs font-semibold" style={{ color: 'var(--foreground)' }}>Laporan Laba Rugi</h3>
                <p className="text-[10px]" style={{ color: 'var(--muted-foreground)' }}>
                  {fromDate} — {toDate}
                </p>
              </div>
            </div>

            {/* P&L Rows */}
            <div className="space-y-1.5">
              {/* Revenue */}
              <div className="flex items-center justify-between py-2 px-3 rounded-lg" style={{ backgroundColor: 'color-mix(in srgb, var(--secondary) 4%, transparent)' }}>
                <div className="flex items-center gap-2">
                  <ArrowUpRight className="h-3.5 w-3.5" style={{ color: 'var(--secondary)' } as React.CSSProperties} />
                  <span className="text-xs font-medium" style={{ color: 'var(--foreground)' }}>Total Pendapatan</span>
                </div>
                <span className="text-sm font-bold tabular-nums" style={{ color: 'var(--secondary)' }}>
                  {formatAmount(data.summary.totalRevenue)}
                </span>
              </div>
              {/* Expenses */}
              <div className="flex items-center justify-between py-2 px-3 rounded-lg" style={{ backgroundColor: 'color-mix(in srgb, var(--destructive) 4%, transparent)' }}>
                <div className="flex items-center gap-2">
                  <ArrowDownRight className="h-3.5 w-3.5" style={{ color: 'var(--destructive)' } as React.CSSProperties} />
                  <span className="text-xs font-medium" style={{ color: 'var(--foreground)' }}>Total Pengeluaran</span>
                </div>
                <span className="text-sm font-bold tabular-nums" style={{ color: 'var(--destructive)' }}>
                  -{formatAmount(data.summary.totalExpense)}
                </span>
              </div>

              {/* Divider */}
              <div className="h-px my-1" style={{ backgroundColor: 'var(--border)' }} />

              {/* Gross Profit */}
              <div className="flex items-center justify-between py-1.5 px-3">
                <span className="text-xs font-medium" style={{ color: 'var(--muted-foreground)' }}>Laba Kotor</span>
                <span className="text-xs font-bold tabular-nums" style={{ color: data.summary.labaKotor >= 0 ? 'var(--secondary)' : 'var(--destructive)' }}>
                  {formatAmount(data.summary.labaKotor)}
                </span>
              </div>

              {/* Realized Revenue Info */}
              {data.summary.pendapatanTerealisasi > 0 && (
                <div className="flex items-center justify-between py-1 px-3">
                  <span className="text-[10px]" style={{ color: 'var(--muted-foreground)' }}>Pendapatan Terealisasi</span>
                  <span className="text-[10px] font-medium tabular-nums" style={{ color: 'var(--primary)' }}>
                    {formatAmount(data.summary.pendapatanTerealisasi)}
                  </span>
                </div>
              )}
              {data.summary.pendapatanBelumTerealisasi > 0 && (
                <div className="flex items-center justify-between py-1 px-3">
                  <span className="text-[10px]" style={{ color: 'var(--muted-foreground)' }}>Belum Terealisasi (Piutang)</span>
                  <span className="text-[10px] font-medium tabular-nums" style={{ color: 'var(--warning)' }}>
                    {formatAmount(data.summary.pendapatanBelumTerealisasi)}
                  </span>
                </div>
              )}

              {/* Divider */}
              <div className="h-px my-1" style={{ backgroundColor: 'var(--border)' }} />

              {/* Net Profit */}
              <div className="flex items-center justify-between py-2.5 px-3 rounded-lg" style={{
                backgroundColor: data.summary.netIncome >= 0
                  ? 'color-mix(in srgb, var(--secondary) 6%, transparent)'
                  : 'color-mix(in srgb, var(--destructive) 6%, transparent)',
                border: `1px solid ${data.summary.netIncome >= 0
                  ? 'color-mix(in srgb, var(--secondary) 12%, transparent)'
                  : 'color-mix(in srgb, var(--destructive) 12%, transparent)'}`,
              }}>
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4" style={{ color: data.summary.netIncome >= 0 ? 'var(--secondary)' : 'var(--destructive)' } as React.CSSProperties} />
                  <span className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>Laba Bersih</span>
                </div>
                <div className="text-right">
                  <span className="text-base font-bold tabular-nums" style={{ color: data.summary.netIncome >= 0 ? 'var(--secondary)' : 'var(--destructive)' }}>
                    {formatAmount(data.summary.netIncome)}
                  </span>
                </div>
              </div>

              {/* Profit Margin Bar */}
              {data.summary.totalRevenue > 0 && (
                <div className="mt-2 px-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] uppercase tracking-wider font-medium" style={{ color: 'var(--muted-foreground)' }}>Profit Margin</span>
                    <span className="text-xs font-bold tabular-nums" style={{
                      color: data.summary.netIncome >= 0 ? 'var(--secondary)' : 'var(--destructive)',
                    }}>
                      {data.summary.totalRevenue > 0 ? ((data.summary.netIncome / data.summary.totalRevenue) * 100).toFixed(1) : '0.0'}%
                    </span>
                  </div>
                  <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--border)' }}>
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${Math.min(Math.max(data.summary.totalRevenue > 0 ? (data.summary.netIncome / data.summary.totalRevenue) * 100 : 0, 0), 100)}%`,
                        backgroundColor: data.summary.netIncome >= 0 ? 'var(--secondary)' : 'var(--destructive)',
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="biz-scroll-mobile biz-tab-bar w-full sm:w-auto rounded-full p-1 h-auto overflow-x-auto flex-nowrap" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)' }}>
          {[
            { value: 'labaRugi', label: 'Laba Rugi', color: 'var(--secondary)' },
            { value: 'arusKas', label: 'Arus Kas', color: 'var(--primary)' },
            { value: 'piutangAnalysis', label: 'Piutang', color: 'var(--warning)' },
            { value: 'sales', label: t('biz.penjualan'), color: 'var(--secondary)' },
            { value: 'expenses', label: t('biz.kasKeluar'), color: 'var(--destructive)' },
            { value: 'invoices', label: t('biz.invoices'), color: 'var(--primary)' },
            { value: 'debts', label: t('biz.hutangPiutang'), color: 'var(--secondary)' },
            { value: 'investor', label: 'Investor', color: 'var(--primary)' },
            { value: 'anggaran', label: 'Anggaran', color: 'var(--warning)' },
          ].map((tab) => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className="rounded-full text-xs px-3 py-1.5 data-[state=active]:shadow-none"
              style={activeTab === tab.value
                ? { color: tab.color, background: `linear-gradient(135deg, color-mix(in srgb, ${tab.color} 20%, transparent), color-mix(in srgb, ${tab.color} 8%, transparent))`, boxShadow: `0 0 12px color-mix(in srgb, ${tab.color} 20%, transparent)` }
                : { color: 'var(--muted-foreground)' }
              }
            >
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/*  LABA RUGI DETAIL TAB                                          */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        <TabsContent value="labaRugi" className="mt-3 space-y-3">
          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-48 rounded-xl" style={{ background: 'var(--card)' }} />
              <Skeleton className="h-48 rounded-xl" style={{ background: 'var(--card)' }} />
            </div>
          ) : !data || !labaRugiDetail ? (
            <EmptyState icon={BarChart3} color={'var(--secondary)'} text="Tidak ada data laporan" />
          ) : (
            <>
              {/* Income Breakdown */}
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: 'spring' as const, stiffness: 200, damping: 22 }}
              >
                <Card className="biz-content-card rounded-xl overflow-hidden" style={cardStyle}>
                  <div className="h-px bg-white/[0.06]" />
                <CardContent className="p-3 sm:p-4">
                  <SectionHeader icon={TrendingUp} color="var(--secondary)" title="Pendapatan per Sumber" badge={labaRugiDetail.income.filter((i) => i.amount > 0).length} />
                  <div className="space-y-2">
                    {labaRugiDetail.income.map((item) => {
                      const p = labaRugiDetail.totalIncome > 0 ? ((item.amount / labaRugiDetail.totalIncome) * 100) : 0;
                      return (
                        <div key={item.label} className="p-2 rounded-lg" style={{ border: '1px solid var(--border)' }}>
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-xs font-medium" style={{ color: 'var(--foreground)' }}>{item.label}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{
                                backgroundColor: 'color-mix(in srgb, var(--muted-foreground) 6%, transparent)',
                                color: 'var(--muted-foreground)',
                              }}>
                                {p.toFixed(1)}%
                              </span>
                              <span className="text-xs font-bold tabular-nums" style={{ color: item.color as string }}>
                                {formatAmount(item.amount)}
                              </span>
                            </div>
                          </div>
                          <ProgressBar value={item.amount} max={labaRugiDetail.totalIncome || 1} color={item.color as string} />
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-lg mt-2" style={{ background: 'color-mix(in srgb, var(--secondary) 6%, transparent)', border: '1px solid color-mix(in srgb, var(--secondary) 12%, transparent)' }}>
                    <span className="text-xs font-semibold" style={{ color: 'var(--secondary)' }}>Total Pendapatan</span>
                    <span className="text-sm font-bold tabular-nums" style={{ color: 'var(--secondary)' }}>
                      {formatAmount(labaRugiDetail.totalIncome)}
                    </span>
                  </div>
                </CardContent>
              </Card>
              </motion.div>

              {/* Expense Breakdown by Category */}
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05, type: 'spring' as const, stiffness: 200, damping: 22 }}
              >
              <Card className="biz-content-card rounded-xl overflow-hidden" style={cardStyle}>
                <div className="h-px bg-white/[0.06]" />
                <CardContent className="p-3 sm:p-4">
                  <SectionHeader icon={TrendingDown} color="var(--destructive)" title="Pengeluaran per Kategori" badge={expenseCategories.length} />
                  {expenseCategories.length === 0 ? (
                    <p className="text-xs text-center py-4" style={{ color: 'var(--muted-foreground)' }}>Tidak ada pengeluaran di periode ini</p>
                  ) : (
                    <div className="space-y-2">
                      {expenseCategories.map((cat) => (
                        <div key={cat.category} className="p-2 rounded-lg" style={{ border: '1px solid var(--border)' }}>
                          <div className="flex items-center justify-between mb-1.5">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-medium" style={{ color: 'var(--foreground)' }}>{cat.category}</span>
                              <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{
                                backgroundColor: 'color-mix(in srgb, var(--muted-foreground) 6%, transparent)',
                                color: 'var(--muted-foreground)',
                              }}>
                                {cat.count}x
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{
                                backgroundColor: 'color-mix(in srgb, var(--destructive) 6%, transparent)',
                                color: 'var(--destructive)',
                              }}>
                                {cat.percentage.toFixed(1)}%
                              </span>
                              <span className="text-xs font-bold tabular-nums" style={{ color: 'var(--destructive)' }}>
                                -{formatAmount(cat.total)}
                              </span>
                            </div>
                          </div>
                          <ProgressBar value={cat.total} max={labaRugiDetail.totalExpense || 1} color="var(--destructive)" />
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="flex items-center justify-between p-2 rounded-lg mt-2" style={{ background: 'color-mix(in srgb, var(--destructive) 6%, transparent)', border: '1px solid color-mix(in srgb, var(--destructive) 12%, transparent)' }}>
                    <span className="text-xs font-semibold" style={{ color: 'var(--destructive)' }}>Total Pengeluaran</span>
                    <span className="text-sm font-bold tabular-nums" style={{ color: 'var(--destructive)' }}>
                      -{formatAmount(labaRugiDetail.totalExpense)}
                    </span>
                  </div>
                </CardContent>
              </Card>
              </motion.div>

              {/* Net Profit/Loss Summary */}
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1, type: 'spring' as const, stiffness: 200, damping: 22 }}
                whileHover={springHover}
              >
              <Card className="rounded-xl overflow-hidden" style={{ background: 'var(--card)', border: `1px solid color-mix(in srgb, ${labaRugiDetail.labaKotor >= 0 ? 'var(--secondary)' : 'var(--destructive)'} 20%, transparent)` }}>
                <div className="h-px bg-white/[0.06]" />
                <CardContent className="p-3 sm:p-4">
                  <SectionHeader icon={DollarSign} color={labaRugiDetail.labaKotor >= 0 ? 'var(--secondary)' : 'var(--destructive)'} title="Laba / Rugi Bersih" />
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div className="p-2 rounded-lg" style={{ border: '1px solid var(--border)' }}>
                      <span className="text-[10px] block mb-0.5" style={{ color: 'var(--muted-foreground)' }}>Total Pendapatan Bruto</span>
                      <span className="text-xs font-bold tabular-nums" style={{ color: 'var(--secondary)' }}>{formatAmount(labaRugiDetail.totalPendapatanBruto)}</span>
                    </div>
                    <div className="p-2 rounded-lg" style={{ border: '1px solid var(--border)' }}>
                      <span className="text-[10px] block mb-0.5" style={{ color: 'var(--muted-foreground)' }}>Total Pengeluaran</span>
                      <span className="text-xs font-bold tabular-nums" style={{ color: 'var(--destructive)' }}>-{formatAmount(labaRugiDetail.totalExpense)}</span>
                    </div>
                    <div className="p-2 rounded-lg" style={{
                      background: labaRugiDetail.labaKotor >= 0 ? 'color-mix(in srgb, var(--secondary) 6%, transparent)' : 'color-mix(in srgb, var(--destructive) 6%, transparent)',
                      border: `1px solid color-mix(in srgb, ${labaRugiDetail.labaKotor >= 0 ? 'var(--secondary)' : 'var(--destructive)'} 12%, transparent)`,
                    }}>
                      <span className="text-[10px] block mb-0.5" style={{ color: 'var(--muted-foreground)' }}>LABA RUGI REAL</span>
                      <span className="text-sm font-bold tabular-nums" style={{ color: labaRugiDetail.labaKotor >= 0 ? 'var(--secondary)' : 'var(--destructive)' }}>
                        {formatAmount(labaRugiDetail.labaKotor)}
                      </span>
                    </div>
                  </div>
                  {labaRugiDetail.sisaPiutangCicilan > 0 && (
                    <div className="mt-2 p-2 rounded-lg" style={{ background: 'color-mix(in srgb, var(--warning) 4%, transparent)', border: '1px solid color-mix(in srgb, var(--warning) 10%, transparent)' }}>
                      <div className="flex items-center gap-1.5">
                        <AlertTriangle className="h-3 w-3" style={{ color: 'var(--warning)' }} />
                        <span className="text-[10px]" style={{ color: 'var(--warning)' }}>Sisa Piutang Cicilan Belum Diterima: </span>
                        <span className="text-[10px] font-bold" style={{ color: 'var(--warning)' }}>{formatAmount(labaRugiDetail.sisaPiutangCicilan)}</span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
              </motion.div>
            </>
          )}
        </TabsContent>

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/*  ARUS KAS DETAIL TAB                                           */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        <TabsContent value="arusKas" className="mt-3 space-y-3">
          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-48 rounded-xl" style={{ background: 'var(--card)' }} />
              <Skeleton className="h-48 rounded-xl" style={{ background: 'var(--card)' }} />
            </div>
          ) : !data || !arusKasDetail ? (
            <EmptyState icon={Landmark} color={'var(--primary)'} text="Tidak ada data arus kas" />
          ) : (
            <>
              {/* Operating Cash Flow */}
              <Card className="biz-content-card rounded-xl" style={cardStyle}>
                <CardContent className="p-3 sm:p-4">
                  <SectionHeader icon={ArrowDownUp} color="var(--secondary)" title="Arus Kas Operasional" />
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-2 rounded-lg" style={{ border: '1px solid var(--border)' }}>
                      <span className="text-xs" style={{ color: 'var(--muted-foreground)' }}>Pemasukan (Kas Besar + Kas Kecil)</span>
                      <span className="text-xs font-bold tabular-nums" style={{ color: 'var(--secondary)' }}>+{formatAmount(arusKasDetail.operating.inflow)}</span>
                    </div>
                    <div className="flex items-center justify-between p-2 rounded-lg" style={{ border: '1px solid var(--border)' }}>
                      <span className="text-xs" style={{ color: 'var(--muted-foreground)' }}>Pengeluaran Operasional</span>
                      <span className="text-xs font-bold tabular-nums" style={{ color: 'var(--destructive)' }}>-{formatAmount(arusKasDetail.operating.outflow)}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-lg mt-2" style={{
                    background: arusKasDetail.operating.net >= 0 ? 'color-mix(in srgb, var(--secondary) 6%, transparent)' : 'color-mix(in srgb, var(--destructive) 6%, transparent)',
                    border: `1px solid color-mix(in srgb, ${arusKasDetail.operating.net >= 0 ? 'var(--secondary)' : 'var(--destructive)'} 12%, transparent)`,
                  }}>
                    <span className="text-xs font-semibold" style={{ color: arusKasDetail.operating.net >= 0 ? 'var(--secondary)' : 'var(--destructive)' }}>Arus Kas Operasional Bersih</span>
                    <span className="text-sm font-bold tabular-nums" style={{ color: arusKasDetail.operating.net >= 0 ? 'var(--secondary)' : 'var(--destructive)' }}>
                      {formatAmount(arusKasDetail.operating.net)}
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Investing Cash Flow */}
              <Card className="biz-content-card rounded-xl" style={cardStyle}>
                <CardContent className="p-3 sm:p-4">
                  <SectionHeader icon={PiggyBank} color="var(--primary)" title="Arus Kas Investasi" />
                  <div className="flex items-center justify-between p-2 rounded-lg" style={{ border: '1px solid var(--border)' }}>
                    <span className="text-xs" style={{ color: 'var(--muted-foreground)' }}>Modal Investor Masuk</span>
                    <span className="text-xs font-bold tabular-nums" style={{ color: 'var(--primary)' }}>+{formatAmount(arusKasDetail.investing.inflow)}</span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-lg mt-2" style={{ background: 'color-mix(in srgb, var(--primary) 6%, transparent)', border: '1px solid color-mix(in srgb, var(--primary) 12%, transparent)' }}>
                    <span className="text-xs font-semibold" style={{ color: 'var(--primary)' }}>Arus Kas Investasi Bersih</span>
                    <span className="text-sm font-bold tabular-nums" style={{ color: 'var(--primary)' }}>
                      +{formatAmount(arusKasDetail.investing.net)}
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Cash Balances */}
              <Card className="biz-content-card rounded-xl" style={cardStyle}>
                <CardContent className="p-3 sm:p-4">
                  <SectionHeader icon={Banknote} color="var(--warning)" title="Saldo Kas" />
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div className="p-2 rounded-lg" style={{ border: '1px solid var(--border)' }}>
                      <div className="flex items-center gap-1.5 mb-1">
                        <Building2 className="h-3 w-3" style={{ color: 'var(--secondary)' }} />
                        <span className="text-[10px]" style={{ color: 'var(--muted-foreground)' }}>Kas Besar</span>
                      </div>
                      <span className="text-xs font-bold tabular-nums block" style={{ color: arusKasDetail.kasBesarSaldo >= 0 ? 'var(--secondary)' : 'var(--destructive)' }}>
                        {formatAmount(arusKasDetail.kasBesarSaldo)}
                      </span>
                    </div>
                    <div className="p-2 rounded-lg" style={{ border: '1px solid var(--border)' }}>
                      <div className="flex items-center gap-1.5 mb-1">
                        <Wallet className="h-3 w-3" style={{ color: 'var(--primary)' }} />
                        <span className="text-[10px]" style={{ color: 'var(--muted-foreground)' }}>Kas Kecil</span>
                      </div>
                      <span className="text-xs font-bold tabular-nums block" style={{ color: arusKasDetail.kasKecilSaldo >= 0 ? 'var(--secondary)' : 'var(--destructive)' }}>
                        {formatAmount(arusKasDetail.kasKecilSaldo)}
                      </span>
                    </div>
                    <div className="p-2 rounded-lg" style={{
                      background: arusKasDetail.totalSaldo >= 0 ? 'color-mix(in srgb, var(--secondary) 6%, transparent)' : 'color-mix(in srgb, var(--destructive) 6%, transparent)',
                      border: `1px solid color-mix(in srgb, ${arusKasDetail.totalSaldo >= 0 ? 'var(--secondary)' : 'var(--destructive)'} 12%, transparent)`,
                    }}>
                      <div className="flex items-center gap-1.5 mb-1">
                        <Landmark className="h-3 w-3" style={{ color: arusKasDetail.totalSaldo >= 0 ? 'var(--secondary)' : 'var(--destructive)' }} />
                        <span className="text-[10px]" style={{ color: 'var(--muted-foreground)' }}>Total Saldo</span>
                      </div>
                      <span className="text-sm font-bold tabular-nums block" style={{ color: arusKasDetail.totalSaldo >= 0 ? 'var(--secondary)' : 'var(--destructive)' }}>
                        {formatAmount(arusKasDetail.totalSaldo)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Period info */}
              <div className="flex items-center gap-2 p-2 rounded-lg" style={{ background: 'color-mix(in srgb, var(--muted-foreground) 3%, transparent)', border: '1px solid var(--border)' }}>
                <Clock className="h-3.5 w-3.5" style={{ color: 'var(--muted-foreground)' }} />
                <p className="text-[10px]" style={{ color: 'var(--muted-foreground)' }}>
                  Periode: {fromDate} s/d {toDate} — Saldo awal dihitung dari total pemasukan dikurangi pengeluaran dalam periode ini.
                </p>
              </div>
            </>
          )}
        </TabsContent>

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/*  PIUTANG ANALYSIS TAB                                          */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        <TabsContent value="piutangAnalysis" className="mt-3 space-y-3">
          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-48 rounded-xl" style={{ background: 'var(--card)' }} />
              <Skeleton className="h-48 rounded-xl" style={{ background: 'var(--card)' }} />
            </div>
          ) : !data || !piutangAnalysis ? (
            <EmptyState icon={CreditCard} color={'var(--warning)'} text="Tidak ada data piutang" />
          ) : (
            <>
              {/* Piutang Status Summary */}
              <Card className="rounded-xl" style={{ background: 'var(--card)', border: '1px solid color-mix(in srgb, var(--warning) 15%, transparent)' }}>
                <CardContent className="p-3 sm:p-4">
                  <SectionHeader icon={AlertTriangle} color="var(--warning)" title="Piutang Outstanding" />
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div className="p-2 rounded-lg" style={{ border: '1px solid var(--border)' }}>
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: 'var(--secondary)' }} />
                        <span className="text-[10px]" style={{ color: 'var(--muted-foreground)' }}>Berjalan</span>
                        <Badge className="text-[9px] px-1 py-0 rounded-full" style={{ backgroundColor: 'color-mix(in srgb, var(--secondary) 8%, transparent)', color: 'var(--secondary)', border: '1px solid color-mix(in srgb, var(--secondary) 12%, transparent)' }}>
                          {piutangAnalysis.berjalan.count}
                        </Badge>
                      </div>
                      <span className="text-xs font-bold tabular-nums" style={{ color: 'var(--secondary)' }}>{formatAmount(piutangAnalysis.berjalan.total)}</span>
                    </div>
                    <div className="p-2 rounded-lg" style={{ background: 'color-mix(in srgb, var(--destructive) 4%, transparent)', border: '1px solid color-mix(in srgb, var(--destructive) 10%, transparent)' }}>
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: 'var(--destructive)' }} />
                        <span className="text-[10px]" style={{ color: 'var(--muted-foreground)' }}>Macet</span>
                        <Badge className="text-[9px] px-1 py-0 rounded-full" style={{ backgroundColor: 'color-mix(in srgb, var(--destructive) 8%, transparent)', color: 'var(--destructive)', border: '1px solid color-mix(in srgb, var(--destructive) 12%, transparent)' }}>
                          {piutangAnalysis.macet.count}
                        </Badge>
                      </div>
                      <span className="text-xs font-bold tabular-nums" style={{ color: 'var(--destructive)' }}>{formatAmount(piutangAnalysis.macet.total)}</span>
                    </div>
                    <div className="p-2 rounded-lg" style={{ border: '1px solid var(--border)' }}>
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: 'var(--muted-foreground)' }} />
                        <span className="text-[10px]" style={{ color: 'var(--muted-foreground)' }}>Selesai</span>
                        <Badge className="text-[9px] px-1 py-0 rounded-full" style={{ backgroundColor: 'color-mix(in srgb, var(--muted-foreground) 8%, transparent)', color: 'var(--muted-foreground)', border: '1px solid var(--border)' }}>
                          {piutangAnalysis.selesai.count}
                        </Badge>
                      </div>
                      <span className="text-xs font-bold tabular-nums" style={{ color: 'var(--muted-foreground)' }}>{formatAmount(piutangAnalysis.selesai.total)}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-lg mt-2" style={{ background: 'color-mix(in srgb, var(--warning) 6%, transparent)', border: '1px solid color-mix(in srgb, var(--warning) 12%, transparent)' }}>
                    <span className="text-xs font-semibold" style={{ color: 'var(--warning)' }}>Total Outstanding</span>
                    <span className="text-sm font-bold tabular-nums" style={{ color: 'var(--warning)' }}>
                      {formatAmount(piutangAnalysis.totalOutstanding)}
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Aging Analysis */}
              <Card className="biz-content-card rounded-xl" style={cardStyle}>
                <CardContent className="p-3 sm:p-4">
                  <SectionHeader icon={Timer} color="var(--primary)" title="Aging Analysis" />
                  {piutangAnalysis.totalOutstanding === 0 ? (
                    <p className="text-xs text-center py-4" style={{ color: 'var(--muted-foreground)' }}>Tidak ada piutang outstanding</p>
                  ) : (
                    <>
                      <div className="space-y-2">
                        {piutangAnalysis.aging.map((bucket) => (
                          <div key={bucket.label} className="p-2 rounded-lg" style={{ border: '1px solid var(--border)' }}>
                            <div className="flex items-center justify-between mb-1.5">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-medium" style={{ color: 'var(--foreground)' }}>{bucket.label}</span>
                                <Badge className="text-[9px] px-1 py-0 rounded-full" style={{
                                  backgroundColor: `color-mix(in srgb, ${bucket.color} 8%, transparent)`,
                                  color: bucket.color,
                                  border: `1px solid color-mix(in srgb, ${bucket.color} 12%, transparent)`,
                                }}>
                                  {bucket.count}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-[10px]" style={{ color: 'var(--muted-foreground)' }}>
                                  {pct(bucket.total, piutangAnalysis.totalOutstanding)}%
                                </span>
                                <span className="text-xs font-bold tabular-nums" style={{ color: bucket.color }}>
                                  {formatAmount(bucket.total)}
                                </span>
                              </div>
                            </div>
                            <ProgressBar value={bucket.total} max={piutangAnalysis.totalOutstanding} color={bucket.color} />
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Top 5 Biggest Piutang */}
              <Card className="biz-content-card rounded-xl" style={cardStyle}>
                <CardContent className="p-3 sm:p-4">
                  <SectionHeader icon={CreditCard} color="var(--destructive)" title="Top 5 Piutang Terbesar" badge={piutangAnalysis.top5.length} />
                  {piutangAnalysis.top5.length === 0 ? (
                    <p className="text-xs text-center py-4" style={{ color: 'var(--muted-foreground)' }}>Tidak ada piutang outstanding</p>
                  ) : (
                    <>
                      {/* Mobile Card List */}
                      <div className="sm:hidden space-y-2">
                        {piutangAnalysis.top5.map((d, idx) => {
                          const paidPct = d.amount > 0 ? ((d.amount - d.remaining) / d.amount) * 100 : 0;
                          return (
                            <div key={d.id} className="p-2.5 rounded-lg" style={{ border: '1px solid var(--border)' }}>
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <span className="text-[10px] font-medium" style={{ color: 'var(--muted-foreground)' }}>#{idx + 1}</span>
                                  <p className="text-xs font-medium" style={{ color: 'var(--foreground)' }}>{d.counterpart}</p>
                                </div>
                                <div className="text-right">
                                  <p className="text-xs font-bold tabular-nums" style={{ color: 'var(--warning)' }}>{formatAmount(d.remaining)}</p>
                                  <p className="text-[10px]" style={{ color: 'var(--muted-foreground)' }}>dari {formatAmount(d.amount)}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 mt-1.5">
                                <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--border)' }}>
                                  <div className="h-full rounded-full" style={{ width: `${paidPct}%`, backgroundColor: paidPct >= 100 ? 'var(--secondary)' : 'var(--primary)' }} />
                                </div>
                                <span className="text-[10px] tabular-nums" style={{ color: 'var(--muted-foreground)' }}>{paidPct.toFixed(0)}%</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      {/* Desktop Table */}
                      <div className="hidden sm:block max-h-96 overflow-y-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="hover:bg-transparent" style={{ borderBottom: '1px solid var(--border)' }}>
                            <TableHead className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--muted-foreground)' }}>#</TableHead>
                            <TableHead className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--muted-foreground)' }}>Pelanggan</TableHead>
                            <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-right" style={{ color: 'var(--muted-foreground)' }}>Total</TableHead>
                            <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-right" style={{ color: 'var(--muted-foreground)' }}>Sisa</TableHead>
                            <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-right" style={{ color: 'var(--muted-foreground)' }}>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {piutangAnalysis.top5.map((d, idx) => {
                            const paidPct = d.amount > 0 ? ((d.amount - d.remaining) / d.amount) * 100 : 0;
                            return (
                              <TableRow key={d.id} className="transition-colors duration-150" style={{ borderBottom: '1px solid var(--border)' }}>
                                <TableCell className="text-xs py-2 font-medium" style={{ color: 'var(--muted-foreground)' }}>{idx + 1}</TableCell>
                                <TableCell className="text-xs py-2 font-medium" >{d.counterpart}</TableCell>
                                <TableCell className="text-xs text-right py-2" >{formatAmount(d.amount)}</TableCell>
                                <TableCell className="text-xs text-right py-2 font-bold" style={{ color: 'var(--warning)' }}>{formatAmount(d.remaining)}</TableCell>
                                <TableCell className="py-2 text-right">
                                  <div className="flex items-center justify-end gap-1.5">
                                    <div className="w-12 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--border)' }}>
                                      <div className="h-full rounded-full" style={{
                                        width: `${paidPct}%`,
                                        backgroundColor: paidPct >= 100 ? 'var(--secondary)' : 'var(--primary)',
                                      }} />
                                    </div>
                                    <span className="text-[10px] tabular-nums" style={{ color: 'var(--muted-foreground)' }}>{paidPct.toFixed(0)}%</span>
                                  </div>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Full Piutang Detail Table */}
              <Card className="rounded-xl" style={{ background: 'var(--card)', border: '1px solid color-mix(in srgb, var(--warning) 15%, transparent)' }}>
                <CardContent className="p-0">
                  <div className="flex items-center gap-2 p-3 sm:p-4" style={{ borderBottom: '1px solid var(--border)' }}>
                    <div className="h-6 w-6 rounded-md flex items-center justify-center" style={{ backgroundColor: 'color-mix(in srgb, var(--warning) 8%, transparent)' }}>
                      <AlertTriangle className="h-3 w-3" style={{ color: 'var(--warning)' }} />
                    </div>
                    <h3 className="text-xs font-semibold" style={{ color: 'var(--warning)' }}>Detail Piutang Belum Lunas</h3>
                    <Badge className="ml-auto text-[9px] font-medium rounded-full px-1.5 py-0" style={{ backgroundColor: 'color-mix(in srgb, var(--warning) 8%, transparent)', color: 'var(--warning)', border: '1px solid color-mix(in srgb, var(--warning) 12%, transparent)' }}>
                      {piutangDetail.length}
                    </Badge>
                  </div>
                  {piutangDetail.length === 0 ? (
                    <EmptyState icon={CreditCard} color={'var(--secondary)'} text="Tidak ada piutang yang belum lunas" />
                  ) : (
                    <>
                      {/* Mobile Card List */}
                      <div className="sm:hidden max-h-96 overflow-y-auto divide-y divide-border">
                        {piutangDetail.map((row) => (
                          <div key={row.id} className="p-3 flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-medium truncate" style={{ color: 'var(--foreground)' }}>{row.counterpart}</p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-[10px]" style={{ color: 'var(--secondary)' }}>Bayar {formatAmount(row.paid)}</span>
                                {row.daysOverdue > 0 && (
                                  <span className="text-[9px] font-medium px-1 py-0.5 rounded" style={{ backgroundColor: row.daysOverdue > 30 ? 'color-mix(in srgb, var(--destructive) 8%, transparent)' : 'color-mix(in srgb, var(--warning) 8%, transparent)', color: row.daysOverdue > 30 ? 'var(--destructive)' : 'var(--warning)' }}>{row.daysOverdue}d</span>
                                )}
                              </div>
                            </div>
                            <span className="text-xs font-bold tabular-nums shrink-0" style={{ color: 'var(--warning)' }}>{formatAmount(row.remaining)}</span>
                          </div>
                        ))}
                      </div>
                      {/* Desktop Table */}
                      <div className="hidden sm:block max-h-96 overflow-y-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="hover:bg-transparent" style={{ borderBottom: '1px solid var(--border)' }}>
                            <TableHead className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--muted-foreground)' }}>Pelanggan</TableHead>
                            <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-right" style={{ color: 'var(--muted-foreground)' }}>Total</TableHead>
                            <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-right" style={{ color: 'var(--muted-foreground)' }}>Terbayar</TableHead>
                            <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-right" style={{ color: 'var(--muted-foreground)' }}>Sisa</TableHead>
                            <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-right" style={{ color: 'var(--muted-foreground)' }}>Lewat Jatuh</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {piutangDetail.map((row, idx) => (
                            <TableRow key={row.id} className="transition-colors duration-150" style={{
                              background: row.daysOverdue > 0 ? 'color-mix(in srgb, var(--warning) 2%, transparent)' : idx % 2 === 1 ? 'rgba(255,255,255,0.015)' : 'transparent',
                              borderBottom: '1px solid var(--border)',
                            }}>
                              <TableCell className="text-xs py-2 font-medium" >{row.counterpart}</TableCell>
                              <TableCell className="text-xs text-right py-2" >{formatAmount(row.amount)}</TableCell>
                              <TableCell className="text-xs text-right py-2" style={{ color: 'var(--secondary)' }}>{formatAmount(row.paid)}</TableCell>
                              <TableCell className="text-xs text-right py-2 font-semibold" style={{ color: 'var(--warning)' }}>{formatAmount(row.remaining)}</TableCell>
                              <TableCell className="text-xs text-right py-2">
                                {row.daysOverdue > 0 ? (
                                  <Badge className="text-[9px] font-medium rounded-full px-1.5 py-0" style={{
                                    backgroundColor: row.daysOverdue > 30 ? 'color-mix(in srgb, var(--destructive) 8%, transparent)' : 'color-mix(in srgb, var(--warning) 8%, transparent)',
                                    color: row.daysOverdue > 30 ? 'var(--destructive)' : 'var(--warning)',
                                    border: `1px solid ${row.daysOverdue > 30 ? 'var(--destructive)' : 'var(--warning)'}20`,
                                  }}>
                                    {row.daysOverdue} hari
                                  </Badge>
                                ) : (
                                  <span className="text-[10px]" style={{ color: 'var(--muted-foreground)' }}>-</span>
                                )}
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
            </>
          )}
        </TabsContent>

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/*  SALES TAB (existing)                                          */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        <TabsContent value="sales" className="mt-3">
          <Card className="biz-content-card rounded-xl overflow-hidden" style={cardStyle}>
            <CardContent className="p-0">
              {loading ? (
                <div className="space-y-2 p-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-10 rounded-lg" style={{ background: 'var(--border)' }} />
                  ))}
                </div>
              ) : !data || data.sales.length === 0 ? (
                <EmptyState icon={TrendingUp} color={'var(--primary)'} text="Belum ada penjualan di periode ini" />
              ) : (
                <>
                  {/* Mobile Card List */}
                  <div className="sm:hidden max-h-96 overflow-y-auto divide-y divide-border">
                    {data.sales.map((sale) => (
                      <div key={sale.id} className="p-3 flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium truncate" style={{ color: 'var(--foreground)' }}>{sale.description}</p>
                          <p className="text-[10px]" style={{ color: 'var(--muted-foreground)' }}>
                            {sale.date}
                            {sale.customer && <> · {sale.customer}</>}
                            {sale.tipe === 'cicilan' && <span className="ml-1 text-[9px] px-1 py-0.5 rounded" style={{ backgroundColor: 'color-mix(in srgb, var(--primary) 8%, transparent)', color: 'var(--primary)' }}>Cicilan</span>}
                          </p>
                        </div>
                        <span className="text-xs font-semibold tabular-nums shrink-0" style={{ color: 'var(--secondary)' }}>{formatAmount(sale.amount)}</span>
                      </div>
                    ))}
                  </div>
                  {/* Desktop Table */}
                  <div className="hidden sm:block max-h-96 overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent" style={{ borderBottom: '1px solid var(--border)' }}>
                        <TableHead className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--muted-foreground)' }}>{t('biz.cashDate')}</TableHead>
                        <TableHead className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--muted-foreground)' }}>{t('biz.saleDescription')}</TableHead>
                        <TableHead className="text-[10px] font-semibold uppercase tracking-wider hidden sm:table-cell" style={{ color: 'var(--muted-foreground)' }}>Pelanggan</TableHead>
                        <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-right" style={{ color: 'var(--muted-foreground)' }}>{t('biz.saleAmount')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.sales.map((sale, idx) => (
                        <TableRow key={sale.id} className="transition-colors duration-150" style={{ background: idx % 2 === 1 ? 'rgba(255,255,255,0.015)' : 'transparent', borderBottom: '1px solid var(--border)' }}>
                          <TableCell className="text-xs py-2" >
                            <div className="flex items-center gap-1.5">
                              {sale.date}
                              {sale.tipe === 'cicilan' && (
                                <Badge className="text-[8px] px-1 py-0 rounded-full" style={{
                                  backgroundColor: 'color-mix(in srgb, var(--primary) 8%, transparent)',
                                  color: 'var(--primary)',
                                  border: '1px solid color-mix(in srgb, var(--primary) 12%, transparent)',
                                }}>Cicilan</Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-xs py-2 font-medium" >{sale.description}</TableCell>
                          <TableCell className="text-xs py-2 hidden sm:table-cell" >{sale.customer}</TableCell>
                          <TableCell className="text-xs text-right py-2 font-semibold" style={{ color: 'var(--secondary)' }}>{formatAmount(sale.amount)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/*  EXPENSES TAB (existing)                                       */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        <TabsContent value="expenses" className="mt-3">
          <Card className="biz-content-card rounded-xl overflow-hidden" style={cardStyle}>
            <CardContent className="p-0">
              {loading ? (
                <div className="space-y-2 p-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-10 rounded-lg" style={{ background: 'var(--border)' }} />
                  ))}
                </div>
              ) : !data || data.expenses.length === 0 ? (
                <EmptyState icon={TrendingDown} color={'var(--destructive)'} text="Belum ada pengeluaran di periode ini" />
              ) : (
                <>
                  {/* Mobile Card List */}
                  <div className="sm:hidden max-h-96 overflow-y-auto divide-y divide-border">
                    {data.expenses.map((exp) => (
                      <div key={exp.id} className="p-3 flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium truncate" style={{ color: 'var(--foreground)' }}>{exp.description}</p>
                          <p className="text-[10px]" style={{ color: 'var(--muted-foreground)' }}>{exp.date}{exp.category && <> · {exp.category}</>}</p>
                        </div>
                        <span className="text-xs font-semibold tabular-nums shrink-0" style={{ color: 'var(--destructive)' }}>-{formatAmount(exp.amount)}</span>
                      </div>
                    ))}
                  </div>
                  {/* Desktop Table */}
                  <div className="hidden sm:block max-h-96 overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent" style={{ borderBottom: '1px solid var(--border)' }}>
                        <TableHead className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--muted-foreground)' }}>{t('biz.cashDate')}</TableHead>
                        <TableHead className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--muted-foreground)' }}>{t('biz.cashDescription')}</TableHead>
                        <TableHead className="text-[10px] font-semibold uppercase tracking-wider hidden sm:table-cell" style={{ color: 'var(--muted-foreground)' }}>{t('biz.cashCategory')}</TableHead>
                        <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-right" style={{ color: 'var(--muted-foreground)' }}>{t('biz.cashAmount')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.expenses.map((exp, idx) => (
                        <TableRow key={exp.id} className="transition-colors duration-150" style={{ background: idx % 2 === 1 ? 'rgba(255,255,255,0.015)' : 'transparent', borderBottom: '1px solid var(--border)' }}>
                          <TableCell className="text-xs py-2" >{exp.date}</TableCell>
                          <TableCell className="text-xs py-2 font-medium" >{exp.description}</TableCell>
                          <TableCell className="py-2 hidden sm:table-cell">
                            <Badge className="text-[9px] font-medium rounded-full px-1.5 py-0" style={{ backgroundColor: 'color-mix(in srgb, var(--muted-foreground) 6%, transparent)', color: 'var(--foreground)', border: '1px solid var(--border)' }}>{exp.category || '-'}</Badge>
                          </TableCell>
                          <TableCell className="text-xs text-right py-2 font-semibold" style={{ color: 'var(--destructive)' }}>-{formatAmount(exp.amount)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/*  INVOICES TAB (existing)                                       */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        <TabsContent value="invoices" className="mt-3">
          <Card className="biz-content-card rounded-xl overflow-hidden" style={cardStyle}>
            <CardContent className="p-0">
              {loading ? (
                <div className="space-y-2 p-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-10 rounded-lg" style={{ background: 'var(--border)' }} />
                  ))}
                </div>
              ) : !data || data.invoices.length === 0 ? (
                <EmptyState icon={Receipt} color={'var(--warning)'} text="Belum ada invoice di periode ini" />
              ) : (
                <>
                  {/* Mobile Card List */}
                  <div className="sm:hidden max-h-96 overflow-y-auto divide-y divide-border">
                    {data.invoices.map((inv) => {
                      const statusStyle = inv.status === 'paid'
                        ? { backgroundColor: 'color-mix(in srgb, var(--secondary) 8%, transparent)', color: 'var(--secondary)' }
                        : inv.status === 'overdue'
                          ? { backgroundColor: 'color-mix(in srgb, var(--destructive) 8%, transparent)', color: 'var(--destructive)' }
                          : { backgroundColor: 'color-mix(in srgb, var(--warning) 8%, transparent)', color: 'var(--warning)' };
                      return (
                        <div key={inv.id} className="p-3 flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-medium truncate" style={{ color: 'var(--foreground)' }}>{inv.invoiceNumber}</p>
                            <p className="text-[10px]" style={{ color: 'var(--muted-foreground)' }}>{inv.customer && <>{inv.customer} · </>}{inv.date}</p>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="text-xs font-semibold tabular-nums" style={{ color: 'var(--foreground)' }}>{formatAmount(inv.total)}</span>
                            <span className="block text-[9px] font-medium px-1.5 py-0.5 rounded" style={statusStyle}>{inv.status}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {/* Desktop Table */}
                  <div className="hidden sm:block max-h-96 overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent" style={{ borderBottom: '1px solid var(--border)' }}>
                        <TableHead className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--muted-foreground)' }}>{t('biz.invoiceNumber')}</TableHead>
                        <TableHead className="text-[10px] font-semibold uppercase tracking-wider hidden sm:table-cell" style={{ color: 'var(--muted-foreground)' }}>Pelanggan</TableHead>
                        <TableHead className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--muted-foreground)' }}>{t('biz.invoiceStatus')}</TableHead>
                        <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-right" style={{ color: 'var(--muted-foreground)' }}>{t('biz.invoiceTotal')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.invoices.map((inv, idx) => {
                        const statusStyle = inv.status === 'paid'
                          ? { backgroundColor: 'color-mix(in srgb, var(--secondary) 8%, transparent)', color: 'var(--secondary)', border: '1px solid color-mix(in srgb, var(--secondary) 15%, transparent)' }
                          : inv.status === 'overdue'
                            ? { backgroundColor: 'color-mix(in srgb, var(--destructive) 8%, transparent)', color: 'var(--destructive)', border: '1px solid color-mix(in srgb, var(--destructive) 15%, transparent)' }
                            : { backgroundColor: 'color-mix(in srgb, var(--warning) 8%, transparent)', color: 'var(--warning)', border: '1px solid color-mix(in srgb, var(--warning) 15%, transparent)' };
                        return (
                          <TableRow key={inv.id} className="transition-colors duration-150" style={{ background: idx % 2 === 1 ? 'rgba(255,255,255,0.015)' : 'transparent', borderBottom: '1px solid var(--border)' }}>
                            <TableCell className="text-xs py-2 font-medium" >{inv.invoiceNumber}</TableCell>
                            <TableCell className="text-xs py-2 hidden sm:table-cell" >{inv.customer}</TableCell>
                            <TableCell className="py-2">
                              <Badge variant="outline" className="text-[9px] font-medium rounded-full px-1.5 py-0" style={statusStyle}>
                                {inv.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-xs text-right py-2 font-semibold" >{formatAmount(inv.total)}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/*  DEBTS TAB (existing)                                          */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        <TabsContent value="debts" className="mt-3">
          <Card className="biz-content-card rounded-xl overflow-hidden" style={cardStyle}>
            <CardContent className="p-0">
              {loading ? (
                <div className="space-y-2 p-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-10 rounded-lg" style={{ background: 'var(--border)' }} />
                  ))}
                </div>
              ) : !data || data.debts.length === 0 ? (
                <EmptyState icon={CreditCard} color={'var(--secondary)'} text="Belum ada hutang/piutang" />
              ) : (
                <>
                  {/* Mobile Card List */}
                  <div className="sm:hidden max-h-96 overflow-y-auto divide-y divide-border">
                    {data.debts.map((debt) => (
                      <div key={debt.id} className="p-3 flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <p className="text-xs font-medium truncate" style={{ color: 'var(--foreground)' }}>{debt.counterpart}</p>
                            <Badge variant="outline" className="text-[9px] font-medium rounded-full px-1.5 py-0" style={debt.type === 'hutang' ? { backgroundColor: 'color-mix(in srgb, var(--destructive) 8%, transparent)', color: 'var(--destructive)' } : { backgroundColor: 'color-mix(in srgb, var(--secondary) 8%, transparent)', color: 'var(--secondary)' }}>{debt.type}</Badge>
                          </div>
                          <p className="text-[10px] mt-0.5" style={{ color: 'var(--muted-foreground)' }}>{formatAmount(debt.amount)}</p>
                        </div>
                        <span className="text-xs font-semibold tabular-nums shrink-0" style={{ color: debt.remaining > 0 ? 'var(--warning)' : 'var(--secondary)' }}>{debt.remaining > 0 ? formatAmount(debt.remaining) : t('biz.debtPaid')}</span>
                      </div>
                    ))}
                  </div>
                  {/* Desktop Table */}
                  <div className="hidden sm:block max-h-96 overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent" style={{ borderBottom: '1px solid var(--border)' }}>
                        <TableHead className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--muted-foreground)' }}>{t('biz.debtCounterpart')}</TableHead>
                        <TableHead className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--muted-foreground)' }}>{t('biz.debtStatus')}</TableHead>
                        <TableHead className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--muted-foreground)' }}>{t('biz.debtAmount')}</TableHead>
                        <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-right" style={{ color: 'var(--muted-foreground)' }}>{t('biz.debtRemaining')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.debts.map((debt, idx) => (
                        <TableRow key={debt.id} className="transition-colors duration-150" style={{ background: idx % 2 === 1 ? 'rgba(255,255,255,0.015)' : 'transparent', borderBottom: '1px solid var(--border)' }}>
                          <TableCell className="text-xs py-2 font-medium" >{debt.counterpart}</TableCell>
                          <TableCell className="py-2">
                            <Badge variant="outline" className="text-[9px] font-medium rounded-full px-1.5 py-0" style={
                              debt.type === 'hutang'
                                ? { backgroundColor: 'color-mix(in srgb, var(--destructive) 8%, transparent)', color: 'var(--destructive)', border: '1px solid color-mix(in srgb, var(--destructive) 15%, transparent)' }
                                : { backgroundColor: 'color-mix(in srgb, var(--secondary) 8%, transparent)', color: 'var(--secondary)', border: '1px solid color-mix(in srgb, var(--secondary) 15%, transparent)' }
                            }>
                              {debt.type}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs py-2" >{formatAmount(debt.amount)}</TableCell>
                          <TableCell className="text-xs text-right py-2 font-semibold" style={{ color: debt.remaining > 0 ? 'var(--warning)' : 'var(--secondary)' }}>
                            {debt.remaining > 0 ? formatAmount(debt.remaining) : t('biz.debtPaid')}
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
        </TabsContent>

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/*  INVESTOR TAB                                                    */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        <TabsContent value="investor" className="mt-3 space-y-3">
          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-48 rounded-xl" style={{ background: 'var(--card)' }} />
              <Skeleton className="h-32 rounded-xl" style={{ background: 'var(--card)' }} />
            </div>
          ) : !data || !data.investorSummary ? (
            <EmptyState icon={Users} color={'var(--primary)'} text="Tidak ada data investor" />
          ) : (
            <>
              {/* Investor Overview Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
                {[
                  { label: 'Total Investor', value: data.investorSummary.totalInvestors, icon: Users, color: 'var(--primary)' },
                  { label: 'Investor Aktif', value: data.investorSummary.activeInvestors, icon: Building2, color: 'var(--secondary)' },
                  { label: 'Total Investasi', value: formatAmount(data.investorSummary.totalInvested), icon: Landmark, color: 'var(--primary)' },
                  { label: 'Pendapatan Investor', value: formatAmount(data.investorSummary.investorIncomeInPeriod), icon: ArrowUpRight, color: 'var(--secondary)' },
                ].map((item, idx) => {
                  const Icon = item.icon;
                  return (
                    <motion.div
                      key={item.label}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05, type: 'spring' as const, stiffness: 300, damping: 24 }}
                    >
                      <div className="p-3 rounded-xl" style={{ background: 'var(--card)', border: `1px solid var(--border)` }}>
                        <div className="h-6 w-6 rounded-lg flex items-center justify-center mb-2" style={{ backgroundColor: `color-mix(in srgb, ${item.color} 8%, transparent)` }}>
                          <Icon className="h-3 w-3" style={{ color: item.color } as React.CSSProperties} />
                        </div>
                        <p className="text-[10px] font-medium uppercase tracking-wider" style={{ color: 'var(--muted-foreground)' }}>{item.label}</p>
                        <p className="text-sm font-bold tabular-nums mt-0.5" style={{ color: item.color }}>{item.value}</p>
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              {/* Investor List */}
              {data.investorSummary.investors.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2, type: 'spring' as const, stiffness: 200, damping: 22 }}
                >
                  <Card className="rounded-xl overflow-hidden" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
                    <div className="h-px bg-white/[0.06]" />
                    <CardContent className="p-0">
                      <div className="sm:hidden max-h-96 overflow-y-auto divide-y divide-border">
                        {data.investorSummary.investors.map((inv) => (
                          <div key={inv.id} className="p-3 flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-medium truncate" style={{ color: 'var(--foreground)' }}>{inv.name}</p>
                              <p className="text-[10px]" style={{ color: 'var(--muted-foreground)' }}>
                                Bergabung {inv.joinDate}
                                {inv.profitSharePct > 0 && <> · Bagi {inv.profitSharePct}%</>}
                              </p>
                            </div>
                            <div className="text-right shrink-0">
                              <span className="text-xs font-semibold tabular-nums" style={{ color: 'var(--primary)' }}>{formatAmount(inv.totalInvestment)}</span>
                              <Badge variant="outline" className="block text-[8px] mt-0.5 rounded-full px-1.5 py-0 text-center" style={{
                                backgroundColor: inv.status === 'active' ? 'color-mix(in srgb, var(--secondary) 8%, transparent)' : 'color-mix(in srgb, var(--muted-foreground) 8%, transparent)',
                                color: inv.status === 'active' ? 'var(--secondary)' : 'var(--muted-foreground)',
                                border: '1px solid var(--border)',
                              }}>
                                {inv.status === 'active' ? 'Aktif' : 'Nonaktif'}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="hidden sm:block max-h-96 overflow-y-auto">
                        <Table>
                          <TableHeader>
                            <TableRow className="hover:bg-transparent" style={{ borderBottom: '1px solid var(--border)' }}>
                              <TableHead className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--muted-foreground)' }}>Nama</TableHead>
                              <TableHead className="text-[10px] font-semibold uppercase tracking-wider hidden sm:table-cell" style={{ color: 'var(--muted-foreground)' }}>Bergabung</TableHead>
                              <TableHead className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--muted-foreground)' }}>Bagi Profit</TableHead>
                              <TableHead className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--muted-foreground)' }}>Status</TableHead>
                              <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-right" style={{ color: 'var(--muted-foreground)' }}>Investasi</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {data.investorSummary.investors.map((inv, idx) => (
                              <TableRow key={inv.id} className="transition-colors duration-150" style={{ background: idx % 2 === 1 ? 'rgba(255,255,255,0.015)' : 'transparent', borderBottom: '1px solid var(--border)' }}>
                                <TableCell className="text-xs py-2 font-medium">{inv.name}</TableCell>
                                <TableCell className="text-xs py-2 hidden sm:table-cell">{inv.joinDate}</TableCell>
                                <TableCell className="text-xs py-2">{inv.profitSharePct > 0 ? `${inv.profitSharePct}%` : '-'}</TableCell>
                                <TableCell className="py-2">
                                  <Badge variant="outline" className="text-[9px] font-medium rounded-full px-1.5 py-0" style={{
                                    backgroundColor: inv.status === 'active' ? 'color-mix(in srgb, var(--secondary) 8%, transparent)' : 'color-mix(in srgb, var(--muted-foreground) 8%, transparent)',
                                    color: inv.status === 'active' ? 'var(--secondary)' : 'var(--muted-foreground)',
                                    border: '1px solid var(--border)',
                                  }}>
                                    {inv.status === 'active' ? 'Aktif' : 'Nonaktif'}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-xs text-right py-2 font-semibold" style={{ color: 'var(--primary)' }}>{formatAmount(inv.totalInvestment)}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </>
          )}
        </TabsContent>

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/*  ANGGARAN (BUDGET) TAB                                          */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        <TabsContent value="anggaran" className="mt-3 space-y-3">
          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-32 rounded-xl" style={{ background: 'var(--card)' }} />
              <Skeleton className="h-48 rounded-xl" style={{ background: 'var(--card)' }} />
            </div>
          ) : !data || !data.budgetUtilization ? (
            <EmptyState icon={Target} color={'var(--warning)'} text="Tidak ada anggaran untuk bulan ini" />
          ) : (
            <>
              {/* Budget Overview */}
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: 'spring' as const, stiffness: 200, damping: 22 }}
              >
                <Card className="rounded-xl overflow-hidden" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
                  <div className="h-px bg-white/[0.06]" />
                  <CardContent className="p-3 sm:p-4">
                    <SectionHeader icon={Target} color="var(--warning)" title={`Anggaran Bulan Ini`} badge={`${data.budgetUtilization.period}/${data.budgetUtilization.year}`} />
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-3">
                      <div className="p-3 rounded-lg" style={{ backgroundColor: 'color-mix(in srgb, var(--warning) 4%, transparent)', border: '1px solid color-mix(in srgb, var(--warning) 10%, transparent)' }}>
                        <span className="text-[10px] font-medium uppercase tracking-wider block" style={{ color: 'var(--muted-foreground)' }}>Total Anggaran</span>
                        <span className="text-sm font-bold tabular-nums" style={{ color: 'var(--warning)' }}>{formatAmount(data.budgetUtilization.totalBudgeted)}</span>
                      </div>
                      <div className="p-3 rounded-lg" style={{ backgroundColor: 'color-mix(in srgb, var(--destructive) 4%, transparent)', border: '1px solid color-mix(in srgb, var(--destructive) 10%, transparent)' }}>
                        <span className="text-[10px] font-medium uppercase tracking-wider block" style={{ color: 'var(--muted-foreground)' }}>Total Aktual</span>
                        <span className="text-sm font-bold tabular-nums" style={{ color: data.budgetUtilization.totalActual > data.budgetUtilization.totalBudgeted ? 'var(--destructive)' : 'var(--foreground)' }}>{formatAmount(data.budgetUtilization.totalActual)}</span>
                      </div>
                      <div className="p-3 rounded-lg col-span-2 sm:col-span-1" style={{ backgroundColor: data.budgetUtilization.totalActual <= data.budgetUtilization.totalBudgeted ? 'color-mix(in srgb, var(--secondary) 4%, transparent)' : 'color-mix(in srgb, var(--destructive) 4%, transparent)', border: `1px solid ${data.budgetUtilization.totalActual <= data.budgetUtilization.totalBudgeted ? 'color-mix(in srgb, var(--secondary) 10%, transparent)' : 'color-mix(in srgb, var(--destructive) 10%, transparent)'}` }}>
                        <span className="text-[10px] font-medium uppercase tracking-wider block" style={{ color: 'var(--muted-foreground)' }}>Sisa Anggaran</span>
                        <span className="text-sm font-bold tabular-nums" style={{ color: data.budgetUtilization.totalBudgeted - data.budgetUtilization.totalActual >= 0 ? 'var(--secondary)' : 'var(--destructive)' }}>
                          {formatAmount(Math.abs(data.budgetUtilization.totalBudgeted - data.budgetUtilization.totalActual))}
                        </span>
                      </div>
                    </div>
                    {/* Overall utilization bar */}
                    {data.budgetUtilization.totalBudgeted > 0 && (
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[10px] font-medium uppercase tracking-wider" style={{ color: 'var(--muted-foreground)' }}>Pemanfaatan Anggaran</span>
                          <span className="text-xs font-bold tabular-nums" style={{ color: data.budgetUtilization.totalActual > data.budgetUtilization.totalBudgeted ? 'var(--destructive)' : 'var(--warning)' }}>
                            {((data.budgetUtilization.totalActual / data.budgetUtilization.totalBudgeted) * 100).toFixed(1)}%
                          </span>
                        </div>
                        <div className="h-2.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--border)' }}>
                          <div
                            className="h-full rounded-full transition-all duration-700"
                            style={{
                              width: `${Math.min((data.budgetUtilization.totalActual / data.budgetUtilization.totalBudgeted) * 100, 100)}%`,
                              backgroundColor: data.budgetUtilization.totalActual > data.budgetUtilization.totalBudgeted ? 'var(--destructive)' : 'var(--warning)',
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>

              {/* Per-Category Budget Breakdown */}
              {data.budgetUtilization.categories.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1, type: 'spring' as const, stiffness: 200, damping: 22 }}
                >
                  <Card className="rounded-xl overflow-hidden" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
                    <CardContent className="p-3 sm:p-4">
                      <SectionHeader icon={Percent} color="var(--primary)" title="Rincian per Kategori" badge={data.budgetUtilization.categories.length} />
                      <div className="space-y-2.5">
                        {data.budgetUtilization.categories.map((cat) => (
                          <div key={cat.categoryName} className="p-2.5 rounded-lg" style={{
                            border: `1px solid ${cat.isOverBudget ? 'color-mix(in srgb, var(--destructive) 15%, transparent)' : 'var(--border)'}`,
                            backgroundColor: cat.isOverBudget ? 'color-mix(in srgb, var(--destructive) 3%, transparent)' : 'transparent',
                          }}>
                            <div className="flex items-center justify-between mb-1.5">
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-medium" style={{ color: 'var(--foreground)' }}>{cat.categoryName}</span>
                                {cat.isOverBudget && (
                                  <Badge className="text-[8px] font-bold rounded px-1 py-0 h-3" style={{ backgroundColor: 'color-mix(in srgb, var(--destructive) 12%, transparent)', color: 'var(--destructive)', border: 'none' }}>
                                    OVER
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-[10px]" style={{ color: 'var(--muted-foreground)' }}>{cat.utilizationPct.toFixed(0)}%</span>
                              </div>
                            </div>
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="text-[10px]" style={{ color: 'var(--muted-foreground)' }}>Aktual: {formatAmount(cat.actual)}</span>
                              <span className="text-[10px]" style={{ color: 'var(--muted-foreground)' }}>Anggaran: {formatAmount(cat.budgeted)}</span>
                            </div>
                            <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--border)' }}>
                              <div
                                className="h-full rounded-full transition-all duration-700"
                                style={{
                                  width: `${Math.min(cat.utilizationPct, 100)}%`,
                                  backgroundColor: cat.isOverBudget ? 'var(--destructive)' : cat.utilizationPct > 80 ? 'var(--warning)' : 'var(--secondary)',
                                }}
                              />
                            </div>
                            {/* Sisa */}
                            <div className="flex items-center justify-between mt-1">
                              <span className="text-[9px]" style={{ color: 'var(--muted-foreground)' }}>Sisa: {formatAmount(cat.remaining)}</span>
                              {cat.allocations.length > 0 && (
                                <span className="text-[9px]" style={{ color: 'var(--muted-foreground)' }}>
                                  {cat.allocations.map((a) => `${a.fundSource}: ${formatAmount(a.amount)}`).join(' · ')}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* Tax Audit Summary (kept below tabs as reference section) */}
      {data && taxAudit && (
        <Card className="rounded-xl" style={{ background: 'var(--card)', border: '1px solid color-mix(in srgb, var(--warning) 15%, transparent)' }}>
          <CardContent className="p-3 sm:p-4">
            <SectionHeader icon={AlertTriangle} color="var(--warning)" title="Detail Audit Pajak" />
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
              {[
                { label: 'Pendapatan Tunai', value: taxAudit.pendapatanTunai, color: 'var(--secondary)', highlight: false },
                { label: 'Pendapatan Cicilan (Total)', value: taxAudit.pendapatanCicilan, color: 'var(--primary)', highlight: false },
                { label: 'Pendapatan Cicilan — Diterima', value: taxAudit.dpDiterima, color: 'var(--secondary)', highlight: false },
                { label: 'Total Piutang Belum Dibayar', value: taxAudit.totalPiutangBelumDibayar, color: 'var(--warning)', highlight: true },
                { label: 'Pengeluaran', value: data.summary.totalExpense, color: 'var(--destructive)', highlight: false },
                { label: 'LABA RUGI REAL', value: taxAudit.labaRugiReal, color: taxAudit.labaRugiReal >= 0 ? 'var(--secondary)' : 'var(--destructive)', highlight: true },
              ].map((item) => (
                <div
                  key={item.label}
                  className="flex items-center justify-between p-2 rounded-lg"
                  style={{
                    background: item.highlight ? `${item.color}08` : 'transparent',
                    border: item.highlight ? `1px solid color-mix(in srgb, ${item.color} 12%, transparent)` : '1px solid var(--border)',
                  }}
                >
                  <span className="text-[10px] font-medium" style={{ color: 'var(--muted-foreground)' }}>{item.label}</span>
                  <span className="text-xs font-bold tabular-nums" style={{ color: item.color }}>
                    {formatAmount(item.value)}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Expense Breakdown Chart (kept below tabs) */}
      {data && data.expenses.length > 0 && !loading && (
        <Card className="biz-content-card rounded-xl" style={cardStyle}>
          <CardContent className="p-3 sm:p-4">
            <SectionHeader icon={BarChart3} color="var(--destructive)" title="Expense Breakdown" badge={data.expenses.length} />
            <ExpenseBreakdownChart expenses={data.expenses} formatAmount={formatAmount} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
