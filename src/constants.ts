import type { LaunchOptions } from "playwright";

export const LI_URLS = {
  home: "https://www.linkedin.com",
  jobs: "https://www.linkedin.com/jobs",
  jobsSearch: "https://www.linkedin.com/jobs/search",
  jobView: "https://www.linkedin.com/jobs/view",
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
  jobTitle: ".artdeco-entity-lockup__title .visually-hidden",
  jobDescription: ".jobs-description",
  company: ".artdeco-entity-lockup__subtitle",
  companyLink: ".job-details-jobs-unified-top-card__company-name a",
  jobCardSkeletons: [
    ".scaffold-skeleton",
    ".scaffold-skeleton-container",
    ".scaffold-skeleton-entity",
    ".job-card-container__ghost-placeholder",
  ],
  cookieAcceptBtn: 'button.artdeco-global-alert-action[action-type="ACCEPT"]',
  chatPanel: ".msg-overlay-list-bubble",
  detailsPanel: ".jobs-search__job-details--container",
  timeSincePosted:
    ".job-details-jobs-unified-top-card__primary-description-container span:nth-of-type(3)",

  // job-card-container__metadata-wrapper
  // applyBtn: 'button.jobs-apply-button[role="link"]',
  insights: ".job-details-jobs-unified-top-card__container--two-pane li",
  skillsRequired: ".job-details-how-you-match__skills-item-subtitle",
  requirements:
    ".job-details-how-you-match-card__qualification-section-list-item",
} as const;
