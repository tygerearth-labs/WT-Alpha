'use client';

import { Card, CardContent } from '@/components/ui/card';
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
      title: 'Consistent Saver',
      description: 'You saved for 30 consecutive days',
      icon: <Trophy className="h-5 w-5" />,
      earned: true,
    });
  }

  // Reward 2: Momentum Builder (accelerating growth)
  if (momentumIndicator === 'accelerating' && last7DaysGrowth > 0) {
    rewards.push({
      id: 'momentum-builder',
      title: 'Momentum Builder',
      description: 'Growth speed increased this week',
      icon: <Flame className="h-5 w-5" />,
      earned: true,
    });
  }

  // Reward 3: High Savings Rate (20% or more)
  if (savingsRate >= 20) {
    rewards.push({
      id: 'high-savings-rate',
      title: 'High Savings Rate',
      description: `Saving ${savingsRate.toFixed(0)}% of income`,
      icon: <Target className="h-5 w-5" />,
      earned: true,
    });
  }

  // Reward 4: Goal Closer (savings rate 15-20%)
  if (savingsRate >= 15 && savingsRate < 20) {
    rewards.push({
      id: 'goal-closer',
      title: 'Goal Closer',
      description: `Almost at target savings rate (20%)`,
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
              <h4 className="text-sm font-medium">Start Earning Badges</h4>
              <p className="text-xs text-muted-foreground mt-1">
                Save consistently to unlock achievements
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
          <h4 className="text-sm font-semibold mb-1">Your Progress</h4>
          <p className="text-xs text-muted-foreground">
            Achievements unlocked this month
          </p>
        </div>

        <div className="space-y-3">
          {rewards.map((reward) => (
            <div
              key={reward.id}
              className="flex items-start gap-3 p-3 bg-primary/5 rounded-lg border border-border/50"
            >
              <div className="flex-shrink-0 p-2 bg-primary/10 rounded-lg text-primary">
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
