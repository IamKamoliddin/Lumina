import crypto from 'crypto'
import { pool } from '../db/pool.js'
import { AppError } from '../utils/appError.js'

const periods = ['daily', 'weekly', 'monthly']
const defaultLeaderboardSubjects = ['all', 'Mathematics', 'Programming', 'History', 'Physics', 'General/AI']

const periodBounds = (period, date = new Date()) => {
  const start = new Date(date)
  start.setHours(0, 0, 0, 0)

  if (period === 'weekly') {
    const day = start.getDay() || 7
    start.setDate(start.getDate() - day + 1)
  }

  if (period === 'monthly') {
    start.setDate(1)
  }

  const end = new Date(start)
  if (period === 'daily') end.setDate(end.getDate() + 1)
  if (period === 'weekly') end.setDate(end.getDate() + 7)
  if (period === 'monthly') end.setMonth(end.getMonth() + 1)

  return { start, end }
}

const calculateScore = ({ completed_lessons, focus_minutes, completed_tasks, completed_exams, streak_days }) =>
  (completed_lessons * 10) +
  (Math.floor(focus_minutes / 10) * 5) +
  (completed_tasks * 5) +
  (completed_exams * 20) +
  (streak_days * 3)

const upsertScore = async ({ userId, period, subject, start, end }) => {
  const subjectFilter = subject === 'all' ? '' : 'AND subject = ?'
  const params = subject === 'all' ? [userId, start, end] : [userId, start, end, subject]

  const [rows] = await pool.query(
    `SELECT
       SUM(type = 'lesson_completed') AS completed_lessons,
       COALESCE(SUM(CASE WHEN type = 'focus_session' THEN value ELSE 0 END), 0) AS focus_minutes,
       SUM(type = 'task_completed') AS completed_tasks,
       SUM(type = 'exam_completed') AS completed_exams,
       COUNT(DISTINCT DATE(COALESCE(started_at, created_at))) AS streak_days
     FROM study_activity
     WHERE user_id = ? AND validated = 1 AND COALESCE(started_at, created_at) >= ? AND COALESCE(started_at, created_at) < ?
     ${subjectFilter}`,
    params,
  )
  const metrics = {
    completed_lessons: Number(rows[0]?.completed_lessons ?? 0),
    focus_minutes: Number(rows[0]?.focus_minutes ?? 0),
    completed_tasks: Number(rows[0]?.completed_tasks ?? 0),
    completed_exams: Number(rows[0]?.completed_exams ?? 0),
    streak_days: Number(rows[0]?.streak_days ?? 0),
  }
  const score = calculateScore(metrics)

  await pool.query(
    `INSERT INTO leaderboard_scores
       (id, user_id, period, period_start, period_end, subject, score, completed_lessons, focus_minutes, completed_tasks, completed_exams, streak_days)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       period_end = VALUES(period_end),
       score = VALUES(score),
       completed_lessons = VALUES(completed_lessons),
       focus_minutes = VALUES(focus_minutes),
       completed_tasks = VALUES(completed_tasks),
       completed_exams = VALUES(completed_exams),
       streak_days = VALUES(streak_days),
       updated_at = CURRENT_TIMESTAMP`,
    [
      crypto.randomUUID(),
      userId,
      period,
      start,
      end,
      subject,
      score,
      metrics.completed_lessons,
      metrics.focus_minutes,
      metrics.completed_tasks,
      metrics.completed_exams,
      metrics.streak_days,
    ],
  )
}

export const recalculateLeaderboardForUser = async (userId, date = new Date()) => {
  for (const period of periods) {
    const { start, end } = periodBounds(period, date)
    const [subjectRows] = await pool.query(
      `SELECT name AS subject FROM subjects WHERE user_id = ?
       UNION
       SELECT DISTINCT subject FROM study_activity
       WHERE user_id = ? AND COALESCE(started_at, created_at) >= ? AND COALESCE(started_at, created_at) < ?`,
      [userId, userId, start, end],
    )
    const subjects = [...new Set([
      ...defaultLeaderboardSubjects,
      ...subjectRows.map((row) => row.subject).filter(Boolean),
    ])]

    for (const subject of subjects) {
      await upsertScore({ userId, period, subject, start, end })
    }
  }
}

