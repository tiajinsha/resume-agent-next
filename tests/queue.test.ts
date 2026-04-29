// tests/queue.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mkdtempSync, writeFileSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { eq } from 'drizzle-orm';
import { candidates } from '@/lib/db/schema';

describe('extraction queue', () => {
  let dir: string;
  const sampleBuf = readFileSync('tests/fixtures/sample.pdf');

  beforeEach(() => {
    vi.resetModules();
    dir = mkdtempSync(join(tmpdir(), 'sift-queue-'));
    process.env.DATABASE_URL = join(dir, 'test.db');
    process.env.UPLOADS_DIR  = join(dir, 'uploads');
    delete (globalThis as any).__sqlite;
    delete (globalThis as any).__queueInit;
  });

  it('processes a queued candidate end-to-end', async () => {
    const sqlite = new Database(process.env.DATABASE_URL!);
    sqlite.pragma('journal_mode = WAL');
    const db = drizzle(sqlite);
    migrate(db, { migrationsFolder: './lib/db/migrations' });

    mkdirSync(process.env.UPLOADS_DIR!, { recursive: true });
    writeFileSync(join(process.env.UPLOADS_DIR!, 'q1.pdf'), sampleBuf);

    const now = new Date();
    db.insert(candidates).values({
      id: 'q1',
      pdfPath: `${process.env.UPLOADS_DIR}/q1.pdf`,
      pdfSize: sampleBuf.length,
      createdAt: now, updatedAt: now,
    }).run();
    sqlite.close();

    const { queue, enqueueExtraction } = await import('@/lib/extraction/queue');
    enqueueExtraction('q1');
    await queue.onIdle();

    const s = new Database(process.env.DATABASE_URL!);
    const row = drizzle(s).select().from(candidates).where(eq(candidates.id, 'q1')).get();
    expect(row?.extractionStatus).toBe('parsed');
    s.close();
    try { rmSync(dir, { recursive: true }); } catch {}
  });

  it('startup scan resets extracting → uploaded and resumes', async () => {
    const sqlite = new Database(process.env.DATABASE_URL!);
    sqlite.pragma('journal_mode = WAL');
    const db = drizzle(sqlite);
    migrate(db, { migrationsFolder: './lib/db/migrations' });

    mkdirSync(process.env.UPLOADS_DIR!, { recursive: true });
    writeFileSync(join(process.env.UPLOADS_DIR!, 'stuck1.pdf'), sampleBuf);

    const now = new Date();
    db.insert(candidates).values({
      id: 'stuck1',
      pdfPath: `${process.env.UPLOADS_DIR}/stuck1.pdf`,
      pdfSize: sampleBuf.length,
      extractionStatus: 'extracting',
      createdAt: now, updatedAt: now,
    }).run();
    sqlite.close();

    const { queue } = await import('@/lib/extraction/queue');
    await queue.onIdle();

    const s = new Database(process.env.DATABASE_URL!);
    const row = drizzle(s).select().from(candidates).where(eq(candidates.id, 'stuck1')).get();
    expect(row?.extractionStatus).toBe('parsed');
    s.close();
  });
});
