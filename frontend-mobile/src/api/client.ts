import Constants from 'expo-constants'
import { tokenStorage } from '@/auth/tokenStorage'

const manifestApiUrl = Constants.expoConfig?.extra?.apiUrl as string | undefined
const envApiUrl = process.env.EXPO_PUBLIC_API_URL

export const API_URL = envApiUrl || manifestApiUrl || 'http://localhost:4000'

type RequestOptions = RequestInit & {
  skipAuth?: boolean
  skipRefresh?: boolean
}

let refreshPromise: Promise<string | null> | null = null

const refreshAccessToken = async () => {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      const refreshToken = await tokenStorage.getRefreshToken()
      if (!refreshToken) return null

      const response = await fetch(`${API_URL}/api/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Client-Platform': 'mobile',
          'X-Refresh-Token': refreshToken,
        },
      })

      const payload = await response.json().catch(() => null)

      if (!response.ok) {
        await tokenStorage.clear()
        return null
      }

      await tokenStorage.setTokens(payload?.accessToken, payload?.refreshToken)
      return payload?.accessToken ?? null
    })().finally(() => {
      refreshPromise = null
    })
  }

  return refreshPromise
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const accessToken = options.skipAuth ? null : await tokenStorage.getAccessToken()

  const execute = async (token?: string | null) => {
    const response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'X-Client-Platform': 'mobile',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    })

    const payload = response.status === 204 ? null : await response.json().catch(() => null)

    return { response, payload }
  }

  let { response, payload } = await execute(accessToken)

  if (response.status === 401 && !options.skipAuth && !options.skipRefresh) {
    const refreshedToken = await refreshAccessToken()
    if (refreshedToken) {
      ;({ response, payload } = await execute(refreshedToken))
    }
  }

  if (!response.ok) {
    const message = payload?.error?.message || payload?.message || 'Request failed'
    const error = new Error(message)
    ;(error as Error & { status?: number }).status = response.status
    throw error
  }

  return payload as T
}
