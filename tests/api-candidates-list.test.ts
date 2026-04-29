// tests/api-candidates-list.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { candidates } from '@/lib/db/schema';

describe('GET /api/candidates', () => {
  let dir: string;

  beforeEach(() => {
    vi.resetModules();
    dir = mkdtempSync(join(tmpdir(), 'sift-list-'));
    process.env.DATABASE_URL = join(dir, 'test.db');
    delete (globalThis as any).__sqlite;
    delete (globalThis as any).__queueInit;

    const sqlite = new Database(process.env.DATABASE_URL);
    sqlite.pragma('journal_mode = WAL');
    const d = drizzle(sqlite);
    migrate(d, { migrationsFolder: './lib/db/migrations' });

    const base = { pdfPath: 'x', pdfSize: 1, createdAt: new Date(), updatedAt: new Date() };
    d.insert(candidates).values([
      { id: 'a', name: '张', status: '初筛通过', extractionStatus: 'parsed', ...base, createdAt: new Date('2026-04-20') },
      { id: 'b', name: '林', status: '待筛选',   extractionStatus: 'parsed', ...base, createdAt: new Date('2026-04-22') },
      { id: 'c', name: '王', status: '初筛通过', extractionStatus: 'parsed', ...base, createdAt: new Date('2026-04-24') },
    ]).run();
    sqlite.close();
  });

  it('returns all by default, sorted by created_at desc', async () => {
    const { GET } = await import('@/app/api/candidates/route');
    const req = new Request('http://test/api/candidates');
    const body = await (await GET(req)).json();
    expect(body.items.map((x: any) => x.id)).toEqual(['c', 'b', 'a']);
  });

  it('filters by status', async () => {
    const { GET } = await import('@/app/api/candidates/route');
    const req = new Request('http://test/api/candidates?status=' + encodeURIComponent('初筛通过'));
    const body = await (await GET(req)).json();
    expect(body.items.map((x: any) => x.id).sort()).toEqual(['a', 'c']);
  });

  it('searches by q (name substring)', async () => {
    const { GET } = await import('@/app/api/candidates/route');
    const req = new Request('http://test/api/candidates?q=' + encodeURIComponent('林'));
    const body = await (await GET(req)).json();
    expect(body.items.map((x: any) => x.id)).toEqual(['b']);
  });

  it('sort=oldest returns ascending by created_at', async () => {
    const { GET } = await import('@/app/api/candidates/route');
    const req = new Request('http://test/api/candidates?sort=oldest');
    const body = await (await GET(req)).json();
    expect(body.items.map((x: any) => x.id)).toEqual(['a', 'b', 'c']);
  });
});
