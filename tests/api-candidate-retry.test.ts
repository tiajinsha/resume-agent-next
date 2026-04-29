// tests/api-candidate-retry.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { eq } from 'drizzle-orm';
import { candidates } from '@/lib/db/schema';

describe('POST /api/candidates/:id/retry', () => {
  let dir: string;
  const params = (id: string) => ({ params: Promise.resolve({ id }) });
  const sampleBuf = readFileSync('tests/fixtures/sample.pdf');

  beforeEach(() => {
    vi.resetModules();
    dir = mkdtempSync(join(tmpdir(), 'sift-retry-'));
    process.env.DATABASE_URL = join(dir, 'test.db');
    process.env.UPLOADS_DIR  = join(dir, 'uploads');
    delete (globalThis as any).__sqlite;
    delete (globalThis as any).__queueInit;
  });

  it('resets error candidate to uploaded and re-enqueues', async () => {
    const sqlite = new Database(process.env.DATABASE_URL!);
    sqlite.pragma('journal_mode = WAL');
    const d = drizzle(sqlite);
    migrate(d, { migrationsFolder: './lib/db/migrations' });

    mkdirSync(process.env.UPLOADS_DIR!, { recursive: true });
    writeFileSync(join(process.env.UPLOADS_DIR!, 'err1.pdf'), sampleBuf);

    d.insert(candidates).values({
      id: 'err1',
      pdfPath: `${process.env.UPLOADS_DIR}/err1.pdf`,
      pdfSize: sampleBuf.length,
      extractionStatus: 'error',
      extractionError: '旧错误',
      createdAt: new Date(), updatedAt: new Date(),
    }).run();
    sqlite.close();

    const { POST } = await import('@/app/api/candidates/[id]/retry/route');
    const { queue } = await import('@/lib/extraction/queue');
    const res = await POST(new Request('http://t'), params('err1'));
    expect(res.status).toBe(200);
    await queue.onIdle();

    const s = new Database(process.env.DATABASE_URL!);
    const row = drizzle(s).select().from(candidates).where(eq(candidates.id, 'err1')).get();
    expect(row?.extractionStatus).toBe('parsed');
    expect(row?.extractionError).toBeNull();
    s.close();
  });

  it('returns 409 when not in error state', async () => {
    const sqlite = new Database(process.env.DATABASE_URL!);
    const d = drizzle(sqlite);
    migrate(d, { migrationsFolder: './lib/db/migrations' });

    d.insert(candidates).values({
      id: 'ok1',
      pdfPath: 'x', pdfSize: 1,
      extractionStatus: 'parsed',
      createdAt: new Date(), updatedAt: new Date(),
    }).run();
    sqlite.close();

    const { POST } = await import('@/app/api/candidates/[id]/retry/route');
    const res = await POST(new Request('http://t'), params('ok1'));
    expect(res.status).toBe(409);
  });
});
