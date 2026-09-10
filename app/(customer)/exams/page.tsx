'use client';

import { useState } from 'react';
import Link from 'next/link';
import { apiFetch } from '@/lib/api-client';
import { AmountInput } from '@/components/AmountInput';

export default function ExamsPage() {
  const [examType, setExamType] = useState<'waec' | 'jamb'>('waec');
  const [phone, setPhone] = useState('');
  const [amount, setAmount] = useState('');
  const [result, setResult] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setResult(null);
    try {
      const res = await apiFetch<{ pin?: string; status: string }>('/exams/pins', {
        method: 'POST',
        body: JSON.stringify({ examType, phone, amount }),
      });
      setResult(res.pin ? `Your pin: ${res.pin}` : `Status: ${res.status}`);
    } catch (err) {
      setResult(err instanceof Error ? err.message : 'Failed');
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">Exam pins</h1>
      <p className="max-w-lg text-sm text-muted">
        WAEC result-checker and JAMB e-PIN sales. This does not register you
        for UTME — that still requires in-person registration at a
        JAMB-accredited CBT centre; see architecture doc §5.5 for why.
        NECO is not yet wired up pending aggregator confirmation.
      </p>
      <p className="text-sm">
        Applying for Post-UTME somewhere?{' '}
        <Link href="/exams/post-utme-assist" className="underline">
          Get assisted registration help
        </Link>
        .
      </p>
      <form onSubmit={submit} className="flex max-w-sm flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm">
          Exam
          <select
            className="rounded border px-3 py-2"
            value={examType}
            onChange={(e) => setExamType(e.target.value as 'waec' | 'jamb')}
          >
            <option value="waec">WAEC result checker</option>
            <option value="jamb">JAMB e-PIN</option>
          </select>
        </label>
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
            placeholder="e.g. 3,500"
          />
        </label>
        <button type="submit" className="rounded bg-black px-4 py-2 text-sm text-white">
          Buy pin
        </button>
        {result && <p className="text-sm">{result}</p>}
      </form>
    </div>
  );
}
