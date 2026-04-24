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
  Landmark, Star, Info,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';
import { AnimatePresence } from 'framer-motion';

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

const STATUS_STYLES: Record<string, { label: string; dotColor: string; icon: React.ComponentType<{ className?: string }>; bg: string; color: string }> = {
  pending: { label: 'biz.invoicePending', dotColor: THEME.warning, icon: Clock, bg: `${THEME.warning}15`, color: THEME.warning },
  paid: { label: 'biz.invoicePaid', dotColor: THEME.secondary, icon: CheckCircle2, bg: `${THEME.secondary}15`, color: THEME.secondary },
  cancelled: { label: 'biz.invoiceCancelled', dotColor: '#666', icon: AlertTriangle, bg: 'rgba(255,255,255,0.05)', color: THEME.muted },
  overdue: { label: 'biz.invoiceOverdue', dotColor: THEME.destructive, icon: AlertTriangle, bg: `${THEME.destructive}15`, color: THEME.destructive },
};

const inputCls = 'bg-transparent border text-white placeholder:text-white/30 rounded-lg focus:ring-1';
const inputBorder = `1px solid ${THEME.border}`;

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

  /* ---- Bank Accounts ---- */
  interface BankAccountInfo {
    id: string;
    bankName: string;
    accountNumber: string;
    accountHolder: string;
    isDefault: boolean;
    displayOrder: number;
  }
  const [bankAccounts, setBankAccounts] = useState<BankAccountInfo[]>([]);

  const businessId = activeBusiness?.id;

  const fetchBankAccounts = useCallback(() => {
    if (!businessId) return;
    fetch(`/api/business/${businessId}/bank-accounts`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setBankAccounts(data.bankAccounts || []))
      .catch(() => setBankAccounts([]));
  }, [businessId]);

  useEffect(() => {
    if (businessId) fetchBankAccounts();
  }, [businessId, fetchBankAccounts]);

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
    { label: t('biz.invoices'), value: totalInvoices, icon: Receipt, color: THEME.primary },
    { label: t('biz.invoicePaid'), value: paidInvoices, icon: CheckCircle2, color: THEME.secondary },
    { label: t('biz.invoicePending'), value: pendingInvoices, icon: Clock, color: THEME.warning },
    { label: t('biz.bizRevenue'), value: formatAmount(totalRevenue), icon: TrendingUp, color: THEME.destructive },
  ];

  if (!businessId) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p style={{ color: THEME.textSecondary }} className="text-center">{t('biz.registerFirst')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Info Banner */}
      <div
        className="flex items-start gap-2.5 p-3 rounded-lg text-[11px]"
        style={{ background: `${THEME.primary}08`, border: `1px solid ${THEME.primary}20` }}
      >
        <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" style={{ color: THEME.primary }} />
        <span style={{ color: THEME.textSecondary }}>
          Kelola invoice/tagihan pelanggan. Invoice cicilan dibuat otomatis dari penjualan cicilan.
        </span>
      </div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h2 className="text-base font-bold flex items-center gap-2" style={{ color: THEME.text }}>
          <div className="h-7 w-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${THEME.warning}20` }}>
            <FileText className="h-3.5 w-3.5" style={{ color: THEME.warning }} />
          </div>
          {t('biz.invoices')}
        </h2>
        <Button onClick={openCreateDialog} size="sm" style={{ backgroundColor: THEME.primary, color: '#000' }} className="hover:opacity-90 rounded-lg">
          <Plus className="h-3.5 w-3.5 mr-1" />
          {t('biz.addInvoice')}
        </Button>
      </div>

      {/* Summary Stat Cards */}
      {!loading && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
          {statCards.map((card, idx) => (
            <Card key={idx} className="rounded-xl overflow-hidden" style={{ background: THEME.surface, border: `1px solid ${THEME.border}` }}>
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="h-7 w-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${card.color}20` }}>
                    <card.icon className="h-3.5 w-3.5" style={{ color: card.color }} />
                  </div>
                  {idx === 3 && overdueInvoices > 0 && (
                    <Badge className="text-[10px] px-1.5 py-0" style={{ backgroundColor: `${THEME.destructive}20`, color: THEME.destructive, border: `1px solid ${THEME.destructive}30` }}>
                      {overdueInvoices} {t('biz.invoiceOverdue')}
                    </Badge>
                  )}
                </div>
                <p className="text-[11px]" style={{ color: THEME.muted }}>{card.label}</p>
                <p className="text-sm font-bold mt-0.5" style={{ color: THEME.text }}>{card.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Search */}
      <Input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder={t('common.search') + '...'}
        className="max-w-sm text-sm"
        style={{ background: THEME.surface, border: inputBorder, color: THEME.text }}
      />

      {/* Table */}
      <Card className="rounded-xl overflow-hidden" style={{ background: THEME.surface, border: `1px solid ${THEME.border}` }}>
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-2 p-3 sm:p-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10 rounded-lg" style={{ background: `${THEME.border}` }} />
              ))}
            </div>
          ) : filteredInvoices.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="h-16 w-16 rounded-xl flex items-center justify-center" style={{ background: THEME.surface, border: `1px solid ${THEME.border}` }}>
                <FileText className="h-8 w-8 opacity-20" />
              </div>
              <p className="text-sm mt-3" style={{ color: THEME.muted }}>{t('biz.noBizData')}</p>
              <p className="text-xs mt-1" style={{ color: THEME.muted }}>Create your first invoice to get started</p>
            </div>
          ) : (
            <div className="max-h-[500px] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow style={{ borderBottom: `1px solid ${THEME.border}` }} className="hover:bg-transparent">
                    <TableHead className="text-[11px] font-medium" style={{ color: THEME.muted }}>{t('biz.invoiceNumber')}</TableHead>
                    <TableHead className="text-[11px] font-medium hidden sm:table-cell" style={{ color: THEME.muted }}>{t('biz.invoiceCustomer')}</TableHead>
                    <TableHead className="text-[11px] font-medium" style={{ color: THEME.muted }}>{t('biz.invoiceStatus')}</TableHead>
                    <TableHead className="text-[11px] font-medium hidden md:table-cell" style={{ color: THEME.muted }}>{t('biz.invoiceDueDate')}</TableHead>
                    <TableHead className="text-[11px] font-medium text-right" style={{ color: THEME.muted }}>{t('biz.invoiceTotal')}</TableHead>
                    <TableHead className="text-[11px] font-medium w-32" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <AnimatePresence>
                    {filteredInvoices.map((inv) => {
                      const statusStyle = STATUS_STYLES[inv.status] || STATUS_STYLES.pending;
                      const StatusIcon = statusStyle.icon;
                      return (
                        <tr
                          key={inv.id}
                          className="transition-colors duration-150 group cursor-default"
                          style={{ borderBottom: `1px solid ${THEME.border}` }}
                        >
                          <TableCell className="text-xs py-2 font-medium" style={{ color: THEME.text }}>
                            <div className="flex items-center gap-2">
                              <div className="h-1.5 w-1.5 rounded-full shrink-0" style={{ backgroundColor: statusStyle.dotColor }} />
                              {inv.invoiceNumber}
                            </div>
                          </TableCell>
                          <TableCell className="py-2 hidden sm:table-cell">
                            <span className="text-xs" style={{ color: THEME.textSecondary }}>{inv.customer?.name || '-'}</span>
                          </TableCell>
                          <TableCell className="py-2">
                            <Badge variant="outline" className="text-[10px] font-medium gap-1 px-1.5 py-0.5 rounded-md" style={{ backgroundColor: statusStyle.bg, color: statusStyle.color, borderColor: 'transparent' }}>
                              <StatusIcon className="h-2.5 w-2.5" />
                              {t(statusStyle.label)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs py-2 hidden md:table-cell" style={{ color: THEME.textSecondary }}>
                            {inv.dueDate ? new Date(inv.dueDate).toLocaleDateString() : '-'}
                          </TableCell>
                          <TableCell className="text-xs text-right font-semibold py-2" style={{ color: THEME.text }}>
                            {formatAmount(inv.total)}
                          </TableCell>
                          <TableCell className="py-2 text-right">
                            <div className="flex items-center justify-end gap-0.5 opacity-60 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0 rounded-md hover:bg-white/10" style={{ color: THEME.muted }} onClick={() => setViewInvoice(inv)}>
                                <Eye className="h-3 w-3" />
                              </Button>
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0 rounded-md hover:bg-white/10" style={{ color: THEME.muted }} onClick={() => handleDownloadPDF(inv.id)} disabled={downloading === inv.id}>
                                {downloading === inv.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />}
                              </Button>
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0 rounded-md hover:bg-white/10" style={{ color: THEME.muted }} onClick={() => openEditDialog(inv)}>
                                <Pencil className="h-3 w-3" />
                              </Button>
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0 rounded-md hover:bg-white/10" style={{ color: THEME.muted }} onClick={() => setDeleteId(inv.id)}>
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </TableCell>
                        </tr>
                      );
                    })}
                  </AnimatePresence>
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* View Invoice Dialog */}
      <Dialog open={!!viewInvoice} onOpenChange={(open) => !open && setViewInvoice(null)}>
        <DialogContent className="sm:max-w-[580px] rounded-xl" style={{ background: THEME.surface, border: `1px solid ${THEME.border}` }}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2" style={{ color: THEME.text }}>
              <div className="h-6 w-6 rounded-md flex items-center justify-center" style={{ backgroundColor: `${THEME.primary}20` }}>
                <Receipt className="h-3 w-3" style={{ color: THEME.primary }} />
              </div>
              {viewInvoice?.invoiceNumber}
            </DialogTitle>
            <DialogDescription style={{ color: THEME.textSecondary }}>
              {viewInvoice?.customer?.name || '-'}
            </DialogDescription>
          </DialogHeader>
          {viewInvoice && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className="text-[10px] gap-1 px-1.5 py-0.5 rounded-md" style={{ backgroundColor: (STATUS_STYLES[viewInvoice.status]?.bg), color: (STATUS_STYLES[viewInvoice.status]?.color), borderColor: 'transparent' }}>
                  {(() => { const S = STATUS_STYLES[viewInvoice.status]; const Ic = S?.icon; return Ic ? <Ic className="h-2.5 w-2.5" /> : null; })()}
                  {t(STATUS_STYLES[viewInvoice.status]?.label || 'biz.invoicePending')}
                </Badge>
                <span className="text-[11px]" style={{ color: THEME.muted }}>{t('biz.invoiceDate')}: {new Date(viewInvoice.date).toLocaleDateString()}</span>
                {viewInvoice.dueDate && (
                  <span className="text-[11px]" style={{ color: THEME.muted }}>{t('biz.invoiceDueDate')}: {new Date(viewInvoice.dueDate).toLocaleDateString()}</span>
                )}
              </div>
              <div className="max-h-44 overflow-y-auto rounded-lg" style={{ border: `1px solid ${THEME.border}` }}>
                <Table>
                  <TableHeader>
                    <TableRow style={{ borderBottom: `1px solid ${THEME.border}` }} className="hover:bg-transparent">
                      <TableHead className="text-[11px]" style={{ color: THEME.muted }}>{t('biz.invoiceItems')}</TableHead>
                      <TableHead className="text-[11px] text-center" style={{ color: THEME.muted }}>Qty</TableHead>
                      <TableHead className="text-[11px] text-right" style={{ color: THEME.muted }}>Harga</TableHead>
                      <TableHead className="text-[11px] text-right" style={{ color: THEME.muted }}>Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {viewInvoice.items.map((item, i) => (
                      <TableRow key={i} style={{ borderBottom: `1px solid ${THEME.border}` }}>
                        <TableCell className="text-xs py-1.5" style={{ color: THEME.text }}>{item.description}</TableCell>
                        <TableCell className="text-xs text-center py-1.5" style={{ color: THEME.textSecondary }}>{item.qty}</TableCell>
                        <TableCell className="text-xs text-right py-1.5" style={{ color: THEME.textSecondary }}>{formatAmount(item.price)}</TableCell>
                        <TableCell className="text-xs text-right py-1.5 font-medium" style={{ color: THEME.text }}>{formatAmount(item.qty * item.price)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="rounded-lg p-3 space-y-1 text-xs" style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${THEME.border}` }}>
                <div className="flex justify-between" style={{ color: THEME.textSecondary }}>
                  <span>{t('biz.invoiceSubtotal')}</span>
                  <span>{formatAmount(viewInvoice.subtotal)}</span>
                </div>
                {viewInvoice.tax > 0 && (
                  <div className="flex justify-between" style={{ color: THEME.textSecondary }}>
                    <span>{t('biz.invoiceTax')} ({viewInvoice.tax}%)</span>
                    <span>{formatAmount(viewInvoice.tax * viewInvoice.subtotal / 100)}</span>
                  </div>
                )}
                {viewInvoice.discount > 0 && (
                  <div className="flex justify-between" style={{ color: THEME.secondary }}>
                    <span>{t('biz.invoiceDiscount')} ({viewInvoice.discount}%)</span>
                    <span>-{formatAmount(viewInvoice.discount * viewInvoice.subtotal / 100)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-sm pt-2" style={{ color: THEME.text, borderTop: `1px solid ${THEME.border}` }}>
                  <span>{t('biz.invoiceTotal')}</span>
                  <span>{formatAmount(viewInvoice.total)}</span>
                </div>
              </div>
              {viewInvoice.notes && (
                <p className="text-[11px] italic" style={{ color: THEME.muted }}>{viewInvoice.notes}</p>
              )}

              {/* Bank Accounts Display */}
              {bankAccounts.length > 0 && (
                <div className="rounded-lg p-3" style={{ border: `1px solid ${THEME.border}`, background: 'rgba(255,255,255,0.02)' }}>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="h-5 w-5 rounded-md flex items-center justify-center" style={{ backgroundColor: `${THEME.secondary}20` }}>
                      <Landmark className="h-2.5 w-2.5" style={{ color: THEME.secondary }} />
                    </div>
                    <p className="text-[11px] font-semibold" style={{ color: THEME.textSecondary }}>Rekening Pembayaran</p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {bankAccounts.map((acc) => (
                      <div
                        key={acc.id}
                        className="flex items-start gap-2 p-2 rounded-lg transition-colors"
                        style={{
                          backgroundColor: acc.isDefault ? `${THEME.secondary}08` : 'transparent',
                          border: `1px solid ${acc.isDefault ? `${THEME.secondary}30` : THEME.border}`,
                        }}
                      >
                        <div className="h-7 w-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5" style={{ backgroundColor: acc.isDefault ? `${THEME.secondary}15` : 'rgba(255,255,255,0.04)' }}>
                          <Landmark className="h-3 w-3" style={{ color: acc.isDefault ? THEME.secondary : THEME.muted }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="text-[11px] font-medium truncate" style={{ color: THEME.text }}>{acc.bankName}</p>
                            {acc.isDefault && (
                              <Badge className="text-[8px] px-1 py-0" style={{ backgroundColor: `${THEME.secondary}15`, color: THEME.secondary, border: 'transparent' }}>
                                <Star className="h-1.5 w-1.5 mr-0.5" />
                                Utama
                              </Badge>
                            )}
                          </div>
                          <p className="text-[10px] font-mono mt-0.5" style={{ color: THEME.textSecondary }}>{acc.accountNumber}</p>
                          <p className="text-[10px] mt-0.5" style={{ color: THEME.muted }}>a.n. {acc.accountHolder}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              className="rounded-lg"
              style={{ borderColor: `${THEME.secondary}30`, color: THEME.secondary }}
              onClick={() => viewInvoice && handleDownloadPDF(viewInvoice.id)}
              disabled={!viewInvoice || downloading === viewInvoice.id}
            >
              {downloading === viewInvoice?.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
              {t('biz.downloadPDF')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto rounded-xl" style={{ background: THEME.surface, border: `1px solid ${THEME.border}` }}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2" style={{ color: THEME.text }}>
              <div className="h-6 w-6 rounded-md flex items-center justify-center" style={{ backgroundColor: editingInvoice ? `${THEME.warning}20` : `${THEME.secondary}20` }}>
                {editingInvoice ? <Pencil className="h-3 w-3" style={{ color: editingInvoice ? THEME.warning : THEME.secondary }} /> : <Plus className="h-3 w-3" style={{ color: THEME.secondary }} />}
              </div>
              {editingInvoice ? t('common.edit') : t('biz.addInvoice')}
            </DialogTitle>
            <DialogDescription style={{ color: THEME.textSecondary }}>
              {t('biz.generateInvoice')}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-[11px]" style={{ color: THEME.textSecondary }}>{t('biz.invoiceNumber')} *</Label>
                <Input
                  value={formData.invoiceNumber}
                  onChange={(e) => setFormData({ ...formData, invoiceNumber: e.target.value })}
                  placeholder="INV-001"
                  className="text-sm h-9 rounded-lg"
                  style={{ background: THEME.surface, border: inputBorder, color: THEME.text }}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px]" style={{ color: THEME.textSecondary }}>{t('biz.invoiceCustomer')}</Label>
                <Select value={formData.customerId} onValueChange={(v) => setFormData({ ...formData, customerId: v })}>
                  <SelectTrigger className="text-sm h-9 rounded-lg" style={{ background: THEME.surface, border: inputBorder, color: THEME.text }}>
                    <SelectValue placeholder={t('biz.invoiceCustomer')} />
                  </SelectTrigger>
                  <SelectContent style={{ background: THEME.surface, border: `1px solid ${THEME.border}` }}>
                    {customers.map((c) => (
                      <SelectItem key={c.id} value={c.id} style={{ color: THEME.text }}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px]" style={{ color: THEME.textSecondary }}>{t('biz.invoiceDueDate')}</Label>
                <Input
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                  className="text-sm h-9 rounded-lg"
                  style={{ background: THEME.surface, border: inputBorder, color: THEME.text }}
                />
              </div>
            </div>

            {/* Line Items */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-[11px]" style={{ color: THEME.textSecondary }}>{t('biz.invoiceItems')} *</Label>
                <Button type="button" variant="ghost" size="sm" onClick={addItem} className="text-xs" style={{ color: THEME.secondary }}>
                  <PlusCircle className="h-3.5 w-3.5 mr-1" />
                  {t('common.add')}
                </Button>
              </div>
              <div className="space-y-1.5 max-h-[200px] overflow-y-auto pr-1">
                {formData.items.map((item, idx) => (
                  <div key={idx} className="flex gap-1.5 items-start">
                    <Input
                      value={item.description}
                      onChange={(e) => updateItem(idx, 'description', e.target.value)}
                      placeholder="Item"
                      className="flex-1 text-xs h-8 rounded-md"
                      style={{ background: THEME.surface, border: inputBorder, color: THEME.text }}
                    />
                    <Input
                      type="number"
                      value={item.qty || ''}
                      onChange={(e) => updateItem(idx, 'qty', parseInt(e.target.value) || 0)}
                      placeholder="Qty"
                      min="1"
                      className="w-14 text-xs h-8 rounded-md"
                      style={{ background: THEME.surface, border: inputBorder, color: THEME.text }}
                    />
                    <Input
                      type="number"
                      value={item.price || ''}
                      onChange={(e) => updateItem(idx, 'price', parseFloat(e.target.value) || 0)}
                      placeholder="Harga"
                      min="0"
                      className="w-24 text-xs h-8 rounded-md"
                      style={{ background: THEME.surface, border: inputBorder, color: THEME.text }}
                    />
                    {formData.items.length > 1 && (
                      <Button type="button" variant="ghost" size="sm" onClick={() => removeItem(idx)} className="h-8 w-8 p-0 shrink-0 rounded-md" style={{ color: THEME.muted }}>
                        <MinusCircle className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Tax, Discount */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-[11px]" style={{ color: THEME.textSecondary }}>{t('biz.invoiceTax')} (%)</Label>
                <Input type="number" value={formData.tax} onChange={(e) => setFormData({ ...formData, tax: e.target.value })} placeholder="0" min="0" className="text-sm h-9 rounded-lg" style={{ background: THEME.surface, border: inputBorder, color: THEME.text }} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px]" style={{ color: THEME.textSecondary }}>{t('biz.invoiceDiscount')} (%)</Label>
                <Input type="number" value={formData.discount} onChange={(e) => setFormData({ ...formData, discount: e.target.value })} placeholder="0" min="0" className="text-sm h-9 rounded-lg" style={{ background: THEME.surface, border: inputBorder, color: THEME.text }} />
              </div>
            </div>

            {/* Totals Preview */}
            <div className="rounded-lg p-3 space-y-1 text-xs" style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${THEME.border}` }}>
              <div className="flex justify-between" style={{ color: THEME.textSecondary }}>
                <span>{t('biz.invoiceSubtotal')}</span>
                <span>{formatAmount(getSubtotal())}</span>
              </div>
              <div className="flex justify-between" style={{ color: THEME.textSecondary }}>
                <span>{t('biz.invoiceTax')}</span>
                <span>+{formatAmount(getTaxAmount())}</span>
              </div>
              <div className="flex justify-between" style={{ color: THEME.secondary }}>
                <span>{t('biz.invoiceDiscount')}</span>
                <span>-{formatAmount(getDiscountAmount())}</span>
              </div>
              <div className="flex justify-between font-bold text-sm pt-2" style={{ color: THEME.text, borderTop: `1px solid ${THEME.border}` }}>
                <span>{t('biz.invoiceTotal')}</span>
                <span style={{ color: THEME.primary }}>{formatAmount(getTotal())}</span>
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <Label className="text-[11px]" style={{ color: THEME.textSecondary }}>{t('biz.customerNotes')}</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder={t('biz.customerNotes')}
                className="text-xs min-h-[56px] rounded-lg resize-none"
                style={{ background: THEME.surface, border: inputBorder, color: THEME.text }}
              />
            </div>

            <DialogFooter className="gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
                className="rounded-lg"
                style={{ borderColor: THEME.border, color: THEME.textSecondary }}
              >
                {t('common.cancel')}
              </Button>
              <Button
                type="submit"
                disabled={saving || !formData.invoiceNumber || formData.items.every((i) => !i.description.trim())}
                className="rounded-lg disabled:opacity-40"
                style={{ backgroundColor: THEME.primary, color: '#000' }}
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
        <AlertDialogContent className="rounded-xl" style={{ background: THEME.surface, border: `1px solid ${THEME.border}` }}>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2" style={{ color: THEME.text }}>
              <div className="h-6 w-6 rounded-md flex items-center justify-center" style={{ backgroundColor: `${THEME.destructive}20` }}>
                <Trash2 className="h-3 w-3" style={{ color: THEME.destructive }} />
              </div>
              {t('common.delete')}
            </AlertDialogTitle>
            <AlertDialogDescription style={{ color: THEME.textSecondary }}>
              {t('kas.deleteDesc')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-lg" style={{ borderColor: THEME.border, color: THEME.textSecondary }}>
              {t('common.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="rounded-lg" style={{ backgroundColor: THEME.destructive, color: THEME.text, border: 'none' }}>
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
