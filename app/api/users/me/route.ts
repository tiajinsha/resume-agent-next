import { NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { users, jobDescriptions } from '@/lib/db/schema';
import { getUserFromRequest } from '@/lib/auth/session';

export async function PATCH(req: Request) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'invalid_json' }, { status: 400 }); }

  const jdId = (body as Record<string, unknown>).defaultJdId as string | null ?? null;

  if (jdId) {
    const jd = db.select({ id: jobDescriptions.id })
      .from(jobDescriptions)
      .where(and(eq(jobDescriptions.id, jdId), eq(jobDescriptions.userId, user.id)))
      .get();
    if (!jd) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  db.update(users).set({ defaultJdId: jdId }).where(eq(users.id, user.id)).run();
  return NextResponse.json({ ok: true });
}
