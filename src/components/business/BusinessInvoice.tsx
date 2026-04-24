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
  Plus, Pencil, Trash2, FileText, Download,
  PlusCircle, MinusCircle, Eye, Receipt,
  Clock, CheckCircle2, AlertTriangle, TrendingUp,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.05 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' as const } },
};

const cardHover = {
  rest: { scale: 1 },
  hover: { scale: 1.02, transition: { duration: 0.2 } },
};

interface InvoiceItem {
  description: string;
  qty: number;
  price: number;
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  date: string;
  dueDate: string | null;
  items: InvoiceItem[];
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  status: string;
  notes?: string;
  customer?: { id: string; name: string } | null;
  customerId?: string | null;
}

const STATUS_STYLES: Record<string, { label: string; className: string; dotColor: string; icon: React.ComponentType<{ className?: string }> }> = {
  pending: { label: 'biz.invoicePending', className: 'bg-[#FFD700]/15 text-[#FFD700] border-[#FFD700]/20', dotColor: '#FFD700', icon: Clock },
  paid: { label: 'biz.invoicePaid', className: 'bg-[#03DAC6]/15 text-[#03DAC6] border-[#03DAC6]/20', dotColor: '#03DAC6', icon: CheckCircle2 },
  cancelled: { label: 'biz.invoiceCancelled', className: 'bg-white/[0.05] text-white/40 border-white/10', dotColor: '#666', icon: AlertTriangle },
  overdue: { label: 'biz.invoiceOverdue', className: 'bg-[#CF6679]/15 text-[#CF6679] border-[#CF6679]/20', dotColor: '#CF6679', icon: AlertTriangle },
};

