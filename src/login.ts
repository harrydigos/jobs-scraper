import { chromium, Page } from "playwright";
import { browserDefaults, LI_URLS, SELECTORS } from "./constants";
import { retry, sleep } from "./utils";

class LinkedInScraper {
  private _page: Page | null = null;
  private _screenshotCount = 1;

  private async _takeScreenshot(log = "Taking screenshot...") {
    console.log(`📷 ${log}`);
    await this._page?.screenshot({
      path: `screenshots/${this._screenshotCount.toString().padStart(5, "0")}_page.png`,
      fullPage: true,
    });
    this._screenshotCount++;
  }

  private async _isLoggedIn() {
    return !!(await this._page
      ?.locator(SELECTORS.activeMenu)
      .first()
      .isVisible());
  }

  private async _paginate(paginationSize = 25, timeout = 2000) {
    return retry(
      async () => {
        if (!this._page) {
          throw new Error("🔴 Failed to load page");
        }

        const url = new URL(this._page.url());
        const offset = parseInt(url.searchParams.get("start") || "0", 10);
        url.searchParams.set("start", `${offset + paginationSize}`);

        await this._page.goto(url.toString(), { waitUntil: "load" });

        const loaded = await this._loadJobs();

        return { success: !!loaded };
      },
      {
        maxAttempts: 3,
        delayMs: 200,
        timeout,
        onRetry: (error, attempt) => {
          console.log(`Pagination attempt ${attempt} failed: ${error}`);
        },
      },
    );
  }

  async initialize(liAtCookie: string) {
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

    this._page = await ctx.newPage();

    await this._page.goto(LI_URLS.home);

    if (!this._isLoggedIn()) {
      await this._takeScreenshot("🔴 Authentication failed");
      throw new Error(
        "🔴 Authentication failed. Please check your li_at cookie.",
      );
    }

    console.log("🟢 Successfully authenticated!");
    await this._takeScreenshot("Home page");
  }

  private async _loadJobs() {
    return this._page?.evaluate(
      (s) => document.querySelectorAll(s).length,
      SELECTORS.jobs,
    );
  }

  async searchJobs(keywords: string, location: string, limit = 25) {
    if (!this._page) throw new Error("🔴 Scraper not initialized");

    const searchUrl = `${LI_URLS.jobsSearch}?keywords=${encodeURIComponent(keywords)}&location=${encodeURIComponent(location)}`;

    await this._page.goto(searchUrl, { waitUntil: "load" });

    await this._takeScreenshot("Search jobs page");

    let jobsTot = await this._page.evaluate(
      (s) => document.querySelectorAll(s).length,
      SELECTORS.jobs,
    );

    if (jobsTot === 0) {
      await this._takeScreenshot("🔴 No jobs found");
      return [];
    }

    let jobIndex = 0;

    // Jobs loop
    while (jobIndex < limit) {
      console.log("loop");
      await sleep(1000);

      try {
        await this._page?.evaluate(
          ({ jobsSelector, linkSelector, jobIndex }) => {
            const link = document
              .querySelectorAll(jobsSelector)
              ?.[jobIndex]?.querySelector(linkSelector) as HTMLElement;
            link.scrollIntoView();
            link.click();
          },
          {
            jobsSelector: SELECTORS.jobs,
            linkSelector: SELECTORS.jobLink,
            jobIndex,
          },
        );
      } catch {
        jobIndex++;
        continue;
      }

      jobIndex++;
    }
    //
    // await this._paginate();
    // await sleep(2000);
    // await this._paginate();
    // // await sleep(2000);
    // // await this._paginate();
    //
    // // if (!paginationResult.success) {
    // //   break;
    // // }
  }

  async close() {
    if (this._page) {
      await this._page.context().browser()?.close();
      this._page = null;
    }
  }
}

export { LinkedInScraper };
