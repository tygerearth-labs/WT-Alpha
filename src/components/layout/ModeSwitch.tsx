'use client';

import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  LayoutDashboard,
  Briefcase,
  Gem,
  Lock,
} from 'lucide-react';
import type { BusinessMode } from '@/store/useBusinessStore';

// ── Design Tokens ─────────────────────────────────────────────────────────

const MODE_COLORS: Record<BusinessMode, { hex: string; label: string }> = {
  personal: { hex: '#BB86FC', label: 'Pribadi' },
  bisnis: { hex: '#03DAC6', label: 'Bisnis' },
  investasi: { hex: '#FFD700', label: 'Investasi' },
};

const MODE_ICONS: Record<BusinessMode, typeof LayoutDashboard> = {
  personal: LayoutDashboard,
  bisnis: Briefcase,
  investasi: Gem,
};

const hexToRgb = (hex: string) => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r}, ${g}, ${b}`;
};

// ── Props ──────────────────────────────────────────────────────────────────

interface ModeSwitchProps {
  mode: BusinessMode;
  isUltimate: boolean;
  businesses: Array<{ category: string }>;
  collapsed: boolean;
  onSwitch: (mode: BusinessMode) => void;
  /** Translations: { personal, bisnis, investasi } */
  labels: Record<string, string>;
}

// ── Component ──────────────────────────────────────────────────────────────

export function ModeSwitch({
  mode,
  isUltimate,
  businesses,
  collapsed,
  onSwitch,
  labels,
}: ModeSwitchProps) {
  const modes: BusinessMode[] = ['personal', 'bisnis', 'investasi'];

  // Registration status per mode
  const isRegistered = (m: BusinessMode) => {
    if (m === 'personal') return true; // personal always available
    const cat = m === 'bisnis' ? 'bisnis' : 'investasi';
    return businesses.some((b) => b.category === cat);
  };

  const isLocked = (m: BusinessMode) => m !== 'personal' && !isUltimate;

  // ── Collapsed sidebar variant ──
  if (collapsed) {
    return (
      <TooltipProvider delayDuration={300}>
        <div className="flex flex-col items-center gap-1 px-1 pb-2">
          {modes.map((m) => {
            const Icon = MODE_ICONS[m];
            const color = MODE_COLORS[m].hex;
            const isActive = mode === m;
            const locked = isLocked(m);
            const registered = isRegistered(m);
            const rgb = hexToRgb(color);

            return (
              <Tooltip key={m}>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => !locked && onSwitch(m)}
                    className={cn(
                      'relative w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200',
                      isActive
                        ? 'shadow-lg'
                        : 'hover:bg-white/[0.04]',
                      locked && 'opacity-40 cursor-not-allowed',
                    )}
                    style={
                      isActive
                        ? {
                            backgroundColor: `rgba(${rgb}, 0.15)`,
                            boxShadow: `0 0 12px rgba(${rgb}, 0.2), inset 0 0 0 1px rgba(${rgb}, 0.25)`,
                          }
                        : undefined
                    }
                  >
                    <Icon
                      className={cn(
                        'h-[18px] w-[18px] transition-all duration-200',
                        isActive ? '' : 'text-white/30',
                      )}
                      style={isActive ? { color, filter: `drop-shadow(0 0 4px rgba(${rgb}, 0.4))` } : undefined}
                      strokeWidth={isActive ? 2.2 : 1.5}
                    />
                    {/* Lock overlay */}
                    {locked && (
                      <Lock className="absolute top-0.5 right-0.5 h-3 w-3 text-[#FFD700]/70" />
                    )}
                    {/* Registration dot */}
                    {!locked && !isActive && registered && (
                      <div
                        className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-[5px] h-[5px] rounded-full"
                        style={{ backgroundColor: color, boxShadow: `0 0 6px rgba(${rgb}, 0.5)` }}
                      />
                    )}
                  </button>
                </TooltipTrigger>
                <TooltipContent
                  side="right"
                  className="px-3 py-2 text-xs bg-[#1A1A2E]/95 backdrop-blur-lg border border-white/[0.08] rounded-xl shadow-xl"
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: color }}
                    />
                    <span className="font-semibold">{labels[m] || MODE_COLORS[m].label}</span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    {locked ? (
                      <span className="text-[#FFD700]/70 flex items-center gap-1">
                        <Lock className="h-2.5 w-2.5" /> Ultimate Only
                      </span>
                    ) : (
                      <span className="text-white/30">
                        {registered ? '✓ Active' : 'Setup required'}
                      </span>
                    )}
                  </div>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>
      </TooltipProvider>
    );
  }

  // ── Expanded sidebar variant ──
  return (
    <div className="px-2 pb-3 mb-1">
      <div className="flex items-center gap-1 p-1 rounded-xl bg-white/[0.03] border border-white/[0.04]">
        {modes.map((m) => {
          const Icon = MODE_ICONS[m];
          const color = MODE_COLORS[m].hex;
          const isActive = mode === m;
          const locked = isLocked(m);
          const registered = isRegistered(m);
          const rgb = hexToRgb(color);

          return (
            <button
              key={m}
              onClick={() => !locked && onSwitch(m)}
              className={cn(
                'relative flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[11px] font-semibold transition-all duration-300',
                isActive
                  ? 'text-white'
                  : 'text-white/30 hover:text-white/55',
                locked && 'opacity-40 cursor-not-allowed',
              )}
              style={
                isActive
                  ? {
                      backgroundColor: `rgba(${rgb}, 0.18)`,
                      boxShadow: `0 0 16px rgba(${rgb}, 0.15), inset 0 0 0 1px rgba(${rgb}, 0.2)`,
                    }
                  : undefined
              }
            >
              {/* Active left accent line */}
              {isActive && (
                <div
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full"
                  style={{ backgroundColor: color, boxShadow: `0 0 8px rgba(${rgb}, 0.5)` }}
                />
              )}

              <Icon
                className="h-3.5 w-3.5 shrink-0"
                style={isActive ? { color, filter: `drop-shadow(0 0 3px rgba(${rgb}, 0.4))` } : undefined}
                strokeWidth={isActive ? 2.2 : 1.5}
              />
              <span className="whitespace-nowrap">{labels[m] || MODE_COLORS[m].label}</span>

              {/* Lock indicator */}
              {locked && (
                <Lock className="h-3 w-3 shrink-0 text-[#FFD700]/70" />
              )}

              {/* Registration dot for non-active registered modes */}
              {!locked && !isActive && registered && (
                <div
                  className="absolute -top-0.5 right-1.5 w-[5px] h-[5px] rounded-full"
                  style={{ backgroundColor: color, opacity: 0.7 }}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Mobile Variant ──

interface ModeSwitchMobileProps {
  mode: BusinessMode;
  isUltimate: boolean;
  businesses: Array<{ category: string }>;
  onSwitch: (mode: BusinessMode) => void;
  labels: Record<string, string>;
}

export function ModeSwitchMobile({
  mode,
  isUltimate,
  businesses,
  onSwitch,
  labels,
}: ModeSwitchMobileProps) {
  const modes: BusinessMode[] = ['personal', 'bisnis', 'investasi'];

  const isLocked = (m: BusinessMode) => m !== 'personal' && !isUltimate;

  return (
    <div className="flex items-center gap-1 px-3 py-1.5 border-b border-white/[0.04]">
      {modes.map((m) => {
        const Icon = MODE_ICONS[m];
        const color = MODE_COLORS[m].hex;
        const isActive = mode === m;
        const locked = isLocked(m);
        const rgb = hexToRgb(color);

        return (
          <button
            key={m}
            onClick={() => !locked && onSwitch(m)}
            className={cn(
              'relative flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[10px] font-bold tracking-wide transition-all duration-200',
              locked && 'opacity-40',
            )}
            style={
              isActive
                ? {
                    backgroundColor: `rgba(${rgb}, 0.18)`,
                    color,
                    boxShadow: `0 0 12px rgba(${rgb}, 0.12)`,
                  }
                : { color: 'rgba(255,255,255,0.3)' }
            }
          >
            {/* Active top pill indicator */}
            {isActive && (
              <div
                className="absolute -top-1.5 left-1/2 -translate-x-1/2 h-[3px] w-5 rounded-full"
                style={{ backgroundColor: color, boxShadow: `0 0 8px rgba(${rgb}, 0.5)` }}
              />
            )}

            <Icon className="h-3 w-3" strokeWidth={isActive ? 2.2 : 1.5} />
            <span>{labels[m] || MODE_COLORS[m].label}</span>

            {/* Lock */}
            {locked && (
              <Lock className="h-2.5 w-2.5 text-[#FFD700]/70" />
            )}
          </button>
        );
      })}
    </div>
  );
}
