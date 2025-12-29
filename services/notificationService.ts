import { ApiClient } from './apiClient';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  data?: Record<string, any>;
  isRead: boolean;
  createdAt: string;
}

// Service de notifications
export const notificationService = {
  // Obtenir les notifications
  async getNotifications(unreadOnly: boolean = false, limit: number = 20): Promise<{
    notifications: Notification[];
    unreadCount: number;
  }> {
    const params = new URLSearchParams({
      ...(unreadOnly && { unreadOnly: 'true' }),
      limit: limit.toString()
    });

    const response = await ApiClient.get<{
      notifications: Notification[];
      pagination: { unreadCount: number };
    }>(`/notifications?${params}`);

    if (response.success && response.data) {
      return {
        notifications: response.data.notifications,
        unreadCount: response.data.pagination.unreadCount
      };
    }

    return { notifications: [], unreadCount: 0 };
  },

  // Marquer comme lue
  async markAsRead(notificationId: string): Promise<boolean> {
    const response = await ApiClient.put(`/notifications/${notificationId}/read`);
    return response.success;
  },

  // Marquer toutes comme lues
  async markAllAsRead(): Promise<boolean> {
    const response = await ApiClient.put('/notifications/read-all');
    return response.success;
  },

  // Supprimer une notification
  async deleteNotification(notificationId: string): Promise<boolean> {
    const response = await ApiClient.delete(`/notifications/${notificationId}`);
    return response.success;
  },

  // Compter les non lues
  async getUnreadCount(): Promise<number> {
    const response = await ApiClient.get<{ count: number }>('/notifications/unread-count');
    return response.success ? response.data?.count || 0 : 0;
  },

  // Demander la permission pour les notifications push
  async requestPushPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      console.log('Ce navigateur ne supporte pas les notifications');
      return false;
    }

    const permission = await Notification.requestPermission();
    return permission === 'granted';
  },

  // Afficher une notification locale
  showLocalNotification(title: string, options?: NotificationOptions): void {
    if (Notification.permission === 'granted') {
      new Notification(title, {
        icon: '/icon-192.png',
        badge: '/icon-72.png',
        ...options
      });
    }
  }
};

export type { Notification };
