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

export const SELECTORS = {
  activeMenu: "a.global-nav__primary-link--active",
  container: ".jobs-search-results-list",
  jobs: "div.job-card-container",
  jobLink: "a.job-card-container__link",
  title: ".artdeco-entity-lockup__title",
  company: ".artdeco-entity-lockup__subtitle",
  companyLink:
    ".job-details-jobs-unified-top-card__primary-description-container a",
  place: ".artdeco-entity-lockup__caption",
  date: "time",
} as const;
// job-card-container__metadata-wrapper
