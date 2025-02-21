import type { LaunchOptions } from 'playwright';
import type { Filters } from './filters';
import type { OptionalFieldsOnly } from './generics';
import type { Job } from './job';

export type ScraperOptions = {
  liAtCookie: string;
  scrapedJobIds?: Array<string>;
  browserOptions?: LaunchOptions;
};

export type SearchOptions = {
  onScrape: (job: Job) => void;
  limit?: number;
  fieldsToExlude?: Array<keyof OptionalFieldsOnly<Job>>;
  maxConcurrent?: number;
  filters?: OptionalFieldsOnly<Filters>;
};
