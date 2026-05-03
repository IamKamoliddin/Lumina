import { Router } from 'express'
import { getFocusLogs, postFocusLog } from '../controllers/focusLogsController.js'
import { asyncHandler } from '../middleware/asyncHandler.js'
import { requireAuth } from '../middleware/auth.js'
import { validate } from '../middleware/validate.js'
import { createFocusLogSchema } from '../schemas/focusLogs.js'

const router = Router()

router.use(requireAuth)
router.get('/', asyncHandler(getFocusLogs))
router.post('/', validate(createFocusLogSchema), asyncHandler(postFocusLog))

export default router
