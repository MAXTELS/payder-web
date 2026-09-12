'use client';

import Link from 'next/link';

/**
 * Shared 4-digit transaction-PIN input for every debit-type purchase form
 * (bills, airtime/data/TV, betting, exam pins, withdrawals) — one place for
 * the masked-numeric-input styling and the "no PIN set yet" link out to
 * /account/transaction-pin, so all five forms stay in sync automatically.
 */
export function TransactionPinField({
  value,
  onChange,
  pinSet,
}: {
  value: string;
  onChange: (v: string) => void;
  // Pass `me().pinSet` down (undefined while it's still loading) — when it's
  // explicitly false, the field is replaced with a prompt to go set one
  // first rather than collecting a PIN that will just be rejected server-side.
  pinSet?: boolean;
}) {
  if (pinSet === false) {
    return (
      <div className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2.5 text-sm text-amber-800 dark:border-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
        You haven&apos;t set a transaction PIN yet.{' '}
        <Link href="/account/transaction-pin" className="font-semibold underline">
          Set one now
        </Link>{' '}
        before paying.
      </div>
    );
  }

  return (
    <label className="flex flex-col gap-1 text-sm">
      Transaction PIN
      <input
        type="password"
        inputMode="numeric"
        maxLength={4}
        className="rounded-lg border border-line bg-surface px-3 py-2.5 tracking-[0.3em] text-foreground outline-none focus:border-brand-orange"
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, 4))}
        required
      />
    </label>
  );
}
