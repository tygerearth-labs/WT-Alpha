'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Plus, PlusCircle, BarChart3, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { TransactionForm } from '@/components/transaction/TransactionForm';
import { CategoryDialog } from '@/components/transaction/CategoryDialog';
import { TransactionList } from '@/components/transaction/TransactionList';
import { CategoryList } from '@/components/transaction/CategoryList';
import { SummaryCard } from '@/components/shared/SummaryCard';
import { PieChartCard } from '@/components/shared/PieChartCard';
import { Transaction, Category, TransactionFormData, CategoryFormData } from '@/types/transaction.types';

export function KasMasuk() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; id: string; type: 'transaction' | 'category' }>({ open: false, id: '', type: 'transaction' });
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [transRes, catRes] = await Promise.all([
        fetch('/api/transactions?type=income'),
        fetch('/api/categories?type=income'),
      ]);

      if (transRes.ok && catRes.ok) {
        const transData = await transRes.json();
        const catData = await catRes.json();
        setTransactions(transData.transactions);
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
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Kas Masuk</h2>
          <p className="text-muted-foreground mt-1">Kelola semua pemasukan Anda</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setIsCategoryDialogOpen(true)}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Tambah Kategori
          </Button>
          <Button onClick={() => setIsAddDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Tambah Pemasukan
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        <SummaryCard
          title="Total Uang Masuk"
          amount={totalIncome}
          icon={BarChart3}
          iconColor="text-green-500"
          bgColor="bg-gradient-to-br from-green-500/20 to-emerald-500/10"
          subtitle={`${transactions.length} transaksi`}
        />
        <PieChartCard
          title="Distribusi Pemasukan"
          data={incomeByCategory}
        />
      </div>

      {/* Categories */}
      <CardWrapper title="Kategori">
        <CategoryList
          categories={categories}
          onEdit={openEditCategoryDialog}
          onDelete={(id) => setDeleteDialog({ open: true, id, type: 'category' })}
          type="income"
        />
      </CardWrapper>

      {/* Transactions */}
      <CardWrapper title="Riwayat Transaksi">
        <TransactionList
          transactions={transactions}
          onEdit={openEditTransactionDialog}
          onDelete={(id) => setDeleteDialog({ open: true, id, type: 'transaction' })}
          type="income"
        />
      </CardWrapper>

      {/* Add Transaction Dialog */}
      <TransactionForm
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        type="income"
        categories={categories}
        onSubmit={handleAddTransaction}
      />

      {/* Edit Transaction Dialog */}
      <TransactionForm
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        type="income"
        categories={categories}
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

// Helper component for wrapping content in a card
function CardWrapper({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-lg p-6">
      <h3 className="text-lg font-semibold mb-4">{title}</h3>
      {children}
    </div>
  );
}
