// tests/api-jobs.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { candidates } from '@/lib/db/schema';

describe('GET /api/jobs', () => {
  let dir: string;

  beforeEach(() => {
    vi.resetModules();
    dir = mkdtempSync(join(tmpdir(), 'sift-jobs-'));
    process.env.DATABASE_URL = join(dir, 'test.db');
    delete (globalThis as any).__sqlite;
    delete (globalThis as any).__queueInit;

    const sqlite = new Database(process.env.DATABASE_URL);
    const d = drizzle(sqlite);
    migrate(d, { migrationsFolder: './lib/db/migrations' });

    const base = { pdfPath: 'x', pdfSize: 1, createdAt: new Date(), updatedAt: new Date() };
    d.insert(candidates).values([
      { id: 'a', extractionStatus: 'parsed',  ...base },
      { id: 'b', extractionStatus: 'error',   extractionError: '出错了', ...base },
      { id: 'c', extractionStatus: 'uploaded', ...base },
    ]).run();
    sqlite.close();
  });

  it('returns requested ids with status and error', async () => {
    const { GET } = await import('@/app/api/jobs/route');
    const res = await GET(new Request('http://t/api/jobs?ids=a,b,c,nonexistent'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.items).toHaveLength(3);
    const byId = Object.fromEntries(body.items.map((x: any) => [x.id, x]));
    expect(byId.a.extractionStatus).toBe('parsed');
    expect(byId.b.extractionStatus).toBe('error');
    expect(byId.b.extractionError).toBe('出错了');
    expect(byId.c.extractionStatus).toBe('uploaded');
  });

  it('returns empty items when ids missing', async () => {
    const { GET } = await import('@/app/api/jobs/route');
    const res = await GET(new Request('http://t/api/jobs'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.items).toEqual([]);
  });
});
