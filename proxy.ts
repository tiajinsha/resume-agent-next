import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PUBLIC_PREFIXES = ['/login', '/api/auth/', '/api/health'];

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname === '/') return NextResponse.next();
  if (PUBLIC_PREFIXES.some(p => pathname.startsWith(p))) return NextResponse.next();
  if (pathname.startsWith('/_next') || pathname.match(/\.[a-z]+$/i)) return NextResponse.next();

  const hasCookie = req.cookies.has('sid');
  if (!hasCookie) return NextResponse.redirect(new URL('/login', req.url));
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
