import { create } from 'zustand'
import {
  createAdminEventRequest,
  deleteAdminBookRequest,
  deleteAdminEventRequest,
  deleteAdminUserRequest,
  fetchAdminAnalyticsRequest,
  fetchAdminBooksRequest,
  fetchAdminEventsRequest,
  fetchAdminLeaderboardRequest,
  fetchAdminOverviewRequest,
  fetchAdminUsersRequest,
  reprocessAdminBookRequest,
  resetAdminLeaderboardRequest,
  setAdminLeaderboardVisibilityRequest,
  updateAdminEventRequest,
  updateAdminUserRequest,
} from '../api/admin'
import { fetchLeaderboardRequest, fetchMyLeaderboardRequest } from '../api/leaderboard'
import {
  loginRequest,
  logoutRequest,
  meRequest,
  registerRequest,
} from '../api/auth'
import {
  changeEmailRequest,
  changePasswordRequest,
  getProfileRequest,
  updateProfileRequest,
  uploadProfileImageRequest,
} from '../api/user'
import {
  fetchEventsRequest,
  createEventRequest,
  updateEventRequest,
  deleteEventRequest,
} from '../api/events'
import {
  fetchBooksRequest,
  fetchOpenBooksRequest,
  createBookRequest,
  updateBookRequest,
} from '../api/books'
import {
  fetchTasksRequest,
  createTaskRequest,
  deleteTaskRequest,
  updateTaskRequest,
} from '../api/tasks'
import { createFocusLogRequest } from '../api/focusLogs'
import {
  createSubjectRequest,
  deleteSubjectRequest,
  fetchSubjectsRequest,
  updateSubjectRequest,
} from '../api/subjects'
import { streamAiChatRequest } from '../api/ai'

const SUBJECTS = {
  Mathematics: '#38BDF8',
  Programming: '#34D399',
  History: '#FBBF24',
  Physics: '#F472B6',
  'General/AI': '#6366F1',
}

const subjectRecordsFromMap = (subjects) =>
  Object.entries(subjects).map(([name, color_hex], index) => ({
    id: `local-${name}`,
    name,
    color_hex,
    created_at: new Date(Date.UTC(2026, 0, index + 1)).toISOString(),
    updated_at: new Date(Date.UTC(2026, 0, index + 1)).toISOString(),
  }))

const subjectsMapFromRecords = (records) =>
  records.reduce((map, subject) => {
    map[subject.name] = subject.color_hex
    return map
  }, {})

const normalizeSubjectRecords = (records) => (
  Array.isArray(records) && records.length > 0 ? records : subjectRecordsFromMap(SUBJECTS)
)

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const TIME_SLOTS = Array.from({ length: 20 }, (_, index) => (5 + index) % 24)

const focusDurations = {
  focus: 25 * 60,
  short: 5 * 60,
  long: 15 * 60,
}

const makeId = (prefix) => `${prefix}-${crypto.randomUUID()}`
const isPersistedTaskId = (taskId) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(taskId))
const aiChatStorageKey = 'lumina:ai-chat'

const readStoredChat = () => {
  if (typeof window === 'undefined') return null

  try {
    const parsed = JSON.parse(window.localStorage.getItem(aiChatStorageKey) ?? 'null')
    if (!Array.isArray(parsed)) return null

    return parsed
      .filter((item) => ['assistant', 'user'].includes(item?.role) && typeof item?.content === 'string')
      .map((item) => ({
        id: item.id || makeId('chat'),
        role: item.role,
        content: item.content,
        tone: item.tone,
        isStreaming: false,
      }))
  } catch {
    return null
  }
}

const writeStoredChat = (nextChat) => {
  if (typeof window === 'undefined') return

  try {
    window.localStorage.setItem(
      aiChatStorageKey,
      JSON.stringify(
        nextChat.map(({ id, role, content, tone }) => ({
          id,
          role,
          content,
          tone,
        })),
      ),
    )
  } catch {
    // Chat persistence is a convenience; the live chat should keep working if storage is unavailable.
  }
}

const buildInitials = (name = '') =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('') || 'LU'
const buildUserModel = (user) => ({
  ...user,
  initials: buildInitials(user.name),
  username: user.username ?? '',
  leaderboard_visible: user.leaderboard_visible !== false,
  profile_picture_url: user.profile_picture_url ?? '',
})

const requireAuthUser = (payload) => {
  if (!payload?.user?.name) {
    const error = new Error('Authentication API returned an invalid user response. Check Vercel API routing and environment variables.')
    error.code = 'INVALID_AUTH_RESPONSE'
    throw error
  }

  return payload.user
}

const today = new Date('2026-04-26T19:00:00')

const addDays = (date, days) => {
  const copy = new Date(date)
  copy.setDate(copy.getDate() + days)
  return copy
}

const toIso = (date) => date.toISOString().slice(0, 10)

const mondayOfCurrentWeek = (() => {
  const base = new Date(today)
  const day = base.getDay() || 7
  base.setDate(base.getDate() - day + 1)
  base.setHours(0, 0, 0, 0)
  return base
})()

const books = [
  {
    id: makeId('book'),
    title: 'Clean Code',
    author: 'Robert C. Martin',
    subject: 'Programming',
    status: 'Reading',
    icon: '💻',
    current_page: 148,
    total_pages: 464,
    summary:
      'A practical guide to writing readable software, organizing functions, and reducing long-term maintenance costs. It is especially useful before architecture or code quality exams.',
  },
  {
    id: makeId('book'),
    title: 'Linear Algebra Done Right',
    author: 'Sheldon Axler',
    subject: 'Mathematics',
    status: 'Reading',
    icon: '📐',
    current_page: 92,
    total_pages: 340,
    summary:
      'Builds intuition for vector spaces, linear maps, and proofs instead of rote computation. The text pairs well with short daily review sessions and problem drills.',
  },
  {
    id: makeId('book'),
    title: 'A Brief History of Time',
    author: 'Stephen Hawking',
    subject: 'Physics',
    status: 'Want to Read',
    icon: '🌌',
    current_page: 18,
    total_pages: 256,
    summary:
      'Introduces cosmology, black holes, and the structure of the universe through concise conceptual explanations. It is ideal for lighter evening reading before deeper physics practice.',
  },
  {
    id: makeId('book'),
    title: 'The Silk Roads',
    author: 'Peter Frankopan',
    subject: 'History',
    status: 'Completed',
    icon: '🏺',
    current_page: 636,
    total_pages: 636,
    summary:
      'Connects world history through trade, empire, and cultural exchange across Asia, Europe, and the Middle East. It provides broad context that helps with essay framing and comparative history answers.',
  },
]

