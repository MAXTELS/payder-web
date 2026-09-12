'use client';

import { useEffect, useState } from 'react';
import { apiFetch, api } from '@/lib/api-client';
import { PageLoader } from '@/components/PageLoader';

interface Transaction {
  id: string;
  type: string;
  status: string;
  amount: string;
  createdAt: string;
  metadata?: { fulfillment?: string } | null;
}

const STATUSES = ['', 'PENDING', 'PROCESSING', 'SUCCESS', 'FAILED', 'REVERSED'];

export default function TransactionsPage() {
  const [status, setStatus] = useState('');
  const [rows, setRows] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  function refresh() {
    setLoading(true);
    apiFetch<Transaction[]>(`/admin/transactions${status ? `?status=${status}` : ''}`)
      .then(setRows)
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }

  useEffect(refresh, [status]);

  // NECO has no live pin aggregator (see backend ExamsService's header
  // comment) — a NECO purchase is left PROCESSING with metadata.fulfillment
  // === 'manual' until staff buy the actual pin from NECO's own portal and
  // enter it here.
  async function deliverPin(id: string) {
    const pin = prompt('Enter the NECO pin to deliver to the customer:');
    if (!pin) return;
    setBusyId(id);
    try {
      await api.adminExamFulfill(id, pin);
      refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Could not deliver the pin.');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">Transactions</h1>
      <select
        className="w-48 rounded border px-3 py-2 text-sm"
        value={status}
        onChange={(e) => setStatus(e.target.value)}
      >
        {STATUSES.map((s) => (
          <option key={s} value={s}>
            {s || 'All statuses'}
          </option>
        ))}
      </select>
      {loading ? (
        <PageLoader inline label="Loading transactions…" />
      ) : (
      <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b text-muted">
            <th className="py-2">Type</th>
            <th>Status</th>
            <th>Amount</th>
            <th>Created</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((t) => {
            const needsManualFulfillment =
              t.type === 'EXAM_PIN' && t.status === 'PROCESSING' && t.metadata?.fulfillment === 'manual';
            return (
              <tr key={t.id} className="border-b">
                <td className="py-2">{t.type}</td>
                <td>{t.status}</td>
                <td>{t.amount}</td>
                <td>{new Date(t.createdAt).toLocaleString()}</td>
                <td>
                  {needsManualFulfillment && (
                    <button
                      onClick={() => deliverPin(t.id)}
                      disabled={busyId === t.id}
                      className="rounded bg-black px-3 py-1 text-xs text-white disabled:opacity-50"
                    >
                      Deliver NECO pin
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      </div>
      )}
    </div>
  );
}
