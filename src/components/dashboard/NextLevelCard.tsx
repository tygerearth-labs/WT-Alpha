'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { getCurrencyFormat } from '@/lib/utils';
import { Stage, getProgressToNextStage } from '@/components/cards/types';

interface NextLevelCardProps {
  totalSavings: number;
  currentStage: Stage;
  nextStage: Stage | null;
}

export function NextLevelCard({ totalSavings, currentStage, nextStage }: NextLevelCardProps) {
  const progressToNext = getProgressToNextStage(totalSavings, currentStage);

  // Calculate estimated months to next phase
  const amountNeeded = nextStage ? nextStage.range[0] - totalSavings : 0;
  const last30DaysGrowth = 0; // This would come from API
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
              ACTIVE
            </span>
          </div>

          {/* Title */}
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Current Phase</p>
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
                <span className="text-muted-foreground">Progress</span>
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
                NEXT
              </span>
            </div>

            {/* Title */}
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Next Level</p>
              <div className="flex items-center gap-2">
                <span className="text-2xl">{nextStage.emoji}</span>
                <h3 className="text-xl font-bold">{nextStage.name}</h3>
              </div>
            </div>

            {/* Target */}
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Target</p>
              <p className="text-sm font-semibold">
                {getCurrencyFormat(nextStage.range[0])}
              </p>
            </div>

            {/* Progress Info */}
            <div className="pt-2 space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">You're</span>
                <span className="font-medium">{progressToNext.toFixed(0)}% there</span>
              </div>
              <Progress value={progressToNext} className="h-2" />

              {/* Estimated Time */}
              {estimatedMonths && estimatedMonths > 0 && (
                <p className="text-xs text-muted-foreground mt-2">
                  Est. {estimatedMonths} months at current pace
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
              <h3 className="text-lg font-bold">Maximum Phase</h3>
              <p className="text-sm text-muted-foreground">
                You've reached the highest financial stage!
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
