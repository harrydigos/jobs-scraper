import { setupDatabase, insertJob, getAllJobIds } from './db';
import { LinkedInScraper } from './core/linkedin-scraper';

async function main() {
  setupDatabase();

  const scraper = new LinkedInScraper();

  try {
    await scraper.initialize({ liAtCookie: process.env.LI_AT_COOKIE! });

    const jobs = await scraper.searchJobs(
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
      getAllJobIds(),
    );

    for (const job of jobs.map((j) => ({
      id: j.id,
      title: j.title,
      company: j.company,
      remote: j.remote,
      location: j.location,
      timeSincePosted: j.timeSincePosted,
      companySize: j.companySize,
      link: j.link,
    }))) {
      insertJob(job);
    }

    await scraper.close();
  } catch (error) {
    console.error('Error:', error);
  }
}

main();
