'use client';

import { useState, useMemo } from 'react';
import { Pencil, Trash2, Plus, Receipt, ArrowDownToLine, TrendingUp, Search, Filter } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useTranslation } from '@/hooks/useTranslation';
import { useCurrencyFormat } from '@/hooks/useCurrencyFormat';
import { format, isToday, isYesterday, differenceInDays } from 'date-fns';
import { id } from 'date-fns/locale';
import { Transaction } from '@/types/transaction.types';
import { DynamicIcon } from '@/components/shared/DynamicIcon';

interface TransactionListProps {
  transactions: Transaction[];
  onEdit: (transaction: Transaction) => void;
  onDelete: (id: string) => void;
  onAdd?: () => void;
  type: 'income' | 'expense';
}

const T = {
  surface: '#121212',
  surfaceAlt: '#141414',
  accent: '#03DAC6',
  destructive: '#CF6679',
  primary: '#BB86FC',
  muted: '#9E9E9E',
  border: 'rgba(255,255,255,0.06)',
  text: '#E6E1E5',
  textSub: '#B3B3B3',
};

type TimeFilter = 'all' | 'week' | 'month';

export function TransactionList({ transactions, onEdit, onDelete, onAdd, type }: TransactionListProps) {
  const { t } = useTranslation();
  const { formatAmount } = useCurrencyFormat();
  const [searchQuery, setSearchQuery] = useState('');
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all');

  const color = type === 'income' ? T.accent : T.destructive;
  const sign = type === 'income' ? '+' : '-';
  const emptyMessage = t('kas.noData');

  // Filtered transactions
  const filteredTransactions = useMemo(() => {
    let result = [...transactions];

    // Time filter
    if (timeFilter === 'week') {
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      const startOfWeek = new Date(now);
      const dayOfWeek = now.getDay();
      const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      startOfWeek.setDate(now.getDate() - diff);
      result = result.filter(t => new Date(t.date) >= startOfWeek && new Date(t.date) <= new Date());
    } else if (timeFilter === 'month') {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      result = result.filter(t => new Date(t.date) >= startOfMonth && new Date(t.date) <= new Date());
    }

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(t =>
        (t.description && t.description.toLowerCase().includes(q)) ||
        t.category.name.toLowerCase().includes(q)
      );
    }

    return result.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }, [transactions, searchQuery, timeFilter]);

  // Group transactions by date
  const grouped = filteredTransactions.reduce<Record<string, Transaction[]>>((acc, t) => {
    const dateKey = format(new Date(t.date), 'yyyy-MM-dd', { locale: id });
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(t);
    return acc;
  }, {});

  // Flatten items for zebra striping index
  let flatIndex = 0;

  const timeFilters: { key: TimeFilter; label: string }[] = [
    { key: 'all', label: t('filter.all') },
    { key: 'week', label: t('filter.week') },
    { key: 'month', label: t('filter.month') },
  ];

  if (transactions.length === 0) {
    return (
      <div
        className="rounded-xl p-6 sm:p-8 lg:py-16 flex flex-col items-center justify-center text-center relative overflow-hidden"
        style={{ background: T.surface, border: `1px solid ${T.border}` }}
      >
        {/* Background decoration */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse at 50% 30%, rgba(187,134,252,0.04) 0%, transparent 60%)',
          }}
        />
        {/* Animated illustration */}
        <div className="relative mb-4">
          <div
            className="w-16 h-16 lg:w-20 lg:h-20 rounded-2xl grid place-items-center [&>*]:block leading-none relative"
            style={{ background: `${T.primary}08`, border: `1px dashed ${T.primary}20` }}
          >
            {type === 'income' ? (
              <TrendingUp className="h-7 w-7 lg:h-9 lg:w-9" style={{ color: T.primary, opacity: 0.4 }} />
            ) : (
              <Receipt className="h-7 w-7 lg:h-9 lg:w-9" style={{ color: T.primary, opacity: 0.4 }} />
            )}
          </div>
          {/* Floating dots decoration */}
          <div className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-[#BB86FC]/30" style={{ animation: 'floatUp 2s ease-in-out infinite' }} />
          <div className="absolute -bottom-1 -left-2 w-1.5 h-1.5 rounded-full bg-[#03DAC6]/30" style={{ animation: 'floatUp 2s ease-in-out 0.5s infinite' }} />
        </div>
        <p className="text-sm font-medium mb-1" style={{ color: T.textSub }}>{emptyMessage}</p>
        <p className="text-xs max-w-[200px]" style={{ color: T.muted }}>{t('kas.noDataHint')}</p>
        {onAdd && (
          <button
            onClick={onAdd}
            className="mt-4 flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all duration-200 hover:scale-105 active:scale-95"
            style={{
              background: `${T.primary}15`,
              color: T.primary,
              border: `1px solid ${T.primary}20`,
            }}
          >
            <Plus className="h-3.5 w-3.5" />
            {type === 'income' ? t('kas.addIncome') : t('kas.addExpense')}
          </button>
        )}
      </div>
    );
  }

  const hasActiveFilter = searchQuery.trim() || timeFilter !== 'all';

  return (
    <div className="space-y-3 relative">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5" style={{ color: T.muted }} />
        <Input
          placeholder={t('transactionList.searchPlaceholder')}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="h-9 pl-9 pr-3 text-xs rounded-lg"
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: `1px solid ${T.border}`,
            color: T.text,
          }}
        />
      </div>

      {/* Filter Chips + Result Count */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide">
          <Filter className="h-3 w-3 shrink-0" style={{ color: T.muted }} />
          {timeFilters.map(f => (
            <button
              key={f.key}
              onClick={() => setTimeFilter(f.key)}
              className="text-[10px] font-semibold px-2.5 py-1 rounded-full shrink-0 transition-all duration-200 hover:scale-105"
              style={{
                background: timeFilter === f.key ? `${T.accent}15` : 'rgba(255,255,255,0.04)',
                color: timeFilter === f.key ? T.accent : T.muted,
                boxShadow: timeFilter === f.key ? `0 0 8px ${T.accent}15` : 'none',
                border: timeFilter === f.key ? `1px solid ${T.accent}25` : '1px solid transparent',
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
        {hasActiveFilter && (
          <span className="text-[10px] font-medium shrink-0 tabular-nums" style={{ color: T.muted }}>
            {t('transactionList.showingResults', { shown: filteredTransactions.length, total: transactions.length })}
          </span>
        )}
      </div>

      {/* Filtered empty state */}
      {filteredTransactions.length === 0 && transactions.length > 0 && (
        <div className="text-center py-8">
          <Search className="h-8 w-8 mx-auto mb-2" style={{ color: T.muted, opacity: 0.4 }} />
          <p className="text-xs font-medium" style={{ color: T.textSub }}>{t('transactionList.noMatching')}</p>
          <p className="text-[10px] mt-0.5" style={{ color: T.muted }}>{t('transactionList.noMatchingHint')}</p>
          <button
            onClick={() => { setSearchQuery(''); setTimeFilter('all'); }}
            className="mt-3 text-[10px] font-semibold px-3 py-1 rounded-lg transition-colors"
            style={{ color: T.accent, background: `${T.accent}10` }}
          >
            {t('transactionList.clearFilters')}
          </button>
        </div>
      )}

      {/* Transaction list (only show if we have filtered results) */}
      {filteredTransactions.length > 0 && (
        <div className="space-y-2">
      {Object.entries(grouped).map(([dateKey, items]) => {
        const dateObj = new Date(dateKey + 'T00:00:00');
        let dateLabel: string;
        if (isToday(dateObj)) {
          dateLabel = t('transactionList.today');
        } else if (isYesterday(dateObj)) {
          dateLabel = t('transactionList.yesterday');
        } else {
          const daysAgo = differenceInDays(new Date(), dateObj);
          if (daysAgo <= 6) {
            dateLabel = t('transactionList.daysAgo', { count: daysAgo });
          } else {
            dateLabel = format(dateObj, 'EEE, dd MMM yyyy', { locale: id });
          }
        }
        const dayTotal = items.reduce((sum, t) => sum + t.amount, 0);

        return (
          <div key={dateKey} className="space-y-1">
            {/* Sticky date header */}
            <div
              className="sticky top-0 z-10 flex items-center justify-between px-2 py-1.5 lg:py-2 rounded-lg"
              style={{
                background: 'rgba(18, 18, 18, 0.92)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                borderBottom: `1px solid ${T.border}`,
              }}
            >
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-semibold capitalize lg:text-xs lg:font-bold" style={{ color: T.textSub }}>{dateLabel}</span>
                <span className="text-[9px] font-medium px-1.5 py-0.5 rounded" style={{ color: T.muted, background: 'rgba(255,255,255,0.04)' }}>
                  {items.length} {items.length === 1 ? t('transactionList.transactionSingle') : t('transactionList.transactions')}
                </span>
              </div>
              <span
                className="text-[10px] font-semibold lg:rounded-full lg:px-2.5 lg:py-0.5 lg:text-[11px]"
                style={{ color, background: `${color}12` }}
              >
                {sign}{formatAmount(dayTotal)}
              </span>
            </div>

            {/* Transaction items with zebra striping */}
            <div className="space-y-1">
              {items.map((transaction) => {
                const isZebra = flatIndex % 2 === 1;
                flatIndex++;
                return (
                  <div
                    key={transaction.id}
                    className="group relative flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all duration-200 cursor-pointer lg:hover:-translate-y-0.5 lg:hover:shadow-[0_4px_20px_rgba(0,0,0,0.3)]"
                    style={{
                      background: isZebra ? T.surfaceAlt : T.surface,
                      border: `1px solid ${T.border}`,
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(187,134,252,0.04)';
                      e.currentTarget.style.borderColor = 'rgba(187,134,252,0.12)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = isZebra ? T.surfaceAlt : T.surface;
                      e.currentTarget.style.borderColor = T.border;
                    }}
                  >
                    {/* Left accent bar — desktop hover */}
                    <div
                      className="absolute left-0 top-3 bottom-3 w-[3px] rounded-full opacity-0 lg:group-hover:opacity-100 transition-opacity duration-200"
                      style={{ background: color, boxShadow: `0 0 8px ${color}40` }}
                    />
                    {/* Subtle gradient overlay — desktop hover */}
                    <div
                      className="absolute inset-0 rounded-xl opacity-0 lg:group-hover:opacity-100 transition-opacity duration-200 pointer-events-none"
                      style={{ background: `linear-gradient(135deg, ${color}08, transparent 60%)` }}
                    />
                    {/* Category icon with improved display */}
                    <div
                      className="shrink-0 w-9 h-9 lg:w-10 lg:h-10 rounded-xl grid place-items-center text-sm lg:text-base [&>*]:block leading-none transition-all duration-200"
                      style={{
                        backgroundColor: `${transaction.category.color}15`,
                        border: `1px solid ${transaction.category.color}15`,
                      }}
                    >
                      <DynamicIcon
                        name={transaction.category.icon}
                        className="h-4 w-4 lg:h-5 lg:w-5"
                        style={{ color: transaction.category.color }}
                      />
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold truncate" style={{ color: T.text }}>
                          {transaction.category.name}
                        </span>
                        <span className="text-xs lg:text-sm font-bold shrink-0 tabular-nums" style={{ color }}>
                          {sign}{formatAmount(transaction.amount)}
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
                        className="grid place-items-center h-8 w-8 lg:h-9 lg:w-9 rounded-lg active:scale-90 transition-all lg:hover:shadow-[0_0_12px_rgba(187,134,252,0.35)] [&>*]:block leading-none"
                        style={{ background: `${T.primary}15`, color: T.primary }}
                        onClick={(e) => { e.stopPropagation(); onEdit(transaction); }}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        className="grid place-items-center h-8 w-8 lg:h-9 lg:w-9 rounded-lg active:scale-90 transition-all lg:hover:shadow-[0_0_12px_rgba(207,102,121,0.35)] [&>*]:block leading-none"
                        style={{ background: `${T.destructive}15`, color: T.destructive }}
                        onClick={(e) => { e.stopPropagation(); onDelete(transaction.id); }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

        </div>
      )}

      {/* Floating Action Button (FAB) for quick add */}
      {onAdd && (
        <button
          onClick={onAdd}
          className="fixed bottom-20 right-4 z-30 w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200 active:scale-90 hover:scale-105 md:bottom-6"
          style={{
            background: 'linear-gradient(135deg, #BB86FC, #9B59B6)',
            boxShadow: '0 4px 20px rgba(187,134,252,0.3)',
            animation: 'fabPulse 3s ease-in-out infinite',
          }}
          title={type === 'income' ? t('kas.addIncome') : t('kas.addExpense')}
        >
          {type === 'income' ? (
            <TrendingUp className="h-5 w-5 text-white" />
          ) : (
            <ArrowDownToLine className="h-5 w-5 text-white" />
          )}
        </button>
      )}
    </div>
  );
}
