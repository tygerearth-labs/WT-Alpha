'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Lightbulb, TrendingUp, Calendar, Target, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from '@/hooks/useTranslation';
import { useCurrencyFormat } from '@/hooks/useCurrencyFormat';

const THEME = {
  surface: '#121212',
  primary: '#BB86FC',
  secondary: '#03DAC6',
  destructive: '#CF6679',
  warning: '#F9A825',
  muted: '#9E9E9E',
  border: 'rgba(255,255,255,0.06)',
  text: '#FFFFFF',
  textSecondary: '#B3B3B3',
};

interface DashboardData {
  totalIncome: number;
  totalExpense: number;
  financialHealthScore: number;
  healthBreakdown?: {
    savingsRateScore: number;
    consistencyScore: number;
    targetProgressScore: number;
    growthScore: number;
  };
  monthlyTrends?: Array<{
    savings: number;
    transactionCount: number;
  }>;
  savingsTargets?: Array<{
    targetAmount: number;
    currentAmount: number;
  }>;
}

export function FinancialHealthScore() {
  const { t } = useTranslation();
  const { formatAmount } = useCurrencyFormat();
  const [data, setData] = useState<DashboardData | null>(null);
  const [animatedScore, setAnimatedScore] = useState(0);

  useEffect(() => {
    fetch('/api/dashboard')
      .then(res => res.json())
      .then(json => {
        setData(json);
      })
      .catch(() => {});
  }, []);

  // Animate score on mount
  useEffect(() => {
    if (!data?.financialHealthScore && data?.financialHealthScore !== 0) return;
    const target = data!.financialHealthScore;
    let current = 0;
    const step = target / 40;
    const interval = setInterval(() => {
      current += step;
      if (current >= target) {
        setAnimatedScore(target);
        clearInterval(interval);
      } else {
        setAnimatedScore(Math.round(current));
      }
    }, 25);
    return () => clearInterval(interval);
  }, [data?.financialHealthScore]);

  if (!data) {
    return (
      <div className="rounded-xl p-4 sm:p-6" style={{ background: THEME.surface, border: `1px solid ${THEME.border}` }}>
        <div className="flex items-center justify-center h-48">
          <div className="w-12 h-12 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: THEME.border, borderTopColor: 'transparent' }} />
        </div>
      </div>
    );
  }

  const score = data.financialHealthScore;
  const breakdown = data.healthBreakdown || { savingsRateScore: 0, consistencyScore: 0, targetProgressScore: 0, growthScore: 0 };

  // Color based on score
  const scoreColor = score >= 70 ? THEME.secondary : score >= 40 ? THEME.warning : THEME.destructive;
  const scoreLabel = score >= 70 ? t('dashboard.healthScoreHealthy') : score >= 40 ? t('dashboard.healthScoreFair') : t('dashboard.healthScoreNeedsAttention');

  // Calculate tips based on data
  const generateTips = () => {
    const tips: string[] = [];
    const savingsRate = data.totalIncome > 0 ? ((data.totalIncome - data.totalExpense) / data.totalIncome) * 100 : 0;

    if (savingsRate < 20) {
      tips.push(t('dashboard.healthTipSavingsRateLow', { rate: savingsRate.toFixed(1) }));
    } else {
      tips.push(t('dashboard.healthTipSavingsRateGood', { rate: savingsRate.toFixed(1) }));
    }

    if (breakdown.consistencyScore < 15) {
      tips.push(t('dashboard.healthTipConsistencyLow'));
    } else {
      tips.push(t('dashboard.healthTipConsistencyGood'));
    }

    if (breakdown.targetProgressScore < 15) {
      tips.push(t('dashboard.healthTipTargetProgressLow'));
    }

    if (breakdown.growthScore < 15) {
      tips.push(t('dashboard.healthTipGrowthLow'));
    }

    if (data.totalExpense > data.totalIncome) {
      tips.push(t('dashboard.healthTipOverspending', { amount: formatAmount(data.totalExpense - data.totalIncome) }));
    }

    if (tips.length === 0) {
      tips.push(t('dashboard.healthTipExcellent'));
    }

    return tips;
  };

  const handleViewTips = () => {
    const tips = generateTips();
    tips.forEach((tip, i) => {
      setTimeout(() => {
        toast.info(tip, {
          duration: 6000,
          icon: <Lightbulb className="h-4 w-4" style={{ color: THEME.warning }} />,
        });
      }, i * 300);
    });
  };

  // SVG ring
  const radius = 54;
  const stroke = 8;
  const normalizedRadius = radius - stroke / 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const offset = circumference - (animatedScore / 100) * circumference;

  const factors = [
    { label: t('dashboard.savingsRate'), score: breakdown.savingsRateScore, max: 25, icon: TrendingUp },
    { label: t('dashboard.consistency'), score: breakdown.consistencyScore, max: 25, icon: Calendar },
    { label: t('dashboard.targetProgress'), score: breakdown.targetProgressScore, max: 25, icon: Target },
    { label: t('dashboard.growth'), score: breakdown.growthScore, max: 25, icon: Zap },
  ];

  return (
    <div
      className="rounded-xl overflow-hidden relative group"
      style={{ background: THEME.surface, border: `1px solid ${THEME.border}` }}
    >
      {/* Subtle glow */}
      <div
        className="absolute -top-8 -right-8 w-24 h-24 rounded-full blur-3xl opacity-10 pointer-events-none"
        style={{ background: scoreColor }}
      />

      <div className="p-4 sm:p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg grid place-items-center [&>*]:block leading-none" style={{ background: `${scoreColor}15` }}>
              <Zap className="h-3.5 w-3.5" style={{ color: scoreColor }} />
            </div>
            <h3 className="text-sm font-semibold" style={{ color: THEME.text }}>{t('dashboard.healthScoreTitle')}</h3>
          </div>
          <span
            className="text-[10px] font-bold px-2 py-0.5 rounded-full"
            style={{ background: `${scoreColor}15`, color: scoreColor }}
          >
            {scoreLabel}
          </span>
        </div>

        {/* Ring + Factors */}
        <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
          {/* Animated Ring */}
          <div className="relative shrink-0">
            <svg height={radius * 2} width={radius * 2} className="-rotate-90">
              <circle
                stroke={THEME.border}
                fill="transparent"
                strokeWidth={stroke}
                r={normalizedRadius}
                cx={radius}
                cy={radius}
              />
              <circle
                stroke={scoreColor}
                fill="transparent"
                strokeWidth={stroke}
                strokeLinecap="round"
                strokeDasharray={circumference + ' ' + circumference}
                style={{
                  strokeDashoffset: offset,
                  transition: 'stroke-dashoffset 0.8s ease-out',
                  filter: `drop-shadow(0 0 6px ${scoreColor}40)`,
                }}
                r={normalizedRadius}
                cx={radius}
                cy={radius}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-bold tabular-nums" style={{ color: scoreColor }}>
                {animatedScore}
              </span>
              <span className="text-[10px] font-medium" style={{ color: THEME.muted }}>/100</span>
            </div>
          </div>

          {/* Breakdown Factors */}
          <div className="flex-1 w-full space-y-2.5 min-w-0">
            {factors.map((f) => (
              <div key={f.label} className="space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <f.icon className="h-3 w-3" style={{ color: THEME.muted }} />
                    <span className="text-[11px] font-medium" style={{ color: THEME.textSecondary }}>
                      {f.label}
                    </span>
                  </div>
                  <span className="text-[11px] font-bold tabular-nums" style={{ color: THEME.text }}>
                    {f.score}/{f.max}
                  </span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: THEME.border }}>
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${(f.score / f.max) * 100}%`,
                      background: `linear-gradient(90deg, ${THEME.primary}, ${scoreColor})`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* View Tips Button */}
        <Button
          onClick={handleViewTips}
          variant="ghost"
          className="w-full mt-4 rounded-xl text-xs font-medium transition-all hover:scale-[1.01] active:scale-[0.99]"
          style={{
            background: `${scoreColor}10`,
            color: scoreColor,
            border: `1px solid ${scoreColor}20`,
          }}
        >
          <Lightbulb className="h-3.5 w-3.5 mr-1.5" />
          {t('dashboard.healthScoreViewTips')}
        </Button>
      </div>
    </div>
  );
}
