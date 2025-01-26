export type Job = {
  id: string;
  title: string;
  link: string;
  description?: string;
  company: string;
  companyImgLink: string;
  location: string;
  workType: string;
  isPromoted: boolean;
  companyLink: string;
  jobInsights: Array<string>;
  timeSincePosted: string;
  isReposted: boolean;
  skillsRequired: Array<string>;
  requirements: Array<string>;
  applyLink: string;
};
