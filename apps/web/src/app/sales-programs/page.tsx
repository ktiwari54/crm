'use client';

import { FormEvent, useState } from 'react';
import { useFetch } from '@/hooks/useFetch';
import { apiFetch } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/format';
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

type SalesProgram = {
  id: string;
  name: string;
  description: string | null;
  productFocus: string | null;
  startDate: string;
  endDate: string;
  targetRevenue: string | null;
  targetUnits: number | null;
  status: string;
  owner: { firstName: string; lastName: string } | null;
};

export default function SalesProgramsPage() {
  const { data, loading, error, reload } = useFetch<SalesProgram[]>('/sales-programs');
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '',
    description: '',
    productFocus: '',
    startDate: '2026-07-01',
    endDate: '2026-09-30',
    targetRevenue: '',
    targetUnits: '',
    status: 'active',
  });

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await apiFetch('/sales-programs', {
        method: 'POST',
        body: JSON.stringify({
          name: form.name,
          description: form.description || undefined,
          productFocus: form.productFocus || undefined,
          startDate: form.startDate,
          endDate: form.endDate,
          targetRevenue: form.targetRevenue ? Number(form.targetRevenue) : undefined,
          targetUnits: form.targetUnits ? Number(form.targetUnits) : undefined,
          status: form.status,
        }),
      });
      setShowModal(false);
      setForm({
        name: '',
        description: '',
        productFocus: '',
        startDate: '2026-07-01',
        endDate: '2026-09-30',
        targetRevenue: '',
        targetUnits: '',
        status: 'active',
      });
      await reload();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to create program');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-8">
      <PageHeader
        title="Sales Programs"
        description="Structured sales initiatives with revenue and unit targets"
        action={
          <button type="button" className={btnPrimary} onClick={() => setShowModal(true)}>
            New Program
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
                <th className="px-6 py-3">Program</th>
                <th className="px-6 py-3">Focus</th>
                <th className="px-6 py-3">Period</th>
                <th className="px-6 py-3">Target Revenue</th>
                <th className="px-6 py-3">Target Units</th>
                <th className="px-6 py-3">Owner</th>
                <th className="px-6 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.map((prog) => (
                <tr key={prog.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4">
                    <p className="font-medium">{prog.name}</p>
                    {prog.description ? (
                      <p className="text-xs text-slate-500">{prog.description}</p>
                    ) : null}
                  </td>
                  <td className="px-6 py-4">{prog.productFocus ?? '—'}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {formatDate(prog.startDate)} — {formatDate(prog.endDate)}
                  </td>
                  <td className="px-6 py-4">
                    {prog.targetRevenue ? formatCurrency(prog.targetRevenue) : '—'}
                  </td>
                  <td className="px-6 py-4">{prog.targetUnits ?? '—'}</td>
                  <td className="px-6 py-4">
                    {prog.owner ? `${prog.owner.firstName} ${prog.owner.lastName}` : '—'}
                  </td>
                  <td className="px-6 py-4">
                    <Badge
                      variant={
                        prog.status === 'active'
                          ? 'green'
                          : prog.status === 'planned'
                            ? 'yellow'
                            : 'default'
                      }
                    >
                      {prog.status}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : null}
        {!loading && !error && data?.length === 0 ? (
          <p className="px-6 py-12 text-center text-sm text-slate-500">No sales programs yet.</p>
        ) : null}
      </div>

      <Modal open={showModal} onClose={() => setShowModal(false)} title="New Sales Program">
        <form onSubmit={handleCreate} className="space-y-4">
          <FormField label="Program Name">
            <input
              className={inputClass}
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </FormField>
          <FormField label="Description">
            <textarea
              className={inputClass}
              rows={2}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </FormField>
          <FormField label="Product Focus">
            <input
              className={inputClass}
              value={form.productFocus}
              onChange={(e) => setForm({ ...form, productFocus: e.target.value })}
            />
          </FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Start Date">
              <input
                className={inputClass}
                type="date"
                required
                value={form.startDate}
                onChange={(e) => setForm({ ...form, startDate: e.target.value })}
              />
            </FormField>
            <FormField label="End Date">
              <input
                className={inputClass}
                type="date"
                required
                value={form.endDate}
                onChange={(e) => setForm({ ...form, endDate: e.target.value })}
              />
            </FormField>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Target Revenue">
              <input
                className={inputClass}
                type="number"
                value={form.targetRevenue}
                onChange={(e) => setForm({ ...form, targetRevenue: e.target.value })}
              />
            </FormField>
            <FormField label="Target Units">
              <input
                className={inputClass}
                type="number"
                value={form.targetUnits}
                onChange={(e) => setForm({ ...form, targetUnits: e.target.value })}
              />
            </FormField>
          </div>
          <FormField label="Status">
            <select
              className={selectClass}
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
            >
              <option value="planned">Planned</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </FormField>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" className={btnSecondary} onClick={() => setShowModal(false)}>
              Cancel
            </button>
            <button type="submit" className={btnPrimary} disabled={saving}>
              {saving ? 'Creating...' : 'Create Program'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}