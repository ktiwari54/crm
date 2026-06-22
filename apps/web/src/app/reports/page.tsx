'use client';

import { useFetch } from '@/hooks/useFetch';
import { formatCurrency, formatNumber } from '@/lib/format';
import { PageHeader } from '@/components/ui/PageHeader';
import { LoadingState } from '@/components/ui/LoadingState';

type StageRow = { stageName: string; pipelineName: string; dealCount: number; totalAmount: number };
type SourceRow = { source: string; total: number; converted: number; conversionRate: number };
type FunnelRow = { status: string; count: number };
type RevenueRow = { month: string; invoiced: number; collected: number };

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">{title}</h2>
      {children}
    </div>
  );
}

// Horizontal bar row
function Bar({ label, value, max, display, color = 'bg-blue-500' }: { label: string; value: number; max: number; display: string; color?: string }) {
  const pct = max > 0 ? Math.max(2, Math.round((value / max) * 100)) : 0;
  return (
    <div className="flex items-center gap-3 text-sm">
      <div className="w-28 shrink-0 truncate text-slate-600" title={label}>{label}</div>
      <div className="flex-1">
        <div className="h-5 overflow-hidden rounded bg-slate-100">
          <div className={`h-full ${color}`} style={{ width: `${pct}%` }} />
        </div>
      </div>
      <div className="w-24 shrink-0 text-right font-medium text-slate-800">{display}</div>
    </div>
  );
}

export default function ReportsPage() {
  const pipeline = useFetch<StageRow[]>('/reports/pipeline-by-stage');
  const source = useFetch<SourceRow[]>('/reports/lead-source');
  const funnel = useFetch<FunnelRow[]>('/reports/lead-funnel');
  const revenue = useFetch<RevenueRow[]>('/reports/revenue-by-month');

  const loading = pipeline.loading || source.loading || funnel.loading || revenue.loading;

  const pipeMax = Math.max(1, ...(pipeline.data ?? []).map((s) => s.totalAmount));
  const srcMax = Math.max(1, ...(source.data ?? []).map((s) => s.total));
  const funnelMax = Math.max(1, ...(funnel.data ?? []).map((s) => s.count));
  const revMax = Math.max(1, ...(revenue.data ?? []).map((r) => r.invoiced));

  const funnelColor: Record<string, string> = {
    new: 'bg-slate-400', working: 'bg-blue-400', qualified: 'bg-indigo-500',
    converted: 'bg-emerald-500', disqualified: 'bg-red-400',
  };

  return (
    <div className="p-8">
      <PageHeader title="Reports & Analytics" description="Pipeline, lead conversion, sources, and revenue" />

      {loading ? <LoadingState /> : null}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card title="Pipeline by Stage (value)">
          <div className="space-y-2">
            {(pipeline.data ?? []).map((s) => (
              <Bar key={`${s.pipelineName}-${s.stageName}`} label={s.stageName} value={s.totalAmount} max={pipeMax} display={`${formatCurrency(s.totalAmount)} · ${s.dealCount}`} />
            ))}
            {pipeline.data?.length === 0 ? <p className="text-sm text-slate-400">No deals.</p> : null}
          </div>
        </Card>

        <Card title="Lead Funnel">
          <div className="space-y-2">
            {(funnel.data ?? []).map((s) => (
              <Bar key={s.status} label={s.status} value={s.count} max={funnelMax} display={formatNumber(s.count)} color={funnelColor[s.status] ?? 'bg-blue-500'} />
            ))}
          </div>
        </Card>

        <Card title="Leads by Source & Conversion">
          <div className="space-y-2">
            {(source.data ?? []).map((s) => (
              <Bar key={s.source} label={s.source} value={s.total} max={srcMax} display={`${s.total} · ${s.conversionRate}%`} color="bg-violet-500" />
            ))}
            {source.data?.length === 0 ? <p className="text-sm text-slate-400">No leads.</p> : null}
          </div>
        </Card>

        <Card title="Revenue by Month (invoiced vs collected)">
          <div className="space-y-2">
            {(revenue.data ?? []).map((r) => (
              <div key={r.month} className="space-y-1">
                <Bar label={r.month} value={r.invoiced} max={revMax} display={formatCurrency(r.invoiced)} color="bg-blue-500" />
                {r.collected > 0 ? (
                  <div className="flex items-center gap-3 text-xs">
                    <div className="w-28 shrink-0" />
                    <div className="flex-1"><div className="h-2 overflow-hidden rounded bg-slate-50"><div className="h-full bg-emerald-400" style={{ width: `${Math.round((r.collected / revMax) * 100)}%` }} /></div></div>
                    <div className="w-24 shrink-0 text-right text-emerald-600">{formatCurrency(r.collected)}</div>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
