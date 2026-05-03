import { Router } from 'express'
import { getLeaderboard, getMyRank } from '../controllers/leaderboardController.js'
import { asyncHandler } from '../middleware/asyncHandler.js'
import { requireAuth } from '../middleware/auth.js'
import { validate } from '../middleware/validate.js'
import { publicLeaderboardSchema } from '../schemas/leaderboard.js'

const router = Router()

router.use(requireAuth)
router.get('/', validate(publicLeaderboardSchema), asyncHandler(getLeaderboard))
router.get('/me', asyncHandler(getMyRank))

export default router
