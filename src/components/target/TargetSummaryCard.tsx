'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Target, TrendingUp, AlertTriangle, CheckCircle2, Calendar, Flame } from 'lucide-react';
import { SavingsTarget } from '@/types/transaction.types';
import { getCurrencyFormat } from '@/lib/targetLogic';

interface TargetSummaryCardProps {
  savingsTargets: SavingsTarget[];
}

export function TargetSummaryCard({ savingsTargets }: TargetSummaryCardProps) {
  // Calculate aggregate metrics
  const activeTargets = savingsTargets.filter(t => t.targetAmount > t.currentAmount);
  const totalTargetAmount = savingsTargets.reduce((sum, t) => sum + t.targetAmount, 0);
  const totalCurrentAmount = savingsTargets.reduce((sum, t) => sum + t.currentAmount, 0);
  const totalRemaining = savingsTargets.reduce((sum, t) => sum + (t.targetAmount - t.currentAmount), 0);
  const overallProgress = totalTargetAmount > 0 ? (totalCurrentAmount / totalTargetAmount) * 100 : 0;

  const totalMonthlyTarget = savingsTargets.reduce((sum, t) => sum + t.monthlyContribution, 0);
  const totalMonthlyActual = savingsTargets.reduce((sum, t) => sum + (t.currentMonthlyAllocation || 0), 0);
  const overallMonthlyAchievement = totalMonthlyTarget > 0 ? (totalMonthlyActual / totalMonthlyTarget) * 100 : 0;

  // Count by status
  const healthyCount = savingsTargets.filter(t => t.metrics?.targetStatus === 'healthy').length;
  const warningCount = savingsTargets.filter(t => t.metrics?.targetStatus === 'warning').length;
  const criticalCount = savingsTargets.filter(t => t.metrics?.targetStatus === 'critical').length;

  // Calculate average ETA (finite values only)
  const etas = savingsTargets
    .map(t => t.metrics?.etaInMonths)
    .filter(eta => eta !== undefined && eta !== Infinity && eta !== null);

  const avgETA = etas.length > 0
    ? etas.reduce((sum, eta) => sum + eta, 0) / etas.length
    : Infinity;

  // Get brutal summary insight
  const getSummaryInsight = () => {
    if (savingsTargets.length === 0) {
      return {
        text: "Belum ada target aktif. Mulai buat target pertama kamu!",
        emoji: "🎯",
        color: "text-primary",
      };
    }

    if (criticalCount > 0) {
      return {
        text: `${criticalCount} target sedang sekarat. Kamu butuh aksi serius.`,
        emoji: "🔴",
        color: "text-destructive",
      };
    }

    if (warningCount > 0) {
      return {
        text: `${warningCount} target terancam. Waktu terus jalan, jangan santai.`,
        emoji: "🟡",
        color: "text-yellow-500",
      };
    }

    if (overallMonthlyAchievement >= 100) {
      return {
        text: "Semua target on fire! Kamu di atas rencana bulanan.",
        emoji: "🔥",
        color: "text-green-500",
      };
    }

    if (overallMonthlyAchievement >= 80) {
      return {
        text: "Lumayan, tapi masih ada gap kecil yang bisa ditutup.",
        emoji: "⚡",
        color: "text-blue-500",
      };
    }

    const monthlyGap = totalMonthlyTarget - totalMonthlyActual;
    if (monthlyGap > 100000) {
      return {
        text: `Target bulanan kurang Rp${monthlyGap.toLocaleString('id-ID')}. Naikkan segera!`,
        emoji: "⚠️",
        color: "text-orange-500",
      };
    }

    return {
      text: "Semua target sehat. Pertahankan momentum ini!",
      emoji: "✅",
      color: "text-green-500",
    };
  };

  const summaryInsight = getSummaryInsight();

  return (
    <Card className="bg-gradient-to-br from-primary/10 via-primary/5 to-primary/10 border-primary/20 overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <Target className="h-6 w-6 text-primary" />
            <CardTitle className="text-lg">Ringkasan Semua Target</CardTitle>
          </div>
          <Badge variant="outline" className="text-xs">
            {savingsTargets.length} Target Aktif
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {/* 6 COLUMN GRID LAYOUT */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          
          {/* COLUMN 1: Brutal Insight */}
          <div className="lg:col-span-1 bg-background/50 backdrop-blur-sm rounded-lg p-4 border border-border/50">
            <div className="flex items-start gap-2">
              <span className="text-2xl flex-shrink-0">{summaryInsight.emoji}</span>
              <div>
                <p className="text-xs text-muted-foreground mb-1">🎯 Insight</p>
                <p className={`text-sm font-semibold ${summaryInsight.color}`}>
                  {summaryInsight.text}
                </p>
              </div>
            </div>
          </div>

          {/* COLUMN 2: Overall Progress */}
          <div className="lg:col-span-1 bg-background/50 backdrop-blur-sm rounded-lg p-4 border border-border/50">
            <div className="flex items-center gap-2 mb-2">
              <Target className="h-4 w-4 text-primary" />
              <span className="text-xs font-semibold text-muted-foreground">📊 Overall Progress</span>
            </div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-2xl font-bold text-primary">
                {overallProgress.toFixed(1)}%
              </span>
            </div>
            <Progress value={Math.min(overallProgress, 100)} className="h-2 mb-3" />
            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Terkumpul</span>
                <span className="font-semibold">{getCurrencyFormat(totalCurrentAmount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Target Total</span>
                <span className="font-semibold">{getCurrencyFormat(totalTargetAmount)}</span>
              </div>
              <div className="flex justify-between pt-1 border-t border-border/50">
                <span className="text-destructive">Kurang</span>
                <span className="font-bold text-destructive">{getCurrencyFormat(totalRemaining)}</span>
              </div>
            </div>
          </div>

          {/* COLUMN 3: Status Overview */}
          <div className="lg:col-span-1 bg-background/50 backdrop-blur-sm rounded-lg p-4 border border-border/50">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-4 w-4 text-primary" />
              <span className="text-xs font-semibold text-muted-foreground">📈 Status Overview</span>
            </div>
            <div className="space-y-2">
              {healthyCount > 0 && (
                <div className="flex items-center justify-between bg-green-500/10 rounded-lg p-2">
                  <div className="flex items-center gap-1">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <span className="text-xs text-green-600">Sehat</span>
                  </div>
                  <span className="text-lg font-bold text-green-500">{healthyCount}</span>
                </div>
              )}
              {warningCount > 0 && (
                <div className="flex items-center justify-between bg-yellow-500/10 rounded-lg p-2">
                  <div className="flex items-center gap-1">
                    <AlertTriangle className="h-4 w-4 text-yellow-500" />
                    <span className="text-xs text-yellow-600">Terancam</span>
                  </div>
                  <span className="text-lg font-bold text-yellow-500">{warningCount}</span>
                </div>
              )}
              {criticalCount > 0 && (
                <div className="flex items-center justify-between bg-red-500/10 rounded-lg p-2">
                  <div className="flex items-center gap-1">
                    <AlertTriangle className="h-4 w-4 text-red-500" />
                    <span className="text-xs text-red-600">Sekarat</span>
                  </div>
                  <span className="text-lg font-bold text-red-500">{criticalCount}</span>
                </div>
              )}
              {healthyCount === 0 && warningCount === 0 && criticalCount === 0 && (
                <div className="flex items-center justify-center bg-muted/50 rounded-lg p-2">
                  <span className="text-xs text-muted-foreground">Semua target on track</span>
                </div>
              )}
            </div>
          </div>

          {/* COLUMN 4: Monthly Performance */}
          {totalMonthlyTarget > 0 && (
            <div className="lg:col-span-1 bg-background/50 backdrop-blur-sm rounded-lg p-4 border border-border/50">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="h-4 w-4 text-primary" />
                <span className="text-xs font-semibold text-muted-foreground">📅 Monthly Performance</span>
              </div>
              <div className="space-y-2 text-xs mb-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Realisasi</span>
                  <span className="font-semibold">{getCurrencyFormat(totalMonthlyActual)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Target</span>
                  <span className="font-semibold">{getCurrencyFormat(totalMonthlyTarget)}</span>
                </div>
              </div>
              <Progress value={Math.min(overallMonthlyAchievement, 100)} className="h-2 mb-2" />
              <div className="flex justify-center">
                <Badge className={
                  overallMonthlyAchievement >= 100 ? 'bg-green-500' :
                  overallMonthlyAchievement >= 80 ? 'bg-blue-500' :
                  overallMonthlyAchievement >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                } variant="secondary">
                  {overallMonthlyAchievement >= 100 ? '🔥 On Fire!' :
                     overallMonthlyAchievement >= 80 ? 'Hampir!' :
                     overallMonthlyAchievement >= 50 ? 'On Track' : 'Perlu Usaha'}
                </Badge>
              </div>
            </div>
          )}

          {/* COLUMN 5: ETA Overview */}
          {etas.length > 0 && (
            <div className="lg:col-span-1 bg-background/50 backdrop-blur-sm rounded-lg p-4 border border-border/50">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                <span className="text-xs font-semibold text-muted-foreground">⏱️ ETA Overview</span>
              </div>
              <div className="space-y-2">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Rata-rata Estimasi</p>
                  <p className="text-xl font-bold text-primary">
                    {avgETA === Infinity ? '∞' : 
                     avgETA <= 1 ? 'Kurang dari 1 bulan' : 
                     avgETA === 1 ? '1 bulan' : 
                     `${Math.round(avgETA)} bulan`}
                  </p>
                </div>
                <div className="pt-2 border-t border-border/50">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">Target Aktif</span>
                    <span className="text-lg font-bold text-primary">{activeTargets.length}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* COLUMN 6: Achievement Summary */}
          <div className="lg:col-span-1 bg-gradient-to-br from-orange-500/10 via-orange-500/5 to-orange-500/10 rounded-lg p-4 border border-orange-500/20">
            <div className="flex items-center gap-2 mb-2">
              <Flame className="h-4 w-4 text-orange-500" />
              <span className="text-xs font-semibold text-orange-600">🏆 Achievement</span>
            </div>
            <div className="space-y-2">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Bulan Ini</p>
                <p className="text-2xl font-bold text-orange-500">
                  {overallMonthlyAchievement.toFixed(0)}%
                </p>
              </div>
              <div className="pt-2 border-t border-orange-500/20">
                <p className="text-xs text-muted-foreground">
                  {overallMonthlyAchievement >= 100 ? '🎉 Target terlampaui!' :
                   overallMonthlyAchievement >= 80 ? '👍 Hampir sampai!' :
                   overallMonthlyAchievement >= 50 ? '📈 Progress bagus!' :
                   '💪 Ayo semangat!'}
                </p>
              </div>
            </div>
          </div>

        </div>
      </CardContent>
    </Card>
  );
}
