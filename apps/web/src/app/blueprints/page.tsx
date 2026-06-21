'use client';

import { useFetch } from '@/hooks/useFetch';
import { PageHeader } from '@/components/ui/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { LoadingState } from '@/components/ui/LoadingState';
import { ErrorState } from '@/components/ui/ErrorState';

type BlueprintRule = {
  id: string;
  name: string;
  entityType: string;
  requirement: string;
  message: string | null;
  pipelineStage: { name: string } | null;
};

export default function BlueprintsPage() {
  const { data, loading, error, reload } = useFetch<BlueprintRule[]>('/blueprints');

  return (
    <div className="p-8">
      <PageHeader
        title="Blueprint Rules"
        description="Stage-gate enforcement — mandatory steps before pipeline moves"
      />
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm divide-y divide-slate-100">
        {loading ? <LoadingState /> : null}
        {error ? <ErrorState message={error} onRetry={reload} /> : null}
        {!loading && !error && data?.map((rule) => (
          <div key={rule.id} className="px-6 py-4">
            <div className="flex items-center gap-3">
              <h3 className="font-medium text-slate-900">{rule.name}</h3>
              <Badge variant="blue">{rule.entityType}</Badge>
              {rule.pipelineStage ? <Badge variant="purple">{rule.pipelineStage.name}</Badge> : null}
            </div>
            <p className="mt-1 text-sm text-slate-600">
              Requirement: <code className="rounded bg-slate-100 px-1">{rule.requirement}</code>
            </p>
            {rule.message ? <p className="mt-1 text-xs text-slate-400">{rule.message}</p> : null}
          </div>
        ))}
        {!loading && !error && data?.length === 0 ? (
          <p className="px-6 py-12 text-center text-sm text-slate-400">No blueprint rules configured.</p>
        ) : null}
      </div>
    </div>
  );
}