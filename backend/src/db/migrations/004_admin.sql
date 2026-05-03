ALTER TABLE `users`
  ADD COLUMN `role` ENUM('user', 'admin') NOT NULL DEFAULT 'user';

ALTER TABLE `users`
  ADD COLUMN `is_blocked` TINYINT(1) NOT NULL DEFAULT 0;

ALTER TABLE `users`
  ADD COLUMN `last_active_at` DATETIME;

ALTER TABLE `books`
  ADD COLUMN `file_size_bytes` BIGINT NOT NULL DEFAULT 0;

ALTER TABLE `books`
  ADD COLUMN `upload_status` VARCHAR(32) NOT NULL DEFAULT 'ready';
