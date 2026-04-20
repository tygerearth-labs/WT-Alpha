'use client';

iimport { useState, useCallback, useEffect } from 'react';
import {
  Bell,
  BellRing,
  TrendingUp,
  TrendingDown,
  PiggyBank,
  Info,
  Check,
  Megaphone,
  CreditCard,
  Crown,
} from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/hooks/useTranslation';
import { Button } from '@/components/ui/button';
import { onNotificationEvent } from '@/lib/notificationEvents';

/* ── Types ── */

type NotificationType = 'income' | 'expense' | 'savings' | 'system' | 'broadcast' | 'subscription' | 'upgrade';

interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  description: string;
  amount?: number | null;
  isRead: boolean;
  actionUrl?: string | null;
  createdAt: string;
}

/* ── Constants ── */

const TYPE_CONFIG: Record<
  NotificationType,
  { color: string; bgColor: string; glowColor: string }
> = {
  income: {
    color: '#03DAC6',
    bgColor: 'rgba(3,218,198,0.12)',
    glowColor: 'rgba(3,218,198,0.4)',
  },
  expense: {
    color: '#CF6679',
    bgColor: 'rgba(207,102,121,0.12)',
    glowColor: 'rgba(207,102,121,0.4)',
  },
  savings: {
    color: '#BB86FC',
    bgColor: 'rgba(187,134,252,0.12)',
    glowColor: 'rgba(187,134,252,0.4)',
  },
  system: {
    color: '#F9A825',
    bgColor: 'rgba(249,168,37,0.12)',
    glowColor: 'rgba(249,168,37,0.4)',
  },
  broadcast: {
    color: '#64B5F6',
    bgColor: 'rgba(100,181,246,0.12)',
    glowColor: 'rgba(100,181,246,0.4)',
  },
  subscription: {
    color: '#FFD700',
    bgColor: 'rgba(255,215,0,0.12)',
    glowColor: 'rgba(255,215,0,0.4)',
  },
  upgrade: {
    color: '#BB86FC',
    bgColor: 'rgba(187,134,252,0.12)',
    glowColor: 'rgba(187,134,252,0.4)',
  },
};

function getTypeIcon(type: NotificationType) {
  switch (type) {
    case 'income':
      return <TrendingUp className="h-4 w-4" style={{ color: TYPE_CONFIG.income.color }} />;
    case 'expense':
      return <TrendingDown className="h-4 w-4" style={{ color: TYPE_CONFIG.expense.color }} />;
    case 'savings':
      return <PiggyBank className="h-4 w-4" style={{ color: TYPE_CONFIG.savings.color }} />;
    case 'system':
      return <Info className="h-4 w-4" style={{ color: TYPE_CONFIG.system.color }} />;
    case 'broadcast':
      return <Megaphone className="h-4 w-4" style={{ color: TYPE_CONFIG.broadcast.color }} />;
    case 'subscription':
      return <CreditCard className="h-4 w-4" style={{ color: TYPE_CONFIG.subscription.color }} />;
    case 'upgrade':
      return <Crown className="h-4 w-4" style={{ color: TYPE_CONFIG.upgrade.color }} />;
  }
}

/* ── Helpers ── */

function formatRelativeTime(dateStr: string, t: (key: string, params?: Record<string, string | number>) => string): string {
  const date = new Date(dateStr);
  const mins = Math.floor((Date.now() - date.getTime()) / 60000);
  if (mins < 1) return t('notifications.justNow');
  if (mins < 60) return t('notifications.minutesAgo', { count: mins });
  const hours = Math.floor(mins / 60);
  if (hours < 24) return t('notifications.hoursAgo', { count: hours });
  const days = Math.floor(hours / 24);
  if (days < 7) return t('notifications.daysAgo', { count: days });
  const weeks = Math.floor(days / 7);
  return t('notifications.weeksAgo', { count: weeks });
}

/* ── Component ── */

const VISIBLE_LIMIT = 20;

