// app/api/candidates/route.ts
import { NextResponse } from 'next/server';
import { and, desc, asc, eq, like, or, SQL } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { candidates, CANDIDATE_STATUS } from '@/lib/db/schema';
import { ROLE_CATEGORIES } from '@/lib/validation';
import { getUserFromRequest } from '@/lib/auth/session';

const VALID_SORTS = ['recent', 'oldest', 'name'] as const;
type SortOpt = typeof VALID_SORTS[number];

export async function GET(req: Request) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const url = new URL(req.url);
  const status = url.searchParams.get('status');
  const roleCategory = url.searchParams.get('roleCategory');
  const q = url.searchParams.get('q')?.trim();
  const sortRaw = (url.searchParams.get('sort') ?? 'recent') as SortOpt;
  const sort: SortOpt = (VALID_SORTS as readonly string[]).includes(sortRaw) ? sortRaw : 'recent';

  const wheres: SQL[] = [eq(candidates.userId, user.id)];
  if (status && (CANDIDATE_STATUS as readonly string[]).includes(status)) {
    wheres.push(eq(candidates.status, status as any));
  }
  if (roleCategory && (ROLE_CATEGORIES as readonly string[]).includes(roleCategory)) {
    wheres.push(eq(candidates.roleCategory, roleCategory));
  }
  if (q && q.length >= 2 && q.length <= 100) {
    const pat = `%${q}%`;
    wheres.push(or(
      like(candidates.name, pat),
      like(candidates.school, pat),
      like(candidates.role, pat),
    )!);
  }

  const orderBy =
    sort === 'oldest' ? asc(candidates.updatedAt) :
    sort === 'name'   ? asc(candidates.name) :
                        desc(candidates.updatedAt);

  const items = db.select().from(candidates)
    .where(and(...wheres))
    .orderBy(orderBy)
    .all();

  return NextResponse.json({ items });
}
