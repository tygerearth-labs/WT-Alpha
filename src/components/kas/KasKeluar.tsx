'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Plus, Pencil, Trash2, Loader2, PlusCircle, BarChart3 } from 'lucide-react';
import { getCurrencyFormat } from '@/lib/utils';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface Transaction {
  id: string;
  type: string;
  amount: number;
  description: string | null;
  date: string;
  category: {
    id: string;
    name: string;
    color: string;
    icon: string;
  };
}

interface Category {
  id: string;
  name: string;
  type: string;
  color: string;
  icon: string;
  _count?: {
    transactions: number;
  };
}

export function KasKeluar() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [isCategoryEditDialogOpen, setIsCategoryEditDialogOpen] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; id: string; type: 'transaction' | 'category' }>({ open: false, id: '', type: 'transaction' });
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);

  const [formData, setFormData] = useState({
    amount: '',
    description: '',
    categoryId: '',
    date: new Date().toISOString().split('T')[0],
  });

  const [categoryForm, setCategoryForm] = useState({
    name: '',
    color: '#ef4444',
    icon: '🛒',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [transRes, catRes] = await Promise.all([
        fetch('/api/transactions?type=expense'),
        fetch('/api/categories?type=expense'),
      ]);

      if (transRes.ok && catRes.ok) {
        const transData = await transRes.json();
        const catData = await catRes.json();
        setTransactions(transData.transactions);
        setCategories(catData.categories);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'expense',
          amount: parseFloat(formData.amount),
          description: formData.description,
          categoryId: formData.categoryId,
          date: formData.date,
        }),
      });

      if (response.ok) {
        toast.success('Pengeluaran berhasil ditambahkan');
        setFormData({ amount: '', description: '', categoryId: '', date: new Date().toISOString().split('T')[0] });
        setIsDialogOpen(false);
        fetchData();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Gagal menambahkan pengeluaran');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Terjadi kesalahan');
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTransaction) return;

    try {
      const response = await fetch(`/api/transactions/${selectedTransaction.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'expense',
          amount: parseFloat(formData.amount),
          description: formData.description,
          categoryId: formData.categoryId,
          date: formData.date,
        }),
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
    } catch (error) {
      console.error('Error:', error);
      toast.error('Terjadi kesalahan');
    }
  };

  const handleDelete = async () => {
    try {
      if (deleteDialog.type === 'transaction') {
        const response = await fetch(`/api/transactions/${deleteDialog.id}`, {
          method: 'DELETE',
        });

        if (response.ok) {
          toast.success('Pengeluaran berhasil dihapus');
          setDeleteDialog({ open: false, id: '', type: 'transaction' });
          fetchData();
        } else {
          toast.error('Gagal menghapus pengeluaran');
        }
      } else if (deleteDialog.type === 'category') {
        const response = await fetch(`/api/categories/${deleteDialog.id}`, {
          method: 'DELETE',
        });

        if (response.ok) {
          toast.success('Kategori berhasil dihapus');
          setDeleteDialog({ open: false, id: '', type: 'transaction' });
          fetchData();
        } else {
          const error = await response.json();
          toast.error(error.error || 'Gagal menghapus kategori');
        }
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Terjadi kesalahan');
    }
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...categoryForm,
          type: 'expense',
        }),
      });

      if (response.ok) {
        toast.success('Kategori berhasil ditambahkan');
        setCategoryForm({ name: '', color: '#ef4444', icon: '🛒' });
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

  const handleEditCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCategory) return;

    try {
      const response = await fetch(`/api/categories/${selectedCategory.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: categoryForm.name,
          color: categoryForm.color,
          icon: categoryForm.icon,
        }),
      });

      if (response.ok) {
        toast.success('Kategori berhasil diperbarui');
        setCategoryForm({ name: '', color: '#ef4444', icon: '🛒' });
        setIsCategoryEditDialogOpen(false);
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

  const openEditDialog = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setFormData({
      amount: transaction.amount.toString(),
      description: transaction.description || '',
      categoryId: transaction.categoryId,
      date: transaction.date.split('T')[0],
    });
    setIsEditDialogOpen(true);
  };

  const openEditCategoryDialog = (category: Category) => {
    setSelectedCategory(category);
    setCategoryForm({
      name: category.name,
      color: category.color,
      icon: category.icon,
    });
    setIsCategoryEditDialogOpen(true);
  };

  // Calculate total expense
  const totalExpense = transactions.reduce((sum, t) => sum + t.amount, 0);

  // Calculate expense by category
  const expenseByCategory = categories.map(cat => {
    const categoryTransactions = transactions.filter(t => t.categoryId === cat.id);
    const total = categoryTransactions.reduce((sum, t) => sum + t.amount, 0);
    return {
      name: cat.name,
      amount: total,
      color: cat.color,
      icon: cat.icon,
      count: categoryTransactions.length,
    };
  }).filter(item => item.amount > 0);

  // Calculate transaction count per category
  const categoriesWithCount = categories.map(cat => ({
    ...cat,
    transactionCount: transactions.filter(t => t.categoryId === cat.id).length,
  }));

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
          <h2 className="text-3xl font-bold">Kas Keluar</h2>
          <p className="text-muted-foreground mt-1">Kelola semua pengeluaran Anda</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={isCategoryDialogOpen} onOpenChange={setIsCategoryDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <PlusCircle className="mr-2 h-4 w-4" />
                Tambah Kategori
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Tambah Kategori Pengeluaran</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleAddCategory} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="catName">Nama Kategori</Label>
                  <Input
                    id="catName"
                    value={categoryForm.name}
                    onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                    placeholder="Contoh: Makanan"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="catColor">Warna</Label>
                  <Input
                    id="catColor"
                    type="color"
                    value={categoryForm.color}
                    onChange={(e) => setCategoryForm({ ...categoryForm, color: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="catIcon">Icon (Emoji)</Label>
                  <Input
                    id="catIcon"
                    value={categoryForm.icon}
                    onChange={(e) => setCategoryForm({ ...categoryForm, icon: e.target.value })}
                    placeholder="🛒"
                    maxLength={2}
                    required
                  />
                </div>
                <DialogFooter>
                  <Button type="submit">Simpan</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Tambah Pengeluaran
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Tambah Pengeluaran Baru</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="amount">Nominal</Label>
                  <Input
                    id="amount"
                    type="number"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    placeholder="0"
                    required
                    min="0"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">Kategori</Label>
                  <Select value={formData.categoryId} onValueChange={(value) => setFormData({ ...formData, categoryId: value })}>
                    <SelectTrigger id="category">
                      <SelectValue placeholder="Pilih kategori" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.icon} {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="date">Tanggal</Label>
                  <Input
                    id="date"
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Deskripsi</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Tambahkan catatan..."
                    rows={3}
                  />
                </div>
                <DialogFooter>
                  <Button type="submit">Simpan</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Total Expense Card */}
        <Card className="bg-gradient-to-br from-red-500/20 to-orange-500/10 backdrop-blur-sm border-red-500/30">
          <CardHeader>
            <CardTitle className="text-red-500 flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Total Uang Keluar
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-red-500">
              {getCurrencyFormat(totalExpense)}
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              {transactions.length} transaksi
            </p>
          </CardContent>
        </Card>

        {/* Chart Card */}
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardHeader>
            <CardTitle>Pengeluaran per Kategori</CardTitle>
          </CardHeader>
          <CardContent>
            {expenseByCategory.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={expenseByCategory}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis dataKey="name" stroke="#888" fontSize={12} tick={{ fill: '#888' }} />
                  <YAxis stroke="#888" fontSize={12} tick={{ fill: '#888' }} />
                  <Tooltip
                    formatter={(value: number) => getCurrencyFormat(value)}
                    contentStyle={{ backgroundColor: '#1e1e1e', border: '1px solid #333' }}
                  />
                  <Bar dataKey="amount" radius={[8, 8, 0, 0]}>
                    {expenseByCategory.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                Belum ada data
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Categories List */}
      <Card className="bg-card/50 backdrop-blur-sm border-border/50">
        <CardHeader>
          <CardTitle>Daftar Kategori</CardTitle>
        </CardHeader>
        <CardContent>
          {categories.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Belum ada kategori
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {categoriesWithCount.map((category) => (
                <div
                  key={category.id}
                  className="flex items-center justify-between p-4 bg-background/50 rounded-lg hover:bg-background/80 transition-colors group"
                >
                  <div className="flex items-center gap-3 flex-1">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-xl"
                      style={{ backgroundColor: category.color + '20' }}
                    >
                      {category.icon}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{category.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {category.transactionCount} transaksi
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => openEditCategoryDialog(category)}
                    >
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setDeleteDialog({ open: true, id: category.id, type: 'category' })}
                    >
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Transactions List */}
      <Card className="bg-card/50 backdrop-blur-sm border-border/50">
        <CardHeader>
          <CardTitle>Riwayat Pengeluaran</CardTitle>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Belum ada data pengeluaran
            </div>
          ) : (
            <div className="space-y-3">
              {transactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="flex items-center justify-between p-4 bg-background/50 rounded-lg hover:bg-background/80 transition-colors"
                >
                  <div className="flex items-center gap-4 flex-1">
                    <div
                      className="w-12 h-12 rounded-full flex items-center justify-center text-2xl"
                      style={{ backgroundColor: transaction.category.color + '20' }}
                    >
                      {transaction.category.icon}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{transaction.description || transaction.category.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {transaction.category.name} • {format(new Date(transaction.date), 'dd MMMM yyyy', { locale: id })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <p className="text-lg font-bold text-red-500">
                      -{getCurrencyFormat(transaction.amount)}
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditDialog(transaction)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteDialog({ open: true, id: transaction.id, type: 'transaction' })}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Transaction Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Pengeluaran</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEdit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="editAmount">Nominal</Label>
              <Input
                id="editAmount"
                type="number"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                required
                min="0"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editCategory">Kategori</Label>
              <Select value={formData.categoryId} onValueChange={(value) => setFormData({ ...formData, categoryId: value })}>
                <SelectTrigger id="editCategory">
                  <SelectValue placeholder="Pilih kategori" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.icon} {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="editDate">Tanggal</Label>
              <Input
                id="editDate"
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editDescription">Deskripsi</Label>
              <Textarea
                id="editDescription"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
              />
            </div>
            <DialogFooter>
              <Button type="submit">Update</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Category Dialog */}
      <Dialog open={isCategoryEditDialogOpen} onOpenChange={setIsCategoryEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Kategori</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditCategory} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="editCatName">Nama Kategori</Label>
              <Input
                id="editCatName"
                value={categoryForm.name}
                onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editCatColor">Warna</Label>
              <Input
                id="editCatColor"
                type="color"
                value={categoryForm.color}
                onChange={(e) => setCategoryForm({ ...categoryForm, color: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editCatIcon">Icon (Emoji)</Label>
              <Input
                id="editCatIcon"
                value={categoryForm.icon}
                onChange={(e) => setCategoryForm({ ...categoryForm, icon: e.target.value })}
                maxLength={2}
                required
              />
            </div>
            <DialogFooter>
              <Button type="submit">Update</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ open, id: '', type: 'transaction' })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {deleteDialog.type === 'category' ? 'Hapus Kategori?' : 'Hapus Pengeluaran?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteDialog.type === 'category'
                ? 'Tindakan ini tidak dapat dibatalkan. Kategori akan dihapus secara permanen.'
                : 'Tindakan ini tidak dapat dibatalkan. Pengeluaran akan dihapus secara permanen.'
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
