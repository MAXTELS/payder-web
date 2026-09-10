'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { RoleGuard } from '@/components/RoleGuard';
import { Logo } from '@/components/Logo';
import { api, ApiError } from '@/lib/api-client';

/**
 * Self-service password change — reachable from every role's Sidebar (see
 * components/Sidebar.tsx), so it lives outside the (customer)/admin/care
 * route groups rather than being duplicated three times. Deliberately its
 * own minimal page (not wrapped in Sidebar) since a customer, an admin, and
 * customer care all land here from different nav shells.
 */
function ChangePasswordForm() {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match.');
      return;
    }
    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters.');
      return;
    }

    setBusy(true);
    try {
      await api.changeMyPassword(currentPassword, newPassword);
      setMessage('Password changed.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not change password.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-surface-hover px-6 py-12">
      <div className="w-full max-w-sm payder-fade-up">
        <div className="mb-8 flex justify-center">
          <Logo size="lg" />
        </div>
        <div className="rounded-2xl border border-line bg-surface p-8 shadow-sm">
          <h1 className="text-xl font-semibold text-foreground">Change your password</h1>
          <p className="mt-1 text-sm text-muted">
            You&apos;ll need your current password to set a new one.
          </p>
          <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
            <label className="flex flex-col gap-1 text-sm">
              Current password
              <input
                type="password"
                className="rounded-lg border border-line px-3 py-2.5 outline-none transition focus:border-brand-orange"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
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
            {message && <p className="text-sm text-green-700">{message}</p>}
            <button
              type="submit"
              disabled={busy}
              className="rounded-lg bg-brand-orange px-4 py-2.5 font-semibold text-white shadow-sm transition hover:bg-brand-orange-dark disabled:opacity-50"
            >
              {busy ? 'Saving…' : 'Change password'}
            </button>
          </form>
        </div>
        <p className="mt-6 text-center text-sm text-muted">
          <button
            type="button"
            onClick={() => router.back()}
            className="font-medium text-brand-orange hover:underline"
          >
            ← Back
          </button>
        </p>
      </div>
    </main>
  );
}

export default function ChangePasswordPage() {
  return (
    <RoleGuard allow={['CUSTOMER', 'ADMIN', 'CUSTOMER_CARE']}>
      <ChangePasswordForm />
    </RoleGuard>
  );
}
