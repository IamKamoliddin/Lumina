ALTER TABLE `events`
  ADD COLUMN `subject_name` VARCHAR(64);

UPDATE `events` e
LEFT JOIN `subjects` s ON e.`subject_id` = s.`id`
SET e.`subject_name` = COALESCE(e.`subject_name`, s.`name`, 'General/AI');
