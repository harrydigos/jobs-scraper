import { LinkedInScraper } from "./linkedin-scraper";

async function main() {
  const scraper = new LinkedInScraper();

  try {
    await scraper.initialize(process.env.LI_AT_COOKIE!);

    await scraper.searchJobs("software engineer", "greece", 52);
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await scraper.close();
  }
}

main();
