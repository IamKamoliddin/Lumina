import cookieParser from 'cookie-parser'
import cors from 'cors'
import express from 'express'
import helmet from 'helmet'
import path from 'path'
import { fileURLToPath } from 'url'
import { env } from './config/env.js'
import { logger } from './config/logger.js'
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js'
import { userRateLimit } from './middleware/rateLimit.js'
import aiRoutes from './routes/ai.js'
import adminRoutes from './routes/admin.js'
import authRoutes from './routes/auth.js'
import booksRoutes from './routes/books.js'
import eventsRoutes from './routes/events.js'
import focusLogsRoutes from './routes/focusLogs.js'
import leaderboardRoutes from './routes/leaderboard.js'
import notificationsRoutes from './routes/notifications.js'
import searchRoutes from './routes/search.js'
import subjectsRoutes from './routes/subjects.js'
import tasksRoutes from './routes/tasks.js'
import userRoutes from './routes/user.js'

const app = express()
const __dirname = path.dirname(fileURLToPath(import.meta.url))

const isLocalDevOrigin = (origin) => {
  if (env.NODE_ENV !== 'development') return false

  try {
    const parsed = new URL(origin)
    return ['localhost', '127.0.0.1'].includes(parsed.hostname)
  } catch {
    return false
  }
}

const isSameHostOrigin = (origin, req) => {
  try {
    const parsed = new URL(origin)
    return parsed.host === req.get('host')
  } catch {
    return false
  }
}

app.use(
  cors((req, callback) => {
    callback(null, {
      origin(origin, originCallback) {
        if (
          !origin ||
          env.CLIENT_ORIGINS.includes(origin) ||
          isSameHostOrigin(origin, req) ||
          isLocalDevOrigin(origin)
        ) {
          return originCallback(null, true)
        }

        return originCallback(new Error('CORS origin not allowed'))
      },
      credentials: true,
    })
  }),
)
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  }),
)
app.use(express.json({ limit: '1mb' }))
app.use(express.urlencoded({ extended: false, limit: '50kb' }))
app.use(cookieParser())
app.use(userRateLimit)
app.use('/uploads', express.static(path.resolve(__dirname, '..', 'uploads')))

app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'lumina-backend',
    timestamp: new Date().toISOString(),
  })
})

app.use('/api/auth', authRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api/books', booksRoutes)
app.use('/api/events', eventsRoutes)
app.use('/api/subjects', subjectsRoutes)
app.use('/api/focus-logs', focusLogsRoutes)
app.use('/api/leaderboard', leaderboardRoutes)
app.use('/api/ai', aiRoutes)
app.use('/api/user', userRoutes)
app.use('/api/notifications', notificationsRoutes)
app.use('/api/tasks', tasksRoutes)
app.use('/api/search', searchRoutes)

app.use(notFoundHandler)
app.use(errorHandler)

export const startApp = () => {
  const server = app.listen(env.PORT, () => {
    logger.info(`API listening on http://localhost:${env.PORT}`)
  })

  return server
}

export default app
