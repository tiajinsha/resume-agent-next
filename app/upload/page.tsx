// app/upload/page.tsx
import { requireUser } from '@/lib/auth/session';
import UploadClient from '@/components/UploadClient';

export const dynamic = 'force-dynamic';

export default async function UploadPage() {
  const user = await requireUser();
  return <UploadClient user={user} />;
}
