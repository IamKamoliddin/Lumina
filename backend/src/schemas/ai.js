import { z } from 'zod'

export const chatSchema = z.object({
  body: z.object({
    message: z.string().trim().min(1, 'Message is required').max(4000, 'Message is too long'),
    context: z.string().max(12000, 'Context is too long').optional().default(''),
    subject: z.string().trim().max(80).optional(),
    userId: z.string().max(128).optional(),
  }),
  params: z.object({}).optional(),
  query: z.object({}).optional(),
})
