import { GoogleGenAI } from '@google/genai'
import { env } from '../config/env.js'
import { AppError } from '../utils/appError.js'

const SYSTEM_INSTRUCTION = [
  'You are StudyGPT, an academic assistant inside a student productivity app.',
  'Help the user study clearly and practically. Use the provided study context when relevant. If context is missing, answer generally but do not invent personal data.',
  'Keep answers concise by default: 2-5 short sections, short paragraphs, and no unnecessary preamble.',
  'Format answers for a chat sidebar using simple Markdown: short headings with no # symbols, bullet points, numbered steps, and compact tables when comparison or planning is useful.',
  'Write math in readable plain text or Unicode where possible. Avoid LaTeX delimiters like $...$ unless the user explicitly asks for LaTeX.',
  'When a user asks how to use the platform, guide them toward StudyGPT tools: books/materials, calendar/events/exams, tasks, focus timer, progress tracking, leaderboard, profile, and admin features where relevant.',
  'For study plans, prefer an actionable table with time, task, platform tool, and outcome. For explanations, use a quick idea, steps, example, and practice prompt.',
  'Always finish the answer completely. If the ideal answer would be long, give a shorter complete answer instead of stopping mid-sentence.',
  'Do not include email, phone numbers, internal IDs, or sensitive profile details in the response.',
].join(' ')

let client

const getClient = () => {
  if (!env.GEMINI_API_KEY) {
    throw new AppError(503, 'AI_NOT_CONFIGURED', 'AI assistant is temporarily unavailable.')
  }

  if (!client) {
    client = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY })
  }

  return client
}

const mapGeminiError = (error) => {
  const status = error?.status ?? error?.statusCode
  const message = String(error?.message ?? '').toLowerCase()

  if (status === 429 || message.includes('quota') || message.includes('rate limit')) {
    return new AppError(429, 'AI_QUOTA_EXCEEDED', 'Please try again later.')
  }

  if (status === 400) {
    return new AppError(400, 'AI_INVALID_REQUEST', 'Invalid AI request format.')
  }

  return new AppError(503, 'AI_UNAVAILABLE', 'AI assistant is temporarily unavailable.')
}

const buildStudyPrompt = ({ message, context = '', subject }) =>
  [
    subject ? `Current selected subject: ${subject}` : null,
    context ? `Study context:\n${context}` : 'Study context: none provided.',
    `User question:\n${message}`,
  ]
    .filter(Boolean)
    .join('\n\n')

const buildGenerateParams = ({ message, context = '', subject }) => ({
  model: env.GEMINI_MODEL,
  contents: buildStudyPrompt({ message, context, subject }),
  config: {
    systemInstruction: SYSTEM_INSTRUCTION,
    temperature: 0.4,
    maxOutputTokens: 1600,
  },
})

export const generateStudyReply = async ({ message, context = '', subject }) => {
  try {
    const ai = getClient()
    const response = await ai.models.generateContent(buildGenerateParams({ message, context, subject }))

    const text = response.text?.trim()
    if (!text) {
      throw new AppError(503, 'AI_EMPTY_RESPONSE', 'AI assistant is temporarily unavailable.')
    }

    return text
  } catch (error) {
    if (error instanceof AppError) throw error
    throw mapGeminiError(error)
  }
}

export async function* generateStudyReplyStream({ message, context = '', subject }) {
  try {
    const ai = getClient()
    const response = await ai.models.generateContentStream(buildGenerateParams({ message, context, subject }))

    for await (const chunk of response) {
      const text = chunk.text
      if (text) yield text
    }
  } catch (error) {
    if (error instanceof AppError) throw error
    throw mapGeminiError(error)
  }
}
