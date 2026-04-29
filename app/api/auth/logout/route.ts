import { NextResponse } from 'next/server';
import { deleteSession, clearSessionCookie, SESSION_COOKIE, parseCookies } from '@/lib/auth/session';

export async function POST(req: Request) {
  const sid = parseCookies(req.headers.get('cookie') ?? '')[SESSION_COOKIE];
  if (sid) deleteSession(sid);
  return NextResponse.json({ ok: true }, { headers: { 'Set-Cookie': clearSessionCookie() } });
}
