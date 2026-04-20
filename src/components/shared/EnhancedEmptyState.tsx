'use client';

import { type LucideIcon } from 'lucide-react';

interface EnhancedEmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  accentColor?: string;
}

export function EnhancedEmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  accentColor = '#BB86FC',
}: EnhancedEmptyStateProps) {
  return (
    <div
      className="rounded-xl p-6 sm:p-8 flex flex-col items-center justify-center text-center relative overflow-hidden"
      style={{
        background: 'rgba(18, 18, 18, 0.6)',
        border: `1px solid rgba(255, 255, 255, 0.06)`,
      }}
    >
      {/* Radial gradient background */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse at 50% 40%, ${accentColor}08 0%, transparent 70%)`,
        }}
      />

      {/* Large icon */}
      <div className="relative mb-3">
        <div
          className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl grid place-items-center [&>*]:block leading-none"
          style={{
            background: `${accentColor}10`,
            border: `1px dashed ${accentColor}25`,
          }}
        >
          <Icon
            className="h-6 w-6 sm:h-7 sm:w-7"
            style={{ color: accentColor, opacity: 0.5 }}
          />
        </div>
        {/* Floating dots */}
        <div
          className="absolute -top-1 -right-1 w-2 h-2 rounded-full"
          style={{ background: `${accentColor}40`, animation: 'floatUp 2s ease-in-out infinite' }}
        />
        <div
          className="absolute -bottom-1 -left-2 w-1.5 h-1.5 rounded-full"
          style={{ background: '#03DAC630', animation: 'floatUp 2s ease-in-out 0.5s infinite' }}
        />
      </div>

      {/* Title */}
      <p className="relative text-sm font-medium mb-1" style={{ color: '#B3B3B3' }}>
        {title}
      </p>

      {/* Description */}
      <p className="relative text-xs max-w-[220px]" style={{ color: '#9E9E9E' }}>
        {description}
      </p>

      {/* Action button */}
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="relative mt-4 flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all duration-200 hover:scale-105 active:scale-95"
          style={{
            background: `${accentColor}15`,
            color: accentColor,
            border: `1px solid ${accentColor}25`,
          }}
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
