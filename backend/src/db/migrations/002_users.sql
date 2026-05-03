CREATE TABLE IF NOT EXISTS `users` (
  `id` CHAR(36) PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL,
  `email` VARCHAR(255) NOT NULL,
  `username` VARCHAR(20),
  `password_hash` VARCHAR(255) NOT NULL,
  `profile_picture_url` LONGTEXT,
  `role` ENUM('user', 'admin') NOT NULL DEFAULT 'user',
  `is_blocked` TINYINT(1) NOT NULL DEFAULT 0,
  `leaderboard_visible` TINYINT(1) NOT NULL DEFAULT 1,
  `last_active_at` DATETIME,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY `idx_users_email` (`email`),
  UNIQUE KEY `idx_users_username` (`username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
