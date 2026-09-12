'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api-client';

type TotalBalance = Awaited<ReturnType<typeof api.adminTotalCustomerBalance>>;
type NetBalance = Awaited<ReturnType<typeof api.adminNetBalance>>;
type PortalCharges = Awaited<ReturnType<typeof api.adminPortalCharges>>;

export default function AdminOverviewPage() {
  const [totals, setTotals] = useState<TotalBalance | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [netBalance, setNetBalance] = useState<NetBalance | null>(null);
  const [netLoading, setNetLoading] = useState(false);
  const [netError, setNetError] = useState<string | null>(null);

  const [charges, setCharges] = useState<PortalCharges | null>(null);
  const [chargesLoading, setChargesLoading] = useState(false);
  const [chargesError, setChargesError] = useState<string | null>(null);

  function refresh() {
    setLoading(true);
    setError(null);
    api
      .adminTotalCustomerBalance()
      .then(setTotals)
      .catch(() => setError('Could not load — try again.'))
      .finally(() => setLoading(false));
  }

  function refreshNetBalance() {
    setNetLoading(true);
    setNetError(null);
    api
      .adminNetBalance()
      .then(setNetBalance)
      .catch(() => setNetError('Could not load — try again.'))
      .finally(() => setNetLoading(false));
  }

  function refreshCharges() {
    setChargesLoading(true);
    setChargesError(null);
    api
      .adminPortalCharges()
      .then(setCharges)
      .catch(() => setChargesError('Could not load — try again.'))
      .finally(() => setChargesLoading(false));
  }

  // Loaded once on open; these are on-demand "check the number" figures
  // rather than a live ticker, so the manual refresh buttons below are the
  // primary way to get a fresh read, not a polling interval.
  useEffect(refresh, []);
  useEffect(refreshNetBalance, []);
  useEffect(refreshCharges, []);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold text-foreground">Overview</h1>

      <div className="rounded-2xl border border-line bg-surface p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-foreground">Net balance</h2>
            <p className="mt-1 text-sm text-muted">
              Every naira currently sitting in a wallet on the platform — every customer and staff
              wallet, plus every biller wallet — computed straight from the ledger.
            </p>
          </div>
          <button
            onClick={refreshNetBalance}
            disabled={netLoading}
            className="shrink-0 rounded-lg border border-line px-3 py-2 text-xs font-medium text-muted transition hover:border-brand-orange hover:text-brand-orange disabled:opacity-50"
          >
            {netLoading ? 'Checking…' : 'Refresh'}
          </button>
        </div>

        {netError && <p className="text-sm text-red-600">{netError}</p>}

        {netBalance && !netError && (
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl bg-gradient-to-br from-brand-navy to-brand-navy-light p-5 text-white shadow-sm sm:col-span-1">
              <p className="text-xs text-neutral-300">Net balance (all wallets)</p>
              <p className="mt-1 text-2xl font-semibold">
                {netBalance.currency} {Number(netBalance.netBalance).toLocaleString('en-NG')}
              </p>
            </div>
            <div className="rounded-xl bg-surface-hover p-5 sm:col-span-1">
              <p className="text-xs text-faint">User wallets</p>
              <p className="mt-1 text-xl font-semibold text-foreground">
                {netBalance.currency} {Number(netBalance.users.totalBalance).toLocaleString('en-NG')}
              </p>
              <p className="mt-1 text-xs text-faint">{netBalance.users.walletCount} wallets</p>
            </div>
            <div className="rounded-xl bg-surface-hover p-5 sm:col-span-1">
              <p className="text-xs text-faint">Biller wallets</p>
              <p className="mt-1 text-xl font-semibold text-foreground">
                {netBalance.currency} {Number(netBalance.billers.totalBalance).toLocaleString('en-NG')}
              </p>
              <p className="mt-1 text-xs text-faint">
                {netBalance.billers.walletCount} wallets · {netBalance.billers.activeBillerCount} active billers
              </p>
            </div>
            <p className="text-xs text-faint sm:col-span-3">
              As of {new Date(netBalance.asOf).toLocaleString()}
            </p>
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-line bg-surface p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-foreground">Portal charges</h2>
            <p className="mt-1 text-sm text-muted">
              Revenue collected through the portal (the ₦110 bill-pay fee, and anything else
              charged the same way). Today's total resets at midnight — yesterday moves into the
              history list below it.
            </p>
          </div>
          <button
            onClick={refreshCharges}
            disabled={chargesLoading}
            className="shrink-0 rounded-lg border border-line px-3 py-2 text-xs font-medium text-muted transition hover:border-brand-orange hover:text-brand-orange disabled:opacity-50"
          >
            {chargesLoading ? 'Checking…' : 'Refresh'}
          </button>
        </div>

        {chargesError && <p className="text-sm text-red-600">{chargesError}</p>}

        {charges && !chargesError && (
          <div className="flex flex-col gap-4">
            <div className="rounded-xl bg-gradient-to-br from-brand-orange to-amber-500 p-5 text-white shadow-sm">
              <p className="text-xs text-white/80">Today ({charges.today.date})</p>
              <p className="mt-1 text-2xl font-semibold">
                {charges.currency} {Number(charges.today.totalCharges).toLocaleString('en-NG')}
              </p>
              <p className="mt-1 text-xs text-white/80">
                {charges.today.transactionCount} charge{charges.today.transactionCount === 1 ? '' : 's'} so far today
              </p>
            </div>

            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-faint">History</p>
              {charges.history.length === 0 ? (
                <p className="text-sm text-muted">No prior days yet.</p>
              ) : (
                <div className="flex flex-col divide-y divide-line">
                  {charges.history.map((day) => (
                    <div key={day.date} className="flex items-center justify-between py-2 text-sm">
                      <span className="text-muted">{day.date}</span>
                      <span className="text-faint">
                        {day.transactionCount} charge{day.transactionCount === 1 ? '' : 's'}
                      </span>
                      <span className="font-medium text-foreground">
                        {charges.currency} {Number(day.totalCharges).toLocaleString('en-NG')}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

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
        Transaction volume and provider failure-rate charts go here (see architecture doc §9) —
        the pending-KYC, transactions, and wallet-funding pages are wired to the real endpoints
        already.
      </p>
    </div>
  );
}
