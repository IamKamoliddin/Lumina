import crypto from 'crypto'
import { pool } from '../db/pool.js'
import { AppError } from '../utils/appError.js'
import { getAdminLeaderboard, resetUserLeaderboard, setUserLeaderboardVisibility } from './leaderboardService.js'

const toBool = (value) => !!value

export const getAdminOverview = async () => {
  const [[userStats], [bookStats], [eventStats], [focusStats], [errorStats]] = await Promise.all([
    pool.query(
      `SELECT
        COUNT(*) AS total_users,
        SUM(DATE(COALESCE(last_active_at, created_at)) = CURRENT_DATE()) AS active_users_today
       FROM users`,
    ),
    pool.query('SELECT COUNT(*) AS total_uploaded_books FROM books'),
    pool.query('SELECT COUNT(*) AS total_study_events FROM events'),
    pool.query('SELECT COALESCE(SUM(total_minutes), 0) AS total_focus_minutes FROM focus_logs'),
    pool.query(
      `SELECT COUNT(*) AS recent_errors
       FROM books
       WHERE upload_status IN ('failed', 'invalid')`,
    ),
  ])

  return {
    total_users: Number(userStats[0]?.total_users ?? 0),
    active_users_today: Number(userStats[0]?.active_users_today ?? 0),
    total_uploaded_books: Number(bookStats[0]?.total_uploaded_books ?? 0),
    total_study_events: Number(eventStats[0]?.total_study_events ?? 0),
    total_focus_minutes: Number(focusStats[0]?.total_focus_minutes ?? 0),
    ai_requests_today: 0,
    recent_errors: Number(errorStats[0]?.recent_errors ?? 0),
  }
}

export const listAdminUsers = async (search = '') => {
  const keyword = `%${search}%`
  const [rows] = await pool.query(
    `SELECT id, name, email, role, is_blocked, last_active_at, created_at
     FROM users
     WHERE ? = '' OR name LIKE ? OR email LIKE ?
     ORDER BY created_at DESC
     LIMIT 100`,
    [search, keyword, keyword],
  )

  return rows.map((user) => ({
    ...user,
    is_blocked: toBool(user.is_blocked),
  }))
}

export const updateAdminUser = async (adminId, userId, payload) => {
  if (adminId === userId && payload.is_blocked === true) {
    throw new AppError(400, 'CANNOT_BLOCK_SELF', 'You cannot block your own admin account')
  }
  if (adminId === userId && payload.role === 'user') {
    throw new AppError(400, 'CANNOT_DEMOTE_SELF', 'You cannot remove your own admin role')
  }

  const fields = []
  const values = []

  if (payload.role !== undefined) {
    fields.push('role = ?')
    values.push(payload.role)
  }
  if (payload.is_blocked !== undefined) {
    fields.push('is_blocked = ?')
    values.push(payload.is_blocked ? 1 : 0)
  }

  if (fields.length === 0) {
    throw new AppError(400, 'NO_USER_FIELDS', 'No user fields were provided')
  }

  values.push(userId)
  const [result] = await pool.query(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`, values)
  if (result.affectedRows === 0) {
    throw new AppError(404, 'USER_NOT_FOUND', 'User not found')
  }

  const [rows] = await pool.query(
    'SELECT id, name, email, role, is_blocked, last_active_at, created_at FROM users WHERE id = ?',
    [userId],
  )
  return { ...rows[0], is_blocked: toBool(rows[0].is_blocked) }
}

export const deleteAdminUser = async (adminId, userId) => {
  if (adminId === userId) {
    throw new AppError(400, 'CANNOT_DELETE_SELF', 'You cannot delete your own admin account')
  }

  const [result] = await pool.query('DELETE FROM users WHERE id = ?', [userId])
  if (result.affectedRows === 0) {
    throw new AppError(404, 'USER_NOT_FOUND', 'User not found')
  }
}

export const listAdminBooks = async (search = '') => {
  const keyword = `%${search}%`
  const [rows] = await pool.query(
     `SELECT b.id, b.title, b.author, b.status, b.file_size_bytes, b.upload_status, b.created_at,
      u.id AS owner_id, u.name AS owner_name, u.email AS owner_email
     FROM books b
     JOIN users u ON u.id COLLATE utf8mb4_unicode_ci = b.user_id COLLATE utf8mb4_unicode_ci
     WHERE ? = '' OR b.title LIKE ? OR u.name LIKE ? OR u.email LIKE ?
     ORDER BY b.created_at DESC
     LIMIT 100`,
    [search, keyword, keyword, keyword],
  )
  return rows
}

export const deleteAdminBook = async (bookId) => {
  const [result] = await pool.query('DELETE FROM books WHERE id = ?', [bookId])
  if (result.affectedRows === 0) {
    throw new AppError(404, 'BOOK_NOT_FOUND', 'Book not found')
  }
}

export const reprocessAdminBook = async (bookId) => {
  const [result] = await pool.query(
    "UPDATE books SET upload_status = 'queued' WHERE id = ?",
    [bookId],
  )
  if (result.affectedRows === 0) {
    throw new AppError(404, 'BOOK_NOT_FOUND', 'Book not found')
  }
}

export const listAdminEvents = async () => {
  const [rows] = await pool.query(
     `SELECT e.id, e.user_id, e.title, e.type, e.start_time, e.end_time, e.is_confirmed,
      u.name AS owner_name, u.email AS owner_email
     FROM events e
     JOIN users u ON u.id COLLATE utf8mb4_unicode_ci = e.user_id COLLATE utf8mb4_unicode_ci
     ORDER BY e.start_time DESC
     LIMIT 150`,
  )
  return rows.map((event) => ({ ...event, is_confirmed: toBool(event.is_confirmed) }))
}

export const createAdminEvent = async (payload) => {
  const targetUsers = payload.assign_to_all
    ? (await pool.query('SELECT id FROM users WHERE is_blocked = 0'))[0]
    : [{ id: payload.user_id }]

  if (!targetUsers.length || !targetUsers[0]?.id) {
    throw new AppError(400, 'EVENT_TARGET_REQUIRED', 'Choose a target user or assign to all users')
  }

  const created = []
  for (const user of targetUsers) {
    const id = crypto.randomUUID()
    await pool.query(
      `INSERT INTO events (id, user_id, title, type, start_time, end_time, is_confirmed)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        user.id,
        payload.title,
        payload.type,
        new Date(payload.start_time),
        new Date(payload.end_time),
        payload.is_confirmed ?? true,
      ],
    )
    created.push(id)
  }

  return { created_count: created.length }
}

