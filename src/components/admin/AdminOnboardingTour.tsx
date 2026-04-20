'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import {
  X,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  LayoutDashboard,
  Users,
  UserPlus,
  Activity,
  Settings,
  Eye,
} from 'lucide-react';

export interface TourStep {
  id: string;
  title: string;
  description: string;
  targetSelector?: string;
  position?: 'top' | 'bottom' | 'left' | 'right' | 'center';
  icon?: React.ElementType;
  accentColor?: string;
}

const TOUR_STEPS: TourStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to Admin Panel! 🎉',
    description:
      'Take a quick tour to learn the key features of your Wealth Tracker admin panel. We\'ll show you around in just a few steps.',
    position: 'center',
    icon: Sparkles,
    accentColor: '#03DAC6',
  },
  {
    id: 'dashboard',
    title: 'Dashboard Overview',
    description:
      'Your command center! See real-time stats, user registrations, plan distribution, top active users, and platform health at a glance.',
    targetSelector: '[data-tour="dashboard-stats"]',
    position: 'bottom',
    icon: LayoutDashboard,
    accentColor: '#03DAC6',
  },
  {
    id: 'users',
    title: 'User Management',
    description:
      'View, search, filter, and manage all registered users. Create new users, edit permissions, reset passwords, and export user data.',
    targetSelector: '[data-tour="nav-users"]',
    position: 'right',
    icon: Users,
    accentColor: '#BB86FC',
  },
  {
    id: 'create-actions',
    title: 'Quick Actions',
    description:
      'Create new users, generate invite links, and navigate to key sections instantly with these quick action buttons.',
    targetSelector: '[data-tour="quick-actions"]',
    position: 'bottom',
    icon: UserPlus,
    accentColor: '#FFD700',
  },
  {
    id: 'activity-log',
    title: 'Activity Log',
    description:
      'Track every admin action with a detailed audit trail. Filter by action type, search entries, and export logs for compliance.',
    targetSelector: '[data-tour="nav-activity-log"]',
    position: 'right',
    icon: Activity,
    accentColor: '#03DAC6',
  },
  {
    id: 'settings',
    title: 'Settings & Configuration',
    description:
      'Customize your admin experience — manage profile, notification preferences, platform defaults, and system health monitoring.',
    targetSelector: '[data-tour="nav-settings"]',
    position: 'right',
    icon: Settings,
    accentColor: '#FFD700',
  },
];

const TOUR_STORAGE_KEY = 'admin-tour-completed';

interface TourTooltipProps {
  step: TourStep;
  stepIndex: number;
  totalSteps: number;
  onPrev: () => void;
  onNext: () => void;
  onSkip: () => void;
  isFirst: boolean;
  isLast: boolean;
  dontShowAgain: boolean;
  onDontShowAgainChange: (checked: boolean) => void;
  spotlightRect: DOMRect | null;
}

