// lib/extraction/queue.ts
import PQueue from 'p-queue';
import { eq } from 'drizzle-orm';
import { db } from '../db/client';
import { candidates } from '../db/schema';
import { runExtraction } from './worker';

export const queue = new PQueue({ concurrency: 1 });

declare global {
  var __queueInit: boolean | undefined;
}

function initOnce() {
  if (globalThis.__queueInit) return;
  globalThis.__queueInit = true;

  db.update(candidates)
    .set({ extractionStatus: 'uploaded' })
    .where(eq(candidates.extractionStatus, 'extracting'))
    .run();

  const pending = db.select({ id: candidates.id })
    .from(candidates)
    .where(eq(candidates.extractionStatus, 'uploaded'))
    .all();

  for (const p of pending) enqueueExtraction(p.id);
}

export function enqueueExtraction(id: string): void {
  queue.add(() => runExtraction(id));
}

initOnce();
