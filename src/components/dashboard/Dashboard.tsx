'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getCurrentStage, getNextStage } from '@/components/cards/types';
import { Loader2 } from 'lucide-react';
import { HeroCard } from './HeroCard';
import { NextLevelCard } from './NextLevelCard';
import { MomentumCard } from './MomentumCard';
import { OpportunityCard } from './OpportunityCard';
import { WeaknessCard } from './WeaknessCard';
import { ProgressRewardCard } from './ProgressRewardCard';

interface DashboardData {
  totalIncome: number;
  totalExpense: number;
  balance: number;
  totalSavings: number;
  debtRatio: number;
  savingsTargets: any[];
  transactions: any[];
  expenseByCategory: any[];
  // Growth metrics
  last7DaysGrowth: number;
  last30DaysGrowth: number;
  momentumIndicator: 'accelerating' | 'stable' | 'slowing';
  momentumChange: number;
  savingsHistory: Array<{ date: string; savings: number }>;
  savingsRate: number;
  unallocatedFunds: number;
}

export function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState({ month: 'all', year: 'all' });

  useEffect(() => {
    fetchDashboardData();
  }, [filter]);

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (filter.month && filter.month !== 'all') params.append('month', filter.month);
      if (filter.year && filter.year !== 'all') params.append('year', filter.year);

      const response = await fetch(`/api/dashboard?${params}`);
      if (response.ok) {
        const result = await response.json();
        setData(result);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const currentStage = data ? getCurrentStage(data.totalSavings) : getCurrentStage(0);
  const nextStage = data ? getNextStage(currentStage) : null;

  if (isLoading || !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filter */}
      <Card className="bg-card/50 backdrop-blur-sm border-border/50">
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
            <CardTitle className="text-base">Dashboard</CardTitle>
            <div className="flex gap-2">
              <Select value={filter.month} onValueChange={(value) => setFilter({ ...filter, month: value })}>
                <SelectTrigger className="w-[110px] bg-background/50 h-8 text-xs">
                  <SelectValue placeholder="Bulan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua</SelectItem>
                  <SelectItem value="1">Januari</SelectItem>
                  <SelectItem value="2">Februari</SelectItem>
                  <SelectItem value="3">Maret</SelectItem>
                  <SelectItem value="4">April</SelectItem>
                  <SelectItem value="5">Mei</SelectItem>
                  <SelectItem value="6">Juni</SelectItem>
                  <SelectItem value="7">Juli</SelectItem>
                  <SelectItem value="8">Agustus</SelectItem>
                  <SelectItem value="9">September</SelectItem>
                  <SelectItem value="10">Oktober</SelectItem>
                  <SelectItem value="11">November</SelectItem>
                  <SelectItem value="12">Desember</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filter.year} onValueChange={(value) => setFilter({ ...filter, year: value })}>
                <SelectTrigger className="w-[90px] bg-background/50 h-8 text-xs">
                  <SelectValue placeholder="Tahun" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua</SelectItem>
                  <SelectItem value="2023">2023</SelectItem>
                  <SelectItem value="2024">2024</SelectItem>
                  <SelectItem value="2025">2025</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* HERO Card - No Escape Number */}
      <HeroCard
        totalSavings={data.totalSavings}
        last30DaysGrowth={data.last30DaysGrowth}
        momentumIndicator={data.momentumIndicator}
      />

      {/* NEXT LEVEL - Current & Next Phase */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-muted-foreground">Your Growth Path</h3>
        <NextLevelCard
          totalSavings={data.totalSavings}
          currentStage={currentStage}
          nextStage={nextStage}
        />
      </div>

      {/* MOMENTUM - Speed Check */}
      <MomentumCard
        last7DaysGrowth={data.last7DaysGrowth}
        last30DaysGrowth={data.last30DaysGrowth}
        momentumIndicator={data.momentumIndicator}
        momentumChange={data.momentumChange}
        savingsHistory={data.savingsHistory}
      />

      {/* OPPORTUNITY - Growth Lever */}
      <OpportunityCard
        totalSavings={data.totalSavings}
        unallocatedFunds={data.unallocatedFunds}
        currentStage={currentStage}
        nextStage={nextStage}
        savingsRate={data.savingsRate}
      />

      {/* WEAKNESS - Needs Attention */}
      <WeaknessCard
        unallocatedFunds={data.unallocatedFunds}
        savingsRate={data.savingsRate}
        last30DaysGrowth={data.last30DaysGrowth}
        totalIncome={data.totalIncome}
      />

      {/* PROGRESS REWARD - Achievements */}
      <ProgressRewardCard
        last30DaysGrowth={data.last30DaysGrowth}
        last7DaysGrowth={data.last7DaysGrowth}
        momentumIndicator={data.momentumIndicator}
        savingsRate={data.savingsRate}
        totalIncome={data.totalIncome}
      />

      {/* Savings Targets Progress - Keep as separate card */}
      {data.savingsTargets.length > 0 && (
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardHeader>
            <CardTitle className="text-base">Savings Targets</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {data.savingsTargets.slice(0, 3).map((target: any) => {
              const progress = (target.currentAmount / target.targetAmount) * 100;
              return (
                <div key={target.id} className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">{target.name}</span>
                    <span className="text-muted-foreground">
                      {progress.toFixed(1)}%
                    </span>
                  </div>
                  {/* Progress bar with simplified design */}
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              );
            })}
            {data.savingsTargets.length > 3 && (
              <div className="text-center text-xs text-muted-foreground mt-4">
                + {data.savingsTargets.length - 3} more targets
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
