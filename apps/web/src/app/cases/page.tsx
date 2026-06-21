'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useFetch } from '@/hooks/useFetch';
import { formatDate } from '@/lib/format';
import { PageHeader } from '@/components/ui/PageHeader';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { LoadingState } from '@/components/ui/LoadingState';
import { ErrorState } from '@/components/ui/ErrorState';
import { FormField, inputClass, selectClass, btnPrimary, btnSecondary } from '@/components/ui/FormField';
import { apiFetch } from '@/lib/api';
import { connectId } from '@/lib/prisma-connect';
import { useAuth } from '@/context/AuthContext';

type ServiceCase = {
  id: string;
  caseNumber: string;
  subject: string;
  description: string | null;
  status: string;
  priority: string;
  category: string | null;
  routingQueue: string | null;
  slaDueAt: string | null;
  account: { name: string };
  knowledgeArticle: { title: string } | null;
};

type SimilarCase = {
  caseNumber: string;
  subject: string;
  status: string;
  category: string | null;
  account: string;
  matchReason: string;
};

type Account = { id: string; name: string };

export default function CasesPage() {
  const { user } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState({ subject: '', description: '', accountId: '', priority: 'medium' });
  const [classification, setClassification] = useState<{ category: string; routingQueue: string } | null>(null);
  const [similar, setSimilar] = useState<SimilarCase[]>([]);
  const { data, loading, error, reload } = useFetch<ServiceCase[]>('/cases');
  const accounts = useFetch<Account[]>('/accounts');

  useEffect(() => {
    if (!form.subject.trim()) {
      setClassification(null);
      return;
    }
    const timer = setTimeout(() => {
      apiFetch<{ category: string; routingQueue: string }>('/cases/classify', {
        method: 'POST',
        body: JSON.stringify({ subject: form.subject, description: form.description }),
      }).then(setClassification).catch(() => setClassification(null));
    }, 400);
    return () => clearTimeout(timer);
  }, [form.subject, form.description]);

  useEffect(() => {
    if (!selectedId) {
      setSimilar([]);
      return;
    }
    apiFetch<{ similar: SimilarCase[] }>(`/cases/${selectedId}/similar`)
      .then((r) => setSimilar(r.similar))
      .catch(() => setSimilar([]));
  }, [selectedId]);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    await apiFetch('/cases', {
      method: 'POST',
      body: JSON.stringify({
        subject: form.subject,
        description: form.description,
        priority: form.priority,
        account: connectId(form.accountId),
        owner: connectId(user?.id),
      }),
    });
    setShowModal(false);
    setClassification(null);
    await reload();
  }

  const priorityVariant = (p: string) => (p === 'critical' || p === 'high' ? 'red' : p === 'medium' ? 'yellow' : 'default');
  const selected = data?.find((c) => c.id === selectedId);

  return (
    <div className="p-8">
      <PageHeader title="Service Cases" description="Support ticketing with NLP routing, SLA, and similar case recommendations" action={<button type="button" className={btnPrimary} onClick={() => setShowModal(true)}>New Case</button>} />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-xl border border-slate-200 bg-white shadow-sm">
          {loading ? <LoadingState /> : null}
          {error ? <ErrorState message={error} onRetry={reload} /> : null}
          {!loading && !error && data && data.length > 0 ? (
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-6 py-3">Case #</th>
                  <th className="px-6 py-3">Subject</th>
                  <th className="px-6 py-3">Queue</th>
                  <th className="px-6 py-3">Priority</th>
                  <th className="px-6 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.map((c) => (
                  <tr
                    key={c.id}
                    className={`cursor-pointer hover:bg-slate-50 ${selectedId === c.id ? 'bg-blue-50' : ''}`}
                    onClick={() => setSelectedId(c.id)}
                  >
                    <td className="px-6 py-4 font-medium">{c.caseNumber}</td>
                    <td className="px-6 py-4">
                      <p>{c.subject}</p>
                      <p className="text-xs text-slate-500">{c.account.name}</p>
                    </td>
                    <td className="px-6 py-4">
                      {c.routingQueue ? <Badge>{c.routingQueue}</Badge> : '—'}
                    </td>
                    <td className="px-6 py-4"><Badge variant={priorityVariant(c.priority)}>{c.priority}</Badge></td>
                    <td className="px-6 py-4"><Badge variant={c.status === 'resolved' ? 'green' : 'default'}>{c.status}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : null}
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="font-semibold text-slate-800">Case Detail</p>
          {selected ? (
            <div className="mt-4 space-y-3 text-sm">
              <p className="font-medium">{selected.caseNumber}</p>
              <p>{selected.subject}</p>
              {selected.description ? <p className="text-slate-600">{selected.description}</p> : null}
              <p className="text-xs text-slate-500">SLA: {formatDate(selected.slaDueAt)}</p>
              {selected.category ? <p className="text-xs">Category: {selected.category}</p> : null}
              <div className="border-t border-slate-100 pt-3">
                <p className="mb-2 text-xs font-semibold uppercase text-slate-500">Similar Resolved Cases</p>
                {similar.length === 0 ? (
                  <p className="text-xs text-slate-400">No similar cases found</p>
                ) : (
                  <ul className="space-y-2">
                    {similar.map((s) => (
                      <li key={s.caseNumber} className="rounded-lg bg-slate-50 p-3 text-xs">
                        <p className="font-medium">{s.caseNumber}</p>
                        <p className="text-slate-600">{s.subject}</p>
                        <p className="text-slate-400">{s.account} · {s.matchReason}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          ) : (
            <p className="mt-4 text-sm text-slate-400">Select a case to view details and recommendations</p>
          )}
        </div>
      </div>

      <Modal open={showModal} onClose={() => setShowModal(false)} title="New Case">
        <form onSubmit={handleCreate} className="space-y-4">
          <FormField label="Account">
            <select className={selectClass} required value={form.accountId} onChange={(e) => setForm({ ...form, accountId: e.target.value })}>
              <option value="">Select account</option>
              {accounts.data?.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </FormField>
          <FormField label="Subject"><input className={inputClass} required value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} /></FormField>
          <FormField label="Description"><textarea className={inputClass} rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></FormField>
          {classification ? (
            <div className="rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm text-indigo-800">
              Auto-routed to <strong>{classification.routingQueue}</strong> ({classification.category})
            </div>
          ) : null}
          <FormField label="Priority">
            <select className={selectClass} value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </FormField>
          <div className="flex justify-end gap-2">
            <button type="button" className={btnSecondary} onClick={() => setShowModal(false)}>Cancel</button>
            <button type="submit" className={btnPrimary}>Create</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}