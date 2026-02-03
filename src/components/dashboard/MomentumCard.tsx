'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getCurrencyFormat } from '@/lib/utils';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';

interface MomentumCardProps {
  last7DaysGrowth: number;
  last30DaysGrowth: number;
  momentumIndicator: 'accelerating' | 'stable' | 'slowing';
  momentumChange: number;
  savingsHistory: Array<{ date: string; savings: number }>;
}

export function MomentumCard({
  last7DaysGrowth,
  last30DaysGrowth,
  momentumIndicator,
  momentumChange,
  savingsHistory,
}: MomentumCardProps) {
  const getMomentumText = () => {
    if (momentumIndicator === 'accelerating') {
      return 'Growth speed increased this week';
    } else if (momentumIndicator === 'slowing') {
      return 'Growth is stable — small increase could boost results';
    }
    return 'Growth is stable — consistent pace';
  };

  const getMomentumColor = () => {
    if (momentumIndicator === 'accelerating') {
      return 'text-emerald-500';
    } else if (momentumIndicator === 'slowing') {
      return 'text-amber-500';
    }
    return 'text-slate-500';
  };

  // Format chart data - show last 14 days for better visibility
  const chartData = savingsHistory.slice(-14).map((item) => ({
    date: item.date,
    value: item.savings,
  }));

  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <CardTitle className="text-base">Speed Check</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">7 Days</p>
            <p className={`text-lg font-bold ${getMomentumColor()}`}>
              {getCurrencyFormat(last7DaysGrowth)}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">30 Days</p>
            <p className="text-lg font-bold text-primary">
              {getCurrencyFormat(last30DaysGrowth)}
            </p>
          </div>
        </div>

        {/* Mini Chart */}
        <div className="h-32 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10 }}
                tickFormatter={(value) => {
                  const date = new Date(value);
                  return `${date.getDate()}/${date.getMonth() + 1}`;
                }}
              />
              <YAxis
                tick={{ fontSize: 10 }}
                tickFormatter={(value) => {
                  if (value >= 1000000) {
                    return `${(value / 1000000).toFixed(0)}M`;
                  } else if (value >= 1000) {
                    return `${(value / 1000).toFixed(0)}K`;
                  }
                  return value.toString();
                }}
              />
              <Tooltip
                formatter={(value: number) => getCurrencyFormat(value)}
                labelFormatter={(label) => {
                  const date = new Date(label);
                  return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
                }}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke={momentumIndicator === 'accelerating' ? '#10b981' : momentumIndicator === 'slowing' ? '#f59e0b' : '#64748b'}
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Momentum Insight */}
        <div className="pt-2 border-t border-border">
          <p className="text-sm font-medium text-muted-foreground">
            {getMomentumText()}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
