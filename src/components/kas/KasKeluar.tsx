'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Plus, TrendingDown, Calendar, ArrowDownRight, Loader2, CreditCard } from 'lucide-react';
import { toast } from 'sonner';
import { TransactionForm } from '@/components/transaction/TransactionForm';
import { CategoryDialog } from '@/components/transaction/CategoryDialog';
import { TransactionList } from '@/components/transaction/TransactionList';
import { CategoryList } from '@/components/transaction/CategoryList';
import { Transaction, Category, TransactionFormData, CategoryFormData } from '@/types/transaction.types';
import { getCurrencyFormat } from '@/lib/utils';

type DateFilter = 'today' | 'week' | 'month' | 'all';

const T = {
  surface: '#121212',
  accent: '#CF6679',
  primary: '#BB86FC',
  muted: '#9E9E9E',
  border: 'rgba(255,255,255,0.06)',
  text: '#E6E1E5',
  textSub: '#B3B3B3',
} as const;

const FILTERS: { key: DateFilter; label: string }[] = [
  { key: 'today', label: 'Hari' },
  { key: 'week', label: 'Minggu' },
  { key: 'month', label: 'Bulan Ini' },
  { key: 'all', label: 'Semua' },
];

export function KasKeluar() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; id: string; type: 'transaction' | 'category' }>({ open: false, id: '', type: 'transaction' });
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [dateFilter, setDateFilter] = useState<DateFilter>('month');
  const [showAllTransactions, setShowAllTransactions] = useState(false);

  useEffect(() => {
    fetchData();
  }, [dateFilter]);

  const fetchData = async () => {
    try {
      const searchParams = new URLSearchParams();
      searchParams.append('type', 'expense');

      // Always send year/month to limit API query scope
      const today = new Date();
      searchParams.append('year', today.getFullYear().toString());
      searchParams.append('month', (today.getMonth() + 1).toString());

      const [transRes, catRes] = await Promise.all([
        fetch(`/api/transactions?${searchParams.toString()}`),
        fetch('/api/categories?type=expense'),
      ]);

      if (transRes.ok && catRes.ok) {
        const transData = await transRes.json();
        const catData = await catRes.json();

        let filteredTransactions = transData.transactions;

        if (dateFilter === 'today') {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const tomorrow = new Date(today);
          tomorrow.setDate(tomorrow.getDate() + 1);
          filteredTransactions = filteredTransactions.filter(t => {
            const transDate = new Date(t.date);
            return transDate >= today && transDate < tomorrow;
          });
        } else if (dateFilter === 'week') {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const startOfWeek = new Date(today);
          const dayOfWeek = today.getDay();
          const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Monday start (Indonesian locale)
          startOfWeek.setDate(today.getDate() - diff);
          filteredTransactions = filteredTransactions.filter(t => {
            const transDate = new Date(t.date);
            return transDate >= startOfWeek && transDate <= today;
          });
        }

        setTransactions(filteredTransactions);
        setCategories(catData.categories);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Gagal memuat data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddTransaction = async (data: TransactionFormData) => {
    try {
      const response = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (response.ok) {
        toast.success('Pengeluaran berhasil ditambahkan');
        setIsAddDialogOpen(false);
        fetchData();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Gagal menambahkan pengeluaran');
      }
    } catch {
      toast.error('Terjadi kesalahan');
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
        toast.success('Pengeluaran berhasil diperbarui');
        setIsEditDialogOpen(false);
        setSelectedTransaction(null);
        fetchData();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Gagal memperbarui pengeluaran');
      }
    } catch {
      toast.error('Terjadi kesalahan');
    }
  };

  const handleDelete = async () => {
    try {
      let response;
      let successMessage;
      if (deleteDialog.type === 'transaction') {
        response = await fetch(`/api/transactions/${deleteDialog.id}`, { method: 'DELETE' });
        successMessage = 'Pengeluaran berhasil dihapus';
      } else {
        response = await fetch(`/api/categories/${deleteDialog.id}`, { method: 'DELETE' });
        successMessage = 'Kategori berhasil dihapus';
      }
      if (response.ok) {
        toast.success(successMessage);
        setDeleteDialog({ open: false, id: '', type: 'transaction' });
        fetchData();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Gagal menghapus');
      }
    } catch {
      toast.error('Terjadi kesalahan');
    }
  };

  const handleAddCategory = async (data: CategoryFormData) => {
    try {
      const response = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, type: 'expense' }),
      });
      if (response.ok) {
        toast.success('Kategori berhasil ditambahkan');
        setIsCategoryDialogOpen(false);
        fetchData();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Gagal menambahkan kategori');
      }
    } catch {
      toast.error('Terjadi kesalahan');
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
        toast.success('Kategori berhasil diperbarui');
        setSelectedCategory(null);
        fetchData();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Gagal memperbarui kategori');
      }
    } catch {
      toast.error('Terjadi kesalahan');
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

  const totalExpense = transactions.reduce((sum, t) => sum + t.amount, 0);
  const avgExpense = transactions.length > 0 ? totalExpense / transactions.length : 0;
  const maxExpense = transactions.length > 0 ? Math.max(...transactions.map(t => t.amount)) : 0;

  const expenseByCategory = categories
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
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: T.primary }} />
      </div>
    );
  }

  const displayedTransactions = showAllTransactions ? transactions : transactions.slice(0, 6);

  return (
    <div className="w-full max-w-full space-y-3 sm:space-y-4">
      {/* ── Hero Strip ── */}
      <div
        className="rounded-2xl p-4 sm:p-5 lg:p-6 overflow-hidden relative"
        style={{ background: `linear-gradient(135deg, ${T.accent}18 0%, ${T.accent}05 100%)`, border: `1px solid ${T.accent}25` }}
      >
        <div className="absolute top-0 right-0 w-32 h-32 lg:w-48 lg:h-48 rounded-full opacity-[0.07] blur-2xl"
          style={{ background: T.accent, transform: 'translate(30%, -30%)' }}
        />
        <div className="flex items-center justify-between relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 lg:w-12 lg:h-12 rounded-xl flex items-center justify-center" style={{ background: `${T.accent}20` }}>
              <CreditCard className="h-5 w-5 lg:h-6 lg:w-6" style={{ color: T.accent }} />
            </div>
            <div>
              <p className="text-[10px] lg:text-xs font-medium uppercase tracking-wider" style={{ color: T.muted }}>Total Pengeluaran</p>
              <p className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight" style={{ color: T.text }}>
                {getCurrencyFormat(totalExpense)}
              </p>
            </div>
          </div>
          <Button
            onClick={() => setIsAddDialogOpen(true)}
            className="h-10 w-10 lg:h-11 lg:w-11 rounded-xl shrink-0"
            style={{ background: T.accent, color: '#000' }}
          >
            <Plus className="h-5 w-5" />
          </Button>
        </div>
        <div className="mt-3 flex items-center gap-1.5 text-[11px] lg:text-xs" style={{ color: T.textSub }}>
          <Calendar className="h-3 w-3" />
          <span>{transactions.length} transaksi</span>
        </div>
      </div>

      {/* ── Quick Stats ── */}
      <div className="grid grid-cols-3 gap-2 lg:gap-4">
        {[
          { label: 'Rata-rata', value: getCurrencyFormat(avgExpense), color: T.accent, icon: TrendingDown },
          { label: 'Transaksi', value: transactions.length.toString(), color: T.primary, icon: ArrowDownRight },
          { label: 'Terbesar', value: getCurrencyFormat(maxExpense), color: T.primary, icon: CreditCard },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl p-3 lg:p-4 text-center transition-colors"
            style={{ background: T.surface, border: `1px solid ${T.border}` }}
          >
            <stat.icon className="h-3.5 w-3.5 mx-auto mb-1.5" style={{ color: stat.color, opacity: 0.7 }} />
            <p className="text-[10px] font-medium uppercase tracking-wider mb-0.5" style={{ color: T.muted }}>{stat.label}</p>
            <p className="text-xs sm:text-sm lg:text-base font-bold truncate" style={{ color: stat.color }}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* ═══ Desktop 2-column layout ═══ */}
      <div className="hidden lg:grid lg:grid-cols-[320px_1fr] lg:gap-4 xl:grid-cols-[380px_1fr] xl:gap-5">
        {/* Left column: Categories + Distribution */}
        <div className="space-y-4">
          {/* Categories */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: T.muted }}>Kategori</p>
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
              type="expense"
              compact
              categoryAmounts={categoryAmounts}
            />
          </div>

          {/* Category Distribution */}
          {expenseByCategory.length > 0 && (
            <div
              className="rounded-xl p-4"
              style={{ background: T.surface, border: `1px solid ${T.border}` }}
            >
              <p className="text-[10px] font-semibold uppercase tracking-wider mb-3" style={{ color: T.muted }}>Distribusi Kategori</p>
              <div className="space-y-2.5">
                {expenseByCategory.slice(0, 5).map((cat) => {
                  const pct = totalExpense > 0 ? (cat.amount / totalExpense) * 100 : 0;
                  return (
                    <div key={cat.name} className="flex items-center gap-2.5">
                      <span className="w-5 h-5 rounded-md flex items-center justify-center text-[10px] shrink-0"
                        style={{ background: `${cat.color}20` }}>
                        {cat.icon}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-[11px] font-medium truncate" style={{ color: T.textSub }}>{cat.name}</span>
                          <span className="text-[10px] font-semibold shrink-0 ml-2" style={{ color: cat.color }}>{pct.toFixed(0)}%</span>
                        </div>
                        <div className="h-2 rounded-full overflow-hidden" style={{ background: `${T.border}` }}>
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

        {/* Right column: Transactions */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: T.muted }}>Riwayat</p>
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

          <div className="max-h-[600px] overflow-y-auto">
            <TransactionList
              transactions={displayedTransactions}
              onEdit={openEditTransactionDialog}
              onDelete={(id) => setDeleteDialog({ open: true, id, type: 'transaction' })}
              type="expense"
            />
          </div>

          {transactions.length > 6 && (
            <button
              onClick={() => setShowAllTransactions(!showAllTransactions)}
              className="w-full text-center py-2.5 text-[11px] font-medium rounded-xl transition-colors"
              style={{ color: T.primary, background: `${T.primary}08`, border: `1px solid ${T.primary}15` }}
            >
              {showAllTransactions ? 'Tampilkan Lebih Sedikit' : `Lihat Semua (${transactions.length})`}
            </button>
          )}
        </div>
      </div>

      {/* ═══ Mobile stacked layout ═══ */}
      <div className="lg:hidden space-y-3">
        {/* Category Distribution */}
        {expenseByCategory.length > 0 && (
          <div
            className="rounded-xl p-3 sm:p-4"
            style={{ background: T.surface, border: `1px solid ${T.border}` }}
          >
            <p className="text-[10px] font-semibold uppercase tracking-wider mb-2.5" style={{ color: T.muted }}>Distribusi Kategori</p>
            <div className="space-y-2">
              {expenseByCategory.slice(0, 5).map((cat) => {
                const pct = totalExpense > 0 ? (cat.amount / totalExpense) * 100 : 0;
                return (
                  <div key={cat.name} className="flex items-center gap-2.5">
                    <span className="w-5 h-5 rounded-md flex items-center justify-center text-[10px] shrink-0"
                      style={{ background: `${cat.color}20` }}>
                      {cat.icon}
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
            <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: T.muted }}>Kategori</p>
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
            type="expense"
            compact
            categoryAmounts={categoryAmounts}
          />
        </div>

        {/* Transactions */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: T.muted }}>Riwayat</p>
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
            type="expense"
          />

          {transactions.length > 6 && (
            <button
              onClick={() => setShowAllTransactions(!showAllTransactions)}
              className="w-full text-center py-2.5 text-[11px] font-medium rounded-xl transition-colors"
              style={{ color: T.primary, background: `${T.primary}08`, border: `1px solid ${T.primary}15` }}
            >
              {showAllTransactions ? 'Tampilkan Lebih Sedikit' : `Lihat Semua (${transactions.length})`}
            </button>
          )}
        </div>
      </div>

      {/* ── Dialogs ── */}
      <TransactionForm
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        type="expense"
        categories={categories}
        onSubmit={handleAddTransaction}
      />
      <TransactionForm
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        type="expense"
        categories={categories}
        initialData={selectedTransaction}
        onSubmit={handleEditTransaction}
      />
      <CategoryDialog
        open={isCategoryDialogOpen}
        onOpenChange={setIsCategoryDialogOpen}
        type="expense"
        initialData={selectedCategory}
        onSubmit={selectedCategory ? handleEditCategory : handleAddCategory}
      />
      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ ...deleteDialog, open })}>
        <AlertDialogContent className="bg-[#0D0D0D] border-white/[0.06]">
          <AlertDialogHeader>
            <AlertDialogTitle style={{ color: T.text }}>
              {deleteDialog.type === 'transaction' ? 'Hapus Pengeluaran?' : 'Hapus Kategori?'}
            </AlertDialogTitle>
            <AlertDialogDescription style={{ color: T.textSub }}>
              {deleteDialog.type === 'transaction'
                ? 'Pengeluaran yang dihapus tidak dapat dikembalikan.'
                : 'Kategori yang dihapus tidak dapat dikembalikan.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-white/[0.06] text-white/70 hover:bg-white/[0.1] hover:text-white border-0">Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="border-0"
              style={{ background: '#CF6679', color: '#fff' }}
            >
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
