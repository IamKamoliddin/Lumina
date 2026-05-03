import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import { z } from 'zod'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.resolve(__dirname, '../../.env') })

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  CLIENT_ORIGIN: z.string().default('http://localhost:5173'),
  DB_HOST: z.string().default('localhost'),
  DB_PORT: z.coerce.number().int().positive().default(3306),
  DB_USER: z.string().default('root'),
  DB_PASSWORD: z.string().default(''),
  DB_NAME: z.string().default('lumina'),
  JWT_SECRET: z.string().min(32).default('development-access-secret-minimum-32'),
  JWT_REFRESH_SECRET: z.string().min(32).default('development-refresh-secret-minimum-32'),
  ACCESS_TOKEN_TTL: z.string().default('15m'),
  REFRESH_TOKEN_TTL: z.string().default('7d'),
  ANTHROPIC_API_KEY: z.string().optional(),
  GEMINI_API_KEY: z.string().optional(),
  GEMINI_MODEL: z.string().default('gemini-2.5-flash'),
  GOOGLE_BOOKS_API_KEY: z.string().optional(),
  REDIS_URL: z.string().optional(),
})

const parsed = envSchema.safeParse(process.env)

if (!parsed.success) {
  console.error('Invalid backend environment configuration', parsed.error.flatten().fieldErrors)
  process.exit(1)
}

const clientOrigins = parsed.data.CLIENT_ORIGIN.split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)

if (parsed.data.NODE_ENV === 'production') {
  if (parsed.data.JWT_SECRET.includes('development-') || parsed.data.JWT_REFRESH_SECRET.includes('development-')) {
    console.error('Production secrets must be replaced with secure values')
    process.exit(1)
  }
}

export const env = {
  ...parsed.data,
  CLIENT_ORIGINS: clientOrigins,
  COOKIE_SECURE: parsed.data.NODE_ENV === 'production',
}
