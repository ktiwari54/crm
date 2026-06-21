'use client';

import { useFetch } from '@/hooks/useFetch';
import { formatCurrency } from '@/lib/format';
import { PageHeader } from '@/components/ui/PageHeader';
import { LoadingState } from '@/components/ui/LoadingState';
import { ErrorState } from '@/components/ui/ErrorState';

type RevopsDashboard = {
  pipeline: { openDeals: number; totalValue: number; commitValue: number; byStage: { stage: string; count: number; value: number }[] };
  quotes: { conversionRate: number; byStatus: { status: string; count: number; total: number }[] };
  revenue: { booked: number; outstandingAr: number };
  operations: { openCases: number; pendingApprovals: number; pendingDealRegistrations: number; pendingMdfRequests: number; atRiskAccounts: number };
};

type PrmAnalytics = {
  partnerCount: number;
  pipeline: { openValue: number; dealCount: number; winRate: number };
  mdf: { approvedTotal: number; roiEstimate: number };
  enablement: { enrolled: number; completed: number; inProgress: number };
};

type Attribution = {
  summary: { totalAttributedRevenue: number; totalTouchpoints: number; wonDeals: number; bookedOrders: number };
  byRep: { repName: string; activities: number; attributedRevenue: number; wonDeals: number; orders: number }[];
  byChannel: { channel: string; count: number }[];
  methodology: string;
};

export default function RevopsPage() {
  const { data, loading, error, reload } = useFetch<RevopsDashboard>('/revops/dashboard');
  const prm = useFetch<PrmAnalytics>('/prm/analytics');
  const attribution = useFetch<Attribution>('/analytics/attribution');

  return (
    <div className="p-8">
      <PageHeader title="RevOps Dashboard" description="Cross-functional revenue metrics for sales, finance, and legal" />
      {loading ? <LoadingState /> : null}
      {error ? <ErrorState message={error} onRetry={reload} /> : null}
      {data ? (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-4">
            {[
              ['Pipeline Value', formatCurrency(data.pipeline.totalValue)],
              ['Commit Forecast', formatCurrency(data.pipeline.commitValue)],
              ['Revenue Booked', formatCurrency(data.revenue.booked)],
              ['Outstanding AR', formatCurrency(data.revenue.outstandingAr)],
            ].map(([label, value]) => (
              <div key={label} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-xs font-semibold uppercase text-slate-500">{label}</p>
                <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
              </div>
            ))}
          </div>
          {prm.data ? (
            <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-6">
              <p className="mb-4 font-semibold text-indigo-900">PRM Analytics</p>
              <div className="grid gap-4 md:grid-cols-4">
                {[
                  ['Partners', String(prm.data.partnerCount)],
                  ['Partner Pipeline', formatCurrency(prm.data.pipeline.openValue)],
                  ['Partner Win Rate', `${prm.data.pipeline.winRate}%`],
                  ['MDF ROI Est.', `${prm.data.mdf.roiEstimate}x`],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-lg bg-white/80 p-4">
                    <p className="text-xs font-semibold uppercase text-indigo-600">{label}</p>
                    <p className="mt-1 text-lg font-bold text-indigo-900">{value}</p>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-sm text-indigo-700">
                Enablement: {prm.data.enablement.inProgress} in progress · {prm.data.enablement.completed} completed
              </p>
            </div>
          ) : null}
          {attribution.data ? (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-6">
              <p className="mb-1 font-semibold text-emerald-900">Revenue Attribution</p>
              <p className="mb-4 text-xs text-emerald-700">{attribution.data.methodology}</p>
              <div className="grid gap-4 md:grid-cols-4">
                {[
                  ['Attributed Revenue', formatCurrency(attribution.data.summary.totalAttributedRevenue)],
                  ['Touchpoints', String(attribution.data.summary.totalTouchpoints)],
                  ['Won Deals', String(attribution.data.summary.wonDeals)],
                  ['Booked Orders', String(attribution.data.summary.bookedOrders)],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-lg bg-white/80 p-4">
                    <p className="text-xs font-semibold uppercase text-emerald-600">{label}</p>
                    <p className="mt-1 text-lg font-bold text-emerald-900">{value}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div>
                  <p className="mb-2 text-sm font-medium text-emerald-800">By Rep</p>
                  {attribution.data.byRep.slice(0, 5).map((rep) => (
                    <div key={rep.repName} className="mb-2 flex justify-between text-sm">
                      <span>{rep.repName}</span>
                      <span className="font-medium">{formatCurrency(rep.attributedRevenue)}</span>
                    </div>
                  ))}
                </div>
                <div>
                  <p className="mb-2 text-sm font-medium text-emerald-800">By Channel</p>
                  {attribution.data.byChannel.map((ch) => (
                    <div key={ch.channel} className="mb-2 flex justify-between text-sm">
                      <span>{ch.channel}</span>
                      <span className="font-medium">{ch.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : null}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <p className="mb-4 font-semibold text-slate-800">Pipeline by Stage</p>
              {data.pipeline.byStage.map((s) => (
                <div key={s.stage} className="mb-2 flex justify-between text-sm">
                  <span>{s.stage} ({s.count})</span>
                  <span className="font-medium">{formatCurrency(s.value)}</span>
                </div>
              ))}
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <p className="mb-4 font-semibold text-slate-800">Operations Queue</p>
              {[
                ['Open Cases', data.operations.openCases],
                ['Pending Approvals', data.operations.pendingApprovals],
                ['Deal Registrations', data.operations.pendingDealRegistrations],
                ['MDF Requests', data.operations.pendingMdfRequests],
                ['At-Risk Accounts', data.operations.atRiskAccounts],
              ].map(([label, count]) => (
                <div key={label as string} className="mb-2 flex justify-between text-sm">
                  <span>{label as string}</span>
                  <span className="font-medium">{count as number}</span>
                </div>
              ))}
              <p className="mt-4 text-sm text-slate-500">Quote conversion (30d): {data.quotes.conversionRate}%</p>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}