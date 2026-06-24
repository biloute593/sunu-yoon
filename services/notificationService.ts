// Notifications stockées en localStorage — aucun backend requis
const NOTIF_KEY = 'sunu_yoon_notifications';

export interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  data?: Record<string, any>;
  isRead: boolean;
  createdAt: string;
}

const _load = (): Notification[] => {
  try { return JSON.parse(localStorage.getItem(NOTIF_KEY) || '[]'); }
  catch { return []; }
};

const _save = (notifs: Notification[]): void => {
  localStorage.setItem(NOTIF_KEY, JSON.stringify(notifs.slice(0, 50)));
};

export const notificationService = {
  async getNotifications(unreadOnly = false, limit = 20): Promise<{
    notifications: Notification[];
    unreadCount: number;
  }> {
    const all = _load();
    const filtered = unreadOnly ? all.filter(n => !n.isRead) : all;
    const unreadCount = all.filter(n => !n.isRead).length;
    return { notifications: filtered.slice(0, limit), unreadCount };
  },

  async markAsRead(notificationId: string): Promise<boolean> {
    _save(_load().map(n => n.id === notificationId ? { ...n, isRead: true } : n));
    return true;
  },

  async markAllAsRead(): Promise<boolean> {
    _save(_load().map(n => ({ ...n, isRead: true })));
    return true;
  },

  async deleteNotification(notificationId: string): Promise<boolean> {
    _save(_load().filter(n => n.id !== notificationId));
    return true;
  },

  async getUnreadCount(): Promise<number> {
    return _load().filter(n => !n.isRead).length;
  },

  // Appelé par les autres services pour créer une notification
  push(type: string, title: string, message: string, data?: Record<string, any>): void {
    const notif: Notification = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      type,
      title,
      message,
      data,
      isRead: false,
      createdAt: new Date().toISOString(),
    };
    _save([notif, ..._load()]);
    notificationService.showLocalNotification(title, { body: message });
  },

  async requestPushPermission(): Promise<boolean> {
    if (!('Notification' in window)) return false;
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  },

  showLocalNotification(title: string, options?: NotificationOptions): void {
    if (Notification.permission === 'granted') {
      new Notification(title, { icon: '/icon-192.png', badge: '/icon-72.png', ...options });
    }
  }
};

export type { Notification as NotificationType };
