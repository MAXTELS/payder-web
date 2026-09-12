'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api, ApiError } from '@/lib/api-client';
import { Logo } from '@/components/Logo';

/**
 * Two-step forgot-password flow, mirroring the mobile app's
 * ForgotPasswordScreen and hitting the same backend endpoints
 * (POST /auth/password-reset/request, POST /auth/password-reset/confirm —
 * see backend/src/auth/auth.controller.ts). Step 1 always shows a generic
 * "code sent" message regardless of whether the email is registered
 * (anti-enumeration, enforced server-side), so this page never reveals
 * whether an account exists.
 */
export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<'request' | 'confirm'>('request');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleRequest(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await api.requestPasswordReset(email);
      setInfo(`If ${email} has a PAYDER account, we've sent a 6-digit code to it.`);
      setStep('confirm');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirm(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    setLoading(true);
    try {
      await api.resetPassword(email, code, newPassword);
      router.push('/login?reset=1');
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
          {step === 'request' ? (
            <>
              <h1 className="text-xl font-semibold text-foreground">Reset your password</h1>
              <p className="mt-1 text-sm text-muted">
                Enter the email on your account and we&apos;ll send you a 6-digit code.
              </p>
              <form onSubmit={handleRequest} className="mt-6 flex flex-col gap-4">
                <label className="flex flex-col gap-1 text-sm">
                  Email
                  <input
                    type="email"
                    className="rounded-lg border border-line px-3 py-2.5 outline-none transition focus:border-brand-orange"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoFocus
                  />
                </label>
                {error && <p className="text-sm text-red-600">{error}</p>}
                <button
                  type="submit"
                  disabled={loading}
                  className="rounded-lg bg-brand-orange px-4 py-2.5 font-semibold text-white shadow-sm transition hover:bg-brand-orange-dark disabled:opacity-50"
                >
                  {loading ? 'Sending code…' : 'Send code'}
                </button>
              </form>
            </>
          ) : (
            <>
              <h1 className="text-xl font-semibold text-foreground">Enter your code</h1>
              {info && <p className="mt-1 text-sm text-muted">{info}</p>}
              <form onSubmit={handleConfirm} className="mt-6 flex flex-col gap-4">
                <label className="flex flex-col gap-1 text-sm">
                  6-digit code
                  <input
                    inputMode="numeric"
                    pattern="\d{6}"
                    maxLength={6}
                    className="rounded-lg border border-line px-3 py-2.5 tracking-[0.3em] outline-none transition focus:border-brand-orange"
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    required
                    autoFocus
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm">
                  New password
                  <input
                    type="password"
                    className="rounded-lg border border-line px-3 py-2.5 outline-none transition focus:border-brand-orange"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    minLength={8}
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm">
                  Confirm new password
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
                  {loading ? 'Resetting…' : 'Reset password'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setStep('request');
                    setError(null);
                    setInfo(null);
                  }}
                  className="text-sm font-medium text-muted hover:text-foreground"
                >
                  Use a different email
                </button>
              </form>
            </>
          )}
        </div>
        <p className="mt-6 text-center text-sm text-muted">
          Remembered it?{' '}
          <Link href="/login" className="font-medium text-brand-orange hover:underline">
            Back to login
          </Link>
        </p>
      </div>
    </main>
  );
}
