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
  Landmark, Star, Info, Building2, Search,
  Send, CalendarDays, ChevronRight, Filter, CircleDollarSign, MessageCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// ─── Color System (matching BusinessCash.tsx) ───────────────────────
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
const alpha = (color: string, pct: number) => `color-mix(in srgb, ${color} ${pct}%, transparent)`;

// ─── Animation Variants ─────────────────────────────────────────────
const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.04, delayChildren: 0.05 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' as const } },
};

// ─── Types ──────────────────────────────────────────────────────────
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
  customer?: { id: string; name: string; phone?: string | null; email?: string | null } | null;
  customerId?: string | null;
}

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

interface BankAccountInfo {
  id: string;
  bankName: string;
  accountNumber: string;
  accountHolder: string;
  isDefault: boolean;
  displayOrder: number;
}

// ─── Status Config ──────────────────────────────────────────────────
const STATUS_CONFIG: Record<string, { label: string; dotColor: string; icon: React.ComponentType<{ className?: string }>; bg: string; color: string; gradient: string; accentBorder: string }> = {
  pending: { label: 'biz.invoicePending', dotColor: c.warning, icon: Clock, bg: alpha(c.warning, 10), color: c.warning, gradient: `linear-gradient(135deg, ${alpha(c.warning, 20)}, ${alpha(c.warning, 5)})`, accentBorder: c.warning },
  paid: { label: 'biz.invoicePaid', dotColor: c.secondary, icon: CheckCircle2, bg: alpha(c.secondary, 10), color: c.secondary, gradient: `linear-gradient(135deg, ${alpha(c.secondary, 20)}, ${alpha(c.secondary, 5)})`, accentBorder: c.secondary },
  cancelled: { label: 'biz.invoiceCancelled', dotColor: '#666', icon: AlertTriangle, bg: alpha('#666', 8), color: c.muted, gradient: `linear-gradient(135deg, ${alpha('#888', 15)}, ${alpha('#888', 3)})`, accentBorder: '#666' },
  overdue: { label: 'biz.invoiceOverdue', dotColor: c.destructive, icon: AlertTriangle, bg: alpha(c.destructive, 10), color: c.destructive, gradient: `linear-gradient(135deg, ${alpha(c.destructive, 20)}, ${alpha(c.destructive, 5)})`, accentBorder: c.destructive },
};

type StatusFilter = 'all' | 'pending' | 'paid' | 'overdue' | 'cancelled';
type PeriodFilter = 'month' | 'quarter' | 'year';

const STATUS_CHIPS: { value: StatusFilter; label: string; color: string }[] = [
  { value: 'all', label: 'Semua', color: c.primary },
  { value: 'pending', label: 'Terkirim', color: c.warning },
  { value: 'paid', label: 'Lunas', color: c.secondary },
  { value: 'overdue', label: 'Jatuh Tempo', color: c.destructive },
];

const PERIOD_OPTIONS: { value: PeriodFilter; label: string }[] = [
  { value: 'month', label: 'Bulan Ini' },
  { value: 'quarter', label: '3 Bulan' },
  { value: 'year', label: 'Tahun' },
];

