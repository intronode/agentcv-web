import type { Metadata } from 'next';
import { isGoogleConfigured, isDevLoginEnabled } from '@/lib/auth';
import SignInClient from './SignInClient';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = { title: 'Sign in — AgentCV' };

export default function SignInPage() {
  const googleEnabled = isGoogleConfigured();
  const devEnabled = isDevLoginEnabled();

  return (
    <div className="mx-auto max-w-md px-6 py-16">
      <p className="text-xs font-semibold uppercase tracking-[0.15em] text-accent">Account</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight">Sign in</h1>
      <p className="mt-2 text-sm leading-relaxed text-text-secondary">
        Signing in lets you attach submissions and claimed profiles to your account.
      </p>

      <SignInClient googleEnabled={googleEnabled} devEnabled={devEnabled} />
    </div>
  );
}
