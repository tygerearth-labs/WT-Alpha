'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Info, AlertTriangle, CheckCircle, Wrench, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/hooks/useTranslation';

interface Announcement {
  id: string;
  title: string;
  message: string;
  type: string;
  priority: number;
  expiresAt: string | null;
}

const TYPE_STYLES: Record<string, { bg: string; border: string; text: string; icon: React.ElementType; iconColor: string }> = {
  info: { bg: 'bg-[#03DAC6]/[0.07]', border: 'border-[#03DAC6]/20', text: 'text-[#03DAC6]', icon: Info, iconColor: 'text-[#03DAC6]' },
  warning: { bg: 'bg-[#FFD700]/[0.07]', border: 'border-[#FFD700]/20', text: 'text-[#FFD700]', icon: AlertTriangle, iconColor: 'text-[#FFD700]' },
  success: { bg: 'bg-[#4CAF50]/[0.07]', border: 'border-[#4CAF50]/20', text: 'text-[#4CAF50]', icon: CheckCircle, iconColor: 'text-[#4CAF50]' },
  maintenance: { bg: 'bg-[#CF6679]/[0.07]', border: 'border-[#CF6679]/20', text: 'text-[#CF6679]', icon: Wrench, iconColor: 'text-[#CF6679]' },
};

const DISMISSED_KEY = 'wt-dismissed-announcements';

function getDismissed(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const stored = localStorage.getItem(DISMISSED_KEY);
    if (stored) return new Set(JSON.parse(stored) as string[]);
  } catch {}
  return new Set();
}

export function AnnouncementBanner() {
  const { t } = useTranslation();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [visible, setVisible] = useState<Set<string>>(new Set());
  const visibleRef = useRef(new Set<string>());
  const bannerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    async function load() {
      try {
        const res = await fetch('/api/announcements', { signal: controller.signal });
        if (res.ok && !cancelled) {
          const data = await res.json();
          const dismissed = getDismissed();
          const filtered = (data.announcements as Announcement[]).filter(
            (a) => !dismissed.has(a.id),
          );
          if (!cancelled) {
            setAnnouncements(filtered);
            if (filtered.length > 0) {
              const newVisible = new Set([filtered[0].id]);
              setVisible(newVisible);
              visibleRef.current = newVisible;
            }
          }
        }
      } catch {
        // ignore fetch errors
      }
    }

    load();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, []);

  // Update CSS custom property with banner height so other elements can react
  useEffect(() => {
    function updateHeight() {
      if (bannerRef.current) {
        const h = bannerRef.current.offsetHeight;
        document.documentElement.style.setProperty('--announcement-height', `${h}px`);
      } else {
        document.documentElement.style.setProperty('--announcement-height', '0px');
      }
    }
    updateHeight();
    // Observe resize
    const observer = new ResizeObserver(updateHeight);
    if (bannerRef.current) observer.observe(bannerRef.current);
    return () => observer.disconnect();
  }, [announcements, visible]);

  const handleDismiss = useCallback((id: string) => {
    setAnnouncements((prev) => {
      const next = prev.filter((a) => a.id !== id);
      const newVisible = new Set<string>();
      if (next.length > 0) {
        newVisible.add(next[0].id);
      }
      setVisible(newVisible);
      visibleRef.current = newVisible;
      return next;
    });

    const dismissed = getDismissed();
    dismissed.add(id);
    try {
      localStorage.setItem(DISMISSED_KEY, JSON.stringify([...dismissed]));
    } catch {}
  }, []);

  // Auto-dismiss expired announcements
  useEffect(() => {
    const interval = setInterval(() => {
      setAnnouncements((prev) => {
        const now = new Date();
        const filtered = prev.filter((a) => !a.expiresAt || new Date(a.expiresAt) > now);
        if (filtered.length === 0) {
          setVisible(new Set());
          visibleRef.current = new Set();
          return filtered;
        }
        if (filtered[0]?.id && !visibleRef.current.has(filtered[0].id)) {
          const newVisible = new Set([filtered[0].id]);
          setVisible(newVisible);
          visibleRef.current = newVisible;
        }
        return filtered;
      });
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const activeAnnouncements = announcements.filter((a) => visible.has(a.id));

  if (activeAnnouncements.length === 0) {
    // Clear the CSS var when no banner
    if (typeof document !== 'undefined') {
      document.documentElement.style.setProperty('--announcement-height', '0px');
    }
    return null;
  }

  return (
    <div
      ref={bannerRef}
      className="fixed left-0 right-0 z-25 flex flex-col"
      style={{ top: 'var(--header-offset, 3.5rem)' }}
    >
      {activeAnnouncements.map((announcement) => {
        const style = TYPE_STYLES[announcement.type] || TYPE_STYLES.info;
        const Icon = style.icon;

        return (
          <div
            key={announcement.id}
            className={cn(
              'relative flex items-center gap-3 px-4 py-2.5 border-b backdrop-blur-md',
              style.bg,
              style.border,
            )}
          >
            <Icon className={cn('h-4 w-4 shrink-0', style.iconColor)} />
            <div className="flex-1 min-w-0 text-center">
              <span className={cn('text-[12px] font-medium', style.text)}>
                <strong>{announcement.title}</strong>
                {announcement.message && (
                  <span className="ml-1.5 opacity-80">{announcement.message}</span>
                )}
              </span>
            </div>
            <button
              onClick={() => handleDismiss(announcement.id)}
              className={cn(
                'shrink-0 w-6 h-6 rounded-full flex items-center justify-center transition-colors',
                'hover:bg-white/10',
                style.text,
              )}
              aria-label={t('common.dismiss')}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
