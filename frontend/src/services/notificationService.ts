import api from './api';

export type NotificationType =
  | 'menu_item_created'
  | 'menu_item_updated'
  | 'menu_item_deleted'
  | 'availability_changed'
  | 'staff_invited'
  | 'staff_updated'
  | 'staff_deleted'
  | 'invitation_accepted';

export interface NotificationItem {
  _id: string;
  restaurantId: string;
  type: NotificationType;
  title: string;
  message: string;
  createdBy: {
    _id: string;
    name?: string;
    email?: string;
  } | string;
  isRead: boolean;
  createdAt: string;
}

export const notificationService = {
  getNotifications: async (): Promise<NotificationItem[]> => {
    const response = await api.get('/notifications');
    return response.data?.data || [];
  },

  getUnreadCount: async (): Promise<number> => {
    const response = await api.get('/notifications/unread-count');
    return response.data?.data?.unreadCount || 0;
  },

  markAllRead: async (): Promise<number> => {
    const response = await api.patch('/notifications/mark-all-read');
    return response.data?.data?.updatedCount || 0;
  }
};
