import { NextResponse } from 'next/server';
import { desc, eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { db } from '@/lib/db/client';
import { jobDescriptions } from '@/lib/db/schema';
import { UpsertJD } from '@/lib/validation';
import { getUserFromRequest } from '@/lib/auth/session';

export async function GET(req: Request) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const items = db.select().from(jobDescriptions)
    .where(eq(jobDescriptions.userId, user.id))
    .orderBy(desc(jobDescriptions.createdAt)).all();
  return NextResponse.json({ items });
}

export async function POST(req: Request) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'invalid_json' }, { status: 400 }); }

  const parsed = UpsertJD.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'validation', issues: parsed.error.issues }, { status: 400 });

  const now = Date.now();
  const jd = db.insert(jobDescriptions).values({
    id:               nanoid(12),
    title:            parsed.data.title,
    description:      parsed.data.description,
    requiredSkills:   parsed.data.requiredSkills,
    bonusSkills:      parsed.data.bonusSkills,
    minYears:         parsed.data.minYears ?? null,
    requiredDegree:   parsed.data.requiredDegree,
    skillWeight:      parsed.data.skillWeight,
    experienceWeight: parsed.data.experienceWeight,
    educationWeight:  parsed.data.educationWeight,
    userId:           user.id,
    createdAt:        new Date(now),
    updatedAt:        new Date(now),
  }).returning().get();

  return NextResponse.json(jd, { status: 201 });
}
