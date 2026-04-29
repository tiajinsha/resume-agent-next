// tests/db.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { candidates } from '@/lib/db/schema';

describe('db migrate + roundtrip', () => {
  let dir: string;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'sift-db-'));
  });

  it('creates table and roundtrips a row', () => {
    const sqlite = new Database(join(dir, 'test.db'));
    sqlite.pragma('journal_mode = WAL');
    const db = drizzle(sqlite);
    migrate(db, { migrationsFolder: './lib/db/migrations' });

    const now = new Date();
    db.insert(candidates).values({
      id: 'abc123',
      pdfPath: 'data/uploads/abc123.pdf',
      pdfSize: 1234,
      createdAt: now,
      updatedAt: now,
    }).run();

    const rows = db.select().from(candidates).all();
    expect(rows).toHaveLength(1);
    expect(rows[0].id).toBe('abc123');
    expect(rows[0].status).toBe('待筛选');
    expect(rows[0].extractionStatus).toBe('uploaded');

    sqlite.close();
    rmSync(dir, { recursive: true });
  });
});
