'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { api, ApiError } from '@/lib/api-client';

type Outcome =
  | { state: 'checking' }
  | { state: 'credited' }
  | { state: 'already-credited' }
  | { state: 'not-successful'; status: string }
  | { state: 'error'; message: string };

function PaystackCallbackInner() {
  const searchParams = useSearchParams();
  // Paystack appends `reference` (and, on some integrations, `trxref`) as
  // query params on the redirect — both carry the same value we generated.
  const reference = searchParams.get('reference') ?? searchParams.get('trxref');
  const [outcome, setOutcome] = useState<Outcome>({ state: 'checking' });

  useEffect(() => {
    if (!reference) {
      setOutcome({ state: 'error', message: 'No payment reference was returned by Paystack.' });
      return;
    }
    api
      .paymentsPaystackVerify(reference)
      .then((res) => {
        if (res.credited) {
          setOutcome({ state: 'credited' });
        } else if (res.status === 'success') {
          // Verified successful but not credited here — most likely the
          // webhook already processed it first (same idempotency key).
          setOutcome({ state: 'already-credited' });
        } else {
          setOutcome({ state: 'not-successful', status: res.status });
        }
      })
      .catch((err) =>
        setOutcome({
          state: 'error',
          message: err instanceof ApiError ? err.message : 'Could not verify this payment.',
        }),
      );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reference]);

  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 rounded-2xl border border-line bg-surface p-8 text-center shadow-sm">
      {outcome.state === 'checking' && (
        <>
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-brand-orange border-t-transparent" />
          <p className="text-sm text-muted">Confirming your payment with Paystack…</p>
        </>
      )}
      {(outcome.state === 'credited' || outcome.state === 'already-credited') && (
        <>
          <p className="text-3xl">✅</p>
          <h1 className="text-lg font-semibold text-foreground">Wallet funded</h1>
          <p className="text-sm text-muted">
            Your payment was confirmed and your wallet has been credited.
          </p>
        </>
      )}
      {outcome.state === 'not-successful' && (
        <>
          <p className="text-3xl">⚠️</p>
          <h1 className="text-lg font-semibold text-foreground">Payment not completed</h1>
          <p className="text-sm text-muted">
            Paystack reported this payment as &ldquo;{outcome.status}&rdquo;. If you were charged,
            contact support with your reference — otherwise no wallet credit was made.
          </p>
        </>
      )}
      {outcome.state === 'error' && (
        <>
          <p className="text-3xl">⚠️</p>
          <h1 className="text-lg font-semibold text-foreground">Could not verify payment</h1>
          <p className="text-sm text-muted">{outcome.message}</p>
        </>
      )}
      <Link
        href="/wallet"
        className="mt-2 rounded-lg bg-brand-orange px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-orange-dark"
      >
        Back to wallet
      </Link>
    </div>
  );
}

export default function PaystackCallbackPage() {
  return (
    <Suspense fallback={null}>
      <PaystackCallbackInner />
    </Suspense>
  );
}