export default function BusinessInvoice() {
  const { t } = useTranslation();
  const { activeBusiness } = useBusinessStore();
  const { formatAmount } = useCurrencyFormat();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [customers, setCustomers] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [viewInvoice, setViewInvoice] = useState<Invoice | null>(null);
  const [formData, setFormData] = useState({
    customerId: '',
    invoiceNumber: '',
    dueDate: '',
    notes: '',
    tax: '',
    discount: '',
    items: [{ description: '', qty: 1, price: 0 }] as InvoiceItem[],
  });
  const [saving, setSaving] = useState(false);
  const [downloading, setDownloading] = useState<string | null>(null);

  const [deleteId, setDeleteId] = useState<string | null>(null);

  const businessId = activeBusiness?.id;

  const fetchInvoices = useCallback(() => {
    if (!businessId) return;
    setLoading(true);
    Promise.all([
      fetch(`/api/business/${businessId}/invoices`).then((r) => (r.ok ? r.json() : [])),
      fetch(`/api/business/${businessId}/customers`).then((r) => (r.ok ? r.json() : [])),
    ])
      .then(([invoicesData, customersData]) => {
        setInvoices(
          (invoicesData?.invoices || []).map((inv: Invoice) => ({
            ...inv,
            items: typeof inv.items === 'string'
              ? (() => { try { return JSON.parse(inv.items); } catch { return []; } })()
              : inv.items,
          }))
        );
        setCustomers(customersData?.customers || []);
      })
      .catch(() => {
        setInvoices([]);
        setCustomers([]);
      })
      .finally(() => setLoading(false));
  }, [businessId]);

  useEffect(() => {
    if (businessId) {
      fetchInvoices();
    } else {
      setLoading(false);
    }
  }, [businessId, fetchInvoices]);

  const openCreateDialog = () => {
    setEditingInvoice(null);
    const num = `INV-${Date.now().toString(36).toUpperCase()}`;
    setFormData({
      customerId: '',
      invoiceNumber: num,
      dueDate: '',
      notes: '',
      tax: '0',
      discount: '0',
      items: [{ description: '', qty: 1, price: 0 }],
    });
    setDialogOpen(true);
  };

  const openEditDialog = (inv: Invoice) => {
    setEditingInvoice(inv);
    setFormData({
      customerId: inv.customerId || '',
      invoiceNumber: inv.invoiceNumber,
      dueDate: inv.dueDate ? inv.dueDate.split('T')[0] : '',
      notes: inv.notes || '',
      tax: inv.tax.toString(),
      discount: inv.discount.toString(),
      items: inv.items.length > 0 ? inv.items : [{ description: '', qty: 1, price: 0 }],
    });
    setDialogOpen(true);
  };

  const updateItem = (index: number, field: keyof InvoiceItem, value: string | number) => {
    const newItems = [...formData.items];
    newItems[index] = { ...newItems[index], [field]: value };
    setFormData({ ...formData, items: newItems });
  };

  const addItem = () => {
    setFormData({ ...formData, items: [...formData.items, { description: '', qty: 1, price: 0 }] });
  };

  const removeItem = (index: number) => {
    if (formData.items.length <= 1) return;
    setFormData({ ...formData, items: formData.items.filter((_, i) => i !== index) });
  };

  const getSubtotal = () => formData.items.reduce((sum, item) => sum + (item.qty * item.price || 0), 0);
  const getTaxAmount = () => getSubtotal() * (parseFloat(formData.tax) || 0) / 100;
  const getDiscountAmount = () => getSubtotal() * (parseFloat(formData.discount) || 0) / 100;
  const getTotal = () => getSubtotal() + getTaxAmount() - getDiscountAmount();

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessId || !formData.invoiceNumber || formData.items.every((i) => !i.description)) return;
    setSaving(true);
    try {
      const url = editingInvoice
        ? `/api/business/${businessId}/invoices/${editingInvoice.id}`
        : `/api/business/${businessId}/invoices`;
      const body: Record<string, unknown> = {
        invoiceNumber: formData.invoiceNumber,
        items: formData.items.filter((i) => i.description.trim()),
        tax: parseFloat(formData.tax) || 0,
        discount: parseFloat(formData.discount) || 0,
        notes: formData.notes || undefined,
      };
      if (formData.customerId) body.customerId = formData.customerId;
      if (formData.dueDate) body.dueDate = formData.dueDate;
      const res = await fetch(url, {
        method: editingInvoice ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error();
      toast.success(editingInvoice ? t('biz.businessUpdated') : t('biz.invoiceGenerated'));
      setDialogOpen(false);
      fetchInvoices();
    } catch {
      toast.error(t('common.error'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!businessId || !deleteId) return;
    try {
      const res = await fetch(`/api/business/${businessId}/invoices/${deleteId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      toast.success(t('biz.businessUpdated'));
      fetchInvoices();
    } catch {
      toast.error(t('common.error'));
    } finally {
      setDeleteId(null);
    }
  };

  const handleDownloadPDF = async (invoiceId: string) => {
    if (!businessId) return;
    setDownloading(invoiceId);
    try {
      const res = await fetch(`/api/business/${businessId}/invoices/${invoiceId}/pdf`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      const byteCharacters = atob(data.pdfBase64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${data.invoiceNumber || 'invoice'}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success(t('biz.downloadPDF'));
    } catch {
      toast.error(t('common.error'));
    } finally {
      setDownloading(null);
    }
  };

  const filteredInvoices = invoices.filter(
    (inv) =>
      inv.invoiceNumber.toLowerCase().includes(search.toLowerCase()) ||
      inv.customer?.name.toLowerCase().includes(search.toLowerCase())
  );

  /* ---- Summary Stats ---- */
  const totalInvoices = invoices.length;
  const paidInvoices = invoices.filter((i) => i.status === 'paid').length;
  const pendingInvoices = invoices.filter((i) => i.status === 'pending').length;
  const overdueInvoices = invoices.filter((i) => i.status === 'overdue').length;
  const totalRevenue = invoices.reduce((s, i) => s + i.total, 0);

  const statCards = [
    { label: t('biz.invoices'), value: totalInvoices, icon: Receipt, color: '#BB86FC', gradient: 'from-[#BB86FC]/20 to-[#BB86FC]/5' },
    { label: t('biz.invoicePaid'), value: paidInvoices, icon: CheckCircle2, color: '#03DAC6', gradient: 'from-[#03DAC6]/20 to-[#03DAC6]/5' },
    { label: t('biz.invoicePending'), value: pendingInvoices, icon: Clock, color: '#FFD700', gradient: 'from-[#FFD700]/20 to-[#FFD700]/5' },
    { label: t('biz.bizRevenue'), value: formatAmount(totalRevenue), icon: TrendingUp, color: '#CF6679', gradient: 'from-[#CF6679]/20 to-[#CF6679]/5' },
  ];

  if (!businessId) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-white/50 text-center">{t('biz.registerFirst')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <motion.div variants={containerVariants} initial="hidden" animate="visible">
        {/* Header */}
        <motion.div variants={itemVariants} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-[#FFD700]/15 flex items-center justify-center">
              <FileText className="h-4 w-4 text-[#FFD700]" />
            </div>
            {t('biz.invoices')}
          </h2>
          <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>
            <Button onClick={openCreateDialog} size="sm" className="bg-gradient-to-r from-[#BB86FC] to-[#9B6FDB] text-black hover:opacity-90 shadow-lg shadow-[#BB86FC]/20">
              <Plus className="h-4 w-4 mr-1" />
              {t('biz.addInvoice')}
            </Button>
          </motion.div>
        </motion.div>

        {/* Summary Stat Cards */}
        {!loading && (
          <motion.div variants={itemVariants} className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
            {statCards.map((card, idx) => (
              <motion.div
                key={idx}
                variants={cardHover}
                initial="rest"
                whileHover="hover"
              >
                <Card className={cn('relative overflow-hidden rounded-2xl border-white/[0.06] bg-gradient-to-br', card.gradient)}>
                  <div className="absolute top-0 right-0 h-20 w-20 rounded-full opacity-10 blur-2xl" style={{ backgroundColor: card.color }} />
                  <CardContent className="p-4 relative">
                    <div className="flex items-center justify-between mb-2">
                      <div className="h-8 w-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${card.color}20` }}>
                        <card.icon className="h-4 w-4" style={{ color: card.color }} />
                      </div>
                      {idx === 3 && overdueInvoices > 0 && (
                        <Badge className="bg-[#CF6679]/20 text-[#CF6679] border-[#CF6679]/20 text-[10px]">
                          {overdueInvoices} {t('biz.invoiceOverdue')}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-white/50">{card.label}</p>
                    <p className="text-xl font-bold text-white mt-0.5">{card.value}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        )}

        {/* Search */}
        <motion.div variants={itemVariants} className="mt-4">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('common.search') + '...'}
            className="bg-white/[0.04] border-white/[0.08] text-white placeholder:text-white/30 max-w-sm focus:border-[#BB86FC]/40 focus:ring-[#BB86FC]/10 rounded-xl"
          />
        </motion.div>

        {/* Table */}
        <motion.div variants={itemVariants} className="mt-4">
          <Card className="bg-[#1A1A2E] border border-white/[0.06] rounded-2xl overflow-hidden">
            <CardContent className="p-0">
              {loading ? (
                <div className="space-y-3 p-4">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 rounded-lg bg-white/[0.06]" />
                  ))}
                </div>
              ) : filteredInvoices.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-white/40">
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.5 }}
                    className="relative"
                  >
                    <div className="h-20 w-20 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center">
                      <FileText className="h-10 w-10 opacity-30" />
                    </div>
                    <div className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-[#BB86FC]/20 flex items-center justify-center">
                      <Plus className="h-3 w-3 text-[#BB86FC]" />
                    </div>
                  </motion.div>
                  <p className="text-sm mt-4 text-white/40">{t('biz.noBizData')}</p>
                  <p className="text-xs mt-1 text-white/25">Create your first invoice to get started</p>
                </div>
              ) : (
                <div className="max-h-[500px] overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-white/[0.06] hover:bg-transparent">
                        <TableHead className="text-white/50 text-xs font-medium">{t('biz.invoiceNumber')}</TableHead>
                        <TableHead className="text-white/50 text-xs font-medium hidden sm:table-cell">{t('biz.invoiceCustomer')}</TableHead>
                        <TableHead className="text-white/50 text-xs font-medium">{t('biz.invoiceStatus')}</TableHead>
                        <TableHead className="text-white/50 text-xs font-medium hidden md:table-cell">{t('biz.invoiceDueDate')}</TableHead>
                        <TableHead className="text-white/50 text-xs font-medium text-right">{t('biz.invoiceTotal')}</TableHead>
                        <TableHead className="text-white/50 text-xs font-medium w-36" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <AnimatePresence>
                        {filteredInvoices.map((inv, idx) => {
                          const statusStyle = STATUS_STYLES[inv.status] || STATUS_STYLES.pending;
                          const StatusIcon = statusStyle.icon;
                          return (
                            <motion.tr
                              key={inv.id}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: idx * 0.03, duration: 0.3 }}
                              className={cn(
                                'border-white/[0.04] transition-colors duration-150 group',
                                idx % 2 === 0 ? 'bg-transparent' : 'bg-white/[0.015]',
                                'hover:bg-white/[0.04]'
                              )}
                            >
                              <TableCell className="text-white text-xs py-3.5 font-medium">
                                <div className="flex items-center gap-2">
                                  <div className="h-1.5 w-1.5 rounded-full shrink-0" style={{ backgroundColor: statusStyle.dotColor }} />
                                  {inv.invoiceNumber}
                                </div>
                              </TableCell>
                              <TableCell className="py-3.5 hidden sm:table-cell">
                                <span className="text-white/60 text-xs">{inv.customer?.name || '-'}</span>
                              </TableCell>
                              <TableCell className="py-3.5">
                                <Badge variant="outline" className={cn('text-[10px] font-medium gap-1 px-2 py-0.5', statusStyle.className)}>
                                  <StatusIcon className="h-3 w-3" />
                                  {t(statusStyle.label)}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-white/60 text-xs py-3.5 hidden md:table-cell">
                                {inv.dueDate ? new Date(inv.dueDate).toLocaleDateString() : '-'}
                              </TableCell>
                              <TableCell className="text-xs text-right font-semibold py-3.5 text-white">
                                {formatAmount(inv.total)}
                              </TableCell>
                              <TableCell className="py-3.5 text-right">
                                <div className="flex items-center justify-end gap-0.5 opacity-60 group-hover:opacity-100 transition-opacity">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0 text-white/40 hover:text-white hover:bg-white/10 rounded-lg"
                                    onClick={() => setViewInvoice(inv)}
                                  >
                                    <Eye className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0 text-white/40 hover:text-[#03DAC6] hover:bg-[#03DAC6]/10 rounded-lg"
                                    onClick={() => handleDownloadPDF(inv.id)}
                                    disabled={downloading === inv.id}
                                  >
                                    {downloading === inv.id ? (
                                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    ) : (
                                      <Download className="h-3.5 w-3.5" />
                                    )}
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0 text-white/40 hover:text-[#BB86FC] hover:bg-[#BB86FC]/10 rounded-lg"
                                    onClick={() => openEditDialog(inv)}
                                  >
                                    <Pencil className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0 text-white/40 hover:text-[#CF6679] hover:bg-[#CF6679]/10 rounded-lg"
                                    onClick={() => setDeleteId(inv.id)}
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
              )}
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>

      {/* View Invoice Dialog */}
      <Dialog open={!!viewInvoice} onOpenChange={(open) => !open && setViewInvoice(null)}>
        <DialogContent className="bg-[#1A1A2E] border border-white/[0.06] text-white sm:max-w-[620px] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-[#BB86FC]/20 flex items-center justify-center">
                <Receipt className="h-3.5 w-3.5 text-[#BB86FC]" />
              </div>
              {viewInvoice?.invoiceNumber}
            </DialogTitle>
            <DialogDescription className="text-white/60">
              {viewInvoice?.customer?.name || '-'}
            </DialogDescription>
          </DialogHeader>
          {viewInvoice && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="space-y-4"
            >
              <div className="flex items-center gap-3 flex-wrap">
                <Badge variant="outline" className={cn('text-xs gap-1', STATUS_STYLES[viewInvoice.status]?.className)}>
                  {(() => { const S = STATUS_STYLES[viewInvoice.status]; const Ic = S?.icon; return Ic ? <Ic className="h-3 w-3" /> : null; })()}
                  {t(STATUS_STYLES[viewInvoice.status]?.label || 'biz.invoicePending')}
                </Badge>
                <span className="text-xs text-white/40">{t('biz.invoiceDate')}: {new Date(viewInvoice.date).toLocaleDateString()}</span>
                {viewInvoice.dueDate && (
                  <span className="text-xs text-white/40">{t('biz.invoiceDueDate')}: {new Date(viewInvoice.dueDate).toLocaleDateString()}</span>
                )}
              </div>
              <div className="max-h-48 overflow-y-auto rounded-xl border border-white/[0.06]">
                <Table>
                  <TableHeader>
                    <TableRow className="border-white/[0.06] hover:bg-transparent bg-white/[0.02]">
                      <TableHead className="text-white/50 text-xs">{t('biz.invoiceItems')}</TableHead>
                      <TableHead className="text-white/50 text-xs text-center">Qty</TableHead>
                      <TableHead className="text-white/50 text-xs text-right">Harga</TableHead>
                      <TableHead className="text-white/50 text-xs text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {viewInvoice.items.map((item, i) => (
                      <TableRow key={i} className={cn('border-white/[0.04] hover:bg-white/[0.02]', i % 2 === 1 && 'bg-white/[0.015]')}>
                        <TableCell className="text-white text-xs py-2">{item.description}</TableCell>
                        <TableCell className="text-white/70 text-xs text-center py-2">{item.qty}</TableCell>
                        <TableCell className="text-white/70 text-xs text-right py-2">{formatAmount(item.price)}</TableCell>
                        <TableCell className="text-white text-xs text-right py-2">{formatAmount(item.qty * item.price)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="bg-white/[0.03] rounded-xl p-4 space-y-1.5 text-xs border border-white/[0.04]">
                <div className="flex justify-between text-white/60">
                  <span>{t('biz.invoiceSubtotal')}</span>
                  <span>{formatAmount(viewInvoice.subtotal)}</span>
                </div>
                {viewInvoice.tax > 0 && (
                  <div className="flex justify-between text-white/60">
                    <span>{t('biz.invoiceTax')} ({viewInvoice.tax}%)</span>
                    <span>{formatAmount(viewInvoice.tax * viewInvoice.subtotal / 100)}</span>
                  </div>
                )}
                {viewInvoice.discount > 0 && (
                  <div className="flex justify-between text-[#03DAC6]">
                    <span>{t('biz.invoiceDiscount')} ({viewInvoice.discount}%)</span>
                    <span>-{formatAmount(viewInvoice.discount * viewInvoice.subtotal / 100)}</span>
                  </div>
                )}
                <div className="flex justify-between text-white font-bold text-base pt-3 border-t border-white/[0.06]">
                  <span>{t('biz.invoiceTotal')}</span>
                  <span>{formatAmount(viewInvoice.total)}</span>
                </div>
              </div>
              {viewInvoice.notes && (
                <p className="text-xs text-white/40 italic">{viewInvoice.notes}</p>
              )}
            </motion.div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              className="border-[#03DAC6]/20 text-[#03DAC6] hover:bg-[#03DAC6]/10 rounded-xl"
              onClick={() => viewInvoice && handleDownloadPDF(viewInvoice.id)}
              disabled={!viewInvoice || downloading === viewInvoice.id}
            >
              {downloading === viewInvoice?.id ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Download className="mr-2 h-4 w-4" />
              )}
              {t('biz.downloadPDF')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-[#1A1A2E] border border-white/[0.06] text-white sm:max-w-[660px] max-h-[90vh] overflow-y-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <div className={cn('h-7 w-7 rounded-lg flex items-center justify-center', editingInvoice ? 'bg-[#FFD700]/20' : 'bg-[#03DAC6]/20')}>
                {editingInvoice ? <Pencil className="h-3.5 w-3.5 text-[#FFD700]" /> : <Plus className="h-3.5 w-3.5 text-[#03DAC6]" />}
              </div>
              {editingInvoice ? t('common.edit') : t('biz.addInvoice')}
            </DialogTitle>
            <DialogDescription className="text-white/60">
              {t('biz.generateInvoice')}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSave} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-white/80 text-xs">{t('biz.invoiceNumber')} *</Label>
                <Input
                  value={formData.invoiceNumber}
                  onChange={(e) => setFormData({ ...formData, invoiceNumber: e.target.value })}
                  placeholder="INV-001"
                  className="bg-white/[0.04] border-white/[0.08] text-white placeholder:text-white/30 rounded-xl focus:border-[#BB86FC]/40"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-white/80 text-xs">{t('biz.invoiceCustomer')}</Label>
                <Select value={formData.customerId} onValueChange={(v) => setFormData({ ...formData, customerId: v })}>
                  <SelectTrigger className="bg-white/[0.04] border-white/[0.08] text-white rounded-xl">
                    <SelectValue placeholder={t('biz.invoiceCustomer')} />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map((c) => (
                      <SelectItem key={c.id} value={c.id} className="text-white">
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-white/80 text-xs">{t('biz.invoiceDueDate')}</Label>
                <Input
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                  className="bg-white/[0.04] border-white/[0.08] text-white rounded-xl focus:border-[#BB86FC]/40"
                />
              </div>
            </div>

            {/* Line Items */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-white/80 text-xs">{t('biz.invoiceItems')} *</Label>
                <Button type="button" variant="ghost" size="sm" onClick={addItem} className="text-[#03DAC6] hover:text-[#03DAC6]/80 hover:bg-[#03DAC6]/10 text-xs">
                  <PlusCircle className="h-3.5 w-3.5 mr-1" />
                  {t('common.add')}
                </Button>
              </div>
              <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
                {formData.items.map((item, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="flex gap-2 items-start"
                  >
                    <Input
                      value={item.description}
                      onChange={(e) => updateItem(idx, 'description', e.target.value)}
                      placeholder="Item"
                      className="flex-1 bg-white/[0.04] border-white/[0.08] text-white placeholder:text-white/30 text-xs h-9 rounded-lg"
                    />
                    <Input
                      type="number"
                      value={item.qty || ''}
                      onChange={(e) => updateItem(idx, 'qty', parseInt(e.target.value) || 0)}
                      placeholder="Qty"
                      min="1"
                      className="w-16 bg-white/[0.04] border-white/[0.08] text-white placeholder:text-white/30 text-xs h-9 rounded-lg"
                    />
                    <Input
                      type="number"
                      value={item.price || ''}
                      onChange={(e) => updateItem(idx, 'price', parseFloat(e.target.value) || 0)}
                      placeholder="Harga"
                      min="0"
                      className="w-28 bg-white/[0.04] border-white/[0.08] text-white placeholder:text-white/30 text-xs h-9 rounded-lg"
                    />
                    {formData.items.length > 1 && (
                      <Button type="button" variant="ghost" size="sm" onClick={() => removeItem(idx)} className="h-9 w-9 p-0 text-white/30 hover:text-[#CF6679] hover:bg-[#CF6679]/10 shrink-0 rounded-lg">
                        <MinusCircle className="h-4 w-4" />
                      </Button>
                    )}
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Tax, Discount */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-white/80 text-xs">{t('biz.invoiceTax')} (%)</Label>
                <Input
                  type="number"
                  value={formData.tax}
                  onChange={(e) => setFormData({ ...formData, tax: e.target.value })}
                  placeholder="0"
                  min="0"
                  className="bg-white/[0.04] border-white/[0.08] text-white placeholder:text-white/30 rounded-xl focus:border-[#BB86FC]/40"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-white/80 text-xs">{t('biz.invoiceDiscount')} (%)</Label>
                <Input
                  type="number"
                  value={formData.discount}
                  onChange={(e) => setFormData({ ...formData, discount: e.target.value })}
                  placeholder="0"
                  min="0"
                  className="bg-white/[0.04] border-white/[0.08] text-white placeholder:text-white/30 rounded-xl focus:border-[#BB86FC]/40"
                />
              </div>
            </div>

            {/* Totals Preview */}
            <motion.div
              layout
              className="bg-gradient-to-br from-white/[0.04] to-white/[0.01] rounded-xl p-4 space-y-1.5 text-xs border border-white/[0.06]"
            >
              <div className="flex justify-between text-white/60">
                <span>{t('biz.invoiceSubtotal')}</span>
                <span>{formatAmount(getSubtotal())}</span>
              </div>
              <div className="flex justify-between text-white/60">
                <span>{t('biz.invoiceTax')}</span>
                <span>+{formatAmount(getTaxAmount())}</span>
              </div>
              <div className="flex justify-between text-[#03DAC6]">
                <span>{t('biz.invoiceDiscount')}</span>
                <span>-{formatAmount(getDiscountAmount())}</span>
              </div>
              <div className="flex justify-between text-white font-bold text-base pt-3 border-t border-white/[0.08]">
                <span>{t('biz.invoiceTotal')}</span>
                <motion.span
                  key={getTotal()}
                  initial={{ scale: 1.1 }}
                  animate={{ scale: 1 }}
                  className="text-[#BB86FC]"
                >
                  {formatAmount(getTotal())}
                </motion.span>
              </div>
            </motion.div>

            {/* Notes */}
            <div className="space-y-2">
              <Label className="text-white/80 text-xs">{t('biz.customerNotes')}</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder={t('biz.customerNotes')}
                className="bg-white/[0.04] border-white/[0.08] text-white placeholder:text-white/30 min-h-[60px] rounded-xl focus:border-[#BB86FC]/40"
              />
            </div>

            <DialogFooter className="gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
                className="border-white/[0.1] text-white hover:bg-white/10 rounded-xl"
              >
                {t('common.cancel')}
              </Button>
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button
                  type="submit"
                  disabled={saving || !formData.invoiceNumber || formData.items.every((i) => !i.description.trim())}
                  className="bg-gradient-to-r from-[#BB86FC] to-[#9B6FDB] text-black hover:opacity-90 rounded-xl shadow-lg shadow-[#BB86FC]/20"
                >
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {editingInvoice ? t('common.save') : t('biz.generateInvoice')}
                </Button>
              </motion.div>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent className="bg-[#1A1A2E] border border-white/[0.06] text-white rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-[#CF6679]/20 flex items-center justify-center">
                <Trash2 className="h-3.5 w-3.5 text-[#CF6679]" />
              </div>
              {t('common.delete')}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-white/60">
              {t('kas.deleteDesc')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-white/[0.1] text-white hover:bg-white/10 rounded-xl">
              {t('common.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-gradient-to-r from-[#CF6679] to-[#B04060] hover:opacity-90 text-white border-0 rounded-xl"
            >
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
