import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema';
import { getDbPath } from './utils';

const dbPath = getDbPath();

export const db = drizzle({
  schema,
  connection: {
    source: dbPath,
  },
});
