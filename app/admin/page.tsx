'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api-client';

type TotalBalance = Awaited<ReturnType<typeof api.adminTotalCustomerBalance>>;

export default function AdminOverviewPage() {
  const [totals, setTotals] = useState<TotalBalance | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function refresh() {
    setLoading(true);
    setError(null);
    api
      .adminTotalCustomerBalance()
      .then(setTotals)
      .catch(() => setError('Could not load — try again.'))
      .finally(() => setLoading(false));
  }

  // Loaded once on open; this is an on-demand "check the number" figure
  // rather than a live ticker, so a manual refresh button below is the
  // primary way to get a fresh read, not a polling interval.
  useEffect(refresh, []);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold text-foreground">Overview</h1>

      <div className="rounded-2xl border border-line bg-surface p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-foreground">
              Net total of all customer balances
            </h2>
            <p className="mt-1 text-sm text-muted">
              What the platform currently owes its customers — the sum of every customer wallet,
              computed straight from the ledger. Reconcile this against float held with
              Paystack/Flutterwave and the manual-transfer bank accounts.
            </p>
          </div>
          <button
            onClick={refresh}
            disabled={loading}
            className="shrink-0 rounded-lg border border-line px-3 py-2 text-xs font-medium text-muted transition hover:border-brand-orange hover:text-brand-orange disabled:opacity-50"
          >
            {loading ? 'Checking…' : 'Refresh'}
          </button>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        {totals && !error && (
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl bg-gradient-to-br from-brand-navy to-brand-navy-light p-5 text-white shadow-sm sm:col-span-1">
              <p className="text-xs text-neutral-300">Total balance</p>
              <p className="mt-1 text-2xl font-semibold">
                {totals.currency} {Number(totals.totalBalance).toLocaleString('en-NG')}
              </p>
            </div>
            <div className="rounded-xl bg-surface-hover p-5 sm:col-span-1">
              <p className="text-xs text-faint">Customers with wallets</p>
              <p className="mt-1 text-2xl font-semibold text-foreground">{totals.customerCount}</p>
            </div>
            <div className="rounded-xl bg-surface-hover p-5 sm:col-span-1">
              <p className="text-xs text-faint">Wallet count</p>
              <p className="mt-1 text-2xl font-semibold text-foreground">{totals.walletCount}</p>
            </div>
            <p className="text-xs text-faint sm:col-span-3">
              As of {new Date(totals.asOf).toLocaleString()}
            </p>
          </div>
        )}
      </div>

      <p className="text-sm text-muted">
        Revenue, transaction volume, and provider failure-rate charts go here (see architecture
        doc §9) — the pending-KYC, transactions, and wallet-funding pages are wired to the real
        endpoints already.
      </p>
    </div>
  );
}
