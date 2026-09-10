'use client';

import { useState } from 'react';
import Link from 'next/link';
import { apiFetch } from '@/lib/api-client';
import { AmountInput } from '@/components/AmountInput';

const CATEGORIES = ['electricity', 'tv'] as const;

export default function BillsPage() {
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>('electricity');
  const [serviceId, setServiceId] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [amount, setAmount] = useState('');
  const [phone, setPhone] = useState('');
  const [result, setResult] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setResult(null);
    try {
      const res = await apiFetch('/bills/purchase', {
        method: 'POST',
        body: JSON.stringify({ category, serviceId, customerId, amount, phone }),
      });
      setResult(`Submitted — status: ${(res as { status: string }).status}`);
    } catch (err) {
      setResult(err instanceof Error ? err.message : 'Failed');
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">Pay a bill</h1>
      <p className="max-w-lg text-sm text-muted">
        Electricity and TV subscriptions here (via the VTU aggregator). Have a
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
        <p className="font-medium">School fees, contributions & other billers</p>
        <p className="mt-1 text-sm text-muted">
          Browse bills set up by schools and organizations, and pay straight from your wallet.
        </p>
      </Link>
      <form onSubmit={submit} className="flex max-w-sm flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm">
          Category
          <select
            className="rounded border px-3 py-2"
            value={category}
            onChange={(e) => setCategory(e.target.value as typeof category)}
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Provider code (e.g. ikeja-electric, dstv)
          <input
            className="rounded border px-3 py-2"
            value={serviceId}
            onChange={(e) => setServiceId(e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Meter / smartcard number
          <input
            className="rounded border px-3 py-2"
            value={customerId}
            onChange={(e) => setCustomerId(e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Amount
          <AmountInput
            className="rounded border px-3 py-2"
            value={amount}
            onChange={setAmount}
            placeholder="e.g. 5,000"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Phone (for receipt/notification)
          <input
            className="rounded border px-3 py-2"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </label>
        <button type="submit" className="rounded bg-black px-4 py-2 text-sm text-white">
          Pay
        </button>
        {result && <p className="text-sm">{result}</p>}
      </form>
    </div>
  );
}