// ══════════════════════════════════════════════════════════════════
//  Main Component
// ══════════════════════════════════════════════════════════════════
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

  const [invoiceSettings, setInvoiceSettings] = useState<InvoiceSettingsData | null>(null);
  const [bankAccounts, setBankAccounts] = useState<BankAccountInfo[]>([]);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('month');

  const businessId = activeBusiness?.id;

  /* ── Data Fetching (unchanged) ────────────────────────────────── */
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

  /* ── CRUD Handlers (unchanged) ────────────────────────────────── */
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

  /* ── WhatsApp Reminder ─────────────────────────────────────── */
  const handleWhatsAppReminder = useCallback((inv: Invoice) => {
    const rawPhone = inv.customer?.phone;
    if (!rawPhone) {
      toast.error('Nomor telepon pelanggan tidak tersedia');
      return;
    }
    // Format phone: remove non-digits, prefix 62 for Indonesian numbers
    let digits = rawPhone.replace(/[^0-9]/g, '');
    if (digits.startsWith('0')) digits = '62' + digits.slice(1);
    if (!digits.startsWith('62')) digits = '62' + digits;

    const dueDateStr = inv.dueDate
      ? new Date(inv.dueDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
      : 'belum ditentukan';
    const message = `Halo ${inv.customer?.name || 'Pelanggan'}, berikut reminder invoice Anda:\n\n📋 No. Invoice: ${inv.invoiceNumber}\n💰 Total: ${formatAmount(inv.total)}\n📅 Jatuh Tempo: ${dueDateStr}\n\nMohon untuk segera melakukan pembayaran. Terima kasih! 🙏`;

    const url = `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
    const a = document.createElement('a');
    a.href = url;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }, [formatAmount]);

  /* ── Derived Data ─────────────────────────────────────────────── */
  const periodInvoices = useMemo(() => {
    if (periodFilter === 'year') return invoices;
    const now = new Date();
    const cutoff = periodFilter === 'month'
      ? new Date(now.getFullYear(), now.getMonth(), 1)
      : new Date(now.getFullYear(), now.getMonth() - 3, 1);
    return invoices.filter((inv) => new Date(inv.date) >= cutoff);
  }, [invoices, periodFilter]);

  const filteredInvoices = useMemo(() => {
    return periodInvoices.filter(
      (inv) =>
        (statusFilter === 'all' || inv.status === statusFilter) &&
        (inv.invoiceNumber.toLowerCase().includes(search.toLowerCase()) ||
          inv.customer?.name.toLowerCase().includes(search.toLowerCase()))
    );
  }, [periodInvoices, statusFilter, search]);

  const totalInvoices = periodInvoices.length;
  const totalAmount = periodInvoices.reduce((s, i) => s + i.total, 0);
  const paidInvoices = periodInvoices.filter((i) => i.status === 'paid').length;
  const paidPct = totalInvoices > 0 ? Math.round((paidInvoices / totalInvoices) * 100) : 0;
  const overdueCount = periodInvoices.filter((i) => i.status === 'overdue').length;

  if (!businessId) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-center text-muted-foreground">{t('biz.registerFirst')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 relative">
      {/* ── Ambient Background ── */}
      <div className="absolute -top-20 -left-20 w-72 h-72 rounded-full opacity-[0.04] blur-3xl pointer-events-none" style={{ backgroundColor: c.primary }} />
      <div className="absolute top-40 -right-16 w-60 h-60 rounded-full opacity-[0.03] blur-3xl pointer-events-none" style={{ backgroundColor: c.secondary }} />
      <div className="absolute bottom-20 left-1/3 w-56 h-56 rounded-full opacity-[0.025] blur-3xl pointer-events-none" style={{ backgroundColor: c.warning }} />

      <motion.div variants={containerVariants} initial="hidden" animate="visible">

        {/* ═══ Invoice Overview Hero ═══ */}
        <motion.div variants={itemVariants}>
          <Card className="rounded-xl overflow-hidden border border-white/[0.08] bg-white/[0.03] backdrop-blur-xl">
            <CardContent className="p-4 sm:p-5">
              {/* Header row */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: alpha(c.primary, 15) }}>
                    <FileText className="h-4 w-4" style={{ color: c.primary }} />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold bg-gradient-to-r from-white via-white/90 to-white/70 bg-clip-text text-transparent">{t('biz.invoices')}</h2>
                    <p className="text-[10px] text-muted-foreground">Kelola invoice & tagihan pelanggan</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {/* Period Filter */}
                  <div className="hidden sm:flex items-center gap-0.5 p-0.5 rounded-lg" style={{ backgroundColor: alpha(c.foreground, 4) }}>
                    {PERIOD_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => setPeriodFilter(opt.value)}
                        className={cn(
                          'px-2.5 py-1 text-[10px] font-medium rounded-md transition-all',
                          periodFilter === opt.value
                            ? 'text-foreground shadow-sm'
                            : 'text-muted-foreground hover:text-foreground'
                        )}
                        style={periodFilter === opt.value ? { backgroundColor: alpha(c.primary, 15), color: c.primary } : {}}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                  <Button onClick={openCreateDialog} size="sm" className="rounded-lg" style={{ backgroundColor: c.primary, color: '#000' }}>
                    <Plus className="h-3.5 w-3.5 mr-1" />
                    {t('biz.addInvoice')}
                  </Button>
                </div>
              </div>

              {/* Mobile period filter */}
              <div className="flex sm:hidden items-center gap-1.5 mb-3">
                {PERIOD_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setPeriodFilter(opt.value)}
                    className={cn(
                      'px-3 py-1.5 text-[10px] font-medium rounded-full border transition-all',
                      periodFilter === opt.value
                        ? 'border-0'
                        : 'border-0 text-muted-foreground'
                    )}
                    style={periodFilter === opt.value ? { backgroundColor: alpha(c.primary, 15), color: c.primary } : { backgroundColor: alpha(c.foreground, 4) }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {/* Total Invoices */}
                <div className="relative group">
                  <div className="absolute -inset-1 rounded-xl blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" style={{ backgroundColor: alpha(c.primary, 5) }} />
                  <div className="relative flex items-center gap-3 rounded-xl p-3 transition-all duration-200 bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.04] hover:border-white/[0.1]">
                    <div className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: alpha(c.primary, 12) }}>
                      <Receipt className="h-4 w-4" style={{ color: c.primary }} />
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground">Total Invoice</p>
                      <p className="text-base font-bold tabular-nums text-foreground">{totalInvoices}</p>
                    </div>
                  </div>
                  <div className="absolute bottom-0 left-3 right-3 h-px rounded-full" style={{ background: `linear-gradient(90deg, ${alpha(c.primary, 40)}, transparent)` }} />
                </div>
                {/* Total Amount */}
                <div className="relative group">
                  <div className="absolute -inset-1 rounded-xl blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" style={{ backgroundColor: alpha(c.secondary, 5) }} />
                  <div className="relative flex items-center gap-3 rounded-xl p-3 transition-all duration-200 bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.04] hover:border-white/[0.1]">
                    <div className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: alpha(c.secondary, 12) }}>
                      <TrendingUp className="h-4 w-4" style={{ color: c.secondary }} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] text-muted-foreground">Total Amount</p>
                      <p className="text-base font-bold tabular-nums truncate" style={{ color: c.secondary }}>{formatAmount(totalAmount)}</p>
                    </div>
                  </div>
                  <div className="absolute bottom-0 left-3 right-3 h-px rounded-full" style={{ background: `linear-gradient(90deg, ${alpha(c.secondary, 40)}, transparent)` }} />
                </div>
                {/* Paid % */}
                <div className="relative group">
                  <div className="absolute -inset-1 rounded-xl blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" style={{ backgroundColor: alpha(c.warning, 5) }} />
                  <div className="relative flex items-center gap-3 rounded-xl p-3 transition-all duration-200 bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.04] hover:border-white/[0.1]">
                    <div className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: alpha(c.warning, 12) }}>
                      <CheckCircle2 className="h-4 w-4" style={{ color: c.warning }} />
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground">Lunas</p>
                      <p className="text-base font-bold tabular-nums text-foreground">{paidPct}%</p>
                    </div>
                  </div>
                  <div className="absolute bottom-0 left-3 right-3 h-px rounded-full" style={{ background: `linear-gradient(90deg, ${alpha(c.warning, 40)}, transparent)` }} />
                </div>
                {/* Overdue */}
                <div className="relative group">
                  <div className="absolute -inset-1 rounded-xl blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" style={{ backgroundColor: overdueCount > 0 ? alpha(c.destructive, 5) : alpha(c.muted, 3) }} />
                  <div className="relative flex items-center gap-3 rounded-xl p-3 transition-all duration-200 bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.04] hover:border-white/[0.1]">
                    <div className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: overdueCount > 0 ? alpha(c.destructive, 12) : alpha(c.muted, 6) }}>
                      <AlertTriangle className="h-4 w-4" style={{ color: overdueCount > 0 ? c.destructive : c.muted }} />
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground">Jatuh Tempo</p>
                      <p className="text-base font-bold tabular-nums" style={{ color: overdueCount > 0 ? c.destructive : 'var(--foreground)' }}>{overdueCount}</p>
                    </div>
                  </div>
                  <div className="absolute bottom-0 left-3 right-3 h-px rounded-full" style={{ background: `linear-gradient(90deg, ${alpha(overdueCount > 0 ? c.destructive : c.muted, 40)}, transparent)` }} />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* ═══ Status Filter Chips + Search ═══ */}
        <motion.div variants={itemVariants} className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide pb-1 sm:pb-0">
            {STATUS_CHIPS.map((chip) => (
              <button
                key={chip.value}
                onClick={() => setStatusFilter(chip.value)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium rounded-full border-0 whitespace-nowrap transition-all shrink-0'
                )}
                style={
                  statusFilter === chip.value
                    ? { backgroundColor: alpha(chip.color, 15), color: chip.color, boxShadow: `0 0 12px ${alpha(chip.color, 20)}` }
                    : { backgroundColor: alpha(c.foreground, 5), color: c.muted }
                }
              >
                {chip.label}
                {chip.value !== 'all' && (
                  <span className="text-[9px] tabular-nums opacity-60">
                    {chip.value === 'paid' ? paidInvoices : chip.value === 'overdue' ? overdueCount : periodInvoices.filter((i) => i.status === chip.value).length}
                  </span>
                )}
              </button>
            ))}
          </div>
          <div className="relative flex-1 sm:max-w-xs sm:ml-auto">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('common.search') + '...'}
              className="h-8 pl-8 text-xs bg-transparent border border-border text-foreground rounded-lg"
            />
          </div>
        </motion.div>

        {/* ═══ Invoice List ═══ */}
        <motion.div variants={itemVariants}>
          <Card className="rounded-xl overflow-hidden bg-white/[0.02] border border-white/[0.06]">
            <CardContent className="p-0">
              {loading ? (
                <div className="space-y-2 p-4">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-14 rounded-lg" style={{ backgroundColor: alpha(c.foreground, 4) }} />
                  ))}
                </div>
              ) : filteredInvoices.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, ease: 'easeOut' }}
                  className="flex flex-col items-center justify-center py-16 px-6 relative"
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
                      <FileText className="h-8 w-8" style={{ color: alpha(c.primary, 60) }} />
                    </motion.div>
                  </div>
                  <motion.p initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="text-sm font-semibold text-foreground">Belum ada invoice</motion.p>
                  <motion.p initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} className="text-xs mt-1 text-center max-w-[200px] text-muted-foreground">
                    Buat invoice pertama untuk memulai
                  </motion.p>
                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}>
                    <Button
                      onClick={openCreateDialog}
                      size="sm"
                      variant="outline"
                      className="mt-4 rounded-full h-8 border-0"
                      style={{ background: `linear-gradient(135deg, ${alpha(c.primary, 15)}, ${alpha(c.secondary, 10)})`, color: c.primary }}
                    >
                      <Plus className="h-3.5 w-3.5 mr-1" />
                      {t('biz.addInvoice')}
                    </Button>
                  </motion.div>
                </motion.div>
              ) : (
                <>
                  {/* List summary */}
                  <div className="flex items-center justify-between px-4 pt-3 pb-2">
                    <p className="text-[10px] text-muted-foreground">
                      Menampilkan <span className="text-foreground font-medium">{filteredInvoices.length}</span> invoice
                      <span className="ml-1 tabular-nums">
                        — Total: {formatAmount(filteredInvoices.reduce((s, i) => s + i.total, 0))}
                      </span>
                    </p>
                  </div>

                  {/* Mobile Card List */}
                  <div className="sm:hidden max-h-[500px] overflow-y-auto divide-y divide-border">
                    <AnimatePresence mode="popLayout">
                      {filteredInvoices.map((inv, index) => {
                        const sc = STATUS_CONFIG[inv.status] || STATUS_CONFIG.pending;
                        const StatusIcon = sc.icon;
                        return (
                          <motion.div
                            key={inv.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ delay: index * 0.03, duration: 0.25 }}
                            whileHover={{ x: 2 }}
                            className="p-3 cursor-pointer transition-all duration-200 hover:bg-white/[0.03] border-l-[3px] border-l-transparent hover:border-l-white/[0.15]"
                            onClick={() => setViewInvoice(inv)}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-0.5">
                                  <div className="h-1.5 w-1.5 rounded-full shrink-0" style={{ backgroundColor: sc.dotColor, boxShadow: `0 0 6px ${sc.dotColor}` }} />
                                  <p className="text-xs font-semibold truncate text-foreground">{inv.invoiceNumber}</p>
                                </div>
                                {inv.customer?.name && (
                                  <p className="text-[10px] text-muted-foreground mb-1 truncate pl-3.5">{inv.customer.name}</p>
                                )}
                              </div>
                              <div className="text-right shrink-0">
                                <p className="text-[15px] font-extrabold tabular-nums tracking-tight" style={{ color: sc.color }}>{formatAmount(inv.total)}</p>
                                {inv.dueDate && (
                                  <p className="text-[9px] text-muted-foreground tabular-nums mt-0.5">
                                    {new Date(inv.dueDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                                  </p>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center justify-between mt-2">
                              <Badge
                                variant="outline"
                                border-0
                                className="text-[9px] font-medium gap-1 px-2 py-0.5 rounded-full"
                                style={{ background: alpha(sc.color, 8), color: sc.color, border: `1px solid ${alpha(sc.color, 15)}` }}
                              >
                                <StatusIcon className="h-2.5 w-2.5" />
                                {t(sc.label)}
                              </Badge>
                              <div className="flex items-center gap-0.5">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 w-7 p-0 rounded-md text-green-500"
                                  onClick={(e) => { e.stopPropagation(); handleWhatsAppReminder(inv); }}
                                >
                                  <MessageCircle className="h-3 w-3" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 w-7 p-0 rounded-md text-muted-foreground"
                                  onClick={(e) => { e.stopPropagation(); handleDownloadPDF(inv.id); }}
                                  disabled={downloading === inv.id}
                                >
                                  {downloading === inv.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />}
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 w-7 p-0 rounded-md text-muted-foreground"
                                  onClick={(e) => { e.stopPropagation(); openEditDialog(inv); }}
                                >
                                  <Pencil className="h-3 w-3" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 w-7 p-0 rounded-md text-muted-foreground"
                                  onClick={(e) => { e.stopPropagation(); setDeleteId(inv.id); }}
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

                  {/* Desktop Table */}
                  <div className="hidden sm:block max-h-[500px] overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-b border-border hover:bg-transparent">
                          <TableHead className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">No. Invoice</TableHead>
                          <TableHead className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Pelanggan</TableHead>
                          <TableHead className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Status</TableHead>
                          <TableHead className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider hidden md:table-cell">Jatuh Tempo</TableHead>
                          <TableHead className="text-[10px] font-medium text-right text-muted-foreground uppercase tracking-wider">Total</TableHead>
                          <TableHead className="text-[10px] font-medium w-36" />
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <AnimatePresence>
                          {filteredInvoices.map((inv) => {
                            const sc = STATUS_CONFIG[inv.status] || STATUS_CONFIG.pending;
                            const StatusIcon = sc.icon;
                            return (
                              <tr
                                key={inv.id}
                                className="transition-all duration-200 group cursor-pointer border-b border-border border-l-[3px] border-l-transparent hover:bg-white/[0.03] hover:border-l-white/[0.15]"
                                onClick={() => setViewInvoice(inv)}
                              >
                                <TableCell className="text-xs py-2.5 font-medium text-foreground">
                                  <div className="flex items-center gap-2">
                                    <div className="h-1.5 w-1.5 rounded-full shrink-0" style={{ backgroundColor: sc.dotColor, boxShadow: `0 0 6px ${sc.dotColor}` }} />
                                    {inv.invoiceNumber}
                                  </div>
                                </TableCell>
                                <TableCell className="py-2.5">
                                  <span className="text-xs text-muted-foreground">{inv.customer?.name || '-'}</span>
                                </TableCell>
                                <TableCell className="py-2.5">
                                  <Badge
                                    variant="outline"
                                    border-0
                                    className="text-[10px] font-medium gap-1 px-2 py-0.5 rounded-full"
                                    style={{ background: alpha(sc.color, 8), color: sc.color, border: `1px solid ${alpha(sc.color, 15)}` }}
                                  >
                                    <StatusIcon className="h-2.5 w-2.5" />
                                    {t(sc.label)}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-xs py-2.5 hidden md:table-cell text-muted-foreground tabular-nums">
                                  {inv.dueDate ? new Date(inv.dueDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}
                                </TableCell>
                                <TableCell className="text-[15px] text-right font-extrabold py-2.5 tabular-nums tracking-tight" style={{ color: sc.color }}>
                                  {formatAmount(inv.total)}
                                </TableCell>
                                <TableCell className="py-2.5 text-right">
                                  <div className="flex items-center justify-end gap-0.5 opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-7 w-7 p-0 rounded-md hover:bg-white/10 text-green-500"
                                      onClick={(e) => { e.stopPropagation(); handleWhatsAppReminder(inv); }}
                                    >
                                      <MessageCircle className="h-3 w-3" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-7 w-7 p-0 rounded-md hover:bg-white/10 text-muted-foreground"
                                      onClick={(e) => { e.stopPropagation(); handleDownloadPDF(inv.id); }}
                                      disabled={downloading === inv.id}
                                    >
                                      {downloading === inv.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />}
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-7 w-7 p-0 rounded-md hover:bg-white/10 text-muted-foreground"
                                      onClick={(e) => { e.stopPropagation(); openEditDialog(inv); }}
                                    >
                                      <Pencil className="h-3 w-3" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-7 w-7 p-0 rounded-md hover:bg-white/10 text-muted-foreground"
                                      onClick={(e) => { e.stopPropagation(); setDeleteId(inv.id); }}
                                    >
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
                </>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>

      {/* ═══ View Invoice Dialog (Responsive) ═══ */}
      <Dialog open={!!viewInvoice} onOpenChange={(open) => !open && setViewInvoice(null)}>
        <DialogContent className="w-[95vw] sm:max-w-[700px] max-h-[92vh] overflow-y-auto rounded-2xl p-0 border border-white/[0.08] bg-[#141414]">
          <div className="h-px w-full" style={{ background: `linear-gradient(90deg, transparent, ${alpha(c.secondary, 30)}, ${alpha(c.primary, 30)}, transparent)` }} />
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
            const statusStyle = STATUS_CONFIG[inv.status] || STATUS_CONFIG.pending;
            const StatusIcon = statusStyle.icon;

            return (
              <div className="w-full">
                {/* ── Template Headers ── */}
                {tmpl === 'modern' && (
                  <div className="relative overflow-hidden sm:rounded-t-xl">
                    <div className="px-4 py-4 sm:px-5 sm:py-5 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-0" style={{ background: `linear-gradient(135deg, ${pColor}, ${sColor})` }}>
                      <div className="flex items-center gap-3">
                        {bizLogo ? (
                          <img src={bizLogo} alt="" className="h-9 w-9 sm:h-10 sm:w-10 rounded-lg object-cover bg-black/20" />
                        ) : (
                          <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-lg bg-black/20 flex items-center justify-center">
                            <Building2 className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground/70" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="font-bold text-foreground text-sm truncate">{bizName}</p>
                          {(bizAddr || bizPhone || bizEmail) && (
                            <p className="text-[10px] text-muted-foreground/60 mt-0.5 line-clamp-2">
                              {[bizAddr, bizPhone && `Tel: ${bizPhone}`, bizEmail].filter(Boolean).join(' · ')}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="sm:text-right flex-1 sm:flex-none">
                        <div className="flex items-center justify-between sm:block">
                          <p className="font-bold text-foreground text-base">INVOICE</p>
                          <p className="text-[11px] text-muted-foreground/80 sm:mt-0.5">{inv.invoiceNumber}</p>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 sm:block">
                          <p className="text-[10px] text-muted-foreground/60">{new Date(inv.date).toLocaleDateString('id-ID')}</p>
                          {inv.dueDate && (
                            <p className="text-[10px] text-muted-foreground/60 sm:mt-0">Jatuh Tempo: {new Date(inv.dueDate).toLocaleDateString('id-ID')}</p>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="h-1" style={{ backgroundColor: sColor }} />
                  </div>
                )}
                {tmpl === 'classic' && (
                  <div className="sm:rounded-t-xl">
                    <div className="py-4 sm:py-5 text-center" style={{ borderBottom: `2px solid ${pColor}` }}>
                      {bizLogo && <img src={bizLogo} alt="" className="h-9 w-9 sm:h-10 sm:w-10 rounded-lg object-cover mx-auto mb-2" />}
                      <p className="font-bold text-sm sm:text-base tracking-wider uppercase" style={{ color: pColor }}>{bizName}</p>
                      {(bizAddr || bizPhone || bizEmail) && (
                        <p className="text-[10px] mt-1 text-muted-foreground">
                          {[bizAddr, bizPhone && `Tel: ${bizPhone}`, bizEmail].filter(Boolean).join(' · ')}
                        </p>
                      )}
                    </div>
                    <div className="h-[1px]" style={{ backgroundColor: pColor, opacity: 0.3 }} />
                  </div>
                )}
                {tmpl === 'minimal' && (
                  <div className="px-4 pt-4 pb-3 sm:px-5 sm:pt-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0" style={{ borderBottom: `1px solid rgba(255,255,255,0.06)` }}>
                    <div className="flex items-center gap-2.5">
                      {bizLogo ? (
                        <img src={bizLogo} alt="" className="h-7 w-7 rounded object-cover" />
                      ) : (
                        <div className="h-7 w-7 rounded bg-muted/40 flex items-center justify-center">
                          <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="font-medium text-sm text-foreground truncate">{bizName}</p>
                        {bizAddr && <p className="text-[10px] text-muted-foreground truncate">{bizAddr}</p>}
                      </div>
                    </div>
                    <div className="sm:text-right flex items-center sm:block justify-between">
                      <p className="font-medium text-xs text-foreground">{inv.invoiceNumber}</p>
                      <p className="text-[10px] text-muted-foreground">{new Date(inv.date).toLocaleDateString('id-ID')}</p>
                    </div>
                  </div>
                )}

                {/* ── Invoice Body ── */}
                <div className="px-4 py-4 sm:px-6 sm:py-5 space-y-4">
                  {/* Status + Due Date Row */}
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" border-0 className="text-[10px] gap-1 px-2 py-0.5 rounded-full shrink-0" style={{ background: alpha(statusStyle.color, 8), color: statusStyle.color, border: `1px solid ${alpha(statusStyle.color, 15)}` }}>
                      <StatusIcon className="h-2.5 w-2.5" />
                      {t(statusStyle.label)}
                    </Badge>
                    {inv.dueDate && tmpl !== 'modern' && (
                      <span className="text-[10px] text-muted-foreground truncate ml-2">Jatuh Tempo: {new Date(inv.dueDate).toLocaleDateString('id-ID')}</span>
                    )}
                  </div>

                  {/* Customer (Bill To) */}
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
                    <div className="flex-1">
                      <p className="text-[10px] font-semibold uppercase tracking-wider mb-1.5 text-muted-foreground">{tmpl === 'minimal' ? 'Bill To' : 'Kepada:'}</p>
                      <p className="text-xs font-medium text-foreground">{inv.customer?.name || '-'}</p>
                      {inv.customer?.phone && (
                        <p className="text-[10px] text-muted-foreground mt-0.5">{inv.customer.phone}</p>
                      )}
                    </div>
                  </div>

                  {/* Items Table */}
                  <div className="rounded-lg overflow-hidden border border-border">
                    {/* Desktop table header */}
                    <div className="hidden sm:grid sm:grid-cols-12 gap-0 px-4 py-2 text-[10px] font-semibold uppercase tracking-wider" style={{ backgroundColor: tmpl === 'minimal' ? 'transparent' : `${pColor}15`, color: pColor, borderBottom: '1px solid var(--border)' }}>
                      <span className="col-span-5">Item</span>
                      <span className="col-span-2 text-center">Qty</span>
                      <span className="col-span-2 text-right">Harga</span>
                      <span className="col-span-3 text-right">Total</span>
                    </div>
                    {inv.items.map((item, i) => (
                      <div key={i} className={
                        tmpl === 'minimal'
                          ? cn('py-2.5 sm:py-2', i < inv.items.length - 1 ? 'border-b border-border' : '')
                          : cn(
                              'grid grid-cols-12 gap-0 px-3 sm:px-4 py-2.5 sm:py-2 text-[11px]',
                              i < inv.items.length - 1 ? 'border-b border-border' : '',
                            )
                      } style={{ backgroundColor: i % 2 === 1 ? 'rgba(255,255,255,0.02)' : 'transparent' }}>
                        {/* Mobile: compact card layout */}
                        <div className="sm:hidden flex items-center justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-foreground truncate">{item.description}</p>
                            <p className="text-[10px] text-muted-foreground tabular-nums">{item.qty} × {formatAmount(item.price)}</p>
                          </div>
                          <p className="text-xs font-semibold text-foreground tabular-nums shrink-0">{formatAmount(item.qty * item.price)}</p>
                        </div>
                        {/* Desktop: table row */}
                        <span className="hidden sm:block sm:col-span-5 truncate text-foreground">{item.description}</span>
                        <span className="hidden sm:block sm:col-span-2 text-center text-muted-foreground tabular-nums">{item.qty}</span>
                        <span className="hidden sm:block sm:col-span-2 text-right text-muted-foreground tabular-nums">{formatAmount(item.price)}</span>
                        <span className="hidden sm:block sm:col-span-3 text-right font-medium text-foreground tabular-nums">{formatAmount(item.qty * item.price)}</span>
                      </div>
                    ))}
                  </div>

                  {/* Totals */}
                  <div className="flex justify-end">
                    <div className="w-full sm:w-56 space-y-1 text-xs">
                      <div className="flex justify-between text-muted-foreground"><span>Subtotal</span><span className="tabular-nums">{formatAmount(inv.subtotal)}</span></div>
                      {inv.tax > 0 && <div className="flex justify-between text-muted-foreground"><span>Pajak ({inv.tax}%)</span><span className="tabular-nums">{formatAmount(taxAmt)}</span></div>}
                      {inv.discount > 0 && <div className="flex justify-between" style={{ color: sColor }}><span>Diskon ({inv.discount}%)</span><span className="tabular-nums">-{formatAmount(discAmt)}</span></div>}
                      <div className="flex justify-between font-bold text-sm pt-2" style={{ color: 'var(--foreground)', borderTop: '1px solid var(--border)' }}>
                        <span>Total</span><span className="tabular-nums" style={{ color: pColor }}>{formatAmount(inv.total)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Notes */}
                  {inv.notes && (
                    <div className="rounded-lg p-3" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)' }}>
                      <p className="text-[10px] font-semibold uppercase tracking-wider mb-1 text-muted-foreground">Catatan</p>
                      <p className="text-[11px] leading-relaxed text-muted-foreground">{inv.notes}</p>
                    </div>
                  )}

                  {/* Bank Accounts */}
                  {bankAccounts.length > 0 && (
                    <div className="rounded-lg p-3" style={{ border: '1px solid var(--border)', background: 'rgba(255,255,255,0.02)' }}>
                      <div className="flex items-center gap-2 mb-2">
                        <div className="h-5 w-5 rounded-md flex items-center justify-center" style={{ backgroundColor: `${sColor}20` }}>
                          <Landmark className="h-2.5 w-2.5" style={{ color: sColor }} />
                        </div>
                        <p className="text-[11px] font-semibold text-muted-foreground">Rekening Pembayaran</p>
                      </div>
                      <div className="space-y-2">
                        {bankAccounts.map((acc) => (
                          <div key={acc.id} className="flex items-start gap-2 p-2 rounded-lg" style={{ backgroundColor: acc.isDefault ? `${sColor}08` : 'transparent', border: `1px solid ${acc.isDefault ? `${sColor}30` : 'var(--border)'}` }}>
                            <div className="h-7 w-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5" style={{ backgroundColor: acc.isDefault ? `${sColor}15` : 'rgba(255,255,255,0.04)' }}>
                              <Landmark className="h-3 w-3" style={{ color: acc.isDefault ? sColor : 'var(--muted-foreground)' }} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5">
                                <p className="text-[11px] font-medium truncate text-foreground">{acc.bankName}</p>
                                {acc.isDefault && <Badge className="text-[8px] px-1 py-0" style={{ backgroundColor: `${sColor}15`, color: sColor, border: 'transparent' }}><Star className="h-1.5 w-1.5 mr-0.5" />Utama</Badge>}
                              </div>
                              <p className="text-[10px] font-mono mt-0.5 text-muted-foreground tabular-nums">{acc.accountNumber}</p>
                              <p className="text-[10px] mt-0.5 text-muted-foreground">a.n. {acc.accountHolder}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Footer */}
                  {footerText && (
                    <div className="pt-2 border-t border-border">
                      <p className="text-[9px] italic text-center text-muted-foreground">{footerText}</p>
                    </div>
                  )}
                </div>

                {/* ── Action Buttons ── */}
                <div className="px-4 pb-4 pt-2 sm:px-5 flex flex-col-reverse sm:flex-row sm:justify-end gap-2 border-t border-border">
                  <Button variant="outline" className="rounded-lg text-xs w-full sm:w-auto" style={{ borderColor: `${sColor}30`, color: sColor }} onClick={() => handleDownloadPDF(inv.id)} disabled={downloading === inv.id}>
                    {downloading === inv.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                    {t('biz.downloadPDF')}
                  </Button>
                  <Button variant="outline" className="rounded-lg text-xs w-full sm:w-auto text-green-500 border-green-500/30 hover:bg-green-500/10" onClick={() => handleWhatsAppReminder(inv)}>
                    <MessageCircle className="mr-2 h-4 w-4" />
                    Kirim Reminder
                  </Button>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* ═══ Create/Edit Dialog ═══ */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto rounded-2xl p-0 bg-[#141414] border-white/[0.08]">
          <div className="h-px w-full" style={{ background: `linear-gradient(90deg, transparent, ${alpha(c.secondary, 30)}, ${alpha(c.primary, 30)}, transparent)` }} />
          <DialogHeader className="p-4 sm:p-5 pb-0">
            <DialogTitle className="text-sm font-bold bg-gradient-to-r from-white via-white/90 to-white/70 bg-clip-text text-transparent">
              {editingInvoice ? 'Edit Invoice' : 'Buat Invoice Baru'}
            </DialogTitle>
            <DialogDescription className="text-[11px] text-muted-foreground">
              {editingInvoice ? 'Ubah detail invoice' : 'Isi detail invoice untuk pelanggan'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSave}>
            <div className="px-4 sm:px-5 py-4 space-y-4">
              {/* Customer */}
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Pelanggan</Label>
                <Select value={formData.customerId} onValueChange={(val) => setFormData({ ...formData, customerId: val })}>
                  <SelectTrigger className="h-9 text-xs border-white/[0.08] rounded-xl bg-white/[0.04] focus:border-white/15 focus:ring-0">
                    <SelectValue placeholder="Pilih pelanggan (opsional)" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a1a1a] border-white/[0.08] rounded-xl">
                    {customers.map((cust) => (
                      <SelectItem key={cust.id} value={cust.id} className="text-xs">{cust.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="h-px bg-white/[0.06]" />

              {/* Invoice Number + Due Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">No. Invoice</Label>
                  <Input
                    value={formData.invoiceNumber}
                    onChange={(e) => setFormData({ ...formData, invoiceNumber: e.target.value })}
                    className="h-9 text-xs bg-white/[0.04] border-white/[0.08] rounded-xl focus:border-white/15 focus:ring-0"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Jatuh Tempo</Label>
                  <Input
                    type="date"
                    value={formData.dueDate}
                    onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                    className="h-9 text-xs bg-white/[0.04] border-white/[0.08] rounded-xl focus:border-white/15 focus:ring-0"
                  />
                </div>
              </div>

              {/* Items */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-muted-foreground">Item</Label>
                  <Button type="button" variant="ghost" size="sm" className="h-7 text-[10px] rounded-md text-muted-foreground" onClick={addItem}>
                    <PlusCircle className="h-3 w-3 mr-1" />
                    Tambah
                  </Button>
                </div>
                <div className="space-y-2 max-h-[200px] overflow-y-auto">
                  {formData.items.map((item, index) => (
                    <div key={index} className="flex items-start gap-2">
                      <div className="flex-1 grid grid-cols-12 gap-1.5 items-start">
                        <div className="col-span-6">
                          <Input
                            value={item.description}
                            onChange={(e) => updateItem(index, 'description', e.target.value)}
                            placeholder="Deskripsi"
                            className="h-8 text-[11px] bg-white/[0.04] border-white/[0.08] rounded-xl focus:border-white/15 focus:ring-0"
                          />
                        </div>
                        <div className="col-span-2">
                          <Input
                            type="number"
                            value={item.qty || ''}
                            onChange={(e) => updateItem(index, 'qty', parseInt(e.target.value) || 0)}
                            placeholder="Qty"
                            className="h-8 text-[11px] bg-white/[0.04] border-white/[0.08] rounded-xl focus:border-white/15 focus:ring-0 tabular-nums"
                            min={1}
                          />
                        </div>
                        <div className="col-span-4">
                          <Input
                            type="number"
                            value={item.price || ''}
                            onChange={(e) => updateItem(index, 'price', parseFloat(e.target.value) || 0)}
                            placeholder="Harga"
                            className="h-8 text-[11px] bg-white/[0.04] border-white/[0.08] rounded-xl focus:border-white/15 focus:ring-0 tabular-nums"
                            min={0}
                          />
                          {item.price > 0 && (
                            <p className="text-[10px] font-semibold tabular-nums text-secondary mt-0.5">
                              Rp {formatAmount(item.price)}
                            </p>
                          )}
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 rounded-md text-muted-foreground shrink-0 mt-0"
                        onClick={() => removeItem(index)}
                        disabled={formData.items.length <= 1}
                      >
                        <MinusCircle className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tax + Discount */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">PPN (%)</Label>
                  <Input
                    type="number"
                    value={formData.tax}
                    onChange={(e) => setFormData({ ...formData, tax: e.target.value })}
                    className="h-9 text-xs bg-white/[0.04] border-white/[0.08] rounded-xl focus:border-white/15 focus:ring-0 tabular-nums"
                    min={0}
                    max={100}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Diskon (%)</Label>
                  <Input
                    type="number"
                    value={formData.discount}
                    onChange={(e) => setFormData({ ...formData, discount: e.target.value })}
                    className="h-9 text-xs bg-white/[0.04] border-white/[0.08] rounded-xl focus:border-white/15 focus:ring-0 tabular-nums"
                    min={0}
                    max={100}
                  />
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Catatan</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Catatan tambahan..."
                  className="text-xs bg-white/[0.04] border-white/[0.08] rounded-xl focus:border-white/15 focus:ring-0 min-h-[60px] resize-none"
                  rows={2}
                />
              </div>

              {/* Nominal Preview */}
              <div className="rounded-lg p-3 space-y-1.5" style={{ backgroundColor: alpha(c.primary, 5), border: `1px solid ${alpha(c.primary, 10)}` }}>
                <div className="flex justify-between text-[11px]">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="tabular-nums text-muted-foreground">{formatAmount(getSubtotal())}</span>
                </div>
                {parseFloat(formData.tax) > 0 && (
                  <div className="flex justify-between text-[11px]">
                    <span className="text-muted-foreground">PPN ({formData.tax}%)</span>
                    <span className="tabular-nums text-muted-foreground">{formatAmount(getTaxAmount())}</span>
                  </div>
                )}
                {parseFloat(formData.discount) > 0 && (
                  <div className="flex justify-between text-[11px]">
                    <span className="text-muted-foreground">Diskon ({formData.discount}%)</span>
                    <span className="tabular-nums" style={{ color: c.destructive }}>-{formatAmount(getDiscountAmount())}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-sm pt-1.5" style={{ borderTop: `1px solid ${alpha(c.primary, 15)}` }}>
                  <span className="text-foreground">Total</span>
                  <span className="tabular-nums" style={{ color: c.primary }}>{formatAmount(getTotal())}</span>
                </div>
              </div>
            </div>
            <div className="h-px bg-white/[0.06]" />
            <DialogFooter className="p-4 sm:p-5 pt-0 flex gap-2">
              <Button type="button" variant="ghost" onClick={() => setDialogOpen(false)} className="rounded-xl text-xs h-9 text-muted-foreground hover:text-foreground">
                Batal
              </Button>
              <Button
                type="submit"
                disabled={saving || !formData.invoiceNumber || formData.items.every((i) => !i.description)}
                className="rounded-xl text-xs h-9"
                style={{ background: `linear-gradient(135deg, ${alpha(c.secondary, 80)}, ${alpha(c.primary, 80)})`, color: '#000' }}
              >
                {saving ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : null}
                {editingInvoice ? 'Simpan' : 'Buat Invoice'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ═══ Delete Confirmation ═══ */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent className="rounded-2xl bg-[#141414] border-white/[0.08] p-0 overflow-hidden">
          <div className="h-px w-full" style={{ background: `linear-gradient(90deg, transparent, ${alpha(c.destructive, 30)}, transparent)` }} />
          <div className="p-4 sm:p-5 space-y-3">
            <AlertDialogHeader className="space-y-1.5">
              <AlertDialogTitle className="text-sm text-foreground">Hapus Invoice?</AlertDialogTitle>
              <AlertDialogDescription className="text-xs text-muted-foreground">
                Invoice yang dihapus tidak dapat dikembalikan.
              </AlertDialogDescription>
            </AlertDialogHeader>
          </div>
          <div className="h-px bg-white/[0.06]" />
          <AlertDialogFooter className="gap-2 p-4 sm:p-5 pt-3">
            <AlertDialogCancel className="rounded-xl text-xs h-9 border-white/[0.08] text-muted-foreground hover:text-foreground hover:bg-white/[0.04]">Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="rounded-xl text-xs h-9" style={{ backgroundColor: c.destructive, color: '#fff' }}>
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
