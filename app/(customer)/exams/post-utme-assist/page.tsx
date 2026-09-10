'use client';

import { useState } from 'react';
import Link from 'next/link';
import { api, ApiError } from '@/lib/api-client';

export default function PostUtmeAssistPage() {
  const [institutionName, setInstitutionName] = useState('');
  const [jambRegNumber, setJambRegNumber] = useState('');
  const [programme, setProgramme] = useState('');
  const [notes, setNotes] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      await api.postUtmeAssist({ institutionName, jambRegNumber, programme, notes });
      setMessage(
        'Request submitted. A customer-care agent will guide you through that institution’s ' +
          'current Post-UTME process — track it as a ticket under Support.',
      );
      setInstitutionName('');
      setJambRegNumber('');
      setProgramme('');
      setNotes('');
    } catch (err) {
      setMessage(err instanceof ApiError ? err.message : 'Submission failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">Post-UTME assistance</h1>
        <p className="mt-1 max-w-lg text-sm text-muted">
          Post-UTME registration is run independently by each institution on its own portal —
          there&apos;s no single API for it (architecture doc §5.5). Tell us where you&apos;re
          applying and a customer-care agent will guide you through that institution&apos;s current
          process by hand.
        </p>
        <p className="mt-1 text-sm">
          Just need a JAMB e-PIN?{' '}
          <Link href="/exams" className="underline">
            Back to exam pins
          </Link>
          .
        </p>
      </div>
      <form onSubmit={submit} className="flex max-w-sm flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm">
          Institution
          <input
            className="rounded border px-3 py-2"
            value={institutionName}
            onChange={(e) => setInstitutionName(e.target.value)}
            placeholder="e.g. University of Lagos"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          JAMB registration number
          <input
            className="rounded border px-3 py-2"
            value={jambRegNumber}
            onChange={(e) => setJambRegNumber(e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Programme / course
          <input
            className="rounded border px-3 py-2"
            value={programme}
            onChange={(e) => setProgramme(e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Anything else we should know? (optional)
          <textarea
            className="rounded border px-3 py-2"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
          />
        </label>
        <button
          type="submit"
          disabled={busy || !institutionName || !jambRegNumber || !programme}
          className="rounded bg-black px-4 py-2 text-sm text-white disabled:opacity-50"
        >
          {busy ? 'Submitting…' : 'Request assistance'}
        </button>
        {message && <p className="text-sm">{message}</p>}
      </form>
    </div>
  );
}
