// tests/api-candidate-crud.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mkdtempSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { candidates } from '@/lib/db/schema';

describe('api /candidates/:id', () => {
  let dir: string;
  const params = (id: string) => ({ params: Promise.resolve({ id }) });

  beforeEach(() => {
    vi.resetModules();
    dir = mkdtempSync(join(tmpdir(), 'sift-crud-'));
    process.env.DATABASE_URL = join(dir, 'test.db');
    process.env.UPLOADS_DIR  = join(dir, 'uploads');
    delete (globalThis as any).__sqlite;
    delete (globalThis as any).__queueInit;

    const sqlite = new Database(process.env.DATABASE_URL);
    sqlite.pragma('journal_mode = WAL');
    const d = drizzle(sqlite);
    migrate(d, { migrationsFolder: './lib/db/migrations' });

    mkdirSync(process.env.UPLOADS_DIR!, { recursive: true });
    writeFileSync(join(process.env.UPLOADS_DIR!, 'x1.pdf'), 'fake');

    d.insert(candidates).values({
      id: 'x1', name: '张', status: '待筛选', extractionStatus: 'parsed',
      pdfPath: `${process.env.UPLOADS_DIR}/x1.pdf`, pdfSize: 4,
      createdAt: new Date(), updatedAt: new Date(),
    }).run();
    sqlite.close();
  });

  it('GET returns candidate', async () => {
    const { GET } = await import('@/app/api/candidates/[id]/route');
    const res = await GET(new Request('http://t'), params('x1'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBe('x1');
    expect(body.name).toBe('张');
  });

  it('GET 404 when not found', async () => {
    const { GET } = await import('@/app/api/candidates/[id]/route');
    const res = await GET(new Request('http://t'), params('nope'));
    expect(res.status).toBe(404);
  });

  it('PATCH updates fields', async () => {
    const { PATCH } = await import('@/app/api/candidates/[id]/route');
    const res = await PATCH(new Request('http://t', {
      method: 'PATCH',
      body: JSON.stringify({ name: '张远哲', status: '初筛通过' }),
      headers: { 'content-type': 'application/json' },
    }), params('x1'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.name).toBe('张远哲');
    expect(body.status).toBe('初筛通过');
  });

  it('PATCH 400 on invalid body', async () => {
    const { PATCH } = await import('@/app/api/candidates/[id]/route');
    const res = await PATCH(new Request('http://t', {
      method: 'PATCH',
      body: JSON.stringify({ status: 'invalid-value' }),
      headers: { 'content-type': 'application/json' },
    }), params('x1'));
    expect(res.status).toBe(400);
  });

  it('DELETE removes row and file', async () => {
    const { DELETE } = await import('@/app/api/candidates/[id]/route');
    const res = await DELETE(new Request('http://t'), params('x1'));
    expect(res.status).toBe(200);
    expect(existsSync(`${process.env.UPLOADS_DIR}/x1.pdf`)).toBe(false);
  });
});
