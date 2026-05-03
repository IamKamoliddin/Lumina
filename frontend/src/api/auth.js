import { apiRequest } from './client'

export const registerRequest = (body) =>
  apiRequest('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(body),
  })

export const loginRequest = (body) =>
  apiRequest('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(body),
  })

export const meRequest = () => apiRequest('/api/auth/me')

export const logoutRequest = () =>
  apiRequest('/api/auth/logout', {
    method: 'POST',
  })

export const refreshRequest = () =>
  apiRequest('/api/auth/refresh', {
    method: 'POST',
  })
