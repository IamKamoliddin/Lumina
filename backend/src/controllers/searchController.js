import { searchAll } from '../services/searchService.js'
import { asyncHandler } from '../middleware/asyncHandler.js'

export const globalSearch = asyncHandler(async (req, res) => {
  const { q } = req.query
  if (!q) {
    return res.json({ books: [], events: [], subjects: [] })
  }

  const results = await searchAll(req.user.id, q)
  res.json(results)
})
