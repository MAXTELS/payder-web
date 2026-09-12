'use client';

import { useEffect, useState } from 'react';
import { api, ApiError } from '@/lib/api-client';
import { AmountInput } from '@/components/AmountInput';

// VTpass serviceIDs — confirmed against vtpass.com/documentation/service-ids/.
// Airtime and data are DIFFERENT services per network (e.g. "mtn" vs
// "mtn-data"), not the same serviceId with a category flag.
const NETWORKS = [
  { label: 'MTN', airtime: 'mtn', data: 'mtn-data' },
  { label: 'Glo', airtime: 'glo', data: 'glo-data' },
  { label: 'Airtel', airtime: 'airtel', data: 'airtel-data' },
  { label: '9mobile', airtime: 'etisalat', data: 'etisalat-data' },
] as const;

type Variation = { code: string; name: string; amount: string };

type PurchaseStatus = { id: string; status: string } | null;

export default function AirtimePage() {
  const [category, setCategory] = useState<'airtime' | 'data'>('airtime');
  const [networkIndex, setNetworkIndex] = useState(0);
  const [phone, setPhone] = useState('');
  const [amount, setAmount] = useState('');
  const [variations, setVariations] = useState<Variation[]>([]);
  const [variationCode, setVariationCode] = useState('');
  const [loadingPlans, setLoadingPlans] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [purchase, setPurchase] = useState<PurchaseStatus>(null);

  const network = NETWORKS[networkIndex];
  const serviceId = category === 'airtime' ? network.airtime : network.data;

  // Load the live data-bundle plan list from VTpass whenever the network
  // changes while on the "data" tab — never hardcoded, so sandbox vs live
  // plans/prices are always whatever VTpass actually has right now.
  useEffect(() => {
    if (category !== 'data') return;
    let cancelled = false;
    setLoadingPlans(true);
    setVariationCode('');
    api
      .billsVariations(serviceId)
      .then((list) => {
        if (!cancelled) setVariations(list);
      })
      .catch(() => {
        if (!cancelled) setVariations([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingPlans(false);
      });
    return () => {
      cancelled = true;
    };
  }, [category, serviceId]);

  const selectedPlan = variations.find((v) => v.code === variationCode);

  // Once a purchase comes back PROCESSING (VTpass said "pending"), poll for
  // a resolution every 4s rather than leaving the customer staring at a
  // status that never updates — same shape as the Remita status polling.
  useEffect(() => {
    if (!purchase || purchase.status !== 'PROCESSING') return;
    const interval = setInterval(async () => {
      try {
        const updated = await api.billsStatus(purchase.id);
        setPurchase(updated);
      } catch {
        // transient — try again on the next tick
      }
    }, 4000);
    return () => clearInterval(interval);
  }, [purchase]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPurchase(null);

    if (category === 'data' && !variationCode) {
      setError('Pick a data plan.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.billsPurchase({
        category,
        serviceId,
        variationCode: category === 'data' ? variationCode : undefined,
        customerId: phone,
        amount: category === 'data' ? (selectedPlan?.amount ?? '0') : amount,
        phone,
      });
      setPurchase(res);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold text-foreground">Airtime & data</h1>
      <form onSubmit={submit} className="flex max-w-sm flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm">
          Type
          <select
            className="rounded-lg border border-line bg-surface px-3 py-2.5 text-foreground outline-none focus:border-brand-orange"
            value={category}
            onChange={(e) => setCategory(e.target.value as 'airtime' | 'data')}
          >
            <option value="airtime">Airtime</option>
            <option value="data">Data</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Network
          <select
            className="rounded-lg border border-line bg-surface px-3 py-2.5 text-foreground outline-none focus:border-brand-orange"
            value={networkIndex}
            onChange={(e) => setNetworkIndex(Number(e.target.value))}
          >
            {NETWORKS.map((n, i) => (
              <option key={n.label} value={i}>
                {n.label}
              </option>
            ))}
          </select>
        </label>
        {category === 'data' && (
          <label className="flex flex-col gap-1 text-sm">
            Data plan
            <select
              className="rounded-lg border border-line bg-surface px-3 py-2.5 text-foreground outline-none focus:border-brand-orange"
              value={variationCode}
              onChange={(e) => setVariationCode(e.target.value)}
              required
              disabled={loadingPlans}
            >
              <option value="">{loadingPlans ? 'Loading plans…' : 'Select a plan'}</option>
              {variations.map((v) => (
                <option key={v.code} value={v.code}>
                  {v.name} — ₦{v.amount}
                </option>
              ))}
            </select>
          </label>
        )}
        <label className="flex flex-col gap-1 text-sm">
          Phone number
          <input
            className="rounded-lg border border-line bg-surface px-3 py-2.5 text-foreground outline-none focus:border-brand-orange"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
          />
        </label>
        {category === 'airtime' ? (
          <label className="flex flex-col gap-1 text-sm">
            Amount
            <AmountInput
              className="rounded-lg border border-line bg-surface px-3 py-2.5 text-foreground outline-none focus:border-brand-orange"
              value={amount}
              onChange={setAmount}
              placeholder="e.g. 1,000"
            />
          </label>
        ) : (
          selectedPlan && (
            <p className="text-sm text-muted">
              You&apos;ll pay <span className="font-semibold text-foreground">₦{selectedPlan.amount}</span> for{' '}
              {selectedPlan.name}.
            </p>
          )
        )}
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={submitting}
          className="rounded-lg bg-brand-orange px-4 py-2.5 font-semibold text-white shadow-sm transition hover:bg-brand-orange-dark disabled:opacity-50"
        >
          {submitting ? 'Processing…' : 'Buy'}
        </button>
        {purchase && (
          <p className="text-sm">
            {purchase.status === 'SUCCESS' && '✅ Purchase successful.'}
            {purchase.status === 'PROCESSING' && '⏳ Still processing — checking for an update…'}
            {purchase.status === 'PENDING' && '⏳ Submitted — waiting on the provider…'}
            {purchase.status === 'REVERSED' && '❌ Purchase failed — you have been refunded to your wallet.'}
            {purchase.status === 'FAILED' && '❌ Purchase failed.'}
          </p>
        )}
      </form>
    </div>
  );
}
