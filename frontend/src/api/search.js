import { apiRequest } from './client'

export const globalSearchRequest = (query) =>
  apiRequest(`/api/search?q=${encodeURIComponent(query)}`)
