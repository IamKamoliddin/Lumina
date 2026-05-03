import crypto from 'crypto'
import { pool } from '../db/pool.js'
import { recordStudyActivity } from './leaderboardService.js'
import { createFocusCompleteNotification } from './notificationsService.js'

export const listFocusLogs = async (userId) => {
  const [rows] = await pool.query(
    `SELECT id, user_id, subject, total_minutes, created_at
     FROM focus_logs
     WHERE user_id = ?
     ORDER BY created_at DESC
     LIMIT 100`,
    [userId],
  )
  return rows
}

export const createFocusLog = async (userId, payload) => {
  const id = crypto.randomUUID()
  const startedAt = new Date(payload.started_at)
  const endedAt = new Date(startedAt)
  endedAt.setMinutes(endedAt.getMinutes() + payload.total_minutes)

  await pool.query(
    `INSERT INTO focus_logs (id, user_id, subject, total_minutes, created_at)
     VALUES (?, ?, ?, ?, ?)`,
    [id, userId, payload.subject, payload.total_minutes, startedAt],
  )

  const activity = await recordStudyActivity({
    userId,
    type: 'focus_session',
    subject: payload.subject,
    value: payload.total_minutes,
    sourceId: id,
    startedAt,
    endedAt,
  })

  const focusLog = {
    id,
    user_id: userId,
    subject: payload.subject,
    total_minutes: payload.total_minutes,
    created_at: startedAt,
    validated: activity.validated,
    suspicious_reason: activity.suspiciousReason,
  }

  await createFocusCompleteNotification(userId, focusLog)

  return focusLog
}
