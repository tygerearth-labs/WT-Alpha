'use client';

import { useEffect, useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Wallet, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, Minus, PiggyBank } from 'lucide-react';
import { useCurrencyFormat } from '@/hooks/useCurrencyFormat';
import { useTranslation } from '@/hooks/useTranslation';

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

// ── Animated Counter Hook ───────────────────────────────────────
function useCountUp(target: number, duration = 1200, enabled = true) {
  const [display, setDisplay] = useState(0);
  const rafRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);

  useEffect(() => {
    if (!enabled || target === 0) return;

    const animate = (timestamp: number) => {
      if (!startTimeRef.current) startTimeRef.current = timestamp;
      const elapsed = timestamp - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);

      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(eased * target));

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      }
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration, enabled]);

  return enabled && target === 0 ? 0 : display;
}

// ── Mini Sparkline ──────────────────────────────────────────────
function Sparkline({ data, color, width = 60, height = 24 }: { data: number[]; color: string; width?: number; height?: number }) {
  if (data.length < 2) return null;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const padding = 2;

  const points = data.map((v, i) => {
    const x = padding + (i / (data.length - 1)) * (width - padding * 2);
    const y = padding + (1 - (v - min) / range) * (height - padding * 2);
    return `${x},${y}`;
  }).join(' ');

  const fillId = `spark-fill-${color.replace('#', '')}`;

  return (
    <svg width={width} height={height} className="shrink-0">
      <defs>
        <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path
        d={`M ${points.split(' ')[0]} ` +
          data.slice(1).map((_, i) => `L ${points.split(' ')[i + 1]}`).join(' ') +
          ` L ${padding + (width - padding * 2)},${height} L ${padding},${height} Z`}
        fill={`url(#${fillId})`}
      />
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ── Metric Row ──────────────────────────────────────────────────
function MetricRow({
  label,
  value,
  formatted,
  change,
  sparkData,
  color,
  isIncome,
}: {
  label: string;
  value: number;
  formatted: string;
  change: number;
  sparkData: number[];
  color: string;
  isIncome: boolean;
}) {
  const animatedValue = useCountUp(value, 1000);
  const { formatAmount } = useCurrencyFormat();

  const changeColor = change > 0
    ? (isIncome ? THEME.secondary : THEME.destructive)
    : change < 0
      ? (isIncome ? THEME.destructive : THEME.secondary)
      : THEME.muted;

  const ChangeIcon = change > 0 ? ArrowUpRight : change < 0 ? ArrowDownRight : Minus;

  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 min-w-0">
        <p className="text-[10px] uppercase tracking-wider mb-0.5" style={{ color: THEME.muted }}>
          {label}
        </p>
        <p className="text-sm font-bold tabular-nums" style={{ color: THEME.text }}>
          {formatAmount(animatedValue)}
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {change !== 0 && (
          <span
            className="flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
            style={{ color: changeColor, background: `${changeColor}15` }}
          >
            <ChangeIcon className="h-2.5 w-2.5" />
            {Math.abs(change)}%
          </span>
        )}
        <Sparkline data={sparkData} color={color} />
      </div>
    </div>
  );
}

// ── Main Component ──────────────────────────────────────────────
interface MonthlySummaryProps {
  monthlyComparison?: {
    incomeChange: number;
    expenseChange: number;
    savingsChange: number;
    transactionCountChange: number;
    currentMonthIncome: number;
    currentMonthExpense: number;
    previousMonthIncome: number;
    previousMonthExpense: number;
  };
  savingsRate?: number;
  monthlyTrends?: Array<{
    month: string;
    income: number;
    expense: number;
    savings: number;
  }>;
}

export function MonthlySummary({ monthlyComparison, savingsRate, monthlyTrends }: MonthlySummaryProps) {
  const { formatAmount } = useCurrencyFormat();
  const { t } = useTranslation();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 150);
    return () => clearTimeout(timer);
  }, []);

  const mc = monthlyComparison;
  if (!mc) {
    return (
      <Card className="overflow-hidden group/card relative" style={{ background: THEME.surface, border: `1px solid ${THEME.border}` }}>
        <CardContent className="flex items-center justify-center h-48">
          <p className="text-xs" style={{ color: THEME.muted }}>{t('dashboard.noMonthlyData')}</p>
        </CardContent>
      </Card>
    );
  }

  const netSavings = mc.currentMonthIncome - mc.currentMonthExpense;
  const isPositive = netSavings >= 0;
  const savingsColor = isPositive ? THEME.secondary : THEME.destructive;
  const budgetUtilization = mc.currentMonthIncome > 0
    ? Math.round((mc.currentMonthExpense / mc.currentMonthIncome) * 100)
    : 0;

  // Build sparkline data from trends
  const incomeSpark = (monthlyTrends || []).map(t => t.income).slice(-7);
  const expenseSpark = (monthlyTrends || []).map(t => t.expense).slice(-7);
  const savingsSpark = (monthlyTrends || []).map(t => t.savings).slice(-7);

  // Budget utilization color
  const budgetColor = budgetUtilization >= 100
    ? THEME.destructive
    : budgetUtilization >= 80
      ? THEME.warning
      : THEME.secondary;

  // Spending comparison text
  const spendingCompareText = mc.expenseChange > 0
    ? t('dashboard.moreSpending', { percent: Math.abs(mc.expenseChange) })
    : mc.expenseChange < 0
      ? t('dashboard.lessSpending', { percent: Math.abs(mc.expenseChange) })
      : t('dashboard.sameSpending');
  const spendingCompareColor = mc.expenseChange > 0 ? THEME.warning : mc.expenseChange < 0 ? THEME.secondary : THEME.muted;

  return (
    <Card className="overflow-hidden group/card relative" style={{ background: THEME.surface, border: `1px solid ${THEME.border}` }}>
      <div className="absolute inset-0 rounded-lg opacity-0 group-hover/card:opacity-100 transition-opacity duration-500 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse at bottom left, #FFD70008 0%, transparent 60%)' }}
      />
      <CardHeader className="pb-2 pt-4 px-4">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg grid place-items-center" style={{ background: `${THEME.warning}12` }}>
            <Wallet className="h-3.5 w-3.5" style={{ color: THEME.warning }} />
          </div>
          <CardTitle className="text-sm font-semibold" style={{ color: THEME.text }}>
            {t('dashboard.monthlySummary')}
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-4 space-y-4">
        {/* Income & Expense metrics */}
        <div className="space-y-3">
          <div
            className="transition-all duration-500"
            style={{
              opacity: isVisible ? 1 : 0,
              transform: isVisible ? 'translateY(0)' : 'translateY(8px)',
              transitionDelay: '0ms',
            }}
          >
            <MetricRow
              label={t('dashboard.income')}
              value={mc.currentMonthIncome}
              formatted={formatAmount(mc.currentMonthIncome)}
              change={mc.incomeChange}
              sparkData={incomeSpark}
              color={THEME.secondary}
              isIncome={true}
            />
          </div>

          <div
            className="transition-all duration-500"
            style={{
              opacity: isVisible ? 1 : 0,
              transform: isVisible ? 'translateY(0)' : 'translateY(8px)',
              transitionDelay: '80ms',
            }}
          >
            <MetricRow
              label={t('dashboard.expense')}
              value={mc.currentMonthExpense}
              formatted={formatAmount(mc.currentMonthExpense)}
              change={mc.expenseChange}
              sparkData={expenseSpark}
              color={THEME.destructive}
              isIncome={false}
            />
          </div>
        </div>

        {/* Divider */}
        <div style={{ borderTop: `1px solid ${THEME.border}` }} />

        {/* Net Savings Indicator */}
        <div
          className="transition-all duration-500"
          style={{
            opacity: isVisible ? 1 : 0,
            transform: isVisible ? 'translateY(0)' : 'translateY(8px)',
            transitionDelay: '160ms',
          }}
        >
          <div
            className="flex items-center gap-2.5 p-3 rounded-lg"
            style={{ background: `${savingsColor}08`, border: `1px solid ${savingsColor}20` }}
          >
            <div className="w-8 h-8 rounded-lg grid place-items-center shrink-0" style={{ background: `${savingsColor}15` }}>
              {isPositive ? (
                <TrendingUp className="h-4 w-4" style={{ color: savingsColor }} />
              ) : (
                <TrendingDown className="h-4 w-4" style={{ color: savingsColor }} />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] uppercase tracking-wider" style={{ color: THEME.muted }}>
                {t('dashboard.netSavings')}
              </p>
              <p className="text-base font-bold tabular-nums" style={{ color: savingsColor }}>
                {isPositive ? '+' : ''}{formatAmount(netSavings)}
              </p>
            </div>
            <div className="shrink-0">
              <Sparkline data={savingsSpark} color={savingsColor} width={50} height={20} />
            </div>
          </div>
        </div>

        {/* Budget Utilization */}
        <div
          className="transition-all duration-500"
          style={{
            opacity: isVisible ? 1 : 0,
            transform: isVisible ? 'translateY(0)' : 'translateY(8px)',
            transitionDelay: '240ms',
          }}
        >
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-1.5">
              <PiggyBank className="h-3 w-3" style={{ color: THEME.warning }} />
              <span className="text-[10px] uppercase tracking-wider" style={{ color: THEME.muted }}>
                {t('dashboard.budgetUtilization')}
              </span>
            </div>
            <span className="text-[11px] font-bold" style={{ color: budgetColor }}>
              {budgetUtilization}%
            </span>
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{ background: THEME.border }}>
            <div
              className="h-full rounded-full transition-all duration-1000 ease-out"
              style={{
                width: isVisible ? `${Math.min(budgetUtilization, 100)}%` : '0%',
                background: `linear-gradient(90deg, ${THEME.secondary}, ${budgetColor})`,
                transitionDelay: '400ms',
              }}
            />
          </div>
          {savingsRate !== undefined && savingsRate > 0 && (
            <p className="text-[10px] mt-1" style={{ color: THEME.textSecondary }}>
              {t('dashboard.savingsRateLabel')} <span className="font-semibold" style={{ color: THEME.secondary }}>{savingsRate.toFixed(0)}%</span>
            </p>
          )}
        </div>

        {/* Comparison with previous month */}
        <div
          className="transition-all duration-500"
          style={{
            opacity: isVisible ? 1 : 0,
            transform: isVisible ? 'translateY(0)' : 'translateY(8px)',
            transitionDelay: '320ms',
          }}
        >
          <div
            className="flex items-center gap-1.5 text-[10px] font-medium px-2.5 py-2 rounded-lg"
            style={{ background: `${spendingCompareColor}10`, color: spendingCompareColor }}
          >
            {mc.expenseChange > 0 ? (
              <TrendingUp className="h-3 w-3 shrink-0" />
            ) : mc.expenseChange < 0 ? (
              <TrendingDown className="h-3 w-3 shrink-0" />
            ) : (
              <Minus className="h-3 w-3 shrink-0" />
            )}
            <span>{spendingCompareText}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
