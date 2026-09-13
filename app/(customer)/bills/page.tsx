'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, ApiError } from '@/lib/api-client';
import {
  PaymentResultModal,
  paymentResultKindForStatus,
  type PaymentResultKind,
} from '@/components/PaymentResultModal';
import { TransactionPinField } from '@/components/TransactionPinField';

type ResultModalState = { kind: PaymentResultKind; message?: string } | null;

function describeSubscriptionStatus(status: string): string | undefined {
  switch (status.toUpperCase()) {
    case 'SUCCESS':
      return 'Your subscription was successful.';
    case 'REVERSED':
      return 'Payment failed — you have been refunded to your wallet.';
    case 'FAILED':
      return 'Payment failed.';
    default:
      return undefined;
  }
}

// VTpass TV serviceIDs — confirmed against vtpass.com/documentation/.
// Electricity is deliberately not wired up yet (2026-09-12 scoping
// decision) — Showmax is left out too since its subscription_type/renewal
// behavior hasn't been confirmed against VTpass's docs the way
// DSTV/GOTV/Startimes have.
const TV_PROVIDERS = [
  { label: 'DStv', serviceId: 'dstv' },
  { label: 'GOtv', serviceId: 'gotv' },
  { label: 'StarTimes', serviceId: 'startimes' },
] as const;

type Variation = { code: string; name: string; amount: string };
type PurchaseStatus = { id: string; status: string } | null;

