'use client';

import { useEffect, useState } from 'react';
import { api, ApiError } from '@/lib/api-client';
import { AmountInput } from '@/components/AmountInput';
import { TransactionPinField } from '@/components/TransactionPinField';

// Instant wallet-to-wallet transfer using the recipient's 10-digit PAYDER
// wallet ID (see the Wallet page for the sender's own ID + copy button).
// Two-step flow — look up the recipient's masked name first so the sender
// can confirm who they're paying before the PIN-gated, irreversible submit.
// See backend WalletService.lookupWalletId/transferToWallet.
const WALLET_TRANSFER_FEE_PERCENT = 0.5;

export default function WalletTransferPage() {
  const [walletId, setWalletId] = useState('');
  const [recipient, setRecipient] = useState<{ walletId: string; name: string } | null>(null);
  const [lookupBusy, setLookupBusy] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);

  const [amount, setAmount] = useState('');
  const [pin, setPin] = useState('');
  const [pinSet, setPinSet] = useState<boolean | undefined>(undefined);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    api.me().then((me) => setPinSet(me.pinSet)).catch(() => {});
  }, []);

  const amountNumber = Number(amount || 0);
  const feePreview = amount ? Math.round(amountNumber * (WALLET_TRANSFER_FEE_PERCENT / 100) * 100) / 100 : 0;
  const totalPreview = amount ? amountNumber + feePreview : 0;

  async function lookup(e: React.FormEvent) {
    e.preventDefault();
    setLookupError(null);
    setRecipient(null);
    setSuccess(null);
    const digits = walletId.replace(/\D/g, '');
    if (digits.length !== 10) {
      setLookupError('Enter the recipient\'s 10-digit wallet ID.');
      return;
    }
    setLookupBusy(true);
    try {
      const r = await api.walletTransferLookup(digits);
      setRecipient(r);
    } catch (err) {
      setLookupError(err instanceof ApiError ? err.message : 'Could not find that wallet.');
    } finally {
      setLookupBusy(false);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!recipient) return;
    setError(null);
    setSuccess(null);
    setSubmitting(true);
    try {
      await api.walletTransfer({ toWalletId: recipient.walletId, amount: amountNumber, pin });
      setSuccess(`NGN ${amount} sent to ${recipient.name} (wallet ${recipient.walletId}).`);
      setAmount('');
      setPin('');
      setRecipient(null);
      setWalletId('');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Transfer failed. Try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold text-foreground">Wallet transfer</h1>
      <p className="max-w-md text-sm text-muted">
        Send money instantly to any PAYDER wallet using their 10-digit wallet ID. A {WALLET_TRANSFER_FEE_PERCENT}%
        fee applies, deducted from your wallet along with the amount sent.
      </p>

      <div className="max-w-md rounded-2xl border border-line bg-surface p-6 shadow-sm">
        <form onSubmit={lookup} className="flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-sm">
            Recipient's wallet ID
            <input
              className="rounded-lg border border-line px-3 py-2 font-mono outline-none transition focus:border-brand-orange"
              value={walletId}
              onChange={(e) => {
                setWalletId(e.target.value.replace(/\D/g, '').slice(0, 10));
                setRecipient(null);
              }}
              inputMode="numeric"
              placeholder="10-digit wallet ID"
              required
            />
          </label>
          <button
            type="submit"
            disabled={lookupBusy || walletId.length !== 10}
            className="self-start rounded-lg border border-line px-4 py-2 text-sm font-medium text-foreground transition hover:bg-surface-hover disabled:opacity-50"
          >
            {lookupBusy ? 'Looking up…' : 'Find wallet'}
          </button>
          {lookupError && <p className="text-sm text-red-600">{lookupError}</p>}
        </form>

        {recipient && (
          <div className="mt-4 rounded-lg bg-surface-hover p-3 text-sm">
            Sending to <span className="font-semibold text-foreground">{recipient.name}</span>{' '}
            <span className="font-mono text-xs text-faint">({recipient.walletId})</span>
          </div>
        )}

        {recipient && (
          <form onSubmit={submit} className="mt-4 flex flex-col gap-3 border-t border-line pt-4">
            <label className="flex flex-col gap-1 text-sm">
              Amount to send
              <AmountInput
                className="rounded-lg border border-line px-3 py-2 outline-none transition focus:border-brand-orange"
                value={amount}
                onChange={setAmount}
                placeholder="e.g. 5,000"
              />
            </label>
            {amount && (
              <p className="rounded-lg bg-surface-hover p-3 text-sm text-muted">
                Fee ({WALLET_TRANSFER_FEE_PERCENT}%): NGN {feePreview.toLocaleString('en-NG')} · Total
                deducted from your wallet: NGN {totalPreview.toLocaleString('en-NG')}
              </p>
            )}
            <TransactionPinField value={pin} onChange={setPin} pinSet={pinSet} />
            <button
              type="submit"
              disabled={submitting || !amount || pinSet === false}
              className="rounded-lg bg-brand-orange px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-orange-dark disabled:opacity-50"
            >
              {submitting ? 'Sending…' : 'Send money'}
            </button>
          </form>
        )}

        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
        {success && <p className="mt-3 text-sm text-green-700 dark:text-green-400">{success}</p>}
      </div>
    </div>
  );
}
