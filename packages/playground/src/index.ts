import { db, jobs, sql } from 'database';
import { Job, Scraper } from 'scraper';

function getJobIds() {
  return db.select({ id: jobs.id }).from(jobs);
}

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

async function main() {
  const jobIds = await getJobIds().then((jobs) => jobs.map((j) => j.id));

  try {
    const scraper = await Scraper.initialize({
      liAtCookie: process.env.LI_AT_COOKIE!,
      scrapedJobIds: jobIds,
      browserOptions: { headless: true },
    });

    await scraper.searchJobs(
      [
        {
          keywords: 'frontend engineer',
          location: 'greece',
        },
        {
          keywords: 'full stack engineer',
          location: 'greece',
        },
        {
          keywords: 'frontend engineer',
          location: 'European Union',
        },
        {
          keywords: 'full stack engineer',
          location: 'European Union',
        },
        {
          keywords: 'frontend engineer',
          location: 'European Economic Area',
        },
        {
          keywords: 'full stack engineer',
          location: 'European Economic Area',
        },
      ],
      {
        filters: {
          relevance: 'recent',
          remote: ['remote'],
          experience: ['mid-senior', 'associate', 'entry'],
          jobType: ['fulltime'],
          datePosted: '7',
        },
        limit: 100,
        fieldsToExlude: [
          'description',
          'applyLink',
          'isReposted',
          'skillsRequired',
          'jobInsights',
          'companyImgLink',
          'jobInsights',
          'skillsRequired',
        ],
        maxConcurrent: 2,
        onScrape: (job) => createJob(job),
      },
    );

    await scraper.close();
  } catch (error) {
    console.error('Error:', error);
  }
}

main();
