'use client';

import { useState } from 'react';
import { useFetch } from '@/hooks/useFetch';
import { PageHeader } from '@/components/ui/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { LoadingState } from '@/components/ui/LoadingState';
import { ErrorState } from '@/components/ui/ErrorState';

type Milestone = {
  id: string;
  title: string;
  status: string;
  dueDate: string | null;
  ownerParty: string;
  sortOrder: number;
};

type Map = {
  id: string;
  title: string;
  customerContact: string | null;
  status: string;
  milestones: Milestone[];
};

type Plan = {
  id: string;
  title: string;
  fiscalYear: number;
  status: string;
  swotStrengths: string | null;
  swotWeaknesses: string | null;
  swotOpportunities: string | null;
  swotThreats: string | null;
  account: { name: string };
  goals: { id: string; title: string; status: string; dueDate: string | null }[];
  mutualActionPlans: Map[];
};

export default function AccountPlansPage() {
  const { data, loading, error, reload } = useFetch<Plan[]>('/account-plans');
  const [tab, setTab] = useState<Record<string, 'swot' | 'map'>>({});

  function getTab(planId: string): 'swot' | 'map' {
    return tab[planId] ?? 'swot';
  }

  return (
    <div className="p-8">
      <PageHeader title="Account Plans" description="Strategic planning with SWOT, goals, and mutual action plans" />
      <div className="space-y-4">
        {loading ? <LoadingState /> : null}
        {error ? <ErrorState message={error} onRetry={reload} /> : null}
        {!loading && !error && data?.map((plan) => {
          const activeTab = getTab(plan.id);
          return (
            <div key={plan.id} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-lg font-medium">{plan.title}</p>
                  <p className="text-sm text-slate-500">{plan.account.name} · FY{plan.fiscalYear}</p>
                </div>
                <Badge variant={plan.status === 'active' ? 'green' : 'default'}>{plan.status}</Badge>
              </div>

              <div className="mt-4 flex gap-2 border-b border-slate-100">
                {(['swot', 'map'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTab({ ...tab, [plan.id]: t })}
                    className={`px-4 py-2 text-sm font-medium capitalize ${
                      activeTab === t
                        ? 'border-b-2 border-blue-600 text-blue-600'
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    {t === 'map' ? 'Mutual Action Plan' : 'SWOT & Goals'}
                  </button>
                ))}
              </div>

              {activeTab === 'swot' ? (
                <>
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    {[
                      ['Strengths', plan.swotStrengths],
                      ['Weaknesses', plan.swotWeaknesses],
                      ['Opportunities', plan.swotOpportunities],
                      ['Threats', plan.swotThreats],
                    ].map(([label, text]) => (
                      <div key={label as string} className="rounded-lg bg-slate-50 p-3">
                        <p className="text-xs font-semibold uppercase text-slate-500">{label as string}</p>
                        <p className="mt-1 text-sm text-slate-700">{text ?? '—'}</p>
                      </div>
                    ))}
                  </div>
                  {plan.goals.length > 0 ? (
                    <div className="mt-4">
                      <p className="mb-2 text-xs font-semibold uppercase text-slate-500">Goals</p>
                      <ul className="space-y-1">
                        {plan.goals.map((g) => (
                          <li key={g.id} className="flex items-center gap-2 text-sm">
                            <Badge variant={g.status === 'completed' ? 'green' : 'default'}>{g.status}</Badge>
                            {g.title}
                            {g.dueDate ? <span className="text-xs text-slate-400">due {new Date(g.dueDate).toLocaleDateString()}</span> : null}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </>
              ) : (
                <div className="mt-4 space-y-4">
                  {plan.mutualActionPlans.length === 0 ? (
                    <p className="text-sm text-slate-400">No mutual action plan yet</p>
                  ) : (
                    plan.mutualActionPlans.map((map) => (
                      <div key={map.id}>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{map.title}</p>
                          {map.customerContact ? <span className="text-sm text-slate-500">· {map.customerContact}</span> : null}
                          <Badge variant={map.status === 'active' ? 'green' : 'default'}>{map.status}</Badge>
                        </div>
                        <ul className="mt-3 space-y-2">
                          {map.milestones.map((m) => (
                            <li key={m.id} className="flex items-center gap-3 rounded-lg bg-slate-50 px-4 py-3 text-sm">
                              <span className="text-xs font-medium text-slate-400">{m.sortOrder}</span>
                              <Badge variant={m.status === 'completed' ? 'green' : m.status === 'blocked' ? 'red' : 'default'}>{m.status}</Badge>
                              <span className="flex-1 font-medium">{m.title}</span>
                              <span className="text-xs text-slate-400 capitalize">{m.ownerParty}</span>
                              {m.dueDate ? <span className="text-xs text-slate-400">{new Date(m.dueDate).toLocaleDateString()}</span> : null}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}