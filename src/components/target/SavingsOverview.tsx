'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { PiggyBank, Plus, Calendar, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from '@/hooks/useTranslation';
import { useCurrencyFormat } from '@/hooks/useCurrencyFormat';
import { format } from 'date-fns';
import { SavingsTarget } from '@/types/transaction.types';

const THEME = {
  surface: '#121212',
  primary: '#BB86FC',
  secondary: '#03DAC6',
  destructive: '#CF6679',
  warning: '#F9A825',
  coral: '#CF6679',
  gold: '#F9A825',
  muted: '#9E9E9E',
  border: 'rgba(255,255,255,0.06)',
  text: '#FFFFFF',
  textSecondary: '#B3B3B3',
};

type TargetStatus = 'on-track' | 'behind' | 'at-risk' | 'completed';

function getTargetStatus(target: SavingsTarget): TargetStatus {
  const now = new Date();
  const targetDate = new Date(target.targetDate);
  const progress = target.targetAmount > 0 ? (target.currentAmount / target.targetAmount) * 100 : 0;

  if (progress >= 100) return 'completed';

  const monthsUntilTarget = Math.max(
    (targetDate.getTime() - now.getTime()) / (30 * 24 * 60 * 60 * 1000),
    0.1
  );
  const remainingAmount = Math.max(target.targetAmount - target.currentAmount, 0);
  const requiredMonthly = remainingAmount / monthsUntilTarget;
  const isOnTrack = target.monthlyContribution >= requiredMonthly;

  if (!isOnTrack && monthsUntilTarget < 3) return 'at-risk';
  if (!isOnTrack) return 'behind';
  return 'on-track';
}

function getStatusConfig(status: TargetStatus) {
  switch (status) {
    case 'on-track':
      return { color: THEME.secondary, labelKey: 'target.healthy', bg: `${THEME.secondary}15` };
    case 'behind':
      return { color: THEME.gold, labelKey: 'target.critical', bg: `${THEME.gold}15` };
    case 'at-risk':
      return { color: THEME.coral, labelKey: 'target.statusAtRisk', bg: `${THEME.coral}15` };
    case 'completed':
      return { color: THEME.primary, labelKey: 'target.completed', bg: `${THEME.primary}15` };
  }
}

function getEstimatedCompletion(target: SavingsTarget): string | null {
  const progress = target.targetAmount > 0 ? (target.currentAmount / target.targetAmount) * 100 : 0;
  if (progress >= 100) return null;
  if (target.monthlyContribution <= 0) return null;

  const remaining = Math.max(target.targetAmount - target.currentAmount, 0);
  const monthsNeeded = remaining / target.monthlyContribution;
  const etaDate = new Date();
  etaDate.setMonth(etaDate.getMonth() + Math.ceil(monthsNeeded));

  return format(etaDate, 'MMM yyyy');
}

