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
  Landmark, Star, Info, Building2,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';
import { AnimatePresence } from 'framer-motion';

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
  pending: { label: 'biz.invoicePending', dotColor: 'var(--warning)', icon: Clock, bg: 'color-mix(in srgb, var(--warning) 10%, transparent)', color: 'var(--warning)' },
  paid: { label: 'biz.invoicePaid', dotColor: 'var(--secondary)', icon: CheckCircle2, bg: 'color-mix(in srgb, var(--secondary) 10%, transparent)', color: 'var(--secondary)' },
  cancelled: { label: 'biz.invoiceCancelled', dotColor: '#666', icon: AlertTriangle, bg: 'rgba(255,255,255,0.05)', color: 'var(--muted-foreground)' },
  overdue: { label: 'biz.invoiceOverdue', dotColor: 'var(--destructive)', icon: AlertTriangle, bg: 'color-mix(in srgb, var(--destructive) 10%, transparent)', color: 'var(--destructive)' },
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

  /* ---- Invoice Settings for Preview ---- */
  interface InvoiceSettingsData {
    template: string;
    primaryColor: string;
    secondaryColor: string;
    logoUrl: string | null;
    businessName: string | null;
    businessAddress: string | null;
    businessPhone: string | null;
    businessEmail: string | null;
    businessWebsite: string | null;
    footerText: string | null;
  }
  const [invoiceSettings, setInvoiceSettings] = useState<InvoiceSettingsData | null>(null);

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

  const fetchInvoiceSettings = useCallback(() => {
    if (!businessId) return;
    fetch(`/api/business/${businessId}/invoice-settings`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.settings) {
          setInvoiceSettings({
            template: data.settings.template || 'modern',
            primaryColor: data.settings.primaryColor || '#1E293B',
            secondaryColor: data.settings.secondaryColor || '#BB86FC',
            logoUrl: data.settings.logoUrl || null,
            businessName: data.settings.businessName || null,
            businessAddress: data.settings.businessAddress || null,
            businessPhone: data.settings.businessPhone || null,
            businessEmail: data.settings.businessEmail || null,
            businessWebsite: data.settings.businessWebsite || null,
            footerText: data.settings.footerText || null,
          });
        }
      })
      .catch(() => {});
  }, [businessId]);

  useEffect(() => {
    if (businessId) fetchBankAccounts();
  }, [businessId, fetchBankAccounts]);

  // Fetch invoice settings when viewing an invoice
  useEffect(() => {
    if (viewInvoice && businessId) fetchInvoiceSettings();
  }, [viewInvoice, businessId, fetchInvoiceSettings]);

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
    { label: t('biz.invoices'), value: totalInvoices, icon: Receipt, color: 'var(--primary)' },
    { label: t('biz.invoicePaid'), value: paidInvoices, icon: CheckCircle2, color: 'var(--secondary)' },
    { label: t('biz.invoicePending'), value: pendingInvoices, icon: Clock, color: 'var(--warning)' },
    { label: t('biz.bizRevenue'), value: formatAmount(totalRevenue), icon: TrendingUp, color: 'var(--destructive)' },
  ];

  if (!businessId) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-center text-muted-foreground">{t('biz.registerFirst')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Info Banner */}
      <div className="flex items-start gap-2 p-2.5 rounded-lg text-[11px]" style={{ background: 'color-mix(in srgb, var(--primary) 3%, transparent)', border: '1px solid color-mix(in srgb, var(--primary) 8%, transparent)' }}>
        <Info className="h-3.5 w-3.5 shrink-0 mt-0.5 text-primary" />
        <span className="text-muted-foreground" >
          Kelola invoice/tagihan pelanggan. Invoice cicilan dibuat otomatis dari penjualan cicilan.
        </span>
      </div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h2 className="text-base font-bold flex items-center gap-2 text-foreground" >
          <div className="h-7 w-7 rounded-lg flex items-center justify-center bg-warning/15">
            <FileText className="h-3.5 w-3.5 text-warning" />
          </div>
          {t('biz.invoices')}
        </h2>
        <Button onClick={openCreateDialog} size="sm" style={{ backgroundColor: 'var(--primary)', color: '#000' }} className="hover:opacity-90 rounded-lg">
          <Plus className="h-3.5 w-3.5 mr-1" />
          {t('biz.addInvoice')}
        </Button>
      </div>

      {/* Summary Stat Cards */}
      {!loading && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-1.5 sm:gap-2">
          {statCards.map((card, idx) => (
            <Card key={idx} className="rounded-xl overflow-hidden bg-card border border-border">
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="h-7 w-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${card.color}20` }}>
                    <card.icon className="h-3.5 w-3.5" style={{ color: card.color }} />
                  </div>
                  {idx === 3 && overdueInvoices > 0 && (
                    <Badge className="text-[10px] px-1.5 py-0" style={{ backgroundColor: 'color-mix(in srgb, var(--destructive) 10%, transparent)', color: 'var(--destructive)', border: '1px solid color-mix(in srgb, var(--destructive) 19%, transparent)' }}>
                      {overdueInvoices} {t('biz.invoiceOverdue')}
                    </Badge>
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground" >{card.label}</p>
                <p className="text-sm font-bold mt-0.5 text-foreground" >{card.value}</p>
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
        className="max-w-sm text-sm bg-card border border-border text-foreground"
      />

      {/* Table */}
      <Card className="rounded-xl overflow-hidden bg-card border border-border">
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-2 p-3 sm:p-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10 rounded-lg bg-card" />
              ))}
            </div>
          ) : filteredInvoices.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="h-16 w-16 rounded-xl flex items-center justify-center bg-card border border-border">
                <FileText className="h-8 w-8 opacity-20" />
              </div>
              <p className="text-sm mt-3 text-muted-foreground" >{t('biz.noBizData')}</p>
              <p className="text-xs mt-1 text-muted-foreground" >Create your first invoice to get started</p>
            </div>
          ) : (
            <div className="max-h-[500px] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-border hover:bg-transparent">
                    <TableHead className="text-[11px] font-medium text-muted-foreground" >{t('biz.invoiceNumber')}</TableHead>
                    <TableHead className="text-[11px] font-medium hidden sm:table-cell text-muted-foreground" >{t('biz.invoiceCustomer')}</TableHead>
                    <TableHead className="text-[11px] font-medium text-muted-foreground" >{t('biz.invoiceStatus')}</TableHead>
                    <TableHead className="text-[11px] font-medium hidden md:table-cell text-muted-foreground" >{t('biz.invoiceDueDate')}</TableHead>
                    <TableHead className="text-[11px] font-medium text-right text-muted-foreground" >{t('biz.invoiceTotal')}</TableHead>
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
                          className="transition-colors duration-150 group cursor-default border-b border-border"
                        >
                          <TableCell className="text-xs py-2 font-medium text-foreground" >
                            <div className="flex items-center gap-2">
                              <div className="h-1.5 w-1.5 rounded-full shrink-0" style={{ backgroundColor: statusStyle.dotColor }} />
                              {inv.invoiceNumber}
                            </div>
                          </TableCell>
                          <TableCell className="py-2 hidden sm:table-cell">
                            <span className="text-xs text-muted-foreground" >{inv.customer?.name || '-'}</span>
                          </TableCell>
                          <TableCell className="py-2">
                            <Badge variant="outline" className="text-[10px] font-medium gap-1 px-1.5 py-0.5 rounded-md" style={{ backgroundColor: statusStyle.bg, color: statusStyle.color, borderColor: 'transparent' }}>
                              <StatusIcon className="h-2.5 w-2.5" />
                              {t(statusStyle.label)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs py-2 hidden md:table-cell text-muted-foreground" >
                            {inv.dueDate ? new Date(inv.dueDate).toLocaleDateString() : '-'}
                          </TableCell>
                          <TableCell className="text-xs text-right font-semibold py-2 text-foreground" >
                            {formatAmount(inv.total)}
                          </TableCell>
                          <TableCell className="py-2 text-right">
                            <div className="flex items-center justify-end gap-0.5 opacity-60 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0 rounded-md hover:bg-white/10 text-muted-foreground" onClick={() => setViewInvoice(inv)}>
                                <Eye className="h-3 w-3" />
                              </Button>
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0 rounded-md hover:bg-white/10 text-muted-foreground" onClick={() => handleDownloadPDF(inv.id)} disabled={downloading === inv.id}>
                                {downloading === inv.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />}
                              </Button>
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0 rounded-md hover:bg-white/10 text-muted-foreground" onClick={() => openEditDialog(inv)}>
                                <Pencil className="h-3 w-3" />
                              </Button>
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0 rounded-md hover:bg-white/10 text-muted-foreground" onClick={() => setDeleteId(inv.id)}>
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

      {/* View Invoice Dialog - Themed Preview */}
      <Dialog open={!!viewInvoice} onOpenChange={(open) => !open && setViewInvoice(null)}>
        <DialogContent className="sm:max-w-[620px] max-h-[90vh] overflow-y-auto rounded-xl p-0 bg-card border border-border">
          {viewInvoice && (() => {
            const tmpl = invoiceSettings?.template || 'modern';
            const pColor = invoiceSettings?.primaryColor || '#1E293B';
            const sColor = invoiceSettings?.secondaryColor || '#BB86FC';
            const bizName = invoiceSettings?.businessName || activeBusiness?.name || 'My Business';
            const bizAddr = invoiceSettings?.businessAddress;
            const bizPhone = invoiceSettings?.businessPhone;
            const bizEmail = invoiceSettings?.businessEmail;
            const bizLogo = invoiceSettings?.logoUrl;
            const footerText = invoiceSettings?.footerText;
            const inv = viewInvoice;
            const taxAmt = inv.tax * inv.subtotal / 100;
            const discAmt = inv.discount * inv.subtotal / 100;
            const statusStyle = STATUS_STYLES[inv.status] || STATUS_STYLES.pending;
            const StatusIcon = statusStyle.icon;

            return (
              <div className="w-full">
                {/* ── MODERN HEADER ── */}
                {tmpl === 'modern' && (
                  <div className="relative overflow-hidden rounded-t-xl">
                    <div className="px-5 py-5 flex items-start justify-between" style={{ background: `linear-gradient(135deg, ${pColor}, ${sColor})` }}>
                      <div className="flex items-center gap-3">
                        {bizLogo ? (
                          <img src={bizLogo} alt="" className="h-10 w-10 rounded-lg object-cover bg-black/20" />
                        ) : (
                          <div className="h-10 w-10 rounded-lg bg-black/20 flex items-center justify-center">
                            <Building2 className="h-5 w-5 text-muted-foreground/70" />
                          </div>
                        )}
                        <div>
                          <p className="font-bold text-foreground text-sm">{bizName}</p>
                          {(bizAddr || bizPhone || bizEmail) && (
                            <p className="text-[10px] text-muted-foreground/60 mt-0.5 max-w-[200px] truncate">
                              {[bizAddr, bizPhone && `Tel: ${bizPhone}`, bizEmail].filter(Boolean).join(' · ')}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-foreground text-base">INVOICE</p>
                        <p className="text-[11px] text-muted-foreground/80 mt-0.5">{inv.invoiceNumber}</p>
                        <p className="text-[10px] text-muted-foreground/60">{new Date(inv.date).toLocaleDateString('id-ID')}</p>
                        {inv.dueDate && (
                          <p className="text-[10px] text-muted-foreground/60">Jatuh Tempo: {new Date(inv.dueDate).toLocaleDateString('id-ID')}</p>
                        )}
                      </div>
                    </div>
                    <div className="h-1" style={{ backgroundColor: sColor }} />
                  </div>
                )}

                {/* ── CLASSIC HEADER ── */}
                {tmpl === 'classic' && (
                  <div className="rounded-t-xl">
                    <div className="py-5 text-center" style={{ borderBottom: `2px solid ${pColor}` }}>
                      {bizLogo && (
                        <img src={bizLogo} alt="" className="h-10 w-10 rounded-lg object-cover mx-auto mb-2" />
                      )}
                      <p className="font-bold text-base tracking-wider uppercase" style={{ color: pColor }}>{bizName}</p>
                      {(bizAddr || bizPhone || bizEmail) && (
                        <p className="text-[10px] mt-1 text-muted-foreground" >
                          {[bizAddr, bizPhone && `Tel: ${bizPhone}`, bizEmail].filter(Boolean).join(' · ')}
                        </p>
                      )}
                    </div>
                    <div className="h-[1px]" style={{ backgroundColor: pColor, opacity: 0.3 }} />
                  </div>
                )}

                {/* ── MINIMAL HEADER ── */}
                {tmpl === 'minimal' && (
                  <div className="px-5 pt-5 pb-3 flex items-center justify-between" style={{ borderBottom: `1px solid rgba(255,255,255,0.06)` }}>
                    <div className="flex items-center gap-2.5">
                      {bizLogo ? (
                        <img src={bizLogo} alt="" className="h-7 w-7 rounded object-cover" />
                      ) : (
                        <div className="h-7 w-7 rounded bg-muted/40 flex items-center justify-center">
                          <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                        </div>
                      )}
                      <div>
                        <p className="font-medium text-sm text-foreground" >{bizName}</p>
                        {bizAddr && <p className="text-[10px] text-muted-foreground" >{bizAddr}</p>}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-xs text-foreground" >{inv.invoiceNumber}</p>
                      <p className="text-[10px] text-muted-foreground" >{new Date(inv.date).toLocaleDateString('id-ID')}</p>
                    </div>
                  </div>
                )}

                {/* Body content */}
                <div className="px-5 py-4 space-y-4">
                  {/* Status + Date row */}
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="text-[10px] gap-1 px-2 py-0.5 rounded-md" style={{ backgroundColor: statusStyle.bg, color: statusStyle.color, borderColor: 'transparent' }}>
                      <StatusIcon className="h-2.5 w-2.5" />
                      {t(statusStyle.label)}
                    </Badge>
                    {inv.dueDate && tmpl !== 'modern' && (
                      <span className="text-[10px] text-muted-foreground" >
                        Jatuh Tempo: {new Date(inv.dueDate).toLocaleDateString('id-ID')}
                      </span>
                    )}
                  </div>

                  {/* Customer info */}
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <p className="text-[10px] font-semibold uppercase tracking-wider mb-1.5 text-muted-foreground" >
                        {tmpl === 'minimal' ? 'Bill To' : 'Kepada:'}
                      </p>
                      <p className="text-xs font-medium text-foreground" >{inv.customer?.name || '-'}</p>
                    </div>
                  </div>

                  {/* Items Table */}
                  <div className="rounded-lg overflow-hidden border border-border">
                    <div className="grid grid-cols-12 gap-0 px-3 py-2 text-[10px] font-semibold uppercase tracking-wider" style={{ backgroundColor: tmpl === 'minimal' ? 'transparent' : `${pColor}20`, color: pColor, borderBottom: '1px solid var(--border)' }}>
                      <span className="col-span-5">Item</span>
                      <span className="col-span-2 text-center">Qty</span>
                      <span className="col-span-2 text-right">Harga</span>
                      <span className="col-span-3 text-right">Total</span>
                    </div>
                    {inv.items.map((item, i) => (
                      <div
                        key={i}
                        className="grid grid-cols-12 gap-0 px-3 py-2 text-[11px]"
                        style={{
                          borderBottom: i < inv.items.length - 1 ? '1px solid var(--border)' : 'none',
                          backgroundColor: i % 2 === 1 ? 'rgba(255,255,255,0.02)' : 'transparent',
                        }}
                      >
                        <span className="col-span-5 truncate text-foreground" >{item.description}</span>
                        <span className="col-span-2 text-center text-muted-foreground" >{item.qty}</span>
                        <span className="col-span-2 text-right text-muted-foreground" >{formatAmount(item.price)}</span>
                        <span className="col-span-3 text-right font-medium text-foreground" >{formatAmount(item.qty * item.price)}</span>
                      </div>
                    ))}
                  </div>

                  {/* Totals */}
                  <div className="flex justify-end">
                    <div className="w-52 space-y-1 text-xs">
                      <div className="flex justify-between text-muted-foreground" >
                        <span>Subtotal</span>
                        <span>{formatAmount(inv.subtotal)}</span>
                      </div>
                      {inv.tax > 0 && (
                        <div className="flex justify-between text-muted-foreground" >
                          <span>Pajak ({inv.tax}%)</span>
                          <span>{formatAmount(taxAmt)}</span>
                        </div>
                      )}
                      {inv.discount > 0 && (
                        <div className="flex justify-between" style={{ color: sColor }}>
                          <span>Diskon ({inv.discount}%)</span>
                          <span>-{formatAmount(discAmt)}</span>
                        </div>
                      )}
                      <div className="flex justify-between font-bold text-sm pt-2" style={{ color: 'var(--foreground)', borderTop: '1px solid var(--border)' }}>
                        <span>Total</span>
                        <span style={{ color: pColor }}>{formatAmount(inv.total)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Notes */}
                  {inv.notes && (
                    <div className="rounded-lg p-3" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)' }}>
                      <p className="text-[10px] font-semibold uppercase tracking-wider mb-1 text-muted-foreground" >Catatan</p>
                      <p className="text-[11px] leading-relaxed text-muted-foreground" >{inv.notes}</p>
                    </div>
                  )}

                  {/* Bank Accounts */}
                  {bankAccounts.length > 0 && (
                    <div className="rounded-lg p-3" style={{ border: '1px solid var(--border)', background: 'rgba(255,255,255,0.02)' }}>
                      <div className="flex items-center gap-2 mb-2">
                        <div className="h-5 w-5 rounded-md flex items-center justify-center" style={{ backgroundColor: `${sColor}20` }}>
                          <Landmark className="h-2.5 w-2.5" style={{ color: sColor }} />
                        </div>
                        <p className="text-[11px] font-semibold text-muted-foreground" >Rekening Pembayaran</p>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {bankAccounts.map((acc) => (
                          <div
                            key={acc.id}
                            className="flex items-start gap-2 p-2 rounded-lg transition-colors"
                            style={{
                              backgroundColor: acc.isDefault ? `${sColor}08` : 'transparent',
                              border: `1px solid ${acc.isDefault ? `${sColor}30` : 'var(--border)'}`,
                            }}
                          >
                            <div className="h-7 w-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5" style={{ backgroundColor: acc.isDefault ? `${sColor}15` : 'rgba(255,255,255,0.04)' }}>
                              <Landmark className="h-3 w-3" style={{ color: acc.isDefault ? sColor : 'var(--muted-foreground)' }} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5">
                                <p className="text-[11px] font-medium truncate text-foreground" >{acc.bankName}</p>
                                {acc.isDefault && (
                                  <Badge className="text-[8px] px-1 py-0" style={{ backgroundColor: `${sColor}15`, color: sColor, border: 'transparent' }}>
                                    <Star className="h-1.5 w-1.5 mr-0.5" />
                                    Utama
                                  </Badge>
                                )}
                              </div>
                              <p className="text-[10px] font-mono mt-0.5 text-muted-foreground" >{acc.accountNumber}</p>
                              <p className="text-[10px] mt-0.5 text-muted-foreground" >a.n. {acc.accountHolder}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Footer */}
                  {footerText && (
                    <div className="pt-2 border-t border-border">
                      <p className="text-[9px] italic text-center text-muted-foreground" >{footerText}</p>
                    </div>
                  )}
                </div>

                {/* Dialog Footer */}
                <div className="px-5 pb-4 pt-2 flex justify-end border-t border-border">
                  <Button
                    variant="outline"
                    className="rounded-lg"
                    style={{ borderColor: `${sColor}30`, color: sColor }}
                    onClick={() => handleDownloadPDF(inv.id)}
                    disabled={downloading === inv.id}
                  >
                    {downloading === inv.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                    {t('biz.downloadPDF')}
                  </Button>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto rounded-xl bg-card border border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-foreground" >
              <div className="h-6 w-6 rounded-md flex items-center justify-center" style={{ backgroundColor: editingInvoice ? 'var(--warning)' : 'var(--secondary)' }}>
                {editingInvoice ? <Pencil className="h-3 w-3" style={{ color: editingInvoice ? 'var(--warning)' : 'var(--secondary)' }} /> : <Plus className="h-3 w-3 text-secondary" />}
              </div>
              {editingInvoice ? t('common.edit') : t('biz.addInvoice')}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground" >
              {t('biz.generateInvoice')}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSave} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-[11px] text-muted-foreground" >{t('biz.invoiceNumber')} *</Label>
                <Input
                  value={formData.invoiceNumber}
                  onChange={(e) => setFormData({ ...formData, invoiceNumber: e.target.value })}
                  placeholder="INV-001"
                  className="text-sm h-9 rounded-lg bg-card border border-border text-foreground"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] text-muted-foreground" >{t('biz.invoiceCustomer')}</Label>
                <Select value={formData.customerId} onValueChange={(v) => setFormData({ ...formData, customerId: v })}>
                  <SelectTrigger className="text-sm h-9 rounded-lg bg-card border border-border text-foreground">
                    <SelectValue placeholder={t('biz.invoiceCustomer')} />
                  </SelectTrigger>
                  <SelectContent className="bg-card border border-border">
                    {customers.map((c) => (
                      <SelectItem key={c.id} value={c.id} className="text-foreground" >
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] text-muted-foreground" >{t('biz.invoiceDueDate')}</Label>
                <Input
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                  className="text-sm h-9 rounded-lg bg-card border border-border text-foreground"
                />
              </div>
            </div>

            {/* Line Items */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-[11px] text-muted-foreground" >{t('biz.invoiceItems')} *</Label>
                <Button type="button" variant="ghost" size="sm" onClick={addItem} className="text-xs text-secondary" >
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
                      className="flex-1 text-xs h-8 rounded-md bg-card border border-border text-foreground"
                    />
                    <Input
                      type="number"
                      value={item.qty || ''}
                      onChange={(e) => updateItem(idx, 'qty', parseInt(e.target.value) || 0)}
                      placeholder="Qty"
                      min="1"
                      className="w-14 text-xs h-8 rounded-md bg-card border border-border text-foreground"
                    />
                    <Input
                      type="number"
                      value={item.price || ''}
                      onChange={(e) => updateItem(idx, 'price', parseFloat(e.target.value) || 0)}
                      placeholder="Harga"
                      min="0"
                      className="w-24 text-xs h-8 rounded-md bg-card border border-border text-foreground"
                    />
                    {formData.items.length > 1 && (
                      <Button type="button" variant="ghost" size="sm" onClick={() => removeItem(idx)} className="h-8 w-8 p-0 shrink-0 rounded-md text-muted-foreground">
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
                <Label className="text-[11px] text-muted-foreground" >{t('biz.invoiceTax')} (%)</Label>
                <Input type="number" value={formData.tax} onChange={(e) => setFormData({ ...formData, tax: e.target.value })} placeholder="0" min="0" className="text-sm h-9 rounded-lg bg-card border border-border text-foreground" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] text-muted-foreground" >{t('biz.invoiceDiscount')} (%)</Label>
                <Input type="number" value={formData.discount} onChange={(e) => setFormData({ ...formData, discount: e.target.value })} placeholder="0" min="0" className="text-sm h-9 rounded-lg bg-card border border-border text-foreground" />
              </div>
            </div>

            {/* Totals Preview */}
            <div className="rounded-lg p-3 space-y-1 text-xs" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)' }}>
              <div className="flex justify-between text-muted-foreground" >
                <span>{t('biz.invoiceSubtotal')}</span>
                <span>{formatAmount(getSubtotal())}</span>
              </div>
              <div className="flex justify-between text-muted-foreground" >
                <span>{t('biz.invoiceTax')}</span>
                <span>+{formatAmount(getTaxAmount())}</span>
              </div>
              <div className="flex justify-between text-secondary" >
                <span>{t('biz.invoiceDiscount')}</span>
                <span>-{formatAmount(getDiscountAmount())}</span>
              </div>
              <div className="flex justify-between font-bold text-sm pt-2" style={{ color: 'var(--foreground)', borderTop: '1px solid var(--border)' }}>
                <span>{t('biz.invoiceTotal')}</span>
                <span className="text-primary" >{formatAmount(getTotal())}</span>
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <Label className="text-[11px] text-muted-foreground" >{t('biz.customerNotes')}</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder={t('biz.customerNotes')}
                className="text-xs min-h-[56px] rounded-lg resize-none bg-card border border-border text-foreground"
              />
            </div>

            <DialogFooter className="gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
                className="rounded-lg"
                style={{ borderColor: 'var(--border)', color: 'var(--muted-foreground)' }}
              >
                {t('common.cancel')}
              </Button>
              <Button
                type="submit"
                disabled={saving || !formData.invoiceNumber || formData.items.every((i) => !i.description.trim())}
                className="rounded-lg disabled:opacity-40"
                style={{ backgroundColor: 'var(--primary)', color: '#000' }}
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
        <AlertDialogContent className="rounded-xl bg-card border border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-foreground" >
              <div className="h-6 w-6 rounded-md flex items-center justify-center bg-destructive/15">
                <Trash2 className="h-3 w-3 text-destructive" />
              </div>
              {t('common.delete')}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground" >
              {t('kas.deleteDesc')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-lg" style={{ borderColor: 'var(--border)', color: 'var(--muted-foreground)' }}>
              {t('common.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="rounded-lg" style={{ backgroundColor: 'var(--destructive)', color: 'var(--foreground)', border: 'none' }}>
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
