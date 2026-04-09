'use client';

import { Pencil, Trash2, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/hooks/useTranslation';
import { useCurrencyFormat } from '@/hooks/useCurrencyFormat';
import { Category } from '@/types/transaction.types';
import { DynamicIcon } from '@/components/shared/DynamicIcon';

interface CategoryListProps {
  categories: Category[];
  onEdit: (category: Category) => void;
  onDelete: (id: string) => void;
  type: 'income' | 'expense';
  compact?: boolean;
  categoryAmounts?: Record<string, { amount: number; count: number }>;
}

export function CategoryList({ categories, onEdit, onDelete, type, compact, categoryAmounts }: CategoryListProps) {
  const { t } = useTranslation();
  const { formatAmount } = useCurrencyFormat();
  // ── Compact mode (chip / tablet / desktop) ──
  if (compact || categories.length > 4) {
    return (
      <div>
        {/* Mobile: horizontal scrollable chip strip (< md / 768px) */}
        <div className="flex md:hidden gap-2 overflow-x-auto scrollbar-hide pb-1">
          {categories.map((category) => {
            const isActive = true;
            const stats = categoryAmounts?.[category.id];
            const transactionCount = stats?.count ?? category._count?.transactions ?? 0;
            const totalAmount = stats?.amount ?? 0;
            return (
              <div
                key={category.id}
                onClick={() => onEdit(category)}
                className="group flex items-center gap-2 shrink-0 px-3 py-2 rounded-xl border border-white/[0.06] bg-white/[0.03] hover:bg-white/[0.06] active:bg-white/[0.08] transition-all duration-150 cursor-pointer min-w-0"
              >
                <span
                  className="flex-shrink-0 w-7 h-7 rounded-lg grid place-items-center text-sm leading-none [&>*]:block"
                  style={{ backgroundColor: `${category.color}20` }}
                >
                  <DynamicIcon name={category.icon} className="h-3.5 w-3.5" />
                </span>
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-medium text-white/90 truncate max-w-[100px]">
                    {category.name}
                  </span>
                  <span className="text-[9px] text-white/40">
                    {t('category.transactionCount', { count: transactionCount })}
                  </span>
                  {totalAmount > 0 && (
                    <span className="text-[9px] font-medium" style={{ color: category.color }}>
                      {formatAmount(totalAmount)}
                    </span>
                  )}
                </div>
                <ChevronRight className="h-3 w-3 text-white/20 group-hover:text-white/40 shrink-0" />
              </div>
            );
          })}
          {categories.length === 0 && (
            <div className="py-4 px-3 text-xs text-muted-foreground text-center w-full">
              {t('category.noData')}
            </div>
          )}
        </div>

        {/* Tablet: 2-column compact cards (md → lg / 768px–1024px) */}
        <div className="hidden md:grid lg:hidden grid-cols-2 gap-2">
          {categories.map((category) => {
            const stats = categoryAmounts?.[category.id];
            const transactionCount = stats?.count ?? category._count?.transactions ?? 0;
            const totalAmount = stats?.amount ?? 0;
            return (
              <div
                key={category.id}
                className="group flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl border border-white/[0.06] bg-white/[0.03] hover:bg-white/[0.06] active:bg-white/[0.08] transition-all duration-150 cursor-pointer"
                onClick={() => onEdit(category)}
              >
                <div className="flex items-center gap-2.5 flex-1 min-w-0">
                  <span
                    className="flex-shrink-0 w-8 h-8 rounded-lg grid place-items-center text-sm leading-none [&>*]:block"
                    style={{ backgroundColor: `${category.color}20` }}
                  >
                    <DynamicIcon name={category.icon} className="h-4 w-4" />
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-xs truncate">{category.name}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {t('category.transactionCount', { count: transactionCount })}
                    </p>
                    {totalAmount > 0 && (
                      <p className="text-[10px] font-semibold" style={{ color: category.color }}>
                        {formatAmount(totalAmount)}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex gap-0.5 shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={(e) => { e.stopPropagation(); onEdit(category); }}
                  >
                    <Pencil className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive hover:text-destructive"
                    onClick={(e) => { e.stopPropagation(); onDelete(category.id); }}
                    disabled={transactionCount > 0}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            );
          })}
          {categories.length === 0 && (
            <div className="col-span-full flex flex-col items-center justify-center py-6 text-center text-muted-foreground">
              <p className="text-xs">{t('category.noData')} {t('category.noDataHint')}</p>
            </div>
          )}
        </div>

        {/* Desktop: compact list rows (lg+ / ≥1024px) */}
        <div className="hidden lg:grid grid-cols-2 xl:grid-cols-3 gap-2">
          {categories.map((category) => {
            const stats = categoryAmounts?.[category.id];
            const transactionCount = stats?.count ?? category._count?.transactions ?? 0;
            const totalAmount = stats?.amount ?? 0;
            return (
              <div
                key={category.id}
                className="group flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl border border-white/[0.06] bg-white/[0.03] hover:bg-white/[0.06] hover:border-primary/20 transition-all duration-150 cursor-pointer"
                onClick={() => onEdit(category)}
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <span
                    className="flex-shrink-0 w-8 h-8 rounded-lg grid place-items-center text-base leading-none [&>*]:block"
                    style={{ backgroundColor: `${category.color}20` }}
                  >
                    <DynamicIcon name={category.icon} className="h-4 w-4" />
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{category.name}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {t('category.transactionCount', { count: transactionCount })}
                    </p>
                    {totalAmount > 0 && (
                      <p className="text-[10px] font-semibold" style={{ color: category.color }}>
                        {t('category.total')}: {formatAmount(totalAmount)}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex gap-0.5 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={(e) => { e.stopPropagation(); onEdit(category); }}
                  >
                    <Pencil className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive hover:text-destructive"
                    onClick={(e) => { e.stopPropagation(); onDelete(category.id); }}
                    disabled={transactionCount > 0}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            );
          })}
          {categories.length === 0 && (
            <div className="col-span-full flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
              <p className="text-sm">{t('category.noData')} {t('category.noDataHint')}</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Full card grid (few categories, responsive) ──
  return (
    <div className="space-y-3">
      <div className="hidden md:flex items-center justify-between">
        <span className="text-sm text-muted-foreground">
          {categories.length} {t('kas.categories')}
        </span>
      </div>

      <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3">
        {categories.map((category) => {
          const stats = categoryAmounts?.[category.id];
          const transactionCount = stats?.count ?? category._count?.transactions ?? 0;
          const totalAmount = stats?.amount ?? 0;
          return (
            <div
              key={category.id}
              className="group flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl border border-white/[0.06] bg-white/[0.03] hover:bg-white/[0.06] active:bg-white/[0.08] lg:hover:border-primary/20 transition-all duration-150 cursor-pointer"
              onClick={() => onEdit(category)}
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <span
                  className="flex-shrink-0 w-8 h-8 rounded-lg grid place-items-center text-base leading-none [&>*]:block"
                  style={{ backgroundColor: `${category.color}20` }}
                >
                  <DynamicIcon name={category.icon} className="h-4 w-4" />
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{category.name}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {t('category.transactionCount', { count: transactionCount })}
                  </p>
                  {totalAmount > 0 && (
                    <p className="text-[10px] font-semibold" style={{ color: category.color }}>
                      {t('category.total')}: {formatAmount(totalAmount)}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex gap-0.5 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={(e) => { e.stopPropagation(); onEdit(category); }}
                >
                  <Pencil className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-destructive hover:text-destructive"
                  onClick={(e) => { e.stopPropagation(); onDelete(category.id); }}
                  disabled={transactionCount > 0}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {categories.length === 0 && (
        <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
          <p className="text-sm">{t('category.noData')} {t('category.noDataHint')}</p>
        </div>
      )}
    </div>
  );
}
