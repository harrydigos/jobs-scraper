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
import { omit, parseJsonArray } from './utils';

const normalSelect = {
  id: jobs.id,
  ids: sql<string>`json_array(${jobs.id})`, // Wrapped for consistency
  title: jobs.title,
  company: jobs.company,
  createdAt: jobs.createdAt,
  updatedAt: jobs.updatedAt,
  links: sql<string>`json_array(${jobs.link})`,
  locations: sql<string>`json_array(${jobs.location})`,
  companySizes: sql<string>`json_array(${jobs.companySize})`,
  remote: sql<string>`json_array(${jobs.remote})`,
  timeSincePosted: sql<string>`json_array(${jobs.timeSincePosted})`,
  count: sql<number>`1`,
  isAggregated: sql<number>`0`,
};

const aggregatedSelect = {
  id: sql<string>`min(${jobs.id})`,
  ids: sql<string>`json_group_array(${jobs.id})`,
  title: jobs.title,
  company: jobs.company,
  createdAt: sql<string>`min(${jobs.createdAt})`,
  updatedAt: sql<string>`max(${jobs.updatedAt})`,
  links: sql<string>`json_group_array(distinct ${jobs.link})`,
  locations: sql<string>`json_group_array(distinct ${jobs.location})`,
  companySizes: sql<string>`json_group_array(distinct ${jobs.companySize})`,
  remote: sql<string>`json_group_array(distinct ${jobs.remote})`,
  timeSincePosted: sql<string>`json_group_array(distinct ${jobs.timeSincePosted})`,
  count: sql<number>`count(*)`,
  isAggregated: sql<number>`case when count(*) > 1 then 1 else 0 end`,
};

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

    let results;

    const whereClause = and(
      cursor ? lt(jobs.updatedAt, cursor) : undefined,
      or(like(jobs.title, search), like(jobs.company, search)),
      between(jobs.updatedAt, start, end),
    );

    if (!isAggregated) {
      results = await db
        .select(normalSelect)
        .from(jobs)
        .where(whereClause)
        .limit(50)
        .orderBy(desc(jobs.updatedAt));
    } else {
      results = await db
        .select(aggregatedSelect)
        .from(jobs)
        .where(whereClause)
        .groupBy(jobs.title, jobs.company)
        .limit(50)
        .orderBy(desc(sql`max(${jobs.updatedAt})`));
    }

    return results.map((job) => ({
      ...omit(job, ['companySizes']),
      ids: parseJsonArray(job.ids),
      links: parseJsonArray(job.links),
      locations: parseJsonArray(job.locations),
      companySize: parseJsonArray(job.companySizes).filter(Boolean).at(0) || null,
      remote: parseJsonArray(job.remote),
      timeSincePosted: parseJsonArray(job.timeSincePosted).filter(Boolean).at(0) || null,
      isAggregated: job.isAggregated > 0,
    }));
  },
  'jobs',
);

export type JobsResponse = Awaited<ReturnType<typeof getJobs>>;

export const getTotalJobs = query(async () => {
  'use server';
  return await getAllJobsCount();
}, 'jobs-count');
