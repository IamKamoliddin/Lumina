import {
  getMyLeaderboardSummary,
  getPublicLeaderboard,
} from '../services/leaderboardService.js'

export const getLeaderboard = async (req, res) => {
  const data = await getPublicLeaderboard(req.validated.query)
  res.json({ data })
}

export const getMyRank = async (req, res) => {
  const data = await getMyLeaderboardSummary(req.user.id)
  res.json({ data })
}
