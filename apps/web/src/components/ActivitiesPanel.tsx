'use client';

import { useState } from 'react';
import { apiFetch } from '@/lib/api';
import { useFetch } from '@/hooks/useFetch';
import { useAuth } from '@/context/AuthContext';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { LoadingState } from '@/components/ui/LoadingState';
import { FormField, inputClass, selectClass, btnPrimary, btnSecondary } from '@/components/ui/FormField';

type Activity = {
  id: string;
  activityType: string;
  subject: string;
  status: string;
  dueAt: string | null;
  owner: { firstName: string; lastName: string } | null;
};

const TYPES = ['task', 'call', 'meeting', 'email'];

function typeIcon(t: string) {
  return t === 'call' ? '📞' : t === 'meeting' ? '👥' : t === 'email' ? '✉️' : '✓';
}

/**
 * View, log, and complete activities (tasks/calls/meetings) for any entity.
 * `relatedType` is one of: lead | account | contact | deal | quote.
 */
export function ActivitiesPanel({
  relatedType,
  relatedId,
  title,
  onClose,
}: {
  relatedType: string;
  relatedId: string;
  title: string;
  onClose: () => void;
}) {
  const { user } = useAuth();
  const { data, loading, reload } = useFetch<Activity[]>(
    `/activities?relatedType=${relatedType}&relatedId=${relatedId}`,
  );
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState('');
  const [form, setForm] = useState({ activityType: 'task', subject: '', dueAt: '' });

  async function add() {
    if (!form.subject) return;
    setBusy('add');
    try {
      await apiFetch('/activities', {
        method: 'POST',
        body: JSON.stringify({
          activityType: form.activityType,
          subject: form.subject,
          dueAt: form.dueAt ? new Date(form.dueAt).toISOString() : undefined,
          relatedType,
          relatedId,
          owner: user?.id ? { connect: { id: user.id } } : undefined,
        }),
      });
      setForm({ activityType: 'task', subject: '', dueAt: '' });
      setAdding(false);
      await reload();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to add activity');
    } finally {
      setBusy('');
    }
  }

  async function complete(id: string) {
    setBusy(id);
    try {
      await apiFetch(`/activities/${id}`, { method: 'PATCH', body: JSON.stringify({ status: 'completed' }) });
      await reload();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update');
    } finally {
      setBusy('');
    }
  }

  const now = Date.now();

  return (
    <Modal open title={`Activities — ${title}`} onClose={onClose}>
      <div className="space-y-3">
        {adding ? (
          <div className="space-y-2 rounded-lg border border-slate-200 p-3">
            <div className="grid grid-cols-2 gap-2">
              <FormField label="Type">
                <select className={selectClass} value={form.activityType} onChange={(e) => setForm({ ...form, activityType: e.target.value })}>
                  {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </FormField>
              <FormField label="Due">
                <input type="datetime-local" className={inputClass} value={form.dueAt} onChange={(e) => setForm({ ...form, dueAt: e.target.value })} />
              </FormField>
            </div>
            <FormField label="Subject">
              <input className={inputClass} value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} placeholder="e.g. Follow-up call" />
            </FormField>
            <div className="flex justify-end gap-2">
              <button type="button" className={btnSecondary} onClick={() => setAdding(false)}>Cancel</button>
              <button type="button" className={btnPrimary} onClick={add} disabled={busy === 'add' || !form.subject}>{busy === 'add' ? 'Adding…' : 'Log Activity'}</button>
            </div>
          </div>
        ) : (
          <button type="button" className={btnPrimary} onClick={() => setAdding(true)}>+ Log Activity</button>
        )}

        {loading ? <LoadingState /> : null}
        {data && data.length === 0 ? <p className="py-6 text-center text-sm text-slate-400">No activities yet.</p> : null}
        {data && data.length > 0 ? (
          <div className="max-h-80 space-y-2 overflow-y-auto">
            {data.map((a) => {
              const overdue = a.status === 'open' && a.dueAt && new Date(a.dueAt).getTime() < now;
              return (
                <div key={a.id} className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-sm">
                  <div>
                    <span className="mr-2">{typeIcon(a.activityType)}</span>
                    <span className={a.status === 'completed' ? 'text-slate-400 line-through' : 'text-slate-800'}>{a.subject}</span>
                    {a.dueAt ? (
                      <span className={`ml-2 text-xs ${overdue ? 'font-medium text-red-600' : 'text-slate-400'}`}>
                        {overdue ? '⚠ ' : ''}{new Date(a.dueAt).toLocaleString()}
                      </span>
                    ) : null}
                  </div>
                  {a.status === 'open' ? (
                    <button type="button" className="text-xs font-medium text-emerald-600 hover:underline disabled:opacity-50" disabled={busy === a.id} onClick={() => complete(a.id)}>
                      Complete
                    </button>
                  ) : (
                    <Badge variant={a.status === 'completed' ? 'green' : 'default'}>{a.status}</Badge>
                  )}
                </div>
              );
            })}
          </div>
        ) : null}
      </div>
    </Modal>
  );
}
