import { query } from '@solidjs/router';
import {
  and,
  between,
  db,
  desc,
  getAllJobsCount,
  jobs,
  like,
  lt,
  or,
} from '@jobs-scraper/database';
import dayjs from 'dayjs';

export const getJobs = query(
  async (search: string, startDate: string, endDate: string, cursor: string | null = null) => {
    'use server';
    search = `%${search.toLowerCase()}%`;

    const start = startDate
      ? dayjs(startDate).startOf('day').toISOString()
      : dayjs('1970-01-01').toISOString();
    const end = endDate
      ? dayjs(endDate).endOf('day').toISOString()
      : dayjs().add(1, 'week').toISOString();

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
