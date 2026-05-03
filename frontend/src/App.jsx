import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion as Motion } from 'framer-motion'
import ePub from 'epubjs'
import {
  ArrowLeft,
  BarChart3,
  Bell,
  BookOpen,
  Bot,
  Brain,
  Ban,
  CalendarDays,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Eye,
  EyeOff,
  Grid2X2,
  ImagePlus,
  KeyRound,
  Maximize2,
  Minimize2,
  MoreVertical,
  Pause,
  Pencil,
  Play,
  Plus,
  LogOut,
  Mail,
  FileText,
  Search,
  Send,
  Settings,
  ShieldAlert,
  RefreshCw,
  Sparkles,
  RotateCcw,
  Square,
  Target,
  Trophy,
  Trash2,
  Users,
  UserRound,
  X,
} from 'lucide-react'
import { useLuminaStore } from './store/useLuminaStore'
import { buildRequestUrl } from './api/client'
import { globalSearchRequest } from './api/search'
import {
  checkNotificationsRequest,
  fetchNotificationPreferencesRequest,
  fetchNotificationsRequest,
  markAllNotificationsReadRequest,
  markNotificationReadRequest,
  updateNotificationPreferencesRequest,
} from './api/notifications'

const pageMeta = {
  dashboard: { title: 'Dashboard', icon: Grid2X2 },
  calendar: { title: 'Calendar', icon: CalendarDays },
  library: { title: 'Library', icon: BookOpen },
  tasks: { title: 'Tasks', icon: CheckSquare },
  timer: { title: 'Focus Timer', icon: Clock3 },
  leaderboard: { title: 'Leaderboard', icon: Trophy },
  admin: { title: 'Admin Panel', icon: ShieldAlert },
  settings: { title: 'Settings', icon: Settings },
  profile: { title: 'Profile', icon: UserRound },
}

const messageMotion = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.22, ease: 'easeOut' },
}

const aiSidebarWidthStorageKey = 'lumina:ai-sidebar-width'
const minAiSidebarWidth = 320
const maxAiSidebarWidth = 440

const clampAiSidebarWidth = (width) => Math.min(maxAiSidebarWidth, Math.max(minAiSidebarWidth, width))
const calendarStartHour = 5
const calendarEndHour = 24

const readStoredAiSidebarWidth = () => {
  if (typeof window === 'undefined') return 360
  const storedWidth = Number(window.localStorage.getItem(aiSidebarWidthStorageKey))
  return Number.isFinite(storedWidth) ? clampAiSidebarWidth(storedWidth) : 360
}

const normalizeMathText = (text) =>
  text
    .replace(/\$\$([^$]+)\$\$/g, '$1')
    .replace(/\$([^$]+)\$/g, '$1')
    .replace(/\\int/g, '∫')
    .replace(/\\,/g, ' ')
    .replace(/\\cos/g, 'cos')
    .replace(/\\sin/g, 'sin')
    .replace(/\\,?\s*dx/g, ' dx')

