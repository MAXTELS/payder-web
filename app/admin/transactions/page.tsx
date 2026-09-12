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

// NECO has no live pin aggregator, so unlike WAEC (priced straight off
// VTpass + PAYDER's fixed ₦1,000 margin) its price is whatever the admin
// sets here — charged to the customer with NO markup added on top, since
// the admin's own figure is already inclusive of whatever margin they want.
// See backend ExamsService.getPricing/getOrCreateNecoProduct.
function NecoPriceCard() {
  const [sellPrice, setSellPrice] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);

  useEffect(() => {
    api
      .adminGetNecoPrice()
      .then((r) => {
        setSellPrice(r.sellPrice);
        setCostPrice(r.costPrice);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function save() {
    const sell = Number(sellPrice);
    if (!sell || sell <= 0) {
      alert('Enter a valid sell price first.');
      return;
    }
    const cost = costPrice ? Number(costPrice) : undefined;
    setSaving(true);
    try {
      const r = await api.adminSetNecoPrice(sell, cost);
      setSellPrice(r.sellPrice);
      setCostPrice(r.costPrice);
      setSavedAt(new Date());
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Could not save the NECO price.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded border p-4">
      <h2 className="text-sm font-semibold">NECO pin price</h2>
      <p className="mt-1 max-w-2xl text-xs text-muted">
        What a customer pays for a NECO result-checker pin right now — set this to whatever you
        want the customer charged, margin already included. No extra PAYDER fee is added on top.
      </p>
      {loading ? (
        <p className="mt-3 text-xs text-muted">Loading…</p>
      ) : (
        <div className="mt-3 flex flex-wrap items-end gap-2">
          <label className="text-xs text-muted">
            Sell price (₦, what the customer pays)
            <input
              className="mt-1 block w-40 rounded border px-2 py-1 text-sm"
              type="number"
              min="1"
              value={sellPrice}
              onChange={(e) => setSellPrice(e.target.value)}
            />
          </label>
          <label className="text-xs text-muted">
            Cost price (₦, optional — what NECO charges us)
            <input
              className="mt-1 block w-48 rounded border px-2 py-1 text-sm"
              type="number"
              min="0"
              value={costPrice}
              onChange={(e) => setCostPrice(e.target.value)}
            />
          </label>
          <button
            onClick={save}
            disabled={saving}
            className="rounded bg-black px-3 py-2 text-xs text-white disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save price'}
          </button>
          {savedAt && (
            <span className="text-xs text-muted">Saved {savedAt.toLocaleTimeString()}</span>
          )}
        </div>
      )}
    </div>
  );
}

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
      <NecoPriceCard />
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
