import express from 'express'
import { getSearchResults } from '../controllers/searchController.js'
import { requireAuth } from '../middleware/auth.js'

const router = express.Router()

router.get('/', requireAuth, getSearchResults)

export default router
