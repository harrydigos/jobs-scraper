import { Page } from "playwright";
import { SELECTORS } from "./constants";

let instance: InstanceType<typeof JobDataExtractor>;

class JobDataExtractor {
  cachedJobs: Map<string, unknown>;

  constructor() {
    if (instance) {
      throw new Error("You can create only one JobDataExtractor instance");
    }
    instance = this;
    this.cachedJobs = new Map();
  }

  private _sanitizeText(rawText: string | null | undefined) {
    if (!rawText) return "";
    return rawText
      .replace(/[\r\n\t]+/g, " ")
      .replace(/\s\s+/g, " ")
      .trim();
  }

  /**
   * Extracts all available job cards from the provided page.
   */
  async extractJobCardsData(page: Page) {
    const rawJobs = await page.evaluate(
      ({ selectors }) => {
        return Array.from(document.querySelectorAll(selectors.jobs)).map(
          (job) => {
            const id = job.getAttribute("data-job-id") || "";
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
              id,
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

    const sanitizedJobs = rawJobs.map((job) => ({
      ...job,
      title: this._sanitizeText(job.title),
      company: this._sanitizeText(job.company),
      place: this._sanitizeText(job.place),
    }));

    sanitizedJobs.forEach((j) => this.cachedJobs.set(j.id, j));

    return sanitizedJobs;
  }
}

export const jobDataExtractor = Object.freeze(new JobDataExtractor());
