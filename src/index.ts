import { LinkedInScraper } from "./login";

async function main() {
  const scraper = new LinkedInScraper();

  try {
    await scraper.initialize(process.env.LI_AT_COOKIE!);
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await scraper.close();
  }
}

main();
