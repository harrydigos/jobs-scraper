import { LinkedInScraper } from "./core/linkedin-scraper";
import { jobsToCSV, readIdsFromCSV } from "./utils/csv";

async function main() {
  const ids = await readIdsFromCSV("jobs-1738430201285.csv");

  const scraper = new LinkedInScraper();

  try {
    await scraper.initialize({ liAtCookie: process.env.LI_AT_COOKIE! });

    const jobs = await scraper.searchJobs(
      {
        keywords: "software engineer",
        location: "greece",
        relevance: "recent",
        remote: ["remote", "hybrid"],
        experience: ["mid-senior"],
        // datePosted: "1",
        jobType: ["fulltime"],
      },
      320,
      ids,
    );

    await scraper.close();

    await jobsToCSV(jobs, `jobs-${Date.now()}.csv`, [
      "id",
      "title",
      "company",
      "remote",
      "location",
      "timeSincePosted",
      "companySize",
      "link",
    ]);
  } catch (error) {
    console.error("Error:", error);
  }
}

main();
