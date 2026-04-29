// lib/db/client.ts
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const dbUrl = process.env.DATABASE_URL ?? 'data/sift.db';

declare global {
  var __sqlite: Database.Database | undefined;
}

function createDb() {
  if (dbUrl !== ':memory:') mkdirSync(dirname(dbUrl), { recursive: true });
  const sqlite = new Database(dbUrl);
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('foreign_keys = ON');
  return sqlite;
}

const sqlite = globalThis.__sqlite ?? createDb();
if (process.env.NODE_ENV !== 'production') globalThis.__sqlite = sqlite;

export const db = drizzle(sqlite);
export { sqlite };
