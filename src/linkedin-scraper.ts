import { chromium, Page } from "playwright";
import { browserDefaults, LI_URLS, SELECTORS } from "./constants";
import { retry } from "./utils";
import { jobDataExtractor } from "./job-data-extractor";

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
    return !!(await this.#page
      ?.locator(SELECTORS.activeMenu)
      .first()
      .isVisible());
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

  async #loadJobs() {
    return retry(
      async () => {
        if (!this.#page) {
          throw new Error("🔴 Failed to load page");
        }

        // Wait for all the skeletons to be removed before starting to scroll
        await Promise.allSettled(
          SELECTORS.jobCardSkeletons.map((selector) =>
            this.#page?.waitForSelector(selector, {
              timeout: 3000,
              state: "detached",
            }),
          ),
        );

        const getCount = () => this.#page!.locator(SELECTORS.jobs).count();
        const getLastLocator = () => this.#page!.locator(SELECTORS.jobs).last();

        let count = await getCount();
        let lastItemLocator = getLastLocator();

        // Keep scrolling to the last item into view until no more items are loaded
        while (true) {
          await lastItemLocator.scrollIntoViewIfNeeded();
          await this.#page.waitForTimeout(200);

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

    await this.#takeScreenshot("Search jobs page");

    let processedJobs = 0;

    while (processedJobs < limit) {
      const { totalJobs, success: jobsSuccess } = await this.#loadJobs();
      console.log({ totalJobs });

      if (!jobsSuccess) {
        await this.#takeScreenshot("🔴 No jobs found");
        return [];
      }

      const res = await jobDataExtractor.extractJobCardsData(this.#page);
      processedJobs += res.length;

      if (processedJobs >= limit) {
        await this.#takeScreenshot("🟢 Job limit reached");
        break;
      }

      await this.#paginate();
    }
  }

  async close() {
    if (this.#page) {
      await this.#page.context().browser()?.close();
      this.#page = null;
    }
  }
}

export { LinkedInScraper };
