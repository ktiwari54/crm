'use client';

import { useFetch } from '@/hooks/useFetch';
import { formatDate } from '@/lib/format';
import { PageHeader } from '@/components/ui/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { LoadingState } from '@/components/ui/LoadingState';
import { ErrorState } from '@/components/ui/ErrorState';
import { apiFetch } from '@/lib/api';

type Incident = {
  id: string;
  incidentNumber: string;
  title: string;
  status: string;
  severity: string;
  startedAt: string;
  accounts: { account: { name: string } }[];
};

export default function IncidentsPage() {
  const { data, loading, error, reload } = useFetch<Incident[]>('/incidents');

  async function resolve(id: string) {
    await apiFetch(`/incidents/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status: 'resolved' }) });
    await reload();
  }

  const sevVariant = (s: string) => (s === 'critical' || s === 'high' ? 'red' : s === 'medium' ? 'yellow' : 'default');

  return (
    <div className="p-8">
      <PageHeader title="Incidents" description="Major incident management — bulk outages and customer impact" />
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        {loading ? <LoadingState /> : null}
        {error ? <ErrorState message={error} onRetry={reload} /> : null}
        {!loading && !error && data && data.length > 0 ? (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-6 py-3">Incident #</th>
                <th className="px-6 py-3">Title</th>
                <th className="px-6 py-3">Severity</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Affected Accounts</th>
                <th className="px-6 py-3">Started</th>
                <th className="px-6 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.map((i) => (
                <tr key={i.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 font-medium">{i.incidentNumber}</td>
                  <td className="px-6 py-4">{i.title}</td>
                  <td className="px-6 py-4"><Badge variant={sevVariant(i.severity)}>{i.severity}</Badge></td>
                  <td className="px-6 py-4"><Badge variant={i.status === 'resolved' ? 'green' : 'yellow'}>{i.status}</Badge></td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      {i.accounts.map((a) => (
                        <span key={a.account.name} className="rounded bg-slate-100 px-2 py-0.5 text-xs">{a.account.name}</span>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4">{formatDate(i.startedAt)}</td>
                  <td className="px-6 py-4">
                    {i.status !== 'resolved' ? (
                      <button type="button" className="text-xs text-blue-600 hover:underline" onClick={() => resolve(i.id)}>Resolve</button>
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