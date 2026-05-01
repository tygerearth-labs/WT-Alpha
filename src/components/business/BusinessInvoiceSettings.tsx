'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useBusinessStore } from '@/store/useBusinessStore';
import { useTranslation } from '@/hooks/useTranslation';
import { useCurrencyFormat } from '@/hooks/useCurrencyFormat';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
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
  Settings, Palette, Upload, CreditCard, FileText, Eye, Save,
  PenLine, Building2, Phone, Mail, Globe,
  Landmark, Hash, User, X, Check, Layout, CheckCircle2,
  Sparkles, Plus, Pencil, Trash2, Star, Type, Percent, Clock, Moon,
} from 'lucide-react';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
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
  visible: { opacity: 1, transition: { staggerChildren: 0.06, delayChildren: 0.05 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' as const } },
};

type TemplateType = 'modern' | 'classic' | 'minimal';

interface InvoiceSettingsForm {
  template: TemplateType;
  primaryColor: string;
  secondaryColor: string;
  logoUrl: string;
  signatureUrl: string;
  businessName: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  bankName: string;
  accountNumber: string;
  accountHolderName: string;
  footerText: string;
  paymentTerms: string;
  darkMode: boolean;
}

const DEFAULT_FORM: InvoiceSettingsForm = {
  template: 'modern',
  primaryColor: '#BB86FC',
  secondaryColor: '#03DAC6',
  logoUrl: '',
  signatureUrl: '',
  businessName: '',
  address: '',
  phone: '',
  email: '',
  website: '',
  bankName: '',
  accountNumber: '',
  accountHolderName: '',
  footerText: '',
  paymentTerms: '',
  darkMode: false,
};

const TEMPLATE_META: Record<TemplateType, { label: string; desc: string; color: string }> = {
  modern: { label: 'Modern', desc: 'Bold header with gradient accent bar', color: c.primary },
  classic: { label: 'Classic', desc: 'Traditional layout with elegant typography', color: c.destructive },
  minimal: { label: 'Minimal', desc: 'Simple and clean with maximum whitespace', color: c.secondary },
};

/* ══════════════════════════════════════════════════════════════════
   TemplatePreviewCard (kept)
   ══════════════════════════════════════════════════════════════════ */
function TemplatePreviewCard({ type, primaryColor, secondaryColor, businessName, logoUrl }: {
  type: TemplateType; primaryColor: string; secondaryColor: string; businessName: string; logoUrl: string;
}) {
  const display = businessName || 'My Business';
  if (type === 'modern') {
    return (
      <div className="w-full h-32 rounded-lg overflow-hidden border border-border bg-background text-[8px] text-muted-foreground/60 flex flex-col">
        <div className="h-7 flex items-center px-2 gap-1.5 shrink-0" style={{ backgroundColor: primaryColor }}>
          {logoUrl ? <img src={logoUrl} alt="" className="h-4 w-4 rounded object-cover" /> : <div className="h-4 w-4 rounded bg-black/20" />}
          <span className="font-bold text-black text-[7px] truncate">{display}</span>
        </div>
        <div className="px-2 py-1 space-y-1 flex-1">
          <div className="flex justify-between"><div className="space-y-0.5"><div className="h-1 w-14 bg-white/10 rounded" /><div className="h-1 w-10 bg-white/10 rounded" /></div><div className="text-right space-y-0.5"><div className="h-1 w-12 bg-white/10 rounded ml-auto" /><div className="h-1 w-8 bg-white/10 rounded ml-auto" /></div></div>
          <div className="mt-0.5"><div className="h-1 w-full rounded mb-0.5" style={{ backgroundColor: secondaryColor, opacity: 0.3 }} /><div className="h-1 w-full bg-muted/30 rounded mb-0.5" /><div className="h-1 w-full bg-muted/30 rounded" /></div>
          <div className="h-1.5 w-12 rounded mt-auto ml-auto" style={{ backgroundColor: primaryColor, opacity: 0.5 }} />
        </div>
      </div>
    );
  }
  if (type === 'classic') {
    return (
      <div className="w-full h-32 rounded-lg overflow-hidden border border-border bg-background text-[8px] text-muted-foreground/60 flex flex-col">
        <div className="px-2 py-1.5 text-center border-b border-border"><span className="font-bold text-[9px] tracking-wider uppercase" style={{ color: primaryColor }}>{display}</span><div className="h-0.5 w-8 mx-auto mt-0.5 rounded" style={{ backgroundColor: primaryColor }} /></div>
        <div className="px-2 py-1 space-y-1 flex-1">
          <div className="flex justify-between"><div className="space-y-0.5"><div className="h-1 w-14 bg-white/10 rounded" /><div className="h-1 w-10 bg-white/10 rounded" /></div><div className="space-y-0.5"><div className="h-1 w-12 bg-white/10 rounded ml-auto" /><div className="h-1 w-8 bg-white/10 rounded ml-auto" /></div></div>
          <div className="border-t border-border pt-0.5 mt-1"><div className="h-1 w-full bg-muted/30 rounded mb-0.5" /><div className="h-1 w-full bg-muted/30 rounded mb-0.5" /><div className="h-1 w-3/4 bg-muted/30 rounded" /></div>
          <div className="h-1.5 w-12 rounded mt-auto ml-auto" style={{ backgroundColor: primaryColor, opacity: 0.5 }} />
        </div>
      </div>
    );
  }
  return (
    <div className="w-full h-32 rounded-lg overflow-hidden border border-border bg-background text-[8px] text-muted-foreground/60 flex flex-col">
      <div className="px-2 pt-1.5 pb-1 flex items-center justify-between"><div className="flex items-center gap-1">{logoUrl ? <img src={logoUrl} alt="" className="h-4 w-4 rounded object-cover" /> : <div className="h-4 w-4 rounded bg-muted/50" />}<span className="font-semibold text-[7px] text-muted-foreground/80 truncate">{display}</span></div><div className="h-1.5 w-6 bg-muted/40 rounded" /></div>
      <div className="px-2 py-1 space-y-0.5 flex-1"><div className="h-1 w-full bg-muted/30 rounded" /><div className="h-1 w-full bg-muted/30 rounded" /><div className="h-1 w-full bg-muted/30 rounded" /><div className="border-t border-border pt-0.5 mt-1"><div className="h-1 w-full bg-muted/30 rounded" /><div className="h-1 w-full bg-muted/30 rounded" /></div></div>
      <div className="px-2 pb-1"><div className="h-1.5 w-10 rounded ml-auto bg-muted/50" /></div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   ColorSwatch (kept)
   ══════════════════════════════════════════════════════════════════ */
function ColorSwatch({ color, label, onChange }: { color: string; label: string; onChange: (val: string) => void }) {
  const [text, setText] = useState(color);
  const [localColor, setLocalColor] = useState(color);
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { setText(color); setLocalColor(color); }, [color]);
  const handleTextChange = (val: string) => {
    const cleaned = val.replace(/[^#0-9a-fA-F]/g, '');
    const clamped = cleaned.length > 7 ? cleaned.slice(0, 7) : cleaned;
    setText(clamped);
    if (/^#[0-9a-fA-F]{6}$/.test(clamped)) { setLocalColor(clamped); onChange(clamped); }
  };
  return (
    <div className="flex items-center gap-3">
      <motion.button type="button" whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }} onClick={() => inputRef.current?.click()} className="relative h-10 w-10 rounded-lg border border-border shrink-0 cursor-pointer" style={{ backgroundColor: localColor }} aria-label={`Pick ${label}`}>
        <input ref={inputRef} type="color" value={localColor.startsWith('#') ? localColor : '#BB86FC'} onChange={(e) => { const v = e.target.value; setLocalColor(v); setText(v); onChange(v); }} className="absolute inset-0 opacity-0 cursor-pointer h-full w-full" />
      </motion.button>
      <div className="flex-1">
        <Label className="text-muted-foreground/80 text-xs">{label}</Label>
        <div className="flex items-center gap-1.5 mt-1">
          <span className="text-muted-foreground/40 text-xs">Hex</span>
          <Input value={text} onChange={(e) => handleTextChange(e.target.value)} className="h-8 bg-muted/30 border-border text-foreground text-xs font-mono w-28 rounded-lg focus:border-primary/40" maxLength={7} />
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   LivePreview (kept)
   ══════════════════════════════════════════════════════════════════ */
function LivePreview({ form }: { form: InvoiceSettingsForm }) {
  const { formatAmount } = useCurrencyFormat();
  const sampleItems = [{ desc: 'Web Design Service', qty: 1, price: 1500000 }, { desc: 'Logo Concept', qty: 3, price: 500000 }];
  const subtotal = sampleItems.reduce((s, i) => s + i.qty * i.price, 0);
  const tax = subtotal * 0.11;
  const total = subtotal + tax;
  const bizName = form.businessName || 'My Business';
  const accent = form.primaryColor || '#BB86FC';
  const secondary = form.secondaryColor || '#03DAC6';

  if (form.template === 'modern') {
    return (
      <motion.div key="modern" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="w-full rounded-xl overflow-hidden border border-border bg-background text-[10px] text-muted-foreground/70 shadow-lg">
        <div className="h-14 flex items-center justify-between px-4" style={{ background: `linear-gradient(135deg, ${accent}, ${secondary})` }}>
          <div className="flex items-center gap-2">{form.logoUrl ? <img src={form.logoUrl} alt="" className="h-8 w-8 rounded-md object-cover bg-white/20" /> : <div className="h-8 w-8 rounded-md bg-black/20 flex items-center justify-center"><Building2 className="h-4 w-4 text-black/60" /></div>}<div><p className="font-bold text-black text-xs">{bizName}</p>{form.phone && <p className="text-black/60 text-[8px]">{form.phone}</p>}</div></div>
          <div className="text-right"><p className="font-bold text-black text-xs">INV-2024-001</p><p className="text-black/60 text-[8px]">{new Date().toLocaleDateString()}</p></div>
        </div>
        <div className="p-3 space-y-2">
          <div className="flex justify-between text-[9px]"><div><p className="text-muted-foreground/40 mb-0.5">Bill To:</p><p className="text-muted-foreground/80 font-medium">John Customer</p></div><div className="text-right text-muted-foreground/40"><p>Due: {new Date(Date.now() + 30 * 86400000).toLocaleDateString()}</p></div></div>
          <div className="rounded-lg border border-border overflow-hidden"><div className="grid grid-cols-12 gap-0 px-2 py-1 text-[8px] font-semibold text-muted-foreground/50 uppercase tracking-wider" style={{ backgroundColor: `${accent}10` }}><span className="col-span-6">Item</span><span className="col-span-2 text-center">Qty</span><span className="col-span-2 text-right">Price</span><span className="col-span-2 text-right">Total</span></div>{sampleItems.map((item, i) => <div key={i} className={cn('grid grid-cols-12 gap-0 px-2 py-1 text-[9px]', i < sampleItems.length - 1 ? 'border-b border-border' : '')}><span className="col-span-6 text-muted-foreground/80">{item.desc}</span><span className="col-span-2 text-center text-muted-foreground/50">{item.qty}</span><span className="col-span-2 text-right text-muted-foreground/50">{formatAmount(item.price)}</span><span className="col-span-2 text-right text-muted-foreground/80">{formatAmount(item.qty * item.price)}</span></div>)}</div>
          <div className="flex justify-end"><div className="w-36 space-y-0.5 text-[9px]"><div className="flex justify-between text-muted-foreground/50"><span>Subtotal</span><span>{formatAmount(subtotal)}</span></div><div className="flex justify-between text-muted-foreground/50"><span>Tax (11%)</span><span>{formatAmount(tax)}</span></div><div className="flex justify-between font-bold text-foreground text-[10px] pt-1 border-t border-border"><span>Total</span><span style={{ color: accent }}>{formatAmount(total)}</span></div></div></div>
          {form.footerText && <div className="pt-1 border-t border-border"><p className="text-muted-foreground/30 text-[7px] italic">{form.footerText}</p></div>}
        </div>
      </motion.div>
    );
  }
  if (form.template === 'classic') {
    return (
      <motion.div key="classic" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="w-full rounded-xl overflow-hidden border border-border bg-background text-[10px] text-muted-foreground/70 shadow-lg">
        <div className="px-4 pt-3 pb-2 text-center border-b border-border"><p className="font-bold text-xs tracking-widest uppercase" style={{ color: accent }}>{bizName}</p><div className="h-0.5 w-10 mx-auto mt-1 rounded" style={{ backgroundColor: accent }} /><p className="text-[8px] text-muted-foreground/30 mt-1">Invoice #INV-2024-001</p></div>
        <div className="p-3 space-y-2"><div className="grid grid-cols-2 gap-2 text-[9px]"><div><p className="text-muted-foreground/40 mb-0.5">From:</p><p className="text-muted-foreground/80">{bizName}</p></div><div><p className="text-muted-foreground/40 mb-0.5">Bill To:</p><p className="text-muted-foreground/80">John Customer</p></div></div>
          <div className="rounded-lg border border-border overflow-hidden"><div className="grid grid-cols-12 gap-0 px-2 py-1 text-[8px] font-semibold text-muted-foreground/50 uppercase tracking-wider bg-muted/20"><span className="col-span-6">Description</span><span className="col-span-2 text-center">Qty</span><span className="col-span-2 text-right">Rate</span><span className="col-span-2 text-right">Amount</span></div>{sampleItems.map((item, i) => <div key={i} className={cn('grid grid-cols-12 gap-0 px-2 py-1 text-[9px]', i < sampleItems.length - 1 ? 'border-b border-border' : '')}><span className="col-span-6 text-muted-foreground/80">{item.desc}</span><span className="col-span-2 text-center text-muted-foreground/50">{item.qty}</span><span className="col-span-2 text-right text-muted-foreground/50">{formatAmount(item.price)}</span><span className="col-span-2 text-right text-muted-foreground/80">{formatAmount(item.qty * item.price)}</span></div>)}</div>
          <div className="flex justify-end"><div className="w-36 space-y-0.5 text-[9px]"><div className="flex justify-between text-muted-foreground/50"><span>Subtotal</span><span>{formatAmount(subtotal)}</span></div><div className="flex justify-between text-muted-foreground/50"><span>Tax (11%)</span><span>{formatAmount(tax)}</span></div><div className="flex justify-between font-bold text-foreground text-[10px] pt-1 border-t border-border"><span>Total</span><span style={{ color: accent }}>{formatAmount(total)}</span></div></div></div>
          {form.footerText && <div className="pt-1 border-t border-border"><p className="text-muted-foreground/30 text-[7px] italic">{form.footerText}</p></div>}
        </div>
      </motion.div>
    );
  }
  return (
    <motion.div key="minimal" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="w-full rounded-xl overflow-hidden border border-border bg-background text-[10px] text-muted-foreground/70 shadow-lg">
      <div className="px-4 pt-3 pb-2 flex items-center justify-between"><div className="flex items-center gap-2">{form.logoUrl ? <img src={form.logoUrl} alt="" className="h-6 w-6 rounded object-cover" /> : <div className="h-6 w-6 rounded bg-muted/40 flex items-center justify-center"><Building2 className="h-3 w-3 text-muted-foreground/30" /></div>}<p className="font-medium text-xs text-muted-foreground/90">{bizName}</p></div><p className="text-muted-foreground/30 text-[8px]">INV-2024-001</p></div>
      <div className="px-4 pb-3 space-y-2"><div className="flex justify-between text-[9px]"><div><p className="text-muted-foreground/30 mb-0.5">To</p><p className="text-muted-foreground/70">John Customer</p></div><div className="text-right text-muted-foreground/30 text-[9px]"><p>{new Date().toLocaleDateString()}</p></div></div>
        <div className="space-y-0.5">{sampleItems.map((item, i) => <div key={i} className="flex justify-between text-[9px]"><span className="text-muted-foreground/70">{item.desc} <span className="text-muted-foreground/30">x{item.qty}</span></span><span className="text-muted-foreground/70">{formatAmount(item.qty * item.price)}</span></div>)}</div>
        <div className="border-t border-border pt-1 flex justify-between font-bold text-foreground text-[10px]"><span>Total</span><span style={{ color: accent }}>{formatAmount(total)}</span></div>
        {form.footerText && <p className="text-muted-foreground/25 text-[7px] italic">{form.footerText}</p>}
      </div>
    </motion.div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   SectionHeader (kept, uses c system)
   ══════════════════════════════════════════════════════════════════ */
function SectionHeader({ icon: Icon, title, color }: {
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  title: string; color: string;
}) {
  return (
    <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="biz-section-header flex items-center gap-2.5 mb-4">
      <div className="biz-section-header-icon h-8 w-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: alpha(color, 12) }}>
        <Icon className="h-4 w-4" style={{ color }} />
      </div>
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
    </motion.div>
  );
}

function maskAccountNumber(accountNumber: string): string {
  if (!accountNumber || accountNumber.length <= 6) return accountNumber;
  const first = accountNumber.slice(0, 3);
  const last = accountNumber.slice(-3);
  const middle = '*'.repeat(Math.min(accountNumber.length - 6, 10));
  return `${first}${middle}${last}`;
}

/* ══════════════════════════════════════════════════════════════════
   Main Component
   ══════════════════════════════════════════════════════════════════ */
export default function BusinessInvoiceSettings() {
  const { t } = useTranslation();
  const { activeBusiness } = useBusinessStore();
  const [form, setForm] = useState<InvoiceSettingsForm>(DEFAULT_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const originalRef = useRef<InvoiceSettingsForm>(DEFAULT_FORM);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const sigInputRef = useRef<HTMLInputElement>(null);

  interface BankAccount { id: string; bankName: string; accountNumber: string; accountHolder: string; isDefault: boolean; displayOrder: number; }
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [bankDialogOpen, setBankDialogOpen] = useState(false);
  const [editingBank, setEditingBank] = useState<BankAccount | null>(null);
  const [deleteBankId, setDeleteBankId] = useState<string | null>(null);
  const [bankSaving, setBankSaving] = useState(false);
  const [bankForm, setBankForm] = useState({ bankName: '', accountNumber: '', accountHolder: '', isDefault: false });

  const [ppnEnabled, setPpnEnabled] = useState(true);
  const [ppnPercentage, setPpnPercentage] = useState('11');
  const [defaultDueDays, setDefaultDueDays] = useState('30');
  const [fontSize, setFontSize] = useState<'small' | 'medium' | 'large'>('medium');

  const businessId = activeBusiness?.id;
  const MAX_BANK_ACCOUNTS = 5;

  /* ── Bank Accounts CRUD (unchanged) ─────────────────────────────── */
  const fetchBankAccounts = useCallback(() => {
    if (!businessId) return;
    fetch(`/api/business/${businessId}/bank-accounts`).then((res) => (res.ok ? res.json() : [])).then((data) => setBankAccounts(data.bankAccounts || [])).catch(() => setBankAccounts([]));
  }, [businessId]);

  useEffect(() => { if (businessId) fetchBankAccounts(); }, [businessId, fetchBankAccounts]);

  const openAddBankDialog = () => { setEditingBank(null); setBankForm({ bankName: '', accountNumber: '', accountHolder: '', isDefault: bankAccounts.length === 0 }); setBankDialogOpen(true); };
  const openEditBankDialog = (acc: BankAccount) => { setEditingBank(acc); setBankForm({ bankName: acc.bankName, accountNumber: acc.accountNumber, accountHolder: acc.accountHolder, isDefault: acc.isDefault }); setBankDialogOpen(true); };

  const handleSaveBank = async () => {
    if (!businessId || !bankForm.bankName.trim() || !bankForm.accountNumber.trim() || !bankForm.accountHolder.trim()) return;
    setBankSaving(true);
    try {
      if (editingBank) {
        const res = await fetch(`/api/business/${businessId}/bank-accounts/${editingBank.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(bankForm) });
        if (!res.ok) throw new Error();
        toast.success('Rekening berhasil diperbarui');
      } else {
        const res = await fetch(`/api/business/${businessId}/bank-accounts`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...bankForm, displayOrder: bankAccounts.length }) });
        if (!res.ok) throw new Error();
        toast.success('Rekening berhasil ditambahkan');
      }
      setBankDialogOpen(false);
      fetchBankAccounts();
    } catch { toast.error('Gagal menyimpan rekening'); } finally { setBankSaving(false); }
  };

  const handleDeleteBank = async () => {
    if (!businessId || !deleteBankId) return;
    try {
      const res = await fetch(`/api/business/${businessId}/bank-accounts/${deleteBankId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      toast.success('Rekening berhasil dihapus');
      fetchBankAccounts();
    } catch { toast.error('Gagal menghapus rekening'); } finally { setDeleteBankId(null); }
  };

  const handleSetDefault = async (acc: BankAccount) => {
    if (!businessId || acc.isDefault) return;
    try {
      const res = await fetch(`/api/business/${businessId}/bank-accounts/${acc.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...acc, isDefault: true }) });
      if (!res.ok) throw new Error();
      toast.success('Rekening utama berhasil diubah');
      fetchBankAccounts();
    } catch { toast.error('Gagal mengubah rekening utama'); }
  };

  /* ── Settings CRUD (unchanged) ────────────────────────────────── */
  const fetchSettings = useCallback(() => {
    if (!businessId) return;
    setLoading(true);
    fetch(`/api/business/${businessId}/invoice-settings`).then((res) => { if (!res.ok) throw new Error(); return res.json(); })
      .then((data) => {
        if (data && typeof data === 'object') {
          const loaded: InvoiceSettingsForm = {
            template: data.template || 'modern', primaryColor: data.primaryColor || '#BB86FC', secondaryColor: data.secondaryColor || '#03DAC6',
            logoUrl: data.logoUrl || '', signatureUrl: data.signatureUrl || '', businessName: data.businessName || '', address: data.businessAddress || '',
            phone: data.businessPhone || '', email: data.businessEmail || '', website: data.businessWebsite || '', bankName: data.bankName || '',
            accountNumber: data.bankAccount || '', accountHolderName: data.bankHolder || '', footerText: data.footerText || '', paymentTerms: data.termsText || '',
            darkMode: data.darkMode ?? false,
          };
          setForm(loaded);
          originalRef.current = loaded;
          // Load extra settings that aren't part of InvoiceSettingsForm
          if (data.ppnEnabled !== undefined) { setPpnEnabled(data.ppnEnabled); originalExtraRef.current.ppnEnabled = data.ppnEnabled; }
          if (data.ppnPercentage !== undefined) { setPpnPercentage(data.ppnPercentage); originalExtraRef.current.ppnPercentage = data.ppnPercentage; }
          if (data.defaultDueDays !== undefined) { setDefaultDueDays(data.defaultDueDays); originalExtraRef.current.defaultDueDays = data.defaultDueDays; }
          if (data.fontSize !== undefined) { setFontSize(data.fontSize); originalExtraRef.current.fontSize = data.fontSize; }
        }
      })
      .catch(() => { setForm(DEFAULT_FORM); originalRef.current = DEFAULT_FORM; })
      .finally(() => setLoading(false));
  }, [businessId]);

  // Track original extra settings for dirty detection
  const originalExtraRef = useRef({ ppnEnabled: true, ppnPercentage: '11', defaultDueDays: '30', fontSize: 'medium' as string });

  useEffect(() => { if (businessId) fetchSettings(); else setLoading(false); }, [businessId, fetchSettings]);
  useEffect(() => {
    const formChanged = JSON.stringify(form) !== JSON.stringify(originalRef.current);
    const extraChanged = (
      ppnEnabled !== originalExtraRef.current.ppnEnabled ||
      ppnPercentage !== originalExtraRef.current.ppnPercentage ||
      defaultDueDays !== originalExtraRef.current.defaultDueDays ||
      fontSize !== originalExtraRef.current.fontSize
    );
    setHasChanges(formChanged || extraChanged);
  }, [form, ppnEnabled, ppnPercentage, defaultDueDays, fontSize]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, field: 'logoUrl' | 'signatureUrl') => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { toast.error('File too large. Maximum size is 2MB.'); return; }
    const reader = new FileReader();
    reader.onload = () => { setForm((prev) => ({ ...prev, [field]: reader.result as string })); };
    reader.readAsDataURL(file);
    e.target.value = '';
  };
  const removeImage = (field: 'logoUrl' | 'signatureUrl') => { setForm((prev) => ({ ...prev, [field]: '' })); };

  const handleSave = async () => {
    if (!businessId) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/business/${businessId}/invoice-settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          template: form.template, primaryColor: form.primaryColor, secondaryColor: form.secondaryColor,
          logoUrl: form.logoUrl, signatureUrl: form.signatureUrl, businessName: form.businessName, businessAddress: form.address,
          businessPhone: form.phone, businessEmail: form.email, businessWebsite: form.website, bankName: form.bankName,
          bankAccount: form.accountNumber, bankHolder: form.accountHolderName, footerText: form.footerText, termsText: form.paymentTerms,
          darkMode: form.darkMode,
          ppnEnabled, ppnPercentage, defaultDueDays, fontSize,
        }),
      });
      if (!res.ok) throw new Error();
      originalRef.current = { ...form };
      originalExtraRef.current = { ppnEnabled, ppnPercentage, defaultDueDays, fontSize };
      setHasChanges(false);
      toast.success(t('biz.businessUpdated'));
    } catch { toast.error(t('common.error')); } finally { setSaving(false); }
  };

  const update = (field: keyof InvoiceSettingsForm, value: string) => { setForm((prev) => ({ ...prev, [field]: value })); };

  const fieldsFilled = [form.businessName, form.address, form.phone, form.email, form.website, form.bankName, form.accountNumber, form.accountHolderName, form.footerText, form.paymentTerms, form.logoUrl, form.signatureUrl].filter(Boolean).length;
  const totalFields = 12;
  const completionPct = Math.round((fieldsFilled / totalFields) * 100);

  if (!businessId) {
    return <div className="flex items-center justify-center min-h-[400px]"><p className="text-muted-foreground/50 text-center">{t('biz.registerFirst')}</p></div>;
  }

  return (
    <div className="space-y-3 sm:space-y-4 pb-8 relative overflow-hidden">
      {/* Ambient glows */}
      <div className="absolute -top-32 -left-20 h-[400px] w-[400px] rounded-full opacity-[0.06] blur-[100px] pointer-events-none" style={{ background: 'rgba(187,134,252,0.12)' }} />
      <div className="absolute top-60 -right-24 h-[350px] w-[350px] rounded-full opacity-[0.04] blur-[100px] pointer-events-none" style={{ background: 'rgba(103,58,183,0.15)' }} />
      <motion.div variants={containerVariants} initial="hidden" animate="visible">

        {/* ═══ Header ═══ */}
        <motion.div variants={itemVariants} className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: alpha(c.primary, 15) }}>
            <Settings className="h-4 w-4" style={{ color: c.primary }} />
          </div>
          <div>
            <h2 className="text-sm font-bold text-foreground">Invoice Settings</h2>
            <p className="text-[10px] text-muted-foreground">Template, branding & pembayaran</p>
          </div>
        </motion.div>

        {/* ═══ Completion Summary Row ═══ */}
        {!loading && (
          <motion.div variants={itemVariants} className="grid grid-cols-3 gap-2 sm:gap-3">
            {[
              { label: 'Template', value: form.template.charAt(0).toUpperCase() + form.template.slice(1), color: c.primary, icon: Layout },
              { label: 'Completion', value: `${completionPct}%`, color: c.secondary, icon: CheckCircle2 },
              { label: 'Brand', value: null, color: c.warning, icon: Palette },
            ].map((stat, i) => (
              <div key={i} className="biz-stat-card rounded-xl p-3 border border-border" style={{ backgroundColor: alpha(stat.color, 4) }}>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <div className="h-6 w-6 rounded-md flex items-center justify-center" style={{ backgroundColor: alpha(stat.color, 15) }}>
                    <stat.icon className="h-3 w-3" style={{ color: stat.color }} />
                  </div>
                  <p className="text-[9px] text-muted-foreground uppercase tracking-wider">{stat.label}</p>
                </div>
                {stat.value && <p className="text-sm font-bold text-foreground">{stat.value}</p>}
                {!stat.value && (
                  <div className="flex items-center gap-1.5">
                    <div className="h-5 w-5 rounded-full border border-border" style={{ backgroundColor: form.primaryColor }} />
                    <div className="h-5 w-5 rounded-full border border-border" style={{ backgroundColor: form.secondaryColor }} />
                  </div>
                )}
              </div>
            ))}
          </motion.div>
        )}

        {loading ? (
          <motion.div variants={itemVariants} className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-48 rounded-xl" style={{ backgroundColor: alpha(c.foreground, 4) }} />)}
          </motion.div>
        ) : (
          <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
            {/* ========== LEFT COLUMN ========== */}
            <div className="md:col-span-2 space-y-3 sm:space-y-4">

              {/* 1. Template Selection */}
              <Card className="biz-content-card bg-white/[0.02] border border-white/[0.06] backdrop-blur-xl rounded-xl overflow-hidden">
                <CardContent className="p-3 sm:p-4">
                  <SectionHeader icon={FileText} title="Template Selection" color={c.primary} />
                  <div className="grid grid-cols-3 gap-2">
                    {(Object.keys(TEMPLATE_META) as TemplateType[]).map((type) => {
                      const meta = TEMPLATE_META[type];
                      const selected = form.template === type;
                      return (
                        <motion.button type="button" key={type} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => update('template', type)}
                          className={cn('relative rounded-xl p-1.5 text-left transition-all cursor-pointer', selected ? 'border-2' : 'border border-border')}
                          style={selected ? { borderColor: c.primary, backgroundColor: alpha(c.primary, 4) } : { backgroundColor: alpha(c.foreground, 3) }}
                        >
                          {selected && <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full flex items-center justify-center" style={{ backgroundColor: c.primary }}><Check className="h-2.5 w-2.5 text-black" /></motion.div>}
                          <TemplatePreviewCard type={type} primaryColor={form.primaryColor} secondaryColor={form.secondaryColor} businessName={form.businessName} logoUrl={form.logoUrl} />
                          <div className="mt-1.5 px-0.5"><p className={cn('text-[10px] font-semibold', selected ? 'text-foreground' : 'text-muted-foreground/60')}>{meta.label}</p></div>
                        </motion.button>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* 2. Invoice Template Settings */}
              <Card className="biz-content-card bg-white/[0.02] border border-white/[0.06] backdrop-blur-xl rounded-xl overflow-hidden">
                <CardContent className="p-3 sm:p-4">
                  <SectionHeader icon={Settings} title="Invoice Template Settings" color={c.warning} />
                  <div className="space-y-3 sm:space-y-4">
                    {/* Default Due Days */}
                    <div className="space-y-1.5">
                      <Label className="text-[11px] text-muted-foreground flex items-center gap-1.5"><Clock className="h-3 w-3" />Default Jatuh Tempo (hari)</Label>
                      <Input value={defaultDueDays} onChange={(e) => setDefaultDueDays(e.target.value)} placeholder="30" className="h-9 text-xs bg-transparent border-border rounded-lg tabular-nums w-32" />
                    </div>
                    {/* PPN Toggle + Percentage */}
                    <div className="flex items-center justify-between p-3 rounded-lg border border-border" style={{ backgroundColor: alpha(c.foreground, 3) }}>
                      <div className="flex items-center gap-2.5">
                        <div className="h-8 w-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: alpha(c.secondary, 12) }}>
                          <Percent className="h-4 w-4" style={{ color: c.secondary }} />
                        </div>
                        <div>
                          <p className="text-xs font-medium text-foreground">PPN (Pajak)</p>
                          <p className="text-[10px] text-muted-foreground">Otomatis hitung PPN di invoice</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch checked={ppnEnabled} onCheckedChange={setPpnEnabled} className="data-[state=checked]:bg-secondary" />
                        {ppnEnabled && (
                          <motion.div initial={{ opacity: 0, width: 0 }} animate={{ opacity: 1, width: 'auto' }} className="flex items-center gap-1">
                            <Input value={ppnPercentage} onChange={(e) => setPpnPercentage(e.target.value)} className="h-7 w-14 text-[11px] bg-transparent border-border rounded-md tabular-nums text-center" />
                            <span className="text-[10px] text-muted-foreground">%</span>
                          </motion.div>
                        )}
                      </div>
                    </div>
                    {/* Font Size */}
                    <div className="space-y-1.5">
                      <Label className="text-[11px] text-muted-foreground flex items-center gap-1.5"><Type className="h-3 w-3" />Ukuran Font</Label>
                      <div className="flex items-center gap-1.5 p-0.5 rounded-lg w-fit" style={{ backgroundColor: alpha(c.foreground, 4) }}>
                        {(['small', 'medium', 'large'] as const).map((size) => (
                          <button key={size} onClick={() => setFontSize(size)}
                            className={cn('px-3 py-1.5 text-[10px] font-medium rounded-md transition-all capitalize',
                              fontSize === size ? 'shadow-sm' : 'text-muted-foreground'
                            )}
                            style={fontSize === size ? { backgroundColor: alpha(c.primary, 15), color: c.primary } : {}}
                          >{size === 'small' ? 'Kecil' : size === 'medium' ? 'Sedang' : 'Besar'}</button>
                        ))}
                      </div>
                    </div>
                    {/* Dark Mode PDF */}
                    <div className="space-y-1.5">
                      <Label className="text-[11px] text-muted-foreground flex items-center gap-1.5"><Moon className="h-3 w-3" />Tema Gelap PDF</Label>
                      <div className="flex items-center justify-between p-2.5 rounded-lg" style={{ backgroundColor: alpha(c.foreground, 4) }}>
                        <div>
                          <p className="text-[10px] font-medium text-foreground">Background Gelap</p>
                          <p className="text-[9px] text-muted-foreground">Invoice yang diunduh akan menggunakan tema gelap</p>
                        </div>
                        <Switch
                          checked={form.darkMode}
                          onCheckedChange={(checked) => {
                            setForm((prev) => ({ ...prev, darkMode: checked }));
                            setHasChanges(true);
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 3. Business Info */}
              <Card className="biz-content-card bg-white/[0.02] border border-white/[0.06] backdrop-blur-xl rounded-xl overflow-hidden">
                <CardContent className="p-3 sm:p-4">
                  <SectionHeader icon={Building2} title="Informasi Bisnis" color="#CF6679" />
                  {/* Logo + Signature */}
                  <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-3 sm:mb-4">
                    <div className="space-y-1.5">
                      <Label className="text-[11px] text-muted-foreground flex items-center gap-1.5"><Upload className="h-3 w-3" />Logo</Label>
                      <input ref={logoInputRef} type="file" accept="image/*" onChange={(e) => handleFileUpload(e, 'logoUrl')} className="hidden" />
                      {form.logoUrl ? (
                        <div className="relative group">
                          <img src={form.logoUrl} alt="Logo" className="h-[88px] w-[88px] object-cover rounded-xl border border-border" />
                          <button type="button" onClick={() => removeImage('logoUrl')} className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity" style={{ backgroundColor: c.destructive }}><X className="h-3 w-3 text-white" /></button>
                        </div>
                      ) : (
                        <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} type="button" onClick={() => logoInputRef.current?.click()} className="flex flex-col items-center justify-center h-[88px] w-full rounded-xl border-2 border-dashed border-border hover:border-primary/50 transition-colors cursor-pointer" style={{ backgroundColor: alpha(c.foreground, 2) }}>
                          <Upload className="h-5 w-5 text-muted-foreground/25 mb-1" /><span className="text-[10px] text-muted-foreground/25">Upload Logo</span>
                        </motion.button>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[11px] text-muted-foreground flex items-center gap-1.5"><PenLine className="h-3 w-3" />Tanda Tangan</Label>
                      <input ref={sigInputRef} type="file" accept="image/*" onChange={(e) => handleFileUpload(e, 'signatureUrl')} className="hidden" />
                      {form.signatureUrl ? (
                        <div className="relative group">
                          <img src={form.signatureUrl} alt="Signature" className="h-[88px] max-w-full object-contain rounded-xl border border-border" style={{ backgroundColor: alpha(c.foreground, 2) }} />
                          <button type="button" onClick={() => removeImage('signatureUrl')} className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity" style={{ backgroundColor: c.destructive }}><X className="h-3 w-3 text-white" /></button>
                        </div>
                      ) : (
                        <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} type="button" onClick={() => sigInputRef.current?.click()} className="flex flex-col items-center justify-center h-[88px] w-full rounded-xl border-2 border-dashed border-border hover:border-primary/50 transition-colors cursor-pointer" style={{ backgroundColor: alpha(c.foreground, 2) }}>
                          <PenLine className="h-5 w-5 text-muted-foreground/25 mb-1" /><span className="text-[10px] text-muted-foreground/25">Upload TTD</span>
                        </motion.button>
                      )}
                    </div>
                  </div>
                  {/* Business fields */}
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <Label className="text-[11px] text-muted-foreground">Nama Bisnis</Label>
                      <Input value={form.businessName} onChange={(e) => update('businessName', e.target.value)} placeholder="Nama bisnis Anda" className="h-9 text-xs bg-transparent border-border rounded-lg" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[11px] text-muted-foreground">Alamat</Label>
                      <Textarea value={form.address} onChange={(e) => update('address', e.target.value)} placeholder="Alamat lengkap" className="text-xs bg-transparent border-border rounded-lg min-h-[56px] resize-none" />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-[11px] text-muted-foreground flex items-center gap-1"><Phone className="h-2.5 w-2.5" />Telepon</Label>
                        <Input value={form.phone} onChange={(e) => update('phone', e.target.value)} placeholder="+62..." className="h-9 text-xs bg-transparent border-border rounded-lg" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[11px] text-muted-foreground flex items-center gap-1"><Mail className="h-2.5 w-2.5" />Email</Label>
                        <Input type="email" value={form.email} onChange={(e) => update('email', e.target.value)} placeholder="email@..." className="h-9 text-xs bg-transparent border-border rounded-lg" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[11px] text-muted-foreground flex items-center gap-1"><Globe className="h-2.5 w-2.5" />Website</Label>
                        <Input value={form.website} onChange={(e) => update('website', e.target.value)} placeholder="www..." className="h-9 text-xs bg-transparent border-border rounded-lg" />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 4. Color & Branding */}
              <Card className="biz-content-card bg-white/[0.02] border border-white/[0.06] backdrop-blur-xl rounded-xl overflow-hidden">
                <CardContent className="p-3 sm:p-4">
                  <SectionHeader icon={Palette} title="Warna & Branding" color={c.secondary} />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <ColorSwatch label="Primary Color" color={form.primaryColor} onChange={(v) => update('primaryColor', v)} />
                    <ColorSwatch label="Secondary / Accent" color={form.secondaryColor} onChange={(v) => update('secondaryColor', v)} />
                  </div>
                  <motion.div layout className="mt-3 h-10 rounded-lg overflow-hidden border border-border" style={{ background: `linear-gradient(135deg, ${form.primaryColor}, ${form.secondaryColor})` }}>
                    <div className="h-full flex items-center justify-center">
                      <span className="text-xs font-bold drop-shadow-sm" style={{ color: '#000' }}>{form.businessName || 'Invoice Header Preview'}</span>
                    </div>
                  </motion.div>
                </CardContent>
              </Card>

              {/* 5. Rekening Pembayaran */}
              <Card className="biz-content-card bg-white/[0.02] border border-white/[0.06] backdrop-blur-xl rounded-xl overflow-hidden">
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="h-7 w-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: alpha(c.secondary, 12) }}><Landmark className="h-3.5 w-3.5" style={{ color: c.secondary }} /></div>
                      <div><h3 className="text-xs font-semibold text-foreground">Rekening Pembayaran</h3><p className="text-[9px] text-muted-foreground/50">{bankAccounts.length}/{MAX_BANK_ACCOUNTS} rekening</p></div>
                    </div>
                    <Button onClick={openAddBankDialog} disabled={bankAccounts.length >= MAX_BANK_ACCOUNTS} size="sm" className="rounded-lg h-7 text-[10px]" style={{ backgroundColor: bankAccounts.length >= MAX_BANK_ACCOUNTS ? alpha(c.muted, 15) : c.secondary, color: bankAccounts.length >= MAX_BANK_ACCOUNTS ? c.muted : '#000' }}>
                      <Plus className="h-3 w-3 mr-1" />Tambah
                    </Button>
                  </div>
                  {bankAccounts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-6 rounded-lg border border-dashed border-border" style={{ backgroundColor: alpha(c.foreground, 2) }}>
                      <Landmark className="h-5 w-5 text-muted-foreground/20 mb-1.5" />
                      <p className="text-[10px] text-muted-foreground/40">Belum ada rekening</p>
                    </div>
                  ) : (
                    <div className="space-y-1.5 max-h-[300px] overflow-y-auto">
                      <AnimatePresence>{bankAccounts.map((acc, idx) => (
                        <motion.div key={acc.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ delay: idx * 0.03 }}
                          className={cn('group flex items-center gap-2.5 p-2.5 rounded-lg border transition-all', acc.isDefault ? '' : '')}
                          style={{ backgroundColor: acc.isDefault ? alpha(c.secondary, 5) : alpha(c.foreground, 2), borderColor: acc.isDefault ? alpha(c.secondary, 20) : alpha(c.foreground, 6) }}
                        >
                          <div className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: acc.isDefault ? alpha(c.secondary, 15) : alpha(c.muted, 8) }}><Landmark className="h-3.5 w-3.5" style={{ color: acc.isDefault ? c.secondary : c.muted }} /></div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5"><p className="text-xs font-medium text-foreground truncate">{acc.bankName}</p>{acc.isDefault && <Badge variant="outline" border-0 className="text-[8px] px-1 py-0 rounded-full" style={{ backgroundColor: alpha(c.secondary, 15), color: c.secondary }}><Star className="h-1.5 w-1.5 mr-0.5" />Utama</Badge>}</div>
                            <p className="text-[10px] text-muted-foreground/50 font-mono mt-0.5 tabular-nums">{maskAccountNumber(acc.accountNumber)}</p>
                            <p className="text-[10px] text-muted-foreground/40 mt-0.5">a.n. {acc.accountHolder}</p>
                          </div>
                          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                            {!acc.isDefault && <Button variant="ghost" size="sm" className="h-7 w-7 p-0 rounded-md text-muted-foreground/40 hover:text-warning" onClick={() => handleSetDefault(acc)}><Star className="h-3 w-3" /></Button>}
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 rounded-md text-muted-foreground/40 hover:text-primary" onClick={() => openEditBankDialog(acc)}><Pencil className="h-3 w-3" /></Button>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 rounded-md text-muted-foreground/40 hover:text-destructive" onClick={() => setDeleteBankId(acc.id)}><Trash2 className="h-3 w-3" /></Button>
                          </div>
                        </motion.div>
                      ))}</AnimatePresence>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* 6. Footer & Payment Terms */}
              <Card className="biz-content-card bg-white/[0.02] border border-white/[0.06] backdrop-blur-xl rounded-xl overflow-hidden">
                <CardContent className="p-3 sm:p-4">
                  <SectionHeader icon={Sparkles} title="Footer & Ketentuan" color="#BB86FC" />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-[11px] text-muted-foreground">Footer Text</Label>
                      <Textarea value={form.footerText} onChange={(e) => update('footerText', e.target.value)} placeholder="Terima kasih atas kepercayaan Anda..." className="text-xs bg-transparent border-border rounded-lg min-h-[72px] resize-none" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[11px] text-muted-foreground">Ketentuan Pembayaran</Label>
                      <Textarea value={form.paymentTerms} onChange={(e) => update('paymentTerms', e.target.value)} placeholder="Pembayaran jatuh tempo 30 hari..." className="text-xs bg-transparent border-border rounded-lg min-h-[72px] resize-none" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* ========== RIGHT COLUMN — Live Preview ========== */}
            <div className="md:col-span-1">
              <div className="md:sticky md:top-4">
                <div className="relative rounded-2xl">
                  {/* Desktop gradient border glow */}
                  <div className="absolute -inset-[1.5px] rounded-[18px] hidden lg:block"
                    style={{
                      background: 'linear-gradient(135deg, rgba(187,134,252,0.15), rgba(103,58,183,0.2), rgba(187,134,252,0.15))',
                      filter: 'blur(2px)', opacity: 0.4,
                      animation: 'heroGlow 4s ease-in-out infinite',
                    }}
                  />
                <Card className="biz-content-card relative rounded-xl overflow-hidden" style={{ background: 'linear-gradient(135deg, rgba(187,134,252,0.06), rgba(103,58,183,0.03))', border: '1px solid rgba(187,134,252,0.12)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)' }}>
                  <CardContent className="p-3 sm:p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="h-7 w-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: alpha(c.secondary, 12) }}><Eye className="h-3.5 w-3.5" style={{ color: c.secondary }} /></div>
                      <h3 className="text-xs font-semibold text-foreground">Preview Invoice</h3>
                      <Badge variant="outline" border-0 className="text-[9px] px-1.5 py-0 rounded-full ml-auto" style={{ backgroundColor: alpha(c.secondary, 12), color: c.secondary }}>Live</Badge>
                    </div>
                    <AnimatePresence mode="wait"><LivePreview form={form} /></AnimatePresence>
                    {(form.bankName || form.accountNumber || form.accountHolderName) && (
                      <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="mt-3 rounded-lg p-2.5 border border-border" style={{ backgroundColor: alpha(c.foreground, 3) }}>
                        <p className="text-[8px] text-muted-foreground/40 uppercase tracking-wider font-semibold mb-1.5">Payment Details</p>
                        <div className="space-y-0.5 text-[9px]">
                          {form.bankName && <div className="flex justify-between"><span className="text-muted-foreground/40">Bank</span><span className="text-muted-foreground/70">{form.bankName}</span></div>}
                          {form.accountNumber && <div className="flex justify-between"><span className="text-muted-foreground/40">Account</span><span className="text-muted-foreground/70 font-mono tabular-nums">{form.accountNumber}</span></div>}
                          {form.accountHolderName && <div className="flex justify-between"><span className="text-muted-foreground/40">Holder</span><span className="text-muted-foreground/70">{form.accountHolderName}</span></div>}
                        </div>
                      </motion.div>
                    )}
                    {form.signatureUrl && (
                      <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="mt-2 rounded-lg p-2.5 border border-border" style={{ backgroundColor: alpha(c.foreground, 3) }}>
                        <p className="text-[8px] text-muted-foreground/40 uppercase tracking-wider font-semibold mb-1">Signature</p>
                        <img src={form.signatureUrl} alt="Signature" className="h-10 max-w-[140px] object-contain" />
                      </motion.div>
                    )}
                    {form.paymentTerms && (
                      <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="mt-2 rounded-lg p-2.5 border border-border" style={{ backgroundColor: alpha(c.foreground, 3) }}>
                        <p className="text-[8px] text-muted-foreground/40 uppercase tracking-wider font-semibold mb-0.5">Terms</p>
                        <p className="text-[8px] text-muted-foreground/50 italic leading-relaxed">{form.paymentTerms}</p>
                      </motion.div>
                    )}
                  </CardContent>
                </Card>
                <div className="absolute top-0 left-4 right-4 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(187,134,252,0.3), rgba(103,58,183,0.2), transparent)' }} />
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </motion.div>
      <style>{`
        @keyframes heroGlow { 0%, 100% { opacity: 0.3; } 50% { opacity: 0.6; } }
        @keyframes shimmer { 0% { transform: translateX(-150%); } 100% { transform: translateX(250%); } }
      `}</style>

      {/* ═══ Bank Account Dialog ═══ */}
      <Dialog open={bankDialogOpen} onOpenChange={setBankDialogOpen}>
        <DialogContent className="biz-dialog-content bg-card border border-border text-foreground sm:max-w-[440px] rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-sm flex items-center gap-2">
              <div className={cn('h-6 w-6 rounded-md flex items-center justify-center', editingBank ? 'bg-warning/20' : 'bg-secondary/20')}>
                {editingBank ? <Pencil className="h-3 w-3 text-warning" /> : <Plus className="h-3 w-3 text-secondary" />}
              </div>
              {editingBank ? 'Edit Rekening' : 'Tambah Rekening'}
            </DialogTitle>
            <DialogDescription className="text-[11px] text-muted-foreground">{editingBank ? 'Perbarui informasi rekening' : 'Tambahkan rekening bank baru'}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5"><Label className="text-[11px] text-muted-foreground">Nama Bank *</Label><Input value={bankForm.bankName} onChange={(e) => setBankForm({ ...bankForm, bankName: e.target.value })} placeholder="BCA, Mandiri..." className="h-9 text-xs bg-transparent border-border rounded-lg" /></div>
            <div className="space-y-1.5"><Label className="text-[11px] text-muted-foreground">Nomor Rekening *</Label><Input value={bankForm.accountNumber} onChange={(e) => setBankForm({ ...bankForm, accountNumber: e.target.value })} placeholder="1234567890" className="h-9 text-xs bg-transparent border-border rounded-lg font-mono tabular-nums" /></div>
            <div className="space-y-1.5"><Label className="text-[11px] text-muted-foreground">Nama Pemilik *</Label><Input value={bankForm.accountHolder} onChange={(e) => setBankForm({ ...bankForm, accountHolder: e.target.value })} placeholder="Nama pemilik" className="h-9 text-xs bg-transparent border-border rounded-lg" /></div>
            <div className="flex items-center justify-between p-3 rounded-lg border border-border" style={{ backgroundColor: alpha(c.foreground, 3) }}>
              <div><p className="text-[11px] text-muted-foreground font-medium">Rekening Utama</p><p className="text-[9px] text-muted-foreground/50">Ditampilkan pertama di invoice</p></div>
              <Switch checked={bankForm.isDefault} onCheckedChange={(checked) => setBankForm({ ...bankForm, isDefault: checked })} className="data-[state=checked]:bg-secondary" />
            </div>
          </div>
          <DialogFooter className="gap-2 pt-2">
            <Button variant="outline" onClick={() => setBankDialogOpen(false)} className="rounded-lg text-xs h-9 border-border">Batal</Button>
            <Button disabled={bankSaving || !bankForm.bankName.trim() || !bankForm.accountNumber.trim() || !bankForm.accountHolder.trim()} onClick={handleSaveBank} className="rounded-lg text-xs h-9" style={{ backgroundColor: c.secondary, color: '#000' }}>
              {bankSaving && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}{editingBank ? 'Simpan' : 'Tambah'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══ Delete Bank Dialog ═══ */}
      <AlertDialog open={!!deleteBankId} onOpenChange={(open) => !open && setDeleteBankId(null)}>
        <AlertDialogContent className="bg-card border border-border text-foreground rounded-xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-sm">Hapus Rekening?</AlertDialogTitle>
            <AlertDialogDescription className="text-[11px] text-muted-foreground">Tindakan ini tidak dapat dibatalkan.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-lg text-xs border-border">Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteBank} className="rounded-lg text-xs" style={{ backgroundColor: c.destructive }}>Hapus</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ═══ Floating Save Button ═══ */}
      <AnimatePresence>
        {(hasChanges || saving) && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2"
          >
            {saving && (
              <motion.div
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                className="px-3 py-1.5 rounded-lg border shadow-[0_4px_16px_rgba(0,0,0,0.3)]"
                style={{ backgroundColor: alpha(c.primary, 8), borderColor: alpha(c.primary, 20) }}
              >
                <span className="text-[11px] font-medium" style={{ color: c.primary }}>Menyimpan...</span>
              </motion.div>
            )}
            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              onClick={handleSave}
              disabled={saving || !hasChanges}
              className={cn(
                'relative flex items-center gap-2 h-12 px-6 rounded-2xl font-semibold text-sm shadow-[0_8px_32px_rgba(0,0,0,0.4)] transition-all duration-300 backdrop-blur-sm',
                saving
                  ? 'opacity-70 cursor-wait'
                  : 'hover:shadow-[0_8px_40px_rgba(0,0,0,0.5)] cursor-pointer',
              )}
              style={{ backgroundColor: c.primary, color: '#000' }}
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              <span>{saving ? 'Menyimpan...' : t('common.save')}</span>
              {!saving && hasChanges && (
                <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full animate-pulse" style={{ backgroundColor: c.secondary, border: '2px solid var(--background)' }} />
              )}
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
