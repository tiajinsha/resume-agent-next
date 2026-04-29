import { NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { z } from 'zod';
import { db } from '@/lib/db/client';
import { users } from '@/lib/db/schema';
import { hashPassword } from '@/lib/auth/password';
import { createSession, makeSessionCookie } from '@/lib/auth/session';

const Body = z.object({
  username:    z.string().min(2).max(40).regex(/^[a-zA-Z0-9_一-龥]+$/),
  password:    z.string().min(6).max(100),
  displayName: z.string().max(40).optional(),
});

export async function POST(req: Request) {
  // 仅在没有任何用户时允许注册（首个用户 = 管理员）
  const existing = db.select({ id: users.id }).from(users).limit(1).all();
  if (existing.length > 0) {
    return NextResponse.json({ error: 'registration_closed' }, { status: 403 });
  }

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'invalid_json' }, { status: 400 }); }

  const parsed = Body.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'validation', issues: parsed.error.issues }, { status: 400 });

  const { username, password, displayName } = parsed.data;

  // 检查用户名是否重复（虽然 UNIQUE 约束会拦截，但给出更友好的错误）
  const dup = db.select({ id: users.id }).from(users).where(
    (await import('drizzle-orm')).eq(users.username, username)
  ).get();
  if (dup) return NextResponse.json({ error: 'username_taken' }, { status: 409 });

  const now = Date.now();
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
}
