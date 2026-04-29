// tests/api-upload.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { readFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { candidates } from '@/lib/db/schema';

describe('POST /api/upload', () => {
  let dir: string;
  const sampleBuf = readFileSync('tests/fixtures/sample.pdf');

  beforeEach(() => {
    vi.resetModules();
    dir = mkdtempSync(join(tmpdir(), 'sift-upload-'));
    process.env.DATABASE_URL = join(dir, 'test.db');
    process.env.UPLOADS_DIR  = join(dir, 'uploads');
    delete (globalThis as any).__sqlite;
    delete (globalThis as any).__queueInit;

    const sqlite = new Database(process.env.DATABASE_URL);
    sqlite.pragma('journal_mode = WAL');
    migrate(drizzle(sqlite), { migrationsFolder: './lib/db/migrations' });
    sqlite.close();
  });

  it('accepts a valid PDF, stores row, enqueues', async () => {
    const { POST } = await import('@/app/api/upload/route');
    const form = new FormData();
    form.append('file', new File([sampleBuf], 'resume.pdf', { type: 'application/pdf' }));
    const req = new Request('http://test/api/upload', { method: 'POST', body: form });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toMatch(/^[A-Za-z0-9_-]{12}$/);
    expect(body.extractionStatus).toBe('uploaded');

    // DB 里存在行
    const s = new Database(process.env.DATABASE_URL!);
    const rows = drizzle(s).select().from(candidates).all();
    s.close();
    expect(rows).toHaveLength(1);
    expect(rows[0].pdfSize).toBe(sampleBuf.length);
  });

  it('rejects non-PDF with 415', async () => {
    const { POST } = await import('@/app/api/upload/route');
    const form = new FormData();
    form.append('file', new File([Buffer.from('not a pdf')], 'x.txt', { type: 'text/plain' }));
    const req = new Request('http://test/api/upload', { method: 'POST', body: form });
    const res = await POST(req);
    expect(res.status).toBe(415);
  });

  it('rejects > 10MB with 413', async () => {
    const big = Buffer.alloc(10 * 1024 * 1024 + 1);
    big.write('%PDF-'); // 假装是 pdf
    const { POST } = await import('@/app/api/upload/route');
    const form = new FormData();
    form.append('file', new File([big], 'huge.pdf', { type: 'application/pdf' }));
    const req = new Request('http://test/api/upload', { method: 'POST', body: form });
    const res = await POST(req);
    expect(res.status).toBe(413);
  });

  it('rejects missing file with 400', async () => {
    const { POST } = await import('@/app/api/upload/route');
    const form = new FormData();
    const req = new Request('http://test/api/upload', { method: 'POST', body: form });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});
