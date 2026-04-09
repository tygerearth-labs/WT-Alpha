'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useTranslation } from '@/hooks/useTranslation';
import { useCurrencyFormat } from '@/hooks/useCurrencyFormat';
import { Stage, getProgressToNextStage } from '@/components/cards/types';

interface NextLevelCardProps {
  totalSavings: number;
  currentStage: Stage;
  nextStage: Stage | null;
}

export function NextLevelCard({ totalSavings, currentStage, nextStage }: NextLevelCardProps) {
  const { t } = useTranslation();
  const { formatAmount } = useCurrencyFormat();

  const progressToNext = getProgressToNextStage(totalSavings, currentStage);

  // Calculate estimated months to next phase
  const amountNeeded = nextStage ? nextStage.range[0] - totalSavings : 0;
  const last30DaysGrowth = 0;
  const monthlyGrowthEstimate = last30DaysGrowth;
  const estimatedMonths = monthlyGrowthEstimate > 0 && amountNeeded > 0
    ? Math.ceil(amountNeeded / monthlyGrowthEstimate)
    : null;

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {/* Current Phase */}
      <Card className="border-border bg-card">
        <CardContent className="p-6 space-y-3">
          {/* Badge */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-2 py-1 bg-primary/10 text-primary rounded">
              {t('dashboard.active')}
            </span>
          </div>

          {/* Title */}
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">{t('dashboard.currentPhase')}</p>
            <div className="flex items-center gap-2">
              <span className="text-2xl">{currentStage.emoji}</span>
              <h3 className="text-xl font-bold">{currentStage.name}</h3>
            </div>
          </div>

          {/* Subtitle */}
          <p className="text-sm text-muted-foreground">
            {currentStage.focus}
          </p>

          {/* Current Stage Progress */}
          {nextStage && (
            <div className="pt-2 space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">{t('dashboard.progress')}</span>
                <span className="font-medium">{progressToNext.toFixed(0)}%</span>
              </div>
              <Progress value={progressToNext} className="h-2" />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Next Phase */}
      {nextStage ? (
        <Card className="border-border bg-card">
          <CardContent className="p-6 space-y-3">
            {/* Badge */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold px-2 py-1 bg-primary/5 text-primary/70 rounded">
                {t('dashboard.next')}
              </span>
            </div>

            {/* Title */}
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">{t('dashboard.nextLevel')}</p>
              <div className="flex items-center gap-2">
                <span className="text-2xl">{nextStage.emoji}</span>
                <h3 className="text-xl font-bold">{nextStage.name}</h3>
              </div>
            </div>

            {/* Target */}
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">{t('dashboard.target')}</p>
              <p className="text-sm font-semibold">
                {formatAmount(nextStage.range[0])}
              </p>
            </div>

            {/* Progress Info */}
            <div className="pt-2 space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">{t('dashboard.youAre')}</span>
                <span className="font-medium">{progressToNext.toFixed(0)}% {t('dashboard.there')}</span>
              </div>
              <Progress value={progressToNext} className="h-2" />

              {/* Estimated Time */}
              {estimatedMonths && estimatedMonths > 0 && (
                <p className="text-xs text-muted-foreground mt-2">
                  {t('dashboard.estimatedMonths', { months: estimatedMonths })}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-border bg-card">
          <CardContent className="p-6 space-y-3">
            <div className="text-center space-y-2">
              <span className="text-4xl">👑</span>
              <h3 className="text-lg font-bold">{t('dashboard.maximumPhase')}</h3>
              <p className="text-sm text-muted-foreground">
                {t('dashboard.maxPhaseDesc')}
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
