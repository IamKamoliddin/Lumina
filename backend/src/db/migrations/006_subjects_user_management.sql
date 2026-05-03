ALTER TABLE `subjects`
  ADD COLUMN `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

ALTER TABLE `subjects`
  ADD UNIQUE KEY `idx_subjects_user_name` (`user_id`, `name`);
