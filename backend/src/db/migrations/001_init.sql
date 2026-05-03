CREATE TABLE IF NOT EXISTS `subjects` (
  `id` CHAR(36) PRIMARY KEY,
  `user_id` CHAR(36) NOT NULL,
  `name` VARCHAR(64) NOT NULL,
  `color_hex` VARCHAR(7) NOT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `books` (
  `id` CHAR(36) PRIMARY KEY,
  `user_id` CHAR(36) NOT NULL,
  `subject_id` CHAR(36),
  `title` VARCHAR(255) NOT NULL,
  `author` VARCHAR(255),
  `status` VARCHAR(32) NOT NULL,
  `current_page` INT DEFAULT 0,
  `total_pages` INT DEFAULT 0,
  `ai_summary` TEXT,
  `source_url` VARCHAR(512),
  `is_open_access` TINYINT(1) DEFAULT 0,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  KEY `idx_books_user_status` (`user_id`, `status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `events` (
  `id` CHAR(36) PRIMARY KEY,
  `user_id` CHAR(36) NOT NULL,
  `subject_id` CHAR(36),
  `title` VARCHAR(255) NOT NULL,
  `type` VARCHAR(32) NOT NULL,
  `start_time` DATETIME NOT NULL,
  `end_time` DATETIME NOT NULL,
  `is_confirmed` TINYINT(1) DEFAULT 1,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  KEY `idx_events_user_start` (`user_id`, `start_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `notifications` (
  `id` CHAR(36) PRIMARY KEY,
  `user_id` CHAR(36) NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `message` TEXT NOT NULL,
  `type` VARCHAR(32) NOT NULL,
  `is_read` TINYINT(1) DEFAULT 0,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  KEY `idx_notifications_user_read` (`user_id`, `is_read`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `tasks` (
  `id` CHAR(36) PRIMARY KEY,
  `user_id` CHAR(36) NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `subject` VARCHAR(64) NOT NULL DEFAULT 'General/AI',
  `due_date` DATETIME,
  `group_name` VARCHAR(32) NOT NULL DEFAULT 'Today',
  `is_done` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  KEY `idx_tasks_user_created` (`user_id`, `created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `focus_logs` (
  `id` CHAR(36) PRIMARY KEY,
  `user_id` CHAR(36) NOT NULL,
  `subject` VARCHAR(64) NOT NULL DEFAULT 'General/AI',
  `total_minutes` INT NOT NULL DEFAULT 0,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  KEY `idx_focus_logs_user_created` (`user_id`, `created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
