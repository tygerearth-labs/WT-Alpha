'use client';

import { Card, CardContent } from '@/components/ui/card';
import { useTranslation } from '@/hooks/useTranslation';
import { useCurrencyFormat } from '@/hooks/useCurrencyFormat';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

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

  const getMomentumText = () => {
    if (momentumIndicator === 'accelerating') {
      return t('dashboard.accelerating');
    } else if (momentumIndicator === 'slowing') {
      return t('dashboard.slowing');
    }
    return t('dashboard.stable');
  };

  return (
    <Card className="border-border bg-card overflow-hidden">
      <CardContent className="p-6 space-y-4">
        {/* Label */}
        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground">
            {t('dashboard.netWorth')}
          </p>
        </div>

        {/* Main Value */}
        <div className="space-y-2">
          <p className="text-4xl md:text-5xl font-bold tracking-tight">
            {formatAmount(totalSavings)}
          </p>
          <p className="text-sm text-muted-foreground">
            {t('dashboard.youAreGrowing')}
          </p>
        </div>

        {/* Growth Indicator */}
        <div className="flex items-center gap-2 pt-2 border-t border-border">
          <div className={`flex items-center gap-1.5 ${getGrowthColor()}`}>
            {getGrowthIcon()}
            <span className="text-sm font-semibold">
              {formatAmount(Math.abs(last30DaysGrowth))} {t('dashboard.in30Days')}
            </span>
          </div>
          {last30DaysGrowth !== 0 && (
            <span className="text-xs text-muted-foreground">
              ({growthPercentage.toFixed(1)}%)
            </span>
          )}
        </div>

        {/* Momentum Status */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">
            {getMomentumText()}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
