'use client';

import { useFetch } from '@/hooks/useFetch';
import { formatCurrency, formatDate } from '@/lib/format';
import { PageHeader } from '@/components/ui/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { LoadingState } from '@/components/ui/LoadingState';
import { ErrorState } from '@/components/ui/ErrorState';

type Campaign = {
  id: string;
  name: string;
  campaignType: string;
  status: string;
  targetSegment: string | null;
  budget: string | null;
  startDate: string | null;
  endDate: string | null;
  members: { account: { name: string } }[];
};

export default function MarketingPage() {
  const { data, loading, error, reload } = useFetch<Campaign[]>('/marketing/campaigns');

  return (
    <div className="p-8">
      <PageHeader title="Marketing" description="Account-based campaigns and nurture programs" />
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        {loading ? <LoadingState /> : null}
        {error ? <ErrorState message={error} onRetry={reload} /> : null}
        {!loading && !error && data && data.length > 0 ? (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-6 py-3">Campaign</th>
                <th className="px-6 py-3">Type</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Segment</th>
                <th className="px-6 py-3">Members</th>
                <th className="px-6 py-3">Budget</th>
                <th className="px-6 py-3">Dates</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 font-medium">{c.name}</td>
                  <td className="px-6 py-4">{c.campaignType}</td>
                  <td className="px-6 py-4"><Badge variant={c.status === 'active' ? 'green' : 'default'}>{c.status}</Badge></td>
                  <td className="px-6 py-4 text-slate-500">{c.targetSegment ?? '—'}</td>
                  <td className="px-6 py-4">{c.members.length}</td>
                  <td className="px-6 py-4">{formatCurrency(c.budget)}</td>
                  <td className="px-6 py-4 text-xs text-slate-500">{formatDate(c.startDate)} — {formatDate(c.endDate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : null}
      </div>
    </div>
  );
}