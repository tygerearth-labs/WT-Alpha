import { SavingsTarget } from '@/types/transaction.types';

export type TargetStatus = "healthy" | "warning" | "critical";
export type SpeedStatus = "fast" | "normal" | "slow";

export interface TargetMetrics {
  progressPercent: number;
  remainingAmount: number;
  etaInMonths: number;
  avgMonthlySaving: number;
  doNothingETA: number;
  speedStatus: SpeedStatus;
  targetStatus: TargetStatus;
  isOnTrack: boolean;
}

/**
 * Calculate progress percentage
 */
export function getProgressPercent(current: number, target: number): number {
  if (target <= 0) return 0;
  return Math.min(100, (current / target) * 100);
}

/**
 * Calculate remaining amount
 */
export function getRemainingAmount(current: number, target: number): number {
  return Math.max(0, target - current);
}

/**
 * Calculate average monthly saving from allocation history
 */
export function getAvgMonthlySaving(allocations: any[], monthsToConsider: number = 3): number {
  if (!allocations || allocations.length === 0) return 0;

  const now = new Date();
  const cutoffDate = new Date(now.setMonth(now.getMonth() - monthsToConsider));

  const recentAllocations = allocations.filter(
    (alloc) => new Date(alloc.createdAt) >= cutoffDate
  );

  if (recentAllocations.length === 0) return 0;

  const totalAllocated = recentAllocations.reduce((sum, alloc) => sum + alloc.amount, 0);
  return totalAllocated / monthsToConsider;
}

/**
 * Get current month's actual allocation
 */
export function getCurrentMonthAllocation(allocations: any[]): number {
  if (!allocations || allocations.length === 0) return 0;

  const now = new Date();
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  return allocations
    .filter((alloc) => new Date(alloc.createdAt) >= firstDayOfMonth)
    .reduce((sum, alloc) => sum + alloc.amount, 0);
}

/**
 * Calculate ETA in months based on average monthly saving
 */
export function getETAInMonths(remaining: number, avgMonthlySaving: number): number {
  if (avgMonthlySaving <= 0) return Infinity;
  return Math.ceil(remaining / avgMonthlySaving);
}

/**
 * Determine speed status based on planned vs actual monthly saving
 */
export function getSpeedStatus(avgMonthly: number, plannedMonthly: number): SpeedStatus {
  if (plannedMonthly <= 0) return "normal";
  if (avgMonthly >= plannedMonthly) return "fast";
  if (avgMonthly >= plannedMonthly * 0.7) return "normal";
  return "slow";
}

/**
 * Determine target health status based on ETA
 */
export function getTargetStatus(etaInMonths: number): TargetStatus {
  if (etaInMonths === Infinity) return "critical";
  if (etaInMonths <= 12) return "healthy";
  if (etaInMonths <= 18) return "warning";
  return "critical";
}

/**
 * Calculate "If You Do Nothing" ETA
 */
export function getDoNothingETA(remaining: number, plannedMonthly: number): number {
  if (plannedMonthly <= 0) return Infinity;
  return Math.ceil(remaining / plannedMonthly);
}

/**
 * Get phase contribution percentage
 */
export function getPhaseContribution(current: number, phaseTarget: number): number {
  if (phaseTarget <= 0) return 0;
  return Math.min(100, (current / phaseTarget) * 100);
}

/**
 * Calculate complete target metrics
 */
export function calculateTargetMetrics(
  target: SavingsTarget,
  allocations: any[]
): TargetMetrics {
  const progressPercent = getProgressPercent(target.currentAmount, target.targetAmount);
  const remainingAmount = getRemainingAmount(target.currentAmount, target.targetAmount);
  const avgMonthlySaving = getAvgMonthlySaving(allocations);
  const etaInMonths = getETAInMonths(remainingAmount, avgMonthlySaving);
  const doNothingETA = getDoNothingETA(remainingAmount, target.monthlyContribution);
  const speedStatus = getSpeedStatus(avgMonthlySaving, target.monthlyContribution);
  const targetStatus = getTargetStatus(etaInMonths);
  const isOnTrack = avgMonthlySaving >= target.monthlyContribution * 0.8;

  return {
    progressPercent,
    remainingAmount,
    etaInMonths,
    avgMonthlySaving,
    doNothingETA,
    speedStatus,
    targetStatus,
    isOnTrack,
  };
}

/**
 * Get brutal insight based on target data
 */
