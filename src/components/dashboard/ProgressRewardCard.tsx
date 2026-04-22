'use client';

import { Card, CardContent } from '@/components/ui/card';
import { useTranslation } from '@/hooks/useTranslation';
import { Trophy, Flame, Target, TrendingUp } from 'lucide-react';

interface ProgressRewardCardProps {
  last30DaysGrowth: number;
  last7DaysGrowth: number;
  momentumIndicator: 'accelerating' | 'stable' | 'slowing';
  savingsRate: number;
  totalIncome: number;
}

export function ProgressRewardCard({
  last30DaysGrowth,
  last7DaysGrowth,
  momentumIndicator,
  savingsRate,
  totalIncome,
}: ProgressRewardCardProps) {
  const { t } = useTranslation();

  // Calculate rewards based on performance
  const rewards: Array<{
    id: string;
    title: string;
    description: string;
    icon: any;
    earned: boolean;
  }> = [];

  // Reward 1: Consistent Saver (positive 30-day growth)
  if (last30DaysGrowth > 0) {
    rewards.push({
      id: 'consistent-saver',
      title: t('dashboard.consistentSaver'),
      description: t('dashboard.consistentSaverDesc'),
      icon: <Trophy className="h-5 w-5" />,
      earned: true,
    });
  }

  // Reward 2: Momentum Builder (accelerating growth)
  if (momentumIndicator === 'accelerating' && last7DaysGrowth > 0) {
    rewards.push({
      id: 'momentum-builder',
      title: t('dashboard.momentumBuilder'),
      description: t('dashboard.speedIncreased'),
      icon: <Flame className="h-5 w-5" />,
      earned: true,
    });
  }

  // Reward 3: High Savings Rate (20% or more)
  if (savingsRate >= 20) {
    rewards.push({
      id: 'high-savings-rate',
      title: t('dashboard.highSavingsRate'),
      description: t('dashboard.strongSavingsDesc', { rate: savingsRate.toFixed(0) }),
      icon: <Target className="h-5 w-5" />,
      earned: true,
    });
  }

  // Reward 4: Goal Closer (savings rate 15-20%)
  if (savingsRate >= 15 && savingsRate < 20) {
    rewards.push({
      id: 'goal-closer',
      title: t('dashboard.goalCloser'),
      description: t('dashboard.goalCloserDesc'),
      icon: <TrendingUp className="h-5 w-5" />,
      earned: true,
    });
  }

  // If no rewards earned
  if (rewards.length === 0) {
    return (
      <Card className="border-border bg-card">
        <CardContent className="p-6">
          <div className="text-center space-y-2">
            <Trophy className="h-12 w-12 mx-auto text-muted-foreground/30" />
            <div>
              <h4 className="text-sm font-medium">{t('dashboard.startEarning')}</h4>
              <p className="text-xs text-muted-foreground mt-1">
                {t('dashboard.startEarningDesc')}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border bg-card">
      <CardContent className="p-6 space-y-4">
        <div>
          <h4 className="text-sm font-semibold mb-1">{t('dashboard.yourProgress')}</h4>
          <p className="text-xs text-muted-foreground">
            {t('dashboard.achievementsMonth')}
          </p>
        </div>

        <div className="space-y-3">
          {rewards.map((reward) => (
            <div
              key={reward.id}
              className="flex items-start gap-3 p-3 bg-primary/5 rounded-lg border border-border/50"
            >
              <div className="flex-shrink-0 w-9 h-9 rounded-lg grid place-items-center bg-primary/10 text-primary [&>*]:block leading-none">
                {reward.icon}
              </div>
              <div className="space-y-1 flex-1">
                <h5 className="text-sm font-medium">{reward.title}</h5>
                <p className="text-xs text-muted-foreground">{reward.description}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
