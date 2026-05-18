import { apiRequest } from './client'
import type { Book, LuminaEvent, NotificationItem, User } from '@/types/lumina'

export const fetchEvents = () => apiRequest<{ data: LuminaEvent[] }>('/api/events')

export const fetchBooks = () => apiRequest<{ data: Book[] }>('/api/books')

export const fetchNotifications = () =>
  apiRequest<{ data: NotificationItem[]; unread_count?: number }>('/api/notifications')

export const fetchProfile = () => apiRequest<{ user: User }>('/api/user/profile')

export const markNotificationRead = (id: string) =>
  apiRequest<{ notification: NotificationItem }>(`/api/notifications/${id}/read`, {
    method: 'PATCH',
  })
