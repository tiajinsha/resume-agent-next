// app/api/jobs/route.ts
import { NextResponse } from 'next/server';
import { and, eq, inArray } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { candidates } from '@/lib/db/schema';
import { getUserFromRequest } from '@/lib/auth/session';

export async function GET(req: Request) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const url = new URL(req.url);
  const raw = url.searchParams.get('ids')?.trim();
  if (!raw) return NextResponse.json({ items: [] });
  const ids = raw.split(',').map((s) => s.trim()).filter(Boolean);
  if (ids.length === 0) return NextResponse.json({ items: [] });

  const rows = db.select({
    id: candidates.id,
    extractionStatus: candidates.extractionStatus,
    extractionError: candidates.extractionError,
  }).from(candidates).where(and(inArray(candidates.id, ids), eq(candidates.userId, user.id))).all();

  return NextResponse.json({ items: rows });
}
