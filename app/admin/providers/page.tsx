'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api-client';
import { PageLoader } from '@/components/PageLoader';

interface Provider {
  id: string;
  name: string;
  type: string;
  isActive: boolean;
  priority: number;
}

export default function ProvidersPage() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);

  function refresh() {
    apiFetch<Provider[]>('/admin/providers')
      .then(setProviders)
      .catch(() => setProviders([]))
      .finally(() => setLoading(false));
  }

  useEffect(refresh, []);

  async function toggle(p: Provider) {
    await apiFetch(`/admin/providers/${p.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ isActive: !p.isActive }),
    });
    refresh();
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">Providers</h1>
      <p className="max-w-lg text-sm text-muted">
        Enable/disable a payment or VTU provider (e.g. failing over off VTpass
        if it starts erroring). Pricing/markup editing per product is the
        next piece to build here — see architecture doc §7 (ProductCatalog).
      </p>
      {loading ? (
        <PageLoader inline label="Loading providers…" />
      ) : (
      <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b text-muted">
            <th className="py-2">Name</th>
            <th>Type</th>
            <th>Priority</th>
            <th>Status</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {providers.map((p) => (
            <tr key={p.id} className="border-b">
              <td className="py-2">{p.name}</td>
              <td>{p.type}</td>
              <td>{p.priority}</td>
              <td>{p.isActive ? 'Active' : 'Disabled'}</td>
              <td>
                <button
                  onClick={() => toggle(p)}
                  className="rounded border px-3 py-1 text-xs"
                >
                  {p.isActive ? 'Disable' : 'Enable'}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
      )}
    </div>
  );
}
