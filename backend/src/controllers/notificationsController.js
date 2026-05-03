import { pool } from '../db/pool.js'
import {
  getNotificationPreferences,
  getUnreadCount,
  listNotifications,
  releaseDueNotifications,
  updateNotificationPreferences,
} from '../services/notificationsService.js'

export const getNotifications = async (req, res, next) => {
  try {
    const notifications = await listNotifications(req.user.id)
    const unreadCount = await getUnreadCount(req.user.id)
    res.json({ notifications, unreadCount })
  } catch (error) {
    next(error)
  }
}

export const checkNotifications = async (req, res, next) => {
  try {
    await releaseDueNotifications(req.user.id)
    const unreadCount = await getUnreadCount(req.user.id)
    res.json({ unreadCount })
  } catch (error) {
    next(error)
  }
}

export const markAsRead = async (req, res, next) => {
  try {
    const userId = req.user.id
    const { id } = req.params

    await pool.query(
      'UPDATE `notifications` SET `is_read` = 1 WHERE `id` = ? AND `user_id` = ?',
      [id, userId]
    )

    res.json({ success: true })
  } catch (error) {
    next(error)
  }
}

export const markAllAsRead = async (req, res, next) => {
  try {
    const userId = req.user.id

    await pool.query(
      'UPDATE `notifications` SET `is_read` = 1 WHERE `user_id` = ? AND `sent_at` IS NOT NULL',
      [userId]
    )

    res.json({ success: true })
  } catch (error) {
    next(error)
  }
}

export const getPreferences = async (req, res, next) => {
  try {
    const preferences = await getNotificationPreferences(req.user.id)
    res.json({ preferences })
  } catch (error) {
    next(error)
  }
}

export const putPreferences = async (req, res, next) => {
  try {
    const preferences = await updateNotificationPreferences(req.user.id, req.body)
    res.json({ preferences })
  } catch (error) {
    next(error)
  }
}
