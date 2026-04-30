'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  ArrowUp,
  ArrowDown,
  Minus,
  Gauge,
} from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';
import { useCurrencyFormat } from '@/hooks/useCurrencyFormat';

// ── Theme ─────────────────────────────────────────────────────────
const THEME = {
  bg: '#000000',
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

// ── Momentum Badge Config ─────────────────────────────────────────
const MOMENTUM_CONFIG = {
  accelerating: {
    color: THEME.secondary,
    bg: `${THEME.secondary}18`,
    label: 'Accelerating',
  },
  stable: {
    color: THEME.warning,
    bg: `${THEME.warning}18`,
    label: 'Stable',
  },
  slowing: {
    color: THEME.destructive,
    bg: `${THEME.destructive}18`,
    label: 'Slowing',
  },
} as const;

// ── Savings Rate Color Logic ──────────────────────────────────────
function getSavingsBarColor(rate: number): string {
  if (rate >= 20) return THEME.secondary;
  if (rate >= 10) return THEME.warning;
  return THEME.destructive;
}

// ── Props ─────────────────────────────────────────────────────────
interface CashFlowSummaryProps {
  totalIncome: number;
  totalExpense: number;
  balance: number;
  savingsRate: number;
  last7DaysGrowth: number;
  momentumIndicator: 'accelerating' | 'stable' | 'slowing';
}

// ── Component ─────────────────────────────────────────────────────
export function CashFlowSummary({
  totalIncome,
  totalExpense,
  balance,
  savingsRate,
  last7DaysGrowth,
  momentumIndicator,
}: CashFlowSummaryProps) {
  const { t } = useTranslation();
  const { formatAmount } = useCurrencyFormat();
  const [barReady, setBarReady] = useState(false);

  useEffect(() => {
    const id = setTimeout(() => setBarReady(true), 300);
    return () => clearTimeout(id);
  }, []);

  const isPositive = balance >= 0;
  const balanceColor = isPositive ? THEME.secondary : THEME.destructive;
  const savingsBarColor = getSavingsBarColor(savingsRate);
  const momentum = MOMENTUM_CONFIG[momentumIndicator];

  const GrowthIcon =
    last7DaysGrowth > 0 ? ArrowUp : last7DaysGrowth < 0 ? ArrowDown : Minus;
  const growthColor =
    last7DaysGrowth > 0
      ? THEME.secondary
      : last7DaysGrowth < 0
        ? THEME.destructive
        : THEME.muted;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 420, damping: 28 }}
      whileHover={{ scale: 1.015, y: -2 }}
      whileTap={{ scale: 0.98 }}
      className="active:scale-[0.98] cursor-pointer"
      style={{
        background: 'bg-white/[0.02]',
      }}
    >
      <div
        className="rounded-2xl p-4 sm:p-5"
        style={{
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(255,255,255,0.06)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
        }}
      >
        {/* ── Header ─────────────────────────────────────────── */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div
              className="w-7 h-7 rounded-lg grid place-items-center"
              style={{ background: `${THEME.primary}14` }}
            >
              <TrendingUp
                className="h-3.5 w-3.5"
                style={{ color: THEME.primary }}
              />
            </div>
            <h3
              className="text-sm font-semibold"
              style={{ color: THEME.text }}
            >
              {t('dashboard.cashFlow')}
            </h3>
          </div>

          <span
            className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-semibold px-2 py-0.5 rounded-full"
            style={{ color: momentum.color, background: momentum.bg }}
          >
            <Gauge className="h-2.5 w-2.5" />
            {momentum.label}
          </span>
        </div>

        {/* ── Main Balance ───────────────────────────────────── */}
        <div className="mb-4">
          <p
            className="text-[10px] sm:text-[11px] uppercase tracking-wider mb-1"
            style={{ color: THEME.muted }}
          >
            {t('dashboard.netCashFlow')}
          </p>
          <p
            className="text-2xl sm:text-3xl font-bold tabular-nums tracking-tight"
            style={{ color: balanceColor }}
          >
            {isPositive ? '+' : ''}
            {formatAmount(balance)}
          </p>
        </div>

        {/* ── Income / Expense Row ───────────────────────────── */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          {/* Income */}
          <div
            className="flex items-center gap-2 p-2.5 rounded-xl"
            style={{ background: `${THEME.secondary}08` }}
          >
            <div
              className="w-7 h-7 rounded-lg grid place-items-center shrink-0"
              style={{ background: `${THEME.secondary}18` }}
            >
              <ArrowUpRight
                className="h-3.5 w-3.5"
                style={{ color: THEME.secondary }}
              />
            </div>
            <div className="min-w-0">
              <p
                className="text-[10px] sm:text-[11px] truncate"
                style={{ color: THEME.muted }}
              >
                {t('dashboard.income')}
              </p>
              <p
                className="text-xs sm:text-sm font-bold tabular-nums truncate"
                style={{ color: THEME.secondary }}
              >
                {formatAmount(totalIncome)}
              </p>
            </div>
          </div>

          {/* Expense */}
          <div
            className="flex items-center gap-2 p-2.5 rounded-xl"
            style={{ background: `${THEME.destructive}08` }}
          >
            <div
              className="w-7 h-7 rounded-lg grid place-items-center shrink-0"
              style={{ background: `${THEME.destructive}18` }}
            >
              <ArrowDownRight
                className="h-3.5 w-3.5"
                style={{ color: THEME.destructive }}
              />
            </div>
            <div className="min-w-0">
              <p
                className="text-[10px] sm:text-[11px] truncate"
                style={{ color: THEME.muted }}
              >
                {t('dashboard.expense')}
              </p>
              <p
                className="text-xs sm:text-sm font-bold tabular-nums truncate"
                style={{ color: THEME.destructive }}
              >
                {formatAmount(totalExpense)}
              </p>
            </div>
          </div>
        </div>

        {/* ── Savings Rate Bar ───────────────────────────────── */}
        <div className="mb-3">
          <div className="flex items-center justify-between mb-1.5">
            <span
              className="text-[10px] sm:text-[11px] font-medium uppercase tracking-wider"
              style={{ color: THEME.muted }}
            >
              {t('dashboard.savingsRate')}
            </span>
            <span
              className="text-[11px] sm:text-xs font-bold tabular-nums"
              style={{ color: savingsBarColor }}
            >
              {savingsRate.toFixed(1)}%
            </span>
          </div>
          <div
            className="h-1.5 rounded-full overflow-hidden"
            style={{ background: THEME.border }}
          >
            <motion.div
              className="h-full rounded-full"
              initial={{ width: 0 }}
              animate={{
                width: barReady ? `${Math.min(savingsRate, 100)}%` : '0%',
              }}
              transition={{ duration: 0.8, ease: 'easeOut', delay: 0.2 }}
              style={{ background: savingsBarColor }}
            />
          </div>
        </div>

        {/* ── 7-Day Growth ───────────────────────────────────── */}
        <div className="flex items-center justify-between">
          <span
            className="text-[10px] sm:text-[11px]"
            style={{ color: THEME.textSecondary }}
          >
            {t('dashboard.last7DaysGrowth') ?? '7D Growth'}
          </span>
          <span
            className="inline-flex items-center gap-0.5 text-[11px] sm:text-xs font-semibold tabular-nums"
            style={{ color: growthColor }}
          >
            <GrowthIcon className="h-3 w-3" />
            {last7DaysGrowth > 0 ? '+' : ''}
            {last7DaysGrowth.toFixed(1)}%
          </span>
        </div>
      </div>
    </motion.div>
  );
}
