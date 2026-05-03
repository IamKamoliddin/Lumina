import { Router } from 'express'
import { postChat, postChatStream, postSuggest } from '../controllers/aiController.js'
import { asyncHandler } from '../middleware/asyncHandler.js'
import { requireAuth } from '../middleware/auth.js'
import { aiRateLimit } from '../middleware/rateLimit.js'
import { validate } from '../middleware/validate.js'
import { chatSchema } from '../schemas/ai.js'

const router = Router()

router.use(requireAuth)
router.use(aiRateLimit)
router.post('/chat/stream', validate(chatSchema), asyncHandler(postChatStream))
router.post('/chat', validate(chatSchema), asyncHandler(postChat))
router.post('/suggest', validate(chatSchema), asyncHandler(postSuggest))

export default router
