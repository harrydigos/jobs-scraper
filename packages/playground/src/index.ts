import { db, jobs, sql } from '@jobs-scraper/database';
import { type Job, Scraper } from 'jobs-scraper';

async function createJob(job: Job) {
  return await db
    .insert(jobs)
    .values(job)
    .onConflictDoUpdate({
      target: jobs.id,
      set: {
        updatedAt: sql`CURRENT_TIMESTAMP`,
        timeSincePosted: jobs.timeSincePosted,
      },
    });
}

async function getJobIds() {
  return await db
    .select({ id: jobs.id })
    .from(jobs)
    .then((jobs) => jobs.map((j) => j.id));
}

(async function main() {
  const _jobIds = await getJobIds();

  const scraper = await Scraper.initialize({
    liAtCookie: process.env.LI_AT_COOKIE!,
    scrapedJobIds: [],
    browserOptions: { headless: false, slowMo: 1000 },
    loggerOptions: {
      level: 'debug',
      transports: ['console'],
    },
  });

  try {
    await scraper.searchJobs(
      [
        {
          keywords: 'software engineer',
          location: 'greece',
        },
        {
          keywords: 'sofware engineer',
          location: 'European Union',
          remote: ['remote'],
        },
      ],
      {
        filters: {
          relevance: 'recent',
          remote: ['remote', 'hybrid', 'onSite'],
          experience: ['mid-senior', 'director'],
          jobType: ['fulltime', 'parttime'],
          datePosted: '7',
        },
        limit: 100,
        fieldsToExlude: [
          'isReposted',
          'skillsRequired',
          'jobInsights',
          // 'companyImgLink',
        ],
        maxConcurrent: 3,
        onScrape: (job) => createJob(job),
      },
    );
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await scraper.close();
  }
})();
