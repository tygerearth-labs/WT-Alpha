'use client';

import { Card, CardContent } from '@/components/ui/card';
import { useTranslation } from '@/hooks/useTranslation';
import { useCurrencyFormat } from '@/hooks/useCurrencyFormat';
import { DynamicIcon } from '@/components/shared/DynamicIcon';

interface QuickStatsProps {
  totalSavings: number;
  currentStageName: string;
  nextTarget: string;
}

export function QuickStats({ totalSavings, currentStageName, nextTarget }: QuickStatsProps) {
  const { t } = useTranslation();
  const { formatAmount } = useCurrencyFormat();

  const stats = [
    {
      title: t('dashboard.totalSavings'),
      value: formatAmount(totalSavings),
      icon: '💰',
      color: 'text-emerald-500',
      bgColor: 'bg-emerald-500',
      description: t('dashboard.totalSavingsDesc'),
    },
    {
      title: t('stages.currentStage'),
      value: currentStageName,
      icon: '📊',
      color: 'text-violet-500',
      bgColor: 'bg-violet-500',
      description: t('stages.currentStageDesc'),
    },
    {
      title: t('stages.nextTarget'),
      value: nextTarget,
      icon: '🎯',
      color: 'text-blue-500',
      bgColor: 'bg-blue-500',
      description: t('stages.nextTargetDesc'),
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {stats.map((stat, index) => (
        <Card key={index} className="border border-border hover:border-primary/50 transition-colors">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className={`flex items-center justify-center w-12 h-12 rounded-xl ${stat.bgColor} text-white`}>
                <DynamicIcon name={stat.icon} className="text-2xl" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  {stat.title}
                </p>
                <p className={`text-lg font-bold ${stat.color}`}>
                  {stat.value}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {stat.description}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
