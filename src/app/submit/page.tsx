import type { Metadata } from 'next';
import { auth } from '@/lib/auth';
import SubmitPageClient from './SubmitPageClient';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Submit — AgentCV' };

export default async function SubmitPage() {
  const session = await auth();
  const sessionUser = session?.user
    ? {
        id: session.user.id,
        name: session.user.name ?? null,
        email: session.user.email ?? null,
      }
    : null;
  return <SubmitPageClient sessionUser={sessionUser} />;
}
