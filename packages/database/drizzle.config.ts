import { defineConfig } from 'drizzle-kit';
import { getDbPath } from './src/utils';

const dbPath = getDbPath();

export default defineConfig({
  dialect: 'sqlite',
  schema: './src/schema.ts',
  out: './drizzle',
  dbCredentials: {
    url: dbPath,
  },
});
