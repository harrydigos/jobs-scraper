import { chromium, type Browser, type Page } from 'playwright';
import { JobDataExtractor } from '~/core/job-data-extractor';
import {
  DATE_POSTED,
  EXPERIENCE,
  type Filters,
  JOB_TYPE,
  RELEVANCE,
  REMOTE,
  URL_PARAMS,
} from '~/types/filters';
import type { Job } from '~/types/job';
import { SELECTORS } from '~/constants/selectors';
import { browserDefaults, LI_URLS } from '~/constants/browser';
import { getRandomArbitrary, sanitizeText, sleep } from '~/utils/utils';
import { retry } from '~/utils/retry';
import { createLogger } from '~/utils/logger';
import type { OptionalFieldsOnly } from '~/types/generics';

const NOOP = () => {};

const logger = createLogger({
  level: 'debug',
  transports: ['console', 'file'],
});

const scrapedJobIds: Set<string> = new Set();

type ScraperOptions = {
  liAtCookie: string;
  scrapedJobIds?: Array<string>;
};

type SearchOptions = {
  onScrape: (job: Job) => void;
  limit?: number;
  excludeFields?: Array<keyof OptionalFieldsOnly<Job>>;
  maxConcurrent?: number;
};

export class LinkedInScraper {
  #browser: Browser | null = null;
  #page: Page | null = null;
  #scraperOptions: Pick<ScraperOptions, 'liAtCookie'> = { liAtCookie: '' };
  #searchOptions: Required<SearchOptions>;
  #activeSearches = new Set<number>();

