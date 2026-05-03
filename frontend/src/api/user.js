import { apiRequest } from './client'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000'

export const getProfileRequest = () => apiRequest('/api/user/profile')

export const updateProfileRequest = (body) =>
  apiRequest('/api/user/profile', {
    method: 'PUT',
    body: JSON.stringify(body),
  })

export const changeEmailRequest = (body) =>
  apiRequest('/api/user/change-email', {
    method: 'PUT',
    body: JSON.stringify(body),
  })

export const changePasswordRequest = (body) =>
  apiRequest('/api/user/change-password', {
    method: 'PUT',
    body: JSON.stringify(body),
  })

export const uploadProfileImageRequest = async (blob) => {
  const response = await fetch(`${API_BASE_URL}/api/user/profile-image`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': blob.type,
    },
    body: blob,
  })

  const payload = await response.json().catch(() => ({}))

  if (!response.ok) {
    const error = new Error(payload?.error?.message ?? payload?.message ?? 'Image upload failed')
    error.status = response.status
    error.code = payload?.error?.code ?? 'IMAGE_UPLOAD_FAILED'
    throw error
  }

  return payload
}
