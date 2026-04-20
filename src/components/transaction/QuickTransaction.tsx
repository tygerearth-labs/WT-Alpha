'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, CheckCircle2, Loader2, TrendingUp, TrendingDown } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Category } from '@/types/transaction.types';
import { format } from 'date-fns';
import { useTranslation } from '@/hooks/useTranslation';

const THEME = {
  primary: '#BB86FC',
  secondary: '#03DAC6',
  destructive: '#CF6679',
  muted: '#9E9E9E',
  border: 'rgba(255,255,255,0.06)',
  text: '#FFFFFF',
  textSecondary: '#B3B3B3',
  surface: '#121212',
};

export function QuickTransaction() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [categories, setCategories] = useState<Category[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const fetchCategories = useCallback(async () => {
    try {
      // Single fetch for all categories — client-side filter handles type separation
      const res = await fetch('/api/categories');
      if (!res.ok) {
        toast.error(t('common.error'));
        return;
      }
      const data = await res.json();
      setCategories(data.categories || []);
    } catch {
      toast.error(t('common.error'));
    }
  }, [t]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  // Filter categories by type
  const filteredCategories = categories.filter(c => c.type === type);

  // Reset category when type changes
  useEffect(() => {
    setCategoryId('');
  }, [type]);

  const handleSubmit = async () => {
    const parsedAmount = parseFloat(amount);
    if (!parsedAmount || parsedAmount <= 0 || !isFinite(parsedAmount)) {
      toast.error(t('quickEntry.invalidAmount'));
      return;
    }
    if (!categoryId) {
      toast.error(t('quickEntry.selectCategory'));
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          amount: parsedAmount,
          description: description || undefined,
          categoryId,
          date: date || undefined,
        }),
      });

      if (response.ok) {
        setShowSuccess(true);
        setTimeout(() => {
          setShowSuccess(false);
          setOpen(false);
          // Reset form
          setAmount('');
          setDescription('');
          setCategoryId('');
          setDate(format(new Date(), 'yyyy-MM-dd'));
          toast.success(type === 'income' ? t('quickEntry.incomeSuccess') : t('quickEntry.expenseSuccess'));
        }, 1200);
      } else {
        const error = await response.json();
        toast.error(error.error || t('quickEntry.createFailed'));
      }
    } catch {
      toast.error(t('common.error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const activeColor = type === 'income' ? THEME.secondary : THEME.destructive;

  return (
    <>
      {/* Floating Action Button — positioned above bottom nav on mobile */}
      <button
        onClick={() => setOpen(true)}
        className="quick-entry-fab fixed right-4 z-50 w-14 h-14 rounded-2xl grid place-items-center shadow-2xl transition-all duration-200 hover:scale-110 active:scale-95 group md:right-8"
        style={{
          background: `linear-gradient(135deg, ${THEME.primary}, ${THEME.secondary})`,
          boxShadow: `0 4px 24px ${THEME.primary}40, 0 2px 8px rgba(0,0,0,0.4)`,
        }}
        aria-label={t('quickEntry.ariaLabel')}
      >
        {/* Pulse ring animation */}
        <span
          className="absolute inset-0 rounded-2xl animate-ping opacity-20"
          style={{ background: THEME.primary }}
        />
        <Plus
          className="relative h-6 w-6 text-white transition-transform duration-200 group-hover:rotate-90"
          strokeWidth={2.5}
        />
      </button>

      {/* Sheet */}
      <Sheet open={open} onOpenChange={(v) => { if (!v) { setOpen(false); setShowSuccess(false); } else { setOpen(true); } }}>
        <SheetContent
          side="bottom"
          className="max-h-[85vh] sm:max-w-lg md:max-w-xl lg:max-w-2xl mx-auto inset-x-auto left-1/2 right-auto -translate-x-1/2 mb-0 md:mb-8 md:rounded-2xl overflow-y-auto rounded-t-2xl"
          style={{
            background: '#0D0D0D',
            border: `1px solid ${THEME.border}`,
            borderBottom: 'none',
          }}
        >
          <SheetHeader className="px-5 pt-5 pb-0">
            <SheetTitle className="text-base font-bold" style={{ color: THEME.text }}>
              {t('quickEntry.title')}
            </SheetTitle>
            <SheetDescription className="text-xs" style={{ color: THEME.muted }}>
              {t('quickEntry.subtitle')}
            </SheetDescription>
          </SheetHeader>

          <div className="p-4 md:p-5 space-y-4">
            {/* Success Animation */}
            {showSuccess && (
              <div className="flex flex-col items-center justify-center py-12 animate-in fade-in zoom-in duration-300">
                <div
                  className="w-20 h-20 rounded-full grid place-items-center mb-4"
                  style={{
                    background: `${THEME.secondary}15`,
                    boxShadow: `0 0 40px ${THEME.secondary}20`,
                  }}
                >
                  <CheckCircle2 className="h-10 w-10" style={{ color: THEME.secondary }} />
                </div>
                <p className="text-sm font-semibold" style={{ color: THEME.secondary }}>
                  {t('quickEntry.saved')}
                </p>
              </div>
            )}

            {!showSuccess && (
              <>
                {/* Type Toggle */}
                <div className="flex gap-2 p-1 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)' }}>
                  <button
                    onClick={() => setType('expense')}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-semibold transition-all duration-200"
                    style={{
                      background: type === 'expense' ? `${THEME.destructive}15` : 'transparent',
                      color: type === 'expense' ? THEME.destructive : THEME.muted,
                      boxShadow: type === 'expense' ? `0 0 12px ${THEME.destructive}15` : 'none',
                    }}
                  >
                    <TrendingDown className="h-3.5 w-3.5" />
                    {t('kas.totalExpense')}
                  </button>
                  <button
                    onClick={() => setType('income')}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-semibold transition-all duration-200"
                    style={{
                      background: type === 'income' ? `${THEME.secondary}15` : 'transparent',
                      color: type === 'income' ? THEME.secondary : THEME.muted,
                      boxShadow: type === 'income' ? `0 0 12px ${THEME.secondary}15` : 'none',
                    }}
                  >
                    <TrendingUp className="h-3.5 w-3.5" />
                    {t('kas.totalIncome')}
                  </button>
                </div>

                {/* Amount Input */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-medium" style={{ color: THEME.textSecondary }}>
                    {t('transaction.amount')}
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold" style={{ color: THEME.muted }}>
                      {type === 'expense' ? '-' : '+'}
                    </span>
                    <Input
                      type="number"
                      placeholder="0"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="h-12 text-xl font-bold pl-10 pr-4 tabular-nums text-right"
                      style={{
                        background: 'rgba(255,255,255,0.04)',
                        border: `2px solid ${THEME.border}`,
                        color: THEME.text,
                      }}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(); }}
                      autoFocus
                    />
                  </div>
                </div>

                {/* Category Select */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-medium" style={{ color: THEME.textSecondary }}>
                    {t('kas.categories')}
                  </label>
                  <Select value={categoryId || undefined} onValueChange={setCategoryId}>
                    <SelectTrigger
                      className="w-full h-10 text-xs"
                      style={{
                        background: 'rgba(255,255,255,0.04)',
                        border: `1px solid ${THEME.border}`,
                        color: categoryId ? THEME.text : THEME.muted,
                      }}
                    >
                      <SelectValue placeholder={t('quickEntry.selectCategoryPlaceholder')} />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredCategories.map(cat => (
                        <SelectItem key={cat.id} value={cat.id}>
                          <span className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full shrink-0" style={{ background: cat.color || '#6b7280' }} />
                            {cat.name}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Description */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-medium" style={{ color: THEME.textSecondary }}>
                    {t('laporan.excelDescription')} <span style={{ color: THEME.muted }}>{t('quickEntry.optional')}</span>
                  </label>
                  <Input
                    placeholder={t('quickEntry.descriptionPlaceholder')}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="h-10 text-xs"
                    style={{
                      background: 'rgba(255,255,255,0.04)',
                      border: `1px solid ${THEME.border}`,
                      color: THEME.text,
                    }}
                  />
                </div>

                {/* Date */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-medium" style={{ color: THEME.textSecondary }}>
                    {t('laporan.date')}
                  </label>
                  <Input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="h-10 text-xs"
                    style={{
                      background: 'rgba(255,255,255,0.04)',
                      border: `1px solid ${THEME.border}`,
                      color: THEME.text,
                      colorScheme: 'dark',
                    }}
                  />
                </div>

                {/* Submit Button */}
                <Button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="w-full h-12 rounded-xl text-sm font-bold transition-all duration-200 active:scale-[0.98] disabled:opacity-50"
                  style={{
                    background: `linear-gradient(135deg, ${THEME.primary}, ${activeColor})`,
                    color: '#fff',
                    boxShadow: `0 4px 20px ${activeColor}30`,
                  }}
                >
                  {isSubmitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-2" />
                      {t('quickEntry.saveTransaction')}
                    </>
                  )}
                </Button>
              </>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
