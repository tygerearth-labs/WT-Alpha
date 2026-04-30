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
  Plus, ArrowDownToLine, History, Wallet, TrendingUp,
  Percent, DollarSign, Layers, ArrowUpRight, Lightbulb, Info,
  CircleDollarSign, Building2, PiggyBank, Target, ArrowRight,
} from 'lucide-react';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

// ─── Color System ─────────────────────────────────────────────────
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

// ─── Animation Variants ─────────────────────────────────────────
const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05, delayChildren: 0.05 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' as const } },
};

// ─── Types ─────────────────────────────────────────────────────
interface Sale {
  id: string;
  description: string;
  amount: number;
  date: string;
  downPayment?: number | null;
  downPaymentPct?: number | null;
  installmentTempo?: number | null;
  installmentAmount?: number | null;
  paymentMethod?: string | null;
}

interface SavingsTarget {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
}

interface Allocation {
  id: string;
  saleId: string | null;
  targetType: string;
  targetId: string | null;
  amount: number;
  percentage: number;
  personalNote?: string;
  allocatedAt: string;
  sale?: Sale;
  savingsTarget?: { name: string; targetAmount: number; currentAmount: number } | null;
}

type AllocationMode = 'percentage' | 'nominal';
type TargetDestination = 'business' | 'personal_cash_in' | 'savings_target';

// ─── Allocation Visual Bar ──────────────────────────────────────
function AllocationBar({ allocations, totalSales }: { allocations: Allocation[]; totalSales: number }) {
  const totalAllocated = allocations.reduce((s, a) => s + a.amount, 0);
  const pct = totalSales > 0 ? Math.min((totalAllocated / totalSales) * 100, 100) : 0;

  // Group by targetType
  const personalAlloc = allocations.filter(a => a.targetType !== 'business').reduce((s, a) => s + a.amount, 0);
  const businessAlloc = allocations.filter(a => a.targetType === 'business').reduce((s, a) => s + a.amount, 0);

  const personalPct = totalAllocated > 0 ? (personalAlloc / totalAllocated) * 100 : 0;
  const businessPct = totalAllocated > 0 ? (businessAlloc / totalAllocated) * 100 : 0;

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">Total Alokasi vs Total Penjualan</span>
        <span className="font-medium tabular-nums text-muted-foreground">{pct.toFixed(1)}%</span>
      </div>
      <div className="biz-progress-track h-3 rounded-full overflow-hidden flex" style={{ backgroundColor: 'var(--border)' }}>
        <div
          className="biz-progress-fill h-full transition-all duration-700"
          style={{
            width: `${businessPct}%`,
            backgroundColor: 'var(--primary)',
            opacity: 0.8,
          }}
        />
        <div
          className="h-full transition-all duration-700"
          style={{
            width: `${personalPct}%`,
            backgroundColor: 'var(--secondary)',
            opacity: 0.8,
            transitionDelay: '0.12s',
          }}
        />
        {pct < 100 && totalSales > 0 && (
          <div className="h-full transition-all duration-500" style={{ width: `${100 - pct}%`, backgroundColor: 'var(--border)' }} />
        )}
      </div>
      <div className="flex items-center gap-4 text-[10px] text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <div className="h-2 w-2 rounded-full" style={{ backgroundColor: 'var(--primary)' }} />
          <span>Bisnis: {businessPct.toFixed(0)}%</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-2 w-2 rounded-full" style={{ backgroundColor: 'var(--secondary)' }} />
          <span>Pribadi: {personalPct.toFixed(0)}%</span>
        </div>
      </div>
    </div>
  );
}

// ─── Empty State ────────────────────────────────────────────────
function EmptyState() {
  return (
    <div className="biz-empty-state flex flex-col items-center justify-center py-16 px-4">
      <div className="h-14 w-14 rounded-xl flex items-center justify-center mb-3 border border-border" style={{ backgroundColor: alpha(c.primary, 8) }}>
        <ArrowDownToLine className="h-7 w-7" style={{ color: alpha(c.primary, 40) }} />
      </div>
      <p className="text-sm font-medium text-muted-foreground">Belum ada alokasi</p>
      <p className="text-xs mt-1 text-muted-foreground">Buat alokasi pertama untuk memulai</p>
    </div>
  );
}

