import { apiRequest } from './client'

export const fetchBooksRequest = () => apiRequest('/api/books')
export const fetchOpenBooksRequest = (query = 'subject:textbooks') =>
  apiRequest(`/api/books/open?q=${encodeURIComponent(query)}&maxResults=24`)

export const createBookRequest = (body) =>
  apiRequest('/api/books', {
    method: 'POST',
    body: JSON.stringify(body),
  })

export const updateBookRequest = (id, body) =>
  apiRequest(`/api/books/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  })
