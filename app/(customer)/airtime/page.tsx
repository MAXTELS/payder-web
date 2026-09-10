'use client';

import { useState } from 'react';
import { apiFetch } from '@/lib/api-client';
import { AmountInput } from '@/components/AmountInput';

export default function AirtimePage() {
  const [category, setCategory] = useState<'airtime' | 'data'>('airtime');
  const [network, setNetwork] = useState('mtn');
  const [phone, setPhone] = useState('');
  const [amount, setAmount] = useState('');
  const [variationCode, setVariationCode] = useState('');
  const [result, setResult] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setResult(null);
    try {
      const res = await apiFetch('/bills/purchase', {
        method: 'POST',
        body: JSON.stringify({
          category,
          serviceId: network,
          variationCode: category === 'data' ? variationCode : undefined,
          customerId: phone,
          amount,
          phone,
        }),
      });
      setResult(`Submitted — status: ${(res as { status: string }).status}`);
    } catch (err) {
      setResult(err instanceof Error ? err.message : 'Failed');
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">Airtime & data</h1>
      <form onSubmit={submit} className="flex max-w-sm flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm">
          Type
          <select
            className="rounded border px-3 py-2"
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
            className="rounded border px-3 py-2"
            value={network}
            onChange={(e) => setNetwork(e.target.value)}
          >
            <option value="mtn">MTN</option>
            <option value="glo">Glo</option>
            <option value="airtel">Airtel</option>
            <option value="9mobile">9mobile</option>
          </select>
        </label>
        {category === 'data' && (
          <label className="flex flex-col gap-1 text-sm">
            Bundle code
            <input
              className="rounded border px-3 py-2"
              value={variationCode}
              onChange={(e) => setVariationCode(e.target.value)}
              placeholder="e.g. mtn-1gb-30day"
            />
          </label>
        )}
        <label className="flex flex-col gap-1 text-sm">
          Phone number
          <input
            className="rounded border px-3 py-2"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Amount
          <AmountInput
            className="rounded border px-3 py-2"
            value={amount}
            onChange={setAmount}
            placeholder="e.g. 1,000"
          />
        </label>
        <button type="submit" className="rounded bg-black px-4 py-2 text-sm text-white">
          Buy
        </button>
        {result && <p className="text-sm">{result}</p>}
      </form>
    </div>
  );
}
