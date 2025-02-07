import { defineConfig } from 'drizzle-kit';
import { getDbPath } from './utils';

const dbPath = getDbPath();

export default defineConfig({
  dialect: 'sqlite',
  schema: './schema.ts',
  out: './drizzle',
  dbCredentials: {
    url: dbPath,
  },
});
