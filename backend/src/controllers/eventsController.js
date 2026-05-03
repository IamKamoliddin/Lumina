import { createEvent, listEvents, updateEvent, deleteEvent } from '../services/eventsService.js'

export const getEvents = async (req, res) => {
  const events = await listEvents(req.user.id)
  res.json({ data: events })
}

export const postEvent = async (req, res) => {
  const result = await createEvent(req.user.id, req.validated.body)

  if (result.conflict) {
    return res.status(409).json({
      error: {
        code: 'EVENT_CONFLICT',
        message: 'Event overlaps with an existing calendar item',
        details: result.conflict,
      },
    })
  }

  return res.status(201).json({ data: result.event })
}

export const putEvent = async (req, res) => {
  const result = await updateEvent(req.user.id, req.params.id, req.validated.body)
  res.json({ data: result.event })
}

export const removeEvent = async (req, res) => {
  await deleteEvent(req.user.id, req.params.id)
  res.json({ success: true })
}
