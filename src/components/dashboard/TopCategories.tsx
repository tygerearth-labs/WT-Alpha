'use client';

import { useEffect, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tag, ChevronRight } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';
import { useCurrencyFormat } from '@/hooks/useCurrencyFormat';
import { DynamicIcon } from '@/components/shared/DynamicIcon';
import type { PieChartData } from '@/types/transaction.types';

const THEME = {
  surface: '#121212',
  primary: '#BB86FC',
  secondary: '#03DAC6',
  destructive: '#CF6679',
  warning: '#F9A825',
  muted: '#9E9E9E',
  border: 'rgba(255,255,255,0.08)',
  text: '#FFFFFF',
  textSecondary: '#B3B3B3',
};

const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.08,
    },
  },
};

const categoryItemVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.5 } },
};

interface CategoryItem {
  name: string;
  amount: number;
  percentage: number;
  color: string;
  icon: string;
}

interface TopCategoriesProps {
  expenseByCategory?: PieChartData[];
}

export function TopCategories({ expenseByCategory }: TopCategoriesProps) {
  const { t } = useTranslation();
  const { formatAmount } = useCurrencyFormat();
  const [isVisible, setIsVisible] = useState(false);

  const categories = useMemo<CategoryItem[]>(() => {
    if (!expenseByCategory || expenseByCategory.length === 0) return [];
    const total = expenseByCategory.reduce((s, c) => s + c.amount, 0);
    return expenseByCategory
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5)
      .map(c => ({
        name: c.name,
        amount: c.amount,
        percentage: total > 0 ? Math.round((c.amount / total) * 100) : 0,
        color: c.color || '#9E9E9E',
        icon: c.icon || 'Tag',
      }));
  }, [expenseByCategory]);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <Card className="overflow-hidden group/card relative" style={{ background: THEME.surface, border: `1px solid ${THEME.border}` }}>
      <div className="absolute inset-0 rounded-lg opacity-0 group-hover/card:opacity-100 transition-opacity duration-500 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse at top right, #BB86FC08 0%, transparent 60%)' }}
      />
      <CardHeader className="pb-2 pt-4 px-4">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg grid place-items-center" style={{ background: `${THEME.primary}12` }}>
            <Tag className="h-3.5 w-3.5" style={{ color: THEME.primary }} />
          </div>
          <CardTitle className="text-sm font-semibold" style={{ color: THEME.text }}>
            {t('dashboard.topCategoriesTitle')}
          </CardTitle>
          {categories.length > 0 && (
            <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full" style={{ color: THEME.muted, background: `${THEME.border}` }}>
              {categories.length} {t('dashboard.categoriesBadge')}
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        {categories.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8">
            <Tag className="h-8 w-8 mb-2" style={{ color: THEME.muted, opacity: 0.4 }} />
            <p className="text-xs" style={{ color: THEME.muted }}>{t('dashboard.noExpenseData')}</p>
            <p className="text-[10px] mt-0.5" style={{ color: THEME.muted, opacity: 0.6 }}>
              {t('dashboard.startTrackingExpenses')}
            </p>
          </div>
        ) : (
          <motion.div
            className="space-y-3.5"
            initial="hidden"
            animate="visible"
            variants={containerVariants}
          >
            {categories.map((cat, i) => (
              <motion.div
                key={cat.name}
                variants={categoryItemVariants}
                whileHover={{ scale: 1.02, transition: { type: 'spring', stiffness: 400, damping: 25 } }}
              >
                {/* Category header row */}
                <div className="flex items-center gap-2.5 mb-1.5">
                  <div
                    className="w-7 h-7 rounded-lg grid place-items-center shrink-0 leading-none [&>*]:block transition-transform duration-200 group-hover/cat:scale-110"
                    style={{ background: `${cat.color}18` }}
                  >
                    <DynamicIcon name={cat.icon} className="h-3.5 w-3.5" style={{ color: cat.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-medium truncate" style={{ color: THEME.text }}>
                        {cat.name}
                      </span>
                      <span className="text-[9px] font-semibold shrink-0 px-1.5 py-0.5 rounded-full"
                        style={{ color: cat.color, background: `${cat.color}15` }}
                      >
                        {cat.percentage}%
                      </span>
                    </div>
                  </div>
                  <span className="text-[11px] font-bold tabular-nums shrink-0" style={{ color: THEME.text }}>
                    {formatAmount(cat.amount)}
                  </span>
                </div>

                {/* Progress bar with gradient */}
                <div className="h-2 rounded-full overflow-hidden transition-all duration-300"
                  style={{ background: THEME.border }}
                >
                  <div
                    className="h-full rounded-full transition-all duration-700 ease-out"
                    style={{
                      width: isVisible ? `${cat.percentage}%` : '0%',
                      background: `linear-gradient(90deg, ${cat.color}CC, ${cat.color})`,
                      transitionDelay: `${i * 80 + 100}ms`,
                    }}
                  />
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}

        {/* View All link */}
        <div className="mt-4 pt-3" style={{ borderTop: `1px solid ${THEME.border}` }}>
          <button
            className="flex items-center gap-1 w-full text-[11px] font-medium transition-colors duration-200 group/view"
            style={{ color: THEME.primary }}
            onClick={() => {/* Navigate to categories page */}}
          >
            <span>{t('dashboard.viewAllCategories')}</span>
            <ChevronRight className="h-3 w-3 ml-auto transition-transform duration-200 group-hover/view:translate-x-0.5" />
          </button>
        </div>
      </CardContent>
    </Card>
  );
}
