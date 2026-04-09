'use client';

import { cn } from '@/lib/utils';

/* ── Skeleton pulse bar ── */
function SkeletonBar({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'rounded-lg',
        'bg-gradient-to-r from-white/[0.04] via-white/[0.08] to-white/[0.04]',
        'animate-[shimmer_1.5s_ease-in-out_infinite]',
        'bg-[length:200%_100%]',
        className,
      )}
    />
  );
}

/* ── Skeleton circle (avatar, icon) ── */
function SkeletonCircle({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'rounded-full shrink-0',
        'bg-gradient-to-r from-white/[0.04] via-white/[0.08] to-white/[0.04]',
        'animate-[shimmer_1.5s_ease-in-out_infinite]',
        'bg-[length:200%_100%]',
        className,
      )}
    />
  );
}

/* ── Dashboard Skeleton ── */
export function DashboardSkeleton() {
  return (
    <div className="space-y-4 animate-[fadeIn_0.3s_ease-out]">
      {/* Hero net worth card */}
      <div className="rounded-2xl p-5" style={{ background: '#121212', border: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex items-center justify-between">
          <div className="space-y-2.5 flex-1">
            <SkeletonBar className="h-3 w-24" />
            <SkeletonBar className="h-8 w-48" />
            <SkeletonBar className="h-3 w-36" />
          </div>
          <SkeletonCircle className="h-12 w-12" />
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-xl p-3" style={{ background: '#121212', border: '1px solid rgba(255,255,255,0.06)' }}>
            <SkeletonBar className="h-2.5 w-12 mb-2" />
            <SkeletonBar className="h-5 w-full" />
          </div>
        ))}
      </div>

      {/* Chart area */}
      <div className="rounded-2xl p-5" style={{ background: '#121212', border: '1px solid rgba(255,255,255,0.06)' }}>
        <SkeletonBar className="h-3 w-32 mb-4" />
        <SkeletonBar className="h-[180px] w-full rounded-xl" />
      </div>

      {/* Cards row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-2xl p-4" style={{ background: '#121212', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="flex items-center gap-2 mb-3">
              <SkeletonCircle className="h-4 w-4" />
              <SkeletonBar className="h-3 w-20" />
            </div>
            <SkeletonBar className="h-5 w-3/4 mb-2" />
            <SkeletonBar className="h-2.5 w-full" />
            <SkeletonBar className="h-2.5 w-2/3 mt-1.5" />
          </div>
        ))}
      </div>

      {/* Shimmer keyframe */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}} />
    </div>
  );
}

/* ── Transaction Page Skeleton (KasMasuk / KasKeluar) ── */
export function TransactionPageSkeleton() {
  return (
    <div className="space-y-4 animate-[fadeIn_0.3s_ease-out]">
      {/* Header */}
      <div className="flex items-center justify-between">
        <SkeletonBar className="h-6 w-32" />
        <SkeletonBar className="h-9 w-24 rounded-xl" />
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="rounded-xl p-4" style={{ background: '#121212', border: '1px solid rgba(255,255,255,0.06)' }}>
            <SkeletonBar className="h-2.5 w-16 mb-2" />
            <SkeletonBar className="h-6 w-28" />
          </div>
        ))}
      </div>

      {/* Transaction list */}
      <div className="rounded-2xl" style={{ background: '#121212', border: '1px solid rgba(255,255,255,0.06)' }}>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 p-3.5" style={{ borderBottom: i < 5 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
            <SkeletonCircle className="h-9 w-9" />
            <div className="flex-1 min-w-0 space-y-1.5">
              <SkeletonBar className="h-3.5 w-3/4" />
              <SkeletonBar className="h-2.5 w-1/3" />
            </div>
            <SkeletonBar className="h-4 w-20" />
          </div>
        ))}
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}} />
    </div>
  );
}

