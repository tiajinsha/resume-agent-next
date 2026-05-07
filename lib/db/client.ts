// lib/db/client.ts
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { mkdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';

const dbUrl = process.env.DATABASE_URL ?? 'data/sift.db';

declare global {
  var __sqlite: Database.Database | undefined;
  var __migrationsRan: boolean | undefined;
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

// 启动时自动迁移 (Docker / standalone build 用,本地开发请用 npm run db:migrate)
// 设 RUN_MIGRATIONS_ON_BOOT=1 启用;只跑一次 (用 globalThis 标志去重,HMR 安全)
if (process.env.RUN_MIGRATIONS_ON_BOOT === '1' && !globalThis.__migrationsRan) {
  globalThis.__migrationsRan = true;
  // standalone build 后 migrations 目录会被 Dockerfile COPY 到 ./lib/db/migrations
  // 本地运行时也是相同相对路径
  const candidates = [
    join(process.cwd(), 'lib', 'db', 'migrations'),
    join(process.cwd(), '.next', 'standalone', 'lib', 'db', 'migrations'),
  ];
  const migrationsFolder = candidates.find(existsSync);
  if (migrationsFolder) {
    try {
      migrate(db, { migrationsFolder });
      console.log('[db] migrations applied from', migrationsFolder);
    } catch (e) {
      console.error('[db] migration failed:', e);
    }
  } else {
    console.warn('[db] RUN_MIGRATIONS_ON_BOOT=1 but no migrations folder found');
  }
}
