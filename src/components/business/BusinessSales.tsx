'use client';

import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useBusinessStore } from '@/store/useBusinessStore';
import { useTranslation } from '@/hooks/useTranslation';
import { useCurrencyFormat } from '@/hooks/useCurrencyFormat';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
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
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  Plus,
  Pencil,
  Trash2,
  TrendingUp,
  ShoppingBag,
  Search,
  CreditCard,
  Banknote,
  QrCode,
  Receipt,
  BarChart3,
  Calculator,
  PackageOpen,
  CircleDollarSign,
  Wallet,
  Repeat,
  Users,
  Percent,
  ArrowDownToLine,
  Layers,
  CalendarDays,
  CheckCircle,
  Info,
} from 'lucide-react';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ProductList from './ProductList';

interface Customer {
  id: string;
  name: string;
}

interface Category {
  id: string;
  name: string;
  type: string;
}

interface Sale {
  id: string;
  description: string;
  amount: number;
  date: string;
  paymentMethod: string | null;
  notes?: string;
  customer?: Customer | null;
  customerId?: string | null;
  invoiceId?: string | null;
  categoryId?: string | null;
  category?: { id: string; name: string } | null;
  downPayment?: number | null;
  downPaymentPct?: number | null;
  installmentTempo?: number | null;
  installmentAmount?: number | null;
  investorSharePct?: number | null;
  installmentDueDate?: string | null;
  realizedAmount?: number | null;
}

const PAYMENT_METHODS = [
  { value: 'cash', labelKey: 'biz.paymentCash', icon: Banknote, color: 'var(--secondary)' },
  { value: 'transfer', labelKey: 'biz.paymentTransfer', icon: CreditCard, color: 'var(--primary)' },
  { value: 'qris', labelKey: 'biz.paymentQRIS', icon: QrCode, color: 'var(--warning)' },
];

const paymentIconMap: Record<string, string> = {
  cash: 'var(--secondary)',
  transfer: 'var(--primary)',
  qris: 'var(--warning)',
};

// Animated counter hook
function useAnimatedCounter(target: number, duration: number = 800) {
  const [count, setCount] = useState(0);
  const prevTarget = useRef(0);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const start = prevTarget.current;
    const diff = target - start;
    const startTime = performance.now();

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(start + diff * eased);
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      }
    };

    rafRef.current = requestAnimationFrame(animate);
    prevTarget.current = target;

    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration]);

  return count;
}

const rowVariants = {
  hidden: { opacity: 0, x: -12 },
  visible: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: { delay: i * 0.04, type: 'spring' as const, stiffness: 260, damping: 20 },
  }),
  exit: { opacity: 0, x: 12, transition: { duration: 0.2 } },
};

const installmentSectionVariants = {
  hidden: { opacity: 0, height: 0, marginTop: 0 },
  visible: {
    opacity: 1,
    height: 'auto',
    marginTop: 12,
    transition: {
      type: 'spring' as const,
      stiffness: 200,
      damping: 22,
      opacity: { duration: 0.25 },
    },
  },
  exit: {
    opacity: 0,
    height: 0,
    marginTop: 0,
    transition: { duration: 0.2, opacity: { duration: 0.1 } },
  },
};

