// tests/worker.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { readFileSync, writeFileSync, mkdirSync, rmSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { eq } from 'drizzle-orm';
import { candidates } from '@/lib/db/schema';


describe('runExtraction (stub LLM + fixture PDF)', () => {
  let dir: string;
  const sampleBuf = readFileSync('tests/fixtures/sample.pdf');

  beforeEach(() => {
    vi.resetModules();
    dir = mkdtempSync(join(tmpdir(), 'sift-worker-'));
    process.env.DATABASE_URL = join(dir, 'test.db');
    process.env.UPLOADS_DIR  = join(dir, 'uploads');
    delete (globalThis as any).__sqlite;
    delete (globalThis as any).__streamEventBus;
  });

  it('parses fixture PDF and writes flat fields + extracted_json', async () => {
    const sqlite = new Database(process.env.DATABASE_URL!);
    sqlite.pragma('journal_mode = WAL');
    const db = drizzle(sqlite);
    migrate(db, { migrationsFolder: './lib/db/migrations' });

    mkdirSync(process.env.UPLOADS_DIR!, { recursive: true });
    writeFileSync(join(process.env.UPLOADS_DIR!, 'test123.pdf'), sampleBuf);

    const now = new Date();
    db.insert(candidates).values({
      id: 'test123',
      pdfPath: `${process.env.UPLOADS_DIR}/test123.pdf`,
      pdfSize: sampleBuf.length,
      createdAt: now, updatedAt: now,
    }).run();
    sqlite.close();

    const { runExtraction } = await import('@/lib/extraction/worker');
    await runExtraction('test123');

    const sqlite2 = new Database(process.env.DATABASE_URL!);
    const row = drizzle(sqlite2).select().from(candidates).where(eq(candidates.id, 'test123')).get();
    expect(row?.extractionStatus).toBe('parsed');
    expect(row?.name).toBe('张远哲');  // from STUB_RESULT
    expect(Array.isArray(row?.skills)).toBe(true);
    expect(row?.extractedJson).toBeTruthy();
    expect(row?.extractionAttempts).toBe(1);
    sqlite2.close();

    // Windows: worker's sqlite handle may still hold the file; tmpdir cleanup
    // happens eventually by the OS.
    try { rmSync(dir, { recursive: true }); } catch {}
  });

  it('records error when PDF missing', async () => {
    const sqlite = new Database(process.env.DATABASE_URL!);
    const db = drizzle(sqlite);
    migrate(db, { migrationsFolder: './lib/db/migrations' });

    const now = new Date();
    db.insert(candidates).values({
      id: 'missing1',
      pdfPath: `${process.env.UPLOADS_DIR}/does-not-exist.pdf`,
      pdfSize: 0,
      createdAt: now, updatedAt: now,
    }).run();
    sqlite.close();

    const { runExtraction } = await import('@/lib/extraction/worker');
    await runExtraction('missing1');

    const sqlite2 = new Database(process.env.DATABASE_URL!);
    const row = drizzle(sqlite2).select().from(candidates).where(eq(candidates.id, 'missing1')).get();
    expect(row?.extractionStatus).toBe('error');
    expect(row?.extractionError).toBeTruthy();
    sqlite2.close();
  });

  it('publishes chunks + done event to the event bus during extraction', async () => {
    const sqlite = new Database(process.env.DATABASE_URL!);
    sqlite.pragma('journal_mode = WAL');
    const d = drizzle(sqlite);
    migrate(d, { migrationsFolder: './lib/db/migrations' });

    mkdirSync(process.env.UPLOADS_DIR!, { recursive: true });
    writeFileSync(join(process.env.UPLOADS_DIR!, 'pub1.pdf'), sampleBuf);

    d.insert(candidates).values({
      id: 'pub1',
      pdfPath: `${process.env.UPLOADS_DIR}/pub1.pdf`,
      pdfSize: sampleBuf.length,
      createdAt: new Date(), updatedAt: new Date(),
    }).run();
    sqlite.close();

    const bus = await import('@/lib/extraction/event-bus');
    const events: any[] = [];
    const sub = bus.subscribe('pub1', (e) => events.push(e));

    const { runExtraction } = await import('@/lib/extraction/worker');
    await runExtraction('pub1');
    sub.unsubscribe();

    const types = events.map((e) => e.type);
    expect(types).toContain('chunk');
    expect(types[types.length - 1]).toBe('done');

    const last = events[events.length - 1];
    expect(last.candidate.id).toBe('pub1');
    expect(last.candidate.extractionStatus).toBe('parsed');

    // 清理后 buffer 应当被清空
    expect(bus.getBuffer('pub1')).toBe('');
  });

  it('publishes error event when PDF missing', async () => {
    const sqlite = new Database(process.env.DATABASE_URL!);
    const d = drizzle(sqlite);
    migrate(d, { migrationsFolder: './lib/db/migrations' });

    d.insert(candidates).values({
      id: 'bad1',
      pdfPath: `${process.env.UPLOADS_DIR}/nope.pdf`,
      pdfSize: 0,
      createdAt: new Date(), updatedAt: new Date(),
    }).run();
    sqlite.close();

    const bus = await import('@/lib/extraction/event-bus');
    const events: any[] = [];
    const sub = bus.subscribe('bad1', (e) => events.push(e));

    const { runExtraction } = await import('@/lib/extraction/worker');
    await runExtraction('bad1');
    sub.unsubscribe();

    const last = events[events.length - 1];
    expect(last.type).toBe('error');
    expect(last.message).toBeTruthy();
  });
});
