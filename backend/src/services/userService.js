import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'
import { pool } from '../db/pool.js'
import { AppError } from '../utils/appError.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const uploadRoot = path.resolve(__dirname, '..', '..', 'uploads', 'profile-images')
const extensionByType = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
}

const toProfileResponse = (user) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  role: user.role ?? 'user',
  username: user.username ?? '',
  leaderboard_visible: user.leaderboard_visible !== 0,
  is_blocked: !!user.is_blocked,
  last_active_at: user.last_active_at,
  profile_picture_url: user.profile_picture_url ?? '',
  created_at: user.created_at,
})

export const getUserProfile = async (userId) => {
  const [rows] = await pool.query(
    'SELECT id, name, email, username, leaderboard_visible, role, is_blocked, last_active_at, profile_picture_url, created_at FROM users WHERE id = ?',
    [userId]
  )
  const user = rows[0]

  if (!user) {
    throw new AppError(404, 'USER_NOT_FOUND', 'User not found')
  }

  return toProfileResponse(user)
}

export const updateUserProfile = async (userId, payload) => {
  if (payload.username) {
    const [existing] = await pool.query(
      'SELECT id FROM users WHERE username = ? AND id != ?',
      [payload.username, userId],
    )
    if (existing.length > 0) {
      throw new AppError(409, 'USERNAME_TAKEN', 'That username is already taken')
    }
  }

  await pool.query(
    'UPDATE users SET name = ?, username = ?, leaderboard_visible = ?, profile_picture_url = ? WHERE id = ?',
    [
      payload.name.trim(),
      payload.username?.trim().toLowerCase() || null,
      payload.leaderboard_visible ? 1 : 0,
      payload.profile_picture_url?.trim() ?? '',
      userId,
    ]
  )

  return getUserProfile(userId)
}

export const changeUserEmail = async (userId, email) => {
  const normalizedEmail = email.trim().toLowerCase()
  
  // Check if email is already in use
  const [existing] = await pool.query(
    'SELECT id FROM users WHERE email = ? AND id != ?',
    [normalizedEmail, userId]
  )

  if (existing.length > 0) {
    throw new AppError(409, 'EMAIL_ALREADY_IN_USE', 'An account with this email already exists')
  }

  await pool.query(
    'UPDATE users SET email = ? WHERE id = ?',
    [normalizedEmail, userId]
  )

  const user = await getUserProfile(userId)

  return {
    user,
    verification_recommended: true,
  }
}

export const changeUserPassword = async (userId, { current_password, new_password }) => {
  const [rows] = await pool.query(
    'SELECT password_hash FROM users WHERE id = ?',
    [userId]
  )
  const user = rows[0]

  if (!user) {
    throw new AppError(404, 'USER_NOT_FOUND', 'User not found')
  }

  const matches = await bcrypt.compare(current_password, user.password_hash)

  if (!matches) {
    throw new AppError(400, 'INVALID_CURRENT_PASSWORD', 'Current password is incorrect')
  }

  const newHash = await bcrypt.hash(new_password, 12)
  await pool.query(
    'UPDATE users SET password_hash = ? WHERE id = ?',
    [newHash, userId]
  )

  // Invalidate all sessions
  await pool.query('DELETE FROM refresh_tokens WHERE user_id = ?', [userId])

  return {
    changed: true,
  }
}

export const saveProfileImage = async ({ userId, buffer, contentType, origin }) => {
  const extension = extensionByType[contentType]
  if (!extension) {
    throw new AppError(400, 'INVALID_PROFILE_IMAGE_TYPE', 'Choose a PNG, JPG, JPEG, or WEBP image.')
  }

  await fs.mkdir(uploadRoot, { recursive: true })

  const filename = `${userId}-${crypto.randomUUID()}.${extension}`
  const filepath = path.join(uploadRoot, filename)
  await fs.writeFile(filepath, buffer)

  return `${origin}/uploads/profile-images/${filename}`
}
