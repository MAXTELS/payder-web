'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api, ApiError } from '@/lib/api-client';
import { storeSession, getCurrentUser } from '@/lib/auth';
import { Logo } from '@/components/Logo';

export default function LoginPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { accessToken, refreshToken } = await api.login(identifier, password);
      storeSession(accessToken, refreshToken);
      const user = getCurrentUser();
      if (user?.role === 'ADMIN') router.push('/admin');
      else if (user?.role === 'CUSTOMER_CARE') router.push('/care');
      else router.push('/dashboard');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-surface-hover px-6">
      <div className="w-full max-w-sm payder-fade-up">
        <div className="mb-8 flex justify-center">
          <Logo size="lg" />
        </div>
        <div className="rounded-2xl border border-line bg-surface p-8 shadow-sm">
          <h1 className="text-xl font-semibold text-foreground">Log in to PAYDER</h1>
          <p className="mt-1 text-sm text-muted">
            One login, three portals — this app routes you to the right one by role.
          </p>
          <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
            <label className="flex flex-col gap-1 text-sm">
              Email or phone
              <input
                className="rounded-lg border border-line px-3 py-2.5 outline-none transition focus:border-brand-orange"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                required
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Password
              <input
                type="password"
                className="rounded-lg border border-line px-3 py-2.5 outline-none transition focus:border-brand-orange"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </label>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-brand-orange px-4 py-2.5 font-semibold text-white shadow-sm transition hover:bg-brand-orange-dark disabled:opacity-50"
            >
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        </div>
        <p className="mt-6 text-center text-sm text-muted">
          New here?{' '}
          <Link href="/signup" className="font-medium text-brand-orange hover:underline">
            Create an account
          </Link>
        </p>
      </div>
    </main>
  );
}
