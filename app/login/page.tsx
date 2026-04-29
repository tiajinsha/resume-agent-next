import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { db } from '@/lib/db/client';
import { users } from '@/lib/db/schema';
import { hashPassword } from '@/lib/auth/password';
import { getCurrentUser } from '@/lib/auth/session';
import { redirect } from 'next/navigation';
import LoginClient from './LoginClient';

export const dynamic = 'force-dynamic';

const DEMO_USERNAME = 'demo';
const DEMO_PASSWORD = 'demo123';

async function ensureDemoUser() {
  const existing = db.select({ id: users.id }).from(users).where(eq(users.username, DEMO_USERNAME)).get();
  if (existing) return;
  const now = new Date();
  db.insert(users).values({
    id:           nanoid(12),
    username:     DEMO_USERNAME,
    displayName:  '演示账号',
    passwordHash: hashPassword(DEMO_PASSWORD),
    createdAt:    now,
    updatedAt:    now,
  }).run();
}

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect('/dashboard');

  const isDev = process.env.NODE_ENV === 'development';
  if (isDev) await ensureDemoUser();

  const hasUsers = db.select({ id: users.id }).from(users).limit(1).all().length > 0;
  return <LoginClient initialMode={hasUsers ? 'login' : 'register'} isDev={isDev} />;
}
