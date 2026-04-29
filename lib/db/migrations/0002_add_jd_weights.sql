ALTER TABLE `job_descriptions` ADD COLUMN `skill_weight`      INTEGER NOT NULL DEFAULT 50;
--> statement-breakpoint
ALTER TABLE `job_descriptions` ADD COLUMN `experience_weight` INTEGER NOT NULL DEFAULT 35;
--> statement-breakpoint
ALTER TABLE `job_descriptions` ADD COLUMN `education_weight`  INTEGER NOT NULL DEFAULT 15;
