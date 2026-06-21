'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { connectId } from '@/lib/prisma-connect';
import { useAuth } from '@/context/AuthContext';
import { useFetch } from '@/hooks/useFetch';
import { formatCurrency, formatDate, formatPercent } from '@/lib/format';
import { PageHeader } from '@/components/ui/PageHeader';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { LoadingState } from '@/components/ui/LoadingState';
import { ErrorState } from '@/components/ui/ErrorState';
import { EmptyState } from '@/components/ui/EmptyState';
import {
  FormField,
  inputClass,
  selectClass,
  btnPrimary,
  btnSecondary,
} from '@/components/ui/FormField';

type Quote = {
  id: string;
  quoteNumber: string;
  status: string;
  total: string;
  marginPercent: string | null;
  validUntil: string | null;
  account: { name: string };
  deal: { name: string } | null;
  lineItems: { id: string; atpWarning: boolean }[];
};

type Account = { id: string; name: string };
type Deal = { id: string; name: string; account: { id: string } };

export default function QuotesPage() {
  const { user } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ accountId: '', dealId: '' });

  const { data, loading, error, reload } = useFetch<Quote[]>('/quotes');
  const accounts = useFetch<Account[]>('/accounts');
  const deals = useFetch<Deal[]>('/deals');

  const filteredDeals = deals.data?.filter((d) => !form.accountId || d.account.id === form.accountId);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const quote = await apiFetch<{ id: string }>('/quotes', {
        method: 'POST',
        body: JSON.stringify({
          account: connectId(form.accountId),
          deal: connectId(form.dealId || undefined),
          owner: connectId(user?.id),
        }),
      });
      setShowModal(false);
      setForm({ accountId: '', dealId: '' });
      window.location.href = `/quotes/${quote.id}`;
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to create quote');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-8">
      <PageHeader
        title="Quotes"
        description="Quote builder with pricing, margin, and ATP warnings"
        action={
          <button type="button" className={btnPrimary} onClick={() => setShowModal(true)}>
            New Quote
          </button>
        }
      />

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        {loading ? <LoadingState /> : null}
        {error ? <ErrorState message={error} onRetry={reload} /> : null}
        {!loading && !error && data?.length === 0 ? <EmptyState title="No quotes yet" /> : null}
        {!loading && !error && data && data.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-6 py-3">Quote #</th>
                  <th className="px-6 py-3">Account</th>
                  <th className="px-6 py-3">Deal</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Total</th>
                  <th className="px-6 py-3">Margin</th>
                  <th className="px-6 py-3">Valid Until</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.map((quote) => {
                  const hasWarning = quote.lineItems.some((li) => li.atpWarning);
                  return (
                    <tr key={quote.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4">
                        <Link href={`/quotes/${quote.id}`} className="font-medium text-blue-600 hover:text-blue-700">
                          {quote.quoteNumber}
                        </Link>
                        {hasWarning ? (
                          <p className="mt-1 text-xs text-amber-600">⚠ ATP warning</p>
                        ) : null}
                      </td>
                      <td className="px-6 py-4 text-slate-600">{quote.account.name}</td>
                      <td className="px-6 py-4 text-slate-600">{quote.deal?.name ?? '—'}</td>
                      <td className="px-6 py-4">
                        <Badge variant={quote.status === 'sent' ? 'blue' : quote.status === 'accepted' ? 'green' : 'yellow'}>
                          {quote.status}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 font-medium text-slate-900">{formatCurrency(quote.total)}</td>
                      <td className="px-6 py-4 text-slate-600">{formatPercent(quote.marginPercent)}</td>
                      <td className="px-6 py-4 text-slate-600">{formatDate(quote.validUntil)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>

      <Modal open={showModal} title="New Quote" onClose={() => setShowModal(false)}>
        <form onSubmit={handleCreate} className="space-y-4">
          <FormField label="Account">
            <select required value={form.accountId} onChange={(e) => setForm({ accountId: e.target.value, dealId: '' })} className={selectClass}>
              <option value="">Select account...</option>
              {accounts.data?.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </FormField>
          <FormField label="Deal (optional)">
            <select value={form.dealId} onChange={(e) => setForm({ ...form, dealId: e.target.value })} className={selectClass}>
              <option value="">No deal</option>
              {filteredDeals?.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </FormField>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" className={btnSecondary} onClick={() => setShowModal(false)}>Cancel</button>
            <button type="submit" className={btnPrimary} disabled={saving}>{saving ? 'Creating...' : 'Create Quote'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}