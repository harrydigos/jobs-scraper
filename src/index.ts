import { writeFile } from "node:fs/promises";
import { LinkedInScraper } from "./login";

async function main() {
  const scraper = new LinkedInScraper();

  try {
    await scraper.initialize(process.env.LI_AT_COOKIE!);

    const jobs = await scraper.searchJobs("software engineer", "greece", 10);
    await writeFile("linkedin-jobs.json", JSON.stringify(jobs, null, 2));
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await scraper.close();
  }
}

main();
