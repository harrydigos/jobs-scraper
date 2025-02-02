import Database from 'better-sqlite3';
import { Job } from './types';

const db = new Database('jobs.db');

export function setupDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS jobs (
      id TEXT PRIMARY KEY,
      title TEXT,
      company TEXT,
      remote TEXT,
      location TEXT,
      timeSincePosted TEXT,
      companySize TEXT,
      link TEXT,
      createdAt TEXT,
      updatedAt TEXT
    )
  `);
}

export function insertJob(job: Partial<Job>) {
  const currentTime = new Date().toISOString();
  const stmt = db.prepare(
    `INSERT OR REPLACE INTO jobs (id, title, company, remote, location, timeSincePosted, companySize, link, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  stmt.run(
    job.id,
    job.title,
    job.company,
    job.remote,
    job.location,
    job.timeSincePosted,
    job.companySize,
    job.link,
    job.createdAt || currentTime,
    job.updatedAt || currentTime,
  );
}

export function getAllJobIds() {
  const stmt = db.prepare<Job[], Job>(`SELECT id FROM jobs`);
  return stmt.all().map((row) => row.id);
}

export function getAllJobs() {
  const stmt = db.prepare<Job[], Job>(`SELECT * FROM jobs`);
  return stmt.all();
}
