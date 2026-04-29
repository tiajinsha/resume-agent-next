// app/api/candidates/[id]/retry/route.ts
import { NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { candidates } from '@/lib/db/schema';
import { enqueueExtraction } from '@/lib/extraction/queue';
import { getUserFromRequest } from '@/lib/auth/session';

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: Request, ctx: Ctx) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await ctx.params;
  const row = db.select().from(candidates).where(and(eq(candidates.id, id), eq(candidates.userId, user.id))).get();
  if (!row) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  if (row.extractionStatus !== 'error') {
    return NextResponse.json({ error: 'not_in_error_state' }, { status: 409 });
  }

  db.update(candidates).set({
    extractionStatus: 'uploaded',
    extractionError: null,
    updatedAt: new Date(),
  }).where(eq(candidates.id, id)).run();

  enqueueExtraction(id);
  return NextResponse.json({ id, extractionStatus: 'uploaded' });
}
