'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api-client';

export default function BillerDashboardPage() {
  const [me, setMe] = useState<Awaited<ReturnType<typeof api.billerMe>> | null>(null);
  const [balance, setBalance] = useState<{ currency: string; balance: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.billerMe().then(setMe).catch((e) => setError(e.message));
    api.billerBalance().then(setBalance).catch(() => {});
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">
        {me ? me.biller.name : 'Biller dashboard'}
      </h1>
      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-line bg-surface p-6">
          <p className="text-sm text-muted">Wallet balance</p>
          <p className="mt-1 text-2xl font-semibold">
            {balance ? `₦${Number(balance.balance).toLocaleString()}` : '—'}
          </p>
          <Link href="/biller/wallet" className="mt-3 inline-block text-sm text-brand-orange underline">
            Deposit, withdraw, or view history →
          </Link>
        </div>

        {me?.biller.isJoint && (
          <div className="rounded-2xl border border-line bg-surface p-6">
            <p className="text-sm text-muted">Joint biller</p>
            <p className="mt-1 text-sm">
              You are signer <strong>{me.myLabel}</strong>
              {me.coSigner && (
                <>
                  {' '}
                  — co-signer: {me.coSigner.firstName} {me.coSigner.lastName} ({me.coSigner.billerLabel})
                </>
              )}
            </p>
            <p className="mt-2 text-xs text-muted">
              Every withdrawal needs both signers' PIN — either can start it, the other approves.
            </p>
          </div>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Link
          href="/biller/bill"
          className="rounded-2xl border border-line bg-surface p-6 transition hover:border-brand-orange"
        >
          <p className="font-medium">Manage my bill</p>
          <p className="mt-1 text-sm text-muted">
            Build the form customers fill in to pay you, set pricing, and publish it.
          </p>
        </Link>
        <Link
          href="/biller/payments"
          className="rounded-2xl border border-line bg-surface p-6 transition hover:border-brand-orange"
        >
          <p className="font-medium">Payment history</p>
          <p className="mt-1 text-sm text-muted">
            Filter, export CSV, download daily reports, and set your report email frequency.
          </p>
        </Link>
      </div>
    </div>
  );
}
