import type { LaunchOptions } from "playwright";

export const LI_URLS = {
  home: "https://www.linkedin.com",
  jobs: "https://www.linkedin.com/jobs",
  jobsSearch: "https://www.linkedin.com/jobs/search",
} as const;

export const browserDefaults = {
  headless: false,
  args: [
    "--no-sandbox",
    "--disable-setuid-sandbox",
    "--disable-dev-shm-usage",
    "--disable-gpu",
    "--lang=en-US",
    "--disable-notifications",
    "--disable-extensions",
    "--disable-background-timer-throttling",
    "--disable-backgrounding-occluded-windows",
    "--disable-renderer-backgrounding",
    // "--window-size=1920,1080",
  ],
  slowMo: 50,
  // timeout: 30000,
} satisfies LaunchOptions;
