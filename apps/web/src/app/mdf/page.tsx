'use client';

import { useFetch } from '@/hooks/useFetch';
import { formatCurrency, formatDate } from '@/lib/format';
import { PageHeader } from '@/components/ui/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { LoadingState } from '@/components/ui/LoadingState';
import { ErrorState } from '@/components/ui/ErrorState';
import { apiFetch } from '@/lib/api';

type MdfRequest = {
  id: string;
  requestNumber: string;
  title: string;
  amount: string;
  status: string;
  purpose: string | null;
  eventDate: string | null;
  partnerAccount: { name: string };
};

export default function MdfPage() {
  const { data, loading, error, reload } = useFetch<MdfRequest[]>('/mdf');

  async function review(id: string, status: 'approved' | 'rejected') {
    await apiFetch(`/mdf/${id}/review`, { method: 'POST', body: JSON.stringify({ status }) });
    await reload();
  }

  return (
    <div className="p-8">
      <PageHeader title="MDF Requests" description="Partner marketing development fund requests and approvals" />
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        {loading ? <LoadingState /> : null}
        {error ? <ErrorState message={error} onRetry={reload} /> : null}
        {!loading && !error && data && data.length > 0 ? (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-6 py-3">Request #</th>
                <th className="px-6 py-3">Title</th>
                <th className="px-6 py-3">Partner</th>
                <th className="px-6 py-3">Amount</th>
                <th className="px-6 py-3">Event</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 font-medium">{r.requestNumber}</td>
                  <td className="px-6 py-4">{r.title}</td>
                  <td className="px-6 py-4">{r.partnerAccount.name}</td>
                  <td className="px-6 py-4">{formatCurrency(r.amount)}</td>
                  <td className="px-6 py-4">{formatDate(r.eventDate)}</td>
                  <td className="px-6 py-4"><Badge variant={r.status === 'approved' ? 'green' : r.status === 'submitted' ? 'yellow' : 'default'}>{r.status}</Badge></td>
                  <td className="px-6 py-4">
                    {r.status === 'submitted' ? (
                      <div className="flex gap-2">
                        <button type="button" className="text-xs text-green-600 hover:underline" onClick={() => review(r.id, 'approved')}>Approve</button>
                        <button type="button" className="text-xs text-red-600 hover:underline" onClick={() => review(r.id, 'rejected')}>Reject</button>
                      </div>
                    ) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : null}
      </div>
    </div>
  );
}