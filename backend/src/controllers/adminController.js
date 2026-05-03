import {
  createAdminEvent,
  deleteAdminBook,
  deleteAdminEvent,
  deleteAdminUser,
  getAdminAnalytics,
  getAdminOverview,
  listAdminBooks,
  listAdminEvents,
  listAdminActivity,
  listAdminLeaderboard,
  listAdminUsers,
  reprocessAdminBook,
  resetLeaderboardForUser,
  hideUserFromLeaderboard,
  updateAdminEvent,
  updateAdminUser,
} from '../services/adminService.js'

export const getOverview = async (_req, res) => {
  res.json({ data: await getAdminOverview() })
}

export const getUsers = async (req, res) => {
  res.json({ data: await listAdminUsers(req.query.search ?? '') })
}

export const patchUser = async (req, res) => {
  res.json({ data: await updateAdminUser(req.user.id, req.params.id, req.validated.body) })
}

export const removeUser = async (req, res) => {
  await deleteAdminUser(req.user.id, req.params.id)
  res.status(204).send()
}

export const getBooks = async (req, res) => {
  res.json({ data: await listAdminBooks(req.query.search ?? '') })
}

export const removeBook = async (req, res) => {
  await deleteAdminBook(req.params.id)
  res.status(204).send()
}

export const reprocessBook = async (req, res) => {
  await reprocessAdminBook(req.params.id)
  res.json({ success: true })
}

export const getEvents = async (_req, res) => {
  res.json({ data: await listAdminEvents() })
}

export const postEvent = async (req, res) => {
  res.status(201).json({ data: await createAdminEvent(req.validated.body) })
}

export const patchEvent = async (req, res) => {
  await updateAdminEvent(req.params.id, req.validated.body)
  res.json({ success: true })
}

export const removeEvent = async (req, res) => {
  await deleteAdminEvent(req.params.id)
  res.status(204).send()
}

export const getAnalytics = async (_req, res) => {
  res.json({ data: await getAdminAnalytics() })
}

export const getLeaderboard = async (req, res) => {
  res.json({ data: await listAdminLeaderboard(req.query) })
}

export const patchLeaderboardVisibility = async (req, res) => {
  await hideUserFromLeaderboard(req.user.id, req.params.id, req.validated.body.visible)
  res.json({ success: true })
}

export const resetLeaderboard = async (req, res) => {
  await resetLeaderboardForUser(req.user.id, req.params.id)
  res.json({ success: true })
}

export const getActivity = async (req, res) => {
  res.json({ data: await listAdminActivity(req.params.id) })
}
