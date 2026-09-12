'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api-client';
import { PageLoader } from '@/components/PageLoader';

interface Ticket {
  id: string;
  category: string;
  status: string;
  createdAt: string;
}

export default function SupportPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [ticketsLoading, setTicketsLoading] = useState(true);
  const [category, setCategory] = useState('general');
  const [message, setMessage] = useState('');

  function refresh() {
    apiFetch<Ticket[]>('/support/tickets/mine')
      .then(setTickets)
      .catch(() => setTickets([]))
      .finally(() => setTicketsLoading(false));
  }

  useEffect(refresh, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    await apiFetch('/support/tickets', {
      method: 'POST',
      body: JSON.stringify({ category, message }),
    });
    setMessage('');
    refresh();
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">Support</h1>
      <form onSubmit={submit} className="flex max-w-md flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm">
          Category
          <select
            className="rounded border px-3 py-2"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="general">General</option>
            <option value="transaction">Failed/pending transaction</option>
            <option value="kyc">KYC / verification</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Message
          <textarea
            className="rounded border px-3 py-2"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={4}
          />
        </label>
        <button type="submit" className="rounded bg-black px-4 py-2 text-sm text-white">
          Submit ticket
        </button>
      </form>

      <div>
        <h2 className="mb-2 text-sm font-semibold text-muted">Your tickets</h2>
        {ticketsLoading ? (
          <PageLoader inline label="Loading your tickets…" />
        ) : (
          <ul className="flex flex-col gap-2">
            {tickets.map((t) => (
              <li key={t.id} className="rounded border p-3 text-sm">
                <span className="font-medium">{t.category}</span> — {t.status}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
