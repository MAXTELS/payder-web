'use client';

import { useEffect, useState } from 'react';
import { api, ApiError, BillDefinition, BillFieldInput } from '@/lib/api-client';
import { PageLoader } from '@/components/PageLoader';

function allCombinationKeys(fields: BillFieldInput[]): string[] {
  const selects = fields.filter((f) => f.type === 'SELECT' && (f.options?.length ?? 0) > 0);
  if (selects.length === 0) return [];
  let combos: string[][] = [[]];
  for (const field of selects) {
    const next: string[][] = [];
    for (const combo of combos) {
      for (const opt of field.options ?? []) next.push([...combo, opt]);
    }
    combos = next;
  }
  return combos.map((c) => c.join('|'));
}

type FieldRow = BillFieldInput & { optionsRaw?: string };

export default function BillBuilderPage() {
  const [existing, setExisting] = useState<BillDefinition | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [name, setName] = useState('');
  const [fields, setFields] = useState<FieldRow[]>([
    { key: '', label: '', type: 'TEXT' },
  ]);
  const [pricingMode, setPricingMode] = useState<'FLAT' | 'PER_COMBINATION'>('FLAT');
  const [flatAmount, setFlatAmount] = useState('');
  const [pricingTable, setPricingTable] = useState<Record<string, number>>({});
  const [bulkPrice, setBulkPrice] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [editReason, setEditReason] = useState('');

  useEffect(() => {
    api
      .billerGetBill()
      .then((bill) => {
        setExisting(bill);
        if (bill) {
          setName(bill.name);
          setFields(
            bill.fields.map((f) => ({ ...f, optionsRaw: (f.options ?? []).join(', ') })),
          );
          setPricingMode(bill.pricingMode);
          setFlatAmount(bill.flatAmount ?? '');
          setPricingTable(bill.pricingTable ?? {});
        }
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  const locked = existing?.status === 'PUBLISHED' && !existing.oneTimeEditUnlockedAt;
  const combos = allCombinationKeys(fields);

  function updateField(i: number, patch: Partial<FieldRow>) {
    setFields(fields.map((f, idx) => (idx === i ? { ...f, ...patch } : f)));
  }

  function updateOptions(i: number, raw: string) {
    const options = raw.split(',').map((s) => s.trim()).filter(Boolean);
    updateField(i, { options, optionsRaw: raw });
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    try {
      const saved = await api.billerUpsertBill({
        name,
        fields: fields.map(({ optionsRaw, ...f }) => f),
        pricingMode,
        flatAmount: pricingMode === 'FLAT' ? Number(flatAmount) : undefined,
        pricingTable: pricingMode === 'PER_COMBINATION' ? pricingTable : undefined,
      });
      setExisting(saved);
      setMsg('Saved.');
    } catch (err) {
      setMsg(err instanceof ApiError ? err.message : 'Something went wrong.');
    }
  }

  async function publish() {
    setMsg(null);
    try {
      const saved = await api.billerPublishBill();
      setExisting(saved);
      setMsg('Published — customers can now see and pay this bill.');
    } catch (err) {
      setMsg(err instanceof ApiError ? err.message : 'Something went wrong.');
    }
  }

  async function requestEdit() {
    setMsg(null);
    try {
      await api.billerRequestBillEdit(editReason || undefined);
      setMsg('Request sent to support — an admin will review it and can unlock one edit.');
      setEditReason('');
    } catch (err) {
      setMsg(err instanceof ApiError ? err.message : 'Something went wrong.');
    }
  }

  if (!loaded) return <PageLoader label="Loading your bill…" />;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">My bill</h1>
      <p className="max-w-2xl text-sm text-muted">
        Each biller processes exactly one bill. Once published it's locked — a
        correction needs a support request, which an admin can approve for a
        one-time edit.
      </p>

      {existing && (
        <p className="text-sm">
          Status:{' '}
          <span className={existing.status === 'PUBLISHED' ? 'text-green-600' : 'text-amber-600'}>
            {existing.status}
          </span>
          {existing.oneTimeEditUnlockedAt && (
            <span className="ml-2 text-amber-600">(one-time edit unlocked — save your correction now)</span>
          )}
        </p>
      )}

      {locked ? (
        <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4">
          <p className="text-sm text-amber-800">
            This bill is published and locked. Request a one-time edit from support if you need to correct something.
          </p>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <input
              className="flex-1 rounded border px-3 py-2 text-sm"
              placeholder="What needs to change? (optional)"
              value={editReason}
              onChange={(e) => setEditReason(e.target.value)}
            />
            <button onClick={requestEdit} className="rounded bg-black px-4 py-2 text-sm text-white">
              Request edit
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={save} className="flex flex-col gap-5 rounded-2xl border border-line bg-surface p-6">
          <label className="flex flex-col gap-1 text-sm">
            Bill name
            <input
              className="rounded border px-3 py-2"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </label>

          <div>
            <p className="mb-2 text-sm font-medium">Data fields customers fill in</p>
            <div className="flex flex-col gap-3">
              {fields.map((f, i) => (
                <div key={i} className="flex flex-col gap-2 rounded-lg border border-line p-3 sm:flex-row sm:items-start">
                  <input
                    className="rounded border px-2 py-1.5 text-sm sm:w-32"
                    placeholder="key (e.g. regNo)"
                    value={f.key}
                    onChange={(e) => updateField(i, { key: e.target.value })}
                  />
                  <input
                    className="rounded border px-2 py-1.5 text-sm sm:flex-1"
                    placeholder="Label shown to customer"
                    value={f.label}
                    onChange={(e) => updateField(i, { label: e.target.value })}
                  />
                  <select
                    className="rounded border px-2 py-1.5 text-sm"
                    value={f.type}
                    onChange={(e) => updateField(i, { type: e.target.value as 'TEXT' | 'SELECT' })}
                  >
                    <option value="TEXT">Text</option>
                    <option value="SELECT">Select (choose from a list)</option>
                  </select>
                  {f.type === 'SELECT' && (
                    <input
                      className="rounded border px-2 py-1.5 text-sm sm:flex-1"
                      placeholder="Options, comma separated (e.g. 100L,200L,300L)"
                      value={f.optionsRaw ?? (f.options ?? []).join(', ')}
                      onChange={(e) => updateOptions(i, e.target.value)}
                    />
                  )}
                  <button
                    type="button"
                    onClick={() => setFields(fields.filter((_, idx) => idx !== i))}
                    className="text-sm text-red-600"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setFields([...fields, { key: '', label: '', type: 'TEXT' }])}
              className="mt-2 text-sm text-brand-orange underline"
            >
              + Add field
            </button>
          </div>

          <div>
            <p className="mb-2 text-sm font-medium">Pricing</p>
            <div className="flex gap-4 text-sm">
              <label className="flex items-center gap-1.5">
                <input
                  type="radio"
                  checked={pricingMode === 'FLAT'}
                  onChange={() => setPricingMode('FLAT')}
                />
                One flat amount
              </label>
              <label className="flex items-center gap-1.5">
                <input
                  type="radio"
                  checked={pricingMode === 'PER_COMBINATION'}
                  onChange={() => setPricingMode('PER_COMBINATION')}
                />
                Price per combination of selections
              </label>
            </div>

            {pricingMode === 'FLAT' ? (
              <input
                className="mt-3 w-48 rounded border px-3 py-2 text-sm"
                placeholder="Amount (₦)"
                value={flatAmount}
                onChange={(e) => setFlatAmount(e.target.value)}
              />
            ) : combos.length === 0 ? (
              <p className="mt-2 text-sm text-muted">
                Add at least one "Select" field with options to price combinations.
              </p>
            ) : (
              <div className="mt-3 flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <input
                    className="w-40 rounded border px-3 py-2 text-sm"
                    placeholder="Set all to ₦"
                    value={bulkPrice}
                    onChange={(e) => setBulkPrice(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const amount = Number(bulkPrice);
                      if (!amount) return;
                      const next: Record<string, number> = {};
                      combos.forEach((c) => (next[c] = amount));
                      setPricingTable(next);
                    }}
                    className="rounded border px-3 py-1.5 text-sm"
                  >
                    Apply to all
                  </button>
                </div>
                <div className="flex flex-col gap-1">
                  {combos.map((c) => (
                    <div key={c} className="flex items-center justify-between gap-3 text-sm">
                      <span className="text-muted">{c.split('|').join(' / ')}</span>
                      <input
                        className="w-32 rounded border px-2 py-1 text-right text-sm"
                        placeholder="₦"
                        value={pricingTable[c] ?? ''}
                        onChange={(e) =>
                          setPricingTable({ ...pricingTable, [c]: Number(e.target.value) })
                        }
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {msg && <p className="text-sm">{msg}</p>}

          <div className="flex gap-3">
            <button className="rounded bg-black px-4 py-2 text-sm font-medium text-white">Save</button>
            {existing && (
              <button type="button" onClick={publish} className="rounded bg-brand-orange px-4 py-2 text-sm font-medium text-white">
                Publish
              </button>
            )}
          </div>
        </form>
      )}
      {msg && locked && <p className="text-sm">{msg}</p>}
    </div>
  );
}
