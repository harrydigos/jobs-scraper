import { db, jobs } from 'database';
import { createScraper } from 'scraper';

async function main() {
  try {
    const scraper = await createScraper({ liAtCookie: process.env.LI_AT_COOKIE! });

    const res = await scraper.searchJobs(
      {
        keywords: 'software engineer',
        location: 'greece',
        relevance: 'recent',
        remote: ['remote', 'hybrid'],
        experience: ['mid-senior'],
        datePosted: '1',
        jobType: ['fulltime'],
      },
      50,
      [],
      ['description', 'applyLink', 'isReposted', 'skillsRequired', 'jobInsights'],
    );

    await db
      .insert(jobs)
      .values(res)
      .onConflictDoUpdate({
        target: jobs.id,
        set: {
          updatedAt: new Date().toISOString(),
          timeSincePosted: jobs.timeSincePosted,
        },
      });

    await scraper.close();
  } catch (error) {
    console.error('Error:', error);
  }
}

main();
