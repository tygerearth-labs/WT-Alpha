'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Category, CategoryFormData } from '@/types/transaction.types';

interface CategoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: 'income' | 'expense';
  initialData?: Category | null;
  onSubmit: (data: CategoryFormData) => Promise<void>;
}

const DEFAULT_COLORS = {
  income: '#10b981',
  expense: '#ef4444',
};

const DEFAULT_ICONS = {
  income: '💰',
  expense: '🛒',
};

export function CategoryDialog({
  open,
  onOpenChange,
  type,
  initialData,
  onSubmit,
}: CategoryDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    color: DEFAULT_COLORS[type],
    icon: DEFAULT_ICONS[type],
  });

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (open && initialData) {
      setFormData({
        name: initialData.name,
        color: initialData.color,
        icon: initialData.icon,
      });
    } else if (!open) {
      setFormData({
        name: '',
        color: DEFAULT_COLORS[type],
        icon: DEFAULT_ICONS[type],
      });
    }
  }, [open, initialData, type]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await onSubmit(formData);
    } finally {
      setIsSubmitting(false);
    }
  };

  const title = initialData ? 'Edit Kategori' : 'Tambah Kategori';
  const titleWithType = type === 'income' ? title + ' Pemasukan' : title + ' Pengeluaran';
  const submitLabel = initialData ? 'Update' : 'Simpan';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{titleWithType}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="catName">Nama Kategori</Label>
            <Input
              id="catName"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder={type === 'income' ? 'Contoh: Bonus' : 'Contoh: Makanan'}
              required
              maxLength={50}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="catColor">Warna</Label>
            <div className="flex gap-2 items-center">
              <Input
                id="catColor"
                type="color"
                value={formData.color}
                onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                className="w-20 h-10 p-1"
                required
              />
              <Input
                type="text"
                value={formData.color}
                onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                placeholder="#000000"
                className="flex-1"
                required
                maxLength={7}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="catIcon">Icon (Emoji)</Label>
            <Input
              id="catIcon"
              value={formData.icon}
              onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
              placeholder={DEFAULT_ICONS[type]}
              maxLength={2}
              required
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
