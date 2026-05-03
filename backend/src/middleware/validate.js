export const validate = (schema) => (req, _res, next) => {
  const parsed = schema.safeParse({
    body: req.body,
    params: req.params,
    query: req.query,
  })

  if (!parsed.success) {
    const error = new Error('Validation failed')
    error.statusCode = 400
    error.code = 'VALIDATION_ERROR'
    error.details = parsed.error.flatten()
    return next(error)
  }

  req.validated = parsed.data
  return next()
}
