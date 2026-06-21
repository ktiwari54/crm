'use client';

import { useFetch } from '@/hooks/useFetch';
import { formatCurrency, formatNumber } from '@/lib/format';
import { PageHeader } from '@/components/ui/PageHeader';
import { LoadingState } from '@/components/ui/LoadingState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Badge } from '@/components/ui/Badge';

type PipelineStage = {
  stageId: string;
  pipelineName: string;
  stageName: string;
  dealCount: number;
  totalAmount: number;
  defaultProbability: number;
};

type QuotesSummary = {
  byStatus: { status: string; _count: number; _sum: { total: string | null } }[];
  last30Days: {
    won: number;
    lost: number;
    wonValue: number;
    lostValue: number;
  };
};

type LowStock = {
  atp: string;
  product: { sku: string; name: string };
  warehouse: { code: string };
};

type Leaderboard = {
  period: string;
  leaderboard: { rank: number; name: string; points: number; metric: string }[];
};

export default function DashboardPage() {
  const pipeline = useFetch<PipelineStage[]>('/reports/pipeline-by-stage');
  const quotes = useFetch<QuotesSummary>('/reports/quotes-summary');
  const lowStock = useFetch<LowStock[]>('/reports/inventory-low-stock');
  const leaderboard = useFetch<Leaderboard>('/gamification/leaderboard');

  const openDeals =
    pipeline.data?.reduce((sum, s) => {
      if (s.stageName.startsWith('Closed')) return sum;
      return sum + s.dealCount;
    }, 0) ?? 0;

  const pipelineValue =
    pipeline.data?.reduce((sum, s) => {
      if (s.stageName.startsWith('Closed')) return sum;
      return sum + s.totalAmount;
    }, 0) ?? 0;

  const draftQuotes =
    quotes.data?.byStatus.find((s) => s.status === 'draft')?._count ?? 0;
  const sentQuotes =
    quotes.data?.byStatus.find((s) => s.status === 'sent')?._count ?? 0;

  const loading = pipeline.loading || quotes.loading || lowStock.loading;
  const error = pipeline.error || quotes.error || lowStock.error;

  return (
    <div className="p-8">
      <PageHeader
        title="Dashboard"
        description="Manager KPIs — pipeline, quotes, and inventory overview"
      />

      {loading ? <LoadingState /> : null}
      {error ? <ErrorState message={error} /> : null}

      {!loading && !error ? (
        <>
          {leaderboard.data && leaderboard.data.leaderboard.length > 0 ? (
            <div className="mb-8 rounded-xl border border-violet-200 bg-violet-50 p-6">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-violet-900">Rep Leaderboard</h2>
                <span className="text-xs text-violet-600">{leaderboard.data.period}</span>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {leaderboard.data.leaderboard.slice(0, 3).map((entry) => (
                  <div key={entry.rank} className="flex items-center gap-3 rounded-lg bg-white/80 px-4 py-3">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-violet-600 text-sm font-bold text-white">
                      {entry.rank}
                    </span>
                    <div>
                      <p className="font-medium text-violet-900">{entry.name}</p>
                      <p className="text-xs text-violet-600">{entry.points} pts</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard
              label="Open Deals"
              value={String(openDeals)}
              sub={formatCurrency(pipelineValue)}
            />
            <KpiCard
              label="Quotes"
              value={String(draftQuotes + sentQuotes)}
              sub={`${draftQuotes} draft · ${sentQuotes} sent`}
            />
            <KpiCard
              label="Won (30d)"
              value={String(quotes.data?.last30Days.won ?? 0)}
              sub={formatCurrency(quotes.data?.last30Days.wonValue)}
            />
            <KpiCard
              label="Low Stock SKUs"
              value={String(lowStock.data?.length ?? 0)}
              sub="ATP ≤ 10 units"
            />
          </div>

          <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">
                Pipeline by Stage
              </h2>
              <div className="mt-4 space-y-3">
                {pipeline.data?.map((stage) => (
                  <div
                    key={stage.stageId}
                    className="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-3"
                  >
                    <div>
                      <p className="text-sm font-medium text-slate-900">
                        {stage.stageName}
                      </p>
                      <p className="text-xs text-slate-500">
                        {stage.pipelineName} · {stage.dealCount} deals ·{' '}
                        {stage.defaultProbability}% prob.
                      </p>
                    </div>
                    <p className="text-sm font-semibold text-slate-900">
                      {formatCurrency(stage.totalAmount)}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">
                Quotes Summary
              </h2>
              <div className="mt-4 space-y-3">
                {quotes.data?.byStatus.map((row) => (
                  <div
                    key={row.status}
                    className="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-3"
                  >
                    <Badge variant={quoteVariant(row.status)}>
                      {row.status}
                    </Badge>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-slate-900">
                        {row._count} quotes
                      </p>
                      <p className="text-xs text-slate-500">
                        {formatCurrency(row._sum.total)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {lowStock.data && lowStock.data.length > 0 ? (
            <div className="mt-8 rounded-xl border border-amber-200 bg-amber-50 p-6">
              <h2 className="text-lg font-semibold text-amber-900">
                Low Stock Alert
              </h2>
              <div className="mt-4 space-y-2">
                {lowStock.data.map((item, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="font-medium text-amber-900">
                      {item.product.sku} — {item.product.name}
                    </span>
                    <span className="text-amber-700">
                      {formatNumber(item.atp)} ATP ({item.warehouse.code})
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

function KpiCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-bold text-slate-900">{value}</p>
      <p className="mt-1 text-xs text-slate-400">{sub}</p>
    </div>
  );
}

function quoteVariant(status: string) {
  if (status === 'accepted') return 'green';
  if (status === 'sent') return 'blue';
  if (status === 'draft') return 'yellow';
  if (status === 'rejected') return 'red';
  return 'default';
}