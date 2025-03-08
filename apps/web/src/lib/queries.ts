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
  sql,
} from '@jobs-scraper/database';
import dayjs from 'dayjs';

export const getJobs = query(
  async (
    search: string,
    startDate: string,
    endDate: string,
    cursor: string | null = null,
    aggregated: string = 'false',
  ) => {
    'use server';
    search = `%${search.toLowerCase()}%`;

    const start = startDate
      ? dayjs(startDate).startOf('day').toISOString()
      : dayjs('1970-01-01').toISOString();
    const end = endDate
      ? dayjs(endDate).endOf('day').toISOString()
      : dayjs().add(1, 'week').toISOString();

    const isAggregated = aggregated === 'true';

    const query = db
      .select({
        // TODO: aggregate the data of duplicate jobs
        isAggregated: isAggregated
          ? sql<number>`case when count(${jobs.title}) > 1 then 1 else 0 end`
          : sql<number>`0`,
        id: jobs.id,
        title: jobs.title,
        company: jobs.company,
        createdAt: isAggregated ? sql<string>`MAX(${jobs.createdAt})` : jobs.createdAt,
        updatedAt: isAggregated ? sql<string>`MAX(${jobs.updatedAt})` : jobs.updatedAt,
        link: jobs.link,
        location: jobs.location,
        companySize: jobs.companySize,
        remote: jobs.remote,
        timeSincePosted: jobs.timeSincePosted,

        // TODO: these aren't used yet
        // description: jobs.description,
        // companyImgLink: jobs.companyImgLink,
        // isPromoted: jobs.isPromoted,
        // companyLink: jobs.companyLink,
        // jobInsights: jobs.jobInsights,
        // isReposted: jobs.isReposted,
        // skillsRequired: jobs.skillsRequired,
        // requirements: jobs.requirements,
        // applyLink: jobs.applyLink,
      })
      .from(jobs)
      .where(
        and(
          cursor ? lt(jobs.updatedAt, cursor) : undefined,
          or(like(jobs.title, search), like(jobs.company, search)),
          between(jobs.updatedAt, start, end),
        ),
      )
      .limit(50)
      .orderBy(desc(jobs.updatedAt));

    if (isAggregated) {
      query.groupBy(jobs.title, jobs.company);
    }

    return await query;
  },
  'jobs',
);

export type JobsResponse = Awaited<ReturnType<typeof getJobs>>;

export const getTotalJobs = query(async () => {
  'use server';
  return await getAllJobsCount();
}, 'jobs-count');
