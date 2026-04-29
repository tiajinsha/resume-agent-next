CREATE TABLE `candidates` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text,
	`email` text,
	`phone` text,
	`city` text,
	`age` integer,
	`target_role` text,
	`role` text,
	`company` text,
	`years` integer,
	`school` text,
	`major` text,
	`degree` text,
	`grad_date` text,
	`skills` text,
	`summary` text,
	`extracted_json` text,
	`status` text DEFAULT '待筛选' NOT NULL,
	`extraction_status` text DEFAULT 'uploaded' NOT NULL,
	`extraction_error` text,
	`extraction_attempts` integer DEFAULT 0 NOT NULL,
	`pdf_path` text NOT NULL,
	`pdf_size` integer NOT NULL,
	`pdf_pages` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_candidates_extraction_status` ON `candidates` (`extraction_status`);--> statement-breakpoint
CREATE INDEX `idx_candidates_status` ON `candidates` (`status`);--> statement-breakpoint
CREATE INDEX `idx_candidates_created_at` ON `candidates` (`created_at`);