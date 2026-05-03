import { apiRequest } from './client'

export const fetchEventsRequest = () => apiRequest('/api/events')

export const createEventRequest = (body) =>
  apiRequest('/api/events', {
    method: 'POST',
    body: JSON.stringify(body),
  })

export const updateEventRequest = (id, body) =>
  apiRequest(`/api/events/${id}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  })

export const deleteEventRequest = (id) =>
  apiRequest(`/api/events/${id}`, {
    method: 'DELETE',
  })
