'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Lock, Check } from 'lucide-react';
import { Stage, STAGES } from './types';
import { getCurrencyFormat } from '@/lib/utils';

interface AllStagesGridProps {
  totalSavings: number;
  currentStageId: string;
}

export function AllStagesGrid({ totalSavings, currentStageId }: AllStagesGridProps) {
  const isStageUnlocked = (stage: Stage): boolean => {
    return totalSavings >= stage.range[0];
  };

  const isStageCurrent = (stage: Stage): boolean => {
    return stage.id === currentStageId;
  };

  // Calculate progress to next stage
  const progressToNextStage = (stage: Stage, currentTotal: number): number => {
    const nextStage = STAGES.find(s => s.id === stage.id);
    if (!nextStage || nextStage.range[1] === Infinity) return 100;
    const rangeStart = stage.range[0];
    const rangeEnd = nextStage.range[1];
    const currentProgress = currentTotal - rangeStart;
    const totalRange = rangeEnd - rangeStart;
    return Math.min(Math.max((currentProgress / totalRange) * 100, 0), 100);
  };

  return (
    <TooltipProvider>
      <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
        {STAGES.map((stage) => {
          const unlocked = isStageUnlocked(stage);
          const current = isStageCurrent(stage);
          const progress = progressToNextStage(stage, totalSavings);

          return (
            <Card
              key={stage.id}
              className={`
                relative overflow-hidden transition-all duration-300 hover:scale-105 hover:shadow-lg
                ${current ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : ''}
                ${unlocked ? 'bg-gradient-to-br from-card/80 to-card/50' : 'bg-muted/30'}
              `}
            >
              <CardContent className={`p-4 space-y-3 ${unlocked ? '' : 'backdrop-blur-sm select-none'}`}>
                {/* Status Icon */}
                <div className="absolute top-2 right-2">
                  {current ? (
                    <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                      <span className="text-sm">📍</span>
                    </div>
                  ) : unlocked ? (
                    <div className="w-6 h-6 bg-green-500/20 rounded-full flex items-center justify-center">
                      <Check className="h-3 w-3 text-green-500" />
                    </div>
                  ) : (
                    <div className="w-6 h-6 bg-muted rounded-full flex items-center justify-center">
                      <Lock className="h-3 w-3 text-muted-foreground" />
                    </div>
                  )}
                </div>

                {/* Emoji & Name */}
                <div className="space-y-2">
                  <div className={`text-3xl ${current ? 'animate-pulse' : 'blur-sm opacity-40'}`}>
                    {unlocked ? stage.emoji : '🔒'}
                  </div>
                  <div>
                    <h3 className={`font-bold text-base ${!unlocked ? 'blur-sm opacity-40' : ''}`}>
                      {stage.name}
                    </h3>
                    {current && (
                      <p className="text-[10px] text-primary font-medium">Fase Saat Ini</p>
                    )}
                  </div>
                </div>

                {/* Range */}
                <div className="text-xs text-muted-foreground">
                  <p className={unlocked ? '' : 'blur-sm opacity-50'}>
                    {stage.range[1] === Infinity
                      ? `> ${getCurrencyFormat(stage.range[0])}`
                      : `${getCurrencyFormat(stage.range[0])} - ${getCurrencyFormat(stage.range[1])}`
                    }
                  </p>
                </div>

                {/* Tooltip */}
                <Tooltip delayDuration={300}>
                  <TooltipTrigger asChild>
                    <button className="w-full text-left text-xs text-muted-foreground hover:text-foreground transition-colors">
                      <div className="p-2 bg-muted/50 rounded-lg">
                        <p className="font-medium text-foreground mb-1">💡 {stage.advice}</p>
                        <p>🎯 {stage.focus}</p>
                      </div>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent className={`max-w-xs" side="top" ${!unlocked ? 'blur-sm opacity-50' : ''}`}>
                    <div className="space-y-2">
                      <p className="font-semibold">{stage.name}</p>
                      <div className="text-sm space-y-1">
                        <p><span className="font-medium">Mindset:</span> {stage.advice}</p>
                        <p><span className="font-medium">Fokus:</span> {stage.focus}</p>
                      </div>
                      {current && (
                        <p className="text-xs text-primary mt-2">
                          {progress.toFixed(0)}% lagi menuju fase selanjutnya
                        </p>
                      )}
                    </div>
                  </TooltipContent>
                </Tooltip>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </TooltipProvider>
  );
}
