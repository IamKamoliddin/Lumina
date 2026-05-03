import { env } from './env.js'

export const authCookies = {
  access: 'lumina_access',
  refresh: 'lumina_refresh',
}

export const buildCookieOptions = (maxAgeMs) => ({
  httpOnly: true,
  sameSite: 'lax',
  secure: env.COOKIE_SECURE,
  path: '/',
  maxAge: maxAgeMs,
})
