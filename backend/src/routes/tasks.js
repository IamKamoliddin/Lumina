import { Router } from 'express'
import { getTasks, postTask, patchTask, removeTask } from '../controllers/tasksController.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()

router.use(requireAuth)
router.get('/', getTasks)
router.post('/', postTask)
router.patch('/:id', patchTask)
router.delete('/:id', removeTask)

export default router
