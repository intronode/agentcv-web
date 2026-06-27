import type { Metadata } from 'next';
import { auth } from '@/lib/auth';
import { getDistinctTagValues } from '@/lib/db/queries';
import RegisterAgentClient from './RegisterAgentClient';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Register an Agent — AgentCV' };

export default async function RegisterAgentPage() {
  const session = await auth();
  const sessionUser = session?.user
    ? {
        id: session.user.id,
        name: session.user.name ?? null,
        email: session.user.email ?? null,
      }
    : null;
  const { agentCategories } = await getDistinctTagValues();
  return <RegisterAgentClient sessionUser={sessionUser} agentCategories={agentCategories} />;
}
