'use client';

import { useEffect, useState } from 'react';
import { api, ApiError } from '@/lib/api-client';
import { AmountInput } from '@/components/AmountInput';

type Provider = { id: string; name: string };
type FundStatus = { id: string; status: string } | null;

/**
 * Fund a betting account (Bet9ja, SportyBet, 1xBet, etc.) via Pairgate —
 * mirrors AirtimePage's shape (pick a provider, enter the account id, enter
 * an amount, submit, poll while PROCESSING) since it's the same
 * debit-then-purchase flow underneath, just against BettingService instead
 * of BillsService. This page didn't exist before — betting funding was only
 * reachable from the mobile app.
 */
export default function BettingPage() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loadingProviders, setLoadingProviders] = useState(true);
  const [providerId, setProviderId] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [amount, setAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<FundStatus>(null);

  useEffect(() => {
    api
      .bettingProviders()
      .then((list) => {
        setProviders(list);
        if (list.length > 0) setProviderId(list[0].id);
      })
      .catch(() => setProviders([]))
      .finally(() => setLoadingProviders(false));
  }, []);

  // Once a funding request comes back PROCESSING, poll for a resolution
  // every 4s rather than leaving the customer staring at a status that never
  // updates — same pattern as AirtimePage / BettingScreen (mobile).
  useEffect(() => {
    if (!result || result.status !== 'PROCESSING') return;
    const interval = setInterval(async () => {
      try {
        const updated = await api.bettingStatus(result.id);
        setResult(updated);
      } catch {
        // transient — try again on the next tick
      }
    }, 4000);
    return () => clearInterval(interval);
  }, [result]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResult(null);
    if (!providerId) {
      setError('Pick a betting platform.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await api.bettingFund({ providerId, customerId, amount });
      setResult(res);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold text-foreground">Fund betting account</h1>
      <form onSubmit={submit} className="flex max-w-sm flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm">
          Betting platform
          {loadingProviders ? (
            <p className="text-sm text-muted">Loading providers…</p>
          ) : providers.length === 0 ? (
            <p className="text-sm text-red-600">
              Betting providers could not be loaded. Refresh or try again shortly.
            </p>
          ) : (
            <select
              className="rounded-lg border border-line bg-surface px-3 py-2.5 text-foreground outline-none focus:border-brand-orange"
              value={providerId}
              onChange={(e) => setProviderId(e.target.value)}
            >
              {providers.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          )}
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Betting account ID / username
          <input
            className="rounded-lg border border-line bg-surface px-3 py-2.5 text-foreground outline-none focus:border-brand-orange"
            value={customerId}
            onChange={(e) => setCustomerId(e.target.value)}
            required
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Amount
          <AmountInput
            className="rounded-lg border border-line bg-surface px-3 py-2.5 text-foreground outline-none focus:border-brand-orange"
            value={amount}
            onChange={setAmount}
            placeholder="e.g. 1,000"
          />
        </label>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={submitting || providers.length === 0}
          className="rounded-lg bg-brand-orange px-4 py-2.5 font-semibold text-white shadow-sm transition hover:bg-brand-orange-dark disabled:opacity-50"
        >
          {submitting ? 'Processing…' : 'Fund account'}
        </button>
        {result && (
          <p className="text-sm">
            {result.status === 'SUCCESS' && '✅ Funding successful.'}
            {result.status === 'PROCESSING' && '⏳ Still processing — checking for an update…'}
            {result.status === 'PENDING' && '⏳ Submitted — waiting on the provider…'}
            {result.status === 'REVERSED' && '❌ Funding failed — you have been refunded to your wallet.'}
            {result.status === 'FAILED' && '❌ Funding failed.'}
          </p>
        )}
      </form>
    </div>
  );
}
