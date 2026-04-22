'use client';

import { Card, CardContent } from '@/components/ui/card';
import { useTranslation } from '@/hooks/useTranslation';
import { useCurrencyFormat } from '@/hooks/useCurrencyFormat';
import { TrendingUp, TrendingDown, Minus, Sparkles } from 'lucide-react';

interface HeroCardProps {
  totalSavings: number;
  last30DaysGrowth: number;
  momentumIndicator: 'accelerating' | 'stable' | 'slowing';
}

export function HeroCard({ totalSavings, last30DaysGrowth, momentumIndicator }: HeroCardProps) {
  const { t } = useTranslation();
  const { formatAmount } = useCurrencyFormat();
  const growthPercentage = totalSavings > 0
    ? (last30DaysGrowth / totalSavings) * 100
    : 0;

  const getGrowthIcon = () => {
    if (momentumIndicator === 'accelerating') {
      return <TrendingUp className="h-5 w-5" />;
    } else if (momentumIndicator === 'slowing') {
      return <TrendingDown className="h-5 w-5" />;
    }
    return <Minus className="h-5 w-5" />;
  };

  const getGrowthColor = () => {
    if (momentumIndicator === 'accelerating') {
      return 'text-emerald-500';
    } else if (momentumIndicator === 'slowing') {
      return 'text-amber-500';
    }
    return 'text-slate-500';
  };

  const getGrowthAccent = () => {
    if (momentumIndicator === 'accelerating') {
      return '#03DAC6';
    } else if (momentumIndicator === 'slowing') {
      return '#F9A825';
    }
    return '#9E9E9E';
  };

  const getMomentumText = () => {
    if (momentumIndicator === 'accelerating') {
      return t('dashboard.accelerating');
    } else if (momentumIndicator === 'slowing') {
      return t('dashboard.slowing');
    }
    return t('dashboard.stable');
  };

  return (
    <div className="relative group/hero">
      {/* Animated gradient border wrapper */}
      <div
        className="absolute -inset-[1px] rounded-xl opacity-60 group-hover/hero:opacity-100 transition-opacity duration-500"
        style={{
          background: `linear-gradient(135deg, #BB86FC 0%, #03DAC6 25%, #BB86FC 50%, #03DAC6 75%, #BB86FC 100%)`,
          backgroundSize: '300% 300%',
          animation: 'gradientBorderRotate 6s ease-in-out infinite',
        }}
      />
      {/* Outer glow on hover */}
      <div
        className="absolute -inset-[2px] rounded-xl opacity-0 group-hover/hero:opacity-30 blur-sm transition-opacity duration-500"
        style={{
          background: `linear-gradient(135deg, #BB86FC, #03DAC6)`,
        }}
      />
      <Card className="relative border-0 bg-[#121212] overflow-hidden">
        {/* Internal gradient atmosphere */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse at 20% 0%, rgba(187,134,252,0.06) 0%, transparent 50%), radial-gradient(ellipse at 80% 100%, rgba(3,218,198,0.04) 0%, transparent 50%)',
          }}
        />
        <CardContent className="relative p-6 space-y-4">
          {/* Label with sparkle */}
          <div className="space-y-1 flex items-center gap-2">
            <Sparkles className="h-3.5 w-3.5 text-[#BB86FC]/50" />
            <p className="text-sm font-medium text-muted-foreground">
              {t('dashboard.netWorth')}
            </p>
          </div>

          {/* Main Value with improved typography */}
          <div className="space-y-2">
            <p className="text-4xl md:text-5xl font-extrabold tracking-tight bg-clip-text text-transparent leading-tight"
              style={{
                backgroundImage: 'linear-gradient(135deg, #FFFFFF 0%, #E6E1E5 40%, #BB86FC 100%)',
              }}
            >
              {formatAmount(totalSavings)}
            </p>
            <p className="text-sm text-muted-foreground/70">
              {t('dashboard.youAreGrowing')}
            </p>
          </div>

          {/* Growth Indicator with pill badge */}
          <div className="flex items-center gap-3 pt-2 border-t border-white/[0.06]">
            <div
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full ${getGrowthColor()}`}
              style={{ background: `${getGrowthAccent()}12` }}
            >
              {getGrowthIcon()}
              <span className="text-sm font-semibold">
                {formatAmount(Math.abs(last30DaysGrowth))} {t('dashboard.in30Days')}
              </span>
            </div>
            {last30DaysGrowth !== 0 && (
              <span
                className="text-xs font-medium px-2 py-0.5 rounded-full"
                style={{ color: getGrowthAccent(), background: `${getGrowthAccent()}10` }}
              >
                {growthPercentage.toFixed(1)}%
              </span>
            )}
          </div>

          {/* Momentum Status with animated indicator */}
          <div className="flex items-center gap-2">
            <div
              className="w-2 h-2 rounded-full"
              style={{
                background: getGrowthAccent(),
                boxShadow: `0 0 6px ${getGrowthAccent()}50`,
                animation: 'pulseGlow 2.5s ease-in-out infinite',
              }}
            />
            <span className="text-sm font-medium" style={{ color: getGrowthAccent() }}>
              {getMomentumText()}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
