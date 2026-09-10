'use client';

import { useEffect, useState } from 'react';
import { api, ApiError, BillerWithdrawalDraft } from '@/lib/api-client';
import { AmountInput } from '@/components/AmountInput';

type Statement = Awaited<ReturnType<typeof api.billerStatement>>;

export default function BillerWalletPage() {
  const [balance, setBalance] = useState<{ currency: string; balance: string; isFrozen: boolean } | null>(null);
  const [statement, setStatement] = useState<Statement | null>(null);
  const [me, setMe] = useState<Awaited<ReturnType<typeof api.billerMe>> | null>(null);
  const [drafts, setDrafts] = useState<BillerWithdrawalDraft[]>([]);

  const [depositOpen, setDepositOpen] = useState(false);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [pinOpen, setPinOpen] = useState(false);

  const [depositAmount, setDepositAmount] = useState('');
  const [depositMsg, setDepositMsg] = useState<string | null>(null);

  const [wd, setWd] = useState({
    amount: '',
    bankName: '',
    accountNumber: '',
    confirmAccountNumber: '',
    accountName: '',
    pin: '',
  });
  const [wdMsg, setWdMsg] = useState<string | null>(null);

  const [pin, setPin] = useState({ pin: '', currentPin: '' });
  const [pinMsg, setPinMsg] = useState<string | null>(null);

  function refresh() {
    api.billerBalance().then(setBalance).catch(() => {});
    api.billerStatement({ limit: 20 }).then(setStatement).catch(() => {});
    api.billerMe().then(setMe).catch(() => {});
    api.billerWithdrawDrafts().then(setDrafts).catch(() => {});
  }

  useEffect(refresh, []);

  async function submitDeposit(e: React.FormEvent) {
    e.preventDefault();
    setDepositMsg(null);
    try {
      const { authorizationUrl } = await api.billerDepositInitiate(depositAmount);
      if (authorizationUrl) window.location.href = authorizationUrl;
      else setDepositMsg('Could not start checkout — try again.');
    } catch (err) {
      setDepositMsg(err instanceof ApiError ? err.message : 'Something went wrong.');
    }
  }

  async function submitWithdraw(e: React.FormEvent) {
    e.preventDefault();
    setWdMsg(null);
    try {
      const res = await api.billerWithdraw(wd);
      setWdMsg(
        res.awaitingCoSignerApproval
          ? 'Saved — waiting for the other signer to approve with their PIN before this is sent for payout.'
          : 'Withdrawal submitted — awaiting admin payout.',
      );
      setWd({ amount: '', bankName: '', accountNumber: '', confirmAccountNumber: '', accountName: '', pin: '' });
      refresh();
    } catch (err) {
      setWdMsg(err instanceof ApiError ? err.message : 'Something went wrong.');
    }
  }

  async function submitPin(e: React.FormEvent) {
    e.preventDefault();
    setPinMsg(null);
    try {
      await api.billerSetPin(pin.pin, pin.currentPin || undefined);
      setPinMsg('PIN saved.');
      setPin({ pin: '', currentPin: '' });
      refresh();
    } catch (err) {
      setPinMsg(err instanceof ApiError ? err.message : 'Something went wrong.');
    }
  }

  async function approve(draftId: string) {
    const draftPin = prompt('Enter your transaction PIN to approve this withdrawal');
    if (!draftPin) return;
    try {
      await api.billerApproveDraft(draftId, draftPin);
      refresh();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : 'Something went wrong.');
    }
  }

  async function cancel(draftId: string) {
    if (!confirm('Cancel this withdrawal request?')) return;
    await api.billerCancelDraft(draftId).catch(() => {});
    refresh();
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">Wallet</h1>

      <div className="rounded-2xl border border-line bg-surface p-6">
        <p className="text-sm text-muted">Balance</p>
        <p className="mt-1 text-2xl font-semibold">
          {balance ? `₦${Number(balance.balance).toLocaleString()}` : '—'}
        </p>
        {balance?.isFrozen && <p className="mt-1 text-sm text-red-600">This wallet is frozen.</p>}
        {me && !me.pinSet && (
          <p className="mt-2 text-sm text-amber-600">
            Set a transaction PIN below before you can withdraw.
          </p>
        )}
      </div>

      {drafts.length > 0 && (
        <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4">
          <p className="text-sm font-medium text-amber-800">Awaiting your co-signer's approval</p>
          <div className="mt-2 flex flex-col gap-2">
            {drafts.map((d) => (
              <div key={d.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-white p-3 text-sm">
                <span>
                  ₦{Number(d.amount).toLocaleString()} to {d.accountName} ({d.bankName} {d.accountNumber})
                </span>
                <div className="flex gap-2">
                  <button onClick={() => approve(d.id)} className="rounded bg-brand-orange px-3 py-1 text-white">
                    Approve
                  </button>
                  <button onClick={() => cancel(d.id)} className="rounded border px-3 py-1">
                    Cancel
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Deposit — collapsible section */}
      <div className="rounded-2xl border border-line bg-surface">
        <button
          onClick={() => setDepositOpen((v) => !v)}
          className="flex w-full items-center justify-between px-6 py-4 text-left font-medium"
        >
          Deposit <span>{depositOpen ? '−' : '+'}</span>
        </button>
        {depositOpen && (
          <form onSubmit={submitDeposit} className="flex flex-col gap-3 border-t border-line px-6 py-4">
            <label className="flex flex-col gap-1 text-sm">
              Amount
              <AmountInput className="rounded border px-3 py-2" value={depositAmount} onChange={setDepositAmount} />
            </label>
            {depositMsg && <p className="text-sm">{depositMsg}</p>}
            <button className="w-fit rounded bg-brand-orange px-4 py-2 text-sm font-medium text-white">
              Pay with Paystack
            </button>
          </form>
        )}
      </div>

      {/* Withdraw — collapsible section */}
      <div className="rounded-2xl border border-line bg-surface">
        <button
          onClick={() => setWithdrawOpen((v) => !v)}
          className="flex w-full items-center justify-between px-6 py-4 text-left font-medium"
        >
          Withdraw <span>{withdrawOpen ? '−' : '+'}</span>
        </button>
        {withdrawOpen && (
          <form onSubmit={submitWithdraw} className="flex flex-col gap-3 border-t border-line px-6 py-4 max-w-sm">
            {me?.biller.isJoint && (
              <p className="text-xs text-muted">
                As a joint biller, submitting this only records your consent — your co-signer must also approve with
                their PIN before any money moves.
              </p>
            )}
            <AmountInput
              className="rounded border px-3 py-2"
              value={wd.amount}
              onChange={(v) => setWd({ ...wd, amount: v })}
              placeholder="Amount"
            />
            <input
              className="rounded border px-3 py-2 text-sm"
              placeholder="Bank name"
              value={wd.bankName}
              onChange={(e) => setWd({ ...wd, bankName: e.target.value })}
            />
            <input
              className="rounded border px-3 py-2 text-sm"
              placeholder="Account number"
              value={wd.accountNumber}
              onChange={(e) => setWd({ ...wd, accountNumber: e.target.value })}
            />
            <input
              className="rounded border px-3 py-2 text-sm"
              placeholder="Confirm account number"
              value={wd.confirmAccountNumber}
              onChange={(e) => setWd({ ...wd, confirmAccountNumber: e.target.value })}
            />
            <input
              className="rounded border px-3 py-2 text-sm"
              placeholder="Account name"
              value={wd.accountName}
              onChange={(e) => setWd({ ...wd, accountName: e.target.value })}
            />
            <input
              type="password"
              className="rounded border px-3 py-2 text-sm"
              placeholder="Your transaction PIN"
              value={wd.pin}
              onChange={(e) => setWd({ ...wd, pin: e.target.value })}
            />
            {wdMsg && <p className="text-sm">{wdMsg}</p>}
            <button className="w-fit rounded bg-brand-orange px-4 py-2 text-sm font-medium text-white">
              {me?.biller.isJoint ? 'Submit for co-signer approval' : 'Withdraw'}
            </button>
          </form>
        )}
      </div>

      {/* PIN */}
      <div className="rounded-2xl border border-line bg-surface">
        <button
          onClick={() => setPinOpen((v) => !v)}
          className="flex w-full items-center justify-between px-6 py-4 text-left font-medium"
        >
          Transaction PIN <span>{pinOpen ? '−' : '+'}</span>
        </button>
        {pinOpen && (
          <form onSubmit={submitPin} className="flex flex-col gap-3 border-t border-line px-6 py-4 max-w-xs">
            {me?.pinSet && (
              <input
                type="password"
                className="rounded border px-3 py-2 text-sm"
                placeholder="Current PIN"
                value={pin.currentPin}
                onChange={(e) => setPin({ ...pin, currentPin: e.target.value })}
              />
            )}
            <input
              type="password"
              className="rounded border px-3 py-2 text-sm"
              placeholder="New 4-6 digit PIN"
              value={pin.pin}
              onChange={(e) => setPin({ ...pin, pin: e.target.value })}
            />
            {pinMsg && <p className="text-sm">{pinMsg}</p>}
            <button className="w-fit rounded bg-black px-4 py-2 text-sm font-medium text-white">Save PIN</button>
          </form>
        )}
      </div>

      <div>
        <h2 className="mb-3 font-medium">Recent activity</h2>
        <div className="flex flex-col gap-2">
          {statement?.items.map((item) => (
            <div key={item.id} className="flex items-center justify-between rounded-lg border border-line px-4 py-3 text-sm">
              <span>{item.transaction.type} · {new Date(item.createdAt).toLocaleString()}</span>
              <span className={item.direction === 'CREDIT' ? 'text-green-600' : 'text-red-600'}>
                {item.direction === 'CREDIT' ? '+' : '-'}₦{Number(item.amount).toLocaleString()}
              </span>
            </div>
          ))}
          {statement && statement.items.length === 0 && <p className="text-sm text-muted">No activity yet.</p>}
        </div>
      </div>
    </div>
  );
}
