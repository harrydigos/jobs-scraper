import { readFile, writeFile } from 'fs/promises';
import { parse } from 'csv-parse';
import type { Job } from 'database';

const allFields = [
  'id',
  'title',
  'link',
  'description',
  'company',
  'companyImgLink',
  'companySize',
  'location',
  'remote',
  'isPromoted',
  'companyLink',
  'jobInsights',
  'timeSincePosted',
  'isReposted',
  'skillsRequired',
  'requirements',
  'applyLink',
] satisfies Array<keyof Job>;

export async function readIdsFromCSV(filePath: string): Promise<string[]> {
  try {
    const csvData = await readFile(filePath, 'utf-8');
    const records = await parse(csvData, {
      columns: true,
      skip_empty_lines: true,
    }).toArray();

    return records.map((record) => record.id).filter(Boolean) as string[];
  } catch (e) {
    console.error('Error reading CSV file:', e);
    throw e;
  }
}

export async function readRecordsFromCSV(filePath: string) {
  try {
    const csvData = await readFile(filePath, 'utf-8');
    return (await parse(csvData, {
      columns: true,
      skip_empty_lines: true,
    }).toArray()) as Job[];
  } catch (e) {
    console.error('Error reading CSV file:', e);
    throw e;
  }
}

export async function jobsToCSV(
  jobs: Partial<Job>[],
  outputPath: string,
  selectedFields?: Array<keyof Job>,
): Promise<void> {
  if (!jobs.length) return;

  try {
    const headers = selectedFields || allFields;

    const invalidFields = selectedFields?.filter(
      (field) => !Object.prototype.hasOwnProperty.call(jobs[0], field),
    );

    if (invalidFields?.length) {
      throw new Error(`Invalid fields selected: ${invalidFields.join(', ')}`);
    }

    const csvRows = [headers.join(',')];

    for (const job of jobs) {
      const row = headers.map((header) => {
        const value = job[header];

        if (value === undefined || value === null) {
          return '';
        }

        if (Array.isArray(value)) {
          return `"${value.join(';')}"`;
        }

        if (typeof value === 'string' && value.includes(',')) {
          return `"${value}"`;
        }

        if (typeof value === 'boolean') {
          return value.toString();
        }

        return value;
      });

      csvRows.push(row.join(','));
    }

    await writeFile(outputPath, csvRows.join('\n'), 'utf-8');
  } catch (e) {
    console.error('Error writing CSV file:', e);
    throw e;
  }
}
