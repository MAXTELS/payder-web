'use client';

import { useEffect, useState } from 'react';
import { api, ApiError } from '@/lib/api-client';

// Which admin-approval-needed events trigger a notification email, and to
// which manually-entered address(es). Backed by AdminNotificationService —
// 'ALL' is a shortcut that covers every category regardless of what else is
// checked, same as the backend treats it (see notify()'s
// categories.includes(category) || categories.includes('ALL') check).
const CATEGORY_OPTIONS: { value: string; label: string; hint: string }[] = [
  {
    value: 'PENDING_TRANSACTIONS',
    label: 'Pending transactions',
    hint: 'Wallet funding requests and manual invoice payments awaiting review.',
  },
  {
    value: 'WITHDRAWALS',
    label: 'Withdrawals only',
    hint: 'New withdrawal requests (customer and biller) awaiting payout.',
  },
  {
    value: 'SUPPORT',
    label: 'Support service',
    hint: 'New support tickets opened by customers.',
  },
  {
    value: 'ALL',
    label: 'All of the above',
    hint: 'Send every category to the address(es) below, regardless of what else is checked.',
  },
];

export default function AdminNotificationSettingsPage() {
  const [categories, setCategories] = useState<string[]>([]);
  const [emailsText, setEmailsText] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<Date | null>(null);

  useEffect(() => {
    api
      .adminGetNotificationSettings()
      .then((r) => {
        setCategories(r.categories ?? []);
        setEmailsText((r.emails ?? []).join('\n'));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function toggle(value: string) {
    setCategories((prev) => (prev.includes(value) ? prev.filter((c) => c !== value) : [...prev, value]));
  }

  async function save() {
    setError(null);
    const emails = emailsText
      .split(/[\n,]/)
      .map((e) => e.trim())
      .filter(Boolean);
    setSaving(true);
    try {
      const r = await api.adminSetNotificationSettings(categories, emails);
      setCategories(r.categories);
      setEmailsText(r.emails.join('\n'));
      setSavedAt(new Date());
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save notification settings.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">Notification settings</h1>
      <p className="max-w-2xl text-sm text-muted">
        Choose which events send you an email, and where. Nothing is sent unless at least one
        category is checked and at least one address is entered below.
      </p>

      {loading ? (
        <p className="text-sm text-muted">Loading…</p>
      ) : (
        <div className="max-w-2xl rounded-2xl border border-line bg-surface p-6 shadow-sm">
          <h2 className="text-sm font-semibold">Which mails to receive</h2>
          <div className="mt-3 flex flex-col gap-3">
            {CATEGORY_OPTIONS.map((opt) => (
              <label key={opt.value} className="flex items-start gap-3 text-sm">
                <input
                  type="checkbox"
                  className="mt-0.5"
                  checked={categories.includes(opt.value)}
                  onChange={() => toggle(opt.value)}
                />
                <span>
                  <span className="font-medium text-foreground">{opt.label}</span>
                  <span className="block text-xs text-muted">{opt.hint}</span>
                </span>
              </label>
            ))}
          </div>

          <h2 className="mt-6 text-sm font-semibold">Send to</h2>
          <p className="mt-1 text-xs text-muted">
            One email address per line (or comma-separated). All checked categories go to every
            address listed here.
          </p>
          <textarea
            className="mt-2 block w-full rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-brand-orange"
            rows={4}
            value={emailsText}
            onChange={(e) => setEmailsText(e.target.value)}
            placeholder={'e.g.\nfinance@payder.com\nsupport@payder.com'}
          />

          <div className="mt-4 flex items-center gap-3">
            <button
              onClick={save}
              disabled={saving}
              className="rounded-lg bg-black px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save settings'}
            </button>
            {savedAt && <span className="text-xs text-muted">Saved {savedAt.toLocaleTimeString()}</span>}
          </div>
          {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
        </div>
      )}
    </div>
  );
}
