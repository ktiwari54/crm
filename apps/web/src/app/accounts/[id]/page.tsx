'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useFetch } from '@/hooks/useFetch';
import { formatCurrency, formatDate } from '@/lib/format';
import { PageHeader } from '@/components/ui/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { LoadingState } from '@/components/ui/LoadingState';
import { ErrorState } from '@/components/ui/ErrorState';

type AccountGraph = {
  account: {
    id: string;
    name: string;
    accountType: string;
    healthScore: string | null;
    industry: string | null;
    erpExternalId: string | null;
    syncStatus: string;
    owner: { firstName: string; lastName: string } | null;
    territory: { name: string } | null;
  };
  summary: {
    contacts: number;
    openDeals: number;
    quotes: number;
    orders: number;
    cases: number;
    assets: number;
    erpEvents: number;
    crmRevenue: number;
    erpRevenue: number;
  };
  timeline: {
    source: string;
    type: string;
    title: string;
    description: string | null;
    amount: string | null;
    occurredAt: string;
    owner?: string | null;
  }[];
  deals: { id: string; name: string; amount: string; pipelineStage: { name: string } }[];
  erpEvents: { id: string; eventType: string; title: string; amount: string | null; occurredAt: string }[];
};

export default function AccountGraphPage() {
  const params = useParams();
  const accountId = params.id as string;
  const { data, loading, error, reload } = useFetch<AccountGraph>(
    accountId ? `/data-graph/account/${accountId}` : null,
    [accountId],
  );

  return (
    <div className="p-8">
      <PageHeader
        title={data?.account.name ?? 'Account 360°'}
        description="Unified customer graph — CRM + ERP events"
        action={
          <Link href="/accounts" className="text-sm text-blue-600 hover:underline">
            ← Back to Accounts
          </Link>
        }
      />

      {loading ? <LoadingState /> : null}
      {error ? <ErrorState message={error} onRetry={reload} /> : null}

      {data ? (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center gap-3">
            <Badge>{data.account.accountType}</Badge>
            {data.account.healthScore ? (
              <Badge variant={data.account.healthScore === 'active' ? 'green' : 'yellow'}>
                {data.account.healthScore}
              </Badge>
            ) : null}
            {data.account.erpExternalId ? (
              <span className="text-xs text-slate-500">ERP: {data.account.erpExternalId}</span>
            ) : null}
            <Badge variant="default">Sync: {data.account.syncStatus}</Badge>
          </div>

          <div className="grid gap-4 md:grid-cols-4">
            {[
              ['Contacts', data.summary.contacts],
              ['Open Deals', data.summary.openDeals],
              ['Orders', data.summary.orders],
              ['ERP Events', data.summary.erpEvents],
            ].map(([label, value]) => (
              <div key={label as string} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-xs font-semibold uppercase text-slate-500">{label as string}</p>
                <p className="mt-1 text-2xl font-bold text-slate-900">{value as number}</p>
              </div>
            ))}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <p className="mb-3 font-semibold text-slate-800">Revenue Signals</p>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>CRM Order Revenue</span>
                  <span className="font-medium">{formatCurrency(data.summary.crmRevenue)}</span>
                </div>
                <div className="flex justify-between">
                  <span>ERP Posted Revenue</span>
                  <span className="font-medium">{formatCurrency(data.summary.erpRevenue)}</span>
                </div>
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <p className="mb-3 font-semibold text-slate-800">Active Deals</p>
              {data.deals.slice(0, 5).map((d) => (
                <div key={d.id} className="mb-2 flex justify-between text-sm">
                  <span>{d.name}</span>
                  <span className="text-slate-500">{d.pipelineStage.name}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-6 py-4">
              <h2 className="font-semibold text-slate-900">Unified Timeline</h2>
              <p className="text-xs text-slate-500">CRM activities, orders, and ERP sync events</p>
            </div>
            <div className="divide-y divide-slate-100">
              {data.timeline.map((event, i) => (
                <div key={i} className="flex items-start gap-4 px-6 py-4">
                  <div
                    className={`mt-1 h-2 w-2 flex-shrink-0 rounded-full ${
                      event.source === 'erp' ? 'bg-indigo-500' : 'bg-blue-500'
                    }`}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-slate-900">{event.title}</p>
                      <Badge variant={event.source === 'erp' ? 'blue' : 'default'}>{event.source}</Badge>
                      <span className="text-xs text-slate-400">{event.type}</span>
                    </div>
                    {event.description ? (
                      <p className="mt-0.5 text-sm text-slate-500">{event.description}</p>
                    ) : null}
                    <p className="mt-1 text-xs text-slate-400">{formatDate(event.occurredAt)}</p>
                  </div>
                  {event.amount ? (
                    <span className="text-sm font-medium text-slate-700">
                      {formatCurrency(event.amount)}
                    </span>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}