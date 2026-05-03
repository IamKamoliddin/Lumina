import { createFocusLog, listFocusLogs } from '../services/focusLogsService.js'

export const getFocusLogs = async (req, res) => {
  const focusLogs = await listFocusLogs(req.user.id)
  res.json({ data: focusLogs })
}

export const postFocusLog = async (req, res) => {
  const focusLog = await createFocusLog(req.user.id, req.validated.body)
  res.status(201).json({ data: focusLog })
}
