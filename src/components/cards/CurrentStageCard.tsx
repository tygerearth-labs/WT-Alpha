'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Stage, getProgressToNextStage, getNextStage } from './types';
import { Info } from 'lucide-react';
import { getCurrencyFormat } from '@/lib/utils';

interface CurrentStageCardProps {
  totalSavings: number;
  currentStage: Stage;
}

export function CurrentStageCard({ totalSavings, currentStage }: CurrentStageCardProps) {
  const nextStage = getNextStage(currentStage);
  const progress = getProgressToNextStage(totalSavings, currentStage);
  const remaining = nextStage ? nextStage.range[0] - totalSavings : 0;

  return (
    <TooltipProvider>
      <Card className="bg-gradient-to-br from-card/80 to-card/50 backdrop-blur-sm border-border/50">
        <CardContent className="p-6 space-y-6">
          {/* Stage Header */}
          <div className="text-center space-y-4">
            <div className="text-7xl">{currentStage.emoji}</div>
            <div>
              <h2 className="text-3xl font-bold bg-gradient-to-r from-primary via-purple-500 to-pink-500 bg-clip-text text-transparent">
                {currentStage.name}
              </h2>
              <p className="text-sm text-muted-foreground mt-1">Fase Keuangan Anda</p>
            </div>
          </div>

          {/* Total Savings */}
          <div className="bg-primary/10 rounded-xl p-6 text-center space-y-2">
            <p className="text-sm text-muted-foreground">Total Tabungan</p>
            <p className="text-4xl font-bold text-primary">
              {getCurrencyFormat(totalSavings)}
            </p>
          </div>

          {/* Progress Bar */}
          {nextStage && (
            <div className="space-y-3">
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Progress ke {nextStage.name}</span>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button className="text-primary hover:text-primary/80">
                      <Info className="h-4 w-4" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs">
                      Rp {getCurrencyFormat(remaining)} lagi menuju {nextStage.name}
                    </p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <Progress value={progress} className="h-3" />
              <div className="text-center">
                <span className="text-2xl font-bold text-primary">{progress.toFixed(1)}%</span>
              </div>
            </div>
          )}

          {/* Mindset & Focus */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-xl p-4 space-y-2">
              <p className="text-sm font-medium text-primary">Mindset</p>
              <p className="text-lg font-semibold">{currentStage.advice}</p>
            </div>
            <div className="bg-gradient-to-br from-purple-500/10 to-purple-500/5 rounded-xl p-4 space-y-2">
              <p className="text-sm font-medium text-purple-500">Fokus</p>
              <p className="text-lg font-semibold">{currentStage.focus}</p>
            </div>
          </div>

          {/* Special Message for Garuda */}
          {currentStage.id === 'garuda' && (
            <div className="bg-gradient-to-r from-indigo-500/10 to-purple-500/10 rounded-xl p-4 text-center">
              <p className="text-lg font-semibold text-indigo-400">
                🎉 Buka kebebasan finansial di fase Garuda!
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}
