'use client';

import { useState } from 'react';
import { useFetch } from '@/hooks/useFetch';
import { PageHeader } from '@/components/ui/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { LoadingState } from '@/components/ui/LoadingState';
import { ErrorState } from '@/components/ui/ErrorState';
type Module = {
  id: string;
  title: string;
  description: string | null;
  sortOrder: number;
  durationMinutes: number;
  isRequired: boolean;
};

type Path = {
  id: string;
  name: string;
  tier: string;
  description: string | null;
  partnerAccount: { id: string; name: string } | null;
  modules: Module[];
  enrollments: {
    id: string;
    status: string;
    completedModules: number;
    partnerAccount?: { id: string; name: string };
  }[];
};

type PrmAnalytics = {
  partnerCount: number;
  pipeline: { openValue: number; dealCount: number; winRate: number };
  mdf: { approvedTotal: number; totalRequested: number; roiEstimate: number };
  enablement: { enrolled: number; completed: number; inProgress: number };
};

export default function PartnerEnablementPage() {
  const { data, loading, error, reload } = useFetch<Path[]>('/prm/enablement');
  const analytics = useFetch<PrmAnalytics>('/prm/analytics');
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <div className="p-8">
      <PageHeader
        title="Partner Enablement"
        description="Training paths, certifications, and PRM analytics by partner tier"
      />

      {analytics.data ? (
        <div className="mb-6 grid gap-4 md:grid-cols-4">
          {[
            ['Partners', String(analytics.data.partnerCount)],
            ['Pipeline', `$${analytics.data.pipeline.openValue.toLocaleString()}`],
            ['Win Rate', `${analytics.data.pipeline.winRate}%`],
            ['MDF ROI Est.', `${analytics.data.mdf.roiEstimate}x`],
          ].map(([label, value]) => (
            <div key={label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase text-slate-500">{label}</p>
              <p className="mt-1 text-xl font-bold text-slate-900">{value}</p>
            </div>
          ))}
        </div>
      ) : null}

      <div className="space-y-4">
        {loading ? <LoadingState /> : null}
        {error ? <ErrorState message={error} onRetry={reload} /> : null}
        {!loading && !error && data?.map((path) => {
          const enrollment = path.enrollments[0];
          const progress = path.modules.length
            ? Math.round(((enrollment?.completedModules ?? 0) / path.modules.length) * 100)
            : 0;
          return (
            <div key={path.id} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-lg font-medium">{path.name}</p>
                    <Badge>{path.tier}</Badge>
                    {enrollment ? <Badge variant={enrollment.status === 'completed' ? 'green' : 'default'}>{enrollment.status}</Badge> : null}
                  </div>
                  <p className="mt-1 text-sm text-slate-500">
                    {path.partnerAccount?.name ?? 'All partners'} · {path.modules.length} modules
                    {enrollment ? ` · ${progress}% complete` : ''}
                  </p>
                  {path.description ? <p className="mt-2 text-sm text-slate-600">{path.description}</p> : null}
                </div>
                <button
                  type="button"
                  className="text-sm text-blue-600 hover:underline"
                  onClick={() => setExpanded(expanded === path.id ? null : path.id)}
                >
                  {expanded === path.id ? 'Hide modules' : 'View modules'}
                </button>
              </div>
              {expanded === path.id ? (
                <ul className="mt-4 space-y-2 border-t border-slate-100 pt-4">
                  {path.modules.map((m) => (
                    <li key={m.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-3 text-sm">
                      <div>
                        <span className="font-medium">{m.sortOrder}. {m.title}</span>
                        {m.description ? <p className="text-xs text-slate-500">{m.description}</p> : null}
                      </div>
                      <span className="text-xs text-slate-400">{m.durationMinutes} min{m.isRequired ? ' · required' : ''}</span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}