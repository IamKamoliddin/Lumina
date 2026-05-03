import { chatWithContext, streamChatWithContext } from '../services/aiService.js'

export const postChat = async (req, res) => {
  const reply = await chatWithContext({
    ...req.validated.body,
    authenticatedUserId: req.user.id,
  })
  res.json({ reply, data: { content: reply } })
}

export const postSuggest = async (req, res) => {
  const reply = await chatWithContext({
    ...req.validated.body,
    authenticatedUserId: req.user.id,
  })
  res.json({ reply, data: { content: reply } })
}

export const postChatStream = async (req, res) => {
  const stream = streamChatWithContext({
    ...req.validated.body,
    authenticatedUserId: req.user.id,
  })

  try {
    const iterator = stream[Symbol.asyncIterator]()
    const first = await iterator.next()

    res.setHeader('Content-Type', 'text/plain; charset=utf-8')
    res.setHeader('Cache-Control', 'no-cache, no-transform')
    res.setHeader('X-Accel-Buffering', 'no')
    res.flushHeaders?.()

    if (!first.done && first.value) {
      res.write(first.value)
    }

    for await (const chunk of iterator) {
      res.write(chunk)
    }
    res.end()
  } catch (error) {
    if (!res.headersSent) {
      res.status(error.statusCode ?? 503).json({
        error: {
          code: error.code ?? 'AI_UNAVAILABLE',
          message: error.message ?? 'AI assistant is temporarily unavailable.',
        },
      })
      return
    }
    res.write('\n\nAI assistant was interrupted. Please try again.')
    res.end()
  }
}
