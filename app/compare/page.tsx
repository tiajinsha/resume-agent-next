import { desc, eq } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { candidates, jobDescriptions } from '@/lib/db/schema';
import { requireUser } from '@/lib/auth/session';
import CompareClient from '@/components/CompareClient';

export const dynamic = 'force-dynamic';

export default async function ComparePage() {
  const user = await requireUser();
  const allCandidates = db.select().from(candidates)
    .where(eq(candidates.userId, user.id))
    .orderBy(desc(candidates.createdAt)).all();
  const allJds = db.select().from(jobDescriptions)
    .where(eq(jobDescriptions.userId, user.id))
    .orderBy(desc(jobDescriptions.createdAt)).all();
  return <CompareClient candidates={allCandidates} jds={allJds} user={user} />;
}
