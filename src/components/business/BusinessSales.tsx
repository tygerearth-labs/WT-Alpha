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
} from 'lucide-react';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ProductList from './ProductList';

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
}

const PAYMENT_METHODS = [
  { value: 'cash', labelKey: 'biz.paymentCash', icon: Banknote, color: THEME.secondary },
  { value: 'transfer', labelKey: 'biz.paymentTransfer', icon: CreditCard, color: THEME.primary },
  { value: 'qris', labelKey: 'biz.paymentQRIS', icon: QrCode, color: THEME.warning },
];

const paymentIconMap: Record<string, string> = {
  cash: THEME.secondary,
  transfer: THEME.primary,
  qris: THEME.warning,
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

  const todayStr = new Date().toISOString().split('T')[0];
  const todaySales = sales.filter((s) => s.date.startsWith(todayStr));
  const todayTotal = todaySales.reduce((sum, s) => sum + s.amount, 0);
  const avgPerTransaction = filteredSales.length > 0 ? total / filteredSales.length : 0;

  const animatedTotal = useAnimatedCounter(total);
  const animatedToday = useAnimatedCounter(todayTotal);
  const animatedAvg = useAnimatedCounter(avgPerTransaction);

  // Selected product info for dialog
  const selectedProduct = products.find((p) => p.id === selectedProductId);
  const isProductAutoFill = selectedProductId && selectedProduct;

  if (!businessId) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p style={{ color: THEME.muted }} className="text-center">{t('biz.registerFirst')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Tab Toggle — simple design */}
      <div
        className="relative flex gap-1 rounded-lg p-0.5 w-fit"
        style={{ background: THEME.surface, border: `1px solid ${THEME.border}` }}
      >
        <div
          className="absolute top-0.5 bottom-0.5 rounded-md"
          style={{
            background: THEME.primary,
            opacity: 0.15,
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
          style={{
            color: activeTab === 'sales' ? THEME.primary : THEME.muted,
            fontWeight: activeTab === 'sales' ? 600 : 400,
          }}
        >
          <ShoppingBag className="h-3.5 w-3.5 mr-1.5" />
          {t('biz.penjualan')}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setActiveTab('products')}
          className="relative z-10 rounded-md px-4 transition-colors duration-200"
          style={{
            color: activeTab === 'products' ? THEME.primary : THEME.muted,
            fontWeight: activeTab === 'products' ? 600 : 400,
          }}
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
          <div className="grid grid-cols-3 gap-3 mb-4">
            {/* Total Penjualan */}
            <Card
              className="rounded-xl overflow-hidden"
              style={{ background: THEME.surface, border: `1px solid ${THEME.border}` }}
            >
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center gap-2 mb-1.5">
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center"
                    style={{ background: `${THEME.secondary}15` }}
                  >
                    <CircleDollarSign className="h-3.5 w-3.5" style={{ color: THEME.secondary }} />
                  </div>
                  <span className="text-[10px] sm:text-[11px] font-medium uppercase tracking-wider" style={{ color: THEME.textSecondary }}>
                    {t('biz.totalPenjualan')}
                  </span>
                </div>
                <p className="text-sm sm:text-base font-bold tabular-nums" style={{ color: THEME.text }}>
                  {formatAmount(animatedTotal)}
                </p>
                <p className="text-[10px] mt-0.5" style={{ color: THEME.muted }}>
                  {filteredSales.length} {t('biz.penjualan').toLowerCase()}
                </p>
              </CardContent>
            </Card>

            {/* Transaksi Hari Ini */}
            <Card
              className="rounded-xl overflow-hidden"
              style={{ background: THEME.surface, border: `1px solid ${THEME.border}` }}
            >
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center gap-2 mb-1.5">
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center"
                    style={{ background: `${THEME.primary}15` }}
                  >
                    <Receipt className="h-3.5 w-3.5" style={{ color: THEME.primary }} />
                  </div>
                  <span className="text-[10px] sm:text-[11px] font-medium uppercase tracking-wider" style={{ color: THEME.textSecondary }}>
                    {t('biz.cashDate')}
                  </span>
                </div>
                <p className="text-sm sm:text-base font-bold tabular-nums" style={{ color: THEME.text }}>
                  {formatAmount(animatedToday)}
                </p>
                <p className="text-[10px] mt-0.5" style={{ color: THEME.muted }}>
                  {todaySales.length} transaksi
                </p>
              </CardContent>
            </Card>

            {/* Rata-rata per Transaksi */}
            <Card
              className="rounded-xl overflow-hidden"
              style={{ background: THEME.surface, border: `1px solid ${THEME.border}` }}
            >
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center gap-2 mb-1.5">
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center"
                    style={{ background: `${THEME.warning}15` }}
                  >
                    <Calculator className="h-3.5 w-3.5" style={{ color: THEME.warning }} />
                  </div>
                  <span className="text-[10px] sm:text-[11px] font-medium uppercase tracking-wider" style={{ color: THEME.textSecondary }}>
                    Rata-rata
                  </span>
                </div>
                <p className="text-sm sm:text-base font-bold tabular-nums" style={{ color: THEME.text }}>
                  {formatAmount(animatedAvg)}
                </p>
                <p className="text-[10px] mt-0.5" style={{ color: THEME.muted }}>
                  per transaksi
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Header with Search & Filters */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <div>
              <h2 className="text-sm font-bold flex items-center gap-2" style={{ color: THEME.text }}>
                <ShoppingBag className="h-4 w-4" style={{ color: THEME.secondary }} />
                {t('biz.penjualan')}
              </h2>
            </div>
            <Button
              onClick={openCreateDialog}
              size="sm"
              className="rounded-lg"
              style={{ background: THEME.primary, color: '#000' }}
            >
              <Plus className="h-3.5 w-3.5 mr-1" />
              {t('biz.addSale')}
            </Button>
          </div>

          {/* Search + Filter Row */}
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5" style={{ color: THEME.muted }} />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t('common.search') + '...'}
                className="pl-9 rounded-lg text-sm"
                style={{
                  background: THEME.surface,
                  border: `1px solid ${THEME.border}`,
                  color: THEME.text,
                }}
              />
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                onClick={() => setPaymentFilter('all')}
                className="px-2.5 py-1 rounded-full text-[11px] font-medium transition-all duration-200"
                style={{
                  background: paymentFilter === 'all' ? `${THEME.text}15` : 'transparent',
                  color: paymentFilter === 'all' ? THEME.text : THEME.muted,
                  border: `1px solid ${paymentFilter === 'all' ? THEME.borderHover : 'transparent'}`,
                }}
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
                        ? { backgroundColor: `${m.color}15`, borderColor: `${m.color}30`, color: m.color, border: `1px solid ${m.color}30` }
                        : { color: THEME.muted, border: '1px solid transparent' }
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
              className="rounded-xl overflow-hidden"
              style={{ background: THEME.surface, border: `1px solid ${THEME.border}` }}
            >
              <CardContent className="p-0">
                {loading ? (
                  <div className="space-y-2 p-4">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Skeleton key={i} className="h-10 rounded-lg" style={{ background: THEME.border }} />
                    ))}
                  </div>
                ) : filteredSales.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 sm:py-16 px-6">
                    <div className="w-14 h-14 rounded-xl flex items-center justify-center mb-4" style={{ background: `${THEME.secondary}10`, border: `1px solid ${THEME.border}` }}>
                      <PackageOpen className="h-6 w-6" style={{ color: THEME.muted }} />
                    </div>
                    <p className="text-sm font-medium" style={{ color: THEME.textSecondary }}>
                      {search || paymentFilter !== 'all'
                        ? 'Tidak ada penjualan yang cocok'
                        : t('biz.noBizData')}
                    </p>
                    <p className="text-xs mt-1" style={{ color: THEME.muted }}>
                      {search || paymentFilter !== 'all'
                        ? 'Coba ubah filter pencarian Anda'
                        : 'Mulai catat penjualan pertama Anda'}
                    </p>
                    {!search && paymentFilter === 'all' && (
                      <Button
                        onClick={openCreateDialog}
                        size="sm"
                        className="mt-4 rounded-lg text-sm"
                        style={{ background: THEME.primary, color: '#000' }}
                      >
                        <Plus className="h-3.5 w-3.5 mr-1" />
                        {t('biz.addSale')}
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="max-h-[500px] overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow style={{ borderBottom: `1px solid ${THEME.border}` }}>
                          <TableHead className="text-[10px] font-medium uppercase tracking-wider w-[80px] sm:w-[110px] py-2" style={{ color: THEME.muted }}>
                            {t('biz.cashDate')}
                          </TableHead>
                          <TableHead className="text-[10px] font-medium uppercase tracking-wider py-2" style={{ color: THEME.muted }}>
                            {t('biz.saleDescription')}
                          </TableHead>
                          <TableHead className="text-[10px] font-medium uppercase tracking-wider hidden sm:table-cell py-2" style={{ color: THEME.muted }}>
                            {t('biz.saleCustomer')}
                          </TableHead>
                          <TableHead className="text-[10px] font-medium uppercase tracking-wider hidden lg:table-cell w-[120px] py-2" style={{ color: THEME.muted }}>
                            Status
                          </TableHead>
                          <TableHead className="text-[10px] font-medium uppercase tracking-wider text-right w-[110px] sm:w-[140px] py-2" style={{ color: THEME.muted }}>
                            {t('biz.saleAmount')}
                          </TableHead>
                          <TableHead className="w-20" />
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <AnimatePresence mode="popLayout">
                          {filteredSales.map((sale, i) => {
                            const pColor = sale.paymentMethod
                              ? paymentIconMap[sale.paymentMethod] || THEME.primary
                              : THEME.primary;
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
                                style={{
                                  background: i % 2 === 0 ? 'transparent' : `${THEME.border}`,
                                }}
                              >
                                <TableCell className="text-[11px] sm:text-xs py-2 font-mono" style={{ color: THEME.textSecondary }}>
                                  {new Date(sale.date).toLocaleDateString('id-ID', {
                                    day: 'numeric',
                                    month: 'short',
                                    year: 'numeric',
                                  })}
                                </TableCell>
                                <TableCell className="py-2">
                                  <div className="flex flex-col gap-0.5">
                                    <span className="text-xs font-medium max-w-[200px] truncate" style={{ color: THEME.text }}>
                                      {sale.description}
                                    </span>
                                    {/* Badges row */}
                                    <div className="flex items-center gap-1 flex-wrap">
                                      {sale.category && (
                                        <Badge
                                          variant="outline"
                                          className="text-[9px] font-medium border-0 rounded-full px-1.5 py-0"
                                          style={{
                                            backgroundColor: `${THEME.warning}15`,
                                            color: THEME.warning,
                                          }}
                                        >
                                          <Layers className="h-2 w-2 mr-0.5" />
                                          {sale.category.name}
                                        </Badge>
                                      )}
                                      {sale.paymentMethod && (
                                        <Badge
                                          variant="outline"
                                          className="text-[9px] font-medium border-0 rounded-full px-1.5 py-0"
                                          style={{
                                            backgroundColor: `${pColor}15`,
                                            color: pColor,
                                          }}
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
                                  <span className="text-xs" style={{ color: THEME.textSecondary }}>
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
                                            backgroundColor: `${THEME.primary}15`,
                                            color: THEME.primary,
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
                                            backgroundColor: `${THEME.secondary}15`,
                                            color: THEME.secondary,
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
                                            backgroundColor: `${THEME.warning}15`,
                                            color: THEME.warning,
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
                                        <div className="h-1 rounded-full overflow-hidden" style={{ background: THEME.border }}>
                                          <motion.div
                                            className="h-full rounded-full"
                                            style={{ background: THEME.secondary }}
                                            initial={{ width: 0 }}
                                            animate={{ width: `${Math.min(dpPercent, 100)}%` }}
                                            transition={{ delay: i * 0.04 + 0.2, duration: 0.6, ease: 'easeOut' as const }}
                                          />
                                        </div>
                                        <span className="text-[9px] mt-0.5 block tabular-nums" style={{ color: THEME.muted }}>
                                          DP {formatAmount(sale.downPayment!)}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell className="text-xs text-right font-semibold py-2 tabular-nums" style={{ color: THEME.secondary }}>
                                  +{formatAmount(sale.amount)}
                                </TableCell>
                                <TableCell className="py-2 text-right">
                                  <div className="flex items-center justify-end gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-7 w-7 p-0 rounded-md"
                                      style={{ color: THEME.muted }}
                                      onClick={() => openEditDialog(sale)}
                                    >
                                      <Pencil className="h-3 w-3" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-7 w-7 p-0 rounded-md"
                                      style={{ color: THEME.muted }}
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
                    <div className="px-4 py-2 flex items-center justify-between" style={{ borderTop: `1px solid ${THEME.border}`, background: THEME.surface }}>
                      <span className="text-[11px]" style={{ color: THEME.muted }}>
                        {filteredSales.length} transaksi
                      </span>
                      <span className="text-xs font-bold tabular-nums" style={{ color: THEME.secondary }}>
                        Total: {formatAmount(total)}
                      </span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Add/Edit Dialog */}
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogContent
              className="rounded-xl overflow-hidden max-h-[90vh] flex flex-col"
              style={{
                background: THEME.surface,
                border: `1px solid ${THEME.border}`,
              }}
            >
              {/* Accent line at top */}
              <div className="h-[2px] shrink-0" style={{ background: `linear-gradient(to right, ${THEME.secondary}, ${THEME.primary}, ${THEME.warning})` }} />
              <DialogHeader className="pt-1 shrink-0">
                <DialogTitle className="text-base font-semibold flex items-center gap-2" style={{ color: THEME.text }}>
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${THEME.primary}15` }}>
                    {editingSale ? (
                      <Pencil className="h-3.5 w-3.5" style={{ color: THEME.primary }} />
                    ) : (
                      <Plus className="h-3.5 w-3.5" style={{ color: THEME.primary }} />
                    )}
                  </div>
                  {editingSale ? t('common.edit') : t('biz.addSale')}
                </DialogTitle>
                <DialogDescription className="pl-9" style={{ color: THEME.textSecondary }}>
                  {t('biz.saleDescription')}
                </DialogDescription>
              </DialogHeader>

              <form id="sale-form" onSubmit={handleSave} className="space-y-4 mt-1 overflow-y-auto flex-1 pr-1 scrollbar-thin">
                {/* Product Quick Select */}
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-medium uppercase tracking-wider" style={{ color: THEME.textSecondary }}>
                    {t('biz.selectProduct')}
                  </Label>
                  <Select value={selectedProductId} onValueChange={(v) => handleProductSelect(v)}>
                    <SelectTrigger className="rounded-lg text-sm" style={{ background: THEME.surface, border: `1px solid ${THEME.border}`, color: THEME.text }}>
                      <SelectValue placeholder={t('biz.selectProduct')} />
                    </SelectTrigger>
                    <SelectContent className="rounded-lg" style={{ background: THEME.surface, border: `1px solid ${THEME.border}` }}>
                      {products
                        .filter((p) => p.stock > 0)
                        .map((p) => (
                          <SelectItem key={p.id} value={p.id} className="text-sm rounded-md" style={{ color: THEME.text }}>
                            <div className="flex items-center justify-between w-full gap-4">
                              <span className="truncate">{p.name}</span>
                              <div className="flex items-center gap-2 shrink-0">
                                <span className="text-xs font-medium" style={{ color: THEME.secondary }}>{formatAmount(p.price)}</span>
                                <span className="text-[10px] rounded-full px-1.5 py-0.5" style={{ color: THEME.muted, background: THEME.border }}>
                                  stok {p.stock}
                                </span>
                              </div>
                            </div>
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  {isProductAutoFill && (
                    <p className="text-[10px] flex items-center gap-1" style={{ color: THEME.secondary }}>
                      <BarChart3 className="h-2.5 w-2.5" />
                      Harga & deskripsi terisi otomatis dari produk
                    </p>
                  )}
                </div>

                {/* Category Selection */}
                {categories.length > 0 && (
                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-medium uppercase tracking-wider" style={{ color: THEME.textSecondary }}>
                      {t('biz.cashCategory')}
                    </Label>
                    <Select
                      value={formData.categoryId}
                      onValueChange={(v) => setFormData((prev) => ({ ...prev, categoryId: v }))}
                    >
                      <SelectTrigger className="rounded-lg text-sm" style={{ background: THEME.surface, border: `1px solid ${THEME.border}`, color: THEME.text }}>
                        <SelectValue placeholder={t('biz.cashCategory')} />
                      </SelectTrigger>
                      <SelectContent className="rounded-lg" style={{ background: THEME.surface, border: `1px solid ${THEME.border}` }}>
                        <SelectItem value="" className="text-sm rounded-md" style={{ color: THEME.muted }}>
                          Tanpa kategori
                        </SelectItem>
                        {categories.map((c) => (
                          <SelectItem key={c.id} value={c.id} className="text-sm rounded-md" style={{ color: THEME.text }}>
                            <span className="flex items-center gap-2">
                              <Layers className="h-3 w-3" style={{ color: THEME.warning }} />
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
                  <Label className="text-[11px] font-medium uppercase tracking-wider" style={{ color: THEME.textSecondary }}>
                    {t('biz.saleDescription')} <span style={{ color: THEME.destructive }}>*</span>
                  </Label>
                  <Input
                    value={formData.description}
                    onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                    placeholder={t('biz.saleDescription')}
                    className="rounded-lg text-sm"
                    style={{
                      background: THEME.surface,
                      border: `1px solid ${THEME.border}`,
                      color: THEME.text,
                    }}
                  />
                </div>

                {/* Amount with Live Preview */}
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-medium uppercase tracking-wider" style={{ color: THEME.textSecondary }}>
                    {t('biz.saleAmount')} <span style={{ color: THEME.destructive }}>*</span>
                  </Label>
                  <div className="relative">
                    <Wallet className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5" style={{ color: THEME.muted }} />
                    <Input
                      type="number"
                      value={formData.amount}
                      onChange={(e) => setFormData((prev) => ({ ...prev, amount: e.target.value }))}
                      placeholder="0"
                      min="0"
                      className="pl-9 pr-4 rounded-lg text-base font-semibold tabular-nums"
                      style={{
                        background: THEME.surface,
                        border: `1px solid ${THEME.border}`,
                        color: THEME.text,
                      }}
                    />
                  </div>
                  {formData.amount && parseFloat(formData.amount) > 0 && (
                    <div
                      className="flex items-center gap-2 px-3 py-1.5 rounded-lg"
                      style={{ background: `${THEME.secondary}08`, border: `1px solid ${THEME.secondary}20` }}
                    >
                      <CircleDollarSign className="h-3.5 w-3.5" style={{ color: THEME.secondary }} />
                      <span className="text-xs font-semibold tabular-nums" style={{ color: THEME.secondary }}>
                        {formatAmount(parseFloat(formData.amount))}
                      </span>
                    </div>
                  )}
                </div>

                {/* Installment Toggle */}
                <div
                  className="flex items-center justify-between rounded-lg px-3 py-2.5"
                  style={{ background: THEME.surface, border: `1px solid ${THEME.border}` }}
                >
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${THEME.primary}15` }}>
                      <Repeat className="h-3.5 w-3.5" style={{ color: THEME.primary }} />
                    </div>
                    <div>
                      <span className="text-xs font-medium" style={{ color: THEME.text }}>{t('biz.isInstallment')}</span>
                      <p className="text-[10px]" style={{ color: THEME.muted }}>Aktifkan cicilan & investor</p>
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
                      <div className="rounded-lg p-3 space-y-3" style={{ background: `${THEME.primary}06`, border: `1px solid ${THEME.primary}20` }}>
                        {/* DP Amount & DP Percentage */}
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <Label className="text-[10px] font-medium uppercase tracking-wider flex items-center gap-1" style={{ color: THEME.textSecondary }}>
                              <ArrowDownToLine className="h-2.5 w-2.5" style={{ color: THEME.secondary }} />
                              {t('biz.downPayment')} (Rp)
                            </Label>
                            <Input
                              type="number"
                              value={formData.downPayment}
                              onChange={(e) => handleDownPaymentChange(e.target.value)}
                              placeholder="0"
                              min="0"
                              className="rounded-lg text-sm tabular-nums"
                              style={{ background: THEME.surface, border: `1px solid ${THEME.border}`, color: THEME.text }}
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-[10px] font-medium uppercase tracking-wider flex items-center gap-1" style={{ color: THEME.textSecondary }}>
                              <Percent className="h-2.5 w-2.5" style={{ color: THEME.secondary }} />
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
                              className="rounded-lg text-sm tabular-nums"
                              style={{ background: THEME.surface, border: `1px solid ${THEME.border}`, color: THEME.text }}
                            />
                          </div>
                        </div>

                        {/* Tenor (months) */}
                        <div className="space-y-1">
                          <Label className="text-[10px] font-medium uppercase tracking-wider flex items-center gap-1" style={{ color: THEME.textSecondary }}>
                            <Repeat className="h-2.5 w-2.5" style={{ color: THEME.primary }} />
                            {t('biz.installmentPeriod')}
                          </Label>
                          <Input
                            type="number"
                            value={formData.installmentTempo}
                            onChange={(e) => setFormData((prev) => ({ ...prev, installmentTempo: e.target.value }))}
                            placeholder="0"
                            min="1"
                            className="rounded-lg text-sm tabular-nums w-full sm:w-1/2"
                            style={{ background: THEME.surface, border: `1px solid ${THEME.border}`, color: THEME.text }}
                          />
                        </div>

                        {/* Tanggal Jatuh Tempo Cicilan */}
                        <div className="space-y-1">
                          <Label className="text-[10px] font-medium uppercase tracking-wider flex items-center gap-1" style={{ color: THEME.textSecondary }}>
                            <CalendarDays className="h-2.5 w-2.5" style={{ color: THEME.destructive }} />
                            Tanggal Jatuh Tempo
                          </Label>
                          <Input
                            type="date"
                            value={formData.installmentDueDate}
                            onChange={(e) => setFormData((prev) => ({ ...prev, installmentDueDate: e.target.value }))}
                            className="rounded-lg text-sm w-full sm:w-1/2"
                            style={{ background: THEME.surface, border: `1px solid ${THEME.border}`, color: THEME.text }}
                          />
                          {formData.installmentDueDate && computedTenor > 0 && (
                            <p className="text-[10px]" style={{ color: THEME.muted }}>
                              Cicilan {computedTenor}× mulai{' '}
                              <span style={{ color: THEME.destructive }}>{new Date(formData.installmentDueDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                            </p>
                          )}
                        </div>

                        {/* Investor Share */}
                        <div className="space-y-1">
                          <Label className="text-[10px] font-medium uppercase tracking-wider flex items-center gap-1" style={{ color: THEME.textSecondary }}>
                            <Users className="h-2.5 w-2.5" style={{ color: THEME.warning }} />
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
                            className="rounded-lg text-sm tabular-nums w-full sm:w-1/2"
                            style={{ background: THEME.surface, border: `1px solid ${THEME.border}`, color: THEME.text }}
                          />
                        </div>

                        {/* Live Preview Box */}
                        {(computedAmount > 0 || computedTenor > 0) && (
                          <div className="rounded-lg p-2.5 space-y-1.5" style={{ background: THEME.surface, border: `1px solid ${THEME.border}` }}>
                            <p className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: THEME.textSecondary }}>
                              Ringkasan Cicilan
                            </p>
                            <div className="grid grid-cols-2 gap-2">
                              <div className="flex flex-col">
                                <span className="text-[9px] uppercase" style={{ color: THEME.muted }}>{t('biz.remainingAfterDP')}</span>
                                <span className="text-xs font-bold tabular-nums" style={{ color: THEME.secondary }}>
                                  {formatAmount(remaining)}
                                </span>
                              </div>
                              <div className="flex flex-col">
                                <span className="text-[9px] uppercase" style={{ color: THEME.muted }}>{t('biz.installmentAmount')}</span>
                                <span className="text-xs font-bold tabular-nums" style={{ color: THEME.primary }}>
                                  {computedTenor > 0 ? formatAmount(monthlyInstallment) : '—'}
                                </span>
                              </div>
                            </div>
                            {investorSharePct > 0 && monthlyInstallment > 0 && (
                              <div className="flex flex-col pt-1" style={{ borderTop: `1px solid ${THEME.border}` }}>
                                <span className="text-[9px] uppercase" style={{ color: THEME.muted }}>Bagi Investor ({investorSharePct}%)</span>
                                <span className="text-xs font-bold tabular-nums" style={{ color: THEME.warning }}>
                                  {formatAmount(investorShareAmount)} / bulan
                                </span>
                              </div>
                            )}
                            {/* Progress bar preview */}
                            {computedAmount > 0 && computedDP > 0 && (
                              <div className="pt-1">
                                <div className="h-1 rounded-full overflow-hidden" style={{ background: THEME.border }}>
                                  <motion.div
                                    className="h-full rounded-full"
                                    style={{ background: THEME.secondary }}
                                    initial={{ width: 0 }}
                                    animate={{
                                      width: `${Math.min((computedDP / computedAmount) * 100, 100)}%`,
                                    }}
                                    transition={{ duration: 0.4, ease: 'easeOut' as const }}
                                  />
                                </div>
                                <p className="text-[9px] mt-0.5 tabular-nums" style={{ color: THEME.muted }}>
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
                  <Label className="text-[11px] font-medium uppercase tracking-wider" style={{ color: THEME.textSecondary }}>
                    {t('biz.saleCustomer')}
                  </Label>
                  <Select
                    value={formData.customerId}
                    onValueChange={(v) => setFormData((prev) => ({ ...prev, customerId: v }))}
                  >
                    <SelectTrigger className="rounded-lg text-sm" style={{ background: THEME.surface, border: `1px solid ${THEME.border}`, color: THEME.text }}>
                      <SelectValue placeholder={t('biz.saleCustomer')} />
                    </SelectTrigger>
                    <SelectContent className="rounded-lg" style={{ background: THEME.surface, border: `1px solid ${THEME.border}` }}>
                      {customers.map((c) => (
                        <SelectItem key={c.id} value={c.id} className="text-sm rounded-md" style={{ color: THEME.text }}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Date & Payment Method */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-medium uppercase tracking-wider" style={{ color: THEME.textSecondary }}>
                      {t('biz.saleDate')}
                    </Label>
                    <Input
                      type="date"
                      value={formData.date}
                      onChange={(e) => setFormData((prev) => ({ ...prev, date: e.target.value }))}
                      className="rounded-lg text-sm"
                      style={{ background: THEME.surface, border: `1px solid ${THEME.border}`, color: THEME.text }}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-medium uppercase tracking-wider" style={{ color: THEME.textSecondary }}>
                      {t('biz.salePaymentMethod')}
                    </Label>
                    <Select
                      value={formData.paymentMethod}
                      onValueChange={(v) => setFormData((prev) => ({ ...prev, paymentMethod: v }))}
                    >
                      <SelectTrigger className="rounded-lg text-sm" style={{ background: THEME.surface, border: `1px solid ${THEME.border}`, color: THEME.text }}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-lg" style={{ background: THEME.surface, border: `1px solid ${THEME.border}` }}>
                        {PAYMENT_METHODS.map((m) => {
                          const Icon = m.icon;
                          return (
                            <SelectItem key={m.value} value={m.value} className="text-sm rounded-md" style={{ color: THEME.text }}>
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
                  <Label className="text-[11px] font-medium uppercase tracking-wider" style={{ color: THEME.textSecondary }}>
                    {t('biz.customerNotes')}
                  </Label>
                  <Textarea
                    value={formData.notes}
                    onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
                    placeholder={t('biz.customerNotes')}
                    className="min-h-[60px] rounded-lg text-sm resize-none"
                    style={{
                      background: THEME.surface,
                      border: `1px solid ${THEME.border}`,
                      color: THEME.text,
                    }}
                  />
                </div>
              </form>

              <DialogFooter className="gap-2 pt-2 shrink-0" style={{ borderTop: `1px solid ${THEME.border}` }}>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                  className="rounded-lg text-sm"
                  style={{ border: `1px solid ${THEME.borderHover}`, color: THEME.textSecondary }}
                >
                  {t('common.cancel')}
                </Button>
                <Button
                  type="submit"
                  form="sale-form"
                  disabled={saving || !formData.description || !formData.amount}
                  className="rounded-lg text-sm disabled:opacity-50"
                  style={{ background: THEME.primary, color: '#000' }}
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
              className="rounded-xl"
              style={{
                background: THEME.surface,
                border: `1px solid ${THEME.border}`,
              }}
            >
              <div className="h-[2px] -mt-6 mb-4 -mx-6 mt-[-1.25rem] rounded-t-xl" style={{ background: THEME.destructive }} />
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2" style={{ color: THEME.text }}>
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${THEME.destructive}15` }}>
                    <Trash2 className="h-3.5 w-3.5" style={{ color: THEME.destructive }} />
                  </div>
                  {t('common.delete')}
                </AlertDialogTitle>
                <AlertDialogDescription className="pl-9" style={{ color: THEME.textSecondary }}>
                  {t('kas.deleteDesc')}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="rounded-lg text-sm" style={{ border: `1px solid ${THEME.borderHover}`, color: THEME.textSecondary }}>
                  {t('common.cancel')}
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  className="rounded-lg text-sm border-0"
                  style={{ background: THEME.destructive, color: THEME.text }}
                >
                  {t('common.delete')}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {/* Post-Sale Invoice Prompt */}
          <Dialog open={showInvoicePrompt} onOpenChange={(open) => !open && setShowInvoicePrompt(false)}>
            <DialogContent
              className="rounded-xl sm:max-w-[380px]"
              style={{
                background: THEME.surface,
                border: `1px solid ${THEME.border}`,
              }}
            >
              <div className="h-[2px] -mt-6 mb-4 -mx-6 mt-[-1.25rem] rounded-t-xl" style={{ background: `linear-gradient(to right, ${THEME.secondary}, ${THEME.primary})` }} />
              <DialogHeader className="text-center">
                <div className="flex flex-col items-center gap-3 pt-1">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: `${THEME.secondary}15`, border: `1px solid ${THEME.secondary}20` }}>
                    <CheckCircle className="h-6 w-6" style={{ color: THEME.secondary }} />
                  </div>
                  <div>
                    <DialogTitle className="text-base font-bold flex items-center justify-center gap-2" style={{ color: THEME.text }}>
                      <Receipt className="h-4 w-4" style={{ color: THEME.primary }} />
                      Kirim Invoice?
                    </DialogTitle>
                    <DialogDescription className="mt-1.5 text-xs" style={{ color: THEME.textSecondary }}>
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
                  className="w-full rounded-lg text-sm font-semibold"
                  style={{ background: THEME.primary, color: '#000' }}
                >
                  <Receipt className="h-3.5 w-3.5 mr-2" />
                  Buat Invoice
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => setShowInvoicePrompt(false)}
                  className="w-full rounded-lg text-sm"
                  style={{ border: `1px solid ${THEME.borderHover}`, color: THEME.textSecondary }}
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
