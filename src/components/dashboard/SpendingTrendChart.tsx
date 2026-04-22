'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';
import { useCurrencyFormat } from '@/hooks/useCurrencyFormat';
import type { Transaction } from '@/types/transaction.types';

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

interface DayData {
  date: string;
  label: string;
  income: number;
  expense: number;
}

interface SpendingTrendChartProps {
  transactions?: Transaction[];
  savingsHistory?: Array<{ date: string; savings: number }>;
}

export function SpendingTrendChart({ transactions, savingsHistory }: SpendingTrendChartProps) {
  const { t } = useTranslation();
  const { formatAmount } = useCurrencyFormat();
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const data = useMemo(() => {
    const now = new Date();
    const days: DayData[] = [];
    const txns = transactions || [];

    for (let i = 29; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateStr = d.toISOString().split('T')[0];
      const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

      let income = 0;
      let expense = 0;
      for (const txn of txns) {
        const txDate = new Date(txn.date);
        if (txDate >= dayStart && txDate < dayEnd) {
          if (txn.type === 'income') income += txn.amount;
          else if (txn.type === 'expense') expense += txn.amount;
        }
      }

      const label = d.getDate().toString();
      days.push({ date: dateStr, label, income, expense });
    }
    return days;
  }, [transactions]);

  // Calculate chart dimensions
  const width = 400;
  const height = 140;
  const padding = { top: 8, right: 8, bottom: 24, left: 8 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const allValues = data.flatMap(d => [d.income, d.expense]);
  const maxVal = Math.max(...allValues, 1);

  // Generate SVG points for line paths
  const toX = (i: number) => padding.left + (i / Math.max(data.length - 1, 1)) * chartW;
  const toY = (v: number) => padding.top + chartH - (v / maxVal) * chartH;

  // Build income and expense line paths
  const incomePoints = data.map((d, i) => `${toX(i)},${toY(d.income)}`).join(' ');
  const expensePoints = data.map((d, i) => `${toX(i)},${toY(d.expense)}`).join(' ');

  // Build gradient fill paths (area under curve)
  const incomeFillPath = data.length > 0
    ? `M ${toX(0)},${padding.top + chartH} ` +
      data.map((d, i) => `L ${toX(i)},${toY(d.income)}`).join(' ') +
      ` L ${toX(data.length - 1)},${padding.top + chartH} Z`
    : '';
  const expenseFillPath = data.length > 0
    ? `M ${toX(0)},${padding.top + chartH} ` +
      data.map((d, i) => `L ${toX(i)},${toY(d.expense)}`).join(' ') +
      ` L ${toX(data.length - 1)},${padding.top + chartH} Z`
    : '';

  // Comparison summary: this month vs last month
  const now = new Date();
  const currentMonthIdx = now.getMonth();
  const currentYear = now.getFullYear();
  const thisMonthDays = data.filter(d => {
    const date = new Date(d.date);
    return date.getMonth() === currentMonthIdx && date.getFullYear() === currentYear;
  });
  const lastMonthDays = data.filter(d => {
    const date = new Date(d.date);
    return (currentMonthIdx === 0
      ? date.getMonth() === 11 && date.getFullYear() === currentYear - 1
      : date.getMonth() === currentMonthIdx - 1 && date.getFullYear() === currentYear);
  });

  const thisMonthExpense = thisMonthDays.reduce((s, d) => s + d.expense, 0);
  const lastMonthExpense = lastMonthDays.reduce((s, d) => s + d.expense, 0);
  const thisMonthIncome = thisMonthDays.reduce((s, d) => s + d.income, 0);
  const lastMonthIncome = lastMonthDays.reduce((s, d) => s + d.income, 0);

  const expenseChange = lastMonthExpense > 0
    ? Math.round(((thisMonthExpense - lastMonthExpense) / lastMonthExpense) * 100)
    : 0;
  const incomeChange = lastMonthIncome > 0
    ? Math.round(((thisMonthIncome - lastMonthIncome) / lastMonthIncome) * 100)
    : 0;

  const hoveredData = hoveredIdx !== null ? data[hoveredIdx] : null;
  const gradientIdIncome = 'grad-income-trend';
  const gradientIdExpense = 'grad-expense-trend';

  // X-axis labels: show every 5th day
  const xLabels = data.filter((_, i) => i % 5 === 0 || i === data.length - 1);

  return (
    <Card className="overflow-hidden group/card relative" style={{ background: THEME.surface, border: `1px solid ${THEME.border}` }}>
      <div className="absolute inset-0 rounded-lg opacity-0 group-hover/card:opacity-100 transition-opacity duration-500 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse at top left, #03DAC608 0%, transparent 60%)' }}
      />
      <CardHeader className="pb-2 pt-4 px-4">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg grid place-items-center" style={{ background: `${THEME.secondary}12` }}>
            <TrendingUp className="h-3.5 w-3.5" style={{ color: THEME.secondary }} />
          </div>
          <CardTitle className="text-sm font-semibold" style={{ color: THEME.text }}>
            {t('dashboard.spendingTrend')}
          </CardTitle>
          <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full" style={{ color: THEME.muted, background: `${THEME.border}` }}>
            {t('dashboard.last30DaysFull')}
          </span>
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        <div className="relative w-full overflow-hidden" style={{ height: `${height}px` }}>
              <svg
                viewBox={`0 0 ${width} ${height}`}
                className="w-full h-full"
                preserveAspectRatio="none"
                onMouseLeave={() => setHoveredIdx(null)}
              >
                <defs>
                  <linearGradient id={gradientIdIncome} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={THEME.secondary} stopOpacity="0.3" />
                    <stop offset="100%" stopColor={THEME.secondary} stopOpacity="0" />
                  </linearGradient>
                  <linearGradient id={gradientIdExpense} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={THEME.destructive} stopOpacity="0.2" />
                    <stop offset="100%" stopColor={THEME.destructive} stopOpacity="0" />
                  </linearGradient>
                </defs>

                {/* Grid lines */}
                {[0, 0.25, 0.5, 0.75, 1].map(pct => {
                  const y = padding.top + chartH * (1 - pct);
                  return (
                    <line key={pct} x1={padding.left} y1={y} x2={width - padding.right} y2={y}
                      stroke={THEME.border} strokeWidth="0.5" strokeDasharray="3,3" />
                  );
                })}

                {/* Income gradient fill */}
                <path d={incomeFillPath} fill={`url(#${gradientIdIncome})`} />
                {/* Expense gradient fill */}
                <path d={expenseFillPath} fill={`url(#${gradientIdExpense})`} />

                {/* Income line */}
                <polyline
                  points={incomePoints}
                  fill="none"
                  stroke={THEME.secondary}
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  opacity={hoveredIdx !== null ? 0.3 : 0.9}
                />
                {/* Expense line */}
                <polyline
                  points={expensePoints}
                  fill="none"
                  stroke={THEME.destructive}
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  opacity={hoveredIdx !== null ? 0.3 : 0.9}
                />

                {/* Hover vertical line + dots */}
                {hoveredIdx !== null && (
                  <>
                    <line
                      x1={toX(hoveredIdx)} y1={padding.top}
                      x2={toX(hoveredIdx)} y2={padding.top + chartH}
                      stroke={THEME.textSecondary}
                      strokeWidth="0.5"
                      strokeDasharray="2,2"
                      opacity="0.5"
                    />
                    <circle cx={toX(hoveredIdx)} cy={toY(data[hoveredIdx].income)}
                      r="4" fill={THEME.secondary} stroke={THEME.surface} strokeWidth="2" />
                    <circle cx={toX(hoveredIdx)} cy={toY(data[hoveredIdx].expense)}
                      r="4" fill={THEME.destructive} stroke={THEME.surface} strokeWidth="2" />
                  </>
                )}

                {/* Invisible hover zones */}
                {data.map((_, i) => (
                  <rect
                    key={i}
                    x={toX(i) - (chartW / data.length) / 2}
                    y={0}
                    width={chartW / data.length}
                    height={height}
                    fill="transparent"
                    onMouseEnter={() => setHoveredIdx(i)}
                    style={{ cursor: 'crosshair' }}
                  />
                ))}

                {/* X-axis labels */}
                {xLabels.map((d, idx) => {
                  const originalIdx = data.indexOf(d);
                  return (
                    <text
                      key={d.date}
                      x={toX(originalIdx)}
                      y={height - 4}
                      textAnchor="middle"
                      fill={THEME.muted}
                      fontSize="8"
                      fontFamily="inherit"
                    >
                      {d.label}
                    </text>
                  );
                })}
              </svg>

              {/* Tooltip */}
              {hoveredData && (
                <div
                  className="absolute pointer-events-none rounded-lg px-3 py-2 shadow-xl z-10"
                  style={{
                    background: '#1a1a1a',
                    border: `1px solid ${THEME.border}`,
                    left: `${Math.min(Math.max((toX(hoveredIdx!) / width) * 100, 5), 70)}%`,
                    top: '8px',
                  }}
                >
                  <p className="text-[10px] font-medium mb-1" style={{ color: THEME.textSecondary }}>
                    {hoveredData.date}
                  </p>
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: THEME.secondary }} />
                    <span className="text-[10px]" style={{ color: THEME.secondary }}>
                      {t('dashboard.tooltipIncome')} {formatAmount(hoveredData.income)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: THEME.destructive }} />
                    <span className="text-[10px]" style={{ color: THEME.destructive }}>
                      {t('dashboard.tooltipExpense')} {formatAmount(hoveredData.expense)}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Legend */}
            <div className="flex items-center justify-center gap-4 mt-3">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: THEME.secondary }} />
                <span className="text-[11px] font-medium" style={{ color: THEME.textSecondary }}>{t('dashboard.income')}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: THEME.destructive }} />
                <span className="text-[11px] font-medium" style={{ color: THEME.textSecondary }}>{t('dashboard.expense')}</span>
              </div>
            </div>

            {/* This Month vs Last Month comparison */}
            <div className="mt-3 pt-3 space-y-2" style={{ borderTop: `1px solid ${THEME.border}` }}>
              <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: THEME.muted }}>
                {t('dashboard.thisVsLastMonth')}
              </p>
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 flex-1">
                  <span className="text-[11px]" style={{ color: THEME.textSecondary }}>{t('dashboard.income')}</span>
                  <span className="text-[11px] font-bold flex-1 text-right" style={{ color: THEME.text }}>
                    {formatAmount(thisMonthIncome)}
                  </span>
                  {incomeChange !== 0 && (
                    <span
                      className="flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                      style={{
                        color: incomeChange > 0 ? THEME.secondary : THEME.destructive,
                        background: incomeChange > 0 ? `${THEME.secondary}15` : `${THEME.destructive}15`,
                      }}
                    >
                      {incomeChange > 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                      {Math.abs(incomeChange)}%
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-1">
                  <span className="text-[11px]" style={{ color: THEME.textSecondary }}>{t('dashboard.expense')}</span>
                  <span className="text-[11px] font-bold flex-1 text-right" style={{ color: THEME.text }}>
                    {formatAmount(thisMonthExpense)}
                  </span>
                  {expenseChange !== 0 && (
                    <span
                      className="flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                      style={{
                        color: expenseChange < 0 ? THEME.secondary : THEME.destructive,
                        background: expenseChange < 0 ? `${THEME.secondary}15` : `${THEME.destructive}15`,
                      }}
                    >
                      {expenseChange > 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                      {Math.abs(expenseChange)}%
                    </span>
                  )}
                </div>
              </div>
            </div>
      </CardContent>
    </Card>
  );
}
