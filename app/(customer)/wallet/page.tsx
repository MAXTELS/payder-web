'use client';

import { useEffect, useState } from 'react';
import { api, ApiError, NgnBank, WithdrawalRequest } from '@/lib/api-client';
import { AmountInput } from '@/components/AmountInput';
import { EyeToggle } from '@/components/EyeToggle';
import { formatWithCommas } from '@/lib/format';

type Balance = Awaited<ReturnType<typeof api.walletBalance>>;
type FundingRequest = Awaited<ReturnType<typeof api.walletFundingMine>>[number];

const OTHER_BANK = '__OTHER__';

// Consolidated to Moniepoint only as of 2026-09-11 (Access Bank / Opay
// removed) — kept as a list (not a single object) so the "I have paid" flow
// below doesn't need a separate single-account code path if another account
// is ever added back later.
const BANK_ACCOUNTS: {
  key: 'MONIEPOINT';
  bank: string;
  accountNumber: string;
  accountName: string;
}[] = [
  { key: 'MONIEPOINT', bank: 'Moniepoint', accountNumber: '8137392019', accountName: 'Okonkwo Onyeka Jude' },
];

const STATUS_STYLES: Record<string, string> = {
  PENDING: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  APPROVED: 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  REJECTED: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

// Withdrawal statuses reuse the same palette, plus PAID standing in for the
// "money actually moved" success state (funding requests call it APPROVED).
const WITHDRAWAL_STATUS_STYLES: Record<string, string> = {
  PENDING: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  PAID: 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  REJECTED: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

// Client-side preview only — mirrors the backend defaults
// (WITHDRAWAL_FEE_LOW/HIGH/THRESHOLD in .env.example) so the customer sees
// the right number before submitting, but the fee actually charged is
// always whatever WithdrawalsService.feeFor computes server-side.
function previewWithdrawalFee(amount: number): number {
  return amount < 10_000 ? 100 : 150;
}

function CopyableRow({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  async function copy(e: React.MouseEvent) {
    // Stops the click from also bubbling up to the account card's onClick
    // (which selects the account) — copying shouldn't also change selection.
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard unavailable — silently ignore, the number is visible anyway
    }
  }
  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="text-xs text-faint">{label}</p>
        <p className="font-mono text-sm font-semibold text-foreground">{value}</p>
      </div>
      <button
        type="button"
        onClick={copy}
        className="rounded-full border border-line px-3 py-1 text-xs font-medium text-muted transition hover:border-brand-orange hover:text-brand-orange"
      >
        {copied ? 'Copied' : 'Copy'}
      </button>
    </div>
  );
}

export default function WalletPage() {
  const [balance, setBalance] = useState<Balance | null>(null);
  const [requests, setRequests] = useState<FundingRequest[]>([]);

  const [amount, setAmount] = useState('');
  const [selectedAccount, setSelectedAccount] = useState<(typeof BANK_ACCOUNTS)[number]['key']>(
    'MONIEPOINT',
  );
  const [havePaid, setHavePaid] = useState(false);
  const [senderAccountName, setSenderAccountName] = useState('');
  const [senderBankName, setSenderBankName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const [paystackAmount, setPaystackAmount] = useState('');
  const [paystackBusy, setPaystackBusy] = useState(false);
  const [paystackError, setPaystackError] = useState<string | null>(null);

  const [showBalance, setShowBalance] = useState(true);

  const [banks, setBanks] = useState<NgnBank[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [wAmount, setWAmount] = useState('');
  const [wBankCode, setWBankCode] = useState('');
  const [wOtherBankName, setWOtherBankName] = useState('');
  const [wAccountNumber, setWAccountNumber] = useState('');
  const [wConfirmAccountNumber, setWConfirmAccountNumber] = useState('');
  const [wAccountName, setWAccountName] = useState('');
  const [wSubmitting, setWSubmitting] = useState(false);
  const [wMessage, setWMessage] = useState<string | null>(null);
  const [wError, setWError] = useState<string | null>(null);

  function refresh() {
    api.walletBalance().then(setBalance).catch(() => setBalance(null));
    api
      .walletFundingMine()
      .then(setRequests)
      .catch(() => setRequests([]));
    api
      .withdrawalsMine()
      .then(setWithdrawals)
      .catch(() => setWithdrawals([]));
  }

  useEffect(refresh, []);
  useEffect(() => {
    api.withdrawalBanks().then(setBanks).catch(() => setBanks([]));
  }, []);

  const selectedBankName =
    wBankCode === OTHER_BANK ? wOtherBankName : banks.find((b) => b.code === wBankCode)?.name ?? '';
  const wAmountNumber = Number(wAmount || 0);
  const wFeePreview = wAmount ? previewWithdrawalFee(wAmountNumber) : 0;
  const wTotalPreview = wAmount ? wAmountNumber + wFeePreview : 0;
  const wAccountNumbersMismatch =
    wAccountNumber.length === 10 && wConfirmAccountNumber.length === 10 && wAccountNumber !== wConfirmAccountNumber;

  async function submitWithdrawal(e: React.FormEvent) {
    e.preventDefault();
    setWError(null);
    setWMessage(null);

    if (wAccountNumber.length !== 10 || wConfirmAccountNumber.length !== 10) {
      setWError('Account number must be exactly 10 digits.');
      return;
    }
    if (wAccountNumber !== wConfirmAccountNumber) {
      setWError('Account numbers do not match.');
      return;
    }
    if (!selectedBankName) {
      setWError('Choose a bank (or enter one under "Other").');
      return;
    }

    setWSubmitting(true);
    try {
      await api.withdrawalCreate({
        amount: wAmount,
        bankName: selectedBankName,
        accountNumber: wAccountNumber,
        confirmAccountNumber: wConfirmAccountNumber,
        accountName: wAccountName,
      });
      setWMessage(
        'Withdrawal requested — the amount and fee have been deducted from your wallet and will stay Pending until an admin sends the transfer.',
      );
      setWAmount('');
      setWBankCode('');
      setWOtherBankName('');
      setWAccountNumber('');
      setWConfirmAccountNumber('');
      setWAccountName('');
      refresh();
    } catch (err) {
      setWError(err instanceof ApiError ? err.message : 'Submission failed. Try again.');
    } finally {
      setWSubmitting(false);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    setSubmitting(true);
    try {
      await api.walletFundingCreate({
        amount,
        destinationAccount: selectedAccount,
        senderAccountName,
        senderBankName,
      });
      setMessage(
        'Thanks — your funding request has been submitted and will stay Pending until an admin verifies the transfer.',
      );
      setAmount('');
      setSenderAccountName('');
      setSenderBankName('');
      setHavePaid(false);
      refresh();
    } catch (err) {
      setMessage(err instanceof ApiError ? err.message : 'Submission failed. Try again.');
    } finally {
      setSubmitting(false);
    }
  }

  async function fundWithPaystack(e: React.FormEvent) {
    e.preventDefault();
    setPaystackError(null);
    setPaystackBusy(true);
    try {
      const { authorizationUrl } = await api.paymentsPaystackFund(paystackAmount);
      if (!authorizationUrl) {
        setPaystackError('Paystack did not return a checkout link. Try again.');
        return;
      }
      window.location.href = authorizationUrl;
    } catch (err) {
      setPaystackError(err instanceof ApiError ? err.message : 'Could not start checkout. Try again.');
    } finally {
      setPaystackBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-xl font-semibold text-foreground">Wallet</h1>

      <div className="rounded-2xl bg-gradient-to-br from-brand-navy to-brand-navy-light p-6 text-white shadow-lg">
        <p className="text-sm text-neutral-300">Balance</p>
        <div className="mt-1 flex items-center gap-3">
          <p className="text-3xl font-semibold tabular-nums">
            {!balance
              ? '—'
              : showBalance
                ? `${balance.currency} ${formatWithCommas(balance.balance)}`
                : `${balance.currency} ••••••`}
          </p>
          <EyeToggle
            visible={showBalance}
            onToggle={() => setShowBalance((v) => !v)}
            className="flex h-8 w-8 items-center justify-center rounded-full text-neutral-300 transition hover:bg-white/10 hover:text-white"
          />
        </div>
      </div>

      <div className="rounded-2xl border border-line bg-surface p-6 shadow-sm">
        <div className="mb-4">
          <h2 className="text-base font-semibold text-foreground">Fund instantly by card or bank</h2>
          <p className="mt-1 text-sm text-muted">
            Pay with Paystack and your wallet is credited as soon as checkout completes — no
            waiting on admin approval.
          </p>
        </div>
        <form onSubmit={fundWithPaystack} className="flex flex-col gap-3 sm:max-w-sm">
          <label className="flex flex-col gap-1 text-sm">
            Amount
            <AmountInput
              className="rounded-lg border border-line px-3 py-2 outline-none transition focus:border-brand-orange"
              value={paystackAmount}
              onChange={setPaystackAmount}
              placeholder="e.g. 5,000"
            />
          </label>
          <button
            type="submit"
            disabled={!paystackAmount || paystackBusy}
            className="rounded-lg bg-brand-navy px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-navy-light disabled:opacity-50"
          >
            {paystackBusy ? 'Starting checkout…' : 'Pay with Paystack'}
          </button>
          {paystackError && <p className="text-sm text-red-600">{paystackError}</p>}
        </form>
      </div>

      <div className="rounded-2xl border border-line bg-surface p-6 shadow-sm">
        <div className="mb-4">
          <h2 className="text-base font-semibold text-foreground">Fund your wallet by bank transfer</h2>
          <p className="mt-1 text-sm text-muted">
            Transfer to any of the accounts below, then let us know so an admin can verify it.
          </p>
        </div>

        <div className="mb-6 grid gap-3 sm:max-w-sm">
          {BANK_ACCOUNTS.map((acc) => (
            // A <div role="button">, not a real <button> — CopyableRow below
            // renders its own <button> for the copy action, and HTML forbids
            // nesting a <button> inside a <button> (it silently breaks and
            // React flags a hydration error). Keyboard/screen-reader users
            // still get button semantics via role + tabIndex + onKeyDown.
            <div
              key={acc.key}
              role="button"
              tabIndex={0}
              onClick={() => setSelectedAccount(acc.key)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setSelectedAccount(acc.key);
                }
              }}
              className={`cursor-pointer rounded-xl border p-4 text-left transition ${
                selectedAccount === acc.key
                  ? 'border-brand-orange bg-brand-orange-light shadow-sm'
                  : 'border-line hover:border-brand-orange/50'
              }`}
            >
              <p className="mb-2 text-sm font-semibold text-foreground">{acc.bank}</p>
              <div className="flex flex-col gap-2">
                <CopyableRow label="Account number" value={acc.accountNumber} />
                <CopyableRow label="Account name" value={acc.accountName} />
              </div>
            </div>
          ))}
        </div>

        {!havePaid ? (
          <div className="flex flex-col gap-3 sm:max-w-sm">
            <label className="flex flex-col gap-1 text-sm">
              Amount transferred
              <AmountInput
                className="rounded-lg border border-line px-3 py-2 outline-none transition focus:border-brand-orange"
                value={amount}
                onChange={setAmount}
                placeholder="e.g. 5,000"
              />
            </label>
            <button
              type="button"
              disabled={!amount}
              onClick={() => setHavePaid(true)}
              className="rounded-lg bg-brand-orange px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-orange-dark disabled:opacity-50"
            >
              I have paid
            </button>
          </div>
        ) : (
          <form onSubmit={submit} className="flex flex-col gap-3 sm:max-w-sm">
            <p className="rounded-lg bg-surface-hover p-3 text-sm text-muted">
              NGN {amount} to {BANK_ACCOUNTS.find((a) => a.key === selectedAccount)?.bank}. Now tell us
              which account you sent it from.
            </p>
            <label className="flex flex-col gap-1 text-sm">
              Name on the sending account
              <input
                className="rounded-lg border border-line px-3 py-2 outline-none transition focus:border-brand-orange"
                value={senderAccountName}
                onChange={(e) => setSenderAccountName(e.target.value)}
                required
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Sending account's bank
              <input
                className="rounded-lg border border-line px-3 py-2 outline-none transition focus:border-brand-orange"
                value={senderBankName}
                onChange={(e) => setSenderBankName(e.target.value)}
                required
              />
            </label>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={submitting}
                className="rounded-lg bg-brand-orange px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-orange-dark disabled:opacity-50"
              >
                {submitting ? 'Submitting…' : 'Submit'}
              </button>
              <button
                type="button"
                onClick={() => setHavePaid(false)}
                className="rounded-lg border border-line px-4 py-2.5 text-sm font-medium text-muted transition hover:bg-surface-hover"
              >
                Back
              </button>
            </div>
          </form>
        )}

        {message && <p className="mt-4 max-w-md text-sm text-foreground">{message}</p>}
      </div>

      {requests.length > 0 && (
        <div>
          <h2 className="mb-3 text-sm font-semibold text-muted">Your funding requests</h2>
          <ul className="flex flex-col gap-2">
            {requests.map((r) => (
              <li
                key={r.id}
                className="flex items-center justify-between rounded-xl border border-line bg-surface p-4 text-sm shadow-sm"
              >
                <div>
                  <p className="font-medium text-foreground">NGN {r.amount}</p>
                  <p className="text-xs text-faint">
                    {r.destinationAccount} · from {r.senderAccountName} ({r.senderBankName})
                  </p>
                  {r.status === 'REJECTED' && r.rejectionReason && (
                    <p className="mt-1 text-xs text-red-600">Rejected: {r.rejectionReason}</p>
                  )}
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-medium ${
                    STATUS_STYLES[r.status] ?? 'bg-surface-hover text-neutral-700'
                  }`}
                >
                  {r.status}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="rounded-2xl border border-line bg-surface p-6 shadow-sm">
        <div className="mb-4">
          <h2 className="text-base font-semibold text-foreground">Withdraw to your bank account</h2>
          <p className="mt-1 text-sm text-muted">
            The amount plus a processing fee (NGN 100 below NGN 10,000, NGN 150 at or above it) is
            deducted from your wallet right away. An admin then sends the transfer to your account —
            requests stay Pending until they do.
          </p>
        </div>
        <form onSubmit={submitWithdrawal} className="flex flex-col gap-3 sm:max-w-sm">
          <label className="flex flex-col gap-1 text-sm">
            Amount to withdraw
            <AmountInput
              className="rounded-lg border border-line px-3 py-2 outline-none transition focus:border-brand-orange"
              value={wAmount}
              onChange={setWAmount}
              placeholder="e.g. 5,000"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            Bank
            <select
              className="rounded-lg border border-line bg-surface px-3 py-2 outline-none transition focus:border-brand-orange"
              value={wBankCode}
              onChange={(e) => setWBankCode(e.target.value)}
              required
            >
              <option value="" disabled>
                Select a bank
              </option>
              {banks.map((b, i) => (
                <option key={`${b.code}-${i}`} value={b.code}>
                  {b.name}
                </option>
              ))}
              <option value={OTHER_BANK}>Other (not listed)</option>
            </select>
          </label>

          {wBankCode === OTHER_BANK && (
            <label className="flex flex-col gap-1 text-sm">
              Bank name
              <input
                className="rounded-lg border border-line px-3 py-2 outline-none transition focus:border-brand-orange"
                value={wOtherBankName}
                onChange={(e) => setWOtherBankName(e.target.value)}
                placeholder="Enter your bank's name"
                required
              />
            </label>
          )}

          <label className="flex flex-col gap-1 text-sm">
            Account number
            <input
              className="rounded-lg border border-line px-3 py-2 outline-none transition focus:border-brand-orange"
              value={wAccountNumber}
              onChange={(e) => setWAccountNumber(e.target.value.replace(/\D/g, '').slice(0, 10))}
              inputMode="numeric"
              placeholder="10-digit account number"
              required
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Confirm account number
            <input
              className="rounded-lg border border-line px-3 py-2 outline-none transition focus:border-brand-orange"
              value={wConfirmAccountNumber}
              onChange={(e) => setWConfirmAccountNumber(e.target.value.replace(/\D/g, '').slice(0, 10))}
              inputMode="numeric"
              placeholder="Re-enter account number"
              required
            />
          </label>
          {wAccountNumbersMismatch && (
            <p className="text-xs text-red-600">Account numbers do not match.</p>
          )}

          <label className="flex flex-col gap-1 text-sm">
            Name on the bank account
            <input
              className="rounded-lg border border-line px-3 py-2 outline-none transition focus:border-brand-orange"
              value={wAccountName}
              onChange={(e) => setWAccountName(e.target.value)}
              required
            />
          </label>

          {wAmount && (
            <p className="rounded-lg bg-surface-hover p-3 text-sm text-muted">
              Fee: NGN {previewWithdrawalFee(wAmountNumber).toLocaleString('en-NG')} · Total deducted
              from wallet: NGN {wTotalPreview.toLocaleString('en-NG')}
            </p>
          )}

          <button
            type="submit"
            disabled={wSubmitting || !wAmount}
            className="rounded-lg bg-brand-orange px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-orange-dark disabled:opacity-50"
          >
            {wSubmitting ? 'Submitting…' : 'Request withdrawal'}
          </button>
          {wError && <p className="text-sm text-red-600">{wError}</p>}
          {wMessage && <p className="text-sm text-foreground">{wMessage}</p>}
        </form>
      </div>

      {withdrawals.length > 0 && (
        <div>
          <h2 className="mb-3 text-sm font-semibold text-muted">Your withdrawal requests</h2>
          <ul className="flex flex-col gap-2">
            {withdrawals.map((w) => (
              <li
                key={w.id}
                className="flex items-center justify-between rounded-xl border border-line bg-surface p-4 text-sm shadow-sm"
              >
                <div>
                  <p className="font-medium text-foreground">
                    NGN {w.amount} <span className="text-xs text-faint">(fee NGN {w.fee})</span>
                  </p>
                  <p className="text-xs text-faint">
                    {w.bankName} · {w.accountNumber} · {w.accountName}
                  </p>
                  {w.status === 'REJECTED' && w.rejectionReason && (
                    <p className="mt-1 text-xs text-red-600">Rejected: {w.rejectionReason}</p>
                  )}
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-medium ${
                    WITHDRAWAL_STATUS_STYLES[w.status] ?? 'bg-surface-hover text-neutral-700'
                  }`}
                >
                  {w.status}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="rounded-2xl border border-dashed border-line bg-surface-hover p-6">
        <div className="mb-2 flex items-center gap-2">
          <h2 className="text-base font-semibold text-faint">Dedicated virtual account</h2>
          <span className="rounded-full bg-neutral-200 px-2 py-0.5 text-xs font-medium text-muted">
            Coming soon
          </span>
        </div>
        <p className="text-sm text-faint">
          Instant funding via your own permanent account number is on the way. For now, use manual
          bank transfer above.
        </p>
        <button
          disabled
          className="mt-3 cursor-not-allowed rounded-lg bg-neutral-200 px-4 py-2 text-sm text-faint"
        >
          Get my virtual account number
        </button>
      </div>
    </div>
  );
}
