import { NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { z } from 'zod';
import { db } from '@/lib/db/client';
import { users } from '@/lib/db/schema';
import { hashPassword } from '@/lib/auth/password';
import { createSession, makeSessionCookie } from '@/lib/auth/session';
import { checkRateLimit } from '@/lib/rate-limit';

const Body = z.object({
  username:    z.string().min(2).max(40).regex(/^[a-zA-Z0-9_一-龥]+$/),
  password:    z.string().min(6).max(100),
  displayName: z.string().max(40).optional(),
});

export async function POST(req: Request) {
  // 注册无需登录，按客户端 IP 限流（Nginx 反代传 X-Forwarded-For / X-Real-IP）
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || req.headers.get('x-real-ip')
    || 'unknown';
  if (!checkRateLimit(`register:${ip}`, 5, 60 * 60 * 1000)) {
    return NextResponse.json({ error: 'rate_limited', message: '注册过于频繁，请稍后再试' }, { status: 429 });
  }

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'invalid_json' }, { status: 400 }); }

  const parsed = Body.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'validation', issues: parsed.error.issues }, { status: 400 });

  const { username, password, displayName } = parsed.data;
  const now = Date.now();

  // 直接插入，靠 UNIQUE(username) 约束保证原子性；冲突 → 409（避免 SELECT-then-INSERT 竞态）
  try {
    const user = db.insert(users).values({
      id:           nanoid(12),
      username,
      displayName:  displayName ?? null,
      passwordHash: hashPassword(password),
      createdAt:    new Date(now),
      updatedAt:    new Date(now),
    }).returning().get();

    const sid = createSession(user.id);

    return NextResponse.json(
      { user: { id: user.id, username: user.username, displayName: user.displayName } },
      { status: 201, headers: { 'Set-Cookie': makeSessionCookie(sid) } },
    );
  } catch (err) {
    const code = (err as { code?: string }).code;
    if (code === 'SQLITE_CONSTRAINT_UNIQUE' || (err instanceof Error && /UNIQUE constraint failed/i.test(err.message))) {
      return NextResponse.json({ error: 'username_taken' }, { status: 409 });
    }
    throw err;
  }
}