export function getBrutalInsight(
  metrics: TargetMetrics,
  target: SavingsTarget,
  t?: (key: string, params?: Record<string, string | number>) => string
): string {
  const { progressPercent, speedStatus, etaInMonths, avgMonthlySaving, doNothingETA } = metrics;
  const monthlyContribution = target.monthlyContribution;

  // Critical status insights
  if (metrics.targetStatus === "critical") {
    if (speedStatus === "slow") {
      return t ? t('target.insightCriticalSlow') : "Masalahnya bukan penghasilan, tapi konsistensi kamu drop drastis.";
    }
    if (etaInMonths > 24) {
      return t ? t('target.insightCriticalFar') : "Target ini tidak gagal, kamu yang terlalu santai. 2 tahun ke depan sama aja.";
    }
    return t ? t('target.insightCriticalDefault') : "Kalau target ini tidak tercapai, bukan karena nasib, tapi karena kamu menyerah duluan.";
  }

  // Warning status insights
  if (metrics.targetStatus === "warning") {
    if (speedStatus === "slow") {
      return t ? t('target.insightWarningSlow') : "Kecepatan kamu di bawah target bulanan. Naikkan atau siap-siap telat.";
    }
    return t ? t('target.insightWarningDefault') : "Lumayan, tapi masih ada gap yang harus ditutup secepatnya.";
  }

  // Healthy status insights
  if (speedStatus === "fast") {
    const monthsSaved = Math.round(doNothingETA - etaInMonths);
    if (monthsSaved >= 3) {
      return t
        ? t('target.insightFastMonths', { months: monthsSaved })
        : `Kamu lebih cepat ${monthsSaved} bulan dari rencana. Pertahankan ini!`;
    }
    return t ? t('target.insightFast') : "Kecepatan oke, jangan kendor sekarang.";
  }

  // Default insight for on-track
  const gap = monthlyContribution - avgMonthlySaving;
  if (gap > 50000) {
    return t ? t('target.insightGap', { amount: 'Rp50.000' }) : "Tambah Rp50.000/bulan = target lebih cepat 3 bulan.";
  }
  if (gap > 0) {
    return t
      ? t('target.insightGap', { amount: `Rp${gap.toLocaleString('id-ID')}` })
      : `Masih kurang Rp${gap.toLocaleString('id-ID')}/bulan dari target.`;
  }

  return t ? t('target.insightHealthy') : "Target ini sehat. Lanjut!";
}

/**
 * Get speed indicator copy
 */
export function getSpeedCopy(
  speed: SpeedStatus,
  t?: (key: string, params?: Record<string, string | number>) => string
): { text: string; emoji: string; color: string } {
  const speedCopy = {
    fast: {
      text: t ? t('target.speedFast') : "Lebih cepat dari rencana. Mantap.",
      emoji: "⚡",
      color: "text-green-500",
    },
    normal: {
      text: t ? t('target.speedNormal') : "Masih sesuai rencana.",
      emoji: "➖",
      color: "text-yellow-500",
    },
    slow: {
      text: t ? t('target.speedSlow') : "Terlalu santai. Waktu terus jalan.",
      emoji: "🐌",
      color: "text-red-500",
    },
  };

  return speedCopy[speed];
}

/**
 * Get status badge copy
 */
export function getStatusCopy(
  status: TargetStatus,
  t?: (key: string, params?: Record<string, string | number>) => string
): { text: string; subtext: string; emoji: string; color: string } {
  const statusCopy = {
    healthy: {
      text: t ? t('target.healthy') : "Sehat",
      subtext: t ? t('target.healthySub') : "Target ini on track. Jangan kendor.",
      emoji: "🟢",
      color: "bg-green-500",
    },
    warning: {
      text: t ? t('target.warning') : "Terancam",
      subtext: t ? t('target.warningSub') : "Target masih jalan, tapi mulai melambat.",
      emoji: "🟡",
      color: "bg-yellow-500",
    },
    critical: {
      text: t ? t('target.critical') : "Sekarat",
      subtext: t ? t('target.criticalSub') : "Dengan pola ini, target akan molor jauh.",
      emoji: "🔴",
      color: "bg-red-500",
    },
  };

  return statusCopy[status];
}

/**
 * Get ETA display text
 */
export function getETAText(
  etaInMonths: number,
  t?: (key: string, params?: Record<string, string | number>) => string
): string {
  if (etaInMonths === Infinity) return t ? t('target.etaInfinity') : "∞";
  if (etaInMonths < 1) return t ? t('target.lessThanMonth') : "Kurang dari 1 bulan";
  if (etaInMonths === 1) return t ? t('target.oneMonth') : "1 bulan";
  return t ? t('target.nMonths', { months: etaInMonths }) : `${etaInMonths} bulan`;
}

/**
 * Generate mini challenge based on target data
 */
export function generateMiniChallenge(
  target: SavingsTarget,
  metrics: TargetMetrics,
  t?: (key: string, params?: Record<string, string | number>) => string
): {
  title: string;
  description: string;
  targetAmount: number;
  reward: string;
  days: number;
} | null {
  const { remainingAmount } = metrics;

  if (remainingAmount <= 0) return null;

  // Challenge options based on remaining amount and speed
  const challenges = [
    {
      title: t ? t('target.challengeSprintTitle') : "7 Hari Ngebut",
      description: t ? t('target.challengeSprintDesc') : "Tambah Rp200.000 dalam 7 hari",
      targetAmount: 200000,
      reward: "+5 Consistency Score",
      days: 7,
    },
    {
      title: t ? t('target.challengeSet100Title') : "Setoran 100k",
      description: t ? t('target.challengeSet100Desc') : "Setoran Rp100.000 sekarang",
      targetAmount: 100000,
      reward: "+2 Momentum Points",
      days: 1,
    },
    {
      title: t ? t('target.challengeSet50Title') : "Semangat 50k",
      description: t ? t('target.challengeSet50Desc') : "Setoran Rp50.000 hari ini",
      targetAmount: 50000,
      reward: "+1 Consistency Score",
      days: 3,
    },
  ];

  // Pick a challenge that's achievable
  return challenges.find((c) => c.targetAmount <= remainingAmount) || null;
}


