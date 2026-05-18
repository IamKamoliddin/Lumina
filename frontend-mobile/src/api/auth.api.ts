import { apiRequest } from './client'
import type { AuthSession, User } from '@/types/lumina'

type LoginBody = {
  email: string
  password: string
}

type RegisterBody = LoginBody & {
  name: string
}

export const loginRequest = (body: LoginBody) =>
  apiRequest<AuthSession>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(body),
    skipAuth: true,
  })

export const registerRequest = (body: RegisterBody) =>
  apiRequest<AuthSession>('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(body),
    skipAuth: true,
  })

export const meRequest = () => apiRequest<{ user: User }>('/api/auth/me')

export const logoutRequest = () =>
  apiRequest<null>('/api/auth/logout', {
    method: 'POST',
    skipRefresh: true,
  })
