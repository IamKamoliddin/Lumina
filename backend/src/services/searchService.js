import { pool } from '../db/pool.js'

export const searchAll = async (userId, query) => {
  const searchTerm = query.trim()
  if (!searchTerm) {
    return { books: [], events: [], exams: [], classes: [], tasks: [], subjects: [], notes: [] }
  }

  const keyword = `%${searchTerm}%`

  const [books] = await pool.query(
    `SELECT b.id, b.title, b.author, b.status, b.created_at, s.name AS subject
     FROM books b
     LEFT JOIN subjects s ON b.subject_id = s.id
     WHERE b.user_id = ?
       AND (b.title LIKE ? OR b.author LIKE ? OR b.status LIKE ? OR s.name LIKE ? OR b.ai_summary LIKE ?)
     ORDER BY b.created_at DESC
     LIMIT 8`,
    [userId, keyword, keyword, keyword, keyword, keyword],
  )

  const [events] = await pool.query(
    `SELECT e.id, e.title, e.type, e.start_time, e.end_time, s.name AS subject
     FROM events e
     LEFT JOIN subjects s ON e.subject_id = s.id
     WHERE e.user_id = ?
       AND (
         e.title LIKE ?
         OR e.type LIKE ?
         OR s.name LIKE ?
         OR DATE_FORMAT(e.start_time, '%Y-%m-%d') LIKE ?
         OR DATE_FORMAT(e.end_time, '%Y-%m-%d') LIKE ?
       )
     ORDER BY e.start_time ASC
     LIMIT 12`,
    [userId, keyword, keyword, keyword, keyword, keyword],
  )

  const [tasks] = await pool.query(
    `SELECT id, title, subject, due_date, group_name, is_done, created_at
     FROM tasks
     WHERE user_id = ?
       AND (
         title LIKE ?
         OR subject LIKE ?
         OR group_name LIKE ?
         OR DATE_FORMAT(due_date, '%Y-%m-%d') LIKE ?
       )
     ORDER BY is_done ASC, COALESCE(due_date, created_at) ASC
     LIMIT 8`,
    [userId, keyword, keyword, keyword, keyword],
  )

  const [subjects] = await pool.query(
    `SELECT id, name, color_hex, created_at
     FROM subjects
     WHERE user_id = ? AND name LIKE ?
     ORDER BY name ASC
     LIMIT 8`,
    [userId, keyword],
  )

  let notes = []
  try {
    const [noteRows] = await pool.query(
      `SELECT id, title, content, subject, created_at
       FROM notes
       WHERE user_id = ? AND (title LIKE ? OR content LIKE ? OR subject LIKE ?)
       ORDER BY created_at DESC
       LIMIT 6`,
      [userId, keyword, keyword, keyword],
    )
    notes = noteRows
  } catch (error) {
    if (!['ER_NO_SUCH_TABLE', 'ER_BAD_FIELD_ERROR'].includes(error.code)) throw error
  }

  const exams = events.filter((event) => event.type === 'exam')
  const classes = events.filter((event) => ['class', 'study_session'].includes(event.type))
  const otherEvents = events.filter((event) => !['exam', 'class', 'study_session'].includes(event.type))

  return {
    books,
    events: otherEvents,
    exams,
    classes,
    tasks,
    subjects,
    notes,
  }
}
