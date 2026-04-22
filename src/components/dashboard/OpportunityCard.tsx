'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/hooks/useTranslation';
import { useCurrencyFormat } from '@/hooks/useCurrencyFormat';
import { ArrowUpRight, Sparkles } from 'lucide-react';

interface OpportunityCardProps {
  totalSavings: number;
  unallocatedFunds: number;
  currentStage: any;
  nextStage: any;
  savingsRate: number;
}

export function OpportunityCard({
  totalSavings,
  unallocatedFunds,
  currentStage,
  nextStage,
  savingsRate,
}: OpportunityCardProps) {
  const { t } = useTranslation();
  const { formatAmount } = useCurrencyFormat();

  // Generate dynamic opportunity insight
  const getOpportunity = () => {
    // Priority 1: Unallocated funds
    if (unallocatedFunds > 100000) {
      const potentialGrowth = unallocatedFunds * 0.09; // Assuming 9% annual return
      return {
        title: t('dashboard.allocateIdle'),
        description: t('dashboard.allocateIdleDesc', { amount: formatAmount(unallocatedFunds) }),
        insight: t('dashboard.allocateIdleDetail', { amount: formatAmount(potentialGrowth) }),
        action: t('dashboard.allocateNow'),
        icon: <Sparkles className="h-5 w-5" />,
        priority: 'high',
      };
    }

    // Priority 2: Boost to next phase
    if (nextStage && totalSavings > 0) {
      const amountNeeded = nextStage.range[0] - totalSavings;
      if (amountNeeded > 0 && amountNeeded < totalSavings * 0.5) {
        const monthlyBoost = Math.ceil(amountNeeded / 3);
        const timeSaved = Math.ceil(amountNeeded / (totalSavings * 0.1 / 12));

        return {
          title: t('dashboard.accelerateNext'),
          description: t('dashboard.accelerateNextDesc', { stage: `${nextStage.emoji} ${nextStage.name}` }),
          insight: t('dashboard.accelerateNextDetail', { amount: formatAmount(monthlyBoost) }),
          action: t('dashboard.boostProgress'),
          icon: <ArrowUpRight className="h-5 w-5" />,
          priority: 'high',
        };
      }
    }

    // Priority 3: Improve savings rate
    if (savingsRate > 0 && savingsRate < 20) {
      const recommendedRate = 20;
      const additionalSavings = Math.ceil(savingsRate * 0.2);
      const projectedGrowth = additionalSavings * 12 * 5;

      return {
        title: t('dashboard.boostSavings'),
        description: t('dashboard.boostSavingsDesc', { rate: savingsRate.toFixed(0), target: recommendedRate }),
        insight: t('dashboard.boostSavingsDetail', { amount: formatAmount(projectedGrowth) }),
        action: t('dashboard.setGoal'),
        icon: <Sparkles className="h-5 w-5" />,
        priority: 'medium',
      };
    }

    // Default: Consistency reward
    return {
      title: t('dashboard.keepGrowing'),
      description: t('dashboard.keepGrowingDesc', { stage: `${currentStage.emoji} ${currentStage.name}` }),
      insight: t('dashboard.keepGrowingDetail'),
      action: t('dashboard.viewProgress'),
      icon: <ArrowUpRight className="h-5 w-5" />,
      priority: 'low',
    };
  };

  const opportunity = getOpportunity();

  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <span>{t('dashboard.growthLever')}</span>
          {opportunity.priority === 'high' && (
            <span className="text-xs font-semibold px-2 py-0.5 bg-amber-500/10 text-amber-500 rounded">
              {t('dashboard.priority')}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Icon & Description */}
        <div className="space-y-2">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 p-2 bg-primary/10 rounded-lg">
              {opportunity.icon}
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-semibold">{opportunity.title}</h4>
              <p className="text-sm text-muted-foreground">{opportunity.description}</p>
            </div>
          </div>
        </div>

        {/* Insight */}
        <div className="p-3 bg-primary/5 rounded-lg border border-border/50">
          <p className="text-xs font-medium text-primary">
            {opportunity.insight}
          </p>
        </div>

        {/* Action Button */}
        <Button className="w-full" variant="default" size="sm">
          {opportunity.action}
        </Button>
      </CardContent>
    </Card>
  );
}
