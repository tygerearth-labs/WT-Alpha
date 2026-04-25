'use client';

import { useEffect, useState, useCallback } from 'react';
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
import { Plus, Pencil, Trash2, Users, Search, FileText, ShoppingCart, Star, UserPlus, Info, CalendarDays, Phone, Mail, MapPin } from 'lucide-react';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';

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
    fetch(`/api/business/${businessId}/sales?pageSize=200`)
      .then((res) => {
        if (!res.ok) return { sales: [] } as { sales: CustomerSale[] };
        return res.json() as Promise<{ sales: CustomerSale[] }>;
      })
      .then((data) => {
        const spendingMap: Record<string, { total: number; methods: Record<string, number>; txCount: number; lastDate: string }> = {};
        const salesWithCustomer = data?.sales || [];
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
      })
      .catch(() => {});
  }, [businessId]);

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

  const filteredCustomers = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.email?.toLowerCase().includes(search.toLowerCase()) ||
      c.phone?.includes(search)
  );

  // ── Quick Stats ──
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const activeCustomers = customers.filter((c) => {
    if (!c._count?.sales) return false;
    // Use _count as proxy for activity
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

  return (
    <div className="space-y-3">
      {/* Info Banner */}
      <div className="flex items-start gap-2 p-2.5 rounded-lg" style={{ background: 'color-mix(in srgb, var(--primary) 3%, transparent)', border: '1px solid color-mix(in srgb, var(--primary) 8%, transparent)' }}>
        <Info className="h-3.5 w-3.5 shrink-0 mt-0.5 text-primary" />
        <p className="text-[11px] leading-relaxed text-muted-foreground" >
          Kelola data pelanggan Anda. Data pelanggan terintegrasi dengan penjualan dan invoice.
        </p>
      </div>

      {/* Header */}
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

      {/* Quick Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-1.5 sm:gap-2">
        {[
          { label: 'Total Pelanggan', value: customers.length, icon: Users, color: 'var(--primary)' },
          { label: 'Aktif (Transaksi)', value: activeCustomers, icon: ShoppingCart, color: 'var(--secondary)' },
          { label: 'Baru (7 hari)', value: newCustomers, icon: UserPlus, color: 'var(--warning)' },
          { label: 'VIP (>10x)', value: vipCustomers, icon: Star, color: 'var(--destructive)' },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <Card key={item.label} className="rounded-xl bg-card border border-border">
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
          );
        })}
      </div>

      {/* Search - full width */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('common.search') + '...'}
          className="pl-9 pr-10 text-sm rounded-lg bg-card border border-border text-foreground"
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

      {/* Mobile Card Grid / Desktop Table */}
      <Card className="rounded-xl overflow-hidden bg-card border border-border">
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-2 p-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 rounded-lg bg-border" />
              ))}
            </div>
          ) : filteredCustomers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4">
              <div className="h-14 w-14 rounded-xl flex items-center justify-center mb-3 bg-primary/8 border border-primary/15">
                <Users className="h-7 w-7 text-primary" />
              </div>
              <p className="text-sm font-medium text-foreground" >Belum ada pelanggan</p>
              <p className="text-xs mt-1 text-muted-foreground" >Tambahkan pelanggan pertama Anda</p>
              <Button onClick={openCreateDialog} size="sm" className="mt-4 rounded-lg h-8 text-xs bg-primary text-primary-foreground hover:bg-primary/90">
                <Plus className="h-3.5 w-3.5 mr-1" />
                {t('biz.addCustomer')}
              </Button>
            </div>
          ) : (
            <>
              {/* Mobile Card Grid */}
              <div className="sm:hidden max-h-[500px] overflow-y-auto">
                <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
                  <AnimatePresence mode="popLayout">
                  {filteredCustomers.map((customer, index) => {
                    const totalCount = (customer._count?.invoices || 0) + (customer._count?.sales || 0);
                    const badge = getCustomerBadge(totalCount);
                    const spending = customerSpending[customer.id];
                    return (
                      <motion.div
                        key={customer.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ delay: index * 0.03, duration: 0.2 }}
                        className="p-3 border-b border-border"
                      >
                        <div className="flex items-start gap-2.5">
                          <div className="h-10 w-10 rounded-xl flex items-center justify-center text-sm font-bold shrink-0 bg-primary/12 text-primary">
                            {customer.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 mb-1">
                              <p className="text-xs font-semibold truncate text-foreground" >{customer.name}</p>
                              <Badge variant="outline" className="text-[8px] font-semibold px-1.5 py-0 h-4 rounded-full" style={badge.style}>
                                {badge.label}
                              </Badge>
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
                                <span className="text-[11px] font-bold tabular-nums text-secondary" >{formatAmount(spending.total)}</span>
                              ) : (
                                <span className="text-[11px] text-muted-foreground" >Belum ada transaksi</span>
                              )}
                              {spending?.method && (
                                <span className="text-[9px] px-1.5 py-px rounded-full" style={{ backgroundColor: 'color-mix(in srgb, var(--warning) 7%, transparent)', color: 'var(--warning)' }}>
                                  {spending.method}
                                </span>
                              )}
                            </div>
                            {/* Transaction count & last date */}
                            <div className="flex items-center gap-3 mt-1">
                              <span className="text-[10px] text-muted-foreground" >
                                {spending?.txCount || 0} transaksi
                              </span>
                              {spending?.lastDate && (
                                <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground" >
                                  <CalendarDays className="h-2.5 w-2.5" />
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
                              className="h-8 w-8 p-0 rounded-lg text-muted-foreground hover:text-primary"
                              onClick={() => openEditDialog(customer)}
                            >
                              <Pencil className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 rounded-lg text-muted-foreground hover:text-destructive"
                              onClick={() => setDeleteId(customer.id)}
                            >
                              <Trash2 className="h-3 w-3" />
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
                      const badge = getCustomerBadge(totalCount);
                      const spending = customerSpending[customer.id];
                      const isAlt = index % 2 === 1;

                      return (
                        <TableRow
                          key={customer.id}
                          className="group transition-colors duration-150 cursor-default"
                          style={{
                            background: isAlt ? 'rgba(255,255,255,0.015)' : 'transparent',
                            borderBottom: '1px solid var(--border)',
                          }}
                        >
                          <TableCell className="py-2">
                            <div className="flex items-center gap-2">
                              <div className="h-7 w-7 rounded-lg flex items-center justify-center text-[10px] font-bold shrink-0 bg-primary/12 text-primary">
                                {customer.name.charAt(0).toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <p className="text-xs font-medium truncate text-foreground" >{customer.name}</p>
                                  <Badge variant="outline" className="text-[9px] font-semibold px-1.5 py-0 h-4 rounded-full" style={badge.style}>
                                    {badge.label}
                                  </Badge>
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-xs py-2">
                            <span className="font-semibold tabular-nums" style={{ color: spending?.total ? 'var(--secondary)' : 'var(--muted-foreground)' }}>
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
                          <TableCell className="text-xs py-2 hidden lg:table-cell max-w-[150px] truncate text-muted-foreground" >
                            {customer.phone || '-'}
                          </TableCell>
                          <TableCell className="py-2 text-right">
                            <div className="flex items-center justify-end gap-0.5 opacity-60 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-150">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0 rounded-md text-muted-foreground"
                                onClick={() => openEditDialog(customer)}
                              >
                                <Pencil className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0 rounded-md text-muted-foreground"
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

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="rounded-xl sm:max-w-[460px] bg-card border border-border">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold flex items-center gap-2 text-foreground" >
              <div className="h-7 w-7 rounded-lg flex items-center justify-center bg-primary/12">
                {editingCustomer ? <Pencil className="h-3.5 w-3.5 text-primary" /> : <UserPlus className="h-3.5 w-3.5 text-primary" />}
              </div>
              {editingCustomer ? t('common.edit') : t('biz.addCustomer')}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground" >
              {editingCustomer ? `Edit ${editingCustomer.name}` : t('biz.customerDesc')}
            </DialogDescription>
          </DialogHeader>

          <Separator className="bg-border" />

          <form onSubmit={handleSave} className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground" >
                {t('biz.customerName')} <span className="text-destructive" >*</span>
              </Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder={t('biz.customerName')}
                className="text-sm rounded-lg bg-card border border-border text-foreground"
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
                  className="text-sm rounded-lg bg-card border border-border text-foreground"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground" >{t('biz.customerPhone')}</Label>
                <Input
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+62"
                  className="text-sm rounded-lg bg-card border border-border text-foreground"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground" >{t('biz.customerAddress')}</Label>
              <Input
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder={t('biz.customerAddress')}
                className="text-sm rounded-lg bg-card border border-border text-foreground"
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

            <DialogFooter className="gap-2 pt-1">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
                className="rounded-lg text-xs"
                style={{ borderColor: 'var(--border)', color: 'var(--foreground)' }}
              >
                {t('common.cancel')}
              </Button>
              <Button
                type="submit"
                disabled={saving || !formData.name.trim()}
                className="rounded-lg text-xs"
                style={{ backgroundColor: 'var(--primary)', color: '#000' }}
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
