'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, ApiError, SafeUser } from '@/lib/api-client';

export default function UsersPage() {
  const [items, setItems] = useState<SafeUser[]>([]);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState('');
  const [role, setRole] = useState('');
  const [showForm, setShowForm] = useState(false);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [creating, setCreating] = useState(false);
  const [createMessage, setCreateMessage] = useState<string | null>(null);
  const [tempPassword, setTempPassword] = useState<string | null>(null);

  function refresh() {
    api
      .adminUsersList({ q: q || undefined, role: role || undefined, take: 100 })
      .then((res) => {
        setItems(res.items);
        setTotal(res.total);
      })
      .catch(() => {
        setItems([]);
        setTotal(0);
      });
  }

  useEffect(refresh, [q, role]);

  async function createUser(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setCreateMessage(null);
    setTempPassword(null);
    try {
      const res = await api.adminUserCreate({ firstName, lastName, email, phone });
      setCreateMessage(`Account created for ${res.user.email}.`);
      setTempPassword(res.tempPassword ?? null);
      setFirstName('');
      setLastName('');
      setEmail('');
      setPhone('');
      refresh();
    } catch (err) {
      setCreateMessage(err instanceof ApiError ? err.message : 'Could not create account.');
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">User management</h1>
          <p className="mt-1 text-sm text-muted">{total} account(s).</p>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="rounded-lg bg-brand-navy px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-navy-light"
        >
          {showForm ? 'Cancel' : 'Create account'}
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={createUser}
          className="flex flex-col gap-4 rounded-2xl border border-line bg-surface p-6 shadow-sm sm:max-w-md"
        >
          <div className="flex gap-3">
            <label className="flex flex-1 flex-col gap-1 text-sm">
              First name
              <input
                className="rounded-lg border border-line px-3 py-2 outline-none focus:border-brand-orange"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
              />
            </label>
            <label className="flex flex-1 flex-col gap-1 text-sm">
              Last name
              <input
                className="rounded-lg border border-line px-3 py-2 outline-none focus:border-brand-orange"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
              />
            </label>
          </div>
          <label className="flex flex-col gap-1 text-sm">
            Email
            <input
              type="email"
              className="rounded-lg border border-line px-3 py-2 outline-none focus:border-brand-orange"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Phone
            <input
              className="rounded-lg border border-line px-3 py-2 outline-none focus:border-brand-orange"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+2348012345678"
              required
            />
          </label>
          <button
            type="submit"
            disabled={creating}
            className="rounded-lg bg-brand-orange px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-orange-dark disabled:opacity-50"
          >
            {creating ? 'Creating…' : 'Create account'}
          </button>
          {createMessage && <p className="text-sm text-foreground">{createMessage}</p>}
          {tempPassword && (
            <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
              Temporary password: <span className="font-mono font-semibold">{tempPassword}</span>{' '}
              — shown once, relay it to them directly.
            </p>
          )}
        </form>
      )}

      <div className="flex gap-3">
        <input
          className="flex-1 rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-brand-orange"
          placeholder="Search name, email, phone…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <select
          className="rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-brand-orange"
          value={role}
          onChange={(e) => setRole(e.target.value)}
        >
          <option value="">All roles</option>
          <option value="CUSTOMER">Customer</option>
          <option value="ADMIN">Admin</option>
          <option value="CUSTOMER_CARE">Customer care</option>
        </select>
      </div>

      <div className="overflow-hidden rounded-xl border border-line bg-surface shadow-sm">
        <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-line text-muted">
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Role</th>
              <th className="px-4 py-3 font-medium">KYC</th>
              <th className="px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {items.map((u) => (
              <tr key={u.id} className="border-b border-line last:border-0">
                <td className="px-4 py-3">
                  <Link href={`/admin/users/${u.id}`} className="font-medium text-foreground hover:underline">
                    {u.firstName} {u.lastName}
                  </Link>
                </td>
                <td className="px-4 py-3 text-muted">{u.email}</td>
                <td className="px-4 py-3 text-muted">{u.role}</td>
                <td className="px-4 py-3 text-muted">{u.kycTier}</td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2 py-1 text-xs font-medium ${
                      u.isActive ? 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                    }`}
                  >
                    {u.isActive ? 'Active' : 'Restricted'}
                  </span>
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-sm text-faint">
                  No accounts match.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
}