  private constructor(opts: ScraperOptions) {
    this.#scraperOptions = opts;
    this.#searchOptions = {
      onScrape: NOOP,
      limit: 25,
      excludeFields: [],
      maxConcurrent: 3,
    };
    opts.scrapedJobIds?.forEach((id) => {
      scrapedJobIds.add(id);
    });
  }

  static async initialize(opts: ScraperOptions) {
    const scraper = new LinkedInScraper(opts);

    // Private names are shared between all instances of a given class
    if (!scraper.#scraperOptions.liAtCookie) {
      console.error('liAtCookie must be provided.');
      process.exit(1);
    }

    logger.info('Connecting to a scraping browser');
    scraper.#browser = await chromium.launch(browserDefaults);

    logger.info('Connected, navigating...');

    const ctx = await scraper.#browser.newContext();

    await ctx.addCookies([
      {
        name: 'li_at',
        value: scraper.#scraperOptions.liAtCookie,
        domain: '.linkedin.com',
        path: '/',
      },
    ]);

    logger.debug('Cookie added');

    scraper.#page = await ctx.newPage();
    await scraper.#page.goto(LI_URLS.home);

    logger.debug('Home page');

    if (!(await scraper.#isLoggedIn())) {
      logger.error('Authentication failed. Please check your li_at cookie.');
      throw new Error('Authentication failed. Please check your li_at cookie.');
    }

    logger.info('Successfully authenticated!');

    return scraper;
  }

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

        await sleep(getRandomArbitrary(500, 1500));

        // Keep scrolling to the last item into view until no more items are loaded
        while (true) {
          await sleep(200);

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

  async #extractJobsData(limit: number) {
    if (!this.#page) {
      logger.error('Failed to load page');
      throw new Error('Failed to load page');
    }

    let jobCount = 0;
    const extractor = new JobDataExtractor(this.#page);

    for (const job of await extractor.getJobCards()) {
      if (jobCount === limit) {
        logger.info(`Extracted ${jobCount} jobs`);
        return jobCount;
      }

      try {
        // Avoid scraping job if it's already scraped
        if (scrapedJobIds.has(job.id)) {
          logger.info(`Job id: ${job.id} is already scraped. Skipping...`);
          continue;
        }

        await this.#page.locator(`div[data-job-id="${job.id}"]`).click();
        const loadedDetails = await this.#loadJobDetails(job.id);

        if (!loadedDetails.success) {
          logger.warn('Failed to load job details', { jobId: job.id });
          continue;
        }

        // Store the ID of the successfully scraped job asap to ensure
        // that concurrent scrapers won't attempt to scrape it again.
        scrapedJobIds.add(job.id);

        const extractedJobsData = await extractor.extractJobDetails({
          excludeFields: this.#searchOptions.excludeFields,
        });
        const jobData = {
          ...job,
          company: sanitizeText(job.company),
          remote: sanitizeText(job.remote),
          location: sanitizeText(job.location),
          title: sanitizeText(job.title.replace(/with verification/i, '')),
          ...extractedJobsData,
        } satisfies Job;

        this.#searchOptions.onScrape(jobData);
        jobCount++;

        await this.#page.waitForTimeout(getRandomArbitrary(1500, 4000));
      } catch (e) {
        logger.error(`Failed to process job ${job.id}`, e);
        continue;
      }
    }

    logger.info(`Extracted ${jobCount} jobs`);
    return jobCount;
  }

  async #singleSearch(filters: Filters) {
    if (!this.#page) {
      logger.error('Scraper not initialized');
      throw new Error('Scraper not initialized');
    }

    const searchUrl = this.#constructUrl(filters);

    await this.#page.goto(searchUrl, { waitUntil: 'load' });

    await Promise.allSettled([this.#hideChat(), this.#acceptCookies()]);

    logger.info('Search jobs page');

    let processedJobs = 0;
    const limit = this.#searchOptions.limit;

    while (processedJobs < limit) {
      const loadedJobs = await this.#loadJobs();

      if (!loadedJobs.success && loadedJobs.totalJobs === 0) {
        logger.warn('No jobs found on the current page');
        return;
      }

      logger.info(`Loaded ${loadedJobs.totalJobs} jobs`);

      processedJobs += await this.#extractJobsData(limit - processedJobs);

      if (processedJobs >= limit) {
        logger.info(`Job limit reached (${limit} jobs)`);
        break;
      }

      await this.#paginate();
    }
  }

  async searchJobs(filters: Filters[], opts: SearchOptions): Promise<void>;
  async searchJobs(filters: Filters, opts: Omit<SearchOptions, 'maxConcurrent'>): Promise<void>;
  async searchJobs(filters: Filters | Filters[], opts: SearchOptions): Promise<void> {
    this.#searchOptions = { ...this.#searchOptions, ...opts };

    if (!this.#browser) {
      logger.error('Scraper not initialized');
      throw new Error('Scraper not initialized');
    }

    const searchFilters = Array.isArray(filters) ? filters : [filters];
    const maxConcurrent = opts.maxConcurrent || 3;

    if (searchFilters.length === 1) {
      return this.#singleSearch(searchFilters[0]);
    }

    const searchQueue = searchFilters.map((filter, index) => ({ filter, index }));

    const nextSearch = (callback: (item: (typeof searchQueue)[0]) => void) => {
      const item = searchQueue.shift();
      if (item) {
        callback(item);
      }
    };

    const processSearch = async (filterData: { filter: Filters; index: number }) => {
      const { filter, index } = filterData;
      this.#activeSearches.add(index);

      await sleep(getRandomArbitrary(2000, 5000));

      try {
        const scraper = await LinkedInScraper.initialize(this.#scraperOptions);
        scraper.#searchOptions = this.#searchOptions;

        try {
          await scraper.#singleSearch(filter);
        } catch (e) {
          logger.error('Error in search:', e);
        } finally {
          await scraper.close().catch((e) => logger.error('Error closing context for search', e));
        }
      } finally {
        this.#activeSearches.delete(index);
        nextSearch(processSearch);
      }
    };

    for (let i = 0; i < Math.min(maxConcurrent, searchQueue.length); i++) {
      nextSearch(processSearch);
    }

    // wait until completion
    await new Promise<void>((res) => {
      const interval = setInterval(() => {
        if (this.#activeSearches.size === 0 && searchQueue.length === 0) {
          clearInterval(interval);
          res();
        }
      }, 1000);
    });
  }

  async close() {
    if (this.#page) {
      await this.#page.context().browser()?.close();
      this.#page = null;
      logger.info('Scraper closed successfully');
    }
  }
}
