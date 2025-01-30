export type Relevance = "relevant" | "recent";
export const RELEVANCE = {
  relevant: "R",
  recent: "DD",
} as const satisfies Record<Relevance, string>;

export type Remote = "onSite" | "remote" | "hybrid";
export const REMOTE = {
  onSite: "1",
  remote: "2",
  hybrid: "3",
} as const satisfies Record<Remote, string>;

export type Filters = {
  keywords: string;
  location: string;
  relevance?: Relevance;
  remote?: Array<Remote>;
};