/* ── Laporan (Report) Skeleton ── */
export function LaporanSkeleton() {
  return (
    <div className="space-y-4 animate-[fadeIn_0.3s_ease-out]">
      {/* Header */}
      <div className="flex items-center justify-between">
        <SkeletonBar className="h-6 w-28" />
        <SkeletonBar className="h-9 w-28 rounded-xl" />
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-xl p-4" style={{ background: '#121212', border: '1px solid rgba(255,255,255,0.06)' }}>
            <SkeletonBar className="h-2.5 w-20 mb-2" />
            <SkeletonBar className="h-6 w-32" />
          </div>
        ))}
      </div>

      {/* Chart area */}
      <div className="rounded-2xl p-5" style={{ background: '#121212', border: '1px solid rgba(255,255,255,0.06)' }}>
        <SkeletonBar className="h-3 w-28 mb-4" />
        <div className="flex gap-3">
          <SkeletonBar className="h-[200px] flex-1 rounded-xl" />
          <SkeletonBar className="h-[200px] flex-1 rounded-xl" />
        </div>
      </div>

      {/* Category breakdown */}
      <div className="rounded-2xl p-4" style={{ background: '#121212', border: '1px solid rgba(255,255,255,0.06)' }}>
        <SkeletonBar className="h-3 w-32 mb-4" />
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 py-2.5" style={{ borderBottom: i < 4 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
            <SkeletonCircle className="h-3 w-3" />
            <SkeletonBar className="h-3 w-24 flex-1" />
            <SkeletonBar className="h-3 w-16" />
          </div>
        ))}
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}} />
    </div>
  );
}

/* ── Target Tabungan Skeleton ── */
export function TargetSkeleton() {
  return (
    <div className="space-y-4 animate-[fadeIn_0.3s_ease-out]">
      {/* Header */}
      <div className="flex items-center justify-between">
        <SkeletonBar className="h-6 w-36" />
        <SkeletonBar className="h-9 w-28 rounded-xl" />
      </div>

      {/* Summary */}
      <div className="rounded-2xl p-4" style={{ background: '#121212', border: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="grid grid-cols-3 gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="text-center">
              <SkeletonBar className="h-2.5 w-12 mx-auto mb-1.5" />
              <SkeletonBar className="h-5 w-16 mx-auto" />
            </div>
          ))}
        </div>
      </div>

      {/* Target cards */}
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="rounded-2xl p-4" style={{ background: '#121212', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="flex items-center gap-3 mb-3">
            <SkeletonCircle className="h-10 w-10" />
            <div className="flex-1 space-y-1.5">
              <SkeletonBar className="h-4 w-3/4" />
              <SkeletonBar className="h-2.5 w-1/2" />
            </div>
          </div>
          {/* Progress bar skeleton */}
          <SkeletonBar className="h-2 w-full rounded-full" />
          <div className="flex justify-between mt-2">
            <SkeletonBar className="h-2.5 w-16" />
            <SkeletonBar className="h-2.5 w-20" />
          </div>
        </div>
      ))}

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}} />
    </div>
  );
}

/* ── Profile Settings Skeleton ── */
export function ProfileSkeleton() {
  return (
    <div className="space-y-4 max-w-2xl mx-auto animate-[fadeIn_0.3s_ease-out]">
      {/* Profile header card */}
      <div className="flex items-center gap-4 p-4 rounded-2xl" style={{ background: '#121212', border: '1px solid rgba(255,255,255,0.06)' }}>
        <SkeletonCircle className="h-16 w-16" />
        <div className="flex-1 space-y-2">
          <SkeletonBar className="h-4 w-32" />
          <SkeletonBar className="h-3 w-44" />
          <div className="flex gap-2">
            <SkeletonBar className="h-5 w-12 rounded-full" />
            <SkeletonBar className="h-5 w-16 rounded-full" />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl" style={{ background: '#121212', border: '1px solid rgba(255,255,255,0.06)' }}>
        {Array.from({ length: 3 }).map((_, i) => (
          <SkeletonBar key={i} className="h-8 flex-1 rounded-lg" />
        ))}
      </div>

      {/* Form skeleton */}
      <div className="space-y-3.5 p-4 rounded-2xl" style={{ background: '#121212', border: '1px solid rgba(255,255,255,0.06)' }}>
        <SkeletonBar className="h-2.5 w-20" />
        <SkeletonBar className="h-10 w-full rounded-xl" />
        <SkeletonBar className="h-10 w-full rounded-xl" />
        <SkeletonBar className="h-10 w-full rounded-xl" />
        <SkeletonBar className="h-10 w-full rounded-xl" />
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}} />
    </div>
  );
}
