CREATE TABLE `users` (
  `id`            text PRIMARY KEY NOT NULL,
  `username`      text NOT NULL UNIQUE,
  `display_name`  text,
  `password_hash` text NOT NULL,
  `created_at`    integer NOT NULL,
  `updated_at`    integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `sessions` (
  `id`         text PRIMARY KEY NOT NULL,
  `user_id`    text NOT NULL REFERENCES `users`(`id`) ON DELETE CASCADE,
  `expires_at` integer NOT NULL,
  `created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_sessions_user_id` ON `sessions` (`user_id`);
--> statement-breakpoint
ALTER TABLE `candidates` ADD COLUMN `user_id` text REFERENCES `users`(`id`);
--> statement-breakpoint
ALTER TABLE `job_descriptions` ADD COLUMN `user_id` text REFERENCES `users`(`id`);
