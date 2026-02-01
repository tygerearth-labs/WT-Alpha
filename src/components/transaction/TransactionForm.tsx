'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Transaction, Category, TransactionFormData } from '@/types/transaction.types';

interface TransactionFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: 'income' | 'expense';
  categories: Category[];
  initialData?: Transaction | null;
  onSubmit: (data: TransactionFormData) => Promise<void>;
}

export function TransactionForm({
  open,
  onOpenChange,
  type,
  categories,
  initialData,
  onSubmit,
}: TransactionFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    amount: '',
    description: '',
    categoryId: '',
    date: new Date().toISOString().split('T')[0],
  });

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (open && initialData) {
      setFormData({
        amount: initialData.amount.toString(),
        description: initialData.description || '',
        categoryId: initialData.categoryId,
        date: initialData.date.split('T')[0],
      });
    } else if (!open) {
      setFormData({
        amount: '',
        description: '',
        categoryId: '',
        date: new Date().toISOString().split('T')[0],
      });
    }
  }, [open, initialData]);

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
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const title = type === 'income' ? 'Tambah Pemasukan' : 'Tambah Pengeluaran';
  const submitLabel = initialData ? 'Update' : 'Simpan';
  const placeholderText = type === 'income' ? 'Contoh: Bonus' : 'Contoh: Makanan';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
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
              step="0.01"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="category">Kategori</Label>
            <Select
              value={formData.categoryId}
              onValueChange={(value) => setFormData({ ...formData, categoryId: value })}
              required
            >
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
              placeholder={placeholderText}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
