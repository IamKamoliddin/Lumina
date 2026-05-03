const createLimiter = ({ windowMs, limit, prefix, getIdentity = (req) => req.ip ?? 'unknown' }) => {
  const bucket = new Map()

  return (req, res, next) => {
    const identity = getIdentity(req)
    const key = `${prefix}:${identity}`
    const now = Date.now()
    const current = bucket.get(key)

    if (!current || now - current.startedAt > windowMs) {
      bucket.set(key, { count: 1, startedAt: now })
      return next()
    }

    if (current.count >= limit) {
      return res.status(429).json({
        error: {
          code: 'RATE_LIMITED',
          message: 'Too many requests, please slow down.',
        },
      })
    }

    current.count += 1
    return next()
  }
}

export const userRateLimit = createLimiter({
  windowMs: 60 * 1000,
  limit: 100,
  prefix: 'user',
})

export const authRateLimit = createLimiter({
  windowMs: 15 * 60 * 1000,
  limit: 50,
  prefix: 'auth',
})

export const aiRateLimit = createLimiter({
  windowMs: 60 * 1000,
  limit: 20,
  prefix: 'ai',
  getIdentity: (req) => req.user?.id ?? req.ip ?? 'unknown',
})
