import { z } from 'zod'

export const createFocusLogSchema = z.object({
  body: z.object({
    subject: z.string().min(1),
    total_minutes: z.number().int().positive(),
    started_at: z.string().min(1),
  }),
  params: z.object({}).optional(),
  query: z.object({}).optional(),
})
