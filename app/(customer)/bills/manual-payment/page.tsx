'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { api, ApiError, manualPaymentReceiptUrl } from '@/lib/api-client';
import { AmountInput } from '@/components/AmountInput';
import { PageLoader } from '@/components/PageLoader';

interface ManualPaymentRequestRow {
  id: string;
  biller: 'REMITA' | 'ETRANZACT';
  invoiceReference: string;
  amount: string;
  status: 'PENDING' | 'PAID' | 'REJECTED';
  rejectionReason: string | null;
  receiptPdfUrl: string | null;
  submittedAt: string;
}

interface RemitaPreview {
  rrr: string;
  billerName: string;
  productName: string;
  payerName: string;
  description: string;
  currency: string;
  invoiceAmount: number;
  remitaFee: number;
  portalFee: number;
  totalToPay: number;
  rrrStatus: string;
  alreadyPaid: boolean;
}

function naira(n: number) {
  return n.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

type Step = 'enter' | 'confirm' | 'submitted';

export default function ManualPaymentPage() {
  const [tab, setTab] = useState<'REMITA' | 'ETRANZACT'>('REMITA');

  // --- eTranzact / generic interim flow (unchanged) ---
  const [invoiceReference, setInvoiceReference] = useState('');
  const [amount, setAmount] = useState('');
  const [payerName, setPayerName] = useState('');
  const [description, setDescription] = useState('');
  const [step, setStep] = useState<Step>('enter');
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // --- Remita real flow ---
  const [rrr, setRrr] = useState('');
  const [remitaBusy, setRemitaBusy] = useState(false);
  const [remitaMessage, setRemitaMessage] = useState<string | null>(null);
  const [remitaPreview, setRemitaPreview] = useState<RemitaPreview | null>(null);
  const [remitaRequest, setRemitaRequest] = useState<ManualPaymentRequestRow | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [mine, setMine] = useState<ManualPaymentRequestRow[]>([]);
  const [mineLoading, setMineLoading] = useState(true);

  function refresh() {
    api
      .manualPaymentsMine()
      .then((rows) => setMine(rows as ManualPaymentRequestRow[]))
      .catch(() => setMine([]))
      .finally(() => setMineLoading(false));
  }

  useEffect(refresh, []);

  // Stop polling on unmount.
  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  function stopPolling() {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }

  function startPolling(id: string) {
    stopPolling();
    pollRef.current = setInterval(async () => {
      try {
        const updated = (await api.remitaStatus(id)) as unknown as ManualPaymentRequestRow;
        setRemitaRequest(updated);
        if (updated.status !== 'PENDING') {
          stopPolling();
          refresh();
        }
      } catch {
        // Transient network hiccup — keep polling, don't surface an error
        // for every missed tick.
      }
    }, 5000);
  }

  async function lookupRrr(e: React.FormEvent) {
    e.preventDefault();
    setRemitaMessage(null);
    setRemitaPreview(null);
    setRemitaRequest(null);
    stopPolling();
    setRemitaBusy(true);
    try {
      const preview = (await api.remitaLookup(rrr.trim())) as unknown as RemitaPreview;
      setRemitaPreview(preview);
      if (preview.alreadyPaid) {
        setRemitaMessage('This RRR has already been paid on Remita — nothing left to do here.');
      }
    } catch (err) {
      setRemitaMessage(err instanceof ApiError ? err.message : 'Could not look up that RRR');
    } finally {
      setRemitaBusy(false);
    }
  }

  async function payRrr() {
    if (!remitaPreview) return;
    setRemitaBusy(true);
    setRemitaMessage(null);
    try {
      const result = (await api.remitaPay(remitaPreview.rrr)) as unknown as ManualPaymentRequestRow;
      setRemitaRequest(result);
      if (result.status === 'PENDING') {
        setRemitaMessage(
          'Your wallet has been debited and payment has been sent to Remita — this usually confirms within a minute or two.',
        );
        startPolling(result.id);
      }
      refresh();
    } catch (err) {
      setRemitaMessage(err instanceof ApiError ? err.message : 'Payment failed');
    } finally {
      setRemitaBusy(false);
    }
  }

  function resetRemitaFlow() {
    stopPolling();
    setRrr('');
    setRemitaPreview(null);
    setRemitaRequest(null);
    setRemitaMessage(null);
  }

  async function refreshRowStatus(id: string) {
    try {
      await api.remitaStatus(id);
      refresh();
    } catch {
      // ignore — row just stays as-is
    }
  }

  // --- eTranzact / generic interim flow handlers (unchanged) ---
  async function lookup(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    setBusy(true);
    try {
      const res = await api.manualPaymentLookup({ biller: 'ETRANZACT', invoiceReference });
      setMessage(res.message);
      if (res.valid) setStep('confirm');
    } catch (err) {
      setMessage(err instanceof ApiError ? err.message : 'Lookup failed');
    } finally {
      setBusy(false);
    }
  }

  async function confirm(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      await api.manualPaymentCreate({
        biller: 'ETRANZACT',
        invoiceReference,
        amount,
        payerName,
        description,
      });
      setStep('submitted');
      setMessage(
        'Submitted. Your wallet has been debited and this is now queued for an admin to complete the payment.',
      );
      setInvoiceReference('');
      setAmount('');
      setPayerName('');
      setDescription('');
      refresh();
    } catch (err) {
      setMessage(err instanceof ApiError ? err.message : 'Submission failed');
    } finally {
      setBusy(false);
    }
  }

  async function downloadReceipt(id: string) {
    const token =
      typeof window !== 'undefined' ? window.localStorage.getItem('payder_access_token') : null;
    const res = await fetch(manualPaymentReceiptUrl(id), {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) return;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">Pay a Remita / eTranzact invoice</h1>
        <p className="mt-1 max-w-lg text-sm text-muted">
          Remita invoices (school fees, church dues, government bills, etc.) are verified and paid
          automatically — enter your RRR, review the fees, and pay straight from your wallet.
          eTranzact still goes through our interim manual flow until direct merchant access is
          ready.
        </p>
        <p className="mt-1 text-sm">
          Paying an electricity/TV bill instead?{' '}
          <Link href="/bills" className="underline">
            Go back to Bills
          </Link>
          .
        </p>
      </div>

      <div className="flex gap-2 border-b">
        <button
          type="button"
          onClick={() => setTab('REMITA')}
          className={`px-3 py-2 text-sm font-medium ${
            tab === 'REMITA' ? 'border-b-2 border-black' : 'text-muted'
          }`}
        >
          Remita (RRR)
        </button>
        <button
          type="button"
          onClick={() => setTab('ETRANZACT')}
          className={`px-3 py-2 text-sm font-medium ${
            tab === 'ETRANZACT' ? 'border-b-2 border-black' : 'text-muted'
          }`}
        >
          eTranzact (manual)
        </button>
      </div>

      {tab === 'REMITA' && (
        <div className="flex flex-col gap-4">
          {!remitaRequest && (
            <form onSubmit={lookupRrr} className="flex max-w-sm flex-col gap-4">
              <label className="flex flex-col gap-1 text-sm">
                Remita Retrieval Reference (RRR)
                <input
                  className="rounded border px-3 py-2"
                  value={rrr}
                  // Remita's own portal often displays the RRR grouped with
                  // dashes/spaces for readability (e.g. "1234-5678-9012") —
                  // strip anything but digits so pasting/typing that format
                  // doesn't send a broken reference to Remita's API.
                  onChange={(e) => setRrr(e.target.value.replace(/\D/g, ''))}
                  inputMode="numeric"
                  placeholder="e.g. 123456789012"
                />
              </label>
              <button
                type="submit"
                disabled={remitaBusy || !rrr.trim()}
                className="rounded bg-black px-4 py-2 text-sm text-white disabled:opacity-50"
              >
                {remitaBusy ? 'Checking…' : 'Check RRR'}
              </button>
            </form>
          )}

          {remitaPreview && !remitaRequest && (
            <div className="max-w-sm rounded border p-4 text-sm">
              <p className="font-medium">
                {remitaPreview.billerName}
                {remitaPreview.productName ? ` — ${remitaPreview.productName}` : ''}
              </p>
              {remitaPreview.payerName && (
                <p className="text-muted">Payer on invoice: {remitaPreview.payerName}</p>
              )}
              {remitaPreview.description && (
                <p className="mt-1 text-muted">{remitaPreview.description}</p>
              )}

              <dl className="mt-3 flex flex-col gap-1 border-t pt-3">
                <div className="flex justify-between">
                  <dt className="text-muted">Invoice amount</dt>
                  <dd>
                    {remitaPreview.currency} {naira(remitaPreview.invoiceAmount)}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted">Remita fee</dt>
                  <dd>
                    {remitaPreview.currency} {naira(remitaPreview.remitaFee)}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted">PAYDER fee</dt>
                  <dd>
                    {remitaPreview.currency} {naira(remitaPreview.portalFee)}
                  </dd>
                </div>
                <div className="flex justify-between border-t pt-1 font-semibold">
                  <dt>Total to pay</dt>
                  <dd>
                    {remitaPreview.currency} {naira(remitaPreview.totalToPay)}
                  </dd>
                </div>
              </dl>

              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  onClick={payRrr}
                  disabled={remitaBusy || remitaPreview.alreadyPaid}
                  className="rounded bg-black px-4 py-2 text-sm text-white disabled:opacity-50"
                >
                  {remitaBusy ? 'Paying…' : 'Pay now from wallet'}
                </button>
                <button
                  type="button"
                  onClick={resetRemitaFlow}
                  className="rounded border px-4 py-2 text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {remitaRequest && (
            <div className="max-w-sm rounded border p-4 text-sm">
              <p>
                RRR <span className="font-medium">{remitaRequest.invoiceReference}</span> · NGN{' '}
                {remitaRequest.amount}
              </p>
              <p className="mt-2">
                Status:{' '}
                <span
                  className={
                    remitaRequest.status === 'PAID'
                      ? 'text-green-600'
                      : remitaRequest.status === 'REJECTED'
                        ? 'text-red-600'
                        : 'text-muted'
                  }
                >
                  {remitaRequest.status === 'PENDING' ? 'Processing…' : remitaRequest.status}
                </span>
              </p>
              {remitaRequest.status === 'REJECTED' && remitaRequest.rejectionReason && (
                <p className="mt-1 text-xs text-red-600">{remitaRequest.rejectionReason}</p>
              )}
              {remitaRequest.status === 'PAID' && remitaRequest.receiptPdfUrl && (
                <button
                  onClick={() => downloadReceipt(remitaRequest.id)}
                  className="mt-2 underline"
                >
                  Download receipt
                </button>
              )}
              <button type="button" onClick={resetRemitaFlow} className="mt-4 block underline">
                Pay another RRR
              </button>
            </div>
          )}

          {remitaMessage && <p className="max-w-md text-sm">{remitaMessage}</p>}
        </div>
      )}

      {tab === 'ETRANZACT' && (
        <>
          {step !== 'confirm' && (
            <form onSubmit={lookup} className="flex max-w-sm flex-col gap-4">
              <label className="flex flex-col gap-1 text-sm">
                Invoice reference
                <input
                  className="rounded border px-3 py-2"
                  value={invoiceReference}
                  onChange={(e) => setInvoiceReference(e.target.value)}
                  placeholder="invoice reference"
                />
              </label>
              <button
                type="submit"
                disabled={busy || !invoiceReference}
                className="rounded bg-black px-4 py-2 text-sm text-white disabled:opacity-50"
              >
                {busy ? 'Checking…' : 'Check reference'}
              </button>
            </form>
          )}

          {step === 'confirm' && (
            <form onSubmit={confirm} className="flex max-w-sm flex-col gap-4">
              <p className="rounded border bg-surface-hover p-3 text-sm">
                ETRANZACT · {invoiceReference}
              </p>
              <label className="flex flex-col gap-1 text-sm">
                Amount on the invoice
                <AmountInput
                  className="rounded border px-3 py-2"
                  value={amount}
                  onChange={setAmount}
                  placeholder="e.g. 5,000"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                Payer / account name (optional)
                <input
                  className="rounded border px-3 py-2"
                  value={payerName}
                  onChange={(e) => setPayerName(e.target.value)}
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                Description (optional)
                <input
                  className="rounded border px-3 py-2"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </label>
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={busy || !amount}
                  className="rounded bg-black px-4 py-2 text-sm text-white disabled:opacity-50"
                >
                  {busy ? 'Submitting…' : 'Confirm & pay from wallet'}
                </button>
                <button
                  type="button"
                  onClick={() => setStep('enter')}
                  className="rounded border px-4 py-2 text-sm"
                >
                  Back
                </button>
              </div>
            </form>
          )}

          {message && <p className="max-w-md text-sm">{message}</p>}
        </>
      )}

      <div>
        <h2 className="mb-2 text-sm font-semibold text-muted">Your manual payment requests</h2>
        {mineLoading ? (
          <PageLoader inline label="Loading your requests…" />
        ) : (
        <ul className="flex flex-col gap-2">
          {mine.map((r) => (
            <li key={r.id} className="flex items-center justify-between rounded border p-3 text-sm">
              <div>
                <span className="font-medium">{r.biller}</span> · {r.invoiceReference} · NGN{' '}
                {r.amount}
                {r.status === 'REJECTED' && r.rejectionReason && (
                  <p className="text-xs text-red-600">Rejected: {r.rejectionReason}</p>
                )}
              </div>
              <div className="flex items-center gap-3">
                <span
                  className={
                    r.status === 'PAID'
                      ? 'text-green-600'
                      : r.status === 'REJECTED'
                        ? 'text-red-600'
                        : 'text-muted'
                  }
                >
                  {r.status}
                </span>
                {r.biller === 'REMITA' && r.status === 'PENDING' && (
                  <button onClick={() => refreshRowStatus(r.id)} className="underline">
                    Refresh status
                  </button>
                )}
                {r.status === 'PAID' && r.receiptPdfUrl && (
                  <button onClick={() => downloadReceipt(r.id)} className="underline">
                    Receipt
                  </button>
                )}
              </div>
            </li>
          ))}
          {mine.length === 0 && <p className="text-sm text-faint">No requests yet.</p>}
        </ul>
        )}
      </div>
    </div>
  );
}
