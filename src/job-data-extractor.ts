import { Page } from "playwright";
import { SELECTORS } from "./constants";

class JobDataExtractor {
  cachedJobs: Map<string, unknown>;

  constructor() {
    this.cachedJobs = new Map();
  }

  private _sanitizeText(rawText: string | null | undefined) {
    if (!rawText) return "";
    return rawText
      .replace(/[\r\n\t]+/g, " ")
      .replace(/\s\s+/g, " ")
      .trim();
  }

  /** Extracts all raw job cards */
  async extractJobCardsData(page: Page) {
    const rawData = await page.evaluate(
      ({ selectors }) => {
        return Array.from(document.querySelectorAll(selectors.jobs)).map(
          (job) => {
            const jobId = job.getAttribute("data-job-id") || "";
            const title = job.querySelector(selectors.title)?.textContent || "";
            const company =
              job.querySelector(selectors.company)?.textContent || "";
            const companyImgLink =
              job.querySelector("img")?.getAttribute("src") || "";
            const place = job.querySelector(selectors.place)?.textContent || "";
            const date =
              job.querySelector(selectors.date)?.getAttribute("datetime") || "";
            const isPromoted = Array.from(job.querySelectorAll("li")).some(
              (listItem) => listItem.textContent?.trim() === "Promoted",
            );

            return {
              jobId,
              title,
              company,
              companyImgLink,
              place,
              date,
              isPromoted,
            };
          },
        );
      },
      { selectors: SELECTORS },
    );

    return rawData.map((job) => ({
      ...job,
      title: this._sanitizeText(job.title),
      company: this._sanitizeText(job.company),
      place: this._sanitizeText(job.place),
    }));
  }
}

export { JobDataExtractor };
