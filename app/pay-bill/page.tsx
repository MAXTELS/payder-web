'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api-client';
import { Logo } from '@/components/Logo';

/**
 * Public entry point to the biller catalog — no login required. Categories
 * are fetched live from the backend (never hardcoded — a biller's `type` is
 * free-form, per biller-feature-spec.md), so a brand-new category shows up
 * here automatically the moment a biller with a published bill uses it.
 */
export default function PayBillCategoriesPage() {
  const [categories, setCategories] = useState<string[] | null>(null);

  useEffect(() => {
    api.billPayCategories().then(setCategories).catch(() => setCategories([]));
  }, []);

  return (
    <main className="min-h-screen bg-surface-hover px-6 py-10">
      <div className="mx-auto max-w-2xl">
        <div className="mb-8 flex justify-center">
          <Logo size="md" />
        </div>
        <h1 className="text-center text-xl font-semibold">Pay a bill</h1>
        <p className="mt-1 text-center text-sm text-muted">
          Pick a category to find who you're paying. No PAYDER account needed — you can pay by card via Paystack, or
          log in to pay from your wallet.
        </p>

        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          {categories?.map((c) => (
            <Link
              key={c}
              href={`/pay-bill/${encodeURIComponent(c)}`}
              className="rounded-2xl border border-line bg-surface p-6 text-center font-medium transition hover:border-brand-orange"
            >
              {c}
            </Link>
          ))}
          {categories && categories.length === 0 && (
            <p className="col-span-2 text-center text-sm text-muted">No bills are available to pay right now.</p>
          )}
        </div>

        <p className="mt-8 text-center text-sm text-muted">
          Already have a PAYDER account?{' '}
          <Link href="/login" className="text-brand-orange underline">
            Log in
          </Link>{' '}
          to pay from your wallet balance instead.
        </p>
      </div>
    </main>
  );
}
