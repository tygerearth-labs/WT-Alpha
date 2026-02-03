'use client';

import { Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getCurrencyFormat } from '@/lib/utils';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { Transaction } from '@/types/transaction.types';

interface TransactionListProps {
  transactions: Transaction[];
  onEdit: (transaction: Transaction) => void;
  onDelete: (id: string) => void;
  type: 'income' | 'expense';
}

export function TransactionList({ transactions, onEdit, onDelete, type }: TransactionListProps) {
  const sortedTransactions = [...transactions].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  const title = type === 'income' ? 'Daftar Pemasukan' : 'Daftar Pengeluaran';
  const emptyMessage =
    type === 'income' ? 'Belum ada data pemasukan' : 'Belum ada data pengeluaran';
  const colorClass = type === 'income' ? 'text-green-500' : 'text-red-500';
  const bgClass = type === 'income' ? 'bg-green-500/10' : 'bg-red-500/10';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">{title}</h3>
        <span className="text-sm text-muted-foreground bg-muted px-3 py-1 rounded-full">
          {transactions.length} transaksi
        </span>
      </div>

      {sortedTransactions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground bg-muted/10 rounded-lg">
          <p className="text-base">{emptyMessage}</p>
          <p className="text-sm mt-1">Belum ada data. Tambahkan transaksi baru!</p>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {sortedTransactions.map((transaction) => (
            <div
              key={transaction.id}
              className="bg-card/80 backdrop-blur-sm border border-border/50 rounded-lg p-4 hover:border-primary/50 transition-all hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  {/* Category Icon */}
                  <div
                    className="flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center text-xl shadow-sm"
                    style={{ backgroundColor: `${transaction.category.color}20` }}
                  >
                    {transaction.category.icon}
                  </div>

                  {/* Transaction Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <p className="font-semibold text-sm truncate pr-2">
                        {transaction.category.name}
                      </p>
                      <p className={`font-bold text-base ${colorClass} flex-shrink-0`}>
                        {type === 'income' ? '+' : '-'}
                        {getCurrencyFormat(transaction.amount)}
                      </p>
                    </div>
                    {transaction.description && (
                      <p className="text-sm text-muted-foreground truncate">
                        {transaction.description}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-muted-foreground bg-background/60 px-2 py-1 rounded">
                        {format(new Date(transaction.date), 'dd MMM yyyy', { locale: id })}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-1 flex-shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 hover:bg-primary/10"
                    onClick={() => onEdit(transaction)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 text-destructive/80 hover:text-destructive hover:bg-destructive/10"
                    onClick={() => onDelete(transaction.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
