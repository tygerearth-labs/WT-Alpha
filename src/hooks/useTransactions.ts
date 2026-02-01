import { useState, useEffect } from 'react';
import { Transaction, Category, TransactionFormData, CategoryFormData } from '@/types/transaction.types';
import { toast } from 'sonner';

export function useTransactions(type: 'income' | 'expense') {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = async () => {
    try {
      const [transRes, catRes] = await Promise.all([
        fetch(`/api/transactions?type=${type}`),
        fetch(`/api/categories?type=${type}`),
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

  const addTransaction = async (data: TransactionFormData): Promise<boolean> => {
    try {
      const response = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        toast.success(`${type === 'income' ? 'Pemasukan' : 'Pengeluaran'} berhasil ditambahkan`);
        await fetchData();
        return true;
      } else {
        const error = await response.json();
        toast.error(error.error || `Gagal menambahkan ${type === 'income' ? 'pemasukan' : 'pengeluaran'}`);
        return false;
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Terjadi kesalahan');
      return false;
    }
  };

  const updateTransaction = async (id: string, data: TransactionFormData): Promise<boolean> => {
    try {
      const response = await fetch(`/api/transactions/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        toast.success(`${type === 'income' ? 'Pemasukan' : 'Pengeluaran'} berhasil diperbarui`);
        await fetchData();
        return true;
      } else {
        const error = await response.json();
        toast.error(error.error || `Gagal memperbarui ${type === 'income' ? 'pemasukan' : 'pengeluaran'}`);
        return false;
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Terjadi kesalahan');
      return false;
    }
  };

  const deleteTransaction = async (id: string): Promise<boolean> => {
    try {
      const response = await fetch(`/api/transactions/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success(`${type === 'income' ? 'Pemasukan' : 'Pengeluaran'} berhasil dihapus`);
        await fetchData();
        return true;
      } else {
        toast.error(`Gagal menghapus ${type === 'income' ? 'pemasukan' : 'pengeluaran'}`);
        return false;
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Terjadi kesalahan');
      return false;
    }
  };

  const addCategory = async (data: CategoryFormData): Promise<boolean> => {
    try {
      const response = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, type }),
      });

      if (response.ok) {
        toast.success('Kategori berhasil ditambahkan');
        await fetchData();
        return true;
      } else {
        const error = await response.json();
        toast.error(error.error || 'Gagal menambahkan kategori');
        return false;
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Terjadi kesalahan');
      return false;
    }
  };

  const updateCategory = async (id: string, data: CategoryFormData): Promise<boolean> => {
    try {
      const response = await fetch(`/api/categories/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        toast.success('Kategori berhasil diperbarui');
        await fetchData();
        return true;
      } else {
        const error = await response.json();
        toast.error(error.error || 'Gagal memperbarui kategori');
        return false;
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Terjadi kesalahan');
      return false;
    }
  };

  const deleteCategory = async (id: string): Promise<boolean> => {
    try {
      const response = await fetch(`/api/categories/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('Kategori berhasil dihapus');
        await fetchData();
        return true;
      } else {
        const error = await response.json();
        toast.error(error.error || 'Gagal menghapus kategori');
        return false;
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Terjadi kesalahan');
      return false;
    }
  };

  const getTotal = () => {
    return transactions.reduce((sum, t) => sum + t.amount, 0);
  };

  const getDataByCategory = () => {
    return categories
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
  };

  useEffect(() => {
    fetchData();
  }, [type]);

  return {
    transactions,
    categories,
    isLoading,
    fetchData,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    addCategory,
    updateCategory,
    deleteCategory,
    getTotal,
    getDataByCategory,
  };
}
