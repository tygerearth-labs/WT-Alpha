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
    setIsSubmitting(true);
    try {
      await onSubmit({
        type,
        amount: parseFloat(formData.amount),
        description: formData.description,
        categoryId: formData.categoryId,
        date: formData.date,
        targetId: type === 'income' && formData.targetId && formData.targetId !== 'none' ? formData.targetId : undefined,
        allocationPercentage: type === 'income' && formData.allocationPercentage ? formData.allocationPercentage : undefined,
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
  const placeholderText = type === 'income' ? 'Contoh: Bonus bulanan' : 'Contoh: Makan siang';

  const allocAmount = (formData.targetId && formData.targetId !== 'none' && formData.allocationPercentage && formData.amount)
    ? (parseFloat(formData.amount) * parseFloat(formData.allocationPercentage)) / 100
    : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#0D0D0D] border-white/[0.06] sm:max-w-md gap-0 p-0">
        <DialogHeader className="px-5 pt-5 pb-3">
          <DialogTitle className="text-sm font-semibold" style={{ color: '#E6E1E5' }}>
            <span className="inline-flex items-center gap-2">
              <span
                className="w-2 h-2 rounded-full"
                style={{ background: accentColor }}
              />
              {title}
            </span>
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="px-5 pb-5 space-y-3">
          {/* Amount */}
          <div className="space-y-1.5">
            <Label className="text-[11px]" style={{ color: T.muted }}>{t('transaction.amount')}</Label>
            <Input
              type="number"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              placeholder="0"
              required
              min="0"
              step="0.01"
              className="h-9 text-sm bg-[#1E1E1E] border-white/[0.08] text-white placeholder:text-[#555] focus:border-[#BB86FC]/50 focus:ring-[#BB86FC]/20 rounded-lg"
              autoFocus
            />
            <p className="text-[9px] mt-0.5" style={{ color: T.muted }}>
              {type === 'income' ? t('form.tipIncome') : t('form.tipExpense')}
            </p>
          </div>

          {/* Category & Date - Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-[11px]" style={{ color: T.muted }}>{t('kas.categories')}</Label>
              <Select
                value={formData.categoryId}
                onValueChange={(value) => setFormData({ ...formData, categoryId: value })}
                required
              >
                <SelectTrigger className="h-9 text-xs bg-[#1E1E1E] border-white/[0.08] text-white rounded-lg">
                  <SelectValue placeholder={t('transaction.select')} />
                </SelectTrigger>
                <SelectContent className="bg-[#1E1E1E] border-white/[0.08]">
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id} className="text-white focus:bg-white/[0.08]">
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
              <Label className="text-[11px]" style={{ color: T.muted }}>{t('laporan.date')}</Label>
              <Input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                required
                className="h-9 text-xs bg-[#1E1E1E] border-white/[0.08] text-white rounded-lg [color-scheme:dark]"
              />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label className="text-[11px]" style={{ color: T.muted }}>{t('laporan.excelDescription')}</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder={placeholderText}
              rows={2}
              className="text-xs bg-[#1E1E1E] border-white/[0.08] text-white placeholder:text-[#555] focus:border-[#BB86FC]/50 focus:ring-[#BB86FC]/20 rounded-lg resize-none"
            />
            <p className="text-[9px] mt-0.5" style={{ color: T.muted }}>{t('form.tipDescription')}</p>
          </div>

          {/* Savings target allocation (income only) */}
          {type === 'income' && (
            <div
              className="rounded-xl p-3 space-y-3"
              style={{ background: `${T.primary}08`, border: `1px solid ${T.primary}15` }}
            >
              <p className="text-[11px] font-semibold flex items-center gap-1.5" style={{ color: T.primary }}>
                <span>🎯</span> {t('transaction.allocateTarget')}
              </p>
              <p className="text-[9px]" style={{ color: `${T.primary}80` }}>{t('form.tipAllocation')}</p>
              <div className="space-y-2">
                <div className="space-y-1.5">
                  <Label className="text-[11px]" style={{ color: T.muted }}>{t('nav.target')}</Label>
                  <Select
                    value={formData.targetId}
                    onValueChange={(value) => setFormData({ ...formData, targetId: value })}
                  >
                    <SelectTrigger className="h-8 text-xs bg-[#1E1E1E] border-white/[0.08] text-white rounded-lg">
                      <SelectValue placeholder={t('nav.target')} />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1E1E1E] border-white/[0.08]">
                      <SelectItem value="none" className="text-white focus:bg-white/[0.08]">{t('transaction.notAllocated')}</SelectItem>
                      {savingsTargets.map((target) => (
                        <SelectItem key={target.id} value={target.id} className="text-white focus:bg-white/[0.08]">
                          {target.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {formData.targetId && formData.targetId !== 'none' && (
                  <div className="flex items-center justify-between rounded-lg px-2.5 py-2" style={{ background: '#1E1E1E' }}>
                    <span className="text-[10px]" style={{ color: T.muted }}>{t('transaction.autoAllocate')}</span>
                    <span className="text-[11px] font-bold" style={{ color: T.primary }}>
                      {formData.allocationPercentage || 0}% = {formatAmount(allocAmount)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Submit */}
          <DialogFooter className="pt-1 gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="flex-1 rounded-lg text-xs"
              style={{ color: T.muted }}
            >
              {t('common.cancel')}
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 rounded-lg text-xs font-semibold border-0"
              style={{ background: accentColor, color: '#000' }}
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
