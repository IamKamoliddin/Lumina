import { z } from 'zod'

export const updateProfileSchema = z.object({
  body: z.object({
    name: z.string().trim().min(2).max(100),
    username: z.union([
      z.literal(''),
      z.string().trim().toLowerCase().min(3).max(20).regex(/^[a-z0-9_]+$/, 'Use 3-20 lowercase letters, numbers, or underscores'),
    ]).optional(),
    leaderboard_visible: z.boolean().default(true),
    profile_picture_url: z.union([
      z.literal(''),
      z.url(),
    ]).optional(),
  }).strict(),
  params: z.object({}).strict(),
  query: z.object({}).strict(),
})

export const changeEmailSchema = z.object({
  body: z.object({
    email: z.email().transform((value) => value.trim().toLowerCase()),
  }).strict(),
  params: z.object({}).strict(),
  query: z.object({}).strict(),
})

export const changePasswordSchema = z.object({
  body: z.object({
    current_password: z.string().min(8),
    new_password: z
      .string()
      .min(8)
      .max(128)
      .regex(/[A-Z]/, 'Password must include an uppercase letter')
      .regex(/[a-z]/, 'Password must include a lowercase letter')
      .regex(/[0-9]/, 'Password must include a number'),
    confirm_password: z.string().min(8),
  }).strict().refine((data) => data.new_password === data.confirm_password, {
    message: 'Passwords do not match',
    path: ['confirm_password'],
  }),
  params: z.object({}).strict(),
  query: z.object({}).strict(),
})
