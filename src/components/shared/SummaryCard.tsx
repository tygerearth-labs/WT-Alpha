'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LucideIcon } from 'lucide-react';
import { getCurrencyFormat } from '@/lib/utils';

interface SummaryCardProps {
  title: string;
  amount: number;
  icon: LucideIcon;
  iconColor?: string;
  bgColor?: string;
  subtitle?: string;
  className?: string;
  action?: React.ReactNode;
}

export function SummaryCard({
  title,
  amount,
  icon: Icon,
  iconColor = 'text-primary',
  bgColor = 'bg-card/50',
  subtitle,
  className,
  action,
}: SummaryCardProps) {
  return (
    <Card className={`${bgColor} backdrop-blur-sm border border-border/50 ${className}`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className={`text-sm font-medium flex items-center gap-2 ${iconColor}`}>
            <Icon className="h-4 w-4" />
            {title}
          </CardTitle>
          {action && (
            <div>
              {action}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-foreground">
          {getCurrencyFormat(amount)}
        </div>
        {subtitle && (
          <p className="text-xs text-muted-foreground mt-1">
            {subtitle}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
