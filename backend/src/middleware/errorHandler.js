export const notFoundHandler = (_req, res) => {
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: 'Route not found',
    },
  })
}

export const errorHandler = (error, _req, res, _next) => {
  const isDbConnectionError =
    error?.code === 'ECONNREFUSED' ||
    error?.code === 'ETIMEDOUT' ||
    error?.code === 'PROTOCOL_CONNECTION_LOST' ||
    error?.code === 'ER_CON_COUNT_ERROR' ||
    error?.code === 'ER_ACCESS_DENIED_ERROR' ||
    error?.code === 'ER_BAD_DB_ERROR' ||
    error?.code === '57P01' ||
    error?.code === '57P03'

  const status = error.statusCode ?? (isDbConnectionError ? 503 : 500)
  const isEmptySqlError =
    error?.code === 'EMPTY_SQL_QUERY' ||
    String(error?.message ?? '').toLowerCase().includes('emptyquery')
  const code = isDbConnectionError
    ? 'DB_UNAVAILABLE'
    : isEmptySqlError
      ? 'EMPTY_SQL_QUERY'
      : error.code ?? 'INTERNAL_SERVER_ERROR'
  const message = isDbConnectionError
    ? 'Database is unavailable. Please try again shortly.'
    : isEmptySqlError
      ? 'Authentication service is temporarily unavailable. Please retry.'
      : error.message ?? 'Something went wrong'

  if (isEmptySqlError) {
    console.error('[errorHandler] empty SQL query details', {
      originalMessage: error?.message,
      stack: error?.stack,
    })
  }

  res.status(status).json({
    error: {
      code,
      message,
      details: status >= 500 ? null : error.details ?? null,
    },
  })
}
