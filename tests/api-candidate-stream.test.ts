import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { candidates } from '@/lib/db/schema';

async function readSseFrames(res: Response, max = 2000): Promise<string> {
  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let out = '';
  while (out.length < max) {
    const { value, done } = await reader.read();
    if (done) break;
    out += decoder.decode(value);
  }
  try { reader.cancel(); } catch {}
  return out;
}

describe('GET /api/candidates/:id/stream', () => {
  let dir: string;
  const params = (id: string) => ({ params: Promise.resolve({ id }) });
  const sampleBuf = readFileSync('tests/fixtures/sample.pdf');

  beforeEach(() => {
    vi.resetModules();
    dir = mkdtempSync(join(tmpdir(), 'sift-sse-'));
    process.env.DATABASE_URL = join(dir, 'test.db');
    process.env.UPLOADS_DIR  = join(dir, 'uploads');
    delete (globalThis as any).__sqlite;
    delete (globalThis as any).__queueInit;
    delete (globalThis as any).__streamEventBus;

    const sqlite = new Database(process.env.DATABASE_URL);
    sqlite.pragma('journal_mode = WAL');
    migrate(drizzle(sqlite), { migrationsFolder: './lib/db/migrations' });
    sqlite.close();
  });

  it('returns 404 for unknown id', async () => {
    const { GET } = await import('@/app/api/candidates/[id]/stream/route');
    const res = await GET(new Request('http://t'), params('nope'));
    expect(res.status).toBe(404);
  });

  it('short-circuits to done event for already-parsed candidate', async () => {
    const sqlite = new Database(process.env.DATABASE_URL!);
    drizzle(sqlite).insert(candidates).values({
      id: 'ok1',
      pdfPath: 'x', pdfSize: 1,
      extractionStatus: 'parsed',
      createdAt: new Date(), updatedAt: new Date(),
    }).run();
    sqlite.close();

    const { GET } = await import('@/app/api/candidates/[id]/stream/route');
    const res = await GET(new Request('http://t'), params('ok1'));
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('text/event-stream');
    const body = await readSseFrames(res);
    expect(body).toContain('event: done');
    expect(body).toContain('"id":"ok1"');
  });

  it('short-circuits to error event for failed candidate', async () => {
    const sqlite = new Database(process.env.DATABASE_URL!);
    drizzle(sqlite).insert(candidates).values({
      id: 'err1',
      pdfPath: 'x', pdfSize: 1,
      extractionStatus: 'error',
      extractionError: 'boom',
      createdAt: new Date(), updatedAt: new Date(),
    }).run();
    sqlite.close();

    const { GET } = await import('@/app/api/candidates/[id]/stream/route');
    const res = await GET(new Request('http://t'), params('err1'));
    const body = await readSseFrames(res);
    expect(body).toContain('event: error');
    expect(body).toContain('"message":"boom"');
  });

  it('streams snapshot + chunk + done for an extracting candidate', async () => {
    const sqlite = new Database(process.env.DATABASE_URL!);
    sqlite.pragma('journal_mode = WAL');
    const d = drizzle(sqlite);
    mkdirSync(process.env.UPLOADS_DIR!, { recursive: true });
    writeFileSync(join(process.env.UPLOADS_DIR!, 'live.pdf'), sampleBuf);
    d.insert(candidates).values({
      id: 'live1',
      pdfPath: `${process.env.UPLOADS_DIR}/live.pdf`,
      pdfSize: sampleBuf.length,
      createdAt: new Date(), updatedAt: new Date(),
    }).run();
    sqlite.close();

    // 并行:打开 SSE 连接,同时在另一侧跑 worker
    const { GET } = await import('@/app/api/candidates/[id]/stream/route');
    const res = await GET(new Request('http://t'), params('live1'));

    const { runExtraction } = await import('@/lib/extraction/worker');
    const workerPromise = runExtraction('live1');

    const body = await readSseFrames(res, 20_000);
    await workerPromise;

    expect(body).toContain('event: snapshot');
    expect(body).toContain('event: chunk');
    expect(body).toContain('event: done');
    // chunk frame 携带 text 字段
    expect(body).toMatch(/"text":/);
  });
});
