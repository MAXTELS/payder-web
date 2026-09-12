'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api-client';
import { PageLoader } from '@/components/PageLoader';

interface KycRecord {
  id: string;
  tier: string;
  status: string;
  createdAt: string;
  dateOfBirth: string | null;
  address: string | null;
  nin: string | null;
  documentUrl: string | null;
  livenessResult: string | null;
  user: { id: string; email: string; phone: string; firstName: string; lastName: string };
}

export default function KycReviewPage() {
  const [records, setRecords] = useState<KycRecord[]>([]);
  const [loading, setLoading] = useState(true);

  function refresh() {
    apiFetch<KycRecord[]>('/admin/kyc/pending')
      .then(setRecords)
      .catch(() => setRecords([]))
      .finally(() => setLoading(false));
  }

  useEffect(refresh, []);

  async function review(id: string, decision: 'APPROVED' | 'REJECTED') {
    const reason = decision === 'REJECTED' ? prompt('Rejection reason?') ?? '' : undefined;
    await apiFetch(`/admin/kyc/${id}/review`, {
      method: 'PATCH',
      body: JSON.stringify({ decision, reason }),
    });
    refresh();
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">KYC review queue</h1>
      {loading ? (
        <PageLoader inline label="Loading KYC queue…" />
      ) : records.length === 0 ? (
        <p className="text-sm text-faint">Nothing pending.</p>
      ) : (
        <div className="flex flex-col gap-4">
          {records.map((r) => (
            <div key={r.id} className="rounded-2xl border border-line bg-surface p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-foreground">
                    {r.user.firstName} {r.user.lastName} · {r.tier}
                  </p>
                  <p className="text-sm text-muted">
                    {r.user.email} · {r.user.phone}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => review(r.id, 'APPROVED')}
                    className="rounded bg-green-600 px-3 py-1 text-sm text-white"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => review(r.id, 'REJECTED')}
                    className="rounded bg-red-600 px-3 py-1 text-sm text-white"
                  >
                    Reject
                  </button>
                </div>
              </div>

              <dl className="mt-4 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-xs text-muted">Date of birth</dt>
                  <dd className="text-foreground">
                    {r.dateOfBirth ? new Date(r.dateOfBirth).toLocaleDateString() : '—'}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted">NIN</dt>
                  <dd className="font-mono text-foreground">{r.nin ?? '—'}</dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-xs text-muted">Address</dt>
                  <dd className="text-foreground">{r.address ?? '—'}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted">ID document</dt>
                  <dd className="text-foreground">
                    {r.documentUrl ? (
                      <a href={r.documentUrl} target="_blank" rel="noreferrer" className="underline">
                        View upload
                      </a>
                    ) : (
                      'Not submitted'
                    )}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted">Liveness check</dt>
                  <dd className="text-foreground">{r.livenessResult ?? 'Not run'}</dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-xs text-muted">Submitted</dt>
                  <dd className="text-foreground">{new Date(r.createdAt).toLocaleString()}</dd>
                </div>
              </dl>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
