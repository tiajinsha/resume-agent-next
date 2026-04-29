CREATE TABLE `job_descriptions` (
  `id`              text PRIMARY KEY NOT NULL,
  `title`           text NOT NULL,
  `description`     text NOT NULL,
  `required_skills` text NOT NULL DEFAULT '[]',
  `bonus_skills`    text NOT NULL DEFAULT '[]',
  `min_years`       integer,
  `required_degree` text NOT NULL DEFAULT '不限',
  `created_at`      integer NOT NULL,
  `updated_at`      integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_jd_created_at` ON `job_descriptions` (`created_at`);
--> statement-breakpoint
ALTER TABLE `candidates` ADD COLUMN `match_results` text;
