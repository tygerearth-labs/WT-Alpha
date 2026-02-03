'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Plus, BarChart3, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { TransactionForm } from '@/components/transaction/TransactionForm';
import { CategoryDialog } from '@/components/transaction/CategoryDialog';
import { TransactionList } from '@/components/transaction/TransactionList';
import { CategoryList } from '@/components/transaction/CategoryList';
import { SummaryCard } from '@/components/shared/SummaryCard';
import { PieChartCard } from '@/components/shared/PieChartCard';
import { Transaction, Category, TransactionFormData, CategoryFormData, SavingsTarget } from '@/types/transaction.types';

type DateFilter = 'today' | 'week' | 'month' | 'all';

export function KasMasuk() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [savingsTargets, setSavingsTargets] = useState<SavingsTarget[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; id: string; type: 'transaction' | 'category' }>({ open: false, id: '', type: 'transaction' });
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [showAllTransactions, setShowAllTransactions] = useState(false);

  useEffect(() => {
    fetchData();
  }, [dateFilter]);

  const fetchData = async () => {
    try {
      // Build query parameters based on date filter
      const searchParams = new URLSearchParams();
      searchParams.append('type', 'income');

      if (dateFilter === 'today') {
        const today = new Date();
        searchParams.append('year', today.getFullYear().toString());
        searchParams.append('month', (today.getMonth() + 1).toString());
      } else if (dateFilter === 'month') {
        const today = new Date();
        searchParams.append('year', today.getFullYear().toString());
        searchParams.append('month', (today.getMonth() + 1).toString());
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

        // Apply client-side filtering for today and week
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
          startOfWeek.setDate(today.getDate() - today.getDay());

          filteredTransactions = filteredTransactions.filter(t => {
            const transDate = new Date(t.date);
            return transDate >= startOfWeek && transDate <= today;
          });
        }

        setAllTransactions(filteredTransactions);
        setTransactions(filteredTransactions);
        setCategories(catData.categories);
        setSavingsTargets(savingsData.savingsTargets);
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
        toast.success('Pemasukan berhasil ditambahkan');
        setIsAddDialogOpen(false);
        fetchData();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Gagal menambahkan pemasukan');
      }
    } catch (error) {
      console.error('Error:', error);
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
        toast.success('Pemasukan berhasil diperbarui');
        setIsEditDialogOpen(false);
        setSelectedTransaction(null);
        fetchData();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Gagal memperbarui pemasukan');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Terjadi kesalahan');
    }
  };

  const handleDelete = async () => {
    try {
      let response;
      let successMessage;

      if (deleteDialog.type === 'transaction') {
        response = await fetch(`/api/transactions/${deleteDialog.id}`, { method: 'DELETE' });
        successMessage = 'Pemasukan berhasil dihapus';
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
    } catch (error) {
      console.error('Error:', error);
      toast.error('Terjadi kesalahan');
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
        toast.success('Kategori berhasil ditambahkan');
        setIsCategoryDialogOpen(false);
        fetchData();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Gagal menambahkan kategori');
      }
    } catch (error) {
      console.error('Error:', error);
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
    } catch (error) {
      console.error('Error:', error);
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

  // Calculate totals and chart data
  const totalIncome = transactions.reduce((sum, t) => sum + t.amount, 0);

  const incomeByCategory = categories
    .map(cat => {
      const categoryTransactions = transactions.filter(t => t.categoryId === cat.id);
      const total = categoryTransactions.reduce((sum, t) => sum + t.amount, 0);
      return {
        name: cat.name,
        amount: total,
        color: cat.color,
        icon: cat.icon,
        count: categoryTransactions.length,
      };
    })
    .filter(item => item.amount > 0);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Card & Distribution Chart - 2 Column Grid */}
      <div className="grid gap-4 md:grid-cols-2">
        <SummaryCard
          title="Total Uang Masuk"
          amount={totalIncome}
          icon={BarChart3}
          iconColor="text-green-500"
          bgColor="bg-gradient-to-br from-green-500/20 to-emerald-500/10"
          subtitle={`${transactions.length} transaksi`}
          action={
            <Button
              size="icon"
              onClick={() => setIsAddDialogOpen(true)}
            >
              <Plus className="h-5 w-5" />
            </Button>
          }
        />
        <PieChartCard
          title="Distribusi Pemasukan"
          data={incomeByCategory}
        />
      </div>

      {/* Categories */}
      <div className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Kategori</h3>
          <Button
            size="icon"
            onClick={() => setIsCategoryDialogOpen(true)}
          >
            <Plus className="h-5 w-5" />
          </Button>
        </div>
        <CategoryList
          categories={categories}
          onEdit={openEditCategoryDialog}
          onDelete={(id) => setDeleteDialog({ open: true, id, type: 'category' })}
          type="income"
        />
      </div>

      {/* Transactions - With Date Filter */}
      <Card className="bg-card/50 backdrop-blur-sm border-border/50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Riwayat Transaksi</CardTitle>
            <div className="flex gap-1">
              <Button
                variant={dateFilter === 'today' ? 'default' : 'outline'}
                size="sm"
                onClick={() => { setDateFilter('today'); setShowAllTransactions(false); }}
              >
                Hari Ini
              </Button>
              <Button
                variant={dateFilter === 'week' ? 'default' : 'outline'}
                size="sm"
                onClick={() => { setDateFilter('week'); setShowAllTransactions(false); }}
              >
                Minggu Ini
              </Button>
              <Button
                variant={dateFilter === 'month' ? 'default' : 'outline'}
                size="sm"
                onClick={() => { setDateFilter('month'); setShowAllTransactions(false); }}
              >
                Bulan Ini
              </Button>
              <Button
                variant={dateFilter === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => { setDateFilter('all'); setShowAllTransactions(false); }}
              >
                Semua
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <TransactionList
            transactions={showAllTransactions ? transactions : transactions.slice(0, 6)}
            onEdit={openEditTransactionDialog}
            onDelete={(id) => setDeleteDialog({ open: true, id, type: 'transaction' })}
            type="income"
          />
          {transactions.length > 6 && (
            <div className="mt-4 pt-4 border-t border-border/50">
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setShowAllTransactions(!showAllTransactions)}
              >
                {showAllTransactions ? 'Tampilkan Lebih Sedikit' : 'Lihat Lainnya'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Transaction Dialog */}
      <TransactionForm
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        type="income"
        categories={categories}
        savingsTargets={savingsTargets}
        onSubmit={handleAddTransaction}
      />

      {/* Edit Transaction Dialog */}
      <TransactionForm
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        type="income"
        categories={categories}
        savingsTargets={savingsTargets}
        initialData={selectedTransaction}
        onSubmit={handleEditTransaction}
      />

      {/* Add/Edit Category Dialog */}
      <CategoryDialog
        open={isCategoryDialogOpen}
        onOpenChange={setIsCategoryDialogOpen}
        type="income"
        initialData={selectedCategory}
        onSubmit={selectedCategory ? handleEditCategory : handleAddCategory}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ ...deleteDialog, open })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {deleteDialog.type === 'transaction' ? 'Hapus Pemasukan?' : 'Hapus Kategori?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteDialog.type === 'transaction'
                ? 'Pemasukan yang dihapus tidak dapat dikembalikan.'
                : 'Kategori yang dihapus tidak dapat dikembalikan.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
