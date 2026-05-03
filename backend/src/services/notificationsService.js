import crypto from 'crypto'
import { pool } from '../db/pool.js'

const minute = 60 * 1000
const hour = 60 * minute
const day = 24 * hour

const actionUrlByRelatedType = {
  event: '/calendar',
  task: '/tasks',
  focus_log: '/timer',
  system: '/dashboard',
}

const defaultPreferences = {
  reminders_enabled: true,
  exam_reminders_enabled: true,
  task_reminders_enabled: true,
  class_reminders_enabled: true,
  study_reminders_enabled: true,
}

const toDate = (value) => {
  const date = value ? new Date(value) : null
  return date && Number.isFinite(date.getTime()) ? date : null
}

const isFuture = (date) => date && date > new Date()

export const getNotificationPreferences = async (userId) => {
  const [rows] = await pool.query(
    `SELECT reminders_enabled, exam_reminders_enabled, task_reminders_enabled,
            class_reminders_enabled, study_reminders_enabled
     FROM user_notification_preferences
     WHERE user_id = ?`,
    [userId],
  )

  if (!rows[0]) {
    await pool.query(
      `INSERT INTO user_notification_preferences
         (user_id, reminders_enabled, exam_reminders_enabled, task_reminders_enabled, class_reminders_enabled, study_reminders_enabled)
       VALUES (?, 1, 1, 1, 1, 1)`,
      [userId],
    )
    return defaultPreferences
  }

  return Object.fromEntries(
    Object.keys(defaultPreferences).map((key) => [key, rows[0][key] !== 0]),
  )
}

export const updateNotificationPreferences = async (userId, preferences) => {
  const current = await getNotificationPreferences(userId)
  const next = { ...current, ...preferences }

  await pool.query(
    `INSERT INTO user_notification_preferences
       (user_id, reminders_enabled, exam_reminders_enabled, task_reminders_enabled, class_reminders_enabled, study_reminders_enabled)
     VALUES (?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       reminders_enabled = VALUES(reminders_enabled),
       exam_reminders_enabled = VALUES(exam_reminders_enabled),
       task_reminders_enabled = VALUES(task_reminders_enabled),
       class_reminders_enabled = VALUES(class_reminders_enabled),
       study_reminders_enabled = VALUES(study_reminders_enabled),
       updated_at = CURRENT_TIMESTAMP`,
    [
      userId,
      next.reminders_enabled ? 1 : 0,
      next.exam_reminders_enabled ? 1 : 0,
      next.task_reminders_enabled ? 1 : 0,
      next.class_reminders_enabled ? 1 : 0,
      next.study_reminders_enabled ? 1 : 0,
    ],
  )

  return next
}

export const releaseDueNotifications = async (userId) => {
  await pool.query(
    `UPDATE notifications
     SET sent_at = CURRENT_TIMESTAMP
     WHERE user_id = ? AND sent_at IS NULL AND scheduled_for <= CURRENT_TIMESTAMP`,
    [userId],
  )
}

export const listNotifications = async (userId) => {
  await releaseDueNotifications(userId)

  const [rows] = await pool.query(
    `SELECT id, user_id, type, title, message, is_read, action_url, scheduled_for, sent_at,
            created_at, related_item_id, related_item_type
     FROM notifications
     WHERE user_id = ? AND sent_at IS NOT NULL
     ORDER BY sent_at DESC, created_at DESC
     LIMIT 50`,
    [userId],
  )

  return rows.map((row) => ({
    ...row,
    read: row.is_read === 1,
    is_read: row.is_read === 1,
  }))
}

export const getUnreadCount = async (userId) => {
  await releaseDueNotifications(userId)

  const [rows] = await pool.query(
    `SELECT COUNT(*) AS count
     FROM notifications
     WHERE user_id = ? AND sent_at IS NOT NULL AND is_read = 0`,
    [userId],
  )

  return Number(rows[0]?.count ?? 0)
}

export const upsertNotification = async ({
  userId,
  type,
  title,
  message,
  scheduledFor = new Date(),
  relatedItemId = null,
  relatedItemType = 'system',
  actionUrl = null,
}) => {
  const scheduledDate = toDate(scheduledFor) ?? new Date()
  const id = crypto.randomUUID()

  await pool.query(
    `INSERT INTO notifications
       (id, user_id, type, title, message, is_read, action_url, scheduled_for, sent_at, related_item_id, related_item_type)
     VALUES (?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       title = VALUES(title),
       message = VALUES(message),
       action_url = VALUES(action_url),
       sent_at = IF(VALUES(scheduled_for) <= CURRENT_TIMESTAMP, COALESCE(sent_at, CURRENT_TIMESTAMP), NULL),
       is_read = IF(VALUES(scheduled_for) <= CURRENT_TIMESTAMP, is_read, 0),
       created_at = CURRENT_TIMESTAMP`,
    [
      id,
      userId,
      type,
      title,
      message,
      actionUrl ?? actionUrlByRelatedType[relatedItemType] ?? '/dashboard',
      scheduledDate,
      scheduledDate <= new Date() ? new Date() : null,
      relatedItemId,
      relatedItemType,
    ],
  )
}

