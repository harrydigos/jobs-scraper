import { LinkedInScraper } from "./core/linkedin-scraper";

async function main() {
  const scraper = new LinkedInScraper();

  try {
    await scraper.initialize({ liAtCookie: process.env.LI_AT_COOKIE! });

    await scraper.searchJobs(
      {
        keywords: "software engineer",
        location: "greece",
        relevance: "recent",
        remote: ["remote"],
      },
      5,
    );
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await scraper.close();
  }
}

main();
