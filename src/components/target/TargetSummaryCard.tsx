'use client';

import { SavingsTarget } from '@/types/transaction.types';
import { useTranslation } from '@/hooks/useTranslation';
import { useCurrencyFormat } from '@/hooks/useCurrencyFormat';

// ── Theme ──
const T = {
  bg: '#121212',
  primary: '#BB86FC',
  secondary: '#03DAC6',
  destructive: '#CF6679',
  warning: '#F9A825',
  muted: '#9E9E9E',
  border: 'rgba(255,255,255,0.06)',
  text: '#E6E1E5',
  textSub: '#B3B3B3',
} as const;

interface Props {
  savingsTargets: SavingsTarget[];
}

export function TargetSummaryCard({ savingsTargets }: Props) {
  const { t } = useTranslation();
  const { formatAmount } = useCurrencyFormat();
  const activeTargets = savingsTargets.filter(t => t.targetAmount > t.currentAmount);
  const totalTarget = savingsTargets.reduce((s, t) => s + t.targetAmount, 0);
  const totalCurrent = savingsTargets.reduce((s, t) => s + t.currentAmount, 0);
  const totalRemaining = totalTarget - totalCurrent;
  const overallPct = totalTarget > 0 ? (totalCurrent / totalTarget) * 100 : 0;

  const totalMonthlyTarget = savingsTargets.reduce((s, t) => s + t.monthlyContribution, 0);
  const totalMonthlyActual = savingsTargets.reduce((s, t) => s + (t.currentMonthlyAllocation || 0), 0);
  const monthlyPct = totalMonthlyTarget > 0 ? (totalMonthlyActual / totalMonthlyTarget) * 100 : 0;

  const healthy = savingsTargets.filter(t => t.metrics?.targetStatus === 'healthy').length;
  const warning = savingsTargets.filter(t => t.metrics?.targetStatus === 'warning').length;
  const critical = savingsTargets.filter(t => t.metrics?.targetStatus === 'critical').length;

  // Ring
  const radius = 38;
  const stroke = 6;
  const norm = radius - stroke / 2;
  const circ = norm * 2 * Math.PI;
  const offset = circ - (Math.min(overallPct, 100) / 100) * circ;
  const ringColor = overallPct >= 80 ? T.secondary : overallPct >= 50 ? T.primary : overallPct >= 25 ? T.warning : T.destructive;

  return (
    <div
      className="rounded-2xl p-4 sm:p-5 relative overflow-hidden"
      style={{
        background: `linear-gradient(135deg, ${T.primary}08 0%, ${T.bg} 50%, ${T.secondary}06 100%)`,
        border: `1px solid ${T.border}`,
      }}
    >
      {/* Subtle glow */}
      <div
        className="absolute -top-20 -right-20 w-40 h-40 rounded-full opacity-20 blur-3xl pointer-events-none"
        style={{ background: T.primary }}
      />

      <div className="flex items-center gap-4 sm:gap-6 relative">
        {/* Progress Ring */}
        <div className="relative shrink-0">
          <svg width={radius * 2} height={radius * 2} className="-rotate-90">
            <circle stroke={T.border} fill="transparent" strokeWidth={stroke} r={norm} cx={radius} cy={radius} />
            <circle
              stroke={ringColor}
              fill="transparent"
              strokeWidth={stroke}
              strokeLinecap="round"
              strokeDasharray={circ + ' ' + circ}
              style={{ strokeDashoffset: offset, transition: 'stroke-dashoffset 1s ease-out' }}
              r={norm} cx={radius} cy={radius}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-lg sm:text-xl font-bold" style={{ color: ringColor }}>
              {(overallPct || 0).toFixed(0)}%
            </span>
            <span className="text-[8px] uppercase tracking-wider" style={{ color: T.muted }}>{t('target.overall')}</span>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="flex-1 min-w-0 grid grid-cols-3 gap-x-3 gap-y-2 sm:gap-y-3">
          {/* Terkumpul */}
          <div className="min-w-0">
            <p className="text-[9px] uppercase tracking-wider truncate" style={{ color: T.muted }}>{t('target.collected')}</p>
            <p className="text-sm sm:text-base font-bold truncate" style={{ color: T.text }}>
              {formatAmount(totalCurrent)}
            </p>
          </div>
          {/* Kurang */}
          <div className="min-w-0">
            <p className="text-[9px] uppercase tracking-wider truncate" style={{ color: T.muted }}>{t('target.remaining')}</p>
            <p className="text-sm sm:text-base font-bold truncate" style={{ color: T.destructive }}>
              {formatAmount(Math.max(0, totalRemaining))}
            </p>
          </div>
          {/* Monthly */}
          <div className="min-w-0">
            <p className="text-[9px] uppercase tracking-wider truncate" style={{ color: T.muted }}>{t('target.monthly')}</p>
            <p className="text-sm sm:text-base font-bold truncate" style={{ color: T.text }}>
              {(monthlyPct || 0).toFixed(0)}%
            </p>
          </div>
        </div>

        {/* Status dots */}
        <div className="hidden sm:flex flex-col items-center gap-1.5 shrink-0 pl-2 border-l" style={{ borderColor: T.border }}>
          {healthy > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full" style={{ background: T.secondary }} />
              <span className="text-xs font-medium" style={{ color: T.secondary }}>{healthy}</span>
            </div>
          )}
          {warning > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full" style={{ background: T.warning }} />
              <span className="text-xs font-medium" style={{ color: T.warning }}>{warning}</span>
            </div>
          )}
          {critical > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full" style={{ background: T.destructive }} />
              <span className="text-xs font-medium" style={{ color: T.destructive }}>{critical}</span>
            </div>
          )}
          <p className="text-[9px]" style={{ color: T.muted }}>{t('target.activeCount', { count: activeTargets.length })}</p>
        </div>
      </div>
    </div>
  );
}
