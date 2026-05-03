import { z } from 'zod'

export const publicLeaderboardSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: z.object({
    period: z.enum(['daily', 'weekly', 'monthly']).default('weekly'),
    subject: z.string().trim().min(1).max(30).default('all'),
    search: z.string().max(20).default(''),
    limit: z.coerce.number().int().positive().max(100).default(50),
  }),
})
