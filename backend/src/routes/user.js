import { Router } from 'express'
import express from 'express'
import {
  getProfile,
  putChangeEmail,
  putChangePassword,
  putProfile,
  uploadProfileImage,
} from '../controllers/userController.js'
import { asyncHandler } from '../middleware/asyncHandler.js'
import { requireAuth } from '../middleware/auth.js'
import { validate } from '../middleware/validate.js'
import {
  changeEmailSchema,
  changePasswordSchema,
  updateProfileSchema,
} from '../schemas/user.js'

const router = Router()

router.use(requireAuth)
router.get('/profile', asyncHandler(getProfile))
router.post(
  '/profile-image',
  express.raw({ type: ['image/png', 'image/jpeg', 'image/webp'], limit: '2mb' }),
  asyncHandler(uploadProfileImage),
)
router.put('/profile', validate(updateProfileSchema), asyncHandler(putProfile))
router.put('/change-email', validate(changeEmailSchema), asyncHandler(putChangeEmail))
router.put('/change-password', validate(changePasswordSchema), asyncHandler(putChangePassword))

export default router
