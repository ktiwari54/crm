'use client';

import { FormEvent, Fragment, useState } from 'react';
import { useFetch } from '@/hooks/useFetch';
import { apiFetch } from '@/lib/api';
import { formatDate } from '@/lib/format';
import { PageHeader } from '@/components/ui/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { LoadingState } from '@/components/ui/LoadingState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Modal } from '@/components/ui/Modal';
import {
  FormField,
  inputClass,
  selectClass,
  btnPrimary,
  btnSecondary,
} from '@/components/ui/FormField';

type GdprRequest = {
  id: string;
  requestType: string;
  email: string;
  status: string;
  notes: string | null;
  exportPayload: Record<string, unknown> | null;
  createdAt: string;
  completedAt: string | null;
  contact: { firstName: string; lastName: string; email: string | null } | null;
  requestedBy: { firstName: string; lastName: string } | null;
};

const TYPE_LABELS: Record<string, string> = {
  export: 'Data Export',
  delete: 'Right to Delete',
  consent_update: 'Consent Update',
};

export default function GdprPage() {
  const { data, loading, error, reload } = useFetch<GdprRequest[]>('/compliance/gdpr');
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [form, setForm] = useState({
    requestType: 'export',
    email: 'sarah.chen@techmart.com',
    notes: '',
  });

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await apiFetch('/compliance/gdpr', {
        method: 'POST',
        body: JSON.stringify({
          requestType: form.requestType,
          email: form.email,
          notes: form.notes || undefined,
        }),
      });
      setShowModal(false);
      setForm({ requestType: 'export', email: 'sarah.chen@techmart.com', notes: '' });
      await reload();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to create request');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-8">
      <PageHeader
        title="GDPR Toolkit"
        description="Manage data export, deletion, and consent requests"
        action={
          <button type="button" className={btnPrimary} onClick={() => setShowModal(true)}>
            New Request
          </button>
        }
      />

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        {loading ? <LoadingState /> : null}
        {error ? <ErrorState message={error} onRetry={reload} /> : null}
        {!loading && !error && data && data.length > 0 ? (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-6 py-3">Type</th>
                <th className="px-6 py-3">Email</th>
                <th className="px-6 py-3">Contact</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Requested</th>
                <th className="px-6 py-3">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.map((req) => (
                <Fragment key={req.id}>
                  <tr className="hover:bg-slate-50">
                    <td className="px-6 py-4 font-medium">
                      {TYPE_LABELS[req.requestType] ?? req.requestType}
                    </td>
                    <td className="px-6 py-4">{req.email}</td>
                    <td className="px-6 py-4">
                      {req.contact
                        ? `${req.contact.firstName} ${req.contact.lastName}`
                        : '—'}
                    </td>
                    <td className="px-6 py-4">
                      <Badge
                        variant={
                          req.status === 'completed'
                            ? 'green'
                            : req.status === 'pending'
                              ? 'yellow'
                              : 'default'
                        }
                      >
                        {req.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">{formatDate(req.createdAt)}</td>
                    <td className="px-6 py-4">
                      {req.exportPayload ? (
                        <button
                          type="button"
                          className="text-xs text-blue-600 hover:underline"
                          onClick={() =>
                            setExpandedId(expandedId === req.id ? null : req.id)
                          }
                        >
                          {expandedId === req.id ? 'Hide' : 'View export'}
                        </button>
                      ) : (
                        (req.notes ?? '—').slice(0, 40)
                      )}
                    </td>
                  </tr>
                  {expandedId === req.id && req.exportPayload ? (
                    <tr>
                      <td colSpan={6} className="bg-slate-50 px-6 py-4">
                        <pre className="max-h-48 overflow-auto rounded-lg bg-slate-900 p-4 text-xs text-slate-200">
                          {JSON.stringify(req.exportPayload, null, 2)}
                        </pre>
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              ))}
            </tbody>
          </table>
        ) : null}
        {!loading && !error && data?.length === 0 ? (
          <p className="px-6 py-12 text-center text-sm text-slate-500">No GDPR requests yet.</p>
        ) : null}
      </div>

      <Modal open={showModal} onClose={() => setShowModal(false)} title="New GDPR Request">
        <form onSubmit={handleCreate} className="space-y-4">
          <FormField label="Request Type">
            <select
              className={selectClass}
              value={form.requestType}
              onChange={(e) => setForm({ ...form, requestType: e.target.value })}
            >
              <option value="export">Data Export</option>
              <option value="delete">Right to Delete</option>
              <option value="consent_update">Consent Update</option>
            </select>
          </FormField>
          <FormField label="Subject Email">
            <input
              className={inputClass}
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </FormField>
          <FormField label="Notes">
            <textarea
              className={inputClass}
              rows={3}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </FormField>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" className={btnSecondary} onClick={() => setShowModal(false)}>
              Cancel
            </button>
            <button type="submit" className={btnPrimary} disabled={saving}>
              {saving ? 'Submitting...' : 'Submit Request'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}