'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api-client';
import { Logo } from '@/components/Logo';

export default function PayBillCategoryBillersPage() {
  const params = useParams<{ type: string }>();
  const type = decodeURIComponent(params.type);
  const [billers, setBillers] = useState<{ id: string; name: string; bill: { name: string } }[] | null>(null);

  useEffect(() => {
    api.billPayBillersByCategory(type).then(setBillers).catch(() => setBillers([]));
  }, [type]);

  return (
    <main className="min-h-screen bg-surface-hover px-6 py-10">
      <div className="mx-auto max-w-2xl">
        <div className="mb-8 flex justify-center">
          <Logo size="md" />
        </div>
        <p className="text-sm text-muted">
          <Link href="/pay-bill" className="underline">
            ← All categories
          </Link>
        </p>
        <h1 className="mt-2 text-xl font-semibold">{type}</h1>

        <div className="mt-6 flex flex-col gap-3">
          {billers?.map((b) => (
            <Link
              key={b.id}
              href={`/pay-bill/biller/${b.id}`}
              className="rounded-2xl border border-line bg-surface p-5 transition hover:border-brand-orange"
            >
              <p className="font-medium">{b.name}</p>
              <p className="text-sm text-muted">{b.bill.name}</p>
            </Link>
          ))}
          {billers && billers.length === 0 && (
            <p className="text-sm text-muted">No billers available in this category right now.</p>
          )}
        </div>
      </div>
    </main>
  );
}
