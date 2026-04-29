import { desc, eq } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { jobDescriptions } from '@/lib/db/schema';
import { requireUser } from '@/lib/auth/session';
import JdClient from '@/components/JdClient';

export const dynamic = 'force-dynamic';

export default async function JdPage() {
  const user = await requireUser();
  const items = db.select().from(jobDescriptions)
    .where(eq(jobDescriptions.userId, user.id))
    .orderBy(desc(jobDescriptions.createdAt)).all();
  return <JdClient initial={items} user={user} initialDefaultJdId={user.defaultJdId ?? null} />;
}
