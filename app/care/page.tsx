'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api-client';

interface Ticket {
  id: string;
  category: string;
  status: string;
  priority: string;
  createdAt: string;
}

export default function CarePage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [replies, setReplies] = useState<Record<string, string>>({});

  function refresh() {
    apiFetch<Ticket[]>('/support/tickets/queue').then(setTickets).catch(() => setTickets([]));
  }

  useEffect(refresh, []);

  async function reply(ticketId: string) {
    const body = replies[ticketId];
    if (!body) return;
    await apiFetch(`/support/tickets/${ticketId}/reply`, {
      method: 'POST',
      body: JSON.stringify({ body }),
    });
    setReplies((r) => ({ ...r, [ticketId]: '' }));
    refresh();
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Customer care queue</h1>
        <p className="mt-1 text-sm text-muted">
          Pre-approved actions only (resend receipt, requery a stuck transaction, unlock a
          PIN-locked wallet) — anything else escalates to admin. See architecture doc §10.
        </p>
      </div>
      <ul className="flex flex-col gap-3">
        {tickets.map((t) => (
          <li
            key={t.id}
            className="rounded-xl border border-line bg-surface p-4 shadow-sm transition hover:shadow-md"
          >
            <div className="mb-3 flex items-center justify-between text-sm">
              <span className="font-medium text-foreground">{t.category}</span>
              <span className="rounded-full bg-brand-orange-light px-2 py-1 text-xs font-medium text-brand-orange-dark">
                {t.status} · {t.priority}
              </span>
            </div>
            <div className="flex gap-2">
              <input
                className="flex-1 rounded-lg border border-line px-3 py-2 text-sm outline-none transition focus:border-brand-orange"
                placeholder="Reply…"
                value={replies[t.id] ?? ''}
                onChange={(e) => setReplies((r) => ({ ...r, [t.id]: e.target.value }))}
              />
              <button
                onClick={() => reply(t.id)}
                className="rounded-lg bg-brand-navy px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-navy-light"
              >
                Send
              </button>
            </div>
          </li>
        ))}
        {tickets.length === 0 && (
          <p className="rounded-xl border border-dashed border-line p-6 text-center text-sm text-faint">
            Queue is empty.
          </p>
        )}
      </ul>
    </div>
  );
}
