'use client';

import { useEffect, useState } from 'react';
import { api, ApiError, BillerSummary, BillerUserSummary } from '@/lib/api-client';
import { PageLoader } from '@/components/PageLoader';

const BILLER_TYPES: { value: 'SCHOOL' | 'CONTRIBUTION' | 'OTHER'; label: string }[] = [
  { value: 'SCHOOL', label: 'School' },
  { value: 'CONTRIBUTION', label: 'Contribution' },
  { value: 'OTHER', label: 'Other' },
];

type UserFormRow = {
  email: string;
  phone: string;
  firstName: string;
  lastName: string;
  nin: string;
};

const EMPTY_USER_ROW: UserFormRow = { email: '', phone: '', firstName: '', lastName: '', nin: '' };

/**
 * Admin "add a biller" page — single (one user, full unilateral access) or
 * joint (two users, A and B, who must both approve a withdrawal with their
 * own PIN before it reaches this same admin's withdrawal queue). See
 * biller-feature-spec.md (project doc) — this page is phase 1 only; the
 * bill builder, deposits, and reports come from the biller's own portal in
 * a later phase, not from here.
 */
export default function AdminBillersPage() {
  const [billers, setBillers] = useState<BillerSummary[]>([]);
  const [billersLoading, setBillersLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [type, setType] = useState<'SCHOOL' | 'CONTRIBUTION' | 'OTHER'>('SCHOOL');
  const [isJoint, setIsJoint] = useState(false);
  const [userA, setUserA] = useState<UserFormRow>(EMPTY_USER_ROW);
  const [userB, setUserB] = useState<UserFormRow>(EMPTY_USER_ROW);
  const [creating, setCreating] = useState(false);
  const [createMessage, setCreateMessage] = useState<string | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);
  const [tempPasswords, setTempPasswords] = useState<{ label: string; email: string; password: string }[]>(
    [],
  );

  function refresh() {
    api
      .adminBillersList()
      .then(setBillers)
      .catch(() => setBillers([]))
      .finally(() => setBillersLoading(false));
  }

  useEffect(refresh, []);

  function resetForm() {
    setName('');
    setType('SCHOOL');
    setIsJoint(false);
    setUserA(EMPTY_USER_ROW);
    setUserB(EMPTY_USER_ROW);
  }

  async function createBiller(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setCreateError(null);
    setCreateMessage(null);
    setTempPasswords([]);
    try {
      const users = isJoint ? [userA, userB] : [userA];
      const res = await api.adminBillerCreate({ name, type, isJoint, users });
      setCreateMessage(`"${res.biller.name}" created as a ${isJoint ? 'joint' : 'single'} biller.`);
      setTempPasswords(
        res.users
          .filter((u) => u.tempPassword)
          .map((u, i) => ({
            label: isJoint ? `Signer ${i === 0 ? 'A' : 'B'} (${u.email})` : u.email,
            email: u.email,
            password: u.tempPassword!,
          })),
      );
      resetForm();
      setShowForm(false);
      refresh();
    } catch (err) {
      setCreateError(err instanceof ApiError ? err.message : 'Could not create this biller.');
    } finally {
      setCreating(false);
    }
  }

  async function toggleActive(b: BillerSummary) {
    setBusyId(b.id);
    try {
      await api.adminBillerSetActive(b.id, !b.isActive);
      refresh();
    } finally {
      setBusyId(null);
    }
  }

  function userRowFields(
    label: string,
    row: UserFormRow,
    setRow: (row: UserFormRow) => void,
  ) {
    return (
      <div className="flex flex-col gap-3 rounded-xl border border-line p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</p>
        <div className="flex gap-3">
          <label className="flex flex-1 flex-col gap-1 text-sm">
            First name
            <input
              className="rounded-lg border border-line px-3 py-2 outline-none focus:border-brand-orange"
              value={row.firstName}
              onChange={(e) => setRow({ ...row, firstName: e.target.value })}
              required
            />
          </label>
          <label className="flex flex-1 flex-col gap-1 text-sm">
            Last name
            <input
              className="rounded-lg border border-line px-3 py-2 outline-none focus:border-brand-orange"
              value={row.lastName}
              onChange={(e) => setRow({ ...row, lastName: e.target.value })}
              required
            />
          </label>
        </div>
        <label className="flex flex-col gap-1 text-sm">
          Email
          <input
            type="email"
            className="rounded-lg border border-line px-3 py-2 outline-none focus:border-brand-orange"
            value={row.email}
            onChange={(e) => setRow({ ...row, email: e.target.value })}
            required
          />
        </label>
        <div className="flex gap-3">
          <label className="flex flex-1 flex-col gap-1 text-sm">
            Phone
            <input
              className="rounded-lg border border-line px-3 py-2 outline-none focus:border-brand-orange"
              value={row.phone}
              onChange={(e) => setRow({ ...row, phone: e.target.value })}
              placeholder="+2348012345678"
              required
            />
          </label>
          <label className="flex flex-1 flex-col gap-1 text-sm">
            NIN
            <input
              className="rounded-lg border border-line px-3 py-2 outline-none focus:border-brand-orange"
              value={row.nin}
              onChange={(e) => setRow({ ...row, nin: e.target.value })}
              placeholder="11 digits"
              maxLength={11}
              required
            />
          </label>
        </div>
      </div>
    );
  }

  function coSignerLabel(users: BillerUserSummary[], label: 'A' | 'B') {
    const u = users.find((x) => x.billerLabel === label);
    return u ? `${u.firstName} ${u.lastName} (${u.email})` : '—';
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Billers</h1>
          <p className="mt-1 max-w-lg text-sm text-muted">
            Organizations customers pay into (schools, contributions, etc). A joint biller has two
            signers who must both approve a withdrawal before it reaches this queue —
            see Withdrawals.
          </p>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="rounded-lg bg-brand-navy px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-navy-light"
        >
          {showForm ? 'Cancel' : 'Add a biller'}
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={createBiller}
          className="flex flex-col gap-4 rounded-2xl border border-line bg-surface p-6 shadow-sm sm:max-w-xl"
        >
          <div className="flex gap-3">
            <label className="flex flex-1 flex-col gap-1 text-sm">
              Biller name
              <input
                className="rounded-lg border border-line px-3 py-2 outline-none focus:border-brand-orange"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. University of Lagos"
                required
              />
            </label>
            <label className="flex flex-1 flex-col gap-1 text-sm">
              Type
              <select
                className="rounded-lg border border-line px-3 py-2 outline-none focus:border-brand-orange"
                value={type}
                onChange={(e) => setType(e.target.value as typeof type)}
              >
                {BILLER_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="flex gap-4 text-sm">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                checked={!isJoint}
                onChange={() => setIsJoint(false)}
              />
              Single — one account manages everything
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                checked={isJoint}
                onChange={() => setIsJoint(true)}
              />
              Joint — two accounts, both must approve withdrawals
            </label>
          </div>

          {userRowFields(isJoint ? 'Signer A' : 'Biller account', userA, setUserA)}
          {isJoint && userRowFields('Signer B', userB, setUserB)}

          <button
            type="submit"
            disabled={creating}
            className="rounded-lg bg-brand-orange px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-orange-dark disabled:opacity-50"
          >
            {creating ? 'Creating…' : 'Create biller'}
          </button>
          {createError && <p className="text-sm text-red-600 dark:text-red-400">{createError}</p>}
        </form>
      )}

      {createMessage && (
        <p className="rounded-lg bg-green-50 p-3 text-sm text-green-800 dark:bg-green-900/30 dark:text-green-300">
          {createMessage}
        </p>
      )}
      {tempPasswords.length > 0 && (
        <div className="flex flex-col gap-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
          <p>Temporary passwords — shown once, relay them directly:</p>
          {tempPasswords.map((t) => (
            <p key={t.email}>
              {t.label}: <span className="font-mono font-semibold">{t.password}</span>
            </p>
          ))}
        </div>
      )}

      {billersLoading ? (
        <PageLoader inline label="Loading billers…" />
      ) : (
      <div className="overflow-hidden rounded-xl border border-line bg-surface shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-line text-muted">
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Signers</th>
                <th className="px-4 py-3 font-medium">Balance</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {billers.map((b) => (
                <tr key={b.id} className="border-b border-line last:border-0">
                  <td className="px-4 py-3 text-foreground">{b.name}</td>
                  <td className="px-4 py-3 text-muted">{b.type}</td>
                  <td className="px-4 py-3 text-muted">
                    {b.isJoint ? (
                      <div className="flex flex-col text-xs">
                        <span>A: {coSignerLabel(b.users, 'A')}</span>
                        <span>B: {coSignerLabel(b.users, 'B')}</span>
                      </div>
                    ) : (
                      b.users[0]?.email ?? '—'
                    )}
                  </td>
                  <td className="px-4 py-3 text-foreground">
                    {b.balance !== null ? `NGN ${b.balance}` : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-medium ${
                        b.isActive
                          ? 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                          : 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                      }`}
                    >
                      {b.isActive ? 'Active' : 'Disabled'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => toggleActive(b)}
                      disabled={busyId === b.id}
                      className="text-xs font-medium text-brand-orange hover:underline disabled:opacity-50"
                    >
                      {b.isActive ? 'Disable' : 'Enable'}
                    </button>
                  </td>
                </tr>
              ))}
              {billers.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-sm text-faint">
                    No billers yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      )}
    </div>
  );
}
