'use client';

import { useState } from 'react';
import { useFetch } from '@/hooks/useFetch';
import { apiFetch } from '@/lib/api';
import { formatDate } from '@/lib/format';
import { PageHeader } from '@/components/ui/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { LoadingState } from '@/components/ui/LoadingState';
import { ErrorState } from '@/components/ui/ErrorState';
import { btnPrimary } from '@/components/ui/FormField';

type AgentRun = {
  id: string;
  status: string;
  output: Record<string, unknown> | null;
  createdAt: string;
};

type Agent = {
  id: string;
  name: string;
  agentType: string;
  description: string | null;
  config: Record<string, unknown> | null;
  owner: { firstName: string; lastName: string } | null;
  runs: AgentRun[];
};

const TYPE_LABELS: Record<string, string> = {
  quote_prep: 'Quote Preparation',
  approval_route: 'Approval Routing',
  email_send: 'Email Send',
};

export default function AgentsPage() {
  const { data, loading, error, reload } = useFetch<Agent[]>('/agents');
  const [runningId, setRunningId] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<Record<string, unknown> | null>(null);

  async function runAgent(agent: Agent) {
    setRunningId(agent.id);
    setLastResult(null);
    try {
      const result = await apiFetch<AgentRun>(`/agents/${agent.id}/run`, {
        method: 'POST',
        body: JSON.stringify(agent.config ?? {}),
      });
      setLastResult(result.output ?? { status: result.status });
      await reload();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Agent run failed');
    } finally {
      setRunningId(null);
    }
  }

  return (
    <div className="p-8">
      <PageHeader
        title="Agentforce"
        description="Autonomous agents for quote prep, approval routing, and email drafting"
      />

      {lastResult ? (
        <div className="mb-6 rounded-xl border border-green-200 bg-green-50 p-4">
          <p className="mb-2 text-sm font-semibold text-green-900">Last Run Result</p>
          <pre className="max-h-40 overflow-auto text-xs text-green-800">
            {JSON.stringify(lastResult, null, 2)}
          </pre>
        </div>
      ) : null}

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        {loading ? <LoadingState /> : null}
        {error ? <ErrorState message={error} onRetry={reload} /> : null}
        {!loading && !error && data && data.length > 0 ? (
          <div className="divide-y divide-slate-100">
            {data.map((agent) => (
              <div key={agent.id} className="flex flex-wrap items-start justify-between gap-4 px-6 py-5">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-medium text-slate-900">{agent.name}</h3>
                    <Badge variant="blue">{TYPE_LABELS[agent.agentType] ?? agent.agentType}</Badge>
                  </div>
                  {agent.description ? (
                    <p className="mt-1 text-sm text-slate-500">{agent.description}</p>
                  ) : null}
                  {agent.runs.length > 0 ? (
                    <p className="mt-2 text-xs text-slate-400">
                      Last run: {formatDate(agent.runs[0].createdAt)} — {agent.runs[0].status}
                    </p>
                  ) : (
                    <p className="mt-2 text-xs text-slate-400">No runs yet</p>
                  )}
                </div>
                <button
                  type="button"
                  className={btnPrimary}
                  disabled={runningId === agent.id}
                  onClick={() => void runAgent(agent)}
                >
                  {runningId === agent.id ? 'Running...' : 'Run Agent'}
                </button>
              </div>
            ))}
          </div>
        ) : null}
        {!loading && !error && data?.length === 0 ? (
          <p className="px-6 py-12 text-center text-sm text-slate-500">No agents configured.</p>
        ) : null}
      </div>
    </div>
  );
}