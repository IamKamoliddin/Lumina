export type User = {
  id: string
  name: string
  email: string
  username?: string
  role?: 'user' | 'admin'
  profile_picture_url?: string
  leaderboard_visible?: boolean
}

export type AuthSession = {
  user: User
  accessToken?: string
  refreshToken?: string
}

export type LuminaEvent = {
  id: string
  title: string
  type: string
  subject?: string
  subject_name?: string
  start_time: string
  end_time: string
  is_confirmed?: boolean
}

export type Book = {
  id: string
  title: string
  author?: string
  status: string
  subject?: string
  current_page?: number
  total_pages?: number
  ai_summary?: string
}

export type NotificationItem = {
  id: string
  title: string
  message: string
  type: string
  is_read: boolean
  created_at: string
}
