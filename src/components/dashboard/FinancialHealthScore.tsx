'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Lightbulb, TrendingUp, Calendar, Target, Zap, ChevronLeft, ChevronRight, X } from 'lucide-react';
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

interface Tip {
  title: string;
  description: string;
  severity: 'good' | 'warning' | 'danger' | 'info';
}

export function FinancialHealthScore() {
  const { t } = useTranslation();
  const { formatAmount } = useCurrencyFormat();
  const [data, setData] = useState<DashboardData | null>(null);
  const [animatedScore, setAnimatedScore] = useState(0);
  const [showTipsDialog, setShowTipsDialog] = useState(false);
  const [currentTipIndex, setCurrentTipIndex] = useState(0);

  useEffect(() => {
    fetch('/api/dashboard')
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch');
        return res.json();
      })
      .then(json => {
        setData(json);
      })
      .catch(() => {
        // Silently fail — component will show loading state or default values
      });
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
  const generateTips = (): Tip[] => {
    const tips: Tip[] = [];
    const savingsRate = data.totalIncome > 0 ? ((data.totalIncome - data.totalExpense) / data.totalIncome) * 100 : 0;

    if (savingsRate < 20) {
      tips.push({
        title: t('dashboard.healthTipSavingsRateLowTitle') || 'Savings Rate Low',
        description: t('dashboard.healthTipSavingsRateLow', { rate: savingsRate.toFixed(1) }),
        severity: 'warning',
      });
    } else {
      tips.push({
        title: t('dashboard.healthTipSavingsRateGoodTitle') || 'Good Savings Rate',
        description: t('dashboard.healthTipSavingsRateGood', { rate: savingsRate.toFixed(1) }),
        severity: 'good',
      });
    }

    if (breakdown.consistencyScore < 15) {
      tips.push({
        title: t('dashboard.healthTipConsistencyLowTitle') || 'Inconsistent Savings',
        description: t('dashboard.healthTipConsistencyLow'),
        severity: 'danger',
      });
    } else {
      tips.push({
        title: t('dashboard.healthTipConsistencyGoodTitle') || 'Consistent Savings',
        description: t('dashboard.healthTipConsistencyGood'),
        severity: 'good',
      });
    }

    if (breakdown.targetProgressScore < 15) {
      tips.push({
        title: t('dashboard.healthTipTargetProgressLowTitle') || 'Savings Targets Behind',
        description: t('dashboard.healthTipTargetProgressLow'),
        severity: 'warning',
      });
    }

    if (breakdown.growthScore < 15) {
      tips.push({
        title: t('dashboard.healthTipGrowthLowTitle') || 'Slow Financial Growth',
        description: t('dashboard.healthTipGrowthLow'),
        severity: 'warning',
      });
    }

    if (data.totalExpense > data.totalIncome) {
      tips.push({
        title: t('dashboard.healthTipOverspendingTitle') || 'Overspending Alert',
        description: t('dashboard.healthTipOverspending', { amount: formatAmount(data.totalExpense - data.totalIncome) }),
        severity: 'danger',
      });
    }

    if (tips.length === 0) {
      tips.push({
        title: t('dashboard.healthTipExcellentTitle') || 'Excellent Financial Health',
        description: t('dashboard.healthTipExcellent'),
        severity: 'good',
      });
    }

    return tips;
  };

  const tips = generateTips();

  const handleViewTips = () => {
    setCurrentTipIndex(0);
    setShowTipsDialog(true);
  };

  const handlePrevTip = () => {
    setCurrentTipIndex((prev) => (prev > 0 ? prev - 1 : tips.length - 1));
  };

  const handleNextTip = () => {
    setCurrentTipIndex((prev) => (prev < tips.length - 1 ? prev + 1 : 0));
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

  const getSeverityStyle = (severity: Tip['severity']) => {
    switch (severity) {
      case 'good': return { color: THEME.secondary, bgColor: 'rgba(3,218,198,0.12)', label: 'Good' };
      case 'warning': return { color: THEME.warning, bgColor: 'rgba(249,168,37,0.12)', label: 'Warning' };
      case 'danger': return { color: THEME.destructive, bgColor: 'rgba(207,102,121,0.12)', label: 'Alert' };
      case 'info': return { color: THEME.primary, bgColor: 'rgba(187,134,252,0.12)', label: 'Info' };
    }
  };

  return (
    <>
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

      {/* Tips Dialog Carousel */}
      <Dialog open={showTipsDialog} onOpenChange={setShowTipsDialog}>
        <DialogContent
          showCloseButton={false}
          className="max-w-[calc(100vw-2rem)] sm:max-w-md p-0 overflow-hidden rounded-2xl border-0 max-h-[85dvh] flex flex-col"
          style={{
            background: '#141414',
            border: '1px solid rgba(255,255,255,0.08)',
            boxShadow: '0 24px 64px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04)',
          }}
        >
          <DialogHeader className="sr-only">
            <DialogTitle>{t('dashboard.healthScoreViewTips')}</DialogTitle>
            <DialogDescription>Financial health tips and recommendations</DialogDescription>
          </DialogHeader>

          {/* Close button (X) in top-right corner */}
          <button
            onClick={() => setShowTipsDialog(false)}
            className="absolute top-3 right-3 z-10 grid place-items-center h-7 w-7 rounded-lg transition-all hover:bg-white/10 active:scale-90"
            style={{ color: THEME.muted }}
          >
            <X className="h-4 w-4" />
          </button>

          <div className="flex flex-col h-full p-0">
            {/* Header: Tip counter */}
            <div className="shrink-0 px-5 pt-5 pb-0">
              <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg grid place-items-center" style={{ background: `${scoreColor}15` }}>
                  <Lightbulb className="h-3.5 w-3.5" style={{ color: scoreColor }} />
                </div>
                <span className="text-sm font-semibold" style={{ color: THEME.text }}>
                  {t('dashboard.healthScoreViewTips')}
                </span>
              </div>
              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full" style={{ background: 'rgba(255,255,255,0.06)', color: THEME.muted }}>
                {currentTipIndex + 1} / {tips.length}
              </span>
            </div>
            </div>

            {/* Scrollable Tip Card Content */}
            <div className="flex-1 overflow-y-auto px-5 py-4 min-h-0">
            {tips.length > 0 && (
              <div
                className="rounded-xl p-4 transition-all duration-300"
                style={{
                  background: 'rgba(255,255,255,0.02)',
                  border: `1px solid ${THEME.border}`,
                }}
              >
                <div className="flex items-start gap-3">
                  <div
                    className="shrink-0 grid place-items-center w-9 h-9 rounded-lg"
                    style={{ background: getSeverityStyle(tips[currentTipIndex].severity).bgColor }}
                  >
                    <Lightbulb className="h-4 w-4" style={{ color: getSeverityStyle(tips[currentTipIndex].severity).color }} />
                  </div>
                  <div className="flex-1 min-w-0 overflow-hidden">
                    <div className="flex items-center gap-2 mb-1 min-w-0">
                      <span className="text-xs font-semibold break-words overflow-wrap-anywhere" style={{ color: THEME.text }}>
                        {tips[currentTipIndex].title}
                      </span>
                      <span
                        className="text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0"
                        style={{
                          background: getSeverityStyle(tips[currentTipIndex].severity).bgColor,
                          color: getSeverityStyle(tips[currentTipIndex].severity).color,
                        }}
                      >
                        {getSeverityStyle(tips[currentTipIndex].severity).label}
                      </span>
                    </div>
                    <p className="text-[11px] leading-relaxed break-words overflow-wrap-anywhere" style={{ color: THEME.textSecondary }}>
                      {tips[currentTipIndex].description}
                    </p>
                  </div>
                </div>
              </div>
            )}
            </div>

            {/* Footer: Navigation + Got it */}
            <div className="shrink-0 px-5 pb-5 pt-0">
            {tips.length > 1 && (
              <div className="flex items-center justify-between">
                <button
                  onClick={handlePrevTip}
                  className="grid place-items-center h-8 w-8 rounded-lg transition-all hover:bg-white/10 active:scale-90"
                  style={{ background: 'rgba(255,255,255,0.04)', color: THEME.textSecondary }}
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>

                {/* Dot indicators */}
                <div className="flex items-center gap-1.5">
                  {tips.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setCurrentTipIndex(i)}
                      className="h-1.5 rounded-full transition-all duration-300"
                      style={{
                        width: i === currentTipIndex ? '16px' : '6px',
                        background: i === currentTipIndex ? scoreColor : 'rgba(255,255,255,0.12)',
                      }}
                    />
                  ))}
                </div>

                <button
                  onClick={handleNextTip}
                  className="grid place-items-center h-8 w-8 rounded-lg transition-all hover:bg-white/10 active:scale-90"
                  style={{ background: 'rgba(255,255,255,0.04)', color: THEME.textSecondary }}
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}

            {/* Got it button */}
            <Button
              onClick={() => setShowTipsDialog(false)}
              variant="ghost"
              className="w-full mt-4 rounded-xl text-xs font-medium transition-all hover:scale-[1.01] active:scale-[0.99]"
              style={{
                background: `${scoreColor}10`,
                color: scoreColor,
                border: `1px solid ${scoreColor}20`,
              }}
            >
              {t('common.close')}
            </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
