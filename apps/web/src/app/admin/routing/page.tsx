'use client';

import { FormEvent, useState } from 'react';
import { useFetch } from '@/hooks/useFetch';
import { apiFetch } from '@/lib/api';
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

type RoutingMember = {
  id: string;
  currentLoad: number;
  user: { id: string; firstName: string; lastName: string; email: string };
};

type RoutingRule = {
  id: string;
  name: string;
  entityType: string;
  queue: string | null;
  skills: string[] | null;
  priority: number;
  members: RoutingMember[];
};

type ServiceCase = { id: string; caseNumber: string; subject: string; routingQueue: string | null };
type Lead = { id: string; companyName: string; email: string | null };

type AssignResult = {
  entityType: string;
  entityId: string;
  assignedTo: { firstName: string; lastName: string; email: string };
  ruleName: string;
  queue?: string;
  agentLoad?: number;
  reason: string;
};

export default function RoutingPage() {
  const { data, loading, error, reload } = useFetch<RoutingRule[]>('/routing/rules');
  const cases = useFetch<ServiceCase[]>('/cases');
  const leads = useFetch<Lead[]>('/leads');
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [assignResult, setAssignResult] = useState<AssignResult | null>(null);
  const [form, setForm] = useState({
    name: '',
    entityType: 'case',
    queue: 'networking',
    skills: 'networking',
    priority: '100',
    memberUserIds: '',
  });
  const [testForm, setTestForm] = useState({
    entityType: 'case',
    entityId: '',
    queue: 'networking',
    skill: 'networking',
  });

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await apiFetch('/routing/rules', {
        method: 'POST',
        body: JSON.stringify({
          name: form.name,
          entityType: form.entityType,
          queue: form.queue || undefined,
          skills: form.skills.split(',').map((s) => s.trim()).filter(Boolean),
          priority: Number(form.priority),
          memberUserIds: form.memberUserIds.split(',').map((s) => s.trim()).filter(Boolean),
        }),
      });
      setShowModal(false);
      await reload();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to create rule');
    } finally {
      setSaving(false);
    }
  }

  async function handleAssign(e: FormEvent) {
    e.preventDefault();
    setAssigning(true);
    setAssignResult(null);
    try {
      const result = await apiFetch<AssignResult>('/routing/assign', {
        method: 'POST',
        body: JSON.stringify({
          entityType: testForm.entityType,
          entityId: testForm.entityId,
          queue: testForm.queue || undefined,
          skill: testForm.skill || undefined,
        }),
      });
      setAssignResult(result);
      await reload();
      await cases.reload();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Assignment failed');
    } finally {
      setAssigning(false);
    }
  }

  return (
    <div className="p-8">
      <PageHeader
        title="Omni-Channel Routing"
        description="Route cases and leads to agents by queue, skill, and load"
        action={
          <button type="button" className={btnPrimary} onClick={() => setShowModal(true)}>
            New Rule
          </button>
        }
      />

      <div className="mb-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold text-slate-900">Test Assignment</h2>
        <form onSubmit={handleAssign} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <FormField label="Entity Type">
            <select
              className={selectClass}
              value={testForm.entityType}
              onChange={(e) => setTestForm({ ...testForm, entityType: e.target.value, entityId: '' })}
            >
              <option value="case">Case</option>
              <option value="lead">Lead</option>
            </select>
          </FormField>
          <FormField label="Entity">
            <select
              className={selectClass}
              required
              value={testForm.entityId}
              onChange={(e) => setTestForm({ ...testForm, entityId: e.target.value })}
            >
              <option value="">Select...</option>
              {testForm.entityType === 'case'
                ? (cases.data ?? []).map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.caseNumber} — {c.subject.slice(0, 40)}
                    </option>
                  ))
                : (leads.data ?? []).map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.companyName}
                    </option>
                  ))}
            </select>
          </FormField>
          <FormField label="Queue">
            <input
              className={inputClass}
              value={testForm.queue}
              onChange={(e) => setTestForm({ ...testForm, queue: e.target.value })}
            />
          </FormField>
          <FormField label="Skill">
            <input
              className={inputClass}
              value={testForm.skill}
              onChange={(e) => setTestForm({ ...testForm, skill: e.target.value })}
            />
          </FormField>
          <div className="flex items-end">
            <button type="submit" className={btnPrimary} disabled={assigning}>
              {assigning ? 'Assigning...' : 'Assign'}
            </button>
          </div>
        </form>
        {assignResult ? (
          <div className="mt-4 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-800">
            Assigned to <strong>{assignResult.assignedTo.firstName} {assignResult.assignedTo.lastName}</strong>
            {' '}via rule <strong>{assignResult.ruleName}</strong> — {assignResult.reason}
            {assignResult.agentLoad != null ? ` (load: ${assignResult.agentLoad})` : ''}
          </div>
        ) : null}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        {loading ? <LoadingState /> : null}
        {error ? <ErrorState message={error} onRetry={reload} /> : null}
        {!loading && !error && data && data.length > 0 ? (
          <div className="divide-y divide-slate-100">
            {data.map((rule) => (
              <div key={rule.id} className="px-6 py-5">
                <div className="flex flex-wrap items-center gap-3">
                  <h3 className="font-medium text-slate-900">{rule.name}</h3>
                  <Badge variant="default">{rule.entityType}</Badge>
                  {rule.queue ? <Badge variant="yellow">{rule.queue}</Badge> : null}
                  <span className="text-xs text-slate-500">Priority {rule.priority}</span>
                </div>
                {rule.skills && (rule.skills as string[]).length > 0 ? (
                  <p className="mt-1 text-xs text-slate-500">
                    Skills: {(rule.skills as string[]).join(', ')}
                  </p>
                ) : null}
                <table className="mt-3 w-full text-left text-sm">
                  <thead className="text-xs uppercase text-slate-500">
                    <tr>
                      <th className="py-1 pr-4">Agent</th>
                      <th className="py-1 pr-4">Email</th>
                      <th className="py-1">Load</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rule.members.map((m) => (
                      <tr key={m.id} className="text-slate-700">
                        <td className="py-1 pr-4">
                          {m.user.firstName} {m.user.lastName}
                        </td>
                        <td className="py-1 pr-4 text-xs">{m.user.email}</td>
                        <td className="py-1">{m.currentLoad}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        ) : null}
        {!loading && !error && data?.length === 0 ? (
          <p className="px-6 py-12 text-center text-sm text-slate-500">No routing rules yet.</p>
        ) : null}
      </div>

      <Modal open={showModal} onClose={() => setShowModal(false)} title="New Routing Rule">
        <form onSubmit={handleCreate} className="space-y-4">
          <FormField label="Rule Name">
            <input
              className={inputClass}
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </FormField>
          <FormField label="Entity Type">
            <select
              className={selectClass}
              value={form.entityType}
              onChange={(e) => setForm({ ...form, entityType: e.target.value })}
            >
              <option value="case">Case</option>
              <option value="lead">Lead</option>
            </select>
          </FormField>
          <FormField label="Queue">
            <input
              className={inputClass}
              value={form.queue}
              onChange={(e) => setForm({ ...form, queue: e.target.value })}
            />
          </FormField>
          <FormField label="Skills (comma-separated)">
            <input
              className={inputClass}
              value={form.skills}
              onChange={(e) => setForm({ ...form, skills: e.target.value })}
            />
          </FormField>
          <FormField label="Priority">
            <input
              className={inputClass}
              type="number"
              value={form.priority}
              onChange={(e) => setForm({ ...form, priority: e.target.value })}
            />
          </FormField>
          <FormField label="Member User IDs (comma-separated)">
            <input
              className={inputClass}
              placeholder="uuid, uuid"
              value={form.memberUserIds}
              onChange={(e) => setForm({ ...form, memberUserIds: e.target.value })}
            />
          </FormField>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" className={btnSecondary} onClick={() => setShowModal(false)}>
              Cancel
            </button>
            <button type="submit" className={btnPrimary} disabled={saving}>
              {saving ? 'Creating...' : 'Create Rule'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}