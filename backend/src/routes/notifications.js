import { Router } from 'express'
import {
  checkNotifications,
  getNotifications,
  getPreferences,
  markAsRead,
  markAllAsRead,
  putPreferences,
} from '../controllers/notificationsController.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()

router.use(requireAuth)

router.get('/', getNotifications)
router.post('/check', checkNotifications)
router.get('/preferences', getPreferences)
router.put('/preferences', putPreferences)
router.post('/read-all', markAllAsRead)
router.patch('/:id/read', markAsRead)

export default router
