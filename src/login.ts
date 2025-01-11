import { chromium, Page } from "playwright";
import { browserDefaults, LI_URLS } from "./constants";

class LinkedInScraper {
  private page: Page | null = null;

  private async _takeScreenshot(log = "Taking screenshot...") {
    console.log(`📷 ${log}`);
    await this.page?.screenshot({
      path: "screenshots/page.png",
      fullPage: true,
    });
  }

  private async _isLoggedIn() {
    return this.page
      ?.locator("a.global-nav__primary-link--active")
      .first()
      .isVisible();
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

    this.page = await ctx.newPage();

    await this.page.goto(LI_URLS.home);

    if (!this._isLoggedIn()) {
      await this._takeScreenshot("🔴 Authentication failed");
      throw new Error(
        "🔴 Authentication failed. Please check your li_at cookie.",
      );
    }

    console.log("🟢 Successfully authenticated!");
    await this._takeScreenshot("Home page");
  }

  async close() {
    if (this.page) {
      await this.page.context().browser()?.close();
      this.page = null;
    }
  }
}

export { LinkedInScraper };
