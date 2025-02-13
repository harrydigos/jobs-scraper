export type Job = {
  id: string;
  title: string;
  link: string;
  company: string;
  location: string;
  description?: string | null;
  companyImgLink?: string | null;
  companySize?: string | null;
  remote?: string | null;
  isPromoted?: boolean;
  companyLink?: string | null;
  jobInsights?: string[] | null;
  timeSincePosted?: string | null;
  isReposted?: boolean;
  skillsRequired?: string[] | null;
  requirements?: string[] | null;
  applyLink?: string | null;
};
