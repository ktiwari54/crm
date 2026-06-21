'use client';

import { useState } from 'react';
import { useFetch } from '@/hooks/useFetch';
import { apiFetch } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/format';
import { PageHeader } from '@/components/ui/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { LoadingState } from '@/components/ui/LoadingState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Modal } from '@/components/ui/Modal';
import { FormField, inputClass, selectClass, btnPrimary, btnSecondary } from '@/components/ui/FormField';

type Item = {
  id: string;
  description: string;
  quantity: string;
  unitPrice: string;
  product: { sku: string; name: string } | null;
};

type Subscription = {
  id: string;
  subscriptionNumber: string;
  name: string;
  status: string;
  interval: string;
  intervalCount: number;
  nextBillingDate: string | null;
  currentPeriodEnd: string | null;
  autoRenew: boolean;
  account: { id: string; name: string };
  items: Item[];
  _count: { invoices: number };
};

type Account = { id: string; name: string };

const INTERVALS = ['weekly', 'monthly', 'quarterly', 'semiannual', 'annual'];

function statusVariant(status: string): 'green' | 'yellow' | 'red' | 'blue' | 'default' {
  if (status === 'active') return 'green';
  if (status === 'trialing') return 'blue';
  if (status === 'paused') return 'yellow';
  if (status === 'canceled' || status === 'past_due') return 'red';
  return 'default';
}

function mrr(sub: Subscription): number {
  const perCycle = sub.items.reduce((s, i) => s + Number(i.quantity) * Number(i.unitPrice), 0);
  const monthsPerCycle: Record<string, number> = {
    weekly: 0.25,
    monthly: 1,
    quarterly: 3,
    semiannual: 6,
    annual: 12,
  };
  const months = (monthsPerCycle[sub.interval] ?? 1) * sub.intervalCount;
  return perCycle / months;
}

