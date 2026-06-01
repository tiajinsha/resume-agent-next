import { NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/lib/db/client';
import { candidates, jobDescriptions, type MatchResult } from '@/lib/db/schema';
import { callMatchAI } from '@/lib/matching/llm';
import { getUserFromRequest } from '@/lib/auth/session';
import { checkRateLimit } from '@/lib/rate-limit';

type Ctx = { params: Promise<{ id: string }> };

const MatchBody = z.object({ jdId: z.string().min(1) });

export async function POST(req: Request, ctx: Ctx) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  if (!checkRateLimit(`match:${user.id}`, 60, 60 * 60 * 1000)) {
    return NextResponse.json({ error: 'rate_limited', message: '匹配过于频繁，请稍后再试' }, { status: 429 });
  }

  const { id } = await ctx.params;

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'invalid_json' }, { status: 400 }); }
  const parsed = MatchBody.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'validation' }, { status: 400 });

  const candidate = db.select().from(candidates).where(and(eq(candidates.id, id), eq(candidates.userId, user.id))).get();
  if (!candidate) return NextResponse.json({ error: 'not_found', subject: 'candidate' }, { status: 404 });
  if (candidate.extractionStatus !== 'parsed') {
    return NextResponse.json({ error: 'not_parsed' }, { status: 400 });
  }

  const jd = db.select().from(jobDescriptions).where(and(eq(jobDescriptions.id, parsed.data.jdId), eq(jobDescriptions.userId, user.id))).get();
  if (!jd) return NextResponse.json({ error: 'not_found', subject: 'jd' }, { status: 404 });

  let aiResult;
  try {
    aiResult = await callMatchAI(jd, candidate);
  } catch (err) {
    return NextResponse.json({ error: 'match_failed', message: String(err) }, { status: 500 });
  }

  const overall = Math.round(
    aiResult.skill.score      * jd.skillWeight      / 100 +
    aiResult.experience.score * jd.experienceWeight / 100 +
    aiResult.education.score  * jd.educationWeight  / 100,
  );

  const newResult: MatchResult = {
    jdId:       jd.id,
    jdTitle:    jd.title,
    overall,
    skill:      aiResult.skill,
    experience: aiResult.experience,
    education:  aiResult.education,
    summary:    aiResult.summary,
    weights:    { skill: jd.skillWeight, experience: jd.experienceWeight, education: jd.educationWeight },
    matchedAt:  Date.now(),
  };

  const existing = (candidate.matchResults ?? []).filter(r => r.jdId !== jd.id).slice(0, 9);
  const updated = [newResult, ...existing];

  db.update(candidates)
    .set({ matchResults: updated, updatedAt: new Date() })
    .where(eq(candidates.id, id))
    .run();

  return NextResponse.json(newResult);
}
