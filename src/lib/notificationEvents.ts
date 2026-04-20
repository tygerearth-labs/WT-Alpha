/**
 * Lightweight event bus for notification state changes.
 * Used to trigger notification badge refresh when transactions
 * are created without needing to open the notification panel.
 */

export type NotificationEventType = 'notification-created' | 'notification-read' | 'notifications-cleared';

const TARGET = typeof window !== 'undefined' ? window : null;

export function dispatchNotificationEvent(type: NotificationEventType) {
  if (!TARGET) return;
  TARGET.dispatchEvent(new CustomEvent(type));
}

export function onNotificationEvent(
  type: NotificationEventType,
  handler: () => void,
): () => void {
  if (!TARGET) return () => {};
  TARGET.addEventListener(type, handler);
  return () => TARGET.removeEventListener(type, handler);
}
