'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api-client';
import { Logo } from '@/components/Logo';

/** Where a guest lands back after Paystack checkout — see
 * PaystackProvider.initializeGenericCharge's callbackPath in
 * BillerPaymentsService.initiateGuestPayment. */
export default function PayBillCallbackPage() {
  const params = useSearchParams();
  const [status, setStatus] = useState<'checking' | 'success' | 'failed'>('checking');

  useEffect(() => {
    const reference = params.get('reference') || params.get('trxref');
    if (!reference) {
      setStatus('failed');
      return;
    }
    api
      .billPayVerify(reference)
      .then((res) => setStatus(res.credited ? 'success' : 'failed'))
      .catch(() => setStatus('failed'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className="flex min-h-screen items-center justify-center bg-surface-hover px-6">
      <div className="w-full max-w-sm rounded-2xl border border-line bg-surface p-8 text-center">
        <div className="mb-6 flex justify-center">
          <Logo size="md" />
        </div>
        {status === 'checking' && <p>Confirming your payment…</p>}
        {status === 'success' && <p className="text-green-600">Payment successful — thank you.</p>}
        {status === 'failed' && <p className="text-red-600">We couldn't confirm this payment.</p>}
        <Link href="/pay-bill" className="mt-6 inline-block rounded bg-brand-orange px-4 py-2 text-sm font-medium text-white">
          Back to bills
        </Link>
      </div>
    </main>
  );
}
