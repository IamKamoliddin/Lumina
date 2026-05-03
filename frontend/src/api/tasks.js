import { apiRequest } from './client'

export const fetchTasksRequest = () => apiRequest('/api/tasks')

export const createTaskRequest = (body) =>
  apiRequest('/api/tasks', {
    method: 'POST',
    body: JSON.stringify(body),
  })

export const updateTaskRequest = (id, body) =>
  apiRequest(`/api/tasks/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  })

export const deleteTaskRequest = (id) =>
  apiRequest(`/api/tasks/${id}`, {
    method: 'DELETE',
  })
