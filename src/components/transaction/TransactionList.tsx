'use client';

import { Pencil, Trash2, Inbox } from 'lucide-react';
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

const T = {
  surface: '#121212',
  accent: '#03DAC6',
  destructive: '#CF6679',
  primary: '#BB86FC',
  muted: '#9E9E9E',
  border: 'rgba(255,255,255,0.06)',
  text: '#E6E1E5',
  textSub: '#B3B3B3',
};

export function TransactionList({ transactions, onEdit, onDelete, type }: TransactionListProps) {
  const sortedTransactions = [...transactions].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  const color = type === 'income' ? T.accent : T.destructive;
  const sign = type === 'income' ? '+' : '-';
  const emptyMessage = type === 'income' ? 'Belum ada pemasukan' : 'Belum ada pengeluaran';

  // Group transactions by date
  const grouped = sortedTransactions.reduce<Record<string, Transaction[]>>((acc, t) => {
    const dateKey = format(new Date(t.date), 'yyyy-MM-dd', { locale: id });
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(t);
    return acc;
  }, {});

  if (sortedTransactions.length === 0) {
    return (
      <div
        className="rounded-xl p-6 sm:p-8 flex flex-col items-center justify-center text-center"
        style={{ background: T.surface, border: `1px solid ${T.border}` }}
      >
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-2" style={{ background: `${T.primary}10` }}>
          <Inbox className="h-5 w-5" style={{ color: T.primary, opacity: 0.5 }} />
        </div>
        <p className="text-xs font-medium" style={{ color: T.textSub }}>{emptyMessage}</p>
        <p className="text-[10px] mt-0.5" style={{ color: T.muted }}>Tambahkan transaksi baru</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {Object.entries(grouped).map(([dateKey, items]) => {
        const dateLabel = format(new Date(dateKey), 'EEEE, dd MMM yyyy', { locale: id });
        const dayTotal = items.reduce((sum, t) => sum + t.amount, 0);

        return (
          <div key={dateKey}>
            {/* Date header */}
            <div className="flex items-center justify-between px-1 py-1.5">
              <span className="text-[10px] font-semibold capitalize" style={{ color: T.muted }}>{dateLabel}</span>
              <span className="text-[10px] font-semibold" style={{ color }}>
                {sign}{getCurrencyFormat(dayTotal)}
              </span>
            </div>

            {/* Transaction items */}
            <div className="space-y-1">
              {items.map((transaction) => (
                <div
                  key={transaction.id}
                  className="group flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all duration-150 cursor-pointer hover:bg-white/[0.03]"
                  style={{ background: T.surface, border: `1px solid ${T.border}` }}
                >
                  {/* Category icon */}
                  <div
                    className="shrink-0 w-9 h-9 rounded-xl flex items-center justify-center text-sm"
                    style={{ backgroundColor: `${transaction.category.color}18` }}
                  >
                    {transaction.category.icon}
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold truncate" style={{ color: T.text }}>
                        {transaction.category.name}
                      </span>
                      <span className="text-xs font-bold shrink-0 tabular-nums" style={{ color }}>
                        {sign}{getCurrencyFormat(transaction.amount)}
                      </span>
                    </div>
                    {transaction.description && (
                      <p className="text-[10px] truncate mt-0.5" style={{ color: T.muted }}>
                        {transaction.description}
                      </p>
                    )}
                  </div>

                  {/* Actions — always visible on mobile, hover-reveal on desktop */}
                  <div className="flex gap-1 shrink-0 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                    <button
                      className="flex items-center justify-center h-8 w-8 rounded-lg active:scale-90 transition-transform"
                      style={{ background: `${T.primary}15`, color: T.primary }}
                      onClick={(e) => { e.stopPropagation(); onEdit(transaction); }}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      className="flex items-center justify-center h-8 w-8 rounded-lg active:scale-90 transition-transform"
                      style={{ background: `${T.destructive}15`, color: T.destructive }}
                      onClick={(e) => { e.stopPropagation(); onDelete(transaction.id); }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
