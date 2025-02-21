import type { Filters } from '~/types/filters';

export const URL_PARAMS = {
  keywords: 'keywords',
  location: 'location',
  sort: 'sortBy',
  remote: 'f_WT',
  datePosted: 'f_TPR',
  experience: 'f_E',
  jobType: 'f_JT',
  easyApply: 'f_AL',
} as const;

export const FILTERS = {
  relevance: {
    relevant: 'R',
    recent: 'DD',
  },
  remote: {
    onSite: '1',
    remote: '2',
    hybrid: '3',
  },
  datePosted: {
    '1': 'r86400',
    '7': 'r604800',
    '30': 'r2592000',
    any: '',
  },
  experience: {
    internship: '1',
    entry: '2',
    associate: '3',
    'mid-senior': '4',
    director: '5',
    executive: '6',
  },
  jobType: {
    fulltime: 'F',
    parttime: 'P',
    contract: 'C',
    temporary: 'T',
    volunteer: 'V',
    internship: 'I',
    other: 'O',
  },
  salary: {
    '40K': '1',
    '60K': '2',
    '80K': '3',
    '100K': '4',
    '120K': '5',
    '140K': '6',
    '160K': '7',
    '180K': '8',
    '200K': '9',
  },
} as const satisfies Partial<Record<keyof Filters, Record<string, unknown>>>;

// TODO: add industry, job titles and more
