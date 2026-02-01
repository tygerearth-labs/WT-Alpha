'use client';

import { Card, CardContent } from '@/components/ui/card';
import { getCurrencyFormat } from '@/lib/utils';

interface QuickStatsProps {
  totalSavings: number;
  currentStageName: string;
  nextTarget: string;
}

export function QuickStats({ totalSavings, currentStageName, nextTarget }: QuickStatsProps) {
  const stats = [
    {
      title: 'Total Tabungan',
      value: getCurrencyFormat(totalSavings),
      icon: '💰',
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
    },
    {
      title: 'Fase Saat Ini',
      value: currentStageName,
      icon: '📊',
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10',
    },
    {
      title: 'Target Berikutnya',
      value: nextTarget,
      icon: '🎯',
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
    },
  ];

  return (
    <div className="grid gap-3 md:grid-cols-3">
      {stats.map((stat, index) => (
        <Card key={index} className="bg-card/50 backdrop-blur-sm border-border/50 hover:border-primary/50 transition-colors">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={`text-2xl ${stat.bgColor} p-2 rounded-lg`}>
                {stat.icon}
              </div>
              <div className="flex-1">
                <p className="text-xs text-muted-foreground">{stat.title}</p>
                <p className={`text-base font-bold ${stat.color}`}>
                  {stat.value}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
