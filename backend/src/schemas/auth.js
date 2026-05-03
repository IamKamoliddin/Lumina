import { z } from 'zod'

export const registerSchema = z.object({
  body: z.object({
    name: z.string().min(2),
    email: z.email(),
    password: z
      .string()
      .min(8)
      .regex(/[A-Z]/, 'Password must include an uppercase letter')
      .regex(/[a-z]/, 'Password must include a lowercase letter')
      .regex(/[0-9]/, 'Password must include a number'),
  }).strict(),
  params: z.object({}).strict(),
  query: z.object({}).strict(),
})

export const loginSchema = z.object({
  body: z.object({
    email: z.email(),
    password: z.string().min(8),
  }).strict(),
  params: z.object({}).strict(),
  query: z.object({}).strict(),
})
