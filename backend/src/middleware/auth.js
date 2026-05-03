import { authCookies } from '../config/security.js'
import { pool } from '../db/pool.js'
import { AppError } from '../utils/appError.js'
import { verifyAccessToken } from '../services/tokenService.js'

export const requireAuth = (req, _res, next) => {
  try {
    const bearer = req.headers.authorization?.startsWith('Bearer ')
      ? req.headers.authorization.slice(7)
      : null
    const token = req.cookies?.[authCookies.access] ?? bearer

    if (!token) {
      return next(new AppError(401, 'AUTH_REQUIRED', 'Authentication is required'))
    }

    const payload = verifyAccessToken(token)
    
    req.user = {
      id: payload.sub,
      email: payload.email,
    }

    return next()
  } catch {
    return next(new AppError(401, 'INVALID_TOKEN', 'Session is invalid or expired'))
  }
}

export const requireAdmin = async (req, _res, next) => {
  try {
    const [rows] = await pool.query(
      'SELECT `role`, `is_blocked` FROM `users` WHERE `id` = ?',
      [req.user?.id],
    )
    const user = rows[0]

    if (!user || user.is_blocked) {
      return next(new AppError(403, 'ACCESS_DENIED', 'Access denied'))
    }

    if (user.role !== 'admin') {
      return next(new AppError(403, 'ADMIN_REQUIRED', 'Admin access is required'))
    }

    req.user.role = user.role
    return next()
  } catch (error) {
    return next(error)
  }
}