export function SavingsOverview() {
  const { t } = useTranslation();
  const { formatAmount } = useCurrencyFormat();
  const [targets, setTargets] = useState<SavingsTarget[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchTargets = useCallback(async () => {
    try {
      const res = await fetch('/api/savings');
      if (res.ok) {
        const data = await res.json();
        setTargets(data.savingsTargets || []);
      }
    } catch {
      // silent
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTargets();
  }, [fetchTargets]);

  // Total savings
  const totalSaved = targets.reduce((s, t) => s + t.currentAmount, 0);
  const totalTarget = targets.reduce((s, t) => s + t.targetAmount, 0);
  const overallProgress = totalTarget > 0 ? (totalSaved / totalTarget) * 100 : 0;

  // Status counts
  const onTrackCount = targets.filter(t => getTargetStatus(t) === 'on-track').length;
  const behindCount = targets.filter(t => getTargetStatus(t) === 'behind').length;
  const atRiskCount = targets.filter(t => getTargetStatus(t) === 'at-risk').length;
  const completedCount = targets.filter(t => getTargetStatus(t) === 'completed').length;

  if (isLoading) {
    return (
      <div className="rounded-xl p-4 sm:p-5" style={{ background: THEME.surface, border: `1px solid ${THEME.border}` }}>
        <div className="flex items-center justify-center h-48">
          <div className="w-12 h-12 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: THEME.border, borderTopColor: 'transparent' }} />
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl overflow-hidden relative" style={{ background: THEME.surface, border: `1px solid ${THEME.border}` }}>
      {/* Subtle glow */}
      <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full blur-3xl opacity-[0.06] pointer-events-none" style={{ background: THEME.secondary }} />

      <div className="p-4 sm:p-5">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg grid place-items-center [&>*]:block leading-none" style={{ background: `${THEME.secondary}15` }}>
              <PiggyBank className="h-3.5 w-3.5" style={{ color: THEME.secondary }} />
            </div>
            <h3 className="text-sm font-semibold" style={{ color: THEME.text }}>{t('target.overviewTitle')}</h3>
          </div>
          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full" style={{ background: `${THEME.border}`, color: THEME.muted }}>
            {t('target.targetCount', { count: targets.length })}
          </span>
        </div>

        {targets.length === 0 ? (
          <div className="text-center py-6">
            <PiggyBank className="h-8 w-8 mx-auto mb-2" style={{ color: THEME.muted, opacity: 0.4 }} />
            <p className="text-xs font-medium" style={{ color: THEME.textSecondary }}>{t('target.noSavingsTargets')}</p>
            <p className="text-[10px] mt-0.5" style={{ color: THEME.muted }}>
              {t('target.setGoalStartSaving')}
            </p>
            <Button
              variant="ghost"
              size="sm"
              className="mt-3 text-[11px] font-medium rounded-lg"
              style={{ background: `${THEME.secondary}10`, color: THEME.secondary, border: `1px solid ${THEME.secondary}15` }}
              onClick={() => toast.info(t('target.goToTargetsTab'))}
            >
              <Plus className="h-3 w-3 mr-1" />
              {t('target.quickAdd')}
            </Button>
          </div>
        ) : (
          <>
            {/* Total Savings Summary */}
            <div className="mb-4 p-3 rounded-lg" style={{ background: 'rgba(255,255,255,0.02)', border: `1px solid ${THEME.border}` }}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-medium" style={{ color: THEME.textSecondary }}>{t('target.totalSaved')}</span>
                <span className="text-xs font-bold" style={{ color: THEME.secondary }}>
                  {formatAmount(totalSaved)}
                </span>
              </div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-medium" style={{ color: THEME.textSecondary }}>{t('target.totalTargetAmount')}</span>
                <span className="text-xs font-bold" style={{ color: THEME.text }}>
                  {formatAmount(totalTarget)}
                </span>
              </div>
              <div className="h-2 rounded-full overflow-hidden" style={{ background: THEME.border }}>
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min(overallProgress, 100)}%`,
                    background: `linear-gradient(90deg, ${THEME.secondary}, ${THEME.primary})`,
                  }}
                />
              </div>
              <div className="flex items-center justify-between mt-1.5">
                <span className="text-[10px]" style={{ color: THEME.muted }}>
                  {t('target.percentOverall', { percent: (overallProgress || 0).toFixed(0) })}
                </span>
                <div className="flex items-center gap-2">
                  {onTrackCount > 0 && (
                    <span className="text-[9px] font-medium" style={{ color: THEME.secondary }}>
                      {t('target.countOnTrack', { count: onTrackCount })}
                    </span>
                  )}
                  {(behindCount > 0 || atRiskCount > 0) && (
                    <span className="text-[9px] font-medium" style={{ color: THEME.gold }}>
                      {t('target.countNeedAttention', { count: behindCount + atRiskCount })}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Target List */}
            <div className="space-y-2.5 max-h-64 overflow-y-auto">
              {targets.map((target, index) => {
                const status = getTargetStatus(target);
                const statusConfig = getStatusConfig(status);
                const progress = target.targetAmount > 0 ? Math.min((target.currentAmount / target.targetAmount) * 100, 100) : 0;
                const eta = getEstimatedCompletion(target);
                const remaining = Math.max(target.targetAmount - target.currentAmount, 0);
                const daysLeft = Math.max(
                  Math.ceil((new Date(target.targetDate).getTime() - Date.now()) / (24 * 60 * 60 * 1000)),
                  0
                );

                return (
                  <motion.div
                    key={target.id}
                    className="p-3 rounded-lg transition-all duration-200 group relative overflow-hidden"
                    style={{ background: 'rgba(255,255,255,0.02)', border: `1px solid ${THEME.border}` }}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25, delay: index * 0.05 }}
                  >
                    {/* Status indicator bar */}
                    <div
                      className="absolute left-0 top-0 bottom-0 w-[3px]"
                      style={{ background: statusConfig.color }}
                    />

                    <div className="pl-2">
                      {/* Header row */}
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-semibold truncate" style={{ color: THEME.text }}>
                          {target.name}
                        </span>
                        <span
                          className="text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ml-2"
                          style={{ background: statusConfig.bg, color: statusConfig.color }}
                        >
                          {t(statusConfig.labelKey)}
                        </span>
                      </div>

                      {/* Progress bar */}
                      <div className="h-1.5 rounded-full overflow-hidden mb-1.5" style={{ background: THEME.border }}>
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${progress}%`,
                            background: status === 'completed'
                              ? `linear-gradient(90deg, ${THEME.primary}, ${THEME.secondary})`
                              : statusConfig.color,
                          }}
                        />
                      </div>

                      {/* Details row */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-[10px] tabular-nums" style={{ color: THEME.textSecondary }}>
                            {formatAmount(target.currentAmount)} / {formatAmount(target.targetAmount)}
                          </span>
                          <span className="text-[10px] font-bold" style={{ color: statusConfig.color }}>
                            {(progress || 0).toFixed(0)}%
                          </span>
                        </div>
                      </div>

                      {/* ETA and deadline info */}
                      <div className="flex items-center gap-3 mt-1.5">
                        {eta && (
                          <span className="text-[9px] flex items-center gap-1" style={{ color: THEME.muted }}>
                            <TrendingUp className="h-2.5 w-2.5" />
                            {t('target.eta')}: {eta}
                          </span>
                        )}
                        <span className="text-[9px] flex items-center gap-1" style={{ color: THEME.muted }}>
                          <Calendar className="h-2.5 w-2.5" />
                          {t('target.daysLeftOverview', { days: daysLeft })}
                        </span>
                        {status !== 'completed' && remaining > 0 && (
                          <span className="text-[9px]" style={{ color: THEME.muted }}>
                            {t('target.remainingOverview', { amount: formatAmount(remaining) })}
                          </span>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Quick Add Button */}
            <Button
              variant="ghost"
              size="sm"
              className="w-full mt-3 text-[11px] font-medium rounded-lg transition-all hover:scale-[1.01]"
              style={{
                background: `${THEME.secondary}08`,
                color: THEME.secondary,
                border: `1px solid ${THEME.secondary}15`,
              }}
              onClick={() => toast.info(t('target.goToTargetsTab'))}
            >
              <Plus className="h-3 w-3 mr-1" />
              {t('target.quickAddTarget')}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
