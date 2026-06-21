'use client';

import { useFetch } from '@/hooks/useFetch';
import { formatCurrency, formatDate } from '@/lib/format';
import { PageHeader } from '@/components/ui/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { LoadingState } from '@/components/ui/LoadingState';
import { ErrorState } from '@/components/ui/ErrorState';
import { apiFetch } from '@/lib/api';

type Registration = {
  id: string;
  registrationNumber: string;
  dealName: string;
  amount: string | null;
  status: string;
  expectedCloseDate: string | null;
  partnerAccount: { name: string };
  registeredBy: { firstName: string; lastName: string };
};

export default function DealRegistrationsPage() {
  const { data, loading, error, reload } = useFetch<Registration[]>('/deal-registrations');

  async function review(id: string, status: 'approved' | 'rejected') {
    await apiFetch(`/deal-registrations/${id}/review`, {
      method: 'POST',
      body: JSON.stringify({ status }),
    });
    await reload();
  }

  return (
    <div className="p-8">
      <PageHeader title="Deal Registration" description="PRM — partner deal protection and approval" />
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        {loading ? <LoadingState /> : null}
        {error ? <ErrorState message={error} onRetry={reload} /> : null}
        {!loading && !error && data && data.length > 0 ? (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-6 py-3">Registration #</th>
                <th className="px-6 py-3">Deal</th>
                <th className="px-6 py-3">Partner</th>
                <th className="px-6 py-3">Amount</th>
                <th className="px-6 py-3">Close Date</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 font-medium">{r.registrationNumber}</td>
                  <td className="px-6 py-4">{r.dealName}</td>
                  <td className="px-6 py-4">{r.partnerAccount.name}</td>
                  <td className="px-6 py-4">{formatCurrency(r.amount)}</td>
                  <td className="px-6 py-4">{formatDate(r.expectedCloseDate)}</td>
                  <td className="px-6 py-4">
                    <Badge variant={r.status === 'approved' ? 'green' : r.status === 'pending' ? 'yellow' : 'red'}>{r.status}</Badge>
                  </td>
                  <td className="px-6 py-4">
                    {r.status === 'pending' ? (
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