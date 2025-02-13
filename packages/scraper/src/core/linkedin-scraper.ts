import { chromium, type Page } from 'playwright';
import { browserDefaults, LI_URLS, SELECTORS } from '~/constants/index.ts';
import { getRandomArbitrary, retry, sanitizeText, sleep, createLogger } from '~/utils/index.ts';
import { JobDataExtractor } from '~/core/job-data-extractor.ts';
import {
  DATE_POSTED,
  EXPERIENCE,
  type Filters,
  JOB_TYPE,
  RELEVANCE,
  REMOTE,
  URL_PARAMS,
} from '~/types/index.ts';
import type { Job, NewJob } from 'database'; // TODO: create another type and dont use code from database

const logger = createLogger({
  level: 'debug',
  transports: ['console', 'file'],
});

class LinkedInScraper {
  #page: Page | null = null;

  #constructUrl(filters: Filters) {
    const url = new URL(LI_URLS.jobsSearch);
    url.searchParams.append(URL_PARAMS.keywords, filters.keywords);
    url.searchParams.append(URL_PARAMS.location, filters.location);

    if (filters.relevance) {
      url.searchParams.append(URL_PARAMS.sort, RELEVANCE[filters.relevance]);
    }

    if (filters.remote?.length) {
      url.searchParams.append(URL_PARAMS.remote, filters.remote.map((r) => REMOTE[r]).join(','));
    }

    if (filters.datePosted) {
      url.searchParams.append(URL_PARAMS.datePosted, DATE_POSTED[filters.datePosted]);
    }

    if (filters.experience?.length) {
      url.searchParams.append(
        URL_PARAMS.experience,
        filters.experience.map((e) => EXPERIENCE[e]).join(','),
      );
    }

    if (filters.jobType?.length) {
      url.searchParams.append(
        URL_PARAMS.jobType,
        filters.jobType.map((t) => JOB_TYPE[t]).join(','),
      );
    }

    if (filters.easyApply) {
      url.searchParams.append(URL_PARAMS.easyApply, `${filters.easyApply}`);
    }

