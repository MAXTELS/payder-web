'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, ApiError } from '@/lib/api-client';
import { AmountInput } from '@/components/AmountInput';

type ExamType = 'waec' | 'neco' | 'jamb';

export default function ExamsPage() {
  const [examType, setExamType] = useState<ExamType>('waec');
  const [phone, setPhone] = useState('');
  // Only ever used for JAMB — WAEC/NECO are priced entirely by the backend
  // below and the customer never sees an editable amount field for them.
  const [jambAmount, setJambAmount] = useState('');
  const [pricing, setPricing] = useState<{ realPrice: string | null; markup: string; totalPrice: string | null } | null>(null);
  const [pricingError, setPricingError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setPricing(null);
    setPricingError(null);
    if (examType === 'jamb') return; // no backend pricing for jamb yet
    api
      .examsPricing(examType)
      .then(setPricing)
      .catch(() => setPricingError('Could not load the current price — try again shortly.'));
  }, [examType]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setResult(null);
    setError(null);
    setSubmitting(true);
    try {
      const res = await api.examsBuyPin({
        examType,
        phone,
        amount: examType === 'jamb' ? jambAmount : undefined,
      });
      setResult(res.pin ? `Your pin: ${res.pin}` : `Status: ${res.status}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  const canSubmit = phone.trim().length > 0 && (examType === 'jamb' ? jambAmount.trim().length > 0 : !!pricing?.totalPrice);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">Exam pins</h1>
      <p className="max-w-lg text-sm text-muted">
        WAEC and NECO result-checker pins, and JAMB e-PIN sales. This does not
        register you for UTME — that still requires in-person registration at
        a JAMB-accredited CBT centre; see architecture doc §5.5 for why.
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
            onChange={(e) => setExamType(e.target.value as ExamType)}
          >
            <option value="waec">WAEC result checker</option>
            <option value="neco">NECO result checker</option>
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

        {examType === 'jamb' ? (
          <label className="flex flex-col gap-1 text-sm">
            Amount
            <AmountInput
              className="rounded border px-3 py-2"
              value={jambAmount}
              onChange={setJambAmount}
              placeholder="e.g. 3,500"
            />
          </label>
        ) : (
          <div className="rounded border bg-surface px-3 py-2 text-sm">
            {pricingError ? (
              <span className="text-red-600 dark:text-red-400">{pricingError}</span>
            ) : pricing?.totalPrice ? (
              <>
                <p className="font-medium text-foreground">You&apos;ll pay ₦{pricing.totalPrice}</p>
                <p className="text-xs text-muted">
                  Set by PAYDER — includes the pin cost plus our ₦{Number(pricing.markup).toLocaleString()} service
                  fee. This amount can&apos;t be changed.
                </p>
                {examType === 'neco' && (
                  <p className="mt-1 text-xs text-muted">
                    NECO pins are sourced by our team and typically arrive within a few hours.
                  </p>
                )}
              </>
            ) : (
              <span className="text-muted">Loading price…</span>
            )}
          </div>
        )}

        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        {result && <p className="text-sm">{result}</p>}
        <button
          type="submit"
          disabled={submitting || !canSubmit}
          className="rounded bg-black px-4 py-2 text-sm text-white disabled:opacity-50"
        >
          {submitting ? 'Buying…' : 'Buy pin'}
        </button>
      </form>
    </div>
  );
}
