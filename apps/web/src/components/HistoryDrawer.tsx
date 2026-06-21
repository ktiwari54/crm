'use client';

import { useState } from 'react';
import { apiFetch } from '@/lib/api';
import { useFetch } from '@/hooks/useFetch';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { LoadingState } from '@/components/ui/LoadingState';

type AuditEntry = {
  id: string;
  action: string;
  changes: Record<string, { from: unknown; to: unknown }> | null;
  reverted: boolean;
  createdAt: string;
  user: { firstName: string; lastName: string } | null;
  revertedBy: { firstName: string; lastName: string } | null;
};

function fmt(v: unknown): string {
  if (v === null || v === undefined || v === '') return '∅';
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}

/**
 * Timeline + audit log for any tracked entity, with per-change Undo buttons.
 * `entityType` is one of: lead | account | contact | deal.
 */
export function HistoryDrawer({
  entityType,
  entityId,
  title,
  onClose,
  onReverted,
}: {
  entityType: string;
  entityId: string;
  title: string;
  onClose: () => void;
  onReverted?: () => void;
}) {
  const { data, loading, reload } = useFetch<AuditEntry[]>(
    `/audit-log?entityType=${entityType}&entityId=${entityId}`,
  );
  const [busy, setBusy] = useState('');

  async function undo(id: string) {
    if (!confirm('Revert this change?')) return;
    setBusy(id);
    try {
      await apiFetch(`/audit-log/${id}/revert`, { method: 'POST' });
      await reload();
      onReverted?.();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to revert');
    } finally {
      setBusy('');
    }
  }

  return (
    <Modal open title={`History — ${title}`} onClose={onClose}>
      {loading ? <LoadingState /> : null}
      {data && data.length === 0 ? (
        <p className="py-6 text-center text-sm text-slate-400">No recorded changes yet.</p>
      ) : null}
      {data && data.length > 0 ? (
        <div className="max-h-[28rem] space-y-3 overflow-y-auto">
          {data.map((e) => (
            <div key={e.id} className="rounded-lg border border-slate-200 p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant={e.action === 'create' ? 'green' : e.action === 'delete' ? 'red' : 'blue'}>
                    {e.action}
                  </Badge>
                  <span className="text-xs text-slate-500">
                    {new Date(e.createdAt).toLocaleString()}
                    {e.user ? ` · ${e.user.firstName} ${e.user.lastName}` : ''}
                  </span>
                </div>
                {e.reverted ? (
                  <span className="text-xs text-slate-400">
                    reverted{e.revertedBy ? ` by ${e.revertedBy.firstName}` : ''}
                  </span>
                ) : (
                  <button
                    type="button"
                    className="text-xs font-medium text-amber-600 hover:underline disabled:opacity-50"
                    disabled={busy === e.id}
                    onClick={() => undo(e.id)}
                  >
                    {busy === e.id ? 'Reverting…' : '↩ Undo'}
                  </button>
                )}
              </div>
              {e.changes && Object.keys(e.changes).length > 0 ? (
                <div className="mt-2 space-y-1">
                  {Object.entries(e.changes).map(([field, c]) => (
                    <div key={field} className="text-xs text-slate-600">
                      <span className="font-medium text-slate-700">{field}</span>:{' '}
                      <span className="text-slate-400 line-through">{fmt(c.from)}</span>{' '}
                      → <span className="text-slate-800">{fmt(c.to)}</span>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}
    </Modal>
  );
}
