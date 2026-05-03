import crypto from 'crypto'
import { pool } from '../db/pool.js'
import { AppError } from '../utils/appError.js'

const subjectPalette = ['#38BDF8', '#34D399', '#FBBF24', '#F472B6', '#A78BFA', '#22D3EE', '#FB7185', '#4ADE80']

const defaultSubjects = [
  { name: 'Mathematics', color_hex: '#38BDF8' },
  { name: 'Programming', color_hex: '#34D399' },
  { name: 'History', color_hex: '#FBBF24' },
  { name: 'Physics', color_hex: '#F472B6' },
  { name: 'General/AI', color_hex: '#6366F1' },
]

const normalizeSubjectName = (name) => name.trim().replace(/\s+/g, ' ')

const mapSubject = (row) => ({
  id: row.id,
  user_id: row.user_id,
  name: row.name,
  color_hex: row.color_hex,
  created_at: row.created_at,
  updated_at: row.updated_at ?? row.created_at,
})

const ensureDefaultSubjects = async (userId) => {
  const [rows] = await pool.query('SELECT COUNT(*) AS count FROM `subjects` WHERE `user_id` = ?', [userId])
  if (Number(rows[0]?.count ?? 0) > 0) return

  await Promise.all(defaultSubjects.map((subject) =>
    pool.query(
      'INSERT INTO `subjects` (`id`, `user_id`, `name`, `color_hex`) VALUES (?, ?, ?, ?)',
      [crypto.randomUUID(), userId, subject.name, subject.color_hex],
    ),
  ))
}

const assertUniqueSubjectName = async (userId, name, excludeId = null) => {
  const params = [userId, name.toLowerCase()]
  const excludeClause = excludeId ? 'AND `id` <> ?' : ''
  if (excludeId) params.push(excludeId)

  const [rows] = await pool.query(
    `SELECT id FROM subjects WHERE user_id = ? AND LOWER(name) = ? ${excludeClause} LIMIT 1`,
    params,
  )

  if (rows.length > 0) {
    throw new AppError(409, 'SUBJECT_ALREADY_EXISTS', 'This subject already exists.')
  }
}

export const listSubjects = async (userId) => {
  await ensureDefaultSubjects(userId)

  const [rows] = await pool.query(
    `SELECT id, user_id, name, color_hex, created_at, updated_at
     FROM subjects
     WHERE user_id = ?
     ORDER BY created_at ASC, name ASC`,
    [userId],
  )

  return rows.map(mapSubject)
}

export const createSubject = async (userId, payload) => {
  const name = normalizeSubjectName(payload.name)
  await assertUniqueSubjectName(userId, name)

  const [rows] = await pool.query('SELECT COUNT(*) AS count FROM `subjects` WHERE `user_id` = ?', [userId])
  const color = payload.color_hex ?? subjectPalette[Number(rows[0]?.count ?? 0) % subjectPalette.length]
  const id = crypto.randomUUID()

  await pool.query(
    'INSERT INTO `subjects` (`id`, `user_id`, `name`, `color_hex`) VALUES (?, ?, ?, ?)',
    [id, userId, name, color],
  )

  const [createdRows] = await pool.query(
    `SELECT id, user_id, name, color_hex, created_at, updated_at
     FROM subjects
     WHERE id = ? AND user_id = ?`,
    [id, userId],
  )

  return mapSubject(createdRows[0])
}

export const updateSubject = async (userId, subjectId, payload) => {
  const name = normalizeSubjectName(payload.name)
  await assertUniqueSubjectName(userId, name, subjectId)

  const [result] = await pool.query(
    `UPDATE subjects
     SET name = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = ? AND user_id = ?`,
    [name, subjectId, userId],
  )

  if (result.affectedRows === 0) {
    throw new AppError(404, 'SUBJECT_NOT_FOUND', 'Subject not found.')
  }

  const [rows] = await pool.query(
    `SELECT id, user_id, name, color_hex, created_at, updated_at
     FROM subjects
     WHERE id = ? AND user_id = ?`,
    [subjectId, userId],
  )

  return mapSubject(rows[0])
}

export const deleteSubject = async (userId, subjectId) => {
  const [result] = await pool.query(
    'DELETE FROM subjects WHERE id = ? AND user_id = ?',
    [subjectId, userId],
  )

  if (result.affectedRows === 0) {
    throw new AppError(404, 'SUBJECT_NOT_FOUND', 'Subject not found.')
  }
}
