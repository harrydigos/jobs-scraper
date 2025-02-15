// import { db, jobs } from 'database';
// import { createScraper } from 'scraper';

import { LinkedInScraper } from 'scraper';

async function main() {
  try {
    // const scraper = await createScraper({ liAtCookie: process.env.LI_AT_COOKIE! });
    const scraper = await LinkedInScraper.initialize({
      liAtCookie: process.env.LI_AT_COOKIE!,
    });

    await scraper.searchJobs(
      [
        {
          keywords: 'software engineer',
          location: 'greece',
          relevance: 'recent',
          remote: ['remote', 'hybrid'],
          experience: ['mid-senior'],
          datePosted: '1',
          jobType: ['fulltime'],
        },
        {
          keywords: 'frontend engineer',
          location: 'greece',
          relevance: 'recent',
          remote: ['remote', 'hybrid'],
          experience: ['mid-senior'],
          datePosted: '1',
          jobType: ['fulltime'],
        },
        {
          keywords: 'frontend engineer',
          location: 'Europe',
          relevance: 'recent',
          remote: ['remote'],
          experience: ['mid-senior'],
          jobType: ['fulltime'],
        },
      ],
      {
        limit: 3,
        excludeFields: ['description', 'applyLink', 'isReposted', 'skillsRequired', 'jobInsights'],
        onScrape: async (job) => {
          console.log('Scraped job', job.id);
          // await db
          //   .insert(jobs)
          //   .values(job)
          //   .onConflictDoUpdate({
          //     target: jobs.id,
          //     set: {
          //       updatedAt: new Date().toISOString(),
          //       timeSincePosted: jobs.timeSincePosted,
          //     },
          //   });
        },
        maxConcurrent: 2,
      },
    );

    await scraper.close();
  } catch (error) {
    console.error('Error:', error);
  }
}

main();
