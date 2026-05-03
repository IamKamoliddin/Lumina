ALTER TABLE `users`
  ADD COLUMN `username` VARCHAR(20);

ALTER TABLE `users`
  ADD COLUMN `leaderboard_visible` TINYINT(1) NOT NULL DEFAULT 1;

ALTER TABLE `users`
  ADD UNIQUE KEY `idx_users_username` (`username`);

CREATE TABLE IF NOT EXISTS `study_activity` (
  `id` CHAR(36) PRIMARY KEY,
  `user_id` CHAR(36) NOT NULL,
  `type` ENUM('lesson_completed', 'focus_session', 'task_completed', 'exam_completed') NOT NULL,
  `subject` VARCHAR(64) NOT NULL DEFAULT 'General/AI',
  `value` INT NOT NULL DEFAULT 1,
  `source_id` VARCHAR(64),
  `started_at` DATETIME,
  `ended_at` DATETIME,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `validated` TINYINT(1) NOT NULL DEFAULT 1,
  `suspicious_reason` VARCHAR(255),
  UNIQUE KEY `idx_activity_once` (`user_id`, `type`, `source_id`),
  KEY `idx_activity_user_created` (`user_id`, `created_at`),
  KEY `idx_activity_type_subject` (`type`, `subject`),
  KEY `idx_activity_validated` (`validated`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `leaderboard_scores` (
  `id` CHAR(36) PRIMARY KEY,
  `user_id` CHAR(36) NOT NULL,
  `period` ENUM('daily', 'weekly', 'monthly') NOT NULL,
  `period_start` DATETIME NOT NULL,
  `period_end` DATETIME NOT NULL,
  `subject` VARCHAR(64) NOT NULL DEFAULT 'all',
  `score` INT NOT NULL DEFAULT 0,
  `completed_lessons` INT NOT NULL DEFAULT 0,
  `focus_minutes` INT NOT NULL DEFAULT 0,
  `completed_tasks` INT NOT NULL DEFAULT 0,
  `completed_exams` INT NOT NULL DEFAULT 0,
  `streak_days` INT NOT NULL DEFAULT 0,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `idx_leaderboard_user_period_subject` (`user_id`, `period`, `period_start`, `subject`),
  KEY `idx_leaderboard_period_score` (`period`, `period_start`, `subject`, `score`),
  KEY `idx_leaderboard_user` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `admin_audit_logs` (
  `id` CHAR(36) PRIMARY KEY,
  `admin_id` CHAR(36),
  `action` VARCHAR(64) NOT NULL,
  `target_user_id` CHAR(36),
  `details` TEXT,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  KEY `idx_admin_audit_target_created` (`target_user_id`, `created_at`),
  KEY `idx_admin_audit_admin_created` (`admin_id`, `created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
