'use client';

import { useEffect, useState } from 'react';
import { api, ApiError } from '@/lib/api-client';
import { AmountInput } from '@/components/AmountInput';
import {
  PaymentResultModal,
  paymentResultKindForStatus,
  type PaymentResultKind,
} from '@/components/PaymentResultModal';
import { TransactionPinField } from '@/components/TransactionPinField';

type Provider = { id: string; name: string };
type FundStatus = { id: string; status: string } | null;
type ResultModalState = { kind: PaymentResultKind; message?: string } | null;

function describeFundingStatus(status: string): string | undefined {
  switch (status.toUpperCase()) {
    case 'SUCCESS':
      return 'Your betting account has been funded.';
    case 'REVERSED':
      return 'Funding failed — you have been refunded to your wallet.';
    case 'FAILED':
      return 'Funding failed.';
    default:
      return undefined;
  }
}

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
  const [pin, setPin] = useState('');
  const [pinSet, setPinSet] = useState<boolean | undefined>(undefined);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<FundStatus>(null);
  const [resultModal, setResultModal] = useState<ResultModalState>(null);

  // Account-id verification — added 2026-09-13 so this page confirms the
  // betting account id the same way the bills-pay page already confirms a
  // smartcard/meter number before letting the customer pay, matching how
  // Pairgate's own portal behaves on funding. api.bettingVerify already
  // existed in lib/api-client.ts but was never actually called from here.
  const [verifying, setVerifying] = useState(false);
  const [verifiedName, setVerifiedName] = useState<string | null>(null);
  const [verifyError, setVerifyError] = useState<string | null>(null);

  // Any edit to the provider or the account id invalidates a previous
  // verification — a "confirmed" name must never carry over to a DIFFERENT
  // id the customer edited it into afterward.
  useEffect(() => {
    setVerifiedName(null);
    setVerifyError(null);
  }, [providerId, customerId]);

  async function verifyAccount() {
    setVerifyError(null);
    setVerifiedName(null);
    if (!providerId) {
      setVerifyError('Choose a betting platform first.');
      return;
    }
    if (!customerId.trim()) {
      setVerifyError('Enter your betting account ID first.');
      return;
    }
    setVerifying(true);
    try {
      const res = await api.bettingVerify(providerId, customerId.trim());
      if (res.valid && res.customerName) {
        setVerifiedName(res.customerName);
      } else {
        setVerifyError('Could not verify that account ID — double-check it.');
      }
    } catch (err) {
      setVerifyError(err instanceof ApiError ? err.message : 'Verification failed. Try again.');
    } finally {
      setVerifying(false);
    }
  }

  useEffect(() => {
    api.me().then((me) => setPinSet(me.pinSet)).catch(() => {});
  }, []);

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
  // updates — same pattern as AirtimePage / BettingScreen (mobile). The
  // button keeps its loading spinner the whole time (submitting stays true)
  // and no modal appears until this resolves to something final — that's
  // the "loading comes up until there's a response" behavior that was asked
  // for, replacing the old immediate-then-second popup pattern.
  useEffect(() => {
    if (!result || result.status !== 'PROCESSING') return;
    const interval = setInterval(async () => {
      try {
        const updated = await api.bettingStatus(result.id);
        setResult(updated);
        if (updated.status !== 'PROCESSING') {
          setSubmitting(false);
          setResultModal({
            kind: paymentResultKindForStatus(updated.status),
            message: describeFundingStatus(updated.status),
          });
        }
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
    setResultModal(null);
    if (!providerId) {
      setError('Pick a betting platform.');
      return;
    }
    if (!verifiedName) {
      setError('Verify the betting account ID before funding.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await api.bettingFund({ providerId, customerId, amount, pin });
      setResult(res);
      setPin('');
      if (res.status !== 'PROCESSING') {
        setSubmitting(false);
        setResultModal({
          kind: paymentResultKindForStatus(res.status),
          message: describeFundingStatus(res.status),
        });
      }
      // else: leave submitting true — the polling effect above takes over
      // and clears it once a final status arrives.
    } catch (err) {
      setSubmitting(false);
      setResultModal({
        kind: 'declined',
        message: err instanceof ApiError ? err.message : 'Something went wrong. Try again.',
      });
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
        <div className="flex flex-col gap-1">
          <button
            type="button"
            onClick={verifyAccount}
            disabled={verifying}
            className="self-start rounded-lg border border-line px-3 py-1.5 text-sm font-medium text-foreground transition hover:border-brand-orange disabled:opacity-50"
          >
            {verifying ? 'Verifying…' : 'Verify account'}
          </button>
          {verifiedName && (
            <p className="text-sm font-semibold text-green-600">Confirmed: {verifiedName}</p>
          )}
          {verifyError && <p className="text-sm text-red-600">{verifyError}</p>}
        </div>
        <label className="flex flex-col gap-1 text-sm">
          Amount
          <AmountInput
            className="rounded-lg border border-line bg-surface px-3 py-2.5 text-foreground outline-none focus:border-brand-orange"
            value={amount}
            onChange={setAmount}
            placeholder="e.g. 1,000"
          />
        </label>
        <TransactionPinField value={pin} onChange={setPin} pinSet={pinSet} />

        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={submitting || providers.length === 0 || pinSet === false || !verifiedName}
          className="rounded-lg bg-brand-orange px-4 py-2.5 font-semibold text-white shadow-sm transition hover:bg-brand-orange-dark disabled:opacity-50"
        >
          {submitting ? 'Processing…' : 'Fund account'}
        </button>
      </form>
      {resultModal && (
        <PaymentResultModal
          kind={resultModal.kind}
          message={resultModal.message}
          onClose={() => setResultModal(null)}
        />
      )}
    </div>
  );
}
