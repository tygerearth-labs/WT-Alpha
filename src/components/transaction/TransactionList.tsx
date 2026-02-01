'use client';

import { Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
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
  const bgClass = type === 'income' ? 'bg-green-500/20' : 'bg-red-500/20';
  const borderClass = type === 'income' ? 'border-green-500/30' : 'border-red-500/30';

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">{title}</h3>
        <span className="text-sm text-muted-foreground">
          {transactions.length} transaksi
        </span>
      </div>

      <ScrollArea className="max-h-[500px] pr-2">
        {sortedTransactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
            <p className="text-sm">{emptyMessage}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {sortedTransactions.map((transaction) => (
              <div
                key={transaction.id}
                className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-lg p-4 hover:border-primary/50 transition-all"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    {/* Category Icon */}
                    <div
                      className="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center text-lg"
                      style={{ backgroundColor: `${transaction.category.color}20` }}
                    >
                      {transaction.category.icon}
                    </div>

                    {/* Transaction Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">
                            {transaction.category.name}
                          </p>
                          {transaction.description && (
                            <p className="text-xs text-muted-foreground truncate mt-0.5">
                              {transaction.description}
                            </p>
                          )}
                        </div>
                        <p className={`font-bold text-base ${colorClass} flex-shrink-0`}>
                          {getCurrencyFormat(transaction.amount)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-background/50">
                          {format(new Date(transaction.date), 'dd/MM/yyyy', { locale: id })}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-1 flex-shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => onEdit(transaction)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => onDelete(transaction.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
