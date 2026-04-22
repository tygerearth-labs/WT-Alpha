'use client';

import { useMemo } from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import { useCurrencyFormat } from '@/hooks/useCurrencyFormat';
import {
  Lightbulb,
  TrendingUp,
  TrendingDown,
  PiggyBank,
  AlertTriangle,
  CheckCircle2,
  Info,
} from 'lucide-react';
import type { PieChartData } from '@/types/transaction.types';

interface MonthlyComparison {
  incomeChange: number;
  expenseChange: number;
  savingsChange: number;
  transactionCountChange: number;
  currentMonthIncome: number;
  currentMonthExpense: number;
  previousMonthIncome: number;
  previousMonthExpense: number;
}

interface FinancialTipsProps {
  expenseByCategory: PieChartData[];
  monthlyComparison?: MonthlyComparison;
  savingsRate: number;
}

interface Tip {
  id: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  severity: 'good' | 'warning' | 'concern';
  color: string;
  bg: string;
  border: string;
}

const SEVERITY_COLORS = {
  good: { color: '#03DAC6', bg: 'rgba(3, 218, 198, 0.08)', border: 'rgba(3, 218, 198, 0.20)' },
  warning: { color: '#F9A825', bg: 'rgba(249, 168, 37, 0.08)', border: 'rgba(249, 168, 37, 0.20)' },
  concern: { color: '#CF6679', bg: 'rgba(207, 102, 121, 0.08)', border: 'rgba(207, 102, 121, 0.20)' },
} as const;

