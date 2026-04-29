import { and, eq } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { candidates } from '@/lib/db/schema';
import { readPdf } from '@/lib/storage';
import { getUserFromRequest } from '@/lib/auth/session';

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: Request, ctx: Ctx) {
  const user = getUserFromRequest(req);
  if (!user) return new Response('unauthorized', { status: 401 });

  const { id } = await ctx.params;
  const row = db
    .select()
    .from(candidates)
    .where(and(eq(candidates.id, id), eq(candidates.userId, user.id)))
    .get();

  if (!row) return new Response('not_found', { status: 404 });

  let buffer: Buffer;
  try {
    buffer = readPdf(row.pdfPath);
  } catch {
    return new Response('pdf_not_found', { status: 404 });
  }

  return new Response(new Uint8Array(buffer), {
    headers: {
      'Content-Type':           'application/pdf',
      'Content-Length':         String(buffer.byteLength),
      'Content-Disposition':    'inline',
      'Cache-Control':          'private, max-age=3600',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
