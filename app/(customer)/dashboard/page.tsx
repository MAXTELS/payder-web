'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api-client';
import { EyeToggle } from '@/components/EyeToggle';
import { formatWithCommas, TRANSACTION_TYPE_LABELS, TRANSACTION_STATUS_STYLES } from '@/lib/format';

type Balance = Awaited<ReturnType<typeof api.walletBalance>>;
type Statement = Awaited<ReturnType<typeof api.walletStatement>>;
type KycMe = Awaited<ReturnType<typeof api.kycMe>>;

const QUICK_ACTIONS = [
  { href: '/wallet', label: 'Fund wallet' },
  { href: '/airtime', label: 'Buy airtime / data' },
  { href: '/bills', label: 'Pay a bill' },
  { href: '/betting', label: 'Fund betting account' },
  { href: '/bills/manual-payment', label: 'Pay Remita / eTranzact' },
  { href: '/exams', label: 'Buy exam e-pin' },
  { href: '/support', label: 'Get support' },
];

export default function DashboardPage() {
  const [balance, setBalance] = useState<Balance | null>(null);
  const [statement, setStatement] = useState<Statement | null>(null);
  const [loadingStatement, setLoadingStatement] = useState(true);
  const [kyc, setKyc] = useState<KycMe | null>(null);
  const [showBalance, setShowBalance] = useState(true);

  useEffect(() => {
    api.walletBalance().then(setBalance).catch(() => setBalance(null));
    api
      .walletStatement({ limit: 8 })
      .then(setStatement)
      .catch(() => setStatement(null))
      .finally(() => setLoadingStatement(false));
    api.kycMe().then(setKyc).catch(() => setKyc(null));
  }, []);

  const kycStatus = kyc?.record?.status;
  const showKycBanner = !!kyc && kycStatus !== 'APPROVED' && kycStatus !== 'PENDING';

  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-xl font-semibold text-foreground">Dashboard</h1>

      {showKycBanner && (
        <div className="flex flex-col items-start justify-between gap-3 rounded-2xl border border-brand-orange/30 bg-brand-orange-light px-6 py-4 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm font-semibold text-brand-orange-dark">
              {kycStatus === 'REJECTED' ? 'Identity verification needs another look' : 'Verify your identity'}
            </p>
            <p className="mt-0.5 text-sm text-foreground/80">
              {kycStatus === 'REJECTED'
                ? kyc?.record?.rejectionReason ?? 'Your last submission was rejected — please resubmit.'
                : 'Complete a quick KYC form so we can raise your account limits.'}
            </p>
          </div>
          <Link
            href="/kyc"
            className="shrink-0 rounded-lg bg-brand-orange px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-orange-dark"
          >
            {kycStatus === 'REJECTED' ? 'Resubmit' : 'Start verification'}
          </Link>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl bg-gradient-to-br from-brand-navy to-brand-navy-light p-6 text-white shadow-lg">
          <p className="text-sm text-neutral-300">Wallet balance</p>
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
          <Link
            href="/wallet"
            className="mt-3 inline-block text-sm font-medium text-brand-orange hover:underline"
          >
            View wallet →
          </Link>
        </div>

        <div className="rounded-2xl border border-line bg-surface p-6 shadow-sm">
          <p className="text-sm text-muted">Fund by bank transfer</p>
          <p className="mt-1 text-sm text-muted">
            Transfer to one of our static bank accounts and confirm in your wallet — requests are
            verified by an admin.
          </p>
          <Link
            href="/wallet"
            className="mt-3 inline-block rounded-lg bg-brand-orange px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-orange-dark"
          >
            Fund wallet
          </Link>
        </div>
      </div>

      <div>
        <p className="mb-3 text-sm font-medium text-muted">Quick actions</p>
        <div className="flex flex-wrap gap-3">
          {QUICK_ACTIONS.map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className="rounded-full border border-line bg-surface px-4 py-2 text-sm font-medium text-foreground transition hover:border-brand-orange hover:text-brand-orange"
            >
              {action.label}
            </Link>
          ))}
        </div>
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-medium text-muted">Recent transactions</p>
          <Link href="/transactions" className="text-sm font-medium text-brand-orange hover:underline">
            View all →
          </Link>
        </div>
        {loadingStatement ? (
          <p className="text-sm text-faint">Loading…</p>
        ) : !statement || statement.items.length === 0 ? (
          <p className="rounded-xl border border-dashed border-line p-6 text-sm text-muted">
            No transactions yet. Fund your wallet or make a purchase to see activity here.
          </p>
        ) : (
          <div className="overflow-hidden rounded-xl border border-line bg-surface shadow-sm">
            <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <tbody>
                {statement.items.map((tx) => (
                  <tr key={tx.id} className="border-b border-line last:border-0">
                    <td className="px-4 py-3">
                      <p className="text-foreground">{TRANSACTION_TYPE_LABELS[tx.type] ?? tx.type}</p>
                      <p className="text-xs text-faint">
                        {new Date(tx.createdAt).toLocaleString()}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-foreground">₦{tx.amount}</td>
                    <td className="px-4 py-3 text-right">
                      <span
                        className={`rounded-full px-2 py-1 text-xs font-medium ${
                          TRANSACTION_STATUS_STYLES[tx.status] ?? 'bg-surface-hover text-neutral-700'
                        }`}
                      >
                        {tx.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
