'use client';

import { useEffect, useState } from 'react';
import { api, ApiError, BillDefinition, BillerPaymentRow, billerDailyReportUrl, billerPaymentsExportCsvUrl } from '@/lib/api-client';
import { PageLoader } from '@/components/PageLoader';

/** The protected CSV endpoints need the bearer token, which a plain <a href>
 * download link can't attach — fetch as a blob with the token and hand the
 * browser a temporary object URL instead (same reasoning as the existing
 * manual-payment receipt download elsewhere in this app). */
async function downloadWithAuth(url: string, filename: string) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('payder_access_token') : null;
  const res = await fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
  if (!res.ok) {
    alert('Could not download the report.');
    return;
  }
  const blob = await res.blob();
  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = objectUrl;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(objectUrl);
}

export default function BillerPaymentsPage() {
  const [bill, setBill] = useState<BillDefinition | null>(null);
  const [payments, setPayments] = useState<BillerPaymentRow[]>([]);
  const [paymentsLoading, setPaymentsLoading] = useState(true);
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [frequency, setFrequency] = useState<'DAILY' | 'WEEKLY' | 'EVERY_3_DAYS' | 'OFF'>('DAILY');
  const [prefMsg, setPrefMsg] = useState<string | null>(null);

  function refresh() {
    setPaymentsLoading(true);
    api
      .billerListPayments({ from: from || undefined, to: to || undefined, extra: filters })
      .then(setPayments)
      .catch(() => {})
      .finally(() => setPaymentsLoading(false));
  }

  useEffect(() => {
    api.billerGetBill().then(setBill).catch(() => {});
    api.billerGetReportPreference().then((p) => setFrequency(p.frequency)).catch(() => {});
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectFields = (bill?.fields ?? []).filter((f) => f.type === 'SELECT');

  async function saveFrequency(f: typeof frequency) {
    setFrequency(f);
    setPrefMsg(null);
    try {
      await api.billerSetReportPreference(f);
      setPrefMsg('Saved.');
    } catch (err) {
      setPrefMsg(err instanceof ApiError ? err.message : 'Something went wrong.');
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">Payments</h1>

      <div className="rounded-2xl border border-line bg-surface p-6">
        <p className="text-sm font-medium">Email report frequency</p>
        <p className="mt-1 text-sm text-muted">
          We email you a CSV of the previous day's payments at midnight — useful for writing receipts. Joint biller
          signers can each choose their own frequency.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {(['DAILY', 'WEEKLY', 'EVERY_3_DAYS', 'OFF'] as const).map((f) => (
            <button
              key={f}
              onClick={() => saveFrequency(f)}
              className={`rounded-full px-3 py-1.5 text-sm ${
                frequency === f ? 'bg-brand-orange text-white' : 'border border-line'
              }`}
            >
              {f.replace('_', ' ')}
            </button>
          ))}
        </div>
        {prefMsg && <p className="mt-2 text-sm">{prefMsg}</p>}
      </div>

      <div className="rounded-2xl border border-line bg-surface p-6">
        <p className="mb-3 text-sm font-medium">Filter</p>
        <div className="flex flex-wrap gap-3">
          <input type="date" className="rounded border px-3 py-2 text-sm" value={from} onChange={(e) => setFrom(e.target.value)} />
          <input type="date" className="rounded border px-3 py-2 text-sm" value={to} onChange={(e) => setTo(e.target.value)} />
          {selectFields.map((f) => (
            <select
              key={f.key}
              className="rounded border px-3 py-2 text-sm"
              value={filters[f.key] ?? ''}
              onChange={(e) => setFilters({ ...filters, [f.key]: e.target.value })}
            >
              <option value="">{f.label} — all</option>
              {(f.options ?? []).map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          ))}
          <button onClick={refresh} className="rounded bg-black px-4 py-2 text-sm text-white">
            Apply
          </button>
        </div>
        <div className="mt-3 flex flex-wrap gap-3 text-sm">
          <button
            onClick={() => downloadWithAuth(billerPaymentsExportCsvUrl({ from: from || undefined, to: to || undefined, extra: filters }), 'payments.csv')}
            className="text-brand-orange underline"
          >
            Export filtered results as CSV
          </button>
          <button
            onClick={() => downloadWithAuth(billerDailyReportUrl(), `payments-report.csv`)}
            className="text-brand-orange underline"
          >
            Download yesterday's report
          </button>
        </div>
      </div>

      {paymentsLoading ? (
        <PageLoader inline label="Loading payments…" />
      ) : (
      <div className="overflow-x-auto rounded-2xl border border-line">
        <table className="w-full text-left text-sm">
          <thead className="bg-surface-hover">
            <tr>
              <th className="px-4 py-2">Payer</th>
              <th className="px-4 py-2">Details</th>
              <th className="px-4 py-2">Amount</th>
              <th className="px-4 py-2">Method</th>
              <th className="px-4 py-2">Date</th>
            </tr>
          </thead>
          <tbody>
            {payments.map((p) => (
              <tr key={p.id} className="border-t border-line">
                <td className="px-4 py-2">{p.payerName ?? p.guestEmail ?? p.userId ?? '—'}</td>
                <td className="px-4 py-2">
                  {Object.entries(p.fieldValues)
                    .map(([k, v]) => `${k}: ${v}`)
                    .join(', ')}
                </td>
                <td className="px-4 py-2">₦{Number(p.billAmount).toLocaleString()}</td>
                <td className="px-4 py-2">{p.paymentMethod}</td>
                <td className="px-4 py-2">{new Date(p.createdAt).toLocaleString()}</td>
              </tr>
            ))}
            {payments.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-muted">
                  No payments yet.
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
