import { count } from 'drizzle-orm';
import { db } from './database';
import { jobs } from './schema';

export function getAllJobsCount() {
  return db.select({ count: count() }).from(jobs);
}
