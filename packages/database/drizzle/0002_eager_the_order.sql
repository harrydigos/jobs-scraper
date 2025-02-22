PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_jobs` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`title` text NOT NULL,
	`link` text NOT NULL,
	`company` text NOT NULL,
	`location` text NOT NULL,
	`description` text,
	`company_img_link` text,
	`company_size` text,
	`remote` text,
	`is_promoted` integer,
	`company_link` text,
	`job_insights` text,
	`time_since_posted` text,
	`is_reposted` integer,
	`skills_required` text,
	`requirements` text,
	`apply_link` text
);
--> statement-breakpoint
INSERT INTO `__new_jobs`("id", "created_at", "updated_at", "title", "link", "company", "location", "description", "company_img_link", "company_size", "remote", "is_promoted", "company_link", "job_insights", "time_since_posted", "is_reposted", "skills_required", "requirements", "apply_link") SELECT "id", "created_at", "updated_at", "title", "link", "company", "location", "description", "company_img_link", "company_size", "remote", "is_promoted", "company_link", "job_insights", "time_since_posted", "is_reposted", "skills_required", "requirements", "apply_link" FROM `jobs`;--> statement-breakpoint
DROP TABLE `jobs`;--> statement-breakpoint
ALTER TABLE `__new_jobs` RENAME TO `jobs`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `title_idx` ON `jobs` (`title`);--> statement-breakpoint
CREATE INDEX `company_idx` ON `jobs` (`company`);