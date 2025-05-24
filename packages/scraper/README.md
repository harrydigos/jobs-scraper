# jos-scraper

A powerful and efficient LinkedIn job scraper built with Node.js, TypeScript,
and Playwright that allows you to extract job postings from LinkedIn with advanced filtering capabilities.

## ⚠️ Disclaimer

This Job Scraper is provided for **educational and research purposes only**. **The developers of this library are not responsible for any misuse or legal consequences resulting from its use.**

By using this library, you acknowledge and agree to:

- Use reasonable request rates to avoid overwhelming LinkedIn's servers
- Only collect data you have legitimate rights to access and use
- Verify that your use case complies with LinkedIn's policies regarding commercial data usage

---

## Features

- 🔍 Scrape LinkedIn job postings with advanced filters
- 🔐 Secure authentication using LinkedIn `li_at` cookie
- 📊 Extract structured job data in JSON format
- 🚀 Built with TypeScript for better type safety
- ⚡ Concurrent scraping with configurable limits
- 🎭 Powered by Playwright for reliable browser automation
- 📝 Comprehensive logging and debugging options
- 🛡️ Duplicate job prevention with scraped job ID tracking
- 🔧 Customizable field exclusion for optimized performance

## Installation

```bash
npm install jobs-scraper playwright && npx playwright install
```

## Prerequisites

- Node.js 18.x or higher
- Playwright
- LinkedIn account
- Valid LinkedIn `li_at` cookie

## Getting Started

### 1. Obtain LinkedIn `li_at` Cookie

Before using this scraper, you need to obtain your LinkedIn `li_at` cookie:

1. Log in to LinkedIn in your browser
2. Open Developer Tools (F12)
3. Go to Application/Storage tab → Cookies → `https://www.linkedin.com`
4. Find the `li_at` cookie and copy its value

### 2. Basic Usage

```typescript
import { Scraper } from 'jobs-scraper';

async function scrapeJobs() {
  const scraper = await Scraper.initialize({
    liAtCookie: process.env.LI_AT_COOKIE!,
  });

  try {
    await scraper.searchJobs(
      [
        {
          keywords: 'software engineer',
          location: 'San Francisco',
        },
      ],
      {
        limit: 50,
        onScrape: (job) => {
          console.log(`Found job: ${job.title} at ${job.company}`);
          // Process or save the job data
        },
      },
    );
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await scraper.close();
  }
}

scrapeJobs();
```

## API Reference

### Scraper.initialize(options: ScraperOptions)

Creates and initializes a new scraper instance.

#### ScraperOptions

| Parameter        | Type                  | Required | Description                                    |
| ---------------- | --------------------- | -------- | ---------------------------------------------- |
| `liAtCookie`     | string                | Yes      | Your LinkedIn `li_at` cookie value             |
| `scrapedJobIds`  | string[]              | No       | Array of job IDs to skip (prevents duplicates) |
| `browserOptions` | LaunchOptions         | No       | Playwright browser launch options              |
| `loggerOptions`  | LoggerOptions \| null | No       | Logger configuration                           |

#### LoggerOptions

| Parameter     | Type     | Default        | Description                          |
| ------------- | -------- | -------------- | ------------------------------------ |
| `level`       | string   | 'info'         | Log level (debug, info, warn, error) |
| `transports`  | string[] | ['console']    | Log transports                       |
| `maxFileSize` | number   | 5242880        | Maximum log file size (5MB)          |
| `filePath`    | string   | 'logs/app.log' | Log file path                        |

### searchJobs(searches, options)

Scrapes LinkedIn jobs based on search criteria and filters.

#### Parameters

**searches** (Array<Filters>): Array of search criteria

**options** (SearchOptions): Search configuration options

#### Search Filters (Filters)

| Parameter    | Type                   | Required | Description                     |
| ------------ | ---------------------- | -------- | ------------------------------- |
| `keywords`   | string                 | Yes      | Job search keywords             |
| `location`   | string                 | Yes      | Job location                    |
| `relevance`  | 'relevant' \| 'recent' | No       | Sort by relevance or date       |
| `remote`     | Remote[]               | No       | Remote work options             |
| `datePosted` | DatePosted             | No       | How recently the job was posted |
| `experience` | Experience[]           | No       | Experience level requirements   |
| `jobType`    | JobType[]              | No       | Employment type                 |
| `salary`     | Salary                 | No       | Minimum salary, only US         |
| `easyApply`  | boolean                | No       | Filter for easy apply jobs only |

#### SearchOptions

| Parameter         | Type               | Description                                   |
| ----------------- | ------------------ | --------------------------------------------- |
| `onScrape`        | (job: Job) => void | Callback function called for each scraped job |
| `limit`           | number             | Maximum number of jobs to scrape              |
| `fieldsToExclude` | Array<keyof Job>   | Job fields to exclude from results            |
| `maxConcurrent`   | number             | Maximum concurrent operations (default: 3)    |
| `filters`         | Partial<Filters>   | Global filters applied to all searches        |