const renderInlineText = (text) =>
  normalizeMathText(text)
    .split(/(\*\*[^*]+\*\*|`[^`]+`)/g)
    .map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={`${part}-${index}`}>{part.slice(2, -2)}</strong>
      }

      if (part.startsWith('`') && part.endsWith('`')) {
        return <code key={`${part}-${index}`}>{part.slice(1, -1)}</code>
      }

      return part
    })

const isTableBlock = (lines) =>
  lines.length >= 2 &&
  lines[0].includes('|') &&
  /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(lines[1])

const parseTableRow = (line) =>
  line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((cell) => cell.trim())

function ChatMessageContent({ content }) {
  const blocks = content.split(/\n{2,}/).map((block) => block.trim()).filter(Boolean)

  return (
    <div className="chat-content">
      {blocks.map((block, blockIndex) => {
        const lines = block.split('\n').map((line) => line.trim()).filter(Boolean)

        if (isTableBlock(lines)) {
          const headers = parseTableRow(lines[0])
          const rows = lines.slice(2).map(parseTableRow)

          return (
            <div className="chat-table-wrap" key={`table-${blockIndex}`}>
              <table className="chat-table">
                <thead>
                  <tr>
                    {headers.map((header) => (
                      <th key={header}>{renderInlineText(header)}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, rowIndex) => (
                    <tr key={`row-${rowIndex}`}>
                      {headers.map((header, cellIndex) => (
                        <td key={`${header}-${cellIndex}`}>{renderInlineText(row[cellIndex] ?? '')}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        }

        if (lines.length === 1 && /^#{1,6}\s+/.test(lines[0])) {
          return (
            <h4 className="chat-heading" key={`heading-${blockIndex}`}>
              {renderInlineText(lines[0].replace(/^#{1,6}\s+/, ''))}
            </h4>
          )
        }

        if (lines.length === 1 && /^\*\*[^*]+\*\*:?$/.test(lines[0])) {
          return (
            <h4 className="chat-heading" key={`strong-heading-${blockIndex}`}>
              {lines[0].replace(/\*\*/g, '').replace(/:$/, '')}
            </h4>
          )
        }

        return (
          <div className="chat-block" key={`block-${blockIndex}`}>
            {lines.map((line, lineIndex) => {
              if (/^\d+\.\s+/.test(line)) {
                return (
                  <div className="chat-step" key={`${line}-${lineIndex}`}>
                    <span>{line.match(/^(\d+)\./)?.[1]}</span>
                    <p>{renderInlineText(line.replace(/^\d+\.\s+/, ''))}</p>
                  </div>
                )
              }

              if (/^[-*]\s+/.test(line)) {
                return (
                  <div className="chat-bullet-line" key={`${line}-${lineIndex}`}>
                    <span />
                    <p>{renderInlineText(line.replace(/^[-*]\s+/, ''))}</p>
                  </div>
                )
              }

              if (/^#{1,6}\s+/.test(line)) {
                return (
                  <h4 className="chat-heading" key={`${line}-${lineIndex}`}>
                    {renderInlineText(line.replace(/^#{1,6}\s+/, ''))}
                  </h4>
                )
              }

              return <p key={`${line}-${lineIndex}`}>{renderInlineText(line)}</p>
            })}
          </div>
        )
      })}
    </div>
  )
}

function UserAvatar({ user, className = 'avatar-pill', previewUrl = '', alt = 'Profile image' }) {
  const [imageFailed, setImageFailed] = useState(false)
  const imageUrl = previewUrl || user?.profile_picture_url || ''
  const initials = user?.initials || 'LU'

  useEffect(() => {
    setImageFailed(false)
  }, [imageUrl])

  return (
    <div className={className}>
      {imageUrl && !imageFailed ? (
        <img src={imageUrl} alt={alt} onError={() => setImageFailed(true)} />
      ) : (
        initials
      )}
    </div>
  )
}

function App() {
  const page = useLuminaStore((state) => state.page)
  const setPage = useLuminaStore((state) => state.setPage)
  const showFocusOverlay = useLuminaStore((state) => state.showFocusOverlay)
  const tickTimer = useLuminaStore((state) => state.tickTimer)
  const hydrateAuth = useLuminaStore((state) => state.hydrateAuth)
  const authStatus = useLuminaStore((state) => state.authStatus)
  const user = useLuminaStore((state) => state.user)
  const [aiSidebarWidth, setAiSidebarWidth] = useState(readStoredAiSidebarWidth)

  useEffect(() => {
    const timerId = window.setInterval(() => {
      tickTimer()
    }, 1000)

    return () => window.clearInterval(timerId)
  }, [tickTimer])

  useEffect(() => {
    hydrateAuth()
  }, [hydrateAuth])

  useEffect(() => {
    if (authStatus === 'authenticated' && window.location.pathname === '/admin') {
      setPage(user?.role === 'admin' ? 'admin' : 'dashboard')
    }
  }, [authStatus, setPage, user?.role])

  const startAiSidebarResize = (event) => {
    event.preventDefault()
    const startX = event.clientX
    const startWidth = aiSidebarWidth

    const handlePointerMove = (moveEvent) => {
      const nextWidth = clampAiSidebarWidth(startWidth + startX - moveEvent.clientX)
      setAiSidebarWidth(nextWidth)
      window.localStorage.setItem(aiSidebarWidthStorageKey, String(nextWidth))
    }

    const handlePointerUp = () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
      document.body.classList.remove('is-resizing-ai-sidebar')
    }

    document.body.classList.add('is-resizing-ai-sidebar')
    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)
  }

  if (authStatus === 'loading') {
    return <LoadingScreen />
  }

  if (authStatus !== 'authenticated') {
    return <AuthScreen />
  }

  return (
    <div className="lumina-app">
      <NoiseLayer />
      <div className="app-shell" style={{ '--ai-sidebar-width': `${aiSidebarWidth}px` }}>
        <LeftNav currentPage={page} onChange={setPage} />
        <main className="center-column">
          <TopBar />
          <section className="page-scroll">
            <AnimatePresence mode="wait">
              <Motion.div
                key={page}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.28, ease: 'easeOut' }}
              >
                {page === 'dashboard' && <DashboardPage />}
                {page === 'calendar' && <CalendarPage />}
                {page === 'library' && <LibraryPage onJumpToCalendar={() => setPage('calendar')} />}
                {page === 'tasks' && <TasksPage />}
                {page === 'timer' && <TimerPage />}
                {page === 'leaderboard' && <LeaderboardPage />}
                {page === 'admin' && <AdminPage />}
                {page === 'settings' && <SettingsPage />}
                {page === 'profile' && <ProfilePage />}
              </Motion.div>
            </AnimatePresence>
          </section>
        </main>
        <AISidebar onResizeStart={startAiSidebarResize} />
      </div>
      <AnimatePresence>{showFocusOverlay && <FocusOverlay />}</AnimatePresence>
    </div>
  )
}

function NoiseLayer() {
  return (
    <svg className="noise-layer" aria-hidden="true">
      <filter id="noiseFilter">
        <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" stitchTiles="stitch" />
      </filter>
      <rect width="100%" height="100%" filter="url(#noiseFilter)" opacity="0.03" />
    </svg>
  )
}

function LeftNav({ currentPage, onChange }) {
  const logout = useLuminaStore((state) => state.logout)
  const user = useLuminaStore((state) => state.user)

  const navItems = [
    { id: 'dashboard', icon: Grid2X2, label: 'Dashboard' },
    { id: 'calendar', icon: CalendarDays, label: 'Calendar' },
    { id: 'library', icon: BookOpen, label: 'Library' },
    { id: 'tasks', icon: CheckSquare, label: 'Tasks' },
    { id: 'timer', icon: Clock3, label: 'Focus Timer' },
    { id: 'leaderboard', icon: Trophy, label: 'Leaderboard' },
  ]
  const isAdmin = user?.role === 'admin'

  return (
    <aside className="left-nav">
      <div className="nav-stack">
        {navItems.map((item) => {
          const Icon = item.icon
          return (
            <button
              key={item.id}
              type="button"
              className={`icon-button ${currentPage === item.id ? 'is-active' : ''}`}
              onClick={() => onChange(item.id)}
              title={item.label}
              aria-label={item.label}
              data-tooltip={item.label}
            >
              <Icon size={18} />
            </button>
          )
        })}
      </div>

      <div className="nav-divider" />

      {isAdmin && (
        <button
          type="button"
          className={`icon-button ${currentPage === 'admin' ? 'is-active' : ''}`}
          onClick={() => onChange('admin')}
          title="Admin Panel"
          aria-label="Admin Panel"
          data-tooltip="Admin Panel"
        >
          <ShieldAlert size={18} />
        </button>
      )}

      <button
        type="button"
        className={`icon-button ${currentPage === 'settings' ? 'is-active' : ''}`}
        onClick={() => onChange('settings')}
        title="Settings"
        aria-label="Settings"
        data-tooltip="Settings"
      >
        <Settings size={18} />
      </button>

      <button
        type="button"
        className="icon-button logout-sidebar-btn"
        onClick={() => logout()}
        title="Log Out"
        aria-label="Logout"
        data-tooltip="Logout"
      >
        <LogOut size={18} />
      </button>

      <div className="nav-spacer" />

      <button
        type="button"
        className={`sidebar-avatar-button ${currentPage === 'profile' ? 'is-active' : ''}`}
        onClick={() => onChange('profile')}
        title="Profile"
        aria-label="Open profile"
        data-tooltip="Profile"
      >
        <UserAvatar user={user} className="sidebar-avatar" alt={user?.name} />
      </button>
    </aside>
  )
}

function TopBar() {
  const page = useLuminaStore((state) => state.page)
  const searchQuery = useLuminaStore((state) => state.searchQuery)
  const setSearchQuery = useLuminaStore((state) => state.setSearchQuery)
  const setPage = useLuminaStore((state) => state.setPage)
  const user = useLuminaStore((state) => state.user)
  const events = useLuminaStore((state) => state.events)
  const openProfilePage = useLuminaStore((state) => state.openProfilePage)

  const [showNotifications, setShowNotifications] = useState(false)
  const [showExams, setShowExams] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [notificationsCount, setNotificationsCount] = useState(0)
  const [notificationsError, setNotificationsError] = useState('')
  const [isNotificationsLoading, setIsNotificationsLoading] = useState(false)
  const [searchResults, setSearchResults] = useState(null)
  const [isSearching, setIsSearching] = useState(false)
  const [searchError, setSearchError] = useState('')

  const upcomingExams = useMemo(() => events.filter(e => e.type === 'exam'), [events])
  const searchGroups = useMemo(() => {
    const groups = [
      { key: 'books', label: 'Books', Icon: BookOpen, page: 'library' },
      { key: 'events', label: 'Events', Icon: CalendarDays, page: 'calendar' },
      { key: 'exams', label: 'Exams', Icon: ShieldAlert, page: 'calendar' },
      { key: 'classes', label: 'Classes', Icon: Clock3, page: 'calendar' },
      { key: 'tasks', label: 'Tasks', Icon: CheckSquare, page: 'tasks' },
      { key: 'subjects', label: 'Subjects', Icon: Target, page: 'timer' },
      { key: 'notes', label: 'Notes', Icon: FileText, page: 'library' },
    ]

    return groups.map((group) => ({
      ...group,
      items: searchResults?.[group.key] ?? [],
    }))
  }, [searchResults])
  const hasSearchResults = searchGroups.some((group) => group.items.length > 0)

  const getSearchDescription = (item, groupKey) => {
    if (groupKey === 'books') return [item.author, item.subject, item.status].filter(Boolean).join(' · ')
    if (groupKey === 'tasks') return [item.subject, item.group_name, item.due_date ? formatDate(item.due_date) : null].filter(Boolean).join(' · ')
    if (groupKey === 'subjects') return 'Subject'
    if (groupKey === 'notes') return [item.subject, item.content?.slice(0, 80)].filter(Boolean).join(' · ')
    return [item.subject, item.start_time ? formatDate(item.start_time) : null].filter(Boolean).join(' · ')
  }

  const handleSearchResultClick = (group) => {
    setPage(group.page)
    setSearchQuery('')
    setSearchResults(null)
    setSearchError('')
  }

  // Debounced Search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults(null)
      setSearchError('')
      setIsSearching(false)
      return
    }

    setIsSearching(true)
    let isActive = true
    const timer = setTimeout(async () => {
      setSearchError('')
      try {
        const data = await globalSearchRequest(searchQuery.trim())
        if (isActive) setSearchResults(data)
      } catch (err) {
        console.error(err)
        if (isActive) {
          setSearchError(err.message || 'Search failed.')
          setSearchResults(null)
        }
      } finally {
        if (isActive) setIsSearching(false)
      }
    }, 300)

    return () => {
      isActive = false
      clearTimeout(timer)
    }
  }, [searchQuery])

  const loadNotifications = async () => {
    setIsNotificationsLoading(true)
    setNotificationsError('')
    try {
      const payload = await fetchNotificationsRequest()
      setNotifications(payload.notifications || [])
      setNotificationsCount(payload.unreadCount || 0)
    } catch (error) {
      setNotificationsError(error.message || 'Could not load notifications.')
    } finally {
      setIsNotificationsLoading(false)
    }
  }

  useEffect(() => {
    let isMounted = true
    const checkNotifications = async () => {
      try {
        const payload = await checkNotificationsRequest()
        if (isMounted) setNotificationsCount(payload.unreadCount || 0)
      } catch {
        // Keep notification polling quiet; opening the panel shows the concrete error.
      }
    }

    checkNotifications()
    const intervalId = window.setInterval(checkNotifications, 45000)
    return () => {
      isMounted = false
      window.clearInterval(intervalId)
    }
  }, [])

  useEffect(() => {
    if (showNotifications) loadNotifications()
  }, [showNotifications])

  const handleNotificationClick = async (notification) => {
    if (!notification.is_read) {
      await markNotificationReadRequest(notification.id).catch(() => {})
    }
    setNotifications((items) => items.map((item) => (
      item.id === notification.id ? { ...item, is_read: true, read: true } : item
    )))
    setNotificationsCount((count) => Math.max(0, count - (notification.is_read ? 0 : 1)))

    const actionUrl = notification.action_url || notification.actionUrl || ''
    if (actionUrl.includes('/calendar')) setPage('calendar')
    else if (actionUrl.includes('/tasks')) setPage('tasks')
    else if (actionUrl.includes('/timer')) setPage('timer')
    else setPage('dashboard')
    setShowNotifications(false)
  }

  const handleMarkAllNotificationsRead = async () => {
    await markAllNotificationsReadRequest()
    setNotifications((items) => items.map((item) => ({ ...item, is_read: true, read: true })))
    setNotificationsCount(0)
  }

  const handleAiReady = () => {
    const textarea = document.querySelector('.message-box textarea')
    if (textarea) {
      textarea.focus()
      textarea.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }

  return (
    <header className="top-bar">
      <div className="top-title">
        <span>{pageMeta[page]?.title || 'Dashboard'}</span>
      </div>

      <div className="search-container" style={{ position: 'relative' }}>
        <div className="search-shell">
          <Search size={16} />
          <input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search books, events, or subjects"
          />
          {searchQuery && (
            <button
              type="button"
              className="ghost-link"
              style={{ padding: 4, display: 'flex', alignItems: 'center' }}
              onClick={() => setSearchQuery('')}
            >
              <X size={14} />
            </button>
          )}
        </div>
        {searchQuery.trim() && (
          <div className="search-dropdown panel">
            {isSearching ? <p className="mono search-state">Searching...</p> : (
              <>
                {searchError && <p className="mono search-state error">{searchError}</p>}
                {!searchError && searchGroups.map((group) => (
                  group.items.length > 0 && (
                    <div key={group.key} className="search-group">
                      <p className="eyebrow search-group-title">{group.label}</p>
                      {group.items.map((item) => {
                        const title = item.title ?? item.name ?? 'Untitled'
                        const description = getSearchDescription(item, group.key)
                        const Icon = group.Icon
                        return (
                          <button
                            key={`${group.key}-${item.id}`}
                            type="button"
                            className="search-result-item"
                            onClick={() => handleSearchResultClick(group)}
                          >
                            <span className="search-result-icon"><Icon size={14} /></span>
                            <span className="search-result-copy">
                              <strong>{title}</strong>
                              {description && <span>{description}</span>}
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  )
                ))}
                {!searchError && searchResults && !hasSearchResults && (
                  <p className="mono search-state">No results found.</p>
                )}
              </>
            )}
          </div>
        )}
      </div>

      <div className="top-status">
        <div style={{ position: 'relative' }}>
          <button
            type="button"
            className="status-pill danger"
            onClick={() => setShowExams(!showExams)}
            style={{ cursor: 'pointer' }}
          >
            {upcomingExams.length} exams soon
          </button>

          <AnimatePresence>
            {showExams && (
              <Motion.div
                className="notifications-dropdown panel"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                style={{ position: 'absolute', top: '100%', right: 0, width: 280, zIndex: 100, marginTop: 8 }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                  <strong style={{ fontSize: 14 }}>Upcoming Exams</strong>
                  <button type="button" className="ghost-link" onClick={() => setShowExams(false)}>Close</button>
                </div>
                {upcomingExams.length === 0 ? (
                  <p className="mono" style={{ fontSize: 12 }}>All clear!</p>
                ) : (
                  upcomingExams.map(e => (
                    <div key={e.id} style={{ padding: '10px 0', borderBottom: '1px solid var(--border-default)' }}>
                      <strong style={{ display: 'block', fontSize: 13 }}>{e.title}</strong>
                      <span style={{ fontSize: 12, color: '#fca5a5' }}>{formatDate(e.start_time)}</span>
                    </div>
                  ))
                )}
              </Motion.div>
            )}
          </AnimatePresence>
        </div>

        <button
          type="button"
          className="status-pill accent"
          onClick={handleAiReady}
          style={{ cursor: 'pointer' }}
        >
          AI ready
        </button>

        <button
          type="button"
          className="status-pill user-pill"
          onClick={openProfilePage}
          style={{ cursor: 'pointer' }}
        >
          {user?.name ?? 'Student'}
        </button>

        <div style={{ position: 'relative' }}>
          <button type="button" className="icon-button small" title="Notifications" onClick={() => setShowNotifications(!showNotifications)}>
            <Bell size={16} />
            {notificationsCount > 0 && <span className="notification-count" style={{ position: 'absolute', top: -4, right: -4, background: '#f87171', color: 'white', fontSize: 10, borderRadius: 10, padding: '2px 6px' }}>{notificationsCount}</span>}
          </button>
          <AnimatePresence>
            {showNotifications && (
              <Motion.div
                className="notifications-dropdown panel"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                style={{ position: 'absolute', top: '100%', right: 0, width: 320, zIndex: 100, marginTop: 8 }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                  <strong style={{ fontSize: 14 }}>Notifications</strong>
                  <div style={{ display: 'flex', gap: 10 }}>
                    {notifications.length > 0 && (
                      <button type="button" className="ghost-link" onClick={handleMarkAllNotificationsRead}>Mark all read</button>
                    )}
                    <button type="button" className="ghost-link" onClick={() => setShowNotifications(false)}>Close</button>
                  </div>
                </div>
                {isNotificationsLoading ? (
                  <p className="mono" style={{ fontSize: 12 }}>Loading notifications...</p>
                ) : notificationsError ? (
                  <p className="mono" style={{ fontSize: 12, color: '#fca5a5' }}>{notificationsError}</p>
                ) : notifications.length === 0 ? (
                  <p className="mono" style={{ fontSize: 12 }}>No notifications yet.</p>
                ) : (
                  notifications.map(n => (
                    <button
                      key={n.id}
                      type="button"
                      className={`notification-item ${n.is_read ? '' : 'unread'}`}
                      onClick={() => handleNotificationClick(n)}
                    >
                      <strong style={{ display: 'block', fontSize: 13 }}>{n.title}</strong>
                      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{n.message}</span>
                    </button>
                  ))
                )}
              </Motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  )
}

function AuthScreen() {
  const authMode = useLuminaStore((state) => state.authMode)
  const setAuthMode = useLuminaStore((state) => state.setAuthMode)
  const register = useLuminaStore((state) => state.register)
  const login = useLuminaStore((state) => state.login)
  const isAuthBusy = useLuminaStore((state) => state.isAuthBusy)
  const authError = useLuminaStore((state) => state.authError)
  const authErrorContext = useLuminaStore((state) => state.authErrorContext)
  const authMessage = useLuminaStore((state) => state.authMessage)
  const clearAuthFeedback = useLuminaStore((state) => state.clearAuthFeedback)
  const hydrateAuth = useLuminaStore((state) => state.hydrateAuth)
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  })
  const [errors, setErrors] = useState({})
  const [visibleAuthPasswords, setVisibleAuthPasswords] = useState({
    password: false,
    confirmPassword: false,
  })

  const toggleAuthPasswordVisibility = (field) => {
    setVisibleAuthPasswords((state) => ({
      ...state,
      [field]: !state[field],
    }))
  }

  const passwordChecks = useMemo(
    () => ({
      length: form.password.length >= 8,
      upper: /[A-Z]/.test(form.password),
      lower: /[a-z]/.test(form.password),
      number: /[0-9]/.test(form.password),
    }),
    [form.password],
  )

  const passwordStrength = Object.values(passwordChecks).filter(Boolean).length

  const validate = () => {
    const nextErrors = {}
    if (authMode === 'register' && !form.name.trim()) nextErrors.name = 'Name is required.'
    if (!form.email.trim()) nextErrors.email = 'Email is required.'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) nextErrors.email = 'Enter a valid email address.'
    if (!form.password) nextErrors.password = 'Password is required.'
    else {
      if (!passwordChecks.length) nextErrors.password = 'Password must be at least 8 characters.'
      else if (!passwordChecks.upper || !passwordChecks.lower || !passwordChecks.number) {
        nextErrors.password = 'Use uppercase, lowercase, and a number.'
      }
    }
    if (authMode === 'register' && form.confirmPassword !== form.password) {
      nextErrors.confirmPassword = 'Passwords do not match.'
    }

    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const submitAuth = async () => {
    if (!validate()) return

    try {
      if (authMode === 'register') {
        await register({
          name: form.name.trim(),
          email: form.email.trim().toLowerCase(),
          password: form.password,
        })
        return
      }

      await login({
        email: form.email.trim().toLowerCase(),
        password: form.password,
      })
    } catch {
      // Errors are already mapped into store state for inline UI feedback.
    }
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    await submitAuth()
  }

  const handleRetry = async () => {
    clearAuthFeedback()
    if (authErrorContext === 'session') {
      await hydrateAuth()
      return
    }
    await submitAuth()
  }

  return (
    <div className="auth-shell">
      <NoiseLayer />
      <div className="auth-panel">
        <div className="auth-hero">
          <p className="eyebrow">LUMINA ACCESS</p>
          <h1>Study smarter in one place.</h1>
          <p>
            Create your account to unlock the academic dashboard, AI assistant, calendar, and focus system. Logout clears your secure cookies and immediately blocks access to protected pages.
          </p>
          <div className="auth-feature-list">
            <span>Smart weekly planner</span>
            <span>Persistent AI study context</span>
            <span>Focus sessions and reading progress</span>
          </div>
        </div>

        <Motion.form
          className="auth-card"
          onSubmit={handleSubmit}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.24 }}
        >
          <div className="auth-tabs">
            <button
              type="button"
              className={`auth-tab ${authMode === 'register' ? 'active' : ''}`}
              onClick={() => setAuthMode('register')}
            >
              Register
            </button>
            <button
              type="button"
              className={`auth-tab ${authMode === 'login' ? 'active' : ''}`}
              onClick={() => setAuthMode('login')}
            >
              Login
            </button>
          </div>

          <div>
            <h2>{authMode === 'register' ? 'Create your Lumina account' : 'Welcome back'}</h2>
            <p className="auth-subtitle">
              {authMode === 'register'
                ? 'Registration signs you in automatically and opens the dashboard.'
                : 'Sign in with your existing Lumina account.'}
            </p>
          </div>

          {authError && (
            <div className="auth-alert error auth-alert-with-action">
              <span>{authError}</span>
              <button type="button" className="ghost-link" onClick={handleRetry} disabled={isAuthBusy}>
                Retry
              </button>
            </div>
          )}
          {authMessage && !authError && <div className="auth-alert success">{authMessage}</div>}

          {authMode === 'register' && (
            <label className="auth-field">
              <span>Name</span>
              <input
                value={form.name}
                onChange={(event) => setForm((state) => ({ ...state, name: event.target.value }))}
                placeholder="Lena Moore"
              />
              {errors.name && <small>{errors.name}</small>}
            </label>
          )}

          <label className="auth-field">
            <span>Email</span>
            <input
              value={form.email}
              onChange={(event) => setForm((state) => ({ ...state, email: event.target.value }))}
              placeholder="you@university.edu"
              autoComplete="email"
            />
            {errors.email && <small>{errors.email}</small>}
          </label>

          <div className="auth-field">
            <span>Password</span>
            <div className="password-input-shell">
              <input
                type={visibleAuthPasswords.password ? 'text' : 'password'}
                value={form.password}
                onChange={(event) => setForm((state) => ({ ...state, password: event.target.value }))}
                placeholder="Create a strong password"
                autoComplete={authMode === 'register' ? 'new-password' : 'current-password'}
              />
              <button
                type="button"
                className="password-toggle-button"
                onClick={() => toggleAuthPasswordVisibility('password')}
                aria-label={visibleAuthPasswords.password ? 'Hide password' : 'Show password'}
              >
                {visibleAuthPasswords.password ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
            {errors.password && <small>{errors.password}</small>}
          </div>

          {authMode === 'register' && (
            <>
              <div className="strength-panel">
                <div className="strength-bars">
                  {[1, 2, 3, 4].map((bar) => (
                    <span key={bar} className={passwordStrength >= bar ? 'filled' : ''} />
                  ))}
                </div>
                <span className="mono">Strength {passwordStrength}/4</span>
              </div>

              <div className="auth-field">
                <span>Confirm password</span>
                <div className="password-input-shell">
                  <input
                    type={visibleAuthPasswords.confirmPassword ? 'text' : 'password'}
                    value={form.confirmPassword}
                    onChange={(event) => setForm((state) => ({ ...state, confirmPassword: event.target.value }))}
                    placeholder="Repeat your password"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    className="password-toggle-button"
                    onClick={() => toggleAuthPasswordVisibility('confirmPassword')}
                    aria-label={visibleAuthPasswords.confirmPassword ? 'Hide password' : 'Show password'}
                  >
                    {visibleAuthPasswords.confirmPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
                {errors.confirmPassword && <small>{errors.confirmPassword}</small>}
              </div>
            </>
          )}

          <button type="submit" className="primary-button auth-submit" disabled={isAuthBusy}>
            {isAuthBusy
              ? (
                <>
                  <span className="button-spinner" aria-hidden="true" />
                  Processing...
                </>
              )
              : authMode === 'register'
                ? 'Create account'
                : 'Login'}
          </button>
        </Motion.form>
      </div>
    </div>
  )
}

function LoadingScreen() {
  return (
    <div className="auth-shell">
      <NoiseLayer />
      <div className="loading-card panel">
        <div className="gradient-orb" />
        <h2>Loading your Lumina workspace</h2>
        <p>Checking your secure session and restoring dashboard access.</p>
      </div>
    </div>
  )
}

function DashboardPage() {
  const proactiveBanner = useLuminaStore((state) => state.proactiveBanner)
  const proactiveStatus = useLuminaStore((state) => state.proactiveStatus)
  const proactiveError = useLuminaStore((state) => state.proactiveError)
  const refreshProactiveSuggestion = useLuminaStore((state) => state.refreshProactiveSuggestion)
  const acceptProactiveSuggestion = useLuminaStore((state) => state.acceptProactiveSuggestion)
  const dismissBanner = useLuminaStore((state) => state.dismissBanner)
  const events = useLuminaStore((state) => state.events)
  const books = useLuminaStore((state) => state.books)
  const tasks = useLuminaStore((state) => state.tasks)
  const focusLogs = useLuminaStore((state) => state.focusLogs)
  const subjects = useLuminaStore((state) => state.subjects)
  const leaderboard = useLuminaStore((state) => state.leaderboard)
  const fetchLeaderboard = useLuminaStore((state) => state.fetchLeaderboard)
  const setPage = useLuminaStore((state) => state.setPage)

  useEffect(() => {
    fetchLeaderboard({ period: 'weekly', limit: 3 })
  }, [fetchLeaderboard])

  useEffect(() => {
    refreshProactiveSuggestion()
  }, [books, events, focusLogs, tasks, refreshProactiveSuggestion])

  const studySessions = events.filter((event) => event.type === 'study_session')
  const upcomingExams = events.filter((event) => event.type === 'exam')
  const todaySchedule = [...events]
    .map((event) => ({
      ...event,
      ...getEventTimeParts(event),
    }))
    .sort((left, right) => {
      const leftTime = Number.isFinite(left.startHour) ? left.startHour : Number.POSITIVE_INFINITY
      const rightTime = Number.isFinite(right.startHour) ? right.startHour : Number.POSITIVE_INFINITY
      return leftTime - rightTime
    })
    .slice(0, 5)

  const totalFocusHours = (
    focusLogs.reduce((sum, log) => sum + log.total_minutes, 0) / 60
  ).toFixed(1)

  const readingBooks = books.filter((book) => book.status === 'Reading').length

  const stats = [
    {
      label: 'FOCUS HOURS THIS WEEK',
      value: `${totalFocusHours}h`,
      subtitle: 'Deep work minutes tracked',
      trend: '↑ +12%',
      tone: 'good',
      color: subjects.Programming,
      sparkline: [6, 8, 5, 10, 12, 9, 11],
    },
    {
      label: 'STUDY SESSIONS',
      value: `${studySessions.length + 20}`,
      subtitle: 'On streak',
      trend: '↑ On streak',
      tone: 'good',
      color: subjects['General/AI'],
      sparkline: [4, 5, 6, 6, 7, 7, 8],
    },
    {
      label: 'UPCOMING EXAMS',
      value: `${upcomingExams.length}`,
      subtitle: '2 need prep',
      trend: '⚠ Priority',
      tone: 'warn',
      color: '#F87171',
      sparkline: [8, 7, 7, 6, 5, 4, 3],
    },
    {
      label: 'BOOKS READING',
      value: `${readingBooks}`,
      subtitle: 'On pace',
      trend: '→ Stable',
      tone: 'neutral',
      color: subjects.Mathematics,
      sparkline: [3, 3, 4, 4, 4, 5, 5],
    },
  ]

  return (
    <div className="page-grid">
      {(proactiveBanner || proactiveStatus === 'loading' || proactiveError) && (
        <Motion.section className="ai-banner panel" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <div>
            <p className="eyebrow">STUDYGPT PROACTIVE</p>
            <p className="banner-copy">
              {proactiveStatus === 'loading'
                ? 'Finding a useful study suggestion...'
                : proactiveError || proactiveBanner?.message}
            </p>
          </div>
          <div className="banner-actions">
            {proactiveBanner && !proactiveError && (
              <button
                type="button"
                className="primary-button"
                onClick={acceptProactiveSuggestion}
                disabled={proactiveStatus === 'loading'}
              >
                {proactiveBanner.actionLabel}
              </button>
            )}
            {proactiveBanner && (
              <button type="button" className="secondary-button" onClick={dismissBanner} disabled={proactiveStatus === 'loading'}>
                Dismiss
              </button>
            )}
          </div>
        </Motion.section>
      )}

      <section className="stats-row">
        {stats.map((stat) => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </section>

      <section className="dashboard-main">
        <div className="panel">
          <div className="section-head">
            <div>
              <p className="section-title">Today&apos;s Schedule</p>
              <p className="section-subtitle">Everything important in one scan.</p>
            </div>
          </div>
          <div className="schedule-list">
            {todaySchedule.map((event) => (
              <div
                key={event.id}
                className={`schedule-row ${event.type === 'ai_suggestion' ? 'ghost' : ''}`}
                style={{ '--subject-color': subjects[event.subject] }}
              >
                <span className="mono time-label">
                  {formatEventTimeRange(event)}
                </span>
                <div className="schedule-copy">
                  <strong>{event.title}</strong>
                  <span>{event.type === 'exam' ? 'Exam block' : 'Scheduled session'}</span>
                </div>
                <SubjectBadge subject={event.subject} />
              </div>
            ))}
          </div>
        </div>

        <div className="stack-column">
          <div className="panel">
            <div className="section-head">
              <div>
                <p className="section-title">Subject Progress</p>
                <p className="section-subtitle">Reading + focus momentum by subject.</p>
              </div>
            </div>
            <div className="progress-list">
              {Object.entries(subjects)
                .filter(([name]) => name !== 'General/AI')
                .map(([name, color]) => {
                  const totalPages = books
                    .filter((book) => book.subject === name)
                    .reduce((sum, book) => sum + book.total_pages, 0)
                  const currentPages = books
                    .filter((book) => book.subject === name)
                    .reduce((sum, book) => sum + book.current_page, 0)
                  const progress = totalPages ? Math.round((currentPages / totalPages) * 100) : 0

                  return (
                    <div key={name} className="progress-item">
                      <div className="progress-meta">
                        <span>{name}</span>
                        <span className="mono">{progress}%</span>
                      </div>
                      <div className="thin-progress">
                        <Motion.span
                          initial={{ width: 0 }}
                          animate={{ width: `${progress}%` }}
                          transition={{ duration: 0.5, ease: 'easeOut' }}
                          style={{ backgroundColor: color }}
                        />
                      </div>
                    </div>
                  )
                })}
            </div>
          </div>

          <div className="panel">
            <div className="section-head">
              <div>
                <p className="section-title">Exam Countdown</p>
                <p className="section-subtitle">Prep gets priority by default.</p>
              </div>
            </div>
            <div className="countdown-list">
              {upcomingExams.map((event, index) => (
                <div key={event.id} className="countdown-row">
                  <span
                    className="priority-dot"
                    style={{ backgroundColor: index === 0 ? '#F87171' : subjects[event.subject] }}
                  />
                  <div>
                    <strong>{event.title}</strong>
                    <span>{['3 days left', '5 days left', '7 days left'][index] ?? 'Soon'}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <LeaderboardPreview
            rows={leaderboard.weekly.slice(0, 3)}
            onOpen={() => setPage('leaderboard')}
          />
        </div>
      </section>
    </div>
  )
}

function LeaderboardPreview({ rows, onOpen }) {
  return (
    <div className="panel leaderboard-preview">
      <div className="section-head">
        <div>
          <p className="section-title">Top Students</p>
          <p className="section-subtitle">Weekly public leaderboard.</p>
        </div>
      </div>
      <div className="leaderboard-list compact">
        {rows.length === 0 ? (
          <p className="section-subtitle">No rankings yet.</p>
        ) : rows.map((row) => (
          <div key={`${row.rank_number}-${row.username}`} className="leaderboard-row">
            <span className={`rank-pill rank-${row.rank_number}`}>#{row.rank_number}</span>
            <UserAvatar user={{ profile_picture_url: row.avatar_url, initials: row.username?.[0]?.toUpperCase() || 'S' }} className="avatar-pill" />
            <strong>{row.username}</strong>
            <span className="mono">{row.score} pts</span>
          </div>
        ))}
      </div>
      <button type="button" className="secondary-button" onClick={onOpen}>View full leaderboard</button>
    </div>
  )
}

function LeaderboardPage() {
  const leaderboard = useLuminaStore((state) => state.leaderboard)
  const fetchLeaderboard = useLuminaStore((state) => state.fetchLeaderboard)
  const fetchSubjects = useLuminaStore((state) => state.fetchSubjects)
  const subjectRecords = useLuminaStore((state) => state.subjectRecords)
  const [period, setPeriod] = useState('weekly')
  const [subject, setSubject] = useState('all')
  const [search, setSearch] = useState('')
  const subjectOptions = useMemo(() => {
    const names = subjectRecords
      .map((item) => item.name)
      .filter(Boolean)
      .filter((name) => name !== 'General/AI')
    return ['all', ...new Set([...names, 'General/AI'])]
  }, [subjectRecords])

  useEffect(() => {
    fetchSubjects()
  }, [fetchSubjects])

  useEffect(() => {
    if (!subjectOptions.includes(subject)) {
      setSubject('all')
    }
  }, [subject, subjectOptions])

  useEffect(() => {
    fetchLeaderboard({ period, subject, search })
  }, [fetchLeaderboard, period, subject, search])

  const rows = leaderboard[period] ?? []
  const emptyMessage = subject === 'all'
    ? 'No rankings yet.'
    : 'No ranking data for this subject yet.'

  return (
    <div className="page-grid">
      <section className="panel leaderboard-page">
        <div className="section-head wrap">
          <div>
            <p className="section-title">Leaderboard</p>
            <p className="section-subtitle">Public rankings show safe study stats only.</p>
          </div>
          <div className="leaderboard-controls">
            {['daily', 'weekly', 'monthly'].map((item) => (
              <button key={item} type="button" className={`filter-pill ${period === item ? 'active' : ''}`} onClick={() => setPeriod(item)}>
                {item}
              </button>
            ))}
          </div>
        </div>
        <div className="leaderboard-filter-row">
          <select value={subject} onChange={(event) => setSubject(event.target.value)}>
            {subjectOptions.map((item) => (
              <option key={item} value={item}>{item === 'all' ? 'All subjects' : item}</option>
            ))}
          </select>
          <div className="search-shell admin-search">
            <Search size={16} />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search username" />
          </div>
        </div>
        <div className="leaderboard-list">
          {leaderboard.status === 'loading' ? (
            <p className="section-subtitle leaderboard-empty-state">Loading rankings...</p>
          ) : rows.length === 0 ? (
            <p className="section-subtitle leaderboard-empty-state">{emptyMessage}</p>
          ) : (
            rows.map((row) => (
              <div key={`${period}-${row.rank_number}-${row.username}`} className={`leaderboard-row full rank-card-${row.rank_number}`}>
                <span className={`rank-pill rank-${row.rank_number}`}>#{row.rank_number}</span>
                <UserAvatar user={{ profile_picture_url: row.avatar_url, initials: row.username?.[0]?.toUpperCase() || 'S' }} className="avatar-pill large" />
                <div>
                  <strong>{row.username}</strong>
                  <span>{row.badge}</span>
                </div>
                <span className="mono">{row.score} pts</span>
                <span>{row.completed_lessons} lessons</span>
                <span>{row.focus_minutes} min</span>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  )
}

function StatCard({ label, value, subtitle, trend, tone, color, sparkline }) {
  return (
    <Motion.article className="panel stat-card" whileHover={{ scale: 1.04, y: -4 }}>
      <span className="eyebrow mono">{label}</span>
      <strong className="stat-value">{value}</strong>
      <span className="stat-subtitle">{subtitle}</span>
      <div className="sparkline">
        {sparkline.map((bar, index) => (
          <span key={`${label}-${index}`} style={{ height: `${bar * 8}px`, backgroundColor: color }} />
        ))}
      </div>
      <span className={`trend-badge ${tone}`}>{trend}</span>
    </Motion.article>
  )
}

function CalendarPage() {
  const dayNames = useLuminaStore((state) => state.dayNames)
  const timeSlots = useLuminaStore((state) => state.timeSlots)
  const events = useLuminaStore((state) => state.events)
  const subjects = useLuminaStore((state) => state.subjects)
  const subjectRecords = useLuminaStore((state) => state.subjectRecords)
  const conflictWarning = useLuminaStore((state) => state.conflictWarning)
  const clearConflict = useLuminaStore((state) => state.clearConflict)
  const acceptSuggestion = useLuminaStore((state) => state.acceptSuggestion)
  const fetchEvents = useLuminaStore((state) => state.fetchEvents)
  const fetchSubjects = useLuminaStore((state) => state.fetchSubjects)
  const addSubject = useLuminaStore((state) => state.addSubject)
  const calendarStatus = useLuminaStore((state) => state.calendarStatus)
  const createEventAsync = useLuminaStore((state) => state.createEventAsync)
  const updateEventAsync = useLuminaStore((state) => state.updateEventAsync)
  const deleteEventAsync = useLuminaStore((state) => state.deleteEventAsync)
  const addBookSessionToCalendar = useLuminaStore((state) => state.addBookSessionToCalendar)

  const [weekOffset, setWeekOffset] = useState(0)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingEvent, setEditingEvent] = useState(null)

  useEffect(() => {
    fetchEvents()
    fetchSubjects()
  }, [fetchEvents, fetchSubjects])

  // Anchor to today
  const today = new Date('2026-04-27T00:00:00')
  const currentDayOfWeek = today.getDay() || 7
  const monday = new Date(today)
  monday.setDate(monday.getDate() - currentDayOfWeek + 1 + (weekOffset * 7))

  const weekDates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(d.getDate() + i)
    return d
  })

  const startMonth = weekDates[0].toLocaleString('default', { month: 'short' })
  const endMonth = weekDates[6].toLocaleString('default', { month: 'short' })
  const startDay = weekDates[0].getDate()
  const endDay = weekDates[6].getDate()
  const year = weekDates[6].getFullYear()
  const dateString = startMonth === endMonth
    ? `${startMonth} ${startDay} - ${endDay}, ${year}`
    : `${startMonth} ${startDay} - ${endMonth} ${endDay}, ${year}`

  const currentDayIndex = weekOffset === 0 ? currentDayOfWeek - 1 : -1

  const handleAddEvent = () => {
    setEditingEvent(null)
    setIsModalOpen(true)
  }

  const handleEditEvent = (event) => {
    setEditingEvent(event)
    setIsModalOpen(true)
  }

  const handleSaveEvent = async (payload) => {
    try {
      if (editingEvent) {
        await updateEventAsync(editingEvent.id, payload)
      } else {
        await createEventAsync(payload)
      }
      setIsModalOpen(false)
    } catch (e) {
      console.error(e)
    }
  }

  const handleDeleteEvent = async () => {
    if (editingEvent) {
      await deleteEventAsync(editingEvent.id)
      setIsModalOpen(false)
    }
  }

  const weekEvents = events.filter((e) => {
    const eDate = new Date(e.start_time)
    return eDate >= weekDates[0] && eDate < new Date(weekDates[6].getTime() + 86400000)
  }).map(e => {
  const start = new Date(e.start_time)
  const end = new Date(e.end_time)
  const dayIndex = (start.getDay() || 7) - 1
  const startHour = start.getHours() + start.getMinutes() / 60
  const duration = (end - start) / 3600000
    return { ...e, dayIndex, startHour, duration }
  })

  return (
    <div className="page-grid" style={{ position: 'relative' }}>
      <section className="panel">
        <div className="section-head wrap">
          <div className="calendar-head">
            <div className="calendar-nav">
              <button type="button" className="icon-button small" title="Previous month" onClick={() => setWeekOffset(w => w - 4)}>
                <ChevronLeft size={20} />
              </button>
              <button type="button" className="icon-button small" title="Previous week" onClick={() => setWeekOffset(w => w - 1)}>
                <ChevronLeft size={16} />
              </button>
              <strong>{dateString}</strong>
              <button type="button" className="icon-button small" title="Next week" onClick={() => setWeekOffset(w => w + 1)}>
                <ChevronRight size={16} />
              </button>
              <button type="button" className="icon-button small" title="Next month" onClick={() => setWeekOffset(w => w + 4)}>
                <ChevronRight size={20} />
              </button>
            </div>
            <div className="legend">
              <span><i className="legend-dot subject" /> Class</span>
              <span><i className="legend-dot exam" /> Exam</span>
              <span><i className="legend-dot suggestion" /> AI suggestion</span>
            </div>
          </div>
          <button type="button" className="primary-button" onClick={handleAddEvent}>
            + Add event
          </button>
        </div>

        {conflictWarning && (
          <div className="conflict-banner">
            <span>{conflictWarning}</span>
            <button type="button" onClick={clearConflict}>
              Dismiss
            </button>
          </div>
        )}

        <div className="calendar-scroll">
          {calendarStatus === 'loading' ? (
            <p className="mono" style={{ padding: 24, textAlign: 'center' }}>Loading events...</p>
          ) : (
            <div className="calendar-grid">
              <div className="calendar-corner" />
              {dayNames.map((day, index) => (
                <div key={day} className={`day-header ${index === currentDayIndex ? 'is-today' : ''}`}>
                  <span>{day}</span>
                  {index === currentDayIndex && <i className="today-dot" />}
                </div>
              ))}

              {timeSlots.map((hour) => (
                <FragmentRow
                  key={hour}
                  dayNames={dayNames}
                  hour={hour}
                  onDropBook={addBookSessionToCalendar}
                />
              ))}

              <div className="events-layer">
                {weekEvents.map((event) => (
                  <EventBlock
                    key={event.id}
                    event={event}
                    subjectColor={subjects[event.subject] || '#9CA3AF'}
                    onAccept={() => acceptSuggestion(event.id)}
                    onClick={() => handleEditEvent(event)}
                  />
                ))}
              </div>

              {weekEvents.length === 0 && calendarStatus === 'idle' && (
                <div className="calendar-empty-overlay">
                  <p>No events this week.</p>
                  <button type="button" className="ghost-link" onClick={handleAddEvent}>Add one now</button>
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      <AnimatePresence>
        {isModalOpen && (
          <EventModal
            onClose={() => setIsModalOpen(false)}
            onSave={handleSaveEvent}
            onDelete={editingEvent ? handleDeleteEvent : null}
            initialData={editingEvent}
            subjectRecords={subjectRecords}
            onAddSubject={addSubject}
            currentWeekMonday={weekDates[0]}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

function FragmentRow({ dayNames, hour, onDropBook }) {
  return (
    <>
      <div className="time-cell mono">{formatHour(hour)}</div>
      {dayNames.map((day, dayIndex) => (
        <div
          key={`${day}-${hour}`}
          className="calendar-cell"
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault()
            const bookId = event.dataTransfer.getData('text/plain')
            onDropBook(bookId, dayIndex, hour)
          }}
        />
      ))}
    </>
  )
}

function EventBlock({ event, subjectColor, onAccept, onClick }) {
  // Constants based on index.css grid dimensions
  const HEADER_HEIGHT = 56
  const TIME_COL_WIDTH = 68
  const ROW_HEIGHT = 56
  const MARGIN = 2

  const left = `calc(${TIME_COL_WIDTH}px + (${event.dayIndex} * ((100% - ${TIME_COL_WIDTH}px) / 7)) + ${MARGIN}px)`
  const width = `calc((100% - ${TIME_COL_WIDTH}px) / 7 - ${MARGIN * 2}px)`
  const top = HEADER_HEIGHT + (event.startHour - calendarStartHour) * ROW_HEIGHT + MARGIN
  const height = event.duration * ROW_HEIGHT - (MARGIN * 2)

  const isSuggestion = event.type === 'ai_suggestion' && !event.isConfirmed
  const isExam = event.type === 'exam'

  return (
    <Motion.div
      className={`event-block ${isSuggestion ? 'suggestion' : ''} ${isExam ? 'exam' : ''}`}
      style={{
        left,
        width,
        top,
        height,
        color: 'var(--text-primary)',
        borderLeftColor: isExam ? '#F87171' : subjectColor,
        backgroundColor: isExam ? 'rgba(248, 113, 113, 0.15)' : `${subjectColor}20`,
        borderColor: isSuggestion ? subjectColor : 'rgba(255,255,255,0.08)',
        cursor: 'pointer',
        boxSizing: 'border-box',
        overflow: 'hidden',
        zIndex: isSuggestion ? 1 : 2,
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
      }}
      whileHover={{ scale: 1.02, y: -2, zIndex: 10, backgroundColor: isExam ? 'rgba(248, 113, 113, 0.2)' : `${subjectColor}30` }}
      onClick={onClick}
    >
      <div style={{ height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <strong style={{
          display: 'block',
          marginBottom: 2,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          fontSize: 13,
          color: isExam ? '#FCA5A5' : subjectColor,
          fontWeight: 700
        }}>
          {event.title}
        </strong>
        <span className="mono" style={{
          fontSize: 11,
          color: 'rgba(255, 255, 255, 0.85)',
          fontWeight: 600,
          whiteSpace: 'nowrap'
        }}>
          {formatHour(event.startHour)} - {formatHour(event.startHour + event.duration)}
        </span>
        {isSuggestion && (
          <button
            type="button"
            className="ghost-link"
            style={{ fontSize: 11, marginTop: 'auto', display: 'block', textAlign: 'left', color: subjectColor }}
            onClick={(e) => { e.stopPropagation(); onAccept(); }}
          >
            + Add to Calendar
          </button>
        )}
      </div>
    </Motion.div>
  )
}

function EventModal({ onClose, onSave, onDelete, initialData, subjectRecords, onAddSubject, currentWeekMonday }) {
  const subjectOptions = useMemo(() => {
    const names = subjectRecords
      .map((item) => item.name)
      .filter(Boolean)
      .filter((name) => name !== 'General/AI')
    const orderedNames = [...new Set([...names, 'General/AI'])]
    if (initialData?.subject && !orderedNames.includes(initialData.subject)) {
      return [initialData.subject, ...orderedNames]
    }
    return orderedNames
  }, [initialData?.subject, subjectRecords])

  const [title, setTitle] = useState(initialData?.title || '')
  const [subject, setSubject] = useState(initialData?.subject || subjectOptions[0] || 'General/AI')
  const [type, setType] = useState(initialData?.type || 'study_session')
  const [dayIndex, setDayIndex] = useState(initialData ? initialData.dayIndex : 0)
  const [startHour, setStartHour] = useState(initialData ? initialData.startHour : 10)
  const [duration, setDuration] = useState(initialData ? initialData.duration : 1)
  const [newSubjectName, setNewSubjectName] = useState('')
  const [subjectError, setSubjectError] = useState('')

  useEffect(() => {
    if (!subjectOptions.includes(subject)) {
      setSubject(subjectOptions[0] || 'General/AI')
    }
  }, [subject, subjectOptions])

  const validateNewSubject = (rawName) => {
    const name = rawName.trim().replace(/\s+/g, ' ')
    if (!name) return 'Subject name is required.'
    if (name.length > 30) return 'Subject name is too long.'
    if (subjectOptions.some((item) => item.toLowerCase() === name.toLowerCase())) return 'This subject already exists.'
    if (!/[\p{L}\p{N}]/u.test(name)) return 'Subject name must include letters or numbers.'
    return ''
  }

  const handleAddSubject = async () => {
    const name = newSubjectName.trim().replace(/\s+/g, ' ')
    const validationMessage = validateNewSubject(name)
    if (validationMessage) {
      setSubjectError(validationMessage)
      return
    }

    try {
      const createdSubject = await onAddSubject({ name })
      setSubject(createdSubject.name)
      setNewSubjectName('')
      setSubjectError('')
    } catch (error) {
      setSubjectError(error.message || 'Could not add subject.')
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()

    const start = new Date(currentWeekMonday)
    start.setDate(start.getDate() + Number(dayIndex))
    start.setHours(Math.floor(startHour), (startHour % 1) * 60, 0, 0)

    const end = new Date(start)
    end.setMinutes(end.getMinutes() + duration * 60)

    onSave({
      title,
      subject,
      type,
      start_time: start.toISOString(),
      end_time: end.toISOString(),
      is_confirmed: true,
    })
  }

  const handleStartHourChange = (event) => {
    const nextStartHour = Number(event.target.value)
    const maxDuration = Math.max(0.5, calendarEndHour - nextStartHour)
    setStartHour(nextStartHour)
    setDuration((currentDuration) => Math.min(currentDuration, maxDuration))
  }

  return (
    <div className="modal-backdrop">
      <Motion.div
        className="modal-card panel"
        initial={{ opacity: 0, y: 10, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -10, scale: 0.98 }}
        style={{ zIndex: 100 }}
      >
        <div className="section-head wrap">
          <div>
            <p className="section-title">{initialData ? 'Edit Event' : 'Create Event'}</p>
          </div>
          <button type="button" className="icon-button small" onClick={onClose}><X size={16} /></button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <label className="auth-field">
            <span>Title</span>
            <input required value={title} onChange={e => setTitle(e.target.value)} />
          </label>
          <div style={{ display: 'flex', gap: 16 }}>
            <label className="auth-field" style={{ flex: 1 }}>
              <span>Subject</span>
              <select value={subject} onChange={e => setSubject(e.target.value)} style={{ padding: '8px 12px', background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', color: 'var(--text-primary)', borderRadius: 6, outline: 'none' }}>
                {subjectOptions.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </label>
            <label className="auth-field" style={{ flex: 1 }}>
              <span>Type</span>
              <select value={type} onChange={e => setType(e.target.value)} style={{ padding: '8px 12px', background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', color: 'var(--text-primary)', borderRadius: 6, outline: 'none' }}>
                <option value="class">Class</option>
                <option value="study_session">Study Session</option>
                <option value="exam">Exam</option>
              </select>
            </label>
          </div>

          <div className="event-subject-add">
            <div className="subject-add-row">
              <input
                type="text"
                value={newSubjectName}
                onChange={(event) => {
                  setNewSubjectName(event.target.value)
                  if (subjectError) setSubjectError('')
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault()
                    handleAddSubject()
                  }
                }}
                placeholder="Add new subject..."
                maxLength={40}
                aria-label="Add new calendar subject"
              />
              <button type="button" className="secondary-button subject-add-button" onClick={handleAddSubject}>
                <Plus size={15} />
                Add
              </button>
            </div>
            {subjectError && <small>{subjectError}</small>}
          </div>

          <div style={{ display: 'flex', gap: 16 }}>
            <label className="auth-field" style={{ flex: 1 }}>
              <span>Day</span>
              <select value={dayIndex} onChange={e => setDayIndex(Number(e.target.value))} style={{ padding: '8px 12px', background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', color: 'var(--text-primary)', borderRadius: 6, outline: 'none' }}>
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d, i) => <option key={d} value={i}>{d}</option>)}
              </select>
            </label>
            <label className="auth-field" style={{ flex: 1 }}>
              <span>Start Hour</span>
              <input type="number" step="0.5" min={calendarStartHour} max="23.5" required value={startHour} onChange={handleStartHourChange} style={{ padding: '8px 12px', background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', color: 'var(--text-primary)', borderRadius: 6 }} />
            </label>
            <label className="auth-field" style={{ flex: 1 }}>
              <span>Duration (hrs)</span>
              <input type="number" step="0.5" min="0.5" max={calendarEndHour - Number(startHour)} required value={duration} onChange={e => setDuration(Number(e.target.value))} style={{ padding: '8px 12px', background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', color: 'var(--text-primary)', borderRadius: 6 }} />
            </label>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 16 }}>
            {onDelete ? (
              <button type="button" className="ghost-link" style={{ color: '#F87171' }} onClick={onDelete}>Delete Event</button>
            ) : <span />}
            <div style={{ display: 'flex', gap: 12 }}>
              <button type="button" className="secondary-button" onClick={onClose}>Cancel</button>
              <button type="submit" className="primary-button">Save</button>
            </div>
          </div>
        </form>
      </Motion.div>
    </div>
  )
}

const isGoogleBooksBook = (book) =>
  Boolean(book?.is_google_books || book?.google_books_id || book?.source_url?.includes('books.google.'))

const isArchiveBook = (book) =>
  Boolean(book?.is_archive || book?.archive_id || book?.source_url?.includes('archive.org/'))

const isGutenbergBook = (book) =>
  Boolean(book?.is_gutenberg || book?.gutenberg_id || book?.source_url?.includes('gutenberg.org/'))

const isOnlineBook = (book) => isGoogleBooksBook(book) || isArchiveBook(book) || isGutenbergBook(book)

const getGoogleBookId = (book) => {
  if (book?.google_books_id) return book.google_books_id
  if (book?.id?.startsWith('google-')) return book.id.replace(/^google-/, '')

  try {
    return new URL(book?.source_url ?? '').searchParams.get('id')
  } catch {
    return null
  }
}

const getArchiveBookId = (book) => {
  if (book?.archive_id) return book.archive_id
  if (book?.id?.startsWith('archive-')) return book.id.replace(/^archive-/, '')

  try {
    const url = new URL(book?.source_url ?? '')
    const parts = url.pathname.split('/').filter(Boolean)
    if (url.hostname.includes('archive.org') && parts[0] === 'details') return parts[1]
    if (url.hostname.includes('archive.org') && parts[0] === 'download') return parts[1]
  } catch {
    return null
  }

  return null
}

const getGutenbergBookId = (book) => {
  if (book?.gutenberg_id) return book.gutenberg_id
  if (book?.id?.startsWith('gutenberg-')) return book.id.replace(/^gutenberg-/, '')

  try {
    const url = new URL(book?.source_url ?? '')
    const parts = url.pathname.split('/').filter(Boolean)
    if (url.hostname.includes('gutenberg.org') && parts[0] === 'ebooks') return parts[1]
  } catch {
    return null
  }

  return null
}

const getBookReaderUrl = (book) => {
  const gutenbergId = getGutenbergBookId(book)
  if (gutenbergId) return buildRequestUrl(`/api/books/gutenberg/${encodeURIComponent(gutenbergId)}/file`)

  const archiveId = getArchiveBookId(book)
  if (archiveId) return buildRequestUrl(`/api/books/archive/${encodeURIComponent(archiveId)}/file`)

  const id = getGoogleBookId(book)
  return id ? buildRequestUrl(`/api/books/google/${encodeURIComponent(id)}/file`) : ''
}

const getBookTextUrl = (book) => {
  const gutenbergId = getGutenbergBookId(book)
  if (gutenbergId) return buildRequestUrl(`/api/books/gutenberg/${encodeURIComponent(gutenbergId)}/text`)

  const archiveId = getArchiveBookId(book)
  return archiveId ? buildRequestUrl(`/api/books/archive/${encodeURIComponent(archiveId)}/text`) : ''
}

function LibraryPage({ onJumpToCalendar }) {
  const [filter, setFilter] = useState('Open Books')
  const [selectedBookId, setSelectedBookId] = useState(null)
  const [readerBook, setReaderBook] = useState(null)
  const [bookSearchQuery, setBookSearchQuery] = useState('textbooks')
  const books = useLuminaStore((state) => state.books)
  const openBooks = useLuminaStore((state) => state.openBooks)
  const subjects = useLuminaStore((state) => state.subjects)
  const updateBookProgress = useLuminaStore((state) => state.updateBookProgress)
  const fetchOpenBooks = useLuminaStore((state) => state.fetchOpenBooks)
  const addOpenBookToLibrary = useLuminaStore((state) => state.addOpenBookToLibrary)
  const startReadingBook = useLuminaStore((state) => state.startReadingBook)
  const isBooksLoading = useLuminaStore((state) => state.isBooksLoading)

  useEffect(() => {
    if (filter === 'Open Books' && openBooks.length === 0) {
      fetchOpenBooks(bookSearchQuery)
    }
  }, [bookSearchQuery, filter, openBooks.length, fetchOpenBooks])

  const handleOpenBooksSearch = (event) => {
    event.preventDefault()
    setFilter('Open Books')
    fetchOpenBooks(bookSearchQuery)
  }

  const filteredBooks = useMemo(() => {
    if (filter === 'All') return books
    if (filter === 'Open Books') return openBooks
    return books.filter((book) => book.status === filter)
  }, [books, openBooks, filter])

  const selectedBook = [...books, ...openBooks].find((book) => book.id === selectedBookId) ?? null

  const findSavedBook = (book) =>
    books.find((item) => item.source_url && item.source_url === book.source_url) ??
    books.find((item) => item.title === book.title && item.author === book.author)

  const handleReadBook = async (book) => {
    if (isOnlineBook(book)) {
      const savedBook = findSavedBook(book)

      if (savedBook) {
        const nextBook = savedBook.status === 'Reading' ? savedBook : await startReadingBook(savedBook.id)
        setReaderBook({
          ...savedBook,
          ...(nextBook ?? {}),
          google_books_id: getGoogleBookId(book),
          archive_id: getArchiveBookId(book),
          gutenberg_id: getGutenbergBookId(book),
          is_archive: isArchiveBook(book),
          is_gutenberg: isGutenbergBook(book),
          cover_url: book.cover_url,
        })
        return
      }

      const createdBook = await addOpenBookToLibrary(book, 'Reading')
      setReaderBook(createdBook ?? book)
      setFilter('Reading')
      return
    }

    if (book.source_url) {
      setReaderBook(book)
      return
    }

    updateBookProgress(book.id)
    setSelectedBookId(book.id)
  }

  return (
    <div className="page-grid">
      <section className="panel">
        <div className="section-head wrap">
          <div>
            <p className="section-title">Digital Library</p>
            <p className="section-subtitle">Drag any book onto the calendar to create an AI study block.</p>
          </div>
          <button type="button" className="primary-button" onClick={onJumpToCalendar}>
            Open Calendar Drop Zone
          </button>
        </div>

        <div className="pill-row">
          {['All', 'Reading', 'Want to Read', 'Completed', 'Open Books'].map((option) => (
            <button
              key={option}
              type="button"
              className={`filter-pill ${filter === option ? 'active' : ''}`}
              onClick={() => setFilter(option)}
            >
              {option}
            </button>
          ))}
        </div>

        {filter === 'Open Books' && (
          <form className="book-search-row" onSubmit={handleOpenBooksSearch}>
            <div className="search-shell">
              <Search size={16} />
              <input
                value={bookSearchQuery}
                onChange={(event) => setBookSearchQuery(event.target.value)}
                placeholder="Search open books by title, author, ISBN, or subject"
              />
            </div>
            <button type="submit" className="secondary-button" disabled={isBooksLoading}>
              Search
            </button>
          </form>
        )}

        {isBooksLoading && filter === 'Open Books' ? (
          <div style={{ padding: 40, textAlign: 'center' }} className="mono">Searching open books...</div>
        ) : (
          <div className="library-grid">
            {filteredBooks.map((book) => (
              <BookCard
                key={book.id}
                book={book}
                subjectColor={book.is_open_access ? '#6366F1' : subjects[book.subject]}
                onUpdate={() => handleReadBook(book)}
                onRead={() => handleReadBook(book)}
                onAdd={() => addOpenBookToLibrary(book)}
                isAdded={Boolean(findSavedBook(book))}
                isOnlineResult={isOnlineBook(book) && !findSavedBook(book)}
              />
            ))}
            {filteredBooks.length === 0 && (
              <div className="empty-library-state">
                <BookOpen size={22} />
                <strong>No books found</strong>
                <span>Search open book sources or add a book to your library.</span>
              </div>
            )}
          </div>
        )}
      </section>

      <AnimatePresence>
        {readerBook && (
          <BookReaderModal book={readerBook} onClose={() => setReaderBook(null)} />
        )}
        {selectedBook && (
          <Motion.div className="modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <Motion.div
              className="modal-card"
              initial={{ opacity: 0, y: 16, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.98 }}
            >
              <div className="section-head wrap">
                <div>
                  <p className="section-title">Progress Updated</p>
                  <p className="section-subtitle">{selectedBook.title}</p>
                </div>
                <button type="button" className="icon-button small" onClick={() => setSelectedBookId(null)}>
                  <X size={16} />
                </button>
              </div>
              <p className="modal-copy">
                Current progress is now {selectedBook.current_page}/{selectedBook.total_pages} pages. The dashboard banner has been refreshed with a proactive StudyGPT suggestion.
              </p>
              <button type="button" className="primary-button" onClick={() => setSelectedBookId(null)}>
                Continue
              </button>
            </Motion.div>
          </Motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function BookCard({ book, subjectColor, onUpdate, onRead, onAdd, isAdded, isOnlineResult }) {
  const progress = Math.round((book.current_page / book.total_pages) * 100)
  const providerName = book.provider || (isGutenbergBook(book) ? 'Project Gutenberg' : isArchiveBook(book) ? 'Internet Archive' : 'Google Books')

  const handleReadNow = (e) => {
    e.stopPropagation()
    onRead?.()
  }

  const handleAdd = (e) => {
    e.stopPropagation()
    if (onAdd) onAdd()
  }

  return (
    <Motion.div
      role="button"
      tabIndex={0}
      className={`book-card ${book.is_open_access ? 'is-open' : ''}`}
      whileHover={{ scale: 1.02, y: -4 }}
      draggable="true"
      onDragStart={(event) => {
        event.dataTransfer.setData('text/plain', book.id)
      }}
      onClick={onUpdate}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onUpdate()
        }
      }}
      style={{ cursor: 'pointer', textAlign: 'left', position: 'relative' }}
    >
      {isOnlineResult && !isAdded && (
        <button
          type="button"
          className="add-book-btn"
          onClick={handleAdd}
          title="Add to My Library"
        >
          <Plus size={14} />
        </button>
      )}

      <div className="book-cover" style={{ backgroundColor: `${subjectColor}26` }}>
        {book.cover_url ? (
          <img src={book.cover_url} alt="" />
        ) : (
          <span className="book-icon">{book.icon || 'Book'}</span>
        )}
        {!isOnlineResult && <ProgressRing progress={progress} color={subjectColor} />}
      </div>
      <div className="book-meta">
        <strong>{book.title}</strong>
        <span className="mono book-author">{book.author}</span>
      </div>
      {!isOnlineResult && (
        <div className="thin-progress">
          <span style={{ width: `${progress}%`, backgroundColor: subjectColor }} />
        </div>
      )}
      <div className="book-footer">
        <span className="mono">{isOnlineResult ? providerName : `${book.current_page}/${book.total_pages} pages`}</span>
        <span className="status-chip">{book.status}</span>
      </div>

      <div className="book-overlay">
        {isOnlineBook(book) || book.source_url ? (
          <div
            className="primary-button"
            style={{ display: 'flex', justifyContent: 'center' }}
            onClick={handleReadNow}
          >
            Read in app
          </div>
        ) : (
          <div className="primary-button" style={{ display: 'flex', justifyContent: 'center', pointerEvents: 'none' }}>
            Update progress
          </div>
        )}
      </div>
    </Motion.div>
  )
}

const getReaderStorageKey = (book) => `lumina:reader:${book.id ?? getGoogleBookId(book) ?? book.title}`

function BookReaderModal({ book, onClose }) {
  const embedUrl = getBookReaderUrl(book)
  const textUrl = getBookTextUrl(book)
  const updateBookReadingProgress = useLuminaStore((state) => state.updateBookReadingProgress)
  const readerContainerRef = useRef(null)
  const renditionRef = useRef(null)
  const [readerFileUrl, setReaderFileUrl] = useState('')
  const [readerFileType, setReaderFileType] = useState('')
  const [textPages, setTextPages] = useState([])
  const [pendingEpubUrl, setPendingEpubUrl] = useState('')
  const [isEpubReady, setIsEpubReady] = useState(false)
  const [pdfPageCount, setPdfPageCount] = useState(0)
  const [currentPage, setCurrentPage] = useState(Math.max(book.current_page ?? 1, 1))
  const currentPageRef = useRef(Math.max(book.current_page ?? 1, 1))
  const [sessionSeconds, setSessionSeconds] = useState(0)
  const [newWord, setNewWord] = useState('')
  const [readerError, setReaderError] = useState('')
  const [readerState, setReaderState] = useState(() => {
    try {
      const stored = window.localStorage.getItem(getReaderStorageKey(book))
      return stored ? JSON.parse(stored) : { words: [], notes: '', focusGoal: 'Read one section and write 3 key ideas.' }
    } catch {
      return { words: [], notes: '', focusGoal: 'Read one section and write 3 key ideas.' }
    }
  })
  const totalPages = textPages.length || pdfPageCount || book.total_pages || 1
  const progress = totalPages ? Math.round((currentPage / totalPages) * 100) : 0
  const sessionMinutes = Math.floor(sessionSeconds / 60)
  const sessionTime = `${String(sessionMinutes).padStart(2, '0')}:${String(sessionSeconds % 60).padStart(2, '0')}`

  useEffect(() => {
    window.localStorage.setItem(getReaderStorageKey(book), JSON.stringify(readerState))
  }, [book, readerState])

  useEffect(() => {
    let objectUrl = ''
    let cancelled = false

    const loadBook = async () => {
      if (!embedUrl) {
        setReaderError('This book does not provide an in-app readable file.')
        return
      }

      try {
        setReaderError('')
        setIsEpubReady(false)
        setTextPages([])
        setReaderFileType('loading')

        if (import.meta.env.DEV) {
          console.log('Selected book:', book)
          console.log('Book content:', book?.content)
          console.log('Book pages:', book?.pages)
          console.log('Book URL:', book?.pdfUrl || book?.readUrl || book?.downloadUrl || book?.download_url || book?.reader_url || embedUrl || textUrl)
        }

        if ((isGutenbergBook(book) || isArchiveBook(book)) && textUrl) {
          const response = await fetch(textUrl, { credentials: 'include' })

          if (!response.ok && isGutenbergBook(book)) {
            throw new Error('This book text could not be loaded inside the app.')
          }

          if (response.ok) {
            const payload = await response.json()
            const pages = Array.isArray(payload?.data?.pages) && payload.data.pages.length > 0
              ? payload.data.pages
              : [payload?.data?.text ?? '']
            const firstPage = Math.min(Math.max(book.current_page || 1, 1), pages.length || 1)
            currentPageRef.current = firstPage
            setCurrentPage(firstPage)
            setTextPages(pages)
            setPdfPageCount(0)
            setReaderFileType('text')
            return
          }
        }

        if (isArchiveBook(book)) {
          const firstPage = Math.min(Math.max(book.current_page || 1, 1), book.total_pages || 1)
          currentPageRef.current = firstPage
          setCurrentPage(firstPage)
          setReaderFileUrl(embedUrl)
          setPdfPageCount(book.total_pages || 1)
          setReaderFileType('pdf')
          return
        }

        const response = await fetch(embedUrl, { credentials: 'include', method: 'HEAD' })

        if (!response.ok) {
          throw new Error(
            response.status === 409
              ? 'Google Books is asking for verification for this download, so this book cannot be opened inside the app. Try another open book result.'
              : 'This book does not provide readable content.',
          )
        }

        const contentType = response.headers.get('content-type') ?? ''
        if (cancelled) return

        if (contentType.includes('pdf')) {
          const firstPage = Math.min(Math.max(book.current_page || 1, 1), book.total_pages || 1)
          currentPageRef.current = firstPage
          setCurrentPage(firstPage)
          setReaderFileUrl(embedUrl)
          setPdfPageCount(book.total_pages || 1)
          setReaderFileType('pdf')
          return
        }

        if (!contentType.includes('epub')) {
          throw new Error('Google Books returned a webpage instead of a readable book file. Try another open book result.')
        }

        const fileResponse = await fetch(embedUrl, { credentials: 'include' })

        if (!fileResponse.ok) {
          throw new Error(
            fileResponse.status === 409
              ? 'Google Books is asking for verification for this download, so this book cannot be opened inside the app. Try another open book result.'
              : 'This book does not provide readable EPUB content.',
          )
        }

        const blob = await fileResponse.blob()
        if (cancelled) return

        objectUrl = URL.createObjectURL(blob)
        setPendingEpubUrl(objectUrl)
        setReaderFileType('epub')
      } catch (error) {
        if (!cancelled) {
          setIsEpubReady(false)
          setReaderFileType('')
          setReaderError(error.message || 'Unable to open this book inside the app.')
        }
      }
    }

    loadBook()

    return () => {
      cancelled = true
      setIsEpubReady(false)
      renditionRef.current?.destroy?.()
      renditionRef.current = null
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [book, embedUrl, textUrl])

  useEffect(() => {
    if (readerFileType !== 'epub' || !pendingEpubUrl || !readerContainerRef.current) return undefined

    let cancelled = false

    const loadEpub = async () => {
      try {
        setIsEpubReady(false)
        const epubBook = ePub(pendingEpubUrl)
        const rendition = epubBook.renderTo(readerContainerRef.current, {
          width: '100%',
          height: '100%',
          spread: 'none',
          flow: 'paginated',
        })

        renditionRef.current = rendition
        await rendition.display()
        if (!cancelled) setIsEpubReady(true)
      } catch {
        if (!cancelled) {
          setReaderError('Unable to prepare the EPUB reader.')
        }
      }
    }

    loadEpub()

    return () => {
      cancelled = true
      setIsEpubReady(false)
      renditionRef.current?.destroy?.()
      renditionRef.current = null
    }
  }, [pendingEpubUrl, readerFileType])

  const saveProgress = async (nextPage = currentPageRef.current) => {
    const updated = await updateBookReadingProgress(book.id, nextPage)
    if (updated) {
      currentPageRef.current = updated.current_page
      setCurrentPage(updated.current_page)
    }
  }

  const goToPage = (nextPage) => {
    const boundedPage = Math.min(Math.max(nextPage, 1), totalPages)
    currentPageRef.current = boundedPage
    setCurrentPage(boundedPage)
    updateBookReadingProgress(book.id, boundedPage)
  }

  const goToEpubPage = async (direction) => {
    const rendition = renditionRef.current
    if (!isEpubReady || !rendition) return

    try {
      if (direction < 0) {
        await rendition.prev()
        goToPage(currentPage - 1)
        return
      }

      await rendition.next()
      goToPage(currentPage + 1)
    } catch {
      setReaderError('This EPUB page could not be changed. Try another book or reopen the reader.')
    }
  }

  useEffect(() => {
    const timer = window.setInterval(() => {
      setSessionSeconds((seconds) => {
        return seconds + 1
      })
    }, 1000)

    return () => {
      window.clearInterval(timer)
      saveProgress(currentPageRef.current)
    }
  }, [book.id, updateBookReadingProgress])

  const addWord = () => {
    const word = newWord.trim()
    if (!word) return
    setReaderState((state) => ({
      ...state,
      words: [...new Set([...state.words, word])],
    }))
    setNewWord('')
  }

  return (
    <Motion.div className="reader-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <Motion.div
        className="reader-modal"
        initial={{ opacity: 0, y: 18, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 12, scale: 0.98 }}
      >
        <div className="reader-header">
          <div>
            <p className="section-title">{book.title}</p>
            <p className="section-subtitle">{book.author} · page {currentPage}/{totalPages} · {progress}% · {sessionTime}</p>
          </div>
          <button type="button" className="icon-button small" onClick={onClose} aria-label="Close reader">
            <X size={16} />
          </button>
        </div>

        <div className="reader-body">
          <section className="reader-frame-shell">
            {readerError ? (
              <div className="reader-fallback">
                <BookOpen size={28} />
                <strong>Readable file unavailable</strong>
                <span>{readerError}</span>
              </div>
            ) : readerFileType === 'loading' ? (
              <div className="reader-fallback">
                <BookOpen size={28} />
                <strong>Loading readable file...</strong>
                <span>Preparing the book inside Lumina.</span>
              </div>
            ) : readerFileType === 'pdf' ? (
              <>
                <iframe
                  key={`${readerFileUrl}-${currentPage}`}
                  className="book-reader-frame"
                  src={`${readerFileUrl}#page=${currentPage}&zoom=page-fit`}
                  title={`${book.title} reader`}
                />
                <div className="epub-reader-controls">
                  <button type="button" className="secondary-button" onClick={() => goToPage(currentPage - 1)} disabled={currentPage <= 1}>
                    Previous
                  </button>
                  <span className="reader-page-pill">Page {currentPage} / {totalPages}</span>
                  <button type="button" className="secondary-button" onClick={() => goToPage(currentPage + 1)} disabled={currentPage >= totalPages}>
                    Next
                  </button>
                </div>
              </>
            ) : readerFileType === 'text' ? (
              <>
                <article className="text-reader-frame">
                  {(textPages[currentPage - 1] ?? '').split(/\n{2,}/).map((paragraph, index) => (
                    <p key={`${currentPage}-${index}`}>{paragraph}</p>
                  ))}
                </article>
                <div className="epub-reader-controls">
                  <button type="button" className="secondary-button" onClick={() => goToPage(currentPage - 1)} disabled={currentPage <= 1}>
                    Previous
                  </button>
                  <span className="reader-page-pill">Page {currentPage} / {totalPages}</span>
                  <button type="button" className="secondary-button" onClick={() => goToPage(currentPage + 1)} disabled={currentPage >= totalPages}>
                    Next
                  </button>
                </div>
              </>
            ) : readerFileType === 'epub' ? (
              <>
                <div className="epub-reader-frame" ref={readerContainerRef} />
                <div className="epub-reader-controls">
                  <button type="button" className="secondary-button" onClick={() => goToEpubPage(-1)} disabled={!isEpubReady || currentPage <= 1}>
                    Previous
                  </button>
                  <span className="reader-page-pill">Page {currentPage} / {totalPages}</span>
                  <button type="button" className="secondary-button" onClick={() => goToEpubPage(1)} disabled={!isEpubReady || currentPage >= totalPages}>
                    Next
                  </button>
                </div>
              </>
            ) : (
              <div className="reader-fallback">
                <BookOpen size={28} />
                <strong>Reader is getting ready</strong>
                <span>The book controls will appear after the file loads.</span>
              </div>
            )}
          </section>

          <aside className="reader-study-panel">
            <div className="reader-progress-card">
              <div className="reader-progress-head">
                <span>Tracked progress</span>
                <strong>{progress}%</strong>
              </div>
              <div className="thin-progress">
                <span style={{ width: `${progress}%`, backgroundColor: 'var(--accent)' }} />
              </div>
              <p className="reader-helper-text">Progress saves automatically as you move through pages in Lumina’s reader.</p>
            </div>

            <label className="reader-field">
              <span>Focus goal</span>
              <input
                value={readerState.focusGoal}
                onChange={(event) => setReaderState((state) => ({ ...state, focusGoal: event.target.value }))}
              />
            </label>

            <label className="reader-field">
              <span>Reading notes</span>
              <textarea
                value={readerState.notes}
                onChange={(event) => setReaderState((state) => ({ ...state, notes: event.target.value }))}
                placeholder="Key ideas, formulas, chapter summary..."
                rows={6}
              />
            </label>

            <div className="reader-field">
              <span>New words</span>
              <div className="reader-word-row">
                <input
                  value={newWord}
                  onChange={(event) => setNewWord(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault()
                      addWord()
                    }
                  }}
                  placeholder="Add vocabulary"
                />
                <button type="button" className="secondary-button" onClick={addWord}>
                  Add
                </button>
              </div>
              <div className="reader-word-list">
                {readerState.words.map((word) => (
                  <span key={word}>{word}</span>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </Motion.div>
    </Motion.div>
  )
}

function ProgressRing({ progress, color }) {
  const radius = 12
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (progress / 100) * circumference

  return (
    <svg className="progress-ring" viewBox="0 0 32 32">
      <circle cx="16" cy="16" r={radius} className="progress-ring-track" />
      <Motion.circle
        cx="16"
        cy="16"
        r={radius}
        className="progress-ring-value"
        style={{ stroke: color }}
        strokeDasharray={circumference}
        animate={{ strokeDashoffset: offset }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      />
    </svg>
  )
}

function TasksPage() {
  const tasks = useLuminaStore((state) => state.tasks)
  const subjects = useLuminaStore((state) => state.subjects)
  const events = useLuminaStore((state) => state.events)
  const toggleTaskAsync = useLuminaStore((state) => state.toggleTaskAsync)
  const createTaskAsync = useLuminaStore((state) => state.createTaskAsync)
  const updateTaskAsync = useLuminaStore((state) => state.updateTaskAsync)
  const deleteTaskAsync = useLuminaStore((state) => state.deleteTaskAsync)
  const fetchTasksAsync = useLuminaStore((state) => state.fetchTasksAsync)
  const sendMessage = useLuminaStore((state) => state.sendMessage)

  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [editingTask, setEditingTask] = useState(null)
  const [deleteCandidate, setDeleteCandidate] = useState(null)
  const [openTaskMenu, setOpenTaskMenu] = useState(null)
  const [deletingTaskId, setDeletingTaskId] = useState(null)
  const [taskError, setTaskError] = useState('')

  useEffect(() => {
    fetchTasksAsync()
  }, [fetchTasksAsync])

  const grouped = ['Today', 'Upcoming']
  const getExamStartDate = (event) => {
    const startValue = event.start_time ?? event.startTime ?? event.date
    if (!startValue && Number.isFinite(Number(event.startHour))) {
      const start = new Date()
      start.setHours(Math.floor(Number(event.startHour)), (Number(event.startHour) % 1) * 60, 0, 0)
      return start
    }

    if (event.date && event.startTime) {
      const combined = new Date(`${event.date}T${event.startTime}`)
      if (Number.isFinite(combined.getTime())) return combined
    }

    const start = startValue ? new Date(startValue) : null
    return start && Number.isFinite(start.getTime()) ? start : null
  }

  const upcomingExams = useMemo(() => {
    const exams = events
      .map((event) => {
        const normalizedType = String(event.type ?? event.eventType ?? event.category ?? '').trim().toLowerCase()
        return {
          ...event,
          normalizedType,
          startDate: getExamStartDate(event),
        }
      })
      .filter((event) => {
        if (event.normalizedType !== 'exam') return false
        if (!event.startDate) return true
        return event.startDate > new Date()
      })
      .sort((left, right) => {
        if (!left.startDate && !right.startDate) return 0
        if (!left.startDate) return 1
        if (!right.startDate) return -1
        return left.startDate - right.startDate
      })

    console.log('Tasks upcoming exams:', exams)
    return exams
  }, [events])

  const todayTasks = tasks.filter(t => t.group_name === 'Today')
  const completion = todayTasks.length > 0
    ? Math.round((todayTasks.filter(t => t.is_done).length / todayTasks.length) * 100)
    : 0

  const handleQuickAdd = async (e) => {
    if (e.key === 'Enter' && newTaskTitle.trim()) {
      await createTaskAsync({
        title: newTaskTitle,
        group_name: 'Today',
        subject: 'General/AI'
      })
      setNewTaskTitle('')
    }
  }

  const handleSaveTask = async (payload) => {
    if (!editingTask) return
    setTaskError('')
    await updateTaskAsync(editingTask.id, payload)
    setEditingTask(null)
  }

  const handleConfirmDeleteTask = async () => {
    if (!deleteCandidate) return
    setTaskError('')
    setDeletingTaskId(deleteCandidate.id)
    try {
      await deleteTaskAsync(deleteCandidate.id)
      setDeleteCandidate(null)
    } catch (error) {
      setTaskError(error.message || 'Could not delete task. Please try again.')
    } finally {
      setDeletingTaskId(null)
    }
  }

  const getUrgency = (event) => {
    if (!event.startDate) return { label: 'Prep status not set', color: '#818CF8' }
    const diff = event.startDate - new Date()
    const hours = diff / 3600000
    if (hours < 72 && hours > 0) return { label: 'Urgent preparation needed', color: '#F87171' }
    return { label: 'Prep planned', color: '#818CF8' }
  }

  const formatTimeLeft = (date) => {
    if (!date) return ''
    const diffMs = date - new Date()
    if (!Number.isFinite(diffMs) || diffMs <= 0) return 'Starting soon'

    const totalHours = Math.ceil(diffMs / 3600000)
    const days = Math.floor(totalHours / 24)
    const hours = totalHours % 24

    if (days > 0 && hours > 0) return `${days}d ${hours}h left`
    if (days > 0) return `${days}d left`
    return `${totalHours}h left`
  }

  const formatExamDateLine = (event) => {
    if (!event.startDate) return 'Date not set'
    return `${formatDate(event.startDate)} · ${formatTimeLeft(event.startDate)}`
  }

  return (
    <div className="two-column">
      <section className="panel">
        <div className="section-head">
          <div>
            <p className="section-title">Task Flow</p>
            <p className="section-subtitle">Simple, visible, and tied to real deadlines.</p>
          </div>
        </div>

        <div className="quick-add" style={{ padding: '0 0 20px 0' }}>
          <input
            type="text"
            placeholder="Add a task to Today... (Enter to save)"
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            onKeyDown={handleQuickAdd}
            className="search-input"
            style={{ width: '100%', height: 44, padding: '0 16px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12 }}
          />
        </div>

        {taskError && (
          <div className="auth-alert error" role="alert">
            {taskError}
          </div>
        )}

        <div className="task-groups">
          {grouped.map((group) => (
            <div key={group} className="task-group">
              <h3>{group}</h3>
              <div className="task-list">
                {tasks
                  .filter((task) => task.group_name === group)
                  .map((task) => (
                    <div
                      key={task.id}
                      className={`task-row ${task.is_done ? 'done' : ''}`}
                      style={{
                        opacity: task.is_done ? 0.6 : 1,
                        transition: 'var(--transition-fast)'
                      }}
                    >
                      <button type="button" className="checkbox-shell" onClick={() => toggleTaskAsync(task.id)} aria-label={task.is_done ? 'Mark task incomplete' : 'Mark task complete'}>
                        <Motion.span
                          className="checkbox-mark"
                          animate={{ scale: task.is_done ? 1 : 0, opacity: task.is_done ? 1 : 0 }}
                          transition={{ duration: 0.18 }}
                        />
                      </button>
                      <div className="task-copy">
                        <strong style={{ textDecoration: task.is_done ? 'line-through' : 'none' }}>
                          {task.title}
                        </strong>
                        <span>{task.due_date ? new Date(task.due_date).toLocaleDateString() : 'No date'}</span>
                      </div>
                      <SubjectBadge subject={task.subject} color={subjects[task.subject]} />
                      <div className="task-actions">
                        <button
                          type="button"
                          className="task-action-trigger"
                          onClick={() => setOpenTaskMenu((current) => current === task.id ? null : task.id)}
                          aria-label={`Task actions for ${task.title}`}
                          title="Task actions"
                        >
                          <MoreVertical size={16} />
                        </button>
                        {openTaskMenu === task.id && (
                          <div className="task-action-menu">
                            <button type="button" onClick={() => { setEditingTask(task); setOpenTaskMenu(null) }}>
                              <Pencil size={14} />
                              Edit
                            </button>
                            <button type="button" onClick={() => { setDeleteCandidate(task); setOpenTaskMenu(null) }}>
                              <Trash2 size={14} />
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          ))}
          <div className="task-group">
            <h3>Upcoming Exams</h3>
            <div className="task-list">
              {upcomingExams.length === 0 ? (
                <p className="section-subtitle">No upcoming exams.</p>
              ) : upcomingExams.map((event) => {
                const urgency = getUrgency(event)
                return (
                  <div key={event.id ?? `${event.title}-${event.subject}`} className="task-row exam-task-card">
                    <span
                      className="priority-dot"
                      style={{ backgroundColor: urgency.color }}
                    />
                    <div className="task-copy">
                      <strong>{event.title || event.name || 'Untitled exam'}</strong>
                      <span>{event.subject || 'General/AI'} · {formatExamDateLine(event)}</span>
                      <span className="exam-prep-status">{urgency.label}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </section>

      <aside className="stack-column">
        <section className="panel">
          <div className="section-head">
            <div>
              <p className="section-title">Exam Countdown</p>
              <p className="section-subtitle">Linked to calendar exam data.</p>
            </div>
          </div>
          <div className="countdown-list">
            {upcomingExams.length === 0 ? (
              <p className="section-subtitle">No upcoming exams.</p>
            ) : upcomingExams.map((event) => {
              const urgency = getUrgency(event)
              return (
                <div key={event.id} className="countdown-row exam-countdown-row">
                  <span
                    className="priority-dot"
                    style={{ backgroundColor: urgency.color }}
                  />
                  <div>
                    <strong>{event.title || event.name || 'Untitled exam'}</strong>
                    <span>{event.subject || 'General/AI'} · {formatExamDateLine(event)}</span>
                    <span className="exam-prep-status">{urgency.label}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </section>
        <section className="panel">
          <div className="section-head">
            <div>
              <p className="section-title">Today&apos;s Completion</p>
              <p className="section-subtitle">Momentum matters more than volume.</p>
            </div>
          </div>
          <div className="completion-meter">
            <div className="completion-ring">
              <ProgressRing progress={completion} color="#6366F1" />
            </div>
            <strong>{completion}%</strong>
          </div>
        </section>
      </aside>
      <AnimatePresence>
        {editingTask && (
          <TaskEditModal
            task={editingTask}
            subjects={Object.keys(subjects)}
            onClose={() => setEditingTask(null)}
            onSave={handleSaveTask}
          />
        )}
        {deleteCandidate && (
          <ConfirmDialog
            message="Are you sure you want to delete this task?"
            isBusy={deletingTaskId === deleteCandidate.id}
            onCancel={() => {
              if (!deletingTaskId) setDeleteCandidate(null)
            }}
            onConfirm={handleConfirmDeleteTask}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

const formatDateTimeLocalValue = (value) => {
  if (!value) return ''
  const date = new Date(value)
  if (!Number.isFinite(date.getTime())) return ''
  const pad = (part) => String(part).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function TaskEditModal({ task, subjects, onClose, onSave }) {
  const subjectOptions = [...new Set([task.subject, ...subjects].filter(Boolean))]
  const [form, setForm] = useState({
    title: task.title ?? '',
    subject: task.subject ?? 'General/AI',
    due_date: formatDateTimeLocalValue(task.due_date),
    group_name: task.group_name ?? 'Today',
  })
  const [error, setError] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    const title = form.title.trim()
    const subject = form.subject.trim()

    if (!title) {
      setError('Task title is required.')
      return
    }

    if (!subject) {
      setError('Subject is required.')
      return
    }

    if (form.due_date) {
      const dueDate = new Date(form.due_date)
      if (!Number.isFinite(dueDate.getTime())) {
        setError('Due date must be valid.')
        return
      }
    }

    setIsSaving(true)
    try {
      await onSave({
        title,
        subject,
        due_date: form.due_date || null,
        group_name: form.group_name,
      })
    } catch (saveError) {
      setError(saveError.message || 'Could not save task. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="modal-backdrop">
      <Motion.div className="modal-card panel" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
        <div className="section-head wrap">
          <p className="section-title">Edit Task</p>
          <button type="button" className="icon-button small" onClick={onClose} aria-label="Close edit task" disabled={isSaving}><X size={16} /></button>
        </div>
        <form className="settings-form-v2" onSubmit={handleSubmit}>
          <label className="auth-field">
            <span>Title</span>
            <input value={form.title} onChange={(event) => setForm((state) => ({ ...state, title: event.target.value }))} disabled={isSaving} />
          </label>
          <div className="form-grid">
            <label className="auth-field">
              <span>Subject</span>
              <select value={form.subject} onChange={(event) => setForm((state) => ({ ...state, subject: event.target.value }))} disabled={isSaving}>
                {subjectOptions.map((subject) => <option key={subject} value={subject}>{subject}</option>)}
              </select>
            </label>
            <label className="auth-field">
              <span>Group</span>
              <select value={form.group_name} onChange={(event) => setForm((state) => ({ ...state, group_name: event.target.value }))} disabled={isSaving}>
                <option value="Today">Today</option>
                <option value="Upcoming">Upcoming</option>
                <option value="Exams">Exams</option>
              </select>
            </label>
            <label className="auth-field">
              <span>Due date</span>
              <input type="datetime-local" value={form.due_date} onChange={(event) => setForm((state) => ({ ...state, due_date: event.target.value }))} disabled={isSaving} />
            </label>
          </div>
          {error && <small className="subject-error">{error}</small>}
          <div className="modal-actions">
            <button type="button" className="secondary-button" onClick={onClose} disabled={isSaving}>Cancel</button>
            <button type="submit" className="primary-button" disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </Motion.div>
    </div>
  )
}

function ConfirmDialog({ message, onCancel, onConfirm, isBusy = false }) {
  return (
    <div className="modal-backdrop">
      <Motion.div className="modal-card panel confirm-card" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
        <p className="section-title">Delete task</p>
        <p className="section-subtitle">{message}</p>
        <div className="modal-actions">
          <button type="button" className="secondary-button" onClick={onCancel} disabled={isBusy}>Cancel</button>
          <button type="button" className="secondary-button danger-action" onClick={onConfirm} disabled={isBusy}>
            {isBusy ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </Motion.div>
    </div>
  )
}

function TimerPage() {
  const timer = useLuminaStore((state) => state.timer)
  const subjects = useLuminaStore((state) => state.subjects)
  const subjectRecords = useLuminaStore((state) => state.subjectRecords)
  const focusLogs = useLuminaStore((state) => state.focusLogs)
  const setTimerMode = useLuminaStore((state) => state.setTimerMode)
  const setTimerSubject = useLuminaStore((state) => state.setTimerSubject)
  const setTimerDuration = useLuminaStore((state) => state.setTimerDuration)
  const fetchSubjects = useLuminaStore((state) => state.fetchSubjects)
  const addSubject = useLuminaStore((state) => state.addSubject)
  const renameSubject = useLuminaStore((state) => state.renameSubject)
  const deleteSubject = useLuminaStore((state) => state.deleteSubject)
  const startTimer = useLuminaStore((state) => state.startTimer)
  const pauseTimer = useLuminaStore((state) => state.pauseTimer)
  const stopTimer = useLuminaStore((state) => state.stopTimer)
  const resetTimer = useLuminaStore((state) => state.resetTimer)
  const [isZenMode, setIsZenMode] = useState(false)
  const [durationInput, setDurationInput] = useState('')
  const [subjectInput, setSubjectInput] = useState('')
  const [subjectError, setSubjectError] = useState('')
  const [activeSubjectMenu, setActiveSubjectMenu] = useState(null)

  const timerColorMap = {
    focus: '#6366F1',
    short: '#34D399',
    long: '#38BDF8',
  }

  const selectedDuration = timer.durations?.[timer.mode] ?? timer.remainingSeconds
  const selectedMinutes = Math.round(selectedDuration / 60)
  const progress = ((selectedDuration - timer.remainingSeconds) / selectedDuration) * 100
  const isRunning = timer.status === 'running'
  const isPaused = timer.status === 'paused'
  const selectableSubjects = subjectRecords.filter((subject) => subject.name !== 'General/AI')

  const validateSubjectName = (rawName, ignoreId = null) => {
    const name = rawName.trim().replace(/\s+/g, ' ')

    if (!name) return 'Subject name is required.'
    if (name.length < 2) return 'Subject name is too short.'
    if (name.length > 30) return 'Subject name is too long.'
    if (!/[\p{L}\p{N}]/u.test(name)) return 'Subject name must include letters or numbers.'
    if (subjectRecords.some((subject) => subject.id !== ignoreId && subject.name.toLowerCase() === name.toLowerCase())) {
      return 'This subject already exists.'
    }

    return ''
  }

  useEffect(() => {
    setDurationInput(String(selectedMinutes))
  }, [selectedMinutes, timer.mode])

  useEffect(() => {
    fetchSubjects()
  }, [fetchSubjects])

  useEffect(() => {
    if (!isZenMode) return undefined

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsZenMode(false)
        if (document.fullscreenElement && document.exitFullscreen) {
          document.exitFullscreen().catch(() => {})
        }
      }
    }

    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
        setIsZenMode(false)
      }
    }

    document.body.classList.add('zen-mode-active')
    window.addEventListener('keydown', handleKeyDown)
    document.addEventListener('fullscreenchange', handleFullscreenChange)

    return () => {
      document.body.classList.remove('zen-mode-active')
      window.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
    }
  }, [isZenMode])

  const toggleZenMode = async () => {
    if (isZenMode) {
      setIsZenMode(false)
      if (document.fullscreenElement && document.exitFullscreen) {
        await document.exitFullscreen().catch(() => {})
      }
      return
    }

    setIsZenMode(true)
    if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
      await document.documentElement.requestFullscreen().catch(() => {})
    }
  }

  const handleDurationChange = (event) => {
    const nextValue = event.target.value
    if (nextValue === '' || !/^\d+$/.test(nextValue)) return

    const nextMinutes = Number(nextValue)
    if (!Number.isInteger(nextMinutes) || nextMinutes < 1) return

    setDurationInput(nextValue)
    setTimerDuration(timer.mode, nextMinutes)
  }

  const handleDurationBlur = () => {
    const nextMinutes = Number(durationInput)
    if (!Number.isInteger(nextMinutes) || nextMinutes < 1) {
      setDurationInput(String(selectedMinutes))
    }
  }

  const handleAddSubject = async () => {
    const name = subjectInput.trim().replace(/\s+/g, ' ')
    const validationMessage = validateSubjectName(name)
    if (validationMessage) {
      setSubjectError(validationMessage)
      return
    }

    try {
      await addSubject({ name })
      setSubjectInput('')
      setSubjectError('')
    } catch (error) {
      setSubjectError(error.message || 'Could not add subject.')
    }
  }

  const handleSubjectKeyDown = (event) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      handleAddSubject()
    }
  }

  const handleRenameSubject = async (subject) => {
    setActiveSubjectMenu(null)
    const nextName = window.prompt('Rename subject', subject.name)
    if (nextName === null) return

    const normalizedName = nextName.trim().replace(/\s+/g, ' ')
    const validationMessage = validateSubjectName(normalizedName, subject.id)
    if (validationMessage) {
      setSubjectError(validationMessage)
      return
    }

    try {
      await renameSubject(subject.id, normalizedName)
      setSubjectError('')
    } catch (error) {
      setSubjectError(error.message || 'Could not rename subject.')
    }
  }

  const handleDeleteSubject = async (subject) => {
    setActiveSubjectMenu(null)
    const confirmed = window.confirm(`Delete "${subject.name}"? Existing focus logs will keep their historical subject name.`)
    if (!confirmed) return

    try {
      await deleteSubject(subject.id)
      setSubjectError('')
    } catch (error) {
      setSubjectError(error.message || 'Could not delete subject.')
    }
  }

  return (
    <div className="two-column">
      <section className={`panel timer-panel ${isZenMode ? 'zen-mode-overlay' : ''}`}>
        <button
          type="button"
          className="timer-zoom-button"
          onClick={toggleZenMode}
          title={isZenMode ? 'Exit full screen' : 'Full screen timer'}
          aria-label={isZenMode ? 'Exit full screen timer' : 'Open full screen timer'}
        >
          {isZenMode ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
        </button>
        <div className="mode-selector">
          {[
            ['focus', 'Focus'],
            ['short', 'Short break'],
            ['long', 'Long break'],
          ].map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={`mode-pill ${timer.mode === id ? 'active' : ''}`}
              onClick={() => setTimerMode(id)}
              disabled={timer.status === 'running'}
            >
              {label}
            </button>
          ))}
        </div>

        <label className="duration-control">
          <span className="mono">Minutes</span>
          <input
            type="number"
            min="1"
            step="1"
            inputMode="numeric"
            value={durationInput}
            onChange={handleDurationChange}
            onBlur={handleDurationBlur}
            disabled={timer.status !== 'idle'}
            aria-label={`Set ${timer.mode} duration in minutes`}
          />
        </label>

        <div className="pomo-ring-shell">
          <PomoRing
            progress={progress}
            color={timerColorMap[timer.mode]}
            time={formatSeconds(timer.remainingSeconds)}
            mode={timer.mode}
            subject={timer.selectedSubject}
          />
        </div>

        <div className="session-dots">
          {Array.from({ length: 4 }).map((_, index) => (
            <span key={index} className={`session-dot ${index < timer.completedCycles ? 'filled' : ''}`} />
          ))}
        </div>

        <div className="timer-actions">
          <button type="button" className="primary-button" onClick={startTimer} disabled={isRunning}>
            <Play size={16} />
            {isPaused ? 'Resume' : 'Start'}
          </button>
          <button type="button" className="secondary-button" onClick={pauseTimer} disabled={!isRunning}>
            <Pause size={16} />
            Pause
          </button>
          <button type="button" className="secondary-button stop-button" onClick={stopTimer} disabled={timer.status === 'idle'}>
            <Square size={15} />
            Stop
          </button>
          <button type="button" className="secondary-button" onClick={resetTimer}>
            <RotateCcw size={16} />
            Reset
          </button>
        </div>
      </section>

      <aside className="stack-column">
        <section className="panel">
          <div className="section-head">
            <div>
              <p className="section-title">Subject Selector</p>
              <p className="section-subtitle">Keep your focus logs meaningful.</p>
            </div>
          </div>
          <div className="subject-add-row">
            <input
              type="text"
              value={subjectInput}
              onChange={(event) => {
                setSubjectInput(event.target.value)
                if (subjectError) setSubjectError('')
              }}
              onKeyDown={handleSubjectKeyDown}
              placeholder="Add a subject..."
              maxLength={40}
              aria-label="Add a subject"
            />
            <button type="button" className="secondary-button subject-add-button" onClick={handleAddSubject}>
              <Plus size={15} />
              Add
            </button>
          </div>
          {subjectError && <p className="subject-error">{subjectError}</p>}
          {selectableSubjects.length === 0 ? (
            <p className="subject-empty">No subjects yet. Add your first subject to start tracking focus.</p>
          ) : (
            <div className="subject-grid">
              {selectableSubjects.map((subject) => {
                const name = subject.name
                const color = subject.color_hex ?? subjects[name] ?? '#9CA3AF'
                return (
                <div key={subject.id} className="subject-chip-wrap">
                <button
                  type="button"
                  className={`subject-chip ${timer.selectedSubject === name ? 'active' : ''}`}
                  style={{ '--chip-color': color }}
                  onClick={() => setTimerSubject(name)}
                >
                  {name}
                </button>
                  <button
                    type="button"
                    className="subject-menu-trigger"
                    onClick={() => setActiveSubjectMenu((current) => (current === subject.id ? null : subject.id))}
                    aria-label={`Manage ${name}`}
                    title={`Manage ${name}`}
                  >
                    <MoreVertical size={15} />
                  </button>
                  {activeSubjectMenu === subject.id && (
                    <div className="subject-menu">
                      <button type="button" onClick={() => handleRenameSubject(subject)}>
                        <Pencil size={14} />
                        Rename
                      </button>
                      <button type="button" onClick={() => handleDeleteSubject(subject)}>
                        <Trash2 size={14} />
                        Delete
                      </button>
                    </div>
                  )}
                </div>
                )
              })}
            </div>
          )}
        </section>
        <section className="panel">
          <div className="section-head">
            <div>
              <p className="section-title">Weekly Focus</p>
              <p className="section-subtitle">A simple bar chart of your study rhythm.</p>
            </div>
          </div>
          <div className="weekly-bars">
            {focusLogs.slice(-7).map((log) => (
              <div key={`${log.day}-${log.subject}`} className="weekly-bar">
                <span style={{ height: `${Math.max(24, log.total_minutes)}px` }} />
                <label>{log.day}</label>
              </div>
            ))}
          </div>
        </section>
      </aside>
    </div>
  )
}

function PomoRing({ progress, color, time, mode, subject }) {
  const radius = 86
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (progress / 100) * circumference

  return (
    <div className="pomo-ring">
      <svg viewBox="0 0 220 220">
        <circle cx="110" cy="110" r={radius} className="pomo-track" />
        <Motion.circle
          cx="110"
          cy="110"
          r={radius}
          className="pomo-value"
          style={{ stroke: color }}
          strokeDasharray={circumference}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      </svg>
      <div className="pomo-content">
        <strong>{time}</strong>
        <span className="mono">{mode}</span>
        <span>{subject}</span>
      </div>
    </div>
  )
}

function FocusOverlay() {
  const timer = useLuminaStore((state) => state.timer)
  const toggleFocusOverlay = useLuminaStore((state) => state.toggleFocusOverlay)

  return (
    <Motion.div
      className="focus-overlay"
      initial={{ opacity: 0, backdropFilter: 'blur(0px)' }}
      animate={{ opacity: 1, backdropFilter: 'blur(8px)' }}
      exit={{ opacity: 0, backdropFilter: 'blur(0px)' }}
      transition={{ duration: 0.3 }}
    >
      <PomoRing
        progress={0}
        color="#6366F1"
        time={formatSeconds(timer.remainingSeconds)}
        mode={timer.mode}
        subject={timer.selectedSubject}
      />
      <button type="button" className="ghost-link" onClick={toggleFocusOverlay}>
        Exit focus mode
      </button>
    </Motion.div>
  )
}

function AISidebar({ onResizeStart }) {
  const chat = useLuminaStore((state) => state.chat)
  const events = useLuminaStore((state) => state.events)
  const tasks = useLuminaStore((state) => state.tasks)
  const getAIContext = useLuminaStore((state) => state.getAIContext)
  const sendChat = useLuminaStore((state) => state.sendChat)
  const clearChat = useLuminaStore((state) => state.clearChat)
  const isAiBusy = useLuminaStore((state) => state.isAiBusy)
  const aiError = useLuminaStore((state) => state.aiError)
  const selectedSubject = useLuminaStore((state) => state.timer.selectedSubject)
  const [message, setMessage] = useState('')
  const chatHistoryRef = useRef(null)

  const todayTasks = tasks.filter(t => t.group_name === 'Today' && !t.is_done)
  const urgentExam = events
    .filter(e => e.type === 'exam')
    .sort((a, b) => new Date(a.start_time) - new Date(b.start_time))[0]

  const buildStudyPlanPrompt = () => {
    const taskList = todayTasks.map(t => `- ${t.title} (${t.subject || 'General'})`).join('\n')
    const examInfo = urgentExam
      ? `Most urgent exam: "${urgentExam.title}" (${urgentExam.subject || 'General'})`
      : 'No upcoming exams'
    return `Generate a detailed study plan for today. ${examInfo}. Today's pending tasks:\n${taskList || '- No tasks yet'}\n\nSuggest a prioritized schedule with specific time blocks and sub-tasks.`
  }

  const quickActions = [
    { label: 'Study plan for today', prompt: buildStudyPlanPrompt },
    { label: 'Explain integration by parts', prompt: () => 'Explain integration by parts' },
    { label: 'Focus tips', prompt: () => 'Focus tips' },
    { label: 'Summarize chapter', prompt: () => 'Summarize chapter' },
  ]

  const sendStudyMessage = async (nextMessage) => {
    if (!nextMessage.trim() || isAiBusy) return
    await sendChat(nextMessage.trim(), {
      context: getAIContext(),
      subject: selectedSubject,
    })
  }

  const handleSend = async () => {
    if (!message.trim()) return
    const nextMessage = message.trim()
    setMessage('')
    await sendStudyMessage(nextMessage)
  }

  const handleMessageKeyDown = (event) => {
    if (event.key !== 'Enter' || event.shiftKey) return
    event.preventDefault()
    handleSend()
  }

  useEffect(() => {
    const node = chatHistoryRef.current
    if (!node) return
    node.scrollTop = node.scrollHeight
  }, [chat, isAiBusy])

  return (
    <aside className="ai-sidebar">
      <button
        type="button"
        className="ai-resize-handle"
        onPointerDown={onResizeStart}
        aria-label="Resize StudyGPT chat"
        title="Resize chat"
      />
      <div className="ai-glow glow-top" />
      <div className="ai-glow glow-bottom" />

      <div className="ai-header">
        <div className="orb-shell">
          <div className="gradient-orb" />
        </div>
        <div>
          <strong>StudyGPT</strong>
          <div className="context-status">
            <span className="online-dot" />
            Context loaded
          </div>
        </div>
        <button
          type="button"
          className="ai-clear-button"
          onClick={clearChat}
          disabled={isAiBusy}
          aria-label="Clear StudyGPT chat"
          title="Clear chat"
        >
          <Trash2 size={16} />
        </button>
      </div>

      <div className="quick-row">
        {quickActions.map((action) => (
          <button
            key={action.label}
            type="button"
            className="quick-chip"
            onClick={() => sendStudyMessage(action.prompt())}
            disabled={isAiBusy}
          >
            {action.label}
          </button>
        ))}
      </div>

      <div className="chat-history" ref={chatHistoryRef}>
        {chat.map((item) => (
          <Motion.div
            key={item.id}
            className={`chat-bubble ${item.role === 'user' ? 'user' : 'assistant'} ${item.tone === 'error' ? 'error' : ''}`}
            {...messageMotion}
          >
            {item.role === 'assistant' ? (
              item.content ? <ChatMessageContent content={item.content} /> : <span className="typing-text">Thinking...</span>
            ) : (
              item.content
            )}
          </Motion.div>
        ))}
      </div>

      <div className="message-box">
        <textarea
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          onKeyDown={handleMessageKeyDown}
          placeholder="Ask for a study plan, concept help, or a summary..."
          rows={3}
          disabled={isAiBusy}
        />
        <button type="button" className="send-button" onClick={handleSend} disabled={isAiBusy || !message.trim()}>
          <Send size={16} />
        </button>
      </div>
      {aiError && <div className="ai-error">{aiError}</div>}
    </aside>
  )
}

function AdminPage() {
  const user = useLuminaStore((state) => state.user)
  const admin = useLuminaStore((state) => state.admin)
  const fetchAdminData = useLuminaStore((state) => state.fetchAdminData)
  const searchAdminUsers = useLuminaStore((state) => state.searchAdminUsers)
  const searchAdminBooks = useLuminaStore((state) => state.searchAdminBooks)
  const updateAdminUser = useLuminaStore((state) => state.updateAdminUser)
  const deleteAdminUser = useLuminaStore((state) => state.deleteAdminUser)
  const deleteAdminBook = useLuminaStore((state) => state.deleteAdminBook)
  const reprocessAdminBook = useLuminaStore((state) => state.reprocessAdminBook)
  const createAdminEvent = useLuminaStore((state) => state.createAdminEvent)
  const updateAdminEvent = useLuminaStore((state) => state.updateAdminEvent)
  const deleteAdminEvent = useLuminaStore((state) => state.deleteAdminEvent)
  const fetchAdminLeaderboard = useLuminaStore((state) => state.fetchAdminLeaderboard)
  const setAdminLeaderboardVisibility = useLuminaStore((state) => state.setAdminLeaderboardVisibility)
  const resetAdminLeaderboard = useLuminaStore((state) => state.resetAdminLeaderboard)
  const fetchAdminActivity = useLuminaStore((state) => state.fetchAdminActivity)
  const [section, setSection] = useState('dashboard')
  const [userSearch, setUserSearch] = useState('')
  const [bookSearch, setBookSearch] = useState('')
  const [eventForm, setEventForm] = useState({
    title: '',
    type: 'exam',
    user_id: '',
    assign_to_all: false,
    start_time: '',
    end_time: '',
  })

  useEffect(() => {
    fetchAdminData()
  }, [fetchAdminData])

  if (user?.role !== 'admin') {
    return (
      <section className="panel admin-denied">
        <ShieldAlert size={32} />
        <p className="section-title">Access denied</p>
        <p className="section-subtitle">Only admin users can open this panel.</p>
      </section>
    )
  }

  const tabs = [
    ['dashboard', Grid2X2, 'Dashboard'],
    ['users', Users, 'Users'],
    ['books', BookOpen, 'Books'],
    ['events', CalendarDays, 'Events'],
    ['analytics', BarChart3, 'Reports'],
    ['leaderboard', Trophy, 'Leaderboard'],
  ]

  const overviewCards = [
    ['Total users', admin.overview?.total_users ?? 0],
    ['Active today', admin.overview?.active_users_today ?? 0],
    ['Uploaded books', admin.overview?.total_uploaded_books ?? 0],
    ['Study events', admin.overview?.total_study_events ?? 0],
    ['Focus minutes', admin.overview?.total_focus_minutes ?? 0],
    ['AI requests today', admin.overview?.ai_requests_today ?? 0],
    ['Recent errors', admin.overview?.recent_errors ?? 0],
  ]

  const confirmAction = async (message, action) => {
    if (!window.confirm(message)) return
    await action()
  }

  const handleCreateEvent = async (event) => {
    event.preventDefault()
    await createAdminEvent({
      ...eventForm,
      start_time: new Date(eventForm.start_time).toISOString(),
      end_time: new Date(eventForm.end_time).toISOString(),
    })
    setEventForm({
      title: '',
      type: 'exam',
      user_id: '',
      assign_to_all: false,
      start_time: '',
      end_time: '',
    })
  }

  const handleEditEvent = async (item) => {
    const nextTitle = window.prompt('Edit event title', item.title)
    if (!nextTitle || nextTitle.trim() === item.title) return
    await updateAdminEvent(item.id, { title: nextTitle.trim() })
  }

  const exportLeaderboardCsv = () => {
    const columns = [
      'rank_number',
      'user_id',
      'name',
      'email',
      'username',
      'score',
      'completed_lessons',
      'focus_minutes',
      'completed_tasks',
      'completed_exams',
      'last_active_at',
      'leaderboard_visible',
      'suspicious_activity_warnings',
    ]
    const rows = admin.leaderboard.map((row) =>
      columns.map((column) => `"${String(row[column] ?? '').replace(/"/g, '""')}"`).join(','),
    )
    const blob = new Blob([[columns.join(','), ...rows].join('\n')], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'study-gpt-leaderboard.csv'
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="admin-layout">
      <aside className="admin-sidebar panel">
        <div>
          <p className="section-title">Admin</p>
          <p className="section-subtitle">Manage StudyGPT operations.</p>
        </div>
        <div className="admin-nav">
          {tabs.map(([id, Icon, label]) => (
            <button
              key={id}
              type="button"
              className={`admin-nav-item ${section === id ? 'active' : ''}`}
              onClick={() => setSection(id)}
            >
              <Icon size={16} />
              {label}
            </button>
          ))}
        </div>
      </aside>

      <section className="admin-main">
        {admin.status === 'error' && <div className="auth-alert error">{admin.error}</div>}
        {section === 'dashboard' && (
          <div className="admin-section">
            <div className="admin-card-grid">
              {overviewCards.map(([label, value]) => (
                <div key={label} className="panel admin-stat">
                  <span>{label}</span>
                  <strong>{value}</strong>
                </div>
              ))}
            </div>
            <div className="panel">
              <p className="section-title">Recent operational notes</p>
              <p className="section-subtitle">
                Failed uploads and indexing errors appear in the Recent errors metric. AI request tracking is ready for a future request log table.
              </p>
            </div>
          </div>
        )}

        {section === 'users' && (
          <div className="panel admin-section">
            <div className="section-head wrap">
              <div>
                <p className="section-title">User Management</p>
                <p className="section-subtitle">Search, block, promote, or delete users.</p>
              </div>
              <div className="search-shell admin-search">
                <Search size={16} />
                <input
                  value={userSearch}
                  onChange={(event) => {
                    setUserSearch(event.target.value)
                    searchAdminUsers(event.target.value)
                  }}
                  placeholder="Search users"
                />
              </div>
            </div>
            <div className="admin-table-scroll">
              <div className="admin-table">
              {admin.users.map((item) => (
                <div key={item.id} className="admin-row user-row">
                  <div>
                    <strong>{item.name}</strong>
                    <span>{item.email}</span>
                  </div>
                  <span className="status-chip">{item.role}</span>
                  <span>{item.is_blocked ? 'Blocked' : 'Active'}</span>
                  <span>{formatDate(item.last_active_at || item.created_at)}</span>
                  <div className="admin-row-actions">
                    <button type="button" className="secondary-button" onClick={() => updateAdminUser(item.id, { role: item.role === 'admin' ? 'user' : 'admin' })}>
                      {item.role === 'admin' ? 'Make User' : 'Make Admin'}
                    </button>
                    <button type="button" className="secondary-button" onClick={() => updateAdminUser(item.id, { is_blocked: !item.is_blocked })}>
                      <Ban size={14} />
                      {item.is_blocked ? 'Unblock' : 'Block'}
                    </button>
                    <button type="button" className="secondary-button danger-action" onClick={() => confirmAction(`Delete ${item.email}?`, () => deleteAdminUser(item.id))}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
              </div>
            </div>
          </div>
        )}

        {section === 'books' && (
          <div className="panel admin-section">
            <div className="section-head wrap">
              <div>
                <p className="section-title">Books & Materials</p>
                <p className="section-subtitle">Review uploads, ownership, file size, and indexing status.</p>
              </div>
              <div className="search-shell admin-search">
                <Search size={16} />
                <input
                  value={bookSearch}
                  onChange={(event) => {
                    setBookSearch(event.target.value)
                    searchAdminBooks(event.target.value)
                  }}
                  placeholder="Search books"
                />
              </div>
            </div>
            <div className="admin-table-scroll">
              <div className="admin-table">
              {admin.books.map((book) => (
                <div key={book.id} className="admin-row book-row">
                  <div>
                    <strong>{book.title}</strong>
                    <span>{book.owner_name} · {book.owner_email}</span>
                  </div>
                  <span>{formatBytes(book.file_size_bytes)}</span>
                  <span>{formatDate(book.created_at)}</span>
                  <span className="status-chip">{book.upload_status}</span>
                  <div className="admin-row-actions">
                    <button type="button" className="secondary-button" onClick={() => reprocessAdminBook(book.id)}>
                      <RefreshCw size={14} />
                      Reprocess
                    </button>
                    <button type="button" className="secondary-button danger-action" onClick={() => confirmAction(`Delete ${book.title}?`, () => deleteAdminBook(book.id))}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
              </div>
            </div>
          </div>
        )}

        {section === 'events' && (
          <div className="admin-section">
            <form className="panel admin-event-form" onSubmit={handleCreateEvent}>
              <p className="section-title">Create Event or Exam</p>
              <div className="form-grid">
                <label className="auth-field">
                  <span>Title</span>
                  <input value={eventForm.title} required onChange={(e) => setEventForm(s => ({ ...s, title: e.target.value }))} />
                </label>
                <label className="auth-field">
                  <span>Type</span>
                  <select value={eventForm.type} onChange={(e) => setEventForm(s => ({ ...s, type: e.target.value }))}>
                    <option value="exam">Exam</option>
                    <option value="study_session">Study session</option>
                    <option value="ai_suggestion">AI suggestion</option>
                  </select>
                </label>
                <label className="auth-field">
                  <span>User ID</span>
                  <input disabled={eventForm.assign_to_all} value={eventForm.user_id} onChange={(e) => setEventForm(s => ({ ...s, user_id: e.target.value }))} />
                </label>
                <label className="auth-field">
                  <span>Start</span>
                  <input type="datetime-local" required value={eventForm.start_time} onChange={(e) => setEventForm(s => ({ ...s, start_time: e.target.value }))} />
                </label>
                <label className="auth-field">
                  <span>End</span>
                  <input type="datetime-local" required value={eventForm.end_time} onChange={(e) => setEventForm(s => ({ ...s, end_time: e.target.value }))} />
                </label>
              </div>
              <label className="admin-checkbox">
                <input type="checkbox" checked={eventForm.assign_to_all} onChange={(e) => setEventForm(s => ({ ...s, assign_to_all: e.target.checked }))} />
                Assign to all active users
              </label>
              <button type="submit" className="primary-button">Create Event</button>
            </form>
            <div className="panel admin-table-scroll">
              <div className="admin-table">
              {admin.events.map((event) => (
                <div key={event.id} className="admin-row event-row">
                  <div>
                    <strong>{event.title}</strong>
                    <span>{event.owner_name} · {event.owner_email}</span>
                  </div>
                  <span className="status-chip">{event.type}</span>
                  <span>{formatDate(event.start_time)}</span>
                  <div className="admin-row-actions">
                    <button type="button" className="secondary-button" onClick={() => handleEditEvent(event)}>
                      Edit
                    </button>
                    <button type="button" className="secondary-button danger-action" onClick={() => confirmAction(`Delete ${event.title}?`, () => deleteAdminEvent(event.id))}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
              </div>
            </div>
          </div>
        )}

        {section === 'analytics' && (
          <div className="admin-section">
            <div className="panel">
              <p className="section-title">Analytics</p>
              <p className="section-subtitle">Daily active users, focus minutes, uploads, and most active users.</p>
            </div>
            <AdminMiniTable title="Daily Active Users" rows={admin.analytics?.daily_active_users ?? []} columns={['day', 'active_users']} />
            <AdminMiniTable title="Focus Minutes Per Day" rows={admin.analytics?.focus_minutes_per_day ?? []} columns={['day', 'total_minutes']} />
            <AdminMiniTable title="Uploaded Books Per Day" rows={admin.analytics?.uploaded_books_per_day ?? []} columns={['day', 'uploaded_books']} />
            <AdminMiniTable title="Most Active Users" rows={admin.analytics?.most_active_users ?? []} columns={['name', 'email', 'focus_minutes']} />
          </div>
        )}

        {section === 'leaderboard' && (
          <div className="panel admin-section">
            <div className="section-head wrap">
              <div>
                <p className="section-title">Leaderboard Management</p>
                <p className="section-subtitle">Full details, privacy controls, resets, and suspicious activity review.</p>
              </div>
              <button type="button" className="secondary-button" onClick={() => fetchAdminLeaderboard()}>
                <RefreshCw size={14} />
                Refresh
              </button>
              <button type="button" className="secondary-button" onClick={exportLeaderboardCsv}>
                <FileText size={14} />
                Export CSV
              </button>
            </div>
            <div className="admin-table-scroll leaderboard-admin-scroll">
              <div className="admin-table leaderboard-admin-table">
              {admin.leaderboard.map((row) => (
                <div key={`${row.user_id}-${row.rank_number}`} className="admin-row leaderboard-admin-row">
                  <div className="leaderboard-admin-identity">
                    <strong>#{row.rank_number} {row.name}</strong>
                    <span title={`${row.email} · ${row.username || 'no username'} · ${row.user_id}`}>
                      {row.email} · {row.username || 'no username'} · {row.user_id}
                    </span>
                  </div>
                  <div className="leaderboard-admin-stats">
                    <span className="mono">{row.score} pts</span>
                    <span>{row.completed_lessons} lessons</span>
                    <span>{row.focus_minutes} min</span>
                    <span>{row.completed_tasks} tasks</span>
                    <span>{row.completed_exams} exams</span>
                    <span>{row.suspicious_activity_warnings} warn</span>
                  </div>
                  <div className="admin-row-actions">
                    <button type="button" className="secondary-button" onClick={() => setAdminLeaderboardVisibility(row.user_id, !row.leaderboard_visible)}>
                      {row.leaderboard_visible ? 'Hide' : 'Show'}
                    </button>
                    <button type="button" className="secondary-button" onClick={() => fetchAdminActivity(row.user_id)}>
                      Activity
                    </button>
                    <button type="button" className="secondary-button danger-action" onClick={() => confirmAction(`Reset leaderboard score for ${row.email}?`, () => resetAdminLeaderboard(row.user_id))}>
                      Reset
                    </button>
                  </div>
                </div>
              ))}
              </div>
            </div>
            {admin.activity.length > 0 && (
              <div className="admin-mini-table admin-table-scroll">
                <p className="section-title">Activity History</p>
                {admin.activity.map((item) => (
                  <div key={item.id} className="admin-mini-row">
                    <span>{item.type}</span>
                    <span>{item.subject}</span>
                    <span>{item.value}</span>
                    <span>{item.validated ? 'valid' : item.suspicious_reason}</span>
                    <span>{formatDate(item.created_at)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  )
}

function AdminMiniTable({ title, rows, columns }) {
  return (
    <div className="panel admin-mini-table">
      <p className="section-title">{title}</p>
      {rows.length === 0 ? (
        <p className="section-subtitle">No data yet.</p>
      ) : (
        rows.map((row, index) => (
          <div key={`${title}-${index}`} className="admin-mini-row">
            {columns.map((column) => (
              <span key={column}>{String(row[column] ?? '')}</span>
            ))}
          </div>
        ))
      )}
    </div>
  )
}

function SettingsPage() {
  const user = useLuminaStore((state) => state.user)
  const openProfilePage = useLuminaStore((state) => state.openProfilePage)
  const changePassword = useLuminaStore((state) => state.changePassword)
  const logout = useLuminaStore((state) => state.logout)
  const isSettingsBusy = useLuminaStore((state) => state.isSettingsBusy)
  const isAuthBusy = useLuminaStore((state) => state.isAuthBusy)
  const settingsMessage = useLuminaStore((state) => state.settingsMessage)
  const settingsError = useLuminaStore((state) => state.settingsError)
  const clearSettingsFeedback = useLuminaStore((state) => state.clearSettingsFeedback)

  const [securityForm, setSecurityForm] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  })
  const [securityErrors, setSecurityErrors] = useState({})
  const [visiblePasswords, setVisiblePasswords] = useState({
    current_password: false,
    new_password: false,
    confirm_password: false,
  })
  const [notificationPreferences, setNotificationPreferences] = useState({
    reminders_enabled: true,
    exam_reminders_enabled: true,
    task_reminders_enabled: true,
    class_reminders_enabled: true,
    study_reminders_enabled: true,
  })
  const [notificationPrefsError, setNotificationPrefsError] = useState('')
  const [isNotificationPrefsBusy, setIsNotificationPrefsBusy] = useState(false)

  useEffect(() => {
    let isMounted = true
    fetchNotificationPreferencesRequest()
      .then((payload) => {
        if (isMounted) setNotificationPreferences(payload.preferences)
      })
      .catch((error) => {
        if (isMounted) setNotificationPrefsError(error.message || 'Could not load notification preferences.')
      })
    return () => {
      isMounted = false
    }
  }, [])

  const togglePasswordVisibility = (field) => {
    setVisiblePasswords((state) => ({
      ...state,
      [field]: !state[field],
    }))
  }

  const validateSecurity = () => {
    const nextErrors = {}
    if (!securityForm.current_password) nextErrors.current_password = 'Current password is required.'
    if (!securityForm.new_password) nextErrors.new_password = 'New password is required.'
    else if (securityForm.new_password.length < 8) nextErrors.new_password = 'Use at least 8 characters.'
    else if (!/[A-Z]/.test(securityForm.new_password) || !/[a-z]/.test(securityForm.new_password) || !/[0-9]/.test(securityForm.new_password)) {
      nextErrors.new_password = 'Use uppercase, lowercase, and a number.'
    }
    if (securityForm.confirm_password !== securityForm.new_password) {
      nextErrors.confirm_password = 'Passwords do not match.'
    }
    setSecurityErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const handleSecuritySubmit = async (event) => {
    event.preventDefault()
    clearSettingsFeedback()
    if (!validateSecurity()) return

    try {
      await changePassword(securityForm)
      setSecurityForm({
        current_password: '',
        new_password: '',
        confirm_password: '',
      })
    } catch {
      // Error handled in store
    }
  }

  const updateNotificationPreference = async (key, value) => {
    const nextPreferences = { ...notificationPreferences, [key]: value }
    setNotificationPreferences(nextPreferences)
    setNotificationPrefsError('')
    setIsNotificationPrefsBusy(true)

    try {
      const payload = await updateNotificationPreferencesRequest(nextPreferences)
      setNotificationPreferences(payload.preferences)
    } catch (error) {
      setNotificationPrefsError(error.message || 'Could not update notification preferences.')
    } finally {
      setIsNotificationPrefsBusy(false)
    }
  }

  return (
    <div className="page-grid">
      <section className="panel settings-panel">
        <div className="section-head">
          <div>
            <p className="section-title">Settings</p>
            <p className="section-subtitle">Manage your account and security.</p>
          </div>
        </div>

        {(settingsError || settingsMessage) && (
          <Motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`auth-alert ${settingsError ? 'error' : 'success'}`}
          >
            {settingsError ?? settingsMessage}
          </Motion.div>
        )}

        <div className="settings-sections">
          <div className="settings-section">
            <h3 className="settings-section-title">
              <UserRound size={18} />
              Profile
            </h3>
            <button type="button" className="settings-tile-v2" onClick={openProfilePage}>
              <UserAvatar user={user} className="avatar-pill large" alt={user?.name} />
              <div className="settings-tile-content">
                <strong>{user?.name}</strong>
                <span>{user?.email}</span>
              </div>
              <ChevronRight size={18} className="chevron" />
            </button>
          </div>

          <div className="settings-section">
            <h3 className="settings-section-title">
              <KeyRound size={18} />
              Security
            </h3>
            <div className="settings-card-v2">
              <div className="account-meta-v2">
                <div className="meta-item">
                  <label>ACCOUNT CREATED</label>
                  <span>{formatDate(user?.created_at)}</span>
                </div>
              </div>

              <form className="settings-form-v2" onSubmit={handleSecuritySubmit}>
                <div className="form-grid">
                  <div className="auth-field">
                    <span>Current password</span>
                    <div className="password-input-shell">
                      <input
                        type={visiblePasswords.current_password ? 'text' : 'password'}
                        placeholder="••••••••"
                        value={securityForm.current_password}
                        onChange={(e) => setSecurityForm(s => ({ ...s, current_password: e.target.value }))}
                      />
                      <button
                        type="button"
                        className="password-toggle-button"
                        onClick={() => togglePasswordVisibility('current_password')}
                        aria-label={visiblePasswords.current_password ? 'Hide current password' : 'Show current password'}
                      >
                        {visiblePasswords.current_password ? <EyeOff size={17} /> : <Eye size={17} />}
                      </button>
                    </div>
                    {securityErrors.current_password && <small>{securityErrors.current_password}</small>}
                  </div>

                  <div className="auth-field">
                    <span>New password</span>
                    <div className="password-input-shell">
                      <input
                        type={visiblePasswords.new_password ? 'text' : 'password'}
                        placeholder="••••••••"
                        value={securityForm.new_password}
                        onChange={(e) => setSecurityForm(s => ({ ...s, new_password: e.target.value }))}
                      />
                      <button
                        type="button"
                        className="password-toggle-button"
                        onClick={() => togglePasswordVisibility('new_password')}
                        aria-label={visiblePasswords.new_password ? 'Hide new password' : 'Show new password'}
                      >
                        {visiblePasswords.new_password ? <EyeOff size={17} /> : <Eye size={17} />}
                      </button>
                    </div>
                    {securityErrors.new_password && <small>{securityErrors.new_password}</small>}
                  </div>

                  <div className="auth-field">
                    <span>Confirm new password</span>
                    <div className="password-input-shell">
                      <input
                        type={visiblePasswords.confirm_password ? 'text' : 'password'}
                        placeholder="••••••••"
                        value={securityForm.confirm_password}
                        onChange={(e) => setSecurityForm(s => ({ ...s, confirm_password: e.target.value }))}
                      />
                      <button
                        type="button"
                        className="password-toggle-button"
                        onClick={() => togglePasswordVisibility('confirm_password')}
                        aria-label={visiblePasswords.confirm_password ? 'Hide confirm new password' : 'Show confirm new password'}
                      >
                        {visiblePasswords.confirm_password ? <EyeOff size={17} /> : <Eye size={17} />}
                      </button>
                    </div>
                    {securityErrors.confirm_password && <small>{securityErrors.confirm_password}</small>}
                  </div>
                </div>

                <button type="submit" className="primary-button" disabled={isSettingsBusy}>
                  {isSettingsBusy ? 'Updating...' : 'Update Password'}
                </button>
              </form>
            </div>
          </div>

          <div className="settings-section">
            <h3 className="settings-section-title">
              <Bell size={18} />
              Notifications
            </h3>
            <div className="settings-card-v2 notification-preferences">
              {[
                ['reminders_enabled', 'Enable all reminders'],
                ['exam_reminders_enabled', 'Exam reminders'],
                ['task_reminders_enabled', 'Task deadline reminders'],
                ['class_reminders_enabled', 'Class reminders'],
                ['study_reminders_enabled', 'Study session reminders'],
              ].map(([key, label]) => (
                <label key={key} className="preference-toggle">
                  <span>{label}</span>
                  <input
                    type="checkbox"
                    checked={!!notificationPreferences[key]}
                    disabled={isNotificationPrefsBusy}
                    onChange={(event) => updateNotificationPreference(key, event.target.checked)}
                  />
                </label>
              ))}
              {notificationPrefsError && <small>{notificationPrefsError}</small>}
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

function ProfilePage() {
  const user = useLuminaStore((state) => state.user)
  const updateProfile = useLuminaStore((state) => state.updateProfile)
  const uploadProfileImage = useLuminaStore((state) => state.uploadProfileImage)
  const changeEmail = useLuminaStore((state) => state.changeEmail)
  const setPage = useLuminaStore((state) => state.setPage)
  const isSettingsBusy = useLuminaStore((state) => state.isSettingsBusy)
  const settingsMessage = useLuminaStore((state) => state.settingsMessage)
  const settingsError = useLuminaStore((state) => state.settingsError)
  const clearSettingsFeedback = useLuminaStore((state) => state.clearSettingsFeedback)
  const leaderboard = useLuminaStore((state) => state.leaderboard)
  const fetchLeaderboard = useLuminaStore((state) => state.fetchLeaderboard)

  const [profileForm, setProfileForm] = useState({
    name: user?.name ?? '',
    username: user?.username ?? '',
    leaderboard_visible: user?.leaderboard_visible ?? true,
    profile_picture_url: user?.profile_picture_url ?? '',
  })
  const [emailForm, setEmailForm] = useState({
    email: user?.email ?? '',
  })
  const [errors, setErrors] = useState({})
  const [profileImagePreview, setProfileImagePreview] = useState(user?.profile_picture_url ?? '')
  const [profileImageError, setProfileImageError] = useState('')
  const [pendingProfileImage, setPendingProfileImage] = useState(null)
  const [profileImageSource, setProfileImageSource] = useState(user?.profile_picture_url ? 'url' : 'none')
  const fileInputId = 'profile-image-upload'
  const maxProfileImageBytes = 2 * 1024 * 1024

  useEffect(() => {
    fetchLeaderboard({ period: 'weekly' })
  }, [fetchLeaderboard])

  useEffect(() => () => {
    if (profileImagePreview.startsWith('blob:')) {
      URL.revokeObjectURL(profileImagePreview)
    }
  }, [profileImagePreview])

  const isValidImageUrl = (value) => {
    if (!value.trim()) return true

    try {
      const parsed = new URL(value)
      return ['http:', 'https:'].includes(parsed.protocol)
    } catch {
      return false
    }
  }

  const setPreviewUrl = (nextUrl) => {
    setProfileImagePreview((current) => {
      if (current.startsWith('blob:')) {
        URL.revokeObjectURL(current)
      }
      return nextUrl
    })
  }

  const compressProfileImage = (file) =>
    new Promise((resolve, reject) => {
      const objectUrl = URL.createObjectURL(file)
      const image = new Image()
      image.onload = () => {
        const size = 512
        const sourceSize = Math.min(image.naturalWidth, image.naturalHeight)
        const sourceX = Math.round((image.naturalWidth - sourceSize) / 2)
        const sourceY = Math.round((image.naturalHeight - sourceSize) / 2)
        const canvas = document.createElement('canvas')
        canvas.width = size
        canvas.height = size
        const context = canvas.getContext('2d')

        if (!context) {
          URL.revokeObjectURL(objectUrl)
          reject(new Error('Unable to process that image. Try another file.'))
          return
        }

        context.drawImage(image, sourceX, sourceY, sourceSize, sourceSize, 0, 0, size, size)
        canvas.toBlob(
          (blob) => {
            URL.revokeObjectURL(objectUrl)
            if (!blob) {
              reject(new Error('Unable to process that image. Try another file.'))
              return
            }
            resolve(blob)
          },
          'image/jpeg',
          0.78,
        )
      }
      image.onerror = () => {
        URL.revokeObjectURL(objectUrl)
        reject(new Error('Unable to load that image. Try another file.'))
      }
      image.src = objectUrl
    })

  const selectUploadedImage = (blob) => {
    const previewUrl = URL.createObjectURL(blob)
    setPendingProfileImage(blob)
    setProfileImageSource('upload')
    setPreviewUrl(previewUrl)
    setProfileImageError('')
  }

  const handleImageUrlChange = (event) => {
    const nextUrl = event.target.value
    setProfileForm((current) => ({ ...current, profile_picture_url: nextUrl }))
    setPendingProfileImage(null)
    setProfileImageSource(nextUrl.trim() ? 'url' : 'none')
    setPreviewUrl(nextUrl)

    if (!isValidImageUrl(nextUrl)) {
      setProfileImageError('Enter a valid image URL.')
      return
    }

    setProfileImageError('')
  }

  const handleProfileImageFile = async (event) => {
    const [file] = event.target.files ?? []
    if (!file) return

    const allowedTypes = ['image/png', 'image/jpeg', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      setProfileImageError('Choose a PNG, JPG, JPEG, or WEBP image.')
      event.target.value = ''
      return
    }

    if (file.size > maxProfileImageBytes) {
      setProfileImageError('Image is too large. Please upload an image under 2MB.')
      event.target.value = ''
      return
    }

    try {
      const compressedBlob = await compressProfileImage(file)
      selectUploadedImage(compressedBlob)
    } catch (error) {
      setProfileImageError(error.message)
    } finally {
      event.target.value = ''
    }
  }

  const handleProfileSubmit = async (e) => {
    e.preventDefault()
    clearSettingsFeedback()
    const nextErrors = {}
    if (!profileForm.name.trim()) {
      nextErrors.name = 'Name is required.'
    }
    if (profileForm.username && !/^[a-z0-9_]{3,20}$/.test(profileForm.username)) {
      nextErrors.username = 'Use 3-20 lowercase letters, numbers, or underscores.'
    }
    if (profileImageSource === 'url' && !isValidImageUrl(profileForm.profile_picture_url)) {
      nextErrors.profile_picture_url = 'Enter a valid image URL.'
    }
    if (profileImageError) {
      nextErrors.profile_picture_url = profileImageError
    }

    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) {
      return
    }

    try {
      let profilePictureUrl = profileImageSource === 'url' ? profileForm.profile_picture_url.trim() : ''
      if (profileImageSource === 'upload' && pendingProfileImage) {
        profilePictureUrl = await uploadProfileImage(pendingProfileImage)
      }

      await updateProfile({
        name: profileForm.name,
        username: profileForm.username,
        leaderboard_visible: profileForm.leaderboard_visible,
        profile_picture_url: profilePictureUrl,
      })
      setPendingProfileImage(null)
      setProfileImageSource(profilePictureUrl ? 'url' : 'none')
      setProfileForm((current) => ({ ...current, profile_picture_url: profilePictureUrl }))
      setPreviewUrl(profilePictureUrl)
    } catch { /* Handled in store */ }
  }

  const handleEmailSubmit = async (e) => {
    e.preventDefault()
    clearSettingsFeedback()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailForm.email)) {
      setErrors({ email: 'Enter a valid email address.' })
      return
    }
    try {
      await changeEmail(emailForm)
    } catch { /* Handled in store */ }
  }

  return (
    <div className="page-grid">
      <section className="panel profile-panel">
        <div className="section-head">
          <button type="button" className="ghost-button back-button" onClick={() => setPage('settings')}>
            <ArrowLeft size={16} />
            Back to Settings
          </button>
        </div>

        <div className="profile-header">
          <UserAvatar
            user={user}
            className="avatar-pill massive"
            previewUrl={profileImagePreview}
            alt="Profile preview"
          />
          <div>
            <p className="section-title">Edit Profile</p>
            <p className="section-subtitle">Personalize your academic presence.</p>
          </div>
        </div>

        {(settingsError || settingsMessage) && (
          <Motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`auth-alert ${settingsError ? 'error' : 'success'}`}
          >
            {settingsError ?? settingsMessage}
          </Motion.div>
        )}

        <div className="profile-grid">
          <form className="settings-card-v2" onSubmit={handleProfileSubmit}>
            <div className="settings-section-title">
              <UserRound size={18} />
              General Information
            </div>
            <div className="form-stack">
              <div className="profile-image-picker">
                <UserAvatar
                  user={user}
                  className="avatar-pill massive"
                  previewUrl={profileImagePreview}
                  alt="Profile image preview"
                />
	                <div className="profile-image-actions">
	                  <strong>Profile image</strong>
	                  <span>Upload an image file or paste an external image URL.</span>
                    {profileImageSource === 'upload' && (
                      <small className="image-selection-note">Uploaded image selected</small>
                    )}
	                  <input
                    id={fileInputId}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="visually-hidden"
                    onChange={handleProfileImageFile}
                  />
                  <label className="primary-button change-image-button" htmlFor={fileInputId}>
                    <ImagePlus size={16} />
                    Change Profile Image
                  </label>
                </div>
              </div>

              <label className="auth-field">
                <span>Display Name</span>
                <input
                  value={profileForm.name}
                  onChange={(e) => {
                    setProfileForm(s => ({ ...s, name: e.target.value }))
                    setErrors((current) => ({ ...current, name: '' }))
                  }}
                />
                {errors.name && <small>{errors.name}</small>}
              </label>

              <label className="auth-field">
                <span>Public Username</span>
                <input
                  placeholder="kamoliddin"
                  value={profileForm.username}
                  onChange={(e) => {
                    const value = e.target.value.toLowerCase()
                    setProfileForm(s => ({ ...s, username: value }))
                    setErrors((current) => ({ ...current, username: '' }))
                  }}
                />
                <small>3-20 lowercase letters, numbers, or underscores.</small>
                {errors.username && <small>{errors.username}</small>}
              </label>

              <label className="admin-checkbox">
                <input
                  type="checkbox"
                  checked={profileForm.leaderboard_visible}
                  onChange={(e) => setProfileForm(s => ({ ...s, leaderboard_visible: e.target.checked }))}
                />
                Show me on the public leaderboard
              </label>

              <label className="auth-field">
                <span>Profile Picture URL</span>
                <input
	                  placeholder="https://images.unsplash.com/..."
	                  value={profileForm.profile_picture_url}
	                  onChange={handleImageUrlChange}
	                />
                <small>External image URLs only. Uploaded files are saved separately.</small>
                {(errors.profile_picture_url || profileImageError) && (
                  <small>{errors.profile_picture_url || profileImageError}</small>
                )}
              </label>

              <button type="submit" className="primary-button" disabled={isSettingsBusy}>
                <ImagePlus size={16} />
                {isSettingsBusy ? 'Saving...' : 'Save Profile'}
              </button>
            </div>
          </form>

          <form className="settings-card-v2" onSubmit={handleEmailSubmit}>
            <div className="settings-section-title">
              <Mail size={18} />
              Account Email
            </div>
            <div className="form-stack">
              <label className="auth-field">
                <span>Email Address</span>
                <input
                  type="email"
                  value={emailForm.email}
                  onChange={(e) => setEmailForm(s => ({ ...s, email: e.target.value }))}
                />
                {errors.email && <small>{errors.email}</small>}
              </label>

              <button type="submit" className="primary-button" disabled={isSettingsBusy}>
                <Mail size={16} />
                {isSettingsBusy ? 'Updating...' : 'Update Email'}
              </button>
            </div>
          </form>

          <div className="settings-card-v2">
            <div className="settings-section-title">
              <Trophy size={18} />
              Ranking Summary
            </div>
            {['daily', 'weekly', 'monthly'].map((periodName) => {
              const row = leaderboard.myRank?.[periodName]
              return (
                <div key={periodName} className="rank-summary-row">
                  <strong>{periodName}</strong>
                  <span>Rank {row?.rank_number ?? '-'}</span>
                  <span>{row?.score ?? 0} pts</span>
                  <span>{row?.focus_minutes ?? 0} focus min</span>
                  <span>{row?.completed_lessons ?? 0} lessons</span>
                </div>
              )
            })}
          </div>
        </div>
      </section>
    </div>
  )
}

function SubjectBadge({ subject, color }) {
  const subjects = useLuminaStore((state) => state.subjects)
  const subjectColor = color ?? subjects[subject]

  return (
    <span className="subject-badge" style={{ color: subjectColor, borderColor: `${subjectColor}50`, backgroundColor: `${subjectColor}1A` }}>
      {subject}
    </span>
  )
}

function getEventTimeParts(event) {
  const rawStartHour = Number(event.startHour ?? event.start_hour)
  const rawDuration = Number(event.duration)

  if (Number.isFinite(rawStartHour) && Number.isFinite(rawDuration)) {
    return {
      startHour: rawStartHour,
      duration: rawDuration,
    }
  }

  const startValue = event.start_time ?? event.startTime
  const endValue = event.end_time ?? event.endTime
  const start = startValue ? new Date(startValue) : null
  const end = endValue ? new Date(endValue) : null

  if (
    start &&
    end &&
    Number.isFinite(start.getTime()) &&
    Number.isFinite(end.getTime()) &&
    end > start
  ) {
    return {
      startHour: start.getHours() + start.getMinutes() / 60,
      duration: (end - start) / 3600000,
    }
  }

  return {
    startHour: Number.NaN,
    duration: Number.NaN,
  }
}

function formatEventTimeRange(event) {
  const { startHour, duration } = getEventTimeParts(event)

  if (!Number.isFinite(startHour) || !Number.isFinite(duration)) {
    return 'Time not set'
  }

  return `${formatHour(startHour)} - ${formatHour(startHour + duration)}`
}

function formatHour(hour) {
  if (!Number.isFinite(hour)) return 'Time not set'
  const normalizedHour = ((hour % 24) + 24) % 24
  const whole = Math.floor(normalizedHour)
  const minutes = hour % 1 === 0.5 ? '30' : '00'
  return `${String(whole).padStart(2, '0')}:${minutes}`
}

function formatSeconds(seconds) {
  const minutes = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
}

function formatDate(value) {
  if (!value) return 'Unknown'
  return new Date(value).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function formatBytes(value = 0) {
  const bytes = Number(value) || 0
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default App
