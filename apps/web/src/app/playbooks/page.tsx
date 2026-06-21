'use client';

import { useFetch } from '@/hooks/useFetch';
import { PageHeader } from '@/components/ui/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { LoadingState } from '@/components/ui/LoadingState';
import { ErrorState } from '@/components/ui/ErrorState';

type PlaybookStep = {
  stepNumber: number;
  title: string;
  question: string | null;
  action: string | null;
  productHint: string | null;
};

type Playbook = {
  id: string;
  name: string;
  description: string | null;
  stageName: string | null;
  steps: PlaybookStep[];
};

export default function PlaybooksPage() {
  const { data, loading, error, reload } = useFetch<Playbook[]>('/playbooks');

  return (
    <div className="p-8">
      <PageHeader
        title="Guided Selling Playbooks"
        description="Step-by-step selling flows per pipeline stage — questions, actions, product hints"
      />
      <div className="space-y-4">
        {loading ? <LoadingState /> : null}
        {error ? <ErrorState message={error} onRetry={reload} /> : null}
        {!loading && !error && data?.map((pb) => (
          <div key={pb.id} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">{pb.name}</h3>
                {pb.description ? <p className="mt-1 text-sm text-slate-500">{pb.description}</p> : null}
              </div>
              {pb.stageName ? <Badge variant="purple">{pb.stageName}</Badge> : null}
            </div>
            <div className="space-y-3">
              {pb.steps.map((step) => (
                <div key={step.stepNumber} className="rounded-lg bg-slate-50 px-4 py-3">
                  <p className="text-sm font-medium text-slate-900">
                    {step.stepNumber}. {step.title}
                  </p>
                  {step.question ? <p className="mt-1 text-sm text-slate-600">Q: {step.question}</p> : null}
                  {step.action ? <p className="mt-1 text-sm text-blue-600">→ {step.action}</p> : null}
                  {step.productHint ? <p className="mt-1 text-xs text-slate-400">Products: {step.productHint}</p> : null}
                </div>
              ))}
            </div>
          </div>
        ))}
        {!loading && !error && data?.length === 0 ? (
          <p className="text-center text-sm text-slate-400">No playbooks configured.</p>
        ) : null}
      </div>
    </div>
  );
}