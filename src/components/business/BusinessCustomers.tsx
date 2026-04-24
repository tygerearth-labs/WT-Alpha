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
import { Plus, Pencil, Trash2, Users, Search, FileText, ShoppingCart, Star, UserPlus, Info } from 'lucide-react';
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
  if (count === 0) return { label: 'Baru', style: { backgroundColor: `${THEME.secondary}15`, color: THEME.secondary, border: `1px solid ${THEME.secondary}25` } };
  if (count <= 3) return { label: 'Aktif', style: { backgroundColor: `${THEME.primary}15`, color: THEME.primary, border: `1px solid ${THEME.primary}25` } };
  if (count <= 8) return { label: 'Setia', style: { backgroundColor: `${THEME.warning}15`, color: THEME.warning, border: `1px solid ${THEME.warning}25` } };
  return { label: 'VIP', style: { backgroundColor: `${THEME.destructive}15`, color: THEME.destructive, border: `1px solid ${THEME.destructive}25` } };
}

export default function BusinessCustomers() {
  const { t } = useTranslation();
  const { activeBusiness } = useBusinessStore();
  const { formatAmount } = useCurrencyFormat();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerSpending, setCustomerSpending] = useState<Record<string, { total: number; method: string | null }>>({});
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
        const spendingMap: Record<string, { total: number; methods: Record<string, number> }> = {};
        const salesWithCustomer = data?.sales || [];
        for (const sale of salesWithCustomer) {
          const custId = sale.customer?.id;
          if (custId) {
            if (!spendingMap[custId]) spendingMap[custId] = { total: 0, methods: {} };
            spendingMap[custId].total += sale.amount || 0;
            const method = sale.paymentMethod || 'Lainnya';
            spendingMap[custId].methods[method] = (spendingMap[custId].methods[method] || 0) + 1;
          }
        }
        const result: Record<string, { total: number; method: string | null }> = {};
        Object.entries(spendingMap).forEach(([id, data]) => {
          const topMethod = Object.entries(data.methods).sort((a, b) => b[1] - a[1])[0]?.[0] || null;
          result[id] = { total: data.total, method: topMethod };
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
        <p className="text-center" style={{ color: THEME.textSecondary }}>{t('biz.registerFirst')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Info Banner */}
      <div className="flex items-start gap-2.5 p-3 rounded-xl" style={{ background: `${THEME.primary}08`, border: `1px solid ${THEME.primary}15` }}>
        <Info className="h-4 w-4 shrink-0 mt-0.5" style={{ color: THEME.primary }} />
        <p className="text-xs leading-relaxed" style={{ color: THEME.textSecondary }}>
          Kelola data pelanggan Anda. Data pelanggan terintegrasi dengan penjualan dan invoice.
        </p>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-base font-bold flex items-center gap-2" style={{ color: THEME.text }}>
            <Users className="h-5 w-5" style={{ color: THEME.primary }} />
            {t('biz.customers')}
          </h2>
          <p className="text-xs mt-0.5" style={{ color: THEME.muted }}>
            {t('biz.totalCustomers')}: <span className="font-semibold" style={{ color: THEME.primary }}>{customers.length}</span>
          </p>
        </div>
        <Button
          onClick={openCreateDialog}
          size="sm"
          className="rounded-lg h-8 text-xs"
          style={{ backgroundColor: THEME.primary, color: '#000' }}
        >
          <Plus className="h-3.5 w-3.5 mr-1" />
          {t('biz.addCustomer')}
        </Button>
      </div>

      {/* Quick Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
        {[
          { label: 'Total Pelanggan', value: customers.length, icon: Users, color: THEME.primary },
          { label: 'Aktif (Transaksi)', value: activeCustomers, icon: ShoppingCart, color: THEME.secondary },
          { label: 'Baru (7 hari)', value: newCustomers, icon: UserPlus, color: THEME.warning },
          { label: 'VIP (>10x)', value: vipCustomers, icon: Star, color: THEME.destructive },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <Card key={item.label} className="rounded-xl" style={cardStyle}>
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="h-7 w-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${item.color}15` }}>
                    <Icon className="h-3.5 w-3.5" style={{ color: item.color }} />
                  </div>
                  <span className="text-[10px] font-medium uppercase tracking-wider" style={{ color: THEME.muted }}>{item.label}</span>
                </div>
                <p className="text-lg font-bold tabular-nums" style={{ color: THEME.text }}>{item.value}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: THEME.muted }} />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('common.search') + '...'}
          className="pl-9 pr-10 text-sm rounded-lg"
          style={inputStyle}
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-xs"
            style={{ color: THEME.muted }}
          >
            ×
          </button>
        )}
      </div>

      {/* Table */}
      <Card className="rounded-xl overflow-hidden" style={cardStyle}>
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-2 p-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 rounded-lg" style={{ background: THEME.border }} />
              ))}
            </div>
          ) : filteredCustomers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4">
              <div className="h-14 w-14 rounded-xl flex items-center justify-center mb-3" style={{ background: THEME.surface, border: `1px solid ${THEME.border}` }}>
                <Users className="h-7 w-7" style={{ color: `${THEME.primary}50` }} />
              </div>
              <p className="text-sm font-medium" style={{ color: THEME.textSecondary }}>Belum ada pelanggan</p>
              <p className="text-xs mt-1" style={{ color: THEME.muted }}>Tambahkan pelanggan pertama Anda</p>
            </div>
          ) : (
            <div className="max-h-[500px] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent" style={{ borderBottom: `1px solid ${THEME.border}` }}>
                    <TableHead className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: THEME.muted }}>{t('biz.customerName')}</TableHead>
                    <TableHead className="text-[10px] font-semibold uppercase tracking-wider hidden sm:table-cell" style={{ color: THEME.muted }}>Total Belanja</TableHead>
                    <TableHead className="text-[10px] font-semibold uppercase tracking-wider hidden md:table-cell" style={{ color: THEME.muted }}>Metode Utama</TableHead>
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
                        className="transition-colors duration-150 cursor-default"
                        style={{
                          background: isAlt ? 'rgba(255,255,255,0.015)' : 'transparent',
                          borderBottom: `1px solid ${THEME.border}`,
                        }}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.03)'; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = isAlt ? 'rgba(255,255,255,0.015)' : 'transparent'; }}
                      >
                        <TableCell className="py-2.5">
                          <div className="flex items-center gap-2">
                            <div className="h-7 w-7 rounded-lg flex items-center justify-center text-[10px] font-bold shrink-0" style={{ backgroundColor: `${THEME.primary}15`, color: THEME.primary }}>
                              {customer.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <p className="text-xs font-medium truncate" style={{ color: THEME.text }}>{customer.name}</p>
                                <Badge variant="outline" className="text-[9px] font-semibold px-1.5 py-0 h-4 rounded-full" style={badge.style}>
                                  {badge.label}
                                </Badge>
                              </div>
                              {customer._count && (
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className="inline-flex items-center gap-0.5 text-[10px]" style={{ color: THEME.muted }}>
                                    <FileText className="h-2.5 w-2.5" />
                                    {customer._count.invoices}
                                  </span>
                                  <Separator orientation="vertical" className="h-2.5" style={{ background: THEME.border }} />
                                  <span className="inline-flex items-center gap-0.5 text-[10px]" style={{ color: THEME.muted }}>
                                    <ShoppingCart className="h-2.5 w-2.5" />
                                    {customer._count.sales}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs py-2.5 hidden sm:table-cell">
                          <span className="font-semibold tabular-nums" style={{ color: spending?.total ? THEME.secondary : THEME.muted }}>
                            {spending?.total ? formatAmount(spending.total) : '-'}
                          </span>
                        </TableCell>
                        <TableCell className="text-xs py-2.5 hidden md:table-cell">
                          {spending?.method ? (
                            <Badge variant="outline" className="text-[9px] font-medium rounded-full px-1.5 py-0 h-5" style={{ backgroundColor: `${THEME.warning}12`, color: THEME.warning, border: `1px solid ${THEME.warning}20` }}>
                              {spending.method}
                            </Badge>
                          ) : (
                            <span style={{ color: THEME.muted }}>-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-xs py-2.5 hidden lg:table-cell max-w-[150px] truncate" style={{ color: THEME.textSecondary }}>
                          {customer.phone || '-'}
                        </TableCell>
                        <TableCell className="py-2.5 text-right">
                          <div className="flex items-center justify-end gap-0.5">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 rounded-lg"
                              style={{ color: THEME.muted }}
                              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = THEME.primary; (e.currentTarget as HTMLElement).style.background = `${THEME.primary}10`; }}
                              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = THEME.muted; (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                              onClick={() => openEditDialog(customer)}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 rounded-lg"
                              style={{ color: THEME.muted }}
                              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = THEME.destructive; (e.currentTarget as HTMLElement).style.background = `${THEME.destructive}10`; }}
                              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = THEME.muted; (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                              onClick={() => setDeleteId(customer.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="rounded-xl sm:max-w-[460px]" style={{ background: THEME.surface, border: `1px solid ${THEME.border}` }}>
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold flex items-center gap-2" style={{ color: THEME.text }}>
              <div className="h-7 w-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${THEME.primary}15` }}>
                {editingCustomer ? <Pencil className="h-3.5 w-3.5" style={{ color: THEME.primary }} /> : <UserPlus className="h-3.5 w-3.5" style={{ color: THEME.primary }} />}
              </div>
              {editingCustomer ? t('common.edit') : t('biz.addCustomer')}
            </DialogTitle>
            <DialogDescription className="text-xs" style={{ color: THEME.textSecondary }}>
              {editingCustomer ? `Edit ${editingCustomer.name}` : t('biz.customerName')}
            </DialogDescription>
          </DialogHeader>

          <Separator style={{ background: THEME.border }} />

          <form onSubmit={handleSave} className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-[11px] font-medium uppercase tracking-wider" style={{ color: THEME.muted }}>
                {t('biz.customerName')} <span style={{ color: THEME.destructive }}>*</span>
              </Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder={t('biz.customerName')}
                className="text-sm rounded-lg"
                style={inputStyle}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-[11px] font-medium uppercase tracking-wider" style={{ color: THEME.muted }}>{t('biz.customerEmail')}</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="email@example.com"
                  className="text-sm rounded-lg"
                  style={inputStyle}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] font-medium uppercase tracking-wider" style={{ color: THEME.muted }}>{t('biz.customerPhone')}</Label>
                <Input
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+62"
                  className="text-sm rounded-lg"
                  style={inputStyle}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[11px] font-medium uppercase tracking-wider" style={{ color: THEME.muted }}>{t('biz.customerAddress')}</Label>
              <Input
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder={t('biz.customerAddress')}
                className="text-sm rounded-lg"
                style={inputStyle}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-[11px] font-medium uppercase tracking-wider" style={{ color: THEME.muted }}>{t('biz.customerNotes')}</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder={t('biz.customerNotes')}
                className="text-sm rounded-lg resize-none min-h-[60px]"
                style={inputStyle}
              />
            </div>

            <DialogFooter className="gap-2 pt-1">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
                className="rounded-lg text-xs"
                style={{ borderColor: THEME.border, color: THEME.text }}
              >
                {t('common.cancel')}
              </Button>
              <Button
                type="submit"
                disabled={saving || !formData.name.trim()}
                className="rounded-lg text-xs"
                style={{ backgroundColor: THEME.primary, color: '#000' }}
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
        <AlertDialogContent className="rounded-xl" style={{ background: THEME.surface, border: `1px solid ${THEME.border}` }}>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-sm" style={{ color: THEME.text }}>{t('common.delete')}</AlertDialogTitle>
            <AlertDialogDescription className="text-xs" style={{ color: THEME.textSecondary }}>
              {t('kas.deleteDesc')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-lg text-xs" style={{ borderColor: THEME.border, color: THEME.text }}>
              {t('common.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="rounded-lg text-xs bg-red-500 hover:bg-red-600 text-white border-0"
            >
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
