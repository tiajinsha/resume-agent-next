import { NextResponse } from 'next/server';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { users } from '@/lib/db/schema';
import { verifyPassword } from '@/lib/auth/password';
import { createSession, makeSessionCookie } from '@/lib/auth/session';

const Body = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

export async function POST(req: Request) {
  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'invalid_json' }, { status: 400 }); }

  const parsed = Body.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'invalid_credentials' }, { status: 400 });

  const user = db.select().from(users).where(eq(users.username, parsed.data.username)).get();
  if (!user || !verifyPassword(parsed.data.password, user.passwordHash)) {
    return NextResponse.json({ error: 'invalid_credentials' }, { status: 400 });
  }

  const sid = createSession(user.id);

  return NextResponse.json(
    { user: { id: user.id, username: user.username, displayName: user.displayName } },
    { headers: { 'Set-Cookie': makeSessionCookie(sid) } },
  );
}
