'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { api, AuditLogEntry } from '@/lib/api-client';
import { PageLoader } from '@/components/PageLoader';

const ENTITY_FILTERS = ['', 'User', 'KycRecord', 'Provider', 'Wallet'];

function AuditLogContent() {
  const searchParams = useSearchParams();
  const actorId = searchParams.get('actorId') ?? undefined;

  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [targetEntity, setTargetEntity] = useState('');

  function refresh() {
    setLoading(true);
    api
      .adminAuditLogs({ actorId, targetEntity: targetEntity || undefined, take: 100 })
      .then(setLogs)
      .catch(() => setLogs([]))
      .finally(() => setLoading(false));
  }

  useEffect(refresh, [actorId, targetEntity]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Audit log</h1>
        <p className="mt-1 text-sm text-muted">
          Every admin/staff action taken in PAYDER — what, by whom, on what.
          {actorId && ' Filtered to one staff member.'}
        </p>
      </div>

      <select
        className="w-56 rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-brand-orange"
        value={targetEntity}
        onChange={(e) => setTargetEntity(e.target.value)}
      >
        {ENTITY_FILTERS.map((f) => (
          <option key={f} value={f}>
            {f || 'All entities'}
          </option>
        ))}
      </select>

      {loading ? (
        <PageLoader inline label="Loading audit log…" />
      ) : (
      <div className="overflow-hidden rounded-xl border border-line bg-surface shadow-sm">
        <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-line text-muted">
              <th className="px-4 py-3 font-medium">When</th>
              <th className="px-4 py-3 font-medium">Actor</th>
              <th className="px-4 py-3 font-medium">Action</th>
              <th className="px-4 py-3 font-medium">Target</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id} className="border-b border-line last:border-0 align-top">
                <td className="whitespace-nowrap px-4 py-3 text-xs text-faint">
                  {new Date(log.createdAt).toLocaleString()}
                </td>
                <td className="px-4 py-3 text-foreground">
                  {log.actor ? `${log.actor.firstName} ${log.actor.lastName}` : log.actorId}
                </td>
                <td className="px-4 py-3">
                  <span className="rounded-full bg-brand-orange-light px-2 py-1 text-xs font-medium text-brand-orange-dark">
                    {log.action}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-muted">
                  {log.targetEntity} · {log.targetId.slice(0, 8)}…
                </td>
              </tr>
            ))}
            {logs.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-sm text-faint">
                  No matching log entries.
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

export default function AuditLogPage() {
  return (
    <Suspense fallback={<p className="text-sm text-faint">Loading…</p>}>
      <AuditLogContent />
    </Suspense>
  );
}
