import { db, jobs } from 'database';

export async function GET() {
  console.log('CALLED GET');
  return await db.select().from(jobs);
  return { success: true };
}
