'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api-client';

export default function BillerDepositCallbackPage() {
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
