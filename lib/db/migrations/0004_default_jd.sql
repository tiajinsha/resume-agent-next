ALTER TABLE `users` ADD COLUMN `default_jd_id` text REFERENCES `job_descriptions`(`id`) ON DELETE SET NULL;
