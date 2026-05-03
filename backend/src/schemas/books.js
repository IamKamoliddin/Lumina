import { z } from 'zod'

export const createBookSchema = z.object({
  body: z.object({
    title: z.string().min(1),
    author: z.string().min(1),
    subject: z.string().min(1).optional(),
    total_pages: z.number().int().positive(),
    current_page: z.number().int().nonnegative().optional(),
    status: z.enum(['Reading', 'Want to Read', 'Completed']),
    source_url: z.string().url().optional(),
    is_open_access: z.boolean().optional(),
  }),
  params: z.object({}).optional(),
  query: z.object({}).optional(),
})

export const updateBookSchema = z.object({
  body: z.object({
    current_page: z.number().int().nonnegative().optional(),
    status: z.enum(['Reading', 'Want to Read', 'Completed']).optional(),
  }),
  params: z.object({
    id: z.string().min(1),
  }),
  query: z.object({}).optional(),
})