export function NotificationCenter() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Fetch only unread count (lightweight, used for badge polling)
  const fetchUnreadCount = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications?limit=1');
      if (res.ok) {
        const data = await res.json();
        setUnreadCount(data.unreadCount || 0);
      }
    } catch {
      // silent fail
    }
  }, []);

  const fetchNotifications = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/notifications?limit=50');
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
        setTotal(data.total || 0);
      }
    } catch {
      // silent fail
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial fetch of unread count + periodic polling
  useEffect(() => {
    fetchUnreadCount();
    // Poll every 30 seconds for new notifications
    const interval = setInterval(fetchUnreadCount, 30_000);
    return () => clearInterval(interval);
  }, [fetchUnreadCount]);

  // Listen for notification events from transaction creation etc.
  useEffect(() => {
    const cleanupCreated = onNotificationEvent('notification-created', () => {
      fetchUnreadCount();
    });
    const cleanupRead = onNotificationEvent('notification-read', () => {
      fetchUnreadCount();
    });
    const cleanupCleared = onNotificationEvent('notifications-cleared', () => {
      fetchUnreadCount();
    });
    return () => {
      cleanupCreated();
      cleanupRead();
      cleanupCleared();
    };
  }, [fetchUnreadCount]);

  const handleOpenChange = useCallback((newOpen: boolean) => {
    setOpen(newOpen);
    if (newOpen) {
      fetchNotifications();
    }
  }, [fetchNotifications]);

  const markAsRead = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/notifications/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isRead: true }),
      });
      if (res.ok) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch {
      // silent fail
    }
  }, []);

  const markAllRead = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications/mark-all-read', {
        method: 'POST',
      });
      if (res.ok) {
        setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
        setUnreadCount(0);
      }
    } catch {
      // silent fail
    }
  }, []);

  const handleNotificationClick = useCallback(
    async (notification: Notification) => {
      if (!notification.isRead) {
        await markAsRead(notification.id);
      }
      // Toggle expand instead of navigating to actionUrl
      setExpandedId((prev) => (prev === notification.id ? null : notification.id));
    },
    [markAsRead],
  );

  // Sort: unread first, then by date (newest first)
  const sortedNotifications = [...notifications].sort((a, b) => {
    if (a.isRead !== b.isRead) return a.isRead ? 1 : -1;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const visibleNotifications = sortedNotifications.slice(0, VISIBLE_LIMIT);
  const hasMore = sortedNotifications.length > VISIBLE_LIMIT;

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          className={cn(
            'relative grid place-items-center w-9 h-9 p-0 rounded-full transition-all duration-200',
            'hover:bg-white/[0.06] active:scale-95',
            open && 'bg-white/[0.08]',
          )}
          aria-label={t('notifications.title')}
        >
          {open ? (
            <BellRing className="h-[18px] w-[18px] text-white/70" />
          ) : (
            <Bell className="h-[18px] w-[18px] text-white/50" />
          )}

          {/* Unread badge */}
          {unreadCount > 0 && (
            <span
              className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[16px] h-[16px] px-1 rounded-full text-[9px] font-bold text-white"
              style={{
                background: '#CF6679',
                boxShadow: open ? 'none' : '0 0 8px rgba(207,102,121,0.4)',
                animation: open ? 'none' : 'notifPulse 2s ease-in-out infinite',
              }}
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-80 sm:w-96 p-0 overflow-hidden rounded-2xl border-0"
        style={{
          background: '#141414',
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow:
            '0 16px 48px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.04)',
        }}
      >
        {/* ── Header ── */}
        <div
          className="flex items-center justify-between px-4 py-3 border-b"
          style={{ borderColor: 'rgba(255,255,255,0.06)' }}
        >
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4" style={{ color: '#BB86FC' }} />
            <span className="text-sm font-semibold" style={{ color: '#E6E1E5' }}>
              {t('notifications.title')}
            </span>
            {unreadCount > 0 && (
              <span
                className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                style={{
                  background: 'rgba(187,134,252,0.15)',
                  color: '#BB86FC',
                }}
              >
                {unreadCount}
              </span>
            )}
          </div>
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              className="flex items-center gap-1 text-[10px] font-medium px-2 py-1 rounded-lg transition-colors"
              style={{
                color: '#BB86FC',
                background: 'rgba(187,134,252,0.08)',
              }}
            >
              <Check className="h-3 w-3" />
              <span>{t('notifications.markAllRead')}</span>
            </button>
          )}
        </div>

        {/* ── Notification List ── */}
        <div className="max-h-[320px] overflow-y-auto custom-scrollbar">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: 'rgba(255,255,255,0.1)', borderTopColor: 'transparent' }} />
            </div>
          ) : sortedNotifications.length === 0 ? (
            /* Empty State */
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <div
                className="grid place-items-center w-12 h-12 rounded-full"
                style={{ background: 'rgba(255,255,255,0.04)' }}
              >
                <Bell className="h-5 w-5" style={{ color: '#555' }} />
              </div>
              <p className="text-xs font-medium" style={{ color: '#666' }}>
                {t('notifications.empty')}
              </p>
              <p className="text-[10px]" style={{ color: '#444' }}>
                {t('notifications.emptyDesc')}
              </p>
            </div>
          ) : (
            visibleNotifications.map((notification) => {
              const isRead = notification.isRead;
              const config = TYPE_CONFIG[notification.type] || TYPE_CONFIG.system;
              const isExpanded = expandedId === notification.id;

              return (
                <button
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className={cn(
                    'w-full flex items-start gap-3 px-4 py-3 text-left transition-all duration-150',
                    !isRead && 'bg-white/[0.02]',
                    'hover:bg-white/[0.04] active:bg-white/[0.06]',
                  )}
                  style={{
                    borderBottom: '1px solid rgba(255,255,255,0.04)',
                  }}
                >
                  {/* Type Icon */}
                  <div
                    className="shrink-0 grid place-items-center w-8 h-8 rounded-lg mt-0.5 transition-transform duration-150 hover:scale-110"
                    style={{ background: config.bgColor }}
                  >
                    {getTypeIcon(notification.type)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p
                        className={cn(
                          'text-xs leading-relaxed',
                          isExpanded ? 'line-clamp-none' : 'line-clamp-1',
                          !isRead ? 'font-semibold' : 'font-medium',
                        )}
                        style={{ color: isRead ? '#888' : '#E6E1E5' }}
                      >
                        {notification.title}
                      </p>
                      {!isRead && (
                        <div
                          className="shrink-0 w-2 h-2 rounded-full mt-1.5"
                          style={{
                            background: config.color,
                            boxShadow: `0 0 6px ${config.glowColor}`,
                          }}
                        />
                      )}
                    </div>
                    <p
                      className={cn(
                        'text-[11px] leading-relaxed mt-0.5',
                        isExpanded ? 'line-clamp-none' : 'line-clamp-2',
                      )}
                      style={{ color: '#777' }}
                    >
                      {notification.description}
                    </p>
                    {isExpanded && (
                      <p
                        className="text-[11px] leading-relaxed mt-1.5 font-medium"
                        style={{ color: '#999' }}
                      >
                        {formatRelativeTime(notification.createdAt, t)}
                      </p>
                    )}
                    {!isExpanded && (
                      <p className="text-[9px] mt-1" style={{ color: '#555' }}>
                        {formatRelativeTime(notification.createdAt, t)}
                      </p>
                    )}
                  </div>
                </button>
              );
            })
          )}

          {/* View All hint */}
          {hasMore && (
            <div
              className="px-4 py-2 text-center"
              style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}
            >
              <span className="text-[10px] font-medium" style={{ color: '#555' }}>
                +{sortedNotifications.length - VISIBLE_LIMIT} more notifications
              </span>
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        {sortedNotifications.length > 0 && (
          <div
            className="px-4 py-2.5 border-t text-center cursor-pointer transition-colors"
            style={{ borderColor: 'rgba(255,255,255,0.06)' }}
            onClick={() => handleOpenChange(false)}
          >
            <span
              className="text-[11px] font-medium transition-colors hover:text-[#BB86FC]"
              style={{ color: '#666' }}
            >
              {t('notifications.close')}
            </span>
          </div>
        )}
      </PopoverContent>

    </Popover>
  );
}
