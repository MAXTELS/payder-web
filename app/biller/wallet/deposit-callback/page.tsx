'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api-client';

/** useSearchParams() requires a Suspense boundary at the page level for
 * `next build`'s static export — see app/pay-bill/callback/page.tsx for the
 * same fix and the fuller explanation. */
function BillerDepositCallbackInner() {
  const params = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<'checking' | 'success' | 'failed'>('checking');

  useEffect(() => {
    const reference = params.get('reference') || params.get('trxref');
    if (!reference) {
      setStatus('failed');
      return;
    }
    api
      .billerDepositVerify(reference)
      .then((res) => setStatus(res.credited ? 'success' : 'failed'))
      .catch(() => setStatus('failed'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-sm rounded-2xl border border-line bg-surface p-8 text-center">
        {status === 'checking' && <p>Confirming your deposit…</p>}
        {status === 'success' && <p className="text-green-600">Deposit successful — your wallet has been credited.</p>}
        {status === 'failed' && <p className="text-red-600">We couldn't confirm this payment.</p>}
        <button
          onClick={() => router.push('/biller/wallet')}
          className="mt-6 rounded bg-brand-orange px-4 py-2 text-sm font-medium text-white"
        >
          Back to wallet
        </button>
      </div>
    </main>
  );
}

export default function BillerDepositCallbackPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center px-6">
          <div className="w-full max-w-sm rounded-2xl border border-line bg-surface p-8 text-center">
            <p>Confirming your deposit…</p>
          </div>
        </main>
      }
    >
      <BillerDepositCallbackInner />
    </Suspense>
  );
}
