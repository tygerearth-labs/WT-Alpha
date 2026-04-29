'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useBusinessStore } from '@/store/useBusinessStore';
import { useTranslation } from '@/hooks/useTranslation';
import { useCurrencyFormat } from '@/hooks/useCurrencyFormat';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
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
import { Separator } from '@/components/ui/separator';
import { Plus, Pencil, Trash2, Users, Search, FileText, ShoppingCart, Star, UserPlus, Info, CalendarDays, Phone, Mail, MapPin, ShoppingBag, Receipt, Clock, MessageCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';

// ─── COLOR SYSTEM ─────────────────────────────────────────────
const c = {
  primary: 'var(--primary)', secondary: 'var(--secondary)', destructive: 'var(--destructive)',
  warning: 'var(--warning)', muted: 'var(--muted-foreground)', border: 'var(--border)',
  foreground: 'var(--foreground)', card: 'var(--card)',
};
const alpha = (color: string, pct: number) => `color-mix(in srgb, ${color} ${pct}%, transparent)`;

// ─── THEME ─────────────────────────────────────────────────────
const cardStyle: React.CSSProperties = { background: 'var(--card)', border: '1px solid var(--border)' };
const inputStyle: React.CSSProperties = { background: 'var(--card)', border: '1px solid var(--border)', color: 'var(--foreground)' };
const textMuted: React.CSSProperties = { color: 'var(--muted-foreground)' };
const textPrimary: React.CSSProperties = { color: 'var(--primary)' };
const textSecondary: React.CSSProperties = { color: 'var(--secondary)' };
const textDestructive: React.CSSProperties = { color: 'var(--destructive)' };

interface Customer {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  notes?: string | null;
  createdAt?: string;
  _count?: { invoices: number; sales: number };
}

interface CustomerSale {
  id: string;
  description: string;
  amount: number;
  paymentMethod: string | null;
  date: string;
  customerId?: string | null;
  customer?: { id: string; name: string } | null;
}

interface CustomerInvoice {
  id: string;
  invoiceNumber: string;
  date: string;
  dueDate?: string | null;
  total: number;
  status: string;
  customerId?: string | null;
  customer?: { id: string; name: string } | null;
}

function getCustomerBadge(count: number): { label: string; style: React.CSSProperties } {
  if (count === 0) return { label: 'Baru', style: { backgroundColor: 'color-mix(in srgb, var(--secondary) 8%, transparent)', color: 'var(--secondary)', border: '1px solid color-mix(in srgb, var(--secondary) 15%, transparent)' } };
  if (count <= 3) return { label: 'Aktif', style: { backgroundColor: 'color-mix(in srgb, var(--primary) 8%, transparent)', color: 'var(--primary)', border: '1px solid color-mix(in srgb, var(--primary) 15%, transparent)' } };
  if (count <= 8) return { label: 'Setia', style: { backgroundColor: 'color-mix(in srgb, var(--warning) 8%, transparent)', color: 'var(--warning)', border: '1px solid color-mix(in srgb, var(--warning) 15%, transparent)' } };
  return { label: 'VIP', style: { backgroundColor: 'color-mix(in srgb, var(--destructive) 8%, transparent)', color: 'var(--destructive)', border: '1px solid color-mix(in srgb, var(--destructive) 15%, transparent)' } };
}

export default function BusinessCustomers() {
  const { t } = useTranslation();
  const { activeBusiness } = useBusinessStore();
  const { formatAmount } = useCurrencyFormat();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerSpending, setCustomerSpending] = useState<Record<string, { total: number; method: string | null; txCount: number; lastDate: string | null }>>({});
  const [customerPiutang, setCustomerPiutang] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    notes: '',
  });
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [detailCustomer, setDetailCustomer] = useState<Customer | null>(null);
  const [detailSales, setDetailSales] = useState<CustomerSale[]>([]);
  const [detailInvoices, setDetailInvoices] = useState<CustomerInvoice[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);

  const businessId = activeBusiness?.id;

  const fetchCustomers = useCallback(() => {
    if (!businessId) return;
    setLoading(true);
    fetch(`/api/business/${businessId}/customers`)
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then((data) => setCustomers(data?.customers || []))
      .catch(() => setCustomers([]))
      .finally(() => setLoading(false));
  }, [businessId]);

  const fetchSalesForSpending = useCallback(() => {
    if (!businessId) return;
    Promise.all([
      fetch(`/api/business/${businessId}/sales?pageSize=200`).then((res) => {
        if (!res.ok) return { sales: [] } as { sales: CustomerSale[] };
        return res.json() as Promise<{ sales: CustomerSale[] }>;
      }),
      fetch(`/api/business/${businessId}/debts?type=piutang&pageSize=200`).then((res) => {
        if (!res.ok) return { debts: [] } as { debts: Array<{ counterpart: string; remaining: number; status: string }> };
        return res.json() as Promise<{ debts: Array<{ counterpart: string; remaining: number; status: string }> }>;
      }),
    ]).then(([salesData, debtsData]) => {
      // Spending aggregation
      const spendingMap: Record<string, { total: number; methods: Record<string, number>; txCount: number; lastDate: string }> = {};
      const salesWithCustomer = salesData?.sales || [];
      for (const sale of salesWithCustomer) {
        const custId = sale.customer?.id;
        if (custId) {
          if (!spendingMap[custId]) spendingMap[custId] = { total: 0, methods: {}, txCount: 0, lastDate: sale.date };
          spendingMap[custId].total += sale.amount || 0;
          spendingMap[custId].txCount += 1;
          if (sale.date > spendingMap[custId].lastDate) spendingMap[custId].lastDate = sale.date;
          const method = sale.paymentMethod || 'Lainnya';
          spendingMap[custId].methods[method] = (spendingMap[custId].methods[method] || 0) + 1;
        }
      }
      const result: Record<string, { total: number; method: string | null; txCount: number; lastDate: string | null }> = {};
      Object.entries(spendingMap).forEach(([id, data]) => {
        const topMethod = Object.entries(data.methods).sort((a, b) => b[1] - a[1])[0]?.[0] || null;
        result[id] = { total: data.total, method: topMethod, txCount: data.txCount, lastDate: data.lastDate || null };
      });
      setCustomerSpending(result);

      // Piutang aggregation by customer name
      const piutangMap: Record<string, number> = {};
      (debtsData?.debts || []).forEach((debt) => {
        if (debt.status !== 'paid' && debt.counterpart) {
          piutangMap[debt.counterpart] = (piutangMap[debt.counterpart] || 0) + debt.remaining;
        }
      });
      setCustomerPiutang(piutangMap);
    }).catch(() => {});
  }, [businessId]);

  // Fetch sales & invoices for customer detail dialog
  useEffect(() => {
    if (!detailCustomer || !businessId) {
      setDetailSales([]);
      setDetailInvoices([]);
      return;
    }
    setDetailLoading(true);
    Promise.all([
      fetch(`/api/business/${businessId}/sales?customerId=${detailCustomer.id}&pageSize=50`).then((res) => {
        if (!res.ok) throw new Error();
        return res.json();
      }),
      fetch(`/api/business/${businessId}/invoices?pageSize=200`).then((res) => {
        if (!res.ok) throw new Error();
        return res.json();
      }),
    ])
      .then(([salesData, invoicesData]) => {
        setDetailSales(salesData?.sales || []);
        const allInvoices: CustomerInvoice[] = invoicesData?.invoices || [];
        const customerInvoices = allInvoices.filter(
          (inv) => inv.customerId === detailCustomer.id || inv.customer?.id === detailCustomer.id
        );
        setDetailInvoices(customerInvoices);
      })
      .catch(() => {
        setDetailSales([]);
        setDetailInvoices([]);
      })
      .finally(() => setDetailLoading(false));
  }, [detailCustomer, businessId]);

  useEffect(() => {
    if (businessId) {
      fetchCustomers();
      fetchSalesForSpending();
    } else {
      setLoading(false);
    }
  }, [businessId, fetchCustomers, fetchSalesForSpending]);

  const openCreateDialog = () => {
    setEditingCustomer(null);
    setFormData({ name: '', email: '', phone: '', address: '', notes: '' });
    setDialogOpen(true);
  };

  const openEditDialog = (customer: Customer) => {
    setEditingCustomer(customer);
    setFormData({
      name: customer.name,
      email: customer.email || '',
      phone: customer.phone || '',
      address: customer.address || '',
      notes: customer.notes || '',
    });
    setDialogOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessId || !formData.name.trim()) return;
    setSaving(true);
    try {
      const url = editingCustomer
        ? `/api/business/${businessId}/customers/${editingCustomer.id}`
        : `/api/business/${businessId}/customers`;
      const res = await fetch(url, {
        method: editingCustomer ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name.trim(),
          email: formData.email || undefined,
          phone: formData.phone || undefined,
          address: formData.address || undefined,
          notes: formData.notes || undefined,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success(editingCustomer ? t('biz.businessUpdated') : t('biz.customerCreated'));
      setDialogOpen(false);
      fetchCustomers();
    } catch {
      toast.error(t('common.error'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!businessId || !deleteId) return;
    try {
      const res = await fetch(`/api/business/${businessId}/customers/${deleteId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      toast.success(t('biz.businessUpdated'));
      fetchCustomers();
    } catch {
      toast.error(t('common.error'));
    } finally {
      setDeleteId(null);
    }
  };

  const filteredCustomers = useMemo(() => {
    const base = customers.filter(
      (c) =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.email?.toLowerCase().includes(search.toLowerCase()) ||
        c.phone?.includes(search)
    );
    // Sort by total spending (highest first)
    return [...base].sort((a, b) => {
      const aSpending = customerSpending[a.id]?.total || 0;
      const bSpending = customerSpending[b.id]?.total || 0;
      return bSpending - aSpending;
    });
  }, [customers, search, customerSpending]);

  // ── Quick Stats ──
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  // Determine customer status based on last transaction
  const getCustomerStatus = (customer: Customer): { label: string; style: React.CSSProperties } => {
    const spending = customerSpending[customer.id];
    const piutangBalance = customerPiutang[customer.name] || 0;
    if (!spending || spending.txCount === 0) {
      return { label: 'Baru', style: { backgroundColor: 'color-mix(in srgb, var(--muted-foreground) 8%, transparent)', color: 'var(--muted-foreground)', border: '1px solid color-mix(in srgb, var(--muted-foreground) 15%, transparent)' } };
    }
    if (spending.lastDate) {
      const lastTx = new Date(spending.lastDate);
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      if (lastTx < thirtyDaysAgo) {
        return { label: 'Tidak Aktif', style: { backgroundColor: 'color-mix(in srgb, var(--warning) 8%, transparent)', color: 'var(--warning)', border: '1px solid color-mix(in srgb, var(--warning) 15%, transparent)' } };
      }
    }
    return { label: 'Aktif', style: { backgroundColor: 'color-mix(in srgb, var(--secondary) 8%, transparent)', color: 'var(--secondary)', border: '1px solid color-mix(in srgb, var(--secondary) 15%, transparent)' } };
  };

  const activeCustomers = customers.filter((c) => {
    if (!c._count?.sales) return false;
    return (c._count.sales || 0) > 0;
  }).length;

  const newCustomers = customers.filter((c) => {
    if (!c.createdAt) return false;
    return new Date(c.createdAt) >= sevenDaysAgo;
  }).length;

  const vipCustomers = customers.filter((c) => {
    const count = (c._count?.invoices || 0) + (c._count?.sales || 0);
    return count > 10;
  }).length;

  const topCustomer = customers.reduce<Customer | null>((top, c) => {
    const count = (c._count?.invoices || 0) + (c._count?.sales || 0);
    const topCount = top ? (top._count?.invoices || 0) + (top._count?.sales || 0) : 0;
    return count > topCount ? c : top;
  }, null);

  if (!businessId) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-center text-muted-foreground" >{t('biz.registerFirst')}</p>
      </div>
    );
  }

  // ─── Animation Variants ─────────────────────────────────────────
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.04, delayChildren: 0.05 } },
  };
  const itemVariants = {
    hidden: { opacity: 0, y: 12 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' as const } },
  };

  return (
    <div className="space-y-3">
      <motion.div variants={containerVariants} initial="hidden" animate="visible">
      {/* Info Banner */}
      <motion.div variants={itemVariants}>
      <div className="flex items-start gap-2 p-2.5 rounded-lg" style={{ background: 'color-mix(in srgb, var(--primary) 3%, transparent)', border: '1px solid color-mix(in srgb, var(--primary) 8%, transparent)' }}>
        <Info className="h-3.5 w-3.5 shrink-0 mt-0.5 text-primary" />
        <p className="text-[11px] leading-relaxed text-muted-foreground" >
          Kelola data pelanggan Anda. Data pelanggan terintegrasi dengan penjualan dan invoice.
        </p>
      </div>
      </motion.div>

      {/* Header */}
      <motion.div variants={itemVariants}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-base font-bold flex items-center gap-2 text-foreground" >
            <Users className="h-5 w-5 text-primary" />
            {t('biz.customers')}
          </h2>
          <p className="text-xs mt-0.5 text-muted-foreground" >
            {t('biz.totalCustomers')}: <span className="font-semibold text-primary" >{customers.length}</span>
          </p>
        </div>
        <Button
          onClick={openCreateDialog}
          size="sm"
          className="rounded-lg h-8 text-xs"
          style={{ backgroundColor: 'var(--primary)', color: '#000' }}
        >
          <Plus className="h-3.5 w-3.5 mr-1" />
          {t('biz.addCustomer')}
        </Button>
      </div>
      </motion.div>

      {/* Quick Stats Row */}
      <motion.div variants={itemVariants}>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-1.5 sm:gap-2">
        {[
          { label: 'Total Pelanggan', value: customers.length, icon: Users, color: 'var(--primary)' },
          { label: 'Aktif (Transaksi)', value: activeCustomers, icon: ShoppingCart, color: 'var(--secondary)' },
          { label: 'Baru (7 hari)', value: newCustomers, icon: UserPlus, color: 'var(--warning)' },
          { label: 'VIP (>10x)', value: vipCustomers, icon: Star, color: 'var(--destructive)' },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <motion.div key={item.label} whileHover={{ scale: 1.02, y: -1 }} transition={{ type: 'spring', stiffness: 400 }}>
              <Card className="rounded-xl border border-border overflow-hidden">
                <div className="h-[3px]" style={{ background: `linear-gradient(90deg, ${alpha(item.color, 50)}, ${alpha(item.color, 15)})` }} />
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className="h-7 w-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${item.color}15` }}>
                      <Icon className="h-3.5 w-3.5" style={{ color: item.color }} />
                    </div>
                    <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground" >{item.label}</span>
                  </div>
                  <p className="text-lg font-bold tabular-nums text-foreground" >{item.value}</p>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>
      </motion.div>

      {/* Search - full width */}
      <motion.div variants={itemVariants}>
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('common.search') + '...'}
          className="pl-10 pr-10 text-sm rounded-full bg-card border border-border text-foreground focus:border-white/15 transition-all"
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground"
          >
            ×
          </button>
        )}
      </div>
      </motion.div>

      {/* Mobile Card Grid / Desktop Table */}
      <motion.div variants={itemVariants}>
      <Card className="rounded-xl overflow-hidden bg-card border border-border transition-shadow hover:shadow-lg">
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-2 p-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 rounded-lg bg-border" />
              ))}
            </div>
          ) : filteredCustomers.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className="flex flex-col items-center justify-center py-16 px-4 relative"
            >
              {/* Decorative background glow */}
              <div className="absolute w-32 h-32 rounded-full blur-3xl opacity-20" style={{ backgroundColor: alpha(c.primary, 30), top: '20%', left: '50%', transform: 'translateX(-50%)' }} />
              {/* Animated pulse ring */}
              <div className="relative mb-4">
                <div className="absolute inset-0 rounded-2xl animate-ping opacity-10" style={{ backgroundColor: alpha(c.primary, 20) }} />
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.15, duration: 0.4, type: 'spring' }}
                  className="relative h-16 w-16 rounded-2xl flex items-center justify-center border"
                  style={{ background: `linear-gradient(135deg, ${alpha(c.primary, 15)}, ${alpha(c.secondary, 10)})`, borderColor: alpha(c.primary, 20) }}
                >
                  <Users className="h-8 w-8" style={{ color: alpha(c.primary, 60) }} />
                </motion.div>
              </div>
              <motion.p initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="text-sm font-semibold text-foreground" >Belum ada pelanggan</motion.p>
              <motion.p initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} className="text-xs mt-1 text-muted-foreground" >Tambahkan pelanggan pertama Anda</motion.p>
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}>
                <Button onClick={openCreateDialog} size="sm" className="mt-4 rounded-full h-8 text-xs" style={{ background: `linear-gradient(135deg, ${alpha(c.primary, 20)}, ${alpha(c.secondary, 15)})`, color: c.primary }}>
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  {t('biz.addCustomer')}
                </Button>
              </motion.div>
            </motion.div>
          ) : (
            <>
              {/* Mobile Card Grid */}
              <div className="sm:hidden max-h-[500px] overflow-y-auto">
                <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
                  <AnimatePresence mode="popLayout">
                  {filteredCustomers.map((customer, index) => {
                    const totalCount = (customer._count?.invoices || 0) + (customer._count?.sales || 0);
                    const statusBadge = getCustomerStatus(customer);
                    const piutangBalance = customerPiutang[customer.name] || 0;
                    const spending = customerSpending[customer.id];
                    return (
                      <motion.div
                        key={customer.id}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ delay: index * 0.03, duration: 0.2 }}
                        className="p-3 border-b border-border cursor-pointer"
                        onClick={() => setDetailCustomer(customer)}
                        whileHover={{ x: 2 }}
                      >
                        {/* Gradient accent strip */}
                        <div className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l" style={{ background: `linear-gradient(180deg, ${alpha(c.primary, 50)}, ${alpha(c.secondary, 30)})` }} />
                        <div className="flex items-start gap-2.5 pl-1.5">
                          <div className="h-10 w-10 rounded-xl flex items-center justify-center text-sm font-bold shrink-0" style={{ background: `linear-gradient(135deg, ${alpha(c.primary, 20)}, ${alpha(c.primary, 8)})`, color: c.primary }}>
                            {customer.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 mb-1">
                              <p className="text-xs font-semibold truncate text-foreground" >{customer.name}</p>
                              <Badge variant="outline" className="text-[8px] font-semibold px-1.5 py-0 h-4 rounded-full" style={statusBadge.style}>
                                {statusBadge.label}
                              </Badge>
                              {piutangBalance > 0 && (
                                <Badge variant="outline" className="text-[8px] font-semibold px-1.5 py-0 h-4 rounded-full" style={{ backgroundColor: 'color-mix(in srgb, var(--destructive) 8%, transparent)', color: 'var(--destructive)', border: '1px solid color-mix(in srgb, var(--destructive) 15%, transparent)' }}>
                                  Piutang {formatAmount(piutangBalance)}
                                </Badge>
                              )}
                            </div>
                            {/* Contact info */}
                            <div className="flex flex-wrap gap-x-3 gap-y-0.5 mb-1.5">
                              {customer.phone && (
                                <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                                  <Phone className="h-2.5 w-2.5" />
                                  {customer.phone}
                                </span>
                              )}
                              {customer.email && (
                                <span className="flex items-center gap-1 text-[10px] text-muted-foreground truncate max-w-[160px]">
                                  <Mail className="h-2.5 w-2.5 shrink-0" />
                                  {customer.email}
                                </span>
                              )}
                            </div>
                            {/* Spending & method */}
                            <div className="flex items-center gap-2">
                              {spending?.total ? (
                                <span className="flex items-center gap-1 text-[11px] font-bold tabular-nums" style={{ color: c.secondary }}>
                                  <ShoppingBag className="h-3 w-3" />
                                  {formatAmount(spending.total)}
                                </span>
                              ) : (
                                <span className="text-[11px]" style={{ color: c.muted }}>Belum ada transaksi</span>
                              )}
                              {spending?.method && (
                                <span className="text-[9px] px-1.5 py-px rounded-full" style={{ backgroundColor: alpha(c.warning, 7), color: c.warning }}>
                                  {spending.method}
                                </span>
                              )}
                            </div>
                            {/* Transaction count & last date with icons */}
                            <div className="flex items-center gap-3 mt-1">
                              {spending?.txCount ? (
                                <span className="flex items-center gap-1 text-[10px]" style={{ color: c.muted }}>
                                  <Receipt className="h-2.5 w-2.5" />
                                  {spending.txCount} transaksi
                                </span>
                              ) : null}
                              {spending?.lastDate && (
                                <span className="flex items-center gap-1 text-[10px]" style={{ color: c.muted }}>
                                  <Clock className="h-2.5 w-2.5" />
                                  {new Date(spending.lastDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                                </span>
                              )}
                            </div>
                          </div>
                          {/* Action buttons */}
                          <div className="flex items-center gap-0.5 shrink-0">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-9 w-9 p-0 rounded-lg text-muted-foreground hover:text-primary"
                              onClick={() => openEditDialog(customer)}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-9 w-9 p-0 rounded-lg text-muted-foreground hover:text-destructive"
                              onClick={() => setDeleteId(customer.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                  </AnimatePresence>
                </div>
              </div>

              {/* Desktop Table */}
              <div className="hidden sm:block max-h-[500px] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent border-b border-border">
                      <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground" >{t('biz.customerName')}</TableHead>
                      <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground" >Total Belanja</TableHead>
                      <TableHead className="text-[10px] font-semibold uppercase tracking-wider hidden md:table-cell text-muted-foreground" >Metode Utama</TableHead>
                      <TableHead className="text-[10px] font-semibold uppercase tracking-wider hidden lg:table-cell">Transaksi</TableHead>
                      <TableHead className="text-[10px] font-semibold uppercase tracking-wider hidden lg:table-cell">{t('biz.customerPhone')}</TableHead>
                      <TableHead className="w-20" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCustomers.map((customer, index) => {
                      const totalCount = (customer._count?.invoices || 0) + (customer._count?.sales || 0);
                      const statusBadge = getCustomerStatus(customer);
                      const piutangBalance = customerPiutang[customer.name] || 0;
                      const spending = customerSpending[customer.id];
                      const isAlt = index % 2 === 1;

                      return (
                        <TableRow
                          key={customer.id}
                          className="group transition-colors duration-150 cursor-pointer"
                          onClick={() => setDetailCustomer(customer)}
                          style={{
                            background: isAlt ? 'rgba(255,255,255,0.015)' : 'transparent',
                            borderBottom: '1px solid var(--border)',
                            borderLeft: '3px solid transparent',
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.borderLeftColor = `linear-gradient(180deg, ${alpha(c.primary, 50)}, ${alpha(c.secondary, 30)})`}
                          onMouseLeave={(e) => e.currentTarget.style.borderLeftColor = 'transparent'}
                        >
                          <TableCell className="py-2 pl-2.5">
                            <div className="flex items-center gap-2">
                              <div className="h-7 w-7 rounded-lg flex items-center justify-center text-[10px] font-bold shrink-0 bg-primary/12 text-primary">
                                {customer.name.charAt(0).toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <p className="text-xs font-medium truncate text-foreground" >{customer.name}</p>
                                  <Badge variant="outline" className="text-[9px] font-semibold px-1.5 py-0 h-4 rounded-full" style={statusBadge.style}>
                                    {statusBadge.label}
                                  </Badge>
                                  {piutangBalance > 0 && (
                                    <Badge variant="outline" className="text-[9px] font-semibold px-1.5 py-0 h-4 rounded-full" style={{ backgroundColor: 'color-mix(in srgb, var(--destructive) 8%, transparent)', color: 'var(--destructive)', border: '1px solid color-mix(in srgb, var(--destructive) 15%, transparent)' }}>
                                      Piutang
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-xs py-2">
                            <span className="font-bold tabular-nums text-[13px]" style={{ color: spending?.total ? 'var(--secondary)' : 'var(--muted-foreground)' }}>
                              {spending?.total ? formatAmount(spending.total) : '-'}
                            </span>
                            {spending?.lastDate && (
                              <span className="block text-[9px] mt-0.5 text-muted-foreground" >
                                {new Date(spending.lastDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-xs py-2 hidden md:table-cell">
                            {spending?.method ? (
                              <Badge variant="outline" className="text-[9px] font-medium rounded-full px-1.5 py-0 h-5" style={{ backgroundColor: 'color-mix(in srgb, var(--warning) 7%, transparent)', color: 'var(--warning)', border: '1px solid color-mix(in srgb, var(--warning) 12%, transparent)' }}>
                                {spending.method}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground" >-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-xs py-2 hidden lg:table-cell text-muted-foreground" >
                            {spending?.txCount || 0} transaksi
                          </TableCell>
                          <TableCell className="text-xs py-2 hidden lg:table-cell">
                            {piutangBalance > 0 ? (
                              <span className="font-semibold tabular-nums" style={{ color: 'var(--destructive)' }}>
                                {formatAmount(piutangBalance)}
                              </span>
                            ) : (
                              <span className="text-muted-foreground" >-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-xs py-2 hidden xl:table-cell max-w-[150px] truncate text-muted-foreground" >
                            {customer.phone || '-'}
                          </TableCell>
                          <TableCell className="py-2 text-right">
                            <div className="flex items-center justify-end gap-0.5 opacity-60 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-150">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-9 w-9 sm:h-7 sm:w-7 p-0 rounded-md text-muted-foreground"
                                onClick={() => openEditDialog(customer)}
                              >
                                <Pencil className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-9 w-9 sm:h-7 sm:w-7 p-0 rounded-md text-muted-foreground"
                                onClick={() => setDeleteId(customer.id)}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
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
      </motion.div>
      </motion.div>

      {/* Customer Detail Dialog */}
      <Dialog open={!!detailCustomer} onOpenChange={(open) => { if (!open) setDetailCustomer(null); }}>
        <DialogContent className="rounded-2xl w-[95vw] sm:max-w-[560px] bg-[#141414] border-white/[0.08] max-h-[85vh] overflow-y-auto">
          {/* Gradient accent strip */}
          <div className="h-[3px] rounded-t-2xl" style={{ background: `linear-gradient(90deg, ${alpha(c.secondary, 60)}, ${alpha(c.primary, 60)}, ${alpha(c.warning, 60)})` }} />
          {detailCustomer && (() => {
            const spending = customerSpending[detailCustomer.id];
            const piutangBalance = customerPiutang[detailCustomer.name] || 0;
            const statusBadge = getCustomerStatus(detailCustomer);
            const outstandingSales = detailSales.filter((s) => {
              const method = (s.paymentMethod || '').toLowerCase();
              return method === 'cicilan' || method === 'dp' || method === 'hutang' || method === 'pending';
            });
            const outstandingBalance = outstandingSales.reduce((sum, s) => sum + s.amount, 0);
            const unpaidInvoices = detailInvoices.filter(
              (inv) => inv.status !== 'paid' && inv.status !== 'cancelled'
            );
            const unpaidInvoiceTotal = unpaidInvoices.reduce((sum, inv) => sum + inv.total, 0);
            return (
              <>
                <DialogHeader>
                  <DialogTitle className="text-sm font-semibold flex items-center gap-2 text-foreground">
                    <div className="h-8 w-8 rounded-lg flex items-center justify-center bg-primary/12">
                      <span className="text-sm font-bold text-primary">{detailCustomer.name.charAt(0).toUpperCase()}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="truncate">{detailCustomer.name}</span>
                        <Badge variant="outline" className="text-[8px] font-semibold px-1.5 py-0 h-4 rounded-full" style={statusBadge.style}>
                          {statusBadge.label}
                        </Badge>
                      </div>
                    </div>
                  </DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground">
                    Detail pelanggan dan riwayat transaksi
                  </DialogDescription>
                </DialogHeader>

                <Separator className="bg-white/[0.06]" />

                {/* Contact Info */}
                <div className="space-y-1.5">
                  {detailCustomer.phone && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Phone className="h-3.5 w-3.5 shrink-0" style={{ color: c.muted }} />
                      <span>{detailCustomer.phone}</span>
                    </div>
                  )}
                  {detailCustomer.email && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Mail className="h-3.5 w-3.5 shrink-0" style={{ color: c.muted }} />
                      <span className="truncate">{detailCustomer.email}</span>
                    </div>
                  )}
                  {detailCustomer.address && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <MapPin className="h-3.5 w-3.5 shrink-0" style={{ color: c.muted }} />
                      <span className="truncate">{detailCustomer.address}</span>
                    </div>
                  )}
                  {!detailCustomer.phone && !detailCustomer.email && !detailCustomer.address && (
                    <p className="text-[11px] text-muted-foreground italic">Belum ada info kontak</p>
                  )}
                </div>

                <Separator className="bg-white/[0.06]" />

                {/* Stats Row */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="rounded-xl p-2.5 text-center" style={{ background: `linear-gradient(135deg, ${alpha(c.secondary, 12)}, ${alpha(c.secondary, 3)})` }}>
                    <p className="text-[9px] uppercase tracking-wider font-semibold mb-1" style={{ color: c.muted }}>Total Belanja</p>
                    <p className="text-xs font-bold tabular-nums" style={{ color: c.secondary }}>
                      {spending?.total ? formatAmount(spending.total) : '-'}
                    </p>
                  </div>
                  <div className="rounded-xl p-2.5 text-center" style={{ background: `linear-gradient(135deg, ${alpha(c.primary, 12)}, ${alpha(c.primary, 3)})` }}>
                    <p className="text-[9px] uppercase tracking-wider font-semibold mb-1" style={{ color: c.muted }}>Transaksi</p>
                    <p className="text-xs font-bold tabular-nums" style={{ color: c.primary }}>
                      {spending?.txCount || 0}x
                    </p>
                  </div>
                  <div className="rounded-xl p-2.5 text-center" style={{ background: `linear-gradient(135deg, ${alpha(c.warning, 12)}, ${alpha(c.warning, 3)})` }}>
                    <p className="text-[9px] uppercase tracking-wider font-semibold mb-1" style={{ color: c.muted }}>Terakhir</p>
                    <p className="text-[11px] font-bold" style={{ color: c.warning }}>
                      {spending?.lastDate
                        ? new Date(spending.lastDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
                        : '-'}
                    </p>
                  </div>
                </div>

                {/* Outstanding Balance */}
                {(outstandingBalance > 0 || piutangBalance > 0 || unpaidInvoiceTotal > 0) && (
                  <div className="rounded-lg p-3 space-y-2" style={{ backgroundColor: alpha(c.destructive, 5), border: `1px solid ${alpha(c.destructive, 12)}` }}>
                    <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: c.destructive }}>Sisa Tagihan</p>
                    {outstandingBalance > 0 && (
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Belum lunas (cicilan/pending)</span>
                        <span className="text-xs font-bold tabular-nums" style={{ color: c.destructive }}>{formatAmount(outstandingBalance)}</span>
                      </div>
                    )}
                    {unpaidInvoiceTotal > 0 && (
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Tagihan Invoice ({unpaidInvoices.length})</span>
                        <span className="text-xs font-bold tabular-nums" style={{ color: c.destructive }}>{formatAmount(unpaidInvoiceTotal)}</span>
                      </div>
                    )}
                    {piutangBalance > 0 && (
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Piutang (hutang)</span>
                        <span className="text-xs font-bold tabular-nums" style={{ color: c.destructive }}>{formatAmount(piutangBalance)}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between pt-1.5" style={{ borderTop: `1px solid ${alpha(c.destructive, 10)}` }}>
                      <span className="text-xs font-semibold" style={{ color: c.destructive }}>Total Sisa</span>
                      <span className="text-sm font-bold tabular-nums" style={{ color: c.destructive }}>{formatAmount(outstandingBalance + unpaidInvoiceTotal + piutangBalance)}</span>
                    </div>
                  </div>
                )}

                {/* Transaction History */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: c.muted }}>Riwayat Transaksi</p>
                    <span className="text-[10px]" style={{ color: c.muted }}>{detailSales.length} transaksi</span>
                  </div>
                  {detailLoading ? (
                    <div className="space-y-2">
                      {Array.from({ length: 3 }).map((_, i) => (
                        <Skeleton key={i} className="h-10 rounded-lg bg-white/[0.04]" />
                      ))}
                    </div>
                  ) : detailSales.length === 0 ? (
                    <div className="py-4 text-center">
                      <p className="text-[11px]" style={{ color: c.muted }}>Belum ada transaksi untuk pelanggan ini</p>
                    </div>
                  ) : (
                    <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
                      {detailSales.map((sale) => {
                        const method = (sale.paymentMethod || '').toLowerCase();
                        let statusLabel = 'Lunas';
                        let statusColor = c.secondary;
                        if (method === 'cicilan') { statusLabel = 'Cicilan'; statusColor = c.warning; }
                        else if (method === 'pending' || method === 'hutang') { statusLabel = 'Pending'; statusColor = c.muted; }
                        return (
                          <div key={sale.id} className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-white/[0.03] transition-colors">
                            <div className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: alpha(statusColor, 8) }}>
                              <FileText className="h-3.5 w-3.5" style={{ color: statusColor }} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium truncate text-foreground">{sale.description || 'Penjualan'}</p>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="text-[10px] font-mono" style={{ color: c.muted }}>
                                  {new Date(sale.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                                </span>
                                <Badge
                                  variant="outline"
                                  className="text-[8px] font-semibold px-1.5 py-0 h-3.5 rounded-full border-0"
                                  style={{ backgroundColor: alpha(statusColor, 10), color: statusColor }}
                                >
                                  {statusLabel}
                                </Badge>
                              </div>
                            </div>
                            <span className="text-xs font-bold tabular-nums shrink-0" style={{ color: statusColor }}>
                              {formatAmount(sale.amount)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Invoice History */}
                {detailInvoices.length > 0 && (
                  <div>
                    <Separator className="bg-white/[0.06] mb-3" />
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: c.muted }}>Riwayat Invoice</p>
                      <span className="text-[10px]" style={{ color: c.muted }}>{detailInvoices.length} invoice</span>
                    </div>
                    <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
                      {detailInvoices.map((inv) => {
                        let invStatusLabel: string;
                        let invStatusColor: string;
                        switch (inv.status) {
                          case 'paid':
                            invStatusLabel = 'Lunas';
                            invStatusColor = c.secondary;
                            break;
                          case 'overdue':
                            invStatusLabel = 'Jatuh Tempo';
                            invStatusColor = c.destructive;
                            break;
                          case 'cancelled':
                            invStatusLabel = 'Batal';
                            invStatusColor = c.muted;
                            break;
                          default:
                            invStatusLabel = 'Pending';
                            invStatusColor = c.warning;
                        }
                        return (
                          <div key={inv.id} className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-white/[0.03] transition-colors">
                            <div className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: alpha(invStatusColor, 8) }}>
                              <Receipt className="h-3.5 w-3.5" style={{ color: invStatusColor }} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium truncate text-foreground">{inv.invoiceNumber}</p>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="text-[10px] font-mono" style={{ color: c.muted }}>
                                  {new Date(inv.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                                </span>
                                <Badge
                                  variant="outline"
                                  className="text-[8px] font-semibold px-1.5 py-0 h-3.5 rounded-full border-0"
                                  style={{ backgroundColor: alpha(invStatusColor, 10), color: invStatusColor }}
                                >
                                  {invStatusLabel}
                                </Badge>
                                {inv.dueDate && (
                                  <span className="text-[9px] flex items-center gap-0.5" style={{ color: c.muted }}>
                                    <CalendarDays className="h-2 w-2" />
                                    {new Date(inv.dueDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                                  </span>
                                )}
                              </div>
                            </div>
                            <span className="text-xs font-bold tabular-nums shrink-0" style={{ color: invStatusColor }}>
                              {formatAmount(inv.total)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-2 pt-1">
                  {detailCustomer.phone && (
                    <Button
                      variant="outline"
                      onClick={() => {
                        let phone = detailCustomer.phone!.replace(/\D/g, '');
                        if (phone.startsWith('0')) phone = '62' + phone.substring(1);
                        if (!phone.startsWith('62')) phone = '62' + phone;
                        const waUrl = `https://wa.me/${phone}`;
                        const a = document.createElement('a');
                        a.href = waUrl;
                        a.target = '_blank';
                        a.rel = 'noopener noreferrer';
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                      }}
                      className="flex-1 h-9 rounded-lg text-xs"
                      style={{ borderColor: 'rgba(37,211,102,0.3)', color: '#25D366' }}
                    >
                      <MessageCircle className="h-3.5 w-3.5 mr-1" />
                      WhatsApp
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    onClick={() => { openEditDialog(detailCustomer); setDetailCustomer(null); }}
                    className="flex-1 h-9 rounded-lg text-xs"
                    style={{ borderColor: 'var(--border)', color: 'var(--foreground)' }}
                  >
                    <Pencil className="h-3.5 w-3.5 mr-1" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => { setDeleteId(detailCustomer.id); setDetailCustomer(null); }}
                    className="flex-1 h-9 rounded-lg text-xs"
                    style={{ borderColor: alpha(c.destructive, 20), color: c.destructive }}
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-1" />
                    Hapus
                  </Button>
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="rounded-2xl w-[95vw] sm:max-w-[460px] bg-[#141414] border-white/[0.08] p-0">
          {/* Gradient accent strip */}
          <div className="h-[3px] rounded-t-2xl" style={{ background: `linear-gradient(90deg, ${alpha(c.secondary, 60)}, ${alpha(c.primary, 60)}, ${alpha(c.warning, 60)})` }} />
          <DialogHeader className="p-4 sm:p-5 pb-0">
            <DialogTitle className="text-sm font-semibold flex items-center gap-2 text-foreground" >
              <div className="h-7 w-7 rounded-lg flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${alpha(c.primary, 20)}, ${alpha(c.primary, 8)})` }}>
                {editingCustomer ? <Pencil className="h-3.5 w-3.5" style={{ color: c.primary }} /> : <UserPlus className="h-3.5 w-3.5" style={{ color: c.primary }} />}
              </div>
              {editingCustomer ? t('common.edit') : t('biz.addCustomer')}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground" >
              {editingCustomer ? `Edit ${editingCustomer.name}` : t('biz.customerDesc')}
            </DialogDescription>
          </DialogHeader>

          <div className="h-px bg-white/[0.06] mx-4" />

          <form onSubmit={handleSave} className="space-y-3 p-4 sm:p-5">
            <div className="space-y-1.5">
              <Label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground" >
                {t('biz.customerName')} <span className="text-destructive" >*</span>
              </Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder={t('biz.customerName')}
                className="text-sm rounded-xl bg-white/[0.04] border-white/[0.08] text-foreground focus:border-white/15 focus:ring-0"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground" >{t('biz.customerEmail')}</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="email@example.com"
                  className="text-sm rounded-xl bg-white/[0.04] border-white/[0.08] text-foreground focus:border-white/15 focus:ring-0"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground" >{t('biz.customerPhone')}</Label>
                <Input
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+62"
                  className="text-sm rounded-xl bg-white/[0.04] border-white/[0.08] text-foreground focus:border-white/15 focus:ring-0"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground" >{t('biz.customerAddress')}</Label>
              <Input
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder={t('biz.customerAddress')}
                className="text-sm rounded-xl bg-white/[0.04] border-white/[0.08] text-foreground focus:border-white/15 focus:ring-0"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground" >{t('biz.customerNotes')}</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder={t('biz.customerNotes')}
                className="text-sm rounded-lg resize-none min-h-[60px] bg-card border border-border text-foreground"
              />
            </div>

            <div className="h-px bg-white/[0.06]" />

            <DialogFooter className="gap-2 pt-1">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setDialogOpen(false)}
                className="rounded-xl text-xs text-muted-foreground hover:text-foreground"
              >
                {t('common.cancel')}
              </Button>
              <Button
                type="submit"
                disabled={saving || !formData.name.trim()}
                className="rounded-xl text-xs"
                style={{ background: `linear-gradient(135deg, ${alpha(c.secondary, 80)}, ${alpha(c.primary, 80)})`, color: '#000' }}
              >
                {saving && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                {t('common.save')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent className="rounded-xl bg-card border border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-sm text-foreground" >{t('common.delete')}</AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground" >
              {t('kas.deleteDesc')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-lg text-xs" style={{ borderColor: 'var(--border)', color: 'var(--foreground)' }}>
              {t('common.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="rounded-lg text-xs bg-destructive hover:bg-destructive/90 text-foreground border-0"
            >
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
