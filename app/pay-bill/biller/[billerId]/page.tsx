'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { api, ApiError, PublicBillDetail } from '@/lib/api-client';
import { getCurrentUser } from '@/lib/auth';
import { Logo } from '@/components/Logo';

export default function PayBillDetailPage() {
  const params = useParams<{ billerId: string }>();
  const billerId = params.billerId;
  const [bill, setBill] = useState<PublicBillDetail | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [quote, setQuote] = useState<{ billAmount: number; portalFee: number; totalAmount: number } | null>(null);
  const [guest, setGuest] = useState({ guestName: '', guestEmail: '', guestPhone: '' });
  const [msg, setMsg] = useState<string | null>(null);
  const [paying, setPaying] = useState(false);

  const isCustomer = getCurrentUser()?.role === 'CUSTOMER';

  useEffect(() => {
    api.billPayBillDetail(billerId).then(setBill).catch(() => setBill(null));
  }, [billerId]);

  const allFilled = bill ? bill.fields.every((f) => values[f.key]?.trim()) : false;

  useEffect(() => {
    if (!bill || !allFilled) {
      setQuote(null);
      return;
    }
    api.billPayQuote(billerId, values).then(setQuote).catch(() => setQuote(null));
  }, [bill, allFilled, values, billerId]);

  async function payWithWallet() {
    setMsg(null);
    setPaying(true);
    try {
      await api.billPayWithWallet(billerId, values);
      setMsg('Payment successful — this bill has been paid from your wallet.');
    } catch (err) {
      setMsg(err instanceof ApiError ? err.message : 'Something went wrong.');
    } finally {
      setPaying(false);
    }
  }

  async function payAsGuest(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setPaying(true);
    try {
      const res = await api.billPayAsGuest(billerId, { fieldValues: values, ...guest });
      if (res.authorizationUrl) window.location.href = res.authorizationUrl;
      else setMsg('Could not start checkout — try again.');
    } catch (err) {
      setMsg(err instanceof ApiError ? err.message : 'Something went wrong.');
      setPaying(false);
    }
  }

  if (!bill) {
    return (
      <main className="min-h-screen bg-surface-hover px-6 py-10">
        <div className="mx-auto max-w-lg text-center text-sm text-muted">Loading…</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-surface-hover px-6 py-10">
      <div className="mx-auto max-w-lg">
        <div className="mb-8 flex justify-center">
          <Logo size="md" />
        </div>
        <p className="text-sm text-muted">
          <Link href="/pay-bill" className="underline">
            ← All categories
          </Link>
        </p>
        <h1 className="mt-2 text-xl font-semibold">{bill.billerName}</h1>
        <p className="text-sm text-muted">{bill.billName}</p>

        <div className="mt-6 flex flex-col gap-4 rounded-2xl border border-line bg-surface p-6">
          {bill.fields.map((f) => (
            <label key={f.key} className="flex flex-col gap-1 text-sm">
              {f.label}
              {f.type === 'SELECT' ? (
                <select
                  className="rounded border px-3 py-2"
                  value={values[f.key] ?? ''}
                  onChange={(e) => setValues({ ...values, [f.key]: e.target.value })}
                >
                  <option value="">Select…</option>
                  {(f.options ?? []).map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  className="rounded border px-3 py-2"
                  value={values[f.key] ?? ''}
                  onChange={(e) => setValues({ ...values, [f.key]: e.target.value })}
                />
              )}
            </label>
          ))}

          {quote && (
            <div className="rounded-lg bg-surface-hover p-3 text-sm">
              <div className="flex justify-between">
                <span>Bill amount</span>
                <span>₦{quote.billAmount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-muted">
                <span>Portal charge</span>
                <span>₦{quote.portalFee.toLocaleString()}</span>
              </div>
              <div className="mt-1 flex justify-between border-t border-line pt-1 font-medium">
                <span>Total</span>
                <span>₦{quote.totalAmount.toLocaleString()}</span>
              </div>
            </div>
          )}

          {msg && <p className="text-sm">{msg}</p>}

          {isCustomer ? (
            <button
              onClick={payWithWallet}
              disabled={!quote || paying}
              className="rounded bg-brand-orange px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
            >
              {paying ? 'Paying…' : 'Pay from wallet'}
            </button>
          ) : (
            <form onSubmit={payAsGuest} className="flex flex-col gap-3 border-t border-line pt-4">
              <p className="text-xs text-muted">
                Paying as a guest via Paystack.{' '}
                <Link href="/login" className="underline">
                  Log in
                </Link>{' '}
                to pay from your wallet instead.
              </p>
              <input
                className="rounded border px-3 py-2 text-sm"
                placeholder="Your full name"
                required
                value={guest.guestName}
                onChange={(e) => setGuest({ ...guest, guestName: e.target.value })}
              />
              <input
                type="email"
                className="rounded border px-3 py-2 text-sm"
                placeholder="Email (for your receipt)"
                required
                value={guest.guestEmail}
                onChange={(e) => setGuest({ ...guest, guestEmail: e.target.value })}
              />
              <input
                className="rounded border px-3 py-2 text-sm"
                placeholder="Phone (optional)"
                value={guest.guestPhone}
                onChange={(e) => setGuest({ ...guest, guestPhone: e.target.value })}
              />
              <button
                type="submit"
                disabled={!quote || paying}
                className="rounded bg-brand-orange px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
              >
                {paying ? 'Starting checkout…' : 'Pay with Paystack'}
              </button>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}
