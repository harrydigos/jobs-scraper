import { db, jobs } from 'database';
import { Job, LinkedInScraper } from 'scraper';

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
        updatedAt: new Date().toISOString(),
        timeSincePosted: jobs.timeSincePosted,
      },
    });
}

async function main() {
  const jobIds = await getJobIds().then((jobs) => jobs.map((j) => j.id));

  try {
    const scraper = await LinkedInScraper.initialize({
      liAtCookie: process.env.LI_AT_COOKIE!,
      scrapedJobIds: jobIds,
    });

    await scraper.searchJobs(
      [
        {
          keywords: 'software engineer',
          location: 'greece',
          relevance: 'recent',
          remote: ['remote', 'hybrid'],
          experience: ['mid-senior'],
          datePosted: '7',
          jobType: ['fulltime'],
        },
        {
          keywords: 'frontend engineer',
          location: 'greece',
          relevance: 'recent',
          remote: ['remote', 'hybrid'],
          experience: ['mid-senior'],
          datePosted: '7',
          jobType: ['fulltime'],
        },
        {
          keywords: 'full stack engineer',
          location: 'greece',
          relevance: 'recent',
          remote: ['remote', 'hybrid'],
          experience: ['mid-senior'],
          datePosted: '7',
          jobType: ['fulltime'],
        },
        {
          keywords: 'frontend engineer',
          location: 'European Union',
          relevance: 'recent',
          remote: ['remote'],
          experience: ['mid-senior', 'associate', 'entry'],
          jobType: ['fulltime'],
        },
        {
          keywords: 'full stack engineer',
          location: 'European Union',
          relevance: 'recent',
          remote: ['remote'],
          experience: ['mid-senior', 'associate', 'entry'],
          jobType: ['fulltime'],
        },
        {
          keywords: 'frontend engineer',
          location: 'EMEA',
          relevance: 'recent',
          remote: ['remote'],
          experience: ['mid-senior', 'associate', 'entry'],
          jobType: ['fulltime'],
        },
        {
          keywords: 'full stack engineer',
          location: 'EMEA',
          relevance: 'recent',
          remote: ['remote'],
          experience: ['mid-senior', 'associate', 'entry'],
          jobType: ['fulltime'],
        },
      ],
      {
        limit: 300,
        excludeFields: [
          'description',
          'applyLink',
          'isReposted',
          'skillsRequired',
          'jobInsights',
          'companyImgLink',
          'jobInsights',
          'skillsRequired',
        ],
        maxConcurrent: 3,
        onScrape: async (job) => {
          await createJob(job);
        },
      },
    );

    await scraper.close();
  } catch (error) {
    console.error('Error:', error);
  }
}

main();
