'use client';

import { useFetch } from '@/hooks/useFetch';
import { formatCurrency, formatDateTime } from '@/lib/format';
import { PageHeader } from '@/components/ui/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { LoadingState } from '@/components/ui/LoadingState';
import { ErrorState } from '@/components/ui/ErrorState';
import { btnPrimary, btnSecondary } from '@/components/ui/FormField';
import { apiFetch } from '@/lib/api';

type Approval = {
  id: string;
  entityType: string;
  approvalType: string;
  status: string;
  reason: string | null;
  thresholdValue: string | null;
  actualValue: string | null;
  createdAt: string;
  requestedBy: { firstName: string; lastName: string };
};

export default function ApprovalsPage() {
  const { data, loading, error, reload } = useFetch<Approval[]>('/approvals?status=pending');

  async function review(id: string, status: 'approved' | 'rejected') {
    await apiFetch(`/approvals/${id}/review`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
    await reload();
  }

  return (
    <div className="p-8">
      <PageHeader title="Approvals" description="Multi-level quote approvals — margin, discount, and value thresholds" />
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        {loading ? <LoadingState /> : null}
        {error ? <ErrorState message={error} onRetry={reload} /> : null}
        {!loading && !error && data && data.length > 0 ? (
          <div className="divide-y divide-slate-100">
            {data.map((a) => (
              <div key={a.id} className="flex flex-wrap items-center justify-between gap-4 px-6 py-4">
                <div>
                  <div className="flex items-center gap-2">
                    <Badge variant="yellow">{a.approvalType.replace('_', ' ')}</Badge>
                    <span className="text-sm font-medium text-slate-900">{a.entityType} approval</span>
                  </div>
                  <p className="mt-1 text-sm text-slate-600">{a.reason}</p>
                  <p className="mt-1 text-xs text-slate-400">
                    {a.requestedBy.firstName} {a.requestedBy.lastName} · {formatDateTime(a.createdAt)}
                    {a.actualValue ? ` · Actual: ${formatCurrency(a.actualValue)}` : ''}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button type="button" className={btnPrimary} onClick={() => review(a.id, 'approved')}>Approve</button>
                  <button type="button" className={btnSecondary} onClick={() => review(a.id, 'rejected')}>Reject</button>
                </div>
              </div>
            ))}
          </div>
        ) : !loading && !error ? (
          <p className="px-6 py-12 text-center text-sm text-slate-400">No pending approvals.</p>
        ) : null}
      </div>
    </div>
  );
}