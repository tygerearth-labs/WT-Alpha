'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useTranslation } from '@/hooks/useTranslation';
import { useCurrencyFormat } from '@/hooks/useCurrencyFormat';
import { Stage, getProgressToNextStage } from '@/components/cards/types';
import { Zap, Star } from 'lucide-react';

interface NextLevelCardProps {
  totalSavings: number;
  currentStage: Stage;
  nextStage: Stage | null;
  last30DaysGrowth?: number;
}

export function NextLevelCard({ totalSavings, currentStage, nextStage, last30DaysGrowth = 0 }: NextLevelCardProps) {
  const { t } = useTranslation();
  const { formatAmount } = useCurrencyFormat();

  const progressToNext = getProgressToNextStage(totalSavings, currentStage);

  // Calculate estimated months to next phase
  const amountNeeded = nextStage ? nextStage.range[0] - totalSavings : 0;
  const monthlyGrowthEstimate = last30DaysGrowth;
  const estimatedMonths = monthlyGrowthEstimate > 0 && amountNeeded > 0
    ? Math.ceil(amountNeeded / monthlyGrowthEstimate)
    : null;

  const isNearLevelUp = nextStage && progressToNext >= 75;

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {/* Current Phase */}
      <Card className="border-border bg-card overflow-hidden relative group/current">
        {/* Subtle gradient atmosphere */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse at 80% 0%, rgba(187,134,252,0.06) 0%, transparent 50%)',
          }}
        />
        <CardContent className="relative p-6 space-y-3">
          {/* Badge */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-2.5 py-1 bg-[#BB86FC]/15 text-[#BB86FC] rounded-md">
              {t('dashboard.active')}
            </span>
          </div>

          {/* Title with level-up glow */}
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">{t('dashboard.currentPhase')}</p>
            <div className="flex items-center gap-2">
              <span
                className="text-2xl"
                style={isNearLevelUp ? { animation: 'levelUpGlow 2s ease-in-out infinite' } : undefined}
              >
                {currentStage.emoji}
              </span>
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
                <span className="font-bold text-[#BB86FC]">{progressToNext.toFixed(0)}%</span>
              </div>
              <Progress
                value={progressToNext}
                className="h-2"
                style={{
                  '--progress-color': isNearLevelUp
                    ? 'linear-gradient(90deg, #BB86FC, #03DAC6)'
                    : '#BB86FC',
                } as React.CSSProperties}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Next Phase */}
      {nextStage ? (
        <Card
          className="border-border bg-card overflow-hidden relative group/next"
          style={isNearLevelUp ? {
            borderColor: 'rgba(187,134,252,0.25)',
            boxShadow: '0 0 20px rgba(187,134,252,0.08), inset 0 0 20px rgba(187,134,252,0.02)',
          } : undefined}
        >
          {/* Level-up glow effect when near */}
          {isNearLevelUp && (
            <>
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background: 'radial-gradient(ellipse at 50% 50%, rgba(187,134,252,0.08) 0%, transparent 60%)',
                  animation: 'pulseGlow 3s ease-in-out infinite',
                }}
              />
              <div
                className="absolute -top-px -left-px -right-px h-[2px] rounded-t-xl"
                style={{
                  background: 'linear-gradient(90deg, transparent, #BB86FC, #03DAC6, #BB86FC, transparent)',
                  backgroundSize: '200% 100%',
                  animation: 'gradientBorderRotate 3s linear infinite',
                }}
              />
            </>
          )}
          {/* Subtle gradient */}
          {!isNearLevelUp && (
            <div
              className="absolute inset-0 pointer-events-none opacity-0 group-hover/next:opacity-100 transition-opacity duration-500"
              style={{
                background: 'radial-gradient(ellipse at 20% 100%, rgba(3,218,198,0.05) 0%, transparent 50%)',
              }}
            />
          )}
          <CardContent className="relative p-6 space-y-3">
            {/* Badge with near-level-up indicator */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold px-2.5 py-1 bg-primary/8 text-primary/70 rounded-md flex items-center gap-1">
                {t('dashboard.next')}
                {isNearLevelUp && (
                  <Zap className="h-3 w-3 text-[#F9A825]" style={{ filter: 'drop-shadow(0 0 3px rgba(249,168,37,0.5))' }} />
                )}
              </span>
            </div>

            {/* Title */}
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">{t('dashboard.nextLevel')}</p>
              <div className="flex items-center gap-2">
                <span
                  className="text-2xl"
                  style={isNearLevelUp ? { animation: 'levelUpGlow 2s ease-in-out infinite' } : undefined}
                >
                  {nextStage.emoji}
                </span>
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
                <span className="font-bold" style={{ color: isNearLevelUp ? '#03DAC6' : 'inherit' }}>
                  {progressToNext.toFixed(0)}% {t('dashboard.there')}
                </span>
              </div>
              <Progress
                value={progressToNext}
                className="h-2"
                style={{
                  '--progress-color': isNearLevelUp
                    ? 'linear-gradient(90deg, #03DAC6, #BB86FC)'
                    : '#BB86FC',
                } as React.CSSProperties}
              />

              {/* Estimated Time */}
              {estimatedMonths && estimatedMonths > 0 && (
                <div className="flex items-center gap-1.5 mt-2">
                  <Star
                    className="h-3 w-3 text-[#F9A825]/60"
                  />
                  <p className="text-xs text-muted-foreground">
                    {t('dashboard.estimatedMonths', { months: estimatedMonths })}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-border bg-card overflow-hidden">
          {/* Gradient for max phase */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: 'radial-gradient(ellipse at 50% 50%, rgba(255,215,0,0.06) 0%, transparent 50%)',
            }}
          />
          <CardContent className="relative p-6 space-y-3">
            <div className="text-center space-y-2">
              <span className="text-4xl" style={{ animation: 'levelUpGlow 2.5s ease-in-out infinite' }}>👑</span>
              <h3 className="text-lg font-bold bg-clip-text text-transparent"
                style={{ backgroundImage: 'linear-gradient(135deg, #FFD700, #FFA500)' }}
              >
                {t('dashboard.maximumPhase')}
              </h3>
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
