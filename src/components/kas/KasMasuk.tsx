'use client';

import { useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Plus, TrendingUp, Calendar, ArrowUpRight, Loader2, Wallet } from 'lucide-react';
import { toast } from 'sonner';
import { TransactionForm } from '@/components/transaction/TransactionForm';
import { CategoryDialog } from '@/components/transaction/CategoryDialog';
import { TransactionList } from '@/components/transaction/TransactionList';
import { CategoryList } from '@/components/transaction/CategoryList';
import { Transaction, Category, TransactionFormData, CategoryFormData, SavingsTarget } from '@/types/transaction.types';
import { useTranslation } from '@/hooks/useTranslation';
import { TransactionPageSkeleton } from '@/components/shared/PageSkeleton';
import { useCurrencyFormat } from '@/hooks/useCurrencyFormat';
import { DynamicIcon } from '@/components/shared/DynamicIcon';

type DateFilter = 'today' | 'week' | 'month' | 'all';

const T = {
  surface: '#121212',
  accent: '#03DAC6',
  primary: '#BB86FC',
  muted: '#9E9E9E',
  border: 'rgba(255,255,255,0.06)',
  text: '#E6E1E5',
  textSub: '#B3B3B3',
} as const;

export function KasMasuk() {
  const { t } = useTranslation();
  const { formatAmount } = useCurrencyFormat();

  const FILTERS: { key: DateFilter; label: string }[] = [
    { key: 'today', label: t('kas.filterDay') },
    { key: 'week', label: t('kas.filterWeek') },
    { key: 'month', label: t('kas.filterMonth') },
    { key: 'all', label: t('filter.all') },
  ];

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [savingsTargets, setSavingsTargets] = useState<SavingsTarget[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; id: string; type: 'transaction' | 'category' }>({ open: false, id: '', type: 'transaction' });
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [dateFilter, setDateFilter] = useState<DateFilter>('month');
  const [showAllTransactions, setShowAllTransactions] = useState(false);

  const fetchData = useCallback(async (filter: DateFilter) => {
    try {
      const searchParams = new URLSearchParams();
      searchParams.append('type', 'income');

      // Only send year/month for 'month', 'today', 'week' — 'all' sends nothing so API returns everything
      if (filter !== 'all') {
        const now = new Date();
        searchParams.append('year', now.getFullYear().toString());
        searchParams.append('month', (now.getMonth() + 1).toString());
      }

      const [transRes, catRes, savingsRes] = await Promise.all([
        fetch(`/api/transactions?${searchParams.toString()}`),
        fetch('/api/categories?type=income'),
        fetch('/api/savings'),
      ]);

      if (transRes.ok && catRes.ok && savingsRes.ok) {
        const transData = await transRes.json();
        const catData = await catRes.json();
        const savingsData = await savingsRes.json();

        let filteredTransactions = transData.transactions;

        if (filter === 'today') {
          const now = new Date();
          now.setHours(0, 0, 0, 0);
          const tomorrow = new Date(now);
          tomorrow.setDate(tomorrow.getDate() + 1);
          filteredTransactions = filteredTransactions.filter(t => {
            const transDate = new Date(t.date);
            return transDate >= now && transDate < tomorrow;
          });
        } else if (filter === 'week') {
          const now = new Date();
          now.setHours(0, 0, 0, 0);
          const startOfWeek = new Date(now);
          const dayOfWeek = now.getDay();
          const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Monday start (Indonesian locale)
          startOfWeek.setDate(now.getDate() - diff);
          filteredTransactions = filteredTransactions.filter(t => {
            const transDate = new Date(t.date);
            return transDate >= startOfWeek && transDate <= now;
          });
        }
        // 'month' and 'all' use API results directly (no extra client filtering)

        setTransactions(filteredTransactions);
        setCategories(catData.categories);
        setSavingsTargets(savingsData.savingsTargets);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error(t('kas.loadError'));
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  useEffect(() => {
    fetchData(dateFilter);
  }, [dateFilter, fetchData]);

  const handleAddTransaction = async (data: TransactionFormData) => {
    try {
      const response = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (response.ok) {
        toast.success(t('kas.addIncomeSuccess'));
        setIsAddDialogOpen(false);
        fetchData(dateFilter);
      } else {
        const error = await response.json();
        toast.error(error.error || t('kas.addError'));
      }
    } catch {
      toast.error(t('common.error'));
    }
  };

  const handleEditTransaction = async (data: TransactionFormData) => {
    if (!selectedTransaction) return;
    try {
      const response = await fetch(`/api/transactions/${selectedTransaction.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (response.ok) {
        toast.success(t('kas.updateIncomeSuccess'));
        setIsEditDialogOpen(false);
        setSelectedTransaction(null);
        fetchData(dateFilter);
      } else {
        const error = await response.json();
        toast.error(error.error || t('kas.updateError'));
      }
    } catch {
      toast.error(t('common.error'));
    }
  };

  const handleDelete = async () => {
    try {
      let response;
      let successMessage;
      if (deleteDialog.type === 'transaction') {
        response = await fetch(`/api/transactions/${deleteDialog.id}`, { method: 'DELETE' });
        successMessage = t('kas.deleteIncomeSuccess');
      } else {
        response = await fetch(`/api/categories/${deleteDialog.id}`, { method: 'DELETE' });
        successMessage = t('kas.deleteCategorySuccess');
      }
      if (response.ok) {
        toast.success(successMessage);
        setDeleteDialog({ open: false, id: '', type: 'transaction' });
        fetchData(dateFilter);
      } else {
        const error = await response.json();
        toast.error(error.error || t('kas.deleteError'));
      }
    } catch {
      toast.error(t('common.error'));
    }
  };

  const handleAddCategory = async (data: CategoryFormData) => {
    try {
      const response = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, type: 'income' }),
      });
      if (response.ok) {
        toast.success(t('kas.addCategorySuccess'));
        setIsCategoryDialogOpen(false);
        fetchData(dateFilter);
      } else {
        const error = await response.json();
        toast.error(error.error || t('kas.addCategoryError'));
      }
    } catch {
      toast.error(t('common.error'));
    }
  };

  const handleEditCategory = async (data: CategoryFormData) => {
    if (!selectedCategory) return;
    try {
      const response = await fetch(`/api/categories/${selectedCategory.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (response.ok) {
        toast.success(t('kas.updateCategorySuccess'));
        setSelectedCategory(null);
        fetchData(dateFilter);
      } else {
        const error = await response.json();
        toast.error(error.error || t('kas.updateCategoryError'));
      }
    } catch {
      toast.error(t('common.error'));
    }
  };

  const openEditTransactionDialog = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setIsEditDialogOpen(true);
  };

  const openEditCategoryDialog = (category: Category) => {
    setSelectedCategory(category);
    setIsCategoryDialogOpen(true);
  };

  const totalIncome = transactions.reduce((sum, t) => sum + t.amount, 0);
  const avgIncome = transactions.length > 0 ? totalIncome / transactions.length : 0;
  const maxIncome = transactions.length > 0 ? Math.max(...transactions.map(t => t.amount)) : 0;

  const incomeByCategory = categories
    .map(cat => {
      const catTransactions = transactions.filter(t => t.categoryId === cat.id);
      const total = catTransactions.reduce((sum, t) => sum + t.amount, 0);
      return { name: cat.name, amount: total, color: cat.color, icon: cat.icon, count: catTransactions.length };
    })
    .filter(item => item.amount > 0);

  // Build category amounts map for CategoryList
  const categoryAmounts: Record<string, { amount: number; count: number }> = {};
  categories.forEach(cat => {
    const catTransactions = transactions.filter(t => t.categoryId === cat.id);
    const total = catTransactions.reduce((sum, t) => sum + t.amount, 0);
    categoryAmounts[cat.id] = { amount: total, count: catTransactions.length };
  });

  if (isLoading) {
    return <TransactionPageSkeleton />;
  }

  const displayedTransactions = showAllTransactions ? transactions : transactions.slice(0, 6);

  return (
    <div className="w-full max-w-full space-y-3 sm:space-y-4">
      {/* ── Hero Strip ── */}
      <div className="relative rounded-2xl">
        {/* Desktop animated gradient border glow */}
        <div className="absolute -inset-[1.5px] rounded-[18px] hidden lg:block animate-pulse"
          style={{
            background: `linear-gradient(135deg, ${T.accent}50, ${T.primary}30, ${T.accent}50)`,
            filter: 'blur(2px)',
            opacity: 0.5,
          }}
        />
        <div className="absolute -inset-[1px] rounded-[18px] hidden lg:block"
          style={{
            background: `linear-gradient(135deg, ${T.accent}80, ${T.primary}50, ${T.accent}80)`,
          }}
        />

        {/* Main content */}
        <div
          className="relative rounded-2xl p-4 sm:p-5 lg:p-8 overflow-hidden"
          style={{ background: `linear-gradient(135deg, ${T.accent}15 0%, ${T.accent}08 50%, ${T.primary}05 100%)`, border: `1px solid ${T.accent}25` }}
        >
          {/* Desktop dot pattern overlay */}
          <div className="absolute inset-0 hidden lg:block pointer-events-none" style={{
            backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px)',
            backgroundSize: '20px 20px',
            maskImage: 'linear-gradient(180deg, transparent 0%, black 25%, black 75%, transparent 100%)',
            WebkitMaskImage: 'linear-gradient(180deg, transparent 0%, black 25%, black 75%, transparent 100%)',
          }} />

          {/* Decorative blurs */}
          <div className="absolute top-0 right-0 w-32 h-32 lg:w-56 lg:h-56 rounded-full opacity-[0.08] blur-3xl pointer-events-none"
            style={{ background: T.accent, transform: 'translate(30%, -30%)' }}
          />
          <div className="absolute bottom-0 left-1/4 w-24 h-24 lg:w-40 lg:h-40 rounded-full opacity-[0.05] blur-3xl pointer-events-none hidden lg:block"
            style={{ background: T.primary }}
          />

          <div className="relative z-10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 lg:gap-5">
                {/* Icon with glow */}
                <div className="relative">
                  <div className="absolute inset-0 rounded-xl blur-xl opacity-30 hidden lg:block" style={{ background: T.accent }} />
                  <div className="relative w-10 h-10 lg:w-14 lg:h-14 rounded-xl lg:rounded-2xl flex items-center justify-center" style={{ background: `${T.accent}20` }}>
                    <Wallet className="h-5 w-5 lg:h-7 lg:w-7" style={{ color: T.accent }} />
                  </div>
                </div>
                <div>
                  <p className="text-[10px] lg:text-sm font-medium uppercase tracking-wider" style={{ color: T.muted }}>{t('kas.totalIncome')}</p>
                  <p className="text-xl sm:text-2xl lg:text-4xl font-bold tracking-tight" style={{ color: T.text }}>
                    {formatAmount(totalIncome)}
                  </p>
                </div>
              </div>
              <Button
                onClick={() => setIsAddDialogOpen(true)}
                className="h-10 w-10 lg:h-12 lg:w-12 rounded-xl lg:rounded-2xl shrink-0"
                style={{ background: T.accent, color: '#000' }}
              >
                <Plus className="h-5 w-5 lg:h-6 lg:w-6" />
              </Button>
            </div>

            {/* Desktop inline stats row */}
            <div className="hidden lg:flex lg:items-center lg:gap-6 mt-5 pt-4" style={{ borderTop: `1px solid rgba(255,255,255,0.06)` }}>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" style={{ color: T.muted }} />
                <span className="text-sm font-medium" style={{ color: T.textSub }}>{t('filter.transactionCount', { count: transactions.length })}</span>
              </div>
              <div className="w-px h-4" style={{ background: 'rgba(255,255,255,0.08)' }} />
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4" style={{ color: T.accent }} />
                <span className="text-sm font-medium" style={{ color: T.textSub }}>{t('kas.average')}: </span>
                <span className="text-sm font-bold" style={{ color: T.accent }}>{formatAmount(avgIncome)}</span>
              </div>
              <div className="w-px h-4" style={{ background: 'rgba(255,255,255,0.08)' }} />
              <div className="flex items-center gap-2">
                <Wallet className="h-4 w-4" style={{ color: T.primary }} />
                <span className="text-sm font-medium" style={{ color: T.textSub }}>{t('kas.largest')}: </span>
                <span className="text-sm font-bold" style={{ color: T.primary }}>{formatAmount(maxIncome)}</span>
              </div>
            </div>

            {/* Mobile stats */}
            <div className="mt-3 flex items-center gap-1.5 text-[11px] lg:hidden" style={{ color: T.textSub }}>
              <Calendar className="h-3 w-3" />
              <span>{t('filter.transactionCount', { count: transactions.length })}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Quick Stats ── */}
      <div className="grid grid-cols-3 gap-2 lg:gap-5">
        {[
          { label: t('kas.average'), value: formatAmount(avgIncome), color: T.accent, icon: TrendingUp },
          { label: t('kas.transactions'), value: transactions.length.toString(), color: T.primary, icon: ArrowUpRight },
          { label: t('kas.largest'), value: formatAmount(maxIncome), color: T.primary, icon: Wallet },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl p-3 lg:p-5 lg:py-6 text-center transition-all lg:hover:scale-[1.02] relative overflow-hidden group"
            style={{ background: T.surface, border: `1px solid ${T.border}` }}
          >
            {/* Desktop gradient border glow on hover */}
            <div className="absolute inset-0 hidden lg:block rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
              style={{ boxShadow: `inset 0 0 0 1px ${stat.color}25, 0 0 24px ${stat.color}10` }}
            />
            <div className="relative z-10">
              <div className="relative inline-block">
                <div className="absolute inset-0 rounded-full blur-lg opacity-0 hidden lg:block group-hover:opacity-30 transition-opacity duration-300" style={{ background: stat.color }} />
                <stat.icon className="relative h-3.5 w-3.5 lg:h-5 lg:w-5 mx-auto mb-1.5 lg:mb-2" style={{ color: stat.color, opacity: 0.7 }} />
              </div>
              <p className="text-[10px] lg:text-xs font-medium uppercase tracking-wider mb-0.5 lg:mb-1" style={{ color: T.muted }}>{stat.label}</p>
              <p className="text-xs sm:text-sm lg:text-lg font-bold truncate" style={{ color: stat.color }}>{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ═══ Desktop 2-column layout ═══ */}
      <div className="hidden lg:grid lg:grid-cols-[340px_1fr] xl:grid-cols-[400px_1fr] lg:gap-5 xl:gap-6">
        {/* Left column: Categories + Distribution — Glass card */}
        <div
          className="rounded-2xl p-5 space-y-5"
          style={{
            background: 'rgba(18, 18, 18, 0.6)',
            border: '1px solid rgba(255,255,255,0.06)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
          }}
        >
          {/* Categories section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-1 h-4 rounded-full" style={{ background: `linear-gradient(180deg, ${T.primary}, ${T.accent})` }} />
                <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: T.text }}>{t('kas.categories')}</p>
              </div>
              <Button
                size="icon"
                className="h-8 w-8 rounded-lg transition-transform hover:scale-110"
                style={{ background: `${T.primary}12`, color: T.primary, border: `1px solid ${T.primary}20` }}
                onClick={() => setIsCategoryDialogOpen(true)}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <CategoryList
              categories={categories}
              onEdit={openEditCategoryDialog}
              onDelete={(id) => setDeleteDialog({ open: true, id, type: 'category' })}
              type="income"
              compact
              categoryAmounts={categoryAmounts}
            />
          </div>

          {/* Category Distribution */}
          {incomeByCategory.length > 0 && (
            <div>
              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-1 h-4 rounded-full" style={{ background: `linear-gradient(180deg, ${T.accent}, ${T.primary})` }} />
                <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: T.text }}>{t('kas.distribution')}</p>
              </div>
              <div className="space-y-3">
                {incomeByCategory.slice(0, 5).map((cat) => {
                  const pct = totalIncome > 0 ? (cat.amount / totalIncome) * 100 : 0;
                  return (
                    <div key={cat.name} className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-lg flex items-center justify-center text-xs shrink-0"
                        style={{ background: `${cat.color}25` }}>
                        <DynamicIcon name={cat.icon} className="h-4 w-4" />
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-medium truncate" style={{ color: T.textSub }}>{cat.name}</span>
                          <span className="text-xs font-semibold shrink-0 ml-2" style={{ color: cat.color }}>{pct.toFixed(0)}% · {formatAmount(cat.amount)}</span>
                        </div>
                        <div className="h-3 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                          <div className="h-full rounded-full transition-all duration-500"
                            style={{ width: `${Math.max(pct, 2)}%`, background: `linear-gradient(90deg, ${cat.color}, ${cat.color}CC)` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Right column: Transactions — Glass card */}
        <div
          className="rounded-2xl p-5 space-y-4"
          style={{
            background: 'rgba(18, 18, 18, 0.6)',
            border: '1px solid rgba(255,255,255,0.06)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
          }}
        >
          {/* Transactions header with filter pills */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-1 h-4 rounded-full" style={{ background: `linear-gradient(180deg, ${T.accent}, ${T.primary})` }} />
              <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: T.text }}>{t('kas.history')}</p>
            </div>
            <div className="flex gap-1.5">
              {FILTERS.map((f) => (
                <button
                  key={f.key}
                  onClick={() => { setDateFilter(f.key); setShowAllTransactions(false); }}
                  className="text-xs font-semibold px-4 py-1.5 rounded-full shrink-0 transition-all duration-200 hover:scale-105"
                  style={{
                    background: dateFilter === f.key ? T.accent : 'rgba(255,255,255,0.04)',
                    color: dateFilter === f.key ? '#000' : T.muted,
                    boxShadow: dateFilter === f.key ? `0 0 16px ${T.accent}40` : 'none',
                    border: dateFilter === f.key ? 'none' : '1px solid rgba(255,255,255,0.06)',
                  }}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          <div className="max-h-[700px] overflow-y-auto">
            <TransactionList
              transactions={displayedTransactions}
              onEdit={openEditTransactionDialog}
              onDelete={(id) => setDeleteDialog({ open: true, id, type: 'transaction' })}
              type="income"
            />
          </div>

          {transactions.length > 6 && (
            <button
              onClick={() => setShowAllTransactions(!showAllTransactions)}
              className="w-full text-center py-3 text-sm font-medium rounded-xl transition-all hover:scale-[1.01]"
              style={{ color: T.primary, background: `${T.primary}08`, border: `1px solid ${T.primary}15` }}
            >
              {showAllTransactions ? t('filter.showLess') : `${t('filter.showAll')} (${transactions.length})`}
            </button>
          )}
        </div>
      </div>

      {/* ═══ Tablet 2-column layout (md → lg / 768px–1024px) ═══ */}
      <div className="hidden md:grid lg:hidden md:grid-cols-[240px_1fr] md:gap-4">
        {/* Left column: Categories — Glass card */}
        <div
          className="rounded-2xl p-4 space-y-4"
          style={{
            background: 'rgba(18, 18, 18, 0.6)',
            border: '1px solid rgba(255,255,255,0.06)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
          }}
        >
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-1 h-3.5 rounded-full" style={{ background: `linear-gradient(180deg, ${T.primary}, ${T.accent})` }} />
                <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: T.text }}>{t('kas.categories')}</p>
              </div>
              <Button
                size="icon"
                className="h-7 w-7 rounded-lg transition-transform hover:scale-110"
                style={{ background: `${T.primary}12`, color: T.primary, border: `1px solid ${T.primary}20` }}
                onClick={() => setIsCategoryDialogOpen(true)}
              >
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </div>
            <CategoryList
              categories={categories}
              onEdit={openEditCategoryDialog}
              onDelete={(id) => setDeleteDialog({ open: true, id, type: 'category' })}
              type="income"
              compact
              categoryAmounts={categoryAmounts}
            />
          </div>

          {/* Category Distribution (compact) */}
          {incomeByCategory.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2.5">
                <div className="w-1 h-3.5 rounded-full" style={{ background: `linear-gradient(180deg, ${T.accent}, ${T.primary})` }} />
                <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: T.text }}>{t('kas.distribution')}</p>
              </div>
              <div className="space-y-2">
                {incomeByCategory.slice(0, 5).map((cat) => {
                  const pct = totalIncome > 0 ? (cat.amount / totalIncome) * 100 : 0;
                  return (
                    <div key={cat.name} className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-md flex items-center justify-center text-[10px] shrink-0"
                        style={{ background: `${cat.color}20` }}>
                        <DynamicIcon name={cat.icon} className="h-3 w-3" />
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-[10px] font-medium truncate" style={{ color: T.textSub }}>{cat.name}</span>
                          <span className="text-[10px] font-semibold shrink-0 ml-1" style={{ color: cat.color }}>{pct.toFixed(0)}%</span>
                        </div>
                        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: `${T.border}` }}>
                          <div className="h-full rounded-full transition-all duration-500"
                            style={{ width: `${Math.max(pct, 2)}%`, background: `linear-gradient(90deg, ${cat.color}, ${cat.color}99)` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Right column: Transactions — Glass card */}
        <div
          className="rounded-2xl p-4 space-y-3"
          style={{
            background: 'rgba(18, 18, 18, 0.6)',
            border: '1px solid rgba(255,255,255,0.06)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
          }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-1 h-3.5 rounded-full" style={{ background: `linear-gradient(180deg, ${T.accent}, ${T.primary})` }} />
              <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: T.text }}>{t('kas.history')}</p>
            </div>
            <div className="flex gap-1">
              {FILTERS.map((f) => (
                <button
                  key={f.key}
                  onClick={() => { setDateFilter(f.key); setShowAllTransactions(false); }}
                  className="text-[10px] font-semibold px-2.5 py-1 rounded-full shrink-0 transition-all"
                  style={{
                    background: dateFilter === f.key ? T.accent : 'rgba(255,255,255,0.04)',
                    color: dateFilter === f.key ? '#000' : T.muted,
                    border: dateFilter === f.key ? 'none' : '1px solid rgba(255,255,255,0.06)',
                  }}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          <div className="max-h-[600px] overflow-y-auto">
            <TransactionList
              transactions={displayedTransactions}
              onEdit={openEditTransactionDialog}
              onDelete={(id) => setDeleteDialog({ open: true, id, type: 'transaction' })}
              type="income"
            />
          </div>

          {transactions.length > 6 && (
            <button
              onClick={() => setShowAllTransactions(!showAllTransactions)}
              className="w-full text-center py-2.5 text-xs font-medium rounded-xl transition-all"
              style={{ color: T.primary, background: `${T.primary}08`, border: `1px solid ${T.primary}15` }}
            >
              {showAllTransactions ? t('filter.showLess') : `${t('filter.showAll')} (${transactions.length})`}
            </button>
          )}
        </div>
      </div>

      {/* ═══ Mobile stacked layout (< md / <768px) ═══ */}
      <div className="md:hidden space-y-3">
        {/* Category Distribution */}
        {incomeByCategory.length > 0 && (
          <div
            className="rounded-xl p-3 sm:p-4"
            style={{ background: T.surface, border: `1px solid ${T.border}` }}
          >
            <p className="text-[10px] font-semibold uppercase tracking-wider mb-2.5" style={{ color: T.muted }}>{t('kas.distribution')}</p>
            <div className="space-y-2">
              {incomeByCategory.slice(0, 5).map((cat) => {
                const pct = totalIncome > 0 ? (cat.amount / totalIncome) * 100 : 0;
                return (
                  <div key={cat.name} className="flex items-center gap-2.5">
                    <span className="w-5 h-5 rounded-md flex items-center justify-center text-[10px] shrink-0"
                      style={{ background: `${cat.color}20` }}>
                      <DynamicIcon name={cat.icon} className="h-3.5 w-3.5" />
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-[11px] font-medium truncate" style={{ color: T.textSub }}>{cat.name}</span>
                        <span className="text-[10px] font-semibold shrink-0 ml-2" style={{ color: cat.color }}>{pct.toFixed(0)}%</span>
                      </div>
                      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: `${T.border}` }}>
                        <div className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${Math.max(pct, 2)}%`, background: `linear-gradient(90deg, ${cat.color}, ${cat.color}99)` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Categories */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: T.muted }}>{t('kas.categories')}</p>
            <Button
              size="icon"
              className="h-7 w-7 rounded-lg"
              style={{ background: `${T.primary}12`, color: T.primary, border: `1px solid ${T.primary}20` }}
              onClick={() => setIsCategoryDialogOpen(true)}
            >
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </div>
          <CategoryList
            categories={categories}
            onEdit={openEditCategoryDialog}
            onDelete={(id) => setDeleteDialog({ open: true, id, type: 'category' })}
            type="income"
            compact
            categoryAmounts={categoryAmounts}
          />
        </div>

        {/* Transactions */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: T.muted }}>{t('kas.history')}</p>
            <div className="flex gap-1 overflow-x-auto scrollbar-hide">
              {FILTERS.map((f) => (
                <button
                  key={f.key}
                  onClick={() => { setDateFilter(f.key); setShowAllTransactions(false); }}
                  className="text-[10px] font-semibold px-2.5 py-1 rounded-lg shrink-0 transition-all"
                  style={{
                    background: dateFilter === f.key ? T.accent : 'transparent',
                    color: dateFilter === f.key ? '#000' : T.muted,
                  }}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          <TransactionList
            transactions={displayedTransactions}
            onEdit={openEditTransactionDialog}
            onDelete={(id) => setDeleteDialog({ open: true, id, type: 'transaction' })}
            type="income"
          />

          {transactions.length > 6 && (
            <button
              onClick={() => setShowAllTransactions(!showAllTransactions)}
              className="w-full text-center py-2.5 text-[11px] font-medium rounded-xl transition-colors"
              style={{ color: T.primary, background: `${T.primary}08`, border: `1px solid ${T.primary}15` }}
            >
              {showAllTransactions ? t('filter.showLess') : `${t('filter.showAll')} (${transactions.length})`}
            </button>
          )}
        </div>
      </div>

      {/* ── Dialogs ── */}
      <TransactionForm
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        type="income"
        categories={categories}
        savingsTargets={savingsTargets}
        onSubmit={handleAddTransaction}
      />
      <TransactionForm
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        type="income"
        categories={categories}
        savingsTargets={savingsTargets}
        initialData={selectedTransaction}
        onSubmit={handleEditTransaction}
      />
      <CategoryDialog
        open={isCategoryDialogOpen}
        onOpenChange={setIsCategoryDialogOpen}
        type="income"
        initialData={selectedCategory}
        onSubmit={selectedCategory ? handleEditCategory : handleAddCategory}
      />
      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ ...deleteDialog, open })}>
        <AlertDialogContent className="bg-[#0D0D0D] border-white/[0.06]">
          <AlertDialogHeader>
            <AlertDialogTitle style={{ color: T.text }}>
              {deleteDialog.type === 'transaction' ? t('kas.deleteIncome') : t('kas.deleteCategory')}
            </AlertDialogTitle>
            <AlertDialogDescription style={{ color: T.textSub }}>
              {deleteDialog.type === 'transaction'
                ? t('kas.deleteIncomeDesc')
                : t('kas.deleteCategoryDesc')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-white/[0.06] text-white/70 hover:bg-white/[0.1] hover:text-white border-0">{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="border-0"
              style={{ background: '#CF6679', color: '#fff' }}
            >
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
