import type { Metadata } from 'next';
import { auth } from '@/lib/auth';
import { getDistinctTagValues } from '@/lib/db/queries';
import RegisterTeamClient from './RegisterTeamClient';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Register a Team — AgentCV' };

export default async function RegisterTeamPage() {
  const session = await auth();
  const sessionUser = session?.user
    ? {
        id: session.user.id,
        name: session.user.name ?? null,
        email: session.user.email ?? null,
      }
    : null;
  const { industries, taskKinds } = getDistinctTagValues();
  return (
    <RegisterTeamClient
      sessionUser={sessionUser}
      industrySuggestions={industries}
      taskKindSuggestions={taskKinds}
    />
  );
}
