'use client';

import { useEffect, useState, useCallback } from 'react';
import { useBusinessStore } from '@/store/useBusinessStore';
import { useTranslation } from '@/hooks/useTranslation';
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
import { Plus, Pencil, Trash2, Users, Search, FileText, ShoppingCart, Star, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2 } from 'lucide-react';

interface Customer {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  notes?: string | null;
  _count?: { invoices: number; sales: number };
}

function getCustomerBadge(count: number) {
  if (count === 0) return { label: 'Baru', color: 'bg-[#03DAC6]/20 text-[#03DAC6] border-[#03DAC6]/30' };
  if (count <= 3) return { label: 'Aktif', color: 'bg-[#BB86FC]/20 text-[#BB86FC] border-[#BB86FC]/30' };
  if (count <= 8) return { label: 'Setia', color: 'bg-[#FFD700]/20 text-[#FFD700] border-[#FFD700]/30' };
  return { label: 'VIP', color: 'bg-[#CF6679]/20 text-[#CF6679] border-[#CF6679]/30' };
}

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.06 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 400, damping: 25 } },
};

const cardVariants = {
  hidden: { opacity: 0, scale: 0.92, y: 12 },
  show: { opacity: 1, scale: 1, y: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 24 } },
};

const EmptyStateIllustration = () => (
  <motion.div
    initial={{ opacity: 0, scale: 0.9 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ duration: 0.5, ease: 'easeOut' as const }}
    className="flex flex-col items-center justify-center py-16 px-4"
  >
    <div className="relative mb-6">
      <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#BB86FC]/20 to-[#03DAC6]/10 flex items-center justify-center">
        <Users className="h-10 w-10 text-[#BB86FC]/60" />
      </div>
      <motion.div
        animate={{ y: [0, -4, 0] }}
        transition={{ repeat: Infinity, duration: 2.5, ease: 'easeInOut' as const }}
        className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-[#03DAC6]/20 flex items-center justify-center"
      >
        <UserPlus className="h-4 w-4 text-[#03DAC6]" />
      </motion.div>
    </div>
    <p className="text-white/40 text-sm font-medium">Belum ada pelanggan</p>
    <p className="text-white/25 text-xs mt-1">Tambahkan pelanggan pertama Anda</p>
  </motion.div>
);

export default function BusinessCustomers() {
  const { t } = useTranslation();
  const { activeBusiness } = useBusinessStore();
  const [customers, setCustomers] = useState<Customer[]>([]);
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

  useEffect(() => {
    if (businessId) {
      fetchCustomers();
    } else {
      setLoading(false);
    }
  }, [businessId, fetchCustomers]);

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

  // Stats
  const totalCustomers = customers.length;
  const totalInvoices = customers.reduce((s, c) => s + (c._count?.invoices || 0), 0);
  const totalSales = customers.reduce((s, c) => s + (c._count?.sales || 0), 0);
  const topCustomer = customers.reduce<Customer | null>((top, c) => {
    const count = (c._count?.invoices || 0) + (c._count?.sales || 0);
    const topCount = top ? (top._count?.invoices || 0) + (top._count?.sales || 0) : 0;
    return count > topCount ? c : top;
  }, null);

  if (!businessId) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-white/50 text-center">{t('biz.registerFirst')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
      >
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Users className="h-5 w-5 text-[#BB86FC]" />
            {t('biz.customers')}
          </h2>
          <p className="text-sm text-white/50 mt-1">
            {t('biz.totalCustomers')}: <span className="text-[#BB86FC] font-semibold">{customers.length}</span>
          </p>
        </div>
        <Button onClick={openCreateDialog} size="sm" className="bg-[#BB86FC] text-black hover:bg-[#9B6FDB]">
          <Plus className="h-4 w-4 mr-1" />
          {t('biz.addCustomer')}
        </Button>
      </motion.div>

      {/* Summary Stat Cards */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid grid-cols-2 lg:grid-cols-4 gap-3"
      >
        <motion.div variants={cardVariants}>
          <Card className="bg-[#1A1A2E] border border-white/[0.06] rounded-xl p-4 hover:border-[#BB86FC]/30 transition-colors duration-300">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-[#BB86FC]/15 flex items-center justify-center">
                <Users className="h-4 w-4 text-[#BB86FC]" />
              </div>
              <span className="text-xs text-white/50">Total Pelanggan</span>
            </div>
            <p className="text-xl font-bold text-white">{totalCustomers}</p>
          </Card>
        </motion.div>

        <motion.div variants={cardVariants}>
          <Card className="bg-[#1A1A2E] border border-white/[0.06] rounded-xl p-4 hover:border-[#03DAC6]/30 transition-colors duration-300">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-[#03DAC6]/15 flex items-center justify-center">
                <FileText className="h-4 w-4 text-[#03DAC6]" />
              </div>
              <span className="text-xs text-white/50">Total Invoice</span>
            </div>
            <p className="text-xl font-bold text-white">{totalInvoices}</p>
          </Card>
        </motion.div>

        <motion.div variants={cardVariants}>
          <Card className="bg-[#1A1A2E] border border-white/[0.06] rounded-xl p-4 hover:border-[#FFD700]/30 transition-colors duration-300">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-[#FFD700]/15 flex items-center justify-center">
                <ShoppingCart className="h-4 w-4 text-[#FFD700]" />
              </div>
              <span className="text-xs text-white/50">Total Penjualan</span>
            </div>
            <p className="text-xl font-bold text-white">{totalSales}</p>
          </Card>
        </motion.div>

        <motion.div variants={cardVariants}>
          <Card className="bg-[#1A1A2E] border border-white/[0.06] rounded-xl p-4 hover:border-[#CF6679]/30 transition-colors duration-300">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-[#CF6679]/15 flex items-center justify-center">
                <Star className="h-4 w-4 text-[#CF6679]" />
              </div>
              <span className="text-xs text-white/50">Transaksi Terbanyak</span>
            </div>
            <p className="text-sm font-bold text-white truncate">
              {topCustomer ? topCustomer.name : '-'}
            </p>
            {topCustomer && (
              <p className="text-[10px] text-white/40 mt-0.5">
                {(topCustomer._count?.invoices || 0) + (topCustomer._count?.sales || 0)} transaksi
              </p>
            )}
          </Card>
        </motion.div>
      </motion.div>

      {/* Search */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.4 }}
        className="relative max-w-sm"
      >
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30 transition-colors duration-300" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('common.search') + '...'}
          className="bg-white/[0.05] border-white/[0.1] text-white placeholder:text-white/30 pl-9 pr-10 focus:border-[#BB86FC]/40 focus:ring-1 focus:ring-[#BB86FC]/20 transition-all duration-300"
        />
        <AnimatePresence>
          {search && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.15 }}
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
            >
              ×
            </motion.button>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Table */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.4 }}
      >
        <Card className="bg-[#1A1A2E] border border-white/[0.06] rounded-2xl overflow-hidden">
          <CardContent className="p-0">
            {loading ? (
              <div className="space-y-3 p-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-14 rounded-lg bg-white/[0.06]" />
                ))}
              </div>
            ) : filteredCustomers.length === 0 ? (
              <EmptyStateIllustration />
            ) : (
              <div className="max-h-[500px] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-white/[0.06] hover:bg-transparent">
                      <TableHead className="text-white/50 text-xs">{t('biz.customerName')}</TableHead>
                      <TableHead className="text-white/50 text-xs hidden sm:table-cell">{t('biz.customerEmail')}</TableHead>
                      <TableHead className="text-white/50 text-xs hidden md:table-cell">{t('biz.customerPhone')}</TableHead>
                      <TableHead className="text-white/50 text-xs hidden lg:table-cell">{t('biz.customerAddress')}</TableHead>
                      <TableHead className="text-white/50 text-xs w-28" />
                    </TableRow>
                  </TableHeader>
                  <motion.tbody
                    variants={containerVariants}
                    initial="hidden"
                    animate="show"
                    className="[&_tr:last-child]:border-0"
                  >
                  {filteredCustomers.map((customer, index) => {
                          const totalCount = (customer._count?.invoices || 0) + (customer._count?.sales || 0);
                          const badge = getCustomerBadge(totalCount);
                          const isAlt = index % 2 === 1;

                          return (
                            <motion.tr
                              key={customer.id}
                              variants={itemVariants}
                              className={`border-white/[0.04] hover:bg-white/[0.04] transition-colors duration-200 cursor-default ${isAlt ? 'bg-white/[0.015]' : ''}`}
                            >
                              <TableCell className="py-3">
                                <div className="flex items-center gap-2">
                                  <div>
                                    <div className="flex items-center gap-1.5">
                                      <p className="text-white text-xs font-medium">{customer.name}</p>
                                      <Badge
                                        variant="outline"
                                        className={`text-[9px] font-bold px-1.5 py-0 h-4 border leading-none ${badge.color}`}
                                      >
                                        {badge.label}
                                      </Badge>
                                    </div>
                                    {customer._count && (
                                      <div className="flex items-center gap-2 mt-1">
                                        <span className="inline-flex items-center gap-1 text-[10px] text-white/30">
                                          <FileText className="h-2.5 w-2.5" />
                                          {customer._count.invoices}
                                        </span>
                                        <Separator orientation="vertical" className="h-2.5 bg-white/10" />
                                        <span className="inline-flex items-center gap-1 text-[10px] text-white/30">
                                          <ShoppingCart className="h-2.5 w-2.5" />
                                          {customer._count.sales}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell className="text-white/60 text-xs py-3 hidden sm:table-cell">
                                {customer.email || '-'}
                              </TableCell>
                              <TableCell className="text-white/60 text-xs py-3 hidden md:table-cell">
                                {customer.phone || '-'}
                              </TableCell>
                              <TableCell className="text-white/60 text-xs py-3 max-w-[150px] truncate hidden lg:table-cell">
                                {customer.address || '-'}
                              </TableCell>
                              <TableCell className="py-3 text-right">
                                <div className="flex items-center justify-end gap-1">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0 text-white/40 hover:text-[#BB86FC] hover:bg-[#BB86FC]/10 transition-colors duration-200"
                                    onClick={() => openEditDialog(customer)}
                                  >
                                    <Pencil className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0 text-white/40 hover:text-red-400 hover:bg-red-400/10 transition-colors duration-200"
                                    onClick={() => setDeleteId(customer.id)}
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              </TableCell>
                            </motion.tr>
                          );
                  })}
                  </motion.tbody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-[#1A1A2E] border border-white/[0.06] text-white sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[#BB86FC]/15 flex items-center justify-center">
                {editingCustomer ? <Pencil className="h-4 w-4 text-[#BB86FC]" /> : <UserPlus className="h-4 w-4 text-[#BB86FC]" />}
              </div>
              {editingCustomer ? t('common.edit') : t('biz.addCustomer')}
            </DialogTitle>
            <DialogDescription className="text-white/60">
              {editingCustomer ? `Edit ${editingCustomer.name}` : t('biz.customerName')}
            </DialogDescription>
          </DialogHeader>

          <Separator className="bg-white/[0.06]" />

          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-white/80 text-xs font-medium">{t('biz.customerName')} *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder={t('biz.customerName')}
                className="bg-white/[0.05] border-white/[0.1] text-white placeholder:text-white/30 focus:border-[#BB86FC]/40 focus:ring-1 focus:ring-[#BB86FC]/20 transition-all duration-200"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-white/80 text-xs font-medium">{t('biz.customerEmail')}</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="email@example.com"
                  className="bg-white/[0.05] border-white/[0.1] text-white placeholder:text-white/30 focus:border-[#BB86FC]/40 focus:ring-1 focus:ring-[#BB86FC]/20 transition-all duration-200"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-white/80 text-xs font-medium">{t('biz.customerPhone')}</Label>
                <Input
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+62"
                  className="bg-white/[0.05] border-white/[0.1] text-white placeholder:text-white/30 focus:border-[#BB86FC]/40 focus:ring-1 focus:ring-[#BB86FC]/20 transition-all duration-200"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-white/80 text-xs font-medium">{t('biz.customerAddress')}</Label>
              <Input
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder={t('biz.customerAddress')}
                className="bg-white/[0.05] border-white/[0.1] text-white placeholder:text-white/30 focus:border-[#BB86FC]/40 focus:ring-1 focus:ring-[#BB86FC]/20 transition-all duration-200"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-white/80 text-xs font-medium">{t('biz.customerNotes')}</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder={t('biz.customerNotes')}
                className="bg-white/[0.05] border-white/[0.1] text-white placeholder:text-white/30 min-h-[60px] focus:border-[#BB86FC]/40 focus:ring-1 focus:ring-[#BB86FC]/20 transition-all duration-200 resize-none"
              />
            </div>

            <DialogFooter className="gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
                className="border-white/[0.1] text-white hover:bg-white/10"
              >
                {t('common.cancel')}
              </Button>
              <Button
                type="submit"
                disabled={saving || !formData.name.trim()}
                className="bg-[#BB86FC] text-black hover:bg-[#9B6FDB] transition-colors duration-200"
              >
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t('common.save')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent className="bg-[#1A1A2E] border border-white/[0.06] text-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">{t('common.delete')}</AlertDialogTitle>
            <AlertDialogDescription className="text-white/60">
              {t('kas.deleteDesc')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-white/[0.1] text-white hover:bg-white/10">
              {t('common.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-500 hover:bg-red-600 text-white border-0"
            >
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
