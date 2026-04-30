'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import {
  Plus,
  Edit,
  Trash2,
  Bell,
  Loader2,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Repeat,
  Tag,
  StickyNote,
} from 'lucide-react';
import { format, isPast, isToday, addDays, differenceInDays } from 'date-fns';
import { id } from 'date-fns/locale';
import { useTranslation } from '@/hooks/useTranslation';
import { useCurrencyFormat } from '@/hooks/useCurrencyFormat';

// ── Theme ──
const T = {
  bg: '#121212',
  cardBg: '#1A1A2E',
  primary: '#BB86FC',
  secondary: '#03DAC6',
  destructive: '#CF6679',
  warning: '#FFD54F',
  muted: '#9E9E9E',
  border: 'rgba(255,255,255,0.06)',
  borderHover: 'rgba(255,255,255,0.12)',
  text: '#E6E1E5',
  textSub: '#B3B3B3',
} as const;

// ── Types ──
interface Bill {
  id: string;
  name: string;
  amount: number;
  dueDate: string;
  category: string;
  recurrence: string;
  isPaid: boolean;
  paidAt: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

interface BillStats {
  monthlyTotal: number;
  unpaidCount: number;
  overdueCount: number;
  paidCount: number;
}

type FilterType = 'all' | 'unpaid' | 'overdue' | 'paid';

// ── Helpers ──
function getBillStatus(bill: Bill): 'overdue' | 'due-soon' | 'paid' | 'upcoming' {
  if (bill.isPaid) return 'paid';
  const dueDate = new Date(bill.dueDate);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  if (isPast(dueDate) && !isToday(dueDate)) return 'overdue';
  if (differenceInDays(dueDate, now) <= 3) return 'due-soon';
  return 'upcoming';
}

function getAccentColor(status: ReturnType<typeof getBillStatus>): string {
  switch (status) {
    case 'overdue': return T.destructive;
    case 'due-soon': return T.warning;
    case 'paid': return T.secondary;
    default: return T.primary;
  }
}

function getRecurrenceLabel(rec: string): string {
  switch (rec) {
    case 'monthly': return 'Bulanan';
    case 'weekly': return 'Mingguan';
    default: return 'Sekali';
  }
}

function getRecurrenceIcon(rec: string) {
  switch (rec) {
    case 'monthly': return '📅';
    case 'weekly': return '🔄';
    default: return '📌';
  }
}

// ── Filter Tabs ──
function FilterTabs({
  active,
  onChange,
  stats,
}: {
  active: FilterType;
  onChange: (f: FilterType) => void;
  stats: BillStats;
}) {
  const { t } = useTranslation();
  const filters: { key: FilterType; label: string; count?: number; color: string }[] = [
    { key: 'all', label: 'Semua', color: T.primary },
    { key: 'unpaid', label: 'Belum Bayar', count: stats.unpaidCount, color: T.warning },
    { key: 'overdue', label: 'Terlambat', count: stats.overdueCount, color: T.destructive },
    { key: 'paid', label: 'Sudah Bayar', count: stats.paidCount, color: T.secondary },
  ];

  return (
    <div className="flex gap-2 flex-wrap">
      {filters.map((f) => (
        <button
          key={f.key}
          onClick={() => onChange(f.key)}
          className={cn(
            'flex items-center gap-1.5 px-3.5 sm:px-4 py-2 sm:py-1.5 rounded-full text-[11px] sm:text-[12px] font-semibold transition-all duration-200 min-h-[36px] sm:min-h-0',
          )}
          style={
            active === f.key
              ? {
                  background: `linear-gradient(135deg, ${f.color}30, ${f.color}15)`,
                  color: f.color,
                  border: `1px solid ${f.color}30`,
                  boxShadow: `0 0 12px ${f.color}20`,
                }
              : {
                  background: 'rgba(255,255,255,0.03)',
                  color: T.muted,
                  border: '1px solid rgba(255,255,255,0.06)',
                }
          }
        >
          {f.label}
          {f.count !== undefined && f.count > 0 && (
            <span
              className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
              style={
                active === f.key
                  ? { background: `${f.color}25`, color: f.color }
                  : { background: 'rgba(255,255,255,0.06)', color: T.muted }
              }
            >
              {f.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

function cn(...classes: (string | undefined | false)[]) {
  return classes.filter(Boolean).join(' ');
}

// ── Summary Stat Card ──
function StatCard({
  label,
  value,
  color,
  icon: Icon,
}: {
  label: string;
  value: string;
  color: string;
  icon: React.ElementType;
}) {
  return (
    <motion.div
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      className="bg-white/[0.03] border-white/[0.06] rounded-2xl md:rounded-xl overflow-hidden cursor-pointer"
      style={{ boxShadow: '0 2px 16px rgba(0,0,0,0.2)' }}
    >
      <div className="h-px bg-white/[0.06]" />
      <div className="p-4 sm:p-5 flex items-center gap-3">
        <div
          className="w-9 h-9 rounded-lg grid place-items-center shrink-0 [&>*]:block leading-none"
          style={{ background: `${color}12` }}
        >
          <Icon className="h-4 w-4" style={{ color }} />
        </div>
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-wider font-medium" style={{ color: T.muted }}>
            {label}
          </p>
          <p className="text-[15px] font-bold mt-0.5 truncate" style={{ color }}>
            {value}
          </p>
        </div>
      </div>
    </motion.div>
  );
}

// ── Bill Card ──
function BillCard({
  bill,
  onPay,
  onEdit,
  onDelete,
  index,
}: {
  bill: Bill;
  onPay: (bill: Bill) => void;
  onEdit: (bill: Bill) => void;
  onDelete: (id: string) => void;
  index: number;
}) {
  const { t } = useTranslation();
  const { formatAmount } = useCurrencyFormat();
  const status = getBillStatus(bill);
  const accentColor = getAccentColor(status);
  const dueDate = new Date(bill.dueDate);
  const daysUntilDue = differenceInDays(dueDate, new Date());

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      whileHover={{ x: 2 }}
      className="rounded-2xl overflow-hidden transition-all duration-200"
      style={{
        background: T.bg,
        border: `1px solid ${T.border}`,
        borderLeft: `3px solid ${accentColor}`,
        boxShadow: bill.isPaid
          ? `0 0 20px ${T.secondary}08, 0 2px 8px rgba(0,0,0,0.15)`
          : status === 'overdue'
          ? `0 0 20px ${T.destructive}08, 0 2px 8px rgba(0,0,0,0.15)`
          : '0 2px 8px rgba(0,0,0,0.15)',
      }}
    >
      <div className="p-3 sm:p-4">
        {/* Top row: name + badges */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex-1 min-w-0">
            <h3
              className="text-sm font-semibold truncate"
              style={{ color: bill.isPaid ? T.muted : T.text, textDecoration: bill.isPaid ? 'line-through' : 'none' }}
            >
              {bill.name}
            </h3>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span
                className="text-[9px] sm:text-[10px] font-semibold uppercase tracking-wider px-2 py-1 sm:py-0.5 rounded-full inline-flex items-center gap-1"
                style={{ background: `${accentColor}15`, color: accentColor }}
              >
                {getRecurrenceIcon(bill.recurrence)} {getRecurrenceLabel(bill.recurrence)}
              </span>
              <span
                className="text-[9px] sm:text-[10px] font-medium px-2 py-1 sm:py-0.5 rounded-full inline-flex items-center gap-1"
                style={{ background: 'rgba(255,255,255,0.04)', color: T.muted }}
              >
                <Tag className="h-2.5 w-2.5" /> {bill.category}
              </span>
            </div>
          </div>
          {/* Status indicator */}
          <div className="shrink-0 flex items-center gap-1">
            {!bill.isPaid && status === 'overdue' && (
              <span className="flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full" style={{ background: `${T.destructive}15`, color: T.destructive }}>
                <AlertTriangle className="h-2.5 w-2.5" /> Terlambat
              </span>
            )}
            {!bill.isPaid && status === 'due-soon' && (
              <span className="flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full" style={{ background: `${T.warning}15`, color: T.warning }}>
                <Clock className="h-2.5 w-2.5" /> {daysUntilDue === 0 ? 'Hari ini' : `${daysUntilDue} hari lagi`}
              </span>
            )}
            {bill.isPaid && (
              <span className="flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full" style={{ background: `${T.secondary}15`, color: T.secondary }}>
                <CheckCircle2 className="h-2.5 w-2.5" /> Lunas
              </span>
            )}
          </div>
        </div>

        {/* Amount + Due Date */}
        <div className="flex items-center justify-between mt-2">
          <div>
            <p className="text-sm sm:text-base font-bold" style={{ color: bill.isPaid ? T.muted : accentColor }}>
              {formatAmount(bill.amount)}
            </p>
            <div className="flex items-center gap-1 mt-0.5">
              <Calendar className="h-3 w-3" style={{ color: T.muted }} />
              <p className="text-[11px]" style={{ color: T.muted }}>
                {format(dueDate, 'dd MMM yyyy', { locale: id })}
              </p>
            </div>
            {bill.paidAt && (
              <p className="text-[9px] mt-0.5" style={{ color: T.secondary }}>
                Dibayar: {format(new Date(bill.paidAt), 'dd MMM yyyy', { locale: id })}
              </p>
            )}
          </div>
        </div>

        {/* Notes */}
        {bill.notes && (
          <div className="flex items-start gap-1.5 mt-2 pt-2" style={{ borderTop: `1px solid ${T.border}` }}>
            <StickyNote className="h-3 w-3 shrink-0 mt-0.5" style={{ color: T.muted }} />
            <p className="text-[10px]" style={{ color: T.muted }}>{bill.notes}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 mt-3 pt-2" style={{ borderTop: `1px solid ${T.border}` }}>
          {!bill.isPaid && (
            <button
              onClick={() => onPay(bill)}
              className="flex-1 text-[11px] sm:text-[12px] font-semibold h-11 sm:h-auto sm:py-2 rounded-xl flex items-center justify-center gap-1.5 transition-all active:scale-95"
              style={{ background: `linear-gradient(135deg, ${T.secondary}, ${T.primary})`, color: '#fff' }}
            >
              <CheckCircle2 className="h-3 w-3" /> Bayar
            </button>
          )}
          <button
            onClick={() => onEdit(bill)}
            className="flex-1 text-[11px] sm:text-[12px] font-medium h-11 sm:h-auto sm:py-2 rounded-xl flex items-center justify-center gap-1.5 transition-colors active:scale-95"
            style={{ background: `${T.primary}10`, color: T.primary }}
          >
            <Edit className="h-3 w-3" /> {t('common.edit')}
          </button>
          <button
            onClick={() => onDelete(bill.id)}
            className="text-[11px] sm:text-[12px] font-medium h-11 w-11 min-w-[44px] sm:h-auto sm:w-auto sm:min-w-0 sm:px-3 rounded-xl flex items-center justify-center gap-1.5 transition-colors active:scale-95"
            style={{ background: `${T.destructive}10`, color: T.destructive }}
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// ── Bill Form Dialog ──
function BillFormDialog({
  open,
  onOpenChange,
  onSubmit,
  initialData,
  isEdit,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSubmit: (data: any) => void;
  initialData: Bill | null;
  isEdit: boolean;
}) {
  const { t } = useTranslation();

  const buildForm = (data: Bill | null) => ({
    name: data?.name || '',
    amount: data?.amount || 0,
    dueDate: data?.dueDate ? format(new Date(data.dueDate), 'yyyy-MM-dd') : '',
    category: data?.category || 'Lainnya',
    recurrence: data?.recurrence || 'one-time',
    notes: data?.notes || '',
  });

  const [form, setForm] = useState(() => buildForm(initialData));
  const [key, setKey] = useState(0);

  const handleOpenChange = (v: boolean) => {
    if (v) {
      setForm(buildForm(initialData));
      setKey((k) => k + 1);
    }
    onOpenChange(v);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || form.amount <= 0 || !form.dueDate) {
      toast.error('Nama, jumlah, dan tanggal jatuh tempo wajib diisi');
      return;
    }
    onSubmit(form);
  };

  const inputCls =
    'h-11 sm:h-9 text-sm bg-white/[0.04] border-white/[0.08] rounded-xl text-white placeholder:text-[#9E9E9E] focus:border-[#BB86FC]/30 focus:ring-0';

  const categories = [
    'Lainnya',
    'Listrik',
    'Internet',
    'Air',
    'Telepon',
    'Cicilan',
    'Asuransi',
    'Sewa',
    'Pajak',
    'Langganan',
    'Kredit',
    'Pendidikan',
    'Kesehatan',
  ];

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        key={key}
        className="sm:max-w-[440px] bg-[#141414] border-white/[0.08] rounded-2xl p-0 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="text-white">
              {isEdit ? 'Edit Tagihan' : 'Tambah Tagihan'}
            </DialogTitle>
            <DialogDescription className="text-[#9E9E9E]">
              {isEdit
                ? 'Ubah detail tagihan yang sudah ada'
                : 'Tambahkan tagihan baru untuk diingatkan'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} onClick={(e) => e.stopPropagation()}>
            <div className="space-y-3 pt-3">
              {/* Name */}
              <div className="space-y-1.5">
                <Label className="text-[11px] text-[#9E9E9E]">Nama Tagihan *</Label>
                <Input
                  className={inputCls}
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="contoh: Listrik PLN"
                />
              </div>

              <div className="h-px bg-white/[0.06] my-1" />

              {/* Amount & Due Date */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-[11px] text-[#9E9E9E]">Jumlah (Rp) *</Label>
                  <Input
                    type="number"
                    className={inputCls}
                    value={form.amount || ''}
                    onChange={(e) =>
                      setForm({ ...form, amount: parseFloat(e.target.value) || 0 })
                    }
                    placeholder="500000"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[11px] text-[#9E9E9E]">Jatuh Tempo *</Label>
                  <Input
                    type="date"
                    className={inputCls}
                    value={form.dueDate}
                    onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                    min={format(new Date(), 'yyyy-MM-dd')}
                  />
                </div>
              </div>

              <div className="h-px bg-white/[0.06] my-1" />

              {/* Category & Recurrence */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-[11px] text-[#9E9E9E]">Kategori</Label>
                  <Select
                    value={form.category}
                    onValueChange={(v) => setForm({ ...form, category: v })}
                  >
                    <SelectTrigger className="h-11 sm:h-9 text-sm bg-white/[0.04] border-white/[0.08] rounded-xl text-white focus:border-[#BB86FC]/30 focus:ring-0">
                      <SelectValue placeholder="Pilih" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1a1a1a] border-white/[0.08] rounded-xl">
                      {categories.map((cat) => (
                        <SelectItem key={cat} value={cat} className="text-white/80 focus:bg-white/[0.06] focus:text-white">
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[11px] text-[#9E9E9E]">Pengulangan</Label>
                  <Select
                    value={form.recurrence}
                    onValueChange={(v) => setForm({ ...form, recurrence: v })}
                  >
                    <SelectTrigger className="h-11 sm:h-9 text-sm bg-white/[0.04] border-white/[0.08] rounded-xl text-white focus:border-[#BB86FC]/30 focus:ring-0">
                      <SelectValue placeholder="Pilih" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1a1a1a] border-white/[0.08] rounded-xl">
                      <SelectItem value="one-time" className="text-white/80 focus:bg-white/[0.06] focus:text-white">Sekali</SelectItem>
                      <SelectItem value="weekly" className="text-white/80 focus:bg-white/[0.06] focus:text-white">Mingguan</SelectItem>
                      <SelectItem value="monthly" className="text-white/80 focus:bg-white/[0.06] focus:text-white">Bulanan</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="h-px bg-white/[0.06] my-1" />

              {/* Notes */}
              <div className="space-y-1.5">
                <Label className="text-[11px] text-[#9E9E9E]">Catatan</Label>
                <Input
                  className={inputCls}
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="Catatan opsional..."
                />
              </div>
            </div>

            <DialogFooter className="pt-4 flex-col sm:flex-row gap-2 sm:gap-2">
              <Button
                type="button"
                variant="ghost"
                className="w-full sm:w-auto rounded-xl hover:bg-white/[0.06] text-[#9E9E9E] h-11 sm:h-9"
                onClick={() => onOpenChange(false)}
              >
                {t('common.cancel')}
              </Button>
              <Button
                type="submit"
                className="w-full sm:w-auto rounded-xl font-semibold text-white h-11 sm:h-9"
                style={{ background: 'linear-gradient(135deg, #BB86FC, #03DAC6)', boxShadow: '0 4px 20px rgba(187,134,252,0.25)' }}
              >
                {isEdit ? t('common.save') : 'Tambah Tagihan'}
              </Button>
            </DialogFooter>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ══════════════════════════════════════════════════════════════
// ── Main Page ──
// ══════════════════════════════════════════════════════════════
export function BillReminders() {
  const { t } = useTranslation();
  const { formatAmount } = useCurrencyFormat();
  const [bills, setBills] = useState<Bill[]>([]);
  const [stats, setStats] = useState<BillStats>({
    monthlyTotal: 0,
    unpaidCount: 0,
    overdueCount: 0,
    paidCount: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; id: string | null }>({
    open: false,
    id: null,
  });
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null);
  const [currentMonth, setCurrentMonth] = useState(format(new Date(), 'yyyy-MM'));

  const fetchBills = async () => {
    try {
      const statusParam =
        activeFilter === 'unpaid'
          ? 'upcoming'
          : activeFilter === 'paid'
          ? 'paid'
          : activeFilter === 'overdue'
          ? 'overdue'
          : 'all';
      const res = await fetch(`/api/bills?status=${statusParam}&month=${currentMonth}`);
      if (res.ok) {
        const data = await res.json();
        setBills(data.bills || []);
        setStats(data.stats || { monthlyTotal: 0, unpaidCount: 0, overdueCount: 0, paidCount: 0 });
      }
    } catch {
      toast.error('Gagal memuat tagihan');
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch stats on mount and when filter changes
  useEffect(() => {
    setIsLoading(true);
    fetchBills();
  }, [activeFilter, currentMonth]);

  const handleAdd = async (data: any) => {
    try {
      const res = await fetch('/api/bills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        toast.success('Tagihan berhasil ditambahkan');
        setIsAddOpen(false);
        fetchBills();
      } else {
        const e = await res.json();
        toast.error(e.error || 'Gagal menambahkan');
      }
    } catch {
      toast.error('Terjadi kesalahan');
    }
  };

  const handleEdit = async (data: any) => {
    if (!selectedBill) return;
    try {
      const res = await fetch(`/api/bills/${selectedBill.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        toast.success('Tagihan berhasil diperbarui');
        setIsEditOpen(false);
        setSelectedBill(null);
        fetchBills();
      } else {
        const e = await res.json();
        toast.error(e.error || 'Gagal memperbarui');
      }
    } catch {
      toast.error('Terjadi kesalahan');
    }
  };

  const handlePay = async (bill: Bill) => {
    try {
      const res = await fetch(`/api/bills/${bill.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPaid: true }),
      });
      if (res.ok) {
        toast.success(`"${bill.name}" ditandai lunas ✓`);
        fetchBills();
      } else {
        toast.error('Gagal menandai lunas');
      }
    } catch {
      toast.error('Terjadi kesalahan');
    }
  };

  const handleDelete = async () => {
    if (!deleteDialog.id) return;
    try {
      const res = await fetch(`/api/bills/${deleteDialog.id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Tagihan berhasil dihapus');
        setDeleteDialog({ open: false, id: null });
        fetchBills();
      } else {
        toast.error('Gagal menghapus');
      }
    } catch {
      toast.error('Terjadi kesalahan');
    }
  };

  // Filter bills client-side for unpaid (combines overdue + upcoming)
  const filteredBills = useMemo(() => {
    if (activeFilter === 'unpaid') {
      return bills.filter((b) => !b.isPaid);
    }
    return bills;
  }, [bills, activeFilter]);

  return (
    <div className="px-4 sm:px-6 space-y-4 lg:space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[13px] font-bold uppercase tracking-wider" style={{ color: T.text }}>
            {t('nav.billReminders') || 'Pengingat Tagihan'}
          </p>
          <p className="text-[10px] mt-0.5" style={{ color: T.muted }}>
            Kelola dan pantau tagihan rutin Anda
          </p>
        </div>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <Button
            size="sm"
            className="w-full sm:w-auto h-12 sm:h-8 px-4 sm:px-3 text-xs sm:text-[13px] font-semibold gap-1.5 rounded-xl"
            style={{ background: `linear-gradient(135deg, ${T.primary}, ${T.secondary})`, color: '#000', boxShadow: `0 4px 20px ${T.primary}30` }}
          >
            <Plus className="h-4 w-4 sm:h-3.5 sm:w-3.5" /> Tambah Tagihan
          </Button>
          <BillFormDialog
            open={isAddOpen}
            onOpenChange={setIsAddOpen}
            onSubmit={handleAdd}
            initialData={null}
            isEdit={false}
          />
        </Dialog>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          label="Total Bulan Ini"
          value={formatAmount(stats.monthlyTotal)}
          color={T.primary}
          icon={Bell}
        />
        <StatCard
          label="Belum Dibayar"
          value={`${stats.unpaidCount} tagihan`}
          color={T.warning}
          icon={Clock}
        />
        <StatCard
          label="Terlambat"
          value={`${stats.overdueCount} tagihan`}
          color={T.destructive}
          icon={AlertTriangle}
        />
        <StatCard
          label="Sudah Dibayar"
          value={`${stats.paidCount} tagihan`}
          color={T.secondary}
          icon={CheckCircle2}
        />
      </div>

      {/* Filter Tabs */}
      <FilterTabs active={activeFilter} onChange={setActiveFilter} stats={stats} />

      {/* Section divider */}
      <div className="h-px bg-white/[0.06]" />

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin" style={{ color: T.muted }} />
        </div>
      )}

      {/* Empty State */}
      {!isLoading && filteredBills.length === 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="flex flex-col items-center justify-center py-16 sm:py-20 text-center relative"
        >
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-32 h-32 rounded-full blur-3xl opacity-20" style={{ background: T.primary }} />
          </div>
          <div
            className="w-20 h-20 sm:w-16 sm:h-16 rounded-2xl grid place-items-center mb-4 relative border"
            style={{ background: `${T.primary}10`, borderColor: `${T.primary}20` }}
          >
            <Bell className="h-10 w-10 sm:h-8 sm:w-8 relative" style={{ color: T.primary, opacity: 0.7 }} />
          </div>
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="text-sm font-semibold relative"
            style={{ color: T.text }}
          >
            Belum ada tagihan
          </motion.p>
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="text-xs mt-1 relative"
            style={{ color: T.muted }}
          >
            Tambahkan tagihan pertama Anda untuk mulai mengelola pembayaran
          </motion.p>
          <motion.button
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            onClick={() => setIsAddOpen(true)}
            className="mt-4 text-[12px] sm:text-[11px] font-semibold px-6 sm:px-4 py-3 sm:py-2 rounded-full relative min-h-[44px] sm:min-h-0 flex items-center justify-center"
            style={{ background: `linear-gradient(135deg, ${T.primary}, ${T.secondary})`, color: '#fff', boxShadow: `0 4px 20px ${T.primary}25` }}
          >
            <span className="flex items-center gap-1.5">
              <Plus className="h-3.5 w-3.5" /> Tambah Tagihan
            </span>
          </motion.button>
        </motion.div>
      )}

      {/* Bill List */}
      {!isLoading && filteredBills.length > 0 && (
        <div className="space-y-3 sm:space-y-4">
          {filteredBills.map((bill, idx) => (
            <BillCard
              key={bill.id}
              bill={bill}
              onPay={handlePay}
              onEdit={(b) => {
                setSelectedBill(b);
                setIsEditOpen(true);
              }}
              onDelete={(id) => setDeleteDialog({ open: true, id })}
              index={idx}
            />
          ))}
        </div>
      )}

      {/* Edit Dialog */}
      <BillFormDialog
        open={isEditOpen}
        onOpenChange={(v) => {
          setIsEditOpen(v);
          if (!v) setSelectedBill(null);
        }}
        onSubmit={handleEdit}
        initialData={selectedBill}
        isEdit
      />

      {/* Delete Dialog */}
      <AlertDialog
        open={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog({ ...deleteDialog, open })}
      >
        <AlertDialogContent className="bg-[#141414] border-white/[0.08] rounded-2xl p-4 sm:p-6">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Hapus tagihan?</AlertDialogTitle>
            <AlertDialogDescription className="text-[#9E9E9E]">
              Tindakan ini tidak dapat dibatalkan. Tagihan akan dihapus secara permanen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-white/[0.06] text-white border-white/[0.08] hover:bg-white/[0.1] rounded-xl">
              {t('common.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-[#CF6679] text-white hover:bg-[#CF6679]/90 rounded-xl"
            >
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
