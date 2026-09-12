'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api-client';
import { PageLoader } from '@/components/PageLoader';

interface Transaction {
  id: string;
  type: string;
  status: string;
  amount: string;
  createdAt: string;
}

const STATUSES = ['', 'PENDING', 'PROCESSING', 'SUCCESS', 'FAILED', 'REVERSED'];

export default function TransactionsPage() {
  const [status, setStatus] = useState('');
  const [rows, setRows] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    apiFetch<Transaction[]>(`/admin/transactions${status ? `?status=${status}` : ''}`)
      .then(setRows)
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, [status]);

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
          </tr>
        </thead>
        <tbody>
          {rows.map((t) => (
            <tr key={t.id} className="border-b">
              <td className="py-2">{t.type}</td>
              <td>{t.status}</td>
              <td>{t.amount}</td>
              <td>{new Date(t.createdAt).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
      )}
    </div>
  );
}
