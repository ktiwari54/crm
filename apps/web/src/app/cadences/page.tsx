'use client';

import { useFetch } from '@/hooks/useFetch';
import { PageHeader } from '@/components/ui/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { LoadingState } from '@/components/ui/LoadingState';
import { ErrorState } from '@/components/ui/ErrorState';
import { btnPrimary } from '@/components/ui/FormField';
import { apiFetch } from '@/lib/api';

type Template = {
  id: string;
  name: string;
  description: string | null;
  steps: { stepNumber: number; stepType: string; subject: string; delayDays: number }[];
};

type Enrollment = {
  id: string;
  entityType: string;
  currentStep: number;
  status: string;
  template: Template;
  owner: { firstName: string; lastName: string };
};

export default function CadencesPage() {
  const templates = useFetch<Template[]>('/cadences/templates');
  const enrollments = useFetch<Enrollment[]>('/cadences/enrollments');

  async function advance(id: string) {
    await apiFetch(`/cadences/enrollments/${id}/advance`, { method: 'PATCH' });
    await enrollments.reload();
  }

  return (
    <div className="p-8">
      <PageHeader title="Cadences" description="Multi-step follow-up sequences — email, call, task" />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 font-semibold">Templates</h2>
          {templates.loading ? <LoadingState /> : null}
          {templates.data?.map((t) => (
            <div key={t.id} className="mb-4 rounded-lg bg-slate-50 p-4">
              <p className="font-medium">{t.name}</p>
              <p className="text-xs text-slate-500">{t.description}</p>
              <div className="mt-2 space-y-1">
                {t.steps.map((s) => (
                  <p key={s.stepNumber} className="text-xs text-slate-600">
                    {s.stepNumber}. {s.stepType}: {s.subject} (+{s.delayDays}d)
                  </p>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 font-semibold">Active Enrollments</h2>
          {enrollments.loading ? <LoadingState /> : null}
          {enrollments.error ? <ErrorState message={enrollments.error} /> : null}
          {enrollments.data?.map((e) => (
            <div key={e.id} className="mb-4 flex items-center justify-between rounded-lg border border-slate-200 p-4">
              <div>
                <p className="font-medium">{e.template.name}</p>
                <p className="text-xs text-slate-500">{e.entityType} · Step {e.currentStep}/{e.template.steps.length}</p>
              </div>
              <button type="button" className={btnPrimary} onClick={() => advance(e.id)}>Complete Step</button>
            </div>
          ))}
          {!enrollments.loading && enrollments.data?.length === 0 ? (
            <p className="text-sm text-slate-400">No active enrollments.</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}