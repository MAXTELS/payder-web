'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, ApiError } from '@/lib/api-client';
import { AmountInput } from '@/components/AmountInput';
import {
  PaymentResultModal,
  paymentResultKindForStatus,
  type PaymentResultKind,
} from '@/components/PaymentResultModal';
import { TransactionPinField } from '@/components/TransactionPinField';

type ExamType = 'waec' | 'neco' | 'jamb';
type ResultModalState = { kind: PaymentResultKind; message?: string } | null;

function describePinStatus(status: string, pin?: string | null): string | undefined {
  if (pin) return `Your pin is ${pin} — it's also been emailed to you and is always visible in Transaction history.`;
  switch (status.toUpperCase()) {
    case 'PROCESSING':
    case 'PENDING':
      return 'NECO pins are sourced by our team and typically arrive within a few hours — you\'ll get an email once it\'s ready.';
    case 'FAILED':
    case 'REVERSED':
      return 'Purchase failed — you have been refunded to your wallet.';
    default:
      return undefined;
  }
}

export default function ExamsPage() {
  const [examType, setExamType] = useState<ExamType>('waec');
  // Pre-filled from the account's own email once /users/me loads, but left
  // editable — this is the field that replaced the old "phone number" input
  // (which was never actually used to deliver anything; see backend
  // ExamsService's header comment).
  const [email, setEmail] = useState('');
  // Only ever used for JAMB — WAEC/NECO are priced entirely by the backend
  // below and the customer never sees an editable amount field for them.
  const [jambAmount, setJambAmount] = useState('');
  const [pricing, setPricing] = useState<{ realPrice: string | null; markup: string; totalPrice: string | null } | null>(null);
  const [pricingError, setPricingError] = useState<string | null>(null);
  const [pin, setPin] = useState('');
  const [pinSet, setPinSet] = useState<boolean | undefined>(undefined);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultModal, setResultModal] = useState<ResultModalState>(null);

  useEffect(() => {
    api.me().then((me) => {
      setEmail(me.email);
      setPinSet(me.pinSet);
    }).catch(() => {});
  }, []);

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
    setError(null);
    setResultModal(null);
    setSubmitting(true);
    try {
      const res = await api.examsBuyPin({
        examType,
        email: email.trim() || undefined,
        amount: examType === 'jamb' ? jambAmount : undefined,
        pin,
      });
      setPin('');
      setResultModal({
        kind: paymentResultKindForStatus(res.status),
        message: describePinStatus(res.status, res.pin),
      });
    } catch (err) {
      setResultModal({
        kind: 'declined',
        message: err instanceof ApiError ? err.message : 'Something went wrong. Please try again.',
      });
    } finally {
      setSubmitting(false);
    }
  }

  const canSubmit = examType === 'jamb' ? jambAmount.trim().length > 0 : !!pricing?.totalPrice;

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
          Email for your pin
          <input
            type="email"
            className="rounded border px-3 py-2"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
          />
        </label>
        <p className="-mt-2 text-xs text-muted">
          Your pin will be emailed here and will also always be visible in Transaction history.
        </p>

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

        <TransactionPinField value={pin} onChange={setPin} pinSet={pinSet} />

        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        <button
          type="submit"
          disabled={submitting || !canSubmit || pinSet === false}
          className="rounded bg-black px-4 py-2 text-sm text-white disabled:opacity-50"
        >
          {submitting ? 'Buying…' : 'Buy pin'}
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
