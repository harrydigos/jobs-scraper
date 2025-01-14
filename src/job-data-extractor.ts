import { Page } from "playwright";
import { SELECTORS } from "./constants";

type Job = {
  id: string;
  title: string;
  company: string;
  companyImgLink: string;
  place: string;
  date: string;
  isPromoted: boolean;
};

class JobDataExtractor {
  static #instance: JobDataExtractor;
  readonly #cachedJobs = new Map<string, Job>();

  constructor() {
    if (JobDataExtractor.#instance) {
      throw new Error("You can create only one JobDataExtractor instance");
    }
    JobDataExtractor.#instance = this;
  }

  get cachedJobs() {
    return this.#cachedJobs;
  }

  #sanitizeText(rawText: string | null | undefined) {
    return (
      rawText
        ?.replace(/[\r\n\t]+/g, " ")
        .replace(/\s\s+/g, " ")
        .trim() ?? ""
    );
  }

  /**
   * Extracts all available job cards from the provided page.
   */
  async extractJobCardsData(page: Page) {
    const rawJobs = await page.evaluate(
      ({ selectors }) => {
        return Array.from(document.querySelectorAll(selectors.jobs)).map(
          (job) => ({
            id: job.getAttribute("data-job-id") ?? "",
            title: job.querySelector(selectors.title)?.textContent ?? "",
            company: job.querySelector(selectors.company)?.textContent ?? "",
            companyImgLink: job.querySelector("img")?.getAttribute("src") ?? "",
            place: job.querySelector(selectors.place)?.textContent ?? "",
            date:
              job.querySelector(selectors.date)?.getAttribute("datetime") ?? "",
            isPromoted: Array.from(job.querySelectorAll("li")).some(
              (item) => item.textContent?.trim() === "Promoted",
            ),
          }),
        );
      },
      { selectors: SELECTORS },
    );

    const sanitizedJobs = rawJobs.map((job) => ({
      ...job,
      title: this.#sanitizeText(job.title),
      company: this.#sanitizeText(job.company),
      place: this.#sanitizeText(job.place),
    }));

    sanitizedJobs.forEach((j) => this.#cachedJobs.set(j.id, j));

    return sanitizedJobs;
  }
}

export const jobDataExtractor = Object.freeze(new JobDataExtractor());
