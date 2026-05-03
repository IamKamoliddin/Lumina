import { Router } from 'express'
import { getArchiveBookFile, getArchiveBookText, getBooks, getGoogleBookFile, getGutenbergBookFile, getGutenbergBookText, getOpenBooks, patchBook, postBook } from '../controllers/booksController.js'
import { asyncHandler } from '../middleware/asyncHandler.js'
import { requireAuth } from '../middleware/auth.js'
import { validate } from '../middleware/validate.js'
import { createBookSchema, updateBookSchema } from '../schemas/books.js'

const router = Router()

router.use(requireAuth)
router.get('/', asyncHandler(getBooks))
router.get('/open', asyncHandler(getOpenBooks))
router.get('/gutenberg/:id/text', asyncHandler(getGutenbergBookText))
router.get('/gutenberg/:id/file', asyncHandler(getGutenbergBookFile))
router.get('/archive/:id/text', asyncHandler(getArchiveBookText))
router.get('/archive/:id/file', asyncHandler(getArchiveBookFile))
router.get('/google/:id/file', asyncHandler(getGoogleBookFile))
router.post('/', validate(createBookSchema), asyncHandler(postBook))
router.patch('/:id', validate(updateBookSchema), asyncHandler(patchBook))

export default router
