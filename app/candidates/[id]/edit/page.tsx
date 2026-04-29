import { notFound } from 'next/navigation';
import { and, eq } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { candidates } from '@/lib/db/schema';
import { requireUser } from '@/lib/auth/session';
import CandidateEditClient from '@/components/CandidateEditClient';

export const dynamic = 'force-dynamic';

export default async function EditPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const row = db.select().from(candidates).where(and(eq(candidates.id, id), eq(candidates.userId, user.id))).get();
  if (!row) notFound();
  return <CandidateEditClient initial={row} user={user} />;
}
