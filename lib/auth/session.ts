import { randomBytes } from 'node:crypto';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db/client';
import { sessions, users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import type { User } from '@/lib/db/schema';

export const SESSION_COOKIE = 'sid';
const TTL_S  = 7 * 24 * 3600;
const TTL_MS = TTL_S * 1000;

export function createSession(userId: string): string {
  const id = randomBytes(32).toString('hex');
  db.insert(sessions).values({
    id,
    userId,
    expiresAt: Date.now() + TTL_MS,
    createdAt: Date.now(),
  }).run();
  return id;
}

export function deleteSession(sid: string): void {
  db.delete(sessions).where(eq(sessions.id, sid)).run();
}

export function getUserFromRequest(req: Request): User | null {
  const raw = req.headers.get('cookie') ?? '';
  const sid = parseCookies(raw)[SESSION_COOKIE];
  return sid ? resolveSession(sid) : null;
}

export async function getCurrentUser(): Promise<User | null> {
  const sid = (await cookies()).get(SESSION_COOKIE)?.value;
  return sid ? resolveSession(sid) : null;
}

export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  return user;
}

function resolveSession(sid: string): User | null {
  const session = db.select().from(sessions).where(eq(sessions.id, sid)).get();
  if (!session || session.expiresAt < Date.now()) return null;
  return db.select().from(users).where(eq(users.id, session.userId)).get() ?? null;
}

export function parseCookies(header: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx < 0) continue;
    const key = decodeURIComponent(part.slice(0, idx).trim());
    const val = decodeURIComponent(part.slice(idx + 1).trim());
    result[key] = val;
  }
  return result;
}

export function makeSessionCookie(sid: string): string {
  return `${SESSION_COOKIE}=${sid}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${TTL_S}`;
}

export function clearSessionCookie(): string {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}
