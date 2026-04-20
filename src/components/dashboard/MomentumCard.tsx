'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useTranslation } from '@/hooks/useTranslation';
import { useCurrencyFormat } from '@/hooks/useCurrencyFormat';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';

interface MomentumCardProps {
  last7DaysGrowth: number;
  last30DaysGrowth: number;
  momentumIndicator: 'accelerating' | 'stable' | 'slowing';
  momentumChange: number;
  savingsHistory: Array<{ date: string; savings: number }>;
}

function MomentumRing({ score, indicator }: { score: number; indicator: 'accelerating' | 'stable' | 'slowing' }) {
  const [animatedScore, setAnimatedScore] = useState(0);
  const radius = 28;
  const stroke = 4;
  const normalizedRadius = radius - stroke / 2;
  const circumference = normalizedRadius * 2 * Math.PI;

  const ringColor =
    indicator === 'accelerating' ? '#03DAC6' :
    indicator === 'slowing' ? '#F9A825' :
    '#9E9E9E';

  useEffect(() => {
    const timer = setTimeout(() => setAnimatedScore(score), 100);
    return () => clearTimeout(timer);
  }, [score]);

  const offset = circumference - (animatedScore / 100) * circumference;

  return (
    <div className="relative">
      <svg height={radius * 2} width={radius * 2} className="-rotate-90">
        {/* Background ring */}
        <circle
          stroke="rgba(255,255,255,0.06)"
          fill="transparent"
          strokeWidth={stroke}
          r={normalizedRadius}
          cx={radius}
          cy={radius}
        />
        {/* Progress ring */}
        <circle
          stroke={ringColor}
          fill="transparent"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference + ' ' + circumference}
          style={{
            strokeDashoffset: offset,
            transition: 'stroke-dashoffset 1.2s cubic-bezier(0.4, 0, 0.2, 1)',
            filter: `drop-shadow(0 0 4px ${ringColor}40)`,
          }}
          r={normalizedRadius}
          cx={radius}
          cy={radius}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className="text-sm font-bold leading-none"
          style={{ color: ringColor }}
        >
          {Math.round(animatedScore)}
        </span>
      </div>
    </div>
  );
}

export function MomentumCard({
  last7DaysGrowth,
  last30DaysGrowth,
  momentumIndicator,
  momentumChange,
  savingsHistory,
}: MomentumCardProps) {
  const { t } = useTranslation();
  const { formatAmount } = useCurrencyFormat();

  const getMomentumText = () => {
    if (momentumIndicator === 'accelerating') {
      return t('dashboard.speedIncreased');
    } else if (momentumIndicator === 'slowing') {
      return t('dashboard.stableBoost');
    }
    return t('dashboard.stablePace');
  };

  const getMomentumColor = () => {
    if (momentumIndicator === 'accelerating') {
      return 'text-emerald-500';
    } else if (momentumIndicator === 'slowing') {
      return 'text-amber-500';
    }
    return 'text-slate-500';
  };

  const getAccentColor = () => {
    if (momentumIndicator === 'accelerating') return '#03DAC6';
    if (momentumIndicator === 'slowing') return '#F9A825';
    return '#9E9E9E';
  };

  // Calculate momentum score (0-100)
  const momentumScore = Math.min(100, Math.max(0, 50 + (momentumChange * 10)));

  // Format chart data - show last 14 days for better visibility
  const chartData = savingsHistory.slice(-14).map((item) => ({
    date: item.date,
    value: item.savings,
  }));

  return (
    <Card className="border-border bg-card overflow-hidden relative group/momentum">
      {/* Subtle gradient atmosphere */}
      <div
        className="absolute inset-0 pointer-events-none opacity-0 group-hover/momentum:opacity-100 transition-opacity duration-500"
        style={{
          background: `radial-gradient(ellipse at 0% 0%, ${getAccentColor()}08 0%, transparent 60%)`,
        }}
      />
      <CardHeader className="relative">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{t('dashboard.speedCheck')}</CardTitle>
          <MomentumRing score={momentumScore} indicator={momentumIndicator} />
        </div>
      </CardHeader>
      <CardContent className="relative space-y-4">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">{t('dashboard.last7Days')}</p>
            <p className={`text-lg font-bold ${getMomentumColor()}`}>
              {formatAmount(last7DaysGrowth)}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">{t('dashboard.last30Days')}</p>
            <p className="text-lg font-bold text-primary">
              {formatAmount(last30DaysGrowth)}
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
                formatter={(value: number) => formatAmount(value)}
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
                style={{
                  filter: `drop-shadow(0 0 4px ${momentumIndicator === 'accelerating' ? 'rgba(16,185,129,0.3)' : momentumIndicator === 'slowing' ? 'rgba(245,158,11,0.3)' : 'rgba(100,116,139,0.3)'})`,
                }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Momentum Insight */}
        <div className="pt-2 border-t border-border">
          <div className="flex items-center gap-2">
            <div
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: getAccentColor(), boxShadow: `0 0 6px ${getAccentColor()}50` }}
            />
            <p className="text-sm font-medium text-muted-foreground">
              {getMomentumText()}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
