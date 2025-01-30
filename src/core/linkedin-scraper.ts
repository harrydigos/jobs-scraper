import { chromium, Page } from "playwright";
import { browserDefaults, LI_URLS, SELECTORS } from "../constants";
import { getRandomArbitrary, retry, sanitizeText } from "../utils";
import { JobDataExtractor } from "./job-data-extractor";
import { createLogger } from "../utils/logger";
import type { Job } from "../types";
import { Filters, RELEVANCE } from "../types/filters";

const logger = createLogger({
  level: "debug",
  transports: ["console", "file"],
});

class LinkedInScraper {
  #page: Page | null = null;

  #constructUrl(filters: Filters) {
    const url = new URL(LI_URLS.jobsSearch);
    url.searchParams.append("keywords", filters.keywords);
    url.searchParams.append("location", filters.location);

    if (filters.relevance) {
      url.searchParams.append("sortBy", RELEVANCE[filters.relevance]);
    }
    if (filters.remote) {
      url.searchParams.append("f_WT", filters.remote.join(","));
    }

    return url.toString();
  }

  async #isLoggedIn() {
    return await this.#page?.locator(SELECTORS.activeMenu).first().isVisible();
  }

  async #paginate(paginationSize = 25) {
    if (!this.#page) {
      logger.error("Failed to load page");
      throw new Error("🔴 Failed to load page");
    }
    logger.debug("Navigate to next page");

    const url = new URL(this.#page.url());
    const offset = Number(url.searchParams.get("start") ?? "0");
    url.searchParams.set("start", `${offset + paginationSize}`);

    await this.#page.goto(url.toString(), {
      waitUntil: "load",
    });
  }

  async #hideChat() {
    try {
      await this.#page?.evaluate((s) => {
        const chatPanel = document.querySelector<HTMLElement>(s);
        if (chatPanel) {
          chatPanel.style.display = "none";
        }
      }, SELECTORS.chatPanel);
    } catch (e) {
      logger.error("Failed to hide chat", e);
    }
  }

  async #acceptCookies() {
    try {
      const isAcceptButtonVisible = await this.#page?.isVisible(
        SELECTORS.cookieAcceptBtn,
      );
      if (isAcceptButtonVisible) {
        await this.#page?.click(SELECTORS.cookieAcceptBtn);
        return true;
      }
    } catch (e) {
      logger.error("Failed to accept cookies", e);
    }
  }

  async initialize({ liAtCookie }: { liAtCookie: string }) {
    logger.info("Connecting to a scraping browser");
    const browser = await chromium.launch(browserDefaults);
    logger.info("Connected, navigating...");

    const ctx = await browser.newContext();

    await ctx.addCookies([
      {
        name: "li_at",
        value: liAtCookie,
        domain: ".linkedin.com",
        path: "/",
      },
    ]);

    logger.debug("Cookie added");

    this.#page = await ctx.newPage();
    await this.#page.goto(LI_URLS.home);

    logger.debug("Home page");

    if (!(await this.#isLoggedIn())) {
      logger.error("Authentication failed. Please check your li_at cookie.");
      throw new Error("Authentication failed. Please check your li_at cookie.");
    }

    logger.info("Successfully authenticated!");
  }

  async #waitForSkeletonsToBeRemoved() {
    await Promise.allSettled(
      SELECTORS.jobCardSkeletons.map((selector) =>
        this.#page?.waitForSelector(selector, {
          timeout: 3000,
          state: "detached",
        }),
      ),
    );
  }

  async #loadJobs() {
    return retry(
      async () => {
        if (!this.#page) {
          logger.error("Failed to load page");
          throw new Error("Failed to load page");
        }

        logger.debug("Load jobs");

        await this.#waitForSkeletonsToBeRemoved();

        const getCount = () => this.#page?.locator(SELECTORS.jobs).count();
        const getLastLocator = () => this.#page?.locator(SELECTORS.jobs).last();

        let count = await getCount();
        let lastItemLocator = getLastLocator();

        // Keep scrolling to the last item into view until no more items are loaded
        while (true) {
          await lastItemLocator?.scrollIntoViewIfNeeded();
          await this.#waitForSkeletonsToBeRemoved();

          const currentCount = await getCount();

          if (currentCount === count) {
            break; // No new items loaded, exit
          }

          count = currentCount;
          lastItemLocator = getLastLocator();
        }

        return { success: true as boolean, totalJobs: count };
      },
      {
        maxAttempts: 3,
        delayMs: 300,
        timeout: 30000,
        onRetry: (err) => logger.warn("Retrying job load", err),
      },
    );
  }

  async searchJobs(filters: Filters, limit = 25) {
    if (!this.#page) {
      logger.error("Scraper not initialized");
      throw new Error("Scraper not initialized");
    }

    const searchUrl = this.#constructUrl(filters);

    await this.#page.goto(searchUrl, { waitUntil: "load" });

    await Promise.allSettled([this.#hideChat(), this.#acceptCookies()]);

    logger.info("Search jobs page");

    let processedJobs = 0;
    const jobs: Job[] = [];

    while (processedJobs < limit) {
      const loadedJobs = await this.#loadJobs();

      if (!loadedJobs.success) {
        logger.warn("No jobs found on the current page");
        return [];
      }

      const extractedJobs = await this.extractJobsData(limit - processedJobs);
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
          logger.error("Failed to load page");
          throw new Error("Failed to load page");
        }

        await this.#waitForSkeletonsToBeRemoved();

        const detailsPanel = this.#page.locator(SELECTORS.detailsPanel);

        const [isVisible, content] = await Promise.all([
          detailsPanel.isVisible(),
          detailsPanel.innerHTML(),
        ]);
        const isSuccess = isVisible && content.includes(jobId);

        if (!isSuccess) {
          logger.error("Failed to load job details", { jobId });
          throw new Error("Failed to load job details");
        }

        return {
          success: isSuccess,
        };
      },
      {
        maxAttempts: 3,
        delayMs: 200,
        timeout: 2000,
        onRetry: (err) => logger.warn("Retrying job details load", err),
      },
    );
  }

  async extractJobsData(limit: number) {
    if (!this.#page) {
      logger.error("Failed to load page");
      throw new Error("Failed to load page");
    }

    const jobs = new Map<string, Job>();
    const extractor = new JobDataExtractor(this.#page);

    for (const job of await extractor.getJobCards(limit)) {
      try {
        await this.#page.locator(`div[data-job-id="${job.id}"]`).click();
        const loadedDetails = await this.#loadJobDetails(job.id);

        if (!loadedDetails.success) {
          logger.warn("Failed to load job details", { jobId: job.id });
          continue;
        }

        const {
          description,
          timeSincePosted,
          companyLink,
          skillsRequired,
          requirements,
          jobInsights,
          applyLink,
        } = await extractor.getJobDetails();

        jobs.set(job.id, {
          ...job,
          ...extractor.parseJobLocation(job.company),
          title: sanitizeText(job.title),
          companyLink,
          description: description.map(sanitizeText).join("\n"),
          jobInsights: jobInsights.map(sanitizeText),
          timeSincePosted,
          isReposted: timeSincePosted.includes("Reposted"),
          skillsRequired,
          requirements,
          applyLink,
        });

        await this.#page.waitForTimeout(getRandomArbitrary(100, 300)); // to handle rate limiting. maybe remove/reduce
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
      logger.info("Scraper closed successfully");
    }
  }
}

export { LinkedInScraper };
