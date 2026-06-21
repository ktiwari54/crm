'use client';

import { useFetch } from '@/hooks/useFetch';
import { formatCurrency } from '@/lib/format';
import { PageHeader } from '@/components/ui/PageHeader';
import { LoadingState } from '@/components/ui/LoadingState';
import { ErrorState } from '@/components/ui/ErrorState';

type PricingDashboard = {
  period: string;
  summary: {
    quoteRevenue: number;
    orderRevenue: number;
    avgMarginPercent: number;
    quoteCount: number;
    acceptedQuotes: number;
  };
  byProduct: { sku: string; name?: string; revenue: number }[];
  byAccount: { account: string; revenue: number }[];
  byRep: { rep: string; revenue: number }[];
};

export default function PricingAnalyticsPage() {
  const { data, loading, error, reload } = useFetch<PricingDashboard>('/analytics/pricing');

  return (
    <div className="p-8">
      <PageHeader title="Pricing Analytics" description="Margin and revenue performance by product, account, and rep" />
      {loading ? <LoadingState /> : null}
      {error ? <ErrorState message={error} onRetry={reload} /> : null}
      {data ? (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-4">
            {[
              ['Quote Revenue', formatCurrency(data.summary.quoteRevenue)],
              ['Order Revenue', formatCurrency(data.summary.orderRevenue)],
              ['Avg Margin', `${data.summary.avgMarginPercent}%`],
              ['Quotes Accepted', `${data.summary.acceptedQuotes}/${data.summary.quoteCount}`],
            ].map(([label, value]) => (
              <div key={label} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-xs font-semibold uppercase text-slate-500">{label}</p>
                <p className="mt-2 text-2xl font-bold">{value}</p>
              </div>
            ))}
          </div>
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <p className="mb-4 font-semibold">Top Products</p>
              {data.byProduct.map((p) => (
                <div key={p.sku} className="mb-2 flex justify-between text-sm">
                  <span>{p.sku}</span>
                  <span className="font-medium">{formatCurrency(p.revenue)}</span>
                </div>
              ))}
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <p className="mb-4 font-semibold">Top Accounts</p>
              {data.byAccount.map((a) => (
                <div key={a.account} className="mb-2 flex justify-between text-sm">
                  <span className="truncate pr-2">{a.account}</span>
                  <span className="font-medium">{formatCurrency(a.revenue)}</span>
                </div>
              ))}
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <p className="mb-4 font-semibold">By Rep</p>
              {data.byRep.map((r) => (
                <div key={r.rep} className="mb-2 flex justify-between text-sm">
                  <span>{r.rep}</span>
                  <span className="font-medium">{formatCurrency(r.revenue)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}