export default function BillsPage() {
  const [providerIndex, setProviderIndex] = useState(0);
  const [smartcard, setSmartcard] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [verifiedName, setVerifiedName] = useState<string | null>(null);
  const [verifyDetails, setVerifyDetails] = useState<{
    status?: string;
    dueDate?: string;
    customerNumber?: string;
    balance?: string;
  } | null>(null);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [variations, setVariations] = useState<Variation[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(false);
  const [variationCode, setVariationCode] = useState('');
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [pinSet, setPinSet] = useState<boolean | undefined>(undefined);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [purchase, setPurchase] = useState<PurchaseStatus>(null);
  const [resultModal, setResultModal] = useState<ResultModalState>(null);

  useEffect(() => {
    api.me().then((me) => setPinSet(me.pinSet)).catch(() => {});
  }, []);

  const provider = TV_PROVIDERS[providerIndex];

  useEffect(() => {
    setLoadingPlans(true);
    setVariationCode('');
    api
      .billsVariations(provider.serviceId, 'tv')
      .then(setVariations)
      .catch(() => setVariations([]))
      .finally(() => setLoadingPlans(false));
    // Switching provider invalidates any smartcard verification done so far.
    setVerifiedName(null);
    setVerifyDetails(null);
    setVerifyError(null);
  }, [provider.serviceId]);

  // GOtv/DSTV send Due_Date in different formats ("2025-02-06T00:00:00" vs
  // "02-FEB-25") — VTpass isn't consistent across its own products. Rather
  // than risk silently mis-parsing one of them, only replace the raw string
  // with a friendlier one when Date can actually make sense of it.
  function formatDueDate(raw: string): string {
    const parsed = new Date(raw);
    if (Number.isNaN(parsed.getTime())) return raw;
    return parsed.toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' });
  }

  const selectedPlan = variations.find((v) => v.code === variationCode);

  useEffect(() => {
    if (!purchase || purchase.status !== 'PROCESSING') return;
    const interval = setInterval(async () => {
      try {
        const updated = await api.billsStatus(purchase.id);
        setPurchase(updated);
        if (updated.status !== 'PROCESSING') {
          setSubmitting(false);
          setResultModal({
            kind: paymentResultKindForStatus(updated.status),
            message: describeSubscriptionStatus(updated.status),
          });
        }
      } catch {
        // transient — try again on the next tick
      }
    }, 4000);
    return () => clearInterval(interval);
  }, [purchase]);

  async function verifySmartcard() {
    setVerifyError(null);
    setVerifiedName(null);
    setVerifyDetails(null);
    if (!smartcard.trim()) {
      setVerifyError('Enter a smartcard number first.');
      return;
    }
    setVerifying(true);
    try {
      const res = await api.billsVerify(provider.serviceId, smartcard.trim(), 'tv');
      if (res.valid && res.customerName) {
        setVerifiedName(res.customerName);
        setVerifyDetails({
          status: res.status,
          dueDate: res.dueDate,
          customerNumber: res.customerNumber,
          balance: res.balance,
        });
      } else {
        setVerifyError('Could not verify that smartcard number — double-check it.');
      }
    } catch (err) {
      setVerifyError(err instanceof ApiError ? err.message : 'Verification failed. Try again.');
    } finally {
      setVerifying(false);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPurchase(null);
    setResultModal(null);

    if (!verifiedName) {
      setError('Verify the smartcard number before paying.');
      return;
    }
    if (!variationCode) {
      setError('Pick a bouquet.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.billsPurchase({
        category: 'tv',
        serviceId: provider.serviceId,
        variationCode,
        customerId: smartcard.trim(),
        amount: selectedPlan?.amount ?? '0',
        phone,
        pin,
      });
      setPurchase(res);
      setPin('');
      if (res.status !== 'PROCESSING') {
        setSubmitting(false);
        setResultModal({
          kind: paymentResultKindForStatus(res.status),
          message: describeSubscriptionStatus(res.status),
        });
      }
      // else: leave submitting true — the polling effect above clears it
      // once a final status arrives, then shows exactly one modal.
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
      <h1 className="text-xl font-semibold text-foreground">Pay a bill</h1>
      <p className="max-w-lg text-sm text-muted">
        TV subscriptions here (via VTpass). Electricity is coming soon. Have a
        Remita or eTranzact invoice instead?{' '}
        <Link href="/bills/manual-payment" className="underline">
          Pay it here
        </Link>{' '}
        — an admin completes it on your behalf until direct integration is
        live (architecture doc §5.4b).
      </p>

      <Link
        href="/pay-bill"
        className="max-w-lg rounded-2xl border border-line bg-surface p-5 transition hover:border-brand-orange"
      >
        <p className="font-medium text-foreground">School fees, contributions & other billers</p>
        <p className="mt-1 text-sm text-muted">
          Browse bills set up by schools and organizations, and pay straight from your wallet.
        </p>
      </Link>

      <form onSubmit={submit} className="flex max-w-sm flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm">
          Provider
          <select
            className="rounded-lg border border-line bg-surface px-3 py-2.5 text-foreground outline-none focus:border-brand-orange"
            value={providerIndex}
            onChange={(e) => setProviderIndex(Number(e.target.value))}
          >
            {TV_PROVIDERS.map((p, i) => (
              <option key={p.serviceId} value={i}>
                {p.label}
              </option>
            ))}
          </select>
        </label>

        <div className="flex flex-col gap-1 text-sm">
          Smartcard number
          <div className="flex gap-2">
            <input
              className="flex-1 rounded-lg border border-line bg-surface px-3 py-2.5 text-foreground outline-none focus:border-brand-orange"
              value={smartcard}
              onChange={(e) => {
                setSmartcard(e.target.value);
                setVerifiedName(null);
              }}
              required
            />
            <button
              type="button"
              onClick={verifySmartcard}
              disabled={verifying}
              className="shrink-0 rounded-lg border border-line px-3 py-2.5 text-sm font-medium text-foreground transition hover:border-brand-orange hover:text-brand-orange disabled:opacity-50"
            >
              {verifying ? 'Checking…' : 'Verify'}
            </button>
          </div>
          {verifiedName && (
            <div className="rounded-lg border border-line bg-surface-hover px-3 py-2 text-sm">
              <p className="text-green-700 dark:text-green-400">✅ {verifiedName}</p>
              {verifyDetails?.customerNumber && (
                <p className="mt-1 text-muted">Account number: {verifyDetails.customerNumber}</p>
              )}
              {verifyDetails?.status && (
                <p className="mt-1 text-muted">
                  Subscription status:{' '}
                  <span
                    className={
                      verifyDetails.status.toUpperCase() === 'ACTIVE'
                        ? 'font-medium text-green-700 dark:text-green-400'
                        : 'font-medium text-red-600'
                    }
                  >
                    {verifyDetails.status}
                  </span>
                </p>
              )}
              {verifyDetails?.dueDate && (
                <p className="mt-1 text-muted">
                  Current bouquet active until{' '}
                  <span className="font-medium text-foreground">
                    {formatDueDate(verifyDetails.dueDate)}
                  </span>
                  {' — pick the same bouquet again below to renew it, or a different one to switch plans.'}
                </p>
              )}
              {verifyDetails?.balance !== undefined && (
                <p className="mt-1 text-muted">
                  {provider.label} works on a prepaid decoder balance rather than a subscription due
                  date. Current balance on file with {provider.label}: ₦{verifyDetails.balance}.
                </p>
              )}
            </div>
          )}
          {verifyError && <p className="text-sm text-red-600">{verifyError}</p>}
        </div>

        <label className="flex flex-col gap-1 text-sm">
          Bouquet
          <select
            className="rounded-lg border border-line bg-surface px-3 py-2.5 text-foreground outline-none focus:border-brand-orange"
            value={variationCode}
            onChange={(e) => setVariationCode(e.target.value)}
            required
            disabled={loadingPlans}
          >
            <option value="">{loadingPlans ? 'Loading bouquets…' : 'Select a bouquet'}</option>
            {variations.map((v) => (
              <option key={v.code} value={v.code}>
                {v.name} — ₦{v.amount}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Phone (for receipt/notification)
          <input
            className="rounded-lg border border-line bg-surface px-3 py-2.5 text-foreground outline-none focus:border-brand-orange"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
          />
        </label>

        <TransactionPinField value={pin} onChange={setPin} pinSet={pinSet} />

        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={submitting || pinSet === false}
          className="rounded-lg bg-brand-orange px-4 py-2.5 font-semibold text-white shadow-sm transition hover:bg-brand-orange-dark disabled:opacity-50"
        >
          {submitting ? 'Processing…' : 'Pay'}
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
