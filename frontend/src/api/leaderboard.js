import { apiRequest } from './client'

export const fetchLeaderboardRequest = ({ period = 'weekly', subject = 'all', search = '', limit = 50 } = {}) =>
  apiRequest(`/api/leaderboard?period=${encodeURIComponent(period)}&subject=${encodeURIComponent(subject)}&search=${encodeURIComponent(search)}&limit=${limit}`)

export const fetchMyLeaderboardRequest = () => apiRequest('/api/leaderboard/me')
