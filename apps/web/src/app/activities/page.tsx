'use client';

import { FormEvent, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { connectId } from '@/lib/prisma-connect';
import { useAuth } from '@/context/AuthContext';
import { useFetch } from '@/hooks/useFetch';
import { formatDateTime } from '@/lib/format';
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

type Activity = {
  id: string;
  activityType: string;
  subject: string;
  status: string;
  priority: string;
  dueAt: string | null;
  owner: { firstName: string; lastName: string } | null;
  callScript: { id: string; name: string } | null;
};

type CallScript = { id: string; name: string; scriptBody: string };

export default function ActivitiesPage() {
  const { user } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    activityType: 'task',
    subject: '',
    priority: 'normal',
    dueAt: '',
    callScriptId: '',
  });
  const { data, loading, error, reload } = useFetch<Activity[]>('/activities');
  const callScripts = useFetch<CallScript[]>('/call-scripts');

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await apiFetch('/activities', {
        method: 'POST',
        body: JSON.stringify({
          activityType: form.activityType,
          subject: form.subject,
          priority: form.priority,
          dueAt: form.dueAt ? new Date(form.dueAt).toISOString() : undefined,
          owner: connectId(user?.id),
          callScript: connectId(form.callScriptId || undefined),
        }),
      });
      setShowModal(false);
      setForm({ activityType: 'task', subject: '', priority: 'normal', dueAt: '', callScriptId: '' });
      await reload();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to create activity');
    } finally {
      setSaving(false);
    }
  }

  async function completeActivity(activityId: string) {
    try {
      await apiFetch(`/activities/${activityId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: 'completed',
          completedAt: new Date().toISOString(),
        }),
      });
      await reload();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update activity');
    }
  }

  return (
    <div className="p-8">
      <PageHeader
        title="Activities"
        description="Tasks, calls, and meetings linked to accounts and deals"
        action={
          <button type="button" className={btnPrimary} onClick={() => setShowModal(true)}>
            New Activity
          </button>
        }
      />

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        {loading ? <LoadingState /> : null}
        {error ? <ErrorState message={error} onRetry={reload} /> : null}
        {!loading && !error && data?.length === 0 ? <EmptyState title="No activities yet" /> : null}
        {!loading && !error && data && data.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-6 py-3">Type</th>
                  <th className="px-6 py-3">Subject</th>
                  <th className="px-6 py-3">Due</th>
                  <th className="px-6 py-3">Priority</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.map((activity) => (
                  <tr key={activity.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4"><Badge>{activity.activityType}</Badge></td>
                    <td className="px-6 py-4 font-medium text-slate-900">
                      {activity.subject}
                      {activity.callScript ? (
                        <span className="ml-2 text-xs text-blue-600">📞 {activity.callScript.name}</span>
                      ) : null}
                    </td>
                    <td className="px-6 py-4 text-slate-600">{formatDateTime(activity.dueAt)}</td>
                    <td className="px-6 py-4">
                      <Badge variant={activity.priority === 'high' ? 'red' : activity.priority === 'low' ? 'default' : 'blue'}>
                        {activity.priority}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant={activity.status === 'completed' ? 'green' : 'yellow'}>
                        {activity.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      {activity.status !== 'completed' ? (
                        <button
                          type="button"
                          className="text-sm font-medium text-blue-600 hover:text-blue-700"
                          onClick={() => completeActivity(activity.id)}
                        >
                          Complete
                        </button>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>

      <Modal open={showModal} title="New Activity" onClose={() => setShowModal(false)}>
        <form onSubmit={handleCreate} className="space-y-4">
          <FormField label="Type">
            <select value={form.activityType} onChange={(e) => setForm({ ...form, activityType: e.target.value })} className={selectClass}>
              <option value="task">Task</option>
              <option value="call">Call</option>
              <option value="meeting">Meeting</option>
            </select>
          </FormField>
          <FormField label="Subject">
            <input required value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} className={inputClass} />
          </FormField>
          <FormField label="Priority">
            <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} className={selectClass}>
              <option value="low">Low</option>
              <option value="normal">Normal</option>
              <option value="high">High</option>
            </select>
          </FormField>
          <FormField label="Due Date/Time">
            <input type="datetime-local" value={form.dueAt} onChange={(e) => setForm({ ...form, dueAt: e.target.value })} className={inputClass} />
          </FormField>
          {form.activityType === 'call' ? (
            <FormField label="Call Script">
              <select value={form.callScriptId} onChange={(e) => setForm({ ...form, callScriptId: e.target.value })} className={selectClass}>
                <option value="">No script</option>
                {callScripts.data?.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </FormField>
          ) : null}
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" className={btnSecondary} onClick={() => setShowModal(false)}>Cancel</button>
            <button type="submit" className={btnPrimary} disabled={saving}>{saving ? 'Creating...' : 'Create Activity'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}