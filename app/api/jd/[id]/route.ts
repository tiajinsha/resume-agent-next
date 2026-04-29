import { NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { jobDescriptions } from '@/lib/db/schema';
import { UpsertJD } from '@/lib/validation';
import { getUserFromRequest } from '@/lib/auth/session';

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: Request, ctx: Ctx) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await ctx.params;
  const jd = db.select().from(jobDescriptions).where(and(eq(jobDescriptions.id, id), eq(jobDescriptions.userId, user.id))).get();
  if (!jd) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json(jd);
}

export async function PATCH(req: Request, ctx: Ctx) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await ctx.params;
  const jd = db.select().from(jobDescriptions).where(and(eq(jobDescriptions.id, id), eq(jobDescriptions.userId, user.id))).get();
  if (!jd) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'invalid_json' }, { status: 400 }); }

  const parsed = UpsertJD.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'validation', issues: parsed.error.issues }, { status: 400 });

  const d = parsed.data;
  const updates = {
    title: d.title,
    description: d.description,
    requiredSkills: d.requiredSkills,
    bonusSkills: d.bonusSkills,
    minYears: d.minYears ?? null,
    requiredDegree: d.requiredDegree,
    skillWeight: d.skillWeight,
    experienceWeight: d.experienceWeight,
    educationWeight: d.educationWeight,
    updatedAt: new Date(),
  };

  const updated = db.update(jobDescriptions).set(updates).where(eq(jobDescriptions.id, id)).returning().get();
  return NextResponse.json(updated);
}

export async function DELETE(req: Request, ctx: Ctx) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await ctx.params;
  const existing = db.select({ id: jobDescriptions.id }).from(jobDescriptions).where(and(eq(jobDescriptions.id, id), eq(jobDescriptions.userId, user.id))).get();
  if (!existing) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  db.delete(jobDescriptions).where(eq(jobDescriptions.id, id)).run();
  return NextResponse.json({ ok: true });
}