    return url.toString();
  }

  async #isLoggedIn() {
    return await this.#page?.locator(SELECTORS.activeMenu).first().isVisible();
  }

  async #paginate(size = 25) {
    if (!this.#page) {
      logger.error('Failed to load page');
      throw new Error('🔴 Failed to load page');
    }
    logger.debug('Navigate to next page');

    const url = new URL(this.#page.url());
    const offset = Number(url.searchParams.get('start') ?? '0');
    url.searchParams.set('start', `${offset + size}`);

    await this.#page.goto(url.toString(), {
      waitUntil: 'load',
    });
  }

  async #hideChat() {
    try {
      await this.#page?.evaluate((s) => {
        const chatPanel = document.querySelector<HTMLElement>(s);
        if (chatPanel) {
          chatPanel.style.display = 'none';
        }
      }, SELECTORS.chatPanel);
    } catch (e) {
      logger.error('Failed to hide chat', e);
    }
  }

  async #acceptCookies() {
    try {
      const isAcceptButtonVisible = await this.#page?.isVisible(SELECTORS.cookieAcceptBtn);
      if (isAcceptButtonVisible) {
        await this.#page?.click(SELECTORS.cookieAcceptBtn);
        return true;
      }
    } catch (e) {
      logger.error('Failed to accept cookies', e);
    }
  }

  async initialize({ liAtCookie }: { liAtCookie: string }) {
    if (!liAtCookie) {
      console.error('liAtCookie must be provided.');
      process.exit(1);
    }

    logger.info('Connecting to a scraping browser');
    const browser = await chromium.launch(browserDefaults);
    logger.info('Connected, navigating...');

    const ctx = await browser.newContext();

    await ctx.addCookies([
      {
        name: 'li_at',
        value: liAtCookie,
        domain: '.linkedin.com',
        path: '/',
      },
    ]);

    logger.debug('Cookie added');

    this.#page = await ctx.newPage();
    await this.#page.goto(LI_URLS.home);

    logger.debug('Home page');

    if (!(await this.#isLoggedIn())) {
      logger.error('Authentication failed. Please check your li_at cookie.');
      throw new Error('Authentication failed. Please check your li_at cookie.');
    }

    logger.info('Successfully authenticated!');
  }

  async #waitForSkeletonsToBeRemoved() {
    await Promise.allSettled(
      SELECTORS.jobCardSkeletons.map((selector) =>
        this.#page?.waitForSelector(selector, {
          timeout: 3000,
          state: 'detached',
        }),
      ),
    );
  }

  async #loadJobs() {
    return retry(
      async () => {
        if (!this.#page) {
          logger.error('Failed to load page');
          throw new Error('Failed to load page');
        }

        logger.debug('Load jobs');

        await this.#waitForSkeletonsToBeRemoved();

        if (await this.#page.getByText(/No matching jobs found./i).isVisible()) {
          logger.info('No matching jobs found. Exiting');
          return { success: false, totalJobs: 0 };
        }

        const list = this.#page.locator(SELECTORS.list).first();

        if (!list.isVisible()) {
          logger.error('No job list found');
          throw new Error('No job list found');
        }

        const timeoutDuration = 10000;
        const startTime = Date.now();

        let currentCount = 0;

        // Keep scrolling to the last item into view until no more items are loaded
        while (true) {
          await sleep(50);

          currentCount = await list.evaluate((e, s) => {
            const list = Array.from(e.querySelectorAll(s));
            list.at(-1)?.scrollIntoView();
            return list.length;
          }, SELECTORS.jobs);

          await this.#waitForSkeletonsToBeRemoved();

          if (Date.now() - startTime > timeoutDuration) {
            logger.warn('Timeout reached, exiting scrolling loop.');
            return { success: false, totalJobs: currentCount };
          }

          if (currentCount === 25) {
            break; // No new items loaded, exit
          }
        }

        return { success: true, totalJobs: currentCount };
      },
      {
        maxAttempts: 3,
        delayMs: 300,
        timeout: 30000,
        onRetry: (err) => logger.warn('Retrying job load', err),
      },
    );
  }

  async searchJobs(filters: Filters, limit = 25, ids?: string[], excludeFields?: (keyof Job)[]) {
    if (!this.#page) {
      logger.error('Scraper not initialized');
      throw new Error('Scraper not initialized');
    }

    const searchUrl = this.#constructUrl(filters);

    await this.#page.goto(searchUrl, { waitUntil: 'load' });

    await Promise.allSettled([this.#hideChat(), this.#acceptCookies()]);

    logger.info('Search jobs page');

    let processedJobs = 0;
    const jobs: NewJob[] = [];

    while (processedJobs < limit) {
      const loadedJobs = await this.#loadJobs();

      if (!loadedJobs.success && loadedJobs.totalJobs === 0) {
        logger.warn('No jobs found on the current page');
        return jobs;
      }

      logger.info(`Loaded ${loadedJobs.totalJobs} jobs`);

      const extractedJobs = await this.extractJobsData(
        limit - processedJobs,
        ids || [],
        excludeFields || [],
      );
      processedJobs += extractedJobs.length;
      jobs.push(...extractedJobs);

      if (processedJobs >= limit) {
        logger.info(`Job limit reached (${limit} jobs)`);
        break;
      }

      await this.#paginate();
    }
    return jobs;
  }

  async #loadJobDetails(jobId: string) {
    return retry(
      async () => {
        if (!this.#page) {
          logger.error('Failed to load page');
          throw new Error('Failed to load page');
        }

        await this.#waitForSkeletonsToBeRemoved();

        const detailsPanel = this.#page.locator(SELECTORS.detailsPanel);

        const [isVisible, content] = await Promise.all([
          detailsPanel.isVisible(),
          detailsPanel.innerHTML(),
        ]);
        const isSuccess = isVisible && content.includes(jobId);

        if (!isSuccess) {
          logger.error('Failed to load job details', { jobId });
          throw new Error('Failed to load job details');
        }

        return {
          success: isSuccess,
        };
      },
      {
        maxAttempts: 3,
        delayMs: 200,
        timeout: 2000,
        onRetry: (err) => logger.warn('Retrying job details load', err),
      },
    );
  }

  async extractJobsData(limit: number, ids: string[], excludeFields: (keyof Job)[]) {
    if (!this.#page) {
      logger.error('Failed to load page');
      throw new Error('Failed to load page');
    }

    const jobs = new Map<string, NewJob>();
    const extractor = new JobDataExtractor(this.#page);

    for (const job of await extractor.getJobCards(limit)) {
      if (ids.includes(job.id)) {
        logger.debug('Skipped job because it existed');
        continue;
      }
      try {
        await this.#page.locator(`div[data-job-id="${job.id}"]`).click();
        const loadedDetails = await this.#loadJobDetails(job.id);

        if (!loadedDetails.success) {
          logger.warn('Failed to load job details', { jobId: job.id });
          continue;
        }

        const extractedJobsData = await extractor.extractJobDetails({ excludeFields });
        const jobData = {
          ...job,
          company: sanitizeText(job.company),
          remote: sanitizeText(job.remote),
          location: sanitizeText(job.location),
          title: sanitizeText(job.title),
          ...extractedJobsData,
        };

        // check again here. TODO: maybe remove
        for (const field of excludeFields) {
          Reflect.deleteProperty(jobData, field);
        }

        jobs.set(job.id, jobData);

        await this.#page.waitForTimeout(getRandomArbitrary(500, 2500)); // to handle rate limiting. maybe remove/reduce
        // await this.#page.waitForTimeout(getRandomArbitrary(100, 300)); // to handle rate limiting. maybe remove/reduce
      } catch (e) {
        logger.error(`Failed to process job ${job.id}`, e);
        continue;
      }
    }

    logger.info(`Extracted ${jobs.size} jobs`);
    return Array.from(jobs.values());
  }

  async close() {
    if (this.#page) {
      await this.#page.context().browser()?.close();
      this.#page = null;
      logger.info('Scraper closed successfully');
    }
  }
}

export { LinkedInScraper };
