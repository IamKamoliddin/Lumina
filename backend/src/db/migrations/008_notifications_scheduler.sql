ALTER TABLE `notifications`
  ADD COLUMN `action_url` VARCHAR(255),
  ADD COLUMN `scheduled_for` DATETIME DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN `sent_at` DATETIME NULL,
  ADD COLUMN `related_item_id` CHAR(36),
  ADD COLUMN `related_item_type` VARCHAR(32);

UPDATE `notifications`
SET `scheduled_for` = COALESCE(`scheduled_for`, `created_at`),
    `sent_at` = COALESCE(`sent_at`, `created_at`),
    `action_url` = COALESCE(`action_url`, '/dashboard'),
    `related_item_type` = COALESCE(`related_item_type`, 'system');

ALTER TABLE `notifications`
  ADD UNIQUE KEY `idx_notifications_unique_reminder`
    (`user_id`, `related_item_id`, `related_item_type`, `type`, `scheduled_for`),
  ADD KEY `idx_notifications_due` (`user_id`, `scheduled_for`, `sent_at`),
  ADD KEY `idx_notifications_sent_read` (`user_id`, `sent_at`, `is_read`);

CREATE TABLE IF NOT EXISTS `user_notification_preferences` (
  `user_id` CHAR(36) PRIMARY KEY,
  `reminders_enabled` TINYINT(1) NOT NULL DEFAULT 1,
  `exam_reminders_enabled` TINYINT(1) NOT NULL DEFAULT 1,
  `task_reminders_enabled` TINYINT(1) NOT NULL DEFAULT 1,
  `class_reminders_enabled` TINYINT(1) NOT NULL DEFAULT 1,
  `study_reminders_enabled` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
