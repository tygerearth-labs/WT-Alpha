'use client';

import { Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Category } from '@/types/transaction.types';

interface CategoryListProps {
  categories: Category[];
  onEdit: (category: Category) => void;
  onDelete: (id: string) => void;
  type: 'income' | 'expense';
}

export function CategoryList({ categories, onEdit, onDelete, type }: CategoryListProps) {
  const title = type === 'income' ? 'Kategori Pemasukan' : 'Kategori Pengeluaran';

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">{title}</h3>
        <span className="text-sm text-muted-foreground">
          {categories.length} kategori
        </span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {categories.map((category) => {
          const transactionCount = category._count?.transactions || 0;

          return (
            <Card
              key={category.id}
              className="bg-card/50 backdrop-blur-sm border border-border/50 hover:border-primary/50 transition-all p-4"
            >
              <div className="flex items-center justify-between gap-3">
                {/* Icon and Name */}
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div
                    className="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center text-lg"
                    style={{ backgroundColor: `${category.color}20` }}
                  >
                    {category.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{category.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {transactionCount} transaksi
                    </p>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-1 flex-shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => onEdit(category)}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => onDelete(category.id)}
                    disabled={transactionCount > 0}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {categories.length === 0 && (
        <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
          <p className="text-sm">Belum ada kategori. Tambah kategori baru!</p>
        </div>
      )}
    </div>
  );
}
