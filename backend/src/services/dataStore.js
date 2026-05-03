import bcrypt from 'bcryptjs'

const users = new Map()
const usersByEmail = new Map()
const refreshSessions = new Map()
const booksByUser = new Map()
const eventsByUser = new Map()
const subjectsByUser = new Map()
const focusLogsByUser = new Map()
const authStateByUser = new Map()

const demoUserId = 'demo-user-id'
const demoEmail = 'demo@lumina.app'

const clone = (value) => JSON.parse(JSON.stringify(value))

const defaultSubjects = [
  { id: 'subj-math', user_id: demoUserId, name: 'Mathematics', color_hex: '#38BDF8' },
  { id: 'subj-programming', user_id: demoUserId, name: 'Programming', color_hex: '#34D399' },
  { id: 'subj-history', user_id: demoUserId, name: 'History', color_hex: '#FBBF24' },
  { id: 'subj-physics', user_id: demoUserId, name: 'Physics', color_hex: '#F472B6' },
]

const defaultBooks = [
  {
    id: 'book-clean-code',
    user_id: demoUserId,
    title: 'Clean Code',
    author: 'Robert C. Martin',
    subject: 'Programming',
    total_pages: 464,
    current_page: 148,
    status: 'Reading',
  },
]

const defaultEvents = [
  {
    id: 'event-physics-exam',
    user_id: demoUserId,
    title: 'Physics Exam',
    subject: 'Physics',
    type: 'exam',
    start_time: '2026-04-29T14:00:00.000Z',
    end_time: '2026-04-29T16:00:00.000Z',
    is_confirmed: true,
  },
]

const defaultFocusLogs = [
  {
    id: 'focus-1',
    user_id: demoUserId,
    subject: 'Programming',
    total_minutes: 90,
    started_at: '2026-04-26T13:00:00.000Z',
  },
]

const seedDemoUser = async () => {
  const passwordHash = await bcrypt.hash('LuminaDemo123', 12)
  const demoUser = {
    id: demoUserId,
    name: 'Demo User',
    email: demoEmail,
    profile_picture_url: '',
    passwordHash,
    createdAt: new Date().toISOString(),
  }

  users.set(demoUser.id, demoUser)
  usersByEmail.set(demoUser.email, demoUser.id)
  booksByUser.set(demoUser.id, clone(defaultBooks))
  eventsByUser.set(demoUser.id, clone(defaultEvents))
  subjectsByUser.set(demoUser.id, clone(defaultSubjects))
  focusLogsByUser.set(demoUser.id, clone(defaultFocusLogs))
  authStateByUser.set(demoUser.id, { invalidBefore: 0 })
}

await seedDemoUser()

const ensureCollection = (store, userId, fallback = []) => {
  if (!store.has(userId)) {
    store.set(userId, clone(fallback))
  }

  return store.get(userId)
}

export const memoryStore = {
  users,
  usersByEmail,
  refreshSessions,
  booksByUser,
  eventsByUser,
  subjectsByUser,
  focusLogsByUser,
  authStateByUser,
  ensureBooks: (userId) => ensureCollection(booksByUser, userId),
  ensureEvents: (userId) => ensureCollection(eventsByUser, userId),
  ensureSubjects: (userId) => ensureCollection(subjectsByUser, userId),
  ensureFocusLogs: (userId) => ensureCollection(focusLogsByUser, userId),
  ensureAuthState: (userId) => ensureCollection(authStateByUser, userId, { invalidBefore: 0 }),
}
