'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { Plus, Edit, Trash2, PiggyBank, Loader2, ChevronRight, ArrowDownLeft, History, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { SavingsTarget } from '@/types/transaction.types';
import { TargetMetrics, getBrutalInsight, getSpeedCopy, getETAText, generateMiniChallenge } from '@/lib/targetLogic';
import { TargetSummaryCard } from '@/components/target/TargetSummaryCard';
import { useTranslation } from '@/hooks/useTranslation';
import { useCurrencyFormat } from '@/hooks/useCurrencyFormat';
import { TargetSkeleton } from '@/components/shared/PageSkeleton';

// ── Theme ──
const T = {
  bg: '#121212',
  primary: '#BB86FC',
  secondary: '#03DAC6',
  destructive: '#CF6679',
  warning: '#F9A825',
  muted: '#9E9E9E',
  border: 'rgba(255,255,255,0.06)',
  borderHover: 'rgba(255,255,255,0.12)',
  text: '#E6E1E5',
  textSub: '#B3B3B3',
} as const;

// ── Circular Progress Ring ──
function ProgressRing({ pct, size = 56, stroke = 4, color }: { pct: number; size?: number; stroke?: number; color: string }) {
  const r = (size - stroke) / 2;
  const circ = r * 2 * Math.PI;
  const offset = circ - (Math.min(pct, 100) / 100) * circ;
  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle stroke={T.border} fill="transparent" strokeWidth={stroke} r={r} cx={size / 2} cy={size / 2} />
      <circle
        stroke={color}
        fill="transparent"
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={circ + ' ' + circ}
        style={{ strokeDashoffset: offset, transition: 'stroke-dashoffset 1s ease-out' }}
        r={r} cx={size / 2} cy={size / 2}
      />
    </svg>
  );
}

// ── Status Chip ──
function StatusChip({ status }: { status: 'healthy' | 'warning' | 'critical' }) {
  const { t } = useTranslation();
  const cfg = {
    healthy: { label: t('target.healthy'), color: T.secondary, bg: `${T.secondary}15` },
    warning: { label: t('target.warning'), color: T.warning, bg: `${T.warning}15` },
    critical: { label: t('target.critical'), color: T.destructive, bg: `${T.destructive}15` },
  }[status];
  return (
    <span
      className="text-[9px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full"
      style={{ color: cfg.color, background: cfg.bg }}
    >
      {cfg.label}
    </span>
  );
}

// ── Quick Deposit Chips ──
function QuickDeposit({ targetId }: { targetId: string }) {
  const { t } = useTranslation();
  const { formatAmount } = useCurrencyFormat();
  const amounts = [50, 100, 200, 500];
  const handleDeposit = async (amount: number) => {
    try {
      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'income',
          amount: amount * 1000,
          description: t('target.quickDeposit'),
          categoryId: '',
          date: new Date().toISOString().split('T')[0],
          targetId,
          allocationPercentage: 100,
        }),
      });
      if (res.ok) {
        toast.success(`+${formatAmount(amount * 1000)} berhasil!`);
        window.dispatchEvent(new Event('savings-updated'));
      } else {
        toast.error(t('target.depositFailed'));
      }
    } catch {
      toast.error(t('common.error'));
    }
  };
  return (
    <div className="flex gap-1.5 flex-wrap">
      {amounts.map(a => (
        <button
          key={a}
          onClick={() => handleDeposit(a)}
          className="text-[10px] font-semibold px-2.5 py-1 rounded-lg transition-all duration-150 active:scale-95"
          style={{ background: `${T.primary}12`, color: T.primary, border: `1px solid ${T.primary}20` }}
        >
          +{a}k
        </button>
      ))}
    </div>
  );
}

// ── Mini Progress Bar ──
function MiniBar({ value, color, height = 3 }: { value: number; color: string; height?: number }) {
  return (
    <div className="w-full rounded-full overflow-hidden" style={{ height, background: T.border }}>
      <div
        className="h-full rounded-full transition-all duration-700"
        style={{ width: `${Math.min(value, 100)}%`, background: color }}
      />
    </div>
  );
}

