import type { LaunchOptions } from 'playwright';
import type { Filters } from './filters';
import type { OptionalFieldsOnly } from './generics';
import type { Job } from './job';
import type { LoggerOptions } from '~/utils/logger';

/**
 * Options for configuring the scraper.
 */
export type ScraperOptions = {
  /**
   * The `li_at` cookie value. This is essential for authentication
   * with LinkedIn. You can obtain this value from your browser's
   * developer tools.
   */
  liAtCookie: string;

  /**
   * Job IDs that have already been scraped.
   * This can be used to prevent duplicate scraping in subsequent runs
   * and all scraper instances.
   */
  scrapedJobIds?: Array<string>;

  /**
   * Playwright launch options.
   *
   * @see https://playwright.dev/docs/api/class-browsertype#browser-type-launch
   */
  browserOptions?: LaunchOptions;

  /**
   * Logger configuration.
   * If provided, logging will be enabled.
   *
   * - If `loggerOptions` is provided:
   *   The scraper will initialize a logger using the provided options.
   *   These options will be merged with the default options.
   *
   *   The defaults are:
   *     - `level`: 'info'
   *     - `transports`: `['console']`
   *     - `maxFileSize`: 5242880 (5MB)
   *     - `filePath`: 'logs/app.log'
   *
   * - If `loggerOptions` is not provided or set to `null`:
   *   Logging will be disabled, and no logger will be initialized.
   *
   * @default null
   */
  loggerOptions?: LoggerOptions | null;
};

export type SearchOptions = {
  onScrape: (job: Job) => void;
  limit?: number;
  fieldsToExlude?: Array<keyof OptionalFieldsOnly<Job>>;
  maxConcurrent?: number;
  filters?: OptionalFieldsOnly<Filters>;
};
