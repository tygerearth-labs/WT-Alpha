'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

interface PieChartData {
  name: string;
  amount: number;
  color: string;
  icon: string;
  count: number;
}

interface PieChartCardProps {
  title: string;
  data: PieChartData[];
  className?: string;
}

export function PieChartCard({ title, data, className }: PieChartCardProps) {
  return (
    <Card className={`bg-card/50 backdrop-blur-sm border border-border/50 ${className}`}>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length > 0 ? (
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="amount"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number, name: string) => [
                  `${value.toLocaleString('id-ID')}`,
                  name,
                ]}
              />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-[250px] text-muted-foreground">
            <p className="text-sm">Belum ada data</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
