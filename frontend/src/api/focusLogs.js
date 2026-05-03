import { apiRequest } from './client'

export const createFocusLogRequest = (body) =>
  apiRequest('/api/focus-logs', {
    method: 'POST',
    body: JSON.stringify(body),
  })