// ── Transaction History (inside expanded target card) ──
function TransactionHistory({ targetId }: { targetId: string }) {
  const { t } = useTranslation();
  const { formatAmount } = useCurrencyFormat();
  const [allocations, setAllocations] = useState<any[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const fetchHistory = async () => {
      setIsLoadingHistory(true);
      try {
        const res = await fetch(`/api/savings/${targetId}/allocations`);
        if (res.ok && !cancelled) {
          const data = await res.json();
          setAllocations(data.allocations || []);
        }
      } catch { /* silent */ }
      finally { if (!cancelled) setIsLoadingHistory(false); }
    };
    fetchHistory();
    return () => { cancelled = true; };
  }, [targetId]);

  const displayList = showAll ? allocations : allocations.slice(0, 3);

  if (isLoadingHistory) {
    return (
      <div className="space-y-2 pt-2">
        <p className="text-[9px] uppercase tracking-wider font-semibold" style={{ color: T.muted }}>{t('target.transactionHistory')}</p>
        <div className="flex items-center justify-center py-3">
          <Loader2 className="h-4 w-4 animate-spin" style={{ color: T.muted }} />
        </div>
      </div>
    );
  }

  if (allocations.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2 pt-2">
      <div className="flex items-center justify-between">
        <p className="text-[9px] uppercase tracking-wider font-semibold" style={{ color: T.muted }}>{t('target.transactionHistory')}</p>
        <span className="text-[9px] font-medium" style={{ color: T.secondary }}>
          {t('target.totalDeposits', { count: allocations.length })}
        </span>
      </div>

      {/* Transaction list */}
      <div className="space-y-1.5">
        {displayList.map((alloc: any, idx: number) => {
          const txDate = alloc.createdAt ? new Date(alloc.createdAt) : new Date(alloc.transaction?.date);
          const source = alloc.transaction?.category?.name || alloc.transaction?.description || t('target.quickDeposit');
          const catColor = alloc.transaction?.category?.color || T.primary;

          return (
            <div
              key={alloc.id}
              className="flex items-center gap-2.5 rounded-lg p-2 transition-colors"
              style={{ background: 'rgba(255,255,255,0.02)', border: `1px solid ${T.border}` }}
            >
              {/* Icon */}
              <div
                className="w-7 h-7 rounded-lg grid place-items-center shrink-0 [&>*]:block leading-none"
                style={{ background: `${catColor}15` }}
              >
                <ArrowDownLeft className="h-3.5 w-3.5" style={{ color: catColor }} />
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-medium truncate" style={{ color: T.text }}>{source}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <Calendar className="h-2.5 w-2.5" style={{ color: T.muted }} />
                  <p className="text-[9px]" style={{ color: T.muted }}>
                    {format(txDate, 'dd MMM yyyy, HH:mm')}
                  </p>
                  {alloc.percentage && alloc.percentage > 0 && (
                    <span className="text-[9px] font-medium" style={{ color: T.primary }}>
                      {alloc.percentage}%
                    </span>
                  )}
                </div>
              </div>

              {/* Amount */}
              <span className="text-[11px] font-bold shrink-0" style={{ color: T.secondary }}>
                +{formatAmount(alloc.amount)}
              </span>
            </div>
          );
        })}
      </div>

      {/* Show more / less */}
      {allocations.length > 3 && (
        <button
          onClick={() => setShowAll(!showAll)}
          className="w-full text-[10px] font-medium py-1.5 rounded-lg transition-all flex items-center justify-center gap-1"
          style={{ background: `${T.primary}08`, color: T.primary, border: `1px solid ${T.primary}12` }}
        >
          <History className="h-3 w-3" />
          {showAll ? t('common.showLess', { defaultValue: 'Tutup' }) : t('common.showMore', { defaultValue: 'Lihat Semua' })} ({allocations.length})
        </button>
      )}
    </div>
  );
}

