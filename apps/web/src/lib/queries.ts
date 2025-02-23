import { query } from '@solidjs/router';
import { and, between, db, desc, getAllJobsCount, jobs, like, lt, or } from 'database';

export const getJobs = query(
  async (search: string, startDate: string, endDate: string, cursor: string | null = null) => {
    'use server';
    search = `%${search.toLowerCase()}%`;

    // TODO: add a date lib bc this is hell
    const start = startDate
      ? new Date(new Date(startDate).setHours(0, 0, 0, 0)).toISOString()
      : new Date(1970, 0, 1).toISOString();
    const end = endDate
      ? new Date(new Date(endDate).setHours(23, 59, 59, 999)).toISOString()
      : new Date(new Date().setFullYear(new Date().getFullYear() + 100)).toISOString();

    const query = db
      .select()
      .from(jobs)
      .where(
        and(
          cursor ? lt(jobs.updatedAt, cursor) : undefined,
          or(like(jobs.title, search), like(jobs.company, search)),
          between(jobs.updatedAt, start, end),
        ),
      );

    return await query.limit(25).orderBy(desc(jobs.updatedAt));
  },
  'jobs',
);

export const getTotalJobs = query(async () => {
  'use server';
  return await getAllJobsCount();
}, 'jobs-count');