function TourTooltip({
  step,
  stepIndex,
  totalSteps,
  onPrev,
  onNext,
  onSkip,
  isFirst,
  isLast,
  dontShowAgain,
  onDontShowAgainChange,
  spotlightRect,
}: TourTooltipProps) {
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [tooltipStyle, setTooltipStyle] = useState<React.CSSProperties>({
    position: 'fixed',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    zIndex: 10002,
  });

  const Icon = step.icon || Eye;

  useEffect(() => {
    const computePosition = () => {
      if (!spotlightRect || step.position === 'center') {
        setTooltipStyle({
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 10002,
        });
        return;
      }

      const tooltip = tooltipRef.current;
      if (!tooltip) return;

      const tooltipRect = tooltip.getBoundingClientRect();
      const gap = 16;
      const viewW = window.innerWidth;
      const viewH = window.innerHeight;
      let top = 0;
      let left = 0;

      const targetCenterX = spotlightRect.left + spotlightRect.width / 2;
      const targetCenterY = spotlightRect.top + spotlightRect.height / 2;

      switch (step.position) {
        case 'top':
          top = spotlightRect.top - tooltipRect.height - gap;
          left = targetCenterX - tooltipRect.width / 2;
          break;
        case 'bottom':
          top = spotlightRect.bottom + gap;
          left = targetCenterX - tooltipRect.width / 2;
          break;
        case 'left':
          top = targetCenterY - tooltipRect.height / 2;
          left = spotlightRect.left - tooltipRect.width - gap;
          break;
        case 'right':
          top = targetCenterY - tooltipRect.height / 2;
          left = spotlightRect.right + gap;
          break;
      }

      top = Math.max(16, Math.min(top, viewH - tooltipRect.height - 16));
      left = Math.max(16, Math.min(left, viewW - tooltipRect.width - 16));

      setTooltipStyle({
        position: 'fixed',
        top,
        left,
        zIndex: 10002,
      });
    };

    // Schedule position computation via requestAnimationFrame to avoid sync setState in effect
    const raf = requestAnimationFrame(computePosition);
    const delayedRaf = setTimeout(() => {
      requestAnimationFrame(computePosition);
    }, 50);

    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(delayedRaf);
    };
  }, [spotlightRect, step.position]);

  return (
    <div
      ref={tooltipRef}
      className="w-[360px] max-w-[calc(100vw-32px)] animate-in fade-in-0 zoom-in-95 duration-300"
      style={tooltipStyle}
    >
      <div
        className="rounded-2xl border border-white/[0.1] shadow-[0_16px_64px_rgba(0,0,0,0.6)] overflow-hidden"
        style={{
          background: 'linear-gradient(145deg, #141422 0%, #0D0D0D 50%, #0F0F1A 100%)',
        }}
      >
        {/* Accent glow at top */}
        <div
          className="absolute top-0 left-0 right-0 h-px"
          style={{
            background: `linear-gradient(90deg, transparent, ${step.accentColor}60, transparent)`,
          }}
        />

        <div className="p-5">
          {/* Header */}
          <div className="flex items-start gap-3 mb-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{
                background: `linear-gradient(135deg, ${step.accentColor}20, ${step.accentColor}08)`,
                boxShadow: `0 2px 8px ${step.accentColor}15`,
              }}
            >
              <Icon className="h-5 w-5" style={{ color: step.accentColor }} />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-[14px] font-bold text-white/90 leading-snug">
                {step.title}
              </h3>
              {/* Step indicator */}
              <div className="flex items-center gap-2 mt-1.5">
                <div className="flex gap-1">
                  {TOUR_STEPS.map((_, i) => (
                    <div
                      key={i}
                      className={cn(
                        'h-1 rounded-full transition-all duration-300',
                        i === stepIndex
                          ? 'w-4'
                          : i < stepIndex
                            ? 'w-1.5 bg-white/30'
                            : 'w-1.5 bg-white/[0.08]',
                      )}
                      style={
                        i === stepIndex
                          ? { backgroundColor: step.accentColor }
                          : undefined
                      }
                    />
                  ))}
                </div>
                <span className="text-[10px] text-white/25 font-medium tabular-nums">
                  Step {stepIndex + 1} of {totalSteps}
                </span>
              </div>
            </div>
            <button
              onClick={onSkip}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-white/25 hover:text-white/60 hover:bg-white/[0.06] transition-all shrink-0"
              aria-label="Close tour"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Description */}
          <p className="text-[12.5px] text-white/50 leading-relaxed mb-5">
            {step.description}
          </p>

          {/* Actions */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {!isFirst && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onPrev}
                  className="h-8 px-3 text-[11px] rounded-lg text-white/40 hover:text-white/70 hover:bg-white/[0.04] gap-1"
                >
                  <ChevronLeft className="h-3 w-3" />
                  Back
                </Button>
              )}
            </div>

            <div className="flex items-center gap-2">
              {!isLast ? (
                <Button
                  size="sm"
                  onClick={onNext}
                  className="h-8 px-4 text-[11px] rounded-lg gap-1 font-semibold text-white"
                  style={{
                    background: `linear-gradient(135deg, ${step.accentColor}90, ${step.accentColor}70)`,
                    boxShadow: `0 2px 8px ${step.accentColor}25`,
                  }}
                >
                  Next
                  <ChevronRight className="h-3 w-3" />
                </Button>
              ) : (
                <Button
                  size="sm"
                  onClick={onNext}
                  className="h-8 px-4 text-[11px] rounded-lg gap-1 font-semibold text-white"
                  style={{
                    background: `linear-gradient(135deg, ${step.accentColor}90, ${step.accentColor}70)`,
                    boxShadow: `0 2px 8px ${step.accentColor}25`,
                  }}
                >
                  Done
                  <Sparkles className="h-3 w-3" />
                </Button>
              )}
            </div>
          </div>

          {/* Don't show again */}
          {isLast && (
            <div className="flex items-center gap-2 mt-3 pt-3 border-t border-white/[0.06]">
              <Checkbox
                id="dont-show-again"
                checked={dontShowAgain}
                onCheckedChange={(checked) => onDontShowAgainChange(!!checked)}
                className="border-white/15 data-[state=checked]:bg-[#03DAC6] data-[state=checked]:border-[#03DAC6]"
              />
              <label
                htmlFor="dont-show-again"
                className="text-[11px] text-white/35 cursor-pointer select-none"
              >
                Don&apos;t show this tour again
              </label>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SpotlightOverlay({
  spotlightRect,
  visible,
}: {
  spotlightRect: DOMRect | null;
  visible: boolean;
}) {
  if (!visible) return null;

  if (!spotlightRect) {
    return (
      <div
        className="fixed inset-0 z-[10000] pointer-events-auto"
        style={{ background: 'rgba(0, 0, 0, 0.7)', backdropFilter: 'blur(2px)' }}
      />
    );
  }

  return (
    <svg
      className="fixed inset-0 z-[10000] pointer-events-none"
      width="100%"
      height="100%"
      style={{ pointerEvents: 'auto' }}
    >
      <defs>
        <mask id="tour-spotlight">
          <rect x="0" y="0" width="100%" height="100%" fill="white" />
          <rect
            x={spotlightRect.left - 4}
            y={spotlightRect.top - 4}
            width={spotlightRect.width + 8}
            height={spotlightRect.height + 8}
            rx="12"
            fill="black"
          />
        </mask>
      </defs>
      <rect
        x="0"
        y="0"
        width="100%"
        height="100%"
        fill="rgba(0, 0, 0, 0.65)"
        mask="url(#tour-spotlight)"
      />
      <rect
        x={spotlightRect.left - 4}
        y={spotlightRect.top - 4}
        width={spotlightRect.width + 8}
        height={spotlightRect.height + 8}
        rx="12"
        fill="none"
        stroke="rgba(3, 218, 198, 0.4)"
        strokeWidth="2"
        className="animate-pulse"
      />
    </svg>
  );
}

interface AdminOnboardingTourProps {
  isActive: boolean;
  onTourComplete: () => void;
}

export function AdminOnboardingTour({ isActive, onTourComplete }: AdminOnboardingTourProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [spotlightRect, setSpotlightRect] = useState<DOMRect | null>(null);
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const animFrameRef = useRef<number>();

  const step = TOUR_STEPS[currentStep];

  const updateSpotlight = useCallback(() => {
    if (!step.targetSelector) {
      setSpotlightRect(null);
      return;
    }

    const el = document.querySelector(step.targetSelector);
    if (el) {
      const rect = el.getBoundingClientRect();
      setSpotlightRect(rect);
    } else {
      setSpotlightRect(null);
    }
  }, [step.targetSelector]);

  useEffect(() => {
    if (!isActive) return;

    const timer = setTimeout(updateSpotlight, 50);

    const handleUpdate = () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = requestAnimationFrame(updateSpotlight);
    };

    window.addEventListener('scroll', handleUpdate, true);
    window.addEventListener('resize', handleUpdate);

    return () => {
      clearTimeout(timer);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      window.removeEventListener('scroll', handleUpdate, true);
      window.removeEventListener('resize', handleUpdate);
    };
  }, [isActive, currentStep, updateSpotlight]);

  const completeTour = useCallback(() => {
    if (dontShowAgain) {
      localStorage.setItem(TOUR_STORAGE_KEY, 'true');
    }
    onTourComplete();
  }, [dontShowAgain, onTourComplete]);

  const handleNext = useCallback(() => {
    if (currentStep < TOUR_STEPS.length - 1) {
      setCurrentStep((s) => s + 1);
    } else {
      completeTour();
    }
  }, [currentStep, completeTour]);

  const handlePrev = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep((s) => s - 1);
    }
  }, [currentStep]);

  const handleSkip = useCallback(() => {
    completeTour();
  }, [completeTour]);

  if (!isActive || !step) return null;

  return (
    <>
      <SpotlightOverlay spotlightRect={spotlightRect} visible={isActive} />
      <TourTooltip
        step={step}
        stepIndex={currentStep}
        totalSteps={TOUR_STEPS.length}
        onPrev={handlePrev}
        onNext={handleNext}
        onSkip={handleSkip}
        isFirst={currentStep === 0}
        isLast={currentStep === TOUR_STEPS.length - 1}
        dontShowAgain={dontShowAgain}
        onDontShowAgainChange={setDontShowAgain}
        spotlightRect={spotlightRect}
      />
    </>
  );
}

export function isTourCompleted(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(TOUR_STORAGE_KEY) === 'true';
}

export function resetTour(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(TOUR_STORAGE_KEY);
}
