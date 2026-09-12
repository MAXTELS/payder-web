'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api-client';
import { PageLoader } from '@/components/PageLoader';

interface KycRecord {
  id: string;
  tier: string;
  status: string;
  user: { email: string; firstName: string; lastName: string };
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
      ) : (
      <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b text-muted">
            <th className="py-2">Name</th>
            <th>Email</th>
            <th>Tier</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {records.map((r) => (
            <tr key={r.id} className="border-b">
              <td className="py-2">
                {r.user.firstName} {r.user.lastName}
              </td>
              <td>{r.user.email}</td>
              <td>{r.tier}</td>
              <td className="flex gap-2 py-2">
                <button
                  onClick={() => review(r.id, 'APPROVED')}
                  className="rounded bg-green-600 px-3 py-1 text-white"
                >
                  Approve
                </button>
                <button
                  onClick={() => review(r.id, 'REJECTED')}
                  className="rounded bg-red-600 px-3 py-1 text-white"
                >
                  Reject
                </button>
              </td>
            </tr>
          ))}
          {records.length === 0 && (
            <tr>
              <td colSpan={4} className="py-6 text-center text-faint">
                Nothing pending.
              </td>
            </tr>
          )}
        </tbody>
      </table>
      </div>
      )}
    </div>
  );
}
