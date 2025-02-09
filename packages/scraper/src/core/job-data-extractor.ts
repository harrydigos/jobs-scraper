import type { Page } from 'playwright';
import { sanitizeText, createLogger } from '~/utils/index.ts';
import { SELECTORS } from '~/constants/selectors.ts';
import type { Job, NewJob } from 'database';

const logger = createLogger({
  level: 'debug',
  transports: ['console', 'file'],
});

export class JobDataExtractor {
  constructor(private page: Page) {}

  async getDescription() {
    return this.page.evaluate(
      (selector) =>
        Array.from(document.querySelector(selector)?.querySelectorAll('p, li') || []).map(
          (el) => el.textContent?.trim() || '',
        ),
      SELECTORS.jobDescription,
    );
  }

  async getTimeSincePosted() {
    return this.page.evaluate(
      (selector) => document.querySelector(selector)?.textContent || '',
      SELECTORS.timeSincePosted,
    );
  }

  async getCompanyLink() {
    return this.page.evaluate(
      (selector) => document.querySelector(selector)?.getAttribute('href') || '',
      SELECTORS.companyLink,
    );
  }

  async getCompanySize() {
    return this.page.evaluate(
      (selector) => document.querySelectorAll(selector)?.[0]?.textContent || '',
      SELECTORS.companySize,
    );
  }

  async getSkills() {
    return this.page.evaluate(
      (selector) =>
        Array.from(document.querySelectorAll(selector))
          .flatMap((el) => (el.textContent || '').split(', '))
          .map((skill) => skill.replace(/and/g, '').trim())
          .filter(Boolean),
      SELECTORS.skillsRequired,
    );
  }

  async getRequirements() {
    return this.page.evaluate(
      (selector) =>
        Array.from(document.querySelectorAll(selector))
          .map((el) => (el.textContent || '').trim())
          .filter(Boolean),
      SELECTORS.requirements,
    );
  }

  async getJobInsights() {
    return this.page.evaluate(
      (selector) =>
        Array.from(document.querySelectorAll(selector))
          .map((e) => e.textContent || '')
          .filter(Boolean),
      SELECTORS.insights,
    );
  }

  async getApplyLink() {
    try {
      const applyButton = this.page.locator(SELECTORS.applyButton).first();
      if ((await applyButton.count()) === 0) return '';

      const [newPage] = await Promise.all([
        this.page.context().waitForEvent('page', { timeout: 8000 }),
        applyButton.click(),
      ]);

      if (!newPage || newPage === this.page) return '';

      const url = new URL(newPage.url());
      url.search = '';
      await newPage.close();
      return url.toString();
    } catch (e) {
      logger.error('Failed to get apply link', e);
      return '';
    }
  }

  async getJobCards(limit: number) {
    logger.debug('Extracting job cards', { limit });
    try {
      return await this.page.evaluate(
        ({ selectors, limit }) => {
          return Array.from(document.querySelectorAll(selectors.jobs))
            .slice(0, Math.min(limit, 25))
            .map((job) => {
              const meta = (job.querySelector(selectors.cardMetadata)?.textContent || '').split(
                '(',
              );
              const link = new URL(
                job.querySelector<HTMLAnchorElement>(selectors.jobLink)?.href || '',
              );
              link.search = '';

              return {
                id: job.getAttribute('data-job-id') || '',
                title: job.querySelector(selectors.jobTitle)?.textContent || '',
                link: link.toString(),
                company: job.querySelector(selectors.company)?.textContent || '',
                companyImgLink: job.querySelector('img')?.getAttribute('src') || '',
                isPromoted: Array.from(job.querySelectorAll('li')).some(
                  (item) => item.textContent?.trim() === 'Promoted',
                ),
                location: meta?.[0] || '',
                remote: meta?.[1]?.replace(')', '') || '',
              };
            });
        },
        { selectors: SELECTORS, limit },
      );
    } catch (error) {
      logger.error('Failed to extract job cards', error);
      return [];
    }
  }

  async #getJobDetails(excludeFields: Set<keyof Job> = new Set()) {
    const tasks = {
      description: excludeFields.has('description') ? undefined : this.getDescription(),
      timeSincePosted: excludeFields.has('timeSincePosted') ? undefined : this.getTimeSincePosted(),
      companyLink: excludeFields.has('companyLink') ? undefined : this.getCompanyLink(),
      skillsRequired: excludeFields.has('skillsRequired') ? undefined : this.getSkills(),
      requirements: excludeFields.has('requirements') ? undefined : this.getRequirements(),
      jobInsights: excludeFields.has('jobInsights') ? undefined : this.getJobInsights(),
      applyLink: excludeFields.has('applyLink') ? undefined : this.getApplyLink(),
      companySize: excludeFields.has('companySize') ? undefined : this.getCompanySize(),
    };
    const results = await Promise.allSettled(Object.values(tasks).filter(Boolean));

    let resultIndex = 0;
    const jobDetails: Partial<NewJob> = {};

    for (const key of Object.keys(tasks)) {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      if (!tasks?.[key]) {
        continue;
      }
      const result = results[resultIndex++];
      if (result.status === 'fulfilled') {
        Reflect.set(jobDetails, key, result.value);
      } else {
        logger.error(`Failed to extract job detail: ${key}`, result.reason);
      }
    }

    return jobDetails;
  }

  async extractJobDetails(opts?: { excludeFields?: (keyof Job)[] }) {
    const excludeFields = new Set(opts?.excludeFields || []);

    if (excludeFields.size) {
      logger.debug('Extracting job details except', opts!.excludeFields!.join(', '));
    } else {
      logger.debug('Extracting full job details');
    }
    const jobDetails = await this.#getJobDetails(excludeFields);

    return {
      description: jobDetails.description
        ? (jobDetails.description as unknown as string[]).map(sanitizeText).join('\n')
        : undefined,
      companyLink: jobDetails.companyLink,
      jobInsights: jobDetails.jobInsights ? jobDetails.jobInsights.map(sanitizeText) : undefined,
      timeSincePosted: jobDetails.timeSincePosted,
      skillsRequired: jobDetails.skillsRequired,
      requirements: jobDetails.requirements,
      applyLink: jobDetails.applyLink,
      companySize: jobDetails.companySize
        ? sanitizeText(jobDetails.companySize).split(' ')?.[0] || ''
        : undefined,
      isReposted: jobDetails.timeSincePosted
        ? jobDetails.timeSincePosted.includes('Reposted')
        : undefined,
    } satisfies Partial<NewJob>;
  }
}
