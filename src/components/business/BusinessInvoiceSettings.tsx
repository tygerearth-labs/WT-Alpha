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
  Settings,
  Palette,
  Upload,
  CreditCard,
  FileText,
  Eye,
  Save,
  ImageIcon,
  PenLine,
  Building2,
  Phone,
  Mail,
  Globe,
  Landmark,
  Hash,
  User,
  X,
  Check,
  Layout,
  CheckCircle2,
  Sparkles,
  Plus,
  Pencil,
  Trash2,
  Star,
} from 'lucide-react';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.07, delayChildren: 0.05 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' as const } },
};

const cardHover = {
  rest: { scale: 1 },
  hover: { scale: 1.01, transition: { duration: 0.2 } },
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
};

const TEMPLATE_META: Record<
  TemplateType,
  { label: string; desc: string; className: string; color: string }
> = {
  modern: {
    label: 'Modern',
    desc: 'Bold header with gradient accent bar',
    className: 'bg-gradient-to-r from-primary to-secondary',
    color: 'var(--primary)',
  },
  classic: {
    label: 'Classic',
    desc: 'Traditional layout with elegant typography',
    className: 'bg-destructive',
    color: 'var(--destructive)',
  },
  minimal: {
    label: 'Minimal',
    desc: 'Simple and clean with maximum whitespace',
    className: 'bg-muted/50',
    color: 'var(--secondary)',
  },
};

/* ------------------------------------------------------------------ */
/*  Mini Template Previews                                              */
/* ------------------------------------------------------------------ */

