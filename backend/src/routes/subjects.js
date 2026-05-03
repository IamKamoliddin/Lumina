import { Router } from 'express'
import { getSubjects, postSubject, putSubject, removeSubject } from '../controllers/subjectsController.js'
import { asyncHandler } from '../middleware/asyncHandler.js'
import { requireAuth } from '../middleware/auth.js'
import { validate } from '../middleware/validate.js'
import { createSubjectSchema, deleteSubjectSchema, updateSubjectSchema } from '../schemas/subjects.js'

const router = Router()

router.use(requireAuth)
router.get('/', asyncHandler(getSubjects))
router.post('/', validate(createSubjectSchema), asyncHandler(postSubject))
router.put('/:id', validate(updateSubjectSchema), asyncHandler(putSubject))
router.delete('/:id', validate(deleteSubjectSchema), asyncHandler(removeSubject))

export default router