const defaultEvents = []

const tasks = [
  {
    id: makeId('task'),
    title: 'Finish recursion worksheet',
    subject: 'Programming',
    due_date: null,
    group_name: 'Today',
    is_done: false,
  },
  {
    id: makeId('task'),
    title: 'Review Gauss elimination examples',
    subject: 'Mathematics',
    due_date: null,
    group_name: 'Today',
    is_done: true,
  },
  {
    id: makeId('task'),
    title: 'Summarize Chapter 6',
    subject: 'History',
    due_date: null,
    group_name: 'Upcoming',
    is_done: false,
  },
  {
    id: makeId('task'),
    title: 'Physics formula flashcards',
    subject: 'Physics',
    due_date: null,
    group_name: 'Upcoming',
    is_done: false,
  },
  {
    id: makeId('task'),
    title: 'Prepare for Physics Exam',
    subject: 'Physics',
    due_date: null,
    group_name: 'Exams',
    is_done: false,
  },
]

const focusLogs = [
  { day: 'Mon', subject: 'Programming', total_minutes: 80 },
  { day: 'Tue', subject: 'Mathematics', total_minutes: 65 },
  { day: 'Wed', subject: 'Programming', total_minutes: 95 },
  { day: 'Thu', subject: 'History', total_minutes: 40 },
  { day: 'Fri', subject: 'Physics', total_minutes: 55 },
  { day: 'Sat', subject: 'General/AI', total_minutes: 30 },
  { day: 'Sun', subject: 'Programming', total_minutes: 72 },
]

const defaultChat = [
  {
    id: makeId('chat'),
    role: 'assistant',
    content:
      'Context loaded. Your Physics exam is within 72 hours, and I found a free study window on Tuesday at 16:00.',
  },
]
const chat = readStoredChat() ?? defaultChat

const proactiveDismissStorageKey = 'lumina:proactive-dismissed'

const buildContextString = (state) => {
  const activeBooks = state.books
    .filter((book) => book.status !== 'Completed')
    .map(({ title, current_page, total_pages, subject }) => ({
      title,
      current_page,
      total_pages,
      subject,
    }))

  const upcomingEvents = state.events.map(({ title, type, date, startHour }) => ({
    title,
    type,
    start_time: `${date} ${String(startHour).padStart(2, '0')}:00`,
  }))

  const focusSummary = state.focusLogs.map(({ subject, total_minutes }) => ({
    subject,
    total_minutes,
  }))

  const activeTasks = state.tasks.filter(t => !t.is_done).map(t => ({
    title: t.title,
    group: t.group_name,
    due: t.due_date
  }))

  return JSON.stringify(
    {
      books: activeBooks,
      events: upcomingEvents,
      tasks: activeTasks,
      focus_logs: focusSummary,
      now: today.toISOString(),
    },
    null,
    2,
  )
}

const detectConflict = (existingEvents, candidate) =>
  existingEvents.find((event) => {
    if (event.dayIndex !== candidate.dayIndex) return false

    const existingStart = event.startHour
    const existingEnd = event.startHour + event.duration
    const nextStart = candidate.startHour
    const nextEnd = candidate.startHour + candidate.duration

    return nextStart < existingEnd && nextEnd > existingStart
  })