function TemplatePreviewCard({
  type,
  primaryColor,
  secondaryColor,
  businessName,
  logoUrl,
}: {
  type: TemplateType;
  primaryColor: string;
  secondaryColor: string;
  businessName: string;
  logoUrl: string;
}) {
  const display = businessName || 'My Business';

  if (type === 'modern') {
    return (
      <div className="w-full h-36 rounded-lg overflow-hidden border border-border bg-background text-[8px] text-muted-foreground/60 flex flex-col">
        <div
          className="h-7 flex items-center px-2 gap-1.5 shrink-0"
          style={{ backgroundColor: primaryColor }}
        >
          {logoUrl ? (
            <img src={logoUrl} alt="" className="h-4 w-4 rounded object-cover" />
          ) : (
            <div className="h-4 w-4 rounded bg-black/20" />
          )}
          <span className="font-bold text-black text-[7px] truncate">{display}</span>
        </div>
        <div className="px-2 py-1 space-y-1 flex-1">
          <div className="flex justify-between">
            <div className="space-y-0.5">
              <div className="h-1 w-14 bg-white/10 rounded" />
              <div className="h-1 w-10 bg-white/10 rounded" />
            </div>
            <div className="text-right space-y-0.5">
              <div className="h-1 w-12 bg-white/10 rounded ml-auto" />
              <div className="h-1 w-8 bg-white/10 rounded ml-auto" />
            </div>
          </div>
          <div className="mt-0.5">
            <div className="h-1 w-full rounded mb-0.5" style={{ backgroundColor: secondaryColor, opacity: 0.3 }} />
            <div className="h-1 w-full bg-muted/30 rounded mb-0.5" />
            <div className="h-1 w-full bg-muted/30 rounded" />
          </div>
          <div className="h-1.5 w-12 rounded mt-auto ml-auto" style={{ backgroundColor: primaryColor, opacity: 0.5 }} />
        </div>
      </div>
    );
  }

  if (type === 'classic') {
    return (
      <div className="w-full h-36 rounded-lg overflow-hidden border border-border bg-background text-[8px] text-muted-foreground/60 flex flex-col">
        <div className="px-2 py-1.5 text-center border-b border-border">
          <span className="font-bold text-[9px] tracking-wider uppercase" style={{ color: primaryColor }}>
            {display}
          </span>
          <div className="h-0.5 w-8 mx-auto mt-0.5 rounded" style={{ backgroundColor: primaryColor }} />
        </div>
        <div className="px-2 py-1 space-y-1 flex-1">
          <div className="flex justify-between">
            <div className="space-y-0.5">
              <div className="h-1 w-14 bg-white/10 rounded" />
              <div className="h-1 w-10 bg-white/10 rounded" />
              <div className="h-1 w-12 bg-white/10 rounded" />
            </div>
            <div className="space-y-0.5">
              <div className="h-1 w-12 bg-white/10 rounded ml-auto" />
              <div className="h-1 w-8 bg-white/10 rounded ml-auto" />
            </div>
          </div>
          <div className="border-t border-border pt-0.5 mt-1">
            <div className="h-1 w-full bg-muted/30 rounded mb-0.5" />
            <div className="h-1 w-full bg-muted/30 rounded mb-0.5" />
            <div className="h-1 w-3/4 bg-muted/30 rounded" />
          </div>
          <div className="h-1.5 w-12 rounded mt-auto ml-auto" style={{ backgroundColor: primaryColor, opacity: 0.5 }} />
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-36 rounded-lg overflow-hidden border border-border bg-background text-[8px] text-muted-foreground/60 flex flex-col">
      <div className="px-2 pt-1.5 pb-1 flex items-center justify-between">
        <div className="flex items-center gap-1">
          {logoUrl ? (
            <img src={logoUrl} alt="" className="h-4 w-4 rounded object-cover" />
          ) : (
            <div className="h-4 w-4 rounded bg-muted/50" />
          )}
          <span className="font-semibold text-[7px] text-muted-foreground/80 truncate">{display}</span>
        </div>
        <div className="h-1.5 w-6 bg-muted/40 rounded" />
      </div>
      <div className="px-2 py-1 space-y-0.5 flex-1">
        <div className="h-1 w-full bg-muted/30 rounded" />
        <div className="h-1 w-full bg-muted/30 rounded" />
        <div className="h-1 w-full bg-muted/30 rounded" />
        <div className="border-t border-border pt-0.5 mt-1">
          <div className="h-1 w-full bg-muted/30 rounded" />
          <div className="h-1 w-full bg-muted/30 rounded" />
        </div>
      </div>
      <div className="px-2 pb-1">
        <div className="h-1.5 w-10 rounded ml-auto bg-muted/50" />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Color Swatch                                                       */
/* ------------------------------------------------------------------ */

function ColorSwatch({
  color,
  label,
  onChange,
}: {
  color: string;
  label: string;
  onChange: (val: string) => void;
}) {
  const [text, setText] = useState(color);
  const [localColor, setLocalColor] = useState(color);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setText(color);
    setLocalColor(color);
  }, [color]);

  const handleTextChange = (val: string) => {
    const cleaned = val.replace(/[^#0-9a-fA-F]/g, '');
    const clamped = cleaned.length > 7 ? cleaned.slice(0, 7) : cleaned;
    setText(clamped);
    if (/^#[0-9a-fA-F]{6}$/.test(clamped)) {
      setLocalColor(clamped);
      onChange(clamped);
    }
  };

  return (
    <div className="flex items-center gap-3">
      <motion.button
        type="button"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => inputRef.current?.click()}
        className="relative h-10 w-10 rounded-lg border border-border shrink-0 cursor-pointer"
        style={{ backgroundColor: localColor }}
        aria-label={`Pick ${label}`}
      >
        <input
          ref={inputRef}
          type="color"
          value={localColor.startsWith('#') ? localColor : '#BB86FC'}
          onChange={(e) => {
            const c = e.target.value;
            setLocalColor(c);
            setText(c);
            onChange(c);
          }}
          className="absolute inset-0 opacity-0 cursor-pointer h-full w-full"
        />
      </motion.button>
      <div className="flex-1">
        <Label className="text-muted-foreground/80 text-xs">{label}</Label>
        <div className="flex items-center gap-1.5 mt-1">
          <span className="text-muted-foreground/40 text-xs">Hex</span>
          <Input
            value={text}
            onChange={(e) => handleTextChange(e.target.value)}
            className="h-8 bg-muted/30 border-border text-foreground text-xs font-mono w-28 rounded-lg focus:border-primary/40"
            maxLength={7}
          />
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Live Invoice Preview                                                */
/* ------------------------------------------------------------------ */

function LivePreview({ form }: { form: InvoiceSettingsForm }) {
  const { formatAmount } = useCurrencyFormat();

  const sampleItems = [
    { desc: 'Web Design Service', qty: 1, price: 1500000 },
    { desc: 'Logo Concept', qty: 3, price: 500000 },
  ];
  const subtotal = sampleItems.reduce((s, i) => s + i.qty * i.price, 0);
  const tax = subtotal * 0.11;
  const total = subtotal + tax;

  const bizName = form.businessName || 'My Business';
  const accent = form.primaryColor || '#BB86FC';
  const secondary = form.secondaryColor || '#03DAC6';

  if (form.template === 'modern') {
    return (
      <motion.div
        key="modern"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="w-full rounded-xl overflow-hidden border border-border bg-background text-[10px] text-muted-foreground/70 shadow-lg"
      >
        <div className="h-14 flex items-center justify-between px-4" style={{ background: `linear-gradient(135deg, ${accent}, ${secondary})` }}>
          <div className="flex items-center gap-2">
            {form.logoUrl ? (
              <img src={form.logoUrl} alt="" className="h-8 w-8 rounded-md object-cover bg-white/20" />
            ) : (
              <div className="h-8 w-8 rounded-md bg-black/20 flex items-center justify-center">
                <Building2 className="h-4 w-4 text-black/60" />
              </div>
            )}
            <div>
              <p className="font-bold text-black text-xs">{bizName}</p>
              {form.phone && <p className="text-black/60 text-[8px]">{form.phone}</p>}
            </div>
          </div>
          <div className="text-right">
            <p className="font-bold text-black text-xs">INV-2024-001</p>
            <p className="text-black/60 text-[8px]">{new Date().toLocaleDateString()}</p>
          </div>
        </div>
        <div className="p-3 space-y-2">
          <div className="flex justify-between text-[9px]">
            <div>
              <p className="text-muted-foreground/40 mb-0.5">Bill To:</p>
              <p className="text-muted-foreground/80 font-medium">John Customer</p>
            </div>
            <div className="text-right text-muted-foreground/40">
              <p>Due: {new Date(Date.now() + 30 * 86400000).toLocaleDateString()}</p>
            </div>
          </div>
          <div className="rounded-lg border border-border overflow-hidden">
            <div className="grid grid-cols-12 gap-0 px-2 py-1 text-[8px] font-semibold text-muted-foreground/50 uppercase tracking-wider" style={{ backgroundColor: `${accent}10` }}>
              <span className="col-span-6">Item</span>
              <span className="col-span-2 text-center">Qty</span>
              <span className="col-span-2 text-right">Price</span>
              <span className="col-span-2 text-right">Total</span>
            </div>
            {sampleItems.map((item, i) => (
              <div key={i} className={cn('grid grid-cols-12 gap-0 px-2 py-1 text-[9px]', i < sampleItems.length - 1 ? 'border-b border-border' : '')}>
                <span className="col-span-6 text-muted-foreground/80">{item.desc}</span>
                <span className="col-span-2 text-center text-muted-foreground/50">{item.qty}</span>
                <span className="col-span-2 text-right text-muted-foreground/50">{formatAmount(item.price)}</span>
                <span className="col-span-2 text-right text-muted-foreground/80">{formatAmount(item.qty * item.price)}</span>
              </div>
            ))}
          </div>
          <div className="flex justify-end">
            <div className="w-36 space-y-0.5 text-[9px]">
              <div className="flex justify-between text-muted-foreground/50">
                <span>Subtotal</span>
                <span>{formatAmount(subtotal)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground/50">
                <span>Tax (11%)</span>
                <span>{formatAmount(tax)}</span>
              </div>
              <div className="flex justify-between font-bold text-foreground text-[10px] pt-1 border-t border-border">
                <span>Total</span>
                <span style={{ color: accent }}>{formatAmount(total)}</span>
              </div>
            </div>
          </div>
          {form.footerText && (
            <div className="pt-1 border-t border-border">
              <p className="text-muted-foreground/30 text-[7px] italic">{form.footerText}</p>
            </div>
          )}
        </div>
      </motion.div>
    );
  }

  if (form.template === 'classic') {
    return (
      <motion.div
        key="classic"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="w-full rounded-xl overflow-hidden border border-border bg-background text-[10px] text-muted-foreground/70 shadow-lg"
      >
        <div className="px-4 pt-3 pb-2 text-center border-b border-border">
          <p className="font-bold text-xs tracking-widest uppercase" style={{ color: accent }}>{bizName}</p>
          <div className="h-0.5 w-10 mx-auto mt-1 rounded" style={{ backgroundColor: accent }} />
          <p className="text-[8px] text-muted-foreground/30 mt-1">Invoice #INV-2024-001</p>
        </div>
        <div className="p-3 space-y-2">
          <div className="grid grid-cols-2 gap-2 text-[9px]">
            <div>
              <p className="text-muted-foreground/40 mb-0.5">From:</p>
              <p className="text-muted-foreground/80">{bizName}</p>
              {form.address && <p className="text-muted-foreground/40">{form.address}</p>}
            </div>
            <div>
              <p className="text-muted-foreground/40 mb-0.5">Bill To:</p>
              <p className="text-muted-foreground/80">John Customer</p>
            </div>
          </div>
          <div className="rounded-lg border border-border overflow-hidden">
            <div className="grid grid-cols-12 gap-0 px-2 py-1 text-[8px] font-semibold text-muted-foreground/50 uppercase tracking-wider bg-muted/20">
              <span className="col-span-6">Description</span>
              <span className="col-span-2 text-center">Qty</span>
              <span className="col-span-2 text-right">Rate</span>
              <span className="col-span-2 text-right">Amount</span>
            </div>
            {sampleItems.map((item, i) => (
              <div key={i} className={cn('grid grid-cols-12 gap-0 px-2 py-1 text-[9px]', i < sampleItems.length - 1 ? 'border-b border-border' : '')}>
                <span className="col-span-6 text-muted-foreground/80">{item.desc}</span>
                <span className="col-span-2 text-center text-muted-foreground/50">{item.qty}</span>
                <span className="col-span-2 text-right text-muted-foreground/50">{formatAmount(item.price)}</span>
                <span className="col-span-2 text-right text-muted-foreground/80">{formatAmount(item.qty * item.price)}</span>
              </div>
            ))}
          </div>
          <div className="flex justify-end">
            <div className="w-36 space-y-0.5 text-[9px]">
              <div className="flex justify-between text-muted-foreground/50">
                <span>Subtotal</span>
                <span>{formatAmount(subtotal)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground/50">
                <span>Tax (11%)</span>
                <span>{formatAmount(tax)}</span>
              </div>
              <div className="flex justify-between font-bold text-foreground text-[10px] pt-1 border-t border-border">
                <span>Total</span>
                <span style={{ color: accent }}>{formatAmount(total)}</span>
              </div>
            </div>
          </div>
          {form.footerText && (
            <div className="pt-1 border-t border-border">
              <p className="text-muted-foreground/30 text-[7px] italic">{form.footerText}</p>
            </div>
          )}
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      key="minimal"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="w-full rounded-xl overflow-hidden border border-border bg-background text-[10px] text-muted-foreground/70 shadow-lg"
    >
      <div className="px-4 pt-3 pb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {form.logoUrl ? (
            <img src={form.logoUrl} alt="" className="h-6 w-6 rounded object-cover" />
          ) : (
            <div className="h-6 w-6 rounded bg-muted/40 flex items-center justify-center">
              <Building2 className="h-3 w-3 text-muted-foreground/30" />
            </div>
          )}
          <p className="font-medium text-xs text-muted-foreground/90">{bizName}</p>
        </div>
        <p className="text-muted-foreground/30 text-[8px]">INV-2024-001</p>
      </div>
      <div className="px-4 pb-3 space-y-2">
        <div className="flex justify-between text-[9px]">
          <div>
            <p className="text-muted-foreground/30 mb-0.5">To</p>
            <p className="text-muted-foreground/70">John Customer</p>
          </div>
          <div className="text-right text-muted-foreground/30 text-[9px]">
            <p>{new Date().toLocaleDateString()}</p>
          </div>
        </div>
        <div className="space-y-0.5">
          {sampleItems.map((item, i) => (
            <div key={i} className="flex justify-between text-[9px]">
              <span className="text-muted-foreground/70">{item.desc} <span className="text-muted-foreground/30">x{item.qty}</span></span>
              <span className="text-muted-foreground/70">{formatAmount(item.qty * item.price)}</span>
            </div>
          ))}
        </div>
        <div className="border-t border-border pt-1 flex justify-between font-bold text-foreground text-[10px]">
          <span>Total</span>
          <span style={{ color: accent }}>{formatAmount(total)}</span>
        </div>
        {form.footerText && <p className="text-muted-foreground/25 text-[7px] italic">{form.footerText}</p>}
      </div>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Section Header                                                     */
/* ------------------------------------------------------------------ */

function SectionHeader({
  icon: Icon,
  title,
  color,
}: {
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  title: string;
  color: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex items-center gap-2 mb-4"
    >
      <div className="h-8 w-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${color}18` }}>
        <Icon className="h-4 w-4" style={{ color }} />
      </div>
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Mask Account Number                                                 */
/* ------------------------------------------------------------------ */

function maskAccountNumber(accountNumber: string): string {
  if (!accountNumber || accountNumber.length <= 6) return accountNumber;
  const first = accountNumber.slice(0, 3);
  const last = accountNumber.slice(-3);
  const middle = '*'.repeat(Math.min(accountNumber.length - 6, 10));
  return `${first}${middle}${last}`;
}

/* ================================================================== */
/*  Main Component                                                     */
/* ================================================================== */

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

  /* ---- Bank Accounts State ---- */
  interface BankAccount {
    id: string;
    bankName: string;
    accountNumber: string;
    accountHolder: string;
    isDefault: boolean;
    displayOrder: number;
  }
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [bankDialogOpen, setBankDialogOpen] = useState(false);
  const [editingBank, setEditingBank] = useState<BankAccount | null>(null);
  const [deleteBankId, setDeleteBankId] = useState<string | null>(null);
  const [bankSaving, setBankSaving] = useState(false);
  const [bankForm, setBankForm] = useState({
    bankName: '',
    accountNumber: '',
    accountHolder: '',
    isDefault: false,
  });

  const businessId = activeBusiness?.id;
  const MAX_BANK_ACCOUNTS = 5;

  /* ---- Bank Accounts CRUD ---- */
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

  const openAddBankDialog = () => {
    setEditingBank(null);
    const shouldBeDefault = bankAccounts.length === 0;
    setBankForm({ bankName: '', accountNumber: '', accountHolder: '', isDefault: shouldBeDefault });
    setBankDialogOpen(true);
  };

  const openEditBankDialog = (acc: BankAccount) => {
    setEditingBank(acc);
    setBankForm({ bankName: acc.bankName, accountNumber: acc.accountNumber, accountHolder: acc.accountHolder, isDefault: acc.isDefault });
    setBankDialogOpen(true);
  };

  const handleSaveBank = async () => {
    if (!businessId || !bankForm.bankName.trim() || !bankForm.accountNumber.trim() || !bankForm.accountHolder.trim()) return;
    setBankSaving(true);
    try {
      if (editingBank) {
        const res = await fetch(`/api/business/${businessId}/bank-accounts/${editingBank.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(bankForm),
        });
        if (!res.ok) throw new Error();
        toast.success('Rekening berhasil diperbarui');
      } else {
        const res = await fetch(`/api/business/${businessId}/bank-accounts`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...bankForm, displayOrder: bankAccounts.length }),
        });
        if (!res.ok) throw new Error();
        toast.success('Rekening berhasil ditambahkan');
      }
      setBankDialogOpen(false);
      fetchBankAccounts();
    } catch {
      toast.error('Gagal menyimpan rekening');
    } finally {
      setBankSaving(false);
    }
  };

  const handleDeleteBank = async () => {
    if (!businessId || !deleteBankId) return;
    try {
      const res = await fetch(`/api/business/${businessId}/bank-accounts/${deleteBankId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      toast.success('Rekening berhasil dihapus');
      fetchBankAccounts();
    } catch {
      toast.error('Gagal menghapus rekening');
    } finally {
      setDeleteBankId(null);
    }
  };

  const handleSetDefault = async (acc: BankAccount) => {
    if (!businessId || acc.isDefault) return;
    try {
      const res = await fetch(`/api/business/${businessId}/bank-accounts/${acc.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...acc, isDefault: true }),
      });
      if (!res.ok) throw new Error();
      toast.success('Rekening utama berhasil diubah');
      fetchBankAccounts();
    } catch {
      toast.error('Gagal mengubah rekening utama');
    }
  };

  const fetchSettings = useCallback(() => {
    if (!businessId) return;
    setLoading(true);
    fetch(`/api/business/${businessId}/invoice-settings`)
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then((data) => {
        if (data && typeof data === 'object') {
          const loaded: InvoiceSettingsForm = {
            template: data.template || 'modern',
            primaryColor: data.primaryColor || '#BB86FC',
            secondaryColor: data.secondaryColor || '#03DAC6',
            logoUrl: data.logoUrl || '',
            signatureUrl: data.signatureUrl || '',
            businessName: data.businessName || '',
            address: data.businessAddress || '',
            phone: data.businessPhone || '',
            email: data.businessEmail || '',
            website: data.businessWebsite || '',
            bankName: data.bankName || '',
            accountNumber: data.bankAccount || '',
            accountHolderName: data.bankHolder || '',
            footerText: data.footerText || '',
            paymentTerms: data.termsText || '',
          };
          setForm(loaded);
          originalRef.current = loaded;
        }
      })
      .catch(() => {
        setForm(DEFAULT_FORM);
        originalRef.current = DEFAULT_FORM;
      })
      .finally(() => setLoading(false));
  }, [businessId]);

  useEffect(() => {
    if (businessId) {
      fetchSettings();
    } else {
      setLoading(false);
    }
  }, [businessId, fetchSettings]);

  useEffect(() => {
    setHasChanges(JSON.stringify(form) !== JSON.stringify(originalRef.current));
  }, [form]);

  const handleFileUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    field: 'logoUrl' | 'signatureUrl',
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error('File too large. Maximum size is 2MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setForm((prev) => ({ ...prev, [field]: reader.result as string }));
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const removeImage = (field: 'logoUrl' | 'signatureUrl') => {
    setForm((prev) => ({ ...prev, [field]: '' }));
  };

  const handleSave = async () => {
    if (!businessId) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/business/${businessId}/invoice-settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          template: form.template,
          primaryColor: form.primaryColor,
          secondaryColor: form.secondaryColor,
          logoUrl: form.logoUrl,
          signatureUrl: form.signatureUrl,
          businessName: form.businessName,
          businessAddress: form.address,
          businessPhone: form.phone,
          businessEmail: form.email,
          businessWebsite: form.website,
          bankName: form.bankName,
          bankAccount: form.accountNumber,
          bankHolder: form.accountHolderName,
          footerText: form.footerText,
          termsText: form.paymentTerms,
        }),
      });
      if (!res.ok) throw new Error();
      originalRef.current = { ...form };
      setHasChanges(false);
      toast.success(t('biz.businessUpdated'));
    } catch {
      toast.error(t('common.error'));
    } finally {
      setSaving(false);
    }
  };

  const update = (field: keyof InvoiceSettingsForm, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  /* ---- Compute completion stats ---- */
  const fieldsFilled = [
    form.businessName, form.address, form.phone, form.email, form.website,
    form.bankName, form.accountNumber, form.accountHolderName,
    form.footerText, form.paymentTerms, form.logoUrl, form.signatureUrl,
  ].filter(Boolean).length;
  const totalFields = 12;
  const completionPct = Math.round((fieldsFilled / totalFields) * 100);

  if (!businessId) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground/50 text-center">{t('biz.registerFirst')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-8">
      <motion.div variants={containerVariants} initial="hidden" animate="visible">
        {/* Header */}
        <motion.div variants={itemVariants} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-primary/15 flex items-center justify-center">
                <Settings className="h-4 w-4 text-primary" />
              </div>
              Invoice Settings
            </h2>
            <p className="text-sm text-muted-foreground/50 mt-1">
              Customize your invoice template, branding, and payment details
            </p>
          </div>
          <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>
            <Button
              onClick={handleSave}
              disabled={saving || !hasChanges}
              className={cn(
                'rounded-xl shadow-lg transition-all',
                hasChanges
                  ? 'bg-gradient-to-r from-primary to-primary text-black hover:opacity-90 shadow-primary/20'
                  : 'bg-muted/40 text-muted-foreground/40 hover:bg-muted/50 shadow-none'
              )}
            >
              {saving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              {t('common.save')}
              {hasChanges && (
                <span className="ml-2 h-2 w-2 rounded-full bg-secondary animate-pulse" />
              )}
            </Button>
          </motion.div>
        </motion.div>

        {/* Summary Stat Cards */}
        {!loading && (
          <motion.div variants={itemVariants} className="grid grid-cols-2 lg:grid-cols-3 gap-3 mt-4">
            {/* Template Card */}
            <motion.div variants={cardHover} initial="rest" whileHover="hover">
              <Card className="relative overflow-hidden rounded-2xl border-border bg-gradient-to-br from-primary/15 to-primary/[0.02]">
                <div className="absolute top-0 right-0 h-16 w-16 rounded-full bg-primary opacity-10 blur-2xl" />
                <CardContent className="p-4 relative">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="h-8 w-8 rounded-lg bg-primary/20 flex items-center justify-center">
                      <Layout className="h-4 w-4 text-primary" />
                    </div>
                  </div>
                  <p className="text-[10px] text-muted-foreground/50 uppercase tracking-wider">Template</p>
                  <p className="text-base font-bold text-foreground mt-0.5 capitalize">{form.template}</p>
                  <div className="mt-2 h-1.5 rounded-full overflow-hidden bg-muted/40">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: '100%' }}
                      transition={{ duration: 0.5 }}
                      className="h-full rounded-full"
                      style={{ backgroundColor: TEMPLATE_META[form.template].color }}
                    />
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Completion Card */}
            <motion.div variants={cardHover} initial="rest" whileHover="hover">
              <Card className="relative overflow-hidden rounded-2xl border-border bg-gradient-to-br from-secondary/15 to-secondary/[0.02]">
                <div className="absolute top-0 right-0 h-16 w-16 rounded-full bg-secondary opacity-10 blur-2xl" />
                <CardContent className="p-4 relative">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="h-8 w-8 rounded-lg bg-secondary/20 flex items-center justify-center">
                      <CheckCircle2 className="h-4 w-4 text-secondary" />
                    </div>
                  </div>
                  <p className="text-[10px] text-muted-foreground/50 uppercase tracking-wider">Profile Completion</p>
                  <p className="text-base font-bold text-secondary mt-0.5">{completionPct}%</p>
                  <div className="mt-2 h-1.5 rounded-full overflow-hidden bg-muted/40">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${completionPct}%` }}
                      transition={{ duration: 0.6, ease: 'easeOut' as const }}
                      className="h-full rounded-full bg-secondary"
                    />
                  </div>
                  <p className="text-[10px] text-muted-foreground/30 mt-1">{fieldsFilled}/{totalFields} fields filled</p>
                </CardContent>
              </Card>
            </motion.div>

            {/* Colors Card */}
            <motion.div variants={cardHover} initial="rest" whileHover="hover">
              <Card className="relative overflow-hidden rounded-2xl border-border bg-gradient-to-br from-warning/15 to-warning/[0.02]">
                <div className="absolute top-0 right-0 h-16 w-16 rounded-full bg-warning opacity-10 blur-2xl" />
                <CardContent className="p-4 relative">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="h-8 w-8 rounded-lg bg-warning/20 flex items-center justify-center">
                      <Palette className="h-4 w-4 text-warning" />
                    </div>
                  </div>
                  <p className="text-[10px] text-muted-foreground/50 uppercase tracking-wider">Brand Colors</p>
                  <div className="flex items-center gap-2 mt-2">
                    <div className="h-6 w-6 rounded-full border border-border" style={{ backgroundColor: form.primaryColor }} />
                    <div className="h-6 w-6 rounded-full border border-border" style={{ backgroundColor: form.secondaryColor }} />
                    <span className="text-xs text-muted-foreground/50 ml-1">{form.primaryColor} / {form.secondaryColor}</span>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>
        )}

        {loading ? (
          <motion.div variants={itemVariants} className="space-y-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-48 rounded-2xl bg-muted/30" />
            ))}
          </motion.div>
        ) : (
          <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* ========== LEFT COLUMN ========== */}
            <div className="lg:col-span-2 space-y-6">
              {/* 1. Template Selection */}
              <Card className="bg-card border border-border rounded-2xl overflow-hidden">
                <CardContent className="p-4 sm:p-6">
                  <SectionHeader icon={FileText} title="Template Selection" color="#BB86FC" />
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {(Object.keys(TEMPLATE_META) as TemplateType[]).map((type) => {
                      const meta = TEMPLATE_META[type];
                      const selected = form.template === type;
                      return (
                        <motion.button
                          type="button"
                          key={type}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => update('template', type)}
                          className={cn(
                            'relative rounded-xl border-2 p-2 text-left transition-all cursor-pointer',
                            'hover:border-foreground/20',
                            selected
                              ? 'border-primary bg-primary/[0.04]'
                              : 'border-border bg-muted/20',
                          )}
                        >
                          {selected && (
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-primary flex items-center justify-center"
                            >
                              <Check className="h-3 w-3 text-black" />
                            </motion.div>
                          )}
                          <TemplatePreviewCard
                            type={type}
                            primaryColor={form.primaryColor}
                            secondaryColor={form.secondaryColor}
                            businessName={form.businessName}
                            logoUrl={form.logoUrl}
                          />
                          <div className="mt-2 px-1">
                            <p className={cn('text-xs font-semibold', selected ? 'text-primary' : 'text-muted-foreground/70')}>
                              {meta.label}
                            </p>
                            <p className="text-[10px] text-muted-foreground/40 mt-0.5">{meta.desc}</p>
                          </div>
                        </motion.button>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* 2. Color Customization */}
              <Card className="bg-card border border-border rounded-2xl overflow-hidden">
                <CardContent className="p-4 sm:p-6">
                  <SectionHeader icon={Palette} title="Color Customization" color="#03DAC6" />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <ColorSwatch
                      label="Primary Color"
                      color={form.primaryColor}
                      onChange={(v) => update('primaryColor', v)}
                    />
                    <ColorSwatch
                      label="Secondary / Accent Color"
                      color={form.secondaryColor}
                      onChange={(v) => update('secondaryColor', v)}
                    />
                  </div>
                  <div className="mt-4 rounded-xl overflow-hidden border border-border">
                    <motion.div
                      layout
                      className="h-12 flex items-center justify-center"
                      style={{ background: `linear-gradient(135deg, ${form.primaryColor}, ${form.secondaryColor})` }}
                    >
                      <span className="text-foreground font-bold text-xs drop-shadow-sm">
                        {form.businessName || 'Invoice Header Preview'}
                      </span>
                    </motion.div>
                  </div>
                </CardContent>
              </Card>

              {/* 3. Business Branding */}
              <Card className="bg-card border border-border rounded-2xl overflow-hidden">
                <CardContent className="p-4 sm:p-6">
                  <SectionHeader icon={ImageIcon} title="Business Branding" color="#CF6679" />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                    <div className="space-y-2">
                      <Label className="text-muted-foreground/80 text-xs flex items-center gap-1.5">
                        <Upload className="h-3 w-3" />
                        Business Logo
                      </Label>
                      <input ref={logoInputRef} type="file" accept="image/*" onChange={(e) => handleFileUpload(e, 'logoUrl')} className="hidden" />
                      {form.logoUrl ? (
                        <div className="relative group">
                          <img src={form.logoUrl} alt="Business logo" className="h-[100px] w-[100px] object-cover rounded-xl border border-border" />
                          <button type="button" onClick={() => removeImage('logoUrl')} className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-destructive flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <X className="h-3 w-3 text-foreground" />
                          </button>
                        </div>
                      ) : (
                        <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} type="button" onClick={() => logoInputRef.current?.click()} className="flex flex-col items-center justify-center h-[100px] w-[100px] rounded-xl border-2 border-dashed border-border hover:border-primary/50 bg-muted/20 transition-colors cursor-pointer">
                          <Upload className="h-5 w-5 text-muted-foreground/30 mb-1" />
                          <span className="text-[10px] text-muted-foreground/30">Upload</span>
                        </motion.button>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label className="text-muted-foreground/80 text-xs flex items-center gap-1.5">
                        <PenLine className="h-3 w-3" />
                        Signature
                      </Label>
                      <input ref={sigInputRef} type="file" accept="image/*" onChange={(e) => handleFileUpload(e, 'signatureUrl')} className="hidden" />
                      {form.signatureUrl ? (
                        <div className="relative group">
                          <img src={form.signatureUrl} alt="Signature" className="h-[100px] max-w-[200px] object-contain rounded-xl border border-border bg-muted/20" />
                          <button type="button" onClick={() => removeImage('signatureUrl')} className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-destructive flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <X className="h-3 w-3 text-foreground" />
                          </button>
                        </div>
                      ) : (
                        <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} type="button" onClick={() => sigInputRef.current?.click()} className="flex flex-col items-center justify-center h-[100px] w-[200px] rounded-xl border-2 border-dashed border-border hover:border-primary/50 bg-muted/20 transition-colors cursor-pointer">
                          <PenLine className="h-5 w-5 text-muted-foreground/30 mb-1" />
                          <span className="text-[10px] text-muted-foreground/30">Upload Signature</span>
                        </motion.button>
                      )}
                    </div>
                  </div>

                  <Separator className="bg-muted/40 mb-4" />

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-muted-foreground/80 text-xs flex items-center gap-1.5">
                        <Building2 className="h-3 w-3" />
                        Business Name
                      </Label>
                      <Input value={form.businessName} onChange={(e) => update('businessName', e.target.value)} placeholder="Your Business Name" className="bg-muted/30 border-border text-foreground placeholder:text-muted-foreground/30 rounded-xl focus:border-primary/40" />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-muted-foreground/80 text-xs">Address</Label>
                      <Textarea value={form.address} onChange={(e) => update('address', e.target.value)} placeholder="Full business address" className="bg-muted/30 border-border text-foreground placeholder:text-muted-foreground/30 min-h-[60px] resize-none rounded-xl focus:border-primary/40" />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label className="text-muted-foreground/80 text-xs flex items-center gap-1.5">
                          <Phone className="h-3 w-3" />
                          Phone
                        </Label>
                        <Input value={form.phone} onChange={(e) => update('phone', e.target.value)} placeholder="+62 812 3456 7890" className="bg-muted/30 border-border text-foreground placeholder:text-muted-foreground/30 rounded-xl focus:border-primary/40" />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-muted-foreground/80 text-xs flex items-center gap-1.5">
                          <Mail className="h-3 w-3" />
                          Email
                        </Label>
                        <Input type="email" value={form.email} onChange={(e) => update('email', e.target.value)} placeholder="email@business.com" className="bg-muted/30 border-border text-foreground placeholder:text-muted-foreground/30 rounded-xl focus:border-primary/40" />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-muted-foreground/80 text-xs flex items-center gap-1.5">
                          <Globe className="h-3 w-3" />
                          Website
                        </Label>
                        <Input value={form.website} onChange={(e) => update('website', e.target.value)} placeholder="www.business.com" className="bg-muted/30 border-border text-foreground placeholder:text-muted-foreground/30 rounded-xl focus:border-primary/40" />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 4. Rekening Pembayaran */}
              <Card className="bg-card border border-border rounded-2xl overflow-hidden">
                <CardContent className="p-4 sm:p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#03DAC618' }}>
                        <Building2 className="h-4 w-4" style={{ color: 'var(--secondary)' }} />
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-foreground">Rekening Pembayaran</h3>
                        <p className="text-[10px] text-muted-foreground/40">
                          {bankAccounts.length} dari {MAX_BANK_ACCOUNTS} rekening
                        </p>
                      </div>
                    </div>
                    <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>
                      <Button
                        onClick={openAddBankDialog}
                        disabled={bankAccounts.length >= MAX_BANK_ACCOUNTS}
                        size="sm"
                        className={cn(
                          'rounded-xl shadow-lg transition-all',
                          bankAccounts.length >= MAX_BANK_ACCOUNTS
                            ? 'bg-muted/40 text-muted-foreground/30 cursor-not-allowed shadow-none'
                            : 'bg-gradient-to-r from-secondary to-secondary/80 text-black hover:opacity-90 shadow-secondary/20'
                        )}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Tambah Rekening
                      </Button>
                    </motion.div>
                  </div>

                  {bankAccounts.length === 0 ? (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3 }}
                      className="flex flex-col items-center justify-center py-8 rounded-xl border border-dashed border-border bg-white/[0.01]"
                    >
                      <div className="h-12 w-12 rounded-xl bg-muted/20 flex items-center justify-center mb-3">
                        <Building2 className="h-6 w-6 text-white/20" />
                      </div>
                      <p className="text-xs text-muted-foreground/40">Belum ada rekening pembayaran</p>
                      <p className="text-[10px] text-muted-foreground/25 mt-0.5">Tambahkan rekening bank untuk ditampilkan di invoice</p>
                    </motion.div>
                  ) : (
                    <div className="space-y-2.5 max-h-[400px] overflow-y-auto">
                      <AnimatePresence>
                        {bankAccounts.map((acc, idx) => (
                          <motion.div
                            key={acc.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ delay: idx * 0.04, duration: 0.3, ease: 'easeOut' as const }}
                            className={cn(
                              'group relative flex items-center gap-3 p-3 rounded-xl border transition-all duration-200',
                              'hover:bg-muted/20',
                              acc.isDefault
                                ? 'border-secondary/20 bg-secondary/[0.04]'
                                : 'border-border bg-white/[0.015]'
                            )}
                          >
                            {/* Bank icon */}
                            <div className={cn(
                              'h-10 w-10 rounded-lg flex items-center justify-center shrink-0',
                              acc.isDefault ? 'bg-secondary/20' : 'bg-muted/40'
                            )}>
                              <Landmark className={cn('h-4 w-4', acc.isDefault ? 'text-secondary' : 'text-muted-foreground/40')} />
                            </div>

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-medium text-foreground truncate">{acc.bankName}</p>
                                {acc.isDefault && (
                                  <Badge className="bg-secondary/15 text-secondary border-secondary/20 text-[9px] px-1.5 py-0 shrink-0">
                                    <Star className="h-2.5 w-2.5 mr-0.5" />
                                    Utama
                                  </Badge>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground/50 font-mono mt-0.5">{maskAccountNumber(acc.accountNumber)}</p>
                              <p className="text-[11px] text-muted-foreground/40 mt-0.5">a.n. {acc.accountHolder}</p>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                              {!acc.isDefault && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0 text-muted-foreground/40 hover:text-warning hover:bg-warning/10 rounded-lg"
                                  onClick={() => handleSetDefault(acc)}
                                  title="Jadikan utama"
                                >
                                  <Star className="h-3.5 w-3.5" />
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-muted-foreground/40 hover:text-primary hover:bg-primary/10 rounded-lg"
                                onClick={() => openEditBankDialog(acc)}
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-muted-foreground/40 hover:text-destructive hover:bg-destructive/10 rounded-lg"
                                onClick={() => setDeleteBankId(acc.id)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* 5. Payment Information */}
              <Card className="bg-card border border-border rounded-2xl overflow-hidden">
                <CardContent className="p-4 sm:p-6">
                  <SectionHeader icon={CreditCard} title="Payment Information" color="#FFD700" />
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label className="text-muted-foreground/80 text-xs flex items-center gap-1.5">
                        <Landmark className="h-3 w-3" />
                        Bank Name
                      </Label>
                      <Input value={form.bankName} onChange={(e) => update('bankName', e.target.value)} placeholder="Bank Central Asia" className="bg-muted/30 border-border text-foreground placeholder:text-muted-foreground/30 rounded-xl focus:border-primary/40" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-muted-foreground/80 text-xs flex items-center gap-1.5">
                        <Hash className="h-3 w-3" />
                        Account Number
                      </Label>
                      <Input value={form.accountNumber} onChange={(e) => update('accountNumber', e.target.value)} placeholder="1234567890" className="bg-muted/30 border-border text-foreground placeholder:text-muted-foreground/30 font-mono rounded-xl focus:border-primary/40" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-muted-foreground/80 text-xs flex items-center gap-1.5">
                        <User className="h-3 w-3" />
                        Account Holder
                      </Label>
                      <Input value={form.accountHolderName} onChange={(e) => update('accountHolderName', e.target.value)} placeholder="John Doe" className="bg-muted/30 border-border text-foreground placeholder:text-muted-foreground/30 rounded-xl focus:border-primary/40" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 5. Invoice Footer */}
              <Card className="bg-card border border-border rounded-2xl overflow-hidden">
                <CardContent className="p-4 sm:p-6">
                  <SectionHeader icon={Sparkles} title="Invoice Footer" color="#BB86FC" />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-muted-foreground/80 text-xs">Footer Text</Label>
                      <Textarea value={form.footerText} onChange={(e) => update('footerText', e.target.value)} placeholder="Thank you for your business!" className="bg-muted/30 border-border text-foreground placeholder:text-muted-foreground/30 min-h-[80px] resize-none rounded-xl focus:border-primary/40" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-muted-foreground/80 text-xs">Payment Terms</Label>
                      <Textarea value={form.paymentTerms} onChange={(e) => update('paymentTerms', e.target.value)} placeholder="Payment is due within 30 days of invoice date." className="bg-muted/30 border-border text-foreground placeholder:text-muted-foreground/30 min-h-[80px] resize-none rounded-xl focus:border-primary/40" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* ========== RIGHT COLUMN — Live Preview ========== */}
            <div className="lg:col-span-1">
              <motion.div
                variants={cardHover}
                initial="rest"
                whileHover="rest"
                className="lg:sticky lg:top-4"
              >
                <Card className="bg-card border border-border rounded-2xl overflow-hidden">
                  <CardContent className="p-4 sm:p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="h-8 w-8 rounded-lg bg-secondary/15 flex items-center justify-center">
                        <Eye className="h-4 w-4 text-secondary" />
                      </div>
                      <h3 className="text-sm font-semibold text-foreground">Live Preview</h3>
                      <Badge className="bg-secondary/20 text-secondary border-secondary/20 text-[10px] ml-auto">
                        Real-time
                      </Badge>
                    </div>
                    <div className="space-y-3">
                      <p className="text-[10px] text-muted-foreground/40 leading-relaxed">
                        This preview updates in real-time as you change your settings.
                      </p>
                      <AnimatePresence mode="wait">
                        <LivePreview form={form} />
                      </AnimatePresence>

                      {(form.bankName || form.accountNumber || form.accountHolderName) && (
                        <motion.div
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="mt-3 rounded-lg bg-muted/20 p-2.5 border border-border"
                        >
                          <p className="text-[8px] text-muted-foreground/40 uppercase tracking-wider font-semibold mb-1.5">
                            Payment Details
                          </p>
                          <div className="space-y-0.5 text-[9px]">
                            {form.bankName && (
                              <div className="flex justify-between">
                                <span className="text-muted-foreground/40">Bank</span>
                                <span className="text-muted-foreground/70">{form.bankName}</span>
                              </div>
                            )}
                            {form.accountNumber && (
                              <div className="flex justify-between">
                                <span className="text-muted-foreground/40">Account</span>
                                <span className="text-muted-foreground/70 font-mono">{form.accountNumber}</span>
                              </div>
                            )}
                            {form.accountHolderName && (
                              <div className="flex justify-between">
                                <span className="text-muted-foreground/40">Holder</span>
                                <span className="text-muted-foreground/70">{form.accountHolderName}</span>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}

                      {form.signatureUrl && (
                        <motion.div
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="mt-3 rounded-lg bg-muted/20 p-2.5 border border-border"
                        >
                          <p className="text-[8px] text-muted-foreground/40 uppercase tracking-wider font-semibold mb-1">
                            Authorized Signature
                          </p>
                          <img src={form.signatureUrl} alt="Signature preview" className="h-12 max-w-[160px] object-contain" />
                        </motion.div>
                      )}

                      {form.paymentTerms && (
                        <motion.div
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="mt-3 rounded-lg bg-muted/20 p-2.5 border border-border"
                        >
                          <p className="text-[8px] text-muted-foreground/40 uppercase tracking-wider font-semibold mb-0.5">
                            Payment Terms
                          </p>
                          <p className="text-[8px] text-muted-foreground/50 italic leading-relaxed">{form.paymentTerms}</p>
                        </motion.div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </div>
          </motion.div>
        )}
        {/* Bank Account Dialog */}
        <Dialog open={bankDialogOpen} onOpenChange={setBankDialogOpen}>
          <DialogContent className="bg-card border border-border text-foreground sm:max-w-[460px] rounded-2xl">
            <DialogHeader>
              <DialogTitle className="text-foreground flex items-center gap-2">
                <div className={cn('h-7 w-7 rounded-lg flex items-center justify-center', editingBank ? 'bg-warning/20' : 'bg-secondary/20')}>
                  {editingBank ? <Pencil className="h-3.5 w-3.5 text-warning" /> : <Plus className="h-3.5 w-3.5 text-secondary" />}
                </div>
                {editingBank ? 'Edit Rekening' : 'Tambah Rekening'}
              </DialogTitle>
              <DialogDescription className="text-muted-foreground/60">
                {editingBank ? 'Perbarui informasi rekening pembayaran' : 'Tambahkan rekening bank baru untuk invoice'}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-muted-foreground/80 text-xs flex items-center gap-1.5">
                  <Landmark className="h-3 w-3" />
                  Nama Bank *
                </Label>
                <Input
                  value={bankForm.bankName}
                  onChange={(e) => setBankForm({ ...bankForm, bankName: e.target.value })}
                  placeholder="e.g. BCA, Mandiri, BNI"
                  className="bg-muted/30 border-border text-foreground placeholder:text-muted-foreground/30 rounded-xl focus:border-secondary/40"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground/80 text-xs flex items-center gap-1.5">
                  <Hash className="h-3 w-3" />
                  Nomor Rekening *
                </Label>
                <Input
                  value={bankForm.accountNumber}
                  onChange={(e) => setBankForm({ ...bankForm, accountNumber: e.target.value })}
                  placeholder="1234567890"
                  className="bg-muted/30 border-border text-foreground placeholder:text-muted-foreground/30 font-mono rounded-xl focus:border-secondary/40"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground/80 text-xs flex items-center gap-1.5">
                  <User className="h-3 w-3" />
                  Nama Pemilik *
                </Label>
                <Input
                  value={bankForm.accountHolder}
                  onChange={(e) => setBankForm({ ...bankForm, accountHolder: e.target.value })}
                  placeholder="Nama pemilik rekening"
                  className="bg-muted/30 border-border text-foreground placeholder:text-muted-foreground/30 rounded-xl focus:border-secondary/40"
                />
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-muted/20 border border-border">
                <div className="space-y-0.5">
                  <Label className="text-muted-foreground/80 text-xs">Jadikan Rekening Utama</Label>
                  <p className="text-[10px] text-muted-foreground/40">Rekening utama akan ditampilkan pertama di invoice</p>
                </div>
                <Switch
                  checked={bankForm.isDefault}
                  onCheckedChange={(checked) => setBankForm({ ...bankForm, isDefault: checked })}
                  className="data-[state=checked]:bg-secondary"
                />
              </div>
            </div>

            <DialogFooter className="gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setBankDialogOpen(false)}
                className="border-border text-foreground hover:bg-white/10 rounded-xl"
              >
                Batal
              </Button>
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button
                  type="button"
                  disabled={bankSaving || !bankForm.bankName.trim() || !bankForm.accountNumber.trim() || !bankForm.accountHolder.trim()}
                  onClick={handleSaveBank}
                  className="bg-gradient-to-r from-secondary to-secondary/80 text-black hover:opacity-90 rounded-xl shadow-lg shadow-secondary/20"
                >
                  {bankSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {editingBank ? 'Simpan' : 'Tambah'}
                </Button>
              </motion.div>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Bank Account Confirmation */}
        <AlertDialog open={!!deleteBankId} onOpenChange={(open) => !open && setDeleteBankId(null)}>
          <AlertDialogContent className="bg-card border border-border text-foreground rounded-2xl">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-foreground flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-destructive/20 flex items-center justify-center">
                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                </div>
                Hapus Rekening
              </AlertDialogTitle>
              <AlertDialogDescription className="text-muted-foreground/60">
                Apakah Anda yakin ingin menghapus rekening ini? Tindakan ini tidak dapat dibatalkan.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="border-border text-foreground hover:bg-white/10 rounded-xl">
                Batal
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteBank}
                className="bg-gradient-to-r from-destructive to-[#B04060] hover:opacity-90 text-foreground border-0 rounded-xl"
              >
                Hapus
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </motion.div>
    </div>
  );
}
