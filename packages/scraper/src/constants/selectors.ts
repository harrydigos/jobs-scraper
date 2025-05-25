export const SELECTORS = {
  activeMenu: 'a.global-nav__primary-link--active',
  jobs: 'div.job-card-job-posting-card-wrapper[data-view-name="job-card"]',
  jobTitle: '.artdeco-entity-lockup__title .visually-hidden',
  jobDescription: '.jobs-description',
  company: '.artdeco-entity-lockup__subtitle',
  companyLink: '.job-details-jobs-unified-top-card__company-name a',
  companySize: 'span.jobs-company__inline-information',
  cardMetadata: '.artdeco-entity-lockup__caption',
  cardMetadataFooter: 'ul.job-card-job-posting-card-wrapper__footer-items',
  jobCardSkeletons: [
    '.scaffold-skeleton',
    '.scaffold-skeleton-container',
    '.scaffold-skeleton-entity',
    '.job-card-container__ghost-placeholder',
  ],
  cookieAcceptBtn: 'button.artdeco-global-alert-action[action-type="ACCEPT"]',
  chatPanel: '.msg-overlay-list-bubble',
  detailsPanel: '.jobs-search__job-details--container',
  timeSincePosted:
    '.job-details-jobs-unified-top-card__primary-description-container span:nth-of-type(3)',
  insights: '.job-details-jobs-unified-top-card__container--two-pane li',
  skillsRequired: '.job-details-how-you-match__skills-item-subtitle',
  requirements: '.job-details-how-you-match-card__qualification-section-list-item',
  applyButton: "button.jobs-apply-button[role='link']",
  list: '.scaffold-layout__list ul',
} as const;

export const MODAL_SELECTORS = {
  closeButton: '.artdeco-modal.artdeco-modal--layer-default .artdeco-modal__dismiss',
  content: {
    shareProfileInfoButton: "input[role='switch'].artdeco-toggle__button",
    applyButton: 'button[role="link"].jobs-apply-button',
  },
} as const;