export default function SubscriptionsPage() {
  const { data, loading, error, reload } = useFetch<Subscription[]>('/subscriptions');
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState('');

  const totalMrr = (data ?? []).filter((s) => s.status === 'active' || s.status === 'trialing').reduce((s, sub) => s + mrr(sub), 0);

  async function action(path: string, body?: unknown) {
    setBusy(path);
    try {
      await apiFetch(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined });
      await reload();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setBusy('');
    }
  }

  return (
    <div className="p-8">
      <PageHeader title="Subscriptions" description="Recurring revenue, billing cycles, and auto-invoicing" />

      <div className="mb-6 flex items-center gap-4">
        <div className="rounded-xl border border-slate-200 bg-white px-5 py-3 shadow-sm">
          <p className="text-xs uppercase text-slate-500">Active MRR</p>
          <p className="text-2xl font-semibold text-slate-900">{formatCurrency(totalMrr)}</p>
        </div>
        <button type="button" className={btnPrimary} onClick={() => setCreating(true)}>+ New Subscription</button>
        <button
          type="button"
          className={btnSecondary}
          disabled={busy === '/subscriptions/run-billing'}
          onClick={() => action('/subscriptions/run-billing', {})}
        >
          {busy === '/subscriptions/run-billing' ? 'Running…' : 'Run Billing Now'}
        </button>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        {loading ? <LoadingState /> : null}
        {error ? <ErrorState message={error} onRetry={reload} /> : null}
        {!loading && !error && data && data.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-6 py-3">Subscription</th>
                  <th className="px-6 py-3">Account</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Cycle</th>
                  <th className="px-6 py-3 text-right">MRR</th>
                  <th className="px-6 py-3">Next Bill</th>
                  <th className="px-6 py-3 text-right">Invoices</th>
                  <th className="px-6 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.map((sub) => (
                  <tr key={sub.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-900">{sub.name}</div>
                      <div className="font-mono text-xs text-slate-500">{sub.subscriptionNumber}</div>
                    </td>
                    <td className="px-6 py-4">{sub.account.name}</td>
                    <td className="px-6 py-4"><Badge variant={statusVariant(sub.status)}>{sub.status}</Badge></td>
                    <td className="px-6 py-4 text-slate-600">
                      every {sub.intervalCount > 1 ? `${sub.intervalCount} ` : ''}{sub.interval.replace(/s?$/, sub.intervalCount > 1 ? 's' : '')}
                    </td>
                    <td className="px-6 py-4 text-right font-medium">{formatCurrency(mrr(sub))}</td>
                    <td className="px-6 py-4">{formatDate(sub.nextBillingDate)}</td>
                    <td className="px-6 py-4 text-right text-slate-600">{sub._count.invoices}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-xs">
                      {sub.status !== 'canceled' ? (
                        <button type="button" className="font-medium text-blue-600 hover:underline" disabled={!!busy} onClick={() => action(`/subscriptions/${sub.id}/generate-invoice`)}>
                          Bill now
                        </button>
                      ) : null}
                      {sub.status === 'active' || sub.status === 'trialing' ? (
                        <button type="button" className="ml-3 font-medium text-amber-600 hover:underline" disabled={!!busy} onClick={() => action(`/subscriptions/${sub.id}/status`, { status: 'paused' })}>
                          Pause
                        </button>
                      ) : sub.status === 'paused' ? (
                        <button type="button" className="ml-3 font-medium text-emerald-600 hover:underline" disabled={!!busy} onClick={() => action(`/subscriptions/${sub.id}/status`, { status: 'active' })}>
                          Resume
                        </button>
                      ) : null}
                      {sub.status !== 'canceled' ? (
                        <button type="button" className="ml-3 font-medium text-red-600 hover:underline" disabled={!!busy} onClick={() => { if (confirm('Cancel this subscription?')) action(`/subscriptions/${sub.id}/status`, { status: 'canceled' }); }}>
                          Cancel
                        </button>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : !loading && !error ? (
          <p className="px-6 py-12 text-center text-sm text-slate-400">No subscriptions yet.</p>
        ) : null}
      </div>

      {creating ? <CreateModal onClose={() => setCreating(false)} onSaved={() => { setCreating(false); void reload(); }} /> : null}
    </div>
  );
}

function CreateModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const accounts = useFetch<Account[]>('/accounts');
  const [accountId, setAccountId] = useState('');
  const [name, setName] = useState('');
  const [interval, setInterval] = useState('monthly');
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [items, setItems] = useState([{ description: '', quantity: '1', unitPrice: '' }]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  function updateItem(idx: number, field: string, value: string) {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, [field]: value } : it)));
  }

  async function submit() {
    setSaving(true);
    setError('');
    try {
      await apiFetch('/subscriptions', {
        method: 'POST',
        body: JSON.stringify({
          accountId,
          name,
          interval,
          startDate,
          items: items
            .filter((it) => it.description && it.unitPrice)
            .map((it) => ({ description: it.description, quantity: Number(it.quantity), unitPrice: Number(it.unitPrice) })),
        }),
      });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create subscription');
    } finally {
      setSaving(false);
    }
  }

  const valid = accountId && name && items.some((it) => it.description && it.unitPrice);

  return (
    <Modal open title="New subscription" onClose={onClose}>
      <div className="space-y-4">
        <FormField label="Account">
          <select className={selectClass} value={accountId} onChange={(e) => setAccountId(e.target.value)}>
            <option value="">Select account…</option>
            {(accounts.data ?? []).map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
        </FormField>
        <FormField label="Name">
          <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Managed Support — Monthly" />
        </FormField>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Interval">
            <select className={selectClass} value={interval} onChange={(e) => setInterval(e.target.value)}>
              {INTERVALS.map((i) => <option key={i} value={i}>{i}</option>)}
            </select>
          </FormField>
          <FormField label="Start date">
            <input type="date" className={inputClass} value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </FormField>
        </div>
        <div>
          <p className="mb-1.5 text-sm font-medium text-slate-700">Line items</p>
          <div className="space-y-2">
            {items.map((it, idx) => (
              <div key={idx} className="flex gap-2">
                <input className={`${inputClass} flex-1`} placeholder="Description" value={it.description} onChange={(e) => updateItem(idx, 'description', e.target.value)} />
                <input className={`${inputClass} w-16`} type="number" placeholder="Qty" value={it.quantity} onChange={(e) => updateItem(idx, 'quantity', e.target.value)} />
                <input className={`${inputClass} w-24`} type="number" placeholder="Price" value={it.unitPrice} onChange={(e) => updateItem(idx, 'unitPrice', e.target.value)} />
              </div>
            ))}
          </div>
          <button type="button" className="mt-2 text-xs font-medium text-blue-600 hover:underline" onClick={() => setItems((p) => [...p, { description: '', quantity: '1', unitPrice: '' }])}>
            + Add item
          </button>
        </div>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <div className="flex justify-end gap-2">
          <button type="button" className={btnSecondary} onClick={onClose}>Cancel</button>
          <button type="button" className={btnPrimary} onClick={submit} disabled={saving || !valid}>
            {saving ? 'Creating…' : 'Create'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
