import {
  changeUserEmail,
  changeUserPassword,
  getUserProfile,
  saveProfileImage,
  updateUserProfile,
} from '../services/userService.js'
import { AppError } from '../utils/appError.js'

export const getProfile = async (req, res) => {
  const profile = await getUserProfile(req.user.id)
  res.json({ user: profile })
}

export const putProfile = async (req, res) => {
  const profile = await updateUserProfile(req.user.id, req.validated.body)
  res.json({
    user: profile,
    message: 'Profile updated successfully.',
  })
}

export const uploadProfileImage = async (req, res) => {
  const allowedTypes = ['image/png', 'image/jpeg', 'image/webp']
  const contentType = req.headers['content-type']

  if (!allowedTypes.includes(contentType)) {
    throw new AppError(400, 'INVALID_PROFILE_IMAGE_TYPE', 'Choose a PNG, JPG, JPEG, or WEBP image.')
  }

  if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
    throw new AppError(400, 'PROFILE_IMAGE_REQUIRED', 'Choose an image to upload.')
  }

  const imageUrl = await saveProfileImage({
    userId: req.user.id,
    buffer: req.body,
    contentType,
    origin: `${req.protocol}://${req.get('host')}`,
  })

  res.status(201).json({ imageUrl })
}

export const putChangeEmail = async (req, res) => {
  const result = await changeUserEmail(req.user.id, req.validated.body.email)
  res.json({
    user: result.user,
    verification_recommended: result.verification_recommended,
    message: 'Email updated successfully.',
  })
}

export const putChangePassword = async (req, res) => {
  await changeUserPassword(req.user.id, req.validated.body)
  res.json({
    message: 'Password updated successfully. Please sign in again.',
  })
}
