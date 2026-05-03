import { env } from '../config/env.js'
import { authCookies, buildCookieOptions } from '../config/security.js'
import {
  getCurrentUser,
  loginUser,
  logoutUser,
  refreshUserSession,
  registerUser,
  resolveUserIdFromTokens,
} from '../services/authService.js'

const clearAuthCookies = (res) => {
  res.clearCookie(authCookies.access, {
    httpOnly: true,
    sameSite: 'lax',
    secure: env.COOKIE_SECURE,
    path: '/',
  })
  res.clearCookie(authCookies.refresh, {
    httpOnly: true,
    sameSite: 'lax',
    secure: env.COOKIE_SECURE,
    path: '/',
  })
}

const setAuthCookies = (res, session) => {
  res.cookie(
    authCookies.access,
    session.accessToken,
    buildCookieOptions(session.accessTokenMaxAge),
  )
  res.cookie(
    authCookies.refresh,
    session.refreshToken,
    buildCookieOptions(session.refreshTokenMaxAge),
  )
}

export const register = async (req, res) => {
  const session = await registerUser(req.validated.body)
  setAuthCookies(res, session)
  res.status(201).json({ user: session.user })
}

export const login = async (req, res) => {
  const session = await loginUser(req.validated.body)
  setAuthCookies(res, session)
  res.json({ user: session.user })
}

export const refresh = async (req, res) => {
  const session = await refreshUserSession(req.cookies?.[authCookies.refresh])
  setAuthCookies(res, session)
  res.json({ user: session.user })
}

export const me = async (req, res) => {
  const user = await getCurrentUser(req.user.id)
  res.json({ user })
}

export const logout = async (req, res) => {
  const bearer = req.headers.authorization?.startsWith('Bearer ')
    ? req.headers.authorization.slice(7)
    : null
  const userId = resolveUserIdFromTokens({
    accessToken: req.cookies?.[authCookies.access] ?? bearer,
    refreshToken: req.cookies?.[authCookies.refresh],
  })

  if (userId) {
    await logoutUser(userId)
  }

  clearAuthCookies(res)
  res.status(204).send()
}