export const updateAdminEvent = async (eventId, payload) => {
  const fields = []
  const values = []

  if (payload.title !== undefined) {
    fields.push('title = ?')
    values.push(payload.title)
  }
  if (payload.type !== undefined) {
    fields.push('type = ?')
    values.push(payload.type)
  }
  if (payload.start_time !== undefined) {
    fields.push('start_time = ?')
    values.push(new Date(payload.start_time))
  }
  if (payload.end_time !== undefined) {
    fields.push('end_time = ?')
    values.push(new Date(payload.end_time))
  }

  if (fields.length === 0) {
    throw new AppError(400, 'NO_EVENT_FIELDS', 'No event fields were provided')
  }

  values.push(eventId)
  const [result] = await pool.query(`UPDATE events SET ${fields.join(', ')} WHERE id = ?`, values)
  if (result.affectedRows === 0) {
    throw new AppError(404, 'EVENT_NOT_FOUND', 'Event not found')
  }
}

export const deleteAdminEvent = async (eventId) => {
  const [result] = await pool.query('DELETE FROM events WHERE id = ?', [eventId])
  if (result.affectedRows === 0) {
    throw new AppError(404, 'EVENT_NOT_FOUND', 'Event not found')
  }
}

export const getAdminAnalytics = async () => {
  const [[focusRows], [bookRows], [activeRows], [mostActiveRows]] = await Promise.all([
    pool.query(
      `SELECT DATE(created_at) AS day, COALESCE(SUM(total_minutes), 0) AS total_minutes
       FROM focus_logs
       GROUP BY DATE(created_at)
       ORDER BY day DESC
       LIMIT 14`,
    ),
    pool.query(
      `SELECT DATE(created_at) AS day, COUNT(*) AS uploaded_books
       FROM books
       GROUP BY DATE(created_at)
       ORDER BY day DESC
       LIMIT 14`,
    ),
    pool.query(
      `SELECT DATE(COALESCE(last_active_at, created_at)) AS day, COUNT(*) AS active_users
       FROM users
       GROUP BY DATE(COALESCE(last_active_at, created_at))
       ORDER BY day DESC
       LIMIT 14`,
    ),
    pool.query(
      `SELECT u.id, u.name, u.email, COALESCE(SUM(fl.total_minutes), 0) AS focus_minutes
       FROM users u
       LEFT JOIN focus_logs fl ON fl.user_id COLLATE utf8mb4_unicode_ci = u.id COLLATE utf8mb4_unicode_ci
       GROUP BY u.id, u.name, u.email
       ORDER BY focus_minutes DESC
       LIMIT 10`,
    ),
  ])

  return {
    daily_active_users: activeRows,
    focus_minutes_per_day: focusRows,
    uploaded_books_per_day: bookRows,
    ai_usage: [],
    most_active_users: mostActiveRows,
  }
}

export const listAdminLeaderboard = getAdminLeaderboard
export const hideUserFromLeaderboard = setUserLeaderboardVisibility
export const resetLeaderboardForUser = resetUserLeaderboard

export const listAdminActivity = async (userId) => {
  const [rows] = await pool.query(
    `SELECT id, type, subject, value, started_at, ended_at, created_at, validated, suspicious_reason
     FROM study_activity
     WHERE user_id = ?
     ORDER BY created_at DESC
     LIMIT 100`,
    [userId],
  )
  return rows.map((row) => ({ ...row, validated: !!row.validated }))
}
