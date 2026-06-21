'use client';

import { useFetch } from '@/hooks/useFetch';
import { formatDate } from '@/lib/format';
import { PageHeader } from '@/components/ui/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { LoadingState } from '@/components/ui/LoadingState';
import { ErrorState } from '@/components/ui/ErrorState';
import { apiFetch } from '@/lib/api';

type Rma = {
  id: string;
  rmaNumber: string;
  reason: string;
  status: string;
  requestedAt: string;
  asset: { serialNumber: string; product: { sku: string; name: string } };
  account: { name: string };
};

export default function RmaPage() {
  const { data, loading, error, reload } = useFetch<Rma[]>('/rma');

  async function updateStatus(id: string, status: string) {
    await apiFetch(`/rma/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });
    await reload();
  }

  return (
    <div className="p-8">
      <PageHeader title="RMA & Warranty" description="Returns, repairs, and warranty claims for electronics" />
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        {loading ? <LoadingState /> : null}
        {error ? <ErrorState message={error} onRetry={reload} /> : null}
        {!loading && !error && data && data.length > 0 ? (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-6 py-3">RMA #</th>
                <th className="px-6 py-3">Serial</th>
                <th className="px-6 py-3">Product</th>
                <th className="px-6 py-3">Account</th>
                <th className="px-6 py-3">Reason</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Requested</th>
                <th className="px-6 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 font-medium">{r.rmaNumber}</td>
                  <td className="px-6 py-4 font-mono text-xs">{r.asset.serialNumber}</td>
                  <td className="px-6 py-4">{r.asset.product.sku}</td>
                  <td className="px-6 py-4">{r.account.name}</td>
                  <td className="px-6 py-4 max-w-xs truncate">{r.reason}</td>
                  <td className="px-6 py-4"><Badge variant={r.status === 'closed' ? 'green' : r.status === 'requested' ? 'yellow' : 'default'}>{r.status}</Badge></td>
                  <td className="px-6 py-4">{formatDate(r.requestedAt)}</td>
                  <td className="px-6 py-4">
                    {r.status === 'requested' ? (
                      <button type="button" className="text-xs text-blue-600 hover:underline" onClick={() => updateStatus(r.id, 'approved')}>Approve</button>
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