export const cancelFutureNotifications = async ({ userId, relatedItemId, relatedItemType }) => {
  await pool.query(
    `DELETE FROM notifications
     WHERE user_id = ? AND related_item_id = ? AND related_item_type = ? AND sent_at IS NULL`,
    [userId, relatedItemId, relatedItemType],
  )
}

const scheduleOffsets = async ({ userId, relatedItemId, relatedItemType, baseTime, reminders }) => {
  await Promise.all(reminders.map((reminder) => {
    const scheduledFor = new Date(baseTime.getTime() - reminder.offset)
    if (!isFuture(scheduledFor)) return null

    return upsertNotification({
      userId,
      relatedItemId,
      relatedItemType,
      type: reminder.type,
      title: reminder.title,
      message: reminder.message,
      scheduledFor,
      actionUrl: actionUrlByRelatedType[relatedItemType],
    })
  }).filter(Boolean))
}

export const scheduleEventNotifications = async (userId, event) => {
  await cancelFutureNotifications({ userId, relatedItemId: event.id, relatedItemType: 'event' })

  const preferences = await getNotificationPreferences(userId)
  if (!preferences.reminders_enabled) return

  const start = toDate(event.start_time)
  if (!start || !isFuture(start)) return

  const subject = event.subject || 'your subject'
  const title = event.title || 'event'
  const type = event.type || 'study_session'

  if (type === 'class') {
    if (!preferences.class_reminders_enabled) return
    await scheduleOffsets({
      userId,
      relatedItemId: event.id,
      relatedItemType: 'event',
      baseTime: start,
      reminders: [
        { offset: hour, type: 'class_reminder', title: 'Class reminder', message: `Your class "${title}" starts in 1 hour.` },
        { offset: 10 * minute, type: 'class_reminder', title: 'Class starts soon', message: `Your class "${title}" starts in 10 minutes.` },
      ],
    })
    return
  }

  if (type === 'exam') {
    if (!preferences.exam_reminders_enabled) return
    await scheduleOffsets({
      userId,
      relatedItemId: event.id,
      relatedItemType: 'event',
      baseTime: start,
      reminders: [
        { offset: day, type: 'exam_reminder', title: 'Exam tomorrow', message: `Your ${subject} exam "${title}" starts in 1 day.` },
        { offset: hour, type: 'exam_reminder', title: 'Exam reminder', message: `Your ${subject} exam starts in 1 hour.` },
        { offset: 5 * minute, type: 'exam_reminder', title: 'Exam starts soon', message: `Your ${subject} exam starts in 5 minutes.` },
        { offset: 3 * day, type: 'preparation', title: 'Start exam preparation', message: `You should start preparing for your ${subject} exam.` },
      ],
    })
    return
  }

  await scheduleOffsets({
    ...(preferences.study_reminders_enabled ? {} : { reminders: [] }),
    userId,
    relatedItemId: event.id,
    relatedItemType: 'event',
    baseTime: start,
    reminders: preferences.study_reminders_enabled ? [
      { offset: 15 * minute, type: 'study_session', title: 'Study session reminder', message: `Study session "${title}" starts in 15 minutes.` },
    ] : [],
  })
}

export const scheduleTaskNotifications = async (userId, task) => {
  await cancelFutureNotifications({ userId, relatedItemId: task.id, relatedItemType: 'task' })

  const preferences = await getNotificationPreferences(userId)
  if (!preferences.reminders_enabled || !preferences.task_reminders_enabled) return

  const due = toDate(task.due_date)
  if (!due || !isFuture(due)) return

  const morning = new Date(due)
  morning.setHours(9, 0, 0, 0)

  const reminders = [
    {
      scheduledFor: morning > new Date() ? morning : null,
      message: `Task deadline today: ${task.title}.`,
      title: 'Task deadline today',
    },
    {
      scheduledFor: new Date(due.getTime() - hour),
      message: `Task "${task.title}" is due in 1 hour.`,
      title: 'Task due soon',
    },
  ]

  await Promise.all(reminders.map((reminder) => {
    if (!isFuture(reminder.scheduledFor)) return null

    return upsertNotification({
      userId,
      type: 'task_deadline',
      title: reminder.title,
      message: reminder.message,
      scheduledFor: reminder.scheduledFor,
      relatedItemId: task.id,
      relatedItemType: 'task',
      actionUrl: '/tasks',
    })
  }).filter(Boolean))
}

export const createFocusCompleteNotification = async (userId, focusLog) => {
  await upsertNotification({
    userId,
    type: 'focus_complete',
    title: 'Focus session completed',
    message: `Focus session completed: ${focusLog.total_minutes} minutes of ${focusLog.subject}.`,
    scheduledFor: new Date(),
    relatedItemId: focusLog.id,
    relatedItemType: 'focus_log',
    actionUrl: '/timer',
  })
}
