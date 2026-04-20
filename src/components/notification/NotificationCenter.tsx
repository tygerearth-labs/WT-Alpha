'use client';

import { useState, useCallback } from 'react';
import {
  Bell,
  BellRing,
  TrendingUp,
  TrendingDown,
  PiggyBank,
  Info,
  Check,
} from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/hooks/useTranslation';
import { useCurrencyFormat } from '@/hooks/useCurrencyFormat';
import { Button } from '@/components/ui/button';

/* ── Types ── */

type NotificationType = 'income' | 'expense' | 'savings' | 'system';

interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  description: string;
  amount?: number;
  read: boolean;
  createdAt: Date;
}

/* ── Constants ── */

const STORAGE_KEY = 'wt-notification-center-read';

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
  }
}

/* ── Helpers ── */

function getReadIds(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? new Set(JSON.parse(raw) as string[]) : new Set();
  } catch {
    return new Set();
  }
}

function saveReadIds(ids: Set<string>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]));
}

function minutesAgo(date: Date): number {
  return Math.floor((Date.now() - date.getTime()) / 60000);
}

function generateMockNotifications(t: (key: string, params?: Record<string, string | number>) => string, formatAmount: (amount: number) => string): Notification[] {
  const now = Date.now();
  return [
    {
      id: 'notif-1',
      type: 'income',
      title: t('notifications.typeIncome'),
      description: t('notifications.incomeReceived', { amount: formatAmount(8500000) }),
      amount: 8500000,
      read: false,
      createdAt: new Date(now - 2 * 60000), // 2 min ago
    },
    {
      id: 'notif-2',
      type: 'expense',
      title: t('notifications.typeExpense'),
      description: t('notifications.expenseRecorded', { amount: formatAmount(350000), category: 'Makanan' }),
      amount: 350000,
      read: false,
      createdAt: new Date(now - 15 * 60000), // 15 min ago
    },
    {
      id: 'notif-3',
      type: 'savings',
      title: t('notifications.typeSavings'),
      description: t('notifications.savingsTargetReached', { name: 'Dana Darurat', percent: '75' }),
      read: false,
      createdAt: new Date(now - 1 * 3600000), // 1 hour ago
    },
    {
      id: 'notif-4',
      type: 'savings',
      title: t('notifications.typeSavings'),
      description: t('notifications.savingsDeposit', { amount: formatAmount(500000), name: 'Liburan Jepang' }),
      amount: 500000,
      read: false,
      createdAt: new Date(now - 3 * 3600000), // 3 hours ago
    },
    {
      id: 'notif-5',
      type: 'system',
      title: t('notifications.typeSystem'),
      description: t('notifications.systemUpdate'),
      read: true,
      createdAt: new Date(now - 1 * 86400000), // 1 day ago
    },
    {
      id: 'notif-6',
      type: 'system',
      title: t('notifications.typeSystem'),
      description: t('notifications.systemTip'),
      read: true,
      createdAt: new Date(now - 2 * 86400000), // 2 days ago
    },
    {
      id: 'notif-7',
      type: 'expense',
      title: t('notifications.typeExpense'),
      description: t('notifications.expenseRecorded', { amount: formatAmount(120000), category: 'Transportasi' }),
      amount: 120000,
      read: true,
      createdAt: new Date(now - 3 * 86400000), // 3 days ago
    },
  ];
}

function formatRelativeTime(date: Date, t: (key: string, params?: Record<string, string | number>) => string): string {
  const mins = minutesAgo(date);
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

export function NotificationCenter() {
  const { t } = useTranslation();
  const { formatAmount } = useCurrencyFormat();
  const [open, setOpen] = useState(false);
  const [readIds, setReadIds] = useState<Set<string>>(() => {
    if (typeof window === 'undefined') return new Set();
    return getReadIds();
  });

  // Generate mock notifications (regenerated on each render to reflect locale changes)
  const notifications = generateMockNotifications(t, formatAmount);

  // Re-sync read state from localStorage when popover opens
  const handleOpenChange = useCallback((newOpen: boolean) => {
    setOpen(newOpen);
    if (newOpen) {
      setReadIds(getReadIds());
    }
  }, []);

  const unreadCount = notifications.filter((n) => !readIds.has(n.id)).length;

  const markAsRead = useCallback((id: string) => {
    setReadIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      saveReadIds(next);
      return next;
    });
  }, []);

  const markAllRead = useCallback(() => {
    const allIds = notifications.map((n) => n.id);
    const next = new Set(allIds);
    saveReadIds(next);
    setReadIds(next);
  }, [notifications]);

  const handleNotificationClick = useCallback(
    (notification: Notification) => {
      markAsRead(notification.id);
    },
    [markAsRead],
  );

  // Sort: unread first, then by date (newest first)
  const sortedNotifications = [...notifications].sort((a, b) => {
    const aRead = readIds.has(a.id) ? 1 : 0;
    const bRead = readIds.has(b.id) ? 1 : 0;
    if (aRead !== bRead) return aRead - bRead;
    return b.createdAt.getTime() - a.createdAt.getTime();
  });

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
          {sortedNotifications.length === 0 ? (
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
            sortedNotifications.map((notification) => {
              const isRead = readIds.has(notification.id);
              const config = TYPE_CONFIG[notification.type];

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
                          'text-xs leading-relaxed line-clamp-1',
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
                      className="text-[11px] leading-relaxed mt-0.5 line-clamp-2"
                      style={{ color: '#777' }}
                    >
                      {notification.description}
                    </p>
                    <p className="text-[9px] mt-1" style={{ color: '#555' }}>
                      {formatRelativeTime(notification.createdAt, t)}
                    </p>
                  </div>
                </button>
              );
            })
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

      {/* ── Keyframes ── */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
        @keyframes notifPulse {
          0%, 100% {
            box-shadow: 0 0 8px rgba(207,102,121,0.4);
          }
          50% {
            box-shadow: 0 0 14px rgba(207,102,121,0.6);
          }
        }
      `,
        }}
      />
    </Popover>
  );
}
