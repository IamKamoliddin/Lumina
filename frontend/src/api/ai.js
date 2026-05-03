import { apiRequest, buildRequestUrl } from './client'

export const sendAiChatRequest = ({ message, context = '', subject }) =>
  apiRequest('/api/ai/chat', {
    method: 'POST',
    body: JSON.stringify({
      message,
      context,
      subject,
    }),
  })

const parseErrorResponse = async (response) => {
  const payload = await response.json().catch(() => ({}))
  const error = new Error(payload?.error?.message ?? payload?.message ?? 'AI assistant is temporarily unavailable.')
  error.status = response.status
  error.code = payload?.error?.code ?? payload?.code ?? 'REQUEST_FAILED'
  error.payload = payload
  return error
}

const fetchAiStream = ({ message, context, subject }) =>
  fetch(buildRequestUrl('/api/ai/chat/stream'), {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message,
      context,
      subject,
    }),
  })

export const streamAiChatRequest = async ({ message, context = '', subject, onChunk }) => {
  let response = await fetchAiStream({ message, context, subject })

  if (response.status === 401) {
    const refreshResponse = await fetch(buildRequestUrl('/api/auth/refresh'), {
      method: 'POST',
      credentials: 'include',
    })

    if (refreshResponse.ok) {
      response = await fetchAiStream({ message, context, subject })
    }
  }

  if (!response.ok) {
    throw await parseErrorResponse(response)
  }

  const reader = response.body?.getReader()
  if (!reader) {
    throw new Error('AI assistant is temporarily unavailable.')
  }

  const decoder = new TextDecoder()
  let fullText = ''

  while (true) {
    const { value, done } = await reader.read()
    if (done) break

    const chunk = decoder.decode(value, { stream: true })
    fullText += chunk
    onChunk?.(chunk, fullText)
  }

  const tail = decoder.decode()
  if (tail) {
    fullText += tail
    onChunk?.(tail, fullText)
  }

  return fullText
}