// ── Target Card ──
function TargetCard({
  target,
  onEdit,
  onDelete,
}: {
  target: SavingsTarget;
  onEdit: (t: SavingsTarget) => void;
  onDelete: (id: string) => void;
}) {
  const { t } = useTranslation();
  const { formatAmount } = useCurrencyFormat();
  const [expanded, setExpanded] = useState(false);
  const metrics = target.metrics as TargetMetrics | undefined;
  if (!metrics) return null;

  const pct = metrics.progressPercent;
  const ringColor = pct >= 80 ? T.secondary : pct >= 50 ? T.primary : pct >= 25 ? T.warning : T.destructive;
  const speedCopy = getSpeedCopy(metrics.speedStatus, t);
  const brutalInsight = getBrutalInsight(metrics, target, t);
  const miniChallenge = generateMiniChallenge(target, metrics, t);
  const daysLeft = (() => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    return Math.ceil((new Date(target.targetDate).getTime() - today.getTime()) / 86400000);
  })();
  const isCompleted = pct >= 100;
  const monthlyAch = target.monthlyAchievement || 0;
  const monthlyColor = monthlyAch >= 100 ? T.secondary : monthlyAch >= 70 ? T.primary : monthlyAch >= 40 ? T.warning : T.destructive;

  return (
    <div
      className="rounded-2xl overflow-hidden transition-all duration-200"
      style={{
        background: T.bg,
        border: `1px solid ${T.border}`,
      }}
    >
      {/* Clickable header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left p-3 sm:p-4 flex items-center gap-3 active:bg-white/[0.02] transition-colors"
      >
        {/* Ring */}
        <div className="relative shrink-0">
          <ProgressRing pct={pct} size={48} stroke={3.5} color={ringColor} />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-[11px] font-bold" style={{ color: ringColor }}>{(pct || 0).toFixed(0)}</span>
          </div>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-sm font-semibold truncate" style={{ color: T.text }}>{target.name}</span>
            {!isCompleted && <StatusChip status={metrics.targetStatus} />}
            {isCompleted && (
              <span className="text-[9px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full" style={{ color: T.secondary, background: `${T.secondary}15` }}>
                {t('target.completed')}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 text-[10px]" style={{ color: T.muted }}>
            <span>{formatAmount(target.currentAmount)}</span>
            <ChevronRight className="h-3 w-3" />
            <span style={{ color: T.textSub }}>{formatAmount(target.targetAmount)}</span>
          </div>
        </div>

        {/* Chevron */}
        <ChevronRight
          className="h-4 w-4 shrink-0 transition-transform duration-200"
          style={{ color: T.muted, transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)' }}
        />
      </button>

      {/* Expanded Details */}
      {expanded && (
        <div className="px-3 sm:px-4 pb-3 sm:pb-4 space-y-3" style={{ borderTop: `1px solid ${T.border}` }}>
          {/* ETA & Speed */}
          <div className="grid grid-cols-3 gap-2 pt-3">
            <div className="text-center">
              <p className="text-[9px] uppercase tracking-wider" style={{ color: T.muted }}>{t('target.eta')}</p>
              <p className="text-xs font-bold mt-0.5" style={{ color: T.text }}>{getETAText(metrics.etaInMonths, t)}</p>
            </div>
            <div className="text-center">
              <p className="text-[9px] uppercase tracking-wider" style={{ color: T.muted }}>{t('target.speedLabel')}</p>
              <p className="text-xs font-bold mt-0.5" style={{ color: T.text }}>{speedCopy.emoji} {speedCopy.text.split('.')[0]}</p>
            </div>
            <div className="text-center">
              <p className="text-[9px] uppercase tracking-wider" style={{ color: T.muted }}>{t('target.deadline')}</p>
              <p className="text-xs font-bold mt-0.5" style={{ color: daysLeft < 30 ? T.destructive : T.text }}>
                {daysLeft > 0 ? t('target.daysLeft', { days: daysLeft }) : t('target.overdue')}
              </p>
            </div>
          </div>

          {/* Monthly bar */}
          {target.monthlyContribution > 0 && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[10px]">
                <span style={{ color: T.muted }}>{t('target.monthlyThis')}</span>
                <span style={{ color: monthlyColor }} className="font-semibold">
                  {formatAmount(target.currentMonthlyAllocation || 0)} / {formatAmount(target.monthlyContribution)}
                </span>
              </div>
              <MiniBar value={Math.min(monthlyAch, 100)} color={monthlyColor} />
            </div>
          )}

          {/* Brutal Insight */}
          {brutalInsight && !isCompleted && (
            <div
              className="rounded-xl p-2.5"
              style={{ background: `${T.destructive}08`, border: `1px solid ${T.destructive}15` }}
            >
              <p className="text-[11px] leading-relaxed" style={{ color: T.destructive }}>
                {brutalInsight}
              </p>
            </div>
          )}

          {/* Transaction History */}
          <TransactionHistory targetId={target.id} />

          {/* Quick Deposit */}
          {!isCompleted && <QuickDeposit targetId={target.id} />}

          {/* Mini Challenge */}
          {!isCompleted && miniChallenge && (
            <div
              className="rounded-xl p-2.5 flex items-center justify-between"
              style={{ background: `${T.primary}08`, border: `1px solid ${T.primary}15` }}
            >
              <div className="min-w-0">
                <p className="text-[11px] font-semibold" style={{ color: T.primary }}>{miniChallenge.title}</p>
                <p className="text-[10px]" style={{ color: T.muted }}>{miniChallenge.description}</p>
              </div>
              <button
                className="shrink-0 text-[10px] font-semibold px-2.5 py-1.5 rounded-lg transition-all active:scale-95"
                style={{ background: T.primary, color: '#000' }}
                onClick={async () => {
                  try {
                    const res = await fetch('/api/transactions', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        type: 'income',
                        amount: miniChallenge.targetAmount,
                        description: miniChallenge.title,
                        categoryId: '',
                        date: new Date().toISOString().split('T')[0],
                        targetId: target.id,
                        allocationPercentage: 100,
                      }),
                    });
                    if (res.ok) {
                      toast.success(t('target.challengeComplete'));
                      window.dispatchEvent(new Event('savings-updated'));
                    }
                  } catch { toast.error(t('common.failed')); }
                }}
              >
                {t('target.takeChallenge')}
              </button>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <button
              onClick={() => onEdit(target)}
              className="flex-1 text-[11px] font-medium py-2 rounded-lg flex items-center justify-center gap-1.5 transition-colors"
              style={{ background: `${T.primary}10`, color: T.primary }}
            >
              <Edit className="h-3 w-3" /> {t('common.edit')}
            </button>
            <button
              onClick={() => onDelete(target.id)}
              className="flex-1 text-[11px] font-medium py-2 rounded-lg flex items-center justify-center gap-1.5 transition-colors"
              style={{ background: `${T.destructive}10`, color: T.destructive }}
            >
              <Trash2 className="h-3 w-3" /> {t('common.delete')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Target Form Dialog (reusable for add & edit) ──
function TargetFormDialog({
  open,
  onOpenChange,
  onSubmit,
  initialData,
  isEdit,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSubmit: (data: any) => void;
  initialData: Partial<SavingsTarget> | null;
  isEdit: boolean;
}) {
  const { t } = useTranslation();

  const buildForm = (data: Partial<SavingsTarget> | null) => ({
    name: data?.name || '',
    targetAmount: data?.targetAmount || 0,
    targetDate: data?.targetDate ? format(new Date(data.targetDate), 'yyyy-MM-dd') : '',
    initialInvestment: data?.initialInvestment || 0,
    monthlyContribution: data?.monthlyContribution || 0,
    allocationPercentage: data?.allocationPercentage || 0,
  });

  const [form, setForm] = useState(() => buildForm(initialData));
  const [key, setKey] = useState(0);

  const handleOpenChange = (v: boolean) => {
    if (v) {
      setForm(buildForm(initialData));
      setKey(k => k + 1);
    }
    onOpenChange(v);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || form.targetAmount <= 0 || !form.targetDate) {
      toast.error(t('target.requiredFields'));
      return;
    }
    onSubmit(form);
  };

  const inputCls = "h-9 text-sm bg-[#1E1E1E] border-white/[0.08] text-white placeholder:text-[#9E9E9E] focus:border-[#BB86FC]/50 focus:ring-[#BB86FC]/20";

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[420px] lg:max-w-[520px] bg-[#0D0D0D] border-white/[0.06]" onClick={(e) => e.stopPropagation()}>
        <DialogHeader>
          <DialogTitle className="text-white">{isEdit ? t('target.editTitle') : t('target.addTitle')}</DialogTitle>
          <DialogDescription className="text-[#9E9E9E]">
            {isEdit ? t('target.editDesc') : t('target.addDesc')}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} onClick={(e) => e.stopPropagation()}>
          <div className="space-y-3 py-3">
            <div className="space-y-1.5">
              <Label className="text-[11px] text-[#9E9E9E]">{t('target.nameField')}</Label>
              <Input className={inputCls} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder={t('target.noData')} />
              <p className="text-[9px]" style={{ color: T.muted }}>{t('form.tipTargetName')}</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-[11px] text-[#9E9E9E]">{t('target.amountField')}</Label>
                <Input type="number" className={inputCls} value={form.targetAmount || ''} onChange={e => setForm({ ...form, targetAmount: parseFloat(e.target.value) || 0 })} placeholder="10000000" />
                <p className="text-[9px]" style={{ color: T.muted }}>{t('form.tipTargetAmount')}</p>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] text-[#9E9E9E]">{t('target.targetDate')} *</Label>
                <Input type="date" className={inputCls} value={form.targetDate} onChange={e => setForm({ ...form, targetDate: e.target.value })} min={format(new Date(), 'yyyy-MM-dd')} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-[11px] text-[#9E9E9E]">{t('target.initialInvestment')}</Label>
                <Input type="number" className={inputCls} value={form.initialInvestment || ''} onChange={e => setForm({ ...form, initialInvestment: parseFloat(e.target.value) || 0 })} placeholder="0" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] text-[#9E9E9E]">{t('target.contributionMonthly')}</Label>
                <Input type="number" className={inputCls} value={form.monthlyContribution || ''} onChange={e => setForm({ ...form, monthlyContribution: parseFloat(e.target.value) || 0 })} placeholder="0" />
                <p className="text-[9px]" style={{ color: T.muted }}>{t('form.tipTargetMonthly')}</p>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[11px] text-[#9E9E9E]">{t('target.allocationAuto')}</Label>
              <Input type="number" className={inputCls} value={form.allocationPercentage || ''} onChange={e => setForm({ ...form, allocationPercentage: parseFloat(e.target.value) || 0 })} placeholder="0" min="0" max="100" />
              <p className="text-[9px]" style={{ color: T.muted }}>{t('target.allocationDesc')}</p>
            </div>
          </div>
          <DialogFooter className="pt-2">
            <Button type="submit" className="w-full bg-[#BB86FC] text-black hover:bg-[#BB86FC]/90 font-semibold">
              {isEdit ? t('common.save') : t('target.createTarget')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ══════════════════════════════════════════════════════════════
// ── Main Page ──
// ══════════════════════════════════════════════════════════════
export function TargetTabungan() {
  const { t } = useTranslation();
  const [savingsTargets, setSavingsTargets] = useState<SavingsTarget[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; id: string | null }>({ open: false, id: null });
  const [selectedTarget, setSelectedTarget] = useState<SavingsTarget | null>(null);

  const fetchTargets = async () => {
    try {
      const res = await fetch('/api/savings');
      if (res.ok) {
        const data = await res.json();
        setSavingsTargets(data.savingsTargets);
      }
    } catch { toast.error(t('target.loadError')); }
    finally { setIsLoading(false); }
  };

  useEffect(() => {
    fetchTargets();
    const handler = () => fetchTargets();
    window.addEventListener('savings-updated', handler);
    return () => window.removeEventListener('savings-updated', handler);
  }, []);

  const handleAdd = async (data: any) => {
    try {
      const res = await fetch('/api/savings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
      if (res.ok) { toast.success(t('target.addSuccess')); setIsAddOpen(false); fetchTargets(); }
      else { const e = await res.json(); toast.error(e.error || t('common.failed')); }
    } catch { toast.error(t('common.error')); }
  };

  const handleEdit = async (data: any) => {
    if (!selectedTarget) return;
    try {
      const res = await fetch(`/api/savings/${selectedTarget.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
      if (res.ok) { toast.success(t('target.updateSuccess')); setIsEditOpen(false); setSelectedTarget(null); fetchTargets(); }
      else { const e = await res.json(); toast.error(e.error || t('common.failed')); }
    } catch { toast.error(t('common.error')); }
  };

  const handleDelete = async () => {
    if (!deleteDialog.id) return;
    try {
      const res = await fetch(`/api/savings/${deleteDialog.id}`, { method: 'DELETE' });
      if (res.ok) { toast.success(t('target.deleteSuccess')); setDeleteDialog({ open: false, id: null }); fetchTargets(); }
      else toast.error(t('target.deleteError'));
    } catch { toast.error(t('common.error')); }
  };

  if (isLoading) {
    return <TargetSkeleton />;
  }

  return (
    <div className="space-y-4 lg:space-y-6">
      {/* Header + Add Button */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-wider font-semibold" style={{ color: T.muted }}>{t('target.title')}</p>
          <p className="text-[10px] mt-0.5" style={{ color: T.muted }}>{t('target.targetCount', { count: savingsTargets.length })}</p>
        </div>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button
              size="sm"
              className="h-8 px-3 text-xs font-semibold gap-1.5 rounded-xl"
              style={{ background: T.primary, color: '#000' }}
            >
              <Plus className="h-3.5 w-3.5" /> {t('common.add')}
            </Button>
          </DialogTrigger>
          <TargetFormDialog open={isAddOpen} onOpenChange={setIsAddOpen} onSubmit={handleAdd} initialData={null} isEdit={false} />
        </Dialog>
      </div>

      {/* Summary */}
      {savingsTargets.length > 0 && <TargetSummaryCard savingsTargets={savingsTargets} />}

      {/* Empty State */}
      {savingsTargets.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div
            className="w-16 h-16 rounded-2xl grid place-items-center mb-4 [&>*]:block leading-none"
            style={{ background: `${T.primary}10` }}
          >
            <PiggyBank className="h-8 w-8" style={{ color: T.primary }} />
          </div>
          <p className="text-sm font-semibold" style={{ color: T.text }}>{t('target.noData')}</p>
          <p className="text-xs mt-1" style={{ color: T.muted }}>{t('target.noDataDesc')}</p>
        </div>
      )}

      {/* Target Cards */}
      <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
        {savingsTargets.map(target => (
          <TargetCard
            key={target.id}
            target={target}
            onEdit={(t) => { setSelectedTarget(t); setIsEditOpen(true); }}
            onDelete={(id) => setDeleteDialog({ open: true, id })}
          />
        ))}
      </div>

      {/* Edit Dialog */}
      <TargetFormDialog open={isEditOpen} onOpenChange={(v) => { setIsEditOpen(v); if (!v) setSelectedTarget(null); }} onSubmit={handleEdit} initialData={selectedTarget} isEdit />

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ ...deleteDialog, open })}>
        <AlertDialogContent className="bg-[#0D0D0D] border-white/[0.06]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">{t('target.deleteTitle')}?</AlertDialogTitle>
            <AlertDialogDescription className="text-[#9E9E9E]">
              {t('target.deleteDesc')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-white/[0.06] text-white border-white/[0.08] hover:bg-white/[0.1]">{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-[#CF6679] text-white hover:bg-[#CF6679]/90">{t('common.delete')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