export function FinancialTips({ expenseByCategory, monthlyComparison, savingsRate }: FinancialTipsProps) {
  const { t } = useTranslation();
  const { formatAmount } = useCurrencyFormat();

  const tips = useMemo<Tip[]>(() => {
    const result: Tip[] = [];

    // Tip 1: Based on top spending category
    if (expenseByCategory.length > 0) {
      const totalExpense = expenseByCategory.reduce((sum, c) => sum + c.amount, 0);
      const top = expenseByCategory[0];
      const percentage = totalExpense > 0 ? ((top.amount / totalExpense) * 100).toFixed(0) : '0';

      let severity: Tip['severity'];
      let icon: React.ReactNode;
      if (Number(percentage) > 50) {
        severity = 'concern';
        icon = <AlertTriangle className="h-4 w-4" />;
      } else if (Number(percentage) > 30) {
        severity = 'warning';
        icon = <TrendingDown className="h-4 w-4" />;
      } else {
        severity = 'good';
        icon = <CheckCircle2 className="h-4 w-4" />;
      }

      result.push({
        id: 'top-category',
        icon,
        title: severity === 'good'
          ? t('dashboard.aiTip.topCatBalanced', { name: top.name, percentage })
          : t('dashboard.aiTip.topCatHigh', { name: top.name, percentage }),
        description: severity === 'good'
          ? t('dashboard.aiTip.topCatBalancedDesc', { name: top.name, amount: formatAmount(top.amount) })
          : t('dashboard.aiTip.topCatHighDesc', { name: top.name, amount: formatAmount(top.amount) }),
        severity,
        ...SEVERITY_COLORS[severity],
      });
    }

    // Tip 2: Based on savings rate
    if (savingsRate >= 20) {
      result.push({
        id: 'savings-good',
        icon: <PiggyBank className="h-4 w-4" />,
        title: t('dashboard.aiTip.savingsGood', { rate: (savingsRate ?? 0).toFixed(1) }),
        description: t('dashboard.aiTip.savingsGoodDesc'),
        severity: 'good',
        ...SEVERITY_COLORS.good,
      });
    } else if (savingsRate >= 10) {
      result.push({
        id: 'savings-ok',
        icon: <Info className="h-4 w-4" />,
        title: t('dashboard.aiTip.savingsOk', { rate: (savingsRate ?? 0).toFixed(1) }),
        description: t('dashboard.aiTip.savingsOkDesc'),
        severity: 'warning',
        ...SEVERITY_COLORS.warning,
      });
    } else if (savingsRate >= 0) {
      result.push({
        id: 'savings-low',
        icon: <AlertTriangle className="h-4 w-4" />,
        title: t('dashboard.aiTip.savingsLow', { rate: (savingsRate ?? 0).toFixed(1) }),
        description: t('dashboard.aiTip.savingsLowDesc'),
        severity: 'concern',
        ...SEVERITY_COLORS.concern,
      });
    } else {
      result.push({
        id: 'savings-negative',
        icon: <TrendingDown className="h-4 w-4" />,
        title: t('dashboard.aiTip.savingsNegative'),
        description: t('dashboard.aiTip.savingsNegativeDesc'),
        severity: 'concern',
        ...SEVERITY_COLORS.concern,
      });
    }

    // Tip 3: Based on month-over-month expense change
    if (monthlyComparison) {
      const { expenseChange } = monthlyComparison;
      if (expenseChange > 15) {
        result.push({
          id: 'expense-up',
          icon: <TrendingUp className="h-4 w-4" />,
          title: t('dashboard.aiTip.expenseUp', { percent: (expenseChange ?? 0).toFixed(0) }),
          description: t('dashboard.aiTip.expenseUpDesc', { prevAmount: formatAmount(monthlyComparison.previousMonthExpense), currentAmount: formatAmount(monthlyComparison.currentMonthExpense) }),
          severity: 'concern',
          ...SEVERITY_COLORS.concern,
        });
      } else if (expenseChange > 5) {
        result.push({
          id: 'expense-slight-up',
          icon: <TrendingUp className="h-4 w-4" />,
          title: t('dashboard.aiTip.expenseSlightUp', { percent: (expenseChange ?? 0).toFixed(0) }),
          description: t('dashboard.aiTip.expenseSlightUpDesc', { prevAmount: formatAmount(monthlyComparison.previousMonthExpense), currentAmount: formatAmount(monthlyComparison.currentMonthExpense) }),
          severity: 'warning',
          ...SEVERITY_COLORS.warning,
        });
      } else if (expenseChange < -10) {
        result.push({
          id: 'expense-down',
          icon: <TrendingDown className="h-4 w-4" />,
          title: t('dashboard.aiTip.expenseDown', { percent: Math.abs(expenseChange ?? 0).toFixed(0) }),
          description: t('dashboard.aiTip.expenseDownDesc', { prevAmount: formatAmount(monthlyComparison.previousMonthExpense), currentAmount: formatAmount(monthlyComparison.currentMonthExpense) }),
          severity: 'good',
          ...SEVERITY_COLORS.good,
        });
      } else {
        result.push({
          id: 'expense-stable',
          icon: <CheckCircle2 className="h-4 w-4" />,
          title: t('dashboard.aiTip.expenseStable'),
          description: t('dashboard.aiTip.expenseStableDesc', { amount: formatAmount(monthlyComparison.currentMonthExpense) }),
          severity: 'good',
          ...SEVERITY_COLORS.good,
        });
      }
    }

    return result.slice(0, 3);
  }, [expenseByCategory, monthlyComparison, savingsRate, formatAmount, t]);

  if (tips.length === 0) return null;

  return (
    <div
      className="rounded-xl p-4 lg:p-5 transition-all duration-300 relative overflow-hidden"
      style={{
        background: '#121212',
        border: '1px solid rgba(255,255,255,0.08)',
      }}
    >
      {/* Subtle gradient glow */}
      <div
        className="absolute -top-8 -right-8 w-24 h-24 rounded-full blur-3xl opacity-15 pointer-events-none"
        style={{ background: '#BB86FC' }}
      />

      {/* Header */}
      <div className="relative z-10 flex items-center gap-2 mb-3">
        <div
          className="w-7 h-7 rounded-lg grid place-items-center [&>*]:block leading-none"
          style={{ background: 'rgba(187, 134, 252, 0.12)' }}
        >
          <Lightbulb className="h-3.5 w-3.5" style={{ color: '#BB86FC' }} />
        </div>
        <h3 className="text-sm font-semibold" style={{ color: '#FFFFFF' }}>
          {t('dashboard.aiTipsTitle')}
        </h3>
        <span
          className="ml-auto text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full"
          style={{ background: 'rgba(187, 134, 252, 0.12)', color: '#BB86FC' }}
        >
          {t('dashboard.aiTipsBadge')}
        </span>
      </div>

      {/* Tips List */}
      <div className="relative z-10 space-y-2.5">
        {tips.map((tip, index) => (
          <div
            key={tip.id}
            className="rounded-lg p-3 animate-in fade-in-0 slide-in-from-bottom-2"
            style={{
              background: tip.bg,
              border: `1px solid ${tip.border}`,
              animationDelay: `${index * 80}ms`,
              animationFillMode: 'backwards',
            }}
          >
            <div className="flex items-start gap-2.5">
              <div
                className="shrink-0 w-7 h-7 rounded-md grid place-items-center mt-0.5 [&>*]:block leading-none"
                style={{ background: `${tip.color}18` }}
              >
                <span style={{ color: tip.color, display: 'block', lineHeight: 1 }}>
                  {tip.icon}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold leading-snug mb-0.5" style={{ color: '#FFFFFF' }}>
                  {tip.title}
                </p>
                <p className="text-[11px] leading-relaxed" style={{ color: '#B3B3B3' }}>
                  {tip.description}
                </p>
              </div>
              {/* Severity dot */}
              <div
                className="shrink-0 w-2 h-2 rounded-full mt-1.5"
                style={{
                  background: tip.color,
                  boxShadow: `0 0 6px ${tip.color}40`,
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
