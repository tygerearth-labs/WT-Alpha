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

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
} from '@/components/ui/command';
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from '@/components/ui/popover';
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
  ChevronRight,
  ArrowUpDown,
  UserPlus,
  X,
  Check,
} from 'lucide-react';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ProductList from './ProductList';

// ─── Color helpers using CSS variables ───────────────────────────
const c = {
  primary: 'var(--primary)',
  secondary: 'var(--secondary)',
  destructive: 'var(--destructive)',
  warning: 'var(--warning)',
  muted: 'var(--muted-foreground)',
  border: 'var(--border)',
  foreground: 'var(--foreground)',
  card: 'var(--card)',
};

/** Create a color with alpha using color-mix (for use in inline styles) */
const alpha = (color: string, pct: number) => `color-mix(in srgb, ${color} ${pct}%, transparent)`;

// ─── Types ──────────────────────────────────────────────────────
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

// ─── Constants ──────────────────────────────────────────────────
const PAYMENT_METHODS = [
  { value: 'cash', labelKey: 'biz.paymentCash', icon: Banknote, color: c.secondary },
  { value: 'transfer', labelKey: 'biz.paymentTransfer', icon: CreditCard, color: c.primary },
  { value: 'qris', labelKey: 'biz.paymentQRIS', icon: QrCode, color: c.warning },
];


const STATUS_FILTERS = [
  { value: 'all', label: 'Semua' },
  { value: 'lunas', label: 'Lunas' },
  { value: 'cicilan', label: 'Cicilan' },
  { value: 'pending', label: 'Pending' },
] as const;

type StatusFilter = (typeof STATUS_FILTERS)[number]['value'];

const PERIOD_OPTIONS = [
  { value: 'day' as const, label: 'Hari' },
  { value: 'week' as const, label: 'Minggu' },
  { value: 'month' as const, label: 'Bulan' },
  { value: 'year' as const, label: 'Tahun' },
];

const STATUS_CONFIG: Record<string, { label: string; color: string; gradient: string }> = {
  all: { label: 'Semua', color: c.foreground, gradient: `linear-gradient(135deg, ${alpha(c.foreground, 12)}, ${alpha(c.foreground, 4)})` },
  lunas: { label: 'Lunas', color: c.secondary, gradient: `linear-gradient(135deg, ${alpha(c.secondary, 12)}, ${alpha(c.secondary, 3)})` },
  cicilan: { label: 'Cicilan', color: c.warning, gradient: `linear-gradient(135deg, ${alpha(c.warning, 12)}, ${alpha(c.warning, 3)})` },
  pending: { label: 'Pending', color: c.destructive, gradient: `linear-gradient(135deg, ${alpha(c.destructive, 12)}, ${alpha(c.destructive, 3)})` },
};

/** Accent border color per status for left-side stripe */
const statusAccentBorder: Record<string, string> = {
  lunas: c.secondary,
  cicilan: c.warning,
  pending: c.destructive,
};

// ─── Animated Counter Hook ──────────────────────────────────────
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

// ─── Animation Variants ─────────────────────────────────────────
const rowVariants = {
  hidden: { opacity: 0, x: -12 },
  visible: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: { delay: i * 0.04, type: 'spring' as const, stiffness: 260, damping: 20 },
  }),
  exit: { opacity: 0, x: 12, transition: { duration: 0.2 } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.03, type: 'spring' as const, stiffness: 300, damping: 24 },
  }),
  exit: { opacity: 0, y: 8, transition: { duration: 0.15 } },
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

// ─── Helpers ────────────────────────────────────────────────────
function getSaleStatus(sale: Sale): 'lunas' | 'cicilan' | 'pending' {
  if (!sale.installmentTempo || sale.installmentTempo <= 0) return 'lunas';
  const realized = sale.realizedAmount ?? 0;
  if (realized >= sale.amount) return 'lunas';
  if (realized > 0) return 'cicilan';
  return 'pending';
}

function getPeriodDateRange(period: 'day' | 'week' | 'month' | 'year'): { from: string; to: string } {
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  switch (period) {
    case 'day': return { from: todayStr, to: todayStr };
    case 'week': {
      const from = new Date(now);
      from.setDate(from.getDate() - 6);
      return { from: from.toISOString().split('T')[0], to: todayStr };
    }
    case 'month': {
      const from = new Date(now.getFullYear(), now.getMonth(), 1);
      return { from: from.toISOString().split('T')[0], to: todayStr };
    }
    case 'year': {
      const from = new Date(now.getFullYear(), 0, 1);
      return { from: from.toISOString().split('T')[0], to: todayStr };
    }
  }
}

