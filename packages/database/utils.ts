import path from 'path';

const PROJECT_ROOT = 'linkedin-job-scraper';
const DB_RELATIVE_PATH = ['packages', 'database', 'sqlite3.db'];

export function getDbPath() {
  const cwd = process.cwd();
  const rootIndex = cwd.indexOf(PROJECT_ROOT);

  if (rootIndex === -1) {
    throw new Error(
      `Project root "${PROJECT_ROOT}" not found in current working directory: ${cwd}`,
    );
  }

  const projectRoot = cwd.substring(0, rootIndex + PROJECT_ROOT.length);
  return path.join(projectRoot, ...DB_RELATIVE_PATH);
}
