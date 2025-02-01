export const SELECTORS = {
  activeMenu: "a.global-nav__primary-link--active",
  container: ".jobs-search-results-list",
  jobs: "div.job-card-container",
  jobLink: "a.job-card-container__link",
  jobTitle: ".artdeco-entity-lockup__title .visually-hidden",
  jobDescription: ".jobs-description",
  company: ".artdeco-entity-lockup__subtitle",
  companyLink: ".job-details-jobs-unified-top-card__company-name a",
  companySize: "span.jobs-company__inline-information",
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
  cardMetadata: "ul.job-card-container__metadata-wrapper li span",
  insights: ".job-details-jobs-unified-top-card__container--two-pane li",
  skillsRequired: ".job-details-how-you-match__skills-item-subtitle",
  requirements:
    ".job-details-how-you-match-card__qualification-section-list-item",
  applyButton: "button.jobs-apply-button[role='link']",
} as const;
