'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, ApiError, SafeUser } from '@/lib/api-client';
import { PageLoader } from '@/components/PageLoader';

export default function StaffPage() {
  const [staff, setStaff] = useState<SafeUser[]>([]);
  const [staffLoading, setStaffLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<'ADMIN' | 'CUSTOMER_CARE'>('CUSTOMER_CARE');
  const [creating, setCreating] = useState(false);
  const [createMessage, setCreateMessage] = useState<string | null>(null);
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);

  function refresh() {
    api
      .adminStaffList()
      .then(setStaff)
      .catch(() => setStaff([]))
      .finally(() => setStaffLoading(false));
  }

  useEffect(refresh, []);

  async function createStaff(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setCreateMessage(null);
    setTempPassword(null);
    try {
      const res = await api.adminStaffCreate({ firstName, lastName, email, phone, role });
      setCreateMessage(`${res.user.firstName} ${res.user.lastName} created as ${res.user.role}.`);
      setTempPassword(res.tempPassword ?? null);
      setFirstName('');
      setLastName('');
      setEmail('');
      setPhone('');
      refresh();
    } catch (err) {
      setCreateMessage(err instanceof ApiError ? err.message : 'Could not create staff account.');
    } finally {
      setCreating(false);
    }
  }

  async function toggleActive(id: string, isActive: boolean) {
    setBusyId(id);
    try {
      await api.adminStaffSetActive(id, !isActive);
      refresh();
    } finally {
      setBusyId(null);
    }
  }

  async function changeRole(id: string, newRole: 'ADMIN' | 'CUSTOMER_CARE') {
    setBusyId(id);
    try {
      await api.adminStaffSetRole(id, newRole);
      refresh();
    } finally {
      setBusyId(null);
    }
  }

  async function setNewPassword(id: string, name: string) {
    const typed = prompt(
      `New password for ${name} (min 8 characters), or leave blank to generate a random temporary one:`,
    );
    if (typed === null) return; // cancelled
    if (typed && typed.length < 8) {
      setPasswordMessage('Password must be at least 8 characters.');
      return;
    }
    setBusyId(id);
    setPasswordMessage(null);
    try {
      const res = await api.adminUserSetPassword(id, typed || undefined);
      setPasswordMessage(
        res.tempPassword
          ? `${name}'s password reset. Temporary password: ${res.tempPassword} — relay it to them directly, shown once.`
          : `${name}'s password updated.`,
      );
    } catch (err) {
      setPasswordMessage(err instanceof ApiError ? err.message : 'Could not set a new password.');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Staff</h1>
          <p className="mt-1 text-sm text-muted">
            Admin and customer-care accounts. Creating one here is currently the only way to grant
            staff access.
          </p>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="rounded-lg bg-brand-navy px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-navy-light"
        >
          {showForm ? 'Cancel' : 'Add staff'}
        </button>
      </div>

      {passwordMessage && (
        <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">{passwordMessage}</p>
      )}

      {showForm && (
        <form
          onSubmit={createStaff}
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
          <label className="flex flex-col gap-1 text-sm">
            Role
            <select
              className="rounded-lg border border-line px-3 py-2 outline-none focus:border-brand-orange"
              value={role}
              onChange={(e) => setRole(e.target.value as 'ADMIN' | 'CUSTOMER_CARE')}
            >
              <option value="CUSTOMER_CARE">Customer care</option>
              <option value="ADMIN">Admin</option>
            </select>
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

      {staffLoading ? (
        <PageLoader inline label="Loading staff…" />
      ) : (
      <div className="overflow-hidden rounded-xl border border-line bg-surface shadow-sm">
        <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-line text-muted">
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Role</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {staff.map((s) => (
              <tr key={s.id} className="border-b border-line last:border-0">
                <td className="px-4 py-3 text-foreground">
                  {s.firstName} {s.lastName}
                </td>
                <td className="px-4 py-3 text-muted">{s.email}</td>
                <td className="px-4 py-3">
                  <select
                    value={s.role}
                    disabled={busyId === s.id}
                    onChange={(e) => changeRole(s.id, e.target.value as 'ADMIN' | 'CUSTOMER_CARE')}
                    className="rounded border border-line px-2 py-1 text-xs"
                  >
                    <option value="CUSTOMER_CARE">Customer care</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2 py-1 text-xs font-medium ${
                      s.isActive ? 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                    }`}
                  >
                    {s.isActive ? 'Active' : 'Deactivated'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-3">
                    <button
                      onClick={() => toggleActive(s.id, s.isActive)}
                      disabled={busyId === s.id}
                      className="text-xs font-medium text-brand-orange hover:underline disabled:opacity-50"
                    >
                      {s.isActive ? 'Deactivate' : 'Reactivate'}
                    </button>
                    <button
                      onClick={() => setNewPassword(s.id, `${s.firstName} ${s.lastName}`)}
                      disabled={busyId === s.id}
                      className="text-xs font-medium text-brand-orange hover:underline disabled:opacity-50"
                    >
                      Set password
                    </button>
                    <Link
                      href={`/admin/audit-log?actorId=${s.id}`}
                      className="text-xs font-medium text-muted hover:underline"
                    >
                      View logs
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
            {staff.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-sm text-faint">
                  No staff accounts yet.
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
