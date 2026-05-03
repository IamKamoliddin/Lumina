import { z } from 'zod'

const subjectNameSchema = z
  .string()
  .trim()
  .min(1, 'Subject name is required.')
  .min(2, 'Subject name is too short.')
  .max(30, 'Subject name is too long.')
  .refine((value) => /[\p{L}\p{N}]/u.test(value), 'Subject name must include letters or numbers.')

const colorSchema = z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional()

export const createSubjectSchema = z.object({
  body: z.object({
    name: subjectNameSchema,
    color_hex: colorSchema,
  }).strict(),
  params: z.object({}).strict(),
  query: z.object({}).strict(),
})

export const updateSubjectSchema = z.object({
  body: z.object({
    name: subjectNameSchema,
  }).strict(),
  params: z.object({
    id: z.string().min(1),
  }).strict(),
  query: z.object({}).strict(),
})

export const deleteSubjectSchema = z.object({
  body: z.object({}).strict(),
  params: z.object({
    id: z.string().min(1),
  }).strict(),
  query: z.object({}).strict(),
})
