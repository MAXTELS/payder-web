'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api-client';

interface FundingRequest {
  id: string;
  amount: string;
  destinationAccount: string;
  senderAccountName: string;
  senderBankName: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  submittedAt: string;
  user: { email: string; firstName: string; lastName: string };
}

const STATUSES = ['PENDING', 'APPROVED', 'REJECTED', ''];

const STATUS_STYLES: Record<string, string> = {
  PENDING: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  APPROVED: 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  REJECTED: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

export default function AdminWalletFundingPage() {
  const [status, setStatus] = useState('PENDING');
  const [rows, setRows] = useState<FundingRequest[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);

  function refresh() {
    api
      .adminWalletFundingQueue(status || undefined)
      .then((r) => setRows(r as FundingRequest[]))
      .catch(() => setRows([]));
  }

  useEffect(refresh, [status]);

  async function approve(id: string) {
    setBusyId(id);
    try {
      await api.adminWalletFundingApprove(id);
      refresh();
    } finally {
      setBusyId(null);
    }
  }

  async function reject(id: string) {
    const reason = prompt('Reason for rejecting this request?');
    if (!reason) return;
    setBusyId(id);
    try {
      await api.adminWalletFundingReject(id, reason);
      refresh();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Wallet funding queue</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted">
          Customer claims of manual bank transfers to one of the PAYDER static accounts. Check your
          bank statement for a matching transfer before approving — approving credits the wallet
          immediately.
        </p>
      </div>
      <select
        className="w-48 rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-brand-orange"
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
          <li key={r.id} className="rounded-xl border border-line bg-surface p-4 text-sm shadow-sm">
            <div className="mb-2 flex items-center justify-between">
              <span className="font-semibold text-foreground">NGN {r.amount}</span>
              <span className="text-xs text-faint">
                {new Date(r.submittedAt).toLocaleString()}
              </span>
            </div>
            <p className="mb-1 text-muted">
              {r.user.firstName} {r.user.lastName} ({r.user.email})
            </p>
            <p className="mb-3 text-muted">
              Paid into {r.destinationAccount} · claims sent from{' '}
              <strong>{r.senderAccountName}</strong> ({r.senderBankName})
            </p>
            <span
              className={`mb-3 inline-block rounded-full px-3 py-1 text-xs font-medium ${
                STATUS_STYLES[r.status] ?? 'bg-surface-hover text-neutral-700'
              }`}
            >
              {r.status}
            </span>
            {r.status === 'PENDING' && (
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  onClick={() => approve(r.id)}
                  disabled={busyId === r.id}
                  className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-green-700 disabled:opacity-50"
                >
                  Approve & credit wallet
                </button>
                <button
                  onClick={() => reject(r.id)}
                  disabled={busyId === r.id}
                  className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700 disabled:opacity-50"
                >
                  Reject
                </button>
              </div>
            )}
          </li>
        ))}
        {rows.length === 0 && (
          <p className="rounded-xl border border-dashed border-line py-6 text-center text-sm text-faint">
            Nothing here.
          </p>
        )}
      </ul>
    </div>
  );
}
