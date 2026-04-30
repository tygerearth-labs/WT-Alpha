'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Bell, BellRing, Info, AlertTriangle, CheckCircle2, XCircle, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/hooks/useTranslation';

const STORAGE_KEY = 'wt-read-announcements';

interface Announcement {
  id: string;
  title: string;
  message: string;
  type: string;
  priority: number;
  expiresAt: string | null;
}

function getReadIds(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function markAsRead(id: string) {
  const readIds = getReadIds();
  if (!readIds.includes(id)) {
    readIds.push(id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(readIds));
  }
}

function getTypeIcon(type: string) {
  switch (type) {
    case 'warning':
      return <AlertTriangle className="h-4 w-4 text-[#F9A825]" />;
    case 'success':
      return <CheckCircle2 className="h-4 w-4 text-[#03DAC6]" />;
    case 'error':
      return <XCircle className="h-4 w-4 text-[#CF6679]" />;
    default:
      return <Info className="h-4 w-4 text-[#BB86FC]" />;
  }
}

function getTypeBg(type: string) {
  switch (type) {
    case 'warning':
      return 'rgba(249,168,37,0.12)';
    case 'success':
      return 'rgba(3,218,198,0.12)';
    case 'error':
      return 'rgba(207,102,121,0.12)';
    default:
      return 'rgba(187,134,252,0.12)';
  }
}

function formatTimestamp(dateStr: string | null) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function NotificationBell() {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [readIds, setReadIds] = useState<string[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [hasActiveAnnouncements, setHasActiveAnnouncements] = useState(false);

  // Fetch announcements
  const fetchAnnouncements = useCallback(async () => {
    try {
      const res = await fetch('/api/announcements');
      if (res.ok) {
        const data = await res.json();
        setAnnouncements(data.announcements || []);
        setHasActiveAnnouncements((data.announcements || []).length > 0);
      }
    } catch {
      // Silently fail
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnnouncements();
  }, [fetchAnnouncements]);

  // Sync readIds from localStorage
  useEffect(() => {
    setReadIds(getReadIds());
  }, [isOpen]); // Re-sync when dropdown opens

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Unread count
  const unreadCount = announcements.filter(a => !readIds.includes(a.id)).length;

  const handleMarkAsRead = (id: string) => {
    markAsRead(id);
    setReadIds(prev => [...prev, id]);
  };

  const handleMarkAllAsRead = () => {
    announcements.forEach(a => markAsRead(a.id));
    setReadIds(announcements.map(a => a.id));
  };

  const handleNotificationClick = (announcement: Announcement) => {
    handleMarkAsRead(announcement.id);
  };

  // Mark all notifications as read via API when the bell is opened
  const handleBellOpen = useCallback(async () => {
    const newOpen = !isOpen;
    setIsOpen(newOpen);
    if (newOpen) {
      // Immediately clear badge count locally
      handleMarkAllAsRead();
    }
  }, [isOpen, announcements]);

  // Don't render if no active announcements
  if (!isLoading && !hasActiveAnnouncements) return null;

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={handleBellOpen}
        className={cn(
          'relative grid place-items-center w-9 h-9 rounded-full transition-all duration-200',
          'hover:bg-white/[0.06] active:scale-95',
          isOpen && 'bg-white/[0.08]',
        )}
        aria-label={t('notifications.title') || 'Notifications'}
      >
        {isOpen ? (
          <BellRing className="h-[18px] w-[18px] text-white/70" />
        ) : (
          <Bell className="h-[18px] w-[18px] text-white/50" />
        )}
        {/* Unread badge */}
        {unreadCount > 0 && (
          <span
            className="notif-badge absolute -top-0.5 -right-0.5"
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div
          className="notif-panel absolute right-0 top-full mt-2 w-80 sm:w-96 z-50"
        >
          {/* Header */}
          <div className="notif-header">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-[#BB86FC]" />
              <span className="text-sm font-semibold text-[#E6E1E5]">
                {t('notifications.title') || 'Notifications'}
              </span>
              {unreadCount > 0 && (
                <span
                  className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-[#BB86FC]/15 text-[#BB86FC]"
                >
                  {unreadCount}
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="notif-mark-all-btn"
              >
                {t('notifications.markAllRead') || 'Mark all read'}
              </button>
            )}
          </div>

          {/* Notification List */}
          <div className="notif-scroll-list">
            {isLoading ? (
              <div className="flex items-center justify-center py-10">
                <div className="notif-spinner" />
              </div>
            ) : announcements.length === 0 ? (
              /* Empty State */
              <div className="notif-empty-state">
                <div
                  className="notif-empty-state-icon"
                >
                  <Bell className="h-5 w-5 text-[#555]" />
                </div>
                <p className="text-xs font-medium text-[#666]">
                  {t('notifications.empty') || 'No new notifications'}
                </p>
                <p className="text-[10px] text-[#444]">
                  {t('notifications.emptyDesc') || 'You\'re all caught up!'}
                </p>
              </div>
            ) : (
              announcements.map((announcement) => {
                const isRead = readIds.includes(announcement.id);
                return (
                  <button
                    key={announcement.id}
                    onClick={() => handleNotificationClick(announcement)}
                    className={cn(
                      'notif-item',
                      !isRead && 'notif-item-unread',
                    )}
                  >
                    {/* Icon */}
                    <div
                      className="notif-type-icon"
                      style={{ background: getTypeBg(announcement.type) }}
                    >
                      {getTypeIcon(announcement.type)}
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
                          {announcement.title}
                        </p>
                        {!isRead && (
                          <div className="shrink-0 w-2 h-2 rounded-full mt-1.5 bg-[#BB86FC]" />
                        )}
                      </div>
                      <p
                        className="text-[11px] leading-relaxed mt-0.5 line-clamp-2 text-[#777]"
                      >
                        {announcement.message}
                      </p>
                      {announcement.expiresAt && (
                        <p className="text-[9px] mt-1 text-[#555]">
                          {formatTimestamp(announcement.expiresAt)}
                        </p>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Footer */}
          {announcements.length > 0 && (
            <div
              className="notif-footer flex items-center justify-center gap-1.5 cursor-pointer"
              onClick={() => setIsOpen(false)}
            >
              <ExternalLink className="h-3 w-3 text-[#666]" />
              <span className="text-[11px] font-medium text-[#666]">
                {t('notifications.close') || 'Close'}
              </span>
            </div>
          )}
        </div>
      )}


    </div>
  );
}
