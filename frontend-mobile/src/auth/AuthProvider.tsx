import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { loginRequest, logoutRequest, meRequest, registerRequest } from '@/api/auth.api'
import { tokenStorage } from './tokenStorage'
import type { User } from '@/types/lumina'

type Credentials = {
  email: string
  password: string
}

type RegisterCredentials = Credentials & {
  name: string
}

type AuthContextValue = {
  user: User | null
  isBootstrapping: boolean
  isSubmitting: boolean
  error: string | null
  login: (credentials: Credentials) => Promise<void>
  register: (credentials: RegisterCredentials) => Promise<void>
  logout: () => Promise<void>
  clearError: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient()
  const [user, setUser] = useState<User | null>(null)
  const [isBootstrapping, setIsBootstrapping] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true

    const bootstrap = async () => {
      try {
        const accessToken = await tokenStorage.getAccessToken()
        const refreshToken = await tokenStorage.getRefreshToken()

        if (!accessToken && !refreshToken) return

        const payload = await meRequest()
        if (isMounted) setUser(payload.user)
      } catch {
        await tokenStorage.clear()
        if (isMounted) setUser(null)
      } finally {
        if (isMounted) setIsBootstrapping(false)
      }
    }

    bootstrap()

    return () => {
      isMounted = false
    }
  }, [])

  const login = useCallback(async (credentials: Credentials) => {
    setIsSubmitting(true)
    setError(null)

    try {
      const session = await loginRequest(credentials)
      await tokenStorage.setTokens(session.accessToken, session.refreshToken)
      setUser(session.user)
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : 'Unable to sign in')
      throw loginError
    } finally {
      setIsSubmitting(false)
    }
  }, [])

  const register = useCallback(async (credentials: RegisterCredentials) => {
    setIsSubmitting(true)
    setError(null)

    try {
      const session = await registerRequest(credentials)
      await tokenStorage.setTokens(session.accessToken, session.refreshToken)
      setUser(session.user)
    } catch (registerError) {
      setError(registerError instanceof Error ? registerError.message : 'Unable to create account')
      throw registerError
    } finally {
      setIsSubmitting(false)
    }
  }, [])

  const logout = useCallback(async () => {
    setIsSubmitting(true)
    setError(null)

    try {
      await logoutRequest().catch(() => null)
    } finally {
      await tokenStorage.clear()
      queryClient.clear()
      setUser(null)
      setIsSubmitting(false)
    }
  }, [queryClient])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isBootstrapping,
      isSubmitting,
      error,
      login,
      register,
      logout,
      clearError: () => setError(null),
    }),
    [error, isBootstrapping, isSubmitting, login, logout, register, user],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }

  return context
}
