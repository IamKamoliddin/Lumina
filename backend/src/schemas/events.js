import { z } from 'zod'

export const createEventSchema = z.object({
  body: z.object({
    title: z.string().min(1),
    subject: z.string().min(1),
    type: z.enum(['class', 'exam', 'study_session', 'ai_suggestion']),
    start_time: z.string().min(1),
    end_time: z.string().min(1),
    is_confirmed: z.boolean().optional(),
  }),
  params: z.object({}).optional(),
  query: z.object({}).optional(),
})

export const updateEventSchema = z.object({
  body: z.object({
    title: z.string().min(1).optional(),
    subject: z.string().min(1).optional(),
    type: z.enum(['class', 'exam', 'study_session', 'ai_suggestion']).optional(),
    start_time: z.string().min(1).optional(),
    end_time: z.string().min(1).optional(),
    is_confirmed: z.boolean().optional(),
  }),
  params: z.object({
    id: z.string().min(1),
  }),
  query: z.object({}).optional(),
})
