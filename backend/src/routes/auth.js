import { Router } from 'express'
import { login, logout, me, refresh, register } from '../controllers/authController.js'
import { asyncHandler } from '../middleware/asyncHandler.js'
import { requireAuth } from '../middleware/auth.js'
import { authRateLimit } from '../middleware/rateLimit.js'
import { validate } from '../middleware/validate.js'
import { loginSchema, registerSchema } from '../schemas/auth.js'

const router = Router()

router.use(authRateLimit)
router.post('/register', validate(registerSchema), asyncHandler(register))
router.post('/login', validate(loginSchema), asyncHandler(login))
router.post('/refresh', asyncHandler(refresh))
router.get('/me', requireAuth, asyncHandler(me))
router.post('/logout', asyncHandler(logout))

export default router
