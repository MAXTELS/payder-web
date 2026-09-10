'use client';

import { useEffect, useState } from 'react';
import { api, ApiError } from '@/lib/api-client';

type KycMe = Awaited<ReturnType<typeof api.kycMe>>;

const STATUS_STYLES: Record<string, string> = {
  PENDING: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  APPROVED: 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  REJECTED: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

export default function KycPage() {
  const [me, setMe] = useState<KycMe | null>(null);
  const [loading, setLoading] = useState(true);

  const [channel, setChannel] = useState<'EMAIL' | 'PHONE'>('EMAIL');
  const [otpRequested, setOtpRequested] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpBusy, setOtpBusy] = useState(false);
  const [otpMessage, setOtpMessage] = useState<string | null>(null);

  const [dateOfBirth, setDateOfBirth] = useState('');
  const [address, setAddress] = useState('');
  const [nin, setNin] = useState('');
  const [submitBusy, setSubmitBusy] = useState(false);
  const [submitMessage, setSubmitMessage] = useState<string | null>(null);

  function refresh() {
    api
      .kycMe()
      .then(setMe)
      .catch(() => setMe(null))
      .finally(() => setLoading(false));
  }

  useEffect(refresh, []);

  const isVerified = !!(me?.emailVerifiedAt || me?.phoneVerifiedAt);

  async function requestOtp() {
    setOtpBusy(true);
    setOtpMessage(null);
    try {
      const res = await api.kycRequestOtp(channel);
      setOtpRequested(true);
      setOtpMessage(
        `Code sent to your ${channel === 'EMAIL' ? 'email' : 'phone'} — expires in ${res.expiresInMinutes} minutes. (Delivery isn't wired up to a real provider yet, so ask an admin to check the backend server log for the code.)`,
      );
    } catch (err) {
      setOtpMessage(err instanceof ApiError ? err.message : 'Could not send code.');
    } finally {
      setOtpBusy(false);
    }
  }

  async function confirmOtp(e: React.FormEvent) {
    e.preventDefault();
    setOtpBusy(true);
    setOtpMessage(null);
    try {
      await api.kycConfirmOtp(channel, otpCode);
      setOtpMessage('Verified.');
      setOtpCode('');
      refresh();
    } catch (err) {
      setOtpMessage(err instanceof ApiError ? err.message : 'Verification failed.');
    } finally {
      setOtpBusy(false);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitBusy(true);
    setSubmitMessage(null);
    try {
      await api.kycSubmit({ dateOfBirth, address, nin });
      setSubmitMessage('Submitted for review. We will let you know once it has been checked.');
      refresh();
    } catch (err) {
      setSubmitMessage(err instanceof ApiError ? err.message : 'Submission failed.');
    } finally {
      setSubmitBusy(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-faint">Loading…</p>;
  }

  const record = me?.record;
  const showForm = !record || record.status === 'REJECTED';

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Identity verification (KYC)</h1>
        <p className="mt-1 max-w-lg text-sm text-muted">
          Verify your email or phone, then tell us a bit more about you. An admin reviews every
          submission before it's approved.
        </p>
      </div>

      {record && (
        <div className="rounded-2xl border border-line bg-surface p-6 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <span
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                STATUS_STYLES[record.status] ?? 'bg-surface-hover text-neutral-700'
              }`}
            >
              {record.status}
            </span>
            <span className="text-xs text-faint">
              Submitted {new Date(record.createdAt).toLocaleString()}
            </span>
          </div>
          {record.status === 'PENDING' && (
            <p className="text-sm text-muted">
              Your submission is with an admin for review. This page will update once it's
              decided.
            </p>
          )}
          {record.status === 'APPROVED' && (
            <p className="text-sm text-muted">You're verified — nothing else to do here.</p>
          )}
          {record.status === 'REJECTED' && (
            <div className="text-sm">
              <p className="text-red-600">Rejected: {record.rejectionReason}</p>
              <p className="mt-1 text-muted">You can correct the details below and resubmit.</p>
            </div>
          )}
          {record.address && (
            <p className="mt-2 text-xs text-faint">
              {record.dateOfBirth && new Date(record.dateOfBirth).toLocaleDateString()} ·{' '}
              {record.address} · NIN {record.ninMasked}
            </p>
          )}
        </div>
      )}

      {showForm && (
        <>
          <div className="rounded-2xl border border-line bg-surface p-6 shadow-sm">
            <h2 className="mb-1 text-base font-semibold text-foreground">
              Step 1 — Verify your email or phone
            </h2>
            {isVerified ? (
              <p className="text-sm text-green-700">
                ✓ {me?.emailVerifiedAt ? 'Email' : 'Phone'} verified.
              </p>
            ) : (
              <div className="mt-3 flex flex-col gap-3 sm:max-w-sm">
                <div className="flex gap-2">
                  {(['EMAIL', 'PHONE'] as const).map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => {
                        setChannel(c);
                        setOtpRequested(false);
                        setOtpMessage(null);
                      }}
                      className={`rounded-lg border px-4 py-2 text-sm font-medium transition ${
                        channel === c
                          ? 'border-brand-orange bg-brand-orange-light text-brand-orange-dark'
                          : 'border-line text-muted hover:border-brand-orange/50'
                      }`}
                    >
                      {c === 'EMAIL' ? 'Email' : 'Phone'}
                    </button>
                  ))}
                </div>
                {!otpRequested ? (
                  <button
                    type="button"
                    onClick={requestOtp}
                    disabled={otpBusy}
                    className="rounded-lg bg-brand-orange px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-orange-dark disabled:opacity-50"
                  >
                    {otpBusy ? 'Sending…' : 'Send code'}
                  </button>
                ) : (
                  <form onSubmit={confirmOtp} className="flex flex-col gap-3">
                    <input
                      className="rounded-lg border border-line px-3 py-2 outline-none transition focus:border-brand-orange"
                      placeholder="6-digit code"
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value)}
                      maxLength={6}
                    />
                    <div className="flex gap-2">
                      <button
                        type="submit"
                        disabled={otpBusy || otpCode.length !== 6}
                        className="rounded-lg bg-brand-orange px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-orange-dark disabled:opacity-50"
                      >
                        {otpBusy ? 'Verifying…' : 'Verify'}
                      </button>
                      <button
                        type="button"
                        onClick={requestOtp}
                        disabled={otpBusy}
                        className="rounded-lg border border-line px-4 py-2 text-sm text-muted transition hover:bg-surface-hover"
                      >
                        Resend
                      </button>
                    </div>
                  </form>
                )}
                {otpMessage && <p className="text-sm text-muted">{otpMessage}</p>}
              </div>
            )}
          </div>

          <div className={`rounded-2xl border border-line bg-surface p-6 shadow-sm ${!isVerified ? 'opacity-50' : ''}`}>
            <h2 className="mb-3 text-base font-semibold text-foreground">
              Step 2 — Your details
            </h2>
            <form onSubmit={submit} className="flex flex-col gap-4 sm:max-w-sm">
              <label className="flex flex-col gap-1 text-sm">
                Date of birth
                <input
                  type="date"
                  disabled={!isVerified}
                  className="rounded-lg border border-line px-3 py-2 outline-none transition focus:border-brand-orange disabled:bg-surface-hover"
                  value={dateOfBirth}
                  onChange={(e) => setDateOfBirth(e.target.value)}
                  required
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                Home address
                <input
                  disabled={!isVerified}
                  className="rounded-lg border border-line px-3 py-2 outline-none transition focus:border-brand-orange disabled:bg-surface-hover"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Street, city, state"
                  required
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                NIN (11 digits)
                <input
                  disabled={!isVerified}
                  className="rounded-lg border border-line px-3 py-2 outline-none transition focus:border-brand-orange disabled:bg-surface-hover"
                  value={nin}
                  onChange={(e) => setNin(e.target.value.replace(/\D/g, ''))}
                  maxLength={11}
                  required
                />
              </label>
              <button
                type="submit"
                disabled={!isVerified || submitBusy || nin.length !== 11}
                className="rounded-lg bg-brand-orange px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-orange-dark disabled:opacity-50"
              >
                {submitBusy ? 'Submitting…' : 'Submit for review'}
              </button>
              {submitMessage && <p className="text-sm text-foreground">{submitMessage}</p>}
            </form>
          </div>
        </>
      )}
    </div>
  );
}
