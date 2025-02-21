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
