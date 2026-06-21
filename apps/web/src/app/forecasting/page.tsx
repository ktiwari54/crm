'use client';

import { useState } from 'react';
import { useFetch } from '@/hooks/useFetch';
import { formatCurrency } from '@/lib/format';
import { PageHeader } from '@/components/ui/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { LoadingState } from '@/components/ui/LoadingState';
import { ErrorState } from '@/components/ui/ErrorState';
import { btnPrimary } from '@/components/ui/FormField';
import { apiFetch } from '@/lib/api';

type Period = { id: string; name: string; startDate: string; endDate: string; _count: { entries: number } };

type Rollup = {
  period: Period;
  byCategory: Record<string, number>;
  byRep: Record<string, number>;
  entries: { id: string; category: string; amount: string; deal: { id: string; name: string; account: { name: string } } | null }[];
};

type Simulation = {
  baseline: number;
  adjusted: number;
  delta: number;
  deals: { dealId: string; dealName: string; baselineProbability: number; adjustedProbability: number; delta: number }[];
};

export default function ForecastingPage() {
  const periods = useFetch<Period[]>('/forecasting/periods');
  const activePeriod = periods.data?.[0];
  const rollup = useFetch<Rollup>(
    activePeriod ? `/forecasting/periods/${activePeriod.id}/rollup` : null,
    [activePeriod?.id],
  );
  const [simulation, setSimulation] = useState<Simulation | null>(null);
  const [simulating, setSimulating] = useState(false);

  async function syncPipeline() {
    if (!activePeriod) return;
    await apiFetch(`/forecasting/periods/${activePeriod.id}/sync`, { method: 'POST' });
    await rollup.reload();
  }

  async function runWhatIf() {
    if (!activePeriod || !rollup.data) return;
    setSimulating(true);
    try {
      const adjustments = rollup.data.entries
        .filter((e) => e.deal)
        .map((e) => ({
          dealId: e.deal!.id,
          probability: Math.min(100, (e.category === 'commit' ? 90 : e.category === 'best_case' ? 70 : 40) + 10),
        }));
      const result = await apiFetch<Simulation>('/forecasting/simulate', {
        method: 'POST',
        body: JSON.stringify({ periodId: activePeriod.id, adjustments }),
      });
      setSimulation(result);
    } finally {
      setSimulating(false);
    }
  }

  const loading = periods.loading || rollup.loading;
  const error = periods.error || rollup.error;

  return (
    <div className="p-8">
      <PageHeader
        title="Forecasting"
        description="Collaborative forecast with what-if simulation"
        action={
          activePeriod ? (
            <div className="flex gap-2">
              <button type="button" className={btnPrimary} onClick={syncPipeline}>Sync from Pipeline</button>
              <button type="button" className={btnPrimary} onClick={runWhatIf} disabled={simulating}>What-If (+10%)</button>
            </div>
          ) : undefined
        }
      />
      {loading ? <LoadingState /> : null}
      {error ? <ErrorState message={error} /> : null}
      {simulation ? (
        <div className="mb-6 grid grid-cols-3 gap-4">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs text-slate-500">Baseline</p>
            <p className="text-xl font-bold">{formatCurrency(simulation.baseline)}</p>
          </div>
          <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
            <p className="text-xs text-blue-600">Adjusted</p>
            <p className="text-xl font-bold text-blue-900">{formatCurrency(simulation.adjusted)}</p>
          </div>
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
            <p className="text-xs text-emerald-600">Delta</p>
            <p className="text-xl font-bold text-emerald-900">{formatCurrency(simulation.delta)}</p>
          </div>
        </div>
      ) : null}
      {!loading && !error && rollup.data ? (
        <>
          <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {Object.entries(rollup.data.byCategory).map(([cat, amount]) => (
              <div key={cat} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <Badge>{cat.replace('_', ' ')}</Badge>
                <p className="mt-2 text-xl font-bold text-slate-900">{formatCurrency(amount)}</p>
              </div>
            ))}
          </div>
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-6 py-4">
              <h2 className="font-semibold">{rollup.data.period.name} Forecast Entries</h2>
            </div>
            <div className="divide-y divide-slate-100">
              {rollup.data.entries.map((e) => (
                <div key={e.id} className="flex items-center justify-between px-6 py-4">
                  <div>
                    <p className="text-sm font-medium">{e.deal?.name ?? 'Manual entry'}</p>
                    <p className="text-xs text-slate-500">{e.deal?.account.name}</p>
                  </div>
                  <div className="text-right">
                    <Badge variant="blue">{e.category.replace('_', ' ')}</Badge>
                    <p className="mt-1 font-semibold">{formatCurrency(e.amount)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}