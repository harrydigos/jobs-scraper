import { jobs } from './schema';

export type Job = typeof jobs.$inferSelect;
export type NewJob = typeof jobs.$inferInsert;