// ─── Target Badge ───────────────────────────────────────────────
function TargetBadge({ targetType, savingsTargetName }: { targetType: string; savingsTargetName?: string | null }) {
  if (targetType === 'personal_cash_in') {
    return (
      <Badge className="text-[9px] font-medium rounded-full px-1.5 py-0" style={{ backgroundColor: alpha(c.secondary, 10), color: c.secondary, border: `1px solid ${alpha(c.secondary, 15)}` }}>
        <Wallet className="h-2.5 w-2.5 mr-0.5" />
        Kas Pribadi
      </Badge>
    );
  }
  if (targetType === 'savings_target') {
    return (
      <Badge className="text-[9px] font-medium rounded-full px-1.5 py-0" style={{ backgroundColor: alpha(c.warning, 10), color: c.warning, border: `1px solid ${alpha(c.warning, 15)}` }}>
        <Target className="h-2.5 w-2.5 mr-0.5" />
        {savingsTargetName || 'Target Tabungan'}
      </Badge>
    );
  }
  return (
    <Badge className="text-[9px] font-medium rounded-full px-1.5 py-0" style={{ backgroundColor: alpha(c.primary, 10), color: c.primary, border: `1px solid ${alpha(c.primary, 15)}` }}>
      <Building2 className="h-2.5 w-2.5 mr-0.5" />
      Bisnis
    </Badge>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Main Component
   ═══════════════════════════════════════════════════════════════ */
export default function BusinessAllocation() {
  const { t } = useTranslation();
  const { activeBusiness } = useBusinessStore();
  const { formatAmount } = useCurrencyFormat();
  const [allocations, setAllocations] = useState<Allocation[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [savingsTargets, setSavingsTargets] = useState<SavingsTarget[]>([]);
  const [loading, setLoading] = useState(true);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [allocMode, setAllocMode] = useState<AllocationMode>('percentage');
  const [destination, setDestination] = useState<TargetDestination>('personal_cash_in');
  const [selectedSavingsTargetId, setSelectedSavingsTargetId] = useState('');
  const [formData, setFormData] = useState({
    saleId: '',
    amount: '',
    percentage: '',
    personalNote: '',
  });
  const [saving, setSaving] = useState(false);

  const formattedAllocNominal = useMemo(() => {
    const num = parseFloat(formData.amount);
    if (isNaN(num) || num <= 0) return '';
    return formatAmount(num);
  }, [formData.amount, formatAmount]);

  const businessId = activeBusiness?.id;

  // Compute preview amount
  const selectedSale = formData.saleId ? sales.find(s => s.id === formData.saleId) : null;
  const totalSales = sales.reduce((s, sale) => s + sale.amount, 0);

  const previewAmount = useMemo(() => {
    if (allocMode === 'nominal') {
      return parseFloat(formData.amount) || 0;
    }
    const pct = parseFloat(formData.percentage) || 0;
    const base = selectedSale ? selectedSale.amount : totalSales;
    return (base * pct) / 100;
  }, [allocMode, formData.amount, formData.percentage, selectedSale, totalSales]);

  const fetchData = useCallback(() => {
    if (!businessId) return;
    setLoading(true);
    Promise.all([
      fetch(`/api/business/${businessId}/allocations`).then(r => (r.ok ? r.json() : [])),
      fetch(`/api/business/${businessId}/sales`).then(r => (r.ok ? r.json() : [])),
      fetch(`/api/savings`).then(r => (r.ok ? r.json() : { savingsTargets: [] })),
    ])
      .then(([allocData, salesData, savingsData]) => {
        setAllocations(allocData?.allocations || []);
        setSales(salesData?.sales || []);
        setSavingsTargets(savingsData?.savingsTargets || []);
      })
      .catch(() => {
        setAllocations([]);
        setSales([]);
        setSavingsTargets([]);
      })
      .finally(() => setLoading(false));
  }, [businessId]);

  useEffect(() => {
    if (businessId) {
      fetchData();
    } else {
      setLoading(false);
    }
  }, [businessId, fetchData]);

  const openCreateDialog = () => {
    setAllocMode('percentage');
    setDestination('personal_cash_in');
    setSelectedSavingsTargetId('');
    setFormData({ saleId: '', amount: '', percentage: '', personalNote: '' });
    setDialogOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessId) return;

    // Validate
    if (allocMode === 'nominal' && !formData.amount) {
      toast.error('Masukkan nominal alokasi');
      return;
    }
    if (allocMode === 'percentage' && !formData.percentage) {
      toast.error('Masukkan persentase alokasi');
      return;
    }
    if (destination === 'savings_target' && !selectedSavingsTargetId) {
      toast.error('Pilih target tabungan');
      return;
    }

    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        amount: allocMode === 'nominal' ? parseFloat(formData.amount) : 0,
        percentage: allocMode === 'percentage' ? parseFloat(formData.percentage) : 0,
        personalNote: formData.personalNote || undefined,
        targetType: destination,
        targetId: destination === 'savings_target' ? selectedSavingsTargetId : undefined,
      };
      if (formData.saleId) body.saleId = formData.saleId;

      const res = await fetch(`/api/business/${businessId}/allocations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Gagal membuat alokasi');
      }

      const destLabel = destination === 'personal_cash_in' ? 'Kas Pribadi' : destination === 'savings_target' ? 'Target Tabungan' : 'Bisnis';
      toast.success(`Berhasil mengalokasikan ${formatAmount(previewAmount)} ke ${destLabel}`);
      setDialogOpen(false);
      fetchData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('common.error'));
    } finally {
      setSaving(false);
    }
  };

  const totalAllocated = allocations.reduce((sum, a) => sum + a.amount, 0);
  const personalAllocated = allocations.filter(a => a.targetType === 'personal_cash_in').reduce((s, a) => s + a.amount, 0);
  const savingsAllocated = allocations.filter(a => a.targetType === 'savings_target').reduce((s, a) => s + a.amount, 0);
  const avgPercentage = allocations.length > 0 ? allocations.reduce((s, a) => s + a.percentage, 0) / allocations.length : 0;
  const latestAlloc = allocations.length > 0 ? allocations[0] : null;

  if (!businessId) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-center text-muted-foreground">{t('biz.registerFirst')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <motion.div variants={containerVariants} initial="hidden" animate="visible">

        {/* ═══ Header ═══ */}
        <motion.div variants={itemVariants} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: alpha(c.primary, 15) }}>
              <ArrowDownToLine className="h-4 w-4" style={{ color: c.primary }} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-foreground">{t('biz.autoAllocation')}</h2>
              <p className="text-[10px] text-muted-foreground">Alokasi pendapatan bisnis ke pribadi</p>
            </div>
          </div>
          <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>
            <Button
              onClick={openCreateDialog}
              size="sm"
              className="rounded-lg h-8 text-xs"
              style={{ backgroundColor: c.primary, color: '#000' }}
            >
              <Plus className="h-3.5 w-3.5 mr-1" />
              {t('common.add')}
            </Button>
          </motion.div>
        </motion.div>

        {/* ═══ Info Banner ═══ */}
        <motion.div variants={itemVariants} className="flex items-start gap-2.5 p-3 sm:p-4 rounded-xl" style={{ background: alpha(c.primary, 4), border: `1px solid ${alpha(c.primary, 10)}` }}>
          <div className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: alpha(c.primary, 12) }}>
            <Lightbulb className="h-4 w-4" style={{ color: c.primary }} />
          </div>
          <div>
            <p className="text-xs font-semibold mb-0.5" style={{ color: c.primary }}>Apa itu Alokasi Otomatis?</p>
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              Alokasi otomatis membagikan pendapatan bisnis Anda ke <span className="font-medium text-foreground">Kas Pribadi</span> atau <span className="font-medium text-foreground">Target Tabungan</span>. Anda bisa menetapkan persentase dari penjualan atau nominal tetap.
            </p>
          </div>
        </motion.div>

        {/* ═══ Summary Stats (Hero Card) ═══ */}
        {!loading && (
          <motion.div variants={itemVariants} className="relative rounded-2xl overflow-hidden">
            {/* Ambient background glows */}
            <div className="absolute -top-40 -left-40 w-80 h-80 rounded-full opacity-[0.06] blur-[100px] pointer-events-none" style={{ background: '#FFB74D' }} />
            <div className="absolute -bottom-32 -right-32 w-72 h-72 rounded-full opacity-[0.05] blur-[120px] pointer-events-none" style={{ background: '#BB86FC' }} />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full opacity-[0.04] blur-[80px] pointer-events-none" style={{ background: '#F9A825' }} />

            {/* Desktop animated gradient border glow */}
            <div className="absolute -inset-[1.5px] rounded-[18px] hidden lg:block"
              style={{
                background: 'linear-gradient(135deg, rgba(255,183,77,0.3), rgba(187,134,252,0.2), rgba(255,183,77,0.3))',
                filter: 'blur(2px)',
                opacity: 0.4,
                animation: 'heroGlow 4s ease-in-out infinite',
              }}
            />

            <Card className="relative rounded-2xl overflow-hidden"
              style={{
                background: 'linear-gradient(135deg, rgba(255,183,77,0.12) 0%, rgba(255,183,77,0.04) 40%, rgba(187,134,252,0.05) 100%)',
                border: '1px solid rgba(255,183,77,0.15)',
                backdropFilter: 'blur(24px)',
                WebkitBackdropFilter: 'blur(24px)',
              }}>
              {/* Top accent line */}
              <div className="absolute top-0 left-4 right-4 h-px" style={{ background: 'linear-gradient(90deg, transparent, #FFB74D, #BB86FC, transparent)' }} />

              <CardContent className="p-4 sm:p-5">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { label: 'Total Dialokasikan', value: formatAmount(totalAllocated), icon: DollarSign, color: c.primary },
                    { label: 'Kas Pribadi', value: formatAmount(personalAllocated), icon: Wallet, color: c.secondary },
                    { label: 'Target Tabungan', value: formatAmount(savingsAllocated), icon: Target, color: c.warning },
                    { label: 'Rata-rata %', value: `${avgPercentage.toFixed(1)}%`, icon: Percent, color: c.destructive },
                  ].map(item => {
                    const Icon = item.icon;
                    return (
                      <div key={item.label} className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}>
                        <div className="flex items-center gap-2 mb-1.5">
                          <div className="h-7 w-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${item.color}15` }}>
                            <Icon className="h-3.5 w-3.5" style={{ color: item.color }} />
                          </div>
                          <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{item.label}</span>
                        </div>
                        <p className="text-base font-bold tabular-nums" style={{ color: item.color }}>{item.value}</p>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* ═══ Visual Allocation Bar ═══ */}
        {!loading && allocations.length > 0 && (
          <motion.div variants={itemVariants}>
            <Card className="biz-content-card rounded-xl bg-white/[0.02] border border-white/[0.06] backdrop-blur-xl">
              <CardContent className="p-3 sm:p-4">
                <div className="biz-section-header flex items-center gap-2 mb-3">
                  <div className="h-6 w-6 rounded-md flex items-center justify-center" style={{ backgroundColor: alpha(c.primary, 12) }}>
                    <Wallet className="h-3 w-3" style={{ color: c.primary }} />
                  </div>
                  <h3 className="text-xs font-semibold text-foreground">Visualisasi Alokasi</h3>
                  <Badge className="ml-auto text-[9px] font-medium rounded-full px-1.5 py-0" style={{ backgroundColor: alpha(c.primary, 8), color: c.primary, border: `1px solid ${alpha(c.primary, 12)}` }}>
                    {allocations.length} records
                  </Badge>
                </div>
                <AllocationBar allocations={allocations} totalSales={totalSales} />
                {latestAlloc && (
                  <div className="mt-3 pt-3 flex items-center gap-2.5 border-t border-border">
                    <div className="h-7 w-7 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: alpha(c.secondary, 12) }}>
                      <ArrowUpRight className="h-3 w-3" style={{ color: c.secondary }} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] text-muted-foreground">Alokasi Terakhir</p>
                      <div className="flex items-center gap-1.5">
                        <p className="text-xs font-medium truncate text-foreground">{latestAlloc.sale?.description || 'Manual allocation'}</p>
                        <TargetBadge targetType={latestAlloc.targetType} savingsTargetName={latestAlloc.savingsTarget?.name} />
                      </div>
                    </div>
                    <p className="text-xs font-semibold tabular-nums" style={{ color: c.primary }}>{formatAmount(latestAlloc.amount)}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* ═══ Available Savings Targets ═══ */}
        {!loading && savingsTargets.length > 0 && (
          <motion.div variants={itemVariants}>
            <Card className="biz-content-card rounded-xl bg-white/[0.02] border border-white/[0.06] backdrop-blur-xl">
              <CardContent className="p-3 sm:p-4">
                <div className="biz-section-header flex items-center gap-2 mb-3">
                  <div className="h-6 w-6 rounded-md flex items-center justify-center" style={{ backgroundColor: alpha(c.warning, 12) }}>
                    <PiggyBank className="h-3 w-3" style={{ color: c.warning }} />
                  </div>
                  <h3 className="text-xs font-semibold text-foreground">Target Tabungan Tersedia</h3>
                  <Badge className="ml-auto text-[9px] font-medium rounded-full px-1.5 py-0" style={{ backgroundColor: alpha(c.warning, 8), color: c.warning, border: `1px solid ${alpha(c.warning, 12)}` }}>
                    {savingsTargets.length}
                  </Badge>
                </div>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {savingsTargets.map(target => {
                    const pct = target.targetAmount > 0 ? Math.min((target.currentAmount / target.targetAmount) * 100, 100) : 0;
                    return (
                      <div key={target.id} className="flex items-center gap-3 p-2.5 rounded-lg" style={{ background: alpha(c.foreground, 2), border: '1px solid var(--border)' }}>
                        <div className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: alpha(c.warning, 12) }}>
                          <Target className="h-3.5 w-3.5" style={{ color: c.warning }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate text-foreground">{target.name}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {formatAmount(target.currentAmount)} / {formatAmount(target.targetAmount)}
                          </p>
                          <div className="biz-progress-track mt-1 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--border)' }}>
                            <div className="biz-progress-fill h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: c.warning, opacity: 0.7 }} />
                          </div>
                        </div>
                        <p className="text-xs font-bold tabular-nums shrink-0" style={{ color: c.warning }}>{pct.toFixed(0)}%</p>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* ═══ History Table ═══ */}
        <motion.div variants={itemVariants}>
          <Card className="biz-content-card rounded-xl overflow-hidden bg-white/[0.02] border border-white/[0.06] backdrop-blur-xl">
            <CardContent className="p-0">
              <div className="flex items-center gap-2 p-3 sm:p-4 border-b border-border">
                <div className="h-6 w-6 rounded-md flex items-center justify-center" style={{ backgroundColor: alpha(c.secondary, 12) }}>
                  <History className="h-3 w-3" style={{ color: c.secondary }} />
                </div>
                <h3 className="text-xs font-semibold text-foreground">{t('laporan.history')}</h3>
                <Badge className="ml-auto text-[9px] font-medium rounded-full px-1.5 py-0" style={{ backgroundColor: alpha(c.primary, 8), color: c.primary, border: `1px solid ${alpha(c.primary, 12)}` }}>
                  {allocations.length}
                </Badge>
              </div>
              {loading ? (
                <div className="space-y-2 p-3">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 rounded-lg" style={{ backgroundColor: alpha(c.foreground, 4) }} />
                  ))}
                </div>
              ) : allocations.length === 0 ? (
                <EmptyState />
              ) : (
                <>
                  {/* Mobile Card List */}
                  <div className="sm:hidden max-h-96 overflow-y-auto divide-y divide-border">
                    {allocations.map(alloc => (
                      <div key={alloc.id} className="p-3 space-y-1.5">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <p className="text-xs font-medium truncate text-foreground">{alloc.sale?.description || 'Manual allocation'}</p>
                            </div>
                            <p className="text-[10px] text-muted-foreground">{new Date(alloc.allocatedAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-xs font-semibold tabular-nums" style={{ color: c.primary }}>{formatAmount(alloc.amount)}</p>
                            {alloc.percentage > 0 && (
                              <span className="text-[10px] tabular-nums" style={{ color: c.secondary }}>{alloc.percentage}%</span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <TargetBadge targetType={alloc.targetType} savingsTargetName={alloc.savingsTarget?.name} />
                          {alloc.personalNote && (
                            <p className="text-[10px] truncate text-muted-foreground flex-1">— {alloc.personalNote}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Desktop Table */}
                  <div className="hidden sm:block max-h-96 overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="hover:bg-transparent border-b border-border">
                          <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Tanggal</TableHead>
                          <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Sumber</TableHead>
                          <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Tujuan</TableHead>
                          <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-right text-muted-foreground">Nominal</TableHead>
                          <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-right text-muted-foreground">Persentase</TableHead>
                          <TableHead className="text-[10px] font-semibold uppercase tracking-wider hidden lg:table-cell text-muted-foreground">Catatan</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {allocations.map((alloc, idx) => (
                          <TableRow
                            key={alloc.id}
                            className="transition-colors duration-150"
                            style={{
                              background: idx % 2 === 1 ? alpha(c.foreground, 2) : 'transparent',
                              borderBottom: '1px solid var(--border)',
                            }}
                          >
                            <TableCell className="text-xs py-2.5 tabular-nums text-muted-foreground">
                              {new Date(alloc.allocatedAt).toLocaleDateString('id-ID')}
                            </TableCell>
                            <TableCell className="py-2.5">
                              <span className="text-xs text-foreground">{alloc.sale?.description || 'Manual'}</span>
                            </TableCell>
                            <TableCell className="py-2.5">
                              <TargetBadge targetType={alloc.targetType} savingsTargetName={alloc.savingsTarget?.name} />
                            </TableCell>
                            <TableCell className="text-xs text-right font-semibold py-2.5 tabular-nums" style={{ color: c.primary }}>
                              {formatAmount(alloc.amount)}
                            </TableCell>
                            <TableCell className="py-2.5 text-right">
                              {alloc.percentage > 0 ? (
                                <span className="text-xs tabular-nums" style={{ color: c.secondary }}>{alloc.percentage}%</span>
                              ) : (
                                <span className="text-xs text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell className="text-xs py-2.5 max-w-[150px] truncate hidden lg:table-cell text-muted-foreground">
                              {alloc.personalNote || '-'}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>

      {/* ═══ Add Allocation Dialog ═══ */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="biz-dialog-content rounded-xl w-[95vw] sm:max-w-[500px] max-h-[90vh] overflow-y-auto border border-border">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold flex items-center gap-2 text-foreground">
              <div className="h-7 w-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: alpha(c.secondary, 12) }}>
                <ArrowDownToLine className="h-3.5 w-3.5" style={{ color: c.secondary }} />
              </div>
              Buat Alokasi Baru
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Alokasikan pendapatan bisnis ke kas pribadi atau target tabungan
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSave} className="space-y-4 mt-1">
            {/* Source Sale */}
            <div className="space-y-1.5">
              <Label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Sumber Penjualan</Label>
              <Select value={formData.saleId} onValueChange={v => setFormData({ ...formData, saleId: v })}>
                <SelectTrigger className="text-sm rounded-lg border border-border text-foreground">
                  <SelectValue placeholder="Pilih penjualan (opsional)" />
                </SelectTrigger>
                <SelectContent>
                  {sales.map(s => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.description} — {formatAmount(s.amount)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Allocation Mode Toggle */}
            <div className="space-y-1.5">
              <Label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Mode Alokasi</Label>
              <div className="flex items-center gap-1 p-0.5 rounded-lg w-fit" style={{ backgroundColor: alpha(c.foreground, 4) }}>
                <button
                  type="button"
                  onClick={() => setAllocMode('percentage')}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium rounded-md transition-all',
                    allocMode === 'percentage' ? 'shadow-sm' : 'text-muted-foreground'
                  )}
                  style={allocMode === 'percentage' ? { backgroundColor: alpha(c.primary, 15), color: c.primary } : {}}
                >
                  <Percent className="h-3 w-3" />
                  Persentase
                </button>
                <button
                  type="button"
                  onClick={() => setAllocMode('nominal')}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium rounded-md transition-all',
                    allocMode === 'nominal' ? 'shadow-sm' : 'text-muted-foreground'
                  )}
                  style={allocMode === 'nominal' ? { backgroundColor: alpha(c.primary, 15), color: c.primary } : {}}
                >
                  <DollarSign className="h-3 w-3" />
                  Nominal
                </button>
              </div>
            </div>

            {/* Value Input */}
            {allocMode === 'percentage' ? (
              <div className="space-y-1.5">
                <Label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Persentase (%)</Label>
                <Input
                  type="number"
                  value={formData.percentage}
                  onChange={e => setFormData({ ...formData, percentage: e.target.value })}
                  placeholder="10"
                  min="0"
                  max="100"
                  className="text-sm rounded-lg tabular-nums border border-border text-foreground"
                />
                {previewAmount > 0 && (
                  <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-1.5 px-1 mt-1">
                    <CircleDollarSign className="h-3 w-3 text-muted-foreground shrink-0" />
                    <span className="text-sm font-semibold tabular-nums" style={{ color: c.primary }}>{formatAmount(previewAmount)}</span>
                    <span className="text-[10px] text-muted-foreground">
                      dari {selectedSale ? selectedSale.description : 'total penjualan'} ({formatAmount(selectedSale ? selectedSale.amount : totalSales)})
                    </span>
                  </motion.div>
                )}
              </div>
            ) : (
              <div className="space-y-1.5">
                <Label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Nominal (Rp)</Label>
                <Input
                  type="number"
                  value={formData.amount}
                  onChange={e => setFormData({ ...formData, amount: e.target.value })}
                  placeholder="500000"
                  min="0"
                  className="text-sm rounded-lg tabular-nums border border-border text-foreground"
                />
                {formattedAllocNominal && (
                  <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-1.5 px-1 mt-1">
                    <CircleDollarSign className="h-3 w-3 text-muted-foreground shrink-0" />
                    <span className="text-sm font-semibold tabular-nums" style={{ color: c.primary }}>{formattedAllocNominal}</span>
                  </motion.div>
                )}
              </div>
            )}

            {/* Destination */}
            <div className="space-y-1.5">
              <Label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Tujuan Alokasi</Label>
              <div className="grid grid-cols-1 gap-2">
                {/* Personal Cash In */}
                <button
                  type="button"
                  onClick={() => setDestination('personal_cash_in')}
                  className={cn(
                    'flex items-center gap-3 p-3 rounded-xl border transition-all text-left',
                    destination === 'personal_cash_in'
                      ? 'border-0'
                      : 'border-border'
                  )}
                  style={destination === 'personal_cash_in' ? { backgroundColor: alpha(c.secondary, 10), border: `1px solid ${alpha(c.secondary, 20)}` } : { backgroundColor: alpha(c.foreground, 2) }}
                >
                  <div className="h-9 w-9 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: destination === 'personal_cash_in' ? alpha(c.secondary, 18) : alpha(c.foreground, 4) }}>
                    <Wallet className="h-4 w-4" style={{ color: c.secondary }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={cn('text-xs font-semibold', destination === 'personal_cash_in' ? 'text-foreground' : 'text-muted-foreground')}>Kas Pribadi</p>
                    <p className="text-[10px] text-muted-foreground">Masuk ke pemasukan pribadi sebagai kas masuk</p>
                  </div>
                  {destination === 'personal_cash_in' && (
                    <div className="h-5 w-5 rounded-full flex items-center justify-center" style={{ backgroundColor: c.secondary }}>
                      <ArrowRight className="h-3 w-3 text-black" />
                    </div>
                  )}
                </button>

                {/* Savings Target */}
                <button
                  type="button"
                  onClick={() => setDestination('savings_target')}
                  className={cn(
                    'flex items-center gap-3 p-3 rounded-xl border transition-all text-left',
                    destination === 'savings_target'
                      ? 'border-0'
                      : 'border-border'
                  )}
                  style={destination === 'savings_target' ? { backgroundColor: alpha(c.warning, 10), border: `1px solid ${alpha(c.warning, 20)}` } : { backgroundColor: alpha(c.foreground, 2) }}
                >
                  <div className="h-9 w-9 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: destination === 'savings_target' ? alpha(c.warning, 18) : alpha(c.foreground, 4) }}>
                    <Target className="h-4 w-4" style={{ color: c.warning }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={cn('text-xs font-semibold', destination === 'savings_target' ? 'text-foreground' : 'text-muted-foreground')}>Target Tabungan</p>
                    <p className="text-[10px] text-muted-foreground">
                      {savingsTargets.length > 0
                        ? `${savingsTargets.length} target tersedia`
                        : 'Belum ada target tabungan'}
                    </p>
                  </div>
                  {destination === 'savings_target' && (
                    <div className="h-5 w-5 rounded-full flex items-center justify-center" style={{ backgroundColor: c.warning }}>
                      <ArrowRight className="h-3 w-3 text-black" />
                    </div>
                  )}
                </button>
              </div>

              {/* Savings Target Selector */}
              {destination === 'savings_target' && savingsTargets.length > 0 && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mt-2">
                  <Select value={selectedSavingsTargetId} onValueChange={v => setSelectedSavingsTargetId(v)}>
                    <SelectTrigger className="text-sm rounded-lg border border-border text-foreground">
                      <SelectValue placeholder="Pilih target tabungan" />
                    </SelectTrigger>
                    <SelectContent>
                      {savingsTargets.map(target => {
                        const pct = target.targetAmount > 0 ? Math.round((target.currentAmount / target.targetAmount) * 100) : 0;
                        return (
                          <SelectItem key={target.id} value={target.id}>
                            {target.name} — {formatAmount(target.currentAmount)} / {formatAmount(target.targetAmount)} ({pct}%)
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </motion.div>
              )}

              {destination === 'savings_target' && savingsTargets.length === 0 && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-2 flex items-start gap-2 p-2.5 rounded-lg" style={{ background: alpha(c.destructive, 4), border: `1px solid ${alpha(c.destructive, 10)}` }}>
                  <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" style={{ color: c.destructive }} />
                  <p className="text-[10px] leading-relaxed text-muted-foreground">
                    Belum ada target tabungan. Buat target tabungan terlebih dahulu di menu Keuangan Pribadi.
                  </p>
                </motion.div>
              )}
            </div>

            {/* Note */}
            <div className="space-y-1.5">
              <Label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Catatan</Label>
              <Textarea
                value={formData.personalNote}
                onChange={e => setFormData({ ...formData, personalNote: e.target.value })}
                placeholder="Contoh: Gaji bulan ini dari bisnis"
                className="text-sm rounded-lg resize-none min-h-[60px] border border-border text-foreground"
              />
            </div>

            {/* Preview Summary */}
            {previewAmount > 0 && (
              <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl p-3 space-y-2" style={{ background: alpha(c.primary, 4), border: `1px solid ${alpha(c.primary, 10)}` }}>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Alokasi</span>
                  <span className="font-bold tabular-nums" style={{ color: c.primary }}>{formatAmount(previewAmount)}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Tujuan</span>
                  <span className="font-medium text-foreground">
                    {destination === 'personal_cash_in' ? 'Kas Pribadi' : destination === 'savings_target' ? `Target: ${savingsTargets.find(t => t.id === selectedSavingsTargetId)?.name || '...'}` : 'Bisnis'}
                  </span>
                </div>
                <div className="h-px" style={{ backgroundColor: 'var(--border)' }} />
                <div className="flex items-center gap-1.5">
                  <ArrowRight className="h-3 w-3" style={{ color: c.secondary }} />
                  <span className="text-[10px] text-muted-foreground">
                    {destination === 'personal_cash_in' && 'Akan dibuat sebagai transaksi kas masuk pribadi'}
                    {destination === 'savings_target' && 'Akan menambah saldo target tabungan'}
                  </span>
                </div>
              </motion.div>
            )}

            <DialogFooter className="gap-2 pt-1">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
                className="rounded-lg text-xs"
                style={{ borderColor: 'var(--border)', color: 'var(--foreground)' }}
              >
                {t('common.cancel')}
              </Button>
              <Button
                type="submit"
                disabled={saving || previewAmount <= 0 || (destination === 'savings_target' && !selectedSavingsTargetId)}
                className="rounded-lg text-xs"
                style={{ backgroundColor: c.primary, color: '#000' }}
              >
                {saving && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                {t('common.save')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Keyframes for hero glow */}
      <style>{`
        @keyframes heroGlow {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 0.6; }
        }
        @keyframes shimmer {
          0% { transform: translateX(-150%); }
          100% { transform: translateX(250%); }
        }
      `}</style>
    </div>
  );
}
