import { apiRequest } from './client'

export const fetchSubjectsRequest = () => apiRequest('/api/subjects')

export const createSubjectRequest = (body) =>
  apiRequest('/api/subjects', {
    method: 'POST',
    body: JSON.stringify(body),
  })

export const updateSubjectRequest = (id, body) =>
  apiRequest(`/api/subjects/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  })

export const deleteSubjectRequest = (id) =>
  apiRequest(`/api/subjects/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  })
