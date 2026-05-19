import mysql from 'mysql2/promise'
import { env } from '../config/env.js'
import { logger } from '../config/logger.js'
import { AppError } from '../utils/appError.js'

const buildConnectionConfig = () => {
  if (!env.DB_HOST.startsWith('mysql://') && !env.DB_HOST.startsWith('mysql2://')) {
    return {
      host: env.DB_HOST,
      port: env.DB_PORT,
      user: env.DB_USER,
      password: env.DB_PASSWORD,
      database: env.DB_NAME,
    }
  }

  const parsed = new URL(env.DB_HOST)

  return {
    host: parsed.hostname,
    port: Number(parsed.port || env.DB_PORT),
    user: decodeURIComponent(parsed.username || env.DB_USER),
    password: decodeURIComponent(parsed.password || env.DB_PASSWORD),
    database: decodeURIComponent(parsed.pathname.replace(/^\//, '') || env.DB_NAME),
  }
}

const basePool = mysql.createPool({
  ...buildConnectionConfig(),
  waitForConnections: true,
  connectionLimit: 10,
  maxIdle: 10,
  idleTimeout: 30000,
  connectTimeout: 5000,
})

export const pool = {
  query: async (sql, params = []) => {
    if (typeof sql !== 'string' || !sql.trim()) {
      logger.error('Rejected empty SQL query', {
        sql,
        paramsLength: Array.isArray(params) ? params.length : null,
        stack: new Error().stack,
      })
      throw new AppError(500, 'EMPTY_SQL_QUERY', 'Database query builder produced an empty SQL statement')
    }

    return basePool.query(sql, params)
  },
  end: async () => basePool.end(),
}
