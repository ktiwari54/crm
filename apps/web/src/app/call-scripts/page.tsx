'use client';

import { useState } from 'react';
import { useFetch } from '@/hooks/useFetch';
import { PageHeader } from '@/components/ui/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { LoadingState } from '@/components/ui/LoadingState';
import { ErrorState } from '@/components/ui/ErrorState';
import { btnSecondary } from '@/components/ui/FormField';

type CallScript = {
  id: string;
  name: string;
  category: string | null;
  description: string | null;
  scriptBody: string;
};

export default function CallScriptsPage() {
  const [expanded, setExpanded] = useState<string | null>(null);
  const { data, loading, error, reload } = useFetch<CallScript[]>('/call-scripts');

  return (
    <div className="p-8">
      <PageHeader
        title="Call Scripts"
        description="CTI talk tracks for outbound calls — quote follow-up, reorder nurture, discovery"
      />
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm divide-y divide-slate-100">
        {loading ? <LoadingState /> : null}
        {error ? <ErrorState message={error} onRetry={reload} /> : null}
        {!loading && !error && data?.map((script) => (
          <div key={script.id} className="px-6 py-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="font-medium text-slate-900">{script.name}</h3>
                {script.description ? <p className="mt-1 text-sm text-slate-500">{script.description}</p> : null}
                {script.category ? <Badge variant="blue">{script.category}</Badge> : null}
              </div>
              <button
                type="button"
                className={btnSecondary}
                onClick={() => setExpanded(expanded === script.id ? null : script.id)}
              >
                {expanded === script.id ? 'Hide' : 'View Script'}
              </button>
            </div>
            {expanded === script.id ? (
              <pre className="mt-4 whitespace-pre-wrap rounded-lg bg-slate-50 p-4 text-sm text-slate-700">
                {script.scriptBody}
              </pre>
            ) : null}
          </div>
        ))}
        {!loading && !error && data?.length === 0 ? (
          <p className="px-6 py-12 text-center text-sm text-slate-400">No call scripts yet.</p>
        ) : null}
      </div>
    </div>
  );
}