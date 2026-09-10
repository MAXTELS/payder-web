'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api-client';

interface ManualPaymentRequest {
  id: string;
  biller: 'REMITA' | 'ETRANZACT';
  invoiceReference: string;
  amount: string;
  status: 'PENDING' | 'PAID' | 'REJECTED';
  submittedAt: string;
  user: { email: string; firstName: string; lastName: string };
}

const STATUSES = ['PENDING', 'PAID', 'REJECTED', ''];

export default function AdminManualPaymentsPage() {
  const [status, setStatus] = useState('PENDING');
  const [rows, setRows] = useState<ManualPaymentRequest[]>([]);
  const [refs, setRefs] = useState<Record<string, string>>({});

  function refresh() {
    api
      .adminManualPaymentsQueue(status || undefined)
      .then((r) => setRows(r as ManualPaymentRequest[]))
      .catch(() => setRows([]));
  }

  useEffect(refresh, [status]);

  async function markPaid(id: string) {
    const ref = refs[id];
    if (!ref) {
      alert('Enter the provider confirmation reference first.');
      return;
    }
    await api.adminManualPaymentMarkPaid(id, ref);
    refresh();
  }

  async function reject(id: string) {
    const reason = prompt('Reason for rejecting this request?');
    if (!reason) return;
    await api.adminManualPaymentReject(id, reason);
    refresh();
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">Manual invoice-payment queue</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted">
          Interim flow until direct Remita/eTranzact merchant integration (§5.4b). Pay the invoice
          on the biller&apos;s own portal first, then mark it paid here with their confirmation
          reference — this generates the customer&apos;s PDF receipt and emails it. Reject with a
          reason to refund the held wallet debit instead.
        </p>
      </div>
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
      <ul className="flex flex-col gap-3">
        {rows.map((r) => (
          <li key={r.id} className="rounded border p-4 text-sm">
            <div className="mb-2 flex items-center justify-between">
              <span className="font-medium">
                {r.biller} · {r.invoiceReference} · NGN {r.amount}
              </span>
              <span className="text-muted">{new Date(r.submittedAt).toLocaleString()}</span>
            </div>
            <p className="mb-3 text-muted">
              {r.user.firstName} {r.user.lastName} ({r.user.email}) · {r.status}
            </p>
            {r.status === 'PENDING' && r.biller === 'REMITA' && (
              <p className="rounded bg-surface-hover px-3 py-2 text-muted">
                Processing automatically via Remita — no action needed. It resolves itself (paid or
                refunded) once Remita confirms the RRR.
              </p>
            )}
            {r.status === 'PENDING' && r.biller !== 'REMITA' && (
              <div className="flex flex-wrap gap-2">
                <input
                  className="flex-1 rounded border px-2 py-1"
                  placeholder="Provider confirmation reference"
                  value={refs[r.id] ?? ''}
                  onChange={(e) => setRefs((v) => ({ ...v, [r.id]: e.target.value }))}
                />
                <button
                  onClick={() => markPaid(r.id)}
                  className="rounded bg-green-600 px-3 py-1 text-white"
                >
                  Mark paid
                </button>
                <button onClick={() => reject(r.id)} className="rounded bg-red-600 px-3 py-1 text-white">
                  Reject
                </button>
              </div>
            )}
          </li>
        ))}
        {rows.length === 0 && (
          <p className="py-6 text-center text-sm text-faint">Nothing here.</p>
        )}
      </ul>
    </div>
  );
}
