export type Relevance = 'relevant' | 'recent';
export type Remote = 'onSite' | 'remote' | 'hybrid';
export type DatePosted = '1' | '7' | '30' | 'any';
export type Experience =
  | 'internship'
  | 'entry'
  | 'associate'
  | 'mid-senior'
  | 'director'
  | 'executive';
export type JobType =
  | 'fulltime'
  | 'parttime'
  | 'contract'
  | 'temporary'
  | 'volunteer'
  | 'internship'
  | 'other';
export type Salary = '40K' | '60K' | '80K' | '100K' | '120K' | '140K' | '160K' | '180K' | '200K';

export type Filters = {
  keywords: string;
  location: string;
  relevance?: Relevance;
  remote?: Array<Remote>;
  datePosted?: DatePosted;
  experience?: Array<Experience>;
  jobType?: Array<JobType>;
  salary?: Salary;
  easyApply?: boolean;
};

export const RELEVANCE = {
  relevant: 'R',
  recent: 'DD',
} as const satisfies Record<Relevance, string>;

export const REMOTE = {
  onSite: '1',
  remote: '2',
  hybrid: '3',
} as const satisfies Record<Remote, string>;

export const DATE_POSTED = {
  '1': 'r86400',
  '7': 'r604800',
  '30': 'r2592000',
  any: '',
} as const satisfies Record<DatePosted, string>;

export const EXPERIENCE = {
  internship: '1',
  entry: '2',
  associate: '3',
  'mid-senior': '4',
  director: '5',
  executive: '6',
} as const satisfies Record<Experience, string>;

export const JOB_TYPE = {
  fulltime: 'F',
  parttime: 'P',
  contract: 'C',
  temporary: 'T',
  volunteer: 'V',
  internship: 'I',
  other: 'O',
} as const satisfies Record<JobType, string>;

/** Works only in US I guess */
export const SALARY = {
  '40K': '1',
  '60K': '2',
  '80K': '3',
  '100K': '4',
  '120K': '5',
  '140K': '6',
  '160K': '7',
  '180K': '8',
  '200K': '9',
} as const satisfies Record<Salary, string>;

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

// TODO: add industry, job titles and more
