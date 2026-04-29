// app/dashboard/page.tsx
import { and, desc, eq } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { candidates } from '@/lib/db/schema';
import { requireUser } from '@/lib/auth/session';
import DashboardClient from '@/components/DashboardClient';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const user = await requireUser();
  const items = db.select().from(candidates)
    .where(eq(candidates.userId, user.id))
    .orderBy(desc(candidates.updatedAt)).all();
  return <DashboardClient initial={items} user={user} />;
}
