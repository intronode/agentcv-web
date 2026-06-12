'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useSearchParams, useRouter } from 'next/navigation';

const inputClasses =
  'w-full rounded-lg border border-border bg-surface-elevated px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:border-accent focus:outline-none';
const labelClasses = 'block text-xs font-medium uppercase tracking-wide text-text-tertiary';

interface Props {
  googleEnabled: boolean;
  devEnabled: boolean;
}

export default function SignInClient({ googleEnabled, devEnabled }: Props) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const callbackUrl = searchParams.get('callbackUrl') ?? '/';
  const errorParam = searchParams.get('error');

  const [devHandle, setDevHandle] = useState('');
  const [devName, setDevName] = useState('');
  const [devError, setDevError] = useState('');
  const [devLoading, setDevLoading] = useState(false);

  async function handleDevSignIn(e: React.FormEvent) {
    e.preventDefault();
    const handle = devHandle.trim();
    const name = devName.trim();
    if (!handle) {
      setDevError('Handle is required');
      return;
    }
    setDevError('');
    setDevLoading(true);
    const result = await signIn('dev-credentials', {
      redirect: false,
      handle,
      displayName: name || handle,
      callbackUrl,
    });
    setDevLoading(false);
    if (result?.error) {
      setDevError('Sign-in failed — check the handle and try again.');
      return;
    }
    router.push(callbackUrl);
    router.refresh();
  }

  async function handleGoogle() {
    await signIn('google', { callbackUrl });
  }

  const hasAnyProvider = googleEnabled || devEnabled;

  return (
    <div className="mt-8 space-y-6">
      {errorParam && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-400">
          {errorParam === 'OAuthSignin' || errorParam === 'OAuthCallback'
            ? 'OAuth sign-in failed. Check provider configuration.'
            : errorParam === 'Callback'
              ? 'Callback error. Try again.'
              : `Sign-in error: ${errorParam}`}
        </div>
      )}

      {/* ── Google button (primary when configured) ── */}
      {googleEnabled && (
        <button
          type="button"
          onClick={handleGoogle}
          className="flex w-full items-center justify-center gap-3 rounded-lg border border-border bg-surface-elevated px-4 py-3 text-sm font-medium text-text-primary transition-colors hover:bg-surface-hover"
        >
          {/* Google G mark */}
          <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
            <path
              fill="#EA4335"
              d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
            />
            <path
              fill="#4285F4"
              d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
            />
            <path
              fill="#FBBC05"
              d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
            />
            <path
              fill="#34A853"
              d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
            />
          </svg>
          Continue with Google
        </button>
      )}

      {/* ── Invite-gated notice (Google not configured, production-facing state) ── */}
      {!googleEnabled && !devEnabled && (
        <div className="space-y-2 py-2">
          <p className="text-base font-medium text-text-primary">
            Sign-in is invite-gated while the registry is in early access.
          </p>
          <p className="text-sm text-text-secondary">
            Operators:{' '}
            <a href="/request" className="text-accent hover:underline">
              request a setup
            </a>{' '}
            or{' '}
            <a href="/register" className="text-accent hover:underline">
              submit your team
            </a>{' '}
            — no account needed.
          </p>
        </div>
      )}

      {/* Invite-gated notice when Google is absent but dev is present */}
      {!googleEnabled && devEnabled && (
        <div className="space-y-1 pb-1">
          <p className="text-base font-medium text-text-primary">
            Sign-in is invite-gated while the registry is in early access.
          </p>
          <p className="text-sm text-text-secondary">
            Operators:{' '}
            <a href="/request" className="text-accent hover:underline">
              request a setup
            </a>{' '}
            or{' '}
            <a href="/register" className="text-accent hover:underline">
              submit your team
            </a>{' '}
            — no account needed.
          </p>
        </div>
      )}

      {/* ── Divider ── */}
      {googleEnabled && devEnabled && (
        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-border" />
          <span className="text-xs text-text-tertiary">or</span>
          <div className="h-px flex-1 bg-border" />
        </div>
      )}

      {/* ── Dev sign-in form — labeled environment tool, not warning ── */}
      {devEnabled && (
        <div className="rounded-lg border border-border bg-surface-elevated p-4">
          <div className="mb-3 flex items-center gap-2">
            <span className="rounded border border-border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-text-tertiary">
              Development environment sign-in
            </span>
          </div>

          <form onSubmit={handleDevSignIn} className="space-y-3">
            <div>
              <label htmlFor="dev-handle" className={labelClasses}>
                Handle *
              </label>
              <input
                id="dev-handle"
                type="text"
                value={devHandle}
                onChange={(e) => setDevHandle(e.target.value)}
                placeholder="e.g. alice-dev"
                maxLength={40}
                className={`mt-1.5 ${inputClasses}`}
                autoComplete="off"
              />
            </div>
            <div>
              <label htmlFor="dev-name" className={labelClasses}>
                Display name
              </label>
              <input
                id="dev-name"
                type="text"
                value={devName}
                onChange={(e) => setDevName(e.target.value)}
                placeholder="Optional — defaults to handle"
                maxLength={80}
                className={`mt-1.5 ${inputClasses}`}
                autoComplete="off"
              />
            </div>
            {devError && <p className="text-[11px] text-red-400">{devError}</p>}
            <button
              type="submit"
              disabled={devLoading}
              className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-surface-hover hover:text-text-primary disabled:opacity-50"
            >
              {devLoading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
