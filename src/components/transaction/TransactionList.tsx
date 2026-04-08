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
        className="rounded-xl p-6 sm:p-8 lg:py-16 flex flex-col items-center justify-center text-center"
        style={{ background: T.surface, border: `1px solid ${T.border}` }}
      >
        <div className="w-12 h-12 lg:w-16 lg:h-16 rounded-2xl flex items-center justify-center mb-2" style={{ background: `${T.primary}10` }}>
          <Inbox className="h-5 w-5 lg:h-7 lg:w-7" style={{ color: T.primary, opacity: 0.5 }} />
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
            <div className="flex items-center justify-between px-1 py-1.5 lg:py-2">
              <span className="text-[10px] font-semibold capitalize lg:text-xs lg:font-bold" style={{ color: T.muted }}>{dateLabel}</span>
              <span
                className="text-[10px] font-semibold lg:rounded-full lg:px-2.5 lg:py-0.5 lg:text-[11px]"
                style={{ color, background: `${color}12` }}
              >
                {sign}{getCurrencyFormat(dayTotal)}
              </span>
            </div>
            {/* Desktop gradient divider below date header */}
            <div className="mx-1 hidden lg:block h-[2px] rounded-full" style={{ background: `linear-gradient(90deg, ${color}30, transparent 80%)` }} />

            {/* Transaction items */}
            <div className="space-y-1">
              {items.map((transaction) => (
                <div
                  key={transaction.id}
                  className="group relative flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all duration-150 cursor-pointer hover:bg-white/[0.03] lg:hover:-translate-y-0.5 lg:hover:shadow-[0_4px_20px_rgba(0,0,0,0.3)]"
                  style={{ background: T.surface, border: `1px solid ${T.border}` }}
                >
                  {/* Left accent bar — desktop hover */}
                  <div
                    className="absolute left-0 top-3 bottom-3 w-[3px] rounded-full opacity-0 lg:group-hover:opacity-100 transition-opacity"
                    style={{ background: color }}
                  />
                  {/* Subtle gradient overlay — desktop hover */}
                  <div
                    className="absolute inset-0 rounded-xl opacity-0 lg:group-hover:opacity-100 transition-opacity pointer-events-none"
                    style={{ background: `linear-gradient(135deg, ${color}08, transparent 60%)` }}
                  />
                  {/* Category icon */}
                  <div
                    className="shrink-0 w-9 h-9 lg:w-10 lg:h-10 rounded-xl flex items-center justify-center text-sm lg:text-base"
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
                      <span className="text-xs lg:text-sm font-bold shrink-0 tabular-nums" style={{ color }}>
                        {sign}{getCurrencyFormat(transaction.amount)}
                      </span>
                    </div>
                    {transaction.description && (
                      <p className="text-[10px] lg:text-xs truncate mt-0.5" style={{ color: T.muted }}>
                        {transaction.description}
                      </p>
                    )}
                  </div>

                  {/* Actions — always visible on mobile, hover-reveal on desktop */}
                  <div className="flex gap-1 shrink-0 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                    <button
                      className="flex items-center justify-center h-8 w-8 lg:h-9 lg:w-9 rounded-lg active:scale-90 transition-all lg:hover:shadow-[0_0_12px_rgba(187,134,252,0.35)]"
                      style={{ background: `${T.primary}15`, color: T.primary }}
                      onClick={(e) => { e.stopPropagation(); onEdit(transaction); }}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      className="flex items-center justify-center h-8 w-8 lg:h-9 lg:w-9 rounded-lg active:scale-90 transition-all lg:hover:shadow-[0_0_12px_rgba(207,102,121,0.35)]"
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
