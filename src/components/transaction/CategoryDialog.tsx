'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Loader2 } from 'lucide-react';
import { DynamicIcon } from '@/components/shared/DynamicIcon';
import { useTranslation } from '@/hooks/useTranslation';
import { Category, CategoryFormData } from '@/types/transaction.types';

interface CategoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: 'income' | 'expense';
  initialData?: Category | null;
  onSubmit: (data: CategoryFormData) => Promise<void>;
}

const T = {
  primary: '#BB86FC',
  accent: '#03DAC6',
  destructive: '#CF6679',
  muted: '#9E9E9E',
};

const DEFAULT_COLORS = {
  income: '#10b981',
  expense: '#ef4444',
};

const DEFAULT_ICONS = {
  income: '💰',
  expense: '🛒',
};

const COLOR_PRESETS = [
  '#10b981', '#03DAC6', '#BB86FC', '#CF6679',
  '#F9A825', '#64B5F6', '#81C784', '#FFB74D',
  '#E57373', '#4DB6AC', '#BA68C8', '#7986CB',
];

export function CategoryDialog({
  open,
  onOpenChange,
  type,
  initialData,
  onSubmit,
}: CategoryDialogProps) {
  const { t } = useTranslation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    color: DEFAULT_COLORS[type],
    icon: DEFAULT_ICONS[type],
  });

  useEffect(() => {
    if (open && initialData) {
      setFormData({
        name: initialData.name,
        color: initialData.color,
        icon: initialData.icon,
      });
    } else if (!open) {
      setFormData({
        name: '',
        color: DEFAULT_COLORS[type],
        icon: DEFAULT_ICONS[type],
      });
    }
  }, [open, initialData, type]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onSubmit(formData);
    } finally {
      setIsSubmitting(false);
    }
  };

  const title = initialData
    ? (type === 'income' ? t('category.editIncomeCategory') : t('category.editExpenseCategory'))
    : (type === 'income' ? t('category.addIncomeCategory') : t('category.addExpenseCategory'));
  const submitLabel = initialData ? t('common.save') : t('common.save');
  const accentColor = type === 'income' ? T.accent : T.destructive;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#0D0D0D] border-white/[0.06] sm:max-w-md gap-0 p-0">
        <DialogHeader className="px-5 pt-5 pb-3">
          <DialogTitle className="text-sm font-semibold" style={{ color: '#E6E1E5' }}>
            <span className="inline-flex items-center gap-2">
              <span className="w-2 h-2 rounded-full" style={{ background: accentColor }} />
              {title}
            </span>
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="px-5 pb-5 space-y-3">
          {/* Name */}
          <div className="space-y-1.5">
            <Label className="text-[11px]" style={{ color: T.muted }}>{t('category.name')}</Label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder={type === 'income' ? 'Contoh: Gaji' : 'Contoh: Makanan'}
              required
              maxLength={50}
              className="h-9 text-sm bg-[#1E1E1E] border-white/[0.08] text-white placeholder:text-[#555] focus:border-[#BB86FC]/50 focus:ring-[#BB86FC]/20 rounded-lg"
              autoFocus
            />
          </div>

          {/* Icon */}
          <div className="space-y-1.5">
            <Label className="text-[11px]" style={{ color: T.muted }}>{t('category.icon')}</Label>
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl grid place-items-center text-lg shrink-0 [&>svg]:block"
                style={{ background: `${formData.color}20` }}
              >
                <DynamicIcon name={formData.icon || DEFAULT_ICONS[type]} className="h-5 w-5" />
              </div>
              <Input
                value={formData.icon}
                onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                placeholder={DEFAULT_ICONS[type]}
                maxLength={2}
                required
                className="h-9 text-sm bg-[#1E1E1E] border-white/[0.08] text-white placeholder:text-[#555] focus:border-[#BB86FC]/50 focus:ring-[#BB86FC]/20 rounded-lg"
              />
            </div>
          </div>

          {/* Color Presets */}
          <div className="space-y-1.5">
            <Label className="text-[11px]" style={{ color: T.muted }}>{t('category.color')}</Label>
            <div className="flex flex-wrap gap-2 mb-2">
              {COLOR_PRESETS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setFormData({ ...formData, color: c })}
                  className="w-7 h-7 rounded-lg transition-transform hover:scale-110"
                  style={{
                    background: c,
                    outline: formData.color === c ? `2px solid ${c}` : 'none',
                    outlineOffset: '2px',
                    boxShadow: formData.color === c ? `0 0 8px ${c}40` : 'none',
                  }}
                />
              ))}
            </div>
            <div className="flex items-center gap-2">
              <Input
                type="color"
                value={formData.color}
                onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                className="w-10 h-8 p-0.5 bg-transparent border-0 rounded-lg cursor-pointer"
              />
              <Input
                type="text"
                value={formData.color}
                onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                placeholder="#000000"
                maxLength={7}
                required
                className="h-8 text-xs bg-[#1E1E1E] border-white/[0.08] text-white placeholder:text-[#555] focus:border-[#BB86FC]/50 focus:ring-[#BB86FC]/20 rounded-lg font-mono"
              />
            </div>
          </div>

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
