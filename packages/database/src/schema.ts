import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const jobs = sqliteTable(
  'jobs',
  {
    id: text('id').primaryKey(),
    createdAt: text('created_at')
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text('updated_at')
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    title: text('title').notNull(),
    link: text('link').notNull(),
    company: text('company').notNull(),
    location: text('location').notNull(),
    description: text('description'),
    companyImgLink: text('company_img_link'),
    companySize: text('company_size'),
    remote: text('remote'),
    isPromoted: integer('is_promoted', { mode: 'boolean' }),
    companyLink: text('company_link'),
    jobInsights: text('job_insights', { mode: 'json' }).$type<string[]>(),
    timeSincePosted: text('time_since_posted'),
    isReposted: integer('is_reposted', { mode: 'boolean' }),
    skillsRequired: text('skills_required', { mode: 'json' }).$type<string[]>(),
    requirements: text('requirements', { mode: 'json' }).$type<string[]>(),
    applyLink: text('apply_link'),
  },
  (t) => [index('title_idx').on(t.title), index('company_idx').on(t.company)],
);
