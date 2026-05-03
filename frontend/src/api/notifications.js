import { apiRequest } from './client'

export const fetchNotificationsRequest = () => apiRequest('/api/notifications')

export const checkNotificationsRequest = () =>
  apiRequest('/api/notifications/check', {
    method: 'POST',
  })

export const markNotificationReadRequest = (id) =>
  apiRequest(`/api/notifications/${encodeURIComponent(id)}/read`, {
    method: 'PATCH',
  })

export const markAllNotificationsReadRequest = () =>
  apiRequest('/api/notifications/read-all', {
    method: 'POST',
  })

export const fetchNotificationPreferencesRequest = () => apiRequest('/api/notifications/preferences')

export const updateNotificationPreferencesRequest = (body) =>
  apiRequest('/api/notifications/preferences', {
    method: 'PUT',
    body: JSON.stringify(body),
  })
