'use client';

import { useFetch } from '@/hooks/useFetch';
import { PageHeader } from '@/components/ui/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { LoadingState } from '@/components/ui/LoadingState';
import { ErrorState } from '@/components/ui/ErrorState';
import { apiFetch } from '@/lib/api';

type Journey = {
  id: string;
  name: string;
  description: string | null;
  triggerEvent: string | null;
  steps: { stepNumber: number; stepType: string; title: string; delayDays: number }[];
  _count: { enrollments: number };
};

type Enrollment = {
  id: string;
  status: string;
  currentStep: number;
  account: { name: string };
  journey: { name: string; steps: { title: string }[] };
};

export default function JourneysPage() {
  const journeys = useFetch<Journey[]>('/journeys');
  const enrollments = useFetch<Enrollment[]>('/journeys/enrollments?status=active');

  async function advance(id: string) {
    await apiFetch(`/journeys/enrollments/${id}/advance`, { method: 'POST' });
    await enrollments.reload();
  }

  return (
    <div className="p-8">
      <PageHeader title="Journey Orchestration" description="Automated customer journeys — onboarding to first order" />
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <p className="border-b border-slate-200 px-6 py-3 text-sm font-semibold text-slate-700">Journey Templates</p>
          {journeys.loading ? <LoadingState /> : null}
          {journeys.error ? <ErrorState message={journeys.error} onRetry={journeys.reload} /> : null}
          {journeys.data?.map((j) => (
            <div key={j.id} className="border-b border-slate-100 px-6 py-4 last:border-0">
              <div className="flex items-center justify-between">
                <p className="font-medium">{j.name}</p>
                <Badge>{j._count.enrollments} enrolled</Badge>
              </div>
              {j.triggerEvent ? <p className="mt-1 text-xs text-slate-500">Trigger: {j.triggerEvent}</p> : null}
              <ol className="mt-2 space-y-1">
                {j.steps.map((s) => (
                  <li key={s.stepNumber} className="text-xs text-slate-600">
                    {s.stepNumber}. [{s.stepType}] {s.title}{s.delayDays > 0 ? ` (+${s.delayDays}d)` : ''}
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </div>
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <p className="border-b border-slate-200 px-6 py-3 text-sm font-semibold text-slate-700">Active Enrollments</p>
          {enrollments.loading ? <LoadingState /> : null}
          {enrollments.data?.map((e) => (
            <div key={e.id} className="flex items-center justify-between border-b border-slate-100 px-6 py-4 last:border-0">
              <div>
                <p className="font-medium text-sm">{e.account.name}</p>
                <p className="text-xs text-slate-500">{e.journey.name} — step {e.currentStep}/{e.journey.steps.length}</p>
              </div>
              <button type="button" className="text-xs text-blue-600 hover:underline" onClick={() => advance(e.id)}>Advance</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}