// ─── Main Component ─────────────────────────────────────────────
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
  const [customerSearchOpen, setCustomerSearchOpen] = useState(false);
  const [customerSearchTerm, setCustomerSearchTerm] = useState('');
  const [productSearchOpen, setProductSearchOpen] = useState(false);
  const [productSearchTerm, setProductSearchTerm] = useState('');
  const [showNewCustomerForm, setShowNewCustomerForm] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ name: '', phone: '', email: '' });
  const [savingNewCustomer, setSavingNewCustomer] = useState(false);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [salesPeriod, setSalesPeriod] = useState<'day' | 'week' | 'month' | 'year'>('month');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [pageSize, setPageSize] = useState(10);
  const [sortField, setSortField] = useState<'date' | 'amount' | 'description'>('date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

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

  // ── Period filter effect ──
  useEffect(() => {
    const range = getPeriodDateRange(salesPeriod);
    setDateFrom(range.from);
    setDateTo(range.to);
    setPageSize(10);
  }, [salesPeriod]);

  // ── Reset page size on filter/search change ──
  useEffect(() => {
    setPageSize(10);
  }, [statusFilter, search]);

  // ── Computed installment values ──
  const computedDP = formData.isInstallment ? parseFloat(formData.downPayment) || 0 : 0;
  const computedAmount = parseFloat(formData.amount) || 0;
  const computedTenor = formData.isInstallment ? parseInt(formData.installmentTempo) || 0 : 0;
  const remaining = Math.max(0, computedAmount - computedDP);
  const monthlyInstallment = computedTenor > 0 ? remaining / computedTenor : 0;
  const investorSharePct = formData.isInstallment ? parseFloat(formData.investorSharePct) || 0 : 0;
  const investorShareAmount = monthlyInstallment > 0 ? (monthlyInstallment * investorSharePct) / 100 : 0;

  // ── Nominal Preview ──
  const formattedDPNominal = useMemo(() => {
    const num = parseFloat(formData.downPayment);
    if (isNaN(num) || num <= 0) return '';
    return formatAmount(num);
  }, [formData.downPayment, formatAmount]);

  // ── Auto-calculate DP percentage when DP amount changes ──
  const handleDownPaymentChange = (value: string) => {
    const dp = parseFloat(value) || 0;
    const amt = parseFloat(formData.amount) || 0;
    const pct = amt > 0 ? ((dp / amt) * 100).toFixed(1) : '';
    setFormData((prev) => ({ ...prev, downPayment: value, downPaymentPct: pct }));
  };

  // ── Auto-calculate DP amount when DP percentage changes ──
  const handleDownPaymentPctChange = (value: string) => {
    const pct = parseFloat(value) || 0;
    const amt = parseFloat(formData.amount) || 0;
    const dp = (amt * pct) / 100;
    setFormData((prev) => ({ ...prev, downPaymentPct: value, downPayment: dp > 0 ? dp.toString() : '' }));
  };

  // ── Data Fetching ──
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
    setProductSearchOpen(false);
    setProductSearchTerm('');
  };

  // ── Inline new customer creation ──
  const handleCreateNewCustomer = async () => {
    if (!businessId || !newCustomer.name.trim()) return;
    setSavingNewCustomer(true);
    try {
      const res = await fetch(`/api/business/${businessId}/customers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newCustomer.name.trim(),
          phone: newCustomer.phone || undefined,
          email: newCustomer.email || undefined,
        }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      const created = data.customer;
      setCustomers((prev) => [...prev, { id: created.id, name: created.name }]);
      setFormData((prev) => ({ ...prev, customerId: created.id }));
      setShowNewCustomerForm(false);
      setNewCustomer({ name: '', phone: '', email: '' });
      setCustomerSearchOpen(false);
      toast.success(t('biz.customerCreated'));
    } catch {
      toast.error(t('common.error'));
    } finally {
      setSavingNewCustomer(false);
    }
  };

  // ── Get selected customer name for display ──
  const selectedCustomerName = formData.customerId
    ? customers.find((c) => c.id === formData.customerId)?.name || ''
    : '';

  // ── CRUD Operations ──
  const openCreateDialog = () => {
    setEditingSale(null);
    setSelectedProductId('');
    setCustomerSearchOpen(false);
    setCustomerSearchTerm('');
    setProductSearchOpen(false);
    setProductSearchTerm('');
    setShowNewCustomerForm(false);
    setNewCustomer({ name: '', phone: '', email: '' });
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

  // ── Sort handler ──
  const toggleSort = (field: 'date' | 'amount' | 'description') => {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  // ══════════════════════════════════════════════════════════════════
  // ── Derived Data ─────────────────────────────────────────────────
  // ══════════════════════════════════════════════════════════════════

  const filteredSales = useMemo(() => {
    return sales
      .filter((s) => {
        const matchesSearch =
          s.description.toLowerCase().includes(search.toLowerCase()) ||
          s.customer?.name.toLowerCase().includes(search.toLowerCase());
        const matchesStatus = statusFilter === 'all' || getSaleStatus(s) === statusFilter;
        const matchesDate = (!dateFrom || s.date >= dateFrom) && (!dateTo || s.date <= dateTo + 'T23:59:59');
        return matchesSearch && matchesStatus && matchesDate;
      })
      .sort((a, b) => {
        let cmp = 0;
        switch (sortField) {
          case 'date': cmp = a.date.localeCompare(b.date); break;
          case 'amount': cmp = a.amount - b.amount; break;
          case 'description': cmp = a.description.localeCompare(b.description); break;
        }
        return sortDir === 'desc' ? -cmp : cmp;
      });
  }, [sales, search, statusFilter, dateFrom, dateTo, sortField, sortDir]);

  const visibleSales = filteredSales.slice(0, pageSize);
  const hasMore = pageSize < filteredSales.length;

  const total = filteredSales.reduce((sum, s) => sum + s.amount, 0);
  const totalTunai = filteredSales
    .filter((s) => getSaleStatus(s) === 'lunas')
    .reduce((sum, s) => sum + s.amount, 0);
  const totalCicilan = filteredSales
    .filter((s) => getSaleStatus(s) === 'cicilan' || getSaleStatus(s) === 'pending')
    .reduce((sum, s) => sum + (s.realizedAmount ?? s.downPayment ?? 0), 0);
  const tunaiCount = filteredSales.filter((s) => getSaleStatus(s) === 'lunas').length;
  const cicilanCount = filteredSales.filter((s) => getSaleStatus(s) !== 'lunas').length;
  const avgPerTransaction = filteredSales.length > 0 ? total / filteredSales.length : 0;

  const animTotal = useAnimatedCounter(total);
  const animTunai = useAnimatedCounter(totalTunai);
  const animCicilan = useAnimatedCounter(totalCicilan);
  const animAvg = useAnimatedCounter(avgPerTransaction, 600);

  // Selected product info for dialog
  const selectedProduct = products.find((p) => p.id === selectedProductId);
  const isProductAutoFill = selectedProductId && selectedProduct;

  // Filtered products for search
  const filteredProducts = useMemo(() => {
    if (!productSearchTerm) return products.filter((p) => p.stock > 0);
    return products.filter(
      (p) => p.stock > 0 && p.name.toLowerCase().includes(productSearchTerm.toLowerCase())
    );
  }, [products, productSearchTerm]);

  // Filtered customers for search
  const filteredCustomers = useMemo(() => {
    if (!customerSearchTerm) return customers;
    return customers.filter((c) =>
      c.name.toLowerCase().includes(customerSearchTerm.toLowerCase())
    );
  }, [customers, customerSearchTerm]);

  // ── Status counts for filter chips ──
  const statusCounts = useMemo(() => {
    const periodSales = sales.filter((s) => {
      const matchesDate = (!dateFrom || s.date >= dateFrom) && (!dateTo || s.date <= dateTo + 'T23:59:59');
      return matchesDate;
    });
    return {
      all: periodSales.length,
      lunas: periodSales.filter((s) => getSaleStatus(s) === 'lunas').length,
      cicilan: periodSales.filter((s) => getSaleStatus(s) === 'cicilan').length,
      pending: periodSales.filter((s) => getSaleStatus(s) === 'pending').length,
    };
  }, [sales, dateFrom, dateTo]);

  if (!businessId) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground text-center">{t('biz.registerFirst')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Premium gradient keyframes */}
      <style>{`
        @keyframes heroGlow {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 0.6; }
        }
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
      {/* Info Banner */}
      <div className="biz-info-banner flex items-start gap-2 p-2.5 rounded-lg text-[11px] border" style={{ background: alpha(c.primary, 5), borderColor: alpha(c.primary, 15) }}>
        <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" style={{ color: c.primary }} />
        <span style={{ color: c.muted }}>
          Catat semua penjualan Anda. Untuk penjualan cicilan, sistem akan otomatis membuat piutang dan invoice.
        </span>
      </div>

      {/* Tab Toggle */}
      <div className="relative flex gap-1 rounded-lg p-0.5 w-fit border" style={{ background: c.card, borderColor: c.border }}>
        <div
          className="absolute top-0.5 bottom-0.5 rounded-md"
          style={{
            width: 'calc(50% - 3px)',
            left: activeTab === 'sales' ? '2px' : 'calc(50% + 1px)',
            background: alpha(c.primary, 15),
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
        <div key="sales" className="relative">
          {/* Ambient background glows */}
          <div className="biz-ambient-glow biz-ambient-glow-purple pointer-events-none absolute -top-20 -left-20 w-72 h-72" />
          <div className="biz-ambient-glow biz-ambient-glow-teal pointer-events-none absolute top-40 -right-16 w-56 h-56" />
          <div className="biz-ambient-glow biz-ambient-glow-gold pointer-events-none absolute top-96 left-1/3 w-48 h-48" />
          {/* ═══ HERO CARD — Sales Overview ═══ */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
          >
            <div className="relative rounded-2xl overflow-hidden">
              <div className="absolute -inset-3 -z-10 rounded-2xl blur-3xl opacity-[0.05]" style={{ background: c.secondary }} />
              {/* Desktop animated gradient border glow */}
              <div className="absolute -inset-[1.5px] rounded-[18px] hidden lg:block"
                style={{
                  background: 'linear-gradient(135deg, rgba(76,175,80,0.3), rgba(187,134,252,0.2), rgba(76,175,80,0.3))',
                  filter: 'blur(2px)',
                  opacity: 0.4,
                  animation: 'heroGlow 4s ease-in-out infinite',
                }}
              />
              <Card className="biz-hero-card rounded-xl overflow-hidden backdrop-blur-xl relative"
                style={{
                  background: 'linear-gradient(135deg, rgba(76,175,80,0.12) 0%, rgba(76,175,80,0.04) 40%, rgba(187,134,252,0.05) 100%)',
                  border: '1px solid rgba(76,175,80,0.15)',
                }}>
              {/* h-px gradient accent line at top */}
              <div className="absolute top-0 left-4 right-4 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(76,175,80,0.4), rgba(187,134,252,0.3), transparent)' }} />
              <CardContent className="p-4 sm:p-5">
                {/* Header row */}
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: alpha(c.secondary, 15) }}>
                      <ShoppingBag className="h-4.5 w-4.5" style={{ color: c.secondary }} />
                    </div>
                    <div>
                      <h2 className="text-sm font-bold" style={{ background: `linear-gradient(135deg, ${c.secondary}, ${c.primary})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Total Penjualan</h2>
                      <p className="text-[10px] mt-0.5" style={{ color: c.muted }}>
                        {filteredSales.length} transaksi · rata-rata {formatAmount(avgPerTransaction)}
                      </p>
                    </div>
                  </div>
                  {/* Period filter pills */}
                  <div className="flex items-center gap-1 shrink-0">
                    {PERIOD_OPTIONS.map((p) => (
                      <button
                        key={p.value}
                        onClick={() => setSalesPeriod(p.value)}
                        className={`biz-period-pill px-2 py-1 rounded-md text-[10px] font-medium transition-all duration-200${salesPeriod === p.value ? ' biz-period-pill-active' : ''}`}
                        style={{
                          background: salesPeriod === p.value ? alpha(c.primary, 15) : 'transparent',
                          color: salesPeriod === p.value ? c.primary : c.muted,
                          border: salesPeriod === p.value ? `1px solid ${alpha(c.primary, 25)}` : '1px solid transparent',
                        }}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Main total */}
                <p className="text-2xl sm:text-3xl font-bold tabular-nums mb-4" style={{ color: c.foreground, textShadow: `0 0 40px ${alpha(c.secondary, 20)}` }}>
                  {formatAmount(animTotal)}
                </p>

                {/* Metric chips row */}
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Tunai chip */}
                  <motion.div
                    whileHover={{ scale: 1.02, y: -1 }}
                    transition={{ type: 'spring' as const, stiffness: 400, damping: 20 }}
                    className="biz-metric-chip relative flex items-center gap-2 px-3 py-2 rounded-xl border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.04] hover:border-white/[0.1] transition-colors duration-200"
                  >
                    <div className="absolute -inset-1 -z-10 rounded-xl blur-2xl opacity-[0.05]" style={{ background: c.secondary }} />
                    <div className="biz-metric-chip-icon w-6 h-6 rounded-md flex items-center justify-center" style={{ background: alpha(c.secondary, 15) }}>
                      <Banknote className="h-3 w-3" style={{ color: c.secondary }} />
                    </div>
                    <div>
                      <p className="text-[9px] uppercase font-medium" style={{ color: c.muted }}>Tunai</p>
                      <p className="text-xs font-bold tabular-nums" style={{ color: c.secondary }}>
                        {formatAmount(animTunai)}
                      </p>
                    </div>
                    <span className="text-[9px] tabular-nums" style={{ color: c.muted }}>({tunaiCount})</span>
                  </motion.div>

                  {/* Cicilan chip */}
                  <motion.div
                    whileHover={{ scale: 1.02, y: -1 }}
                    transition={{ type: 'spring' as const, stiffness: 400, damping: 20 }}
                    className="biz-metric-chip relative flex items-center gap-2 px-3 py-2 rounded-xl border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.04] hover:border-white/[0.1] transition-colors duration-200"
                  >
                    <div className="absolute -inset-1 -z-10 rounded-xl blur-2xl opacity-[0.05]" style={{ background: c.warning }} />
                    <div className="biz-metric-chip-icon w-6 h-6 rounded-md flex items-center justify-center" style={{ background: alpha(c.warning, 15) }}>
                      <Repeat className="h-3 w-3" style={{ color: c.warning }} />
                    </div>
                    <div>
                      <p className="text-[9px] uppercase font-medium" style={{ color: c.muted }}>Realisasi</p>
                      <p className="text-xs font-bold tabular-nums" style={{ color: c.warning }}>
                        {formatAmount(animCicilan)}
                      </p>
                    </div>
                    <span className="text-[9px] tabular-nums" style={{ color: c.muted }}>({cicilanCount})</span>
                  </motion.div>

                  {/* Average chip */}
                  <motion.div
                    whileHover={{ scale: 1.02, y: -1 }}
                    transition={{ type: 'spring' as const, stiffness: 400, damping: 20 }}
                    className="biz-metric-chip relative flex items-center gap-2 px-3 py-2 rounded-xl border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.04] hover:border-white/[0.1] transition-colors duration-200"
                  >
                    <div className="absolute -inset-1 -z-10 rounded-xl blur-2xl opacity-[0.05]" style={{ background: c.primary }} />
                    <div className="biz-metric-chip-icon w-6 h-6 rounded-md flex items-center justify-center" style={{ background: alpha(c.primary, 15) }}>
                      <Calculator className="h-3 w-3" style={{ color: c.primary }} />
                    </div>
                    <div>
                      <p className="text-[9px] uppercase font-medium" style={{ color: c.muted }}>Rata-rata</p>
                      <p className="text-xs font-bold tabular-nums" style={{ color: c.primary }}>
                        {formatAmount(animAvg)}
                      </p>
                    </div>
                  </motion.div>
                </div>
              </CardContent>
              </Card>
            </div>
          </motion.div>

          {/* ═══ STATUS FILTER CHIPS + SEARCH + ADD ═══ */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 mt-3">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5" style={{ color: c.muted }} />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t('common.search') + '...'}
                className="biz-search-input pl-9 rounded-lg text-sm"
                style={{ background: c.card, borderColor: c.border, color: c.foreground }}
              />
            </div>

            {/* Status filter chips */}
            <div className="biz-scroll-mobile flex items-center gap-1.5 overflow-x-auto flex-nowrap shrink-0">
              {STATUS_FILTERS.map((sf) => {
                const cfg = STATUS_CONFIG[sf.value];
                const isActive = statusFilter === sf.value;
                const count = statusCounts[sf.value as keyof typeof statusCounts] ?? 0;
                return (
                  <button
                    key={sf.value}
                    onClick={() => setStatusFilter(sf.value)}
                    className={`biz-filter-chip flex items-center gap-1 px-2.5 py-1.5 rounded-full text-[11px] font-medium transition-all duration-200 border${isActive ? ' biz-filter-chip-active' : ''}`}
                    style={
                      isActive
                        ? {
                            background: alpha(cfg.color, 12),
                            color: cfg.color,
                            borderColor: alpha(cfg.color, 25),
                          }
                        : {
                            background: 'transparent',
                            color: c.muted,
                            borderColor: 'transparent',
                          }
                    }
                  >
                    {sf.label}
                    <span className="text-[9px] tabular-nums opacity-70">{count}</span>
                  </button>
                );
              })}
            </div>

            {/* Add button */}
            <Button
              onClick={openCreateDialog}
              size="sm"
              className="rounded-lg shrink-0"
              style={{ background: c.primary, color: 'var(--primary-foreground)' }}
            >
              <Plus className="h-3.5 w-3.5 mr-1" />
              <span className="hidden sm:inline">{t('biz.addSale')}</span>
            </Button>
          </div>

          {/* ═══ SALES LIST ═══ */}
          <Card className="biz-content-card rounded-xl overflow-hidden border mt-2" style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.06)' }}>
            <CardContent className="p-0">
              {loading ? (
                <div className="space-y-2 p-4">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-14 rounded-lg" style={{ background: c.border }} />
                  ))}
                </div>
              ) : filteredSales.length === 0 ? (
                <div className="biz-empty-state flex flex-col items-center justify-center py-12 sm:py-16 px-6">
                  <div className="biz-empty-state-icon w-14 h-14 rounded-xl flex items-center justify-center mb-4 border" style={{ background: alpha(c.secondary, 5), borderColor: c.border }}>
                    <PackageOpen className="h-6 w-6" style={{ color: c.muted }} />
                  </div>
                  <p className="text-sm font-medium" style={{ color: c.muted }}>
                    {search || statusFilter !== 'all'
                      ? 'Tidak ada penjualan yang cocok'
                      : t('biz.noBizData')}
                  </p>
                  <p className="text-xs mt-1" style={{ color: c.muted }}>
                    {search || statusFilter !== 'all'
                      ? 'Coba ubah filter pencarian Anda'
                      : 'Mulai catat penjualan pertama Anda'}
                  </p>
                  {!search && statusFilter === 'all' && (
                    <Button
                      onClick={openCreateDialog}
                      size="sm"
                      className="mt-4 rounded-lg text-sm"
                      style={{ background: c.primary, color: 'var(--primary-foreground)' }}
                    >
                      <Plus className="h-3.5 w-3.5 mr-1" />
                      {t('biz.addSale')}
                    </Button>
                  )}
                </div>
              ) : (
                <>
                  {/* ─── Mobile Card List ─── */}
                  <div className="sm:hidden max-h-[600px] overflow-y-auto divide-y" style={{ borderColor: c.border }}>
                    <AnimatePresence mode="popLayout">
                      {visibleSales.map((sale, i) => {
                        const status = getSaleStatus(sale);
                        const statusCfg = STATUS_CONFIG[status];
                        const isInstallment = (sale.installmentTempo ?? 0) > 0;
                        const hasDP = (sale.downPayment ?? 0) > 0;
                        const realized = sale.realizedAmount ?? 0;

                        return (
                          <motion.div
                            key={sale.id}
                            custom={i}
                            variants={cardVariants}
                            initial="hidden"
                            animate="visible"
                            exit="exit"
                            layout
                            onClick={() => openEditDialog(sale)}
                            whileHover={{ x: 2 }}
                            className={`biz-list-item ${status === 'lunas' ? 'biz-list-item-accent-lunas' : status === 'cicilan' ? 'biz-list-item-accent-cicilan' : 'biz-list-item-accent-pending'} p-3.5 cursor-pointer hover:bg-white/[0.03] transition-colors duration-150`}
                          >
                            {/* Row 1: Description + Amount */}
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <div className="min-w-0 flex-1">
                                <p className="text-xs font-semibold truncate" style={{ color: c.foreground }}>
                                  {sale.description}
                                </p>
                                {sale.customer?.name && (
                                  <span className="inline-flex items-center gap-1 mt-0.5 text-[10px] font-medium rounded-full px-2 py-0.5 shrink-0" style={{ background: `linear-gradient(135deg, ${alpha(c.primary, 14)}, ${alpha(c.primary, 6)})`, color: c.primary }}>
                                    <Users className="h-2 w-2" />
                                    {sale.customer.name}
                                  </span>
                                )}
                              </div>
                              <div className="text-right shrink-0">
                                <p className="text-sm font-bold tabular-nums" style={{ color: c.secondary }}>
                                  {formatAmount(sale.amount)}
                                </p>
                                {isInstallment && realized > 0 && realized < sale.amount && (
                                  <p className="text-[9px] tabular-nums" style={{ color: c.warning }}>
                                    tersisa {formatAmount(sale.amount - realized)}
                                  </p>
                                )}
                              </div>
                            </div>

                            {/* Row 2: Date + Badges */}
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <span className="text-[10px] font-mono shrink-0" style={{ color: c.muted }}>
                                  {new Date(sale.date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                                </span>
                                {/* Payment method pill badge */}
                                {sale.paymentMethod && (() => {
                                  const M = PAYMENT_METHODS.find((m) => m.value === sale.paymentMethod);
                                  if (!M) return null;
                                  const Icon = M.icon;
                                  return (
                                    <span className="inline-flex items-center gap-0.5 text-[9px] font-medium rounded-full px-1.5 py-0 shrink-0 border" style={{ background: `linear-gradient(135deg, ${alpha(M.color, 16)}, ${alpha(M.color, 6)})`, color: M.color, borderColor: alpha(M.color, 20) }}>
                                      <Icon className="h-2 w-2" />
                                      {t(M.labelKey)}
                                    </span>
                                  );
                                })()}
                                {/* Category badge */}
                                {sale.category && (
                                  <Badge variant="outline" className="text-[9px] font-medium border-0 rounded-full px-1.5 py-0 shrink-0" style={{ background: alpha(c.warning, 12), color: c.warning }}>
                                    {sale.category.name}
                                  </Badge>
                                )}
                                {/* Investor badge */}
                                {(sale.investorSharePct ?? 0) > 0 && (
                                  <Badge variant="outline" className="text-[9px] font-medium border-0 rounded-full px-1.5 py-0 shrink-0" style={{ background: alpha(c.warning, 12), color: c.warning }}>
                                    <Users className="h-2 w-2 mr-0.5" />
                                    {sale.investorSharePct}%
                                  </Badge>
                                )}
                              </div>

                              {/* Status gradient pill badge */}
                              <span className={`biz-badge ${status === 'lunas' ? 'biz-badge-lunas' : status === 'cicilan' ? 'biz-badge-cicilan' : 'biz-badge-pending'} inline-flex items-center text-[9px] font-bold rounded-full px-2 py-0 shrink-0`} style={{ background: statusCfg.gradient, color: statusCfg.color, boxShadow: `0 0 8px ${alpha(statusCfg.color, 5)}` }}>
                                {isInstallment && hasDP ? `${statusCfg.label} ${Math.round(((sale.realizedAmount ?? sale.downPayment ?? 0) / sale.amount) * 100)}%` : statusCfg.label}
                              </span>
                            </div>

                            {/* Row 3: Installment progress bar (mobile) */}
                            {isInstallment && hasDP && (
                              <div className="mt-2 pt-1.5">
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-[9px] font-medium" style={{ color: c.warning }}>
                                    <Repeat className="h-2 w-2 mr-0.5 inline" />
                                    {Math.round((realized / sale.amount) * 100)}% lunas
                                  </span>
                                  {sale.installmentTempo && (
                                    <span className="text-[8px] tabular-nums" style={{ color: c.muted }}>
                                      {realized >= sale.amount ? `${sale.installmentTempo}/${sale.installmentTempo} bulan` : `${Math.round((realized / sale.amount) * sale.installmentTempo)}/${sale.installmentTempo} bulan`}
                                    </span>
                                  )}
                                </div>
                                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: alpha(c.border, 40) }}>
                                  <motion.div
                                    className="h-full rounded-full"
                                    style={{ background: realized >= sale.amount ? c.secondary : `linear-gradient(to right, ${c.warning}, ${c.primary})` }}
                                    initial={{ width: 0 }}
                                    animate={{ width: `${Math.min((realized / sale.amount) * 100, 100)}%` }}
                                    transition={{ duration: 0.5, ease: 'easeOut' as const }}
                                  />
                                </div>
                              </div>
                            )}
                          </motion.div>
                        );
                      })}
                    </AnimatePresence>
                  </div>

                  {/* ─── Desktop Table ─── */}
                  <div className="hidden sm:block max-h-[600px] overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="biz-table-header" style={{ borderBottom: `1px solid ${c.border}` }}>
                          <TableHead className="text-[10px] font-medium uppercase tracking-wider py-2.5 cursor-pointer select-none" style={{ color: c.muted }} onClick={() => toggleSort('date')}>
                            <span className="flex items-center gap-1">
                              {t('biz.cashDate')}
                              {sortField === 'date' && <ArrowUpDown className="h-2.5 w-2.5" style={{ color: c.primary }} />}
                            </span>
                          </TableHead>
                          <TableHead className="text-[10px] font-medium uppercase tracking-wider py-2.5 cursor-pointer select-none" style={{ color: c.muted }} onClick={() => toggleSort('description')}>
                            <span className="flex items-center gap-1">
                              {t('biz.saleDescription')}
                              {sortField === 'description' && <ArrowUpDown className="h-2.5 w-2.5" style={{ color: c.primary }} />}
                            </span>
                          </TableHead>
                          <TableHead className="text-[10px] font-medium uppercase tracking-wider hidden md:table-cell py-2.5" style={{ color: c.muted }}>
                            {t('biz.saleCustomer')}
                          </TableHead>
                          <TableHead className="text-[10px] font-medium uppercase tracking-wider py-2.5" style={{ color: c.muted }}>
                            Status
                          </TableHead>
                          <TableHead className="text-[10px] font-medium uppercase tracking-wider text-right py-2.5 cursor-pointer select-none" style={{ color: c.muted }} onClick={() => toggleSort('amount')}>
                            <span className="flex items-center gap-1 justify-end">
                              {t('biz.saleAmount')}
                              {sortField === 'amount' && <ArrowUpDown className="h-2.5 w-2.5" style={{ color: c.primary }} />}
                            </span>
                          </TableHead>
                          <TableHead className="w-[80px]" />
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <AnimatePresence mode="popLayout">
                          {visibleSales.map((sale, i) => {
                            const status = getSaleStatus(sale);
                            const statusCfg = STATUS_CONFIG[status];
                            const isInstallment = (sale.installmentTempo ?? 0) > 0;
                            const hasDP = (sale.downPayment ?? 0) > 0;
                            const hasInvestor = (sale.investorSharePct ?? 0) > 0;
                            const realized = sale.realizedAmount ?? 0;
                            const dpPercent = sale.amount > 0 && hasDP ? Math.round((sale.downPayment! / sale.amount) * 100) : 0;

                            return (
                              <motion.tr
                                key={sale.id}
                                custom={i}
                                variants={rowVariants}
                                initial="hidden"
                                animate="visible"
                                exit="exit"
                                layout
                                className={`biz-table-row ${i % 2 === 1 ? 'biz-table-row-alt' : ''} group cursor-pointer transition-colors duration-150 hover:bg-white/[0.03]`}
                                onClick={() => openEditDialog(sale)}
                              >
                                <TableCell className="text-[11px] py-2.5 font-mono" style={{ color: c.muted }}>
                                  {new Date(sale.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                                </TableCell>
                                <TableCell className="py-2.5">
                                  <div className="flex flex-col gap-0.5">
                                    <span className="text-xs font-medium max-w-[200px] truncate" style={{ color: c.foreground }}>
                                      {sale.description}
                                    </span>
                                    <div className="flex items-center gap-1 flex-wrap">
                                      {sale.category && (
                                        <Badge variant="outline" className="text-[9px] font-medium border-0 rounded-full px-1.5 py-0" style={{ background: alpha(c.warning, 12), color: c.warning }}>
                                          <Layers className="h-2 w-2 mr-0.5" />
                                          {sale.category.name}
                                        </Badge>
                                      )}
                                      {sale.paymentMethod && (() => {
                                        const M = PAYMENT_METHODS.find((m) => m.value === sale.paymentMethod);
                                        if (!M) return null;
                                        const Icon = M.icon;
                                        return (
                                          <Badge variant="outline" className="text-[9px] font-medium border-0 rounded-full px-1.5 py-0" style={{ background: alpha(M.color, 12), color: M.color }}>
                                            <Icon className="h-2 w-2 mr-0.5" />
                                            {t(M.labelKey)}
                                          </Badge>
                                        );
                                      })()}
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell className="py-2.5 hidden md:table-cell">
                                  {sale.customer?.name ? (
                                    <span className="inline-flex items-center gap-1 text-[11px] font-medium rounded-full px-2 py-0.5" style={{ background: `linear-gradient(135deg, ${alpha(c.primary, 14)}, ${alpha(c.primary, 6)})`, color: c.primary }}>
                                      <Users className="h-2.5 w-2.5" />
                                      {sale.customer.name}
                                    </span>
                                  ) : (
                                    <span className="text-xs" style={{ color: c.muted }}>—</span>
                                  )}
                                </TableCell>
                                {/* Status column */}
                                <TableCell className="py-2.5">
                                  <div className="flex items-center gap-1 flex-wrap">
                                    <span className={`biz-badge ${status === 'lunas' ? 'biz-badge-lunas' : status === 'cicilan' ? 'biz-badge-cicilan' : 'biz-badge-pending'} inline-flex items-center text-[9px] font-bold rounded-full px-2 py-0`} style={{ background: statusCfg.gradient, color: statusCfg.color, boxShadow: `0 0 8px ${alpha(statusCfg.color, 5)}` }}>
                                      {statusCfg.label}
                                    </span>
                                    {isInstallment && hasDP && (
                                      <Badge variant="outline" className="text-[9px] font-medium border-0 rounded-full px-1.5 py-0" style={{ background: alpha(c.secondary, 12), color: c.secondary }}>
                                        DP {dpPercent}%
                                      </Badge>
                                    )}
                                    {hasInvestor && (
                                      <Badge variant="outline" className="text-[9px] font-medium border-0 rounded-full px-1.5 py-0" style={{ background: alpha(c.warning, 12), color: c.warning }}>
                                        <Users className="h-2 w-2 mr-0.5" />
                                        {sale.investorSharePct}%
                                      </Badge>
                                    )}
                                  </div>
                                  {/* Installment progress bar */}
                                  {isInstallment && hasDP && (
                                    <div className="mt-1 max-w-[140px]">
                                      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: alpha(c.border, 40) }}>
                                        <motion.div
                                          className="h-full rounded-full"
                                          style={{ background: realized >= sale.amount ? c.secondary : `linear-gradient(to right, ${c.warning}, ${c.primary})` }}
                                          initial={{ width: 0 }}
                                          animate={{ width: `${Math.min((realized / sale.amount) * 100, 100)}%` }}
                                          transition={{ duration: 0.5, ease: 'easeOut' as const }}
                                        />
                                      </div>
                                      <div className="flex items-center justify-between mt-0.5">
                                        <p className="text-[8px] tabular-nums" style={{ color: c.muted }}>
                                          {Math.round((realized / sale.amount) * 100)}% lunas
                                        </p>
                                        {sale.installmentTempo && (
                                          <p className="text-[8px] tabular-nums" style={{ color: c.muted }}>
                                            {realized >= sale.amount ? `${sale.installmentTempo}/${sale.installmentTempo} bln` : `${Math.round((realized / sale.amount) * sale.installmentTempo)}/${sale.installmentTempo} bln`}
                                          </p>
                                        )}
                                      </div>
                                    </div>
                                  )}
                                </TableCell>
                                {/* Amount column */}
                                <TableCell className="py-2.5 text-right">
                                  <div className="flex flex-col items-end gap-0.5">
                                    <span className="text-xs font-semibold tabular-nums" style={{ color: c.secondary }}>
                                      {formatAmount(sale.amount)}
                                    </span>
                                    {isInstallment && realized < sale.amount && (
                                      <span className="text-[9px] tabular-nums" style={{ color: c.muted }}>
                                        sisa {formatAmount(sale.amount - realized)}
                                      </span>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell className="py-2.5 text-right">
                                  <div className="flex items-center justify-end gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-7 w-7 p-0 rounded-md"
                                      style={{ color: c.muted }}
                                      onClick={(e) => { e.stopPropagation(); openEditDialog(sale); }}
                                    >
                                      <Pencil className="h-3 w-3" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-7 w-7 p-0 rounded-md"
                                      style={{ color: c.muted }}
                                      onClick={(e) => { e.stopPropagation(); setDeleteId(sale.id); }}
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
                  </div>

                  {/* Summary footer */}
                  <div className="px-4 py-2.5 flex items-center justify-between border-t" style={{ borderColor: c.border, background: c.card }}>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px]" style={{ color: c.muted }}>
                        {filteredSales.length} transaksi
                      </span>
                      {hasMore && (
                        <span className="text-[10px]" style={{ color: c.muted }}>
                          (menampilkan {visibleSales.length})
                        </span>
                      )}
                    </div>
                    <span className="text-xs font-bold tabular-nums" style={{ color: c.secondary }}>
                      Total: {formatAmount(total)}
                    </span>
                  </div>

                  {/* Load More */}
                  {hasMore && (
                    <div className="px-4 py-2 border-t" style={{ borderColor: c.border }}>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setPageSize((p) => p + 10)}
                        className="w-full rounded-lg text-xs font-medium"
                        style={{ color: c.primary }}
                      >
                        Tampilkan Lebih Banyak
                        <ChevronRight className="h-3 w-3 ml-1" />
                      </Button>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* ═══ ADD/EDIT DIALOG ═══ */}
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogContent
              className="biz-dialog-content bg-[#141414] border-white/[0.08] rounded-2xl p-0 overflow-hidden max-h-[90vh] flex flex-col w-[95vw] sm:max-w-lg"
            >
              {/* Gradient accent strip at top */}
              <div className="h-px shrink-0" style={{ background: `linear-gradient(to right, transparent, ${alpha(c.primary, 30)}, transparent)` }} />
              <div className="px-5 pt-4 pb-1 shrink-0">
                <DialogHeader>
                  <DialogTitle className="text-base font-semibold flex items-center gap-2 text-foreground">
                    <div className="w-7 h-7 rounded-lg bg-white/[0.06] flex items-center justify-center">
                      {editingSale ? (
                        <Pencil className="h-3.5 w-3.5 text-foreground" />
                      ) : (
                        <Plus className="h-3.5 w-3.5 text-foreground" />
                      )}
                    </div>
                    {editingSale ? t('common.edit') : t('biz.addSale')}
                  </DialogTitle>
                  <DialogDescription className="pl-9 text-muted-foreground/60">
                    {t('biz.saleDescription')}
                  </DialogDescription>
                </DialogHeader>
              </div>

              <form id="sale-form" onSubmit={handleSave} className="space-y-0 overflow-y-auto flex-1 scroll-smooth">

                {/* ═══ Section 1: Detail Penjualan ═══ */}
                <div className="space-y-3 px-5 pt-4 pb-3">
                  <div className="flex items-center gap-2 pb-1">
                    <Receipt className="h-3.5 w-3.5 text-muted-foreground/50" />
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/50">Detail Penjualan</span>
                    <div className="flex-1 h-px bg-white/[0.06]" />
                  </div>

                  {/* Description — first field, most important */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground/50">
                      {t('biz.saleDescription')} <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      value={formData.description}
                      onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                      placeholder={t('biz.saleDescription')}
                      className="h-10 rounded-xl text-sm bg-white/[0.04] border-white/[0.08] text-foreground focus:border-white/15 focus:ring-0"
                    />
                  </div>

                  {/* Amount with Live Preview */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground/50">
                      {t('biz.saleAmount')} <span className="text-destructive">*</span>
                    </Label>
                    <div className="relative">
                      <Wallet className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/40" />
                      <Input
                        type="number"
                        value={formData.amount}
                        onChange={(e) => setFormData((prev) => ({ ...prev, amount: e.target.value }))}
                        placeholder="0"
                        min="0"
                        className="pl-10 pr-4 h-11 rounded-xl text-base font-semibold tabular-nums bg-white/[0.04] border-white/[0.08] text-foreground focus:border-white/15 focus:ring-0"
                      />
                    </div>
                    {formData.amount && parseFloat(formData.amount) > 0 && (
                      <div
                        className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08]"
                      >
                        <CircleDollarSign className="h-3.5 w-3.5 text-secondary" />
                        <span className="text-xs font-semibold tabular-nums text-secondary">
                          {formatAmount(parseFloat(formData.amount))}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Product Quick Select + Category — 2-col on desktop */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Product Quick Select */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground/50">
                        {t('biz.selectProduct')}
                      </Label>
                      <Popover open={productSearchOpen} onOpenChange={setProductSearchOpen}>
                        <PopoverTrigger asChild>
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5" style={{ color: c.muted }} />
                            <button
                              type="button"
                              onClick={() => setProductSearchOpen(true)}
                              className="flex h-10 w-full items-center justify-between rounded-xl text-sm bg-white/[0.04] border border-white/[0.08] text-foreground focus:border-white/15 focus:ring-0 px-9 text-left cursor-pointer hover:bg-white/[0.06] transition-colors"
                            >
                              <span className={selectedProduct ? '' : 'text-muted-foreground'}>
                                {selectedProduct ? selectedProduct.name : t('biz.selectProduct')}
                              </span>
                              {selectedProduct && (
                                <X
                                  className="h-3.5 w-3.5 shrink-0 text-muted-foreground hover:text-foreground"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedProductId('');
                                    setProductSearchTerm('');
                                  }}
                                />
                              )}
                            </button>
                          </div>
                        </PopoverTrigger>
                        <PopoverContent className="w-[--radix-popover-trigger-width] p-0 rounded-xl border bg-[#1a1a1a] border-white/[0.08]" align="start">
                          <Command shouldFilter={false} className="bg-transparent">
                            <div className="flex items-center border-b border-white/[0.08] px-3">
                              <Search className="mr-2 h-3.5 w-3.5 shrink-0 opacity-50" />
                              <input
                                placeholder={t('biz.selectProduct') + '...'}
                                value={productSearchTerm}
                                onChange={(e) => setProductSearchTerm(e.target.value)}
                                className="flex h-10 w-full bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground text-foreground"
                                autoFocus
                              />
                            </div>
                            <CommandList className="max-h-[240px]">
                              <CommandEmpty className="py-4 text-center text-xs text-muted-foreground">
                                Tidak ada produk ditemukan
                              </CommandEmpty>
                              <CommandGroup>
                                {filteredProducts.map((p) => (
                                  <CommandItem
                                    key={p.id}
                                    value={p.id}
                                    onSelect={() => handleProductSelect(p.id)}
                                    className="flex items-center justify-between px-3 py-2.5 rounded-md cursor-pointer text-sm"
                                    style={{ color: c.foreground }}
                                  >
                                    <div className="flex items-center gap-2 min-w-0 flex-1">
                                      <PackageOpen className="h-3.5 w-3.5 shrink-0" style={{ color: c.muted }} />
                                      <span className="truncate">{p.name}</span>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0 ml-2">
                                      <span className="text-xs font-medium" style={{ color: c.secondary }}>{formatAmount(p.price)}</span>
                                      <span className="text-[10px] rounded-full px-1.5 py-0.5" style={{ color: c.muted, background: alpha(c.border, 60) }}>
                                        stok {p.stock}
                                      </span>
                                    </div>
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                      {/* Selected product chip */}
                      {selectedProduct && (
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border" style={{ background: alpha(c.secondary, 8), color: c.secondary, borderColor: alpha(c.secondary, 15) }}>
                            {selectedProduct.name} · {formatAmount(selectedProduct.price)}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Category Selection */}
                    {categories.length > 0 && (
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium uppercase tracking-wider" style={{ color: c.muted }}>
                          {t('biz.cashCategory')}
                        </Label>
                        <Select
                          value={formData.categoryId}
                          onValueChange={(v) => setFormData((prev) => ({ ...prev, categoryId: v }))}
                        >
                          <SelectTrigger className="h-10 rounded-xl text-sm bg-white/[0.04] border-white/[0.08] text-foreground focus:border-white/15 focus:ring-0">
                            <SelectValue placeholder={t('biz.cashCategory')} />
                          </SelectTrigger>
                          <SelectContent className="rounded-lg border bg-[#1a1a1a] border-white/[0.08]">
                            <SelectItem value="" className="text-sm rounded-md" style={{ color: c.muted }}>
                              Tanpa kategori
                            </SelectItem>
                            {categories.map((cat) => (
                              <SelectItem key={cat.id} value={cat.id} className="text-sm rounded-md" style={{ color: c.foreground }}>
                                <span className="flex items-center gap-2">
                                  <Layers className="h-3 w-3" style={{ color: c.warning }} />
                                  {cat.name}
                                </span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>

                  {/* Product auto-fill hint */}
                  {isProductAutoFill && (
                    <p className="text-xs flex items-center gap-1 text-secondary">
                      <BarChart3 className="h-3 w-3" />
                      Harga &amp; deskripsi terisi otomatis dari produk
                    </p>
                  )}
                </div>

                {/* Section divider */}
                <div className="h-px bg-white/[0.06]" />

                {/* ═══ Section 2: Pelanggan & Pembayaran ═══ */}
                <div className="space-y-3 px-5 pb-3">
                  <div className="flex items-center gap-2 pb-1">
                    <Users className="h-3.5 w-3.5 text-muted-foreground/50" />
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/50">Pelanggan &amp; Pembayaran</span>
                    <div className="flex-1 h-px bg-white/[0.06]" />
                  </div>

                  {/* Customer + Date — 2-col on desktop */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Customer */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground/50">
                        {t('biz.saleCustomer')}
                      </Label>
                      <Popover open={customerSearchOpen} onOpenChange={(open) => { setCustomerSearchOpen(open); if (!open) setShowNewCustomerForm(false); }}>
                        <PopoverTrigger asChild>
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5" style={{ color: c.muted }} />
                            <button
                              type="button"
                              onClick={() => setCustomerSearchOpen(true)}
                              className="flex h-10 w-full items-center justify-between rounded-xl text-sm bg-white/[0.04] border border-white/[0.08] text-foreground focus:border-white/15 focus:ring-0 px-9 text-left cursor-pointer hover:bg-white/[0.06] transition-colors"
                            >
                              <span className={selectedCustomerName ? '' : 'text-muted-foreground'}>
                                {selectedCustomerName || t('biz.saleCustomer')}
                              </span>
                              {selectedCustomerName && (
                                <X
                                  className="h-3.5 w-3.5 shrink-0 text-muted-foreground hover:text-foreground"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setFormData((prev) => ({ ...prev, customerId: '' }));
                                    setCustomerSearchTerm('');
                                  }}
                                />
                              )}
                            </button>
                          </div>
                        </PopoverTrigger>
                        <PopoverContent className="w-[--radix-popover-trigger-width] p-0 rounded-xl border bg-[#1a1a1a] border-white/[0.08]" align="start">
                          {!showNewCustomerForm ? (
                            <Command shouldFilter={false} className="bg-transparent">
                              <div className="flex items-center border-b border-white/[0.08] px-3">
                                <Search className="mr-2 h-3.5 w-3.5 shrink-0 opacity-50" />
                                <input
                                  placeholder={t('common.search') + ' pelanggan...'}
                                  value={customerSearchTerm}
                                  onChange={(e) => setCustomerSearchTerm(e.target.value)}
                                  className="flex h-10 w-full bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground text-foreground"
                                  autoFocus
                                />
                              </div>
                              <CommandList className="max-h-[220px]">
                                <CommandEmpty className="py-4 text-center text-xs text-muted-foreground">
                                  Tidak ada pelanggan ditemukan
                                </CommandEmpty>
                                <CommandGroup>
                                  {filteredCustomers.map((cust) => (
                                    <CommandItem
                                      key={cust.id}
                                      value={cust.id}
                                      onSelect={() => {
                                        setFormData((prev) => ({ ...prev, customerId: cust.id }));
                                        setCustomerSearchOpen(false);
                                        setCustomerSearchTerm('');
                                      }}
                                      className="flex items-center gap-2 px-3 py-2.5 rounded-md cursor-pointer text-sm"
                                      style={{ color: c.foreground }}
                                    >
                                      <div className="h-6 w-6 rounded-md flex items-center justify-center shrink-0" style={{ background: alpha(c.primary, 12) }}>
                                        <span className="text-[10px] font-bold" style={{ color: c.primary }}>{cust.name.charAt(0).toUpperCase()}</span>
                                      </div>
                                      <span className="truncate">{cust.name}</span>
                                      {formData.customerId === cust.id && (
                                        <Check className="h-3.5 w-3.5 ml-auto shrink-0" style={{ color: c.secondary }} />
                                      )}
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              </CommandList>
                              <CommandSeparator />
                              <div className="p-1.5">
                                <button
                                  type="button"
                                  onClick={() => setShowNewCustomerForm(true)}
                                  className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-xs font-medium transition-colors hover:bg-white/[0.06]"
                                  style={{ color: c.primary }}
                                >
                                  <UserPlus className="h-3.5 w-3.5" />
                                  Tambah Pelanggan Baru
                                </button>
                              </div>
                            </Command>
                          ) : (
                            <div className="p-3 space-y-2.5">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-semibold" style={{ color: c.foreground }}>Pelanggan Baru</span>
                                <button
                                  type="button"
                                  onClick={() => { setShowNewCustomerForm(false); setNewCustomer({ name: '', phone: '', email: '' }); }}
                                  className="text-muted-foreground hover:text-foreground"
                                >
                                  <X className="h-3.5 w-3.5" />
                                </button>
                              </div>
                              <Input
                                placeholder="Nama *"
                                value={newCustomer.name}
                                onChange={(e) => setNewCustomer((prev) => ({ ...prev, name: e.target.value }))}
                                className="h-9 rounded-lg text-xs bg-white/[0.04] border-white/[0.08] text-foreground focus:border-white/15 focus:ring-0"
                              />
                              <div className="grid grid-cols-2 gap-2">
                                <Input
                                  placeholder="Telepon"
                                  value={newCustomer.phone}
                                  onChange={(e) => setNewCustomer((prev) => ({ ...prev, phone: e.target.value }))}
                                  className="h-9 rounded-lg text-xs bg-white/[0.04] border-white/[0.08] text-foreground focus:border-white/15 focus:ring-0"
                                />
                                <Input
                                  placeholder="Email"
                                  value={newCustomer.email}
                                  onChange={(e) => setNewCustomer((prev) => ({ ...prev, email: e.target.value }))}
                                  className="h-9 rounded-lg text-xs bg-white/[0.04] border-white/[0.08] text-foreground focus:border-white/15 focus:ring-0"
                                />
                              </div>
                              <Button
                                type="button"
                                size="sm"
                                disabled={savingNewCustomer || !newCustomer.name.trim()}
                                onClick={handleCreateNewCustomer}
                                className="w-full h-9 rounded-lg text-xs"
                                style={{ background: c.primary, color: 'var(--primary-foreground)' }}
                              >
                                {savingNewCustomer && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                                <Check className="h-3.5 w-3.5 mr-1" />
                                Simpan & Pilih
                              </Button>
                            </div>
                          )}
                        </PopoverContent>
                      </Popover>
                      {/* Selected customer chip */}
                      {selectedCustomerName && (
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border" style={{ background: alpha(c.primary, 8), color: c.primary, borderColor: alpha(c.primary, 15) }}>
                            <Users className="h-2.5 w-2.5" />
                            {selectedCustomerName}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Date */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground/50">
                        {t('biz.saleDate')}
                      </Label>
                      <Input
                        type="date"
                        value={formData.date}
                        onChange={(e) => setFormData((prev) => ({ ...prev, date: e.target.value }))}
                        className="h-10 rounded-xl text-sm bg-white/[0.04] border-white/[0.08] text-foreground focus:border-white/15 focus:ring-0"
                      />
                    </div>
                  </div>

                  {/* Payment Method — full width with icon-based options */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground/50">
                      {t('biz.salePaymentMethod')}
                    </Label>
                    <Select
                      value={formData.paymentMethod}
                      onValueChange={(v) => setFormData((prev) => ({ ...prev, paymentMethod: v }))}
                    >
                      <SelectTrigger className="h-10 rounded-xl text-sm bg-white/[0.04] border-white/[0.08] text-foreground focus:border-white/15 focus:ring-0">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-lg border bg-[#1a1a1a] border-white/[0.08]">
                        {PAYMENT_METHODS.map((m) => {
                          const Icon = m.icon;
                          return (
                            <SelectItem key={m.value} value={m.value} className="text-sm rounded-md" style={{ color: c.foreground }}>
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
                </div>

                {/* Section divider */}
                <div className="h-px bg-white/[0.06]" />

                {/* ═══ Section 3: Cicilan & Investor ═══ */}
                <div className="space-y-3 px-5 pb-3">
                  <div className="flex items-center gap-2 pb-1">
                    <Repeat className="h-3.5 w-3.5 text-muted-foreground/50" />
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/50">Cicilan &amp; Investor</span>
                    <div className="flex-1 h-px bg-white/[0.06]" />
                  </div>

                  {/* Installment Toggle — styled as a nice toggle card */}
                  <button
                    type="button"
                    onClick={() =>
                      setFormData((prev) => ({
                        ...prev,
                        isInstallment: !prev.isInstallment,
                        downPayment: !prev.isInstallment ? prev.downPayment : '',
                        downPaymentPct: !prev.isInstallment ? prev.downPaymentPct : '',
                        installmentTempo: !prev.isInstallment ? prev.installmentTempo : '',
                        investorSharePct: !prev.isInstallment ? prev.investorSharePct : '',
                      }))
                    }
                    className="w-full flex items-center justify-between rounded-xl px-4 py-3 border border-white/[0.08] transition-colors duration-200 cursor-pointer"
                    style={{
                      background: formData.isInstallment ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.02)',
                      borderColor: formData.isInstallment ? 'var(--primary)' : 'rgba(255,255,255,0.08)',
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-white/[0.06] flex items-center justify-center">
                        <Repeat className="h-4 w-4 text-primary" />
                      </div>
                      <div className="text-left">
                        <span className="text-sm font-medium text-foreground">{t('biz.isInstallment')}</span>
                        <p className="text-xs mt-0.5 text-muted-foreground/50">Aktifkan cicilan &amp; investor</p>
                      </div>
                    </div>
                    <div
                      className="w-10 h-6 rounded-full flex items-center transition-colors duration-200 shrink-0"
                      style={{ background: formData.isInstallment ? c.primary : c.border }}
                    >
                      <div
                        className="w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200"
                        style={{ transform: formData.isInstallment ? 'translateX(20px)' : 'translateX(2px)' }}
                      />
                    </div>
                  </button>

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
                        <div className="rounded-xl p-4 space-y-3 bg-white/[0.02] border border-white/[0.08]">
                          {/* DP Amount & DP Percentage */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                              <Label className="text-xs font-medium uppercase tracking-wider flex items-center gap-1 text-muted-foreground/50">
                                <ArrowDownToLine className="h-3 w-3 text-secondary" />
                                {t('biz.downPayment')} (Rp)
                              </Label>
                              <Input
                                type="number"
                                value={formData.downPayment}
                                onChange={(e) => handleDownPaymentChange(e.target.value)}
                                placeholder="0"
                                min="0"
                                className="h-10 rounded-xl text-sm tabular-nums bg-white/[0.04] border-white/[0.08] text-foreground focus:border-white/15 focus:ring-0"
                              />
                              {formattedDPNominal && (
                                <motion.div
                                  initial={{ opacity: 0, y: -4 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  exit={{ opacity: 0, y: -4 }}
                                  className="flex items-center gap-1.5 px-1 mt-1"
                                >
                                  <CircleDollarSign className="h-3 w-3 text-muted-foreground shrink-0" />
                                  <span className="text-sm font-semibold tabular-nums text-secondary">
                                    {formattedDPNominal}
                                  </span>
                                </motion.div>
                              )}
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-xs font-medium uppercase tracking-wider flex items-center gap-1 text-muted-foreground/50">
                                <Percent className="h-3 w-3 text-secondary" />
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
                                className="h-10 rounded-xl text-sm tabular-nums bg-white/[0.04] border-white/[0.08] text-foreground focus:border-white/15 focus:ring-0"
                              />
                            </div>
                          </div>

                          {/* Tenor (months) */}
                          <div className="space-y-1.5">
                            <Label className="text-xs font-medium uppercase tracking-wider flex items-center gap-1 text-muted-foreground/50">
                              <Repeat className="h-3 w-3 text-primary" />
                              {t('biz.installmentPeriod')}
                            </Label>
                            <Input
                              type="number"
                              value={formData.installmentTempo}
                              onChange={(e) => setFormData((prev) => ({ ...prev, installmentTempo: e.target.value }))}
                              placeholder="0"
                              min="1"
                              className="h-10 rounded-xl text-sm tabular-nums w-full sm:w-1/2 bg-white/[0.04] border-white/[0.08] text-foreground focus:border-white/15 focus:ring-0"
                            />
                          </div>

                          {/* Tanggal Jatuh Tempo Cicilan */}
                          <div className="space-y-1.5">
                            <Label className="text-xs font-medium uppercase tracking-wider flex items-center gap-1 text-muted-foreground/50">
                              <CalendarDays className="h-3 w-3 text-destructive" />
                              Tanggal Jatuh Tempo
                            </Label>
                            <Input
                              type="date"
                              value={formData.installmentDueDate}
                              onChange={(e) => setFormData((prev) => ({ ...prev, installmentDueDate: e.target.value }))}
                              className="h-10 rounded-xl text-sm w-full sm:w-1/2 bg-white/[0.04] border-white/[0.08] text-foreground focus:border-white/15 focus:ring-0"
                            />
                            {formData.installmentDueDate && computedTenor > 0 && (
                              <p className="text-xs text-muted-foreground/60">
                                Cicilan {computedTenor}× mulai{' '}
                                <span className="text-destructive">{new Date(formData.installmentDueDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                              </p>
                            )}
                          </div>

                          {/* Investor Share */}
                          <div className="space-y-1.5">
                            <Label className="text-xs font-medium uppercase tracking-wider flex items-center gap-1 text-muted-foreground/50">
                              <Users className="h-3 w-3 text-warning" />
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
                              className="h-10 rounded-xl text-sm tabular-nums w-full sm:w-1/2 bg-white/[0.04] border-white/[0.08] text-foreground focus:border-white/15 focus:ring-0"
                            />
                          </div>

                          {/* Live Preview Box */}
                          {(computedAmount > 0 || computedTenor > 0) && (
                            <div className="rounded-xl p-3 space-y-2 bg-white/[0.03] border border-white/[0.08]">
                              <p className="text-xs uppercase tracking-wider font-semibold text-muted-foreground/50">
                                Ringkasan Cicilan
                              </p>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                <div className="flex flex-col">
                                  <span className="text-[10px] uppercase text-muted-foreground/50">{t('biz.remainingAfterDP')}</span>
                                  <span className="text-sm font-bold tabular-nums text-secondary">
                                    {formatAmount(remaining)}
                                  </span>
                                </div>
                                <div className="flex flex-col">
                                  <span className="text-[10px] uppercase text-muted-foreground/50">{t('biz.installmentAmount')}</span>
                                  <span className="text-sm font-bold tabular-nums text-primary">
                                    {computedTenor > 0 ? formatAmount(monthlyInstallment) : '—'}
                                  </span>
                                </div>
                              </div>
                              {investorSharePct > 0 && monthlyInstallment > 0 && (
                                <div className="flex flex-col pt-2 border-t border-white/[0.06]">
                                  <span className="text-[10px] uppercase text-muted-foreground/50">Bagi Investor ({investorSharePct}%)</span>
                                  <span className="text-sm font-bold tabular-nums text-warning">
                                    {formatAmount(investorShareAmount)} / bulan
                                  </span>
                                </div>
                              )}
                              {/* Progress bar preview */}
                              {computedAmount > 0 && computedDP > 0 && (
                                <div className="pt-1">
                                  <div className="h-1.5 rounded-full overflow-hidden bg-white/[0.06]">
                                    <motion.div
                                      className="h-full rounded-full"
                                      style={{ background: c.secondary }}
                                      initial={{ width: 0 }}
                                      animate={{
                                        width: `${Math.min((computedDP / computedAmount) * 100, 100)}%`,
                                      }}
                                      transition={{ duration: 0.4, ease: 'easeOut' as const }}
                                    />
                                  </div>
                                  <p className="text-xs mt-1 tabular-nums text-muted-foreground/50">
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
                </div>

                {/* Section divider */}
                <div className="h-px bg-white/[0.06]" />

                {/* ═══ Section 4: Catatan ═══ */}
                <div className="space-y-3 px-5 pb-4">
                  <div className="flex items-center gap-2 pb-1">
                    <Info className="h-3.5 w-3.5 text-muted-foreground/50" />
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/50">Catatan</span>
                    <div className="flex-1 h-px bg-white/[0.06]" />
                  </div>
                  <Textarea
                    value={formData.notes}
                    onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
                    placeholder={t('biz.customerNotes')}
                    className="min-h-[72px] rounded-xl text-sm resize-none bg-white/[0.04] border-white/[0.08] text-foreground focus:border-white/15 focus:ring-0"
                  />
                </div>
              </form>

              <DialogFooter className="gap-2 pt-3 pb-4 px-5 shrink-0 border-t border-white/[0.06]">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setDialogOpen(false)}
                  className="rounded-xl text-sm text-muted-foreground hover:bg-white/[0.06]"
                >
                  {t('common.cancel')}
                </Button>
                <Button
                  type="submit"
                  form="sale-form"
                  disabled={saving || !formData.description || !formData.amount}
                  className="rounded-xl text-sm disabled:opacity-50"
                  style={{ background: `linear-gradient(135deg, ${c.secondary}, ${c.primary})`, color: 'var(--primary-foreground)' }}
                >
                  {saving && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
                  {t('common.save')}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* ═══ DELETE CONFIRMATION ═══ */}
          <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
            <AlertDialogContent className="rounded-xl border" style={{ background: c.card, borderColor: c.border }}>
              <div className="h-[2px] -mt-6 mb-4 -mx-6 mt-[-1.25rem] rounded-t-xl" style={{ background: c.destructive }} />
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2" style={{ color: c.foreground }}>
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: alpha(c.destructive, 15) }}>
                    <Trash2 className="h-3.5 w-3.5" style={{ color: c.destructive }} />
                  </div>
                  {t('common.delete')}
                </AlertDialogTitle>
                <AlertDialogDescription className="pl-9" style={{ color: c.muted }}>
                  {t('kas.deleteDesc')}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="rounded-lg text-sm border" style={{ borderColor: c.border, color: c.muted }}>
                  {t('common.cancel')}
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  className="rounded-lg text-sm border-0"
                  style={{ background: c.destructive, color: c.foreground }}
                >
                  {t('common.delete')}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {/* ═══ POST-SALE INVOICE PROMPT ═══ */}
          <Dialog open={showInvoicePrompt} onOpenChange={(open) => !open && setShowInvoicePrompt(false)}>
            <DialogContent className="rounded-xl w-[95vw] sm:max-w-[380px] border" style={{ background: c.card, borderColor: c.border }}>
              <div className="h-[2px] -mt-6 mb-4 -mx-6 mt-[-1.25rem] rounded-t-xl" style={{ background: `linear-gradient(to right, ${c.secondary}, ${c.primary})` }} />
              <DialogHeader className="text-center">
                <div className="flex flex-col items-center gap-3 pt-1">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center border" style={{ background: alpha(c.secondary, 15), borderColor: c.border }}>
                    <CheckCircle className="h-6 w-6" style={{ color: c.secondary }} />
                  </div>
                  <div>
                    <DialogTitle className="text-base font-bold flex items-center justify-center gap-2" style={{ color: c.foreground }}>
                      <Receipt className="h-4 w-4" style={{ color: c.primary }} />
                      Kirim Invoice?
                    </DialogTitle>
                    <DialogDescription className="mt-1.5 text-xs" style={{ color: c.muted }}>
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
                  style={{ background: c.primary, color: 'var(--primary-foreground)' }}
                >
                  <Receipt className="h-3.5 w-3.5 mr-2" />
                  Buat Invoice
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => setShowInvoicePrompt(false)}
                  className="w-full rounded-lg text-sm border"
                  style={{ borderColor: c.border, color: c.muted }}
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
