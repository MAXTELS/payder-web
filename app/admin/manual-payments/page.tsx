'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api-client';
import { PageLoader } from '@/components/PageLoader';

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

// Test-only tool: generates a throwaway RRR via Remita's own public demo
// credentials, so the customer-facing "Pay a Remita invoice" screen
// (lookup → preview → pay) can be exercised without waiting on a real
// biller to hand out one. IMPORTANT CAVEAT, shown inline below: this hits a
// different Remita product (Merchant Collections "Payment Init") than the
// one the lookup/pay flow uses (Biller/Aggregator API), on a separate
// sandbox — so a generated RRR is not guaranteed to be found when you paste
// it into the "Pay a Remita invoice" page. See backend RemitaDemoProvider's
// header comment for the full explanation.
function RemitaDemoRrrCard() {
  const [amount, setAmount] = useState('1000');
  const [payerName, setPayerName] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ rrr: string; orderId: string; amount: number } | null>(
    null,
  );

  async function generate() {
    const amt = Number(amount);
    if (!amt || amt < 100) {
      alert('Enter an amount of at least ₦100.');
      return;
    }
    setBusy(true);
    setResult(null);
    try {
      const r = await api.adminGenerateDemoRrr({
        amount: amt,
        payerName: payerName || undefined,
      });
      setResult(r);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Could not generate a demo RRR.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded border p-4">
      <h2 className="text-sm font-semibold">Generate a test Remita RRR</h2>
      <p className="mt-1 max-w-2xl text-xs text-muted">
        Test-only. Uses Remita&apos;s public demo credentials to mint a throwaway RRR you can paste
        into &quot;Pay a Remita invoice&quot; on the customer app to test that screen. Because this
        is a different Remita sandbox than the lookup/pay flow uses, the generated RRR may not
        actually be found there — if lookup says it&apos;s invalid, that just means Remita hasn&apos;t
        linked the two sandboxes for this account, not that something&apos;s broken here.
      </p>
      <div className="mt-3 flex flex-wrap items-end gap-2">
        <label className="text-xs text-muted">
          Amount (₦)
          <input
            className="mt-1 block w-32 rounded border px-2 py-1 text-sm"
            type="number"
            min="100"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </label>
        <label className="text-xs text-muted">
          Payer name (optional)
          <input
            className="mt-1 block w-48 rounded border px-2 py-1 text-sm"
            value={payerName}
            onChange={(e) => setPayerName(e.target.value)}
          />
        </label>
        <button
          onClick={generate}
          disabled={busy}
          className="rounded bg-black px-3 py-2 text-xs text-white disabled:opacity-50"
        >
          {busy ? 'Generating…' : 'Generate demo RRR'}
        </button>
      </div>
      {result && (
        <p className="mt-3 rounded bg-surface-hover px-3 py-2 text-xs">
          RRR: <span className="font-mono font-semibold">{result.rrr}</span> · Order{' '}
          {result.orderId} · ₦{result.amount}
        </p>
      )}
    </div>
  );
}

export default function AdminManualPaymentsPage() {
  const [status, setStatus] = useState('PENDING');
  const [rows, setRows] = useState<ManualPaymentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refs, setRefs] = useState<Record<string, string>>({});

  function refresh() {
    setLoading(true);
    api
      .adminManualPaymentsQueue(status || undefined)
      .then((r) => setRows(r as ManualPaymentRequest[]))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
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
      <RemitaDemoRrrCard />
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
        <PageLoader inline label="Loading queue…" />
      ) : (
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
      )}
    </div>
  );
}
