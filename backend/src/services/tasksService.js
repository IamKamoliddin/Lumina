import crypto from 'crypto'
import { pool } from '../db/pool.js'
import { recordStudyActivity } from './leaderboardService.js'
import { cancelFutureNotifications, scheduleTaskNotifications } from './notificationsService.js'

const allowedTaskGroups = new Set(['Today', 'Upcoming', 'Exams'])

const createTaskError = (message, code = 'INVALID_TASK', statusCode = 400) => {
  const error = new Error(message)
  error.code = code
  error.statusCode = statusCode
  return error
}

const normalizeTaskDate = (value) => {
  if (value === null || value === '') return null
  if (value === undefined) return undefined

  const date = new Date(value)
  if (!Number.isFinite(date.getTime())) {
    throw createTaskError('Due date must be valid.', 'INVALID_DUE_DATE')
  }

  const pad = (part) => String(part).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

const normalizeTaskPayload = (data) => {
  const payload = {}

  if (data.title !== undefined) {
    const title = String(data.title).trim()
    if (!title) throw createTaskError('Task title is required.', 'TASK_TITLE_REQUIRED')
    payload.title = title
  }

  if (data.subject !== undefined) {
    const subject = String(data.subject).trim()
    if (!subject) throw createTaskError('Subject is required.', 'TASK_SUBJECT_REQUIRED')
    payload.subject = subject
  }

  if (data.group_name !== undefined) {
    const groupName = String(data.group_name).trim()
    if (!allowedTaskGroups.has(groupName)) throw createTaskError('Task group is invalid.', 'INVALID_TASK_GROUP')
    payload.group_name = groupName
  }

  if (data.due_date !== undefined) {
    payload.due_date = normalizeTaskDate(data.due_date)
  }

  if (data.is_done !== undefined) {
    payload.is_done = Boolean(data.is_done)
  }

  return payload
}

export const listTasks = async (userId) => {
  const [rows] = await pool.query(
    'SELECT * FROM tasks WHERE user_id = ? ORDER BY created_at DESC',
    [userId]
  )
  return rows
}

export const createTask = async (userId, data) => {
  const id = crypto.randomUUID()
  const payload = normalizeTaskPayload({
    title: data.title,
    subject: data.subject ?? 'General/AI',
    due_date: data.due_date ?? null,
    group_name: data.group_name || 'Today',
  })

  await pool.query(
    'INSERT INTO tasks (id, user_id, title, subject, due_date, group_name) VALUES (?, ?, ?, ?, ?, ?)',
    [id, userId, payload.title, payload.subject, payload.due_date, payload.group_name]
  )
  const [rows] = await pool.query('SELECT * FROM tasks WHERE id = ?', [id])
  if (rows[0]) await scheduleTaskNotifications(userId, rows[0])
  return rows[0]
}

export const updateTask = async (userId, id, data) => {
  const payload = normalizeTaskPayload(data)
  const fields = []
  const values = []
  
  if (payload.is_done !== undefined) {
    fields.push('is_done = ?')
    values.push(payload.is_done)
  }
  if (payload.title !== undefined) {
    fields.push('title = ?')
    values.push(payload.title)
  }
  if (payload.group_name !== undefined) {
    fields.push('group_name = ?')
    values.push(payload.group_name)
  }
  if (payload.due_date !== undefined) {
    fields.push('due_date = ?')
    values.push(payload.due_date)
  }
  if (payload.subject !== undefined) {
    fields.push('subject = ?')
    values.push(payload.subject)
  }

  if (fields.length === 0) return null

  values.push(id, userId)
  const [result] = await pool.query(
    `UPDATE tasks SET ${fields.join(', ')} WHERE id = ? AND user_id = ?`,
    values
  )

  if (result.affectedRows === 0) {
    throw createTaskError('Task not found', 'TASK_NOT_FOUND', 404)
  }

  if (payload.is_done === true) {
    const [taskRows] = await pool.query('SELECT subject FROM tasks WHERE id = ? AND user_id = ?', [id, userId])
    await recordStudyActivity({
      userId,
      type: 'task_completed',
      subject: taskRows[0]?.subject || 'General/AI',
      value: 1,
      sourceId: id,
    })
  }
  
  const [rows] = await pool.query('SELECT * FROM tasks WHERE id = ? AND user_id = ?', [id, userId])
  if (rows[0]) await scheduleTaskNotifications(userId, rows[0])
  return rows[0]
}

export const deleteTask = async (userId, id) => {
  const [result] = await pool.query(
    'DELETE FROM tasks WHERE id = ? AND user_id = ?',
    [id, userId],
  )

  await cancelFutureNotifications({ userId, relatedItemId: id, relatedItemType: 'task' })
  return { deleted: result.affectedRows > 0 }
}
