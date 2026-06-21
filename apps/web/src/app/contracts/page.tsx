'use client';

import { FormEvent, useState } from 'react';
import { useFetch } from '@/hooks/useFetch';
import { formatCurrency, formatDate } from '@/lib/format';
import { PageHeader } from '@/components/ui/PageHeader';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { LoadingState } from '@/components/ui/LoadingState';
import { ErrorState } from '@/components/ui/ErrorState';
import { FormField, inputClass, selectClass, btnPrimary, btnSecondary } from '@/components/ui/FormField';
import { apiFetch } from '@/lib/api';
import { connectId } from '@/lib/prisma-connect';
import { useAuth } from '@/context/AuthContext';

type Contract = {
  id: string;
  contractNumber: string;
  title: string;
  status: string;
  value: string | null;
  startDate: string | null;
  endDate: string | null;
  account: { name: string };
};

type Account = { id: string; name: string };
type Clause = { id: string; name: string; category: string | null; body: string };
type Template = { id: string; name: string; description: string | null };

export default function ContractsPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<'contracts' | 'clauses' | 'templates'>('contracts');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ title: '', accountId: '', value: '' });
  const { data, loading, error, reload } = useFetch<Contract[]>('/contracts');
  const clauses = useFetch<Clause[]>('/contracts/clauses');
  const templates = useFetch<Template[]>('/contracts/templates');
  const accounts = useFetch<Account[]>('/accounts');

  async function createFromTemplate(templateId: string) {
    const accountId = accounts.data?.[0]?.id;
    if (!accountId) return;
    await apiFetch(`/contracts/from-template/${templateId}`, {
      method: 'POST',
      body: JSON.stringify({ accountId, title: 'Contract from template', ownerId: user?.id }),
    });
    setTab('contracts');
    await reload();
  }

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    await apiFetch('/contracts', {
      method: 'POST',
      body: JSON.stringify({
        title: form.title,
        value: form.value ? Number(form.value) : undefined,
        account: connectId(form.accountId),
        owner: connectId(user?.id),
        status: 'draft',
      }),
    });
    setShowModal(false);
    await reload();
  }

  return (
    <div className="p-8">
      <PageHeader title="Contracts" description="CLM with clause library and templates" action={<button type="button" className={btnPrimary} onClick={() => setShowModal(true)}>New Contract</button>} />
      <div className="mb-4 flex gap-2">
        {(['contracts', 'clauses', 'templates'] as const).map((t) => (
          <button key={t} type="button" className={`rounded-lg px-4 py-2 text-sm font-medium ${tab === t ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'}`} onClick={() => setTab(t)}>{t}</button>
        ))}
      </div>
      {tab === 'clauses' ? (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm divide-y divide-slate-100">
          {clauses.data?.map((c) => (
            <div key={c.id} className="px-6 py-4">
              <p className="font-medium">{c.name} {c.category ? <span className="text-xs text-slate-400">({c.category})</span> : null}</p>
              <p className="mt-1 text-sm text-slate-600 line-clamp-2">{c.body}</p>
            </div>
          ))}
        </div>
      ) : null}
      {tab === 'templates' ? (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm divide-y divide-slate-100">
          {templates.data?.map((t) => (
            <div key={t.id} className="flex items-center justify-between px-6 py-4">
              <div>
                <p className="font-medium">{t.name}</p>
                <p className="text-sm text-slate-500">{t.description}</p>
              </div>
              <button type="button" className="text-sm text-blue-600" onClick={() => createFromTemplate(t.id)}>Use Template</button>
            </div>
          ))}
        </div>
      ) : null}
      {tab === 'contracts' ? <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        {loading ? <LoadingState /> : null}
        {error ? <ErrorState message={error} onRetry={reload} /> : null}
        {!loading && !error && data && data.length > 0 ? (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-6 py-3">Contract #</th>
                <th className="px-6 py-3">Title</th>
                <th className="px-6 py-3">Account</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Value</th>
                <th className="px-6 py-3">Term</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 font-medium">{c.contractNumber}</td>
                  <td className="px-6 py-4">{c.title}</td>
                  <td className="px-6 py-4">{c.account.name}</td>
                  <td className="px-6 py-4"><Badge variant={c.status === 'active' ? 'green' : 'default'}>{c.status}</Badge></td>
                  <td className="px-6 py-4">{formatCurrency(c.value)}</td>
                  <td className="px-6 py-4 text-xs text-slate-500">{formatDate(c.startDate)} — {formatDate(c.endDate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : !loading && !error ? <p className="px-6 py-12 text-center text-sm text-slate-400">No contracts yet.</p> : null}
      </div> : null}
      <Modal open={showModal} title="New Contract" onClose={() => setShowModal(false)}>
        <form onSubmit={handleCreate} className="space-y-4">
          <FormField label="Title"><input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className={inputClass} /></FormField>
          <FormField label="Account">
            <select required value={form.accountId} onChange={(e) => setForm({ ...form, accountId: e.target.value })} className={selectClass}>
              <option value="">Select...</option>
              {accounts.data?.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </FormField>
          <FormField label="Value"><input type="number" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} className={inputClass} /></FormField>
          <div className="flex justify-end gap-3"><button type="button" className={btnSecondary} onClick={() => setShowModal(false)}>Cancel</button><button type="submit" className={btnPrimary}>Create</button></div>
        </form>
      </Modal>
    </div>
  );
}