const readDismissedSuggestions = (userId) => {
  if (typeof window === 'undefined' || !userId) return []

  try {
    const parsed = JSON.parse(window.localStorage.getItem(`${proactiveDismissStorageKey}:${userId}`) ?? '[]')
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

const writeDismissedSuggestion = (userId, suggestionId) => {
  if (typeof window === 'undefined' || !userId || !suggestionId) return

  const dismissed = new Set(readDismissedSuggestions(userId))
  dismissed.add(suggestionId)
  window.localStorage.setItem(`${proactiveDismissStorageKey}:${userId}`, JSON.stringify([...dismissed].slice(-40)))
}

const toValidDate = (value) => {
  const date = value ? new Date(value) : null
  return date && Number.isFinite(date.getTime()) ? date : null
}

const hasEventConflict = (events, start, end) =>
  events.some((event) => {
    const eventStart = toValidDate(event.start_time)
    const eventEnd = toValidDate(event.end_time)
    if (!eventStart || !eventEnd) return false
    return start < eventEnd && end > eventStart
  })

const findFreeStudySlot = (events, { durationMinutes = 60, before = null } = {}) => {
  const now = new Date()
  const earliest = new Date(now)
  earliest.setMinutes(earliest.getMinutes() + 30, 0, 0)
  earliest.setHours(earliest.getHours() + (earliest.getMinutes() > 0 ? 1 : 0), 0, 0, 0)
  const latest = before ? new Date(before) : null

  for (let dayOffset = 0; dayOffset < 14; dayOffset += 1) {
    for (let hour = 5; hour < 24; hour += 1) {
      const start = new Date(now)
      start.setDate(now.getDate() + dayOffset)
      start.setHours(hour, 0, 0, 0)
      const end = new Date(start)
      end.setMinutes(end.getMinutes() + durationMinutes)

      if (start <= earliest || (latest && end >= latest) || end.getHours() < 5) continue
      if (!hasEventConflict(events, start, end)) return { start, end }
    }
  }

  return null
}

const formatSuggestionSlot = (slot) =>
  slot.start.toLocaleString(undefined, {
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })

const buildProactiveSuggestion = (state) => {
  const userId = state.user?.id
  const dismissed = new Set(readDismissedSuggestions(userId))
  const events = state.events ?? []
  const books = state.books ?? []
  const tasks = state.tasks ?? []
  const focusLogs = state.focusLogs ?? []
  const now = new Date()

  const upcomingExam = events
    .map((event) => ({ ...event, startDate: toValidDate(event.start_time) }))
    .filter((event) => event.type === 'exam' && event.startDate && event.startDate > now)
    .sort((left, right) => left.startDate - right.startDate)[0]

  if (upcomingExam) {
    const slot = findFreeStudySlot(events, { durationMinutes: 60, before: upcomingExam.startDate })
    if (slot) {
      const id = `exam-review:${upcomingExam.id}:${slot.start.toISOString()}`
      if (!dismissed.has(id)) {
        return {
          id,
          type: 'schedule_exam_review',
          message: `Review ${upcomingExam.subject || 'your exam subject'} before "${upcomingExam.title}" at ${formatSuggestionSlot(slot)}.`,
          actionLabel: 'Schedule review',
          action: {
            kind: 'create_event',
            payload: {
              title: `Review: ${upcomingExam.title}`,
              subject: upcomingExam.subject || 'General/AI',
              type: 'study_session',
              start_time: slot.start.toISOString(),
              end_time: slot.end.toISOString(),
              is_confirmed: true,
            },
          },
        }
      }
    }
  }

  const unfinishedBook = books
    .filter((book) => book.status !== 'Completed' && Number(book.total_pages) > 0 && Number(book.current_page) < Number(book.total_pages))
    .sort((left, right) => (Number(right.current_page) / Number(right.total_pages)) - (Number(left.current_page) / Number(left.total_pages)))[0]

  if (unfinishedBook) {
    const slot = findFreeStudySlot(events, { durationMinutes: 60 })
    if (slot) {
      const progress = Math.round((Number(unfinishedBook.current_page) / Number(unfinishedBook.total_pages)) * 100)
      const id = `book-reading:${unfinishedBook.id}:${slot.start.toISOString()}`
      if (!dismissed.has(id)) {
        return {
          id,
          type: 'schedule_reading_block',
          message: `Schedule a reading block for "${unfinishedBook.title}" (${progress}% complete) at ${formatSuggestionSlot(slot)}.`,
          actionLabel: 'Schedule reading',
          action: {
            kind: 'create_event',
            payload: {
              title: `Read: ${unfinishedBook.title}`,
              subject: unfinishedBook.subject || 'General/AI',
              type: 'study_session',
              start_time: slot.start.toISOString(),
              end_time: slot.end.toISOString(),
              is_confirmed: true,
            },
          },
        }
      }
    }
  }

  const incompleteTask = tasks.find((task) => !task.is_done)
  if (incompleteTask) {
    const slot = findFreeStudySlot(events, { durationMinutes: 45 })
    if (slot) {
      const id = `task-focus:${incompleteTask.id}:${slot.start.toISOString()}`
      if (!dismissed.has(id)) {
        return {
          id,
          type: 'schedule_task_focus',
          message: `Block time for "${incompleteTask.title}" at ${formatSuggestionSlot(slot)}.`,
          actionLabel: 'Schedule task',
          action: {
            kind: 'create_event',
            payload: {
              title: `Task: ${incompleteTask.title}`,
              subject: incompleteTask.subject || 'General/AI',
              type: 'study_session',
              start_time: slot.start.toISOString(),
              end_time: slot.end.toISOString(),
              is_confirmed: true,
            },
          },
        }
      }
    }
  }

  const focusBySubject = focusLogs.reduce((map, log) => {
    const subject = log.subject || 'General/AI'
    map.set(subject, (map.get(subject) ?? 0) + Number(log.total_minutes ?? 0))
    return map
  }, new Map())
  const weakSubject = [...focusBySubject.entries()]
    .filter(([subject]) => subject !== 'General/AI')
    .sort((left, right) => left[1] - right[1])[0]?.[0]

  if (weakSubject) {
    const slot = findFreeStudySlot(events, { durationMinutes: 30 })
    if (slot) {
      const id = `weak-subject:${weakSubject}:${slot.start.toISOString()}`
      if (!dismissed.has(id)) {
        return {
          id,
          type: 'schedule_focus_session',
          message: `Add a short focus session for ${weakSubject} at ${formatSuggestionSlot(slot)}.`,
          actionLabel: 'Schedule focus',
          action: {
            kind: 'create_event',
            payload: {
              title: `${weakSubject} focus session`,
              subject: weakSubject,
              type: 'study_session',
              start_time: slot.start.toISOString(),
              end_time: slot.end.toISOString(),
              is_confirmed: true,
            },
          },
        }
      }
    }
  }

  return null
}

export const useLuminaStore = create((set, get) => ({
  page: 'dashboard',
  authStatus: 'loading',
  authMode: 'register',
  authError: null,
  authErrorContext: null,
  authMessage: '',
  isAuthBusy: false,
  settingsMessage: '',
  settingsError: null,
  isSettingsBusy: false,
  searchQuery: '',
  showFocusOverlay: false,
  subjects: SUBJECTS,
  subjectRecords: subjectRecordsFromMap(SUBJECTS),
  subjectsStatus: 'idle',
  subjectsError: '',
  dayNames: DAY_NAMES,
  timeSlots: TIME_SLOTS,
  books,
  events: [],
  calendarStatus: 'idle',
  tasks,
  focusLogs,
  chat,
  isAiBusy: false,
  aiError: '',
  proactiveBanner: null,
  proactiveStatus: 'idle',
  proactiveError: '',
  conflictWarning: null,
  notifications: 3,
  user: null,
  openBooks: [],
  isBooksLoading: false,
  admin: {
    overview: null,
    users: [],
    books: [],
    events: [],
    analytics: null,
    leaderboard: [],
    activity: [],
    status: 'idle',
    error: '',
  },
  leaderboard: {
    daily: [],
    weekly: [],
    monthly: [],
    myRank: null,
    status: 'idle',
    error: '',
  },
  timer: {
    mode: 'focus',
    status: 'idle',
    remainingSeconds: focusDurations.focus,
    durations: focusDurations,
        selectedSubject: 'Physics',
        completedCycles: 2,
        startedAt: null,
      },

  setPage: (page) => set((state) => ({
    page: page === 'admin' && state.user?.role !== 'admin' ? 'dashboard' : page,
  })),
  setAuthMode: (authMode) => set({ authMode, authError: null, authErrorContext: null, authMessage: '' }),
  clearAuthFeedback: () => set({ authError: null, authErrorContext: null, authMessage: '' }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  toggleFocusOverlay: () => set((state) => ({ showFocusOverlay: !state.showFocusOverlay })),
  refreshProactiveSuggestion: () => {
    set({ proactiveStatus: 'loading', proactiveError: '' })
    try {
      const proactiveBanner = buildProactiveSuggestion(get())
      set({ proactiveBanner, proactiveStatus: 'idle', proactiveError: '' })
    } catch (error) {
      set({ proactiveBanner: null, proactiveStatus: 'error', proactiveError: error.message || 'Could not load study suggestions.' })
    }
  },
  acceptProactiveSuggestion: async () => {
    const suggestion = get().proactiveBanner
    if (!suggestion?.action) return

    set({ proactiveStatus: 'loading', proactiveError: '' })
    try {
      if (suggestion.action.kind === 'create_event') {
        const start = toValidDate(suggestion.action.payload.start_time)
        const end = toValidDate(suggestion.action.payload.end_time)
        if (!start || !end || start <= new Date() || end <= start) {
          throw new Error('Suggested time is no longer available.')
        }
        if (hasEventConflict(get().events, start, end)) {
          throw new Error('Suggested time now conflicts with your calendar.')
        }
        await get().createEventAsync(suggestion.action.payload)
      }

      if (suggestion.action.kind === 'create_task') {
        await get().createTaskAsync(suggestion.action.payload)
      }

      writeDismissedSuggestion(get().user?.id, suggestion.id)
      set({ proactiveBanner: null, proactiveStatus: 'idle', proactiveError: '' })
    } catch (error) {
      set({ proactiveStatus: 'error', proactiveError: error.message || 'Could not apply suggestion.' })
    }
  },
  dismissBanner: () => {
    const suggestion = get().proactiveBanner
    writeDismissedSuggestion(get().user?.id, suggestion?.id)
    set({ proactiveBanner: null, proactiveStatus: 'idle', proactiveError: '' })
  },
  getAIContext: () => buildContextString(get()),
  clearChat: () => {
    const nextChat = defaultChat.map((item) => ({ ...item, id: makeId('chat') }))
    writeStoredChat(nextChat)
    set({
      chat: nextChat,
      aiError: '',
      isAiBusy: false,
    })
  },

  hydrateAuth: async () => {
    set({ authStatus: 'loading', authError: null, authErrorContext: null })

    try {
      const payload = await meRequest()
      const user = requireAuthUser(payload)

      set({
        user: buildUserModel(user),
        authStatus: 'authenticated',
        authError: null,
      })
      await get().fetchSubjects()
    } catch (error) {
      if (error.status !== 401 && error.code !== 'INVALID_API_RESPONSE') {
        set({ authError: error.message, authErrorContext: 'session' })
      }

      set({
        user: null,
        authStatus: 'guest',
        subjects: SUBJECTS,
        subjectRecords: subjectRecordsFromMap(SUBJECTS),
      })
    }
  },

  register: async ({ name, email, password }) => {
    if (get().isAuthBusy) return
    set({ isAuthBusy: true, authError: null, authErrorContext: null, authMessage: '' })

    try {
      const payload = await registerRequest({ name, email, password })
      const user = requireAuthUser(payload)

      set({
        user: buildUserModel(user),
        authStatus: 'authenticated',
        isAuthBusy: false,
        authError: null,
        authMessage: 'Account created successfully.',
      })
      await get().fetchSubjects()
    } catch (error) {
      set({
        isAuthBusy: false,
        authError: error.message,
        authErrorContext: 'submit',
      })
      throw error
    }
  },

  login: async ({ email, password }) => {
    if (get().isAuthBusy) return
    set({ isAuthBusy: true, authError: null, authErrorContext: null, authMessage: '' })

    try {
      const payload = await loginRequest({ email, password })
      const user = requireAuthUser(payload)

      set({
        user: buildUserModel(user),
        authStatus: 'authenticated',
        isAuthBusy: false,
        authError: null,
        authMessage: 'Welcome back.',
      })
      await get().fetchSubjects()
    } catch (error) {
      set({
        isAuthBusy: false,
        authError: error.message,
        authErrorContext: 'submit',
      })
      throw error
    }
  },

  logout: async (message = 'You have been logged out.') => {
    set({ isAuthBusy: true, authError: null, authMessage: '' })

    try {
      await logoutRequest()
    } catch {
      // Even if the backend session is already expired, we still clear local auth state.
    }

    set({
      user: null,
      authStatus: 'guest',
      authMode: 'login',
      page: 'dashboard',
      searchQuery: '',
      showFocusOverlay: false,
      subjects: SUBJECTS,
      subjectRecords: subjectRecordsFromMap(SUBJECTS),
      subjectsStatus: 'idle',
      subjectsError: '',
      isAuthBusy: false,
      authError: null,
      authMessage: message,
    })
  },

  clearSettingsFeedback: () => set({ settingsMessage: '', settingsError: null }),

  openProfilePage: () => set({ page: 'profile', settingsMessage: '', settingsError: null }),

  fetchProfile: async () => {
    set({ isSettingsBusy: true, settingsError: null })

    try {
      const payload = await getProfileRequest()
      const user = buildUserModel(payload.user)
      set({
        user,
        isSettingsBusy: false,
      })
      return user
    } catch (error) {
      set({
        isSettingsBusy: false,
        settingsError: error.message,
      })
      throw error
    }
  },

  updateProfile: async ({ name, username, leaderboard_visible, profile_picture_url }) => {
    set({ isSettingsBusy: true, settingsError: null, settingsMessage: '' })

    try {
      const payload = await updateProfileRequest({ name, username, leaderboard_visible, profile_picture_url })
      set({
        user: buildUserModel(payload.user),
        isSettingsBusy: false,
        settingsMessage: payload.message ?? 'Profile updated successfully.',
      })
      return payload.user
    } catch (error) {
      set({
        isSettingsBusy: false,
        settingsError: error.message,
      })
      throw error
    }
  },

  uploadProfileImage: async (blob) => {
    set({ isSettingsBusy: true, settingsError: null, settingsMessage: '' })

    try {
      const payload = await uploadProfileImageRequest(blob)
      set({ isSettingsBusy: false })
      return payload.imageUrl
    } catch (error) {
      set({
        isSettingsBusy: false,
        settingsError: error.message,
      })
      throw error
    }
  },

  fetchAdminData: async () => {
    if (get().user?.role !== 'admin') {
      set((state) => ({ admin: { ...state.admin, error: 'Access denied' } }))
      return
    }

    set((state) => ({ admin: { ...state.admin, status: 'loading', error: '' } }))

    try {
      const [overview, users, books, events, analytics, leaderboard] = await Promise.all([
        fetchAdminOverviewRequest(),
        fetchAdminUsersRequest(),
        fetchAdminBooksRequest(),
        fetchAdminEventsRequest(),
        fetchAdminAnalyticsRequest(),
        fetchAdminLeaderboardRequest(),
      ])

      set((state) => ({
        admin: {
          ...state.admin,
          overview: overview.data,
          users: users.data,
          books: books.data,
          events: events.data,
          analytics: analytics.data,
          leaderboard: leaderboard.data,
          status: 'idle',
          error: '',
        },
      }))
    } catch (error) {
      set((state) => ({
        admin: {
          ...state.admin,
          status: 'error',
          error: error.message,
        },
      }))
    }
  },

  fetchLeaderboard: async ({ period = 'weekly', subject = 'all', search = '' } = {}) => {
    set((state) => ({ leaderboard: { ...state.leaderboard, status: 'loading', error: '' } }))
    try {
      const [list, mine] = await Promise.all([
        fetchLeaderboardRequest({ period, subject, search }),
        fetchMyLeaderboardRequest(),
      ])
      set((state) => ({
        leaderboard: {
          ...state.leaderboard,
          [period]: list.data,
          myRank: mine.data,
          status: 'idle',
          error: '',
        },
      }))
    } catch (error) {
      set((state) => ({
        leaderboard: { ...state.leaderboard, status: 'error', error: error.message },
      }))
    }
  },

  fetchSubjects: async () => {
    set({ subjectsStatus: 'loading', subjectsError: '' })

    try {
      const { data } = await fetchSubjectsRequest()
      const subjectRecords = normalizeSubjectRecords(data)
      const selectedSubject = get().timer.selectedSubject
      const hasSelectedSubject = subjectRecords.some((subject) => subject.name === selectedSubject)
      const nextSelectedSubject = hasSelectedSubject
        ? selectedSubject
        : subjectRecords.find((subject) => subject.name !== 'General/AI')?.name ?? subjectRecords[0]?.name ?? 'General/AI'

      set((state) => ({
        subjects: subjectsMapFromRecords(subjectRecords),
        subjectRecords,
        subjectsStatus: 'idle',
        subjectsError: '',
        timer: {
          ...state.timer,
          selectedSubject: nextSelectedSubject,
        },
      }))
    } catch (error) {
      console.error('fetchSubjects:', error.message)
      set({ subjectsStatus: 'error', subjectsError: error.message })
    }
  },

  addSubject: async ({ name }) => {
    const { data } = await createSubjectRequest({ name })
    set((state) => {
      const subjectRecords = [...state.subjectRecords, data]
      return {
        subjectRecords,
        subjects: subjectsMapFromRecords(subjectRecords),
        subjectsError: '',
        timer: {
          ...state.timer,
          selectedSubject: data.name,
        },
      }
    })
    return data
  },

  renameSubject: async (id, name) => {
    const oldSubject = get().subjectRecords.find((subject) => subject.id === id)
    const { data } = await updateSubjectRequest(id, { name })
    set((state) => {
      const subjectRecords = state.subjectRecords.map((subject) => (subject.id === id ? data : subject))
      return {
        subjectRecords,
        subjects: subjectsMapFromRecords(subjectRecords),
        subjectsError: '',
        timer: {
          ...state.timer,
          selectedSubject: state.timer.selectedSubject === oldSubject?.name ? data.name : state.timer.selectedSubject,
        },
      }
    })
    return data
  },

  deleteSubject: async (id) => {
    const oldSubject = get().subjectRecords.find((subject) => subject.id === id)
    await deleteSubjectRequest(id)
    set((state) => {
      const subjectRecords = state.subjectRecords.filter((subject) => subject.id !== id)
      const nextSelectedSubject = state.timer.selectedSubject === oldSubject?.name
        ? subjectRecords.find((subject) => subject.name !== 'General/AI')?.name ?? subjectRecords[0]?.name ?? 'General/AI'
        : state.timer.selectedSubject

      return {
        subjectRecords,
        subjects: subjectsMapFromRecords(subjectRecords),
        subjectsError: '',
        timer: {
          ...state.timer,
          selectedSubject: nextSelectedSubject,
        },
      }
    })
  },

  fetchAdminLeaderboard: async (filters = {}) => {
    const payload = await fetchAdminLeaderboardRequest(filters)
    set((state) => ({ admin: { ...state.admin, leaderboard: payload.data } }))
  },

  setAdminLeaderboardVisibility: async (id, visible) => {
    await setAdminLeaderboardVisibilityRequest(id, visible)
    set((state) => ({
      admin: {
        ...state.admin,
        leaderboard: state.admin.leaderboard.map((row) => (
          row.user_id === id ? { ...row, leaderboard_visible: visible } : row
        )),
      },
    }))
  },

  resetAdminLeaderboard: async (id) => {
    await resetAdminLeaderboardRequest(id)
    set((state) => ({
      admin: {
        ...state.admin,
        leaderboard: state.admin.leaderboard.map((row) => (
          row.user_id === id ? { ...row, score: 0 } : row
        )),
      },
    }))
  },

  fetchAdminActivity: async (id) => {
    const payload = await fetchAdminActivityRequest(id)
    set((state) => ({ admin: { ...state.admin, activity: payload.data } }))
  },

  searchAdminUsers: async (search) => {
    const payload = await fetchAdminUsersRequest(search)
    set((state) => ({ admin: { ...state.admin, users: payload.data } }))
  },

  searchAdminBooks: async (search) => {
    const payload = await fetchAdminBooksRequest(search)
    set((state) => ({ admin: { ...state.admin, books: payload.data } }))
  },

  updateAdminUser: async (id, body) => {
    const payload = await updateAdminUserRequest(id, body)
    set((state) => ({
      admin: {
        ...state.admin,
        users: state.admin.users.map((user) => (user.id === id ? payload.data : user)),
      },
    }))
  },

  deleteAdminUser: async (id) => {
    await deleteAdminUserRequest(id)
    set((state) => ({
      admin: {
        ...state.admin,
        users: state.admin.users.filter((user) => user.id !== id),
      },
    }))
  },

  deleteAdminBook: async (id) => {
    await deleteAdminBookRequest(id)
    set((state) => ({
      admin: {
        ...state.admin,
        books: state.admin.books.filter((book) => book.id !== id),
      },
    }))
  },

  reprocessAdminBook: async (id) => {
    await reprocessAdminBookRequest(id)
    set((state) => ({
      admin: {
        ...state.admin,
        books: state.admin.books.map((book) => (
          book.id === id ? { ...book, upload_status: 'queued' } : book
        )),
      },
    }))
  },

  createAdminEvent: async (payload) => {
    await createAdminEventRequest(payload)
    await get().fetchAdminData()
  },

  updateAdminEvent: async (id, payload) => {
    await updateAdminEventRequest(id, payload)
    await get().fetchAdminData()
  },

  deleteAdminEvent: async (id) => {
    await deleteAdminEventRequest(id)
    set((state) => ({
      admin: {
        ...state.admin,
        events: state.admin.events.filter((event) => event.id !== id),
      },
    }))
  },

  changeEmail: async ({ email }) => {
    set({ isSettingsBusy: true, settingsError: null, settingsMessage: '' })

    try {
      const payload = await changeEmailRequest({ email })
      set({
        user: buildUserModel(payload.user),
        isSettingsBusy: false,
        settingsMessage: payload.verification_recommended
          ? 'Email updated. In production, this should trigger an email verification flow.'
          : payload.message ?? 'Email updated successfully.',
      })
      return payload.user
    } catch (error) {
      set({
        isSettingsBusy: false,
        settingsError: error.message,
      })
      throw error
    }
  },

  changePassword: async ({ current_password, new_password, confirm_password }) => {
    set({ isSettingsBusy: true, settingsError: null, settingsMessage: '' })

    try {
      const payload = await changePasswordRequest({
        current_password,
        new_password,
        confirm_password,
      })
      set({
        isSettingsBusy: false,
        settingsMessage: payload.message ?? 'Password updated successfully.',
      })
      await get().logout('Password changed successfully. Please sign in again.')
    } catch (error) {
      set({
        isSettingsBusy: false,
        settingsError: error.message,
      })
      throw error
    }
  },

  sendChat: async (message, options = {}) => {
    const trimmedMessage = message.trim()
    if (!trimmedMessage) return

    if (trimmedMessage.length > 4000) {
      set({ aiError: 'Your message is too long.' })
      return
    }

    const userMessage = {
      id: makeId('chat'),
      role: 'user',
      content: trimmedMessage,
    }
    const assistantId = makeId('chat')

    set((state) => {
      const nextChat = [
        ...state.chat,
        userMessage,
        {
          id: assistantId,
          role: 'assistant',
          content: '',
          isStreaming: true,
        },
      ]
      writeStoredChat(nextChat)

      return {
        chat: nextChat,
        isAiBusy: true,
        aiError: '',
      }
    })

    let pendingText = ''
    let visibleText = ''
    let typeTimer = null
    let drainResolver = null

    const renderVisibleText = () => {
      set((state) => {
        const nextChat = state.chat.map((item) =>
          item.id === assistantId
            ? {
                ...item,
                content: visibleText,
              }
            : item,
        )
        writeStoredChat(nextChat)

        return { chat: nextChat }
      })
    }

    const stopTypewriter = () => {
      if (typeTimer) {
        clearInterval(typeTimer)
        typeTimer = null
      }
    }

    const resolveDrainIfReady = () => {
      if (!pendingText && drainResolver) {
        const resolve = drainResolver
        drainResolver = null
        resolve()
      }
    }

    const startTypewriter = () => {
      if (typeTimer) return

      typeTimer = setInterval(() => {
        if (!pendingText) {
          stopTypewriter()
          resolveDrainIfReady()
          return
        }

        const nextSize = pendingText.length > 80 ? 6 : 3
        visibleText += pendingText.slice(0, nextSize)
        pendingText = pendingText.slice(nextSize)
        renderVisibleText()
      }, 18)
    }

    const waitForTypewriter = () =>
      pendingText
        ? new Promise((resolve) => {
            drainResolver = resolve
            startTypewriter()
          })
        : Promise.resolve()

    try {
      const content = await streamAiChatRequest({
        message: userMessage.content,
        context: options.context ?? get().getAIContext(),
        subject: options.subject ?? get().timer.selectedSubject,
        onChunk: (chunk) => {
          pendingText += chunk
          startTypewriter()
        },
      })
      await waitForTypewriter()
      stopTypewriter()

      set((state) => {
        const nextChat = state.chat.map((item) =>
          item.id === assistantId
            ? {
                ...item,
                content: visibleText || content || 'AI assistant is temporarily unavailable.',
                isStreaming: false,
              }
            : item,
        )
        writeStoredChat(nextChat)

        return {
          chat: nextChat,
          isAiBusy: false,
        }
      })
    } catch (error) {
      stopTypewriter()
      const messageByCode = {
        VALIDATION_ERROR: error.message?.toLowerCase().includes('too long')
          ? 'Your message is too long.'
          : 'Invalid AI request format.',
        AI_QUOTA_EXCEEDED: 'Please try again later.',
        RATE_LIMITED: 'Please try again later.',
        AUTH_REQUIRED: 'Please sign in to use StudyGPT.',
        INVALID_TOKEN: 'Please sign in again to use StudyGPT.',
      }
      const errorMessage = messageByCode[error.code] ?? 'AI assistant is temporarily unavailable.'

      set((state) => {
        const nextChat = state.chat.map((item) =>
          item.id === assistantId
            ? {
                ...item,
                content: errorMessage,
                tone: 'error',
                isStreaming: false,
              }
            : item,
        )
        writeStoredChat(nextChat)

        return {
          chat: nextChat,
          aiError: errorMessage,
          isAiBusy: false,
        }
      })
    }
  },

  updateBookProgress: async (bookId, amount = 18) => {
    const book = get().books.find((item) => item.id === bookId)
    if (!book) return

    const nextPage = Math.min(book.total_pages, book.current_page + amount)
    const nextStatus = nextPage >= book.total_pages ? 'Completed' : book.status

    set((state) => ({
      books: state.books.map((item) =>
        item.id === bookId
          ? {
              ...item,
              current_page: nextPage,
              status: nextStatus,
            }
          : item,
      ),
    }))

    try {
      const { data } = await updateBookRequest(bookId, {
        current_page: nextPage,
        status: nextStatus,
      })
      set((state) => ({
        books: state.books.map((item) => (item.id === bookId ? data : item)),
      }))
    } catch (error) {
      console.error('updateBookProgress:', error.message)
      set((state) => ({
        books: state.books.map((item) => (item.id === bookId ? book : item)),
      }))
    }
  },

  toggleTask: (taskId) => {
    // Legacy sync version — handles both mock (is_done) and old (done) tasks
    set((state) => ({
      tasks: state.tasks.map((task) =>
        task.id === taskId ? { ...task, is_done: !task.is_done } : task,
      ),
    }))
  },

  fetchTasksAsync: async () => {
    try {
      const { data } = await fetchTasksRequest()
      const todayStr = new Date().toISOString().split('T')[0]

      if (Array.isArray(data)) {
        const updatedTasks = data.map(task => {
          if (task.due_date && task.due_date.split('T')[0] === todayStr && task.group_name === 'Upcoming') {
            return { ...task, group_name: 'Today' }
          }
          return task
        })
        set({ tasks: updatedTasks })
      }
    } catch (error) {
      // Network/auth error: keep the current in-memory tasks so the page remains usable.
      console.error('fetchTasksAsync:', error.message)
    }
  },

  createTaskAsync: async (payload) => {
    try {
      const { data } = await createTaskRequest(payload)
      set((state) => ({ tasks: [data, ...state.tasks] }))
      return data
    } catch (error) {
      console.error(error)
    }
  },

  updateTaskAsync: async (taskId, payload) => {
    const originalTask = get().tasks.find(t => t.id === taskId)
    if (!originalTask) return null

    set((state) => ({
      tasks: state.tasks.map(t => t.id === taskId ? { ...t, ...payload } : t),
    }))

    if (!isPersistedTaskId(taskId)) return { ...originalTask, ...payload }

    try {
      const { data } = await updateTaskRequest(taskId, payload)
      set((state) => ({
        tasks: state.tasks.map(t => t.id === taskId ? data : t),
      }))
      return data
    } catch (error) {
      console.error('updateTaskAsync:', error.message)
      set((state) => ({
        tasks: state.tasks.map(t => t.id === taskId ? originalTask : t),
      }))
      throw error
    }
  },

  deleteTaskAsync: async (taskId) => {
    const originalTasks = get().tasks
    set((state) => ({
      tasks: state.tasks.filter(t => t.id !== taskId),
    }))

    if (!isPersistedTaskId(taskId)) return

    try {
      await deleteTaskRequest(taskId)
    } catch (error) {
      console.error('deleteTaskAsync:', error.message)
      set({ tasks: originalTasks })
      throw error
    }
  },

  toggleTaskAsync: async (taskId) => {
    const task = get().tasks.find(t => t.id === taskId)
    if (!task) return

    const nextStatus = !task.is_done

    // Optimistic UI update immediately
    set((state) => ({
      tasks: state.tasks.map(t => t.id === taskId ? { ...t, is_done: nextStatus } : t)
    }))

    // Only persist to backend if it's a real task ID from the database.
    if (isPersistedTaskId(taskId)) {
      try {
        await updateTaskRequest(taskId, { is_done: nextStatus })
      } catch (error) {
        // Rollback on failure
        console.error('toggleTaskAsync:', error.message)
        set((state) => ({
          tasks: state.tasks.map(t => t.id === taskId ? { ...t, is_done: !nextStatus } : t)
        }))
      }
    }
  },

  acceptSuggestion: async (eventId) => {
    try {
      await updateEventRequest(eventId, { is_confirmed: true, type: 'study_session' })
      set((state) => ({
        events: state.events.map((event) =>
          event.id === eventId
            ? { ...event, is_confirmed: true, type: 'study_session' }
            : event,
        ),
        proactiveBanner: null,
      }))
    } catch (error) {
      console.error(error)
    }
  },

  fetchEvents: async () => {
    set({ calendarStatus: 'loading' })
    try {
      const { data } = await fetchEventsRequest()
      set({ events: data, calendarStatus: 'idle' })
    } catch (error) {
      console.error('Failed to fetch events:', error)
      set({ calendarStatus: 'error' })
    }
  },

  createEventAsync: async (payload) => {
    try {
      const { data } = await createEventRequest(payload)
      set((state) => ({ events: [...state.events, data] }))
      return data
    } catch (error) {
      if (error.code === 'EVENT_CONFLICT') {
        set({ conflictWarning: error.message })
      }
      throw error
    }
  },

  updateEventAsync: async (id, payload) => {
    try {
      const { data } = await updateEventRequest(id, payload)
      set((state) => ({
        events: state.events.map((e) => (e.id === id ? data : e)),
      }))
      return data
    } catch (error) {
      if (error.code === 'EVENT_CONFLICT') {
        set({ conflictWarning: error.message })
      }
      throw error
    }
  },

  deleteEventAsync: async (id) => {
    try {
      await deleteEventRequest(id)
      set((state) => ({
        events: state.events.filter((e) => e.id !== id),
      }))
    } catch (error) {
      console.error('Failed to delete event:', error)
      throw error
    }
  },

  fetchBooks: async () => {
    set({ isBooksLoading: true })
    try {
      const { data } = await fetchBooksRequest()
      set({ books: data, isBooksLoading: false })
    } catch (error) {
      console.error(error)
      set({ isBooksLoading: false })
    }
  },

  fetchOpenBooks: async (query) => {
    set({ isBooksLoading: true })
    try {
      const { data } = await fetchOpenBooksRequest(query)
      set({ openBooks: data, isBooksLoading: false })
    } catch (error) {
      console.error(error)
      set({ isBooksLoading: false })
    }
  },

  addOpenBookToLibrary: async (book, status = 'Want to Read') => {
    try {
      const payload = {
        title: book.title,
        author: book.author,
        status,
        total_pages: book.total_pages || 300,
        current_page: 0,
        source_url: book.source_url || book.reader_url || book.download_url,
        is_open_access: true,
      }
      const { data } = await createBookRequest(payload)
      const nextBook = {
        ...data,
        cover_url: book.cover_url,
        google_books_id: book.google_books_id,
        archive_id: book.archive_id,
        gutenberg_id: book.gutenberg_id,
        is_google_books: book.is_google_books,
        is_archive: book.is_archive,
        is_gutenberg: book.is_gutenberg,
        provider: book.provider,
        reader_url: book.reader_url,
        download_url: book.download_url,
        download_format: book.download_format,
        readable: book.readable,
        viewability: book.viewability,
      }
      set((state) => ({ books: [...state.books, nextBook] }))
      return nextBook
    } catch (error) {
      console.error(error)
    }
  },

  startReadingBook: async (bookId) => {
    try {
      const { data } = await updateBookRequest(bookId, { status: 'Reading' })
      set((state) => ({
        books: state.books.map((book) => (book.id === bookId ? { ...book, ...data } : book)),
      }))
      return data
    } catch (error) {
      console.error(error)
      return null
    }
  },

  updateBookReadingProgress: async (bookId, currentPage) => {
    const book = get().books.find((item) => item.id === bookId)
    if (!book) return null

    const nextPage = Math.min(Math.max(Number(currentPage) || 0, 0), book.total_pages || 0)
    const nextStatus = nextPage >= book.total_pages ? 'Completed' : 'Reading'

    set((state) => ({
      books: state.books.map((item) =>
        item.id === bookId
          ? {
              ...item,
              current_page: nextPage,
              status: nextStatus,
            }
          : item,
      ),
    }))

    try {
      const { data } = await updateBookRequest(bookId, {
        current_page: nextPage,
        status: nextStatus,
      })
      set((state) => ({
        books: state.books.map((item) => (item.id === bookId ? { ...item, ...data } : item)),
      }))
      return data
    } catch (error) {
      console.error(error)
      set((state) => ({
        books: state.books.map((item) => (item.id === bookId ? book : item)),
      }))
      return null
    }
  },

  addEvent: async (candidate) => {
    // legacy sync function mapping to async
    try {
      await get().createEventAsync(candidate)
    } catch (err) {
      console.error(err)
    }
  },

  addQuickEvent: () => {
    const candidate = {
      title: 'New Study Session',
      subject: 'General/AI',
      type: 'study_session',
      start_time: toIso(addDays(mondayOfCurrentWeek, 5)) + 'T10:00:00.000Z',
      end_time: toIso(addDays(mondayOfCurrentWeek, 5)) + 'T11:00:00.000Z',
      is_confirmed: true,
    }
    get().addEvent(candidate)
  },

  addBookSessionToCalendar: (bookId, dayIndex, startHour) => {
    const book = get().books.find((item) => item.id === bookId)
    if (!book) return

    const candidate = {
      title: `AI Study Session: ${book.title}`,
      subject: book.subject,
      type: 'ai_suggestion',
      start_time: toIso(addDays(mondayOfCurrentWeek, dayIndex)) + `T${String(startHour).padStart(2, '0')}:00:00.000Z`,
      end_time: toIso(addDays(mondayOfCurrentWeek, dayIndex)) + `T${String(startHour + 1).padStart(2, '0')}:00:00.000Z`,
      is_confirmed: false,
    }
    get().addEvent(candidate)
  },

  clearConflict: () => set({ conflictWarning: null }),

  setTimerMode: (mode) =>
    set((state) => ({
      timer: {
        ...state.timer,
        mode,
        status: 'idle',
        remainingSeconds: state.timer.durations[mode],
      },
    })),

  setTimerDuration: (mode, minutes) => {
    const nextMinutes = Number(minutes)
    if (!Number.isFinite(nextMinutes) || nextMinutes < 1) return

    const nextSeconds = Math.round(nextMinutes) * 60
    set((state) => ({
      timer: {
        ...state.timer,
        durations: {
          ...state.timer.durations,
          [mode]: nextSeconds,
        },
        remainingSeconds:
          state.timer.mode === mode && state.timer.status === 'idle'
            ? nextSeconds
            : state.timer.remainingSeconds,
      },
    }))
  },

  setTimerSubject: (selectedSubject) =>
    set((state) => ({
      timer: {
        ...state.timer,
        selectedSubject,
      },
    })),

  startTimer: () =>
    set((state) => ({
      timer: {
        ...state.timer,
        status: 'running',
        startedAt: state.timer.startedAt ?? new Date().toISOString(),
      },
    })),

  pauseTimer: () =>
    set((state) => ({
      timer: {
        ...state.timer,
        status: 'paused',
      },
    })),

  stopTimer: () =>
    set((state) => ({
      timer: {
        ...state.timer,
        status: 'idle',
        remainingSeconds: state.timer.durations[state.timer.mode],
        startedAt: null,
      },
    })),

  resetTimer: () =>
    set((state) => ({
      timer: {
        ...state.timer,
        status: 'idle',
        remainingSeconds: state.timer.durations[state.timer.mode],
        startedAt: null,
      },
    })),

  tickTimer: () => {
    const timer = get().timer
    if (timer.status !== 'running') return

    if (timer.remainingSeconds <= 1) {
      const completedMinutes = Math.round(timer.durations[timer.mode] / 60)
      if (timer.mode === 'focus' && completedMinutes >= 1) {
        createFocusLogRequest({
          subject: timer.selectedSubject,
          total_minutes: completedMinutes,
          started_at: timer.startedAt ?? new Date().toISOString(),
        }).catch((error) => console.error('createFocusLogRequest:', error.message))
      }

      set((state) => ({
        timer: {
          ...state.timer,
          status: 'idle',
          remainingSeconds: state.timer.durations[state.timer.mode],
          startedAt: null,
          completedCycles:
            state.timer.mode === 'focus'
              ? Math.min(4, state.timer.completedCycles + 1)
              : state.timer.completedCycles,
        },
        focusLogs: state.timer.mode === 'focus'
          ? [
              ...state.focusLogs,
              {
                day: 'Today',
                subject: state.timer.selectedSubject,
                total_minutes: completedMinutes,
              },
            ]
          : state.focusLogs,
      }))

      return
    }

    set((state) => ({
      timer: {
        ...state.timer,
        remainingSeconds: state.timer.remainingSeconds - 1,
      },
    }))
  },
}))
