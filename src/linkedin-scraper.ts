import { chromium, Page } from "playwright";
import { browserDefaults, LI_URLS, SELECTORS } from "./constants";
import { retry } from "./utils";

type Job = {
  id: string;
  title: string;
  link: string;
  description?: string;
  company: string;
  companyImgLink: string;
  place: string;
  date: string;
  isPromoted: boolean;
  companyLink: string;
  jobInsights: Array<string>;
  timeSincePosted: string;
  isReposted: boolean;
  skillsRequired: Array<string>;
};

function sanitizeText(rawText: string | null | undefined) {
  return (
    rawText
      ?.replace(/[\r\n\t]+/g, " ")
      .replace(/\s\s+/g, " ")
      .trim() || ""
  );
}

function getRandomArbitrary(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

class LinkedInScraper {
  #page: Page | null = null;
  #screenshotCount = 1;

  async #takeScreenshot(log = "Taking screenshot...") {
    console.log(`📷 ${log}`);
    await this.#page?.screenshot({
      path: `screenshots/${this.#screenshotCount.toString().padStart(5, "0")}_page.png`,
      fullPage: true,
    });
    this.#screenshotCount++;
  }

  async #isLoggedIn() {
    return await this.#page?.locator(SELECTORS.activeMenu).first().isVisible();
  }

  async #paginate(paginationSize = 25) {
    if (!this.#page) {
      throw new Error("🔴 Failed to load page");
    }

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
      console.error("🔴 Failed to hide chat:", e);
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
      console.error("🔴 Failed to accept cookies:", e);
    }
  }

  async initialize({ liAtCookie }: { liAtCookie: string }) {
    console.log("🟡 Connecting to a scraping browser");

    const browser = await chromium.launch(browserDefaults);

    console.log("🟢 Connected, navigating...");

    const ctx = await browser.newContext();

    await ctx.addCookies([
      {
        name: "li_at",
        value: liAtCookie,
        domain: ".linkedin.com",
        path: "/",
      },
    ]);

    this.#page = await ctx.newPage();

    await this.#page.goto(LI_URLS.home);

    if (!this.#isLoggedIn()) {
      await this.#takeScreenshot("🔴 Authentication failed");
      throw new Error(
        "🔴 Authentication failed. Please check your li_at cookie.",
      );
    }

    console.log("🟢 Successfully authenticated!");
    await this.#takeScreenshot("Home page");
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
        if (!this.#page) throw new Error("🔴 Failed to load page");

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
      },
    );
  }

  async searchJobs(keywords: string, location: string, limit = 25) {
    if (!this.#page) throw new Error("🔴 Scraper not initialized");

    const searchUrl = `${LI_URLS.jobsSearch}?keywords=${encodeURIComponent(keywords)}&location=${encodeURIComponent(location)}`;

    await this.#page.goto(searchUrl, { waitUntil: "load" });

    await Promise.allSettled([this.#hideChat(), this.#acceptCookies()]);

    await this.#takeScreenshot("Search jobs page");

    let processedJobs = 0;
    const jobs: Job[] = [];

    while (processedJobs < limit) {
      const { success: jobsSuccess } = await this.#loadJobs();

      if (!jobsSuccess) {
        await this.#takeScreenshot("🔴 No jobs found");
        return [];
      }

      const extractedJobs = await this.extractJobsData(limit - processedJobs);
      processedJobs += extractedJobs.length;
      jobs.push(...extractedJobs);

      if (processedJobs >= limit) {
        await this.#takeScreenshot("🟢 Job limit reached");
        break;
      }

      await this.#paginate();
    }

    console.log(jobs, { length: jobs.length });
  }

  async #loadJobDetails(jobId: string) {
    return retry(
      async () => {
        if (!this.#page) throw new Error("🔴 Failed to load page");

        await this.#waitForSkeletonsToBeRemoved();

        const detailsPanel = this.#page.locator(SELECTORS.detailsPanel);

        const [isVisible, content] = await Promise.all([
          detailsPanel.isVisible(),
          detailsPanel.innerHTML(),
        ]);
        const isSuccess = isVisible && content.includes(jobId);

        if (!isSuccess) throw new Error("🔴 Failed to load job details");

        return {
          success: isSuccess,
        };
      },
      {
        maxAttempts: 3,
        delayMs: 200,
        timeout: 2000,
        onRetry: (err) => console.error(err),
      },
    );
  }

  /**
   * Extracts all available job cards from the provided page.
   */
  async extractJobsData(limit: number) {
    if (!this.#page) {
      throw new Error("🔴 Failed to load page");
    }

    const updatedJobs = new Map<string, Job>();

    const jobs = await this.#page.evaluate(
      ({ selectors, limit }) => {
        const jobElements = document.querySelectorAll(selectors.jobs);
        return Array.from(jobElements)
          .slice(0, Math.min(limit, 25))
          .map((job) => ({
            id: job.getAttribute("data-job-id") || "",
            title: job.querySelector(selectors.jobTitle)?.textContent || "",
            link:
              job.querySelector<HTMLAnchorElement>(selectors.jobLink)?.href ||
              "",
            company: job.querySelector(selectors.company)?.textContent || "",
            companyImgLink: job.querySelector("img")?.getAttribute("src") || "",
            place: job.querySelector(selectors.place)?.textContent || "",
            date:
              job.querySelector(selectors.date)?.getAttribute("datetime") || "",
            isPromoted: Array.from(job.querySelectorAll("li")).some(
              (item) => item.textContent?.trim() === "Promoted",
            ),
          })) as Job[];
      },
      { selectors: SELECTORS, limit },
    );

    for (const job of jobs) {
      await this.#page.locator(`div[data-job-id="${job.id}"]`).click();
      await this.#loadJobDetails(job.id);

      const timeSincePosted = await this.#page.evaluate(
        (selector) => document.querySelector(selector)?.textContent || "",
        SELECTORS.timeSincePosted,
      );

      const companyLink = await this.#page.evaluate(
        (selector) =>
          document.querySelector(selector)?.getAttribute("href") || "",
        SELECTORS.companyLink,
      );

      const skillsRequired = await this.#page.evaluate((jobSkillsSelector) => {
        return Array.from(document.querySelectorAll(jobSkillsSelector))
          ?.flatMap((e) => e.textContent!.split(/,|and/))
          .map((e) => e.replace(/[\n\r\t ]+/g, " ").trim())
          .filter((e) => e.length);
      }, SELECTORS.skillsRequired);

      const jobInsights = await this.#page.evaluate(
        (jobInsightsSelector) =>
          Array.from(document.querySelectorAll(jobInsightsSelector))
            .map((e) => e.textContent || " ")
            .filter(Boolean),
        SELECTORS.insights,
      );

      updatedJobs.set(job.id, {
        ...job,
        title: sanitizeText(job.title),
        company: sanitizeText(job.company),
        place: sanitizeText(job.place),
        companyLink,
        jobInsights: jobInsights.map((j) => sanitizeText(j)),
        timeSincePosted,
        isReposted: timeSincePosted.includes("Reposted"),
        skillsRequired,
      });

      await this.#page?.waitForTimeout(getRandomArbitrary(100, 300)); // to handle rate limiting. maybe remove/reduce
    }

    return Array.from(updatedJobs.values());
  }

  async close() {
    if (this.#page) {
      await this.#page.context().browser()?.close();
      this.#page = null;
    }
  }
}

export { LinkedInScraper };
