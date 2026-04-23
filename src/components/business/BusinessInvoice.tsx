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
  PlusCircle, MinusCircle, Eye,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

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

const STATUS_STYLES: Record<string, { label: string; className: string }> = {
  pending: { label: 'biz.invoicePending', className: 'bg-[#FFD700]/20 text-[#FFD700]' },
  paid: { label: 'biz.invoicePaid', className: 'bg-[#03DAC6]/20 text-[#03DAC6]' },
  cancelled: { label: 'biz.invoiceCancelled', className: 'bg-white/10 text-white/50' },
  overdue: { label: 'biz.invoiceOverdue', className: 'bg-[#CF6679]/20 text-[#CF6679]' },
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <FileText className="h-5 w-5 text-[#FFD700]" />
          {t('biz.invoices')}
        </h2>
        <Button onClick={openCreateDialog} size="sm" className="bg-[#BB86FC] text-black hover:bg-[#9B6FDB]">
          <Plus className="h-4 w-4 mr-1" />
          {t('biz.addInvoice')}
        </Button>
      </div>

      {/* Search */}
      <Input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder={t('common.search') + '...'}
        className="bg-white/[0.05] border-white/[0.1] text-white placeholder:text-white/30 max-w-sm"
      />

      {/* Table */}
      <Card className="bg-[#1A1A2E] border border-white/[0.06] rounded-2xl">
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-3 p-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 rounded-lg bg-white/[0.06]" />
              ))}
            </div>
          ) : filteredInvoices.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-white/40">
              <FileText className="h-10 w-10 mb-2 opacity-40" />
              <p className="text-sm">{t('biz.noBizData')}</p>
            </div>
          ) : (
            <div className="max-h-[500px] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-white/[0.06] hover:bg-transparent">
                    <TableHead className="text-white/50 text-xs">{t('biz.invoiceNumber')}</TableHead>
                    <TableHead className="text-white/50 text-xs hidden sm:table-cell">{t('biz.invoiceCustomer')}</TableHead>
                    <TableHead className="text-white/50 text-xs">{t('biz.invoiceStatus')}</TableHead>
                    <TableHead className="text-white/50 text-xs hidden md:table-cell">{t('biz.invoiceDueDate')}</TableHead>
                    <TableHead className="text-white/50 text-xs text-right">{t('biz.invoiceTotal')}</TableHead>
                    <TableHead className="text-white/50 text-xs w-32" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInvoices.map((inv) => {
                    const statusStyle = STATUS_STYLES[inv.status] || STATUS_STYLES.pending;
                    return (
                      <TableRow key={inv.id} className="border-white/[0.04] hover:bg-white/[0.02]">
                        <TableCell className="text-white text-xs py-3 font-medium">
                          {inv.invoiceNumber}
                        </TableCell>
                        <TableCell className="py-3 hidden sm:table-cell">
                          <span className="text-white/60 text-xs">{inv.customer?.name || '-'}</span>
                        </TableCell>
                        <TableCell className="py-3">
                          <Badge variant="outline" className={cn('text-xs font-normal border-0', statusStyle.className)}>
                            {t(statusStyle.label)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-white/60 text-xs py-3 hidden md:table-cell">
                          {inv.dueDate ? new Date(inv.dueDate).toLocaleDateString() : '-'}
                        </TableCell>
                        <TableCell className="text-xs text-right font-medium py-3 text-white">
                          {formatAmount(inv.total)}
                        </TableCell>
                        <TableCell className="py-3 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-white/40 hover:text-white hover:bg-white/10"
                            onClick={() => setViewInvoice(inv)}
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-white/40 hover:text-[#BB86FC] hover:bg-white/10"
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
                            className="h-8 w-8 p-0 text-white/40 hover:text-white hover:bg-white/10"
                            onClick={() => openEditDialog(inv)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-white/40 hover:text-red-400 hover:bg-white/10"
                            onClick={() => setDeleteId(inv.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
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

      {/* View Invoice Dialog */}
      <Dialog open={!!viewInvoice} onOpenChange={(open) => !open && setViewInvoice(null)}>
        <DialogContent className="bg-[#1A1A2E] border border-white/[0.06] text-white sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="text-white">{viewInvoice?.invoiceNumber}</DialogTitle>
            <DialogDescription className="text-white/60">
              {viewInvoice?.customer?.name || '-'}
            </DialogDescription>
          </DialogHeader>
          {viewInvoice && (
            <div className="space-y-4">
              <div className="flex gap-4 text-xs text-white/60">
                <span>{t('biz.invoiceDate')}: {new Date(viewInvoice.date).toLocaleDateString()}</span>
                {viewInvoice.dueDate && (
                  <span>{t('biz.invoiceDueDate')}: {new Date(viewInvoice.dueDate).toLocaleDateString()}</span>
                )}
              </div>
              <div className="max-h-48 overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-white/[0.06] hover:bg-transparent">
                      <TableHead className="text-white/50 text-xs">{t('biz.invoiceItems')}</TableHead>
                      <TableHead className="text-white/50 text-xs text-center">Qty</TableHead>
                      <TableHead className="text-white/50 text-xs text-right">Harga</TableHead>
                      <TableHead className="text-white/50 text-xs text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {viewInvoice.items.map((item, i) => (
                      <TableRow key={i} className="border-white/[0.04] hover:bg-transparent">
                        <TableCell className="text-white text-xs py-2">{item.description}</TableCell>
                        <TableCell className="text-white/70 text-xs text-center py-2">{item.qty}</TableCell>
                        <TableCell className="text-white/70 text-xs text-right py-2">{formatAmount(item.price)}</TableCell>
                        <TableCell className="text-white text-xs text-right py-2">{formatAmount(item.qty * item.price)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="space-y-1 text-xs text-right">
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
                <div className="flex justify-between text-white font-bold text-sm pt-2 border-t border-white/[0.06]">
                  <span>{t('biz.invoiceTotal')}</span>
                  <span>{formatAmount(viewInvoice.total)}</span>
                </div>
              </div>
              {viewInvoice.notes && (
                <p className="text-xs text-white/40 italic">{viewInvoice.notes}</p>
              )}
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              className="border-white/[0.1] text-white hover:bg-white/10"
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
        <DialogContent className="bg-[#1A1A2E] border border-white/[0.06] text-white sm:max-w-[640px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white">
              {editingInvoice ? t('common.edit') : t('biz.addInvoice')}
            </DialogTitle>
            <DialogDescription className="text-white/60">
              {t('biz.generateInvoice')}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-white/80">{t('biz.invoiceNumber')} *</Label>
                <Input
                  value={formData.invoiceNumber}
                  onChange={(e) => setFormData({ ...formData, invoiceNumber: e.target.value })}
                  placeholder="INV-001"
                  className="bg-white/[0.05] border-white/[0.1] text-white placeholder:text-white/30"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-white/80">{t('biz.invoiceCustomer')}</Label>
                <Select value={formData.customerId} onValueChange={(v) => setFormData({ ...formData, customerId: v })}>
                  <SelectTrigger className="bg-white/[0.05] border-white/[0.1] text-white">
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
                <Label className="text-white/80">{t('biz.invoiceDueDate')}</Label>
                <Input
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                  className="bg-white/[0.05] border-white/[0.1] text-white"
                />
              </div>
            </div>

            {/* Line Items */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-white/80">{t('biz.invoiceItems')} *</Label>
                <Button type="button" variant="ghost" size="sm" onClick={addItem} className="text-[#BB86FC] hover:text-[#9B6FDB] hover:bg-white/[0.05]">
                  <PlusCircle className="h-4 w-4 mr-1" />
                  {t('common.add')}
                </Button>
              </div>
              <div className="space-y-2 max-h-[200px] overflow-y-auto">
                {formData.items.map((item, idx) => (
                  <div key={idx} className="flex gap-2 items-start">
                    <Input
                      value={item.description}
                      onChange={(e) => updateItem(idx, 'description', e.target.value)}
                      placeholder="Item"
                      className="flex-1 bg-white/[0.05] border-white/[0.1] text-white placeholder:text-white/30 text-xs h-9"
                    />
                    <Input
                      type="number"
                      value={item.qty || ''}
                      onChange={(e) => updateItem(idx, 'qty', parseInt(e.target.value) || 0)}
                      placeholder="Qty"
                      min="1"
                      className="w-16 bg-white/[0.05] border-white/[0.1] text-white placeholder:text-white/30 text-xs h-9"
                    />
                    <Input
                      type="number"
                      value={item.price || ''}
                      onChange={(e) => updateItem(idx, 'price', parseFloat(e.target.value) || 0)}
                      placeholder="Harga"
                      min="0"
                      className="w-28 bg-white/[0.05] border-white/[0.1] text-white placeholder:text-white/30 text-xs h-9"
                    />
                    {formData.items.length > 1 && (
                      <Button type="button" variant="ghost" size="sm" onClick={() => removeItem(idx)} className="h-9 w-9 p-0 text-white/40 hover:text-red-400 shrink-0">
                        <MinusCircle className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Tax, Discount */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-white/80">{t('biz.invoiceTax')} (%)</Label>
                <Input
                  type="number"
                  value={formData.tax}
                  onChange={(e) => setFormData({ ...formData, tax: e.target.value })}
                  placeholder="0"
                  min="0"
                  className="bg-white/[0.05] border-white/[0.1] text-white placeholder:text-white/30"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-white/80">{t('biz.invoiceDiscount')} (%)</Label>
                <Input
                  type="number"
                  value={formData.discount}
                  onChange={(e) => setFormData({ ...formData, discount: e.target.value })}
                  placeholder="0"
                  min="0"
                  className="bg-white/[0.05] border-white/[0.1] text-white placeholder:text-white/30"
                />
              </div>
            </div>

            {/* Totals Preview */}
            <div className="bg-white/[0.03] rounded-xl p-3 space-y-1 text-xs">
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
              <div className="flex justify-between text-white font-bold text-sm pt-2 border-t border-white/[0.06]">
                <span>{t('biz.invoiceTotal')}</span>
                <span>{formatAmount(getTotal())}</span>
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label className="text-white/80">{t('biz.customerNotes')}</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder={t('biz.customerNotes')}
                className="bg-white/[0.05] border-white/[0.1] text-white placeholder:text-white/30 min-h-[60px]"
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
                disabled={saving || !formData.invoiceNumber || formData.items.every((i) => !i.description.trim())}
                className="bg-[#BB86FC] text-black hover:bg-[#9B6FDB]"
              >
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingInvoice ? t('common.save') : t('biz.generateInvoice')}
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
