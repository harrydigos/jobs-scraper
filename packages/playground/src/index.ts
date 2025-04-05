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
  const jobIds = await getJobIds();

  const scraper = await Scraper.initialize({
    liAtCookie: process.env.LI_AT_COOKIE!,
    scrapedJobIds: jobIds,
    browserOptions: { headless: false },
    // loggerOptions: {
    //   level: 'debug',
    //   transports: ['file', 'console'],
    // },
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
          experience: ['mid-senior', 'associate', 'entry'],
          jobType: ['fulltime'],
          datePosted: '7',
        },
        limit: 100,
        fieldsToExlude: [
          'applyLink',
          'isReposted',
          'skillsRequired',
          'jobInsights',
          // 'companyImgLink',
        ],
        maxConcurrent: 2,
        onScrape: (job) => createJob(job),
      },
    );
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await scraper.close();
  }
})();
