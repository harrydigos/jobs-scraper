import { db, jobs } from 'database';
import { LinkedInScraper } from '~/core/linkedin-scraper.ts';

export function getAllJobs() {
  return db.select().from(jobs);
}

async function main() {
  try {
    console.log('jobs', await getAllJobs());
  } catch {
    console.log('errorn in scraper');
  }
  const scraper = new LinkedInScraper();

  try {
    await scraper.initialize({ liAtCookie: process.env.LI_AT_COOKIE! });

    await scraper.searchJobs(
      {
        keywords: 'software engineer',
        location: 'greece',
        relevance: 'recent',
        remote: ['remote', 'hybrid'],
        experience: ['mid-senior'],
        // datePosted: "1",
        jobType: ['fulltime'],
      },
      10,
    );

    await scraper.close();
  } catch (error) {
    console.error('Error:', error);
  }
}

main();