## Type Definitions

### Job

```typescript
type Job = {
  id: string;
  title: string;
  link: string;
  company: string;
  companyId: string;
  companyLink: string;
  location: string;
  description?: string | null;
  companySize?: string | null;
  remote?: string | null;
  isPromoted?: boolean;
  jobInsights?: string[] | null;
  timeSincePosted?: string | null;
  isReposted?: boolean;
  skillsRequired?: string[] | null;
  requirements?: string[] | null;
  applyLink?: string | null;
};
```

### Filter Types

```typescript
type Relevance = 'relevant' | 'recent';
type Remote = 'onSite' | 'remote' | 'hybrid';
type DatePosted = '1' | '7' | '30' | 'any'; // days
type Experience = 'internship' | 'entry' | 'associate' | 'mid-senior' | 'director' | 'executive';
type JobType =
  | 'fulltime'
  | 'parttime'
  | 'contract'
  | 'temporary'
  | 'volunteer'
  | 'internship'
  | 'other';
type Salary = '40K' | '60K' | '80K' | '100K' | '120K' | '140K' | '160K' | '180K' | '200K'; // Only US
```

## Usage Examples

### Basic Job Search

```typescript
const scraper = await Scraper.initialize({
  liAtCookie: process.env.LI_AT_COOKIE!,
});

await scraper.searchJobs(
  [
    {
      keywords: 'frontend developer',
      location: 'New York',
    },
  ],
  {
    limit: 25,
    onScrape: (job) => console.log(job.title),
  },
);

await scraper.close();
```

### Advanced Search with Filters

```typescript
const scraper = await Scraper.initialize({
  liAtCookie: process.env.LI_AT_COOKIE!,
  browserOptions: { headless: false, slowMo: 1000 },
  loggerOptions: {
    level: 'debug',
    transports: ['console', 'file'],
  },
});

await scraper.searchJobs(
  [
    {
      keywords: 'software engineer',
      location: 'Remote',
    },
    {
      keywords: 'full stack developer',
      location: 'European Union',
    },
  ],
  {
    filters: {
      relevance: 'recent',
      remote: ['remote', 'hybrid'],
      experience: ['mid-senior', 'director'],
      jobType: ['fulltime'],
      datePosted: '7',
      salary: '100K',
      easyApply: true,
    },
    limit: 100,
    maxConcurrent: 5,
    fieldsToExclude: ['isReposted', 'skillsRequired'],
    onScrape: async (job) => {
      // Save to database
      await saveJobToDatabase(job);
      console.log(`Saved: ${job.title} at ${job.company}`);
    },
  },
);

await scraper.close();
```

### Handling Scraped Job IDs

```typescript
// Load previously scraped job IDs to avoid duplicates
const scrapedJobIds = await loadScrapedJobIds();

const scraper = await Scraper.initialize({
  liAtCookie: process.env.LI_AT_COOKIE!,
  scrapedJobIds: scrapedJobIds,
});

const newJobIds: string[] = [];

await scraper.searchJobs([{ keywords: 'data scientist', location: 'California' }], {
  limit: 50,
  onScrape: (job) => {
    newJobIds.push(job.id);
    processJob(job);
  },
});

// Save new job IDs for next run
await saveScrapedJobIds([...scrapedJobIds, ...newJobIds]);

await scraper.close();
```

### Performance Optimization

```typescript
const scraper = await Scraper.initialize({
  liAtCookie: process.env.LI_AT_COOKIE!,
  browserOptions: {
    headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  },
});

await scraper.searchJobs([{ keywords: 'react developer', location: 'Austin' }], {
  limit: 200,
  maxConcurrent: 2, // Lower concurrency for stability
  fieldsToExclude: ['description', 'skillsRequired', 'requirements', 'jobInsights'], // Exclude heavy fields for faster scraping
  onScrape: (job) => {
    // Process minimal job data
    console.log(`${job.title} - ${job.company} - ${job.location}`);
  },
});

await scraper.close();
```

## Best Practices

### 1. Cookie Management

- Keep your `li_at` cookie secure and private
- Update the cookie if authentication fails
- Use environment variables to store sensitive data

### 2. Rate Limiting

- Use reasonable `maxConcurrent` values (2-5)
- Add delays between requests or slowMo to browser options if needed
- Monitor for rate limiting responses

### 3. Performance

- Exclude unnecessary fields with `fieldsToExclude`
- Use headless browser for production
- Implement proper error handling and retries

### 4. Data Management

- Track scraped job IDs to avoid duplicates
- Implement proper data storage solutions
- Handle job data updates and removals

## License

This project is licensed under the MIT License.
