'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { RoleGuard } from '@/components/RoleGuard';
import { Logo } from '@/components/Logo';
import { api, ApiError } from '@/lib/api-client';

const PIN_PATTERN = /^\d{4}$/;

/**
 * Set or change the 4-digit transaction PIN required before every
 * debit-type purchase (bills, airtime/data/TV, betting, exam pins,
 * withdrawals — see backend common/security/transaction-pin.util.ts).
 * Mirrors /account/change-password's shape and placement (outside the
 * (customer)/admin/care route groups) since it's reached the same way, from
 * the customer Sidebar.
 */
function TransactionPinForm() {
  const router = useRouter();
  const [pinSet, setPinSet] = useState<boolean | null>(null);
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.me().then((me) => setPinSet(me.pinSet)).catch(() => setPinSet(false));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);

    if (!PIN_PATTERN.test(newPin)) {
      setError('PIN must be exactly 4 digits.');
      return;
    }
    if (newPin !== confirmPin) {
      setError('The two PINs you entered do not match.');
      return;
    }
    if (pinSet && !PIN_PATTERN.test(currentPin)) {
      setError('Enter your current 4-digit PIN.');
      return;
    }

    setBusy(true);
    try {
      await api.setMyPin(newPin, pinSet ? currentPin : undefined);
      setMessage(pinSet ? 'Your transaction PIN has been changed.' : 'Your transaction PIN has been set.');
      setPinSet(true);
      setCurrentPin('');
      setNewPin('');
      setConfirmPin('');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save your PIN.');
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
          <h1 className="text-xl font-semibold text-foreground">
            {pinSet === false ? 'Set your transaction PIN' : 'Change your transaction PIN'}
          </h1>
          <p className="mt-1 text-sm text-muted">
            {pinSet === false
              ? "You'll be asked for this 4-digit PIN before every payment — bills, betting, exam pins, and withdrawals."
              : "You'll need your current PIN to set a new one."}
          </p>
          <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
            {pinSet && (
              <label className="flex flex-col gap-1 text-sm">
                Current PIN
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  className="rounded-lg border border-line px-3 py-2.5 tracking-[0.3em] outline-none transition focus:border-brand-orange"
                  value={currentPin}
                  onChange={(e) => setCurrentPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  required
                />
              </label>
            )}
            <label className="flex flex-col gap-1 text-sm">
              New 4-digit PIN
              <input
                type="password"
                inputMode="numeric"
                maxLength={4}
                className="rounded-lg border border-line px-3 py-2.5 tracking-[0.3em] outline-none transition focus:border-brand-orange"
                value={newPin}
                onChange={(e) => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                required
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Confirm new PIN
              <input
                type="password"
                inputMode="numeric"
                maxLength={4}
                className="rounded-lg border border-line px-3 py-2.5 tracking-[0.3em] outline-none transition focus:border-brand-orange"
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                required
              />
            </label>
            {error && <p className="text-sm text-red-600">{error}</p>}
            {message && <p className="text-sm text-green-700">{message}</p>}
            <button
              type="submit"
              disabled={busy || pinSet === null}
              className="rounded-lg bg-brand-orange px-4 py-2.5 font-semibold text-white shadow-sm transition hover:bg-brand-orange-dark disabled:opacity-50"
            >
              {busy ? 'Saving…' : pinSet === false ? 'Set PIN' : 'Change PIN'}
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

export default function TransactionPinPage() {
  return (
    <RoleGuard allow={['CUSTOMER']}>
      <TransactionPinForm />
    </RoleGuard>
  );
}
