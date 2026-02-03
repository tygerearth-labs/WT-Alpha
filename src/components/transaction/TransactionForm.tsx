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
import { getCurrencyFormat } from '@/lib/utils';
import { Transaction, Category, TransactionFormData } from '@/types/transaction.types';
import { SavingsTarget } from '@/types/transaction.types';

interface TransactionFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: 'income' | 'expense';
  categories: Category[];
  savingsTargets?: SavingsTarget[];
  initialData?: Transaction | null;
  onSubmit: (data: TransactionFormData) => Promise<void>;
}

export function TransactionForm({
  open,
  onOpenChange,
  type,
  categories,
  savingsTargets = [],
  initialData,
  onSubmit,
}: TransactionFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    amount: '',
    description: '',
    categoryId: '',
    date: new Date().toISOString().split('T')[0],
    targetId: '',
    allocationPercentage: '',
  });

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (open && initialData) {
      setFormData({
        amount: initialData.amount.toString(),
        description: initialData.description || '',
        categoryId: initialData.categoryId,
        date: initialData.date.split('T')[0],
        targetId: '',
        allocationPercentage: '',
      });
    } else if (!open) {
      setFormData({
        amount: '',
        description: '',
        categoryId: '',
        date: new Date().toISOString().split('T')[0],
        targetId: '',
        allocationPercentage: '',
      });
    }
  }, [open, initialData]);

  // Auto-set allocation percentage when target is selected
  useEffect(() => {
    if (type === 'income' && formData.targetId && formData.targetId !== 'none') {
      const selectedTarget = savingsTargets.find((t) => t.id === formData.targetId);
      if (selectedTarget && selectedTarget.allocationPercentage > 0) {
        setFormData((prev) => ({
          ...prev,
          allocationPercentage: selectedTarget.allocationPercentage.toString(),
        }));
      }
    }
  }, [formData.targetId, savingsTargets, type]);

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
        targetId: type === 'income' && formData.targetId && formData.targetId !== 'none' ? formData.targetId : undefined,
        allocationPercentage: type === 'income' && formData.allocationPercentage ? parseFloat(formData.allocationPercentage) : undefined,
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
          {type === 'income' && (
            <div className="space-y-4 p-4 bg-primary/5 rounded-lg border border-primary/20">
              <div className="font-semibold text-sm mb-3 flex items-center gap-2">
                <span className="text-primary">🎯</span>
                <span>Alokasi ke Target Tabungan</span>
              </div>
              <div className="space-y-3">
                <div>
                  <Label htmlFor="targetId">Target Tabungan</Label>
                  <Select
                    value={formData.targetId}
                    onValueChange={(value) => setFormData({ ...formData, targetId: value })}
                  >
                    <SelectTrigger id="targetId">
                      <SelectValue placeholder="Pilih target tabungan" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Tidak dialokasikan</SelectItem>
                      {savingsTargets.map((target) => (
                        <SelectItem key={target.id} value={target.id}>
                          {target.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="allocationPercentage">Persentase Alokasi</Label>
                  {formData.targetId && formData.targetId !== 'none' ? (
                    <div className="flex items-center gap-2">
                      <Input
                        id="allocationPercentage"
                        type="number"
                        value={formData.allocationPercentage}
                        readOnly
                        disabled
                        className="bg-muted cursor-not-allowed"
                      />
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        ⚡ Otomatis dari setting
                      </span>
                    </div>
                  ) : (
                    <Input
                      id="allocationPercentage"
                      type="number"
                      value={formData.allocationPercentage}
                      onChange={(e) => setFormData({ ...formData, allocationPercentage: e.target.value })}
                      placeholder="0"
                      min="0"
                      max="100"
                      step="1"
                      disabled
                      className="bg-muted cursor-not-allowed"
                    />
                  )}
                  {formData.targetId && formData.targetId !== 'none' && formData.allocationPercentage && formData.amount && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Alokasi otomatis: <span className="font-semibold text-primary">{formData.allocationPercentage}%</span> = {getCurrencyFormat((parseFloat(formData.amount) * parseFloat(formData.allocationPercentage)) / 100)}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
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