export default function BusinessSales() {
  const { t } = useTranslation();
  const { activeBusiness } = useBusinessStore();
  const { formatAmount } = useCurrencyFormat();
  const [activeTab, setActiveTab] = useState<'sales' | 'products'>('sales');
  const [sales, setSales] = useState<Sale[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<
    Array<{ id: string; name: string; price: number; stock: number; sku: string | null }>
  >([]);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [paymentFilter, setPaymentFilter] = useState<string>('all');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSale, setEditingSale] = useState<Sale | null>(null);
  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    customerId: '',
    paymentMethod: 'cash',
    notes: '',
    categoryId: '',
    isInstallment: false,
    downPayment: '',
    downPaymentPct: '',
    installmentTempo: '',
    investorSharePct: '',
    installmentDueDate: '',
  });
  const [saving, setSaving] = useState(false);

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [showInvoicePrompt, setShowInvoicePrompt] = useState(false);

  const businessId = activeBusiness?.id;

  // Computed installment values
  const computedDP = formData.isInstallment ? parseFloat(formData.downPayment) || 0 : 0;
  const computedAmount = parseFloat(formData.amount) || 0;
  const computedTenor = formData.isInstallment ? parseInt(formData.installmentTempo) || 0 : 0;
  const remaining = Math.max(0, computedAmount - computedDP);
  const monthlyInstallment = computedTenor > 0 ? remaining / computedTenor : 0;
  const investorSharePct = formData.isInstallment ? parseFloat(formData.investorSharePct) || 0 : 0;
  const investorShareAmount = monthlyInstallment > 0 ? (monthlyInstallment * investorSharePct) / 100 : 0;

  // Auto-calculate DP percentage when DP amount changes
  const handleDownPaymentChange = (value: string) => {
    const dp = parseFloat(value) || 0;
    const amt = parseFloat(formData.amount) || 0;
    const pct = amt > 0 ? ((dp / amt) * 100).toFixed(1) : '';
    setFormData((prev) => ({ ...prev, downPayment: value, downPaymentPct: pct }));
  };

  // Auto-calculate DP amount when DP percentage changes
  const handleDownPaymentPctChange = (value: string) => {
    const pct = parseFloat(value) || 0;
    const amt = parseFloat(formData.amount) || 0;
    const dp = (amt * pct) / 100;
    setFormData((prev) => ({ ...prev, downPaymentPct: value, downPayment: dp > 0 ? dp.toString() : '' }));
  };

  const fetchSales = useCallback(() => {
    if (!businessId) return;
    setLoading(true);
    Promise.all([
      fetch(`/api/business/${businessId}/sales`).then((r) => (r.ok ? r.json() : [])),
      fetch(`/api/business/${businessId}/customers`).then((r) => (r.ok ? r.json() : [])),
      fetch(`/api/business/${businessId}/products`).then((r) => (r.ok ? r.json() : { products: [] })),
      fetch(`/api/business/${businessId}/categories?type=produk`).then((r) => (r.ok ? r.json() : { categories: [] })),
    ])
      .then(([salesData, customersData, productsData, categoriesData]) => {
        setSales(salesData?.sales || []);
        setCustomers(customersData?.customers || []);
        setProducts(productsData?.products || []);
        setCategories(categoriesData?.categories || []);
      })
      .catch(() => {
        setSales([]);
        setCustomers([]);
        setProducts([]);
        setCategories([]);
      })
      .finally(() => setLoading(false));
  }, [businessId]);

  useEffect(() => {
    if (businessId && activeTab === 'sales') {
      fetchSales();
    } else if (businessId) {
      setLoading(false);
    } else {
      setLoading(false);
    }
  }, [businessId, fetchSales, activeTab]);

  const handleProductSelect = (productId: string) => {
    setSelectedProductId(productId);
    const product = products.find((p) => p.id === productId);
    if (product) {
      setFormData((prev) => ({ ...prev, description: product.name, amount: product.price.toString() }));
    }
  };

  const openCreateDialog = () => {
    setEditingSale(null);
    setSelectedProductId('');
    setFormData({
      description: '',
      amount: '',
      date: new Date().toISOString().split('T')[0],
      customerId: '',
      paymentMethod: 'cash',
      notes: '',
      categoryId: '',
      isInstallment: false,
      installmentDueDate: '',
      downPayment: '',
      downPaymentPct: '',
      installmentTempo: '',
      investorSharePct: '',
    });
    setDialogOpen(true);
  };

  const openEditDialog = (sale: Sale) => {
    setEditingSale(sale);
    setFormData({
      description: sale.description,
      amount: sale.amount.toString(),
      date: sale.date.split('T')[0],
      customerId: sale.customerId || '',
      paymentMethod: sale.paymentMethod || 'cash',
      notes: sale.notes || '',
      categoryId: sale.categoryId || '',
      isInstallment: (sale.installmentTempo ?? 0) > 0,
      downPayment: sale.downPayment?.toString() || '',
      downPaymentPct: sale.downPaymentPct?.toString() || '',
      installmentTempo: sale.installmentTempo?.toString() || '',
      investorSharePct: sale.investorSharePct?.toString() || '',
      installmentDueDate: (sale as unknown as Record<string, unknown>).installmentDueDate ? String((sale as unknown as Record<string, unknown>).installmentDueDate) : '',
    });
    setDialogOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessId || !formData.description || !formData.amount) return;
    setSaving(true);
    try {
      const url = editingSale
        ? `/api/business/${businessId}/sales/${editingSale.id}`
        : `/api/business/${businessId}/sales`;
      const amt = parseFloat(formData.amount);
      const dp = formData.isInstallment ? parseFloat(formData.downPayment) || null : null;
      const dpPct = formData.isInstallment ? parseFloat(formData.downPaymentPct) || null : null;
      const tenor = formData.isInstallment ? parseInt(formData.installmentTempo) || null : null;
      const instAmount = formData.isInstallment && tenor && tenor > 0
        ? (amt - (parseFloat(formData.downPayment) || 0)) / tenor
        : null;
      const invPct = formData.isInstallment ? parseFloat(formData.investorSharePct) || null : null;
      const instDueDate = formData.isInstallment && formData.installmentDueDate ? formData.installmentDueDate : null;
      const body: Record<string, unknown> = {
        description: formData.description,
        amount: amt,
        date: formData.date,
        paymentMethod: formData.paymentMethod,
        notes: formData.notes || undefined,
        downPayment: dp,
        downPaymentPct: dpPct,
        installmentTempo: tenor,
        installmentAmount: instAmount,
        investorSharePct: invPct,
        installmentDueDate: instDueDate,
      };
      if (formData.customerId) body.customerId = formData.customerId;
      if (formData.categoryId) body.categoryId = formData.categoryId;
      const res = await fetch(url, {
        method: editingSale ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error();
      toast.success(editingSale ? t('biz.businessUpdated') : t('biz.businessCreated'));
      setDialogOpen(false);
      fetchSales();
      setShowInvoicePrompt(true);
    } catch {
      toast.error(t('common.error'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!businessId || !deleteId) return;
    try {
      const res = await fetch(`/api/business/${businessId}/sales/${deleteId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      toast.success(t('biz.businessUpdated'));
      fetchSales();
    } catch {
      toast.error(t('common.error'));
    } finally {
      setDeleteId(null);
    }
  };

  const filteredSales = useMemo(
    () =>
      sales.filter((s) => {
        const matchesSearch =
          s.description.toLowerCase().includes(search.toLowerCase()) ||
          s.customer?.name.toLowerCase().includes(search.toLowerCase());
        const matchesPayment = paymentFilter === 'all' || s.paymentMethod === paymentFilter;
        return matchesSearch && matchesPayment;
      }),
    [sales, search, paymentFilter]
  );

  const total = filteredSales.reduce((sum, s) => sum + s.amount, 0);
  const totalTunai = filteredSales
    .filter((s) => (s.installmentTempo ?? 0) <= 0)
    .reduce((sum, s) => sum + s.amount, 0);
  const totalCicilan = filteredSales
    .filter((s) => (s.installmentTempo ?? 0) > 0)
    .reduce((sum, s) => sum + (s.realizedAmount ?? s.downPayment ?? 0), 0);

  const todayStr = new Date().toISOString().split('T')[0];
  const todaySales = sales.filter((s) => s.date.startsWith(todayStr));
  const todayTotal = todaySales.reduce((sum, s) => sum + s.amount, 0);
  const avgPerTransaction = filteredSales.length > 0 ? total / filteredSales.length : 0;

  const animatedTotal = useAnimatedCounter(total);
  const animatedToday = useAnimatedCounter(todayTotal);
  const animatedAvg = useAnimatedCounter(avgPerTransaction);
  const animatedTunai = useAnimatedCounter(totalTunai);
  const animatedCicilan = useAnimatedCounter(totalCicilan);

  // Selected product info for dialog
  const selectedProduct = products.find((p) => p.id === selectedProductId);
  const isProductAutoFill = selectedProductId && selectedProduct;

  if (!businessId) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground text-center">{t('biz.registerFirst')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Info Banner */}
      <div className="flex items-start gap-2 p-2.5 rounded-lg text-[11px] bg-primary/5 border border-primary/15">
        <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" style={{ color: 'var(--primary)' }} />
        <span className="text-muted-foreground">
          Catat semua penjualan Anda. Untuk penjualan cicilan, sistem akan otomatis membuat piutang dan invoice.
        </span>
      </div>

      {/* Tab Toggle — simple design */}
      <div
        className="relative flex gap-1 rounded-lg p-0.5 w-fit bg-card border border-border"
      >
        <div
          className="absolute top-0.5 bottom-0.5 rounded-md bg-primary opacity-15"
            style={{
            width: 'calc(50% - 3px)',
            left: activeTab === 'sales' ? '2px' : 'calc(50% + 1px)',
            transition: 'all 0.2s ease',
          }}
        />
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setActiveTab('sales')}
          className="relative z-10 rounded-md px-4 transition-colors duration-200"
          style={{ fontWeight: activeTab === 'sales' ? 600 : 400 }}
        >
          <ShoppingBag className="h-3.5 w-3.5 mr-1.5" />
          {t('biz.penjualan')}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setActiveTab('products')}
          className="relative z-10 rounded-md px-4 transition-colors duration-200"
          style={{ fontWeight: activeTab === 'products' ? 600 : 400 }}
        >
          <TrendingUp className="h-3.5 w-3.5 mr-1.5" />
          {t('biz.products')}
        </Button>
      </div>

      {/* Products Tab */}
      {activeTab === 'products' ? (
        <div key="products">
          <ProductList />
        </div>
      ) : (
        <div key="sales">
          {/* Summary Cards — Clean flat design */}
          <div className="grid grid-cols-2 gap-2 sm:gap-2.5 mb-3">
            {/* Total Penjualan (Tunai) */}
            <Card
              className="rounded-xl overflow-hidden bg-card border border-border"
            >
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center gap-2 mb-1.5">
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center bg-secondary/15"
                  >
                    <Banknote className="h-3.5 w-3.5" style={{ color: 'var(--secondary)' }} />
                  </div>
                  <span className="text-[10px] sm:text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                    Total Tunai
                  </span>
                </div>
                <p className="text-sm sm:text-base font-bold tabular-nums text-foreground">
                  {formatAmount(animatedTunai)}
                </p>
                <p className="text-[10px] mt-0.5 text-muted-foreground">
                  {filteredSales.filter((s) => (s.installmentTempo ?? 0) <= 0).length} transaksi
                </p>
              </CardContent>
            </Card>

            {/* Total Penjualan (Cicilan) */}
            <Card
              className="rounded-xl overflow-hidden bg-card border border-border"
            >
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center gap-2 mb-1.5">
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center bg-primary/15"
                  >
                    <Wallet className="h-3.5 w-3.5" style={{ color: 'var(--primary)' }} />
                  </div>
                  <span className="text-[10px] sm:text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                    Total Cicilan
                  </span>
                </div>
                <p className="text-sm sm:text-base font-bold tabular-nums text-foreground">
                  {formatAmount(animatedCicilan)}
                </p>
                <p className="text-[10px] mt-0.5 text-muted-foreground">
                  {filteredSales.filter((s) => (s.installmentTempo ?? 0) > 0).length} cicilan · realisasi
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Sub summary row */}
          <div className="flex items-center justify-between gap-3 mb-4 px-1">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <Receipt className="h-3.5 w-3.5" style={{ color: 'var(--primary)' }} />
                <span className="text-[11px] text-muted-foreground">{t('biz.cashDate')}</span>
                <span className="text-[11px] font-semibold tabular-nums text-foreground">{formatAmount(animatedToday)}</span>
                <span className="text-[10px] text-muted-foreground">({todaySales.length})</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Calculator className="h-3.5 w-3.5" style={{ color: 'var(--warning)' }} />
                <span className="text-[11px] text-muted-foreground">Rata-rata</span>
                <span className="text-[11px] font-semibold tabular-nums text-foreground">{formatAmount(animatedAvg)}</span>
              </div>
            </div>
          </div>

          {/* Header with Search & Filters */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <div>
              <h2 className="text-sm font-bold flex items-center gap-2 text-foreground">
                <ShoppingBag className="h-4 w-4" style={{ color: 'var(--secondary)' }} />
                {t('biz.penjualan')}
              </h2>
            </div>
            <Button
              onClick={openCreateDialog}
              size="sm"
              className="rounded-lg bg-primary text-primary-foreground"
            >
              <Plus className="h-3.5 w-3.5 mr-1" />
              {t('biz.addSale')}
            </Button>
          </div>

          {/* Search + Filter Row */}
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <div className="relative flex-1 w-full sm:max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t('common.search') + '...'}
                className="pl-9 rounded-lg text-sm bg-card border border-border text-foreground"
              />
            </div>
            <div className="flex items-center gap-1.5 overflow-x-auto flex-nowrap pb-1">
              <button
                onClick={() => setPaymentFilter('all')}
                className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-all duration-200 ${paymentFilter === 'all' ? 'bg-foreground/15 text-foreground border border-border' : 'text-muted-foreground border border-transparent'}`}
              >
                Semua
              </button>
              {PAYMENT_METHODS.map((m) => {
                const Icon = m.icon;
                return (
                  <button
                    key={m.value}
                    onClick={() => setPaymentFilter(m.value)}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium transition-all duration-200"
                    style={
                      paymentFilter === m.value
                        ? { backgroundColor: 'rgba(255,255,255,0.08)', borderColor: 'rgba(255,255,255,0.12)', color: m.color, border: '1px solid rgba(255,255,255,0.12)' }
                        : { color: 'var(--muted-foreground)', border: '1px solid transparent' }
                    }
                  >
                    <Icon className="h-2.5 w-2.5" />
                    {t(m.labelKey)}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Table */}
          <div>
            <Card
              className="rounded-xl overflow-hidden bg-card border border-border"
            >
              <CardContent className="p-0">
                {loading ? (
                  <div className="space-y-2 p-4">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Skeleton key={i} className="h-10 rounded-lg bg-border" />
                    ))}
                  </div>
                ) : filteredSales.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 sm:py-16 px-6">
                    <div className="w-14 h-14 rounded-xl flex items-center justify-center mb-4 bg-secondary/5 border border-border">
                      <PackageOpen className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <p className="text-sm font-medium text-muted-foreground">
                      {search || paymentFilter !== 'all'
                        ? 'Tidak ada penjualan yang cocok'
                        : t('biz.noBizData')}
                    </p>
                    <p className="text-xs mt-1 text-muted-foreground">
                      {search || paymentFilter !== 'all'
                        ? 'Coba ubah filter pencarian Anda'
                        : 'Mulai catat penjualan pertama Anda'}
                    </p>
                    {!search && paymentFilter === 'all' && (
                      <Button
                        onClick={openCreateDialog}
                        size="sm"
                        className="mt-4 rounded-lg text-sm bg-primary text-primary-foreground"
                      >
                        <Plus className="h-3.5 w-3.5 mr-1" />
                        {t('biz.addSale')}
                      </Button>
                    )}
                  </div>
                ) : (
                  <>
                    {/* Mobile Card List */}
                    <div className="sm:hidden max-h-[500px] overflow-y-auto divide-y divide-border">
                      <AnimatePresence mode="popLayout">
                        {filteredSales.map((sale, i) => {
                          const isInstallment = (sale.installmentTempo ?? 0) > 0;
                          const hasDP = (sale.downPayment ?? 0) > 0;
                          return (
                            <motion.div
                              key={sale.id}
                              custom={i}
                              variants={rowVariants}
                              initial="hidden"
                              animate="visible"
                              exit="exit"
                              layout
                              className="p-3 space-y-2"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0 flex-1">
                                  <p className="text-xs font-medium truncate text-foreground">{sale.description}</p>
                                  <p className="text-[10px] text-muted-foreground mt-0.5">
                                    {new Date(sale.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                                    {sale.customer?.name && <> · {sale.customer.name}</>}
                                  </p>
                                </div>
                                <div className="text-right shrink-0">
                                  <p className="text-xs font-semibold tabular-nums" style={{ color: 'var(--secondary)' }}>
                                    +{formatAmount(sale.amount)}
                                  </p>
                                  {isInstallment && hasDP && (
                                    <p className="text-[9px] text-muted-foreground">
                                      DP {formatAmount(sale.downPayment!)}
                                    </p>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1 flex-wrap">
                                  {sale.paymentMethod && (() => {
                                    const M = PAYMENT_METHODS.find((m) => m.value === sale.paymentMethod);
                                    if (!M) return null;
                                    const Icon = M.icon;
                                    return (
                                      <Badge variant="outline" className="text-[9px] font-medium border-0 rounded-full px-1.5 py-0 bg-primary/15 text-primary">
                                        <Icon className="h-2 w-2 mr-0.5" />
                                        {t(M.labelKey)}
                                      </Badge>
                                    );
                                  })()}
                                  {sale.category && (
                                    <Badge variant="outline" className="text-[9px] font-medium border-0 rounded-full px-1.5 py-0" style={{ backgroundColor: 'rgba(249, 168, 37, 0.15)', color: 'var(--warning)' }}>
                                      {sale.category.name}
                                    </Badge>
                                  )}
                                  {isInstallment && (
                                    <Badge variant="outline" className="text-[9px] font-bold border-0 rounded-full px-1.5 py-0" style={{ backgroundColor: 'rgba(187, 134, 252, 0.15)', color: 'var(--primary)' }}>
                                      Cicilan
                                    </Badge>
                                  )}
                                </div>
                                <div className="flex items-center gap-0.5">
                                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-md text-muted-foreground" onClick={() => openEditDialog(sale)}>
                                    <Pencil className="h-3 w-3" />
                                  </Button>
                                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-md text-muted-foreground" onClick={() => setDeleteId(sale.id)}>
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>
                            </motion.div>
                          );
                        })}
                      </AnimatePresence>
                      <div className="px-3 py-2 flex items-center justify-between border-t border-border bg-card">
                        <span className="text-[11px] text-muted-foreground">{filteredSales.length} transaksi</span>
                        <span className="text-xs font-bold tabular-nums" style={{ color: 'var(--secondary)' }}>Total: {formatAmount(total)}</span>
                      </div>
                    </div>

                    {/* Desktop Table */}
                    <div className="hidden sm:block max-h-[500px] overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow style={{ borderBottom: '1px solid var(--border)' }}>
                          <TableHead className="text-[10px] font-medium uppercase tracking-wider w-[80px] sm:w-[110px] py-2 text-muted-foreground">
                            {t('biz.cashDate')}
                          </TableHead>
                          <TableHead className="text-[10px] font-medium uppercase tracking-wider py-2 text-muted-foreground">
                            {t('biz.saleDescription')}
                          </TableHead>
                          <TableHead className="text-[10px] font-medium uppercase tracking-wider hidden sm:table-cell py-2 text-muted-foreground">
                            {t('biz.saleCustomer')}
                          </TableHead>
                          <TableHead className="text-[10px] font-medium uppercase tracking-wider hidden lg:table-cell w-[120px] py-2 text-muted-foreground">
                            Status
                          </TableHead>
                          <TableHead className="text-[10px] font-medium uppercase tracking-wider text-right w-[130px] sm:w-[180px] py-2 text-muted-foreground">
                            {t('biz.saleAmount')}
                          </TableHead>
                          <TableHead className="w-[68px] sm:w-20" />
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <AnimatePresence mode="popLayout">
                          {filteredSales.map((sale, i) => {
                            const pColor = sale.paymentMethod
                              ? paymentIconMap[sale.paymentMethod] || 'var(--primary)'
                              : 'var(--primary)';
                            const isInstallment = (sale.installmentTempo ?? 0) > 0;
                            const hasDP = (sale.downPayment ?? 0) > 0;
                            const hasInvestor = (sale.investorSharePct ?? 0) > 0;
                            const dpPercent = sale.amount > 0 && hasDP
                              ? Math.round((sale.downPayment! / sale.amount) * 100)
                              : 0;
                            return (
                              <motion.tr
                                key={sale.id}
                                custom={i}
                                variants={rowVariants}
                                initial="hidden"
                                animate="visible"
                                exit="exit"
                                layout
                                className="group cursor-default transition-colors duration-150"
                                style={i % 2 === 1 ? { background: 'var(--border)' } : undefined}
                              >
                                <TableCell className="text-[11px] sm:text-xs py-2 font-mono text-muted-foreground">
                                  {new Date(sale.date).toLocaleDateString('id-ID', {
                                    day: 'numeric',
                                    month: 'short',
                                    year: 'numeric',
                                  })}
                                </TableCell>
                                <TableCell className="py-2">
                                  <div className="flex flex-col gap-0.5">
                                    <span className="text-xs font-medium max-w-[200px] truncate text-foreground">
                                      {sale.description}
                                    </span>
                                    {/* Badges row */}
                                    <div className="flex items-center gap-1 flex-wrap">
                                      {sale.category && (
                                        <Badge
                                          variant="outline"
                                          className="text-[9px] font-medium border-0 rounded-full px-1.5 py-0"
                                          style={{
                                            backgroundColor: 'rgba(249, 168, 37, 0.15)',
                                            color: 'var(--warning)',
                                          }}
                                        >
                                          <Layers className="h-2 w-2 mr-0.5" />
                                          {sale.category.name}
                                        </Badge>
                                      )}
                                      {sale.paymentMethod && (
                                        <Badge
                                          variant="outline"
                                          className="text-[9px] font-medium border-0 rounded-full px-1.5 py-0 bg-primary/15 text-primary"
                                        >
                                          {(() => {
                                            const M = PAYMENT_METHODS.find((m) => m.value === sale.paymentMethod);
                                            if (!M) return sale.paymentMethod;
                                            const Icon = M.icon;
                                            return (
                                              <span className="flex items-center gap-0.5">
                                                <Icon className="h-2 w-2" />
                                                {t(M.labelKey)}
                                              </span>
                                            );
                                          })()}
                                        </Badge>
                                      )}
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell className="py-2 hidden sm:table-cell">
                                  <span className="text-xs text-muted-foreground">
                                    {sale.customer?.name || '—'}
                                  </span>
                                </TableCell>
                                {/* Status column */}
                                <TableCell className="py-2 hidden lg:table-cell">
                                  <div className="flex flex-col gap-1">
                                    <div className="flex items-center gap-1 flex-wrap">
                                      {isInstallment && (
                                        <Badge
                                          variant="outline"
                                          className="text-[9px] font-bold border-0 rounded-full px-1.5 py-0"
                                          style={{
                                            backgroundColor: 'rgba(187, 134, 252, 0.15)',
                                            color: 'var(--primary)',
                                          }}
                                        >
                                          <Repeat className="h-2.5 w-2.5 mr-0.5" />
                                          {t('biz.installmentBadge')}
                                        </Badge>
                                      )}
                                      {hasDP && (
                                        <Badge
                                          variant="outline"
                                          className="text-[9px] font-medium border-0 rounded-full px-1.5 py-0"
                                          style={{
                                            backgroundColor: 'rgba(3, 218, 198, 0.15)',
                                            color: 'var(--secondary)',
                                          }}
                                        >
                                          <ArrowDownToLine className="h-2.5 w-2.5 mr-0.5" />
                                          DP {dpPercent}%
                                        </Badge>
                                      )}
                                      {hasInvestor && (
                                        <Badge
                                          variant="outline"
                                          className="text-[9px] font-medium border-0 rounded-full px-1.5 py-0"
                                          style={{
                                            backgroundColor: 'rgba(249, 168, 37, 0.15)',
                                            color: 'var(--warning)',
                                          }}
                                        >
                                          <Users className="h-2.5 w-2.5 mr-0.5" />
                                          {sale.investorSharePct}%
                                        </Badge>
                                      )}
                                    </div>
                                    {/* Installment progress bar */}
                                    {isInstallment && hasDP && (
                                      <div className="w-full max-w-[100px]">
                                        <div className="h-1 rounded-full overflow-hidden bg-border">
                                          <motion.div
                                            className="h-full rounded-full bg-secondary"
                                            initial={{ width: 0 }}
                                            animate={{ width: `${Math.min(dpPercent, 100)}%` }}
                                            transition={{ delay: i * 0.04 + 0.2, duration: 0.6, ease: 'easeOut' as const }}
                                          />
                                        </div>
                                        <span className="text-[9px] mt-0.5 block tabular-nums text-muted-foreground">
                                          DP {formatAmount(sale.downPayment!)}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell className="text-xs text-right font-semibold py-2 tabular-nums" style={{ color: 'var(--secondary)' }}>
                                  {isInstallment ? (
                                    <div className="flex flex-col items-end gap-0">
                                      <span className="font-semibold">+{formatAmount(sale.amount)}</span>
                                      <span className="text-[9px] text-muted-foreground">
                                        DP {formatAmount(sale.downPayment ?? 0)} · Sisa {formatAmount(sale.amount - (sale.realizedAmount ?? sale.downPayment ?? 0))}
                                      </span>
                                      {hasInvestor && sale.downPayment && sale.installmentAmount && (
                                        <span className="text-[8px]" style={{ color: 'var(--warning)' }}>
                                          Inv DP {sale.investorSharePct}%={formatAmount((sale.downPayment * (sale.investorSharePct ?? 0)) / 100)} · Cicilan {sale.investorSharePct}%={formatAmount((sale.installmentAmount * (sale.investorSharePct ?? 0)) / 100)}/tempo
                                        </span>
                                      )}
                                    </div>
                                  ) : (
                                    <span>+{formatAmount(sale.amount)}</span>
                                  )}
                                </TableCell>
                                <TableCell className="py-2 text-right">
                                  <div className="flex items-center justify-end gap-0.5 opacity-80 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-150">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-9 w-9 sm:h-7 sm:w-7 p-0 rounded-md text-muted-foreground"
                                      onClick={() => openEditDialog(sale)}
                                    >
                                      <Pencil className="h-3 w-3" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-9 w-9 sm:h-7 sm:w-7 p-0 rounded-md text-muted-foreground"
                                      onClick={() => setDeleteId(sale.id)}
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </div>
                                </TableCell>
                              </motion.tr>
                            );
                          })}
                        </AnimatePresence>
                      </TableBody>
                    </Table>
                    {/* Table footer */}
                    <div className="px-4 py-2 flex items-center justify-between border-t border-border bg-card">
                      <span className="text-[11px] text-muted-foreground">
                        {filteredSales.length} transaksi
                      </span>
                      <span className="text-xs font-bold tabular-nums" style={{ color: 'var(--secondary)' }}>
                        Total: {formatAmount(total)}
                      </span>
                    </div>
                  </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Add/Edit Dialog */}
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogContent
              className="rounded-xl overflow-hidden max-h-[90vh] flex flex-col bg-card border border-border w-[95vw] sm:max-w-lg"
            >
              {/* Accent line at top */}
              <div className="h-[2px] shrink-0" style={{ background: "linear-gradient(to right, var(--secondary), var(--primary), var(--warning))" }} />
              <DialogHeader className="pt-1 shrink-0">
                <DialogTitle className="text-base font-semibold flex items-center gap-2 text-foreground">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-primary/15">
                    {editingSale ? (
                      <Pencil className="h-3.5 w-3.5" style={{ color: 'var(--primary)' }} />
                    ) : (
                      <Plus className="h-3.5 w-3.5" style={{ color: 'var(--primary)' }} />
                    )}
                  </div>
                  {editingSale ? t('common.edit') : t('biz.addSale')}
                </DialogTitle>
                <DialogDescription className="pl-9 text-muted-foreground">
                  {t('biz.saleDescription')}
                </DialogDescription>
              </DialogHeader>

              <form id="sale-form" onSubmit={handleSave} className="space-y-3 mt-1 overflow-y-auto flex-1 pr-1 scrollbar-thin">
                {/* Product Quick Select */}
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                    {t('biz.selectProduct')}
                  </Label>
                  <Select value={selectedProductId} onValueChange={(v) => handleProductSelect(v)}>
                    <SelectTrigger className="rounded-lg text-sm bg-card border border-border text-foreground">
                      <SelectValue placeholder={t('biz.selectProduct')} />
                    </SelectTrigger>
                    <SelectContent className="rounded-lg bg-card border border-border">
                      {products
                        .filter((p) => p.stock > 0)
                        .map((p) => (
                          <SelectItem key={p.id} value={p.id} className="text-sm rounded-md text-foreground">
                            <div className="flex items-center justify-between w-full gap-4">
                              <span className="truncate">{p.name}</span>
                              <div className="flex items-center gap-2 shrink-0">
                                <span className="text-xs font-medium" style={{ color: 'var(--secondary)' }}>{formatAmount(p.price)}</span>
                                <span className="text-[10px] rounded-full px-1.5 py-0.5" style={{ color: 'var(--muted-foreground)', background: 'var(--border)' }}>
                                  stok {p.stock}
                                </span>
                              </div>
                            </div>
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  {isProductAutoFill && (
                    <p className="text-[10px] flex items-center gap-1" style={{ color: 'var(--secondary)' }}>
                      <BarChart3 className="h-2.5 w-2.5" />
                      Harga & deskripsi terisi otomatis dari produk
                    </p>
                  )}
                </div>

                {/* Category Selection */}
                {categories.length > 0 && (
                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                      {t('biz.cashCategory')}
                    </Label>
                    <Select
                      value={formData.categoryId}
                      onValueChange={(v) => setFormData((prev) => ({ ...prev, categoryId: v }))}
                    >
                      <SelectTrigger className="rounded-lg text-sm bg-card border border-border text-foreground">
                        <SelectValue placeholder={t('biz.cashCategory')} />
                      </SelectTrigger>
                      <SelectContent className="rounded-lg bg-card border border-border">
                        <SelectItem value="" className="text-sm rounded-md text-muted-foreground">
                          Tanpa kategori
                        </SelectItem>
                        {categories.map((c) => (
                          <SelectItem key={c.id} value={c.id} className="text-sm rounded-md text-foreground">
                            <span className="flex items-center gap-2">
                              <Layers className="h-3 w-3" style={{ color: 'var(--warning)' }} />
                              {c.name}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Description */}
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                    {t('biz.saleDescription')} <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    value={formData.description}
                    onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                    placeholder={t('biz.saleDescription')}
                    className="rounded-lg text-sm bg-card border border-border text-foreground"
                  />
                </div>

                {/* Amount with Live Preview */}
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                    {t('biz.saleAmount')} <span className="text-destructive">*</span>
                  </Label>
                  <div className="relative">
                    <Wallet className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      type="number"
                      value={formData.amount}
                      onChange={(e) => setFormData((prev) => ({ ...prev, amount: e.target.value }))}
                      placeholder="0"
                      min="0"
                      className="pl-9 pr-4 rounded-lg text-base font-semibold tabular-nums bg-card border border-border text-foreground"
                    />
                  </div>
                  {formData.amount && parseFloat(formData.amount) > 0 && (
                    <div
                      className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-secondary/5 border border-secondary/15"
                    >
                      <CircleDollarSign className="h-3.5 w-3.5" style={{ color: 'var(--secondary)' }} />
                      <span className="text-xs font-semibold tabular-nums" style={{ color: 'var(--secondary)' }}>
                        {formatAmount(parseFloat(formData.amount))}
                      </span>
                    </div>
                  )}
                </div>

                {/* Installment Toggle */}
                <div
                  className="flex items-center justify-between rounded-lg px-3 py-2.5 bg-card border border-border"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-primary/15">
                      <Repeat className="h-3.5 w-3.5" style={{ color: 'var(--primary)' }} />
                    </div>
                    <div>
                      <span className="text-xs font-medium text-foreground">{t('biz.isInstallment')}</span>
                      <p className="text-[10px] text-muted-foreground">Aktifkan cicilan & investor</p>
                    </div>
                  </div>
                  <Switch
                    checked={formData.isInstallment}
                    onCheckedChange={(checked) =>
                      setFormData((prev) => ({
                        ...prev,
                        isInstallment: checked,
                        downPayment: checked ? prev.downPayment : '',
                        downPaymentPct: checked ? prev.downPaymentPct : '',
                        installmentTempo: checked ? prev.installmentTempo : '',
                        investorSharePct: checked ? prev.investorSharePct : '',
                      }))
                    }
                  />
                </div>

                {/* Installment Section — Collapsible */}
                <AnimatePresence>
                  {formData.isInstallment && (
                    <motion.div
                      variants={installmentSectionVariants}
                      initial="hidden"
                      animate="visible"
                      exit="exit"
                      className="overflow-hidden"
                    >
                      <div className="rounded-lg p-3 space-y-3 bg-primary/5 border border-primary/15">
                        {/* DP Amount & DP Percentage */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <Label className="text-[10px] font-medium uppercase tracking-wider flex items-center gap-1 text-muted-foreground">
                              <ArrowDownToLine className="h-2.5 w-2.5" style={{ color: 'var(--secondary)' }} />
                              {t('biz.downPayment')} (Rp)
                            </Label>
                            <Input
                              type="number"
                              value={formData.downPayment}
                              onChange={(e) => handleDownPaymentChange(e.target.value)}
                              placeholder="0"
                              min="0"
                              className="rounded-lg text-sm tabular-nums bg-card border border-border text-foreground"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-[10px] font-medium uppercase tracking-wider flex items-center gap-1 text-muted-foreground">
                              <Percent className="h-2.5 w-2.5" style={{ color: 'var(--secondary)' }} />
                              DP (%)
                            </Label>
                            <Input
                              type="number"
                              value={formData.downPaymentPct}
                              onChange={(e) => handleDownPaymentPctChange(e.target.value)}
                              placeholder="0"
                              min="0"
                              max="100"
                              step="0.1"
                              className="rounded-lg text-sm tabular-nums bg-card border border-border text-foreground"
                            />
                          </div>
                        </div>

                        {/* Tenor (months) */}
                        <div className="space-y-1">
                          <Label className="text-[10px] font-medium uppercase tracking-wider flex items-center gap-1 text-muted-foreground">
                            <Repeat className="h-2.5 w-2.5" style={{ color: 'var(--primary)' }} />
                            {t('biz.installmentPeriod')}
                          </Label>
                          <Input
                            type="number"
                            value={formData.installmentTempo}
                            onChange={(e) => setFormData((prev) => ({ ...prev, installmentTempo: e.target.value }))}
                            placeholder="0"
                            min="1"
                            className="rounded-lg text-sm tabular-nums w-full sm:w-1/2 bg-card border border-border text-foreground"
                          />
                        </div>

                        {/* Tanggal Jatuh Tempo Cicilan */}
                        <div className="space-y-1">
                          <Label className="text-[10px] font-medium uppercase tracking-wider flex items-center gap-1 text-muted-foreground">
                            <CalendarDays className="h-2.5 w-2.5 text-destructive" />
                            Tanggal Jatuh Tempo
                          </Label>
                          <Input
                            type="date"
                            value={formData.installmentDueDate}
                            onChange={(e) => setFormData((prev) => ({ ...prev, installmentDueDate: e.target.value }))}
                            className="rounded-lg text-sm w-full sm:w-1/2 bg-card border border-border text-foreground"
                          />
                          {formData.installmentDueDate && computedTenor > 0 && (
                            <p className="text-[10px] text-muted-foreground">
                              Cicilan {computedTenor}× mulai{' '}
                              <span className="text-destructive">{new Date(formData.installmentDueDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                            </p>
                          )}
                        </div>

                        {/* Investor Share */}
                        <div className="space-y-1">
                          <Label className="text-[10px] font-medium uppercase tracking-wider flex items-center gap-1 text-muted-foreground">
                            <Users className="h-2.5 w-2.5" style={{ color: 'var(--warning)' }} />
                            Bagi Investor (%)
                          </Label>
                          <Input
                            type="number"
                            value={formData.investorSharePct}
                            onChange={(e) => setFormData((prev) => ({ ...prev, investorSharePct: e.target.value }))}
                            placeholder="0"
                            min="0"
                            max="100"
                            step="0.1"
                            className="rounded-lg text-sm tabular-nums w-full sm:w-1/2 bg-card border border-border text-foreground"
                          />
                        </div>

                        {/* Live Preview Box */}
                        {(computedAmount > 0 || computedTenor > 0) && (
                          <div className="rounded-lg p-2.5 space-y-1.5 bg-card border border-border">
                            <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
                              Ringkasan Cicilan
                            </p>
                            <div className="grid grid-cols-2 gap-2">
                              <div className="flex flex-col">
                                <span className="text-[9px] uppercase text-muted-foreground">{t('biz.remainingAfterDP')}</span>
                                <span className="text-xs font-bold tabular-nums" style={{ color: 'var(--secondary)' }}>
                                  {formatAmount(remaining)}
                                </span>
                              </div>
                              <div className="flex flex-col">
                                <span className="text-[9px] uppercase text-muted-foreground">{t('biz.installmentAmount')}</span>
                                <span className="text-xs font-bold tabular-nums" style={{ color: 'var(--primary)' }}>
                                  {computedTenor > 0 ? formatAmount(monthlyInstallment) : '—'}
                                </span>
                              </div>
                            </div>
                            {investorSharePct > 0 && monthlyInstallment > 0 && (
                              <div className="flex flex-col pt-1 border-t border-border">
                                <span className="text-[9px] uppercase text-muted-foreground">Bagi Investor ({investorSharePct}%)</span>
                                <span className="text-xs font-bold tabular-nums" style={{ color: 'var(--warning)' }}>
                                  {formatAmount(investorShareAmount)} / bulan
                                </span>
                              </div>
                            )}
                            {/* Progress bar preview */}
                            {computedAmount > 0 && computedDP > 0 && (
                              <div className="pt-1">
                                <div className="h-1 rounded-full overflow-hidden bg-border">
                                  <motion.div
                                    className="h-full rounded-full bg-secondary"
                                    initial={{ width: 0 }}
                                    animate={{
                                      width: `${Math.min((computedDP / computedAmount) * 100, 100)}%`,
                                    }}
                                    transition={{ duration: 0.4, ease: 'easeOut' as const }}
                                  />
                                </div>
                                <p className="text-[9px] mt-0.5 tabular-nums text-muted-foreground">
                                  DP {((computedDP / computedAmount) * 100).toFixed(1)}% dari total
                                </p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Customer */}
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                    {t('biz.saleCustomer')}
                  </Label>
                  <Select
                    value={formData.customerId}
                    onValueChange={(v) => setFormData((prev) => ({ ...prev, customerId: v }))}
                  >
                    <SelectTrigger className="rounded-lg text-sm bg-card border border-border text-foreground">
                      <SelectValue placeholder={t('biz.saleCustomer')} />
                    </SelectTrigger>
                    <SelectContent className="rounded-lg bg-card border border-border">
                      {customers.map((c) => (
                        <SelectItem key={c.id} value={c.id} className="text-sm rounded-md text-foreground">
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Date & Payment Method */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                      {t('biz.saleDate')}
                    </Label>
                    <Input
                      type="date"
                      value={formData.date}
                      onChange={(e) => setFormData((prev) => ({ ...prev, date: e.target.value }))}
                      className="rounded-lg text-sm bg-card border border-border text-foreground"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                      {t('biz.salePaymentMethod')}
                    </Label>
                    <Select
                      value={formData.paymentMethod}
                      onValueChange={(v) => setFormData((prev) => ({ ...prev, paymentMethod: v }))}
                    >
                      <SelectTrigger className="rounded-lg text-sm bg-card border border-border text-foreground">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-lg bg-card border border-border">
                        {PAYMENT_METHODS.map((m) => {
                          const Icon = m.icon;
                          return (
                            <SelectItem key={m.value} value={m.value} className="text-sm rounded-md text-foreground">
                              <span className="flex items-center gap-2">
                                <Icon className="h-3 w-3" style={{ color: m.color }} />
                                {t(m.labelKey)}
                              </span>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Notes */}
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                    {t('biz.customerNotes')}
                  </Label>
                  <Textarea
                    value={formData.notes}
                    onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
                    placeholder={t('biz.customerNotes')}
                    className="min-h-[60px] rounded-lg text-sm resize-none bg-card border border-border text-foreground"
                  />
                </div>
              </form>

              <DialogFooter className="gap-2 pt-2 shrink-0 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                  className="rounded-lg text-sm"
                  style={{ border: '1px solid var(--border)', color: 'var(--muted-foreground)' }}
                >
                  {t('common.cancel')}
                </Button>
                <Button
                  type="submit"
                  form="sale-form"
                  disabled={saving || !formData.description || !formData.amount}
                  className="rounded-lg text-sm disabled:opacity-50 bg-primary text-primary-foreground"
                >
                  {saving && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
                  {t('common.save')}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Delete Confirmation */}
          <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
            <AlertDialogContent
              className="rounded-xl bg-card border border-border"
            >
              <div className="h-[2px] -mt-6 mb-4 -mx-6 mt-[-1.25rem] rounded-t-xl bg-destructive" />
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2 text-foreground">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-destructive/15">
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </div>
                  {t('common.delete')}
                </AlertDialogTitle>
                <AlertDialogDescription className="pl-9 text-muted-foreground">
                  {t('kas.deleteDesc')}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="rounded-lg text-sm border border-border text-muted-foreground">
                  {t('common.cancel')}
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  className="rounded-lg text-sm border-0"
                  style={{ background: 'var(--destructive)', color: 'var(--foreground)' }}
                >
                  {t('common.delete')}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {/* Post-Sale Invoice Prompt */}
          <Dialog open={showInvoicePrompt} onOpenChange={(open) => !open && setShowInvoicePrompt(false)}>
            <DialogContent
              className="rounded-xl w-[95vw] sm:max-w-[380px] bg-card border border-border"
            >
              <div className="h-[2px] -mt-6 mb-4 -mx-6 mt-[-1.25rem] rounded-t-xl" style={{ background: 'linear-gradient(to right, var(--secondary), var(--primary))' }} />
              <DialogHeader className="text-center">
                <div className="flex flex-col items-center gap-3 pt-1">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-secondary/15 border border-border">
                    <CheckCircle className="h-6 w-6" style={{ color: 'var(--secondary)' }} />
                  </div>
                  <div>
                    <DialogTitle className="text-base font-bold flex items-center justify-center gap-2 text-foreground">
                      <Receipt className="h-4 w-4" style={{ color: 'var(--primary)' }} />
                      Kirim Invoice?
                    </DialogTitle>
                    <DialogDescription className="mt-1.5 text-xs text-muted-foreground">
                      Penjualan berhasil disimpan. Kirim invoice ke pelanggan?
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>
              <DialogFooter className="flex flex-col gap-2 mt-1">
                <Button
                  onClick={() => {
                    setShowInvoicePrompt(false);
                    toast.info('Silakan buat invoice dari halaman Invoice');
                  }}
                  className="w-full rounded-lg text-sm font-semibold bg-primary text-primary-foreground"
                >
                  <Receipt className="h-3.5 w-3.5 mr-2" />
                  Buat Invoice
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => setShowInvoicePrompt(false)}
                  className="w-full rounded-lg text-sm"
                  style={{ border: '1px solid var(--border)', color: 'var(--muted-foreground)' }}
                >
                  Nanti Saja
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      )}
    </div>
  );
}
