import mysql from 'mysql2/promise'
import { env } from '../config/env.js'
import { logger } from '../config/logger.js'
import { AppError } from '../utils/appError.js'

const basePool = mysql.createPool({
  host: env.DB_HOST,
  port: env.DB_PORT,
  user: env.DB_USER,
  password: env.DB_PASSWORD,
  database: env.DB_NAME,
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
