ALTER TABLE `candidates` ADD `role_category` text;--> statement-breakpoint
CREATE INDEX `idx_candidates_role_category` ON `candidates` (`role_category`);