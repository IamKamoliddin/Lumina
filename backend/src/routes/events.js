import { Router } from 'express'
import { getEvents, postEvent, putEvent, removeEvent } from '../controllers/eventsController.js'
import { asyncHandler } from '../middleware/asyncHandler.js'
import { requireAuth } from '../middleware/auth.js'
import { validate } from '../middleware/validate.js'
import { createEventSchema, updateEventSchema } from '../schemas/events.js'

const router = Router()

router.use(requireAuth)
router.get('/', asyncHandler(getEvents))
router.post('/', validate(createEventSchema), asyncHandler(postEvent))
router.put('/:id', validate(updateEventSchema), asyncHandler(putEvent))
router.delete('/:id', asyncHandler(removeEvent))

export default router