export const recordStudyActivity = async ({
  userId,
  type,
  subject = 'General/AI',
  value = 1,
  sourceId = null,
  startedAt = new Date(),
  endedAt = null,
}) => {
  const started = new Date(startedAt)
  const ended = endedAt ? new Date(endedAt) : null
  let validated = true
  let suspiciousReason = null

  if (type === 'focus_session') {
    if (!Number.isInteger(value) || value < 1) {
      validated = false
      suspiciousReason = 'Focus session shorter than 1 minute'
    }
    if (value > 240) {
      validated = false
      suspiciousReason = 'Focus session longer than 4 hours'
    }

    const dayStart = new Date(started)
    dayStart.setHours(0, 0, 0, 0)
    const dayEnd = new Date(dayStart)
    dayEnd.setDate(dayEnd.getDate() + 1)
    const [dailyRows] = await pool.query(
      `SELECT COALESCE(SUM(value), 0) AS minutes
       FROM study_activity
       WHERE user_id = ? AND type = 'focus_session' AND validated = 1 AND started_at >= ? AND started_at < ?`,
      [userId, dayStart, dayEnd],
    )
    if (Number(dailyRows[0]?.minutes ?? 0) + value > 720) {
      validated = false
      suspiciousReason = 'Daily focus time exceeds 12 hours'
    }

    if (ended) {
      const [overlaps] = await pool.query(
        `SELECT id FROM study_activity
         WHERE user_id = ? AND type = 'focus_session' AND validated = 1
           AND started_at < ? AND ended_at > ?
         LIMIT 1`,
        [userId, ended, started],
      )
      if (overlaps.length > 0) {
        validated = false
        suspiciousReason = 'Overlapping focus session'
      }
    }
  }

  try {
    await pool.query(
      `INSERT INTO study_activity
        (id, user_id, type, subject, value, source_id, started_at, ended_at, validated, suspicious_reason)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        crypto.randomUUID(),
        userId,
        type,
        subject,
        value,
        sourceId,
        started,
        ended,
        validated ? 1 : 0,
        suspiciousReason,
      ],
    )
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return { recorded: false, validated: true, duplicate: true }
    }
    throw error
  }

  await recalculateLeaderboardForUser(userId, started)
  return { recorded: true, validated, suspiciousReason }
}

export const getPublicLeaderboard = async ({ period = 'weekly', subject = 'all', search = '', limit = 50 }) => {
  if (!periods.includes(period)) throw new AppError(400, 'INVALID_PERIOD', 'Invalid leaderboard period')
  const { start } = periodBounds(period)
  const keyword = `%${search}%`

  const [rows] = await pool.query(
    `SELECT
       ROW_NUMBER() OVER (ORDER BY ls.score DESC, ls.focus_minutes DESC, u.username ASC) AS rank_number,
       COALESCE(u.username, 'Anonymous Student') AS username,
       u.profile_picture_url AS avatar_url,
       ls.score,
       ls.completed_lessons,
       ls.focus_minutes,
       CASE
         WHEN ROW_NUMBER() OVER (ORDER BY ls.score DESC, ls.focus_minutes DESC, u.username ASC) = 1 THEN 'Top 1'
         WHEN ls.focus_minutes >= 120 THEN 'Focused'
         WHEN ls.streak_days >= 3 THEN 'Consistent'
         ELSE 'Rising'
       END AS badge
     FROM leaderboard_scores ls
     JOIN users u ON u.id COLLATE utf8mb4_unicode_ci = ls.user_id COLLATE utf8mb4_unicode_ci
     WHERE ls.period = ? AND ls.period_start = ? AND ls.subject = ?
       AND u.leaderboard_visible = 1 AND u.is_blocked = 0
       AND (? = '' OR u.username LIKE ?)
     ORDER BY ls.score DESC, ls.focus_minutes DESC, u.username ASC
     LIMIT ?`,
    [period, start, subject, search, keyword, Number(limit)],
  )

  return rows
}

export const getMyLeaderboardSummary = async (userId) => {
  const result = {}
  for (const period of periods) {
    const { start } = periodBounds(period)
    const [rows] = await pool.query(
      `SELECT ranked.*
       FROM (
         SELECT ls.*, ROW_NUMBER() OVER (ORDER BY ls.score DESC, ls.focus_minutes DESC) AS rank_number
         FROM leaderboard_scores ls
         JOIN users u ON u.id COLLATE utf8mb4_unicode_ci = ls.user_id COLLATE utf8mb4_unicode_ci
         WHERE ls.period = ? AND ls.period_start = ? AND ls.subject = 'all'
           AND u.leaderboard_visible = 1 AND u.is_blocked = 0
       ) ranked
       WHERE ranked.user_id = ?`,
      [period, start, userId],
    )
    result[period] = rows[0] ?? null
  }
  return result
}

export const getAdminLeaderboard = async ({ period = 'weekly', subject = 'all', search = '' }) => {
  const { start } = periodBounds(period)
  const keyword = `%${search}%`
  const [rows] = await pool.query(
    `SELECT
       ROW_NUMBER() OVER (ORDER BY ls.score DESC, ls.focus_minutes DESC, u.email ASC) AS rank_number,
       u.id AS user_id,
       u.name,
       u.email,
       u.username,
       u.leaderboard_visible,
       u.last_active_at,
       ls.score,
       ls.completed_lessons,
       ls.focus_minutes,
       ls.completed_tasks,
       ls.completed_exams,
       COALESCE(sa.suspicious_count, 0) AS suspicious_activity_warnings
     FROM leaderboard_scores ls
     JOIN users u ON u.id COLLATE utf8mb4_unicode_ci = ls.user_id COLLATE utf8mb4_unicode_ci
     LEFT JOIN (
       SELECT user_id, COUNT(*) AS suspicious_count
       FROM study_activity
       WHERE validated = 0
       GROUP BY user_id
     ) sa ON sa.user_id COLLATE utf8mb4_unicode_ci = u.id COLLATE utf8mb4_unicode_ci
     WHERE ls.period = ? AND ls.period_start = ? AND ls.subject = ?
       AND (? = '' OR u.username LIKE ? OR u.email LIKE ? OR u.name LIKE ?)
     ORDER BY ls.score DESC, ls.focus_minutes DESC
     LIMIT 200`,
    [period, start, subject, search, keyword, keyword, keyword],
  )
  return rows.map((row) => ({
    ...row,
    leaderboard_visible: !!row.leaderboard_visible,
  }))
}

export const setUserLeaderboardVisibility = async (adminId, userId, visible) => {
  await pool.query('UPDATE users SET leaderboard_visible = ? WHERE id = ?', [visible ? 1 : 0, userId])
  await pool.query(
    'INSERT INTO admin_audit_logs (id, admin_id, action, target_user_id, details) VALUES (?, ?, ?, ?, ?)',
    [crypto.randomUUID(), adminId, 'leaderboard_visibility_changed', userId, JSON.stringify({ visible })],
  )
}

export const resetUserLeaderboard = async (adminId, userId) => {
  await pool.query('DELETE FROM leaderboard_scores WHERE user_id = ?', [userId])
  await pool.query(
    'INSERT INTO admin_audit_logs (id, admin_id, action, target_user_id, details) VALUES (?, ?, ?, ?, ?)',
    [crypto.randomUUID(), adminId, 'leaderboard_score_reset', userId, '{}'],
  )
}
