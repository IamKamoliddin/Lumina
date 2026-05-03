import crypto from 'crypto'
import { pool } from '../db/pool.js'
import { evaluateTriggers } from './notifyService.js'
import { recordStudyActivity } from './leaderboardService.js'
import { AppError } from '../utils/appError.js'

const toBookResponse = (book) => ({
  ...book,
  is_open_access: !!book.is_open_access,
})

const findSubjectId = async (userId, subjectName) => {
  const [rows] = await pool.query(
    'SELECT `id` FROM `subjects` WHERE `user_id` = ? AND `name` = ?',
    [userId, subjectName]
  )

  return rows[0]?.id ?? null
}

export const listBooks = async (userId) => {
  const [rows] = await pool.query(
    `SELECT b.*, s.\`name\` AS \`subject\`
     FROM \`books\` b
     LEFT JOIN \`subjects\` s ON b.\`subject_id\` = s.\`id\`
     WHERE b.\`user_id\` = ?
     ORDER BY b.\`created_at\` DESC`,
    [userId]
  )

  return rows.map(toBookResponse)
}

export const createBook = async (userId, payload) => {
  const id = crypto.randomUUID()
  const subject = payload.subject ?? 'General/AI'
  const subjectId = await findSubjectId(userId, subject)

  await pool.query(
    `INSERT INTO \`books\`
       (\`id\`, \`user_id\`, \`subject_id\`, \`title\`, \`author\`, \`status\`, \`current_page\`, \`total_pages\`, \`source_url\`, \`is_open_access\`)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      userId,
      subjectId,
      payload.title,
      payload.author,
      payload.status,
      payload.current_page ?? 0,
      payload.total_pages,
      payload.source_url ?? null,
      payload.is_open_access ? 1 : 0,
    ]
  )

  const [rows] = await pool.query(
    `SELECT b.*, s.\`name\` AS \`subject\`
     FROM \`books\` b
     LEFT JOIN \`subjects\` s ON b.\`subject_id\` = s.\`id\`
     WHERE b.\`id\` = ? AND b.\`user_id\` = ?`,
    [id, userId]
  )

  return toBookResponse(rows[0])
}

export const updateBook = async (userId, id, payload) => {
  const fields = []
  const values = []

  if (payload.current_page !== undefined) {
    fields.push('`current_page` = ?')
    values.push(payload.current_page)
  }

  if (payload.status !== undefined) {
    fields.push('`status` = ?')
    values.push(payload.status)
  }

  if (fields.length === 0) {
    throw new AppError(400, 'NO_BOOK_FIELDS', 'No supported book fields were provided')
  }

  values.push(id, userId)
  const [result] = await pool.query(
    `UPDATE \`books\` SET ${fields.join(', ')} WHERE \`id\` = ? AND \`user_id\` = ?`,
    values
  )

  if (result.affectedRows === 0) {
    throw new AppError(404, 'BOOK_NOT_FOUND', 'Book not found')
  }

  const [rows] = await pool.query(
    `SELECT b.*, s.\`name\` AS \`subject\`
     FROM \`books\` b
     LEFT JOIN \`subjects\` s ON b.\`subject_id\` = s.\`id\`
     WHERE b.\`id\` = ? AND b.\`user_id\` = ?`,
    [id, userId]
  )
  const book = toBookResponse(rows[0])

  if (payload.status === 'Completed') {
    await recordStudyActivity({
      userId,
      type: 'lesson_completed',
      subject: book.subject || 'General/AI',
      value: 1,
      sourceId: id,
    })
  }

  const proactiveMessage = evaluateTriggers({
    book,
    events: [],
    focusLogs: [],
  })

  return { book, proactiveMessage }
}
