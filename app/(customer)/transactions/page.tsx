'use client';

import { useEffect, useState } from 'react';
import { api, ApiError } from '@/lib/api-client';
import { PageLoader } from '@/components/PageLoader';
import {
  TRANSACTION_TYPE_LABELS,
  TRANSACTION_STATUS_STYLES,
  describeTransaction,
} from '@/lib/format';

type StatementItem = {
  id: string;
  type: string;
  status: string;
  amount: string;
  fee: string;
  providerReference: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  completedAt: string | null;
};

const TYPE_OPTIONS = Object.keys(TRANSACTION_TYPE_LABELS);
const STATUS_OPTIONS = ['PENDING', 'PROCESSING', 'SUCCESS', 'FAILED', 'REVERSED'];

/**
 * Full transaction history — every Transaction row for this customer
 * (wallet funding, airtime/data, TV, electricity, betting, bill payments,
 * withdrawals, reversals, everything), with filters and a CSV export. The
 * dashboard's "Recent transactions" widget only ever shows the latest 8 with
 * no way to search further back or take the data anywhere else; this page
 * is that missing "see everything, and get it out of PAYDER" view.
 */
export default function TransactionHistoryPage() {
  const [items, setItems] = useState<StatementItem[] | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const [type, setType] = useState('');
  const [status, setStatus] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  function currentFilters() {
    return {
      type: type || undefined,
      status: status || undefined,
      from: from || undefined,
      // Include the whole "to" day rather than cutting off at 00:00 on it.
      to: to ? `${to}T23:59:59.999Z` : undefined,
    };
  }

  function load(reset: boolean) {
    setError(null);
    if (reset) {
      setItems(null);
      setNextCursor(null);
    } else {
      setLoadingMore(true);
    }
    api
      .walletStatement({ limit: 25, cursor: reset ? undefined : (nextCursor ?? undefined), ...currentFilters() })
      .then((res) => {
        setItems((prev) => (reset || !prev ? res.items : [...prev, ...res.items]));
        setNextCursor(res.nextCursor);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Could not load transactions.'))
      .finally(() => setLoadingMore(false));
  }

  useEffect(() => {
    load(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function applyFilters(e: React.FormEvent) {
    e.preventDefault();
    load(true);
  }

  function resetFilters() {
    setType('');
    setStatus('');
    setFrom('');
    setTo('');
    setTimeout(() => load(true), 0);
  }

  async function exportCsv() {
    setExporting(true);
    setError(null);
    try {
      const blob = await api.walletStatementExport(currentFilters());
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `payder-transactions-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not export transactions.');
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-foreground">Transaction history</h1>
        <button
          type="button"
          onClick={exportCsv}
          disabled={exporting}
          className="rounded-lg border border-line bg-surface px-4 py-2 text-sm font-semibold text-foreground shadow-sm transition hover:border-brand-orange disabled:opacity-50"
        >
          {exporting ? 'Exporting…' : 'Export CSV'}
        </button>
      </div>

      <form
        onSubmit={applyFilters}
        className="flex flex-wrap items-end gap-3 rounded-2xl border border-line bg-surface p-4"
      >
        <label className="flex flex-col gap-1 text-sm">
          Type
          <select
            className="rounded-lg border border-line bg-background px-3 py-2 text-foreground outline-none focus:border-brand-orange"
            value={type}
            onChange={(e) => setType(e.target.value)}
          >
            <option value="">All types</option>
            {TYPE_OPTIONS.map((t) => (
              <option key={t} value={t}>
                {TRANSACTION_TYPE_LABELS[t]}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Status
          <select
            className="rounded-lg border border-line bg-background px-3 py-2 text-foreground outline-none focus:border-brand-orange"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="">All statuses</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          From
          <input
            type="date"
            className="rounded-lg border border-line bg-background px-3 py-2 text-foreground outline-none focus:border-brand-orange"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          To
          <input
            type="date"
            className="rounded-lg border border-line bg-background px-3 py-2 text-foreground outline-none focus:border-brand-orange"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </label>
        <button
          type="submit"
          className="rounded-lg bg-brand-orange px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-orange-dark"
        >
          Apply
        </button>
        <button
          type="button"
          onClick={resetFilters}
          className="rounded-lg px-4 py-2 text-sm font-medium text-muted transition hover:text-foreground"
        >
          Clear
        </button>
      </form>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {items === null ? (
        <PageLoader inline label="Loading transactions…" />
      ) : items.length === 0 ? (
        <p className="rounded-xl border border-dashed border-line p-6 text-sm text-muted">
          No transactions match these filters.
        </p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-line bg-surface shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-faint">
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Type</th>
                  <th className="px-4 py-3 font-medium">Details</th>
                  <th className="px-4 py-3 text-right font-medium">Amount</th>
                  <th className="px-4 py-3 text-right font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {items.map((tx) => (
                  <tr key={tx.id} className="border-b border-line last:border-0">
                    <td className="px-4 py-3 text-xs text-faint">
                      {new Date(tx.createdAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-foreground">
                      {TRANSACTION_TYPE_LABELS[tx.type] ?? tx.type}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted">
                      {describeTransaction(tx.type, tx.metadata) ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-foreground">₦{tx.amount}</td>
                    <td className="px-4 py-3 text-right">
                      <span
                        className={`rounded-full px-2 py-1 text-xs font-medium ${
                          TRANSACTION_STATUS_STYLES[tx.status] ?? 'bg-surface-hover text-neutral-700'
                        }`}
                      >
                        {tx.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {nextCursor && (
        <button
          type="button"
          onClick={() => load(false)}
          disabled={loadingMore}
          className="mx-auto rounded-lg border border-line bg-surface px-4 py-2 text-sm font-medium text-foreground shadow-sm transition hover:border-brand-orange disabled:opacity-50"
        >
          {loadingMore ? 'Loading…' : 'Load more'}
        </button>
      )}
    </div>
  );
}
