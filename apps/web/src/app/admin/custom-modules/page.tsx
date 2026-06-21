'use client';

import { FormEvent, useState } from 'react';
import { useFetch } from '@/hooks/useFetch';
import { apiFetch } from '@/lib/api';
import { formatDate } from '@/lib/format';
import { PageHeader } from '@/components/ui/PageHeader';
import { LoadingState } from '@/components/ui/LoadingState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Modal } from '@/components/ui/Modal';
import {
  FormField,
  inputClass,
  btnPrimary,
  btnSecondary,
} from '@/components/ui/FormField';

type ModuleSchema = {
  fields: { name: string; type: string; required?: boolean }[];
};

type CustomModule = {
  id: string;
  name: string;
  apiName: string;
  description: string | null;
  schema: ModuleSchema;
  _count: { records: number };
  records?: { id: string; data: Record<string, unknown>; createdAt: string }[];
};

export default function CustomModulesPage() {
  const { data, loading, error, reload } = useFetch<CustomModule[]>('/custom-modules');
  const [showCreate, setShowCreate] = useState(false);
  const [showRecord, setShowRecord] = useState<string | null>(null);
  const [selectedModule, setSelectedModule] = useState<CustomModule | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '',
    apiName: '',
    description: '',
    fieldsJson: '[{"name":"title","type":"text","required":true}]',
  });
  const [recordData, setRecordData] = useState('{"title":"Sample record"}');

  async function openModule(id: string) {
    const mod = await apiFetch<CustomModule>(`/custom-modules/${id}`);
    setSelectedModule(mod);
    const sample: Record<string, string> = {};
    for (const f of mod.schema.fields ?? []) {
      sample[f.name] = f.type === 'number' ? '0' : '';
    }
    setRecordData(JSON.stringify(sample, null, 2));
    setShowRecord(id);
  }

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const schema = { fields: JSON.parse(form.fieldsJson) as ModuleSchema['fields'] };
      await apiFetch('/custom-modules', {
        method: 'POST',
        body: JSON.stringify({
          name: form.name,
          apiName: form.apiName,
          description: form.description || undefined,
          schema,
        }),
      });
      setShowCreate(false);
      setForm({
        name: '',
        apiName: '',
        description: '',
        fieldsJson: '[{"name":"title","type":"text","required":true}]',
      });
      await reload();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to create module');
    } finally {
      setSaving(false);
    }
  }

  async function handleAddRecord(e: FormEvent) {
    e.preventDefault();
    if (!showRecord) return;
    setSaving(true);
    try {
      const data = JSON.parse(recordData) as Record<string, unknown>;
      await apiFetch(`/custom-modules/${showRecord}/records`, {
        method: 'POST',
        body: JSON.stringify(data),
      });
      setShowRecord(null);
      setSelectedModule(null);
      await reload();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to add record');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-8">
      <PageHeader
        title="Custom Modules"
        description="Admin-defined record types with JSON schemas"
        action={
          <button type="button" className={btnPrimary} onClick={() => setShowCreate(true)}>
            New Module
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
                <th className="px-6 py-3">Name</th>
                <th className="px-6 py-3">API Name</th>
                <th className="px-6 py-3">Fields</th>
                <th className="px-6 py-3">Records</th>
                <th className="px-6 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.map((mod) => (
                <tr key={mod.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4">
                    <p className="font-medium">{mod.name}</p>
                    {mod.description ? (
                      <p className="text-xs text-slate-500">{mod.description}</p>
                    ) : null}
                  </td>
                  <td className="px-6 py-4 font-mono text-xs">{mod.apiName}</td>
                  <td className="px-6 py-4">
                    {(mod.schema.fields ?? []).map((f) => f.name).join(', ') || '—'}
                  </td>
                  <td className="px-6 py-4">{mod._count.records}</td>
                  <td className="px-6 py-4">
                    <button
                      type="button"
                      className="text-xs text-blue-600 hover:underline"
                      onClick={() => void openModule(mod.id)}
                    >
                      View / Add Record
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : null}
        {!loading && !error && data?.length === 0 ? (
          <p className="px-6 py-12 text-center text-sm text-slate-500">No custom modules yet.</p>
        ) : null}
      </div>

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="New Custom Module">
        <form onSubmit={handleCreate} className="space-y-4">
          <FormField label="Display Name">
            <input
              className={inputClass}
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </FormField>
          <FormField label="API Name">
            <input
              className={inputClass}
              required
              placeholder="rebate_claims"
              value={form.apiName}
              onChange={(e) => setForm({ ...form, apiName: e.target.value })}
            />
          </FormField>
          <FormField label="Description">
            <input
              className={inputClass}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </FormField>
          <FormField label="Schema Fields (JSON)">
            <textarea
              className={`${inputClass} font-mono text-xs`}
              rows={5}
              required
              value={form.fieldsJson}
              onChange={(e) => setForm({ ...form, fieldsJson: e.target.value })}
            />
          </FormField>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" className={btnSecondary} onClick={() => setShowCreate(false)}>
              Cancel
            </button>
            <button type="submit" className={btnPrimary} disabled={saving}>
              {saving ? 'Creating...' : 'Create Module'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        open={!!showRecord}
        onClose={() => {
          setShowRecord(null);
          setSelectedModule(null);
        }}
        title={selectedModule ? `${selectedModule.name} — Records` : 'Module Records'}
      >
        {selectedModule ? (
          <div className="space-y-4">
            {selectedModule.records && selectedModule.records.length > 0 ? (
              <div className="max-h-40 overflow-auto rounded-lg border border-slate-200">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500">
                    <tr>
                      <th className="px-3 py-2">Data</th>
                      <th className="px-3 py-2">Created</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedModule.records.map((r) => (
                      <tr key={r.id}>
                        <td className="px-3 py-2 font-mono">
                          {JSON.stringify(r.data).slice(0, 80)}
                        </td>
                        <td className="px-3 py-2">{formatDate(r.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-slate-500">No records yet.</p>
            )}
            <form onSubmit={handleAddRecord} className="space-y-3">
              <FormField label="New Record (JSON)">
                <textarea
                  className={`${inputClass} font-mono text-xs`}
                  rows={6}
                  required
                  value={recordData}
                  onChange={(e) => setRecordData(e.target.value)}
                />
              </FormField>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  className={btnSecondary}
                  onClick={() => {
                    setShowRecord(null);
                    setSelectedModule(null);
                  }}
                >
                  Close
                </button>
                <button type="submit" className={btnPrimary} disabled={saving}>
                  {saving ? 'Saving...' : 'Add Record'}
                </button>
              </div>
            </form>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}