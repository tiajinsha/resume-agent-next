// lib/db/migrate.ts
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { db, sqlite } from './client';

migrate(db, { migrationsFolder: './lib/db/migrations' });
console.log('migration done');
sqlite.close();
