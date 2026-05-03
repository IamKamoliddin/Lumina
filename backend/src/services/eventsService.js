import crypto from 'crypto'
import { pool } from '../db/pool.js'
import { cancelFutureNotifications, scheduleEventNotifications } from './notificationsService.js'

export const listEvents = async (userId) => {
  const [rows] = await pool.query(
    `SELECT e.id, e.title, e.type, e.start_time, e.end_time, e.is_confirmed,
            COALESCE(e.subject_name, s.name, 'General/AI') as subject
     FROM events e 
     LEFT JOIN subjects s ON e.subject_id = s.id 
     WHERE e.user_id = ? 
     ORDER BY e.start_time ASC`,
    [userId]
  )
  return rows.map(row => ({
    ...row,
    is_confirmed: !!row.is_confirmed,
  }))
}

export const createEvent = async (userId, payload) => {
  // Try to find the subject_id if payload.subject is provided
  let subjectId = null
  const subjectName = payload.subject?.trim() || 'General/AI'
  if (payload.subject) {
    const [subjRows] = await pool.query(
      'SELECT id FROM subjects WHERE user_id = ? AND name = ?',
      [userId, subjectName]
    )
    if (subjRows.length > 0) {
      subjectId = subjRows[0].id
    }
  }

  const id = crypto.randomUUID()
  
  await pool.query(
    `INSERT INTO events (id, user_id, subject_id, subject_name, title, type, start_time, end_time, is_confirmed)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      userId,
      subjectId,
      subjectName,
      payload.title,
      payload.type,
      new Date(payload.start_time),
      new Date(payload.end_time),
      payload.is_confirmed !== undefined ? payload.is_confirmed : true,
    ]
  )

  const event = {
      id,
      user_id: userId,
      ...payload,
      subject: subjectName,
      is_confirmed: payload.is_confirmed !== undefined ? payload.is_confirmed : true,
    }

  await scheduleEventNotifications(userId, event)

  return { event }
}

export const updateEvent = async (userId, eventId, payload) => {
  let subjectId = null
  let subjectName = null
  if (payload.subject) {
    subjectName = payload.subject.trim()
    const [subjRows] = await pool.query(
      'SELECT id FROM subjects WHERE user_id = ? AND name = ?',
      [userId, subjectName]
    )
    if (subjRows.length > 0) {
      subjectId = subjRows[0].id
    }
  }

  const updates = []
  const values = []

  if (payload.title !== undefined) { updates.push('title = ?'); values.push(payload.title) }
  if (payload.subject !== undefined) {
    updates.push('subject_id = ?')
    values.push(subjectId)
    updates.push('subject_name = ?')
    values.push(subjectName || 'General/AI')
  }
  if (payload.type !== undefined) { updates.push('type = ?'); values.push(payload.type) }
  if (payload.start_time !== undefined) { updates.push('start_time = ?'); values.push(new Date(payload.start_time)) }
  if (payload.end_time !== undefined) { updates.push('end_time = ?'); values.push(new Date(payload.end_time)) }
  if (payload.is_confirmed !== undefined) { updates.push('is_confirmed = ?'); values.push(payload.is_confirmed) }

  if (updates.length > 0) {
    values.push(eventId, userId)
    await pool.query(
      `UPDATE events SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`,
      values
    )
  }

  const [rows] = await pool.query(
    `SELECT e.id, e.title, e.type, e.start_time, e.end_time, e.is_confirmed,
            COALESCE(e.subject_name, s.name, 'General/AI') as subject
     FROM events e 
     LEFT JOIN subjects s ON e.subject_id = s.id 
     WHERE e.id = ? AND e.user_id = ?`,
    [eventId, userId]
  )

  if (rows[0]) {
    await scheduleEventNotifications(userId, rows[0])
  }

  return { event: rows[0] }
}

export const deleteEvent = async (userId, eventId) => {
  await pool.query(
    'DELETE FROM events WHERE id = ? AND user_id = ?',
    [eventId, userId]
  )
  await cancelFutureNotifications({ userId, relatedItemId: eventId, relatedItemType: 'event' })
  return { success: true }
}
