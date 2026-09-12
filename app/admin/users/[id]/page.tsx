'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api, ApiError } from '@/lib/api-client';

type Detail = Awaited<ReturnType<typeof api.adminUserDetail>>;

export default function UserDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params.id;

  const [detail, setDetail] = useState<Detail | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const [editing, setEditing] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  function refresh() {
    api
      .adminUserDetail(id)
      .then((d) => {
        setDetail(d);
        setFirstName(d.user.firstName);
        setLastName(d.user.lastName);
        setEmail(d.user.email);
        setPhone(d.user.phone);
      })
      .catch(() => setDetail(null));
  }

  useEffect(refresh, [id]);

  async function saveDetails(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      await api.adminUserUpdate(id, { firstName, lastName, email, phone });
      setEditing(false);
      setMessage('Details updated.');
      refresh();
    } catch (err) {
      setMessage(err instanceof ApiError ? err.message : 'Update failed.');
    } finally {
      setBusy(false);
    }
  }

  async function toggleRestrict() {
    if (!detail) return;
    setBusy(true);
    try {
      if (detail.user.isActive) {
        const reason = prompt('Reason for restricting this account?') ?? undefined;
        await api.adminUserRestrict(id, reason);
      } else {
        await api.adminUserUnrestrict(id);
      }
      refresh();
    } finally {
      setBusy(false);
    }
  }

  async function toggleFreeze() {
    if (!detail?.wallet) return;
    setBusy(true);
    try {
      if (detail.wallet.isFrozen) await api.adminUserUnfreezeWallet(id);
      else await api.adminUserFreezeWallet(id);
      refresh();
    } finally {
      setBusy(false);
    }
  }

  async function deleteAccount() {
    if (!confirm('Delete this account? If it has related records (wallet, transactions, KYC, etc.) it will be deactivated instead.')) return;
    setBusy(true);
    setMessage(null);
    try {
      const res = await api.adminUserDelete(id);
      if (res.deleted) {
        router.push('/admin/users');
        return;
      }
      // Deactivated instead of hard-deleted — stay on the page and explain why.
      setMessage(res.reason ?? 'Could not be permanently deleted — deactivated instead.');
      refresh();
    } catch (err) {
      setMessage(err instanceof ApiError ? err.message : 'Delete failed.');
    } finally {
      setBusy(false);
    }
  }

  async function setNewPassword() {
    const typed = prompt(
      'Type a new password for this account (min 8 characters), or leave blank to generate a random temporary one:',
    );
    if (typed === null) return; // cancelled
    if (typed && typed.length < 8) {
      setMessage('Password must be at least 8 characters.');
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const res = await api.adminUserSetPassword(id, typed || undefined);
      setMessage(
        res.tempPassword
          ? `Password reset. Temporary password: ${res.tempPassword} — relay it to them directly, shown once.`
          : 'Password updated.',
      );
    } catch (err) {
      setMessage(err instanceof ApiError ? err.message : 'Could not set a new password.');
    } finally {
      setBusy(false);
    }
  }

  if (!detail) return <p className="text-sm text-faint">Loading…</p>;

  const { user, wallet, transactions, kycRecords, supportTickets, auditLogs } = detail;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">
            {user.firstName} {user.lastName}
          </h1>
          <p className="mt-1 text-sm text-muted">
            {user.email} · {user.phone} · {user.role}
          </p>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs font-medium ${
            user.isActive
              ? 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400'
              : 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400'
          }`}
        >
          {user.isActive ? 'Active' : 'Restricted'}
        </span>
      </div>

      {message && <p className="text-sm text-foreground">{message}</p>}

      <div className="flex flex-wrap gap-3">
        <button
          onClick={() => setEditing((v) => !v)}
          className="rounded-lg border border-line px-4 py-2 text-sm font-medium text-foreground transition hover:bg-surface-hover"
        >
          {editing ? 'Cancel edit' : 'Correct details'}
        </button>
        <button
          onClick={toggleRestrict}
          disabled={busy}
          className="rounded-lg border border-line px-4 py-2 text-sm font-medium text-foreground transition hover:bg-surface-hover disabled:opacity-50"
        >
          {user.isActive ? 'Restrict account' : 'Remove restriction'}
        </button>
        {wallet && (
          <button
            onClick={toggleFreeze}
            disabled={busy}
            className="rounded-lg border border-line px-4 py-2 text-sm font-medium text-foreground transition hover:bg-surface-hover disabled:opacity-50"
          >
            {wallet.isFrozen ? 'Unfreeze wallet' : 'Freeze wallet'}
          </button>
        )}
        <button
          onClick={setNewPassword}
          disabled={busy}
          className="rounded-lg border border-line px-4 py-2 text-sm font-medium text-foreground transition hover:bg-surface-hover disabled:opacity-50"
        >
          Set new password
        </button>
        <button
          onClick={deleteAccount}
          disabled={busy}
          className="rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-50 dark:border-red-900/50 dark:text-red-400 dark:hover:bg-red-900/20"
        >
          Delete account
        </button>
      </div>

      {editing && (
        <form
          onSubmit={saveDetails}
          className="flex flex-col gap-4 rounded-2xl border border-line bg-surface p-6 shadow-sm sm:max-w-md"
        >
          <div className="flex gap-3">
            <label className="flex flex-1 flex-col gap-1 text-sm">
              First name
              <input
                className="rounded-lg border border-line px-3 py-2 outline-none focus:border-brand-orange"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
              />
            </label>
            <label className="flex flex-1 flex-col gap-1 text-sm">
              Last name
              <input
                className="rounded-lg border border-line px-3 py-2 outline-none focus:border-brand-orange"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
              />
            </label>
          </div>
          <label className="flex flex-col gap-1 text-sm">
            Email
            <input
              className="rounded-lg border border-line px-3 py-2 outline-none focus:border-brand-orange"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Phone
            <input
              className="rounded-lg border border-line px-3 py-2 outline-none focus:border-brand-orange"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </label>
          <button
            type="submit"
            disabled={busy}
            className="rounded-lg bg-brand-orange px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-orange-dark disabled:opacity-50"
          >
            Save
          </button>
        </form>
      )}

      {wallet && (
        <div className="rounded-2xl border border-line bg-surface p-6 shadow-sm">
          <p className="text-sm text-muted">Wallet balance</p>
          <p className="mt-1 text-2xl font-semibold text-foreground">
            {wallet.currency} {wallet.balance ?? '0.00'}
          </p>
          {wallet.isFrozen && (
            <p className="mt-2 text-xs font-medium text-red-600 dark:text-red-400">Wallet is frozen — no debits can occur.</p>
          )}
        </div>
      )}

      <div>
        <h2 className="mb-3 text-sm font-semibold text-muted">KYC history</h2>
        {kycRecords.length === 0 ? (
          <p className="text-sm text-faint">No KYC submissions.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {kycRecords.map((k) => (
              <li key={k.id} className="rounded-xl border border-line bg-surface p-4 text-sm">
                <p className="font-medium text-foreground">
                  {k.tier} · {k.status} · {new Date(k.createdAt).toLocaleDateString()}
                </p>
                {k.rejectionReason && (
                  <p className="text-xs text-red-600 dark:text-red-400">Rejected: {k.rejectionReason}</p>
                )}
                <dl className="mt-2 grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
                  <div>
                    <dt className="text-muted">Date of birth</dt>
                    <dd className="text-foreground">
                      {k.dateOfBirth ? new Date(k.dateOfBirth).toLocaleDateString() : '—'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted">NIN</dt>
                    <dd className="font-mono text-foreground">{k.nin ?? '—'}</dd>
                  </div>
                  <div className="sm:col-span-2">
                    <dt className="text-muted">Address</dt>
                    <dd className="text-foreground">{k.address ?? '—'}</dd>
                  </div>
                  <div>
                    <dt className="text-muted">ID document</dt>
                    <dd className="text-foreground">
                      {k.documentUrl ? (
                        <a href={k.documentUrl} target="_blank" rel="noreferrer" className="underline">
                          View upload
                        </a>
                      ) : (
                        'Not submitted'
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted">Liveness check</dt>
                    <dd className="text-foreground">{k.livenessResult ?? 'Not run'}</dd>
                  </div>
                  {k.verifiedAt && (
                    <div>
                      <dt className="text-muted">Reviewed</dt>
                      <dd className="text-foreground">{new Date(k.verifiedAt).toLocaleString()}</dd>
                    </div>
                  )}
                </dl>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold text-muted">Recent transactions</h2>
        {transactions.length === 0 ? (
          <p className="text-sm text-faint">No transactions.</p>
        ) : (
          <div className="overflow-hidden rounded-xl border border-line bg-surface shadow-sm">
            <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <tbody>
                {transactions.map((t) => (
                  <tr key={t.id} className="border-b border-line last:border-0">
                    <td className="px-4 py-3 text-foreground">{t.type}</td>
                    <td className="px-4 py-3 text-muted">{new Date(t.createdAt).toLocaleString()}</td>
                    <td className="px-4 py-3 text-right font-medium text-foreground">{t.amount}</td>
                    <td className="px-4 py-3 text-right text-muted">{t.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>
        )}
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold text-muted">Support tickets</h2>
        {supportTickets.length === 0 ? (
          <p className="text-sm text-faint">No tickets.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {supportTickets.map((t) => (
              <li key={t.id} className="rounded-xl border border-line bg-surface p-4 text-sm">
                {t.category} · {t.status} · {new Date(t.createdAt).toLocaleDateString()}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold text-muted">Admin actions on this account</h2>
        {auditLogs.length === 0 ? (
          <p className="text-sm text-faint">No admin actions recorded.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {auditLogs.map((log) => (
              <li key={log.id} className="rounded-xl border border-line bg-surface p-4 text-sm">
                <span className="font-medium text-foreground">{log.action}</span>
                <span className="text-faint"> · {new Date(log.createdAt).toLocaleString()}</span>
                {log.actor && (
                  <span className="text-muted"> · by {log.actor.firstName} {log.actor.lastName}</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
