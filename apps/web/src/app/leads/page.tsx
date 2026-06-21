'use client';

import { FormEvent, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { connectId } from '@/lib/prisma-connect';
import { useAuth } from '@/context/AuthContext';
import { useFetch } from '@/hooks/useFetch';
import { fullName } from '@/lib/format';
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

type Lead = {
  id: string;
  companyName: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  source: string;
  status: string;
  owner: { firstName: string; lastName: string } | null;
};

export default function LeadsPage() {
  const { user } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [converting, setConverting] = useState<string | null>(null);
  const [form, setForm] = useState({
    companyName: '',
    firstName: '',
    lastName: '',
    email: '',
    source: 'web',
  });

  const { data, loading, error, reload } = useFetch<Lead[]>('/leads');

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await apiFetch('/leads', {
        method: 'POST',
        body: JSON.stringify({
          companyName: form.companyName,
          firstName: form.firstName || undefined,
          lastName: form.lastName || undefined,
          email: form.email || undefined,
          source: form.source,
          owner: connectId(user?.id),
        }),
      });
      setShowModal(false);
      setForm({ companyName: '', firstName: '', lastName: '', email: '', source: 'web' });
      await reload();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to create lead');
    } finally {
      setSaving(false);
    }
  }

  async function handleConvert(leadId: string) {
    setConverting(leadId);
    try {
      await apiFetch(`/leads/${leadId}/convert`, {
        method: 'POST',
        body: JSON.stringify({ createDeal: true }),
      });
      await reload();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to convert lead');
    } finally {
      setConverting(null);
    }
  }

  return (
    <div className="p-8">
      <PageHeader
        title="Leads"
        description="Prospect intake, qualification, and conversion"
        action={
          <button type="button" className={btnPrimary} onClick={() => setShowModal(true)}>
            New Lead
          </button>
        }
      />

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        {loading ? <LoadingState /> : null}
        {error ? <ErrorState message={error} onRetry={reload} /> : null}
        {!loading && !error && data?.length === 0 ? <EmptyState title="No leads yet" /> : null}
        {!loading && !error && data && data.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-6 py-3">Company</th>
                  <th className="px-6 py-3">Contact</th>
                  <th className="px-6 py-3">Source</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Owner</th>
                  <th className="px-6 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.map((lead) => (
                  <tr key={lead.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 font-medium text-slate-900">{lead.companyName}</td>
                    <td className="px-6 py-4 text-slate-600">
                      {fullName(lead.firstName, lead.lastName)}
                      {lead.email ? <p className="text-xs text-slate-400">{lead.email}</p> : null}
                    </td>
                    <td className="px-6 py-4"><Badge>{lead.source}</Badge></td>
                    <td className="px-6 py-4">
                      <Badge variant={lead.status === 'converted' ? 'green' : lead.status === 'new' ? 'blue' : 'yellow'}>
                        {lead.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {lead.owner ? fullName(lead.owner.firstName, lead.owner.lastName) : '—'}
                    </td>
                    <td className="px-6 py-4">
                      {lead.status !== 'converted' ? (
                        <button
                          type="button"
                          className="text-sm font-medium text-blue-600 hover:text-blue-700"
                          disabled={converting === lead.id}
                          onClick={() => handleConvert(lead.id)}
                        >
                          {converting === lead.id ? 'Converting...' : 'Convert'}
                        </button>
                      ) : (
                        <span className="text-xs text-slate-400">Converted</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>

      <Modal open={showModal} title="New Lead" onClose={() => setShowModal(false)}>
        <form onSubmit={handleCreate} className="space-y-4">
          <FormField label="Company Name">
            <input required value={form.companyName} onChange={(e) => setForm({ ...form, companyName: e.target.value })} className={inputClass} />
          </FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="First Name">
              <input value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} className={inputClass} />
            </FormField>
            <FormField label="Last Name">
              <input value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} className={inputClass} />
            </FormField>
          </div>
          <FormField label="Email">
            <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={inputClass} />
          </FormField>
          <FormField label="Source">
            <select value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} className={selectClass}>
              <option value="web">Web</option>
              <option value="trade_show">Trade Show</option>
              <option value="referral">Referral</option>
              <option value="cold_call">Cold Call</option>
              <option value="other">Other</option>
            </select>
          </FormField>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" className={btnSecondary} onClick={() => setShowModal(false)}>Cancel</button>
            <button type="submit" className={btnPrimary} disabled={saving}>{saving ? 'Creating...' : 'Create Lead'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}