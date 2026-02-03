'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getCurrencyFormat } from '@/lib/utils';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';

interface WeaknessCardProps {
  unallocatedFunds: number;
  savingsRate: number;
  last30DaysGrowth: number;
  totalIncome: number;
}

export function WeaknessCard({
  unallocatedFunds,
  savingsRate,
  last30DaysGrowth,
  totalIncome,
}: WeaknessCardProps) {
  // Identify weaknesses
  const weaknesses: Array<{
    id: string;
    title: string;
    description: string;
    impact: string;
    action: string;
    severity: 'high' | 'medium' | 'low';
  }> = [];

  // Check 1: Unallocated funds
  if (unallocatedFunds > 50000) {
    const daysIdle = 7; // Placeholder - would need to calculate from data
    const potentialYearlyLoss = unallocatedFunds * 0.09; // Assuming 9% opportunity cost

    weaknesses.push({
      id: 'unallocated',
      title: 'Allocation Pending',
      description: `${getCurrencyFormat(unallocatedFunds)} idle for ${daysIdle}+ days`,
      impact: `Estimated lost growth: ${getCurrencyFormat(potentialYearlyLoss)}/year`,
      action: 'Allocate Funds',
      severity: 'high',
    });
  }

  // Check 2: Low savings rate
  if (totalIncome > 0 && savingsRate < 10 && savingsRate >= 0) {
    const recommended = 20;
    const gap = recommended - savingsRate;
    const potentialYearly = (totalIncome * (recommended / 100)) - (totalIncome * (savingsRate / 100));

    weaknesses.push({
      id: 'savings-rate',
      title: 'Savings Rate Below Target',
      description: `Current: ${savingsRate.toFixed(1)}% | Target: ${recommended}%`,
      impact: `Could save additional ${getCurrencyFormat(potentialYearly)}/year`,
      action: 'Improve Rate',
      severity: 'high',
    });
  }

  // Check 3: Negative or stagnant growth
  if (last30DaysGrowth <= 0 && totalIncome > 0) {
    weaknesses.push({
      id: 'growth-stagnant',
      title: 'Growth Stagnant',
      description: 'No savings growth in the last 30 days',
      impact: 'Track expenses and reduce unnecessary spending',
      action: 'Review Expenses',
      severity: 'medium',
    });
  }

  // Check 4: Moderate savings rate (10-20%)
  if (savingsRate >= 10 && savingsRate < 20) {
    const recommended = 20;
    const gap = recommended - savingsRate;

    weaknesses.push({
      id: 'savings-improvement',
      title: 'Savings Rate Could Improve',
      description: `Current: ${savingsRate.toFixed(1)}% | Target: ${recommended}%`,
      impact: `Small adjustment could boost results`,
      action: 'Set Goal',
      severity: 'low',
    });
  }

  // No weaknesses found
  if (weaknesses.length === 0) {
    return (
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            <span>All Systems Optimal</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Your financial health is in excellent condition. Keep up the great work!
          </p>
        </CardContent>
      </Card>
    );
  }

  // Show the highest severity weakness
  const primaryWeakness = weaknesses.sort((a, b) => {
    const severityOrder = { high: 0, medium: 1, low: 2 };
    return severityOrder[a.severity] - severityOrder[b.severity];
  })[0];

  const getSeverityColor = () => {
    if (primaryWeakness.severity === 'high') {
      return 'text-red-500';
    } else if (primaryWeakness.severity === 'medium') {
      return 'text-amber-500';
    }
    return 'text-blue-500';
  };

  const getSeverityBg = () => {
    if (primaryWeakness.severity === 'high') {
      return 'bg-red-500/10';
    } else if (primaryWeakness.severity === 'medium') {
      return 'bg-amber-500/10';
    }
    return 'bg-blue-500/10';
  };

  return (
    <Card className={`border-border bg-card ${primaryWeakness.severity === 'high' ? 'border-red-500/20' : ''}`}>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <AlertTriangle className={`h-5 w-5 ${getSeverityColor()}`} />
          <span>Needs Attention</span>
          {primaryWeakness.severity === 'high' && (
            <span className="text-xs font-semibold px-2 py-0.5 bg-red-500/10 text-red-500 rounded">
              Priority
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Title & Description */}
        <div className="space-y-1">
          <h4 className="text-sm font-semibold">{primaryWeakness.title}</h4>
          <p className="text-xs text-muted-foreground">{primaryWeakness.description}</p>
        </div>

        {/* Impact */}
        <div className={`p-3 ${getSeverityBg()} rounded-lg border border-border/50`}>
          <p className="text-xs font-medium">{primaryWeakness.impact}</p>
        </div>

        {/* Action Button */}
        <Button className="w-full" variant={primaryWeakness.severity === 'high' ? 'default' : 'outline'} size="sm">
          {primaryWeakness.action}
        </Button>
      </CardContent>
    </Card>
  );
}
