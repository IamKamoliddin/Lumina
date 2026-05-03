import { Router } from 'express'
import {
  getAnalytics,
  getActivity,
  getBooks,
  getEvents,
  getLeaderboard,
  getOverview,
  getUsers,
  patchEvent,
  patchLeaderboardVisibility,
  patchUser,
  postEvent,
  removeBook,
  removeEvent,
  removeUser,
  reprocessBook,
  resetLeaderboard,
} from '../controllers/adminController.js'
import { asyncHandler } from '../middleware/asyncHandler.js'
import { requireAdmin, requireAuth } from '../middleware/auth.js'
import { validate } from '../middleware/validate.js'
import {
  createAdminEventSchema,
  updateAdminEventSchema,
  updateAdminUserSchema,
  updateLeaderboardVisibilitySchema,
} from '../schemas/admin.js'

const router = Router()

router.use(requireAuth, asyncHandler(requireAdmin))
router.get('/overview', asyncHandler(getOverview))
router.get('/users', asyncHandler(getUsers))
router.patch('/users/:id', validate(updateAdminUserSchema), asyncHandler(patchUser))
router.delete('/users/:id', asyncHandler(removeUser))
router.get('/books', asyncHandler(getBooks))
router.delete('/books/:id', asyncHandler(removeBook))
router.post('/books/:id/reprocess', asyncHandler(reprocessBook))
router.get('/events', asyncHandler(getEvents))
router.post('/events', validate(createAdminEventSchema), asyncHandler(postEvent))
router.patch('/events/:id', validate(updateAdminEventSchema), asyncHandler(patchEvent))
router.delete('/events/:id', asyncHandler(removeEvent))
router.get('/analytics', asyncHandler(getAnalytics))
router.get('/leaderboard', asyncHandler(getLeaderboard))
router.patch('/leaderboard/users/:id/visibility', validate(updateLeaderboardVisibilitySchema), asyncHandler(patchLeaderboardVisibility))
router.post('/leaderboard/users/:id/reset', asyncHandler(resetLeaderboard))
router.get('/activity/users/:id', asyncHandler(getActivity))

export default router
