import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import { pool } from '../db/pool.js'
import {
  getAccessTokenMaxAge,
  getRefreshTokenMaxAge,
  hashToken,
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
} from './tokenService.js'
import { AppError } from '../utils/appError.js'

const buildAuthPayload = async (user) => {
  const accessToken = signAccessToken(user)
  const refreshToken = signRefreshToken(user)

  const tokenHash = hashToken(refreshToken)
  
  // Persist refresh token
  await pool.query(
    `INSERT INTO refresh_tokens (user_id, token_hash)
     VALUES (?, ?)
     ON DUPLICATE KEY UPDATE
       token_hash = VALUES(token_hash),
       issued_at = CURRENT_TIMESTAMP`,
    [user.id, tokenHash]
  )

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role ?? 'user',
      username: user.username ?? '',
      leaderboard_visible: user.leaderboard_visible !== 0,
    },
    accessToken,
    refreshToken,
    accessTokenMaxAge: getAccessTokenMaxAge(),
    refreshTokenMaxAge: getRefreshTokenMaxAge(),
  }
}

const findUserByEmail = async (email) => {
  const normalizedEmail = email.trim().toLowerCase()
  const [rows] = await pool.query(
    'SELECT `id`, `name`, `email`, `username`, `leaderboard_visible`, `role`, `is_blocked`, `password_hash` AS `passwordHash`, `profile_picture_url`, `created_at` AS `createdAt` FROM `users` WHERE `email` = ?',
    [normalizedEmail]
  )
  return rows[0] || null
}

export const registerUser = async ({ name, email, password }) => {
  const normalizedEmail = email.trim().toLowerCase()

  const existingUser = await findUserByEmail(normalizedEmail)
  if (existingUser) {
    throw new AppError(409, 'EMAIL_ALREADY_IN_USE', 'An account with this email already exists')
  }

  const id = crypto.randomUUID()
  const usernameBase = normalizedEmail.split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g, '_').slice(0, 16)
  const username = `${usernameBase || 'student'}_${crypto.randomBytes(2).toString('hex')}`.slice(0, 20)
  const passwordHash = await bcrypt.hash(password, 12)
  
  await pool.query(
    'INSERT INTO `users` (`id`, `name`, `email`, `username`, `password_hash`) VALUES (?, ?, ?, ?, ?)',
    [id, name.trim(), normalizedEmail, username, passwordHash]
  )

  const user = {
    id,
    name: name.trim(),
    email: normalizedEmail,
    username,
    leaderboard_visible: true,
  }

  // Create default subjects
  const defaultSubjects = [
    { name: 'Mathematics', color: '#38BDF8' },
    { name: 'Programming', color: '#34D399' },
    { name: 'History', color: '#FBBF24' },
    { name: 'Physics', color: '#F472B6' },
    { name: 'General/AI', color: '#6366F1' },
  ]

  for (const s of defaultSubjects) {
    await pool.query(
      'INSERT INTO `subjects` (`id`, `user_id`, `name`, `color_hex`) VALUES (?, ?, ?, ?)',
      [crypto.randomUUID(), id, s.name, s.color]
    )
  }

  return buildAuthPayload(user)
}

export const loginUser = async ({ email, password }) => {
  const user = await findUserByEmail(email)

  if (!user) {
    throw new AppError(401, 'INVALID_CREDENTIALS', 'Email or password is incorrect')
  }
  if (user.is_blocked) {
    throw new AppError(403, 'ACCOUNT_BLOCKED', 'This account has been blocked')
  }

  const isValid = await bcrypt.compare(password, user.passwordHash)
  if (!isValid) {
    throw new AppError(401, 'INVALID_CREDENTIALS', 'Email or password is incorrect')
  }

  return buildAuthPayload(user)
}

export const refreshUserSession = async (refreshToken) => {
  if (!refreshToken) {
    throw new AppError(401, 'REFRESH_REQUIRED', 'Refresh token is required')
  }

  let payload
  try {
    payload = verifyRefreshToken(refreshToken)
  } catch {
    throw new AppError(401, 'INVALID_REFRESH_TOKEN', 'Refresh session is invalid or expired')
  }

  const tokenHash = hashToken(refreshToken)
  const [rows] = await pool.query(
    'SELECT u.`id`, u.`name`, u.`email`, u.`username`, u.`leaderboard_visible`, u.`role`, u.`is_blocked` FROM `users` u JOIN `refresh_tokens` rt ON u.`id` = rt.`user_id` WHERE u.`id` = ? AND rt.`token_hash` = ?',
    [payload.sub, tokenHash]
  )

  const user = rows[0]
  if (!user) {
    throw new AppError(401, 'INVALID_REFRESH_TOKEN', 'Refresh session is invalid or expired')
  }
  if (user.is_blocked) {
    throw new AppError(403, 'ACCOUNT_BLOCKED', 'This account has been blocked')
  }

  return buildAuthPayload(user)
}

export const logoutUser = async (userId) => {
  await pool.query('DELETE FROM `refresh_tokens` WHERE `user_id` = ?', [userId])
}

export const resolveUserIdFromTokens = ({ accessToken, refreshToken }) => {
  if (refreshToken) {
    try {
      const payload = verifyRefreshToken(refreshToken)
      return payload.sub
    } catch {
      // Ignore
    }
  }

  if (accessToken) {
    try {
      const payload = verifyAccessToken(accessToken)
      return payload.sub
    } catch {
      // Ignore
    }
  }

  return null
}

export const getCurrentUser = async (userId) => {
  const [rows] = await pool.query(
    'SELECT `id`, `name`, `email`, `username`, `leaderboard_visible`, `role`, `is_blocked`, `last_active_at`, `profile_picture_url`, `created_at` FROM `users` WHERE `id` = ?',
    [userId]
  )

  const user = rows[0]
  if (!user) {
    throw new AppError(404, 'USER_NOT_FOUND', 'User not found')
  }
  if (user.is_blocked) {
    throw new AppError(403, 'ACCOUNT_BLOCKED', 'This account has been blocked')
  }

  await pool.query('UPDATE `users` SET `last_active_at` = CURRENT_TIMESTAMP WHERE `id` = ?', [userId])

  return user
}
