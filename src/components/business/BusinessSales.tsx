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
}

const PAYMENT_METHODS = [
  { value: 'cash', labelKey: 'biz.paymentCash', icon: Banknote, color: '#03DAC6' },
  { value: 'transfer', labelKey: 'biz.paymentTransfer', icon: CreditCard, color: '#BB86FC' },
  { value: 'qris', labelKey: 'biz.paymentQRIS', icon: QrCode, color: '#FFD700' },
];

const paymentIconMap: Record<string, string> = {
  cash: '#03DAC6',
  transfer: '#BB86FC',
  qris: '#FFD700',
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
      // ease out cubic
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

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16, scale: 0.97 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: 'spring' as const, stiffness: 300, damping: 24 },
  },
};

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
    marginTop: 20,
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
  });
  const [saving, setSaving] = useState(false);

  const [deleteId, setDeleteId] = useState<string | null>(null);

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
        <p className="text-white/50 text-center">{t('biz.registerFirst')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Tab Toggle with slide indicator */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative flex gap-1 bg-white/[0.04] rounded-xl p-1 w-fit border border-white/[0.06]"
      >
        <motion.div
          className="absolute top-1 bottom-1 rounded-lg bg-gradient-to-r from-[#BB86FC]/25 to-[#BB86FC]/10 border border-[#BB86FC]/30"
          animate={{
            x: activeTab === 'sales' ? 4 : 0,
            width: 'calc(50% - 6px)',
            left: activeTab === 'sales' ? '4px' : 'calc(50% + 2px)',
          }}
          transition={{ type: 'spring' as const, stiffness: 300, damping: 30 }}
        />
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setActiveTab('sales')}
          className={`relative z-10 rounded-lg px-5 transition-colors duration-200 ${
            activeTab === 'sales'
              ? 'text-[#BB86FC] font-semibold'
              : 'text-white/40 hover:text-white/70'
          }`}
        >
          <ShoppingBag className="h-4 w-4 mr-1.5" />
          {t('biz.penjualan')}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setActiveTab('products')}
          className={`relative z-10 rounded-lg px-5 transition-colors duration-200 ${
            activeTab === 'products'
              ? 'text-[#BB86FC] font-semibold'
              : 'text-white/40 hover:text-white/70'
          }`}
        >
          <TrendingUp className="h-4 w-4 mr-1.5" />
          {t('biz.products')}
        </Button>
      </motion.div>

      {/* Products Tab */}
      {activeTab === 'products' ? (
        <motion.div
          key="products"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
        >
          <ProductList />
        </motion.div>
      ) : (
        <motion.div key="sales" variants={containerVariants} initial="hidden" animate="visible">
          {/* Summary Cards — Glassmorphism */}
          <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            {/* Total Penjualan */}
            <Card className="relative rounded-2xl overflow-hidden group backdrop-blur-xl bg-white/[0.03] border border-white/[0.08] shadow-xl shadow-black/10 hover:shadow-[#03DAC6]/5 hover:border-[#03DAC6]/20 transition-all duration-500">
              {/* Decorative gradient circles */}
              <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full bg-gradient-to-br from-[#03DAC6]/15 to-transparent blur-xl group-hover:scale-125 transition-transform duration-700" />
              <div className="absolute -bottom-6 -left-6 w-20 h-20 rounded-full bg-gradient-to-tr from-[#03DAC6]/8 to-transparent blur-lg" />
              <CardContent className="p-5 relative">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#03DAC6]/20 to-[#03DAC6]/5 flex items-center justify-center border border-[#03DAC6]/20">
                    <CircleDollarSign className="h-5 w-5 text-[#03DAC6]" />
                  </div>
                  <span className="text-white/50 text-xs font-medium uppercase tracking-wider">
                    {t('biz.totalPenjualan')}
                  </span>
                </div>
                <p className="text-2xl font-bold text-white tabular-nums">
                  {formatAmount(animatedTotal)}
                </p>
                <p className="text-xs text-white/30 mt-1">
                  {filteredSales.length} {t('biz.penjualan').toLowerCase()}
                </p>
              </CardContent>
            </Card>

            {/* Transaksi Hari Ini */}
            <Card className="relative rounded-2xl overflow-hidden group backdrop-blur-xl bg-white/[0.03] border border-white/[0.08] shadow-xl shadow-black/10 hover:shadow-[#BB86FC]/5 hover:border-[#BB86FC]/20 transition-all duration-500">
              <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full bg-gradient-to-br from-[#BB86FC]/15 to-transparent blur-xl group-hover:scale-125 transition-transform duration-700" />
              <div className="absolute -bottom-6 -left-6 w-20 h-20 rounded-full bg-gradient-to-tr from-[#BB86FC]/8 to-transparent blur-lg" />
              <CardContent className="p-5 relative">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#BB86FC]/20 to-[#BB86FC]/5 flex items-center justify-center border border-[#BB86FC]/20">
                    <Receipt className="h-5 w-5 text-[#BB86FC]" />
                  </div>
                  <span className="text-white/50 text-xs font-medium uppercase tracking-wider">
                    {t('biz.cashDate')}
                  </span>
                </div>
                <p className="text-2xl font-bold text-white tabular-nums">
                  {formatAmount(animatedToday)}
                </p>
                <p className="text-xs text-white/30 mt-1">
                  {todaySales.length} transaksi
                </p>
              </CardContent>
            </Card>

            {/* Rata-rata per Transaksi */}
            <Card className="relative rounded-2xl overflow-hidden group backdrop-blur-xl bg-white/[0.03] border border-white/[0.08] shadow-xl shadow-black/10 hover:shadow-[#FFD700]/5 hover:border-[#FFD700]/20 transition-all duration-500">
              <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full bg-gradient-to-br from-[#FFD700]/15 to-transparent blur-xl group-hover:scale-125 transition-transform duration-700" />
              <div className="absolute -bottom-6 -left-6 w-20 h-20 rounded-full bg-gradient-to-tr from-[#FFD700]/8 to-transparent blur-lg" />
              <CardContent className="p-5 relative">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#FFD700]/20 to-[#FFD700]/5 flex items-center justify-center border border-[#FFD700]/20">
                    <Calculator className="h-5 w-5 text-[#FFD700]" />
                  </div>
                  <span className="text-white/50 text-xs font-medium uppercase tracking-wider">
                    Rata-rata
                  </span>
                </div>
                <p className="text-2xl font-bold text-white tabular-nums">
                  {formatAmount(animatedAvg)}
                </p>
                <p className="text-xs text-white/30 mt-1">
                  per transaksi
                </p>
              </CardContent>
            </Card>
          </motion.div>

          {/* Header with Search & Filters */}
          <motion.div variants={itemVariants} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <ShoppingBag className="h-5 w-5 text-[#03DAC6]" />
                {t('biz.penjualan')}
              </h2>
            </div>
            <Button
              onClick={openCreateDialog}
              size="sm"
              className="bg-gradient-to-r from-[#BB86FC] to-[#9B6FDB] text-black hover:from-[#9B6FDB] hover:to-[#7B5FBB] rounded-xl shadow-lg shadow-[#BB86FC]/20 transition-all duration-200 hover:shadow-[#BB86FC]/30"
            >
              <Plus className="h-4 w-4 mr-1" />
              {t('biz.addSale')}
            </Button>
          </motion.div>

          {/* Search + Filter Row */}
          <motion.div variants={itemVariants} className="flex flex-col sm:flex-row gap-3 mb-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t('common.search') + '...'}
                className="bg-white/[0.05] border-white/[0.08] text-white placeholder:text-white/25 pl-10 rounded-xl focus:border-[#03DAC6]/40 focus:ring-1 focus:ring-[#03DAC6]/20 transition-all duration-200"
              />
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => setPaymentFilter('all')}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 border ${
                  paymentFilter === 'all'
                    ? 'bg-white/10 border-white/20 text-white'
                    : 'border-transparent text-white/40 hover:text-white/70 hover:bg-white/[0.04]'
                }`}
              >
                Semua
              </button>
              {PAYMENT_METHODS.map((m) => {
                const Icon = m.icon;
                return (
                  <button
                    key={m.value}
                    onClick={() => setPaymentFilter(m.value)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 border ${
                      paymentFilter === m.value
                        ? 'border-white/20 text-white'
                        : 'border-transparent text-white/40 hover:text-white/70 hover:bg-white/[0.04]'
                    }`}
                    style={
                      paymentFilter === m.value
                        ? { backgroundColor: `${m.color}15`, borderColor: `${m.color}30`, color: m.color }
                        : {}
                    }
                  >
                    <Icon className="h-3 w-3" />
                    {t(m.labelKey)}
                  </button>
                );
              })}
            </div>
          </motion.div>

          {/* Table */}
          <motion.div variants={itemVariants}>
            <Card className="relative rounded-2xl overflow-hidden backdrop-blur-xl bg-white/[0.02] border border-white/[0.08] shadow-xl shadow-black/20">
              {/* Decorative gradient circle */}
              <div className="absolute -top-20 -right-20 w-60 h-60 rounded-full bg-gradient-to-br from-[#03DAC6]/5 via-[#BB86FC]/3 to-transparent blur-3xl pointer-events-none" />
              <CardContent className="p-0 relative">
                {loading ? (
                  <div className="space-y-3 p-6">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Skeleton key={i} className="h-14 rounded-xl bg-white/[0.06]" />
                    ))}
                  </div>
                ) : filteredSales.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 px-6">
                    <motion.div
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ type: 'spring' as const, stiffness: 200, damping: 20 }}
                      className="relative mb-6"
                    >
                      {/* Decorative circles */}
                      <div className="absolute -inset-4 rounded-full bg-gradient-to-br from-[#03DAC6]/5 to-[#BB86FC]/5 animate-pulse" />
                      <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-white/[0.06] to-white/[0.02] border border-white/[0.08] flex items-center justify-center">
                        <PackageOpen className="h-9 w-9 text-white/20" />
                      </div>
                    </motion.div>
                    <motion.p
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.15 }}
                      className="text-white/40 text-sm font-medium"
                    >
                      {search || paymentFilter !== 'all'
                        ? 'Tidak ada penjualan yang cocok'
                        : t('biz.noBizData')}
                    </motion.p>
                    <motion.p
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.25 }}
                      className="text-white/20 text-xs mt-1.5"
                    >
                      {search || paymentFilter !== 'all'
                        ? 'Coba ubah filter pencarian Anda'
                        : 'Mulai catat penjualan pertama Anda'}
                    </motion.p>
                    {!search && paymentFilter === 'all' && (
                      <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.35 }}
                      >
                        <Button
                          onClick={openCreateDialog}
                          size="sm"
                          className="mt-5 bg-gradient-to-r from-[#BB86FC] to-[#9B6FDB] text-black hover:from-[#9B6FDB] hover:to-[#7B5FBB] rounded-xl shadow-lg shadow-[#BB86FC]/20"
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          {t('biz.addSale')}
                        </Button>
                      </motion.div>
                    )}
                  </div>
                ) : (
                  <div className="max-h-[500px] overflow-y-auto">
                    <div className="scrollbar-thin">
                      <Table>
                        <TableHeader>
                          <TableRow className="border-white/[0.06] hover:bg-transparent">
                            <TableHead className="text-white/40 text-xs font-medium uppercase tracking-wider w-[110px]">
                              {t('biz.cashDate')}
                            </TableHead>
                            <TableHead className="text-white/40 text-xs font-medium uppercase tracking-wider">
                              {t('biz.saleDescription')}
                            </TableHead>
                            <TableHead className="text-white/40 text-xs font-medium uppercase tracking-wider hidden sm:table-cell">
                              {t('biz.saleCustomer')}
                            </TableHead>
                            <TableHead className="text-white/40 text-xs font-medium uppercase tracking-wider hidden lg:table-cell w-[120px]">
                              Status
                            </TableHead>
                            <TableHead className="text-white/40 text-xs font-medium uppercase tracking-wider text-right w-[140px]">
                              {t('biz.saleAmount')}
                            </TableHead>
                            <TableHead className="w-24" />
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          <AnimatePresence mode="popLayout">
                            {filteredSales.map((sale, i) => {
                              const pColor = sale.paymentMethod
                                ? paymentIconMap[sale.paymentMethod] || '#BB86FC'
                                : '#BB86FC';
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
                                  className={`border-white/[0.04] transition-colors duration-150 group cursor-default ${
                                    i % 2 === 0 ? 'bg-transparent' : 'bg-white/[0.015]'
                                  } hover:bg-white/[0.04]`}
                                >
                                  <TableCell className="text-white/50 text-xs py-3.5 font-mono">
                                    {new Date(sale.date).toLocaleDateString('id-ID', {
                                      day: 'numeric',
                                      month: 'short',
                                      year: 'numeric',
                                    })}
                                  </TableCell>
                                  <TableCell className="py-3.5">
                                    <div className="flex flex-col gap-1">
                                      <span className="text-white/90 text-xs font-medium max-w-[200px] truncate group-hover:text-white transition-colors">
                                        {sale.description}
                                      </span>
                                      {/* Badges row */}
                                      <div className="flex items-center gap-1.5 flex-wrap">
                                        {sale.category && (
                                          <Badge
                                            variant="outline"
                                            className="text-[9px] font-medium border-0 rounded-full px-2 py-0"
                                            style={{
                                              backgroundColor: '#FFD70012',
                                              color: '#FFD700',
                                            }}
                                          >
                                            <Layers className="h-2 w-2 mr-0.5" />
                                            {sale.category.name}
                                          </Badge>
                                        )}
                                        {sale.paymentMethod && (
                                          <Badge
                                            variant="outline"
                                            className="text-[9px] font-medium border-0 rounded-full px-2 py-0"
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
                                  <TableCell className="py-3.5 hidden sm:table-cell">
                                    <span className="text-white/50 text-xs">
                                      {sale.customer?.name || '—'}
                                    </span>
                                  </TableCell>
                                  {/* Status column */}
                                  <TableCell className="py-3.5 hidden lg:table-cell">
                                    <div className="flex flex-col gap-1.5">
                                      <div className="flex items-center gap-1.5 flex-wrap">
                                        {isInstallment && (
                                          <Badge
                                            variant="outline"
                                            className="text-[9px] font-bold border-0 rounded-full px-2 py-0"
                                            style={{
                                              backgroundColor: '#BB86FC18',
                                              color: '#BB86FC',
                                            }}
                                          >
                                            <Repeat className="h-2.5 w-2.5 mr-0.5" />
                                            {t('biz.installmentBadge')}
                                          </Badge>
                                        )}
                                        {hasDP && (
                                          <Badge
                                            variant="outline"
                                            className="text-[9px] font-medium border-0 rounded-full px-2 py-0"
                                            style={{
                                              backgroundColor: '#03DAC612',
                                              color: '#03DAC6',
                                            }}
                                          >
                                            <ArrowDownToLine className="h-2.5 w-2.5 mr-0.5" />
                                            DP {dpPercent}%
                                          </Badge>
                                        )}
                                        {hasInvestor && (
                                          <Badge
                                            variant="outline"
                                            className="text-[9px] font-medium border-0 rounded-full px-2 py-0"
                                            style={{
                                              backgroundColor: '#FFD70012',
                                              color: '#FFD700',
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
                                          <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                                            <motion.div
                                              className="h-full rounded-full bg-gradient-to-r from-[#03DAC6] to-[#03DAC6]/70"
                                              initial={{ width: 0 }}
                                              animate={{ width: `${Math.min(dpPercent, 100)}%` }}
                                              transition={{ delay: i * 0.04 + 0.2, duration: 0.6, ease: 'easeOut' as const }}
                                            />
                                          </div>
                                          <span className="text-[9px] text-white/25 mt-0.5 block tabular-nums">
                                            DP {formatAmount(sale.downPayment!)}
                                          </span>
                                        </div>
                                      )}
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-xs text-right font-semibold py-3.5 text-[#03DAC6] tabular-nums">
                                    +{formatAmount(sale.amount)}
                                  </TableCell>
                                  <TableCell className="py-3.5 text-right">
                                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-8 w-8 p-0 text-white/30 hover:text-[#BB86FC] hover:bg-[#BB86FC]/10 rounded-lg transition-colors duration-150"
                                        onClick={() => openEditDialog(sale)}
                                      >
                                        <Pencil className="h-3.5 w-3.5" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-8 w-8 p-0 text-white/30 hover:text-[#CF6679] hover:bg-[#CF6679]/10 rounded-lg transition-colors duration-150"
                                        onClick={() => setDeleteId(sale.id)}
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </Button>
                                    </div>
                                  </TableCell>
                                </motion.tr>
                              );
                            })}
                          </AnimatePresence>
                        </TableBody>
                      </Table>
                    </div>
                    {/* Table footer */}
                    <div className="px-6 py-3 border-t border-white/[0.06] flex items-center justify-between bg-white/[0.01]">
                      <span className="text-xs text-white/30">
                        {filteredSales.length} transaksi
                      </span>
                      <span className="text-sm font-bold text-[#03DAC6] tabular-nums">
                        Total: {formatAmount(total)}
                      </span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Add/Edit Dialog */}
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogContent className="bg-gradient-to-b from-[#1A1A2E] to-[#1A1A2E]/95 border border-white/[0.08] text-white sm:max-w-[560px] rounded-2xl shadow-2xl shadow-black/40 overflow-hidden max-h-[90vh] flex flex-col">
              {/* Gradient accent line at top */}
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[#03DAC6] via-[#BB86FC] to-[#FFD700]" />
              <DialogHeader className="pt-2 shrink-0">
                <DialogTitle className="text-white text-lg font-semibold flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-[#BB86FC]/10 flex items-center justify-center">
                    {editingSale ? (
                      <Pencil className="h-4 w-4 text-[#BB86FC]" />
                    ) : (
                      <Plus className="h-4 w-4 text-[#BB86FC]" />
                    )}
                  </div>
                  {editingSale ? t('common.edit') : t('biz.addSale')}
                </DialogTitle>
                <DialogDescription className="text-white/50 pl-10">
                  {t('biz.saleDescription')}
                </DialogDescription>
              </DialogHeader>

              <form id="sale-form" onSubmit={handleSave} className="space-y-5 mt-2 overflow-y-auto flex-1 pr-1 scrollbar-thin">
                {/* Product Quick Select */}
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 }}
                  className="space-y-2"
                >
                  <Label className="text-white/70 text-xs font-medium uppercase tracking-wider">
                    {t('biz.selectProduct')}
                  </Label>
                  <Select value={selectedProductId} onValueChange={(v) => handleProductSelect(v)}>
                    <SelectTrigger className="bg-white/[0.04] border-white/[0.08] text-white rounded-xl focus:border-[#03DAC6]/40 focus:ring-1 focus:ring-[#03DAC6]/20 transition-all">
                      <SelectValue placeholder={t('biz.selectProduct')} />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1A1A2E] border-white/[0.08] rounded-xl">
                      {products
                        .filter((p) => p.stock > 0)
                        .map((p) => (
                          <SelectItem key={p.id} value={p.id} className="text-white rounded-lg focus:bg-white/[0.06]">
                            <div className="flex items-center justify-between w-full gap-4">
                              <span className="truncate">{p.name}</span>
                              <div className="flex items-center gap-2 shrink-0">
                                <span className="text-xs text-[#03DAC6] font-medium">{formatAmount(p.price)}</span>
                                <span className="text-[10px] text-white/30 bg-white/[0.06] rounded-full px-2 py-0.5">
                                  stok {p.stock}
                                </span>
                              </div>
                            </div>
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  {isProductAutoFill && (
                    <motion.p
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="text-[10px] text-[#03DAC6]/70 flex items-center gap-1"
                    >
                      <BarChart3 className="h-3 w-3" />
                      Harga & deskripsi terisi otomatis dari produk
                    </motion.p>
                  )}
                </motion.div>

                {/* Category Selection */}
                {categories.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.08 }}
                    className="space-y-2"
                  >
                    <Label className="text-white/70 text-xs font-medium uppercase tracking-wider">
                      {t('biz.cashCategory')}
                    </Label>
                    <Select
                      value={formData.categoryId}
                      onValueChange={(v) => setFormData((prev) => ({ ...prev, categoryId: v }))}
                    >
                      <SelectTrigger className="bg-white/[0.04] border-white/[0.08] text-white rounded-xl focus:border-[#03DAC6]/40 focus:ring-1 focus:ring-[#03DAC6]/20 transition-all">
                        <SelectValue placeholder={t('biz.cashCategory')} />
                      </SelectTrigger>
                      <SelectContent className="bg-[#1A1A2E] border-white/[0.08] rounded-xl">
                        <SelectItem value="" className="text-white/40 rounded-lg focus:bg-white/[0.06]">
                          Tanpa kategori
                        </SelectItem>
                        {categories.map((c) => (
                          <SelectItem key={c.id} value={c.id} className="text-white rounded-lg focus:bg-white/[0.06]">
                            <span className="flex items-center gap-2">
                              <Layers className="h-3 w-3 text-[#FFD700]/70" />
                              {c.name}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </motion.div>
                )}

                {/* Description */}
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="space-y-2"
                >
                  <Label className="text-white/70 text-xs font-medium uppercase tracking-wider">
                    {t('biz.saleDescription')} <span className="text-[#CF6679]">*</span>
                  </Label>
                  <Input
                    value={formData.description}
                    onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                    placeholder={t('biz.saleDescription')}
                    className="bg-white/[0.04] border-white/[0.08] text-white placeholder:text-white/20 rounded-xl focus:border-[#03DAC6]/40 focus:ring-1 focus:ring-[#03DAC6]/20 transition-all"
                  />
                </motion.div>

                {/* Amount with Live Preview */}
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 }}
                  className="space-y-2"
                >
                  <Label className="text-white/70 text-xs font-medium uppercase tracking-wider">
                    {t('biz.saleAmount')} <span className="text-[#CF6679]">*</span>
                  </Label>
                  <div className="relative">
                    <Wallet className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/20" />
                    <Input
                      type="number"
                      value={formData.amount}
                      onChange={(e) => setFormData((prev) => ({ ...prev, amount: e.target.value }))}
                      placeholder="0"
                      min="0"
                      className="bg-white/[0.04] border-white/[0.08] text-white text-lg font-semibold placeholder:text-white/20 pl-10 pr-4 rounded-xl focus:border-[#03DAC6]/40 focus:ring-1 focus:ring-[#03DAC6]/20 transition-all tabular-nums"
                    />
                  </div>
                  {formData.amount && parseFloat(formData.amount) > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#03DAC6]/5 border border-[#03DAC6]/10"
                    >
                      <CircleDollarSign className="h-4 w-4 text-[#03DAC6]" />
                      <span className="text-sm text-[#03DAC6] font-semibold tabular-nums">
                        {formatAmount(parseFloat(formData.amount))}
                      </span>
                    </motion.div>
                  )}
                </motion.div>

                {/* Installment Toggle */}
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.18 }}
                  className="flex items-center justify-between rounded-xl bg-white/[0.03] border border-white/[0.06] px-4 py-3"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-[#BB86FC]/10 flex items-center justify-center">
                      <Repeat className="h-4 w-4 text-[#BB86FC]" />
                    </div>
                    <div>
                      <span className="text-sm text-white/80 font-medium">{t('biz.isInstallment')}</span>
                      <p className="text-[10px] text-white/30">Aktifkan cicilan & investor</p>
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
                    className="data-[state=checked]:bg-[#BB86FC]"
                  />
                </motion.div>

                {/* Installment Section — Collapsible/Animated */}
                <AnimatePresence>
                  {formData.isInstallment && (
                    <motion.div
                      variants={installmentSectionVariants}
                      initial="hidden"
                      animate="visible"
                      exit="exit"
                      className="overflow-hidden"
                    >
                      <div className="rounded-xl bg-gradient-to-br from-[#BB86FC]/[0.04] to-[#03DAC6]/[0.02] border border-[#BB86FC]/15 p-4 space-y-4 relative overflow-hidden">
                        {/* Decorative glow */}
                        <div className="absolute -top-8 -right-8 w-24 h-24 rounded-full bg-[#BB86FC]/5 blur-2xl pointer-events-none" />

                        {/* DP Amount & DP Percentage */}
                        <div className="grid grid-cols-2 gap-3 relative">
                          <div className="space-y-1.5">
                            <Label className="text-white/60 text-[10px] font-medium uppercase tracking-wider flex items-center gap-1">
                              <ArrowDownToLine className="h-3 w-3 text-[#03DAC6]" />
                              {t('biz.downPayment')} (Rp)
                            </Label>
                            <Input
                              type="number"
                              value={formData.downPayment}
                              onChange={(e) => handleDownPaymentChange(e.target.value)}
                              placeholder="0"
                              min="0"
                              className="bg-white/[0.04] border-white/[0.08] text-white text-sm placeholder:text-white/15 rounded-lg focus:border-[#03DAC6]/40 focus:ring-1 focus:ring-[#03DAC6]/20 transition-all tabular-nums"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-white/60 text-[10px] font-medium uppercase tracking-wider flex items-center gap-1">
                              <Percent className="h-3 w-3 text-[#03DAC6]" />
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
                              className="bg-white/[0.04] border-white/[0.08] text-white text-sm placeholder:text-white/15 rounded-lg focus:border-[#03DAC6]/40 focus:ring-1 focus:ring-[#03DAC6]/20 transition-all tabular-nums"
                            />
                          </div>
                        </div>

                        {/* Tenor (months) */}
                        <div className="space-y-1.5">
                          <Label className="text-white/60 text-[10px] font-medium uppercase tracking-wider flex items-center gap-1">
                            <Repeat className="h-3 w-3 text-[#BB86FC]" />
                            {t('biz.installmentPeriod')}
                          </Label>
                          <Input
                            type="number"
                            value={formData.installmentTempo}
                            onChange={(e) => setFormData((prev) => ({ ...prev, installmentTempo: e.target.value }))}
                            placeholder="0"
                            min="1"
                            className="bg-white/[0.04] border-white/[0.08] text-white text-sm placeholder:text-white/15 rounded-lg focus:border-[#03DAC6]/40 focus:ring-1 focus:ring-[#03DAC6]/20 transition-all tabular-nums w-full sm:w-1/2"
                          />
                        </div>

                        {/* Investor Share */}
                        <div className="space-y-1.5">
                          <Label className="text-white/60 text-[10px] font-medium uppercase tracking-wider flex items-center gap-1">
                            <Users className="h-3 w-3 text-[#FFD700]" />
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
                            className="bg-white/[0.04] border-white/[0.08] text-white text-sm placeholder:text-white/15 rounded-lg focus:border-[#FFD700]/40 focus:ring-1 focus:ring-[#FFD700]/20 transition-all tabular-nums w-full sm:w-1/2"
                          />
                        </div>

                        {/* Live Preview Box */}
                        {(computedAmount > 0 || computedTenor > 0) && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.97 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="rounded-lg overflow-hidden relative"
                          >
                            {/* Gradient border effect */}
                            <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-[#03DAC6]/30 via-[#BB86FC]/30 to-[#FFD700]/30 p-[1px]">
                              <div className="w-full h-full rounded-lg bg-[#1A1A2E]" />
                            </div>
                            <div className="relative p-3 space-y-2">
                              <p className="text-[10px] text-white/40 uppercase tracking-wider font-semibold mb-2">
                                Ringkasan Cicilan
                              </p>
                              <div className="grid grid-cols-2 gap-2">
                                <div className="flex flex-col">
                                  <span className="text-[9px] text-white/30 uppercase">{t('biz.remainingAfterDP')}</span>
                                  <span className="text-xs font-bold text-[#03DAC6] tabular-nums">
                                    {formatAmount(remaining)}
                                  </span>
                                </div>
                                <div className="flex flex-col">
                                  <span className="text-[9px] text-white/30 uppercase">{t('biz.installmentAmount')}</span>
                                  <span className="text-xs font-bold text-[#BB86FC] tabular-nums">
                                    {computedTenor > 0 ? formatAmount(monthlyInstallment) : '—'}
                                  </span>
                                </div>
                              </div>
                              {investorSharePct > 0 && monthlyInstallment > 0 && (
                                <div className="flex flex-col pt-1 border-t border-white/[0.06]">
                                  <span className="text-[9px] text-white/30 uppercase">Bagi Investor ({investorSharePct}%)</span>
                                  <span className="text-xs font-bold text-[#FFD700] tabular-nums">
                                    {formatAmount(investorShareAmount)} / bulan
                                  </span>
                                </div>
                              )}
                              {/* Progress bar preview */}
                              {computedAmount > 0 && computedDP > 0 && (
                                <div className="pt-1">
                                  <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                                    <motion.div
                                      className="h-full rounded-full bg-gradient-to-r from-[#03DAC6] to-[#BB86FC]"
                                      initial={{ width: 0 }}
                                      animate={{
                                        width: `${Math.min((computedDP / computedAmount) * 100, 100)}%`,
                                      }}
                                      transition={{ duration: 0.4, ease: 'easeOut' as const }}
                                    />
                                  </div>
                                  <p className="text-[9px] text-white/25 mt-1 tabular-nums">
                                    DP {((computedDP / computedAmount) * 100).toFixed(1)}% dari total
                                  </p>
                                </div>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Customer */}
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="space-y-2"
                >
                  <Label className="text-white/70 text-xs font-medium uppercase tracking-wider">
                    {t('biz.saleCustomer')}
                  </Label>
                  <Select
                    value={formData.customerId}
                    onValueChange={(v) => setFormData((prev) => ({ ...prev, customerId: v }))}
                  >
                    <SelectTrigger className="bg-white/[0.04] border-white/[0.08] text-white rounded-xl focus:border-[#03DAC6]/40 focus:ring-1 focus:ring-[#03DAC6]/20 transition-all">
                      <SelectValue placeholder={t('biz.saleCustomer')} />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1A1A2E] border-white/[0.08] rounded-xl">
                      {customers.map((c) => (
                        <SelectItem key={c.id} value={c.id} className="text-white rounded-lg focus:bg-white/[0.06]">
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </motion.div>

                {/* Date & Payment Method */}
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25 }}
                  className="grid grid-cols-2 gap-4"
                >
                  <div className="space-y-2">
                    <Label className="text-white/70 text-xs font-medium uppercase tracking-wider">
                      {t('biz.saleDate')}
                    </Label>
                    <Input
                      type="date"
                      value={formData.date}
                      onChange={(e) => setFormData((prev) => ({ ...prev, date: e.target.value }))}
                      className="bg-white/[0.04] border-white/[0.08] text-white rounded-xl focus:border-[#03DAC6]/40 focus:ring-1 focus:ring-[#03DAC6]/20 transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-white/70 text-xs font-medium uppercase tracking-wider">
                      {t('biz.salePaymentMethod')}
                    </Label>
                    <Select
                      value={formData.paymentMethod}
                      onValueChange={(v) => setFormData((prev) => ({ ...prev, paymentMethod: v }))}
                    >
                      <SelectTrigger className="bg-white/[0.04] border-white/[0.08] text-white rounded-xl focus:border-[#03DAC6]/40 focus:ring-1 focus:ring-[#03DAC6]/20 transition-all">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#1A1A2E] border-white/[0.08] rounded-xl">
                        {PAYMENT_METHODS.map((m) => {
                          const Icon = m.icon;
                          return (
                            <SelectItem key={m.value} value={m.value} className="text-white rounded-lg focus:bg-white/[0.06]">
                              <span className="flex items-center gap-2">
                                <Icon className="h-3.5 w-3.5" style={{ color: m.color }} />
                                {t(m.labelKey)}
                              </span>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                </motion.div>

                {/* Notes */}
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="space-y-2"
                >
                  <Label className="text-white/70 text-xs font-medium uppercase tracking-wider">
                    {t('biz.customerNotes')}
                  </Label>
                  <Textarea
                    value={formData.notes}
                    onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
                    placeholder={t('biz.customerNotes')}
                    className="bg-white/[0.04] border-white/[0.08] text-white placeholder:text-white/20 min-h-[72px] rounded-xl focus:border-[#03DAC6]/40 focus:ring-1 focus:ring-[#03DAC6]/20 transition-all resize-none"
                  />
                </motion.div>
              </form>

              <DialogFooter className="gap-2 pt-3 shrink-0 border-t border-white/[0.06] mt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                  className="border-white/[0.1] text-white/70 hover:bg-white/[0.06] hover:text-white rounded-xl transition-all"
                >
                  {t('common.cancel')}
                </Button>
                <Button
                  type="submit"
                  form="sale-form"
                  disabled={saving || !formData.description || !formData.amount}
                  className="bg-gradient-to-r from-[#BB86FC] to-[#9B6FDB] text-black hover:from-[#9B6FDB] hover:to-[#7B5FBB] rounded-xl shadow-lg shadow-[#BB86FC]/20 disabled:opacity-50 transition-all"
                >
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {t('common.save')}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Delete Confirmation */}
          <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
            <AlertDialogContent className="bg-gradient-to-b from-[#1A1A2E] to-[#1A1A2E]/95 border border-white/[0.08] text-white rounded-2xl shadow-2xl shadow-black/40">
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[#CF6679] to-[#CF6679]/50" />
              <AlertDialogHeader>
                <AlertDialogTitle className="text-white flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-[#CF6679]/10 flex items-center justify-center">
                    <Trash2 className="h-4 w-4 text-[#CF6679]" />
                  </div>
                  {t('common.delete')}
                </AlertDialogTitle>
                <AlertDialogDescription className="text-white/50 pl-10">
                  {t('kas.deleteDesc')}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="border-white/[0.1] text-white/70 hover:bg-white/[0.06] hover:text-white rounded-xl transition-all">
                  {t('common.cancel')}
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  className="bg-[#CF6679] hover:bg-[#CF6679]/80 text-white border-0 rounded-xl transition-all"
                >
                  {t('common.delete')}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </motion.div>
      )}
    </div>
  );
}
