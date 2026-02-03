'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getCurrencyFormat } from '@/lib/utils';
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
  // Generate dynamic opportunity insight
  const getOpportunity = () => {
    // Priority 1: Unallocated funds
    if (unallocatedFunds > 100000) {
      const potentialGrowth = unallocatedFunds * 0.09; // Assuming 9% annual return
      return {
        title: 'Allocate Your Idle Funds',
        description: `Allocate ${getCurrencyFormat(unallocatedFunds)} to unlock faster growth`,
        insight: `Estimated yearly gain: +${getCurrencyFormat(potentialGrowth)}`,
        action: 'Allocate Now',
        icon: <Sparkles className="h-5 w-5" />,
        priority: 'high',
      };
    }

    // Priority 2: Boost to next phase
    if (nextStage && totalSavings > 0) {
      const amountNeeded = nextStage.range[0] - totalSavings;
      if (amountNeeded > 0 && amountNeeded < totalSavings * 0.5) {
        // If close to next phase (less than 50% away)
        const monthlyBoost = Math.ceil(amountNeeded / 3); // Reach in 3 months
        const timeSaved = Math.ceil(amountNeeded / (totalSavings * 0.1 / 12)); // Estimated time saved

        return {
          title: 'Accelerate to Next Level',
          description: `You're close to ${nextStage.emoji} ${nextStage.name}`,
          insight: `Adding ${getCurrencyFormat(monthlyBoost)}/month could reach next phase 3 months faster`,
          action: 'Boost Progress',
          icon: <ArrowUpRight className="h-5 w-5" />,
          priority: 'high',
        };
      }
    }

    // Priority 3: Improve savings rate
    if (savingsRate > 0 && savingsRate < 20) {
      const recommendedRate = 20;
      const additionalSavings = Math.ceil(savingsRate * 0.2); // 20% increase in savings rate
      const projectedGrowth = additionalSavings * 12 * 5; // 5 years projection

      return {
        title: 'Boost Your Savings Rate',
        description: `Increase savings from ${savingsRate.toFixed(0)}% to ${recommendedRate}%`,
        insight: `Could add ${getCurrencyFormat(projectedGrowth)} in 5 years`,
        action: 'Set Target',
        icon: <Sparkles className="h-5 w-5" />,
        priority: 'medium',
      };
    }

    // Default: Consistency reward
    return {
      title: 'Keep Growing',
      description: `Stay consistent in your ${currentStage.emoji} ${currentStage.name} phase`,
      insight: 'Your consistent savings are building momentum',
      action: 'View Progress',
      icon: <ArrowUpRight className="h-5 w-5" />,
      priority: 'low',
    };
  };

  const opportunity = getOpportunity();

  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <span>Growth Lever</span>
          {opportunity.priority === 'high' && (
            <span className="text-xs font-semibold px-2 py-0.5 bg-amber-500/10 text-amber-500 rounded">
              Priority
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
