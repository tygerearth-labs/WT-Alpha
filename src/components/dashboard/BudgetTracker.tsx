'use client';

import { useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Wallet, Plus, TrendingUp, TrendingDown, Check, X } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from '@/hooks/useTranslation';
import { useCurrencyFormat } from '@/hooks/useCurrencyFormat';
import { Category } from '@/types/transaction.types';
import { DynamicIcon } from '@/components/shared/DynamicIcon';

const THEME = {
  surface: '#121212',
  primary: '#BB86FC',
  secondary: '#03DAC6',
  destructive: '#CF6679',
  warning: '#F9A825',
  muted: '#9E9E9E',
  border: 'rgba(255,255,255,0.06)',
  text: '#FFFFFF',
  textSecondary: '#B3B3B3',
};

interface BudgetEntry {
  categoryId: string;
  budget: number;
}

const BUDGET_STORAGE_KEY = 'wealth-tracker-budgets';

function getBudgets(): BudgetEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(BUDGET_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveBudgets(budgets: BudgetEntry[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(BUDGET_STORAGE_KEY, JSON.stringify(budgets));
}

export function BudgetTracker() {
  const { t } = useTranslation();
  const { formatAmount } = useCurrencyFormat();
  const [categories, setCategories] = useState<Category[]>([]);
  const [categorySpending, setCategorySpending] = useState<Record<string, number>>({});
  const [budgets, setBudgets] = useState<BudgetEntry[]>([]);
  const [newBudgetCategoryId, setNewBudgetCategoryId] = useState<string | null>(null);
  const [newBudgetAmount, setNewBudgetAmount] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth() + 1;

      const [catRes, transRes] = await Promise.all([
        fetch('/api/categories?type=expense'),
        fetch(`/api/transactions?type=expense&year=${year}&month=${month}`),
      ]);

      if (catRes.ok) {
        const catData = await catRes.json();
        setCategories(catData.categories || []);
      }
      if (transRes.ok) {
        const transData = await transRes.json();
        const spending: Record<string, number> = {};
        for (const t of transData.transactions || []) {
          spending[t.categoryId] = (spending[t.categoryId] || 0) + t.amount;
        }
        setCategorySpending(spending);
      }
    } catch {
      // silent fail
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    setBudgets(getBudgets());
    fetchData();
  }, [fetchData]);

  const totalBudget = budgets.reduce((s, b) => s + b.budget, 0);
  const budgetedSpending = budgets.reduce(
    (s, b) => s + (categorySpending[b.categoryId] || 0),
    0
  );
  const totalSpending = Object.values(categorySpending).reduce((s, v) => s + v, 0);

  const getBarColor = (spent: number, budget: number) => {
    if (budget <= 0) return THEME.muted;
    const pct = (spent / budget) * 100;
    if (pct >= 100) return THEME.destructive;
    if (pct >= 80) return THEME.warning;
    return THEME.secondary;
  };

  const handleAddBudget = () => {
    if (!newBudgetCategoryId || !newBudgetAmount || parseFloat(newBudgetAmount) <= 0) {
      toast.error(t('dashboard.budgetInvalidAmount'));
      return;
    }
    const amount = parseFloat(newBudgetAmount);
    const existing = budgets.findIndex(b => b.categoryId === newBudgetCategoryId);
    let updated: BudgetEntry[];
    if (existing >= 0) {
      updated = [...budgets];
      updated[existing] = { categoryId: newBudgetCategoryId, budget: amount };
    } else {
      updated = [...budgets, { categoryId: newBudgetCategoryId, budget: amount }];
    }
    setBudgets(updated);
    saveBudgets(updated);
    setNewBudgetCategoryId(null);
    setNewBudgetAmount('');
    toast.success(t('dashboard.budgetSaved'));
  };

  const handleRemoveBudget = (categoryId: string) => {
    const updated = budgets.filter(b => b.categoryId !== categoryId);
    setBudgets(updated);
    saveBudgets(updated);
    toast.success(t('dashboard.budgetRemoved'));
  };

  // Categories without budgets
  const unbudgetedCategories = categories.filter(
    c => !budgets.find(b => b.categoryId === c.id)
  );

  if (isLoading) {
    return (
      <div className="rounded-xl p-4 sm:p-5" style={{ background: THEME.surface, border: `1px solid ${THEME.border}` }}>
        <div className="flex items-center justify-center h-48">
          <div className="w-12 h-12 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: THEME.border, borderTopColor: 'transparent' }} />
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl overflow-hidden relative" style={{ background: THEME.surface, border: `1px solid ${THEME.border}` }}>
      {/* Subtle glow */}
      <div className="absolute -top-6 -left-6 w-20 h-20 rounded-full blur-3xl opacity-[0.06] pointer-events-none" style={{ background: THEME.primary }} />

      <div className="p-4 sm:p-5">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg grid place-items-center [&>*]:block leading-none" style={{ background: `${THEME.primary}15` }}>
              <Wallet className="h-3.5 w-3.5" style={{ color: THEME.primary }} />
            </div>
            <h3 className="text-sm font-semibold" style={{ color: THEME.text }}>{t('dashboard.monthlyBudget')}</h3>
          </div>
          {budgets.length > 0 && (
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full" style={{ background: `${THEME.border}`, color: THEME.muted }}>
              {budgets.length} {budgets.length === 1 ? t('dashboard.budgetCategorySingular') : t('dashboard.budgetCategoryPlural')}
            </span>
          )}
        </div>

        {/* Total Budget vs Spent */}
        {budgets.length > 0 && (
          <div className="mb-4 p-3 rounded-lg" style={{ background: 'rgba(255,255,255,0.02)', border: `1px solid ${THEME.border}` }}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-medium" style={{ color: THEME.textSecondary }}>{t('dashboard.totalBudget')}</span>
              <span className="text-xs font-bold" style={{ color: THEME.text }}>{formatAmount(totalBudget)}</span>
            </div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-medium" style={{ color: THEME.textSecondary }}>{t('dashboard.spent')}</span>
              <span className="text-xs font-bold" style={{ color: getBarColor(budgetedSpending, totalBudget) }}>
                {formatAmount(budgetedSpending)}
              </span>
            </div>
            <div className="h-2 rounded-full overflow-hidden" style={{ background: THEME.border }}>
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${Math.min((budgetedSpending / Math.max(totalBudget, 1)) * 100, 100)}%`,
                  background: `linear-gradient(90deg, ${THEME.secondary}, ${getBarColor(budgetedSpending, totalBudget)})`,
                }}
              />
            </div>
            <div className="flex items-center justify-between mt-1.5">
              <span className="text-[10px]" style={{ color: THEME.muted }}>
                {totalBudget > 0 ? t('dashboard.budgetUsed', { percent: Math.round((budgetedSpending / totalBudget) * 100) }) : ''}
              </span>
              {totalBudget - budgetedSpending > 0 && (
                <span className="text-[10px] font-medium" style={{ color: THEME.secondary }}>
                  {formatAmount(totalBudget - budgetedSpending)} {t('dashboard.budgetLeft')}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Budget Bars */}
        <div className="space-y-3 max-h-64 overflow-y-auto">
          {budgets.length === 0 && (
            <div className="text-center py-6">
              <Wallet className="h-8 w-8 mx-auto mb-2" style={{ color: THEME.muted, opacity: 0.4 }} />
              <p className="text-xs" style={{ color: THEME.muted }}>{t('dashboard.noBudgetsYet')}</p>
              <p className="text-[10px] mt-0.5" style={{ color: THEME.muted, opacity: 0.6 }}>
                {t('dashboard.noBudgetsHint')}
              </p>
            </div>
          )}

          {budgets.map((b) => {
            const category = categories.find(c => c.id === b.categoryId);
            if (!category) return null;
            const spent = categorySpending[b.categoryId] || 0;
            const pct = b.budget > 0 ? (spent / b.budget) * 100 : 0;
            const barColor = getBarColor(spent, b.budget);

            return (
              <div key={b.categoryId} className="group relative">
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="w-5 h-5 rounded-md grid place-items-center shrink-0 [&>*]:block leading-none" style={{ background: `${category.color}18` }}>
                    <DynamicIcon name={category.icon} className="h-2.5 w-2.5" style={{ color: category.color }} />
                  </div>
                  <span className="text-[11px] font-medium flex-1 truncate" style={{ color: THEME.text }}>
                    {category.name}
                  </span>
                  <span className="text-[10px] font-semibold tabular-nums" style={{ color: barColor }}>
                    {formatAmount(spent)} / {formatAmount(b.budget)}
                  </span>
                  <button
                    onClick={() => handleRemoveBudget(b.categoryId)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity grid place-items-center h-5 w-5 rounded-md"
                    style={{ background: `${THEME.destructive}15` }}
                  >
                    <X className="h-3 w-3" style={{ color: THEME.destructive }} />
                  </button>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: THEME.border }}>
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min(pct, 100)}%`,
                      background: pct >= 100
                        ? THEME.destructive
                        : pct >= 80
                          ? `linear-gradient(90deg, ${THEME.secondary}, ${THEME.warning})`
                          : `linear-gradient(90deg, ${THEME.secondary}, ${THEME.secondary}CC)`,
                    }}
                  />
                </div>
                <div className="flex items-center justify-between mt-0.5">
                  <span className="text-[9px] font-medium" style={{ color: THEME.muted }}>
                    {pct.toFixed(0)}%
                  </span>
                  {pct >= 100 && (
                    <span className="text-[9px] font-bold" style={{ color: THEME.destructive }}>
                      {t('dashboard.overBudget')}
                    </span>
                  )}
                  {pct >= 80 && pct < 100 && (
                    <span className="text-[9px] font-medium" style={{ color: THEME.warning }}>
                      {t('dashboard.nearLimit')}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Add Budget */}
        {unbudgetedCategories.length > 0 && (
          <div className="mt-4 pt-3" style={{ borderTop: `1px solid ${THEME.border}` }}>
            {newBudgetCategoryId ? (
              <div className="flex items-center gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] mb-1 truncate" style={{ color: THEME.textSecondary }}>
                    {categories.find(c => c.id === newBudgetCategoryId)?.name}
                  </p>
                  <Input
                    type="number"
                    placeholder={t('dashboard.budgetAmountPlaceholder')}
                    value={newBudgetAmount}
                    onChange={(e) => setNewBudgetAmount(e.target.value)}
                    className="h-8 text-xs"
                    style={{
                      background: 'rgba(255,255,255,0.04)',
                      border: `1px solid ${THEME.border}`,
                      color: THEME.text,
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleAddBudget();
                      if (e.key === 'Escape') { setNewBudgetCategoryId(null); setNewBudgetAmount(''); }
                    }}
                    autoFocus
                  />
                </div>
                <button
                  onClick={handleAddBudget}
                  className="grid place-items-center h-8 w-8 rounded-lg shrink-0 transition-all active:scale-90"
                  style={{ background: `${THEME.secondary}15`, color: THEME.secondary }}
                >
                  <Check className="h-4 w-4" />
                </button>
                <button
                  onClick={() => { setNewBudgetCategoryId(null); setNewBudgetAmount(''); }}
                  className="grid place-items-center h-8 w-8 rounded-lg shrink-0 transition-all active:scale-90"
                  style={{ background: `${THEME.destructive}15`, color: THEME.destructive }}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-[11px] font-medium rounded-lg transition-all hover:scale-[1.01]"
                style={{
                  background: `${THEME.primary}08`,
                  color: THEME.primary,
                  border: `1px solid ${THEME.primary}15`,
                }}
                onClick={() => {
                  setNewBudgetCategoryId(unbudgetedCategories[0]?.id || null);
                  setNewBudgetAmount('');
                }}
              >
                <Plus className="h-3 w-3 mr-1" />
                {t('dashboard.addBudget')}
              </Button>
            )}
          </div>
        )}

        {/* Unbudgeted spending info */}
        {budgets.length > 0 && totalSpending > budgetedSpending && (
          <div className="mt-3 pt-2" style={{ borderTop: `1px solid ${THEME.border}` }}>
            <p className="text-[10px]" style={{ color: THEME.muted }}>
              <TrendingDown className="h-2.5 w-2.5 inline mr-1" />
              {formatAmount(totalSpending - budgetedSpending)} {t('dashboard.unbudgetedSpending')}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
