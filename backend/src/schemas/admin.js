import { z } from 'zod'

export const updateAdminUserSchema = z.object({
  body: z.object({
    role: z.enum(['user', 'admin']).optional(),
    is_blocked: z.boolean().optional(),
  }).strict(),
  params: z.object({
    id: z.string().min(1),
  }),
  query: z.object({}).strict(),
})

export const createAdminEventSchema = z.object({
  body: z.object({
    user_id: z.string().min(1).optional(),
    assign_to_all: z.boolean().optional(),
    title: z.string().min(1),
    type: z.enum(['study_session', 'exam', 'ai_suggestion']),
    start_time: z.string().datetime(),
    end_time: z.string().datetime(),
    is_confirmed: z.boolean().optional(),
  }).strict().refine((data) => data.assign_to_all || data.user_id, {
    message: 'Choose a target user or assign to all users',
    path: ['user_id'],
  }),
  params: z.object({}).strict(),
  query: z.object({}).strict(),
})

export const updateAdminEventSchema = z.object({
  body: z.object({
    title: z.string().min(1).optional(),
    type: z.enum(['study_session', 'exam', 'ai_suggestion']).optional(),
    start_time: z.string().datetime().optional(),
    end_time: z.string().datetime().optional(),
  }).strict(),
  params: z.object({
    id: z.string().min(1),
  }),
  query: z.object({}).strict(),
})

export const updateLeaderboardVisibilitySchema = z.object({
  body: z.object({
    visible: z.boolean(),
  }).strict(),
  params: z.object({
    id: z.string().min(1),
  }),
  query: z.object({}).strict(),
})
