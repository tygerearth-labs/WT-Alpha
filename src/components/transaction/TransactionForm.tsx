'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Loader2 } from 'lucide-react';
import { DynamicIcon } from '@/components/shared/DynamicIcon';
import { useTranslation } from '@/hooks/useTranslation';
import { useCurrencyFormat } from '@/hooks/useCurrencyFormat';
import { Transaction, Category, TransactionFormData, SavingsTarget } from '@/types/transaction.types';

interface TransactionFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: 'income' | 'expense';
  categories: Category[];
  savingsTargets?: SavingsTarget[];
  initialData?: Transaction | null;
  onSubmit: (data: TransactionFormData) => Promise<void>;
}

const T = {
  primary: '#BB86FC',
  accent: '#03DAC6',
  destructive: '#CF6679',
  muted: '#9E9E9E',
};

export function TransactionForm({
  open,
  onOpenChange,
  type,
  categories,
  savingsTargets = [],
  initialData,
  onSubmit,
}: TransactionFormProps) {
  const { t } = useTranslation();
  const { formatAmount } = useCurrencyFormat();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    amount: '',
    description: '',
    categoryId: '',
    date: new Date().toISOString().split('T')[0],
    targetId: '',
    allocationPercentage: '',
  });

  useEffect(() => {
    if (open && initialData) {
      setFormData({
        amount: initialData.amount.toString(),
        description: initialData.description || '',
        categoryId: initialData.categoryId,
        date: initialData.date.split('T')[0],
        targetId: '',
        allocationPercentage: '',
      });
    } else if (!open) {
      setFormData({
        amount: '',
        description: '',
        categoryId: '',
        date: new Date().toISOString().split('T')[0],
        targetId: '',
        allocationPercentage: '',
      });
    }
  }, [open, initialData]);

  useEffect(() => {
    if (type === 'income' && formData.targetId && formData.targetId !== 'none') {
      const selectedTarget = savingsTargets.find((t) => t.id === formData.targetId);
      if (selectedTarget && selectedTarget.allocationPercentage > 0) {
        setFormData((prev) => ({
          ...prev,
          allocationPercentage: selectedTarget.allocationPercentage.toString(),
        }));
      }
    }
  }, [formData.targetId, savingsTargets, type]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(formData.amount);
    if (!parsedAmount || parsedAmount <= 0 || !isFinite(parsedAmount)) return;
    const parsedAllocation = formData.allocationPercentage ? parseFloat(formData.allocationPercentage) : undefined;
    if (parsedAllocation !== undefined && (!isFinite(parsedAllocation) || parsedAllocation < 0 || parsedAllocation > 100)) return;
    setIsSubmitting(true);
    try {
      await onSubmit({
        type,
        amount: parsedAmount,
        description: formData.description,
        categoryId: formData.categoryId,
        date: formData.date,
        targetId: type === 'income' && formData.targetId && formData.targetId !== 'none' ? formData.targetId : undefined,
        allocationPercentage: parsedAllocation,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const title = initialData
    ? (type === 'income' ? t('kas.editTransaction') : t('kas.editTransaction'))
    : (type === 'income' ? t('kas.addTransaction') : t('kas.addTransaction'));
  const submitLabel = initialData ? t('common.save') : t('common.save');
  const accentColor = type === 'income' ? T.accent : T.destructive;
  const placeholderText = type === 'income' ? t('form.placeholderIncome') : t('form.placeholderExpense');

  const saveButtonGradient = type === 'income'
    ? 'linear-gradient(135deg, var(--secondary), var(--primary))'
    : 'linear-gradient(135deg, var(--destructive), var(--warning))';

  const allocAmount = (formData.targetId && formData.targetId !== 'none' && formData.allocationPercentage && formData.amount)
    ? (parseFloat(formData.amount) * parseFloat(formData.allocationPercentage)) / 100
    : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#141414] border-white/[0.08] sm:max-w-md rounded-2xl sm:rounded-xl p-0 gap-0 max-h-[calc(100vh-2rem)] sm:max-h-[85vh] overflow-y-auto overflow-x-hidden">
        <DialogHeader className="px-4 sm:px-5 pt-4 sm:pt-5 pb-3">
          <DialogTitle className="text-xs sm:text-sm font-semibold" style={{ color: '#E6E1E5' }}>
            <span className="inline-flex items-center gap-2">
              <span
                className="w-2 h-2 rounded-full"
                style={{ background: accentColor }}
              />
              {title}
            </span>
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="px-4 sm:px-5 pb-4 sm:pb-5 space-y-3 sm:space-y-4" style={{ '--mode-glow': `${accentColor}30` } as React.CSSProperties}>
          {/* Amount */}
          <div className="space-y-1.5">
            <Label className="text-xs sm:text-sm text-white/60 sm:text-white/70">{t('transaction.amount')}</Label>
            <Input
              type="number"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              placeholder="0"
              required
              min="0.01"
              step="0.01"
              className="h-11 text-sm bg-white/[0.04] border-white/[0.08] text-white placeholder:text-white/25 focus-visible:border-white/20 focus-visible:ring-1 focus-visible:ring-offset-0 focus-visible:ring-[var(--mode-glow)] rounded-xl transition-all"
              autoFocus
            />
            <p className="text-[9px] mt-0.5" style={{ color: T.muted }}>
              {type === 'income' ? t('form.tipIncome') : t('form.tipExpense')}
            </p>
          </div>

          {/* Section divider */}
          <div className="h-px bg-white/[0.06]" />

          {/* Category & Date - Grid */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs sm:text-sm text-white/60 sm:text-white/70">{t('kas.categories')}</Label>
              <Select
                value={formData.categoryId}
                onValueChange={(value) => setFormData({ ...formData, categoryId: value })}
                required
              >
                <SelectTrigger className={`h-11 text-xs sm:text-sm bg-white/[0.04] border-white/[0.08] text-white rounded-xl focus-visible:ring-1 focus-visible:ring-offset-0 focus-visible:ring-[var(--mode-glow)] focus-visible:border-white/20 transition-all ${formData.categoryId ? 'shadow-[0_0_14px_-4px_var(--mode-glow)]' : ''}`}>
                  <SelectValue placeholder={t('transaction.select')} />
                </SelectTrigger>
                <SelectContent className="bg-[#1a1a1a] border-white/[0.08]">
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id} className="text-white focus:bg-white/[0.08] py-2.5">
                      <DynamicIcon name={cat.icon} className="h-4 w-4 inline" /> {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[9px] mt-0.5" style={{ color: T.muted }}>
                {type === 'income' ? t('form.tipCategoryIncome') : t('form.tipCategoryExpense')}
              </p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs sm:text-sm text-white/60 sm:text-white/70">{t('laporan.date')}</Label>
              <Input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                required
                className="h-11 text-xs sm:text-sm bg-white/[0.04] border-white/[0.08] text-white rounded-xl focus-visible:ring-1 focus-visible:ring-offset-0 focus-visible:ring-[var(--mode-glow)] focus-visible:border-white/20 [color-scheme:dark] transition-all"
              />
            </div>
          </div>

          {/* Section divider */}
          <div className="h-px bg-white/[0.06]" />

          {/* Description */}
          <div className="space-y-1.5">
            <Label className="text-xs sm:text-sm text-white/60 sm:text-white/70">{t('laporan.excelDescription')}</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder={placeholderText}
              rows={2}
              className="text-xs sm:text-sm bg-white/[0.04] border-white/[0.08] text-white placeholder:text-white/25 focus-visible:border-white/20 focus-visible:ring-1 focus-visible:ring-offset-0 focus-visible:ring-[var(--mode-glow)] rounded-xl resize-none min-h-[2.75rem] transition-all"
            />
            <p className="text-[9px] mt-0.5" style={{ color: T.muted }}>{t('form.tipDescription')}</p>
          </div>

          {/* Savings target allocation (income only) */}
          {type === 'income' && (
            <>
              {/* Section divider */}
              <div className="h-px bg-white/[0.06]" />
              <div
                className="rounded-xl sm:rounded-2xl p-3 sm:p-4 space-y-3 sm:space-y-4"
                style={{ background: `${T.primary}08`, border: `1px solid ${T.primary}15` }}
              >
                <p className="text-[11px] font-semibold flex items-center gap-1.5" style={{ color: T.primary }}>
                  {t('transaction.allocateTarget')}
                </p>
                <p className="text-[9px]" style={{ color: `${T.primary}80` }}>{t('form.tipAllocation')}</p>
                <div className="space-y-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs sm:text-sm text-white/60 sm:text-white/70">{t('nav.target')}</Label>
                    <Select
                      value={formData.targetId}
                      onValueChange={(value) => setFormData({ ...formData, targetId: value })}
                    >
                      <SelectTrigger className={`h-11 text-xs sm:text-sm bg-white/[0.04] border-white/[0.08] text-white rounded-xl focus-visible:ring-1 focus-visible:ring-offset-0 focus-visible:ring-[var(--mode-glow)] focus-visible:border-white/20 transition-all ${formData.targetId && formData.targetId !== 'none' ? 'shadow-[0_0_14px_-4px_var(--mode-glow)]' : ''}`}>
                        <SelectValue placeholder={t('nav.target')} />
                      </SelectTrigger>
                      <SelectContent className="bg-[#1a1a1a] border-white/[0.08]">
                        <SelectItem value="none" className="text-white focus:bg-white/[0.08] py-2.5">{t('transaction.notAllocated')}</SelectItem>
                        {savingsTargets.map((target) => (
                          <SelectItem key={target.id} value={target.id} className="text-white focus:bg-white/[0.08] py-2.5">
                            {target.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {formData.targetId && formData.targetId !== 'none' && (
                    <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl px-3 py-2.5" style={{ background: 'rgba(255,255,255,0.04)' }}>
                      <span className="text-[10px]" style={{ color: T.muted }}>{t('transaction.autoAllocate')}</span>
                      <span className="text-[11px] font-bold" style={{ color: T.primary }}>
                        {formData.allocationPercentage || 0}% = {formatAmount(allocAmount)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Section divider */}
          <div className="h-px bg-white/[0.06]" />

          {/* Submit */}
          <DialogFooter className="pt-1 sm:pt-2 gap-2 sm:gap-3">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="w-full sm:w-auto flex-1 rounded-xl text-xs sm:text-sm h-12 hover:bg-white/[0.06] active:scale-[0.98] transition-all"
              style={{ color: T.muted }}
            >
              {t('common.cancel')}
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full sm:w-auto flex-1 rounded-xl text-xs sm:text-sm font-semibold border-0 text-white h-12 shadow-lg hover:shadow-xl hover:shadow-black/20 active:scale-[0.98] transition-all"
              style={{ background: saveButtonGradient }}
            >
              {isSubmitting && <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />}
              {submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
