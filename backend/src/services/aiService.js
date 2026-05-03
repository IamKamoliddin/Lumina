import { generateStudyReply, generateStudyReplyStream } from '../integrations/geminiClient.js'

const MAX_CONTEXT_CHARS = 12000

const sanitizeContext = (context = '') => {
  if (typeof context !== 'string') return ''
  return context.slice(0, MAX_CONTEXT_CHARS)
}

export const chatWithContext = async ({ context, message, subject }) => {
  return generateStudyReply({
    message,
    subject,
    context: sanitizeContext(context),
  })
}

export const streamChatWithContext = ({ context, message, subject }) => {
  return generateStudyReplyStream({
    message,
    subject,
    context: sanitizeContext(context),
  })
}
