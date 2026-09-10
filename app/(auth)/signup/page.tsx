'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api, ApiError } from '@/lib/api-client';
import { storeSession } from '@/lib/auth';
import { Logo } from '@/components/Logo';

export default function SignupPage() {
  const router = useRouter();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    setLoading(true);
    try {
      // register() only returns { id, email, phone } — no tokens — so log in
      // right after to get an access/refresh pair, same as the login page.
      await api.register({ firstName, lastName, email, phone, password });
      const { accessToken, refreshToken } = await api.login(email, password);
      storeSession(accessToken, refreshToken);
      // New accounts start unverified — send them straight into the KYC
      // flow rather than the dashboard, per product decision: identity
      // verification is the first thing a new customer should see.
      router.push('/kyc');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-surface-hover px-6 py-12">
      <div className="w-full max-w-sm payder-fade-up">
        <div className="mb-8 flex justify-center">
          <Logo size="lg" />
        </div>
        <div className="rounded-2xl border border-line bg-surface p-8 shadow-sm">
          <h1 className="text-xl font-semibold text-foreground">Create your PAYDER account</h1>
          <p className="mt-1 text-sm text-muted">
            Takes a minute. You&apos;ll get a wallet as soon as you&apos;re signed up.
          </p>
          <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
            
              <label className="flex flex-col gap-1 text-sm">
                First name
                <input
                  className="rounded-lg border border-line px-3 py-2.5 outline-none transition focus:border-brand-orange"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                  minLength={2}
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                Last name
                <input
                  className="rounded-lg border border-line px-3 py-2.5 outline-none transition focus:border-brand-orange"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                  minLength={2}
                />
              </label>
            
            <label className="flex flex-col gap-1 text-sm">
              Email
              <input
                type="email"
                className="rounded-lg border border-line px-3 py-2.5 outline-none transition focus:border-brand-orange"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Phone
              <input
                type="tel"
                placeholder="+2348012345678"
                className="rounded-lg border border-line px-3 py-2.5 outline-none transition focus:border-brand-orange"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                pattern="^\+?[0-9]{10,14}$"
                title="Enter a valid phone number (10-14 digits, optional leading +)"
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
                minLength={8}
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Confirm password
              <input
                type="password"
                className="rounded-lg border border-line px-3 py-2.5 outline-none transition focus:border-brand-orange"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={8}
              />
            </label>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-brand-orange px-4 py-2.5 font-semibold text-white shadow-sm transition hover:bg-brand-orange-dark disabled:opacity-50"
            >
              {loading ? 'Creating account…' : 'Create account'}
            </button>
          </form>
        </div>
        <p className="mt-6 text-center text-sm text-muted">
          Already have an account?{' '}
          <Link href="/login" className="font-medium text-brand-orange hover:underline">
            Log in
          </Link>
        </p>
      </div>
    </main>
  );
}
