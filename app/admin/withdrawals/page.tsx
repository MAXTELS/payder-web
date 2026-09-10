'use client';

import { useEffect, useState } from 'react';
import { api, WithdrawalRequest } from '@/lib/api-client';

type Row = WithdrawalRequest & {
  user: { email: string; firstName: string; lastName: string };
  // Set only for a biller's withdrawal (see biller-feature-spec.md — billers
  // reuse this exact queue rather than getting a separate admin page).
  biller: { id: string; name: string; type: string } | null;
};

const STATUSES = ['PENDING', 'PAID', 'REJECTED', ''];

const STATUS_STYLES: Record<string, string> = {
  PENDING: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  PAID: 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  REJECTED: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

export default function AdminWithdrawalsPage() {
  const [status, setStatus] = useState('PENDING');
  const [rows, setRows] = useState<Row[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);

  function refresh() {
    api
      .adminWithdrawalsQueue(status || undefined)
      .then((r) => setRows(r as Row[]))
      .catch(() => setRows([]));
  }

  useEffect(refresh, [status]);

  async function markPaid(id: string) {
    const providerConfirmationRef =
      prompt('Optional: your bank-transfer reference/receipt number for this payout?') ?? undefined;
    setBusyId(id);
    try {
      await api.adminWithdrawalMarkPaid(id, providerConfirmationRef || undefined);
      refresh();
    } finally {
      setBusyId(null);
    }
  }

  async function reject(id: string) {
    const reason = prompt('Reason for rejecting this withdrawal? (the full amount is returned to the customer\'s wallet)');
    if (!reason) return;
    setBusyId(id);
    try {
      await api.adminWithdrawalReject(id, reason);
      refresh();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Withdrawals queue</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted">
          Customer requests to withdraw wallet funds to their own bank account. The amount and fee
          are already deducted from the customer's wallet — send the transfer yourself, then mark it
          Paid. Rejecting returns the full deducted amount to their wallet.
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
              <span className="font-semibold text-foreground">
                NGN {r.amount} <span className="text-xs font-normal text-faint">(fee NGN {r.fee})</span>
              </span>
              <span className="text-xs text-faint">{new Date(r.submittedAt).toLocaleString()}</span>
            </div>
            {r.biller && (
              <span className="mb-1 mr-2 inline-block rounded-full bg-brand-orange-light px-2 py-0.5 text-xs font-medium text-brand-orange-dark">
                Biller: {r.biller.name}
              </span>
            )}
            <p className="mb-1 text-muted">
              {r.biller
                ? `Requested by ${r.user.firstName} ${r.user.lastName} (${r.user.email})`
                : `${r.user.firstName} ${r.user.lastName} (${r.user.email})`}
            </p>
            <p className="mb-3 text-muted">
              Pay to <strong>{r.accountName}</strong> · {r.bankName} · {r.accountNumber}
            </p>
            <span
              className={`mb-3 inline-block rounded-full px-3 py-1 text-xs font-medium ${
                STATUS_STYLES[r.status] ?? 'bg-surface-hover text-neutral-700'
              }`}
            >
              {r.status}
            </span>
            {r.status === 'REJECTED' && r.rejectionReason && (
              <p className="mt-1 text-xs text-red-600">Rejected: {r.rejectionReason}</p>
            )}
            {r.status === 'PENDING' && (
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  onClick={() => markPaid(r.id)}
                  disabled={busyId === r.id}
                  className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-green-700 disabled:opacity-50"
                >
                  Mark paid
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
