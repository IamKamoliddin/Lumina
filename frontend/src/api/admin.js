import { apiRequest } from './client'

export const fetchAdminOverviewRequest = () => apiRequest('/api/admin/overview')
export const fetchAdminUsersRequest = (search = '') =>
  apiRequest(`/api/admin/users${search ? `?search=${encodeURIComponent(search)}` : ''}`)
export const updateAdminUserRequest = (id, body) =>
  apiRequest(`/api/admin/users/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  })
export const deleteAdminUserRequest = (id) =>
  apiRequest(`/api/admin/users/${id}`, {
    method: 'DELETE',
  })
export const fetchAdminBooksRequest = (search = '') =>
  apiRequest(`/api/admin/books${search ? `?search=${encodeURIComponent(search)}` : ''}`)
export const deleteAdminBookRequest = (id) =>
  apiRequest(`/api/admin/books/${id}`, {
    method: 'DELETE',
  })
export const reprocessAdminBookRequest = (id) =>
  apiRequest(`/api/admin/books/${id}/reprocess`, {
    method: 'POST',
  })
export const fetchAdminEventsRequest = () => apiRequest('/api/admin/events')
export const createAdminEventRequest = (body) =>
  apiRequest('/api/admin/events', {
    method: 'POST',
    body: JSON.stringify(body),
  })
export const updateAdminEventRequest = (id, body) =>
  apiRequest(`/api/admin/events/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  })
export const deleteAdminEventRequest = (id) =>
  apiRequest(`/api/admin/events/${id}`, {
    method: 'DELETE',
  })
export const fetchAdminAnalyticsRequest = () => apiRequest('/api/admin/analytics')
export const fetchAdminLeaderboardRequest = ({ period = 'weekly', subject = 'all', search = '' } = {}) =>
  apiRequest(`/api/admin/leaderboard?period=${encodeURIComponent(period)}&subject=${encodeURIComponent(subject)}&search=${encodeURIComponent(search)}`)
export const setAdminLeaderboardVisibilityRequest = (id, visible) =>
  apiRequest(`/api/admin/leaderboard/users/${id}/visibility`, {
    method: 'PATCH',
    body: JSON.stringify({ visible }),
  })
export const resetAdminLeaderboardRequest = (id) =>
  apiRequest(`/api/admin/leaderboard/users/${id}/reset`, {
    method: 'POST',
  })
export const fetchAdminActivityRequest = (id) => apiRequest(`/api/admin/activity/users/${id}`)
